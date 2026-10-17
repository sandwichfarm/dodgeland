import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session', 'survive-together', 'market/catalog']);
after(() => sources.dispose());
const { Game, actorPositions } = await sources.import('game');
const { LocalSession } = await sources.import('session');
const { createSurviveTogetherDefinition } = await sources.import('survive-together');
const { ITEM_CATALOG } = await sources.import('market/catalog');

function setup() {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  const session = LocalSession.stage(game, {
    primaryDevice: 'gamepad-0',
    roster: [{ seat: 'p2', device: 'gamepad-1', characterId: 'pip' }],
  }).commit();
  return { game, session };
}

function state(session) {
  return JSON.stringify({
    time: session.world.time, lifecycle: session.lifecycle,
    players: session.players.map(p => ({
      seat: p.seat, participantId: p.participantId, device: p.device,
      participation: p.participation, state: p.state, deviceLostAt: p.deviceLostAt,
      x: p.x, y: p.y, health: p.health, score: p.personalScore,
      wallet: p.run.wallet, cards: p.run.cards, recovery: p.recovery,
      statistics: p.statistics,
    })),
  });
}

test('reclaim rejects cross-session and forged original-device tickets without mutating either traveler', () => {
  const { session } = setup(), other = setup().session;
  assert.notEqual(session.id, other.id, 'same-seed sessions have distinct lifecycle identities');
  assert.notEqual(session.players[1].participantId, other.players[1].participantId);
  assert.deepEqual([...session.world.rows], [...other.world.rows], 'lifetime allocation preserves seeded terrain and actors');
  assert.equal(session.world.time, other.world.time);
  assert.equal(session.deviceLost('p2'), true);
  assert.equal(other.deviceLost('p2'), true);
  const ticket = session.deviceReclaimToken('p2');
  assert.ok(ticket); assert.ok(Object.isFrozen(ticket));
  for (const invalid of [other.deviceReclaimToken('p2'), { ...ticket, device: 'gamepad-9' }, { ...ticket, seat: 'p1' }]) {
    const before = state(session), otherBefore = state(other);
    assert.equal(session.reclaim('p2', 'gamepad-9', invalid), false);
    assert.equal(state(session), before);
    assert.equal(state(other), otherBefore);
  }
  assert.equal(session.reclaim('p2', 'gamepad-9', ticket), true);
  assert.equal(session.players[1].device, 'gamepad-9');
  assert.equal(session.players[1].participation, 'active');
  assert.equal(session.players[0].device, 'gamepad-0');
  const settled = state(session);
  assert.equal(session.reclaim('p2', 'gamepad-8', ticket), false);
  assert.equal(state(session), settled, 'consumed ticket cannot rebind a second time');
});

test('lifetime allocation does not consume course generation or inventory randomness', () => {
  const first = setup(), second = setup();
  for (const { game, session } of [first, second]) {
    session.world.noteProgress(120);
    game.ensureRows();
    for (const player of session.players) player.run.advanceScore(100);
  }
  assert.deepEqual([...first.session.world.rows], [...second.session.world.rows]);
  const firstActors = [...first.session.world.rows.values()].map(lane => actorPositions(lane, 20));
  const secondActors = [...second.session.world.rows.values()].map(lane => actorPositions(lane, 20));
  assert.ok(firstActors.some(actors => actors.length > 0));
  assert.deepEqual(firstActors, secondActors, 'future actors retain exact seeded positions');
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(first.session.players[i].run.market, second.session.players[i].run.market);
    assert.deepEqual(first.session.players[i].run.cards, second.session.players[i].run.cards);
  }
});

function survive(three = false) {
  const game = new Game(119, 'pond', 'stroll', false, ITEM_CATALOG, 'butter');
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], actors: undefined, coin: null });
  const session = LocalSession.stage(game, {
    roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'pip' }, ...(three ? [{ seat: 'p3', device: 'keyboard-c', characterId: 'sunny' }] : [])],
    mode: createSurviveTogetherDefinition(game.definition),
  }).commit();
  return { game, session };
}

test('fresh owner context cannot spend or append contribution while its market is closed', () => {
  const { session } = survive(), owner = session.players[1];
  owner.run.advanceScore(100); owner.run.creditCoins(100);
  const context = session.openCoOpMarket(owner);
  assert.ok(context);
  const before = state(session), charges = JSON.stringify(session.consumableSnapshot());
  const interactions = JSON.stringify(owner.interactions);
  const request = {
    actionId: 'closed-window-purchase', kind: 'buy-consumable', itemId: 'revival',
    seat: owner.seat, device: owner.device, participantId: owner.participantId,
    expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration,
    expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration,
  };
  assert.equal(session.actCoOpMarket(request).ok, false);
  assert.equal(state(session), before);
  assert.equal(JSON.stringify(session.consumableSnapshot()), charges);
  assert.equal(JSON.stringify(owner.interactions), interactions);
  assert.equal(owner.run.open(), true);
  const fresh = session.openCoOpMarket(owner);
  assert.equal(session.actCoOpMarket({ ...request, expectedRunRevision: fresh.runRevision }).ok, true,
    'failed action did not consume its identity; a current open-market purchase succeeds');
  assert.equal(owner.run.wallet, 76);
});

test('Survive terminal result orders multiple released participants and retains their frozen contributions', () => {
  const { game, session } = survive(true), [last, departed, firstDeparture] = session.players;
  assert.equal(session.depart(firstDeparture.seat), true);
  assert.equal(session.dispatch({ seat: departed.seat, direction: 'forward' }), true);
  session.update(.3);
  game.awardSessionPickup(departed, 5);
  session.update(0);
  assert.equal(session.deviceLost(departed.seat), true);
  session.update(.25);
  assert.equal(session.depart(departed.seat), true);
  assert.equal(session.players.length, 1);
  assert.deepEqual(session.contributions.map(c => c.seat), ['p3', 'p2'], 'actual departure order differs from stable display order');
  const archived = session.contributions.find(c => c.participantId === departed.participantId);
  assert.ok(archived); assert.equal(archived.statistics.coins, 5);
  assert.equal(archived.statistics.distance, 1);
  assert.ok(archived.statistics.deviceLostDuration > 0);
  last.powerReadyAt = 10000;
  game.end('Actual last participant death', 'water');
  session.update(1 / 120);
  assert.equal(session.result, undefined, 'real personal offer delays settlement');
  session.update(9);
  const result = session.result;
  assert.equal(result.mode, 'survive-together'); assert.equal(result.podium, 'team');
  assert.equal(result.contributions.length, 3);
  assert.deepEqual(result.contributions.map(c => [c.seat, c.lifecycle]), [['p1', 'dead'], ['p2', 'departed'], ['p3', 'departed']]);
  const record = result.contributions.find(c => c.participantId === departed.participantId);
  assert.deepEqual(record, {
    seat: departed.seat, characterId: departed.characterId, participantId: departed.participantId,
    lifecycle: 'departed', furthestDistance: 1, coins: 5, deaths: 0, selfRevives: 0,
    teammateRevives: 0, itemsFound: 0, itemsUsed: 0, ghostSeconds: archived.statistics.deviceLostDuration,
  });
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.contributions)); assert.ok(Object.isFrozen(record));
  const frozen = JSON.stringify(result);
  departed.statistics.coins = 999;
  assert.equal(session.recover({ kind: 'personal', ownerSeat: last.seat }), false);
  session.update(1);
  assert.equal(JSON.stringify(result), frozen);
  assert.equal(session.result, result);
});
