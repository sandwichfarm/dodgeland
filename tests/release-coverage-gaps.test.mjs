import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session']);
after(() => sources.dispose());
const { Game, actorPositions } = await sources.import('game');
const { LocalSession } = await sources.import('session');

function setup() {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  const session = LocalSession.stage(game, {
    primaryDevice: 'gamepad-0',
    roster: [{ seat: 'p2', device: 'gamepad-1', characterId: 'pip' }],
  }).commit();
  return { game, session };
}

function state(session) {
  return JSON.stringify({
    time: session.world.time, lifecycle: session.lifecycle,
    players: session.players.map(p => ({
      seat: p.seat, participantId: p.participantId, device: p.device,
      participation: p.participation, state: p.state, deviceLostAt: p.deviceLostAt,
      x: p.x, y: p.y, health: p.health, score: p.personalScore,
      wallet: p.run.wallet, cards: p.run.cards, recovery: p.recovery,
      statistics: p.statistics,
    })),
  });
}

test('reclaim rejects cross-session and forged original-device tickets without mutating either traveler', () => {
  const { session } = setup(), other = setup().session;
  assert.notEqual(session.id, other.id, 'same-seed sessions have distinct lifecycle identities');
  assert.notEqual(session.players[1].participantId, other.players[1].participantId);
  assert.deepEqual([...session.world.rows], [...other.world.rows], 'lifetime allocation preserves seeded terrain and actors');
  assert.equal(session.world.time, other.world.time);
  assert.equal(session.deviceLost('p2'), true);
  assert.equal(other.deviceLost('p2'), true);
  const ticket = session.deviceReclaimToken('p2');
  assert.ok(ticket); assert.ok(Object.isFrozen(ticket));
  for (const invalid of [other.deviceReclaimToken('p2'), { ...ticket, device: 'gamepad-9' }, { ...ticket, seat: 'p1' }]) {
    const before = state(session), otherBefore = state(other);
    assert.equal(session.reclaim('p2', 'gamepad-9', invalid), false);
    assert.equal(state(session), before);
    assert.equal(state(other), otherBefore);
  }
  assert.equal(session.reclaim('p2', 'gamepad-9', ticket), true);
  assert.equal(session.players[1].device, 'gamepad-9');
  assert.equal(session.players[1].participation, 'active');
  assert.equal(session.players[0].device, 'gamepad-0');
  const settled = state(session);
  assert.equal(session.reclaim('p2', 'gamepad-8', ticket), false);
  assert.equal(state(session), settled, 'consumed ticket cannot rebind a second time');
});

test('lifetime allocation does not consume course generation or inventory randomness', () => {
  const first = setup(), second = setup();
  for (const { game, session } of [first, second]) {
    session.world.noteProgress(120);
    game.ensureRows();
    for (const player of session.players) player.run.advanceScore(100);
  }
  assert.deepEqual([...first.session.world.rows], [...second.session.world.rows]);
  const firstActors = [...first.session.world.rows.values()].map(lane => actorPositions(lane, 20));
  const secondActors = [...second.session.world.rows.values()].map(lane => actorPositions(lane, 20));
  assert.ok(firstActors.some(actors => actors.length > 0));
  assert.deepEqual(firstActors, secondActors, 'future actors retain exact seeded positions');
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(first.session.players[i].run.market, second.session.players[i].run.market);
    assert.deepEqual(first.session.players[i].run.cards, second.session.players[i].run.cards);
  }
});
