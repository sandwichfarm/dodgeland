import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';

const loaded = await loadSources(['market/catalog', 'market/run', 'cosmetic-model', 'wearables']);
const { ITEM_CATALOG } = await loaded.import('market/catalog');
const { RunInventory, defaultModifiers, cosmeticSlot } = await loaded.import('market/run');
const { cosmeticModel } = await loaded.import('cosmetic-model');
const { dressedModel } = await loaded.import('wearables');
const { CHARACTERS } = await loaded.import('content');
after(() => loaded.dispose());

const ids = [
  'look-hat-tophat', 'look-hat-crown', 'look-hat-ranger', 'look-hat-firefighter',
  'look-hat-chef', 'look-hat-wizard', 'look-hat-mushroom', 'look-hat-pirate',
  'look-hat-propeller', 'look-hat-aviator', 'look-hat-viking', 'look-hat-garden',
  'look-shirt-overalls', 'look-shirt-raincoat', 'look-shirt-tuxedo', 'look-shirt-rugby',
  'look-shirt-poncho', 'look-shirt-lifeguard', 'look-shirt-space', 'look-shirt-patchwork',
];
const items = ids.map(id => ITEM_CATALOG.find(item => item.id === id));

test('the expansion supplies 20 individually modeled wearables with distinct silhouettes and fair tier prices', () => {
  assert.equal(items.length, 20);
  assert.ok(items.every(Boolean), 'every new module is discovered by the production catalog');
  assert.equal(new Set(items.map(item => item.name)).size, 20);
  assert.equal(items.filter(item => cosmeticSlot(item) === 'head').length, 12);
  assert.equal(items.filter(item => cosmeticSlot(item) === 'shirt').length, 8);
  const shapes = new Set();
  for (const item of items) {
    assert.equal(item.kind, 'cosmetic');
    assert.equal(item.price, { common: 12, uncommon: 16, rare: 24, epic: 36 }[item.rarity]);
    assert.ok(item.description.length > 30);
    assert.equal(item.modify, undefined);
    assert.equal(item.scoreCoins, undefined);
    const { model, style } = item.appearance;
    assert.ok(model.length >= 4 && model.length <= 24, `${item.id} is a bounded authored model`);
    shapes.add(JSON.stringify(model.map(({ color, ...geometry }) => geometry)));
    for (const voxel of model) {
      assert.ok(['x', 'y', 'z', 'w', 'd', 'h'].every(key => Number.isFinite(voxel[key])));
      assert.ok(voxel.w > 0 && voxel.d > 0 && voxel.h > 0);
      assert.match(voxel.color, /^#[0-9a-f]{6}$/i);
      assert.ok(Math.abs(voxel.x) + voxel.w / 2 <= .90, `${item.id} width stays on its anchor`);
      assert.ok(Math.abs(voxel.y) + voxel.d / 2 <= .90, `${item.id} depth stays on its anchor`);
      assert.ok(voxel.z >= 0 && voxel.z + voxel.h <= (style === 'hat' ? 1.2 : 1.15), `${item.id} stays above its anchor`);
    }
    const standalone = cosmeticModel(item);
    assert.ok(standalone.length >= model.length, `${item.id} has preview and floor-drop geometry`);
    for (const traveler of CHARACTERS) {
      const before = JSON.stringify(traveler.model);
      const worn = dressedModel(traveler, [item]);
      assert.ok(worn.length > traveler.model.length, `${item.id} fits ${traveler.id}`);
      assert.equal(JSON.stringify(traveler.model), before);
    }
  }
  assert.equal(shapes.size, 20, 'each item has its own geometry rather than a palette swap');
});

test('every new look can be purchased, exchanged within its slot, and lost on death without changing stats', () => {
  const run = new RunInventory(44, ITEM_CATALOG);
  run.advanceScore(100); run.open(); run.creditCoins(1000);
  const baseline = defaultModifiers();
  let spent = 0;
  for (const item of items) {
    run.market.offers.push({ id: `new-${item.id}`, itemId: item.id, price: item.price, sold: false });
    assert.equal(run.buy(`new-${item.id}`).ok, true, item.id);
    spent += item.price;
    assert.ok(run.equippedCosmetics.some(worn => worn.id === item.id));
    assert.deepEqual(run.effects, baseline);
    assert.equal(run.cards.length, 0, 'cosmetics never occupy a hand slot');
  }
  assert.equal(run.wallet, 1000 - spent);
  assert.equal(run.cosmetics.length, 20);
  assert.equal(run.equippedCosmetics.length, 2);
  for (const item of items) assert.equal(run.equipCosmetic(item.id).ok, true);
  assert.equal(run.wallet, 1000 - spent, 'changing owned looks is free');
  run.clear();
  assert.deepEqual(run.equippedCosmetics, []);
  assert.deepEqual(run.cosmetics, []);
  assert.equal(run.wallet, 0);
});
