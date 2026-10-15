import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'mode-rules', 'session', 'survive-together']);
after(() => sources.dispose());

test('Survive Together adopts a progressed Arcade run and safely joins a unique second player', async () => {
  const { Game } = await sources.import('game');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { LocalSession } = await sources.import('session');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');

  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  game.move('forward');
  game.update(game.rules.movement.hopDuration);
  const before = {
    world: game.world,
    player: game.player,
    run: game.run,
    time: game.time,
    seed: game.seed,
    x: game.x,
    y: game.y,
  };

  const definition = createSurviveTogetherDefinition(SOLO_ARCADE_MODE);
  const stage = LocalSession.stage(game, { roster: [], mode: definition });
  assert.strictEqual(stage.cancel(), game, 'cancel must leave the live solo owner in place');
  assert.strictEqual(game.world, before.world);
  assert.strictEqual(game.player, before.player);
  assert.strictEqual(game.run, before.run);
  assert.deepEqual({ time: game.time, seed: game.seed, x: game.x, y: game.y }, { time: before.time, seed: before.seed, x: before.x, y: before.y });

  const session = LocalSession.stage(game, { roster: [], mode: definition }).commit();
  assert.strictEqual(session.world, before.world, 'commit retains the original world');
  assert.strictEqual(session.players[0], before.player, 'commit retains the original player record');
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'pip' }), true, 'a fresh unique player joins only after safe placement succeeds');
  assert.deepEqual(session.players.map(player => player.seat), ['p1', 'p2']);
  assert.deepEqual(session.players.map(player => player.characterId), ['butter', 'pip']);
  assert.equal(session.admit({ device: 'keyboard-c', characterId: 'pip' }), false, 'a duplicate character never reserves a seat');
  assert.equal(session.players.length, 2, 'a rejected admission leaves the live roster unchanged');

  const worldTime = session.world.time;
  assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), true);
  session.update(1 / 60);
  assert.equal(session.world.time, worldTime + 1 / 60, 'both seats share exactly one world tick');
});

test('the same Survive Together composition accepts Flow rules without core mode selection', async () => {
  const { Game } = await sources.import('game');
  const { SOLO_STROLL_MODE } = await sources.import('mode-rules');
  const { LocalSession } = await sources.import('session');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');

  const game = new Game(29, 'pond', 'stroll', false, [], 'butter');
  const session = LocalSession.stage(game, { roster: [], mode: createSurviveTogetherDefinition(SOLO_STROLL_MODE) }).commit();
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'pip' }), true);
  assert.equal(session.definition.rules, SOLO_STROLL_MODE.rules, 'the composition keeps the stored Flow rules intact');
  assert.equal(session.players.length, 2);
});
