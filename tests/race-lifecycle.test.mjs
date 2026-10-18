import assert from 'node:assert/strict';
import {turnReuseAttribution} from './turn-reuse-attribution.mjs';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
import { createMarketGameFixture, sessionHudAction } from './market-game-fixture.mjs';

const sources = await loadSources(['game', 'race', 'session-input']);
after(sources.dispose);
const { Game } = await sources.import('game');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const authority={Game,...await sources.import('session'),...await sources.import('mode-rules')};
const reuse=await turnReuseAttribution({authority,mode:'race',factory:createRaceSession,Coordinator:RaceCoordinator,lifetimes:13});
after(()=>reuse.finish());
const { GamepadRouter } = await sources.import('session-input');
for(const choice of ['accept','decline','expiry'])test(`built actual traffic death personal offer ${choice} through visible Race controls`,{timeout:40000},async()=>{
  const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{sender:'race-lifecycle-proof',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed:'ph3-00000071-pond-s-n'}}});
  try{
    await app.frame.locator('#local-play').click();await app.frame.locator('#race-play').click();await app.frame.locator('#local-session-start').click();await app.advance(80);
    const read=()=>app.onSession(function(){const p=this.players[0];return {state:p.state,participation:p.participation,kind:this.world.rows.get(Math.round(p.groundY))?.kind,hop:p.hop,offer:p.recovery.offer,charge:p.recovery.charge,deaths:p.statistics.deaths,otherDeaths:this.players[1].statistics.deaths,time:this.world.time};});
    for(let i=0;i<40;i++){
      const p=await read();if(p.state==='dead'||p.kind==='road')break;
      await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);
    }
    for(let i=0;i<120&&(await read()).state!=='dead';i++)await app.advance(250);
    const dead=await read();assert.equal(dead.state,'dead');assert.ok(dead.offer);assert.equal(dead.deaths,1);
    const button=app.frame.locator('[data-seat="p1"] [data-session-hud="revive"]');assert.equal(await button.isEnabled(),true);
    await app.iframe.screenshot({path:`/tmp/race-05-03-recovery-${choice}.png`});
    if(choice==='accept')await sessionHudAction(app,'p1','revive');
    else if(choice==='decline')await sessionHudAction(app,'p1','decline');
    else await app.advance(8500);
    await app.advance(80);const after=await read();assert.equal(after.deaths,1);assert.equal(after.otherDeaths,dead.otherDeaths);assert.equal(after.offer,undefined);
    assert.equal(after.state,choice==='accept'?'playing':'dead');if(choice==='accept')assert.equal(after.charge,'spent');
    assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await app.frame.evaluate(()=>window.marketGameFixture.forbidden),[]);
  }finally{await app.close();}
});
function ticks(session,n) { for(let i=0;i<n;i++) session.update(1/120); }
function meadow(run){for(let y=-8;y<600;y++)run.game.rows.set(y,{...run.game.rows.get(0),index:y,kind:'meadow',blocked:[],decorations:[],coin:null});return run;}
function hop(session,seat,direction='forward'){assert.equal(session.dispatch({seat,direction}),true);const p=session.players.find(p=>p.seat===seat);for(let i=0;i<120&&p.hop>0;i++)session.update(1/120);}
function start(witness) {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  const race = (witness? witness.acquire : createRaceSession)(game, { seats: [
    { seat: 'p1', characterId: 'butter', device: 'gamepad-0' },
    { seat: 'p2', characterId: 'pip', device: 'gamepad-1' },
  ] });
  return { game, race, session: race.session };
}
function trackedStart() {
  const witness=reuse.lifetime();
  return {...start(witness),witness};
}

test('disconnect dependency control: living ghost preserves its economy and another racer advances the clock', () => {
  const { race, session, witness } = trackedStart();
  const owner = session.players[0]; owner.run.creditCoins(17);
  const before = { wallet: owner.run.wallet, health: owner.health, deaths: owner.statistics.deaths, recovery: owner.recovery };
  witness.interval('living-ghost-continuity',()=>{
  assert.equal(session.deviceLost('p1'), true);
  session.update(1 / 120);
  assert.equal(owner.participation, 'device-lost'); assert.ok(race.elapsed > 0);
  assert.deepEqual({ wallet: owner.run.wallet, health: owner.health, deaths: owner.statistics.deaths, recovery: owner.recovery }, before);
  });witness.finish();
});

