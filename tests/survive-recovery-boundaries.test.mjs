import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session', 'survive-together']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { LocalSession } = await sources.import('session');
const { createSurviveTogetherDefinition } = await sources.import('survive-together');
const STEP = 1 / 120;

function lane(game, row, kind = 'meadow', extra = {}) {
  const value = { ...generateLane(game.seed, row, game.home), kind,
    blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, phase: 0, speed: 0, spacing: 20, length: 1.15,
    variant: 0, ...extra };
  game.rows.set(row, value);
  return value;
}
function clearCourse(game) {
  for (const row of game.rows.keys()) lane(game, row);
  game.mobs.length = 0;
}
function tick(session, seconds) {
  for (let elapsed = 0; elapsed < seconds - 1e-10; elapsed += STEP) {
    session.update(Math.min(STEP, seconds - elapsed));
  }
}
function setup(seat) {
  const game = new Game(113, 'pond', 'stroll', false, [], 'butter');
  clearCourse(game);
  const session = LocalSession.stage(game, {
    roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'sunny' }],
    mode: createSurviveTogetherDefinition(game.definition),
  }).commit();
  const player = session.players.find(member => member.seat === seat);
  player.x = player.fromX = 0;
  player.y = player.fromY = player.maxY = 2;
  player.powerReadyAt = 10000;
  player.run.creditCoins(17);
  lane(game, 2, 'river', { phase: 10, length: 1 });
  session.update(STEP);
  assert.equal(player.state, 'dead', 'an actual unsupported river cell kills the intended owner');
  assert.equal(player.run.wallet, 0, 'death clears before recovery');
  assert.ok(player.recovery.offer, 'the production death dispatcher opens the offer');
  lane(game, 2);
  assert.equal(session.recover({ kind: 'personal', ownerSeat: seat }), true);
  assert.equal(player.state, 'playing');
  assert.equal(player.recovery.charge, 'spent');
  return { game, session, player };
}

for (const seat of ['p1', 'p2']) {
  for (const hazard of ['traffic', 'water', 'train']) {
    test(`${seat}: recovery protection prevents real ${hazard} mutation and expires on active time`, () => {
      const { game, session, player } = setup(seat);
      const health = player.health;
      const install = () => {
        if (hazard === 'traffic') lane(game, player.y, 'road', { phase: player.x });
        if (hazard === 'water') lane(game, player.y, 'river', { phase: player.x + 10, length: 1 });
        if (hazard === 'train') lane(game, player.y, 'rail', {
          phase: 2.375 - game.time, period: 9, warning: 1.5, speed: 1,
        });
      };
      install();
      session.update(STEP);
      assert.equal(player.state, 'playing');
      assert.equal(player.health, health, 'protection must run before damage, not only before death');
      assert.equal(player.powerReadyAt, 10000, 'protection must not spend an innate power');
      clearCourse(game);
      tick(session, 2.1);
      assert.ok(session.world.time >= player.recovery.protectionUntil);
      install();
      session.update(STEP);
      if (hazard === 'traffic') {
        assert.equal(player.state, 'playing');
        assert.equal(player.health, health - 2, 'a fresh side contact resumes ordinary two-feather damage');
      } else {
        assert.equal(player.state, 'dead', 'the same lethal hazard works after protection expires');
        assert.equal(player.deathCause, hazard);
      }
    });
  }

  test(`${seat}: the 250th completed forward hop recharges, but backtracking and an unfinished hop do not`, () => {
    const { game, session, player } = setup(seat);
    const hop = direction => {
      lane(game, player.y + (direction === 'forward' ? 1 : -1));
      assert.equal(player.move(direction), true);
      clearCourse(game);
      tick(session, game.rules.movement.hopDuration);
      assert.equal(player.state, 'playing');
      assert.equal(player.hop, 0);
    };
    for (let count = 0; count < 249; count++) hop('forward');
    assert.equal(player.recovery.charge, 'spent');
    hop('back'); hop('forward');
    assert.equal(player.recovery.charge, 'spent', 'revisiting the personal frontier earns nothing');
    lane(game, player.y + 1);
    assert.equal(player.move('forward'), true);
    clearCourse(game);
    assert.equal(player.recovery.charge, 'spent', 'initiating the qualifying hop is not completing it');
    tick(session, game.rules.movement.hopDuration / 3);
    assert.equal(player.recovery.charge, 'spent', 'airborne travel cannot award a charge early');
    tick(session, game.rules.movement.hopDuration * 2 / 3);
    assert.equal(player.recovery.charge, 'available');
    hop('forward');
    assert.equal(player.recovery.charge, 'available', 'the 251st hop cannot add a second charge');
  });

  test(`${seat}: dying on the qualifying hop cannot create a fresh personal recovery offer`, () => {
    const { game, session, player } = setup(seat);
    for (let count = 0; count < 249; count++) {
      lane(game, player.y + 1);
      assert.equal(player.move('forward'), true);
      clearCourse(game);
      tick(session, game.rules.movement.hopDuration);
      assert.equal(player.state, 'playing');
    }
    assert.equal(player.recovery.charge, 'spent');
    lane(game, player.y + 1, 'river', { phase: player.x + 10, length: 1 });
    assert.equal(player.move('forward'), true);
    tick(session, game.rules.movement.hopDuration);
    assert.equal(player.state, 'dead', 'the unsupported landing is an actual death');
    assert.equal(player.recovery.charge, 'spent', 'a fatal landing must not award its pending progress');
    assert.equal(Boolean(player.recovery.offer), false, 'death must not create an offer from unearned charge');
    assert.equal(session.recover({ kind: 'personal', ownerSeat: seat }), false);
  });
}

