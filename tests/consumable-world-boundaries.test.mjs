import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'session', 'survive-together', 'consumable-drops', 'market/catalog']);
after(source.dispose);
const { Game, platformSupports } = await source.import('game');
const { LocalSession } = await source.import('session');
const { createSurviveTogetherDefinition } = await source.import('survive-together');
const { sampleConsumableDrop } = await source.import('consumable-drops');
const { ITEM_CATALOG } = await source.import('market/catalog');
const STEP = 1 / 120;
const SEEDS = { revival: 0xc7045dbd, flare: 0x4905bf13 };

function advance(session, seconds) {
  const count = Math.max(1, Math.ceil(seconds / STEP));
  for (let index = 0; index < count; index++) session.update(seconds / count);
}
function fixture({ itemId = 'revival', mode = 'arcade', seat = 'p1', seed = SEEDS[itemId] } = {}) {
  assert.equal(sampleConsumableDrop({ courseSeed: seed, row: 1, slot: 0 }).itemId, itemId);
  const game = new Game(seed, 'pond', mode, false, ITEM_CATALOG, 'butter');
  for (const lane of game.rows.values()) Object.assign(lane, {
    kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, phase: 0, speed: 0, spacing: 20, length: 4,
  });
  const session = LocalSession.stage(game, {
    roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'sunny' }],
    mode: createSurviveTogetherDefinition(game.definition),
  }).commit();
  const player = session.players.find(candidate => candidate.seat === seat);
  const other = session.players.find(candidate => candidate !== player);
  player.x = player.fromX = 0; player.y = player.fromY = player.maxY = 0;
  other.x = other.fromX = 4; other.y = other.fromY = other.maxY = -1;
  const snapshot = session.consumableSnapshot();
  const pickup = snapshot.pickups.find(value => value.row === 1 && value.slot === 0);
  assert.equal(pickup?.itemId, itemId, 'normal committed attach must generate the known anchor');
  assert.equal(pickup.x, 0);
  return { game, session, player, other, pickup };
}
function charge(session, seat, itemId) {
  return session.consumableSnapshot().charges.find(value => value.seat === seat)[itemId];
}
function hop(session, player, direction) {
  assert.equal(player.move(direction), true);
  advance(session, session.world.rules.movement.hopDuration);
  assert.equal(player.hop, 0);
  assert.equal(player.state, 'playing');
}

test('both items remain reachable on fractional grids after real log rides, for either seat and mode', () => {
  const offsets = [...new Set([...Array.from({ length: 17 }, (_, index) => index / 16), .5 - 1e-9, .5 + 1e-9])];
  for (const itemId of ['revival', 'flare']) for (const mode of ['arcade', 'stroll']) {
    for (const seat of ['p1', 'p2']) for (const direction of [-1, 1]) for (const offset of offsets) {
      const { game, session, player, other, pickup } = fixture({ itemId, mode, seat });
      const river = game.rows.get(0);
      Object.assign(river, { kind: 'river', speed: direction });
      assert.equal(platformSupports(river, player.x, game.time), true);
      advance(session, offset / game.rules.simulation.worldTimeScale);
      const driftedX = direction * offset;
      assert.ok(Math.abs(player.x - driftedX) < 1e-8, 'a moving platform must create the fractional offset');
      hop(session, player, 'forward');
      assert.ok(Math.abs(player.x - driftedX) < 1e-8, 'the bank hop must not normalize the personal grid');
      if (offset > .5) hop(session, player, direction > 0 ? 'left' : 'right');
      const personalX = player.x;
      assert.ok(Math.abs(personalX) <= .5 + 1e-8);
      advance(session, .9);
      const label = `${itemId}/${mode}/${seat}/${direction * offset}`;
      assert.equal(charge(session, seat, itemId), 1, label);
      assert.equal(charge(session, other.seat, itemId), 0, label);
      assert.equal(session.consumableSnapshot().pickups.some(value => value.id === pickup.id), false, label);
      assert.equal(session.consumableSnapshot().claims.filter(value => value.pickupId === pickup.id).length, 1, label);
      assert.equal(player.x, personalX, label);
      assert.deepEqual(player.run.cards, []);
      hop(session, player, 'forward');
      advance(session, .2);
      assert.equal(player.x, personalX, 'later hops retain the fractional grid');
      assert.equal(charge(session, seat, itemId), 1, 'later frames cannot duplicate the claim');
    }
  }
});

