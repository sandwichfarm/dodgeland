import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'session', 'survive-together', 'market/catalog']);
after(source.dispose);
const { Game, laneActors } = await source.import('game');
const { LocalSession } = await source.import('session');
const { createSurviveTogetherDefinition } = await source.import('survive-together');
const { ITEM_CATALOG } = await source.import('market/catalog');
const STEP = 1 / 120;
let actionId = 0;

function setup() {
  const game = new Game(361, 'pond', 'stroll', false, ITEM_CATALOG, 'butter');
  const road = [...game.rows.values()].find(lane => lane.kind === 'road' && lane.index > 5);
  for (const lane of game.rows.values()) if (lane !== road) Object.assign(lane, {
    kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, speed: 0, phase: 0, spacing: 20, length: 1,
  });
  const session = LocalSession.stage(game, {
    roster: [
      { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
      { seat: 'p3', device: 'gamepad-3', characterId: 'pip' },
      { seat: 'p4', device: 'gamepad-4', characterId: 'petal' },
    ],
    mode: createSurviveTogetherDefinition(game.definition),
  }).commit();
  const positions = [[2, 2], [-2, 1], [0, 4], [4, -1]];
  session.players.forEach((player, index) => {
    [player.x, player.y] = positions[index];
    player.fromX = player.x; player.fromY = player.y; player.maxY = player.y;
  });
  session.update(STEP);
  return { game, session, road, p1: session.players[0], p2: session.players[1], p3: session.players[2], p4: session.players[3] };
}
function purchase(session, owner, itemId) {
  const consumable = itemId === 'revival' || itemId === 'flare';
  const price = consumable ? itemId === 'revival' ? 24 : 36 : owner.run.catalog.get(itemId).price;
  owner.run.advanceScore(100); owner.run.creditCoins(price); assert.equal(owner.run.open(), true);
  const offer = { id: `board-offer-${++actionId}`, itemId, price, sold: false };
  if (!consumable) owner.run.market.offers.push(offer);
  const context = session.openCoOpMarket({ seat: owner.seat, device: owner.device, participantId: owner.participantId });
  assert.ok(context);
  const result = session.actCoOpMarket({
    actionId: `board-buy-${++actionId}`, seat: owner.seat, device: owner.device, participantId: owner.participantId,
    expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration,
    expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration,
    kind: consumable ? 'buy-consumable' : 'buy', itemId, offerId: offer.id,
  });
  assert.equal(result.ok, true, result.message); owner.run.close(); session.update(0);
}
function kill(game, session, player) {
  const lane = game.rows.get(player.y);
  player.powerReadyAt = 10000;
  Object.assign(lane, { kind: 'river', phase: 10, length: 1, spacing: 20 });
  session.update(STEP);
  assert.equal(player.state, 'dead', 'unsupported river contact must execute the production death');
  Object.assign(lane, { kind: 'meadow', phase: 0 });
}
function use(session, owner, itemId, target) {
  const held = session.consumableSnapshot().charges.find(value => value.seat === owner.seat);
  return session.useConsumable({
    actionId: `board-use-${++actionId}`, ownerSeat: owner.seat, itemId,
    expectedOwnerGeneration: held.ownerGeneration, expectedInventoryGeneration: held.inventoryGeneration,
    ...(target ? { targetSeat: target.seat, expectedTargetDeathGeneration: target.recovery.deathGeneration, expectedTargetParticipantId: target.participantId } : {}),
  });
}

for (const ownerSeat of ['p1', 'p2']) test(`${ownerSeat}: four-player Flare includes paused P1 and cannot resume the board`, () => {
  const { game, session, p1, p3 } = setup();
  const owner = session.players.find(player => player.seat === ownerSeat);
  purchase(session, owner, 'flare');
  kill(game, session, p3);
  game.pause();
  const time = game.time, anchor = { x: owner.groundX, y: owner.groundY };
  assert.equal(p1.state, 'paused');
  assert.equal(use(session, owner, 'flare'), true, 'a living owner may use a held item from an intentionally paused board');
  assert.equal(game.state, 'paused', 'Flare must not resume the aliased host while a board is open');
  assert.equal(p1.state, 'paused');
  assert.equal(p3.participation, 'active');
  assert.equal(p3.run.wallet, 0);
  assert.equal(session.consumableSnapshot().charges.find(value => value.seat === ownerSeat).flare, 0);
  assert.deepEqual({ x: owner.groundX, y: owner.groundY }, anchor, 'the owner remains at the original safe anchor');
  const occupied = session.players.map(player => `${player.groundX}:${player.groundY}`);
  assert.equal(new Set(occupied).size, 4, 'all four returned/regrouped players get distinct cells');
  for (const player of session.players) {
    assert.ok(Math.abs(player.groundY - anchor.y) <= 2, 'every living participant, including paused P1, is regrouped');
    assert.ok(player.recovery.protectionUntil > time, 'every regrouped participant receives authoritative protection');
  }
  const protectedUntil = session.players.map(player => player.recovery.protectionUntil);
  session.update(5);
  assert.equal(game.time, time, 'the still-open board freezes world and protection time');
  assert.deepEqual(session.players.map(player => player.recovery.protectionUntil), protectedUntil);
  game.resume(); session.update(STEP);
  assert.ok(game.time > time, 'only explicit resume advances the returned team');
});

test('Revival excludes a paused living teammate cell when choosing a return location', () => {
  const { game, session, p1, p2, p3 } = setup();
  purchase(session, p2, 'revival'); kill(game, session, p3);
  p1.x = p1.fromX = 0; p1.y = p1.fromY = 2;
  p2.x = p2.fromX = 1; p2.y = p2.fromY = 2;
  for (const row of [0, 1, 2]) game.rows.get(row).blocked = Array.from({ length: 11 }, (_, i) => i - 5).filter(x => row !== 2 || ![0, 1, 2].includes(x));
  game.pause();
  assert.equal(use(session, p2, 'revival', p3), true);
  assert.deepEqual({ x: p3.groundX, y: p3.groundY }, { x: 2, y: 2 }, 'P1 at0 and the owner at1 reserve both occupied cells');
  assert.equal(game.state, 'paused');
});

test('a controller lifecycle event during a board keeps paused P1 shared cards and actor positions', () => {
  const { game, session, road, p1, p4 } = setup();
  assert.ok(road, 'fixture retains a generated road away from players');
  purchase(session, p1, 'traffic-speed');
  const resolved = session.sharedWorldEffectsSnapshot();
  assert.equal(resolved.effects.trafficSpeed, .88);
  assert.equal(resolved.contributors.trafficSpeed, 'p1');
  const speed = road.speed, before = laneActors(road, game.time).map(actor => ({ id: actor.id, x: actor.x }));
  assert.ok(before.length);
  game.pause();
  assert.equal(session.deviceLost(p4.seat), true);
  assert.equal(session.sharedWorldEffectsSnapshot().effects.trafficSpeed, .88, 'paused is living, so P1 remains an effect contributor');
  assert.equal(road.speed, speed);
  assert.deepEqual(laneActors(road, game.time).map(actor => ({ id: actor.id, x: actor.x })), before);
  game.resume(); session.update(0);
  assert.equal(road.speed, speed);
  assert.deepEqual(laneActors(road, game.time).map(actor => ({ id: actor.id, x: actor.x })), before);
});
