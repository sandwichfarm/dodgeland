import test, { after } from 'node:test';
import assert from 'node:assert/strict';
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
if (config && !config.modelAttribution) throw Error('Missing recovery-terrain attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 26);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const STEP = 1 / 120;
const columns = Array.from({ length: 11 }, (_, i) => i - 5);
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
];
function meadow(game, y, values = {}) {
  const lane = { ...generateLane(game.seed, y, game.home), kind: 'meadow', blocked: [],
    decorations: [], coin: null, coinActor: undefined, actors: undefined,
    phase: 0, speed: 0, spacing: 40, length: 3, ...values };
  game.rows.set(y, lane); return lane;
}
function personal(p) {
  return structuredClone({ seat: p.seat, id: p.participantId, device: p.device,
    x: p.x, y: p.y, fromX: p.fromX, fromY: p.fromY, hop: p.hop,
    health: p.health, state: p.state, participation: p.participation,
    wallet: p.run.wallet, cards: p.run.cards, powers: p.run.powers, cosmetics: p.run.cosmetics,
    revision: p.run.revision, random: p.run.state, recovery: p.recovery,
    earned: p.earnedDistance, completed: p.completedForwardTiles, stats: p.statistics });
}
function footprint(run) {
  return structuredClone({ time: run.game.time, tick: run.game.world.simulationTick,
    frontier: run.game.world.frontier, wave: run.game.waveRow,
    lifecycle: run.session.lifecycle, players: run.session.players.map(personal), mobs: run.game.mobs });
}
function create(mode, base) {
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const createGame = () => {
    const game = Game.fromSeed(`ph3-00000071-pond-${base === 'arcade' ? 'a' : 's'}-n`, ITEM_CATALOG, 'butter');
    for (let y = -8; y < 30; y++) meadow(game, y);
    return game;
  };
  const acquired = recorder ? recorder.acquireFrom(createGame, base, { seats })
    : (() => { const game = createGame(); return { game, owner: factory(game, { seats }) }; })();
  const { game, owner } = acquired, session = owner.session;
  return { game, owner, session, mode,
    interval: (id, action) => recorder ? recorder.interval(id, action) : action(),
    ticks(count) { for (let n = 0; n < count; n++) session.update(STEP); },
    hop(seat, direction) {
      const p = session.players.find(p => p.seat === seat);
      assert.equal(session.dispatch({ seat, direction }), true);
      for (let n = 0; n < 120 && p.hop > 0; n++) session.update(STEP);
      assert.equal(p.hop, 0); assert.equal(p.state, 'playing');
    },
    finish() { if (recorder) records.push(recorder.finish()); },
  };
}
function fatal(run) {
  assert.deepEqual(run.session.damage('p1', { amount: 3, cause: 'train', reason: 'Component fatal impact.' }),
    { landed: 3, fatal: true });
}
function terminal(run) {
  run.interval('immutable-terminal', () => {
    if (run.mode === 'relay') run.owner.finish();
    else for (const p of run.session.players) {
      assert.equal(run.owner.command(run.owner.actionToken(p.seat), 'leave'), true);
      assert.equal(run.owner.command(run.owner.actionToken(p.seat), 'confirm'), true);
    }
    const result = run.owner.result, frozen = JSON.stringify(result); assert.ok(Object.isFrozen(result));
    const before = footprint(run);
    assert.equal(run.session.recover({ kind: 'personal', ownerSeat: 'p1' }), false);
    assert.equal(run.session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    run.ticks(1); assert.deepEqual(footprint(run), before);
    assert.strictEqual(run.owner.result, result); assert.equal(JSON.stringify(result), frozen);
  });
  run.finish();
}

// These fixtures arrange current hazards only. Input owns every position and
// personal frontier; real fatal damage and recovery own death/offer/charge.
for (const mode of ['relay', 'race']) for (const base of ['arcade', 'stroll'])
for (const hazard of ['blocked', 'missing', 'river', 'road', 'rail', 'mobs'])
test(`${mode}/${base}/${hazard}: unsafe recovery preserves the charge and retries at the cleared cell`, () => {
  const run = create(mode, base), { game, session } = run, [p, other] = session.players;
  run.interval('no-safe-placement-and-corrected-retry', () => {
    for (let n = 0; n < 5; n++) run.hop('p1', 'right');
    assert.equal(p.x, 5); assert.equal(p.earnedDistance, 0); assert.equal(p.completedForwardTiles, 0);
    assert.deepEqual(p.recovery.lastSafe, { x: 5, y: 0 });
    p.run.creditCoins(23); other.run.creditCoins(7); // Explicit starting funds.
    fatal(run);
    assert.equal(p.statistics.deaths, 1); assert.equal(p.deathSpill.wallet, 23);
    assert.equal(p.run.wallet, 0); assert.equal(p.recovery.charge, 'available');
    assert.ok(p.recovery.offer); const offer = p.recovery.offer;
    for (const y of [0, -1, -2]) {
      if (hazard === 'missing') { game.rows.delete(y); continue; }
      const lane = meadow(game, y);
      if (hazard === 'blocked') lane.blocked = [...columns];
      if (hazard === 'river') Object.assign(lane, { kind: 'river', phase: 10, length: 1 });
      if (hazard === 'road') Object.assign(lane, { kind: 'road', length: 30 });
      if (hazard === 'rail') Object.assign(lane, { kind: 'rail', length: 30,
        period: 50, warning: 1.5, phase: 1.5 + .875 - game.time });
      if (hazard === 'mobs') for (const x of columns) game.mobs.push({
        id: 900 + (y + 2) * 11 + x + 5, kind: 'crab', phase: 'rest', phaseLeft: 100,
        phaseDuration: 100, x, y, fromX: x, fromY: y, targetX: x, targetY: y,
      });
    }
    const before = footprint(run);
    assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), false);
    assert.deepEqual(footprint(run), before); assert.strictEqual(p.recovery.offer, offer);
    game.mobs.length = 0;
    meadow(game, 0, { blocked: columns.filter(x => x !== 3) });
    const otherBefore = personal(other), clock = game.time;
    assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
    assert.equal(game.time, clock); assert.deepEqual(personal(other), otherBefore);
    assert.deepEqual([p.x, p.y, p.fromX, p.fromY, p.hop], [3, 0, 3, 0, 0]);
    assert.equal(p.state, 'playing'); assert.equal(p.health, p.maxHealth);
    assert.equal(p.recovery.charge, 'spent'); assert.equal(p.recovery.nextRecharge, 250);
    assert.equal(p.recovery.offer, undefined); assert.equal(p.statistics.selfRevives, 1);
    assert.equal(p.run.wallet, 0); assert.equal(other.run.wallet, 7);
    assert.equal(p.earnedDistance, 0); assert.equal(p.completedForwardTiles, 0);
    const restored = footprint(run);
    assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), false);
    assert.deepEqual(footprint(run), restored);
    for (const y of [0, -1, -2]) meadow(game, y);
  });
  terminal(run);
});

