import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'race', 'session', 'mode-rules', 'survive-together']);
after(sources.dispose);
const { Game } = await sources.import('game');
const { createRaceSession } = await sources.import('race');

test('common world dependency: Race installation must not grant legacy Revival capacity', () => {
  const game = new Game(3338952125, 'pond', 'arcade', false, [], 'butter');
  const race = createRaceSession(game, { seats: [
    { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
    { seat: 'p2', device: 'keyboard-b', characterId: 'pip' },
  ] });
  // Exercise the delivered common opt-in, not a replacement pickup implementation.
  race.session.installConsumableWorld();
  const pickup = race.session.consumableSnapshot().pickups.find(p => p.itemId === 'revival');
  assert.ok(pickup, 'released seed provides a known legacy pickup for this dependency reproduction');
  const owner = race.session.players[0];
  owner.x = owner.fromX = pickup.x;
  owner.y = owner.fromY = pickup.y;
  owner.hop = 0;
  race.session.update(1 / 120);
  const state = race.session.consumableSnapshot();
  assert.equal(state.charges.find(p => p.seat === 'p1').revival, 0,
    'the common world must apply its installed mode capability rather than hardcoded Survive eligibility');
  assert.equal(state.claims.length, 0, 'a denied legacy claim must leave pickup and owner statistics unchanged');
  assert.equal(owner.statistics.itemsFound, 0);
});

test('common world dependency control: released Survive pickup still grants its owner once', async () => {
  const { LocalSession } = await sources.import('session');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');
  const game = new Game(3338952125, 'pond', 'arcade', false, [], 'butter');
  const session = LocalSession.stage(game, { roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'pip' }], mode: createSurviveTogetherDefinition(SOLO_ARCADE_MODE) }).commit();
  const pickup = session.consumableSnapshot().pickups.find(p => p.itemId === 'revival');
  const owner = session.players[0];
  owner.x = owner.fromX = pickup.x;
  owner.y = owner.fromY = pickup.y;
  owner.hop = 0;
  session.update(1 / 120);
  assert.equal(session.consumableSnapshot().charges.find(p => p.seat === 'p1').revival, 1);
  assert.equal(session.consumableSnapshot().claims.length, 1);
  assert.equal(owner.statistics.itemsFound, 1);
});
