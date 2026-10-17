import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources=await loadSources(['game','relay','race','market/catalog']);after(()=>sources.dispose());
const {Game,generateLane}=await sources.import('game');
const {createRelaySession,RelayCoordinator}=await sources.import('relay');
const {createRaceSession,RaceCoordinator}=await sources.import('race');
const {ITEM_CATALOG}=await sources.import('market/catalog');
const config=process.env.DOWN_TO_DUCK_COVERAGE_CONFIG?JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8')):null;
const model=config?.modelAttribution;if(config&&!model)throw Error('Missing turn-model attribution configuration');
const inventory=model?JSON.parse(await readFile(config.inventoryPath,'utf8')):null,records=[];
after(async()=>{if(inventory){if(records.length!==7)throw Error('Incomplete turn-mode witnesses');await writeFile(model.output,JSON.stringify({...records.at(-1),intervals:records.flatMap(r=>r.intervals)}));}});
const seats=[{seat:'p1',device:'gamepad-0',characterId:'butter'},{seat:'p2',device:'gamepad-1',characterId:'pip'},{seat:'p3',device:'gamepad-2',characterId:'sunny'}];
const step=1/120;
function lane(game,row){game.rows.set(row,{...generateLane(game.seed,row,game.home),kind:'meadow',blocked:[],decorations:[],actors:undefined,coin:null,coinActor:undefined});}
function start(mode,options={}){
 const game=new Game(113,'pond','stroll',false,ITEM_CATALOG,'butter');for(let row=-8;row<80;row++)lane(game,row);
 const factory=mode==='relay'?createRelaySession:createRaceSession,Coordinator=mode==='relay'?RelayCoordinator:RaceCoordinator;
 const recorder=inventory?createTurnModelRecorder({mode,inventory,factory,Coordinator,identity:{runId:config.runId,realmId:model.realmId,jobId:config.jobId,artifactHash:config.browserBuilds.modules.artifactHash}}):null;
 const proposal={seats:seats.slice(0,options.count??2),...(mode==='relay'?{tilesPerLeg:2}:{finishTiles:500,activeSeconds:30}),...options};delete proposal.count;
 const owner=recorder?recorder.acquire(game,proposal):factory(game,proposal),session=owner.session;
 assert.ok(owner instanceof Coordinator);assert.strictEqual(session.world.host,game);assert.equal(session.definition.id,'stroll');
 return {game,owner,session,run:(id,action)=>recorder?recorder.interval(id,action):action(owner),finish:()=>{if(recorder)records.push(recorder.finish());}};
}
function ticks(run,n){for(let i=0;i<n;i++)run.session.update(step);}
function hop(run,selected){for(const seat of selected){const p=run.session.players.find(p=>p.seat===seat);lane(run.game,p.y+1);assert.equal(run.session.dispatch({seat,direction:'forward'}),true);}for(let i=0;i<120&&run.session.players.some(p=>p.hop>0);i++)ticks(run,1);}
function command(owner,actor,kind){return owner.command({...owner.actionToken(actor),kind});}
function buy(run,owner,itemId){const c=run.session.openCoOpMarket(owner);assert.ok(c);return run.session.actCoOpMarket({actionId:`buy-${itemId}`,kind:'buy-consumable',itemId,seat:owner.seat,device:owner.device,participantId:owner.participantId,expectedOwnerGeneration:c.ownerGeneration,expectedInventoryGeneration:c.inventoryGeneration,expectedRunRevision:c.runRevision,expectedContextGeneration:c.contextGeneration});}
function observation(run){return JSON.stringify({items:run.session.consumableSnapshot(),players:run.session.players.map(p=>({seat:p.seat,state:p.state,wallet:p.run.wallet,health:p.health,score:p.personalScore,stats:p.statistics,recovery:p.recovery}))});}

