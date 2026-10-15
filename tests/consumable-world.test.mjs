import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
import { semanticValue } from './solo-parity-snapshot.mjs';

const sources = await loadSources(['game', 'mode-rules', 'session', 'survive-together', 'consumables', 'consumable-drops', 'recovery', 'survive-results']);
after(() => sources.dispose());

async function survive(seed = 3338952125) {
  const { Game } = await sources.import('game');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { LocalSession } = await sources.import('session');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');
  const game = new Game(seed, 'pond', 'arcade', false, [], 'butter');
  const session = LocalSession.stage(game, { roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'sunny' }], mode: createSurviveTogetherDefinition(SOLO_ARCADE_MODE) }).commit();
  return { game, session };
}

function meadow(game) {
  for (const lane of game.rows.values()) Object.assign(lane, {
    kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, phase: 0, speed: 0, spacing: 20, length: 4, variant: 0,
  });
}

function advance(session, seconds) {
  const step = 1 / 120;
  for (let elapsed = 0; elapsed < seconds - 1e-10; elapsed += step) session.update(Math.min(step, seconds - elapsed));
}

function charge(session, seat, itemId) {
  return session.consumableSnapshot().charges.find(entry => entry.seat === seat)[itemId];
}

async function ownedWorld({ seed = 0xb4184ed2, roster = [{ seat: 'p2', device: 'keyboard-b', characterId: 'sunny' }] } = {}) {
  const { Game } = await sources.import('game');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { LocalSession } = await sources.import('session');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');
  const game = new Game(seed, 'pond', 'arcade', false, [], 'butter');
  meadow(game);
  const session = LocalSession.stage(game, { roster, mode: createSurviveTogetherDefinition(SOLO_ARCADE_MODE) }).commit();
  meadow(game);
  return { game, session };
}

function occupy(player, pickup) {
  player.x = player.fromX = pickup.x;
  player.y = player.fromY = player.maxY = pickup.y;
  player.hop = 0;
}

function deathOnWater(game, session, player) {
  const lane = game.rows.get(player.y);
  player.powerReadyAt = 10000;
  Object.assign(lane, { kind: 'river', phase: 10, speed: 0, spacing: 20, length: .1, actors: undefined });
  session.update(1 / 120);
  assert.equal(player.state, 'dead');
  Object.assign(lane, { kind: 'meadow', phase: 0, speed: 0, spacing: 20, length: 4, actors: undefined });
}

test('only committed Survive installs a deterministic session-owned pickup world', async () => {
  const { Game } = await sources.import('game');
  const solo = new Game(3338952125, 'pond');
  assert.equal(solo.worldExtensionSnapshot(), undefined, 'ordinary Arcade keeps no world extension state');

  const { game, session } = await survive();
  const world = session.consumableSnapshot();
  assert.ok(world, 'committed Survive attaches its owned item world');
  assert.equal(world.pickups.length, 1);
  assert.deepEqual(world.pickups[0], {
    id: 'item-drop-schema-1-c7045dbd-1-0-revival', itemId: 'revival', row: 1, slot: 0, x: 0, y: 1, z: 0,
  });
  assert.equal(game.worldExtensionSnapshot()?.pickups.length, 1, 'rendering can project the authoritative extension without a Game item ledger');
});

test('world pickup claims exactly once and credits its stable owner charge', async () => {
  const { game, session } = await survive();
  const pickup = session.consumableSnapshot().pickups[0];
  const [p1, p2] = session.players;
  for (const player of [p1, p2]) {
    player.x = player.fromX = pickup.x;
    player.y = player.fromY = pickup.y;
    player.maxY = Math.max(player.maxY, pickup.y);
  }
  session.update(1 / 120);
  const world = session.consumableSnapshot();
  assert.equal(world.pickups.length, 0);
  assert.deepEqual(world.claims, [{ pickupId: pickup.id, seat: 'p1' }]);
  assert.equal(world.charges.find(charge => charge.seat === 'p1')?.revival, 1);
  assert.equal(world.charges.find(charge => charge.seat === 'p2')?.revival, 0);
  assert.equal(game.worldExtensionSnapshot()?.pickups.length, 0);
});

