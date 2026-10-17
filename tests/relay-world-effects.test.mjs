import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';
import { turnReuseAttribution } from './turn-reuse-attribution.mjs';

const sources = await loadSources(['game', 'relay', 'market/catalog']);
after(() => sources.dispose());
const { Game, generateLane, laneActors } = await sources.import('game');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const reuse = await turnReuseAttribution({ mode: 'relay', factory: createRelaySession,
  Coordinator: RelayCoordinator, authority, lifetimes: 2 });
after(() => reuse.finish());
const STEP = 1 / 120;
for (const base of ['arcade', 'stroll'])
test(`relay/${base}: only the current runner changes world speeds and baton changes preserve physical continuity`, () => {
  const witness = reuse.lifetime();
  const game = Game.fromSeed(`ph3-00000071-pond-${base === 'arcade' ? 'a' : 's'}-n`, ITEM_CATALOG, 'butter');
  for (let y = -8; y < 30; y++) game.rows.set(y, {
    ...generateLane(game.seed, y, game.home), kind: 'meadow', blocked: [], decorations: [],
    coin: null, coinActor: undefined, actors: undefined,
  });
  const road = game.rows.get(3), river = game.rows.get(4);
  Object.assign(road, { kind: 'road', speed: -2, spacing: 6, length: 2, phase: .25 });
  Object.assign(river, { kind: 'river', speed: 1.5, spacing: 6, length: 3, phase: .4 });
  const owner = witness.acquire(game, { tilesPerLeg: 1, seats: [
    { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
    { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
  ] });
  witness.interval('paid-owner-effects-and-continuous-baton', () => {
  const session = owner.session, [p, other] = session.players;
  // Explicit component market eligibility/funds/stock. Transactions,input,
  // effects,clocks,positions,personal progress and handoffs remain production-owned.
  for (const player of session.players) { player.run.advanceScore(100); player.run.creditCoins(1000); }
  let sequence = 0;
  function transact(player, kind, fields = {}) {
    const context = session.openCoOpMarket(player); assert.ok(context);
    return session.actCoOpMarket({ actionId: `relay-effects-${++sequence}`, kind,
      seat: player.seat, device: player.device, participantId: player.participantId,
      expectedOwnerGeneration: context.ownerGeneration,
      expectedInventoryGeneration: context.inventoryGeneration,
      expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration, ...fields });
  }
  function buy(player, itemId) {
    assert.equal(transact(player, 'open').ok, true);
    const item = player.run.catalog.get(itemId); assert.ok(item);
    const offer = { id: `stock-${++sequence}`, itemId, price: item.price, sold: false };
    player.run.market.offers.push(offer);
    const wallet = player.run.wallet;
    assert.equal(transact(player, 'buy', { offerId: offer.id }).ok, true);
    assert.equal(player.run.wallet, wallet - item.price);
    assert.equal(transact(player, 'close').ok, true);
    return player.run.cards.at(-1);
  }
  function motion() {
    return [road, river].map(lane => ({ phase: lane.phase, speed: lane.speed,
      actors: laneActors(lane, game.time).map(a => ({ id: a.id, x: a.x })) }));
  }
  function tickWithSpeeds(roadSpeed, riverSpeed) {
    const before = motion(), time = game.time;
    session.update(STEP);
    assert.ok(Math.abs(road.speed - roadSpeed) < 1e-12,
      'a purchased School Zone must change actual Relay traffic speed');
    assert.ok(Math.abs(river.speed - riverSpeed) < 1e-12);
    for (const [i, lane] of [road, river].entries()) {
      const after = laneActors(lane, game.time), delta = lane.speed * (game.time - time);
      for (const actor of before[i].actors) {
        const same = after.find(a => a.id === actor.id);
        if (same) assert.ok(Math.abs(same.x - actor.x - delta) < 1e-8,
          'effect changes rebase phase without teleporting physical actors');
      }
    }
  }
  function hop(seat) {
    const player = session.players.find(p => p.seat === seat);
    assert.equal(session.dispatch({ seat, direction: 'forward' }), true);
    for (let n = 0; n < 120 && player.hop > 0; n++) session.update(STEP);
    assert.equal(player.hop, 0); assert.equal(player.state, 'playing');
    assert.equal(owner.snapshot().phase, 'handoff');
  }
  function transfer() {
    const before = [game.time, game.world.simulationTick, motion(), game.seedCode];
    assert.equal(owner.confirm(owner.confirmation()), true);
    assert.deepEqual([game.time, game.world.simulationTick, motion(), game.seedCode], before,
      'the baton itself cannot mutate the continuous world');
  }
  const school = buy(p, 'traffic-speed');
  assert.equal(p.run.effects.trafficSpeed, .88); assert.equal(other.run.cards.length, 0);
  tickWithSpeeds(-2 * .88, 1.5);
  hop('p1'); transfer(); assert.equal(owner.activeSeat, 'p2');
  tickWithSpeeds(-2, 1.5);
  const current = buy(other, 'river-speed');
  assert.equal(other.run.effects.riverSpeed, .85);
  tickWithSpeeds(-2, 1.5 * .85);
  assert.equal(transact(other, 'sell', { cardId: current.id }).ok, true);
  tickWithSpeeds(-2, 1.5);
  const wallet = p.run.wallet, health = p.health;
  hop('p2'); transfer(); assert.equal(owner.activeSeat, 'p1');
  assert.deepEqual(p.run.cards.map(c => c.id), [school.id]);
  assert.equal(p.run.wallet, wallet); assert.equal(p.health, health);
  assert.equal(p.completedForwardTiles, 1); assert.equal(other.completedForwardTiles, 1);
  tickWithSpeeds(-2 * .88, 1.5);
  const result = owner.finish(), frozen = JSON.stringify(result);
  assert.ok(Object.isFrozen(result)); session.update(STEP);
  assert.strictEqual(owner.result, result); assert.equal(JSON.stringify(result), frozen);
  });
  witness.finish();
});
