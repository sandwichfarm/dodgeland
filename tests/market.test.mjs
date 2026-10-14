import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSources } from './source-loader.mjs';

const loaded = await loadSources(['market/run', 'market/catalog']);
const { RunInventory, defaultModifiers, reduceItems, RARITIES, DEFAULT_CARD_CAPACITY, MAX_PACK_DRAWS } = await loaded.import('market/run');
const { ITEM_CATALOG } = await loaded.import('market/catalog');
after(() => loaded.dispose());
const catalog = new Map(ITEM_CATALOG.map(item => [item.id, item]));
function shopping(seed = 7, definitions = ITEM_CATALOG) {
  const run = new RunInventory(seed, definitions);
  run.advanceScore(100); run.open(); run.creditCoins(1000);
  return run;
}
function buyItem(run, id) {
  const item = run.catalog.get(id);
  assert.ok(item, id);
  const offer = { id: `fixture-${run.revision}-${id}`, itemId: id, price: item.price, sold: false };
  run.market.offers.push(offer);
  const result = run.buy(offer.id);
  assert.equal(result.ok, true, result.message);
  return result;
}

function bonusRun() {
  for (let seed = 0; seed < 100; seed++) {
    const run = shopping(seed); buyItem(run, 'pack-satchel');
    if (run.pendingPack.bonus) return run;
  }
  assert.fail('No deterministic bonus fixture found.');
}

function validateCatalog(definitions) {
  assert.equal(new Set(definitions.map(item => item.id)).size, definitions.length);
  for (const definition of definitions) {
    assert.ok(definition.id);
    assert.ok(['card', 'power', 'cosmetic', 'pack'].includes(definition.kind));
    assert.ok(RARITIES.includes(definition.rarity));
    assert.ok(definition.name && definition.description && definition.icon && definition.color);
    assert.ok(Number.isInteger(definition.price) && definition.price > 0);
    const run = shopping(7, definition.kind === 'pack' ? definitions : [definition]);
    run.creditCoins(definition.price);
    const result = buyItem(run, definition.id);
    assert.ok(Object.values(run.effects).every(Number.isFinite), definition.id);
    if (definition.kind === 'card') {
      assert.ok(definition.modify || definition.scoreCoins, definition.id);
      assert.equal(run.cards.length, 1);
      assert.equal(run.cards[0].components[0].itemId, definition.id);
      assert.equal(run.sell(run.cards[0].id).ok, true);
      assert.deepEqual(run.effects, defaultModifiers(), `selling ${definition.id}`);
      assert.equal(run.advanceScore(10000), 0, `removed score hook ${definition.id}`);
    } else if (definition.kind === 'power') {
      assert.ok(Number.isFinite(definition.duration) && definition.duration > 0);
      assert.equal(run.powers.length, 1);
      run.close(); run.tick(definition.duration + 1);
      assert.deepEqual(run.powers, []);
      assert.deepEqual(run.effects, defaultModifiers(), `expiring ${definition.id}`);
    } else if (definition.kind === 'cosmetic') {
      assert.ok(definition.appearance.color && definition.appearance.style);
      assert.ok(run.equippedCosmetics.some(item => item.id === definition.id));
    } else {
      assert.ok(Number.isInteger(definition.draws) && definition.draws > 0);
      assert.ok(Number.isInteger(definition.picks) && definition.picks > 0 && definition.picks <= definition.draws);
      assert.equal(result.cards, undefined, 'opening alone never equips cards');
      const draft = run.pendingPack;
      assert.equal(draft.choices.length, definition.draws);
      assert.equal(new Set(draft.choices.map(card => card.components[0].itemId)).size, definition.draws);
      assert.ok(draft.choices.every(card => RARITIES.indexOf(card.rarity) >= RARITIES.indexOf(definition.minimumRarity ?? 'common')));
      const claimed = run.claimPack(draft.choices.slice(0, draft.picks).map(card => card.id));
      assert.equal(claimed.ok, true);
      assert.equal(run.cards.length, draft.picks);
      assert.equal(run.pendingPack, null);
    }
    run.clear();
    assert.deepEqual(run.effects, defaultModifiers(), `clearing ${definition.id}`);
  }
}