test('ordinary, cancelled, torn-down, and definition-owned extension paths leave exact item residue boundaries', async () => {
  const { Game } = await sources.import('game');
  const { LocalSession } = await sources.import('session');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');
  const solo = new Game(113, 'pond', 'stroll', false, [], 'butter');
  const ownBefore = Object.keys(solo).sort();
  const serializedBefore = semanticValue(solo);
  assert.equal(solo.worldExtensionSnapshot(), undefined);
  assert.equal(Object.hasOwn(solo, 'worldExtension'), false);
  const staged = LocalSession.stage(solo, { roster: [], mode: createSurviveTogetherDefinition(solo.definition) });
  assert.strictEqual(staged.cancel(), solo);
  assert.deepEqual(Object.keys(solo).sort(), ownBefore, 'cancelled adoption adds no Game state key');
  assert.deepEqual(semanticValue(solo), serializedBefore, 'cancelled adoption preserves all serializable solo state');

  const events = [];
  const release = solo.installWorldExtension({
    attach: () => events.push('attach'), row: (_game, lane) => events.push(`row:${lane.index}`),
    tick: () => events.push('tick'), snapshot: () => ({ future: true }), dispose: () => events.push('dispose'),
  });
  assert.ok(events.some(event => event.startsWith('row:')), 'a future definition can opt in through the generic row seam');
  solo.updateSessionWorldExtension({}, [], { playerGround: new Map() }, 1 / 120);
  assert.deepEqual(solo.worldExtensionSnapshot(), { future: true });
  release();
  assert.deepEqual(events.slice(-2), ['tick', 'dispose']);
  assert.equal(Object.hasOwn(solo, 'worldExtension'), false, 'generic teardown removes its own dispatch field');

  const { game, session } = await survive();
  assert.ok(session.consumableSnapshot());
  session.stop();
  assert.equal(game.worldExtensionSnapshot(), undefined);
  assert.equal(Object.hasOwn(game, 'worldExtension'), false, 'Survive teardown restores the exact absent Game shape');
});

test('initial and future keyed rows replay exactly, and a claimed pickup cannot duplicate', async () => {
  const { sampleConsumableDrop } = await sources.import('consumable-drops');
  const futureRow = Array.from({ length: 20000 }, (_, index) => index + 30)
    .find(row => sampleConsumableDrop({ courseSeed: 0xb4184ed2, row, slot: 0 }).itemId);
  assert.ok(futureRow, 'fixture has a normal future sampler hit');
  const one = await ownedWorld(), two = await ownedWorld();
  assert.deepEqual(one.session.consumableSnapshot().pickups, two.session.consumableSnapshot().pickups,
    'the retained initial window is deterministic before any incremental rows exist');
  for (const { game, session } of [one, two]) {
    session.world.noteProgress(futureRow);
    session.world.activeFloor = futureRow - 1;
    game.ensureRows();
  }
  assert.deepEqual(one.session.consumableSnapshot().pickups, two.session.consumableSnapshot().pickups,
    'initial retained and incremental rows share the same row-keyed sampler path');
  const claimer = await ownedWorld();
  const initial = claimer.session.consumableSnapshot().pickups.find(pickup => pickup.row === 1);
  assert.ok(initial);
  occupy(claimer.session.players[0], initial);
  claimer.session.players[1].x = claimer.session.players[1].fromX = 4;
  claimer.session.players[1].y = claimer.session.players[1].fromY = 0;
  claimer.session.update(1 / 120); claimer.session.update(1 / 120);
  assert.equal(claimer.session.consumableSnapshot().claims.filter(claim => claim.pickupId === initial.id).length, 1, 'replayed ticks cannot credit a stable pickup twice');

});

