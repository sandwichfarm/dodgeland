import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
import { semanticValue, snapshotGame } from './solo-parity-snapshot.mjs';

const sources = await loadSources(['game', 'session', 'mode-rules', 'survive-together']);
after(() => sources.dispose());
const gameModule = await sources.import('game');
const { Game } = gameModule;
const { LocalSession } = await sources.import('session');
const { createSurviveTogetherDefinition } = await sources.import('survive-together');

function meadow(game) {
  for (const lane of game.rows.values()) Object.assign(lane, {
    kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, phase: 0, speed: 0, spacing: 20, length: 1.15, variant: 0,
  });
}
function setup({ mode = 'stroll', capacity = 4, onLifecycle = () => {} } = {}) {
  const game = new Game(113, 'pond', mode, false, [], 'butter');
  meadow(game);
  const session = LocalSession.stage(game, {
    roster: [], config: { capacity }, onLifecycle,
    mode: createSurviveTogetherDefinition(game.world.definition),
  }).commit();
  return { game, session };
}
function observed(game, session) {
  return {
    game: snapshotGame(game, gameModule),
    players: session.players.map(player => semanticValue({
      seat: player.seat, device: player.device, characterId: player.characterId,
      x: player.x, y: player.y, fromX: player.fromX, fromY: player.fromY,
      maxY: player.maxY, earnedDistance: player.earnedDistance,
      state: player.state, participation: player.participation,
      health: player.health, statistics: player.statistics,
      participantId: player.participantId, recovery: player.recovery, run: player.run,
    })),
    lifecycle: semanticValue(session.lifecycle), contributions: semanticValue(session.contributions),
  };
}

for (const mode of ['arcade', 'stroll']) test(`${mode}: staging and cancelling co-op does not install provenance on the solo player`, () => {
  const game = new Game(113, 'pond', mode, false, [], 'butter');
  meadow(game);
  game.move('forward'); game.update(game.rules.movement.hopDuration);
  const before = semanticValue(game.player);
  const solo = snapshotGame(game, gameModule);
  const stage = LocalSession.stage(game, { roster: [], mode: createSurviveTogetherDefinition(game.world.definition) });
  assert.deepEqual(semanticValue(game.player), before, 'staging itself must not mutate the live solo player or any reachable owner');
  assert.strictEqual(stage.cancel(), game);
  assert.deepEqual(semanticValue(game.player), before, 'cancel must leave all solo player fields unchanged, including newly introduced fields');
  assert.deepEqual(snapshotGame(game, gameModule), solo, 'the original future-state snapshot stays exact');
});