test('catalog discovers at least 23 cards and validates every module without a registration list', () => {
  assert.ok(ITEM_CATALOG.filter(item => item.kind === 'card').length >= 23);
  for (const kind of ['power', 'cosmetic']) assert.ok(ITEM_CATALOG.filter(item => item.kind === kind).length >= 3);
  assert.ok(ITEM_CATALOG.filter(item => item.kind === 'pack').length >= 2);
  assert.deepEqual(new Set(ITEM_CATALOG.filter(item => item.kind === 'card').map(item => item.rarity)), new Set(RARITIES));
  validateCatalog(ITEM_CATALOG);
  assert.deepEqual(new RunInventory(1).effects, defaultModifiers());
  assert.throws(() => new RunInventory(1, [ITEM_CATALOG[0], ITEM_CATALOG[0]]), /Duplicate/);
});

test('invitations follow new 100-point milestones, keep stock on reopen and expire during play only', () => {
  const run = new RunInventory(90, ITEM_CATALOG);
  assert.equal(run.open(), false);
  run.advanceScore(99); assert.equal(run.market, null);
  run.advanceScore(100);
  assert.equal(run.market.milestone, 100);
  assert.equal(run.market.remaining, 15);
  const original = JSON.stringify(run.market.offers);
  assert.equal(run.open(), true);
  run.tick(100); assert.equal(run.market.remaining, 15);
  run.close(); run.tick(4.5);
  assert.equal(run.market.remaining, 10.5);
  run.advanceScore(0); run.advanceScore(100);
  assert.equal(JSON.stringify(run.market.offers), original);
  assert.equal(run.open(), true);
  assert.equal(JSON.stringify(run.market.offers), original);
  run.close(); run.tick(11);
  assert.equal(run.market, null); assert.equal(run.open(), false);
  run.advanceScore(199); assert.equal(run.market, null);
  run.advanceScore(200); assert.equal(run.market.milestone, 200);
  assert.equal(run.market.remaining, 15);
  assert.notEqual(JSON.stringify(run.market.offers), original);
});

test('seeded stock has three cards, two cosmetics and an occasional rare item or pack', () => {
  const a = shopping(231), b = shopping(231);
  assert.deepEqual(a.market.offers, b.market.offers);
  const stocks = new Set(), packFinds = new Set(), rareKinds = new Set();
  let rareFinds = 0;
  for (let seed = 0; seed < 500; seed++) {
    const run = shopping(seed), offers = run.market.offers;
    const cards = offers.filter(offer => offer.section === 'cards');
    const extras = offers.filter(offer => offer.section === 'extras');
    const rare = offers.filter(offer => offer.section === 'rare');
    assert.equal(cards.length, 3);
    assert.ok(cards.every(offer => catalog.get(offer.itemId).kind === 'card'));
    assert.equal(extras.length, 2);
    assert.ok(extras.every(offer => catalog.get(offer.itemId).kind === 'cosmetic'));
    assert.ok(rare.length <= 1);
    assert.ok(rare.every(offer => {
      const item = catalog.get(offer.itemId);
      if (item.kind === 'pack') packFinds.add(item.id);
      else rareKinds.add(item.kind);
      return item.kind === 'pack' || RARITIES.indexOf(item.rarity) >= RARITIES.indexOf('rare');
    }));
    assert.equal(offers.length, 5 + rare.length);
    assert.equal(new Set(offers.map(offer => offer.itemId)).size, offers.length);
    assert.ok(offers.every(offer => offer.price === catalog.get(offer.itemId).price));
    rareFinds += rare.length;
    stocks.add(offers.map(offer => offer.itemId).join(','));
  }
  assert.ok(stocks.size > 450);
  assert.deepEqual(packFinds, new Set(ITEM_CATALOG.filter(item => item.kind === 'pack').map(item => item.id)));
  assert.ok(rareKinds.has('card')); assert.ok(rareKinds.has('power'));
  assert.ok(rareFinds >= 125 && rareFinds <= 225, `${rareFinds}/500 rare finds should be near 35%`);
});

test('cosmetic displays shrink as looks are owned without substituting cards or packs', () => {
  const looks = ITEM_CATALOG.filter(item => item.kind === 'cosmetic');
  for (const remaining of [2, 1, 0]) {
    const run = shopping(231), replay = shopping(231);
    for (const target of [run, replay]) {
      for (const look of looks.slice(remaining)) buyItem(target, look.id);
      target.close(); target.advanceScore(200);
    }
    assert.deepEqual(run.market.offers, replay.market.offers, 'same seed, catalog and purchases retain stock');
    const extras = run.market.offers.filter(offer => offer.section === 'extras');
    assert.equal(extras.length, remaining);
    assert.deepEqual(new Set(extras.map(offer => offer.itemId)), new Set(looks.slice(0, remaining).map(item => item.id)));
    assert.ok(run.market.offers.every(offer => !run.cosmetics.includes(offer.itemId)), 'owned looks cannot leak into either display or special find');
    assert.equal(run.market.offers.filter(offer => offer.section === 'cards').length, 3);
  }
});