test('land anchors avoid scenery and cleanup follows the lagging live-seat retention floor', async () => {
  const { sampleConsumableDrop } = await sources.import('consumable-drops');
  const { game, session } = await survive();
  const row = Array.from({ length: 20000 }, (_, index) => index + 30)
    .find(index => sampleConsumableDrop({ courseSeed: game.seed, row: index, slot: 0 }).itemId);
  assert.ok(row);
  const lane = { ...game.rows.get(1), index: row, kind: 'meadow', blocked: [0], actors: undefined };
  session.consumableWorld.row(game, lane);
  const anchored = session.consumableSnapshot().pickups.find(pickup => pickup.row === row);
  assert.equal(anchored.x, -1, 'the deterministic nearest unblocked anchor replaces a blocked center cell');
  const blockedRow = row + 1;
  const blockedSeedRow = Array.from({ length: 20000 }, (_, index) => index + row + 1)
    .find(index => sampleConsumableDrop({ courseSeed: game.seed, row: index, slot: 0 }).itemId);
  assert.ok(blockedSeedRow);
  session.consumableWorld.row(game, { ...lane, index: blockedSeedRow, blocked: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] });
  assert.equal(session.consumableSnapshot().pickups.some(pickup => pickup.row === blockedSeedRow), false,
    'a fully blocked land row does not create a permanently inaccessible item');

  const retained = await survive();
  const source = retained.session.consumableSnapshot().pickups[0];
  retained.session.world.noteProgress(50); retained.session.world.activeFloor = 0; retained.game.ensureRows();
  retained.game.updateSessionWorldExtension(retained.session, [], { playerGround: new Map() }, 1 / 120);
  assert.equal(retained.session.consumableSnapshot().pickups.some(pickup => pickup.id === source.id), true,
    'a leading player cannot prune a visible pickup while a living seat keeps the row window behind');
  retained.session.world.activeFloor = 50; retained.game.ensureRows();
  retained.game.updateSessionWorldExtension(retained.session, [], { playerGround: new Map() }, 1 / 120);
  assert.equal(retained.session.consumableSnapshot().pickups.some(pickup => pickup.id === source.id), false,
    'the same unclaimed source pickup prunes once the lagging floor advances past its horizon');
});

test('swept contact is stable across roster order and pull advances once per world tick', async () => {
  const { game, session } = await survive();
  meadow(game);
  const pickup = session.consumableSnapshot().pickups[0];
  const [p1, p2] = session.players;
  for (const player of [p1, p2]) {
    player.y = player.fromY = player.maxY = pickup.y;
    player.hop = game.rules.movement.hopDuration;
  }
  p1.fromX = -1; p1.x = 1; p2.fromX = 1; p2.x = -1;
  // Deliberately reverse the live collection iteration.  Both endpoints are
  // outside the .32 radius, while both swept segments cross the pickup.
  session.roster.reverse();
  session.update(game.rules.movement.hopDuration);
  assert.deepEqual(session.consumableSnapshot().claims, [{ pickupId: pickup.id, seat: 'p1' }],
    'equal swept fraction and distance resolve by stable seat, never roster iteration');

  const left = await survive(), right = await survive();
  for (const fixture of [left, right]) {
    meadow(fixture.game);
    const item = fixture.session.consumableSnapshot().pickups[0];
    fixture.session.players[0].x = fixture.session.players[0].fromX = .45;
    fixture.session.players[0].y = fixture.session.players[0].fromY = fixture.session.players[0].maxY = item.y;
    fixture.session.players[1].x = fixture.session.players[1].fromX = 2;
    fixture.session.players[1].y = fixture.session.players[1].fromY = 0;
  }
  left.session.update(1 / 120);
  right.session.players[1].x = right.session.players[1].fromX = .48;
  right.session.players[1].y = right.session.players[1].fromY = right.session.players[1].maxY = right.session.consumableSnapshot().pickups[0].y;
  right.session.update(1 / 120);
  const leftPickup = left.session.consumableSnapshot().pickups[0], rightPickup = right.session.consumableSnapshot().pickups[0];
  assert.ok(leftPickup.x > 0, 'a target inside the baseline capture range advances the pickup');
  assert.deepEqual({ x: rightPickup.x, y: rightPickup.y }, { x: leftPickup.x, y: leftPickup.y },
    'adding an eligible but farther seat cannot multiply a single tick of baseline pull');

  const priority = await survive(); meadow(priority.game);
  const item = priority.session.consumableSnapshot().pickups[0], [early, near] = priority.session.players;
  for (const player of [early, near]) { player.y = player.fromY = player.maxY = item.y; player.hop = priority.game.rules.movement.hopDuration; }
  early.fromX = -.4; early.x = 1; // first contact, but a full-tick endpoint farther away
  near.fromX = -.5; near.x = .4; // later contact, but nearest final endpoint
  priority.session.update(priority.game.rules.movement.hopDuration);
  assert.deepEqual(priority.session.consumableSnapshot().claims, [{ pickupId: item.id, seat: 'p1' }],
    'earliest swept fraction wins before final squared distance');
});