// Assertions are adapted from the unchanged relay-boundary/lifecycle/results suites.
test('Relay real handoff recovery leave and immutable contribution lifecycle',()=>{
 const run=start('relay',{count:3}),{owner:relay,session}=run;
 run.run('earned-handoff',()=>{
  const p=session.players[0];p.run.advanceScore(100);p.run.creditCoins(24);assert.equal(p.run.open(),true);
  const before=p.run.wallet;assert.equal(buy(run,p,'revival').ok,false);assert.equal(p.run.wallet,before);p.run.close();
  hop(run,['p1']);const row=run.game.rows.get(p.y);row.coin=0;session.world.claimPickup(p,row,run.game.time,0,5);session.world.resolvePickups();
  hop(run,['p1']);assert.equal(relay.snapshot().phase,'handoff');const time=run.game.time;ticks(run,120);assert.equal(run.game.time,time);
  const token=relay.confirmation();assert.equal(relay.confirm({...token,device:'gamepad-9'}),false);assert.equal(relay.confirm(token),true);assert.equal(relay.confirm(token),false);
  const leg=relay.history.legs[0];assert.equal(leg.distance,2);assert.equal(leg.pickups,1);assert.equal(leg.outcome,'complete');assert.ok(Object.isFrozen(leg));
 });
 run.run('death-recovery-disconnect',()=>{
  const p=session.players[1];p.powerReadyAt=9999;session.damage('p2',{cause:'train',amount:99,reason:'arranged fatal contact'});ticks(run,1);
  assert.equal(relay.snapshot().phase,'recovery');assert.equal(session.recover({kind:'personal',ownerSeat:'p2'}),true);assert.equal(p.recovery.charge,'spent');
  assert.equal(session.deviceLost('p2'),true);const time=run.game.time;ticks(run,120);assert.equal(run.game.time,time);
  assert.equal(session.reclaim('p2','gamepad-9'),false);assert.equal(session.reclaim('p2','gamepad-1'),true);
  assert.equal(command(relay,'p2','leave'),true);assert.equal(command(relay,'p2','cancel'),true);assert.equal(command(relay,'p2','leave'),true);assert.equal(command(relay,'p2','confirm'),true);
  assert.equal(relay.activeSeat,'p3');assert.equal(relay.snapshot().phase,'handoff');assert.equal(relay.confirm(relay.confirmation()),true);
 });
 run.run('terminal-ledger',()=>{
  session.depart('p3');session.depart('p1');assert.ok(relay.result);const result=relay.result,saved=JSON.stringify(result);
  assert.equal(result.contributions.find(p=>p.seat==='p2').selfRevives,1);assert.equal(result.contributions.find(p=>p.seat==='p2').deaths,1);
  assert.equal(command(relay,'p1','leave'),false);ticks(run,120);assert.strictEqual(relay.result,result);assert.equal(JSON.stringify(result),saved);
 });run.finish();
});

test('Relay waiting skip cancel and original-seat authority preserve the same world',()=>{
 const run=start('relay',{count:3}),{owner:relay,session}=run;
 run.run('waiting-and-skip',()=>{
  const world=session.world;for(const p of session.players)session.deviceLost(p.seat);
  assert.equal(relay.snapshot().phase,'waiting-for-reclaim');const time=run.game.time;ticks(run,240);assert.equal(run.game.time,time);
  assert.equal(session.reclaim('p2','gamepad-1'),true);const stale={...relay.actionToken('p2'),kind:'confirm'};
  assert.equal(command(relay,'p2','skip'),true);assert.equal(relay.command(stale),false);assert.equal(command(relay,'p2','cancel'),true);
  assert.equal(command(relay,'p2','skip'),true);assert.equal(command(relay,'p2','confirm'),true);assert.equal(relay.activeSeat,'p2');assert.equal(relay.confirm(relay.confirmation()),true);
  hop(run,['p2']);assert.strictEqual(session.world,world);assert.equal(relay.history.legs[0].outcome,'skipped');
 });
 run.run('freeze-disconnected-result',()=>{const result=relay.finish(),saved=JSON.stringify(result);assert.equal(result.contributions.find(p=>p.seat==='p1').connected,false);assert.strictEqual(relay.finish(),result);assert.equal(session.reclaim('p1','gamepad-0'),false);assert.equal(JSON.stringify(result),saved);});run.finish();
});

