import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session']);
const { Game } = await sources.import('game');
const { LocalSession, SessionPlayer } = await sources.import('session');

function meadowRows(game) {
  for (const lane of game.rows.values()) {
    lane.kind = 'meadow';
    lane.blocked = [];
    lane.decorations = [];
    lane.coin = null;
    lane.coinActor = undefined;
    lane.actors = undefined;
    lane.phase = 0;
    lane.speed = 1;
    lane.spacing = 20;
    lane.length = 1.15;
    lane.variant = 0;
  }
}

function pondStroll() {
  const game = new Game(71, 'pond', 'stroll', false, [], 'pip');
  game.ensureRows();
  meadowRows(game);
  const session = LocalSession.stage(game, { secondaryCharacterId: 'pip' }).commit();
  const p1 = session.players.find(player => player.seat === 'p1');
  const p2 = session.players.find(player => player.seat === 'p2');
  assert.ok(p1); assert.ok(p2);
  p1.x = p1.fromX = 2; p1.y = p1.fromY = 0;
  p2.x = p2.fromX = 0; p2.y = p2.fromY = 0;
  game.rows.get(0).coin = 0;
  return { game, session, p1, p2 };
}

test('reentrant P2 reward callback dispatches P1 through its explicit operation context', () => {
  const { game, session, p1, p2 } = pondStroll();
  p2.onCoin = () => {
    assert.equal(game.characterId, p1.characterId, 'the host facade remains P1 while P2 callback runs');
    assert.equal(game.coins, p1.coins, 'P2 never appears through host reads');
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    game.pause();
    assert.equal(p1.state, 'paused', 'a direct host operation still targets P1 after nested dispatch');
    assert.equal(p2.state, 'playing');
  };
  session.update(0);
  assert.equal(p1.y, 1, 'the P1 dispatch uses P1 state inside P2 callback re-entry');
  assert.equal(p2.y, 0, 'P2 does not consume P1 reentrant input');
  assert.equal(game.rows.get(0).coin, null);
});

test('P2 progress invokes its typed onHeal callback once without facade callback crashes', () => {
  const { game, session, p2 } = pondStroll();
  p2.earnedDistance = 99; p2.maxY = p2.y = p2.fromY = 99; p2.health = 2;
  game.world.noteProgress(99); game.ensureRows(); meadowRows(game);
  let heals = 0;
  p2.onHeal = amount => { heals += amount; };
  assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), true);
  assert.equal(heals, .5);
  assert.equal(p2.health, 2.5);
});

test('primary and secondary players expose the same legacy callback signatures', () => {
  const { game, session, p1, p2 } = pondStroll();
  const coins = [];
  p1.onCoin = amount => coins.push(['p1', amount]);
  p2.onCoin = amount => coins.push(['p2', amount]);
  game.awardSessionPickup(p1, 1); game.awardSessionPickup(p2, 1);
  assert.deepEqual(coins, [['p1', 1], ['p2', 1]]);
  const collision = roster(2);
  const [collisionP1, collisionP2] = collision.players, ended = [];
  collisionP1.onEnd = () => ended.push(['p1', collisionP1.reason, collisionP1.deathCause]);
  collisionP2.onEnd = () => ended.push(['p2', collisionP2.reason, collisionP2.deathCause]);
  collisionP1.health = collisionP2.health = 1; collisionP1.powerReadyAt = collisionP2.powerReadyAt = 1_000_000;
  collisionP1.x = collisionP1.fromX = collisionP2.x = collisionP2.fromX = 0;
  Object.assign(collision.game.rows.get(0), { kind: 'road', blocked: [], coin: null, phase: 0, speed: 0, spacing: 20, length: 1.15 });
  collision.session.update(0);
  assert.deepEqual(ended, [['p1', collisionP1.reason, 'traffic'], ['p2', collisionP2.reason, 'traffic']]);
});

function roster(size) {
  const game = new Game(89, 'pond', 'arcade', false, [], 'pip');
  meadowRows(game);
  const seats = ['p1', 'p2', 'p3', 'p4'];
  const players = [game.player];
  const characters = ['pip', 'butter', 'sunny', 'petal'];
  for (let index = 1; index < size; index++) players.push(new SessionPlayer(game.world, seats[index], `keyboard-${String.fromCharCode(97 + index)}`, characters[index]));
  const session = new LocalSession(game.world, players);
  session.start();
  return { game, session, players };
}

test('world once advances identical clocks for one, two, and four seats', () => {
  const snapshots = [1, 2, 4].map(size => {
    const { game, session } = roster(size);
    const before = game.time;
    session.update(1 / 120);
    return { delta: game.time - before, tick: game.world.simulationTick, rows: [...game.rows.keys()], mobs: game.mobs.length };
  });
  assert.deepEqual(snapshots[1], snapshots[0]);
  assert.deepEqual(snapshots[2], snapshots[0]);
});