function buyMagnet(run) {
  run.advanceScore(100);
  assert.equal(run.open(), true);
  const item = run.catalog.get('magnet');
  assert.ok(item);
  const offer = { id: 'boundary-magnet', itemId: item.id, price: item.price, sold: false };
  run.market.offers.push(offer);
  run.creditCoins(item.price);
  assert.equal(run.buy(offer.id).ok, true);
  run.close();
}

test('coin magnet cards alter neither item pull range nor its frame-by-frame motion', () => {
  for (const mode of ['arcade', 'stroll']) for (const seat of ['p1', 'p2']) for (const distance of [.45, .8]) {
    const traces = [false, true].map(withMagnet => {
      const { session, player, pickup } = fixture({ mode, seat });
      if (withMagnet) buyMagnet(player.run);
      player.x = player.fromX = distance; player.y = player.fromY = player.maxY = 1;
      const trace = [];
      for (let index = 0; index < 30; index++) {
        session.update(STEP);
        const current = session.consumableSnapshot().pickups.find(value => value.id === pickup.id);
        trace.push({ x: current?.x ?? null, y: current?.y ?? null, charge: charge(session, seat, 'revival') });
      }
      if (distance === .8) assert.equal(trace.at(-1).charge, 0, 'baseline pull cannot reach this distant pickup');
      return trace;
    });
    assert.deepEqual(traces[1], traces[0], `${mode}/${seat}/${distance}: magnet must only affect coins`);
  }
});

function twoOwnedItems() {
  // The real sampler yields Revival on row1 and Flare on row2 for this seed.
  const context = fixture({ seed: 0xb4184ed2, mode: 'stroll' });
  assert.equal(sampleConsumableDrop({ courseSeed: context.game.seed, row: 2, slot: 0 }).itemId, 'flare');
  for (const [index, player] of context.session.players.entries()) {
    player.x = player.fromX = 0;
    player.y = player.fromY = player.maxY = index + 1;
    player.run.creditCoins(17 + index);
  }
  advance(context.session, .3);
  assert.equal(charge(context.session, 'p1', 'revival'), 1);
  assert.equal(charge(context.session, 'p2', 'flare'), 1);
  return context;
}

for (const seat of ['p1', 'p2']) {
  test(`${seat}: actual death clears only its held item and recovery cannot restore it`, () => {
    const { game, session } = twoOwnedItems();
    const dead = session.players.find(player => player.seat === seat);
    const survivor = session.players.find(player => player !== dead);
    const before = structuredClone(session.consumableSnapshot().charges.find(value => value.seat === survivor.seat));
    const wallet = survivor.run.wallet;
    dead.powerReadyAt = 10000;
    Object.assign(game.rows.get(dead.y), { kind: 'river', phase: 10, speed: 0, length: 1, spacing: 20 });
    session.update(STEP);
    assert.equal(dead.state, 'dead', 'an actual unsupported river contact must execute death clearing');
    assert.equal(dead.run.wallet, 0);
    assert.equal(charge(session, seat, 'revival'), 0);
    assert.equal(charge(session, seat, 'flare'), 0);
    assert.equal(survivor.state, 'playing');
    assert.equal(survivor.run.wallet, wallet);
    assert.deepEqual(session.consumableSnapshot().charges.find(value => value.seat === survivor.seat), before);
    Object.assign(game.rows.get(dead.y), { kind: 'meadow', phase: 0 });
    assert.equal(session.recover({ kind: 'personal', ownerSeat: seat }), true);
    assert.equal(charge(session, seat, 'revival'), 0);
    assert.equal(charge(session, seat, 'flare'), 0);
    assert.equal(dead.run.wallet, 0);
  });
}

