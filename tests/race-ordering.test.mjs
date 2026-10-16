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
const step=1/120;
// Authored model arena isolates policy from incidental terrain hazards. Balance
// and browser proofs use the generated course separately.
function arena(options={}) {
  const game=new Game(113,'pond','arcade',false,[],'butter');
  const race=createRaceSession(game,{seats,...options});
  for(let y=-8;y<600;y++) game.rows.set(y,{...game.rows.get(0),index:y,kind:'meadow',blocked:[],decorations:[],coin:null});
  return race;
}
function ticks(race,n) {for(let i=0;i<n;i++) race.session.update(step);}
function hop(race,seat,direction='forward') {
  assert.equal(race.session.dispatch({seat,direction}),true);
  const player=race.session.players.find(p=>p.seat===seat);
  for(let i=0;i<120&&player.hop>0;i++) race.session.update(step);
}
test('frontier and fog boundary preserve accepted movement across death and permutation',()=>{
  for(const reverse of [false,true]) {
    const race=arena(); if(reverse) race.session.players.reverse();
    hop(race,'p1'); hop(race,'p1','back');
    assert.equal(race.leaderFrontier,1); assert.equal(race.fogBoundary,-11);
    assert.equal(race.session.dispatch({seat:'p1',direction:'forward'}),true);ticks(race,40);
    assert.equal(race.leaderFrontier,1);
    race.session.dispatch({seat:'p1',direction:'forward'});
    race.session.world.host.end('Fatal same-tick hazard.','train');ticks(race,1);
    assert.equal(race.leaderFrontier,2);assert.equal(race.fogBoundary,-10);
    assert.equal(race.isFinished('p1'),false);
    assert.ok(Object.isFrozen(race.movementLedger));assert.ok(race.movementLedger.every(Object.isFrozen));
  }
});
test('actual ground strict line cadence uses health pipeline and resets exposure',()=>{
  const race=arena(); for(let i=0;i<12;i++) hop(race,'p1');
  assert.equal(race.fogBoundary,0);ticks(race,240);
  assert.equal(race.fogState('p2').attempts,0,'exact line is safe');
  hop(race,'p1');ticks(race,122);
  assert.equal(race.fogState('p2').attempts,1);assert.equal(race.session.players[1].health,2);
  hop(race,'p2');assert.equal(race.fogState('p2').exposure,0);
  hop(race,'p2','back'); ticks(race,30);
  assert.ok(race.fogState('p2').exposure>0,'backtrack uses ground, not previous high water');
  race.protectFog('p2',3);ticks(race,120);assert.equal(race.fogState('p2').exposure,0);
});
test('forced placement and rejected movement cannot credit frontier or finish',()=>{
  const race=arena();const p=race.session.players[1];
  const before=[p.personalScore,p.completedForwardTiles,p.powerRemaining,p.recovery.personalHighWater];
  assert.equal(race.session.placeTurnPosition('p2',{x:0,y:200}),true);ticks(race,1);
  assert.equal(race.leaderFrontier,0);assert.equal(race.isFinished('p2'),false);
  assert.deepEqual([p.personalScore,p.completedForwardTiles,p.powerRemaining,p.recovery.personalHighWater],before);
  race.session.dispatch({seat:'p2',direction:'forward'});
  assert.equal(race.session.dispatch({seat:'p2',direction:'forward'}),false);ticks(race,40);
  assert.equal(race.leaderFrontier,1);
});

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