test('pack-only extension catalogs use the finds slot without filling cosmetic displays', () => {
  const pack = catalog.get('pack-pocket');
  for (const seed of [0, 1, 78, 0xffffffff]) {
    const run = shopping(seed, [pack]);
    assert.deepEqual(run.market.offers, [{ id: 'offer-100-0', itemId: pack.id, price: pack.price, sold: false, section: 'rare' }]);
  }
});

test('built-in prices make every purchase a substantial run-coin commitment', () => {
  const expected = { magnet: 12, 'coin-multiplier': 16, 'score-income': 24,
    'regen-bonus': 36, 'wave-speed': 48, 'pack-pocket': 16, 'pack-satchel': 24,
    'power-coin-rush': 16, 'power-freeze': 20, 'power-shield': 20,
    'look-halo': 8, 'look-sparkles': 8, 'look-trail': 8, 'extra-pocket': 24, 'travel-light': 24 };
  for (const [id, price] of Object.entries(expected)) assert.equal(catalog.get(id).price, price, id);
  assert.ok(ITEM_CATALOG.every(item => item.price >= 8));
  assert.ok(ITEM_CATALOG.filter(item => item.kind === 'card').every(item => item.price >= 12));
});

test('purchases validate funds, stock and open state without consuming anything on failure', () => {
  const run = new RunInventory(3, ITEM_CATALOG);
  run.advanceScore(100);
  const offer = run.market.offers[0];
  assert.equal(run.buy(offer.id).ok, false);
  run.open();
  const before = JSON.stringify({ cards: run.cards, offer, wallet: run.wallet, revision: run.revision });
  assert.equal(run.buy(offer.id).ok, false);
  assert.equal(JSON.stringify({ cards: run.cards, offer, wallet: run.wallet, revision: run.revision }), before);
  run.creditCoins(offer.price);
  const result = run.buy(offer.id);
  assert.equal(result.ok, true);
  assert.equal(run.wallet, 0); assert.equal(offer.sold, true);
  const after = JSON.stringify({ cards: run.cards, wallet: run.wallet, revision: run.revision });
  assert.equal(run.buy(offer.id).ok, false);
  assert.equal(JSON.stringify({ cards: run.cards, wallet: run.wallet, revision: run.revision }), after);
  assert.equal(run.buy('missing').ok, false);
});

test('small packs reveal three unique weighted cards and equip only the chosen one', () => {
  const a = shopping(1), b = shopping(1);
  const before = a.wallet;
  buyItem(a, 'pack-pocket'); buyItem(b, 'pack-pocket');
  assert.deepEqual(a.pendingPack, b.pendingPack);
  assert.equal(a.wallet, before - catalog.get('pack-pocket').price);
  assert.equal(a.cards.length, 0);
  assert.deepEqual(a.effects, defaultModifiers());
  const draft = a.pendingPack;
  assert.equal(draft.picks, 1); assert.equal(draft.bonus, false); assert.equal(draft.choices.length, 3);
  assert.equal(new Set(draft.choices.map(card => card.components[0].itemId)).size, 3);
  const selected = draft.choices[2];
  const claimed = a.claimPack([selected.id]);
  assert.equal(claimed.ok, true);
  assert.deepEqual(claimed.cards, [selected]);
  assert.deepEqual(a.cards, [selected]);
  assert.deepEqual(a.effects, reduceItems(catalog, selected.components));
  assert.equal(a.wallet, before - catalog.get('pack-pocket').price, 'claiming never charges again');
  assert.equal(a.pendingPack, null);
  assert.equal(a.claimPack([selected.id]).ok, false, 'stale duplicate claim cannot equip twice');
  assert.deepEqual(a.cards, [selected]);
});

