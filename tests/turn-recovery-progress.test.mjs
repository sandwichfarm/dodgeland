import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources = await loadSources(['game', 'relay', 'race', 'market/catalog']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing earned-recovery attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 4);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const STEP = 1 / 120;
const roster = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'pip' },
];

function meadow(game, y) {
  game.rows.set(y, { ...generateLane(game.seed, y, game.home), kind: 'meadow',
    blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined });
}
function create(mode, targetSeat) {
  const game = new Game(113, 'pond', 'stroll', false, ITEM_CATALOG, 'butter');
  // Explicit component corridor and stationary collision fixture. No progress,
  // cooldown, recovery, clocks or authority callbacks are injected.
  for (let y = -8; y <= 650; y++) meadow(game, y);
  const fatalRow = mode === 'relay' && targetSeat === 'p2' ? 51 : 1;
  Object.assign(game.rows.get(fatalRow), { kind: 'road', phase: 0, speed: 0,
    spacing: 20, length: 1.15 });
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const proposal = { seats: roster, ...(mode === 'relay'
    ? { tilesPerLeg: 50 } : { finishTiles: 500, activeSeconds: 180 }) };
  const owner = recorder ? recorder.acquire(game, proposal) : factory(game, proposal);
  const session = owner.session;
  // Starting damage makes even a rear bump fatal; the collision itself still
  // goes through the actual swept contact, health and death transaction.
  session.players.find(player => player.seat === targetSeat).health = .5;
  if (mode === 'race') for (const player of session.players) {
    const x = player.seat === targetSeat ? 0 : player.seat === 'p1' ? -4 : 4;
    player.x = player.fromX = x;
  }
  return { mode, game, owner, session, fatalRow,
    target: session.players.find(player => player.seat === targetSeat),
    other: session.players.find(player => player.seat !== targetSeat),
    interval: (id, action) => recorder ? recorder.interval(id, action) : action(),
    finish: () => { if (recorder) records.push(recorder.finish()); } };
}
function ticks(run, count) { for (let i = 0; i < count; i++) run.session.update(STEP); }
function hop(run, seats) {
  for (const seat of seats) assert.equal(run.session.dispatch({ seat, direction: 'forward' }), true);
  for (let i = 0; i < 120 && run.session.players.some(player => player.hop > 0); i++) ticks(run, 1);
  assert.equal(run.session.players.some(player => player.hop > 0), false);
}
function credit(player) {
  return { completed: player.completedForwardTiles, high: player.recovery.personalHighWater,
    charge: player.recovery.charge, next: player.recovery.nextRecharge,
    selfRevives: player.statistics.selfRevives, deaths: player.statistics.deaths };
}
function confirm(run) {
  const before = run.session.players.map(credit);
  assert.equal(run.owner.confirm(run.owner.confirmation()), true);
  assert.deepEqual(run.session.players.map(credit), before, 'baton placement cannot award personal recharge');
}
function targetHop(run) {
  if (run.mode === 'relay') {
    for (let guard = 0; guard < 110; guard++) {
      if (run.owner.snapshot().phase === 'handoff') { confirm(run); continue; }
      if (run.owner.activeSeat === run.target.seat) break;
      const before = credit(run.target);
      hop(run, [run.owner.activeSeat]);
      assert.deepEqual(credit(run.target), before, 'another leg cannot recharge the benched owner');
    }
    assert.equal(run.owner.activeSeat, run.target.seat);
    hop(run, [run.target.seat]);
  } else hop(run, run.session.players.map(player => player.seat));
}

