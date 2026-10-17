import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';
import { capturePayload } from '../tools/release-coverage/collector.mjs';
import { artifactDirectoryForCoverage } from '../tools/release-coverage/browser.mjs';

const sources = await loadSources(['game','session','relay','race','mode-rules','market/catalog']);
const { Game, laneActors } = await sources.import('game'), { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const relay=await sources.import('relay'),race=await sources.import('race');

const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing teardown mode attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath,'utf8')) : null;
const identity = config ? {runId:config.runId,realmId:config.modelAttribution.realmId,jobId:config.jobId,artifactHash:config.browserBuilds.modules.artifactHash} : null;
const output = artifactDirectoryForCoverage(new URL('../artifacts/turn-release/',import.meta.url),'turn-release');
await mkdir(output,{recursive:true});
const records = [], evidence = [];
after(async()=>{
 if(config){assert.equal(records.length,8);await writeFile(config.modelAttribution.output,JSON.stringify({identity:{...identity,buildScope:'production',provenance:'component-model'},payload:capturePayload(inventory,globalThis.__coverage__,identity),intervals:records.flatMap(r=>r.intervals)}));}
 await writeFile(new URL('release.json',output),JSON.stringify({provenance:'Actual composed factories,paid co-op transactions,mode leave commands and actual LocalSession.stop. Funds,market eligibility/stock and one road are fixtures. Late API checks occur outside the sealed mode interval.',scenarios:evidence},null,2));
 await sources.dispose();
});
const stable = session => session.players.map(p=>({seat:p.seat,id:p.participantId,state:p.state,participation:p.participation,x:p.x,y:p.y,hop:p.hop,health:p.health,wallet:p.run.wallet,cards:p.run.cards.map(c=>c.id),completed:p.completedForwardTiles,statistics:{...p.statistics},recovery:p.recovery}));
for(const mode of ['relay','race'])for(const base of ['arcade','stroll'])for(const settled of [false,true]){
 test(`${mode}/${base}/${settled?'settled':'paused'}: actual stop releases market/world resources and rejects late session input`,()=>{
  const module = mode==='relay'?relay:race;
  const factory = mode==='relay'?module.createRelaySession:module.createRaceSession, Coordinator=mode==='relay'?module.RelayCoordinator:module.RaceCoordinator;
  const game = new Game(113,'pond',base,false,ITEM_CATALOG,'butter');
  // Explicit terrain and market setup;no player/clock/effect/cleanup mutation.
  const road=game.rows.get(3);Object.assign(road,{kind:'road',blocked:[],decorations:[],coin:null,actors:undefined,speed:2,phase:.25,spacing:20,length:2,variant:0});
  game.run.advanceScore(100);game.run.creditCoins(1000);
  const recorder=inventory?createTurnModelRecorder({mode,inventory,identity,factory,Coordinator,authority}):null;
  const proposal={seats:[{seat:'p1',device:'keyboard-a',characterId:'butter'},{seat:'p2',device:'keyboard-b',characterId:'sunny'}]};
  const owner=recorder?recorder.acquire(game,proposal):factory(game,proposal), session=owner.session,[p,other]=session.players;
  other.run.creditCoins(17);
  const item=mode==='relay'?p.run.catalog.get('traffic-speed'):owner.items.catalogue.find(i=>i.id==='mud-splash');assert.ok(item);
  if(mode==='relay')p.run.market.offers=[{id:'release-school',itemId:item.id,price:item.price,sold:false,section:'cards'}];
  let sequence=0;
  function act(kind,fields={}){
   const context=session.openCoOpMarket(p);assert.ok(context);
   return session.actCoOpMarket({actionId:`release-${++sequence}`,kind,seat:p.seat,device:p.device,participantId:p.participantId,expectedOwnerGeneration:context.ownerGeneration,expectedInventoryGeneration:context.inventoryGeneration,expectedRunRevision:context.runRevision,expectedContextGeneration:context.contextGeneration,...fields});
  }
  function prepare(){
   assert.equal(act('open').ok,true);const wallet=p.run.wallet;
   assert.equal(act(mode==='relay'?'buy':'buy-consumable',mode==='relay'?{offerId:'release-school'}:{itemId:item.id}).ok,true);
   assert.equal(p.run.wallet,wallet-item.price);assert.equal(other.run.wallet,17);
   assert.equal(act('close').ok,true);
   for(let n=0;n<30;n++)session.update(1/120);
   if(mode==='relay')assert.ok(Math.abs(road.speed-1.76)<1e-9,'elected paid card changes real world speed');
   else assert.ok(game.worldExtensionSnapshot(),'Race item world extension is actually installed');
   assert.equal(act('open').ok,true);game.pause();assert.equal(p.run.isOpen,true);
   if(settled){
    assert.equal(act('close').ok,true);game.resume();
    for(const seat of ['p1','p2']){
     if(mode==='relay'){assert.equal(owner.command({...owner.actionToken(seat),kind:'leave'}),true);assert.equal(owner.command({...owner.actionToken(seat),kind:'confirm'}),true);}
     else {assert.equal(owner.command(owner.actionToken(seat),'leave'),true);assert.equal(owner.command(owner.actionToken(seat),'confirm'),true);}
    }
    assert.ok(session.result);assert.ok(Object.isFrozen(session.result));
   }
  }
  if(recorder)recorder.interval('prepare-resources',prepare);else prepare();
  const world=session.world,players=[...session.players],result=session.result,resultText=JSON.stringify(result),before=stable(session),clock=[world.time,world.simulationTick],positions=laneActors(road,game.time).map(a=>({id:a.id,x:a.x}));
  if(recorder)recorder.release('actual-stop');else session.stop();
  assert.equal(session.active,false);assert.equal(world.sessionActive,true,'retained world marker is not fabricated');
  assert.equal(session.world,world);assert.deepEqual(session.players,players);assert.equal(session.result,result);assert.equal(JSON.stringify(session.result),resultText);
  assert.equal(p.run.isOpen,false);assert.equal(session.coOpMarketSnapshot(),undefined);assert.equal(session.consumableSnapshot(),undefined);assert.equal(game.worldExtensionSnapshot(),undefined);
  assert.deepEqual(stable(session),before);assert.deepEqual([world.time,world.simulationTick],clock);
  if(mode==='relay'){
   assert.ok(Math.abs(road.speed-2)<1e-9,'stopping removes the elected world policy');
   const after=laneActors(road,game.time);for(const actor of positions){const same=after.find(a=>a.id===actor.id);assert.ok(same);assert.ok(Math.abs(same.x-actor.x)<1e-9,'release rebases speed without moving physical traffic');}
  }
  // These assertions are global API evidence after release,never attributed as
  // former-mode play. The recorder has sealed the owned lifetime.
  for(const seat of ['p1','p2'])assert.equal(session.dispatch({seat,direction:'forward'}),false);
  session.update(10);
  assert.equal(session.openCoOpMarket(p),undefined);
  assert.equal(session.actCoOpMarket({kind:'open'}).ok,false);
  assert.deepEqual(stable(session),before);assert.deepEqual([world.time,world.simulationTick],clock);assert.equal(JSON.stringify(session.result),resultText);
  if(recorder){assert.throws(()=>recorder.interval('late-credit',()=>session.update(1/120)),/released/i);records.push(recorder.finish());}
  evidence.push({mode,base,settled,paid:item.price,wallet:p.run.wallet,otherWallet:other.run.wallet,resultRetained:session.result===result,time:world.time,tick:world.simulationTick,roadSpeed:road.speed,lateInputRejected:true});
 });
}
