import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { extractPinnedBaseline, PINNED_BASELINE_SHA } from './solo-baseline.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources = await loadSources(['game', 'relay', 'market/catalog']);
const oracle = await extractPinnedBaseline(); assert.equal(oracle.sha, PINNED_BASELINE_SHA);
const baseline = await loadSources(['levels/index'], oracle.sourceDirectory);
after(async () => { await sources.dispose(); await baseline.dispose(); await oracle.dispose(); });
const { Game, coinPosition, laneActors, platformSupports } = await sources.import('game');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const { generateSeedLane: baselineLane } = await baseline.import('levels/index');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing Relay generation attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 16);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const STEP = 1 / 120;
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
];
function bank(game, y, values = {}) {
  const lane = { ...game.rows.get(y), index: y, kind: 'meadow', blocked: [], decorations: [],
    coin: null, coinActor: undefined, coinPull: undefined, coinDenomination: undefined,
    actors: undefined, phase: 0, speed: 0, spacing: 4, length: 3, ...values };
  game.rows.set(y, lane); return lane;
}
function create(base, schema, seed, tilesPerLeg = 999) {
  const recorder = inventory ? createTurnModelRecorder({ mode: 'relay', inventory,
    factory: createRelaySession, Coordinator: RelayCoordinator, authority,
    identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const make = () => {
    const game = Game.fromSeed(`ph${schema}-${seed.toString(16).padStart(8, '0')}-pond-${base === 'arcade' ? 'a' : 's'}-n`, ITEM_CATALOG, 'butter');
    bank(game, 0); return game;
  };
  const acquired = recorder ? recorder.acquireFrom(make, base, { seats, tilesPerLeg })
    : (() => { const game = make(); return { game, owner: createRelaySession(game, { seats, tilesPerLeg }) }; })();
  const { game, owner } = acquired, session = owner.session;
  let action = 0;
  function transact(p, kind, fields = {}) {
    const context = session.openCoOpMarket(p); assert.ok(context);
    return session.actCoOpMarket({ actionId: `generation-${++action}`, kind, seat: p.seat,
      device: p.device, participantId: p.participantId, expectedOwnerGeneration: context.ownerGeneration,
      expectedInventoryGeneration: context.inventoryGeneration, expectedRunRevision: context.runRevision,
      expectedContextGeneration: context.contextGeneration, ...fields });
  }
  return { game, owner, session,
    interval: (id, fn) => recorder ? recorder.interval(id, fn) : fn(),
    ticks(n) { for (let i = 0; i < n; i++) session.update(STEP); },
    hop() {
      const p = session.players.find(p => p.seat === owner.activeSeat);
      assert.equal(session.dispatch({ seat: p.seat, direction: 'forward' }), true);
      for (let i = 0; i < 120 && p.hop > 0; i++) session.update(STEP);
      assert.equal(p.hop, 0); assert.equal(p.state, 'playing');
    },
    buy(p, ids) {
      p.run.advanceScore(100); p.run.creditCoins(1000); // Explicit market/funds/stock fixture.
      assert.equal(transact(p, 'open').ok, true);
      for (const id of ids) {
        const item = p.run.catalog.get(id); assert.ok(item);
        const offer = { id: `stock-${++action}`, itemId: id, price: item.price, sold: false };
        p.run.market.offers.push(offer); const wallet = p.run.wallet;
        assert.equal(transact(p, 'buy', { offerId: offer.id }).ok, true);
        assert.equal(p.run.wallet, wallet - item.price);
      }
      assert.equal(transact(p, 'close').ok, true);
    },
    terminal() {
      const end = () => {
        const result = owner.finish(), frozen = JSON.stringify(result); assert.ok(Object.isFrozen(result));
        assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
        session.update(STEP); assert.strictEqual(owner.result, result); assert.equal(JSON.stringify(result), frozen);
      };
      if (recorder) recorder.interval('immutable-terminal', end); else end();
      if (recorder) records.push(recorder.finish());
    },
  };
}
const recipes = [
  { name: 'scenery-coins-warning', first: 'road', cards: ['train-warning', 'treasure-map', 'coin-chance'] },
  { name: 'spacing-platforms-period', first: 'road', cards: ['traffic-spacing', 'platform-length', 'train-period'] },
  { name: 'river-rewards', first: 'river', cards: ['river-coins', 'river-dividend', 'platform-length'] },
];
function seedFor(schema, base, kind, nextKind) {
  // Choose the target first lookahead row with an independent immutable oracle,
  // outside mode capture. No current generator/RNG supplies expected values.
  for (let seed = 0; seed < 4096; seed++) {
    const code = { schema, seed, home: 'pond', mode: base, gentle: false };
    if (baselineLane(code, 29).kind === kind && (!nextKind || baselineLane(code, 30).kind === nextKind)) return code;
  }
  throw Error('No bounded oracle seed');
}
for (const base of ['arcade', 'stroll']) for (const schema of [1, 3]) for (const recipe of recipes)
test(`relay/${base}/schema${schema}/${recipe.name}: paid effects shape only newly generated course`, () => {
  const code = seedFor(schema, base, recipe.first);
  const expected = new Map(Array.from({ length: 100 }, (_, i) => [29 + i, baselineLane(code, 29 + i)]));
  const run = create(base, schema, code.seed), { game, session } = run, [p, other] = session.players;
  run.interval('paid-effects-and-one-hundred-actual-hops', () => {
    const old = game.rows.get(20), oldGeometry = structuredClone(old);
    run.buy(p, recipe.cards);
    assert.deepEqual(old, oldGeometry, 'buying generation cards cannot rebuild existing terrain');
    assert.equal(p.run.cards.length, 3); assert.equal(other.run.cards.length, 0);
    const wallet = p.run.wallet, effects = structuredClone(p.run.effects);
    const seen = { roads: 0, rivers: 0, rails: 0, removed: 0, landCoins: 0, riverCoins: 0, bound: 0 };
    const pending = new Map();
    function checkApproachingRewards() {
      for (const [index, reward] of pending) if (index <= p.y + game.rules.retention.pickupBindingAhead) {
        assert.notEqual(reward.coinActor, null);
        const point = coinPosition(reward, game.time);
        if (point) {
          assert.equal(platformSupports(reward, point.x, game.time), true);
          assert.ok(laneActors(reward, game.time).some(a => Math.abs(a.x - point.x) < 1e-8));
          seen.bound++;
        }
        pending.delete(index);
      }
    }
    for (let i = 1; i <= 100; i++) {
      // A safe approach fixture changes only the next collision lane. Far
      // lookahead rows are created by real progress and observed before editing.
      bank(game, p.y + 1); run.hop();
      assert.equal(p.completedForwardTiles, i); assert.equal(p.earnedDistance, i);
      assert.equal(other.completedForwardTiles, 0); assert.equal(other.earnedDistance, 0);
      const y = i + 28, lane = game.rows.get(y), plain = expected.get(y);
      assert.ok(lane); assert.equal(lane.kind, plain.kind);
      if (lane.kind === 'road') {
        seen.roads++;
        assert.ok(Math.abs((lane.spacing - lane.length) - (plain.spacing - plain.length) * effects.trafficSpacing) < 1e-9,
          `row ${y}: purchased traffic spacing must affect newly generated roads`);
      }
      if (lane.kind === 'river') {
        seen.rivers++;
        assert.ok(Math.abs(lane.length - plain.length * effects.platformLength) < 1e-9,
          `row ${y}: purchased platform length must affect newly generated rivers`);
        assert.ok(Math.abs(lane.spacing - lane.length - (plain.spacing - plain.length)) < 1e-9);
      }
      if (lane.actors) for (const [slot, actor] of lane.actors.slots.entries()) {
        const original = plain.actors.slots[slot];
        assert.ok(Math.abs(actor.length - original.length * (lane.kind === 'river' ? effects.platformLength : 1)) < 1e-9);
        assert.ok(Math.abs(actor.gap - original.gap * (lane.kind === 'road' ? effects.trafficSpacing : 1)) < 1e-9);
      }
      if (lane.kind === 'rail') {
        seen.rails++;
        assert.ok(Math.abs(lane.warning - plain.warning - effects.trainWarning) < 1e-9);
        assert.ok(lane.period >= plain.period * effects.trainPeriod - 1e-9);
        assert.ok(lane.period >= lane.warning + 1.85 - 1e-9);
      }
      for (const x of lane.blocked) assert.ok(plain.blocked.includes(x));
      for (const x of plain.blocked.filter(x => !lane.blocked.includes(x))) {
        seen.removed++; assert.equal(lane.decorations.some(d => d.x === x), false);
      }
      if (plain.coin === null && lane.coin !== null) {
        if (lane.kind === 'river') { seen.riverCoins++; pending.set(y, lane); }
        else { seen.landCoins++; assert.equal(lane.blocked.includes(lane.coin), false); }
      }
      checkApproachingRewards();
      assert.equal(p.run.wallet, wallet); assert.equal(other.run.wallet, 0);
      assert.equal(p.statistics.deaths, 0); assert.equal(p.statistics.innateUses, 0);
    }
    // Complete the approach to the last observed lookahead row. Do not confuse
    // a far-ahead unbound reward with a failed physical platform binding.
    for (let n = 0; n < 28; n++) {
      bank(game, p.y + 1); run.hop(); checkApproachingRewards();
    }
    assert.equal(pending.size, 0);
    assert.ok(seen.roads && seen.rivers && seen.rails);
    if (recipe.name === 'scenery-coins-warning') assert.ok(seen.removed && seen.landCoins && seen.riverCoins && seen.bound, JSON.stringify(seen));
    if (recipe.name === 'river-rewards') assert.ok(seen.riverCoins && seen.bound, JSON.stringify(seen));
    assert.equal(p.completedForwardTiles, 128); assert.equal(p.earnedDistance, 128);
    assert.equal(p.recovery.personalHighWater, 128); assert.equal(other.recovery.personalHighWater, 0);
    assert.equal(p.run.wallet, wallet); assert.equal(other.run.wallet, 0);
    assert.equal(p.statistics.deaths, 0); assert.equal(p.statistics.innateUses, 0);
  });
  run.terminal();
});
for (const base of ['arcade', 'stroll'])
test(`relay/${base}: the first hop after baton transfer uses the incoming runner's generation effects`, () => {
  const code = seedFor(3, base, 'road', 'road');
  const expected = [29, 30].map(y => baselineLane(code, y));
  const run = create(base, 3, code.seed, 1), { game, session, owner } = run, [p, other] = session.players;
  run.interval('paid-first-hop-and-immediate-incoming-first-hop', () => {
    run.buy(p, ['traffic-spacing']);
    const wallet = p.run.wallet;
    bank(game, 1); run.hop();
    const first = game.rows.get(29), plain = expected[0];
    assert.ok(Math.abs(first.spacing - first.length - (plain.spacing - plain.length) * p.run.effects.trafficSpacing) < 1e-9,
      'the purchase must apply on the first hop without an intervening tick');
    const continuity = () => [game.time, game.world.simulationTick, game.seedCode, [...game.rows]];
    const before = structuredClone(continuity());
    assert.equal(owner.confirm(owner.confirmation()), true);
    assert.deepEqual(continuity(), before, 'the baton itself cannot regenerate or advance the course');
    bank(game, 2); run.hop();
    assert.equal(game.rows.get(30).spacing, expected[1].spacing,
      'a benched runner cannot contribute spacing on the incoming runner’s first hop');
    assert.equal(p.completedForwardTiles, 1); assert.equal(other.completedForwardTiles, 1);
    assert.equal(p.run.wallet, wallet); assert.equal(other.run.wallet, 0);
    assert.equal(p.run.cards.length, 1); assert.equal(other.run.cards.length, 0);
    assert.equal(p.statistics.deaths, 0); assert.equal(other.statistics.deaths, 0);
  });
  run.terminal();
});
for (const base of ['arcade', 'stroll'])
test(`relay/${base}: river-generated bonus pays the collecting owner across a real baton transfer`, () => {
  const run = create(base, 3, 113, 1), { game, session, owner } = run, [p, other] = session.players;
  run.interval('paid-river-bonus-and-unbuffed-incoming-owner', () => {
    run.buy(p, ['river-coins']); const wallet = p.run.wallet, paid = [], plain = [];
    p.onCoin = n => paid.push(n); other.onCoin = n => plain.push(n);
    bank(game, 1, { kind: 'river', coin: 0, coinActor: 0, coinDenomination: 'huge-sack' });
    run.hop(); assert.equal(p.run.wallet, wallet + 26); assert.deepEqual(paid, [26]);
    assert.equal(other.run.wallet, 0); assert.equal(owner.confirm(owner.confirmation()), true);
    bank(game, 2, { kind: 'river', coin: 0, coinActor: 0, coinDenomination: 'huge-sack' });
    run.hop(); assert.equal(other.run.wallet, 25); assert.deepEqual(plain, [25]);
    assert.equal(p.run.wallet, wallet + 26); assert.deepEqual(paid, [26]);
    assert.equal(p.completedForwardTiles, 1); assert.equal(other.completedForwardTiles, 1);
    assert.equal(p.run.cards.length, 1); assert.equal(other.run.cards.length, 0);
    assert.equal(p.statistics.deaths, 0); assert.equal(other.statistics.deaths, 0);
  });
  run.terminal();
});