test('a real river-bound item follows its actor, can be collected, and survives source-row pruning at its attracted position', async () => {
  const { game, session } = await ownedWorld();
  let riverItem;
  for (let frontier = 30; frontier < 20000 && !riverItem; frontier += 29) {
    session.world.noteProgress(frontier); session.world.activeFloor = frontier;
    game.ensureRows();
    riverItem = session.consumableSnapshot().pickups.find(pickup => game.rows.get(pickup.row)?.kind === 'river' && pickup.row >= frontier - 10);
  }
  assert.ok(riverItem, 'bounded keyed source scan found an ordinary river item');
  const [collector, other] = session.players;
  collector.x = collector.fromX = 4; collector.y = collector.fromY = 0;
  other.x = other.fromX = 3; other.y = other.fromY = 0;
  const beforeX = riverItem.x;
  // Drive the shipped optional extension with no eligible traveler first: this
  // isolates its real actor binding from pickup contact and pull selection.
  game.time += 1 / 120;
  game.updateSessionWorldExtension(session, [], { playerGround: new Map() }, 1 / 120);
  const moved = session.consumableSnapshot().pickups.find(pickup => pickup.id === riverItem.id);
  assert.ok(moved && moved.x !== beforeX, 'the visible item follows its selected live river actor');
  occupy(collector, moved); session.update(1 / 120);
  assert.equal(session.consumableSnapshot().claims.some(claim => claim.pickupId === riverItem.id), true,
    'the real actor-bound position remains collectible');

  const retained = await survive(); meadow(retained.game);
  const pickup = retained.session.consumableSnapshot().pickups[0], player = retained.session.players[0];
  retained.session.players[1].x = retained.session.players[1].fromX = 4;
  retained.session.players[1].y = retained.session.players[1].fromY = 0;
  // Keep a real hop in progress: groundY is fractional only between integer
  // source and destination rows, while the target stays inside pull range.
  for (let attempt = 0; attempt < 720 && retained.session.consumableSnapshot().pickups.some(value => value.id === pickup.id && value.y < 2.01); attempt++) {
    const current = retained.session.consumableSnapshot().pickups.find(value => value.id === pickup.id);
    const ground = current.y + .45, lower = Math.floor(ground), fraction = ground - lower;
    player.x = player.fromX = current.x; player.fromY = lower; player.y = lower + 1;
    player.hop = retained.game.rules.movement.hopDuration * (1 - fraction); player.maxY = Math.max(player.maxY, player.y);
    retained.session.update(1 / 120);
  }
  const attracted = retained.session.consumableSnapshot().pickups.find(value => value.id === pickup.id);
  assert.ok(attracted && attracted.y > 2, 'baseline pull crossed the original source-row cleanup boundary during real hop ground motion');
  const frontier = retained.game.rules.retention.rowsBehind + 2;
  retained.session.world.noteProgress(frontier); retained.session.world.activeFloor = frontier; retained.game.ensureRows();
  assert.equal(retained.game.rows.has(pickup.row), false, 'normal course retention has removed the source row');
  retained.game.updateSessionWorldExtension(retained.session, [], { playerGround: new Map() }, 1 / 120);
  assert.equal(retained.session.consumableSnapshot().pickups.some(value => value.id === pickup.id), true,
    'cleanup follows the attracted position instead of deleting by stale source row');
});

