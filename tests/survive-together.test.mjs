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

  for (let step = 0; step < 249; step++) session.recordPersonalProgress(player, player.earnedDistance + 1);
  assert.equal(player.recovery?.charge, 'spent');
  session.recordPersonalProgress(player, player.earnedDistance + 1);
  assert.equal(player.recovery?.charge, 'available');
  session.recordPersonalProgress(player, player.earnedDistance + 1);
  assert.equal(player.recovery?.charge, 'available');
});