test('built Race ghost replacement waiting and leave use visible controls and fresh actual input',{timeout:60000},async()=>{
  const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,gamepads:true});
  try{
    const f=app.frame;
    await f.locator('#local-play').click();await f.locator('#session-roster [data-seat="p2"]').click();await f.getByRole('button',{name:'Leave this seat',exact:true}).click();
    await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);
    await f.locator('#race-play').click();await f.locator('#local-session-start').click();await app.advance(100);
    const read=()=>app.onSession(function(){return {time:this.world.time,players:this.players.map(p=>({seat:p.seat,device:p.device,state:p.state,participation:p.participation,earned:p.earnedDistance,health:p.health,wallet:p.run.wallet,charge:p.recovery.charge,protection:p.recovery.protectionUntil}))};});
    await app.sendPads([]);const lost=await read();await app.advance(1000);assert.ok((await read()).time>lost.time);
    assert.match(await f.locator('[data-seat="p2"] [data-session-hud="lifecycle"]').textContent(),/disconnected/);
    await app.sendPads([pad(9,[12])]);await app.sendPads([pad(9,[12,0])]);assert.equal(await f.locator('#survive-lifecycle-board').count(),0);
    await app.sendPads([pad(9)]);await app.sendPads([pad(9,[0])]);assert.equal(await f.getByRole('heading',{name:/Continue as/}).isVisible(),true);
    for(const light of [false,true])for(const [w,h]of [[240,240],[320,560],[900,600],[1000,280]]){
      await app.resize(w,h);await f.evaluate(light=>window.marketGameFixture.setTheme({colors:light?{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'}}),light);
      await app.iframe.screenshot({path:`/tmp/race-05-03-reclaim-${w}x${h}-${light?'light':'dark'}.png`});
      const bad=await f.locator('#survive-lifecycle-board button').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44||r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1||!n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}).map(n=>n.textContent));assert.deepEqual(bad,[]);
    }
    await app.resize(900,600);await app.sendPads([pad(9)]);await app.sendPads([pad(9,[0])]);assert.equal(await f.locator('#survive-lifecycle-board').count(),0);
    const rebound=(await read()).players[1];assert.equal(rebound.device,'gamepad-9');assert.equal(rebound.earned,0);assert.equal(rebound.protection,lost.players[1].protection);
    await app.sendPads([pad(9,[0])]);assert.equal((await read()).players[1].earned,0);
    await app.sendPads([]);
    await sessionHudAction(app, 'p1', 'item');assert.equal(await f.getByRole('heading',{name:'Leave Race as P1?'}).isVisible(),true);
    await f.getByRole('button',{name:'Keep racing',exact:true}).click();assert.equal((await read()).players[0].participation,'active');
    await sessionHudAction(app, 'p1', 'item');await f.locator('#survive-lifecycle-board').getByRole('button',{name:'Leave Race',exact:true}).focus();await app.page.keyboard.press('Enter');await app.advance(80);
    assert.match(await f.locator('.race-lifecycle').textContent(),/Waiting for a player to reclaim/);
    const waiting=await read();await app.advance(13000);assert.equal((await read()).time,waiting.time);
    await app.iframe.screenshot({path:'/tmp/race-05-03-waiting.png'});
    await app.sendPads([pad(8)]);await app.sendPads([pad(8,[0])]);await app.sendPads([pad(8)]);await app.sendPads([pad(8,[0])]);await app.advance(100);
    assert.equal((await read()).players[1].device,'gamepad-8');assert.ok((await read()).time>waiting.time);
    await app.sendPads([pad(8)]);await app.sendPads([pad(8,[3])]);assert.equal(await f.getByRole('heading',{name:'Leave Race as P2?'}).isVisible(),true);
    await f.locator('#survive-lifecycle-board').getByRole('button',{name:'Leave Race',exact:true}).click();await app.advance(100);assert.equal(await f.locator('#survive-results-root').isVisible(),true);
    await app.iframe.screenshot({path:'/tmp/race-05-03-departed-result.png'});
    assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await f.evaluate(()=>window.marketGameFixture.forbidden),[]);
  }finally{await app.close();}
});