test('full and inactive participants cannot delete a pickup before the next eligible owner claims it', async () => {
  const { game, session } = await ownedWorld();
  const [p1, p2] = session.players;
  const revival = session.consumableSnapshot().pickups.find(pickup => pickup.itemId === 'revival');
  assert.ok(revival); occupy(p1, revival); p2.x = p2.fromX = 4; p2.y = p2.fromY = 0;
  session.update(1 / 120);
  assert.equal(charge(session, 'p1', 'revival'), 1);
  const { sampleConsumableDrop } = await sources.import('consumable-drops');
  const row = Array.from({ length: 4000 }, (_, index) => index + 30)
    .find(index => sampleConsumableDrop({ courseSeed: game.seed, row: index, slot: 0 }).itemId === 'revival');
  assert.ok(row);
  session.world.noteProgress(row); session.world.activeFloor = row - 1; game.ensureRows(); meadow(game);
  const full = session.consumableSnapshot().pickups.find(pickup => pickup.row === row);
  assert.ok(full); occupy(p1, full); p2.x = p2.fromX = 4; p2.y = p2.fromY = row - 1;
  session.update(1 / 120);
  assert.ok(session.consumableSnapshot().pickups.some(pickup => pickup.id === full.id), 'a full owner cannot consume or erase an item');
  assert.equal(session.deviceLost('p1'), true);
  occupy(p1, full); occupy(p2, full);
  session.update(1 / 120);
  assert.equal(charge(session, 'p2', 'revival'), 1, 'ghost overlap is ignored and the active owner claims once');
  assert.equal(session.consumableSnapshot().claims.filter(claim => claim.pickupId === full.id).length, 1);
});

