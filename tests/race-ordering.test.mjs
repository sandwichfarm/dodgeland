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
test('same-tick tie and finish before timeout are permutation independent and terminal immutable',()=>{
  for(const reverse of [false,true]) {
    const race=arena({finishTiles:1,activeSeconds:30});if(reverse)race.session.players.reverse();
    ticks(race,3600-17);
    for(const seat of ['p1','p2'])assert.equal(race.session.dispatch({seat,direction:'forward'}),true);
    ticks(race,16);assert.equal(race.result,undefined);ticks(race,1);
    assert.equal(race.result.outcome,'finish');assert.deepEqual(race.result.winners,['p1','p2']);
    assert.equal(race.finishTick('p1'),race.finishTick('p2'));
    const result=race.result,time=race.session.world.time;ticks(race,100);
    assert.equal(race.session.world.time,time);assert.strictEqual(race.result,result);
    assert.equal(race.session.dispatch({seat:'p1',direction:'forward'}),false);
  }
});
test('fatal before finish retains earned frontier but no finish; last survivor continues',()=>{
  const race=arena({finishTiles:1});
  race.session.dispatch({seat:'p1',direction:'forward'});
  race.session.world.host.end('Fatal hazard before landing.','train');ticks(race,17);
  assert.equal(race.isFinished('p1'),false);assert.equal(race.leaderFrontier,1);
  assert.equal(race.result,undefined);assert.ok(race.session.players[0].recovery.offer);
  race.session.declineRecovery('p1');assert.equal(race.result,undefined);
  hop(race,'p2');assert.equal(race.result.outcome,'finish');assert.deepEqual(race.result.winners,['p2']);
});
test('all down timeout closes offers before terminal immutable snapshot',()=>{
  const race=arena({activeSeconds:30});ticks(race,3480);
  for(const seat of ['p1','p2'])race.session.damage(seat,{cause:'fog',amount:3,reason:'Fatal pressure.'});
  assert.ok(race.session.players.every(p=>p.recovery.offer));
  const time=race.session.world.time;ticks(race,60);assert.ok(race.session.world.time>time);assert.equal(race.result,undefined);
  ticks(race,61);assert.equal(race.result.outcome,'time');
  assert.ok(race.session.players.every(p=>!p.recovery.offer));
  assert.deepEqual(race.recoveryClosures.map(e=>e.reason),['race-timeout','race-timeout']);
  assert.equal(race.session.recover({kind:'personal',ownerSeat:'p1'}),false);
});
test('all down accept decline expiry and suspension preserve active clocks',()=>{
  for(const action of ['accept','decline','expiry']) {
    const race=arena();for(const seat of ['p1','p2'])race.session.damage(seat,{cause:'fog',amount:3,reason:'Fatal pressure.'});
    ticks(race,60);assert.equal(race.result,undefined);
    if(action==='accept') {
      assert.equal(race.session.recover({kind:'personal',ownerSeat:'p1'}),true);
      assert.equal(race.session.players[0].completedForwardTiles,0);
      ticks(race,1000);assert.equal(race.result,undefined,'last living racer continues');
    }else {
      if(action==='decline')for(const seat of ['p1','p2'])race.session.declineRecovery(seat);
      ticks(race,action==='expiry'?1000:1);assert.equal(race.result.outcome,'eliminated');
    }
  }
  const race=arena();const game=race.session.world.host;
  game.pause();const time=game.time;ticks(race,600);assert.equal(game.time,time);assert.equal(race.elapsed,0);
  game.resume();ticks(race,1);assert.ok(race.elapsed>0&&race.elapsed<.01);
});
test('cadence attempts differ from landed losses under immunity and recovery protection',()=>{
  const race=arena();for(let i=0;i<13;i++)hop(race,'p1');
  const p=race.session.players[1];p.hurtRemaining=3;
  ticks(race,120);assert.equal(race.fogState('p2').attempts,1);assert.equal(race.fogState('p2').landed,0);
  race.session.updateRecovery(p,r=>({...r,protectionUntil:race.session.world.time+2}));
  ticks(race,120);assert.equal(race.fogState('p2').attempts,1);assert.equal(race.fogState('p2').exposure,0);
  race.session.deviceLost('p2');ticks(race,240);assert.equal(race.fogState('p2').attempts,1);
  assert.equal(race.leaderFrontier,13);assert.equal(race.fogBoundary,1);
});
test('fatal before finish actual unsupported water and traffic settle before qualifying landing',()=>{
  for(const cause of ['water','traffic']) {
    const race=arena({finishTiles:1}),game=race.session.world.host,p=race.session.players[0];
    p.powerReadyAt=10000;
    if(cause==='traffic'){race.session.damage('p1',{cause:'fog',amount:2,reason:'Prior damage.'});ticks(race,121);}
    game.rows.set(1,{...game.rows.get(1),kind:cause==='water'?'river':'road',phase:cause==='water'?10:0,speed:0,length:1.15,spacing:30,variant:0});
    assert.equal(race.session.dispatch({seat:'p1',direction:'forward'}),true);
    for(let i=0;i<60&&p.state==='playing';i++)race.session.update(step);
    assert.equal(p.deathCause,cause);assert.equal(race.isFinished('p1'),false);
    assert.equal(race.leaderFrontier,1);
  }
});
test('all-controller suspension freezes ordinary clocks and reclaim adds no frontier',()=>{
  const race=arena();hop(race,'p1');
  for(const seat of ['p1','p2'])race.session.deviceLost(seat);
  const time=race.session.world.time,frontier=race.leaderFrontier;
  ticks(race,600);assert.equal(race.session.world.time,time);assert.equal(race.leaderFrontier,frontier);
  race.session.reclaim('p2','keyboard-b');ticks(race,1);assert.ok(race.session.world.time>time);
  assert.equal(race.leaderFrontier,frontier);assert.equal(race.session.players[1].completedForwardTiles,0);
});
test('cadence exact fixed-step intervals land one feather each without floating immunity drift',()=>{
  const race=arena();for(let i=0;i<13;i++)hop(race,'p1');
  const p=race.session.players[1];
  while(race.fogState('p2').attempts<1)ticks(race,1);
  assert.equal(p.health,2);ticks(race,120);
  assert.equal(race.fogState('p2').attempts,2);assert.equal(race.fogState('p2').landed,2);
  ticks(race,120);assert.equal(p.state,'dead');assert.equal(p.deathCause,'fog');
  assert.equal(race.fogState('p2').landed,3);assert.ok(p.recovery.offer);
});
test('cadence ghost exposure freezes until reclaim; carried drift earns no frontier',()=>{
  const race=arena();for(let i=0;i<13;i++)hop(race,'p1');ticks(race,30);
  const p=race.session.players[1],exposure=race.fogState('p2').exposure;
  assert.ok(exposure>0);race.session.deviceLost('p2');ticks(race,100);
  assert.equal(race.fogState('p2').exposure,exposure);
  race.session.reclaim('p2','keyboard-b');ticks(race,1);
  assert.ok(race.fogState('p2').exposure>exposure);
  const carried=arena(),q=carried.session.players[1],game=carried.session.world.host;
  game.rows.set(0,{...game.rows.get(0),kind:'river',phase:0,speed:.1,length:20,spacing:30});
  const before=q.x;ticks(carried,60);assert.notEqual(q.x,before);assert.equal(carried.leaderFrontier,0);
  assert.equal(q.personalScore,0);assert.equal(q.completedForwardTiles,0);
});
test('fatal before finish delivered train wave and mob transactions win on the landing tick',()=>{
  for(const cause of ['train','wave','mob']) {
    const race=arena({finishTiles:1}),game=race.session.world.host;
    race.session.dispatch({seat:'p1',direction:'forward'});ticks(race,16);
    game.end('Fatal delivered hazard.',cause);ticks(race,1);
    assert.equal(race.session.players[0].deathCause,cause);
    assert.equal(race.isFinished('p1'),false);assert.equal(race.session.players[0].completedForwardTiles,0);
    assert.equal(race.leaderFrontier,1);
  }
});
test('finish before timeout preserves an earlier finisher while the other racer continues',()=>{
  const race=arena({finishTiles:1,activeSeconds:30});ticks(race,3582);
  hop(race,'p1');assert.equal(race.result,undefined);
  ticks(race,1);assert.equal(race.result.outcome,'time');assert.deepEqual(race.result.winners,['p1']);
  assert.equal(race.session.dispatch({seat:'p2',direction:'forward'}),false);
  assert.equal(race.finishTick('p2'),undefined);
});
