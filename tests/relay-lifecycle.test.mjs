import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';
import { semanticValue } from './solo-parity-snapshot.mjs';
const sources = await loadSources(['game', 'relay', 'session-input']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { createRelaySession } = await sources.import('relay');
const STEP = 1 / 120;
function setup(count = 3) {
  const game = new Game(121, 'pond', 'stroll', false, [], 'butter');
  for (const row of game.rows.keys()) game.rows.set(row, { ...generateLane(game.seed, row, game.home), kind: 'meadow', blocked: [], decorations: [], coin: null });
  const relay = createRelaySession(game, { seats: ['butter', 'pip', 'sunny'].slice(0, count).map((characterId, index) => ({ seat: `p${index + 1}`, characterId, device: `gamepad-${index}` })), tilesPerLeg: 1 });
  return { game, relay, session: relay.session };
}
function ticks(run, count = 120) { for (let i = 0; i < count; i++) run.session.update(STEP); }
function assets(run) { return semanticValue(run.session.players.map(p => ({ seat: p.seat, run: p.run, health: p.health, score: p.personalScore, completed: p.completedForwardTiles, deaths: p.statistics.deaths, spill: p.deathSpill }))); }
function act(run, kind, actor) { return run.relay.command({ ...run.relay.actionToken(actor), kind }); }

test('inactive loss retains assets and live time, and normal boundary rotation bypasses it', () => {
  const run = setup(), before = assets(run);
  assert.equal(run.session.deviceLost('p2'), true); ticks(run, 2);
  assert.equal(run.relay.snapshot().phase, 'running'); assert.ok(run.game.time > 0); assert.deepEqual(assets(run), before);
  run.session.dispatch({ seat: 'p1', direction: 'forward' }); ticks(run);
  assert.equal(run.relay.incomingSeat, 'p3');
  assert.equal(run.relay.confirm(run.relay.confirmation()), true); assert.equal(run.relay.activeSeat, 'p3');
});

test('active loss freezes a partial hop; original reclaim preserves it and wrong device cannot mutate', () => {
  const run = setup(); run.session.dispatch({ seat: 'p1', direction: 'forward' }); ticks(run, 2);
  const p = run.session.players[0], before = assets(run), position = [p.x, p.y, p.hop, p.fromY];
  run.session.deviceLost('p1'); const time = run.game.time;
  assert.equal(run.relay.snapshot().phase, 'disconnected'); ticks(run, 2000);
  assert.equal(run.game.time, time); assert.deepEqual(assets(run), before);
  assert.equal(run.session.reclaim('p1', 'gamepad-9'), false);
  assert.equal(run.session.reclaim('p1', 'gamepad-0'), true);
  assert.deepEqual([p.x, p.y, p.hop, p.fromY], position); ticks(run);
  assert.equal(run.relay.snapshot().phase, 'handoff');
});

test('skip requires a connected actor and a fresh second confirmation; cancel preserves the turn', () => {
  const run = setup(); run.session.deviceLost('p1'); const before = assets(run);
  assert.equal(act(run, 'skip', 'p1'), false);
  const stale = { ...run.relay.actionToken('p2'), kind: 'confirm' };
  assert.equal(act(run, 'skip', 'p2'), true); assert.equal(run.relay.snapshot().phase, 'confirm-skip');
  assert.equal(run.relay.command(stale), false); assert.equal(act(run, 'cancel', 'p2'), true);
  assert.equal(run.relay.activeSeat, 'p1'); assert.deepEqual(assets(run), before);
  assert.equal(act(run, 'skip', 'p2'), true); assert.equal(act(run, 'confirm', 'p2'), true);
  assert.equal(run.relay.activeSeat, 'p2'); assert.equal(run.session.players[0].participation, 'device-lost');
  assert.deepEqual(assets(run), before); assert.equal(run.relay.snapshot().outcomes.at(-1).outcome, 'skipped');
});

test('all disconnected seats wait indefinitely and reclaim restores the expected original turn', () => {
  const run = setup(); for (const p of run.session.players) run.session.deviceLost(p.seat);
  assert.equal(run.relay.snapshot().phase, 'waiting-for-reclaim'); const time = run.game.time; ticks(run, 2000);
  assert.equal(run.game.time, time); assert.equal(run.session.admit({ device: 'gamepad-8', characterId: 'miso' }), false);
  assert.equal(run.session.reclaim('p1', 'gamepad-0'), true); assert.equal(run.relay.activeSeat, 'p1');
  assert.equal(run.relay.snapshot().phase, 'running');
});

test('leave is confirmed and archived without death; remaining reclaimable seats wait then end once', () => {
  const run = setup(2), before = assets(run); run.session.deviceLost('p2');
  assert.equal(act(run, 'leave', 'p1'), true); assert.equal(act(run, 'cancel', 'p1'), true);
  assert.deepEqual(assets(run), before); assert.equal(run.session.players[0].participation, 'active');
  assert.equal(act(run, 'leave', 'p1'), true); assert.equal(act(run, 'confirm', 'p1'), true);
  assert.equal(run.relay.snapshot().phase, 'waiting-for-reclaim'); assert.deepEqual(assets(run), before);
  assert.equal(run.session.reclaim('p2', 'gamepad-1'), true);
  assert.equal(act(run, 'leave', 'p2'), true); assert.equal(act(run, 'confirm', 'p2'), true);
  assert.equal(run.relay.snapshot().phase, 'ended');
  const terminal = semanticValue({ relay: run.relay.snapshot(), lifecycle: run.session.lifecycle, assets: assets(run) });
  assert.equal(run.session.deviceLost('p2'), false); assert.equal(run.session.reclaim('p1', 'gamepad-0'), false);
  assert.equal(run.session.depart('p1'), false); ticks(run);
  assert.deepEqual(semanticValue({ relay: run.relay.snapshot(), lifecycle: run.session.lifecycle, assets: assets(run) }), terminal);
});

for (const choice of ['accept', 'decline', 'expire']) test(`actual death ${choice} settles the shared personal offer before rotation`, () => {
  const run = setup(2); run.game.run.creditCoins(11); run.session.players[1].run.creditCoins(17);
  run.game.end('Fixture traffic fatality', 'traffic'); ticks(run, 1);
  const p = run.session.players[0]; assert.equal(p.statistics.deaths, 1); assert.ok(p.recovery.offer);
  assert.equal(p.run.wallet, 0); assert.equal(run.session.players[1].run.wallet, 17);
  assert.equal(run.relay.activeSeat, 'p1'); assert.equal(run.relay.snapshot().phase, 'recovery');
  if (choice === 'accept') {
    assert.equal(run.session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
    assert.equal(run.relay.activeSeat, 'p1'); assert.equal(run.relay.snapshot().phase, 'running');
    assert.equal(p.recovery.charge, 'spent'); assert.ok(p.recovery.protectionUntil > run.game.time);
  } else {
    if (choice === 'decline') { run.session.declineRecovery('p1'); ticks(run, 1); } else ticks(run, 1100);
    assert.equal(run.relay.activeSeat, 'p2'); assert.equal(run.relay.snapshot().outcomes.at(-1).outcome, 'dead');
    assert.equal(p.statistics.deaths, 1);
  }
});
