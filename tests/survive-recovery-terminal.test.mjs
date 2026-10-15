import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session', 'survive-together']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { LocalSession } = await sources.import('session');
const { createSurviveTogetherDefinition } = await sources.import('survive-together');
const STEP = 1 / 120;
function lane(game, row, extra = {}) {
  const value = { ...generateLane(game.seed, row, game.home), kind: 'meadow',
    blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined,
    phase: 0, speed: 0, spacing: 20, length: 1.15, variant: 0, ...extra };
  game.rows.set(row, value); return value;
}
function clear(game) { for (const row of game.rows.keys()) lane(game, row); game.mobs.length = 0; }
function tick(session, seconds) {
  for (let elapsed = 0; elapsed < seconds - 1e-10; elapsed += STEP) session.update(Math.min(STEP, seconds - elapsed));
}
function setup(count = 2, mode = 'stroll') {
  const game = new Game(121, 'pond', mode, false, [], 'butter'); clear(game);
  const session = LocalSession.stage(game, {
    roster: [
      { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
      { seat: 'p3', device: 'keyboard-c', characterId: 'pip' },
    ].slice(0, count - 1), mode: createSurviveTogetherDefinition(game.definition),
  }).commit();
  return { game, session };
}
function drown(game, session, player) {
  player.x = player.fromX = 0; player.y = player.fromY = player.maxY = 2;
  player.hop = 0; player.powerReadyAt = 10000;
  lane(game, 2, { kind: 'river', phase: 10, length: 1 });
  session.update(STEP);
  assert.equal(player.state, 'dead', 'fixture must produce a real unsupported-water death');
  lane(game, 2);
}
function advance(game, session, players) {
  for (const player of players) {
    lane(game, player.y + 1); assert.equal(player.move('forward'), true);
  }
  clear(game); tick(session, game.rules.movement.hopDuration);
  for (const player of players) assert.equal(player.state, 'playing');
}
function personal(session, player) { return session.recover({ kind: 'personal', ownerSeat: player.seat }); }

for (const mode of ['arcade', 'stroll']) test(`${mode}: pause freezes the eight-second offer and two-second return protection`, () => {
  const { game, session } = setup(2, mode);
  const player = session.players[1];
  drown(game, session, player);
  const offer = player.recovery.offer;
  assert.ok(offer);
  const time = session.world.time;
  game.pause(); tick(session, 20);
  assert.equal(session.world.time, time);
  assert.deepEqual(player.recovery.offer, offer);
  game.resume(); tick(session, 1);
  assert.equal(personal(session, player), true);
  const protection = player.recovery.protectionUntil;
  const protectedTime = session.world.time;
  game.pause(); tick(session, 20);
  assert.equal(session.world.time, protectedTime);
  assert.equal(player.recovery.protectionUntil, protection);
  game.resume(); tick(session, 1.9);
  assert.ok(session.world.time < protection, 'protection lasts two active seconds in either base mode');
  tick(session, .11);
  assert.ok(session.world.time >= protection);
});

test('decline closes just that offer without spending its charge or allowing repeated acceptance', () => {
  const { game, session } = setup(); const player = session.players[1];
  drown(game, session, player);
  const generation = player.recovery.deathGeneration;
  assert.equal(session.declineRecovery(player.seat), true);
  assert.equal(player.recovery.charge, 'available');
  assert.equal(Boolean(player.recovery.offer), false);
  assert.equal(personal(session, player), false);
  assert.equal(session.declineRecovery(player.seat), false);
  tick(session, .2);
  assert.equal(player.recovery.deathGeneration, generation, 'one death cannot reopen a declined offer');
  assert.equal(session.result, undefined, 'the living teammate keeps playing');
});

for (const mode of ['arcade', 'stroll']) test(`${mode}: an all-dead offer expires after eight active seconds without spending the charge`, () => {
  const { game, session } = setup(1, mode); const player = session.players[0];
  drown(game, session, player);
  tick(session, 7.9);
  assert.equal(session.result, undefined);
  assert.ok(player.recovery.offer);
  tick(session, .11);
  assert.ok(session.result, 'only a valid pending offer can delay settlement');
  assert.equal(player.recovery.charge, 'available');
  assert.equal(Boolean(player.recovery.offer), false);
  const time = session.world.time, result = session.result;
  assert.equal(personal(session, player), false);
  tick(session, 20);
  assert.equal(session.world.time, time, 'settled runs stop their active clock');
  assert.strictEqual(session.result, result);
});

test('an all-dead return uses a supported last-safe cell rather than an airborne river point', () => {
  const { game, session } = setup(1); const player = session.players[0];
  player.powerReadyAt = 10000;
  session.update(STEP);
  const safe = { x: player.x, y: player.y };
  lane(game, 1, { kind: 'river', phase: 10, length: 1 });
  assert.equal(player.move('forward'), true);
  tick(session, game.rules.movement.hopDuration);
  assert.equal(player.state, 'dead');
  assert.deepEqual(player.recovery.lastSafe, safe, 'unsupported airborne points are never safe-return history');
  assert.equal(personal(session, player), true);
  assert.deepEqual({ x: player.x, y: player.y }, safe);
  assert.equal(player.run.wallet, 0);
  assert.equal(player.run.alive, true);
});

test('partial recharge survives device reclaim, departure, changed traveler and a new seat', () => {
  const { game, session } = setup(); const [primary, first] = session.players;
  drown(game, session, first); assert.equal(personal(session, first), true);
  for (let hop = 0; hop < 17; hop++) advance(game, session, [primary, first]);
  assert.equal(first.recovery.personalHighWater, 17);
  const grant = first.recovery.grantId;
  assert.equal(session.deviceLost('p2'), true);
  tick(session, .25);
  assert.equal(session.reclaim('p2', 'gamepad-7'), true);
  assert.equal(first.recovery.personalHighWater, 17);
  assert.equal(session.depart('p2'), true);
  assert.equal(session.admit({ seat: 'p3', device: 'gamepad-7', characterId: 'petal' }), true);
  const returned = session.players.find(player => player.seat === 'p3');
  assert.equal(returned.recovery.grantId, grant);
  assert.equal(returned.recovery.charge, 'spent');
  assert.equal(returned.recovery.personalHighWater, 17);
  advance(game, session, [primary, returned]);
  assert.equal(returned.recovery.personalHighWater, 18, 'the first new hop continues the same participant ledger');
  for (let hop = 18; hop < 249; hop++) advance(game, session, [primary, returned]);
  assert.equal(returned.recovery.charge, 'spent');
  advance(game, session, [primary, returned]);
  assert.equal(returned.recovery.personalHighWater, 250);
  assert.equal(returned.recovery.charge, 'available');
});

test('live solo adoption preserves the travelers existing frontier after backtracking', () => {
  const game = new Game(121, 'pond', 'stroll', false, [], 'butter'); clear(game);
  for (const direction of [...Array(10).fill('forward'), 'back', 'back']) {
    assert.equal(game.move(direction), true);
    clear(game); game.update(game.rules.movement.hopDuration);
    assert.equal(game.state, 'playing');
  }
  assert.equal(game.y, 8); assert.equal(game.maxY, 10);
  const session = LocalSession.stage(game, { roster: [], mode: createSurviveTogetherDefinition(game.definition) }).commit();
  const player = session.players[0]; player.powerReadyAt = 10000;
  lane(game, 8, { kind: 'river', phase: 10, length: 1 });
  session.update(STEP); assert.equal(player.state, 'dead'); lane(game, 8);
  assert.equal(personal(session, player), true);
  for (let hop = 0; hop < 2; hop++) {
    advance(game, session, [player]);
    assert.equal(player.recovery.personalHighWater, 0, 'revisiting pre-adoption tiles cannot recharge the new personal revival');
  }
  advance(game, session, [player]);
  assert.equal(player.recovery.personalHighWater, 1, 'only the first tile beyond the retained solo frontier earns progress');
});

test('ghost and departed teammates cannot be revived, regrouped, or keep an all-dead team alive', () => {
  const { game, session } = setup(3); const [owner, ghost, dead] = session.players;
  ghost.run.creditCoins(7);
  assert.equal(session.deviceLost(ghost.seat), true);
  const ghostState = [ghost.x, ghost.y, ghost.health, ghost.run.wallet, ghost.recovery.grantId];
  drown(game, session, dead);
  let debits = 0;
  assert.equal(session.recover({ kind: 'revival', ownerSeat: owner.seat, targetSeat: ghost.seat,
    debit: () => { debits++; return true; } }), false);
  assert.equal(session.recover({ kind: 'flare', ownerSeat: owner.seat,
    debit: () => { debits++; return true; } }), true);
  assert.equal(debits, 1);
  assert.deepEqual([ghost.x, ghost.y, ghost.health, ghost.run.wallet, ghost.recovery.grantId], ghostState);
  assert.equal(ghost.participation, 'device-lost');
  assert.equal(session.depart(dead.seat), true);
  assert.equal(session.recover({ kind: 'revival', ownerSeat: owner.seat, targetSeat: dead.seat,
    debit: () => { debits++; return true; } }), false);
  assert.equal(debits, 1);
  tick(session, 2.1); // Let the living owner's Flare protection expire.
  drown(game, session, owner);
  tick(session, 8.1);
  assert.ok(session.result, 'an unreclaimed ghost and its unused charge cannot hold the game open');
  assert.equal(ghost.run.wallet, 7);
});

test('archived team results retain real death, revival, coin and ghost counters and reject late actions', () => {
  const { game, session } = setup(); const [primary, traveler] = session.players;
  const participantId = traveler.participantId;
  drown(game, session, traveler); assert.equal(personal(session, traveler), true);
  assert.equal(personal(session, traveler), false, 'duplicate acceptance cannot spend again');
  lane(game, traveler.y, { coin: traveler.x });
  session.update(STEP);
  assert.equal(traveler.run.wallet, 1, 'the returned player collects a real world coin');
  assert.equal(session.deviceLost(traveler.seat), true);
  tick(session, .5);
  assert.equal(session.reclaim(traveler.seat, 'gamepad-7'), true);
  assert.equal(session.depart(traveler.seat), true);
  drown(game, session, primary);
  tick(session, 8.1);
  const result = session.result;
  assert.ok(result);
  const archived = result.contributions.find(value => value.participantId === participantId);
  assert.ok(archived);
  assert.equal(archived.lifecycle, 'departed');
  assert.equal(archived.deaths, 1);
  assert.equal(archived.selfRevives, 1);
  assert.equal(archived.coins, 1);
  assert.ok(archived.ghostSeconds > 0);
  assert.equal(archived.itemsFound, 0, 'coins are not consumable items');
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.contributions) && Object.isFrozen(archived));
  const before = JSON.stringify(result);
  traveler.statistics.selfRevives = 99;
  assert.equal(personal(session, primary), false);
  assert.equal(session.dispatch({ seat: primary.seat, direction: 'forward' }), false);
  assert.equal(session.admit({ seat: 'p2', device: 'keyboard-c', characterId: 'pip' }), false,
    'late drop-in cannot reopen a settled run');
  tick(session, 20);
  assert.strictEqual(session.result, result);
  assert.equal(JSON.stringify(result), before, 'later owner mutations cannot rewrite final contributions');
});
