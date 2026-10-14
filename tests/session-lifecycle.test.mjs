import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session']);
after(() => sources.dispose());
const { Game } = await sources.import('game');
const { LocalSession } = await sources.import('session');

function meadowRows(game) {
  for (const lane of game.rows.values()) Object.assign(lane, {
    kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, phase: 0, speed: 1, spacing: 20, length: 1.15, variant: 0,
  });
}

function startSession(onLifecycle = () => {}) {
  const game = new Game(71, 'pond', 'stroll', false, [], 'pip');
  game.ensureRows(); meadowRows(game);
  const session = LocalSession.stage(game, { secondaryCharacterId: 'butter', onLifecycle }).commit();
  const p1 = session.players.find(player => player.seat === 'p1');
  const p2 = session.players.find(player => player.seat === 'p2');
  assert.ok(p1); assert.ok(p2);
  return { game, session, p1, p2 };
}

test('device-lost and departed seats cannot move or claim a shared pickup', () => {
  const { game, session, p1, p2 } = startSession();
  p1.x = p1.fromX = 4; p1.y = p1.fromY = -2;
  p2.x = p2.fromX = 0; p2.y = p2.fromY = 0;
  game.rows.get(0).coin = 0;
  const before = { x: p2.x, y: p2.y, coins: p2.coins, wallet: p2.run.wallet };

  assert.equal(session.deviceLost('p2'), true);
  assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), false);
  session.update(0);
  assert.deepEqual({ x: p2.x, y: p2.y, coins: p2.coins, wallet: p2.run.wallet }, before);
  assert.equal(game.rows.get(0).coin, 0, 'a device-lost player cannot claim the pickup');

  assert.equal(session.depart('p2'), true);
  assert.equal(session.dispatch({ seat: 'p2', direction: 'right' }), false);
  session.update(0);
  assert.deepEqual({ x: p2.x, y: p2.y, coins: p2.coins, wallet: p2.run.wallet }, before);
  assert.equal(game.rows.get(0).coin, 0, 'a departed player cannot claim the pickup');
});

test('reclaim cannot steal an active seat device', () => {
  const { session, p1, p2 } = startSession();
  assert.equal(session.deviceLost('p2'), true);
  assert.equal(session.reclaim('p2', p1.device), false);
  assert.equal(p1.device, 'keyboard-a');
  assert.equal(p2.device, 'keyboard-b');
  assert.equal(p2.participation, 'device-lost');
});

test('reclaim offers preserve the original device and survive a reentrant approved reclaim', () => {
  let session;
  const callbacks = [];
  const { p2, ...started } = startSession(record => {
    callbacks.push(record);
    if (record.type === 'reclaim-offered') {
      assert.equal(record.device, 'keyboard-b');
      assert.equal(record.offeredDevice, 'gamepad-7');
      assert.equal(Object.isFrozen(record), true);
      assert.equal(session.reclaim('p2', record.offeredDevice), true);
    }
  });
  session = started.session;
  assert.equal(session.deviceLost('p2'), true);
  assert.equal(session.offerReclaim('p2', 'gamepad-7'), true);
  assert.equal(p2.device, 'gamepad-7');
  assert.equal(p2.participation, 'active');
  assert.deepEqual(callbacks.map(record => record.type), ['device-lost', 'reclaim-offered', 'reclaimed']);
  assert.deepEqual(session.lifecycle.map(record => record.type), ['device-lost', 'reclaim-offered', 'reclaimed']);
});

test('simultaneous deaths publish immutable records after all player statistics settle once', () => {
  const handlerSnapshots = [];
  const { game, session, p1, p2 } = startSession(record => {
    if (record.type !== 'player-death') return;
    handlerSnapshots.push({
      record,
      participation: session.players.map(player => player.participation),
      deaths: session.players.map(player => player.statistics.deaths),
      causes: session.players.map(player => player.statistics.deathCause),
    });
  });
  p1.health = p2.health = 1;
  p1.powerReadyAt = p2.powerReadyAt = 1_000_000;
  p1.x = p1.fromX = p2.x = p2.fromX = 0;
  p1.y = p1.fromY = p2.y = p2.fromY = 0;
  Object.assign(game.rows.get(0), { kind: 'road', blocked: [], coin: null, phase: 0, speed: 0, spacing: 20, length: 1.15 });

  session.update(0);
  assert.equal(handlerSnapshots.length, 2);
  for (const snapshot of handlerSnapshots) {
    assert.equal(Object.isFrozen(snapshot.record), true);
    assert.deepEqual(snapshot.participation, ['dead', 'dead']);
    assert.deepEqual(snapshot.deaths, [1, 1]);
    assert.deepEqual(snapshot.causes, ['mob', 'mob']);
  }
  const deaths = session.lifecycle.filter(record => record.type === 'player-death');
  assert.equal(deaths.length, 2);
  session.update(0);
  assert.equal(session.lifecycle.filter(record => record.type === 'player-death').length, 2, 'later ticks cannot duplicate terminal lifecycle records');
});