test('grace retention keeps original terrain objects and releases rows after expiry or leave',()=>{
  for(const leave of [false,true]){
    const {game,race,session,witness}=meadow(trackedStart()),row=game.rows.get(0),world=session.world;
    witness.interval('grace-retention',()=>{
    session.deviceLost('p2');for(let i=0;i<13;i++)hop(session,'p1');
    assert.equal(game.rows.get(0),row);assert.equal(session.world,world);assert.equal(race.status('p2'),'disconnected-grace');
    if(leave)session.depart('p2','confirmed-leave');else ticks(session,1440);
    ticks(session,1);assert.equal(game.rows.has(0),false,'expired/departed reservation cannot leak terrain retention');
    });witness.finish();
  }
});
test('reclaim preserves exposure resources deadlines and no-ahead position across shared pause',()=>{
  const {game,race,session,witness}=meadow(trackedStart());for(let i=0;i<13;i++)hop(session,'p1');ticks(session,30);
  const p=session.players[1];p.run.creditCoins(19);
  witness.interval('reclaim-shared-pause',()=>{
  session.deviceLost('p2');
  const fields=()=>({health:p.health,wallet:p.run.wallet,score:p.personalScore,earned:p.earnedDistance,completed:p.completedForwardTiles,power:p.powerRemaining,charge:p.recovery.charge,next:p.recovery.nextRecharge,protection:p.recovery.protectionUntil,exposure:race.fogState('p2')});
  const before=fields(),time=game.time;game.pause();ticks(session,500);assert.equal(game.time,time);
  assert.equal(race.reclaim(race.reclaimToken('p2'),'gamepad-7'),true);assert.deepEqual(fields(),before);assert.ok(p.groundY<=p.earnedDistance);assert.equal(p.hop,0);game.resume();
  ticks(session,1);assert.ok(race.fogState('p2').exposure>before.exposure.exposure);
  });witness.finish();
});
test('backtracked and airborne reclaim is bounded by actual pre-loss ground, not earned high-water',()=>{
  const {race,session,witness}=meadow(trackedStart()),p=session.players[1];
  witness.interval('airborne-backtracked-reclaim',()=>{
  for(let i=0;i<5;i++)hop(session,'p2');
  hop(session,'p2','back');hop(session,'p2','back');
  assert.equal(p.groundY,3);assert.equal(p.earnedDistance,5);
  assert.equal(session.dispatch({seat:'p2',direction:'forward'}),true);ticks(session,4);
  const preLossGround=p.groundY,earned=p.earnedDistance,completed=p.completedForwardTiles;
  assert.ok(preLossGround>=3&&preLossGround<4);assert.ok(p.hop>0);
  session.deviceLost('p2');ticks(session,20);assert.equal(p.groundY,preLossGround);
  assert.equal(race.reclaim(race.reclaimToken('p2'),'gamepad-9'),true);
  assert.ok(p.groundY<=preLossGround);assert.equal(p.groundY,Math.floor(preLossGround));
  assert.ok(p.groundY<earned,'reclaim cannot move the backtracked racer to its earned high-water');
  assert.equal(p.earnedDistance,earned);assert.equal(p.completedForwardTiles,completed);assert.equal(p.hop,0);
  });witness.finish();
});
test('dead replacement waiting preserves its offer and cannot invoke recovery before reclaim',()=>{
  const {game,race,session,witness}=trackedStart();
  witness.interval('dead-replacement-offer',()=>{
  game.end('Actual train fatality','train');ticks(session,1);
  const p=session.players[0],offer=p.recovery.offer;session.deviceLost('p1');session.deviceLost('p2');const time=game.time;ticks(session,2000);
  assert.equal(game.time,time);assert.deepEqual(p.recovery.offer,offer);assert.equal(session.recover({kind:'personal',ownerSeat:'p1'}),false);
  assert.equal(race.reclaim(race.reclaimToken('p1'),'gamepad-8'),true);assert.equal(p.participation,'dead');assert.deepEqual(p.recovery.offer,offer);
  assert.equal(session.recover({kind:'personal',ownerSeat:'p1'}),true);assert.equal(p.recovery.charge,'spent');assert.equal(p.statistics.selfRevives,1);
  });witness.finish();
});
test('personal recovery 249 250 251 uses real own earned hops without backtrack or placement credit',()=>{
  const witness=reuse.lifetime();
  const {game,session}=meadow(start(witness)),p=session.players[0],other=session.players[1];other.run.creditCoins(31);
  game.run.creditCoins(17);
  witness.interval('personal-earned-recharge',()=>{
  game.end('Actual fatal train','train');ticks(session,1);
  assert.equal(p.run.wallet,0);assert.equal(other.run.wallet,31);assert.equal(p.statistics.deaths,1);
  assert.equal(session.recover({kind:'personal',ownerSeat:'p1'}),true);assert.equal(p.recovery.charge,'spent');
  for(let n=1;n<=251;n++){
    hop(session,'p1');hop(session,'p2');
    if(n===249){assert.equal(p.recovery.personalHighWater,249);assert.equal(p.recovery.charge,'spent');hop(session,'p1','back');hop(session,'p1');assert.equal(p.recovery.personalHighWater,249);}
    if(n>=250){assert.equal(p.recovery.personalHighWater,n);assert.equal(p.recovery.charge,'available');}
  }
  assert.equal(p.completedForwardTiles,251);assert.equal(p.statistics.selfRevives,1);assert.equal(p.recovery.nextRecharge,500);
  });witness.finish();
});