const batchRoster = [
  { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
  { seat: 'p3', device: 'gamepad-2', characterId: 'pip' },
  { seat: 'p4', device: 'gamepad-3', characterId: 'petal' },
];

test('four-seat promotion stages every selected player without mutating the live solo owners', () => {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  meadow(game); game.move('forward'); game.update(game.rules.movement.hopDuration);
  const { world, player, run } = game;
  const before = { game: snapshotGame(game, gameModule), player: semanticValue(player) };
  const stage = LocalSession.stage(game, { roster: batchRoster, mode: createSurviveTogetherDefinition(game.definition) });
  assert.deepEqual({ game: snapshotGame(game, gameModule), player: semanticValue(player) }, before);
  const session = stage.commit();
  assert.strictEqual(session.world, world);
  assert.strictEqual(session.players[0], player);
  assert.strictEqual(session.players[0].run, run);
  assert.deepEqual(session.players.map(member => member.seat), ['p1', 'p2', 'p3', 'p4']);
  assert.deepEqual(session.players.slice(1).map(member => member.device), batchRoster.map(member => member.device));
  assert.equal(new Set(session.players.map(member => `${member.x},${member.y}`)).size, 4);
  assert.equal(new Set(session.players.map(member => member.run)).size, 4);
  assert.equal(game.time, before.game.time);
});

test('a failed final seat in batch promotion leaves solo ownership and provenance unchanged', () => {
  const game = new Game(113, 'pond', 'stroll', false, [], 'butter'); meadow(game);
  // Two spare cells can fit P2/P3, but there is no cell for P4.
  for (const lane of game.rows.values()) lane.blocked = [-5, -4, -3, -2, 2, 3, 4, 5];
  const before = { game: snapshotGame(game, gameModule), player: semanticValue(game.player) };
  assert.throws(() => LocalSession.stage(game, { roster: batchRoster, mode: createSurviveTogetherDefinition(game.definition) }), /safe|place|seat/i);
  assert.deepEqual({ game: snapshotGame(game, gameModule), player: semanticValue(game.player) }, before);
  assert.equal(game.world.sessionActive, false);
});

test('replacing the empty setup commits the selected primary device after the original stage cancels', () => {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter'); meadow(game);
  const mode = createSurviveTogetherDefinition(game.definition);
  const original = LocalSession.stage(game, { roster: [], mode });
  const candidate = LocalSession.stage(game, {
    mode, primaryDevice: 'gamepad-1', roster: [
      { seat: 'p2', device: 'gamepad-0', characterId: 'sunny' },
      { seat: 'p3', device: 'keyboard-a', characterId: 'pip' },
      { seat: 'p4', device: 'keyboard-b', characterId: 'petal' },
    ],
  });
  original.cancel();
  const session = candidate.commit();
  assert.deepEqual(session.players.map(player => player.device),
    ['gamepad-1', 'gamepad-0', 'keyboard-a', 'keyboard-b'],
    'committing the replacement must use its validated bindings, including P1');
  assert.equal(new Set(session.players.map(player => player.device)).size, 4);
  assert.ok(session.players[0].recovery.aliases.includes('device:gamepad-1'),
    'the primary recovery provenance belongs to the committed controller');
});

for (const hazard of ['traffic', 'wave']) test(`batch promotion rejects ${hazard} before any selected player becomes active`, () => {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter'); meadow(game);
  if (hazard === 'wave') game.waveRow = game.y;
  else for (const lane of game.rows.values()) Object.assign(lane, { kind: 'road', phase: 0, speed: 0, spacing: .25, length: 2 });
  const before = { game: snapshotGame(game, gameModule), player: semanticValue(game.player) };
  assert.throws(() => LocalSession.stage(game, { roster: batchRoster, mode: createSurviveTogetherDefinition(game.definition) }), /safe|place|seat/i);
  assert.deepEqual({ game: snapshotGame(game, gameModule), player: semanticValue(game.player) }, before);
});

test('invalid identities and exhausted capacity reject admission without changing live owners', () => {
  const { game, session } = setup({ capacity: 3 });
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny' }), true);
  for (const admission of [
    { device: 'keyboard-b', characterId: 'pip' },
    { device: 'keyboard-c', characterId: 'sunny' },
    { device: 'keyboard-c', characterId: 'pip', seat: 'p1' },
    { device: 'keyboard-c', characterId: 'pip', seat: 'p8' },
    { device: 'unknown-controller', characterId: 'pip' },
    { device: 'gamepad--1', characterId: 'pip' },
    { device: 'keyboard-c', characterId: 'missing-traveler' },
  ]) {
    const before = observed(game, session);
    assert.equal(session.admit(admission), false, JSON.stringify(admission));
    assert.deepEqual(observed(game, session), before, 'rejected identity cannot mutate roster, inventory, lifecycle or world');
  }
  assert.equal(session.admit({ device: 'keyboard-c', characterId: 'pip' }), true);
  const full = observed(game, session);
  assert.equal(session.admit({ device: 'keyboard-d', characterId: 'petal' }), false);
  assert.deepEqual(observed(game, session), full, 'configured capacity applies before creating a new player');
});

test('unavailable safe cells reject admission atomically without consuming the next provenance grant', () => {
  const { game, session } = setup(), control = setup();
  for (const lane of game.rows.values()) lane.blocked = Array.from({ length: 11 }, (_, index) => index - 5);
  const before = observed(game, session);
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny' }), false);
  assert.deepEqual(observed(game, session), before);
  meadow(game);
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny' }), true);
  assert.equal(control.session.admit({ device: 'keyboard-b', characterId: 'sunny' }), true);
  assert.deepEqual(session.players[1].recovery, control.session.players[1].recovery,
    'rejected preflight must not allocate a grant or bind aliases');
});

test('a road filled with current traffic cannot be selected as a safe join placement', () => {
  const { game, session } = setup();
  for (const lane of game.rows.values()) Object.assign(lane, {
    kind: 'road', blocked: [], actors: undefined, phase: 0, speed: 0, spacing: .25, length: 2,
  });
  const before = observed(game, session);
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny' }), false,
    'every candidate overlaps a current car; joining must fail before an actor exists');
  assert.deepEqual(observed(game, session), before);
});