for (const mode of ['relay', 'race']) for (const targetSeat of ['p1', 'p2'])
test(`${mode} ${targetSeat}: real revival recharges on settled personal hop250, never team placement`, () => {
  const run = create(mode, targetSeat), { session, target, other, game, owner } = run;
  run.interval('real-fatal-crossing', () => {
    if (mode === 'relay' && targetSeat === 'p2') {
      for (let tile = 0; tile < 50; tile++) hop(run, ['p1']);
      assert.equal(owner.snapshot().phase, 'handoff'); confirm(run);
      assert.equal(target.completedForwardTiles, 0);
    }
    assert.equal(session.dispatch({ seat: targetSeat, direction: 'forward' }), true);
    for (let tick = 0; tick < 120 && target.state !== 'dead'; tick++) ticks(run, 1);
    assert.equal(target.state, 'dead'); assert.equal(target.deathCause, 'traffic');
    assert.equal(target.completedForwardTiles, 0); assert.equal(target.statistics.deaths, 1);
    assert.equal(target.statistics.innateUses, 0); assert.ok(target.recovery.offer);
    assert.equal(target.recovery.charge, 'available');
  });
  run.interval('actual-recovery-and-pause', () => {
    const before = credit(other);
    assert.equal(session.recover({ kind: 'personal', ownerSeat: other.seat }), false);
    assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p4' }), false);
    assert.equal(session.recover({ kind: 'personal', ownerSeat: targetSeat }), true);
    assert.equal(session.recover({ kind: 'personal', ownerSeat: targetSeat }), false);
    assert.deepEqual(credit(target), { completed: 0, high: 0, charge: 'spent', next: 250,
      selfRevives: 1, deaths: 1 });
    assert.deepEqual(credit(other), before); assert.equal(target.state, 'playing');
    const time = session.world.time, saved = session.players.map(credit);
    game.pause(); ticks(run, 120);
    assert.equal(session.world.time, time); assert.deepEqual(session.players.map(credit), saved);
    const motion = () => session.players.map(player => ({ seat: player.seat, x: player.x, y: player.y, hop: player.hop, earned: player.earnedDistance }));
    const beforeMotion = motion();
    const accepted = session.dispatch({ seat: targetSeat, direction: 'forward' });
    assert.equal(accepted, false, JSON.stringify({ sharedState: game.state, targetSeat, beforeMotion, afterMotion: motion() }));
    assert.deepEqual(motion(), beforeMotion); assert.deepEqual(session.players.map(credit), saved); game.resume();
  });
  // Replace only the initial road fixture outside the earned-movement interval.
  meadow(game, run.fatalRow);
  run.interval('earned249', () => {
    for (let tile = 1; tile <= 249; tile++) {
      targetHop(run);
      assert.equal(target.completedForwardTiles, tile);
      assert.equal(target.recovery.personalHighWater, tile);
      assert.equal(target.recovery.charge, 'spent'); assert.equal(target.recovery.nextRecharge, 250);
      assert.equal(target.statistics.selfRevives, 1); assert.equal(target.statistics.deaths, 1);
      assert.equal(other.recovery.charge, 'available'); assert.equal(other.statistics.selfRevives, 0);
    }
  });
  run.interval('earned250', () => {
    targetHop(run);
    assert.equal(target.completedForwardTiles, 250); assert.equal(target.recovery.personalHighWater, 250);
    assert.equal(target.recovery.charge, 'available'); assert.equal(target.recovery.nextRecharge, 500);
    assert.equal(target.recovery.offer, undefined);
  });
  run.interval('earned251', () => {
    targetHop(run);
    assert.equal(target.completedForwardTiles, 251); assert.equal(target.recovery.personalHighWater, 251);
    assert.equal(target.recovery.charge, 'available'); assert.equal(target.recovery.nextRecharge, 500);
    assert.equal(target.statistics.selfRevives, 1); assert.equal(target.statistics.deaths, 1);
    assert.equal(target.statistics.innateUses, 0); assert.equal(other.statistics.deaths, 0);
  });
  run.interval('frozen-result', () => {
    if (mode === 'relay') owner.finish();
    else for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    const result = owner.result, saved = JSON.stringify(result);
    assert.ok(Object.isFrozen(result));
    const contribution = (mode === 'relay' ? result.contributions : result.players).find(p => p.seat === targetSeat);
    assert.equal(contribution.selfRevives, 1); assert.equal(contribution.deaths, 1);
    assert.equal(session.dispatch({ seat: targetSeat, direction: 'forward' }), false);
    ticks(run, 120); assert.strictEqual(owner.result, result); assert.equal(JSON.stringify(result), saved);
  });
  run.finish();
});
