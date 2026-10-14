import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['market-scenery', 'game', 'content']);
after(source.dispose);
const { marketScenery } = await source.import('market-scenery');
const { generateLane } = await source.import('game');
const { WORLDS } = await source.import('content');

function meadow(index = 100, world = WORLDS[0]) {
  return { ...generateLane(123, index, world.id), kind: 'meadow', world, blocked: [-3, 3], decorations: [{ x: -7, variant: 0 }, { x: -3, variant: 0 }, { x: 3, variant: 1 }, { x: 6, variant: 2 % world.scenery.length }] };
}
function bounds(model) {
  return {
    minX: Math.min(...model.map(v => v.x - v.w / 2)), maxX: Math.max(...model.map(v => v.x + v.w / 2)),
    minY: Math.min(...model.map(v => v.y - v.d / 2)), maxY: Math.max(...model.map(v => v.y + v.d / 2)),
    height: Math.max(...model.map(v => v.z + v.h)),
  };
}

test('stands mark only meadow props in the approach and immediate market area', () => {
  for (const row of [-100, -4, 0, 11, 95, 112, 195, 212, 9995, 10012]) {
    const lane = meadow(row);
    assert.equal(marketScenery(10, lane, lane.decorations[1]), null, `row ${row}`);
  }
  for (const [first, last, milestone] of [[96, 111, 100], [196, 211, 200], [9996, 10011, 10000]]) {
    for (let row = first; row <= last; row++) {
      const lane = meadow(row);
      assert.equal(marketScenery(10, lane, lane.decorations[1]).milestone, milestone);
      for (const kind of ['road', 'river', 'rail']) assert.equal(marketScenery(10, { ...lane, kind }, lane.decorations[1]), null);
    }
  }
});

test('each eligible row keeps a visible stand while replacing about two thirds of other props', () => {
  let chosen = 0, total = 0;
  for (let seed = 0; seed < 200; seed++) {
    const lane = meadow(99);
    assert.ok(marketScenery(seed, lane, lane.decorations[1]), 'first actual interior obstacle always becomes a stand');
    for (const decoration of lane.decorations.filter((_, index) => index !== 1)) {
      chosen += Number(Boolean(marketScenery(seed, lane, decoration))); total++;
    }
    const edge = { ...lane, blocked: [], decorations: lane.decorations.filter(d => Math.abs(d.x) > 5) };
    assert.ok(marketScenery(seed, edge, edge.decorations[0]), 'an edge stand survives when the center has no obstacle');
  }
  assert.ok(chosen / total > .6 && chosen / total < .74, `replacement share ${chosen / total}`);
});

test('every stand fits its replaced prop, with appropriate counter, cart and stall sizes', () => {
  const sizes = new Set(), colors = new Set();
  for (const world of WORLDS) for (let variant = 0; variant < world.scenery.length; variant++) {
    const original = world.scenery[variant], old = bounds(original);
    const lane = { ...meadow(100, world), blocked: [3], decorations: [{ x: 3, variant }] };
    for (let seed = 0; seed < 100; seed++) {
      const stand = marketScenery(seed, lane, lane.decorations[0]);
      sizes.add(stand.size);
      assert.equal(stand.size, old.height < .5 ? 'counter' : old.height < .85 ? 'cart' : 'stall');
      assert.equal(stand.footprint, Math.max(old.maxX - old.minX, old.maxY - old.minY));
      assert.ok(stand.model.length <= 35, 'draw cost stays bounded');
      for (const voxel of stand.model) {
        colors.add(voxel.color);
        assert.ok(voxel.x - voxel.w / 2 >= old.minX - 1e-9 && voxel.x + voxel.w / 2 <= old.maxX + 1e-9);
        assert.ok(voxel.y - voxel.d / 2 >= old.minY - 1e-9 && voxel.y + voxel.d / 2 <= old.maxY + 1e-9);
        assert.ok(voxel.z >= 0 && voxel.z + voxel.h <= old.height + 1e-9);
        assert.ok(voxel.w > 0 && voxel.d > 0 && voxel.h > 0);
      }
    }
  }
  assert.deepEqual([...sizes].sort(), ['cart', 'counter', 'stall']);
  for (const color of ['#c85e51', '#d3a33e', '#428d86', '#99658d', '#ffedbe']) assert.ok(colors.has(color));
});

test('same seed and decoration are stable across call order without touching source or generation', () => {
  const lane = meadow(103), before = structuredClone(lane);
  const generatedBefore = generateLane(123, 103, 'pond');
  const expected = lane.decorations.map(d => marketScenery(9876, lane, d));
  for (const d of [...lane.decorations].reverse()) marketScenery(32, lane, d);
  assert.deepEqual(lane.decorations.map(d => marketScenery(9876, lane, d)), expected);
  assert.deepEqual(lane, before, 'lane, collision blocks and original models are untouched');
  assert.deepEqual(generateLane(123, 103, 'pond'), generatedBefore, 'visual variants consume no generation randomness');
  assert.ok(expected.filter(Boolean).every(stand => Object.isFrozen(stand.model) && stand.model.every(Object.isFrozen)));
});

test('model reuse is bounded by the twelve looks per source asset, not row or seed count', () => {
  const models = new Set();
  for (let milestone = 100; milestone <= 10000; milestone += 100) for (let seed = 0; seed < 25; seed++) {
    const lane = { ...meadow(milestone), blocked: [3], decorations: [{ x: 3, variant: 0 }] };
    const stand = marketScenery(seed, lane, lane.decorations[0]);
    models.add(stand.model);
    assert.equal(stand.model, marketScenery(seed, lane, lane.decorations[0]).model);
  }
  assert.equal(models.size, 12);
});
