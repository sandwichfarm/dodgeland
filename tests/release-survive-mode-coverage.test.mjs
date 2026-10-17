import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createSurviveModelRecorder } from '../tools/release-coverage/model-attribution.mjs';

// Imports and their initialization counters precede every measured interval.
const sources=await loadSources(['game','session','survive-together']);
after(()=>sources.dispose());
const {Game,generateLane}=await sources.import('game');
const {LocalSession}=await sources.import('session');
const {createSurviveTogetherDefinition}=await sources.import('survive-together');
const config=process.env.DOWN_TO_DUCK_COVERAGE_CONFIG?JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8')):null;
const model=config?.modelAttribution;
if(config&&!model)throw Error('Missing canonical model attribution configuration');
const inventory=model?JSON.parse(await readFile(config.inventoryPath,'utf8')):null;
const records=[];
after(async()=>{
 if(inventory){
  if(records.length!==2)throw Error('Incomplete Survive component witnesses');
  const final=records.at(-1);
  await writeFile(model.output,JSON.stringify({...final,intervals:records.flatMap(row=>row.intervals)}));
 }
});
const step=1/120;
function lane(game,row,extra={}) {
 game.rows.set(row,{...generateLane(game.seed,row,game.home),kind:'meadow',blocked:[],decorations:[],coin:null,coinActor:undefined,actors:undefined,phase:0,speed:0,spacing:20,length:1.15,variant:0,...extra});
}
function tick(session,seconds){for(let t=0;t<seconds-1e-10;t+=step)session.update(Math.min(step,seconds-t));}
function drown(game,session,player){
 const row=Math.max(2,Math.ceil(player.groundY)+2);
 player.x=player.fromX=0;player.y=player.fromY=player.maxY=row;player.hop=0;player.powerReadyAt=10000;
 lane(game,row,{kind:'river',phase:10,length:1});session.update(step);
 assert.equal(player.state,'dead');lane(game,row);
}
function observable(session){return JSON.stringify({time:session.world.time,charges:session.consumableSnapshot(),players:session.players.map(p=>({seat:p.seat,state:p.state,participation:p.participation,x:p.x,y:p.y,health:p.health,wallet:p.run.wallet,recovery:p.recovery,statistics:p.statistics,interactions:p.interactions}))});}
function buy(session,owner,itemId){
 const context=session.openCoOpMarket(owner);assert.ok(context);
 const request={actionId:`purchase-${itemId}`,kind:'buy-consumable',itemId,seat:owner.seat,device:owner.device,participantId:owner.participantId,
  expectedOwnerGeneration:context.ownerGeneration,expectedInventoryGeneration:context.inventoryGeneration,expectedRunRevision:context.runRevision,expectedContextGeneration:context.contextGeneration};
 const wallet=owner.run.wallet,result=session.actCoOpMarket(request);assert.equal(result.ok,true,result.message);
 assert.equal(owner.run.wallet,wallet-(itemId==='revival'?24:36));
}
function useRequest(session,owner,target,itemId){
 const held=session.consumableSnapshot().charges.find(c=>c.seat===owner.seat);
 return {actionId:`use-${itemId}`,ownerSeat:owner.seat,itemId,targetSeat:target.seat,expectedOwnerGeneration:held.ownerGeneration,expectedInventoryGeneration:held.inventoryGeneration,
  expectedTargetDeathGeneration:target.recovery.deathGeneration,expectedTargetParticipantId:target.participantId};
}
for(const base of ['arcade','stroll'])test(`composed Survive ${base}: acquisition, recovery, paused clock, terminal ledger and late rejection`,()=>{
 const game=new Game(121,'pond',base,false,[],'butter');
 for(const row of game.rows.keys())lane(game,row);game.mobs.length=0;
 const recorder=inventory?createSurviveModelRecorder({inventory,identity:{runId:config.runId,realmId:model.realmId,jobId:config.jobId,artifactHash:config.browserBuilds.modules.artifactHash}}):null;
 const commit=mode=>LocalSession.stage(game,{roster:[{seat:'p2',device:'keyboard-b',characterId:'sunny'}],mode}).commit();
 const session=recorder?recorder.acquire(game,createSurviveTogetherDefinition,commit):commit(createSurviveTogetherDefinition(game.definition));
 assert.equal(session.definition.id,base);assert.equal(session.mode.definition,game.definition);
 const run=(id,action)=>recorder?recorder.interval(id,action):action(session);
 const [primary,traveler]=session.players;let third;
 run('death-pause-recovery',()=>{
  drown(game,session,traveler);const offer=structuredClone(traveler.recovery.offer);assert.ok(offer);
  const time=session.world.time;game.pause();tick(session,20);assert.equal(session.world.time,time);assert.deepEqual(traveler.recovery.offer,offer);
  game.resume();tick(session,1);assert.equal(session.recover({kind:'personal',ownerSeat:traveler.seat}),true);
  assert.equal(session.recover({kind:'personal',ownerSeat:traveler.seat}),false);
  const protection=traveler.recovery.protectionUntil,now=session.world.time;
  game.pause();tick(session,20);assert.equal(session.world.time,now);assert.equal(traveler.recovery.protectionUntil,protection);
  game.resume();tick(session,2.1);assert.ok(session.world.time>=protection);
  // Purchase before the long traversal can legitimately collect world charges.
  primary.run.advanceScore(100);primary.run.creditCoins(100);assert.equal(primary.run.open(),true);
  buy(session,primary,'revival');buy(session,primary,'flare');primary.run.close();
  // Arranged clear terrain; every credited tile still completes a real production hop.
  const earned=traveler.recovery.personalHighWater;
  const hop=direction=>{
   for(const p of [primary,traveler]){lane(game,p.y+(direction==='forward'?1:-1));assert.equal(session.dispatch({seat:p.seat,direction}),true);}
   game.mobs.length=0;tick(session,game.rules.movement.hopDuration);
   assert.equal(traveler.state,'playing');assert.equal(traveler.hop,0);
  };
  for(let i=0;i<249;i++)hop('forward');
  assert.equal(traveler.recovery.personalHighWater,earned+249);assert.equal(traveler.recovery.charge,'spent');
  hop('back');hop('forward');assert.equal(traveler.recovery.personalHighWater,earned+249);assert.equal(traveler.recovery.charge,'spent');
  for(const p of [primary,traveler]){lane(game,p.y+1);assert.equal(session.dispatch({seat:p.seat,direction:'forward'}),true);}
  tick(session,game.rules.movement.hopDuration/3);assert.equal(traveler.recovery.charge,'spent');
  tick(session,game.rules.movement.hopDuration*2/3);assert.equal(traveler.recovery.charge,'available');
  hop('forward');assert.equal(traveler.recovery.personalHighWater,earned+251);assert.equal(traveler.recovery.charge,'available');
  for(const request of [{kind:'revival',targetSeat:traveler.seat},{kind:'revival'},{kind:'flare'}]){
   const before=observable(session);let debits=0;
   assert.equal(session.recover({...request,ownerSeat:primary.seat,debit:()=>{debits++;return true;}}),false);
   assert.equal(debits,0);assert.equal(observable(session),before,'invalid living/missing targets never debit');
  }
  drown(game,session,traveler);const revive=useRequest(session,primary,traveler,'revival');
  for(const invalid of [{...revive,expectedOwnerGeneration:-1},{...revive,expectedInventoryGeneration:-1},{...revive,expectedTargetDeathGeneration:-1},{...revive,targetSeat:'p4'}]){
   const before=observable(session);assert.equal(session.useConsumable(invalid),false);assert.equal(observable(session),before);
  }
  let debits=0;const before=observable(session);
  assert.equal(session.recover({kind:'revival',ownerSeat:primary.seat,targetSeat:traveler.seat,debit:()=>{debits++;return false;}}),false);
  assert.equal(debits,1);assert.equal(observable(session),before);
  const progress=traveler.recovery.personalHighWater;
  assert.equal(session.useConsumable(revive),true);assert.equal(traveler.recovery.personalHighWater,progress,'forced placement earns no recharge progress');
  assert.equal(traveler.run.wallet,0);assert.equal(traveler.health,traveler.maxHealth);
  const used=observable(session);assert.equal(session.useConsumable(revive),false);assert.equal(observable(session),used);
  tick(session,2.1);
  assert.equal(session.admit({device:'keyboard-c',characterId:'pip'}),true);third=session.players.find(p=>p.seat==='p3');assert.ok(third);
  drown(game,session,traveler);primary.health=1.5;third.health=2.25;
  const flare=useRequest(session,primary,traveler,'flare'),wallets=[primary.run.wallet,third.run.wallet],flareNow=session.world.time;
  game.pause();tick(session,20);assert.equal(session.world.time,flareNow);
  assert.equal(session.useConsumable(flare),true);assert.equal(game.state,'paused');
  assert.deepEqual([primary.health,third.health],[1.5,2.25]);assert.deepEqual([primary.run.wallet,third.run.wallet],wallets);
  assert.equal(traveler.health,traveler.maxHealth);assert.equal(traveler.run.wallet,0);
  assert.equal(new Set(session.players.map(p=>`${p.x}:${p.y}`)).size,3);
  assert.equal(traveler.recovery.personalHighWater,progress);
  assert.equal(primary.statistics.teammateRevives,2);assert.equal(primary.statistics.itemsUsed,2);
  assert.ok(session.players.every(p=>p.recovery.protectionUntil>flareNow));
  const charges=session.consumableSnapshot().charges.find(c=>c.seat===primary.seat);assert.equal(charges.revival,0);assert.equal(charges.flare,0);
  game.resume();const health=traveler.health,innate=traveler.powerReadyAt;
  lane(game,traveler.y,{kind:'road',phase:traveler.x});session.update(step);
  assert.equal(traveler.health,health);assert.equal(traveler.powerReadyAt,innate,'recovery protection prevents damage before innate consumption');
  lane(game,traveler.y);tick(session,2.1);
 });
 run('archive-and-all-dead-pending',()=>{
  assert.equal(session.deviceLost(traveler.seat),true);tick(session,.5);
  assert.equal(session.reclaim(traveler.seat,'gamepad-7'),true);
  assert.equal(session.depart(third.seat),true);
  assert.equal(session.depart(traveler.seat),true);
  drown(game,session,primary);tick(session,7.9);assert.equal(session.result,undefined);assert.ok(primary.recovery.offer);
 });
 run('expiry-and-frozen-results',()=>{
  tick(session,.11);const result=session.result;assert.ok(result);
  assert.equal(primary.recovery.charge,'available');assert.equal(Boolean(primary.recovery.offer),false);
  const archived=result.contributions.find(p=>p.participantId===traveler.participantId);
  assert.equal(archived.lifecycle,'departed');assert.equal(archived.deaths,3);assert.equal(archived.selfRevives,1);assert.ok(archived.ghostSeconds>0);
  assert.deepEqual(result.contributions.map(p=>p.seat),['p1','p2','p3']);assert.equal(result.contributions[0].teammateRevives,2);assert.equal(result.contributions[0].itemsUsed,2);
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.contributions)&&Object.isFrozen(archived));
 });
 run('settled-late-rejection',()=>{
  const result=session.result,saved=JSON.stringify(result),time=session.world.time;
  assert.equal(session.recover({kind:'personal',ownerSeat:primary.seat}),false);
  assert.equal(session.dispatch({seat:primary.seat,direction:'forward'}),false);
  assert.equal(session.admit({seat:'p2',device:'keyboard-c',characterId:'pip'}),false);
  traveler.statistics.selfRevives=99;tick(session,20);
  assert.equal(session.world.time,time);assert.strictEqual(session.result,result);assert.equal(JSON.stringify(result),saved);
 });
 if(recorder)records.push(recorder.finish());
});
