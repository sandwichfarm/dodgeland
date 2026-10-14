import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';

const loaded = await loadSources(['market/run', 'market/catalog']);
const { RunInventory, DEFAULT_CARD_CAPACITY, INVENTORY_LIMIT, MAX_PACK_DRAWS } = await loaded.import('market/run');
const { ITEM_CATALOG } = await loaded.import('market/catalog');
after(() => loaded.dispose());
const card = (id, slots = 0) => ({ id, name: id, kind: 'card', rarity: 'common', price: 4, description: 'Capacity fixture', icon: '+', color: '#ffffff', modify(m) { m.cardSlots += slots; } });
const normal = card('ordinary'), extra = card('extra', 1), smaller = card('smaller', -1);
const definitions = [normal, extra, smaller, ...Array.from({ length: 5 }, (_, index) => card(`ordinary-${index}`)), ...ITEM_CATALOG.filter(item => item.kind === 'pack' || item.kind === 'cosmetic')];
function shop() { const run = new RunInventory(54, definitions); run.advanceScore(100); run.open(); run.creditCoins(1000); return run; }
function offer(run, id) { const item = run.catalog.get(id), offer = { id: `fixture-${run.revision}-${id}`, itemId: id, sold: false, price: item.price }; run.market.offers.push(offer); return offer; }
function buy(run, id) { const result = run.buy(offer(run, id).id); assert.equal(result.ok, true, result.message); return result.cards?.[0]; }
const snapshot = run => JSON.stringify({ wallet: run.wallet, cards: run.cards, effects: run.effects, pendingPack: run.pendingPack, market: run.market, powers: run.powers, revision: run.revision, state: run.state, sequence: run.sequence, capacity: run.cardCapacity });

test('ordinary hands hold three cards; direct capacity cards can expand a full hand without changing wallet on rejection', () => {
  const run = shop();
  assert.equal(DEFAULT_CARD_CAPACITY, 3); assert.equal(run.cardCapacity, 3);
  for (let i = 0; i < 3; i++) buy(run, normal.id);
  let blocked = offer(run, normal.id), before = snapshot(run);
  assert.equal(run.buy(blocked.id).ok, false); assert.equal(snapshot(run), before); assert.equal(blocked.sold, false);
  buy(run, extra.id); assert.equal(run.cards.length, 4); assert.equal(run.cardCapacity, 4);
  buy(run, extra.id); buy(run, extra.id);
  assert.equal(run.cards.length, 6); assert.equal(run.cardCapacity, INVENTORY_LIMIT);
  blocked = offer(run, extra.id); before = snapshot(run);
  assert.equal(run.buy(blocked.id).ok, false); assert.equal(snapshot(run), before);
});

test('capacity costs are applied before a purchase and selling capacity never silently drops another card', () => {
  const run = shop();
  const pocket = buy(run, extra.id);
  for (let i = 0; i < 3; i++) buy(run, normal.id);
  // Four cards minus the pocket leaves three cards, so this sale is valid.
  assert.equal(run.sell(pocket.id).ok, true); assert.equal(run.cards.length, 3); assert.equal(run.cardCapacity, 3);
  const first = run.cards[0]; run.sell(first.id);
  const shrink = offer(run, smaller.id), before = snapshot(run);
  assert.equal(run.buy(shrink.id).ok, false); assert.equal(snapshot(run), before);
  run.sell(run.cards[0].id); const light = buy(run, smaller.id);
  assert.equal(run.cards.length, 2); assert.equal(run.cardCapacity, 2);
  assert.equal(run.sell(light.id).ok, true); assert.equal(run.cardCapacity, 3);

  const nonlinear = { ...extra, id: 'double', modify(m) { m.cardSlots += 2; } };
  const expanded = new RunInventory(2, [...definitions, nonlinear]);
  expanded.advanceScore(100); expanded.open(); expanded.creditCoins(1000);
  const large = buy(expanded, nonlinear.id);
  for (let i = 0; i < 4; i++) buy(expanded, normal.id);
  const snapshotBefore = snapshot(expanded);
  assert.equal(expanded.sell(large.id).ok, false); assert.equal(snapshot(expanded), snapshotBefore);
  expanded.sell(expanded.cards[1].id);
  assert.equal(expanded.sell(large.id).ok, true); assert.equal(expanded.cards.length, 3);
});

