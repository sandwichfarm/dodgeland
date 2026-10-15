import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'session', 'survive-together', 'consumables', 'shared-world-effects', 'market/run', 'market/catalog']);
const { Game, laneActors, coinPosition } = await source.import('game');
const { LocalSession } = await source.import('session');
const { createSurviveTogetherDefinition } = await source.import('survive-together');
const { defaultModifiers } = await source.import('market/run');
const { SHARED_WORLD_EFFECTS, resolveSharedWorldEffects } = await source.import('shared-world-effects');
const { ITEM_CATALOG } = await source.import('market/catalog');
after(() => source.dispose());

function surviveSession() {
  const game = new Game(0x03505, 'pond', 'arcade', false, ITEM_CATALOG);
  const session = LocalSession.stage(game, {
    roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'pip' }],
    mode: createSurviveTogetherDefinition(game.definition),
  }).commit();
  return { game, session, p1: session.players.find(player => player.seat === 'p1'), p2: session.players.find(player => player.seat === 'p2') };
}

let actionNumber = 0;
function marketRequest(player, context, kind, payload = {}) {
  return { actionId: `owned-economy-${++actionNumber}`, seat: player.seat, device: player.device, participantId: player.participantId,
    expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration,
    expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration, kind, ...payload };
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

test('every shared descriptor direction selects one contributor while local fields remain the owner values', () => {
  const base = defaultModifiers();
  for (const [key, descriptor] of Object.entries(SHARED_WORLD_EFFECTS)) {
    const p1 = { ...base }, p2 = { ...base };
    p1[key] = descriptor.direction === 'higher' ? base[key] + .1 : Math.max(0, base[key] - .1);
    p2[key] = descriptor.direction === 'higher' ? base[key] + .2 : Math.max(0, base[key] - .2);
    const resolved = resolveSharedWorldEffects([{ seat: 'p2', effects: p2 }, { seat: 'p1', effects: p1 }]);
    if (descriptor.scope === 'world-shared') {
      assert.equal(resolved.effects[key], p2[key], key);
      assert.equal(resolved.contributors[key], 'p2', key);
    } else {
      assert.equal(resolved.contributors[key], undefined, key);
      assert.equal(resolved.effects[key], p1[key], `${key} keeps the stable first owner's private value out of shared selection`);
    }
  }
});

test('actual future rows receive only the resolved shared generation policy', () => {
  const { game, session, p1, p2 } = surviveSession();
  const baseline = new Game(game.seed, 'pond', 'arcade', false, ITEM_CATALOG);
  p1.run.effects = { ...defaultModifiers(), trafficSpacing: 1.6, platformLength: 1.5, trainPeriod: 1.15, trainWarning: .4, coinChance: .6, sceneryClear: .85, riverCoinBonus: 1 };
  p2.run.effects = { ...defaultModifiers(), trafficSpacing: 1.12, platformLength: 1.2, trainPeriod: 1.05, trainWarning: .2, coinChance: .08, sceneryClear: .15, riverCoinBonus: .2 };
  session.update(0);
  const resolved = session.sharedWorldEffectsSnapshot();
  assert.equal(resolved.contributors.trafficSpacing, 'p1');
  assert.equal(resolved.contributors.riverCoinBonus, 'p1');
  game.world.frontier = baseline.maxY = 600; game.world.activeFloor = 0;
  game.ensureRows(); baseline.ensureRows();
  const road = [...game.rows.values()].find(lane => lane.index > 590 && lane.kind === 'road');
  const river = [...game.rows.values()].find(lane => lane.index > 590 && lane.kind === 'river');
  const rail = [...game.rows.values()].find(lane => lane.index > 590 && lane.kind === 'rail');
  assert.ok(road && river && rail, 'future shared generation includes road, river, and rail lanes');
  const baseRoad = baseline.rows.get(road.index), baseRiver = baseline.rows.get(river.index), baseRail = baseline.rows.get(rail.index);
  assert.equal(road.spacing, baseRoad.length + (baseRoad.spacing - baseRoad.length) * 1.6);
  assert.equal(river.length, baseRiver.length * 1.5);
  assert.equal(rail.period, baseRail.period * 1.15);
  assert.equal(rail.warning, baseRail.warning + .4);
  assert.equal(p2.run.effects.riverCoinBonus, .2, 'generation selection never overwrites a teammate payout modifier');
});

test('a generated river coin uses the shared course but awards the collecting owner private river bonus', () => {
  const { game, session, p1, p2 } = surviveSession();
  p1.run.effects = { ...defaultModifiers(), riverCoinBonus: 1 };
  p2.run.effects = { ...defaultModifiers(), riverCoinBonus: .2 };
  session.update(0);
  assert.equal(session.sharedWorldEffectsSnapshot().contributors.riverCoinBonus, 'p1', 'P1 supplies the shared river-generation value');

  game.world.frontier = 600; game.world.activeFloor = 0;
  game.ensureRows();
  const river = [...game.rows.values()].find(lane => lane.index > 590 && lane.kind === 'river' && lane.actors);
  assert.ok(river, 'the live shared course contains a generated platform river');
  const platform = laneActors(river, game.time).find(actor => Math.abs(actor.x) < 5);
  assert.ok(platform, 'a generated platform is available inside the play field');
  river.coin = 0;
  river.coinActor = platform.id;
  const coin = coinPosition(river, game.time);
  assert.ok(coin, 'the injected reward remains bound to the generated platform');
  p2.x = coin.x; p2.y = river.index; p2.fromX = coin.x; p2.fromY = river.index; p2.hop = 0;
  game.inPlayerOperation(p2, context => session.world.resolvePlayer(p2, () => context.collectCoins(0, true)));
  session.world.resolvePickups();

  assert.equal(river.coin, null, 'the production session pickup election consumed the river coin');
  assert.equal(p1.run.wallet, 0, 'the non-collecting generator owner receives no private payout');
  assert.equal(p2.run.wallet, 1);
  assert.equal(p2.run.creditCoins(.8), 1, 'P2 retained its .2 river bonus fraction instead of receiving P1’s shared generation bonus');
});

test('resolved wave and mob values drive the shared course once while production damage stays private', () => {
  const { game, session, p1, p2 } = surviveSession();
  p1.run.effects = { ...defaultModifiers(), waveSpeed: .8, waveTrail: 1, mobSpeed: .8, rearDamage: .5 };
  p2.run.effects = { ...defaultModifiers(), waveSpeed: .9, waveTrail: 2, mobSpeed: .9, rearDamage: 1 };
  session.update(0);
  game.world.frontier = -100; game.world.waveRow = -50; game.time = 4;
  const beforeWave = game.world.waveRow;
  const previous = game.advanceSharedWorld(1);
  game.advanceSharedPursuit(previous);
  assert.equal(game.world.waveRow, beforeWave + game.rules.pursuit.speed * .8, 'lower wave-speed contribution moves the one shared front');
  const mob = { id: 900, kind: 'slime', x: 4, y: 0, fromX: 4, fromY: 0, targetX: 3.5, targetY: 0, phase: 'walking', phaseLeft: 1, phaseDuration: 1, motionSpeed: .65 };
  game.mobs.push(mob);
  game.updateSessionMobs([p1, p2], .1, new Map([[p1, { x: p1.groundX, y: p1.groundY }], [p2, { x: p2.groundX, y: p2.groundY }]]));
  assert.equal(mob.x, 3.96, 'the selected .8 speed rebases the live walking duration exactly once (default speed would end at 3.95)');

  const sourceRoad = [...game.rows.values()].find(lane => lane.kind === 'road');
  assert.ok(sourceRoad, 'a generated road supplies the production collision world data');
  const impactRoad = { ...sourceRoad, index: 97, speed: 0, spacing: 20, length: 2, phase: 0, direction: 1, actors: undefined, coin: null };
  game.rows.set(impactRoad.index, impactRoad);
  for (const player of [p1, p2]) {
    player.x = 0; player.y = impactRoad.index; player.fromX = 0; player.fromY = impactRoad.index; player.hop = 0;
    game.inPlayerOperation(player, context => context.collideVehicles(-3, impactRoad.index, game.time));
  }
  assert.equal(p1.health, p1.maxHealth - .5, 'P1’s rear collision follows P1’s private rear-damage modifier');
  assert.equal(p2.health, p2.maxHealth - 1, 'P2’s identical rear collision follows P2’s private rear-damage modifier');
});

test('wrong device, stale versions, lifecycle changes, and stopped sessions cannot debit an owner', () => {
  const { session, p1, p2 } = surviveSession();
  p1.run.advanceScore(100); p1.run.creditCoins(36);
  let context = session.openCoOpMarket({ seat: p1.seat, device: p1.device, participantId: p1.participantId });
  context = session.actCoOpMarket(marketRequest(p1, context, 'open')).context;
  const stale = marketRequest(p1, context, 'buy-consumable', { itemId: 'flare' });
  const before = p1.run.wallet;
  assert.equal(session.actCoOpMarket({ ...stale, actionId: 'wrong-device', device: p2.device }).ok, false);
  assert.equal(session.actCoOpMarket({ ...stale, actionId: 'wrong-owner-generation', expectedOwnerGeneration: stale.expectedOwnerGeneration + 1 }).ok, false);
  assert.equal(session.actCoOpMarket({ ...stale, actionId: 'wrong-run-revision', expectedRunRevision: stale.expectedRunRevision + 1 }).ok, false);
  assert.equal(p1.run.wallet, before);
  assert.equal(session.deviceLost('p1'), true);
  assert.equal(session.actCoOpMarket(stale).ok, false);
  assert.equal(p1.run.wallet, before);
  session.stop();
  assert.equal(session.actCoOpMarket(stale).ok, false);
  assert.equal(p1.run.wallet, before);
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
