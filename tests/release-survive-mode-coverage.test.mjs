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
const inventory=process.env.RELEASE_MODEL_INVENTORY?JSON.parse(await readFile(process.env.RELEASE_MODEL_INVENTORY,'utf8')):null;
const records=[];
after(async()=>{
 if(inventory){
  if(!process.env.RELEASE_MODEL_INTERVAL_OUTPUT)throw Error('Missing component interval output path');
  if(records.length!==2)throw Error('Incomplete Survive component witnesses');
  const final=records.at(-1);
  await writeFile(process.env.RELEASE_MODEL_INTERVAL_OUTPUT,JSON.stringify({...final,intervals:records.flatMap(row=>row.intervals)}));
 }
});
const step=1/120;
function lane(game,row,extra={}) {
 game.rows.set(row,{...generateLane(game.seed,row,game.home),kind:'meadow',blocked:[],decorations:[],coin:null,coinActor:undefined,actors:undefined,phase:0,speed:0,spacing:20,length:1.15,variant:0,...extra});
}
function tick(session,seconds){for(let t=0;t<seconds-1e-10;t+=step)session.update(Math.min(step,seconds-t));}
function drown(game,session,player){
 player.x=player.fromX=0;player.y=player.fromY=player.maxY=2;player.hop=0;player.powerReadyAt=10000;
 lane(game,2,{kind:'river',phase:10,length:1});session.update(step);
 assert.equal(player.state,'dead');lane(game,2);
}
for(const base of ['arcade','stroll'])test(`composed Survive ${base}: acquisition, recovery, paused clock, terminal ledger and late rejection`,()=>{
 const game=new Game(121,'pond',base,false,[],'butter');
 for(const row of game.rows.keys())lane(game,row);game.mobs.length=0;
 const recorder=inventory?createSurviveModelRecorder({inventory,identity:{runId:process.env.RELEASE_COVERAGE_RUN,realmId:process.env.RELEASE_COVERAGE_REALM,jobId:process.env.RELEASE_MODEL_JOB,artifactHash:process.env.RELEASE_MODEL_ARTIFACT_HASH}}):null;
 const commit=mode=>LocalSession.stage(game,{roster:[{seat:'p2',device:'keyboard-b',characterId:'sunny'}],mode}).commit();
 const session=recorder?recorder.acquire(game,createSurviveTogetherDefinition,commit):commit(createSurviveTogetherDefinition(game.definition));
 assert.equal(session.definition.id,base);assert.equal(session.mode.definition,game.definition);
 const run=(id,action)=>recorder?recorder.interval(id,action):action(session);
 const [primary,traveler]=session.players;
 run('death-pause-recovery',()=>{
  drown(game,session,traveler);const offer=structuredClone(traveler.recovery.offer);assert.ok(offer);
  const time=session.world.time;game.pause();tick(session,20);assert.equal(session.world.time,time);assert.deepEqual(traveler.recovery.offer,offer);
  game.resume();tick(session,1);assert.equal(session.recover({kind:'personal',ownerSeat:traveler.seat}),true);
  assert.equal(session.recover({kind:'personal',ownerSeat:traveler.seat}),false);
  const protection=traveler.recovery.protectionUntil,now=session.world.time;
  game.pause();tick(session,20);assert.equal(session.world.time,now);assert.equal(traveler.recovery.protectionUntil,protection);
  game.resume();tick(session,2.1);assert.ok(session.world.time>=protection);
 });
 run('archive-and-all-dead-pending',()=>{
  assert.equal(session.deviceLost(traveler.seat),true);tick(session,.5);
  assert.equal(session.reclaim(traveler.seat,'gamepad-7'),true);
  assert.equal(session.depart(traveler.seat),true);
  drown(game,session,primary);tick(session,7.9);assert.equal(session.result,undefined);assert.ok(primary.recovery.offer);
 });
 run('expiry-and-frozen-results',()=>{
  tick(session,.11);const result=session.result;assert.ok(result);
  assert.equal(primary.recovery.charge,'available');assert.equal(Boolean(primary.recovery.offer),false);
  const archived=result.contributions.find(p=>p.participantId===traveler.participantId);
  assert.equal(archived.lifecycle,'departed');assert.equal(archived.deaths,1);assert.equal(archived.selfRevives,1);assert.ok(archived.ghostSeconds>0);
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
