import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'session', 'survive-together', 'market/catalog']);
after(source.dispose);
const { Game } = await source.import('game');
const { LocalSession } = await source.import('session');
const { createSurviveTogetherDefinition } = await source.import('survive-together');
const { ITEM_CATALOG } = await source.import('market/catalog');

test('a Revival target intent cannot follow a seat to a different participant with the same death count', () => {
  const game = new Game(361, 'pond', 'stroll', false, ITEM_CATALOG, 'butter');
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], actors: undefined, coin: null });
  const session = LocalSession.stage(game, {
    roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'sunny' }],
    mode: createSurviveTogetherDefinition(game.definition),
  }).commit();
  const [owner, former] = session.players;
  owner.run.advanceScore(100); owner.run.creditCoins(24); assert.equal(owner.run.open(), true);
  const market = session.openCoOpMarket({ seat: owner.seat, device: owner.device, participantId: owner.participantId });
  assert.equal(session.actCoOpMarket({ actionId: 'target-proof-purchase', seat: owner.seat, device: owner.device, participantId: owner.participantId,
    expectedOwnerGeneration: market.ownerGeneration, expectedInventoryGeneration: market.inventoryGeneration,
    expectedRunRevision: market.runRevision, expectedContextGeneration: market.contextGeneration, kind: 'buy-consumable', itemId: 'revival' }).ok, true);
  owner.run.close();
  const die = player => {
    player.powerReadyAt = 10000;
    game.inPlayerOperation(player, context => context.end('Identity proof train', 'train')); session.update(1 / 120);
    assert.equal(player.participation, 'dead');
  };
  die(former);
  const charge = session.consumableSnapshot().charges.find(value => value.seat === owner.seat);
  const intent = { actionId: 'former-target-intent', ownerSeat: owner.seat, itemId: 'revival', targetSeat: former.seat,
    expectedOwnerGeneration: charge.ownerGeneration, expectedInventoryGeneration: charge.inventoryGeneration,
    expectedTargetDeathGeneration: former.recovery.deathGeneration, expectedTargetParticipantId: former.participantId };
  assert.equal(session.depart(former.seat), true);
  assert.equal(session.admit({ seat: 'p2', device: 'gamepad-8', characterId: 'pip', participantId: 'distinct-newcomer' }), true);
  const newcomer = session.players.find(player => player.seat === 'p2'); die(newcomer);
  assert.notEqual(newcomer.participantId, former.participantId);
  assert.equal(newcomer.recovery.deathGeneration, intent.expectedTargetDeathGeneration, 'different participants can legitimately have the same first-death number');
  const before = session.consumableSnapshot(), positions = session.players.map(player => [player.participation, player.x, player.y]);
  const { expectedTargetParticipantId: _identity, ...missingIdentity } = intent;
  assert.equal(session.useConsumable(missingIdentity), false, 'a seat and death count alone are insufficient target identity');
  assert.equal(session.useConsumable(intent), false, 'old target identity must not silently become the newcomer');
  assert.deepEqual(session.consumableSnapshot(), before, 'reject without consuming the owner charge');
  assert.deepEqual(session.players.map(player => [player.participation, player.x, player.y]), positions);
  assert.equal(session.useConsumable({ ...intent, actionId: 'new-target-intent', expectedTargetParticipantId: newcomer.participantId }), true, 'a newly selected current participant can be revived');
  assert.equal(newcomer.participation, 'active');
});