test('a disconnected ghost retains its held item and wallet through another player death', () => {
  const { game, session } = twoOwnedItems();
  const primary = session.players.find(player => player.seat === 'p1');
  const ghost = session.players.find(player => player.seat === 'p2');
  const wallet = ghost.run.wallet;
  assert.equal(session.deviceLost(ghost.seat), true);
  assert.equal(charge(session, ghost.seat, 'flare'), 1);
  primary.powerReadyAt = 10000;
  Object.assign(game.rows.get(primary.y), { kind: 'river', phase: 10, speed: 0, length: 1, spacing: 20 });
  session.update(STEP);
  assert.equal(primary.state, 'dead');
  assert.equal(ghost.participation, 'device-lost');
  assert.equal(charge(session, ghost.seat, 'flare'), 1);
  assert.equal(ghost.run.wallet, wallet);
  Object.assign(game.rows.get(primary.y), { kind: 'meadow', phase: 0 });
  assert.equal(session.reclaim(ghost.seat, 'gamepad-7'), true);
  assert.equal(charge(session, ghost.seat, 'flare'), 1);
  assert.equal(ghost.run.wallet, wallet);
});

function killOnWater(game, session, player) {
  player.powerReadyAt = 10000;
  const lane = game.rows.get(player.y);
  Object.assign(lane, { kind: 'river', phase: 10, speed: 0, length: 1, spacing: 20 });
  session.update(STEP);
  assert.equal(player.state, 'dead');
  Object.assign(lane, { kind: 'meadow', phase: 0 });
}

function observableState(session) {
  return structuredClone({
    items: session.consumableSnapshot(),
    players: session.players.map(player => ({
      seat: player.seat, state: player.state, participation: player.participation,
      x: player.x, y: player.y, health: player.health, wallet: player.run.wallet,
      recovery: player.recovery, statistics: player.statistics,
    })),
  });
}

for (const itemId of ['revival', 'flare']) {
  test(`${itemId}: a collected charge returns a teammate atomically and rejects replay`, () => {
    const { game, session } = twoOwnedItems();
    const owner = session.players.find(player => player.seat === (itemId === 'revival' ? 'p1' : 'p2'));
    const target = session.players.find(player => player !== owner);
    killOnWater(game, session, target);
    const chargeBefore = session.consumableSnapshot().charges.find(value => value.seat === owner.seat);
    const action = { actionId: `collected-${itemId}`, ownerSeat: owner.seat, itemId,
      targetSeat: target.seat, expectedInventoryGeneration: chargeBefore.inventoryGeneration,
      expectedOwnerGeneration: chargeBefore.ownerGeneration,
      expectedTargetDeathGeneration: target.recovery.deathGeneration };
    const clock = session.world.time;
    const tick = session.world.simulationTick;
    const progress = target.recovery.personalHighWater;
    const ownerWallet = owner.run.wallet;
    assert.equal(session.useConsumable(action), true);
    assert.equal(session.world.time, clock, 'debit and recovery complete without another frame');
    assert.equal(session.world.simulationTick, tick);
    assert.equal(charge(session, owner.seat, itemId), 0);
    assert.equal(target.state, 'playing');
    assert.equal(target.participation, 'active');
    assert.equal(target.run.wallet, 0, 'a consumed item cannot restore purchases lost on death');
    assert.equal(target.run.alive, true);
    assert.equal(target.recovery.personalHighWater, progress, 'relocation earns no personal progress');
    assert.ok(target.recovery.protectionUntil > clock);
    assert.equal(owner.run.wallet, ownerWallet);
    const afterUse = observableState(session);
    assert.equal(session.useConsumable(action), false);
    assert.deepEqual(observableState(session), afterUse, 'replay must change no authoritative state');
  });
}

