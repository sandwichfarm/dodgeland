import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session', 'survive-together', 'market/catalog']);
after(sources.dispose);
const { Game, laneActors } = await sources.import('game');
const { LocalSession } = await sources.import('session');
const { createSurviveTogetherDefinition } = await sources.import('survive-together');
const { ITEM_CATALOG } = await sources.import('market/catalog');

function fixture(mode = 'stroll') {
  const game = new Game(119, 'pond', mode, false, ITEM_CATALOG, 'butter');
  for (const lane of game.rows.values()) {
    lane.coin = null;
    if (lane.index <= 2) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], actors: undefined });
  }
  const session = LocalSession.stage(game, {
    roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'sunny' }],
    mode: createSurviveTogetherDefinition(game.definition),
  }).commit();
  return { game, session };
}

// Real purchases establish inventories; deterministic added offers isolate
// modifier behavior from the separate seeded market-selection policy.
function buy(run, itemId) {
  const item = run.catalog.get(itemId);
  assert.ok(item);
  run.advanceScore(100);
  assert.equal(run.open(), true);
  const offer = { id: `boundary-${itemId}-${run.revision}`, itemId, price: item.price, sold: false };
  run.market.offers.push(offer);
  run.creditCoins(item.price);
  assert.equal(run.buy(offer.id).ok, true);
  run.close();
}

test('fractional coin awards use only the collecting owners purchased multiplier', () => {
  for (const mode of ['arcade', 'stroll']) for (const seat of ['p1', 'p2']) {
    const { game, session } = fixture(mode);
    const owner = session.players.find(player => player.seat === seat);
    const other = session.players.find(player => player !== owner);
    buy(owner.run, 'coin-multiplier');
    session.update(0);
    assert.equal(owner.run.effects.coinMultiplier, 1.125);
    assert.equal(other.run.effects.coinMultiplier, 1);
    const before = session.players.map(player => ({ wallet: player.run.wallet, coins: player.coins }));
    for (let count = 0; count < 8; count++) {
      game.awardSessionPickup(owner, 1);
      game.awardSessionPickup(other, 1);
    }
    for (const [index, player] of session.players.entries()) {
      const expected = player === owner ? 9 : 8;
      assert.equal(player.run.wallet - before[index].wallet, expected, `${mode}/${seat}: wallet`);
      assert.equal(player.coins - before[index].coins, expected, `${mode}/${seat}: collected total`);
    }
  }
});

test('real traffic takes the best active contribution without stacking or position jumps', () => {
  const { game, session } = fixture();
  const [p1, p2] = session.players;
  const lane = [...game.rows.values()].find(value => value.kind === 'road' && value.index > 2 && value.speed !== 0);
  assert.ok(lane, 'normal generated course includes moving traffic');
  const base = lane.speed;
  session.update(.2);
  function expectSpeed(multiplier, mutate) {
    const time = game.time;
    const before = laneActors(lane, time).map(actor => ({ id: actor.id, x: actor.x }));
    assert.ok(before.length);
    mutate();
    session.update(0);
    assert.equal(game.time, time, 'effect reconciliation does not advance simulation');
    assert.ok(Math.abs(lane.speed - base * multiplier) < 1e-12, `expected multiplier ${multiplier}, got ${lane.speed / base}`);
    const after = laneActors(lane, time);
    for (const actor of before) {
      const same = after.find(candidate => candidate.id === actor.id);
      assert.ok(same, 'existing traffic actor remains present');
      assert.ok(Math.abs(same.x - actor.x) < 1e-9, 'changing contributors rebases motion without teleporting traffic');
    }
  }
  expectSpeed(.88, () => buy(p1.run, 'traffic-speed'));
  expectSpeed(.88, () => buy(p2.run, 'traffic-speed'));
  expectSpeed(.88 ** 2, () => buy(p1.run, 'traffic-speed'));
  const device = p1.device;
  expectSpeed(.88, () => assert.equal(session.deviceLost('p1'), true));
  expectSpeed(.88 ** 2, () => assert.equal(session.reclaim('p1', device), true));
  assert.equal(p1.run.cards.length, 2);
  assert.equal(p2.run.cards.length, 1);
});

let nextAction = 0;
function contextFor(session, player) {
  const context = session.openCoOpMarket({ seat: player.seat, device: player.device, participantId: player.participantId });
  assert.ok(context, 'an active owner gets an authoritative interaction context');
  return context;
}
function request(player, context, kind, payload = {}) {
  return {
    actionId: `root-economy-${++nextAction}`, seat: player.seat, device: player.device, participantId: player.participantId,
    expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration,
    expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration,
    kind, ...payload,
  };
}
function ownerSnapshot(player, session) {
  return JSON.stringify({ run: player.run, charge: session.consumableSnapshot().charges.find(value => value.seat === player.seat) });
}

