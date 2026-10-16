import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'race']);
after(sources.dispose);
const { Game } = await sources.import('game');
const { createRaceSession } = await sources.import('race');
function start() {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  const race = createRaceSession(game, { seats: [
    { seat: 'p1', characterId: 'butter', device: 'gamepad-0' },
    { seat: 'p2', characterId: 'pip', device: 'gamepad-1' },
  ] });
  return { game, race, session: race.session };
}

test('disconnect dependency control: living ghost preserves its economy and another racer advances the clock', () => {
  const { race, session } = start();
  const owner = session.players[0]; owner.run.creditCoins(17);
  const before = { wallet: owner.run.wallet, health: owner.health, deaths: owner.statistics.deaths, recovery: owner.recovery };
  assert.equal(session.deviceLost('p1'), true);
  session.update(1 / 120);
  assert.equal(owner.participation, 'device-lost'); assert.ok(race.elapsed > 0);
  assert.deepEqual({ wallet: owner.run.wallet, health: owner.health, deaths: owner.statistics.deaths, recovery: owner.recovery }, before);
});

test('disconnect dependency: dead original seat reserves replacement authority without reviving or clearing its offer', () => {
  const { game, session } = start();
  const owner = session.players[0]; owner.run.creditCoins(17);
  // Actual delivered death transaction on the generated course. No health,
  // participation, recovery, position, terrain or clock injection.
  game.end('Lifecycle dependency reproduction', 'train'); session.update(1 / 120);
  assert.equal(owner.participation, 'dead'); assert.equal(owner.statistics.deaths, 1);
  assert.equal(owner.run.wallet, 0); assert.ok(owner.recovery.offer);
  const before = { health: owner.health, wallet: owner.run.wallet, deaths: owner.statistics.deaths,
    offer: owner.recovery.offer, charge: owner.recovery.charge, protection: owner.recovery.protectionUntil };
  const accepted = session.deviceLost('p1');
  console.log('dead-seat device-loss observation', JSON.stringify({ accepted, participation: owner.participation,
    device: owner.device, offer: owner.recovery.offer, lifecycle: session.lifecycle.map(e => e.type) }));
  assert.equal(accepted, true, 'shared device lifecycle must retain a disconnected dead seat without changing its death/recovery state');
  assert.equal(owner.participation, 'dead');
  assert.deepEqual({ health: owner.health, wallet: owner.run.wallet, deaths: owner.statistics.deaths,
    offer: owner.recovery.offer, charge: owner.recovery.charge, protection: owner.recovery.protectionUntil }, before);
});