test('invalid item use preserves held charges and every recovery target until safe placement exists', () => {
  const { game, session } = twoOwnedItems();
  const owner = session.players.find(player => player.seat === 'p1');
  const target = session.players.find(player => player.seat === 'p2');
  killOnWater(game, session, target);
  const ownerCharge = session.consumableSnapshot().charges.find(value => value.seat === owner.seat);
  const generation = ownerCharge.inventoryGeneration;
  const action = { actionId: 'recover-after-rejection', itemId: 'revival', ownerSeat: owner.seat,
    targetSeat: target.seat, expectedInventoryGeneration: generation,
    expectedOwnerGeneration: ownerCharge.ownerGeneration,
    expectedTargetDeathGeneration: target.recovery.deathGeneration };
  for (const invalid of [
    { ...action, expectedInventoryGeneration: generation - 1 },
    { ...action, expectedOwnerGeneration: undefined },
    { ...action, expectedTargetDeathGeneration: undefined },
    { ...action, expectedTargetDeathGeneration: target.recovery.deathGeneration - 1 },
    { ...action, targetSeat: owner.seat },
    { ...action, targetSeat: 'p4' },
    { ...action, ownerSeat: target.seat },
    { ...action, itemId: 'flare' },
  ]) {
    const before = observableState(session);
    assert.equal(session.useConsumable(invalid), false);
    assert.deepEqual(observableState(session), before);
  }
  // Eliminate all supported landing cells without advancing the simulation or
  // killing the still-living owner: the placement planner must reject first.
  for (const lane of game.rows.values()) Object.assign(lane, {
    kind: 'river', phase: 10, speed: 0, spacing: 20, length: .1,
  });
  const before = observableState(session);
  assert.equal(session.useConsumable(action), false);
  assert.deepEqual(observableState(session), before, 'failed placement cannot debit or partly return a teammate');
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', phase: 0 });
  assert.equal(session.useConsumable(action), true, 'a refused intent has not consumed its action ID or charge');
});

test('a new participant occupying a departed seat cannot inherit the previous owners item', () => {
  const { session } = twoOwnedItems();
  const former = session.players.find(player => player.seat === 'p2');
  assert.equal(charge(session, former.seat, 'flare'), 1);
  assert.equal(session.depart(former.seat), true);
  assert.equal(former.run.wallet, 18, 'departure is not death');
  assert.equal(session.admit({ device: 'keyboard-c', characterId: 'pip' }), true);
  const newcomer = session.players.find(player => player.seat === former.seat);
  assert.ok(newcomer);
  assert.notEqual(newcomer.participantId, former.participantId);
  session.update(STEP);
  assert.equal(charge(session, newcomer.seat, 'revival'), 0);
  assert.equal(charge(session, newcomer.seat, 'flare'), 0, 'seat reuse must not transfer a consumable');
});