test('one director keeps spawn snapshots and RNG continuation identical for one, two, and four seats', () => {
  const snapshots = [1, 2, 4].map(size => {
    const { game, session, players } = roster(size);
    const prepare = score => {
      for (const player of players) player.y = player.fromY = player.maxY = score;
      game.world.noteProgress(score); game.ensureRows(); meadowRows(game);
    };
    prepare(160); game.time = 45; session.update(0);
    const first = structuredClone(game.mobs);
    assert.equal(first.length, 1, 'the eligible shared director spawns exactly once');
    game.mobs.length = 0;
    prepare(184); game.time += 18; session.update(0);
    return { first, continuation: structuredClone(game.mobs), tick: game.world.simulationTick, time: game.time };
  });
  assert.deepEqual(snapshots[1], snapshots[0]);
  assert.deepEqual(snapshots[2], snapshots[0]);
  assert.equal(snapshots[0].continuation[0].id, 2, 'the second spawn consumes the same single director stream');
});

test('staged 1/2/4 roster validates identities and assigns distinct safe cells', () => {
  const game = new Game(93, 'pond', 'arcade', false, [], 'pip'); meadowRows(game);
  const stage = LocalSession.stage(game, { roster: [
    { seat: 'p2', device: 'keyboard-b', characterId: 'butter' },
    { seat: 'p3', device: 'keyboard-c', characterId: 'sunny' },
    { seat: 'p4', device: 'keyboard-d', characterId: 'petal' },
  ] });
  assert.equal(stage.session.players.length, 4);
  assert.equal(new Set(stage.session.players.map(player => player.x)).size, 4);
  assert.deepEqual(stage.session.views().map(view => [view.seat, view.marker]), [['p1', 'P1'], ['p2', 'P2'], ['p3', 'P3'], ['p4', 'P4']]);
  assert.throws(() => LocalSession.stage(game, { roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'butter' }, { seat: 'p2', device: 'keyboard-c', characterId: 'sunny' }] }));
  assert.throws(() => LocalSession.stage(game, { roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'pip' }] }));
});

test('contested pickup resolves one award by stable seat after all player candidates', () => {
  const { game, session, players } = roster(2);
  for (const player of players) { player.x = player.fromX = 0; player.y = player.fromY = 0; }
  const lane = game.rows.get(0); lane.coin = 0; lane.coinActor = undefined;
  const awards = [];
  game.onCoin = amount => awards.push(['p1', amount]);
  players[1].onCoin = amount => awards.push(['p2', amount]);
  session.update(0);
  assert.deepEqual(awards, [['p1', 1]]);
  assert.equal(players[0].statistics.pickups, 1);
  assert.equal(players[1].statistics.pickups, 0);
  assert.equal(lane.coin, null);
});

test('stable target chooses nearest active player and p1 on an equal-distance reversed roster', () => {
  const { game, players } = roster(2);
  players[0].x = players[0].fromX = -1; players[1].x = players[1].fromX = 1;
  players[0].y = players[0].fromY = players[1].y = players[1].fromY = 0;
  assert.equal(game.world.selectMobTarget([players[1], players[0]]).seat, 'p1');
  game.mobs.push({ id: 1, kind: 'slime', x: .8, y: 0, fromX: .8, fromY: 0, targetX: .8, targetY: 0, phase: 'rest', phaseLeft: 1, phaseDuration: 1 });
  assert.equal(game.world.selectMobTarget([players[0], players[1]]).seat, 'p2');
});

test('one director selects per-mob nearest targets and sweeps every active player', () => {
  const { game, session, players } = roster(2);
  const [p1, p2] = players;
  p1.x = p1.fromX = -1; p2.x = p2.fromX = 1;
  p1.y = p1.fromY = p2.y = p2.fromY = 0;
  game.mobs.push(
    { id: 1, kind: 'wasp', x: -.1, y: 0, fromX: -.1, fromY: 0, targetX: -.1, targetY: 0, phase: 'rest', phaseLeft: 0, phaseDuration: 1 },
    { id: 2, kind: 'wasp', x: .1, y: 0, fromX: .1, fromY: 0, targetX: .1, targetY: 0, phase: 'rest', phaseLeft: 0, phaseDuration: 1 },
  );
  session.update(0);
  assert.deepEqual(game.mobs.map(mob => mob.targetX), [-1, 1]);
  assert.equal(p1.state, 'playing'); assert.equal(p2.state, 'playing');
  const collision = roster(2);
  const [collisionP1, collisionP2] = collision.players;
  collisionP1.health = collisionP2.health = 1;
  collisionP1.powerReadyAt = collisionP2.powerReadyAt = 1_000_000;
  collisionP1.x = collisionP1.fromX = collisionP2.x = collisionP2.fromX = -1;
  collision.game.mobs.push({ id: 3, kind: 'slime', x: -.5, y: 0, fromX: -.5, fromY: 0, targetX: -.5, targetY: 0, phase: 'rest', phaseLeft: 1, phaseDuration: 1 });
  assert.equal(collision.session.dispatch({ seat: 'p1', direction: 'right' }), true);
  assert.equal(collision.session.dispatch({ seat: 'p2', direction: 'right' }), true);
  collision.session.update(collision.game.rules.movement.hopDuration);
  assert.equal(collisionP1.state, 'dead'); assert.equal(collisionP2.state, 'dead');
  assert.deepEqual(collision.session.lifecycle.filter(record => record.type === 'player-death').map(record => record.seat), ['p1', 'p2']);
});

