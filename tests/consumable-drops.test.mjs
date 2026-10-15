import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['consumable-drops']);
after(source.dispose);
const {
  ITEM_DROP_SCHEMA,
  classifyConsumableBucket,
  consumablePickupId,
  sampleConsumableDrop,
} = await source.import('consumable-drops');

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
