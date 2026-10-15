import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
import { semanticValue } from './solo-parity-snapshot.mjs';

const sources = await loadSources(['game', 'session', 'session-recovery', 'survive-together']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { LocalSession } = await sources.import('session');
const { SessionRecoveryController } = await sources.import('session-recovery');
const { createSurviveTogetherDefinition } = await sources.import('survive-together');
const STEP = 1 / 120;
function setup(mode, generic) {
  const game = new Game(121, 'pond', mode, false, [], 'butter');
  for (const row of game.rows.keys()) game.rows.set(row, { ...generateLane(game.seed, row, game.home), kind: 'meadow', blocked: [], decorations: [], coin: null });
  const recovery = new SessionRecoveryController();
  const definition = generic ? { definition: game.definition, handlers: {
    attach: session => recovery.attach(session), death: record => recovery.death(record.seat),
    pending: session => recovery.pending(session), tick: session => recovery.tick(session), recover: (session, request) => recovery.recover(session, request),
  } } : createSurviveTogetherDefinition(game.definition);
  const session = LocalSession.stage(game, { roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'pip' }], mode: definition }).commit();
  return { game, session, player: session.players[1] };
}
function advance(session, seconds) { for (let elapsed = 0; elapsed < seconds - 1e-10; elapsed += STEP) session.update(Math.min(STEP, seconds - elapsed)); }
function snapshot(player) { return semanticValue({ state: player.state, participation: player.participation, recovery: player.recovery, run: player.run, health: player.health, statistics: player.statistics, x: player.x, y: player.y, maxY: player.maxY, completed: player.completedForwardTiles, score: player.personalScore }); }

for (const mode of ['arcade', 'stroll']) for (const outcome of ['accept', 'decline', 'expire']) test(`${mode}: extracted personal recovery preserves Survive ${outcome} lifecycle`, () => {
  const states = [setup(mode, false), setup(mode, true)];
  for (const { game, session, player } of states) {
    player.powerReadyAt = 10000;
    session.update(STEP); game.rows.set(1, { ...game.rows.get(1), kind: 'river', phase: 10, speed: 0, spacing: 20, length: 1, variant: 0 });
    assert.equal(player.move('forward'), true); for (let tick = 0; tick < 120 && player.state !== 'dead'; tick++) session.update(STEP);
    assert.equal(player.state, 'dead');
    assert.ok(player.recovery.offer);
    assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), false);
    game.pause(); const time = session.world.time; advance(session, 1); assert.equal(session.world.time, time); game.resume();
    if (outcome === 'accept') { assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p2' }), true); assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p2' }), false); }
    if (outcome === 'decline') { assert.equal(session.declineRecovery('p2'), true); assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p2' }), false); }
    if (outcome === 'expire') { advance(session, 8.1); assert.equal(player.recovery.offer, undefined); assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p2' }), false); }
  }
  assert.deepEqual(snapshot(states[1].player), snapshot(states[0].player));
  const generic = states[1].session;
  let debits = 0;
  for (const kind of ['revival', 'flare']) assert.equal(generic.recover({ kind, ownerSeat: 'p1', targetSeat: 'p2', debit: () => { debits++; return true; } }), false);
  assert.equal(debits, 0);
  assert.equal(generic.consumableSnapshot(), undefined);
  assert.equal(generic.coOpMarket, undefined);
  assert.equal(generic.sharedEffectPolicy, false);
  assert.equal(generic.result, undefined, 'shared service cannot install mode results');
});
