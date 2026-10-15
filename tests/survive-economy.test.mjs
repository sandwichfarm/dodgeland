import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'session', 'survive-together', 'consumables', 'shared-world-effects', 'market/run']);
const { Game } = await source.import('game');
const { LocalSession } = await source.import('session');
const { createSurviveTogetherDefinition } = await source.import('survive-together');
const { defaultModifiers } = await source.import('market/run');
const { SHARED_WORLD_EFFECTS, resolveSharedWorldEffects } = await source.import('shared-world-effects');
after(() => source.dispose());

function surviveSession() {
  const game = new Game(0x03505, 'pond', 'arcade');
  const session = LocalSession.stage(game, {
    roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'pip' }],
    mode: createSurviveTogetherDefinition(game.definition),
  }).commit();
  return { game, session, p1: session.players.find(player => player.seat === 'p1'), p2: session.players.find(player => player.seat === 'p2') };
}

test('P2 buys one Revival through the owner-attributed market without changing P1', () => {
  const { session, p1, p2 } = surviveSession();
  p2.run.advanceScore(100);
  p2.run.creditCoins(24);
  const p1Before = structuredClone({ wallet: p1.run.wallet, cards: p1.run.cards, effects: p1.run.effects, charges: session.consumableSnapshot().charges.find(value => value.seat === 'p1') });

  const selected = session.openCoOpMarket({ seat: 'p2', device: 'keyboard-b', participantId: p2.participantId });
  assert.ok(selected, 'active P2 receives a versioned interaction context');
  const opened = session.actCoOpMarket({ actionId: 'p2-open', seat: 'p2', device: 'keyboard-b', participantId: p2.participantId, expectedOwnerGeneration: selected.ownerGeneration, expectedInventoryGeneration: selected.inventoryGeneration, expectedRunRevision: selected.runRevision, expectedContextGeneration: selected.contextGeneration, kind: 'open' });
  assert.equal(opened.ok, true, opened.message);
  const bought = session.actCoOpMarket({ actionId: 'p2-revival', seat: 'p2', device: 'keyboard-b', participantId: p2.participantId, expectedOwnerGeneration: opened.context.ownerGeneration, expectedInventoryGeneration: opened.context.inventoryGeneration, expectedRunRevision: opened.context.runRevision, expectedContextGeneration: opened.context.contextGeneration, kind: 'buy-consumable', itemId: 'revival' });
  assert.equal(bought.ok, true, bought.message);
  assert.equal(p2.run.wallet, 0);
  assert.equal(session.consumableSnapshot().charges.find(value => value.seat === 'p2').revival, 1);
  assert.deepEqual({ wallet: p1.run.wallet, cards: p1.run.cards, effects: p1.run.effects, charges: session.consumableSnapshot().charges.find(value => value.seat === 'p1') }, p1Before);
});

test('shared effect descriptors exhaust actual modifier keys and select one stable best contributor', () => {
  const solo = defaultModifiers();
  assert.deepEqual(Object.keys(SHARED_WORLD_EFFECTS).sort(), Object.keys(solo).sort());
  for (const [key, descriptor] of Object.entries(SHARED_WORLD_EFFECTS)) {
    assert.ok(['owner-local', 'world-shared'].includes(descriptor.scope), key);
    assert.ok(['higher', 'lower'].includes(descriptor.direction), key);
  }
  assert.equal(SHARED_WORLD_EFFECTS.riverCoinBonus.ownerPayoutAlso, true);
  const p1 = { ...solo, trafficSpeed: .88, trafficSpacing: 1.1, waveSpeed: .9, mobSpawnDelay: 1, riverCoinBonus: .2 };
  const p2 = { ...solo, trafficSpeed: .8, trafficSpacing: 1.4, waveSpeed: .9, mobSpawnDelay: 3, riverCoinBonus: .7 };
  const left = resolveSharedWorldEffects([{ seat: 'p2', effects: p2 }, { seat: 'p1', effects: p1 }]);
  const right = resolveSharedWorldEffects([{ seat: 'p1', effects: p1 }, { seat: 'p2', effects: p2 }]);
  assert.deepEqual(left, right, 'input order cannot change the shared course');
  assert.equal(left.effects.trafficSpeed, .8);
  assert.equal(left.effects.trafficSpacing, 1.4);
  assert.equal(left.effects.waveSpeed, .9);
  assert.equal(left.contributors.waveSpeed, 'p1', 'equal values choose the lower stable seat');
  assert.equal(left.effects.mobSpawnDelay, 3);
  assert.equal(left.effects.riverCoinBonus, .7);
  assert.deepEqual(resolveSharedWorldEffects([{ seat: 'p1', effects: p1 }]).effects, p1, 'one active seat keeps exact modifier values');
});

test('lost, dead, and departed seats stop contributing while reclaim restores only their shared value', () => {
  const { game, session, p1, p2 } = surviveSession();
  p1.run.effects = { ...p1.run.effects, trafficSpeed: .9, waveSpeed: .95 };
  p2.run.effects = { ...p2.run.effects, trafficSpeed: .8, waveSpeed: .85 };
  session.update(0);
  assert.equal(session.sharedWorldEffectsSnapshot().effects.trafficSpeed, .8);
  assert.equal(session.deviceLost('p2'), true);
  assert.equal(session.sharedWorldEffectsSnapshot().effects.trafficSpeed, .9);
  assert.equal(session.reclaim('p2', 'keyboard-b'), true);
  assert.equal(session.sharedWorldEffectsSnapshot().effects.trafficSpeed, .8);
  p2.state = 'dead';
  session.update(0);
  assert.equal(session.sharedWorldEffectsSnapshot().effects.trafficSpeed, .9);
  assert.equal(session.depart('p2'), true);
  assert.equal(session.sharedWorldEffectsSnapshot().effects.trafficSpeed, .9);
  assert.equal(Object.hasOwn(game, 'sharedWorldEffects'), true, 'the installed policy is observable only on a committed Survive world');
});

test('ordinary, cancelled, and stopped sessions leave no shared effect state or market authority behind', () => {
  const solo = new Game(0x3505, 'pond', 'arcade');
  assert.equal(Object.hasOwn(solo, 'sharedWorldEffects'), false);
  const cancelled = LocalSession.stage(solo, { roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'pip' }], mode: createSurviveTogetherDefinition(solo.definition) });
  cancelled.cancel();
  assert.equal(Object.hasOwn(solo, 'sharedWorldEffects'), false);
  assert.equal(cancelled.session.openCoOpMarket({ seat: 'p1', device: 'keyboard-a' }), undefined);
  const { game, session, p1 } = surviveSession();
  assert.ok(session.openCoOpMarket({ seat: p1.seat, device: p1.device, participantId: p1.participantId }));
  session.stop();
  assert.equal(Object.hasOwn(game, 'sharedWorldEffects'), false);
  assert.equal(session.coOpMarketSnapshot(), undefined);
});
