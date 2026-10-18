import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'mode-rules', 'session', 'survive-together', 'recovery', 'survive-results']);
after(() => sources.dispose());

async function createSession(character = 'butter') {
  const { Game } = await sources.import('game');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { LocalSession } = await sources.import('session');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');
  const game = new Game(93, 'pond', 'arcade', false, [], character);
  return { game, session: LocalSession.stage(game, { roster: [], mode: createSurviveTogetherDefinition(SOLO_ARCADE_MODE) }).commit() };
}

function meadow(game, row) {
  const lane = game.rows.get(row);
  game.rows.set(row, { ...lane, kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, phase: 0, speed: 0, spacing: 20, length: 1.15, variant: 0 });
}

test('personal revive opens only after a real death clears its owner and restores through the bounded offer', async () => {
  const { game, session } = await createSession();
  const player = session.players[0];
  player.run.creditCoins(9);
  player.powerReadyAt = 100;

  game.end('Recovery fixture death', 'water');
  session.update(1 / 120);

  assert.equal(player.state, 'dead');
  assert.equal(player.run.wallet, 0, 'production death clears the dead player before an offer exists');
  assert.equal(player.recovery?.charge, 'available');
  assert.ok(player.recovery?.offer, 'the completed death opens one bounded personal offer');
  assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
  assert.equal(player.state, 'playing');
  assert.equal(player.recovery?.charge, 'spent');
  assert.ok((player.recovery?.protectionUntil ?? 0) > session.world.time);
});

test('personal revive recharge credits only newly completed forward hops at the exact 249/250/251 boundary', async () => {
  const { game, session } = await createSession();
  const player = session.players[0];
  player.powerReadyAt = 100;
  game.end('Recovery fixture death', 'water');
  session.update(1 / 120);
  assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);

  for (let step = 1; step <= 249; step++) session.recordPersonalProgress(player, step);
  assert.equal(player.recovery?.charge, 'spent');
  session.recordPersonalProgress(player, 250);
  assert.equal(player.recovery?.charge, 'available');
  session.recordPersonalProgress(player, 251);
  assert.equal(player.recovery?.charge, 'available');
});

test('only an unexpired personal offer delays settlement and the final team result is immutable', async () => {
  const { game, session } = await createSession();
  const player = session.players[0];
  player.powerReadyAt = 1000;
  game.end('terminal fixture', 'water');
  session.update(1 / 120);
  assert.equal(session.result, undefined, 'the one valid offer delays all-dead settlement');
  session.update(9);
  assert.equal(session.result?.mode, 'survive-together');
  assert.equal(session.result?.podium, 'team');
  assert.ok(Object.isFrozen(session.result));
  assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), false, 'late recovery cannot reopen a frozen result');
});

test('return protection intercepts production wave and mob hazards before they mutate the recovered seat', async () => {
  const { game, session } = await createSession();
  const player = session.players[0];
  player.powerReadyAt = 10000;
  game.end('recovery fixture', 'water');
  session.update(1 / 120);
  assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
  const health = player.health;

  game.waveRow = player.groundY;
  session.update(0);
  assert.equal(player.state, 'playing');
  assert.equal(player.health, health, 'a protected wave cannot end or damage a player');

  game.mobs.push({ id: 91, kind: 'slime', x: player.x, y: player.y, fromX: player.x, fromY: player.y,
    targetX: player.x, targetY: player.y, phase: 'rest', phaseLeft: 1, phaseDuration: 1 });
  session.update(0);
  assert.equal(player.state, 'playing');
  assert.equal(player.health, health, 'a protected mob cannot spend health before its fatal path');

  session.update(2.1);
  game.waveRow = player.groundY;
  session.update(1 / 120);
  assert.equal(player.state, 'dead', 'wave death resumes after active-time protection expires');
  assert.equal(player.deathCause, 'wave');
});