test('small and large packs open at full capacity; their seeded choices do not depend on the hand', () => {
  assert.ok(MAX_PACK_DRAWS >= 5);
  for (const packId of ['pack-pocket', 'pack-satchel']) {
    const run = shop(), empty = shop();
    for (let index = 0; index < 3; index++) { buy(run, normal.id); buy(empty, normal.id); }
    for (const owned of [...empty.cards]) assert.equal(empty.sell(owned.id).ok, true);
    const beforeHand = [...run.cards], wallet = run.wallet;
    buy(run, packId); buy(empty, packId);
    assert.deepEqual(run.pendingPack, empty.pendingPack, 'held cards never filter or reroll the seeded draw');
    assert.deepEqual(run.cards, beforeHand, 'opening equips nothing');
    assert.equal(run.wallet, wallet - run.catalog.get(packId).price);
    assert.equal(run.pendingPack.choices.length, packId === 'pack-pocket' ? 3 : 5);
    assert.equal(new Set(run.pendingPack.choices.map(choice => choice.components[0].itemId)).size, run.pendingPack.choices.length);
    const selected = run.pendingPack.choices.filter(choice => ![smaller.id, extra.id].includes(choice.components[0].itemId)).slice(0, run.pendingPack.picks);
    assert.equal(selected.length, run.pendingPack.picks);
    assert.equal(run.claimPack(selected.map(choice => choice.id)).ok, false);
    assert.equal(run.claimPack(selected.map(choice => choice.id), beforeHand.slice(0, selected.length).map(card => card.id)).ok, true);
    assert.equal(run.cards.length, 3); assert.equal(run.cardCapacity, 3);
  }
});

test('selling during a paid pack keeps the choices and payment while opening room to claim them', () => {
  for (const packId of ['pack-pocket', 'pack-satchel']) {
    const run = shop();
    for (let index = 0; index < 3; index++) buy(run, normal.id);
    buy(run, packId);
    const draft = structuredClone(run.pendingPack), wallet = run.wallet, random = run.state, sequence = run.sequence;
    const selected = run.pendingPack.choices.filter(choice => ![smaller.id, extra.id].includes(choice.components[0].itemId)).slice(0, draft.picks);
    assert.equal(run.previewPack(selected.map(choice => choice.id)).valid, false);
    let saleTotal = 0;
    for (const held of run.cards.slice(0, draft.picks)) {
      saleTotal += held.saleValue;
      assert.equal(run.sell(held.id).ok, true);
    }
    assert.deepEqual(run.pendingPack, draft, 'selling neither rerolls nor clears a paid draft');
    assert.equal(run.wallet, wallet + saleTotal, 'only sale value is credited');
    assert.equal(run.state, random); assert.equal(run.sequence, sequence);
    assert.equal(run.previewPack(selected.map(choice => choice.id)).valid, true);
    assert.equal(run.claimPack(selected.map(choice => choice.id)).ok, true);
    assert.equal(run.cards.length, 3);
    assert.equal(run.wallet, wallet + saleTotal, 'claiming does not charge or refund the paid pack');
  }
});

