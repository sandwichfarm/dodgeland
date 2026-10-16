import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'race']);
after(sources.dispose);
const { Game } = await sources.import('game');
const { createRaceSession } = await sources.import('race');
const seats = [
  { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
  { seat: 'p2', characterId: 'pip', device: 'keyboard-b' },
];

test('fog boundary: stationary racers ahead of the initial line survive without inherited solo pursuit', () => {
  const race = createRaceSession(new Game(113, 'pond', 'arcade', false, [], 'butter'), { seats });
  const session = race.session;
  // Real generated opening terrain and ordinary fixed steps; no placement,
  // terrain, health, clock, or progression injection.
  for (let tick = 0; tick < 12 * 120; tick++) session.update(1 / 120);
  const observed = session.players.map(player => ({ seat: player.seat, state: player.state,
    cause: player.deathCause, health: player.health, ground: player.groundY,
    earned: player.earnedDistance, completed: player.completedForwardTiles }));
  console.log('stationary Race observation', JSON.stringify({ time: session.world.time, wave: session.world.waveRow, players: observed }));
  for (const player of session.players) {
    assert.equal(player.earnedDistance, 0);
    assert.equal(player.completedForwardTiles, 0);
    assert.ok(player.groundY >= -12, 'actual ground remains ahead of the initial Race fog line');
    assert.equal(player.state, 'playing', `${player.seat}: inherited ${player.deathCause} bypasses Race fog policy`);
    assert.equal(player.health, player.maxHealth);
  }
});

test('health pipeline dependency: delivered end is terminal even with a rear contact hint', () => {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  const race = createRaceSession(game, { seats });
  const player = race.session.players[0];
  assert.equal(player.health, 3);
  game.end('Dependency diagnostic: end is not a nonfatal damage API.', 'traffic', 'rear');
  assert.equal(player.health, 0);
  assert.equal(player.state, 'dead');
  assert.equal(player.deathCause, 'traffic');
});
