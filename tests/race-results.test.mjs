import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'race', 'session']);
after(sources.dispose);
const { Game } = await sources.import('game');
const { createRaceSession } = await sources.import('race');

test('statistics dependency: successful market interaction survives death clear exactly once', () => {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  const race = createRaceSession(game, { seats: [
    { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
    { seat: 'p2', device: 'keyboard-b', characterId: 'pip' },
  ] });
  const session = race.session, owner = session.players[0];
  // Arrange a real market window and funds, then exercise its authoritative
  // owner/context transaction. No result or statistic is fabricated.
  owner.run.advanceScore(100); owner.run.creditCoins(30);
  function request(kind, itemId) {
    const context = session.openCoOpMarket(owner);
    assert.ok(context);
    return { actionId: `result-${kind}`, kind, itemId, seat: owner.seat,
      device: owner.device, participantId: owner.participantId,
      expectedOwnerGeneration: context.ownerGeneration,
      expectedInventoryGeneration: context.inventoryGeneration,
      expectedRunRevision: context.runRevision,
      expectedContextGeneration: context.contextGeneration };
  }
  assert.equal(session.actCoOpMarket(request('open')).ok, true);
  const purchase = request('buy-consumable', 'mud-splash');
  assert.equal(session.actCoOpMarket(purchase).ok, true);
  assert.equal(session.actCoOpMarket(purchase).ok, false);
  assert.equal(owner.run.wallet, 0);
  assert.equal(session.consumableSnapshot().charges.find(p => p.seat === owner.seat)['mud-splash'], 1);
  owner.powerReadyAt = 999;
  session.damage(owner.seat, { cause: 'fog', amount: 99, reason: 'result history reproduction' });
  assert.equal(owner.state, 'dead');
  assert.equal(owner.run.market, null);
  assert.equal(session.consumableSnapshot().charges.find(p => p.seat === owner.seat)['mud-splash'], 0);
  // Proposed shared contribution field: the authoritative successful purchase
  // must remain observable after clear, independently of Race's result view.
  assert.equal(owner.statistics.marketPurchases, 1,
    'common participant statistics must retain the accepted purchase, excluding its rejected replay');
  assert.equal(owner.statistics.marketInteractions, 2);
  assert.equal(owner.statistics.coinsSpent, 30);
  assert.equal(owner.statistics.itemsFound, 0, 'purchase is not world collection');
  const history = owner.interactions;
  assert.equal(history.length, 2);
  assert.deepEqual(history.map(e => [e.kind, e.action, e.walletDelta]), [['market', 'open', 0], ['market', 'buy-consumable', -30]]);
  assert.equal(history[1].participantId, owner.participantId);
  assert.equal(history[1].itemId, 'mud-splash');
  assert.equal(history[1].itemKind, 'consumable');
  assert.equal(history[1].ownerGeneration, purchase.expectedOwnerGeneration);
  assert.ok(Object.isFrozen(history) && Object.isFrozen(history[1]));
  assert.equal(session.players[1].interactions.length, 0);
});

test('statistics innate commit belongs to stable receiver before presentation callback and survives death', () => {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  const race = createRaceSession(game, { seats: [
    { seat:'p1',device:'keyboard-a',characterId:'butter' },
    { seat:'p2',device:'keyboard-b',characterId:'pip' },
  ] });
  const [primary, secondary] = race.session.players;
  let calls = 0;
  secondary.onPower = () => { calls++; assert.equal(secondary.statistics.innateUses, 1); assert.equal(primary.statistics.innateUses, 0); };
  race.session.damage('p2', {cause:'mob',amount:99,reason:'innate success'});
  assert.equal(calls, 1);
  assert.equal(secondary.interactions.filter(e=>e.kind==='innate').length, 1);
  race.session.damage('p2', {cause:'mob',amount:99,reason:'protected replay'});
  assert.equal(calls, 1);
  assert.equal(primary.interactions.length, 0);
});