test('Arcade admission cannot place a new player inside the chasing wave', () => {
  const { game, session } = setup({ mode: 'arcade' });
  // An input can arrive before the next simulation step resolves the leader's
  // fatal contact. All positions at or behind this frontier are submerged.
  game.waveRow = session.players[0].y;
  const before = observed(game, session);
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny' }), false,
    'a living record awaiting hazard resolution is not a safe spawn anchor');
  assert.deepEqual(observed(game, session), before,
    'failed placement cannot create an actor, assign provenance or tick the world');
});

test('Flow admission ignores an inactive wave position', () => {
  const { game, session } = setup({ mode: 'stroll' });
  game.waveRow = session.players[0].y;
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny' }), true,
    'placement follows the composed pursuit strategy, not an unconditional wave check');
});

test('join callbacks observe a committed unique roster, inventory and safe placement exactly once', () => {
  let session;
  const callbacks = [];
  const setupResult = setup({ onLifecycle(record) {
    if (record.type !== 'player-joined') return;
    const joined = session.players.find(player => player.seat === record.seat);
    assert.ok(joined);
    assert.equal(joined.participation, 'active');
    assert.equal(joined.state, 'playing');
    assert.notStrictEqual(joined.run, session.players[0].run);
    assert.equal(new Set(session.players.map(player => `${player.x},${player.y}`)).size, session.players.length);
    assert.equal(Object.isFrozen(record), true);
    callbacks.push(record);
  } });
  session = setupResult.session;
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny' }), true);
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny' }), false);
  assert.equal(callbacks.length, 1);
  assert.equal(session.lifecycle.filter(record => record.type === 'player-joined').length, 1);
});

test('a disconnected ghost keeps its inventory and grant but cannot move, collect or take traffic damage', () => {
  const { game, session } = setup();
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny' }), true);
  const [p1, p2] = session.players;
  p1.x = p1.fromX = 4; p1.y = p1.fromY = 1;
  p2.x = p2.fromX = 0; p2.y = p2.fromY = 0;
  p2.run.creditCoins(17);
  p2.powerReadyAt = 1_000_000;
  Object.assign(game.rows.get(0), { kind: 'road', coin: 0, phase: 0, speed: 0, spacing: 20, length: 2 });
  assert.equal(session.deviceLost('p2'), true);
  const retained = semanticValue({ x: p2.x, y: p2.y, health: p2.health, powerReadyAt: p2.powerReadyAt, run: p2.run, recovery: p2.recovery });
  assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), false);
  session.update(.05);
  assert.deepEqual(semanticValue({ x: p2.x, y: p2.y, health: p2.health, powerReadyAt: p2.powerReadyAt, run: p2.run, recovery: p2.recovery }), retained);
  assert.equal(game.rows.get(0).coin, 0, 'ghost cannot claim its overlapping coin');
  assert.equal(session.reclaim('p2', p1.device), false, 'reclaim cannot steal an active device');
  const grant = p2.recovery.grantId, run = p2.run;
  meadow(game);
  assert.equal(session.reclaim('p2', 'gamepad-7'), true);
  assert.strictEqual(session.players.find(player => player.seat === 'p2'), p2);
  assert.strictEqual(p2.run, run);
  assert.equal(p2.run.wallet, 17);
  assert.equal(p2.recovery.grantId, grant);
  assert.equal(p2.statistics.deviceLostDuration, game.time);
});