test('Flare commits all eligible returns together while ghosts stay untouched and each death clears only its owner', async () => {
  const { game, session } = await ownedWorld({ roster: [
    { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
    { seat: 'p3', device: 'keyboard-c', characterId: 'pip' },
    { seat: 'p4', device: 'keyboard-d', characterId: 'petal' },
  ] });
  const [owner, deadOne, deadTwo, ghost] = session.players;
  const flare = session.consumableSnapshot().pickups.find(pickup => pickup.itemId === 'flare');
  assert.ok(flare); occupy(owner, flare);
  for (const player of [deadOne, ghost]) { player.x = player.fromX = 4; player.y = player.fromY = player.maxY = 0; }
  deadTwo.x = deadTwo.fromX = 4; deadTwo.y = deadTwo.fromY = deadTwo.maxY = 1;
  session.update(1 / 120);
  assert.equal(charge(session, owner.seat, 'flare'), 1);
  owner.run.creditCoins(7); ghost.run.creditCoins(9);
  assert.equal(session.deviceLost(ghost.seat), true);
  deathOnWater(game, session, deadOne);
  assert.equal(deadTwo.state, 'playing', 'the second death is a later transition, not a shared hazard side effect');
  deathOnWater(game, session, deadTwo);
  assert.equal(deadOne.run.wallet, 0); assert.equal(deadTwo.run.wallet, 0);
  assert.equal(owner.run.wallet, 7); assert.equal(ghost.run.wallet, 9, 'a ghost never spills or clears for a teammate death');
  const held = session.consumableSnapshot().charges.find(entry => entry.seat === owner.seat);
  const ghostBefore = { x: ghost.x, y: ghost.y, participation: ghost.participation, wallet: ghost.run.wallet };
  assert.equal(session.useConsumable({ actionId: 'all-dead-flare', ownerSeat: owner.seat, itemId: 'flare',
    expectedInventoryGeneration: held.inventoryGeneration, expectedOwnerGeneration: held.ownerGeneration }), true);
  for (const player of [owner, deadOne, deadTwo]) {
    assert.equal(player.state, 'playing'); assert.equal(player.participation, 'active');
    assert.ok(player.recovery.protectionUntil > session.world.time);
  }
  assert.deepEqual({ x: ghost.x, y: ghost.y, participation: ghost.participation, wallet: ghost.run.wallet }, ghostBefore,
    'Flare excludes disconnected records from both return placement and inventory mutation');
  assert.equal(charge(session, owner.seat, 'flare'), 0);
});

test('different held actions may commit in the same simulation tick for their separately selected deaths', async () => {
  const { game, session } = await ownedWorld({ roster: [
    { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
    { seat: 'p3', device: 'keyboard-c', characterId: 'pip' },
    { seat: 'p4', device: 'keyboard-d', characterId: 'petal' },
  ] });
  const [firstOwner, secondOwner, firstDead, secondDead] = session.players;
  const initial = session.consumableSnapshot().pickups.find(pickup => pickup.itemId === 'revival');
  assert.ok(initial); occupy(firstOwner, initial);
  for (const player of [secondOwner, firstDead, secondDead]) { player.x = player.fromX = 4; player.y = player.fromY = player.maxY = 0; }
  session.update(1 / 120);
  const { sampleConsumableDrop } = await sources.import('consumable-drops');
  const row = Array.from({ length: 20000 }, (_, index) => index + 30)
    .find(index => sampleConsumableDrop({ courseSeed: game.seed, row: index, slot: 0 }).itemId === 'revival');
  assert.ok(row);
  session.world.noteProgress(row); session.world.activeFloor = row - 1; game.ensureRows(); meadow(game);
  const future = session.consumableSnapshot().pickups.find(pickup => pickup.row === row);
  assert.ok(future); occupy(secondOwner, future); firstOwner.x = firstOwner.fromX = 4; firstOwner.y = firstOwner.fromY = row - 1;
  session.update(1 / 120);
  assert.equal(charge(session, firstOwner.seat, 'revival'), 1); assert.equal(charge(session, secondOwner.seat, 'revival'), 1);
  firstDead.x = firstDead.fromX = 4; firstDead.y = firstDead.fromY = firstDead.maxY = row - 2;
  secondDead.x = secondDead.fromX = 4; secondDead.y = secondDead.fromY = secondDead.maxY = row - 3;
  deathOnWater(game, session, firstDead); deathOnWater(game, session, secondDead);
  const firstCharge = session.consumableSnapshot().charges.find(entry => entry.seat === firstOwner.seat);
  const secondCharge = session.consumableSnapshot().charges.find(entry => entry.seat === secondOwner.seat);
  const tick = session.world.simulationTick;
  assert.equal(session.useConsumable({ actionId: 'parallel-first', ownerSeat: firstOwner.seat, itemId: 'revival', targetSeat: firstDead.seat,
    expectedInventoryGeneration: firstCharge.inventoryGeneration, expectedOwnerGeneration: firstCharge.ownerGeneration,
    expectedTargetDeathGeneration: firstDead.recovery.deathGeneration }), true);
  assert.equal(session.useConsumable({ actionId: 'parallel-second', ownerSeat: secondOwner.seat, itemId: 'revival', targetSeat: secondDead.seat,
    expectedInventoryGeneration: secondCharge.inventoryGeneration, expectedOwnerGeneration: secondCharge.ownerGeneration,
    expectedTargetDeathGeneration: secondDead.recovery.deathGeneration }), true,
  'same-tick deduplication is owner-scoped, not a global action lock');
  assert.equal(session.world.simulationTick, tick);
  assert.equal(charge(session, firstOwner.seat, 'revival'), 0); assert.equal(charge(session, secondOwner.seat, 'revival'), 0);
  assert.equal(firstDead.state, 'playing'); assert.equal(secondDead.state, 'playing');
});