test('large packs reveal five unique cards with a seeded 20% bonus two-pick chance', () => {
  const rarities = new Map(RARITIES.map(rarity => [rarity, 0]));
  let bonuses = 0;
  for (let seed = 0; seed < 2000; seed++) {
    const run = shopping(seed);
    buyItem(run, 'pack-satchel');
    const draft = run.pendingPack;
    const reference = shopping(seed);
    buyItem(reference, 'pack-satchel');
    assert.deepEqual(draft, reference.pendingPack);
    assert.equal(draft.choices.length, 5);
    assert.equal(new Set(draft.choices.map(card => card.components[0].itemId)).size, 5);
    assert.equal(draft.picks, draft.bonus ? 2 : 1);
    bonuses += Number(draft.bonus);
    for (const card of draft.choices) rarities.set(card.rarity, rarities.get(card.rarity) + 1);
    const selected = draft.choices.slice(-draft.picks);
    assert.equal(run.claimPack(selected.map(card => card.id)).ok, true);
    assert.deepEqual(run.cards, selected);
  }
  assert.ok(bonuses >= 320 && bonuses <= 480, `bonus frequency ${bonuses}/2000 must be close to 20%`);
  assert.ok(rarities.get('common') > rarities.get('rare'));
  assert.ok(rarities.get('rare') > rarities.get('legendary'));
  assert.ok(rarities.get('legendary') > 0);
});

test('drafts reject invalid choices and purchases atomically and survive reopening without rerolls', () => {
  const run = shopping(21);
  buyItem(run, 'magnet');
  buyItem(run, 'power-shield');
  buyItem(run, 'pack-satchel');
  const draft = structuredClone(run.pendingPack);
  const snapshot = () => JSON.stringify({ cards: run.cards, powers: run.powers, draft: run.pendingPack, market: run.market, wallet: run.wallet, effects: run.effects, revision: run.revision });
  const before = snapshot();
  for (const ids of [[], ['missing'], [run.cards[0].id], draft.choices.map(card => card.id), Array(draft.picks + 1).fill(draft.choices[0].id)]) {
    assert.equal(run.claimPack(ids).ok, false);
    assert.equal(snapshot(), before);
  }
  assert.equal(run.buy(run.market.offers.find(offer => !offer.sold).id).ok, false);
  assert.equal(snapshot(), before);
  run.close();
  const closed = snapshot();
  assert.equal(run.claimPack(draft.choices.slice(0, draft.picks).map(card => card.id)).ok, false);
  run.tick(999);
  assert.equal(snapshot(), closed, 'pending choices freeze invitation and power clocks even while closed');
  assert.equal(run.open(), true);
  assert.deepEqual(run.pendingPack, draft);
  assert.equal(run.claimPack(draft.choices.filter(card => card.components[0].itemId !== 'travel-light').slice(0, draft.picks).map(card => card.id)).ok, true);
  run.close(); run.tick(1);
  assert.equal(run.market.remaining, 14);
  assert.equal(run.powers[0].remaining, 7);
});

test('bonus drafts require two distinct current choices and never accept stale pack cards', () => {
  const run = bonusRun();
  const draft = run.pendingPack;
  assert.equal(draft.bonus, true); assert.equal(draft.picks, 2);
  const before = JSON.stringify({ draft, wallet: run.wallet, revision: run.revision });
  for (const ids of [[draft.choices[0].id], [draft.choices[0].id, draft.choices[0].id], [draft.choices[0].id, 'missing']]) {
    assert.equal(run.claimPack(ids).ok, false);
    assert.equal(JSON.stringify({ draft: run.pendingPack, wallet: run.wallet, revision: run.revision }), before);
    assert.deepEqual(run.cards, []);
  }
  const selected = draft.choices.filter(card => !['extra-pocket', 'travel-light'].includes(card.components[0].itemId)).slice(0, 2);
  assert.equal(run.claimPack(selected.map(card => card.id)).ok, true);
  assert.deepEqual(run.cards, selected);
  buyItem(run, 'pack-pocket');
  assert.equal(run.claimPack([draft.choices[0].id]).ok, false, 'unselected candidates from an old pack cannot be claimed');
  assert.equal(run.claimPack([selected[0].id]).ok, false, 'already-equipped cards cannot count toward a new pack');
  assert.equal(run.claimPack([run.pendingPack.choices.find(card => card.components[0].itemId !== 'travel-light').id]).ok, true);
  assert.equal(run.cards.length, 3);
});