test('director ignores a player made terminal by an earlier personal hazard in the same frame', () => {
  const { game, session, players } = roster(2);
  const [p1, p2] = players;
  p1.health = 1; p1.powerReadyAt = 1_000_000;
  p1.x = p1.fromX = 0; p2.x = p2.fromX = 3;
  Object.assign(game.rows.get(0), { kind: 'road', blocked: [], coin: null, phase: 0, speed: 0, spacing: 20, length: 1.15 });
  game.mobs.push({ id: 4, kind: 'wasp', x: 1.5, y: 0, fromX: 1.5, fromY: 0, targetX: 1.5, targetY: 0, phase: 'rest', phaseLeft: 0, phaseDuration: 1 });
  session.update(0);
  assert.equal(p1.state, 'dead'); assert.equal(p2.state, 'playing');
  assert.equal(game.mobs[0].targetX, 3);
});

test('earliest contested contact beats stable seat when one player reaches the pickup later', () => {
  const { game, session, players } = roster(2);
  const [p1, p2] = players;
  p1.x = p1.fromX = -1; p1.y = p1.fromY = 0;
  p2.x = p2.fromX = 0; p2.y = p2.fromY = 0;
  const lane = game.rows.get(0); lane.coin = 0; lane.coinActor = undefined;
  assert.equal(session.dispatch({ seat: 'p1', direction: 'right' }), true);
  session.update(game.rules.movement.hopDuration);
  assert.equal(p1.coins, 0); assert.equal(p2.coins, 1);
});

test('competing gravity pulls elect the nearest seat and stable-seat ties once after all proposals', () => {
  const claim = (p1x, p2x) => {
    const { game, session, players } = roster(2);
    players[0].x = players[0].fromX = p1x;
    players[1].x = players[1].fromX = p2x;
    game.rows.get(0).coin = 0; game.rows.get(0).coinActor = undefined;
    session.update(0);
    return game.world.pickupOwners.get(0);
  };
  assert.equal(claim(-.62, .55), 'p2');
  assert.equal(claim(.55, .55), 'p1');
});

test('device loss, reclaim, and departure preserve personal inventory and emit disjoint lifecycle records', () => {
  const { session, players } = roster(2);
  const p2 = players[1];
  p2.run.wallet = 7; p2.coins = 7; const character = p2.characterId;
  assert.equal(session.deviceLost('p2'), true);
  assert.equal(p2.run.wallet, 7); assert.equal(p2.characterId, character);
  assert.equal(session.offerReclaim('p2', 'gamepad-7'), true);
  assert.equal(p2.device, 'keyboard-b', 'an offer never claims or reactivates the seat');
  assert.equal(session.reclaim('p2', 'gamepad-7'), true);
  assert.equal(p2.device, 'gamepad-7'); assert.equal(p2.run.wallet, 7);
  assert.equal(session.depart('p2'), true);
  assert.deepEqual(session.lifecycle.map(record => record.type), ['device-lost', 'reclaim-offered', 'reclaimed', 'departed']);
  assert.deepEqual(session.lifecycle.map(record => [record.previous, record.next]), [['active', 'device-lost'], ['device-lost', 'device-lost'], ['device-lost', 'active'], ['active', 'departed']]);
  assert.ok(session.lifecycle.every(record => record.sessionId === session.id && record.playerId === `${session.id}:p2`));
});

test('player death spills and clears only the terminal player before its lifecycle record', () => {
  const { game, session, players } = roster(2);
  const [p1, p2] = players;
  p1.run.wallet = 3; p2.run.wallet = 7; p2.coins = 7; p2.health = 1;
  const lane = game.rows.get(0);
  Object.assign(lane, { kind: 'road', blocked: [], coin: null, phase: 0, speed: 0, spacing: 20, length: 1.15 });
  p2.x = p2.fromX = 0; p2.y = p2.fromY = 0;
  session.update(0);
  assert.equal(p2.state, 'dead'); assert.ok(p2.deathSpill);
  assert.equal(p2.run.wallet, 0); assert.equal(p1.run.wallet, 3);
  const death = session.lifecycle.at(-1);
  assert.equal(death.type, 'player-death'); assert.equal(death.seat, 'p2');
  assert.equal(p2.statistics.deaths, 1); assert.equal(p2.statistics.deathCause, 'traffic');
});
