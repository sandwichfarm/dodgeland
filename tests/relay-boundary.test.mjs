import assert from 'node:assert/strict';
import {turnReuseAttribution} from './turn-reuse-attribution.mjs';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
import { semanticValue, snapshotGame } from './solo-parity-snapshot.mjs';

const sources = await loadSources(['game', 'relay', 'market/catalog']);
after(() => sources.dispose());
const gameModule = await sources.import('game');
const { Game, generateLane, laneActors, coinPosition } = gameModule;
const { ITEM_CATALOG } = await sources.import('market/catalog');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const authority={Game,...await sources.import('session'),...await sources.import('mode-rules')};
const reuse=await turnReuseAttribution({authority,mode:'relay',factory:createRelaySession,Coordinator:RelayCoordinator,lifetimes:3});
after(()=>reuse.finish());
const STEP = 1 / 120;

function setup(length = 50, mode = 'stroll', catalog = [], witness) {
  const game = new Game(121, 'pond', mode, false, catalog, 'butter');
  for (const row of game.rows.keys()) courseLane(game, row);
  const relay = (witness? witness.acquire : createRelaySession)(game, { seats: [
    { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
    { seat: 'p2', characterId: 'pip', device: 'keyboard-b' },
  ], tilesPerLeg: length });
  return { game, relay, session: relay.session };
}
function ticks(session, count) { for (let tick = 0; tick < count; tick++) session.update(STEP); }
function step(run, direction = 'forward') {
  const player = run.session.players.find(player => player.seat === run.relay.activeSeat);
  courseLane(run.game, player.y); courseLane(run.game, player.y + (direction === 'back' ? -1 : 1));
  assert.equal(run.session.dispatch({ seat: player.seat, direction }), true);
  for (let tick = 0; tick < 120 && player.hop > 0; tick++) run.session.update(STEP);
  assert.equal(player.hop, 0); assert.equal(player.state, 'playing');
}

function courseLane(game, row, extra = {}) {
  const lane = { ...generateLane(game.seed, row, game.home), kind: 'meadow',
    blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined,
    phase: 0, speed: 0, spacing: 20, length: 1.15, variant: 0, ...extra };
  game.rows.set(row, lane);
  return lane;
}

test('a fatal boundary landing resolves the existing personal recovery before any transfer', () => {
  const game = new Game(121, 'pond', 'stroll', false, [], 'butter');
  for (const row of game.rows.keys()) courseLane(game, row);
  const relay = createRelaySession(game, { seats: [
    { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
    { seat: 'p2', characterId: 'pip', device: 'keyboard-b' },
  ], tilesPerLeg: 1 });
  const session = relay.session, player = session.players[0], world = session.world;
  player.powerReadyAt = 10000; // Fixture: innate water rescue is already on cooldown.
  session.update(STEP);
  const safe = { x: player.groundX, y: player.groundY };
  assert.equal(player.recovery.charge, 'available');
  courseLane(game, 1, { kind: 'river', phase: 10, length: 1 });
  assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  for (let tick = 0; tick < 120 && player.state !== 'dead'; tick++) session.update(STEP);
  assert.equal(player.state, 'dead', 'the real unsupported river landing must kill');
  assert.equal(player.participation, 'dead');
  assert.equal(player.statistics.deaths, 1);
  assert.equal(player.run.alive, false, 'production death clears only the dead run');
  assert.equal(relay.snapshot().phase, 'recovery', 'fatal hazard wins over handoff');
  assert.equal(player.completedForwardTiles, 0, 'fatal unfinished movement cannot earn revival tiles');
  assert.equal(session.players[1].run.alive, true);
  assert.strictEqual(session.world, world);
  assert.ok(player.recovery.offer, 'a charged dead active runner needs the delivered personal-recovery offer');
  assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
  assert.equal(player.state, 'playing');
  assert.deepEqual({ x: player.groundX, y: player.groundY }, safe);
  assert.equal(player.recovery.charge, 'spent');
  assert.equal(relay.snapshot().phase, 'running');
});

for (const length of [1, 7, 50, 999]) test(`length ${length}: authored frontier opens exactly one settled boundary`, () => {
  const run = setup(length);
  for (let hop = 1; hop < length; hop++) { step(run); assert.equal(run.relay.snapshot().phase, 'running'); }
  const player = run.session.players[0];
  courseLane(run.game, length);
  assert.equal(run.session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  assert.equal(run.relay.snapshot().phase, 'running');
  run.session.update(STEP);
  assert.ok(player.hop > 0); assert.equal(run.relay.snapshot().phase, 'running');
  assert.equal(run.relay.snapshot().pendingBoundary?.target, length, 'post-tick pending record retains exact target');
  const pending = run.relay.snapshot().pendingBoundary;
  ticks(run.session, 120);
  assert.equal(run.relay.snapshot().phase, 'handoff');
  const before = run.session.world.time; ticks(run.session, 120);
  assert.equal(run.session.world.time, before);
  assert.equal(run.relay.snapshot().transferGeneration, 1);
  assert.equal(run.relay.snapshot().pendingBoundary, pending, 'one immutable latch survives settlement');
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  assert.equal(run.relay.snapshot().nextBoundary, length * 2);
  assert.equal(run.relay.snapshot().leg, 2);
  step(run);
  assert.equal(run.session.world.frontier, length + 1);
  assert.equal(run.relay.snapshot().phase, length === 1 ? 'handoff' : 'running');
});

test('49/50/49/50 crossings cannot duplicate credit or reopen boundary 50', () => {
  const run = setup(50);
  for (let hop = 0; hop < 49; hop++) step(run);
  step(run, 'back'); step(run);
  assert.equal(run.session.players[0].completedForwardTiles, 49);
  step(run); assert.equal(run.relay.snapshot().phase, 'handoff');
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  const incoming = run.session.players[1];
  step(run, 'back'); step(run);
  assert.equal(incoming.completedForwardTiles, 0); assert.equal(incoming.personalScore, 0);
  assert.equal(run.relay.snapshot().phase, 'running'); assert.equal(run.relay.snapshot().transferGeneration, 1);
  step(run); assert.equal(incoming.completedForwardTiles, 1); assert.equal(run.session.world.frontier, 51);
  assert.equal(run.relay.snapshot().nextBoundary, 100);
});

test('an exceptional frontier jump produces one opportunity then chooses the smallest future boundary', () => {
  const run = setup(7), player = run.session.players[0];
  // Corrupted/external positioning is a fixture, never an authored hop or a callback.
  player.x = player.fromX = 0; player.y = player.fromY = player.maxY = 8;
  run.session.world.frontier = 8; courseLane(run.game, 8); ticks(run.session, 2);
  assert.equal(run.relay.snapshot().phase, 'running', 'position alone cannot emit a leg');
  step(run);
  assert.equal(run.relay.snapshot().phase, 'handoff'); assert.equal(run.relay.snapshot().transferGeneration, 1);
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  assert.equal(run.relay.snapshot().nextBoundary, 14);
  ticks(run.session, 2); assert.equal(run.relay.snapshot().phase, 'running');
  for (let frontier = 10; frontier <= 14; frontier++) { step(run); assert.equal(run.relay.snapshot().phase, frontier === 14 ? 'handoff' : 'running'); }
  assert.equal(run.relay.snapshot().transferGeneration, 2);
});

test('successful innate rescue settles before opening the already latched boundary', () => {
  const run = setup(1), player = run.session.players[0];
  courseLane(run.game, 1, { kind: 'river', phase: 10, length: 1 });
  assert.equal(run.session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  for (let tick = 0; tick < 120 && !player.powerRescue; tick++) run.session.update(STEP);
  assert.ok(player.powerRescue); assert.equal(player.state, 'playing');
  assert.equal(run.relay.snapshot().phase, 'running');
  const time = run.session.world.time;
  for (let tick = 0; tick < 600 && run.relay.snapshot().phase !== 'handoff'; tick++) run.session.update(STEP);
  assert.equal(player.powerRescue, null); assert.equal(player.statistics.deaths, 0);
  assert.ok(run.session.world.time > time, 'rescue needs live simulation');
  assert.equal(run.relay.snapshot().phase, 'handoff');
  assert.equal(run.session.isRecoverySafePosition(player), true);
});

for (const hazard of ['traffic', 'wave', 'mob']) test(`fatal ${hazard} resolves before boundary transfer and retains one personal offer`, () => {
  const witness=reuse.lifetime();
  const run = setup(1, hazard === 'traffic' ? 'stroll' : 'arcade', [], witness), player = run.session.players[0];
  player.powerReadyAt = 10000; player.health = .25;
  courseLane(run.game, 1, hazard === 'traffic' ? { kind: 'road', phase: 0, speed: 0, spacing: 20, length: 2 } : {});
  if (hazard === 'wave') run.session.world.waveRow = .5;
  if (hazard === 'mob') run.game.mobs.push({ id: 1, kind: 'slime', x: 0, y: 1, fromX: 0, fromY: 1, targetX: 0, targetY: 1, phase: 'rest', phaseLeft: 2, phaseDuration: 2 });
  witness.interval('fatal-boundary',()=>{
  assert.equal(run.session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  for (let tick = 0; tick < 120 && player.state !== 'dead'; tick++) run.session.update(STEP);
  assert.equal(player.state, 'dead'); assert.equal(player.deathCause, hazard);
  assert.equal(run.relay.snapshot().phase, 'recovery'); assert.equal(run.relay.snapshot().pendingBoundary, undefined);
  assert.equal(run.relay.snapshot().transferGeneration, 0); assert.equal(run.relay.snapshot().nextBoundary, 2);
  assert.equal(player.statistics.deaths, 1); assert.equal(player.completedForwardTiles, 0); assert.ok(player.recovery.offer);
  const generation = player.recovery.deathGeneration; ticks(run.session, 10);
  assert.equal(player.recovery.deathGeneration, generation); assert.equal(player.statistics.deaths, 1);
  });witness.finish();
});

test('fractional platform carry settles before the board freezes actor motion', () => {
  const run = setup(1), player = run.session.players[0];
  courseLane(run.game, 0, { kind: 'river', phase: 0, speed: .7, spacing: 20, length: 4 });
  ticks(run.session, 12);
  assert.notEqual(player.groundX, 0, 'production platform carry precedes the boundary hop');
  courseLane(run.game, 1, { kind: 'river', phase: 0, speed: .7, spacing: 20, length: 4 });
  assert.equal(run.session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  run.session.update(STEP);
  assert.equal(run.relay.snapshot().pendingBoundary.target, 1); assert.ok(player.hop > 0);
  for (let tick = 0; tick < 120 && run.relay.snapshot().phase !== 'handoff'; tick++) run.session.update(STEP);
  assert.equal(run.relay.snapshot().phase, 'handoff'); assert.equal(player.hop, 0);
  assert.notEqual(player.groundX, Math.round(player.groundX), 'actual moving platform carry produces fractional x');
  const position = { x: player.groundX, y: player.groundY }, time = run.session.world.time;
  ticks(run.session, 120); assert.equal(run.session.world.time, time); assert.equal(player.groundX, position.x);
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  assert.deepEqual({ x: run.session.players[1].groundX, y: run.session.players[1].groundY }, position);
});

function personalState(player) {
  // The only excluded fields are the explicit arrival position/credit floor.
  const { world, session, x, y, fromX, fromY, maxY, personalFrontierY, recovery, ...owned } = player;
  const { spatialFrontierY, lastSafe, ...personalRecovery } = recovery;
  return semanticValue({ ...owned, recovery: personalRecovery, score: player.personalScore,
    powerRemaining: player.powerRemaining, powerReady: player.powerReady,
    // Primary facade aliases need explicit inclusion even if non-enumerable.
    run: player.run, health: player.health, coins: player.coins, powerReadyAt: player.powerReadyAt,
    healedMilestone: player.healedMilestone, touchingCars: player.touchingCars });
}

function worldState(run) {
  const { host, frame, ...owned } = run.session.world;
  const snapshot = snapshotGame(run.game, gameModule);
  return semanticValue({ owned, frame: frame && { previousTime: frame.previousTime,
    playerGround: [...frame.playerGround].map(([player, position]) => [player.seat, position]) },
    rows: snapshot.rows, attractedCoins: snapshot.attractedCoins, mobs: snapshot.mobs,
    laneSpeeds: snapshot.gameFuture.laneSpeeds, extensions: run.game.worldExtensionSnapshot(),
    sharedEffects: run.game.sharedWorldEffects, effectPolicy: run.session.sharedWorldEffectsSnapshot(),
    consumables: run.session.consumableSnapshot(), lifecycle: run.session.lifecycle,
    contributions: run.session.contributions, result: run.session.result });
}

function prepareContinuity(platform) {
  const run = setup(1, 'stroll', ITEM_CATALOG);
  snapshotGame(run.game, gameModule); // Track the production RNG before any draws.
  if (platform) {
    courseLane(run.game, 0, { kind: 'river', speed: .7, length: 4 });
    ticks(run.session, 12);
    courseLane(run.game, 1, { kind: 'river', speed: .7, length: 4 });
  }
  run.session.dispatch({ seat: 'p1', direction: 'forward' });
  ticks(run.session, 120);
  assert.equal(run.relay.snapshot().phase, 'handoff');
  for (const player of run.session.players) {
    const inventory = player.run;
    // Existing market fixture pattern: real purchases populate every asset kind.
    inventory.advanceScore(100); assert.equal(inventory.open(), true); inventory.creditCoins(10000.375);
    for (const kind of ['card', 'power', 'cosmetic']) {
      const item = ITEM_CATALOG.find(item => item.kind === kind);
      const offer = { id: `fixture-${kind}`, itemId: item.id, price: item.price, sold: false };
      inventory.market.offers.push(offer); assert.equal(inventory.buy(offer.id).ok, true);
    }
    inventory.close(); player.health -= .25;
    assert.ok(inventory.cards.length && inventory.powers.length && inventory.equippedCosmetics.length);
    assert.ok(inventory.fraction > 0);
  }
  // A nearby unclaimed coin must not be collected by confirmation itself.
  const lane = run.game.rows.get(1);
  lane.coin = run.session.players[0].groundX; lane.coinDenomination = 5;
  const retained = courseLane(run.game, 3, { coin: 3 });
  run.session.world.claimPickupPull(run.session.players[0], retained, run.game.time, 4,
    { x: 3, y: 3, z: 0, speed: 0 });
  run.session.world.resolvePickups();
  assert.equal(run.session.world.pickupOwners.get(3), 'p1');
  assert.strictEqual(run.session.world.attractedCoins.get(3), retained);
  // Relay has not opted into the later cooperative item/effect policies.
  assert.equal(run.session.consumableSnapshot(), undefined);
  assert.equal(run.session.sharedWorldEffectsSnapshot(), undefined);
  return run;
}

for (const platform of [false, true]) test(`${platform ? 'fractional platform' : 'ground'}: confirmation preserves all shared future owners and personal assets`, () => {
  const run = prepareContinuity(platform), control = prepareContinuity(platform);
  const world = run.session.world, rows = [...world.rows], descriptor = world.runSeed;
  const rng = world.mobDirector.rng, beforeWorld = worldState(run);
  const beforePlayers = run.session.players.map(personalState);
  const target = { x: run.session.players[0].groundX, y: run.session.players[0].groundY };
  if (platform) assert.notEqual(target.x, Math.round(target.x));
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  assert.strictEqual(run.session.world, world); assert.strictEqual(world.runSeed, descriptor);
  assert.strictEqual(world.mobDirector.rng, rng);
  for (const [row, lane] of rows) assert.strictEqual(world.rows.get(row), lane);
  assert.deepEqual(worldState(run), beforeWorld);
  assert.deepEqual(run.session.players.map(personalState), beforePlayers);
  assert.deepEqual({ x: run.session.players[1].groundX, y: run.session.players[1].groundY }, target);
  assert.equal(run.game.rows.get(1).coin, target.x);
  // An unconfirmed twin retains the same next RNG, actor and pickup outputs.
  for (let draw = 0; draw < 8; draw++) assert.equal(world.mobDirector.rng(), control.session.world.mobDirector.rng());
  for (const offset of [0, .125, 1, 10]) for (const [row, lane] of rows) {
    const future = world.time + offset, twinLane = control.session.world.rows.get(row);
    assert.deepEqual(laneActors(lane, future), laneActors(twinLane, future));
    assert.deepEqual(coinPosition(lane, future), coinPosition(twinLane, future));
  }
  for (const row of [100, 251, 1000]) assert.deepEqual(generateLane(world.seed, row, world.home),
    generateLane(control.session.world.seed, row, control.session.world.home));
  const incoming = run.session.players[1], earned = incoming.personalScore, completed = incoming.completedForwardTiles;
  step(run, 'back'); step(run);
  assert.equal(incoming.personalScore, earned); assert.equal(incoming.completedForwardTiles, completed);
  step(run);
  assert.equal(incoming.personalScore, earned + 1); assert.equal(incoming.completedForwardTiles, completed + 1);
});

test('returning placement cannot recharge the actual 100-distance innate meter', () => {
  const run = setup(99), player = run.session.players[0];
  // Trigger the real innate rescue before any authored distance.
  run.game.end('Fixture water contact', 'water');
  assert.ok(player.powerRescue); assert.equal(player.powerRemaining, 100);
  for (let tick = 0; tick < 600 && player.powerRescue; tick++) run.session.update(STEP);
  for (let hop = 0; hop < 99; hop++) step(run);
  assert.equal(player.personalScore, 99); assert.equal(player.powerRemaining, 1);
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  for (let hop = 0; hop < 99; hop++) step(run);
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  assert.equal(player.personalScore, 99); assert.equal(player.powerRemaining, 1);
  assert.equal(run.game.currentScore, 99); assert.equal(player.powerReady, false);
  step(run, 'back'); step(run);
  assert.equal(player.personalScore, 99); assert.equal(player.powerRemaining, 1);
  step(run); assert.equal(player.personalScore, 100); assert.equal(player.powerRemaining, 0); assert.equal(player.powerReady, true);
});

test('returning placement cannot recharge the actual 250-settled-tile personal revival meter', () => {
  const run = setup(249), player = run.session.players[0];
  run.game.end('Fixture fatal traffic contact', 'traffic'); run.session.update(STEP);
  assert.equal(player.participation, 'dead'); assert.ok(player.recovery.offer);
  assert.equal(run.session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
  assert.equal(player.recovery.charge, 'spent'); assert.equal(player.recovery.nextRecharge, 250);
  for (let hop = 0; hop < 249; hop++) step(run);
  assert.equal(player.completedForwardTiles, 249); assert.equal(player.recovery.charge, 'spent');
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  for (let hop = 0; hop < 249; hop++) step(run);
  assert.equal(run.relay.confirm(run.relay.confirmation()), true);
  assert.equal(player.completedForwardTiles, 249); assert.equal(player.recovery.personalHighWater, 249);
  assert.equal(player.recovery.charge, 'spent');
  step(run, 'back'); step(run);
  assert.equal(player.completedForwardTiles, 249); assert.equal(player.recovery.charge, 'spent');
  step(run); assert.equal(player.completedForwardTiles, 250); assert.equal(player.recovery.charge, 'available');
  assert.equal(player.statistics.selfRevives, 1); assert.equal(player.statistics.deaths, 1);
});