test('unaffordable and invalid packs fail before consuming randomness or IDs', () => {
  const run = shopping(2), reference = shopping(2);
  for (let i = 0; i < DEFAULT_CARD_CAPACITY; i++) { buyItem(run, 'magnet'); buyItem(reference, 'magnet'); }
  const offer = { id: 'unaffordable', itemId: 'pack-satchel', price: run.wallet + 1, sold: false };
  run.market.offers.push(offer);
  const balance = run.wallet, before = [...run.cards], revision = run.revision;
  assert.equal(run.buy(offer.id).ok, false);
  assert.equal(run.wallet, balance); assert.equal(offer.sold, false);
  assert.deepEqual(run.cards, before); assert.equal(run.pendingPack, null); assert.equal(run.revision, revision);
  buyItem(run, 'pack-satchel'); buyItem(reference, 'pack-satchel');
  assert.deepEqual(run.pendingPack, reference.pendingPack, 'failed affordability validation consumes neither RNG nor IDs');
  const chosen = run.pendingPack.choices.filter(card => card.components[0].itemId !== 'travel-light').slice(0, run.pendingPack.picks);
  assert.equal(run.claimPack(chosen.map(card => card.id), run.cards.slice(0, chosen.length).map(card => card.id)).ok, true);
  assert.ok(run.cards.length <= run.cardCapacity);
  const small = shopping();
  for (let i = 0; i < DEFAULT_CARD_CAPACITY - 1; i++) buyItem(small, 'magnet');
  buyItem(small, 'pack-pocket');
  assert.equal(small.claimPack([small.pendingPack.choices.find(card => card.components[0].itemId !== 'travel-light').id]).ok, true);
  assert.equal(small.cards.length, DEFAULT_CARD_CAPACITY, 'only the kept card enters the hand');
  const empty = shopping(1, [catalog.get('pack-pocket'), catalog.get('magnet'), catalog.get('coin-multiplier')]);
  const pack = catalog.get('pack-pocket');
  const only = { id: 'insufficient-pool', itemId: pack.id, price: pack.price, sold: false, section: 'rare' };
  empty.market.offers.push(only);
  const initial = { state: empty.state, sequence: empty.sequence, revision: empty.revision };
  assert.equal(empty.buy(only.id).ok, false);
  assert.equal(empty.wallet, 1000); assert.equal(only.sold, false);
  assert.deepEqual({ state: empty.state, sequence: empty.sequence, revision: empty.revision }, initial, 'too-small unique candidate pool fails before RNG or mutation');
});

test('skipping abandons paid choices once without changing the hand, refunding coins or rerolling future draws', () => {
  const run = shopping(17), reference = shopping(17);
  for (const target of [run, reference]) {
    buyItem(target, 'magnet'); buyItem(target, 'power-shield'); buyItem(target, 'pack-satchel');
  }
  const draft = structuredClone(run.pendingPack), hand = structuredClone(run.cards), wallet = run.wallet;
  const random = run.state, sequence = run.sequence, effects = structuredClone(run.effects);
  const packOffer = run.market.offers.find(offer => offer.itemId === 'pack-satchel' && offer.sold);
  run.close();
  const closed = JSON.stringify(run);
  assert.equal(run.skipPack().ok, false); assert.equal(JSON.stringify(run), closed);
  run.tick(90); assert.equal(run.market.remaining, 15); assert.equal(run.powers[0].remaining, 8);
  assert.equal(run.open(), true); assert.deepEqual(run.pendingPack, draft);
  assert.equal(run.claimPack(['missing']).ok, false);
  const revision = run.revision;
  assert.equal(run.skipPack().ok, true); assert.equal(run.revision, revision + 1);
  assert.equal(run.pendingPack, null); assert.deepEqual(run.cards, hand); assert.deepEqual(run.effects, effects);
  assert.equal(run.wallet, wallet); assert.equal(packOffer.sold, true);
  assert.equal(run.state, random); assert.equal(run.sequence, sequence);
  const skipped = JSON.stringify(run);
  assert.equal(run.skipPack().ok, false); assert.equal(run.buy(packOffer.id).ok, false);
  assert.equal(run.claimPack(draft.choices.slice(0, draft.picks).map(card => card.id)).ok, false);
  assert.equal(JSON.stringify(run), skipped);
  assert.equal(reference.skipPack().ok, true);
  buyItem(run, 'pack-pocket'); buyItem(reference, 'pack-pocket');
  assert.deepEqual(run.pendingPack, reference.pendingPack, 'failed operations and reopening never consume another draw');
  assert.equal(run.skipPack().ok, true); run.close(); run.tick(1);
  assert.equal(run.market.remaining, 14); assert.equal(run.powers[0].remaining, 7);
  run.clear(); const dead = JSON.stringify(run);
  assert.equal(run.skipPack().ok, false); assert.equal(JSON.stringify(run), dead);
});