test('a teammate return behind the old frontier cannot recharge by retracing previously earned tiles', () => {
  const { game, session, player } = setup('p2');
  const owner = session.players.find(member => member.seat === 'p1');
  for (let count = 0; count < 30; count++) {
    lane(game, player.y + 1);
    assert.equal(player.move('forward'), true);
    if (count >= 10) {
      lane(game, owner.y + 1);
      assert.equal(owner.move('forward'), true);
    }
    clearCourse(game);
    tick(session, game.rules.movement.hopDuration);
    assert.equal(player.state, 'playing');
  }
  const earned = player.recovery.personalHighWater;
  const frontier = player.y;
  assert.equal(earned, 30);
  lane(game, player.y, 'river', { phase: player.x + 10, length: 1 });
  session.update(STEP);
  assert.equal(player.state, 'dead');
  assert.equal(owner.state, 'playing', 'the trailing teammate remains alive to use the Revival');
  clearCourse(game);
  let debits = 0;
  assert.equal(session.recover({ kind: 'revival', ownerSeat: 'p1', targetSeat: 'p2',
    debit: () => { debits++; return true; } }), true);
  assert.equal(debits, 1);
  assert.ok(player.y < frontier, 'fixture returns the target behind its former frontier');
  assert.equal(player.recovery.personalHighWater, earned, 'placement itself earns nothing');
  while (player.y < frontier) {
    lane(game, player.y + 1);
    assert.equal(player.move('forward'), true);
    clearCourse(game);
    tick(session, game.rules.movement.hopDuration);
    assert.equal(player.state, 'playing');
    assert.equal(player.recovery.personalHighWater, earned, 'old ground remains old after revival');
  }
  lane(game, player.y + 1);
  assert.equal(player.move('forward'), true);
  clearCourse(game);
  tick(session, game.rules.movement.hopDuration);
  assert.equal(player.recovery.personalHighWater, earned + 1, 'only one genuinely new completed tile is credited');
});

test('Flare preserves living teammates health and counts only dead teammates as revivals', () => {
  const { game, session, player: living } = setup('p2');
  assert.equal(session.admit({ device: 'keyboard-c', characterId: 'pip' }), true);
  const owner = session.players.find(player => player.seat === 'p1');
  const target = session.players.find(player => player.seat === 'p3');
  owner.health = 1.5; living.health = 2.25;
  owner.run.creditCoins(13);
  assert.equal(living.run.creditCoins(7), 7, 'a returned player can earn new coins after death cleared their old wallet');
  target.x = target.fromX = 0;
  target.y = target.fromY = target.maxY = 2;
  target.powerReadyAt = 10000;
  lane(game, 2, 'river', { phase: 10, length: 1 });
  session.update(STEP);
  assert.equal(target.state, 'dead');
  clearCourse(game);
  const revivedBefore = owner.statistics.teammateRevives;
  let debits = 0;
  assert.equal(session.recover({ kind: 'flare', ownerSeat: 'p1',
    debit: () => { debits++; return true; } }), true);
  assert.equal(debits, 1);
  assert.equal(target.state, 'playing');
  assert.equal(target.health, target.maxHealth, 'the dead traveler receives revival health');
  assert.equal(target.run.wallet, 0, 'revival does not restore the old economy');
  assert.equal(target.run.alive, true, 'revived travelers can earn and trade again');
  assert.equal(owner.health, 1.5, 'regrouping does not heal the living owner');
  assert.equal(living.health, 2.25, 'regrouping does not heal living teammates');
  assert.equal(owner.run.wallet, 13);
  assert.equal(living.run.wallet, 7);
  assert.equal(owner.statistics.teammateRevives, revivedBefore + 1, 'one dead target means one teammate revival');
});

test('a non-primary Flare owner keeps its exact safe fractional position as the regroup anchor', () => {
  const { game, session, player: owner } = setup('p2');
  assert.equal(session.admit({ device: 'keyboard-c', characterId: 'pip' }), true);
  const target = session.players.find(player => player.seat === 'p3');
  owner.x = owner.fromX = -1.375;
  target.x = target.fromX = 0;
  target.y = target.fromY = target.maxY = 2;
  target.powerReadyAt = 10000;
  lane(game, 2, 'river', { phase: 10, length: 1 });
  session.update(STEP);
  assert.equal(target.state, 'dead');
  clearCourse(game);
  const anchor = [owner.x, owner.y];
  assert.equal(session.recover({ kind: 'flare', ownerSeat: 'p2', debit: () => true }), true);
  assert.deepEqual([owner.x, owner.y], anchor, 'seat ordering must not give another teammate the owner anchor or snap its grid');
  assert.equal(target.state, 'playing');
  assert.equal(new Set(session.players.map(player => `${player.x}:${player.y}`)).size, 3);
});