test('the persistent hand sells outside markets, rejects stale/dead sales and protects capacity during drafts', () => {
  const run = shop(), first = buy(run, normal.id);
  run.close(); run.tick(20);
  assert.equal(run.market, null);
  const wallet = run.wallet;
  assert.equal(run.sell(first.id).ok, true);
  assert.equal(run.wallet, wallet + first.saleValue);
  const sold = snapshot(run);
  assert.equal(run.sell(first.id).ok, false); assert.equal(snapshot(run), sold);

  const larger = { ...extra, id: 'double-pocket', modify(m) { m.cardSlots += 2; } };
  const full = new RunInventory(42, [...definitions, larger]);
  full.advanceScore(100); full.open(); full.creditCoins(1000);
  const pocket = buy(full, larger.id);
  for (let index = 0; index < 4; index++) buy(full, normal.id);
  buy(full, 'pack-pocket');
  const before = snapshot(full);
  assert.equal(full.sell(pocket.id).ok, false);
  assert.equal(snapshot(full), before, 'a draft does not bypass capacity-card sale protection');
  const liveCard = full.cards[1];
  full.clear();
  const ended = snapshot(full);
  assert.equal(full.sell(liveCard.id).ok, false);
  assert.equal(snapshot(full), ended, 'death cannot restore coins or cards');
});

test('pack replacement validates the complete hand and every invalid swap leaves the transaction untouched', () => {
  const run = shop();
  for (let index = 0; index < 3; index++) buy(run, normal.id);
  buy(run, 'pack-pocket');
  const draft = run.pendingPack, before = snapshot(run), choice = draft.choices[0];
  choice.components = [{ itemId: smaller.id, potency: 1 }];
  const state = snapshot(run);
  for (const [ids, discardIds] of [
    [[], []], [[choice.id, choice.id], []], [['missing'], []],
    [[choice.id], ['missing']], [[choice.id], [choice.id]],
    [[choice.id], [run.cards[0].id, run.cards[0].id]],
    [[choice.id], []], [[choice.id], [run.cards[0].id]],
  ]) {
    assert.equal(run.previewPack(ids, discardIds).valid, false);
    assert.equal(run.claimPack(ids, discardIds).ok, false);
    assert.equal(snapshot(run), state);
  }
  assert.notEqual(state, before, 'fixture replaces one offered definition with a reducing card');
  const discarded = run.cards.slice(0, 2).map(card => card.id), retained = run.cards[2];
  assert.deepEqual(run.previewPack([choice.id], discarded), { count: 2, capacity: 2, valid: true, message: 'Ready to keep these cards.' });
  assert.equal(snapshot(run), state, 'preview does not change IDs, RNG, effects, coins, cards or draft');
  const wallet = run.wallet, random = run.state, sequence = run.sequence;
  assert.equal(run.claimPack([choice.id], discarded).ok, true);
  assert.deepEqual(run.cards, [retained, choice]);
  assert.equal(run.wallet, wallet, 'discarding awards no sale value or refund');
  assert.equal(run.state, random); assert.equal(run.sequence, sequence);
  assert.equal(run.effects.cardSlots, -1, 'chosen effect applies once');
  const claimed = snapshot(run);
  assert.equal(run.claimPack([choice.id], discarded).ok, false); assert.equal(snapshot(run), claimed);
});

test('keeping and discarding slot cards recomputes capacity from the final hand', () => {
  const run = shop();
  for (let index = 0; index < 3; index++) buy(run, normal.id);
  buy(run, 'pack-pocket');
  const boost = run.pendingPack.choices[0]; boost.components = [{ itemId: extra.id, potency: 1 }];
  assert.equal(run.previewPack([boost.id]).valid, true);
  assert.equal(run.claimPack([boost.id]).ok, true);
  assert.equal(run.cards.length, 4); assert.equal(run.cardCapacity, 4);
  buy(run, 'pack-pocket');
  const replacement = run.pendingPack.choices[0]; replacement.components = [{ itemId: normal.id, potency: 1 }];
  const before = snapshot(run);
  assert.deepEqual(run.previewPack([replacement.id], [boost.id]), { count: 4, capacity: 3, valid: false, message: 'Hand full (4/3). Choose cards to leave behind.' });
  assert.equal(run.claimPack([replacement.id], [boost.id]).ok, false); assert.equal(snapshot(run), before);
  assert.equal(run.claimPack([replacement.id], [boost.id, run.cards[0].id]).ok, true);
  assert.equal(run.cards.length, 3); assert.equal(run.cardCapacity, 3);
});