test('pack metadata rejects unsafe quotas and supports an independently injected minimum-rarity pack', () => {
  const definition = catalog.get('pack-satchel');
  for (const patch of [
    { draws: 0 }, { draws: 1.5 }, { draws: MAX_PACK_DRAWS + 1 },
    { picks: 0 }, { picks: 6 }, { picks: 1.5 },
    { bonus: { chance: NaN, picks: 2 } }, { bonus: { chance: -1, picks: 2 } },
    { bonus: { chance: 1.1, picks: 2 } }, { bonus: { chance: .2, picks: 1 } },
    { bonus: { chance: .2, picks: 6 } }, { minimumRarity: 'mythic' },
  ]) assert.throws(() => new RunInventory(1, [{ ...definition, ...patch }]), /Invalid pack/);
  const premium = { ...definition, id: 'fixture-premium', name: 'Rare Choices', draws: 3, picks: 1, bonus: undefined, minimumRarity: 'rare' };
  const run = shopping(9, [...ITEM_CATALOG, premium]);
  buyItem(run, premium.id);
  assert.equal(run.pendingPack.choices.length, 3);
  assert.ok(run.pendingPack.choices.every(card => RARITIES.indexOf(card.rarity) >= RARITIES.indexOf('rare')));
});

test('fractional credit is carried accurately, and score income cannot be farmed by backtracking', () => {
  const run = shopping();
  buyItem(run, 'coin-multiplier');
  assert.equal(run.effects.coinMultiplier, 1.125);
  const before = run.wallet;
  for (let i = 0; i < 8; i++) run.creditCoins(run.effects.coinMultiplier);
  assert.equal(run.wallet - before, 9);
  assert.equal(run.creditCoins(-100), 0); assert.equal(run.creditCoins(NaN), 0); assert.equal(run.creditCoins(Infinity), 0);
  buyItem(run, 'score-income');
  const balance = run.wallet;
  assert.equal(run.advanceScore(124), 0);
  assert.equal(run.advanceScore(125), 1);
  assert.equal(run.wallet, balance, 'advanceScore returns income without double-crediting');
  assert.equal(run.advanceScore(99), 0);
  assert.equal(run.advanceScore(125), 0);
  assert.equal(run.advanceScore(200), 3);
});

test('built-in modifier values remain stable and selling reverses them', () => {
  const expected = {
    magnet: ['coinRadius', defaultModifiers().coinRadius + .75], 'coin-multiplier': ['coinMultiplier', 1.125],
    'road-coins': ['roadCoinBonus', 1], 'river-coins': ['riverCoinBonus', 1],
    'traffic-speed': ['trafficSpeed', .88], 'traffic-spacing': ['trafficSpacing', 1.12],
    'river-speed': ['riverSpeed', .85], 'platform-length': ['platformLength', 1.2],
    'train-period': ['trainPeriod', 1.15], 'train-warning': ['trainWarning', .4],
    'rear-resist': ['rearDamage', .75], 'side-resist': ['sideDamage', .8],
    'hurt-recovery': ['hurtRecovery', 1.3], 'regen-bonus': ['regenBonus', .25],
    'wave-speed': ['waveSpeed', .88], 'wave-trail': ['waveTrail', 1],
    'mob-speed': ['mobSpeed', .86], 'mob-windup': ['mobWindup', 1.25],
    'mob-recovery': ['mobRecovery', 1.3], 'mob-spawn-delay': ['mobSpawnDelay', 1.5],
    'coin-chance': ['coinChance', .08], 'scenery-clear': ['sceneryClear', .15],
  };
  for (const [id, [field, value]] of Object.entries(expected)) {
    const run = shopping();
    const [card] = buyItem(run, id).cards;
    assert.deepEqual(run.effects, { ...defaultModifiers(), [field]: value }, id);
    const coins = run.wallet;
    assert.equal(run.sell(card.id).ok, true);
    assert.equal(run.wallet, coins + Math.floor(catalog.get(id).price / 2));
    assert.deepEqual(run.effects, defaultModifiers(), `selling ${id}`);
    assert.equal(run.sell(card.id).ok, false);
  }
});