test('departure archives immutable contributions, releases a seat, and gives a new join an empty run', () => {
  const { game, session } = setup();
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny', participantId: 'alice' }), true);
  const old = session.players[1]; old.run.creditCoins(23); old.statistics.distance = 12; old.statistics.coins = 23;
  const oldInventory = semanticValue(old.run), primaryInventory = semanticValue(session.players[0].run);
  assert.equal(session.depart('p2'), true);
  assert.equal(session.players.length, 1);
  assert.deepEqual(semanticValue(old.run), oldInventory, 'departure does not spill or clear the retired inventory');
  assert.deepEqual(semanticValue(session.players[0].run), primaryInventory, 'teammate ownership is untouched');
  assert.equal(old.deathSpill, null);
  assert.equal(session.contributions.length, 1);
  const archive = session.contributions[0];
  assert.equal(Object.isFrozen(archive), true); assert.equal(Object.isFrozen(archive.statistics), true);
  assert.equal(archive.statistics.distance, 12);
  assert.equal(archive.participantId, 'alice');
  assert.equal(session.admit({ device: 'keyboard-c', characterId: 'petal', seat: 'p2', participantId: 'bob' }), true);
  const next = session.players.find(player => player.seat === 'p2');
  assert.notStrictEqual(next, old); assert.notStrictEqual(next.run, old.run);
  assert.equal(next.run.wallet, 0); assert.equal(next.run.cards.length, 0);
  next.statistics.distance = 99;
  assert.equal(archive.statistics.distance, 12, 'new participant statistics cannot rewrite the archived contribution');
  assert.notEqual(next.recovery.grantId, old.recovery.grantId);
  assert.equal(game.time, 0, 'admission and departure never tick the world');
});

test('strong participant identity survives changed device/character while a different identity gets an independent grant', () => {
  const { session } = setup();
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny', participantId: 'alice' }), true);
  const first = session.players[1].recovery;
  assert.equal(session.depart('p2'), true);
  assert.equal(session.admit({ device: 'gamepad-7', characterId: 'petal', seat: 'p3', participantId: 'alice' }), true);
  const returned = session.players.find(player => player.seat === 'p3');
  assert.equal(returned.recovery.grantId, first.grantId);
  assert.equal(returned.recovery.personalHighWater, first.personalHighWater);
  assert.equal(returned.recovery.nextRecharge, first.nextRecharge);
  assert.equal(session.depart('p3'), true);
  assert.equal(session.admit({ device: 'gamepad-7', characterId: 'petal', participantId: 'bob' }), true);
  assert.notEqual(session.players[1].recovery.grantId, first.grantId, 'explicit different identity wins over reused aliases');
});

test('departure observers see the completed archive and can safely admit a successor into the released seat', () => {
  let session;
  const events = [];
  const fixture = setup({ onLifecycle(record) {
    if (record.type !== 'departed') return;
    assert.equal(session.players.some(player => player.seat === record.seat), false,
      'external lifecycle observers must see the committed roster');
    assert.equal(session.contributions.length, 1, 'departed contribution is archived before notification');
    assert.equal(session.contributions[0].participantId, 'alice');
    events.push(record);
    assert.equal(session.admit({ device: 'keyboard-c', characterId: 'petal', seat: 'p2', participantId: 'bob' }), true);
  } });
  session = fixture.session;
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny', participantId: 'alice' }), true);
  assert.equal(session.depart('p2'), true);
  assert.equal(events.length, 1);
  assert.equal(session.players.find(player => player.seat === 'p2')?.participantId, 'bob',
    'depart completion must not remove the successor created by its observer');
  assert.equal(session.contributions.length, 1);
});

test('newly reclaimed controller remains a provenance alias after departure and character change', () => {
  const { session } = setup();
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'sunny' }), true);
  const grant = session.players[1].recovery.grantId;
  assert.equal(session.deviceLost('p2'), true);
  assert.equal(session.reclaim('p2', 'gamepad-7'), true);
  assert.equal(session.depart('p2'), true);
  assert.equal(session.admit({ device: 'gamepad-7', characterId: 'petal' }), true);
  assert.equal(session.players[1].recovery.grantId, grant, 'replacement controller cannot silently grant a new personal revival provenance');
});
