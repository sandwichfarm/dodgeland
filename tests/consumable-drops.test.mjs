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
  DEFAULT_ITEM_SCHEMA,
  registerConsumableSchema,
  consumableSchema,
  classifyItemBucket,
  validateConsumableSchema,
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

test('unknown legacy pickup identities reject without changing seeded drop identity', () => {
  const before = sampleConsumableDrop(anchor);
  for (const itemId of ['unknown', 'mud-splash', 'fog-lantern', undefined, 0]) {
    assert.throws(() => consumablePickupId(anchor, itemId), /Unknown consumable drop/);
    assert.deepEqual(sampleConsumableDrop(anchor), before);
  }
  assert.equal(consumablePickupId(anchor, null), before.pickupId);
});

test('duplicate schema registration cannot replace a pinned drop definition', () => {
  const before = sampleConsumableDrop(anchor);
  assert.throws(() => registerConsumableSchema({ ...DEFAULT_ITEM_SCHEMA, salt: DEFAULT_ITEM_SCHEMA.salt + 1 }), /already registered/);
  assert.equal(consumableSchema(ITEM_DROP_SCHEMA), DEFAULT_ITEM_SCHEMA);
  assert.deepEqual(sampleConsumableDrop(anchor), before);
});

test('general item schema rejects invalid buckets and missing item names without changing its definition', () => {
  const before = structuredClone(DEFAULT_ITEM_SCHEMA);
  for (const bucket of [-1, 2500, .5, NaN, Infinity]) {
    assert.throws(() => classifyItemBucket(bucket, DEFAULT_ITEM_SCHEMA), /Invalid item bucket/);
  }
  for (const itemId of [undefined, null, 'unknown']) {
    assert.throws(() => validateConsumableSchema({ ...DEFAULT_ITEM_SCHEMA, items: { 0: itemId } }), /Invalid consumable schema/);
  }
  assert.deepEqual(DEFAULT_ITEM_SCHEMA, before);
  assert.equal(classifyItemBucket(0, DEFAULT_ITEM_SCHEMA), 'revival');
  assert.equal(classifyItemBucket(2499, DEFAULT_ITEM_SCHEMA), null);
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
  interleave('before');
  const lanes = runs.map(run => rowsToObserve.map(row => {
    interleave('terrain');
    // Retain moving actor patterns too, not just the lane's scalar geometry.
    return JSON.parse(JSON.stringify(generateSeedLane(run, row)));
  }));
  const denominations = rowsToObserve.map(row => { interleave('denomination'); return coinDenominationForRow(runs[2].seed, row); });
  const inventory = new RunInventory(runs[2].seed, ITEM_CATALOG);
  interleave('market-first'); inventory.advanceScore(100);
  const firstMarket = JSON.parse(JSON.stringify(inventory.market));
  interleave('market-next'); inventory.close(); inventory.advanceScore(200);
  const nextMarket = JSON.parse(JSON.stringify(inventory.market));
  assert.ok(firstMarket?.offers?.length && nextMarket?.offers?.length, 'markets must contain real generated offers');
  const game = new Game(runs[2].seed, 'pond', 'arcade', false, ITEM_CATALOG);
  game.x = game.fromX = 0; game.y = game.fromY = game.maxY = 160; game.time = 45; game.ensureRows();
  for (const [index, lane] of game.rows) game.rows.set(index, { ...lane, kind: 'meadow', blocked: [], decorations: [], coin: null });
  game.state = 'playing'; interleave('mob-first'); game.update(0);
  const firstMob = JSON.parse(JSON.stringify(game.mobs));
  game.mobs.length = 0; game.x = game.fromX = 0; game.y = game.fromY = game.maxY = 184; game.time += 18; game.ensureRows();
  for (const [index, lane] of game.rows) game.rows.set(index, { ...lane, kind: 'meadow', blocked: [], decorations: [], coin: null });
  interleave('mob-next'); game.update(0);
  const nextMob = JSON.parse(JSON.stringify(game.mobs));
  assert.ok(firstMob.length > 0 && nextMob.length > 0, 'the observation captures actual first and next mobs');
  interleave('after');
  // Test-side observations of the actual live owners, not new RNG instances.
  const marketState = inventory.state;
  const nextRandom = Array.from({ length: 4 }, () => {
    interleave('next-rng');
    return { market: inventory.random(), mob: game.mobDirector.rng() };
  });
  const codes = runs.map(encodeRunSeed);
  return { codes, decoded: codes.map(decodeRunSeed), lanes, denominations, firstMarket, nextMarket, firstMob, nextMob, marketState, nextRandom };
}

const isolationAnchors = [
  { courseSeed: 0x76543210, row: -8, slot: 0 }, { courseSeed: 0x76543210, row: 90, slot: 3 },
  { courseSeed: 0x76543210, row: 503, slot: 7 }, { courseSeed: 0x76543210, row: 19_003, slot: 12 },
  { courseSeed: 0x87405b12, row: 0, slot: 0 }, // rejection/retry branch
];
const sampleOrders = {
  forward: isolationAnchors,
  reverse: [...isolationAnchors].reverse(),
  sparse: [isolationAnchors[3], isolationAnchors[0]],
  duplicate: [isolationAnchors[3], isolationAnchors[0], isolationAnchors[3], isolationAnchors[2], isolationAnchors[1], isolationAnchors[0]],
};
function interleavedObservations(sampler, order) {
  const stages = new Map();
  const observations = releasedObservations(stage => {
    // Sample at EVERY observation boundary. A consumed one-shot queue would
    // silently exhaust during terrain and leave market/mob RNGs untested.
    for (const input of order) sampler(input);
    stages.set(stage, (stages.get(stage) ?? 0) + order.length);
  });
  for (const stage of ['before', 'terrain', 'denomination', 'market-first', 'market-next', 'mob-first', 'mob-next', 'after', 'next-rng']) {
    assert.ok(stages.get(stage) > 0, `item sampling must actually execute at ${stage}`);
  }
  return observations;
}

test('item calls never perturb real terrain, denomination, market, or mob snapshots and next outputs', () => {
  const baseline = releasedObservations();
  for (const [name, order] of Object.entries(sampleOrders)) {
    assert.deepEqual(interleavedObservations(sampleConsumableDrop, order), baseline, `${name} calls preserve live generators and their next raw draws`);
  }
  assert.deepEqual(baseline.codes, ['ph1-76543210-pond-a-n', 'ph2-76543210-pond-a-n', 'ph3-76543210-pond-a-n']);
  assert.equal(baseline.codes.some(code => code.includes(ITEM_DROP_SCHEMA)), false);
});

test('an item-only schema revision changes its vectors without changing released streams', async () => {
  // Compile an isolated test copy with a different item schema key and salt.
  // This creates no production schema, source edit, or terrain version change.
  const compiled = source.modules.get('/consumable-drops.js');
  assert.ok(compiled.includes('item-drop-schema-1') && compiled.includes('0x51a7e001'));
  const alternate = compiled.replaceAll('item-drop-schema-1', 'item-drop-schema-test-2').replaceAll('0x51a7e001', '0x51a7e002');
  const variant = await import(`data:text/javascript;base64,${Buffer.from(alternate).toString('base64')}`);
  assert.equal(variant.ITEM_DROP_SCHEMA, 'item-drop-schema-test-2');
  const oldDrop = sampleConsumableDrop(anchor), newDrop = variant.sampleConsumableDrop(anchor);
  assert.notEqual(newDrop.pickupId, oldDrop.pickupId);
  assert.notEqual(newDrop.bucket, oldDrop.bucket);
  assert.deepEqual(interleavedObservations(variant.sampleConsumableDrop, sampleOrders.duplicate), releasedObservations());
});
