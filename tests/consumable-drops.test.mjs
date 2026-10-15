import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['consumable-drops', 'run-seed', 'levels/index', 'coin-denominations', 'market/run', 'market/catalog', 'game']);
after(source.dispose);
const {
  ITEM_DROP_SCHEMA,
  classifyConsumableBucket,
  consumablePickupId,
  sampleConsumableDrop,
} = await source.import('consumable-drops');
const { createRunSeed, encodeRunSeed, decodeRunSeed } = await source.import('run-seed');
const { generateSeedLane } = await source.import('levels/index');
const { coinDenominationForRow } = await source.import('coin-denominations');
const { RunInventory } = await source.import('market/run');
const { ITEM_CATALOG } = await source.import('market/catalog');
const { Game } = await source.import('game');

const anchor = Object.freeze({ courseSeed: 0x12345678, row: 37, slot: 4 });

test('item-drop-schema-1 classifies exact exclusive 2,500-bucket boundaries', () => {
  assert.equal(ITEM_DROP_SCHEMA, 'item-drop-schema-1');
  assert.equal(classifyConsumableBucket(0), 'revival');
  assert.equal(classifyConsumableBucket(1), 'flare');
  assert.equal(classifyConsumableBucket(2), 'flare');
  assert.equal(classifyConsumableBucket(3), null);
  assert.equal(classifyConsumableBucket(2499), null);
  for (const invalid of [-1, 2500, .5, NaN, Infinity, '0', null, undefined]) assert.throws(() => classifyConsumableBucket(invalid));
});

test('the sampler pins canonical stable golden vectors and an exclusive pickup identity', () => {
  const result = sampleConsumableDrop(anchor);
  assert.deepEqual(result, { schema: 'item-drop-schema-1', bucket: 324, itemId: null, pickupId: 'item-drop-schema-1-12345678-37-4-none' });
  assert.equal(consumablePickupId(anchor, result.itemId), result.pickupId);
  assert.equal(sampleConsumableDrop(Object.freeze({ slot: 4, row: 37, courseSeed: 0x12345678 })).pickupId, result.pickupId, 'property order never enters the identity');
  assert.deepEqual(sampleConsumableDrop({ courseSeed: 0x12345678, row: 60, slot: 3 }), { schema: 'item-drop-schema-1', bucket: 0, itemId: 'revival', pickupId: 'item-drop-schema-1-12345678-60-3-revival' });
  assert.deepEqual(sampleConsumableDrop({ courseSeed: 0x12345678, row: 106, slot: 12 }), { schema: 'item-drop-schema-1', bucket: 2, itemId: 'flare', pickupId: 'item-drop-schema-1-12345678-106-12-flare' });
  // The first keyed uint32 draw for this anchor is 4_294_967_295, above the
  // 2,500-bucket rejection limit 4_294_965_000; retry stays item-local.
  assert.deepEqual(sampleConsumableDrop({ courseSeed: 0x87405b12, row: 0, slot: 0 }), { schema: 'item-drop-schema-1', bucket: 421, itemId: null, pickupId: 'item-drop-schema-1-87405b12-0-0-none' });
  assert.ok(Object.isFrozen(result));
});

test('sampler rejects unbounded or noncanonical anchor components', () => {
  for (const input of [
    { courseSeed: -1, row: 1, slot: 1 }, { courseSeed: 0x1_0000_0000, row: 1, slot: 1 },
    { courseSeed: 1, row: -0x80000001, slot: 1 }, { courseSeed: 1, row: 0x80000000, slot: 1 }, { courseSeed: 1, row: 1.5, slot: 1 },
    { courseSeed: 1, row: 1, slot: -1 }, { courseSeed: 1, row: 1, slot: 0x1_0000_0000 },
  ]) assert.throws(() => sampleConsumableDrop(input));
  assert.doesNotThrow(() => sampleConsumableDrop({ courseSeed: 1, row: -8, slot: 1 }), 'initial retained rows can use signed canonical coordinates');
});

test('all buckets have the exact requested counts with no overlap', () => {
  const counts = { revival: 0, flare: 0, none: 0 };
  for (let bucket = 0; bucket < 2500; bucket++) counts[classifyConsumableBucket(bucket) ?? 'none']++;
  assert.deepEqual(counts, { revival: 1, flare: 2, none: 2497 });
});