// Actual component transactions; terrain/wallet/health arrangements are explicit.
test('Race owned items fog recovery grace and DNF ledger',()=>{
 const run=start('race'),{owner:race,session}=run,[p1,p2]=session.players;
 run.run('market-items',()=>{
  p1.run.advanceScore(100);p1.run.creditCoins(60);assert.equal(p1.run.open(),true);
  assert.equal(buy(run,p1,'mud-splash').ok,true);assert.equal(buy(run,p1,'fog-lantern').ok,true);assert.equal(p1.run.wallet,0);p1.run.close();
  const plan=race.items.plan('p1','mud-splash','p2');assert.equal(plan.ok,true);assert.equal(race.items.commit(plan),true);assert.equal(p2.hopCooldown.multiplier,1.35);
  const saved=observation(run);assert.equal(race.items.commit(plan),false);assert.equal(observation(run),saved);
  ticks(run,241);assert.equal(p2.hopCooldown.multiplier,1);
  const lantern=race.items.plan('p1','fog-lantern');assert.equal(lantern.ok,true);assert.equal(race.items.commit(lantern),true);
  assert.equal(race.fogState('p1').exposure,0);assert.equal(session.damage('p1',{cause:'traffic',amount:1,reason:'ordinary damage'}).landed,1);
  run.game.pause();const clock=race.elapsed;ticks(run,360);assert.equal(race.elapsed,clock);run.game.resume();ticks(run,361);
 });
 run.run('fog-personal-recovery-reclaim',()=>{
  for(let i=0;i<13;i++)hop(run,['p1']);ticks(run,122);assert.ok(race.fogState('p2').attempts>0);assert.ok(race.fogState('p2').landed>0);
  // Continue the real fog cadence through hurt immunity to its actual fatal transaction.
  p2.powerReadyAt=9999;for(let i=0;i<600&&p2.state!=='dead';i++)ticks(run,1);
  assert.equal(p2.state,'dead');assert.equal(p2.deathCause,'fog');assert.equal(race.status('p2'),'recovery-offered');assert.equal(session.recover({kind:'personal',ownerSeat:'p2'}),true);assert.equal(p2.recovery.charge,'spent');
  session.deviceLost('p2');const token=race.reclaimToken('p2');assert.ok(token);const earned=p2.earnedDistance;
  assert.equal(race.reclaim({...token,sessionId:'foreign'},'gamepad-8'),false);assert.equal(race.reclaim(token,'gamepad-8'),true);assert.equal(p2.earnedDistance,earned);
 });
 run.run('confirmed-departure-result',()=>{
  assert.equal(race.command(race.actionToken('p1'),'leave'),true);assert.equal(race.command(race.actionToken('p1'),'cancel'),true);
  for(const p of session.players){assert.equal(race.command(race.actionToken(p.seat),'leave'),true);assert.equal(race.command(race.actionToken(p.seat),'confirm'),true);}
  assert.ok(race.result);const result=race.result,saved=JSON.stringify(result);assert.ok(result.players.every(p=>p.rankLabel==='DNF'));
  assert.equal(result.players[0].mudUsed,1);assert.equal(result.players[0].lanternUsed,1);assert.equal(result.players[1].mudReceived,1);assert.equal(result.players[1].selfRevives,1);
  assert.equal(session.dispatch({seat:'p1',direction:'forward'}),false);ticks(run,120);assert.strictEqual(race.result,result);assert.equal(JSON.stringify(result),saved);
 });run.finish();
});

test('Race same-tick finish ties remain immutable after terminal input',()=>{
 const run=start('race',{finishTiles:1}),{owner:race}=run;
 run.run('simultaneous-finish',()=>{hop(run,['p1','p2']);assert.equal(race.result.outcome,'finish');assert.deepEqual(race.result.winners,['p1','p2']);assert.deepEqual(race.result.players.map(p=>p.rankLabel),['=1','=1']);});
 run.run('settled-rejection',()=>{const saved=JSON.stringify(race.result),time=race.elapsed;ticks(run,4000);assert.equal(race.elapsed,time);assert.equal(race.command(race.actionToken('p1'),'leave'),false);assert.equal(JSON.stringify(race.result),saved);});run.finish();
});

test('Race timeout closes pending personal offers before frozen ranking',()=>{
 const run=start('race'),{owner:race,session}=run;
 run.run('earned-then-pending',()=>{hop(run,['p1']);ticks(run,27*120);const p=session.players[1];p.powerReadyAt=9999;session.damage('p2',{cause:'fog',amount:99,reason:'arranged late fatal'});assert.ok(p.recovery.offer);});
 run.run('timeout-and-late-offer',()=>{ticks(run,4*120);assert.equal(race.result.outcome,'time');assert.equal(session.players[1].recovery.offer,undefined);assert.equal(session.recover({kind:'personal',ownerSeat:'p2'}),false);assert.ok(race.recoveryClosures.some(c=>c.seat==='p2'));assert.ok(Object.isFrozen(race.result));});run.finish();
});

