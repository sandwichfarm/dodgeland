import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

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

test('only committed Survive installs a deterministic session-owned pickup world', async () => {
  const { Game } = await sources.import('game');
  const solo = new Game(3338952125, 'pond');
  assert.equal(solo.worldExtensionSnapshot(), undefined, 'ordinary Arcade keeps no world extension state');

  const { game, session } = await survive();
  const world = session.consumableSnapshot();
  assert.ok(world, 'committed Survive attaches its owned item world');
  assert.equal(world.pickups.length, 1);
  assert.deepEqual(world.pickups[0], {
    id: 'item-drop-schema-1-c7045dbd-1-0-revival', itemId: 'revival', row: 1, slot: 0, x: 0, y: 1,
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