test('anchor sampling is pure across duplicate, reverse, sparse, and pruning-style calls', () => {
  const anchors = [
    { courseSeed: 7, row: 0, slot: 0 }, { courseSeed: 7, row: 4, slot: 2 },
    { courseSeed: 7, row: 503, slot: 9 }, { courseSeed: 7, row: 19003, slot: 3 },
  ];
  const expected = anchors.map(sampleConsumableDrop);
  const reverse = [...anchors].reverse().map(sampleConsumableDrop).reverse();
  const sparse = [anchors[3], anchors[0], anchors[3], anchors[2], anchors[1], anchors[0]].map(sampleConsumableDrop);
  assert.deepEqual(reverse, expected);
  assert.deepEqual([sparse[1], sparse[4], sparse[3], sparse[0]], expected);
  assert.deepEqual(sparse[2], expected[3]);
  assert.deepEqual(sparse[5], expected[0]);
});

function releasedObservations(interleave = () => {}) {
  const rowsToObserve = [-8, -1, 0, 1, 6, 37, 89, 90];
  const runs = [1, 2, 3].map(schema => createRunSeed(0x76543210, 'pond', 'arcade', false, schema));
  interleave();
  const lanes = runs.map(run => rowsToObserve.map(row => {
    interleave();
    const lane = generateSeedLane(run, row);
    const { index, kind, speed, length, spacing, phase, variant, blocked, decorations, coin, coinDenomination, period, warning } = lane;
    return { index, kind, speed, length, spacing, phase, variant, blocked, decorations, coin, coinDenomination: coinDenomination ?? null, period, warning };
  }));
  const denominations = rowsToObserve.map(row => { interleave(); return coinDenominationForRow(runs[2].seed, row); });
  const inventory = new RunInventory(runs[2].seed, ITEM_CATALOG);
  interleave(); inventory.advanceScore(100);
  const firstMarket = JSON.parse(JSON.stringify(inventory.market));
  interleave(); inventory.close(); inventory.advanceScore(200);
  const nextMarket = JSON.parse(JSON.stringify(inventory.market));
  const game = new Game(runs[2].seed, 'pond', 'arcade', false, ITEM_CATALOG);
  game.x = game.fromX = 0; game.y = game.fromY = game.maxY = 160; game.time = 45; game.ensureRows();
  for (const [index, lane] of game.rows) game.rows.set(index, { ...lane, kind: 'meadow', blocked: [], decorations: [], coin: null });
  game.state = 'playing'; interleave(); game.update(0);
  const firstMob = JSON.parse(JSON.stringify(game.mobs));
  game.mobs.length = 0; game.x = game.fromX = 0; game.y = game.fromY = game.maxY = 184; game.time += 18; game.ensureRows();
  for (const [index, lane] of game.rows) game.rows.set(index, { ...lane, kind: 'meadow', blocked: [], decorations: [], coin: null });
  interleave(); game.update(0);
  const nextMob = JSON.parse(JSON.stringify(game.mobs));
  assert.ok(firstMob.length > 0 && nextMob.length > 0, 'the observation captures actual first and next mob RNG outputs');
  const codes = runs.map(encodeRunSeed);
  return { codes, decoded: codes.map(decodeRunSeed), lanes, denominations, firstMarket, nextMarket, firstMob, nextMob };
}

test('item calls never perturb real terrain, denomination, market, or mob snapshots and next outputs', () => {
  const anchors = [
    { courseSeed: 0x76543210, row: -8, slot: 0 }, { courseSeed: 0x76543210, row: 90, slot: 3 },
    { courseSeed: 0x76543210, row: 503, slot: 7 }, { courseSeed: 0x76543210, row: 19_003, slot: 12 },
  ];
  const before = releasedObservations();
  const forward = [...anchors];
  const during = releasedObservations(() => { if (forward.length) sampleConsumableDrop(forward.shift()); });
  const reordered = [anchors[3], anchors[0], anchors[3], anchors[2], anchors[1], anchors[0]];
  const after = releasedObservations(() => { if (reordered.length) sampleConsumableDrop(reordered.shift()); });
  assert.deepEqual(during, before);
  assert.deepEqual(after, before);
  assert.deepEqual(before.codes, ['ph1-76543210-pond-a-n', 'ph2-76543210-pond-a-n', 'ph3-76543210-pond-a-n'], 'released seed encoding remains schemas 1 through 3');
  assert.equal(before.codes.some(code => code.includes(ITEM_DROP_SCHEMA)), false, 'the item schema is never substituted into released run identities');
});