test('timed powers apply, pause while shopping, refresh without duplication, and expire reversibly', () => {
  const run = shopping();
  buyItem(run, 'power-shield'); buyItem(run, 'power-freeze'); buyItem(run, 'power-coin-rush');
  assert.equal(run.effects.shield, 1); assert.equal(run.effects.trafficSpeed, 0); assert.equal(run.effects.mobSpeed, 0);
  assert.equal(run.effects.coinRadius, 1.25); assert.equal(run.effects.coinMultiplier, 1.5);
  run.tick(1000); assert.deepEqual(run.powers.map(power => power.remaining), [8, 10, 8]);
  run.close(); run.tick(7); assert.equal(run.effects.shield, 1);
  run.open(); buyItem(run, 'power-shield');
  assert.equal(run.powers.length, 3); assert.equal(run.powers[0].remaining, 8);
  run.close(); run.tick(3);
  assert.equal(run.effects.trafficSpeed, 1); assert.equal(run.effects.mobSpeed, 1);
  assert.equal(run.effects.coinMultiplier, 1); assert.equal(run.effects.shield, 1);
  run.tick(5); assert.deepEqual(run.effects, defaultModifiers()); assert.deepEqual(run.powers, []);
});

test('all card effects remain bounded with extreme injected potency', () => {
  const components = ITEM_CATALOG.filter(item => item.kind === 'card').map(item => ({ itemId: item.id, potency: 1e12 }));
  const effects = reduceItems(catalog, components);
  assert.ok(Object.values(effects).every(Number.isFinite));
  assert.equal(effects.coinRadius, 1.25); assert.equal(effects.coinMultiplier, 2);
  assert.equal(effects.platformLength, 1.5); assert.equal(effects.trafficSpacing, 1.6);
  assert.equal(effects.waveSpeed, .75); assert.equal(effects.riverSpeed, .25);
  assert.equal(effects.rearDamage, .5); assert.equal(effects.sideDamage, .5);
  assert.equal(effects.mobSpawnDelay, 12); assert.equal(effects.sceneryClear, .85);
});

test('three-card hands retain balanced stacking, temporary freezes, and reversible effects', () => {
  const run = shopping();
  const cases = {
    magnet: ['coinRadius', 1.25], 'coin-multiplier': ['coinMultiplier', 1.375],
    'road-coins': ['roadCoinBonus', 1], 'river-coins': ['riverCoinBonus', 1],
    'rear-resist': ['rearDamage', .5], 'side-resist': ['sideDamage', .512],
    'regen-bonus': ['regenBonus', .5], 'hurt-recovery': ['hurtRecovery', 1.75],
    'wave-speed': ['waveSpeed', .75], 'wave-trail': ['waveTrail', 2],
    'traffic-spacing': ['trafficSpacing', 1.36], 'platform-length': ['platformLength', 1.5],
    'traffic-speed': ['trafficSpeed', .681472], 'mob-speed': ['mobSpeed', .65],
  };
  for (const [id, [field, value]] of Object.entries(cases)) {
    run.creditCoins(100);
    for (let copy = 0; copy < 3; copy++) buyItem(run, id);
    assert.equal(run.cards.length, 3);
    assert.ok(Math.abs(run.effects[field] - value) < 1e-9, `${id}: three copies give ${value}`);
    const offer = { id: `fourth-${id}`, itemId: id, price: catalog.get(id).price, sold: false };
    run.market.offers.push(offer);
    const wallet = run.wallet;
    assert.equal(run.buy(offer.id).ok, false); assert.equal(run.wallet, wallet); assert.equal(offer.sold, false);
    for (const card of [...run.cards]) assert.equal(run.sell(card.id).ok, true);
    assert.deepEqual(run.effects, defaultModifiers(), `${id} sells back to base`);
  }
  buyItem(run, 'traffic-speed'); buyItem(run, 'traffic-speed'); buyItem(run, 'mob-speed');
  const speeds = { traffic: run.effects.trafficSpeed, mob: run.effects.mobSpeed };
  buyItem(run, 'power-freeze');
  assert.equal(run.effects.trafficSpeed, 0); assert.equal(run.effects.mobSpeed, 0);
  run.close(); run.tick(10);
  assert.equal(run.effects.trafficSpeed, speeds.traffic); assert.equal(run.effects.mobSpeed, speeds.mob);
  run.open();
  for (const card of [...run.cards]) run.sell(card.id);
  assert.deepEqual(run.effects, defaultModifiers());
  assert.equal('combine' in run, false); assert.equal('previewFusion' in run, false);
});