test('a Flare atomically returns two production-dead teammates without healing its living owner', async () => {
  const { Game } = await sources.import('game');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { LocalSession } = await sources.import('session');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');
  const game = new Game(131, 'pond', 'arcade', false, [], 'butter');
  const session = LocalSession.stage(game, { roster: [
    { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
    { seat: 'p3', device: 'keyboard-c', characterId: 'pip' },
  ], mode: createSurviveTogetherDefinition(SOLO_ARCADE_MODE) }).commit();
  const [owner, first, second] = session.players;
  owner.health = 1;
  for (const player of [first, second]) {
    player.x = player.fromX = 0; player.y = player.fromY = player.maxY = 2; player.powerReadyAt = 10000;
  }
  const river = game.rows.get(2);
  game.rows.set(2, { ...river, kind: 'river', blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, phase: 10, speed: 0, spacing: 20, length: 1, variant: 0 });
  session.update(1 / 120);
  assert.deepEqual([first.state, second.state], ['dead', 'dead']);
  meadow(game, 2);
  let debits = 0;
  assert.equal(session.recover({ kind: 'flare', ownerSeat: 'p1', debit: () => (++debits === 1) }), true);
  assert.equal(debits, 1);
  assert.deepEqual([first.state, second.state], ['playing', 'playing']);
  assert.equal(owner.health, 1, 'living teammates relocate but retain health');
  assert.equal(owner.statistics.teammateRevives, 2);
  assert.equal(owner.statistics.itemsUsed, 1);
  assert.equal(new Set(session.players.map(player => `${player.x}:${player.y}`)).size, 3, 'the committed plan assigns distinct cells');
});

test('a forward Flare relocation establishes a spatial baseline so its next completed hop earns exactly one tile', async () => {
  const { Game } = await sources.import('game');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { LocalSession } = await sources.import('session');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');
  const game = new Game(137, 'pond', 'arcade', false, [], 'butter');
  const session = LocalSession.stage(game, { roster: [
    { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
    { seat: 'p3', device: 'keyboard-c', characterId: 'pip' },
  ], mode: createSurviveTogetherDefinition(SOLO_ARCADE_MODE) }).commit();
  const [owner, returned, other] = session.players;
  for (const player of [returned, other]) {
    player.x = player.fromX = 0; player.y = player.fromY = player.maxY = 2; player.powerReadyAt = 10000;
  }
  const river = game.rows.get(2);
  game.rows.set(2, { ...river, kind: 'river', blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, phase: 10, speed: 0, spacing: 20, length: 1, variant: 0 });
  session.update(1 / 120);
  assert.deepEqual([returned.state, other.state], ['dead', 'dead']);
  meadow(game, 2);
  owner.x = owner.fromX = 0; owner.y = owner.fromY = owner.maxY = 200;
  for (const row of [198, 199, 200, 201]) meadow(game, row);
  assert.equal(session.recover({ kind: 'flare', ownerSeat: 'p1', debit: () => true }), true);
  assert.equal(returned.y, 200, 'Flare actually relocates the returned player far ahead');
  assert.equal(returned.recovery.personalHighWater, 0, 'relocation grants no recharge tiles');
  assert.equal(returned.move('forward'), true);
  session.update(game.rules.movement.hopDuration);
  assert.equal(returned.recovery.personalHighWater, 1, 'only the subsequent completed hop earns one tile');
});

test('an unsafe Revival plan leaves every player unchanged and never debits the capability', async () => {
  const { Game } = await sources.import('game');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { LocalSession } = await sources.import('session');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');
  const game = new Game(139, 'pond', 'arcade', false, [], 'butter');
  const session = LocalSession.stage(game, { roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'sunny' }], mode: createSurviveTogetherDefinition(SOLO_ARCADE_MODE) }).commit();
  const [owner, target] = session.players;
  target.x = target.fromX = 0; target.y = target.fromY = target.maxY = 2; target.powerReadyAt = 10000;
  const river = game.rows.get(2);
  game.rows.set(2, { ...river, kind: 'river', blocked: [], decorations: [], coin: null, coinActor: undefined,
    actors: undefined, phase: 10, speed: 0, spacing: 20, length: 1, variant: 0 });
  session.update(1 / 120);
  assert.equal(target.state, 'dead');
  meadow(game, 2);
  for (const row of [0, -1, -2]) {
    meadow(game, row);
    game.rows.get(row).blocked = Array.from({ length: 11 }, (_, index) => index - 5);
  }
  const before = { owner: [owner.x, owner.y, owner.health], target: [target.x, target.y, target.state, target.run.alive] };
  let debits = 0;
  assert.equal(session.recover({ kind: 'revival', ownerSeat: 'p1', targetSeat: 'p2', debit: () => { debits++; return true; } }), false);
  assert.equal(debits, 0, 'the debit capability is untouched when no whole plan exists');
  assert.deepEqual({ owner: [owner.x, owner.y, owner.health], target: [target.x, target.y, target.state, target.run.alive] }, before);
});