// Two additional actual Arcade lifetimes. Seed decoding/generation is inside
// acquisition; all terrain, stock and starting funds below are explicit fixtures.
function arcade(mode){
 const factory=mode==='relay'?createRelaySession:createRaceSession,Coordinator=mode==='relay'?RelayCoordinator:RaceCoordinator;
 const recorder=inventory?createTurnModelRecorder({mode,inventory,factory,Coordinator,identity:{runId:config.runId,realmId:model.realmId,jobId:config.jobId,artifactHash:config.browserBuilds.modules.artifactHash}}):null;
 const createGame=()=>Game.fromSeed('ph3-00000071-pond-a-n',ITEM_CATALOG,'butter');
 const proposal={seats:seats.slice(0,2),...(mode==='relay'?{tilesPerLeg:50}:{finishTiles:500,activeSeconds:180})};
 const acquired=recorder?recorder.acquireFrom(createGame,'arcade',proposal):(()=>{const game=createGame();return {game,owner:factory(game,proposal)};})();
 const {game,owner}=acquired,session=owner.session;
 assert.equal(game.definition.id,'arcade');assert.equal(game.runSeed.schema,3);assert.strictEqual(session.world.host,game);assert.ok(owner instanceof Coordinator);
 for(let row=-8;row<80;row++)lane(game,row);
 return {game,owner,session,run:(id,action)=>recorder?recorder.interval(id,action):action(owner),finish:()=>{if(recorder)records.push(recorder.finish());}};
}
let marketAction=0;
function transact(run,p,kind,fields={}){
 const c=run.session.openCoOpMarket(p);assert.ok(c);
 return run.session.actCoOpMarket({actionId:`arcade-${++marketAction}`,kind,seat:p.seat,device:p.device,participantId:p.participantId,expectedOwnerGeneration:c.ownerGeneration,expectedInventoryGeneration:c.inventoryGeneration,expectedRunRevision:c.runRevision,expectedContextGeneration:c.contextGeneration,...fields});
}
function stockBuy(run,p,id){
 const item=ITEM_CATALOG.find(item=>item.id===id);assert.ok(item);
 const offer={id:`arranged-${++marketAction}`,itemId:id,price:item.price,sold:false};p.run.market.offers.push(offer);
 return transact(run,p,'buy',{offerId:offer.id});
}
function course(run,row,values={}){lane(run.game,row);const value=run.game.rows.get(row);Object.assign(value,{phase:0,speed:0,spacing:20,length:4,...values});return value;}
function settledMove(run,p,direction){assert.equal(run.session.dispatch({seat:p.seat,direction}),true);for(let n=0;n<120&&p.hop>0;n++)ticks(run,1);assert.equal(p.hop,0);}
function ownedWorld(run){
 const [p,other]=run.session.players,otherWallet=other.run.wallet;
 for(const [id,value]of[['coin',1],['bar',2],['small-sack',5],['big-sack',10],['huge-sack',25]]){
  const row=course(run,p.y,{coin:p.groundX,coinDenomination:id}),before=p.run.wallet;
  ticks(run,1);assert.equal(row.coin,null);assert.equal(p.run.wallet,before+value);assert.equal(other.run.wallet,otherWallet);
 }
 const before=p.personalScore;course(run,p.y+1);settledMove(run,p,'forward');assert.equal(p.personalScore,before+1);
 course(run,p.y-1);settledMove(run,p,'back');assert.equal(p.personalScore,before+1);
 const river=course(run,p.y,{kind:'river',speed:.7,phase:p.groundX-.7*run.game.time});
 const x=p.groundX;ticks(run,12);assert.notEqual(p.groundX,x);assert.equal(p.state,'playing');assert.equal(p.personalScore,before+1);
 course(run,p.y);assert.equal(river.kind,'river');
}
function rescueAndFinish(run,mode){
 const p=run.session.players[0];
 course(run,p.y+1,{kind:'river',phase:10,length:1});assert.equal(run.session.dispatch({seat:p.seat,direction:'forward'}),true);
 for(let n=0;n<120&&!p.powerRescue;n++)ticks(run,1);
 assert.ok(p.powerRescue);assert.equal(p.statistics.deaths,0);
 for(let n=0;n<600&&p.powerRescue;n++)ticks(run,1);
 assert.equal(p.powerRescue,null);assert.equal(p.state,'playing');assert.ok(p.powerReadyAt>p.personalScore);
 course(run,p.y+1,{kind:'river',phase:10,length:1});assert.equal(run.session.dispatch({seat:p.seat,direction:'forward'}),true);
 for(let n=0;n<120&&p.state!=='dead';n++)ticks(run,1);
 assert.equal(p.state,'dead');assert.equal(p.statistics.deaths,1);assert.ok(p.recovery.offer);
 assert.equal(run.session.recover({kind:'personal',ownerSeat:p.seat}),true);assert.equal(p.recovery.charge,'spent');
 if(mode==='relay'){for(const player of run.session.players)run.session.depart(player.seat);}
 else for(const player of run.session.players){assert.equal(run.owner.command(run.owner.actionToken(player.seat),'leave'),true);assert.equal(run.owner.command(run.owner.actionToken(player.seat),'confirm'),true);}
 assert.ok(run.owner.result);assert.ok(Object.isFrozen(run.owner.result));
}
test('Relay Arcade seeded world paid inventory magnet and personal rescue',()=>{
 const run=arcade('relay'),p=run.session.players[0];
 run.run('arcade-owned-world',()=>ownedWorld(run));
 run.run('arcade-paid-market-pull',()=>{
  p.run.advanceScore(100);p.run.creditCoins(1000);assert.equal(p.run.open(),true);
  const before=p.run.wallet;assert.equal(stockBuy(run,p,'magnet').ok,true);assert.ok(p.run.wallet<before);assert.ok(p.run.cards.length);
  assert.equal(stockBuy(run,p,'pack-pocket').ok,true);const pack=p.run.pendingPack;assert.ok(pack);assert.equal(transact(run,p,'claim-pack',{ids:pack.choices.filter(card=>!card.components.some(c=>c.itemId==='magnet')).slice(0,pack.picks).map(card=>card.id)}).ok,true);assert.equal(p.run.pendingPack,null);
  const sold=p.run.cards.find(card=>!card.components.some(c=>c.itemId==='magnet'));assert.ok(sold);const wallet=p.run.wallet;assert.equal(transact(run,p,'sell',{cardId:sold.id}).ok,true);assert.equal(p.run.wallet,wallet+sold.saleValue);
  assert.equal(transact(run,p,'close').ok,true);
  const row=course(run,p.y+1,{coin:p.groundX}),funds=p.run.wallet;ticks(run,1);assert.ok(row.coinPull);assert.equal(p.run.wallet,funds);
  for(let n=0;n<240&&row.coin!==null;n++)ticks(run,1);assert.equal(row.coin,null);assert.equal(p.run.wallet,funds+1);
 });
 run.run('arcade-hazards-terminal',()=>rescueAndFinish(run,'relay'));run.finish();
});
test('Race Arcade seeded world cosmetics reject gameplay stock and personal rescue',()=>{
 const run=arcade('race'),p=run.session.players[0];
 run.run('arcade-owned-world',()=>ownedWorld(run));
 run.run('arcade-cosmetic-authority',()=>{
  p.run.advanceScore(100);p.run.creditCoins(1000);assert.equal(p.run.open(),true);
  const before=p.run.wallet;assert.equal(stockBuy(run,p,'look-hat-cap').ok,true);assert.ok(p.run.wallet<before);assert.equal(transact(run,p,'equip',{itemId:'look-hat-cap'}).ok,true);
  const saved=p.run.wallet;assert.equal(stockBuy(run,p,'magnet').ok,false);assert.equal(stockBuy(run,p,'pack-pocket').ok,false);assert.equal(p.run.wallet,saved);assert.equal(p.run.cards.length,0);assert.equal(p.run.pendingPack,null);
  assert.equal(transact(run,p,'close').ok,true);
 });
 run.run('arcade-hazards-terminal',()=>rescueAndFinish(run,'race'));run.finish();
});