test('either player can buy either class at its exact price without losing fractional income or touching a teammate', () => {
  for (const mode of ['arcade', 'stroll']) for (const seat of ['p1', 'p2']) {
    for (const [itemId, price] of [['revival', 24], ['flare', 36]]) {
      const { session } = fixture(mode);
      const owner = session.players.find(player => player.seat === seat);
      const other = session.players.find(player => player !== owner);
      owner.run.advanceScore(100);
      owner.run.creditCoins(price + .875);
      other.run.creditCoins(19.375);
      const untouched = ownerSnapshot(other, session);
      let context = contextFor(session, owner);
      const opened = session.actCoOpMarket(request(owner, context, 'open'));
      assert.equal(opened.ok, true);
      context = opened.context;
      const purchase = request(owner, context, 'buy-consumable', { itemId });
      const result = session.actCoOpMarket(purchase);
      assert.equal(result.ok, true, `${mode}/${seat}/${itemId}`);
      assert.equal(owner.run.wallet, 0);
      assert.equal(session.consumableSnapshot().charges.find(value => value.seat === seat)[itemId], 1);
      assert.equal(ownerSnapshot(other, session), untouched);
      const after = ownerSnapshot(owner, session);
      assert.equal(session.actCoOpMarket(purchase).ok, false, 'replay cannot debit twice');
      assert.equal(ownerSnapshot(owner, session), after);
      assert.equal(owner.run.creditCoins(.125), 1, 'payment preserves the .875 fractional carry');
      assert.equal(owner.run.wallet, 1);
      assert.equal(other.run.creditCoins(.625), 1, 'the other owners fractional carry is unchanged');
      owner.run.creditCoins(price);
      context = contextFor(session, owner);
      const fullBefore = ownerSnapshot(owner, session);
      assert.equal(session.actCoOpMarket(request(owner, context, 'buy-consumable', { itemId })).ok, false);
      assert.equal(ownerSnapshot(owner, session), fullBefore, 'held limit rejects before any payment or revision');
    }
  }
});

test('switching away and back or losing and reclaiming a device cannot reauthorize an old purchase', () => {
  for (const transition of ['owner-switch', 'device-reclaim']) {
    const { session } = fixture();
    const [owner, other] = session.players;
    owner.run.advanceScore(100); owner.run.creditCoins(100); assert.equal(owner.run.open(), true);
    const old = contextFor(session, owner);
    const stale = request(owner, old, 'buy-consumable', { itemId: 'revival' });
    if (transition === 'owner-switch') {
      contextFor(session, other);
    } else {
      const device = owner.device;
      assert.equal(session.deviceLost(owner.seat), true);
      assert.equal(session.reclaim(owner.seat, device), true);
    }
    const fresh = contextFor(session, owner);
    const before = ownerSnapshot(owner, session);
    assert.equal(session.actCoOpMarket(stale).ok, false, transition);
    assert.equal(ownerSnapshot(owner, session), before, transition);
    assert.equal(session.actCoOpMarket(request(owner, fresh, 'buy-consumable', { itemId: 'revival' })).ok, true,
      'a fresh action succeeds after the stale action was refused');
  }
});

test('a full-hand paid pack stays with its owner across context switches, sale, and selection', () => {
  const { session } = fixture();
  const [other, owner] = session.players;
  for (const id of ['coin-multiplier', 'traffic-speed', 'magnet']) buy(owner.run, id);
  assert.equal(owner.run.cards.length, owner.run.cardCapacity);
  const pack = owner.run.catalog.get('pack-satchel');
  assert.ok(pack);
  owner.run.creditCoins(pack.price);
  let context = contextFor(session, owner);
  let result = session.actCoOpMarket(request(owner, context, 'open'));
  assert.equal(result.ok, true); context = result.context;
  const offer = { id: 'root-full-hand-pack', itemId: pack.id, price: pack.price, sold: false };
  owner.run.market.offers.push(offer);
  const otherBefore = ownerSnapshot(other, session);
  result = session.actCoOpMarket(request(owner, context, 'buy', { offerId: offer.id }));
  assert.equal(result.ok, true, 'opening a pack is allowed at full hand capacity');
  const draft = JSON.stringify(owner.run.pendingPack);
  assert.ok(owner.run.pendingPack);
  contextFor(session, other);
  assert.equal(JSON.stringify(owner.run.pendingPack), draft, 'switching UI owner preserves the paid draft');
  context = contextFor(session, owner);
  const sold = owner.run.cards[0];
  result = session.actCoOpMarket(request(owner, context, 'sell', { cardId: sold.id }));
  assert.equal(result.ok, true);
  assert.equal(owner.run.wallet, sold.saleValue);
  assert.equal(JSON.stringify(owner.run.pendingPack), draft, 'selling keeps the pack page state');
  const ids = owner.run.pendingPack.choices.slice(0, owner.run.pendingPack.picks).map(card => card.id);
  const discardIds = owner.run.cards.slice(0, Math.max(0, owner.run.cards.length + ids.length - owner.run.cardCapacity)).map(card => card.id);
  result = session.actCoOpMarket(request(owner, result.context, 'claim-pack', { ids, discardIds }));
  assert.equal(result.ok, true);
  assert.equal(owner.run.pendingPack, null);
  assert.ok(ids.every(id => owner.run.cards.some(card => card.id === id)));
  assert.equal(ownerSnapshot(other, session), otherBefore);
});