test('card capacity resets with the run and stays within one to six slots', () => {
  const run = shop(); buy(run, smaller.id);
  assert.equal(run.cardCapacity, 2);
  const smallerAgain = offer(run, smaller.id), before = snapshot(run);
  assert.equal(run.buy(smallerAgain.id).ok, false); assert.equal(snapshot(run), before);
  run.clear(); assert.equal(run.cardCapacity, 3); assert.equal(run.cards.length, 0);
});

test('reducing candidates remain in packs and can be chosen by leaving enough held cards behind', () => {
  const pocket = ITEM_CATALOG.find(item => item.id === 'pack-pocket');
  const negatives = Array.from({ length: 5 }, (_, index) => card(`negative-${index}`, -1));
  const run = new RunInventory(83, [normal, ...negatives, pocket]);
  run.advanceScore(100); run.open(); run.creditCoins(1000);
  buy(run, normal.id); buy(run, normal.id); buy(run, normal.id);
  buy(run, pocket.id);
  const negative = run.pendingPack.choices.find(choice => choice.components[0].itemId.startsWith('negative-'));
  assert.ok(negative);
  assert.equal(run.claimPack([negative.id], run.cards.slice(0, 2).map(card => card.id)).ok, true);
  assert.equal(run.cards.length, 2); assert.equal(run.cardCapacity, 2);
});

test('bonus quotas remain exact while swaps can combine reducing and expanding cards', () => {
  const pack = { ...ITEM_CATALOG.find(item => item.id === 'pack-satchel'), id: 'two-picks', draws: 3, picks: 1, bonus: { chance: 1, picks: 2 } };
  const run = new RunInventory(29, [normal, extra, smaller, pack]);
  run.advanceScore(100); run.open(); run.creditCoins(1000);
  for (let index = 0; index < 3; index++) buy(run, normal.id);
  buy(run, pack.id);
  assert.equal(run.pendingPack.bonus, true);
  const choices = run.pendingPack.choices.filter(choice => [extra.id, smaller.id].includes(choice.components[0].itemId));
  assert.equal(choices.length, 2, 'neither slot effect is excluded before reveal');
  const discards = run.cards.slice(0, 2).map(card => card.id), before = snapshot(run);
  assert.equal(run.claimPack([choices[0].id], discards).ok, false); assert.equal(snapshot(run), before);
  assert.equal(run.claimPack(choices.map(choice => choice.id), discards).ok, true);
  assert.equal(run.cards.length, 3); assert.equal(run.cardCapacity, 3);
});

test('nonadditive slot interactions cannot overflow the hand and impossible selections can be skipped', () => {
  const unusual = [
    { ...card('switch-a'), modify(m) { if (m.cardSlots === 1) m.cardSlots = -2; else m.cardSlots = 0; } },
    { ...card('switch-b'), modify(m) { if (m.cardSlots === 0) m.cardSlots = 1; else if (m.cardSlots === 1) m.cardSlots = 1; } },
  ];
  const pack = { ...ITEM_CATALOG.find(item => item.id === 'pack-pocket'), id: 'custom-pair', draws: 2, picks: 2 };
  let sawRejection = false;
  for (let seed = 0; seed < 30; seed++) {
    const run = new RunInventory(seed, [...unusual, pack]); run.advanceScore(100); run.open(); run.creditCoins(1000);
    buy(run, pack.id);
    const before = snapshot(run), ids = run.pendingPack.choices.map(choice => choice.id);
    if (!run.previewPack(ids).valid) {
      sawRejection = true; assert.equal(run.claimPack(ids).ok, false); assert.equal(snapshot(run), before);
      assert.equal(run.skipPack().ok, true); assert.equal(run.pendingPack, null); assert.equal(run.cards.length, 0);
      assert.equal(run.wallet, 1000 - pack.price);
    } else assert.equal(run.claimPack(ids).ok, true);
  }
  assert.equal(sawRejection, true);
});
