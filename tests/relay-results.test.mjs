import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';
const sources = await loadSources(['game', 'relay']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { createRelaySession } = await sources.import('relay');
function setup(length = 2) {
  const game = new Game(121, 'pond', 'stroll', false, [], 'butter');
  const relay = createRelaySession(game, { seats: [{ seat: 'p1', characterId: 'butter', device: 'keyboard-a' }, { seat: 'p2', characterId: 'pip', device: 'keyboard-b' }], tilesPerLeg: length });
  for (const [row,lane] of game.rows) game.rows.set(row, { ...lane, kind: 'meadow', blocked: [], decorations: [], actors: undefined, coin: null });
  return { game, relay, session: relay.session };
}
function hop(run) {
  const p = run.session.players.find(p => p.seat === run.relay.activeSeat);
  run.game.rows.set(p.y + 1, { ...generateLane(run.game.seed,p.y+1,run.game.home), kind:'meadow', blocked:[], decorations:[], coin:null });
  assert.equal(run.session.dispatch({ seat:p.seat, direction:'forward' }),true);
  for(let i=0;i<120 && p.hop>0;i++) run.session.update(1/120);
}
test('production handoff closes an immutable leg with authoritative distance and active time', () => {
  const run=setup(); hop(run); hop(run);
  assert.equal(run.relay.confirm(run.relay.confirmation()),true);
  const leg=run.relay.history.legs[0];
  assert.equal(leg.distance,2); assert.equal(leg.outcome,'complete'); assert.ok(leg.duration>0); assert.equal(leg.seat,'p1'); assert.ok(Object.isFrozen(leg));
});
test('actual fatal transaction appends its leg before inventory clear, then recovery opens a new credited leg', () => {
  const run=setup(50); hop(run); run.game.awardCoins(3.5);
  const originalClear=run.game.run.clear.bind(run.game.run); let observed;
  run.game.run.clear=()=>{ observed=run.relay.history?.legs.at(-1); originalClear(); };
  run.game.end('Fixture fatal train','train');
  assert.ok(observed,'the immutable death leg must exist before RunInventory.clear');
  assert.equal(observed.outcome,'dead'); assert.equal(observed.coins,run.game.coins); assert.equal(observed.distance,1);
  run.session.update(1/120); assert.equal(run.session.recover({kind:'personal',ownerSeat:'p1'}),true);
  run.session.depart('p1'); run.session.depart('p2');
  assert.equal(run.relay.result.contributions[0].selfRevives,1); assert.equal(run.relay.result.contributions[0].deaths,1);
});