test('read-only market snapshots preserve a valid sell-anywhere action and its closed window', () => {
  const { session } = fixture();
  const [owner, other] = session.players;
  buy(owner.run, 'coin-multiplier');
  assert.equal(owner.run.isOpen, false);
  const context = contextFor(session, owner);
  const card = owner.run.cards[0];
  const sale = request(owner, context, 'sell', { cardId: card.id });
  const before = ownerSnapshot(owner, session);
  const otherBefore = ownerSnapshot(other, session);
  for (let index = 0; index < 100; index++) {
    const observed = session.coOpMarketSnapshot();
    assert.deepEqual(observed, context);
    assert.equal(Object.isFrozen(observed), true);
    assert.equal(Object.isFrozen(observed.offers), true);
  }
  assert.equal(ownerSnapshot(owner, session), before);
  const result = session.actCoOpMarket(sale);
  assert.equal(result.ok, true, 'HUD reads cannot invalidate the selected sale');
  assert.equal(owner.run.wallet, card.saleValue);
  assert.equal(owner.run.cards.length, 0);
  assert.equal(owner.run.isOpen, false, 'selling away from a market does not open one');
  assert.equal(ownerSnapshot(other, session), otherBefore);
});

test('skipping a paid pack keeps the offer sold without a refund, reroll, or teammate mutation', () => {
  const { session } = fixture();
  const [other, owner] = session.players;
  owner.run.advanceScore(100);
  const pack = owner.run.catalog.get('pack-satchel');
  owner.run.creditCoins(pack.price);
  let result = session.actCoOpMarket(request(owner, contextFor(session, owner), 'open'));
  assert.equal(result.ok, true);
  const offer = { id: 'root-skip-pack', itemId: pack.id, price: pack.price, sold: false };
  owner.run.market.offers.push(offer);
  result = session.actCoOpMarket(request(owner, result.context, 'buy', { offerId: offer.id }));
  assert.equal(result.ok, true);
  assert.ok(owner.run.pendingPack);
  assert.equal(owner.run.wallet, 0);
  const otherBefore = ownerSnapshot(other, session);
  const skip = request(owner, result.context, 'skip-pack');
  result = session.actCoOpMarket(skip);
  assert.equal(result.ok, true);
  assert.equal(owner.run.pendingPack, null);
  assert.deepEqual(owner.run.cards, []);
  assert.equal(owner.run.wallet, 0);
  assert.equal(offer.sold, true);
  assert.equal(ownerSnapshot(other, session), otherBefore);
  const after = ownerSnapshot(owner, session);
  assert.equal(session.actCoOpMarket(skip).ok, false);
  assert.equal(ownerSnapshot(owner, session), after);
  assert.equal(session.actCoOpMarket(request(owner, result.context, 'buy', { offerId: offer.id })).ok, false);
  assert.equal(ownerSnapshot(owner, session), after);
});

test('the real shared market pause permits either living owner to buy while world time stays frozen', () => {
  for (const seat of ['p1', 'p2']) {
    const { game, session } = fixture();
    const owner = session.players.find(player => player.seat === seat);
    const other = session.players.find(player => player !== owner);
    owner.run.advanceScore(100); owner.run.creditCoins(24);
    assert.equal(owner.run.open(), true);
    // The shipped market UI opens the selected run, then pauses the host.
    // P1 aliases host.state, whereas a secondary owner keeps its own state.
    game.pause();
    assert.equal(game.state, 'paused');
    const time = game.time;
    const otherBefore = ownerSnapshot(other, session);
    const context = contextFor(session, owner);
    const result = session.actCoOpMarket(request(owner, context, 'buy-consumable', { itemId: 'revival' }));
    assert.equal(result.ok, true, `${seat}: a shared pause must not disable the owner market`);
    session.update(1);
    assert.equal(game.time, time);
    assert.equal(game.state, 'paused');
    assert.equal(owner.run.wallet, 0);
    assert.equal(session.consumableSnapshot().charges.find(value => value.seat === seat).revival, 1);
    assert.equal(ownerSnapshot(other, session), otherBefore);
  }
});