const pad=(index,pressed=[],id=`pad-${index}`)=>({index,id,mapping:'standard',connected:true,timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:pressed.includes(i)}))});
test('replacement router requires fresh neutral and stable lease/context; held input never hops',()=>{
  const {race,session}=start(),devices=new Map();let count=0;
  const router=new GamepadRouter({context:()=>race.generation,dispatch:a=>session.dispatch(a),acceptsDevice:()=>false,
    replacementSeat:()=>race.status('p1')==='disconnected-grace'?'p1':undefined,
    lifecycle:e=>{if(e.type==='seen')devices.set(e.device.index,e.device);if(e.type==='disconnected'&&e.seat)session.deviceLost(e.seat);},
    requestReclaim:(d,seat,input)=>{if(input.actions.includes('confirm')&&router.canReclaim(d,seat)&&race.reclaim(race.reclaimToken(seat),d.deviceId)){assert.equal(router.reclaim(d),true);count++;}},
  });
  const send=pads=>router.receive({available:true,focused:true,pads},0);
  send([pad(0),pad(1)]);router.assign(devices.get(0),'p1');router.assign(devices.get(1),'p2');
  const stale=devices.get(0);send([pad(1)]);send([pad(9,[12]),pad(1)]);send([pad(9,[12,0]),pad(1)]);assert.equal(count,0);
  send([pad(9),pad(1)]);send([pad(9,[0]),pad(1)]);assert.equal(count,1);assert.equal(router.canReclaim(stale,'p1'),false);
  send([pad(9,[0]),pad(1)]);router.update(10000);assert.equal(session.players[0].earnedDistance,0);
  send([pad(0),pad(9,[0]),pad(1)]);send([pad(0,[0]),pad(9,[0]),pad(1)]);assert.equal(count,1,'old hardware cannot steal its replaced seat');
  router.close();
});