for (const base of ['arcade', 'stroll'])
test(`relay/${base}: blocked post-death rotation waits for a safe cell and fresh incoming confirmation`, () => {
  const run = create('relay', base), { game, session, owner } = run, [p, incoming] = session.players;
  run.interval('spent-revival-and-blocked-rotation', () => {
    fatal(run); assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
    run.ticks(252); // Real elapsed time exhausts personal protection.
    fatal(run); assert.equal(p.statistics.deaths, 2); assert.equal(p.recovery.offer, undefined);
    for (const lane of game.rows.values()) lane.blocked = [...columns];
    run.ticks(1);
    assert.equal(owner.snapshot().phase, 'waiting-for-reclaim'); assert.equal(owner.activeSeat, 'p1');
    assert.equal(owner.result, undefined); assert.equal(p.recovery.charge, 'spent');
    const waiting = footprint(run); run.ticks(120); assert.deepEqual(footprint(run), waiting);
  });
  run.interval('safe-cell-reclaim-and-ready-token', () => {
    assert.equal(session.deviceLost('p2'), true);
    meadow(game, 0, { blocked: columns.filter(x => x !== 2) });
    assert.equal(owner.reclaim('p2', 'keyboard-b'), true);
    assert.equal(owner.activeSeat, 'p2'); assert.equal(owner.snapshot().phase, 'handoff');
    assert.equal(owner.snapshot().readyReason, 'dead');
    assert.deepEqual([incoming.x, incoming.y], [2, 0]);
    assert.equal(incoming.earnedDistance, 0); assert.equal(incoming.completedForwardTiles, 0);
    const token = owner.confirmation();
    for (const patch of [{ seat: 'p1' }, { device: 'keyboard-a' }, { participantId: p.participantId },
      { generation: token.generation - 1 }, { lifecycleGeneration: token.lifecycleGeneration - 1 }]) {
      const before = footprint(run), phase = owner.snapshot();
      assert.equal(owner.confirm({ ...token, ...patch }), false);
      assert.deepEqual(footprint(run), before); assert.deepEqual(owner.snapshot(), phase);
    }
    assert.equal(owner.confirm(token), true); assert.equal(owner.snapshot().phase, 'running');
    assert.equal(owner.confirm(token), false);
    for (const lane of game.rows.values()) meadow(game, lane.index);
    run.hop('p2', 'forward'); assert.equal(incoming.completedForwardTiles, 1);
    assert.equal(p.completedForwardTiles, 0); assert.equal(p.statistics.selfRevives, 1);
    assert.equal(incoming.statistics.selfRevives, 0); assert.equal(incoming.recovery.charge, 'available');
  });
  terminal(run);
});
