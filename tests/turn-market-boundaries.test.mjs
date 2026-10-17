import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources = await loadSources(['game', 'relay', 'race', 'market/catalog']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing market-boundary attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 4);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'pip' },
];
function personal(p) {
  return structuredClone({ wallet: p.run.wallet, cards: p.run.cards, powers: p.run.powers,
    cosmetics: p.run.cosmetics, market: p.run.market, draft: p.run.pendingPack,
    revision: p.run.revision, random: p.run.state, sequence: p.run.sequence,
    effects: p.run.effects, open: p.run.isOpen, alive: p.run.alive,
    health: p.health, earned: p.earnedDistance, completed: p.completedForwardTiles,
    recovery: p.recovery, stats: p.statistics, interactions: p.interactions });
}
for (const mode of ['relay', 'race']) for (const base of ['arcade', 'stroll'])
test(`${mode}/${base}: paid market requests preserve ownership through full hands and stale actions`, () => {
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const create = () => {
    const game = Game.fromSeed(`ph3-00000071-pond-${base === 'arcade' ? 'a' : 's'}-n`, ITEM_CATALOG, 'butter');
    for (let y = -8; y < 15; y++) game.rows.set(y, {
      ...generateLane(game.seed, y, game.home), kind: 'meadow', blocked: [],
      decorations: [], coin: null, coinActor: undefined, actors: undefined,
    });
    return game;
  };
  const acquired = recorder ? recorder.acquireFrom(create, base, { seats })
    : (() => { const game = create(); return { game, owner: factory(game, { seats }) }; })();
  const { game, owner } = acquired, session = owner.session, [p, other] = session.players;
  const interval = (id, action) => recorder ? recorder.interval(id, action) : action();
  // Explicit component market/starting-funds/stock fixture. Every purchase,
  // replacement,sale,skip and equip below uses the actual owner adapter.
  p.run.advanceScore(100); p.run.creditCoins(10000);
  let action = 0, offer = 0;
  function request(kind, fields = {}) {
    const context = session.openCoOpMarket(p); assert.ok(context);
    return { actionId: `market-boundary-${++action}`, kind,
      seat: p.seat, device: p.device, participantId: p.participantId,
      expectedOwnerGeneration: context.ownerGeneration,
      expectedInventoryGeneration: context.inventoryGeneration,
      expectedRunRevision: context.runRevision,
      expectedContextGeneration: context.contextGeneration, ...fields };
  }
  function transact(kind, fields = {}) { return session.actCoOpMarket(request(kind, fields)); }
  function stock(id) {
    const item = ITEM_CATALOG.find(i => i.id === id); assert.ok(item, id);
    const value = { id: `arranged-${++offer}`, itemId: id, price: item.price, sold: false };
    p.run.market.offers.push(value); return value;
  }
  function rejected(req) {
    const before = personal(p), untouched = personal(other), clock = game.time;
    const result = session.actCoOpMarket(req); assert.equal(result.ok, false, result.message);
    assert.deepEqual(personal(p), before); assert.deepEqual(personal(other), untouched);
    assert.equal(game.time, clock); return result;
  }
  function buy(id) { const value = stock(id); assert.equal(transact('buy', { offerId: value.id }).ok, true); return value; }

  interval('versioned-owner-and-rejected-market-actions', () => {
    const otherBefore = personal(other);
    assert.equal(transact('open').ok, true);
    const value = stock('look-hat-cap'), valid = request('buy', { offerId: value.id });
    for (const patch of [{ device: other.device }, { participantId: other.participantId },
      { expectedOwnerGeneration: valid.expectedOwnerGeneration + 1 },
      { expectedInventoryGeneration: valid.expectedInventoryGeneration + 1 },
      { expectedRunRevision: valid.expectedRunRevision - 1 },
      { expectedContextGeneration: valid.expectedContextGeneration - 1 },
      { actionId: '' }, { actionId: 'invalid action' }]) rejected({ ...valid, ...patch });
    const wallet = p.run.wallet;
    assert.equal(session.actCoOpMarket(valid).ok, true, 'rejected attempts did not consume the valid identity');
    assert.equal(p.run.wallet, wallet - value.price);
    rejected(valid); // Exact duplicate cannot pay twice.
    rejected(request('buy', { offerId: value.id })); // New identity cannot rebuy sold stock.
    rejected(request('buy', { offerId: stock('look-hat-cap').id })); // Owned look cannot be bought twice.
    for (const [kind, fields] of [
      ['buy', {}], ['buy', { offerId: 'missing-offer' }], ['sell', {}],
      ['sell', { cardId: 'missing-card' }], ['equip', {}], ['equip', { itemId: 'look-hat-beanie' }],
      ['skip-pack', {}], ['claim-pack', {}], ['unknown-action', {}],
      ['buy-consumable', {}], ['buy-consumable', { itemId: 'unknown' }],
    ]) rejected(request(kind, fields));
    assert.equal(transact('equip', { itemId: 'look-hat-cap' }).ok, true);
    assert.equal(p.run.equippedCosmetics.some(item => item.id === 'look-hat-cap'), true);
    assert.deepEqual(personal(other), otherBefore);
  });
  interval('paid-inventory-and-pack-capacity', () => {
    if (mode === 'race') {
      for (const id of ['magnet', 'pack-pocket', 'pack-satchel', 'power-shield']) {
        const value = stock(id); rejected(request('buy', { offerId: value.id }));
      }
      assert.equal(p.run.cards.length, 0); assert.equal(p.run.powers.length, 0);
      assert.equal(p.run.pendingPack, null);
      const wallet = p.run.wallet, item = ITEM_CATALOG.find(i => i.id === 'look-shirt-overalls');
      buy(item.id); assert.equal(p.run.wallet, wallet - item.price);
      assert.ok(p.run.equippedCosmetics.some(i => i.id === item.id));
    } else {
      for (const id of ['magnet', 'coin-multiplier', 'coin-chance']) buy(id);
      assert.equal(p.run.cards.length, 3); assert.equal(p.run.cardCapacity, 3);
      rejected(request('buy', { offerId: stock('first-aid').id }));
      const pocket = buy('extra-pocket');
      assert.equal(p.run.cards.length, 4); assert.equal(p.run.cardCapacity, 5);
      buy('first-aid'); assert.equal(p.run.cards.length, 5);
      const pocketCard = p.run.cards.find(c => c.components.some(c => c.itemId === pocket.itemId));
      rejected(request('sell', { cardId: pocketCard.id }));
      const sold = p.run.cards.find(c => c.id !== pocketCard.id), wallet = p.run.wallet;
      assert.equal(transact('sell', { cardId: sold.id }).ok, true);
      assert.equal(p.run.wallet, wallet + sold.saleValue);
      assert.equal(transact('sell', { cardId: pocketCard.id }).ok, true);
      assert.equal(p.run.cards.length, 3); assert.equal(p.run.cardCapacity, 3);
      buy('power-coin-rush'); const power = p.run.powers[0];
      buy('power-coin-rush'); assert.equal(p.run.powers.length, 1); assert.strictEqual(p.run.powers[0], power);
      const paid = buy('pack-satchel'), draft = p.run.pendingPack;
      assert.ok(draft); assert.equal(draft.choices.length, 5);
      assert.equal(p.run.cards.length, 3, 'opening a paid pack works with a full hand');
      const funds = p.run.wallet;
      rejected(request('buy', { offerId: stock('look-hat-beanie').id }));
      rejected(request('claim-pack'));
      rejected(request('claim-pack', { ids: Array(draft.picks).fill('outside-draft') }));
      if (draft.picks > 1) rejected(request('claim-pack', { ids: Array(draft.picks).fill(draft.choices[0].id) }));
      const slotCards = new Set(['extra-pocket', 'field-pack', 'travel-light', 'ballast', 'glass-purse']);
      const chosen = draft.choices.filter(c => c.components.every(v => !slotCards.has(v.itemId))).slice(0, draft.picks);
      assert.equal(chosen.length, draft.picks);
      const ids = chosen.map(c => c.id), discarded = p.run.cards.map(c => c.id);
      rejected(request('claim-pack', { ids, discardIds: ['missing-card'] }));
      rejected(request('claim-pack', { ids, discardIds: [discarded[0], discarded[0]] }));
      rejected(request('claim-pack', { ids }));
      assert.equal(transact('claim-pack', { ids, discardIds: discarded }).ok, true);
      assert.equal(p.run.pendingPack, null); assert.deepEqual(p.run.cards.map(c => c.id), ids);
      assert.equal(p.run.wallet, funds, 'replacing the hand neither refunds nor debits again');
      assert.equal(paid.sold, true);
      const held = structuredClone(p.run.cards), skipped = buy('pack-pocket'), afterPayment = p.run.wallet;
      const paidChoices = structuredClone(p.run.pendingPack.choices);
      assert.equal(transact('skip-pack').ok, true); assert.equal(p.run.pendingPack, null);
      assert.deepEqual(p.run.cards, held); assert.equal(p.run.wallet, afterPayment); assert.equal(skipped.sold, true);
      rejected(request('buy', { offerId: skipped.id }));
      assert.equal(paidChoices.length, 3);
      assert.equal(transact('close').ok, true);
      const remaining = power.remaining; session.update(1 / 120);
      assert.ok(power.remaining < remaining);
      if (base === 'stroll') {
        for (let n = 0; n < 1000; n++) session.update(1 / 120);
        assert.equal(p.run.powers.length, 0, 'temporary power expires through real mode updates');
        assert.equal(p.run.effects.coinRadius < 1.25, true);
      }
    }
    assert.equal(other.run.wallet, 0); assert.equal(other.run.cards.length, 0);
    assert.equal(other.run.cosmetics.length, 0); assert.equal(other.statistics.marketPurchases, 0);
  });
  interval('frozen-owner-results', () => {
    const lateRequest = request('close');
    if (mode === 'relay') owner.finish();
    else for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    const result = owner.result, before = JSON.stringify(result), funds = p.run.wallet;
    assert.ok(Object.isFrozen(result));
    assert.equal(session.actCoOpMarket(lateRequest).ok, false);
    assert.strictEqual(owner.result, result); assert.equal(JSON.stringify(result), before);
    assert.equal(p.run.wallet, funds);
  });
  if (recorder) records.push(recorder.finish());
});
