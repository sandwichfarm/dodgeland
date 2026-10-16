import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadSources} from './source-loader.mjs';
const sources=await loadSources(['game','race']);after(sources.dispose);
const {Game,laneActors,vehicleBounds,sweptVehicleContact,platformSupports,laneDirection}=await sources.import('game');
const {createRaceSession,RACE_PRESSURE}=await sources.import('race');
const STEP=1/120;
function safe(game,p,direction) {
  const x=p.x+(direction==='left'?-1:direction==='right'?1:0),y=p.y+(direction==='forward'?1:direction==='back'?-1:0);
  const lane=game.rows.get(y),duration=game.rules.movement.hopDuration,n=Math.ceil(duration/STEP);
  if(!lane||Math.abs(x)>5||lane.blocked.includes(Math.round(x)))return false;
  if(lane.kind==='river'&&!platformSupports(lane,x,game.time+n*STEP))return false;
  let px=p.x,py=p.y;
  for(let i=1;i<=n;i++){
    const t=Math.min(1,i*STEP/duration),nx=p.x+(x-p.x)*t,ny=p.y+(y-p.y)*t;
    for(const row of game.rows.values()){
      if(!['road','rail'].includes(row.kind)||Math.abs(row.index-ny)>1.6)continue;
      for(const actor of laneActors(row,game.time+i*STEP,game.time+(i-1)*STEP)){
        const bounds=row.kind==='rail'?{minX:-6,maxX:6,minY:-.36,maxY:.36}:vehicleBounds(row,actor);
        if(sweptVehicleContact(px-actor.previousX,py-row.index,nx-actor.x,ny-row.index,bounds,laneDirection(row),.23))return false;
      }
    }
    if(game.mobs.some(m=>Math.hypot(m.x-nx,m.y-ny)<1))return false;
    px=nx;py=ny;
  }
  return true;
}
function run(seed,count,reverse){
  const game=new Game(seed,'pond','arcade',false,[],'butter');
  const seats=['butter','pip','sunny','petal'].slice(0,count).map((characterId,i)=>({seat:`p${i+1}`,characterId,device:i<2?`keyboard-${i?'b':'a'}`:`gamepad-${i-2}`}));
  const race=createRaceSession(game,{seats:reverse?[...seats].reverse():seats});
  if(reverse)race.session.players.reverse();
  const choices=new Map(),recovered=new Set(),backtracks=new Map();
  for(let tick=0;tick<21602&&!race.result;tick++){
    for(const p of [...race.session.players].sort((a,b)=>a.seat.localeCompare(b.seat))){
      if(p.state==='dead'&&p.recovery?.offer&&!recovered.has(p.seat)){
        if(race.session.recover({kind:'personal',ownerSeat:p.seat}))recovered.add(p.seat);
      }
      if(p.state!=='playing'||p.hop>0||p.powerRescue||race.isFinished(p.seat))continue;
      const index=Number(p.seat.slice(1))-1;
      if(index===1&&tick%24>=17)continue; // close trailer: deliberate slower cadence
      if(index===3&&tick<400)continue; // recovery profile: gives leader a head start
      const backtrack=index===2&&p.completedForwardTiles>0&&p.completedForwardTiles%40===0&&!choices.get(`${p.seat}:${p.completedForwardTiles}`);
      const preferred=backtrack?['back','forward','left','right']:['forward',...(p.x>0?['left','right']:['right','left'])];
      const direction=preferred.find(d=>safe(game,p,d));
      if(direction){const accepted=race.session.dispatch({seat:p.seat,direction});if(accepted&&direction==='back'){choices.set(`${p.seat}:${p.completedForwardTiles}`,true);backtracks.set(p.seat,(backtracks.get(p.seat)??0)+1);}}
    }
    race.session.update(STEP);
  }
  return {seed,count,course:race.descriptor.runSeed,pressure:race.descriptor.pressure,outcome:race.result?.outcome,elapsed:race.elapsed,players:[...race.session.players].sort((a,b)=>a.seat.localeCompare(b.seat)).map(p=>({seat:p.seat,distance:p.completedForwardTiles,finished:race.isFinished(p.seat),finishTick:race.finishTick(p.seat)??null,health:p.health,cause:p.deathCause,revives:p.statistics.selfRevives,backtracks:backtracks.get(p.seat)??0,...race.fogState(p.seat)}))};
}
test('default 500/180 pressure balance is deterministic across 2–4 racers and roster permutations',{timeout:120000},async()=>{
  const report=[];
  for(const count of [2,3,4])for(const seed of [113,121]){
    const original=run(seed,count,false),repeat=run(seed,count,false),reversed=run(seed,count,true);
    assert.deepEqual(repeat,original);assert.deepEqual(reversed,original);report.push(original);
  }
  await mkdir(new URL('../artifacts/race/',import.meta.url),{recursive:true});
  await writeFile(new URL('../artifacts/race/balance.json',import.meta.url),JSON.stringify({version:'race-balance-1',profiles:['leader','close trailer','backtracker','recovery'],runs:report},null,2));
  assert.deepEqual(RACE_PRESSURE,{version:'race-pressure-1',buffer:12,interval:1,damage:1});
  assert.ok(report.every(r=>r.players[0].finished&&r.elapsed>=90&&r.elapsed<=120),'every leader reaches the default finish within measured playable bounds');
  assert.ok(report.filter(r=>r.count>=3).every(r=>r.players[2].backtracks>0),'backtracker profile executes real backward inputs');
  assert.ok(report.every(r=>r.players.some(p=>p.revives>0)),'each scenario exercises actual personal recovery');
  assert.ok(report.some(r=>r.players.some(p=>p.attempts>0&&p.landed>0)),'lagging profiles experience actual fog health pressure');
  assert.ok(report.every(r=>r.elapsed<=180+STEP));
});
