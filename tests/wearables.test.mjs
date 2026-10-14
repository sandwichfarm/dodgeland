import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';

const loaded = await loadSources(['market/run', 'market/catalog', 'wearables', 'game']);
const { RunInventory, defaultModifiers, cosmeticSlot } = await loaded.import('market/run');
const { ITEM_CATALOG } = await loaded.import('market/catalog');
const { CHARACTERS } = await loaded.import('content');
const { dressedModel } = await loaded.import('wearables');
const { Game } = await loaded.import('game');
after(() => loaded.dispose());
const items = new Map(ITEM_CATALOG.map(item => [item.id, item]));
function shop(seed = 12) {
  const run = new RunInventory(seed, ITEM_CATALOG);
  run.advanceScore(100); run.open(); run.creditCoins(100);
  return run;
}
function buy(run, id) {
  const item = items.get(id), offer = { id: `test-${id}-${run.revision}`, itemId: id, price: item.price, sold: false };
  run.market.offers.push(offer);
  const result = run.buy(offer.id);
  assert.equal(result.ok, true, result.message);
}

test('hat, shirt and effect equip together; replacing one slot keeps other purchases worn', () => {
  const run = shop();
  buy(run, 'look-hat-boater'); buy(run, 'look-shirt-sailor'); buy(run, 'look-halo');
  assert.deepEqual(run.equippedCosmetics.map(item => cosmeticSlot(item)), ['head', 'shirt', 'effect']);
  assert.deepEqual(run.equippedCosmetics.map(item => item.id), ['look-hat-boater', 'look-shirt-sailor', 'look-halo']);
  buy(run, 'look-hat-cap'); buy(run, 'look-shirt-vest'); buy(run, 'look-trail');
  assert.deepEqual(run.equippedCosmetics.map(item => item.id), ['look-hat-cap', 'look-shirt-vest', 'look-trail']);
  assert.equal(run.cosmetics.length, 6, 'old looks remain owned');
  assert.equal(run.cosmetic.id, 'look-trail', 'legacy effect stays available');
  assert.deepEqual(run.effects, defaultModifiers(), 'clothing gives no stats');
});

test('owned clothing switches for free and invalid or unavailable equip requests are atomic', () => {
  const run = shop();
  buy(run, 'look-hat-boater'); buy(run, 'look-hat-cap'); buy(run, 'look-shirt-sailor');
  const balance = run.wallet;
  assert.equal(run.equipCosmetic('look-hat-boater').ok, true);
  assert.equal(run.wallet, balance);
  assert.deepEqual(run.equippedCosmetics.map(item => item.id), ['look-hat-boater', 'look-shirt-sailor']);
  const snapshot = () => JSON.stringify({ wallet: run.wallet, owned: run.cosmetics, equipped: run.equippedCosmetics, revision: run.revision });
  let before = snapshot();
  for (const id of ['missing', 'magnet', 'look-hat-beanie']) {
    assert.equal(run.equipCosmetic(id).ok, false); assert.equal(snapshot(), before);
  }
  run.close(); before = snapshot();
  assert.equal(run.equipCosmetic('look-hat-cap').ok, false); assert.equal(snapshot(), before);
  run.open(); buy(run, 'pack-pocket'); before = snapshot();
  assert.equal(run.equipCosmetic('look-hat-cap').ok, false); assert.equal(snapshot(), before);
});

test('wearables disappear on death and cannot change terrain or the duck collision state', () => {
  const dressed = new Game(99, 'orchard', 'arcade', false, ITEM_CATALOG);
  const plain = new Game(99, 'orchard', 'arcade', false, ITEM_CATALOG);
  const terrain = JSON.stringify([...dressed.rows]);
  dressed.run.advanceScore(100); dressed.run.open(); dressed.run.creditCoins(100);
  buy(dressed.run, 'look-hat-beanie'); buy(dressed.run, 'look-shirt-vest');
  assert.equal(JSON.stringify([...dressed.rows]), terrain);
  assert.deepEqual(dressed.run.effects, plain.run.effects);
  assert.deepEqual({ x: dressed.x, y: dressed.y, health: dressed.health }, { x: plain.x, y: plain.y, health: plain.health });
  dressed.run.clear();
  assert.deepEqual(dressed.run.equippedCosmetics, []); assert.deepEqual(dressed.run.cosmetics, []);
  assert.equal(dressed.run.equipCosmetic('look-hat-beanie').ok, false);
  assert.deepEqual(new RunInventory(99, ITEM_CATALOG).equippedCosmetics, []);
});

test('every traveler accepts modular clothing without mutating the source model or facial voxels', () => {
  const clothing = ITEM_CATALOG.filter(item => item.kind === 'cosmetic' && ['hat', 'shirt'].includes(item.appearance.style));
  assert.ok(clothing.filter(item => item.appearance.style === 'hat').length >= 3);
  assert.ok(clothing.filter(item => item.appearance.style === 'shirt').length >= 2);
  for (const character of CHARACTERS) {
    const original = JSON.stringify(character.model);
    for (const item of clothing) {
      const dressed = dressedModel(character, [item]);
      assert.ok(dressed.length > character.model.length);
      assert.ok(dressed.every(voxel => ['x', 'y', 'z', 'w', 'd', 'h'].every(key => Number.isFinite(voxel[key]))));
      assert.equal(JSON.stringify(character.model), original);
      for (const face of character.model.filter(v => v.color === '#28382c' || v.color === '#f39838')) {
        assert.ok(dressed.includes(face), `${item.id} must leave ${character.id}'s eyes and bill intact`);
      }
    }
  }
});
