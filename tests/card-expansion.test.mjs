import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';

const loaded = await loadSources(['market/catalog', 'market/run']);
const { ITEM_CATALOG } = await loaded.import('market/catalog');
const { RunInventory, defaultModifiers, reduceItems } = await loaded.import('market/run');
after(() => loaded.dispose());

const ids = [
  'pocket-change', 'toll-pouch', 'river-dividend', 'stepping-stones', 'long-haul', 'treasure-map',
  'crossing-guard', 'padded-tail', 'shoulder-check', 'service-road', 'railway-pass', 'signal-box',
  'broad-deck', 'river-toll', 'tow-rope', 'dry-route', 'ferry-ticket',
  'soft-landing', 'first-aid', 'rest-stop', 'steady-steps',
  'decoy-trail', 'patient-paws', 'watchful-eye', 'reed-bed', 'slack-tide', 'false-trail',
  'field-pack', 'ballast', 'glass-purse',
];
const catalog = new Map(ITEM_CATALOG.map(item => [item.id, item]));
const cards = ids.map(id => catalog.get(id));
const prices = { common: 12, uncommon: 16, rare: 24, epic: 36, legendary: 48 };
function shop() {
  const run = new RunInventory(314159, ITEM_CATALOG);
  run.advanceScore(100); run.open(); run.creditCoins(1000);
  return run;
}
function offer(run, itemId) {
  const offer = { id: `fixture-${run.revision}-${itemId}`, itemId, price: catalog.get(itemId).price, sold: false };
  run.market.offers.push(offer);
  return offer;
}
function buy(run, id) {
  const result = run.buy(offer(run, id).id);
  assert.equal(result.ok, true, result.message);
  return result.cards[0];
}
const snapshot = run => JSON.stringify({ wallet: run.wallet, cards: run.cards, effects: run.effects, offers: run.market.offers, capacity: run.cardCapacity, revision: run.revision });

test('thirty new cards are discovered automatically with distinct effects and established rarity prices', () => {
  assert.equal(new Set(ids).size, 30);
  assert.equal(new Set(cards.map(card => card?.name)).size, 30);
  const fingerprints = new Set();
  for (const card of cards) {
    assert.equal(card?.kind, 'card', card?.id);
    assert.equal(card.price, prices[card.rarity], card.id);
    const effects = reduceItems(catalog, [{ itemId: card.id, potency: 1 }]);
    const income = [40, 50, 75, 100, 150].map(score => card.scoreCoins?.({ previous: 0, score }, 1) ?? 0);
    const fingerprint = JSON.stringify([effects, income]);
    assert.equal(fingerprints.has(fingerprint), false, `duplicate behavior: ${card.id}`);
    fingerprints.add(fingerprint);
    const pursuit = ['waveSpeed', 'waveTrail', 'mobSpeed', 'mobWindup', 'mobRecovery', 'mobSpawnDelay'];
    if (pursuit.some(field => effects[field] !== defaultModifiers()[field])) assert.deepEqual(card.modes, ['arcade'], card.id);
    else assert.equal(card.modes, undefined, `${card.id} remains useful in both modes`);
  }
});

test('every new card applies its effect once, costs its displayed price, and fully reverses on sale', () => {
  for (const card of cards) {
    const run = shop(), wallet = run.wallet;
    const held = buy(run, card.id);
    assert.equal(run.wallet, wallet - card.price, card.id);
    assert.equal(run.cards.length, 1);
    assert.notDeepEqual(run.effects, defaultModifiers(), card.id);
    assert.equal(run.sell(held.id).ok, true, card.id);
    assert.equal(run.wallet, wallet - card.price + Math.floor(card.price / 2));
    assert.deepEqual(run.effects, defaultModifiers(), card.id);
    assert.equal(run.cardCapacity, 3);
    assert.equal(run.sell(held.id).ok, false, 'a second sale cannot duplicate income');
  }
});

test('new score income pays new thresholds once, including skipped thresholds, and never backtracks', () => {
  const incomes = [['toll-pouch', 50, 1], ['stepping-stones', 40, 1], ['long-haul', 100, 3], ['ferry-ticket', 75, 2], ['glass-purse', 50, 1]];
  for (const [id, interval, amount] of incomes) {
    const run = shop(), held = buy(run, id), threshold = Math.ceil(101 / interval) * interval;
    assert.equal(run.advanceScore(threshold - 1), 0, id);
    assert.equal(run.advanceScore(threshold), amount, id);
    assert.equal(run.advanceScore(threshold - interval), 0, id);
    assert.equal(run.advanceScore(threshold), 0, id);
    assert.equal(run.advanceScore(threshold + interval), amount, id);
    assert.equal(run.advanceScore(threshold + 4 * interval), 3 * amount, id);
    assert.equal(run.advanceScore(NaN), 0, id);
    assert.equal(run.advanceScore(Infinity), 0, id);
    assert.equal(run.sell(held.id).ok, true);
    assert.equal(run.advanceScore(threshold + 5 * interval), 0, 'selling stops future income');
  }
});

test('new hand tradeoffs validate capacity before payment and retain the three-card baseline', () => {
  for (const id of ['ballast', 'glass-purse']) {
    const run = shop();
    buy(run, 'pocket-change'); buy(run, 'tow-rope');
    const reducing = offer(run, id), before = snapshot(run);
    assert.equal(run.buy(reducing.id).ok, false, id);
    assert.equal(snapshot(run), before, 'a rejected capacity tradeoff changes nothing');
    assert.equal(run.sell(run.cards[0].id).ok, true);
    assert.equal(run.buy(reducing.id).ok, true);
    assert.equal(run.cardCapacity, 2); assert.equal(run.cards.length, 2);
    const extra = offer(run, 'pocket-change'), full = snapshot(run);
    assert.equal(run.buy(extra.id).ok, false);
    assert.equal(snapshot(run), full);
    assert.equal(run.sell(run.cards.find(card => card.components[0].itemId === id).id).ok, true);
    assert.equal(run.cardCapacity, 3);
  }
  const run = shop();
  buy(run, 'pocket-change'); buy(run, 'tow-rope'); buy(run, 'dry-route');
  const pack = buy(run, 'field-pack');
  assert.equal(run.cardCapacity, 4); assert.equal(run.cards.length, 4);
  assert.equal(run.sell(pack.id).ok, true); assert.equal(run.cardCapacity, 3);
});

test('new cards preserve global safety limits under stacked and extreme potency', () => {
  const effects = reduceItems(catalog, ids.map(itemId => ({ itemId, potency: 1e12 })));
  assert.ok(Object.values(effects).every(Number.isFinite));
  assert.ok(effects.trafficSpeed >= .65); assert.ok(effects.mobSpeed >= .65);
  assert.ok(effects.waveSpeed >= .75); assert.ok(effects.riverSpeed >= .25);
  assert.ok(effects.rearDamage >= .5); assert.ok(effects.sideDamage >= .5);
  assert.ok(effects.coinMultiplier <= 2); assert.ok(effects.coinRadius <= 1.25);
  assert.ok(effects.regenBonus <= .5); assert.ok(effects.sceneryClear <= .85);
  assert.ok(effects.cardSlots >= -2 && effects.cardSlots <= 3);
  assert.equal(effects.shield, 0, 'permanent cards never grant invulnerability');
});