test('Extra Pocket creates usable space and Travel Light trades space for income', () => {
  const roomy = shopping();
  for (const id of ['magnet', 'road-coins', 'river-coins']) buyItem(roomy, id);
  buyItem(roomy, 'extra-pocket');
  assert.equal(roomy.cards.length, 4); assert.equal(roomy.cardCapacity, 5);
  buyItem(roomy, 'coin-multiplier');
  assert.equal(roomy.cards.length, 5, 'the capacity card leaves room for one additional ability');
  const pocket = roomy.cards.find(card => card.components[0].itemId === 'extra-pocket');
  assert.equal(roomy.sell(pocket.id).ok, false, 'selling cannot strand more cards than fit');
  for (const card of roomy.cards.filter(card => card.id !== pocket.id).slice(0, 2)) assert.equal(roomy.sell(card.id).ok, true);
  assert.equal(roomy.sell(pocket.id).ok, true); assert.equal(roomy.cardCapacity, 3);
  const light = shopping();
  buyItem(light, 'magnet'); buyItem(light, 'travel-light');
  assert.equal(light.cardCapacity, 2); assert.equal(light.cards.length, 2); assert.equal(light.effects.coinMultiplier, 1.25);
  const income = light.cards.find(card => card.components[0].itemId === 'travel-light');
  assert.equal(light.sell(income.id).ok, true);
  assert.equal(light.cardCapacity, 3); assert.equal(light.effects.coinMultiplier, 1);
});

test('all run assets, fractional coins and effects vanish on death; new runs start empty', () => {
  const run = shopping();
  buyItem(run, 'magnet'); buyItem(run, 'power-shield'); buyItem(run, 'look-halo');
  assert.equal(run.cosmetic.appearance.style, 'halo');
  buyItem(run, 'look-trail'); assert.equal(run.cosmetic.appearance.style, 'trail');
  buyItem(run, 'pack-pocket');
  const oldChoice = run.pendingPack.choices[0].id;
  run.creditCoins(.75); run.clear();
  assert.equal(run.alive, false); assert.equal(run.wallet, 0); assert.equal(run.market, null); assert.equal(run.isOpen, false);
  assert.deepEqual(run.cards, []); assert.deepEqual(run.powers, []); assert.deepEqual(run.cosmetics, []);
  assert.equal(run.cosmetic, undefined); assert.deepEqual(run.effects, defaultModifiers());
  assert.equal(run.pendingPack, null); assert.equal(run.claimPack([oldChoice]).ok, false);
  assert.equal(run.creditCoins(100), 0); assert.equal(run.advanceScore(300), 0); assert.equal(run.open(), false);
  const fresh = new RunInventory(1, ITEM_CATALOG);
  assert.equal(fresh.creditCoins(.25), 0); assert.equal(fresh.wallet, 0); assert.deepEqual(fresh.cards, []);
});

test('a standalone new module is injectable, auto-discovered from its file and needs no registry/config edit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'down-to-duck-drop-in-'));
  let fixture;
  try {
    await cp(new URL('../src/market/', import.meta.url), join(directory, 'market'), { recursive: true });
    await writeFile(join(directory, 'market/items/test-drop-in.ts'), `
      import type { CardDefinition } from '../types';
      export default {
        id: 'drop-in', kind: 'card', name: 'New Card', description: 'One file.',
        rarity: 'common', price: 2, icon: '+', color: '#abcdef',
        modify(m, potency) { m.coinRadius += .25 * potency; },
        scoreCoins({ previous, score }, potency) { return (Math.floor(score / 10) - Math.floor(previous / 10)) * 2 * potency; },
      } satisfies CardDefinition;
    `);
    fixture = await loadSources(['market/run', 'market/catalog', 'market/items/test-drop-in'], directory);
    const definition = (await fixture.import('market/items/test-drop-in')).default;
    const discovered = (await fixture.import('market/catalog')).ITEM_CATALOG;
    assert.equal(discovered.length, ITEM_CATALOG.length + 1);
    assert.equal(discovered.find(item => item.id === 'drop-in').name, 'New Card');
    validateCatalog(discovered);
    const run = shopping(1, [definition]);
    buyItem(run, 'drop-in'); assert.equal(run.effects.coinRadius, defaultModifiers().coinRadius + .25);
    assert.equal(run.advanceScore(110), 2);
    run.sell(run.cards[0].id); assert.equal(run.effects.coinRadius, defaultModifiers().coinRadius);
  } finally { await fixture?.dispose(); await rm(directory, { recursive: true, force: true }); }
});
