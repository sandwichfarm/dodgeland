import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'relay']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { createRelaySession } = await sources.import('relay');
const STEP = 1 / 120;

function courseLane(game, row, extra = {}) {
  const lane = { ...generateLane(game.seed, row, game.home), kind: 'meadow',
    blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined,
    phase: 0, speed: 0, spacing: 20, length: 1.15, variant: 0, ...extra };
  game.rows.set(row, lane);
  return lane;
}

test('a fatal boundary landing resolves the existing personal recovery before any transfer', () => {
  const game = new Game(121, 'pond', 'stroll', false, [], 'butter');
  for (const row of game.rows.keys()) courseLane(game, row);
  const relay = createRelaySession(game, { seats: [
    { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
    { seat: 'p2', characterId: 'pip', device: 'keyboard-b' },
  ], tilesPerLeg: 1 });
  const session = relay.session, player = session.players[0], world = session.world;
  player.powerReadyAt = 10000; // Fixture: innate water rescue is already on cooldown.
  session.update(STEP);
  const safe = { x: player.groundX, y: player.groundY };
  assert.equal(player.recovery.charge, 'available');
  courseLane(game, 1, { kind: 'river', phase: 10, length: 1 });
  assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  for (let tick = 0; tick < 120 && player.state !== 'dead'; tick++) session.update(STEP);
  assert.equal(player.state, 'dead', 'the real unsupported river landing must kill');
  assert.equal(player.participation, 'dead');
  assert.equal(player.statistics.deaths, 1);
  assert.equal(player.run.alive, false, 'production death clears only the dead run');
  assert.equal(relay.snapshot().phase, 'running', 'fatal hazard wins over handoff');
  assert.equal(player.completedForwardTiles, 0, 'fatal unfinished movement cannot earn revival tiles');
  assert.equal(session.players[1].run.alive, true);
  assert.strictEqual(session.world, world);
  assert.ok(player.recovery.offer, 'a charged dead active runner needs the delivered personal-recovery offer');
  assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
  assert.equal(player.state, 'playing');
  assert.deepEqual({ x: player.groundX, y: player.groundY }, safe);
  assert.equal(player.recovery.charge, 'spent');
  assert.equal(relay.snapshot().phase, 'running');
});