test('a delayed action from a departed participant cannot spend the replacement participants collected charge', () => {
  const { game, session, player: former, other: primary } = fixture({
    seed: 0xb4184ed2, mode: 'stroll', seat: 'p2',
  });
  // Collect two real items so the former inventory advances beyond its initial
  // version; merely assigning different initial versions is insufficient.
  for (const row of [2, 1]) {
    former.x = former.fromX = 0;
    former.y = former.fromY = former.maxY = row;
    session.update(STEP);
  }
  assert.equal(charge(session, former.seat, 'revival'), 1);
  assert.equal(charge(session, former.seat, 'flare'), 1);
  const oldCharge = session.consumableSnapshot().charges.find(value => value.seat === former.seat);
  const delayed = { actionId: 'former-owner-delayed', ownerSeat: former.seat, itemId: 'flare',
    expectedInventoryGeneration: oldCharge.inventoryGeneration,
    expectedOwnerGeneration: oldCharge.ownerGeneration };
  assert.equal(session.depart(former.seat), true);
  assert.equal(session.admit({ device: 'keyboard-c', characterId: 'pip' }), true);
  const newcomer = session.players.find(player => player.seat === former.seat);
  assert.notEqual(newcomer.participantId, former.participantId);
  let row = 3;
  while (row < 20000 && sampleConsumableDrop({ courseSeed: game.seed, row, slot: 0 }).itemId !== 'flare') row++;
  assert.ok(row < 20000, 'fixture needs a second naturally generated Flare');
  session.world.noteProgress(row);
  session.world.activeFloor = row - 1;
  game.ensureRows();
  for (const lane of game.rows.values()) Object.assign(lane, {
    kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, phase: 0, speed: 0, spacing: 20, length: 4,
  });
  const pickup = session.consumableSnapshot().pickups.find(value => value.row === row && value.itemId === 'flare');
  assert.ok(pickup, 'normal future-row generation must emit the next Flare');
  newcomer.x = newcomer.fromX = pickup.x;
  newcomer.y = newcomer.fromY = newcomer.maxY = row;
  primary.x = primary.fromX = 4;
  primary.y = primary.fromY = primary.maxY = row - 1;
  session.update(STEP);
  assert.equal(charge(session, newcomer.seat, 'flare'), 1);
  killOnWater(game, session, primary);
  const before = observableState(session);
  assert.equal(session.useConsumable(delayed), false, 'old ownership must remain invalid even after the newcomer acquires an item');
  assert.deepEqual(observableState(session), before);
  const current = session.consumableSnapshot().charges.find(value => value.seat === newcomer.seat);
  assert.equal(session.useConsumable({ ...delayed, actionId: 'new-owner-current',
    expectedInventoryGeneration: current.inventoryGeneration,
    expectedOwnerGeneration: current.ownerGeneration }), true, 'the current owner can still use its own charge');
});

test('Revival selected for an earlier death cannot silently apply to a later death', () => {
  const { game, session } = twoOwnedItems();
  const owner = session.players.find(player => player.seat === 'p1');
  const target = session.players.find(player => player.seat === 'p2');
  killOnWater(game, session, target);
  const held = session.consumableSnapshot().charges.find(value => value.seat === owner.seat);
  const action = { actionId: 'earlier-death-selection', ownerSeat: owner.seat, itemId: 'revival',
    targetSeat: target.seat, expectedInventoryGeneration: held.inventoryGeneration,
    expectedOwnerGeneration: held.ownerGeneration,
    expectedTargetDeathGeneration: target.recovery.deathGeneration };
  assert.equal(session.recover({ kind: 'personal', ownerSeat: target.seat }), true);
  advance(session, 2.1);
  // Separate the target from its teammate after the first protected return.
  target.y = target.fromY = 2;
  owner.y = owner.fromY = 1;
  killOnWater(game, session, target);
  assert.ok(target.recovery.deathGeneration > action.expectedTargetDeathGeneration);
  const before = observableState(session);
  assert.equal(session.useConsumable(action), false);
  assert.deepEqual(observableState(session), before);
  assert.equal(session.useConsumable({ ...action,
    expectedTargetDeathGeneration: target.recovery.deathGeneration }), true);
});

test('reading an item snapshot after late admission cannot change subsequent ownership revisions', () => {
  const outcomes = [false, true].map(observe => {
    const { game, session } = twoOwnedItems();
    assert.equal(session.admit({ device: 'keyboard-c', characterId: 'pip' }), true);
    if (observe) {
      session.consumableSnapshot();
      game.worldExtensionSnapshot();
    }
    killOnWater(game, session, session.players.find(player => player.seat === 'p1'));
    return observableState(session);
  });
  assert.deepEqual(outcomes[1], outcomes[0], 'HUD and renderer reads must not allocate or mutate authoritative inventory state');
});
