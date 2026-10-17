import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources = await loadSources(['game', 'race', 'actors', 'market/catalog']);
after(() => sources.dispose());
const { Game, laneActors, platformSupports } = await sources.import('game');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { createActorPattern } = await sources.import('actors');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing Race river item attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 20);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const STEP = 1 / 120;
// Deterministic released sampler seeds, selected outside mode capture. No item
// or charge is injected: Race installs its real schema and samples row one.
const seeds = { 'mud-splash': 732, 'fog-lantern': 1624 };
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
];
function create(base, itemId, recipe) {
  const recorder = inventory ? createTurnModelRecorder({ mode: 'race', inventory,
    factory: createRaceSession, Coordinator: RaceCoordinator, authority,
    identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const make = () => {
    const schema = recipe === 'legacy' ? 1 : 3;
    const game = Game.fromSeed(`ph${schema}-${seeds[itemId].toString(16).padStart(8, '0')}-pond-${base === 'arcade' ? 'a' : 's'}-n`, ITEM_CATALOG, 'butter');
    // Explicit component terrain/platform asset fixture before the actual mode
    // acquisition. No pickup, pose, clock, progress, policy or effect rewrite.
    for (const lane of game.rows.values()) Object.assign(lane, {
      kind: 'meadow', blocked: [], decorations: [], coin: null,
      coinActor: undefined, coinPull: undefined, actors: undefined,
    });
    Object.assign(game.rows.get(1), { kind: 'river', speed: itemId === 'mud-splash' ? -.12 : .12,
      phase: .1, spacing: 5, length: 4, variant: 0,
      actors: recipe === 'varied' ? createActorPattern('platforms', [
        { kind: 'platform', length: 2.5, variant: 0, speedFactor: 1, gap: 1.75 },
        { kind: 'platform', length: 4, variant: 0, speedFactor: 1, gap: 2 },
      ], 3) : undefined });
    return game;
  };
  const acquired = recorder ? recorder.acquireFrom(make, base, { seats })
    : (() => { const game = make(); return { game, owner: createRaceSession(game, { seats }) }; })();
  const { game, owner } = acquired, session = owner.session;
  const interval = (id, fn) => recorder ? recorder.interval(id, fn) : fn();
  const ticks = n => { for (let i = 0; i < n; i++) session.update(STEP); };
  const pickup = () => session.consumableSnapshot().pickups.find(p => p.row === 1 && p.itemId === itemId);
  function hop(players, direction = 'forward') {
    for (const p of players) assert.equal(session.dispatch({ seat: p.seat, direction }), true);
    for (let n = 0; n < 120 && players.some(p => p.hop > 0); n++) ticks(1);
    assert.ok(players.every(p => p.hop === 0 && p.state === 'playing'));
  }
  function terminal() {
    interval('immutable-terminal', () => {
      for (const p of session.players) {
        assert.equal(owner.command(owner.actionToken(p.seat), 'leave'), true);
        assert.equal(owner.command(owner.actionToken(p.seat), 'confirm'), true);
      }
      const result = owner.result, frozen = JSON.stringify(result); assert.ok(Object.isFrozen(result));
      assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
      ticks(1); assert.strictEqual(owner.result, result); assert.equal(JSON.stringify(result), frozen);
    });
    if (recorder) records.push(recorder.finish());
  }
  return { game, owner, session, interval, ticks, pickup, hop, terminal };
}
for (const base of ['arcade', 'stroll']) for (const itemId of ['mud-splash', 'fog-lantern'])
for (const recipe of ['legacy', 'varied']) for (const approach of ['primary', 'simultaneous'])
test(`race/${base}/${itemId}/${recipe}/${approach}: real river item follows its platform and a hop awards one owner`, () => {
  const run = create(base, itemId, recipe), { game, session, owner } = run, [p, other] = session.players;
  const lane = game.rows.get(1);
  let pickupId;
  run.interval('physical-binding-approach-and-pause', () => {
    if (approach === 'simultaneous') {
      assert.equal(other.x, -1); run.hop([other], 'right'); assert.equal(other.x, p.x);
    }
    const original = run.pickup(); assert.ok(original); pickupId = original.id;
    const binding = laneActors(lane, game.time).find(a => Math.abs(a.x - original.x) < 1e-9);
    assert.ok(binding, 'the public pickup position must start on one physical actor');
    for (let i = 0; i < 30; i++) {
      run.ticks(1);
      const item = run.pickup(), actor = laneActors(lane, game.time).find(a => a.id === binding.id);
      assert.ok(actor); assert.ok(Math.abs(item.x - actor.x) < 1e-9);
      assert.equal(platformSupports(lane, item.x, game.time), true);
      assert.equal(item.y, 1);
      assert.equal(p.statistics.itemsFound, 0); assert.equal(other.statistics.itemsFound, 0);
    }
    game.pause();
    const frozen = structuredClone([game.time, owner.elapsed, run.pickup()]);
    run.ticks(120); assert.deepEqual([game.time, owner.elapsed, run.pickup()], frozen);
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false); game.resume();
  });
  run.interval('actual-landing-single-claim-and-fractional-carry', () => {
    for (const player of session.players) {
      assert.equal(player.run.cards.length, 0); assert.equal(player.run.powers.length, 0);
      assert.equal(player.run.effects.coinRadius, game.rules.economy.baseCoinGravity);
    }
    // Alternate dispatch order: both presses occur before the same real tick.
    const moving = approach === 'simultaneous'
      ? itemId === 'mud-splash' ? [other, p] : [p, other] : [p];
    run.hop(moving);
    for (let n = 0; n < 120 && run.pickup(); n++) run.ticks(1);
    assert.equal(run.pickup(), undefined);
    const snapshot = session.consumableSnapshot();
    assert.deepEqual(snapshot.claims.filter(c => c.pickupId === pickupId), [{ pickupId, seat: 'p1' }]);
    assert.equal(snapshot.charges.find(c => c.seat === p.seat)[itemId], 1);
    assert.equal(snapshot.charges.find(c => c.seat === other.seat)[itemId], 0);
    assert.equal(p.statistics.itemsFound, 1); assert.equal(other.statistics.itemsFound, 0);
    assert.equal(p.statistics.itemsUsed, 0); assert.equal(snapshot.uses.length, 0);
    const x = p.x, time = game.time;
    run.ticks(30);
    assert.ok(Math.abs(p.x - x - lane.speed * (game.time - time)) < 1e-9);
    assert.notEqual(p.x, Math.round(p.x), 'physical carry preserves a personal fractional grid');
    const carriedX = p.x;
    run.hop(moving);
    assert.ok(Math.abs(p.x - carriedX) < 1e-9, 'hopping off does not snap the grid');
    assert.equal(p.completedForwardTiles, 2); assert.equal(other.completedForwardTiles, approach === 'simultaneous' ? 2 : 0);
    assert.equal(p.run.wallet, 0); assert.equal(other.run.wallet, 0);
    assert.equal(p.statistics.itemsFound, 1); assert.equal(p.statistics.deaths, 0);
    assert.equal(other.statistics.deaths, 0); assert.equal(p.statistics.innateUses, 0);
  });
  run.terminal();
});
for (const base of ['arcade', 'stroll']) for (const recipe of ['legacy', 'varied'])
test(`race/${base}/${recipe}: unclaimed river items leave only after the slowest traveler clears their retention window`, () => {
  const run = create(base, 'mud-splash', recipe), { game, session } = run;
  run.interval('real-bypass-and-retention-cleanup', () => {
    for (const player of session.players) while (player.x < 4) run.hop([player], 'right');
    const item = run.pickup(); assert.ok(item);
    run.hop(session.players);
    assert.ok(run.pickup());
    const [leader, trailer] = session.players;
    for (let i = 2; i <= 13; i++) run.hop([leader]);
    assert.equal(game.world.frontier, 13); assert.equal(trailer.y, 1);
    assert.ok(run.pickup(), 'the leader cannot remove a pickup still retained for the trailer');
    for (let i = 2; i <= 13; i++) {
      run.hop([trailer]);
      const floor = Math.min(game.world.frontier, game.world.activeFloor);
      if (floor <= 11) assert.ok(run.pickup(), 'a retained row cannot lose an unclaimed item');
      else assert.equal(run.pickup(), undefined);
    }
    assert.equal(run.pickup(), undefined);
    assert.equal(session.consumableSnapshot().claims.some(c => c.pickupId === item.id), false);
    for (const player of session.players) {
      assert.equal(player.completedForwardTiles, 13); assert.equal(player.statistics.itemsFound, 0);
      assert.equal(player.statistics.deaths, 0); assert.equal(player.statistics.innateUses, 0);
    }
  });
  run.terminal();
});
