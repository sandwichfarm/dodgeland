import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'relay']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { createRelaySession } = await sources.import('relay');
const STEP = 1 / 120;

function setup(length = 50, mode = 'stroll') {
  const game = new Game(121, 'pond', mode, false, [], 'butter');
  for (const row of game.rows.keys()) courseLane(game, row);
  const relay = createRelaySession(game, { seats: [
    { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
    { seat: 'p2', characterId: 'pip', device: 'keyboard-b' },
  ], tilesPerLeg: length });
  return { game, relay, session: relay.session };
}
function ticks(session, count) { for (let tick = 0; tick < count; tick++) session.update(STEP); }
function step(run, direction = 'forward') {
  const player = run.session.players.find(player => player.seat === run.relay.activeSeat);
  courseLane(run.game, player.y); courseLane(run.game, player.y + (direction === 'back' ? -1 : 1));
  assert.equal(run.session.dispatch({ seat: player.seat, direction }), true);
  for (let tick = 0; tick < 120 && player.hop > 0; tick++) run.session.update(STEP);
  assert.equal(player.hop, 0); assert.equal(player.state, 'playing');
}

function courseLane(game, row, extra = {}) {
  const lane = { ...generateLane(game.seed, row, game.home), kind: 'meadow',
    blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined,
    phase: 0, speed: 0, spacing: 20, length: 1.15, variant: 0, ...extra };
  game.rows.set(row, lane);
  return lane;
}

test('a fatal boundary landing resolves the existing personal recovery before any transfer', () => {
  const game = new Game(121, 'pond', 'stroll', false, [], 'butter');
  for (const row of game.rows.keys()) courseLane(game, row);
  const relay = createRelaySession(game, { seats: [
    { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
    { seat: 'p2', characterId: 'pip', device: 'keyboard-b' },
  ], tilesPerLeg: 1 });
  const session = relay.session, player = session.players[0], world = session.world;
  player.powerReadyAt = 10000; // Fixture: innate water rescue is already on cooldown.
  session.update(STEP);
  const safe = { x: player.groundX, y: player.groundY };
  assert.equal(player.recovery.charge, 'available');
  courseLane(game, 1, { kind: 'river', phase: 10, length: 1 });
  assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  for (let tick = 0; tick < 120 && player.state !== 'dead'; tick++) session.update(STEP);
  assert.equal(player.state, 'dead', 'the real unsupported river landing must kill');
  assert.equal(player.participation, 'dead');
  assert.equal(player.statistics.deaths, 1);
  assert.equal(player.run.alive, false, 'production death clears only the dead run');
  assert.equal(relay.snapshot().phase, 'running', 'fatal hazard wins over handoff');
  assert.equal(player.completedForwardTiles, 0, 'fatal unfinished movement cannot earn revival tiles');
  assert.equal(session.players[1].run.alive, true);
  assert.strictEqual(session.world, world);
  assert.ok(player.recovery.offer, 'a charged dead active runner needs the delivered personal-recovery offer');
  assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
  assert.equal(player.state, 'playing');
  assert.deepEqual({ x: player.groundX, y: player.groundY }, safe);
  assert.equal(player.recovery.charge, 'spent');
  assert.equal(relay.snapshot().phase, 'running');
});

for (const length of [1, 7, 50, 999]) test(`length ${length}: authored frontier opens exactly one settled boundary`, () => {
  const run = setup(length);
  for (let hop = 1; hop < length; hop++) { step(run); assert.equal(run.relay.snapshot().phase, 'running'); }
  const player = run.session.players[0];
  courseLane(run.game, length);
  assert.equal(run.session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  assert.equal(run.relay.snapshot().phase, 'running');
  run.session.update(STEP);
  assert.ok(player.hop > 0); assert.equal(run.relay.snapshot().phase, 'running');
  assert.equal(run.relay.snapshot().pendingBoundary?.target, length, 'post-tick pending record retains exact target');
  const pending = run.relay.snapshot().pendingBoundary;
  ticks(run.session, 120);
  assert.equal(run.relay.snapshot().phase, 'handoff');
  const before = run.session.world.time; ticks(run.session, 120);
  assert.equal(run.session.world.time, before);
  assert.equal(run.relay.snapshot().transferGeneration, 1);
  assert.equal(run.relay.snapshot().pendingBoundary, pending, 'one immutable latch survives settlement');
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  assert.equal(run.relay.snapshot().nextBoundary, length * 2);
  assert.equal(run.relay.snapshot().leg, 2);
  step(run);
  assert.equal(run.session.world.frontier, length + 1);
  assert.equal(run.relay.snapshot().phase, length === 1 ? 'handoff' : 'running');
});

test('49/50/49/50 crossings cannot duplicate credit or reopen boundary 50', () => {
  const run = setup(50);
  for (let hop = 0; hop < 49; hop++) step(run);
  step(run, 'back'); step(run);
  assert.equal(run.session.players[0].completedForwardTiles, 49);
  step(run); assert.equal(run.relay.snapshot().phase, 'handoff');
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  const incoming = run.session.players[1];
  step(run, 'back'); step(run);
  assert.equal(incoming.completedForwardTiles, 0); assert.equal(incoming.personalScore, 0);
  assert.equal(run.relay.snapshot().phase, 'running'); assert.equal(run.relay.snapshot().transferGeneration, 1);
  step(run); assert.equal(incoming.completedForwardTiles, 1); assert.equal(run.session.world.frontier, 51);
  assert.equal(run.relay.snapshot().nextBoundary, 100);
});

test('an exceptional frontier jump produces one opportunity then chooses the smallest future boundary', () => {
  const run = setup(7), player = run.session.players[0];
  // Corrupted/external positioning is a fixture, never an authored hop or a callback.
  player.x = player.fromX = 0; player.y = player.fromY = player.maxY = 8;
  run.session.world.frontier = 8; courseLane(run.game, 8); ticks(run.session, 2);
  assert.equal(run.relay.snapshot().phase, 'running', 'position alone cannot emit a leg');
  step(run);
  assert.equal(run.relay.snapshot().phase, 'handoff'); assert.equal(run.relay.snapshot().transferGeneration, 1);
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  assert.equal(run.relay.snapshot().nextBoundary, 14);
  ticks(run.session, 2); assert.equal(run.relay.snapshot().phase, 'running');
  for (let frontier = 10; frontier <= 14; frontier++) { step(run); assert.equal(run.relay.snapshot().phase, frontier === 14 ? 'handoff' : 'running'); }
  assert.equal(run.relay.snapshot().transferGeneration, 2);
});

test('successful innate rescue settles before opening the already latched boundary', () => {
  const run = setup(1), player = run.session.players[0];
  courseLane(run.game, 1, { kind: 'river', phase: 10, length: 1 });
  assert.equal(run.session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  for (let tick = 0; tick < 120 && !player.powerRescue; tick++) run.session.update(STEP);
  assert.ok(player.powerRescue); assert.equal(player.state, 'playing');
  assert.equal(run.relay.snapshot().phase, 'running');
  const time = run.session.world.time;
  for (let tick = 0; tick < 600 && run.relay.snapshot().phase !== 'handoff'; tick++) run.session.update(STEP);
  assert.equal(player.powerRescue, null); assert.equal(player.statistics.deaths, 0);
  assert.ok(run.session.world.time > time, 'rescue needs live simulation');
  assert.equal(run.relay.snapshot().phase, 'handoff');
  assert.equal(run.session.isRecoverySafePosition(player), true);
});
