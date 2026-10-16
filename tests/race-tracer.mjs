import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSources } from './source-loader.mjs';

test('Race completes earned settled movement in one shared world and freezes its result', async () => {
  const sources = await loadSources(['game', 'race']);
  try {
    const { Game } = await sources.import('game');
    const { createRaceSession } = await sources.import('race');
    const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
    const race = createRaceSession(game, { seats: [
      { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
      { seat: 'p2', characterId: 'pip', device: 'gamepad-0' },
    ], finishTiles: 1, activeSeconds: 30 });
    assert.strictEqual(race.session.world, game.world);
    assert.notStrictEqual(race.session.players[0].run, race.session.players[1].run);
    assert.equal(race.session.dispatch({ seat: 'p2', direction: 'left' }), true);
    assert.equal(race.session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    assert.equal(race.result, undefined, 'airborne movement cannot finish');
    const tick = game.world.simulationTick;
    race.session.update(1 / 120);
    assert.equal(game.world.simulationTick, tick + 1, 'two players advance one world tick');
    for (let i = 0; i < 100 && !race.result; i++) race.session.update(1 / 120);
    assert.equal(race.result.outcome, 'finish');
    assert.deepEqual(race.result.winners, ['p1']);
    assert.equal(race.result.descriptor.settings.finishTiles, 1);
    assert.ok(Object.isFrozen(race.result));
    assert.ok(Object.isFrozen(race.result.descriptor.seats));
    const result = race.result, time = game.world.time;
    assert.equal(race.session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    race.session.update(1);
    assert.strictEqual(race.result, result); assert.equal(game.world.time, time);
    assert.equal(race.session.admit({ device: 'gamepad-1', characterId: 'clover' }), false);
  } finally { await sources.dispose(); }
});