test('grace deadline expires at twelve active seconds and preserves ghost assets',()=>{
  const {race,session,witness}=trackedStart(),p=session.players[1];p.run.creditCoins(23);
  witness.interval('grace-deadline',()=>{
  session.deviceLost('p2');ticks(session,1439);assert.equal(race.status('p2'),'disconnected-grace');
  ticks(session,1);assert.equal(race.status('p2'),'forfeited');assert.equal(p.run.wallet,23);assert.equal(p.statistics.deaths,0);
  assert.equal(session.reclaim('p2','gamepad-1'),false);assert.equal(race.events.at(-1).reason,'grace-expired');
  });witness.finish();
});
test('all-controller waiting freezes deadlines and original replacement reclaim grants no protection or credit',()=>{
  const {race,session,witness}=trackedStart();
  witness.interval('all-controller-waiting',()=>{
  session.deviceLost('p1');session.deviceLost('p2');
  const time=session.world.time;assert.equal(race.waiting,true);ticks(session,2000);assert.equal(session.world.time,time);
  const token=race.reclaimToken('p1'),p=session.players[0],before=[p.health,p.personalScore,p.completedForwardTiles,p.powerRemaining,p.recovery.protectionUntil];
  assert.equal(race.reclaim(token,'gamepad-9'),true);assert.equal(race.waiting,false);
  assert.deepEqual([p.health,p.personalScore,p.completedForwardTiles,p.powerRemaining,p.recovery.protectionUntil],before);
  assert.equal(p.device,'gamepad-9');assert.equal(race.reclaim(token,'gamepad-8'),false);
  });witness.finish();
});
test('leave requires fresh confirmation, cancel is inert, terminal ignores late events',()=>{
  const {race,session,witness}=trackedStart();session.players[0].run.creditCoins(11);
  witness.interval('confirmed-leave-terminal',()=>{
  const old=race.actionToken('p1');assert.equal(race.command(old,'leave'),true);assert.equal(race.command(old,'confirm'),false);
  assert.equal(race.command(race.actionToken('p1'),'cancel'),true);assert.equal(session.players[0].run.wallet,11);
  for(const seat of ['p1','p2']){assert.equal(race.command(race.actionToken(seat),'leave'),true);assert.equal(race.command(race.actionToken(seat),'confirm'),true);}
  assert.ok(race.result);const before=JSON.stringify({events:race.events,result:race.result});
  assert.equal(session.deviceLost('p1'),false);assert.equal(session.depart('p1'),false);ticks(session,100);
  assert.equal(JSON.stringify({events:race.events,result:race.result}),before);assert.equal(session.players[0].run.wallet,11);
  });witness.finish();
});
test('lifecycle permutations produce the same frozen DNF records and append-only events',()=>{
  const outputs=[], lifetimes=[];
  for(const reverse of [false,true]){
    const {race,session,witness}=trackedStart();
    const identities=new Map(session.players.map(player=>[player.seat,player.participantId]));
    assert.equal(new Set(identities.values()).size,2);
    for(const id of identities.values())assert.ok(id.startsWith(`${session.id}:`), 'participant belongs to this actual session lifetime');
    lifetimes.push({id:session.id,identities});
    if(reverse)session.players.reverse();
    witness.interval('lifecycle-permutation-result',()=>{
    session.deviceLost('p2');ticks(session,1440);
    race.command(race.actionToken('p1'),'leave');race.command(race.actionToken('p1'),'confirm');
    assert.ok(Object.isFrozen(race.result));assert.ok(race.events.every(Object.isFrozen));
    assert.deepEqual(race.result.players.map(p=>p.status),['departed','forfeited']);
    for(const player of race.result.players)assert.equal(player.participantId,identities.get(player.seat), 'frozen result retains its authoritative participant');
    // RaceLifecycleEvent contains seat/state/reason/tick/time, no participant ID.
    // Only the verified lifetime-specific result ID is normalized; every other
    // result field and the complete append-only event records remain compared.
    outputs.push({players:race.result.players.map(player=>({...player,participantId:`participant:${player.seat}`})),events:race.events,time:race.elapsed});
    });witness.finish();
  }
  assert.notEqual(lifetimes[0].id,lifetimes[1].id);
  for(const seat of ['p1','p2'])assert.notEqual(lifetimes[0].identities.get(seat),lifetimes[1].identities.get(seat), 'independent lifetimes never reuse participant IDs');
  assert.deepEqual(outputs[0],outputs[1]);
});

test('disconnect dependency: dead original seat reserves replacement authority without reviving or clearing its offer', () => {
  const { game, session, witness } = trackedStart();
  const owner = session.players[0]; owner.run.creditCoins(17);
  // Actual delivered death transaction on the generated course. No health,
  // participation, recovery, position, terrain or clock injection.
  witness.interval('dead-owner-device-absence',()=>{
  game.end('Lifecycle dependency reproduction', 'train'); session.update(1 / 120);
  assert.equal(owner.participation, 'dead'); assert.equal(owner.statistics.deaths, 1);
  assert.equal(owner.run.wallet, 0); assert.ok(owner.recovery.offer);
  const before = { health: owner.health, wallet: owner.run.wallet, deaths: owner.statistics.deaths,
    offer: owner.recovery.offer, charge: owner.recovery.charge, protection: owner.recovery.protectionUntil };
  const accepted = session.deviceLost('p1');
  console.log('dead-seat device-loss observation', JSON.stringify({ accepted, participation: owner.participation,
    device: owner.device, offer: owner.recovery.offer, lifecycle: session.lifecycle.map(e => e.type) }));
  assert.equal(accepted, true, 'shared device lifecycle must retain a disconnected dead seat without changing its death/recovery state');
  assert.equal(owner.participation, 'dead');
  assert.deepEqual({ health: owner.health, wallet: owner.run.wallet, deaths: owner.statistics.deaths,
    offer: owner.recovery.offer, charge: owner.recovery.charge, protection: owner.recovery.protectionUntil }, before);
  });witness.finish();
});
