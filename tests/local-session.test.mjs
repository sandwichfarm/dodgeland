import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session']);
const { Game } = await sources.import('game');
const { LocalSession } = await sources.import('session');

function meadowRows(game) {
  for (const lane of game.rows.values()) {
    lane.kind = 'meadow';
    lane.blocked = [];
    lane.coin = null;
    lane.coinActor = null;
    lane.actors = undefined;
  }
}

function pondStroll() {
  const game = new Game(71, 'pond', 'stroll', false, [], 'pip');
  game.ensureRows();
  meadowRows(game);
  const session = LocalSession.stage(game, { secondaryCharacterId: 'pip' }).commit();
  const p1 = session.players.find(player => player.seat === 'p1');
  const p2 = session.players.find(player => player.seat === 'p2');
  assert.ok(p1); assert.ok(p2);
  p1.x = p1.fromX = 2; p1.y = p1.fromY = 0;
  p2.x = p2.fromX = 0; p2.y = p2.fromY = 0;
  game.rows.get(0).coin = 0;
  return { game, session, p1, p2 };
}

test('reentrant P2 reward callback dispatches P1 through its explicit operation context', () => {
  const { game, session, p1, p2 } = pondStroll();
  p2.onCoin = () => { assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true); };
  session.update(0);
  assert.equal(p1.y, 1, 'the P1 dispatch uses P1 state inside P2 callback re-entry');
  assert.equal(p2.y, 0, 'P2 does not consume P1 reentrant input');
  assert.equal(game.rows.get(0).coin, null);
});

test('P2 progress invokes its typed onHeal callback once without facade callback crashes', () => {
  const { game, session, p2 } = pondStroll();
  p2.earnedDistance = 99; p2.maxY = p2.y = p2.fromY = 99; p2.health = 2;
  game.world.noteProgress(99); game.ensureRows(); meadowRows(game);
  let heals = 0;
  p2.onHeal = amount => { heals += amount; };
  assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), true);
  assert.equal(heals, .5);
  assert.equal(p2.health, 2.5);
});
