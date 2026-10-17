import assert from 'node:assert/strict';
import {turnReuseAttribution} from './turn-reuse-attribution.mjs';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'race', 'session', 'mode-rules', 'survive-together', 'consumables', 'consumable-drops', 'market/catalog', 'run-seed', 'levels/index', 'coin-denominations', 'death-spill', 'audio']);
after(sources.dispose);
const { Game } = await sources.import('game');
const { createRaceSession, RaceCoordinator } = await sources.import('race');

const reuse=await turnReuseAttribution({mode:'race',factory:createRaceSession,Coordinator:RaceCoordinator,lifetimes:1});
after(()=>reuse.finish());

test('common world dependency: installed capability must not grant legacy Revival capacity', async () => {
  const game = new Game(3338952125, 'pond', 'arcade', false, [], 'butter');
  const { LocalSession } = await sources.import('session');
  const race = {session: LocalSession.stage(game,{roster:[{seat:'p2',device:'keyboard-b',characterId:'pip'}]}).commit()};
  // Exercise the delivered common opt-in, not a replacement pickup implementation.
  const { CONSUMABLES } = await sources.import('consumables');
  const { DEFAULT_ITEM_SCHEMA } = await sources.import('consumable-drops');
  race.session.installConsumableWorld({catalogue: CONSUMABLES, schema: DEFAULT_ITEM_SCHEMA, capabilities: [], eligible: () => true, activate: () => false});
  const pickup = race.session.consumableSnapshot().pickups.find(p => p.itemId === 'revival');
  assert.ok(pickup, 'released seed provides a known legacy pickup for this dependency reproduction');
  const owner = race.session.players[0];
  owner.x = owner.fromX = pickup.x;
  owner.y = owner.fromY = pickup.y;
  owner.hop = 0;
  race.session.update(1 / 120);
  const state = race.session.consumableSnapshot();
  assert.equal(state.charges.find(p => p.seat === 'p1').revival, 0,
    'the common world must apply its installed mode capability rather than hardcoded Survive eligibility');
  assert.equal(state.claims.length, 0, 'a denied legacy claim must leave pickup and owner statistics unchanged');
  assert.equal(owner.statistics.itemsFound, 0);
});

test('common world dependency control: released Survive pickup still grants its owner once', async () => {
  const { LocalSession } = await sources.import('session');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');
  const game = new Game(3338952125, 'pond', 'arcade', false, [], 'butter');
  const session = LocalSession.stage(game, { roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'pip' }], mode: createSurviveTogetherDefinition(SOLO_ARCADE_MODE) }).commit();
  const pickup = session.consumableSnapshot().pickups.find(p => p.itemId === 'revival');
  const owner = session.players[0];
  owner.x = owner.fromX = pickup.x;
  owner.y = owner.fromY = pickup.y;
  owner.hop = 0;
  session.update(1 / 120);
  assert.equal(session.consumableSnapshot().charges.find(p => p.seat === 'p1').revival, 1);
  assert.equal(session.consumableSnapshot().claims.length, 1);
  assert.equal(owner.statistics.itemsFound, 1);
});

test('generic cooldown preserves real primary and secondary interpolation and freezes with active clock', () => {
  for (const seat of ['p1','p2']) {
    const game = new Game(113,'pond','arcade',false,[],'butter');
    const race = createRaceSession(game,{seats:[{seat:'p1',device:'keyboard-a',characterId:'butter'},{seat:'p2',device:'keyboard-b',characterId:'pip'}]});
    for(const row of game.rows.values()) Object.assign(row,{kind:'meadow',blocked:[],coin:null});
    const p=race.session.players.find(p=>p.seat===seat),other=race.session.players.find(p=>p!==race.session.players.find(q=>q.seat===seat));
    assert.equal(p.setHopCooldown(NaN,2),false);
    assert.equal(p.setHopCooldown(1.35,2),true);
    assert.equal(race.session.dispatch({seat,direction:'forward'}),true);
    assert.equal(p.hop,game.rules.movement.hopDuration);
    assert.equal(p.groundY,0);
    for(let i=0;i<100&&p.hop>0;i++)race.session.update(1/120);
    assert.equal(p.groundY,1,'normal-duration hop lands at unchanged position');
    assert.equal(race.session.dispatch({seat,direction:'forward'}),false,'only next hop is delayed');
    assert.equal(other.hopCooldown.multiplier,1);
    game.pause();const until=p.hopCooldown;race.session.update(1);assert.deepEqual(p.hopCooldown,until);game.resume();
    for(let i=0;i<20;i++)race.session.update(1/120);
    assert.equal(race.session.dispatch({seat,direction:'forward'}),true);
    for(let i=0;i<260;i++)race.session.update(1/120);
    assert.equal(p.hopCooldown.multiplier,1);
  }
});

test('Race captures race-item-schema-1 and installs only its common-system catalogue', () => {
  const game = new Game(113,'pond','arcade',false,[],'butter');
  const race = createRaceSession(game,{seats:[{seat:'p1',device:'keyboard-a',characterId:'butter'},{seat:'p2',device:'keyboard-b',characterId:'pip'}]});
  assert.equal(race.descriptor.itemVersion,'race-item-schema-1');
  assert.ok(race.session.consumableSnapshot());
  assert.ok(race.items,'Race must compose the common item policy');
  assert.deepEqual(race.items.catalogue.map(i=>[i.id,i.price]),[['mud-splash',30],['fog-lantern',30]]);
});

const { RACE_DROP_SCHEMA, RACE_ITEM_SCHEMA } = await sources.import('race-items');
const { sampleItemDrop, classifyItemBucket, consumableSchema } = await sources.import('consumable-drops');
function raceRun(seed=113, count=2) {
  const game=new Game(seed,'pond','arcade',false,[],'butter');
  const seats=[['p1','butter','keyboard-a'],['p2','pip','keyboard-b'],['p3','sunny','gamepad-0'],['p4','petal','gamepad-1']].slice(0,count).map(([seat,characterId,device])=>({seat,characterId,device}));
  const race=createRaceSession(game,{seats});
  return {game,race,session:race.session};
}
function flat(run){for(const lane of run.game.rows.values())Object.assign(lane,{kind:'meadow',blocked:[],coin:null,decorations:[]});return run;}
function locate(p,x,y){p.x=p.fromX=x;p.y=p.fromY=y;p.hop=0;}
function step(run,n=1){for(let i=0;i<n;i++)run.session.update(1/120);}
function seedFor(item){for(let seed=0;seed<100000;seed++)if(sampleItemDrop(RACE_DROP_SCHEMA,{courseSeed:seed,row:1,slot:0}).itemId===item)return seed;throw Error('bounded seed search exhausted');}
function collected(item,seat='p1'){
  const run=flat(raceRun(seedFor(item))),pickup=run.session.consumableSnapshot().pickups.find(p=>p.itemId===item&&p.row===1);
  assert.ok(pickup);const p=run.session.players.find(p=>p.seat===seat);locate(p,pickup.x,pickup.y);step(run);
  assert.equal(run.session.consumableSnapshot().charges.find(c=>c.seat===seat)[item],1);
  return run;
}
function observation(run){return JSON.stringify({world:run.session.consumableSnapshot(),players:run.session.players.map(p=>({seat:p.seat,wallet:p.run.wallet,stats:p.statistics,health:p.health,x:p.x,y:p.y,earned:p.earnedDistance,cooldown:p.hopCooldown})),fog:run.session.players.map(p=>run.race.fogState(p.seat))});}

test('schema exact 1:1250 distinct bucket counts and malformed unknown versions fail closed',()=>{
  const counts={};for(let i=0;i<1250;i++){const id=classifyItemBucket(i,RACE_DROP_SCHEMA);counts[id]=(counts[id]??0)+1;}
  assert.deepEqual(counts,{'mud-splash':1,'fog-lantern':1,null:1248});
  assert.equal(consumableSchema(RACE_ITEM_SCHEMA),RACE_DROP_SCHEMA);
  for(const version of ['unknown','race-item-schema-2',''])assert.throws(()=>consumableSchema(version));
  for(const schema of [{...RACE_DROP_SCHEMA,salt:0},{...RACE_DROP_SCHEMA,version:'unknown'},{...RACE_DROP_SCHEMA,buckets:1}])assert.throws(()=>sampleItemDrop(schema,{courseSeed:1,row:1,slot:0}));
  const countsSample={'mud-splash':0,'fog-lantern':0};
  for(let row=0;row<125000;row++){const drop=sampleItemDrop(RACE_DROP_SCHEMA,{courseSeed:0x12345678,row,slot:0});if(drop.itemId)countsSample[drop.itemId]++;}
  for(const count of Object.values(countsSample))assert.ok(count>60&&count<140,`${count} lies in bounded deterministic distribution`);
});

test('default gravity magnet rejection and contested claim use one common world',()=>{
  for(const item of ['mud-splash','fog-lantern'])for(const reversed of [false,true]){
    const run=flat(raceRun(seedFor(item))),pickup=run.session.consumableSnapshot().pickups.find(p=>p.row===1&&p.itemId===item);
    for(const p of run.session.players)locate(p,pickup.x,pickup.y);
    if(reversed)run.session.roster.reverse();step(run);
    assert.equal(run.session.consumableSnapshot().claims.find(c=>c.pickupId===pickup.id).seat,'p1');
    step(run);assert.equal(run.session.players.find(p=>p.seat==='p1').statistics.itemsFound,1);
  }
  for(const magnet of [0,20]){
    const run=flat(raceRun(seedFor('mud-splash'))),pickup=run.session.consumableSnapshot().pickups.find(p=>p.row===1&&p.itemId==='mud-splash');
    const p=run.session.players[0];locate(p,pickup.x+.7,pickup.y);p.run.effects.coinRadius=magnet;locate(run.session.players[1],4,0);
    step(run);assert.deepEqual(run.session.consumableSnapshot().pickups.find(p=>p.id===pickup.id),pickup,'magnet cannot pull outside default reach');
    locate(p,pickup.x+.5,pickup.y);step(run,60);assert.equal(run.session.consumableSnapshot().charges.find(c=>c.seat==='p1')['mud-splash'],1);
  }
});

test('Mud Splash atomic real use delays next hop only for two active seconds',()=>{
  const run=collected('mud-splash'),[owner,target]=run.session.players;
  const before={wallet:owner.run.wallet,health:target.health,x:target.x,y:target.y,earned:target.earnedDistance,boundary:run.race.fogBoundary};
  const plan=run.race.items.plan('p1','mud-splash','p2');assert.equal(plan.ok,true);
  const prior=observation(run);assert.equal(observation(run),prior);assert.equal(run.race.items.commit(plan),true);
  assert.deepEqual({wallet:owner.run.wallet,health:target.health,x:target.x,y:target.y,earned:target.earnedDistance,boundary:run.race.fogBoundary},before);
  assert.equal(target.hopCooldown.multiplier,1.35);assert.equal(owner.statistics.itemsUsed,1);
  assert.equal(run.session.consumableSnapshot().uses.length,1);const committed=observation(run);
  assert.equal(run.race.items.commit(plan),false);assert.equal(observation(run),committed);
  step(run,239);assert.equal(target.hopCooldown.multiplier,1.35);step(run,2);assert.equal(target.hopCooldown.multiplier,1);
});

test('Fog Lantern self-only resets exposure protects fog for three active seconds but not health damage',()=>{
  const run=collected('fog-lantern'),owner=run.session.players[0];
  const plan=run.race.items.plan('p1','fog-lantern');assert.equal(plan.ok,true);assert.equal(run.race.items.commit(plan),true);
  assert.equal(run.race.fogState('p1').exposure,0);assert.equal(run.race.fogState('p1').protectionUntil,run.race.elapsed+3);
  const before=owner.health;assert.equal(run.session.damage('p1',{cause:'traffic',amount:1,reason:'ordinary traffic'}).landed,1);assert.equal(owner.health,before-1);
  run.game.pause();const clock=run.race.elapsed;step(run,360);assert.equal(run.race.elapsed,clock);run.game.resume();
  step(run,361);assert.ok(run.race.fogState('p1').protectionUntil<run.race.elapsed);
});

test('stale wrong protected ghost departed dead out-of-range item attempts are mutation-free',()=>{
  for(const change of [
    r=>r.session.deviceLost('p2'),r=>r.session.depart('p2','confirmed-leave'),
    r=>locate(r.session.players[1],0,18),r=>r.session.updateRecovery(r.session.players[1],v=>({...v,protectionUntil:r.session.world.time+10})),
    r=>r.session.deviceLost('p1'),r=>r.race.command(r.race.actionToken('p1'),'leave'),
    r=>{r.session.players[1].state='dead';r.session.players[1].participation='dead';},
  ]){
    const run=collected('mud-splash'),plan=run.race.items.plan('p1','mud-splash','p2');assert.equal(plan.ok,true);change(run);
    const before=observation(run);assert.equal(run.race.items.commit(plan),false);assert.equal(observation(run),before);
  }
  const run=collected('mud-splash'),plan=run.race.items.plan('p1','mud-splash','p2');
  for(const patch of [{expectedDevice:'gamepad-99'},{expectedParticipantId:'wrong'},{expectedOwnerGeneration:999},{expectedInventoryGeneration:999},{targetSeat:'p1'},{itemId:'revival'}]){
    const before=observation(run);assert.equal(run.session.useConsumable({...plan.action,...patch}),false);assert.equal(observation(run),before);
  }
});

test('fractional log landing collects both items with default gravity on actual generated river actors',()=>{
  for(const item of ['mud-splash','fog-lantern']){
    let run,pickup;
    for(let seed=0;seed<100000&&!pickup;seed++){
      if(!Array.from({length:16},(_,i)=>i+4).some(row=>sampleItemDrop(RACE_DROP_SCHEMA,{courseSeed:seed,row,slot:0}).itemId===item))continue;
      const candidate=raceRun(seed),p=candidate.session.consumableSnapshot().pickups.find(p=>p.itemId===item&&candidate.game.rows.get(p.row)?.kind==='river'&&Math.abs(p.x)<3);
      if(p){run=candidate;pickup=p;}
    }
    assert.ok(pickup,'bounded real seeded river item');
    const p=run.session.players[0];locate(run.session.players[1],4,0);
    // Land on the real log with a fractional horizontal hop grid. The default
    // attraction covers its residual half-tile offset; no synthetic item is injected.
    Object.assign(run.game.rows.get(pickup.row-1),{kind:'meadow',blocked:[]});
    locate(p,pickup.x+Math.sign(run.game.rows.get(pickup.row).speed)*.45,pickup.row-1);assert.equal(run.session.dispatch({seat:'p1',direction:'forward'}),true);
    assert.notEqual(p.x,Math.round(p.x));
    for(let i=0;i<120&&!run.session.consumableSnapshot().claims.some(c=>c.pickupId===pickup.id);i++)step(run);
    assert.equal(p.state,'playing');assert.equal(run.session.consumableSnapshot().charges.find(c=>c.seat==='p1')[item],1,JSON.stringify({item,seed:run.game.seed,pickup,now:run.session.consumableSnapshot(),p:{x:p.x,y:p.y,ground:p.groundX,power:p.powerRescue}}));
    assert.equal(run.session.consumableSnapshot().claims.filter(c=>c.pickupId===pickup.id).length,1);
  }
});

function marketRequest(run,seat,kind,itemId,patch={}){
  const p=run.session.players.find(p=>p.seat===seat),ctx=run.session.openCoOpMarket({seat,device:p.device,participantId:p.participantId});assert.ok(ctx);
  return {actionId:`market-${seat}-${ctx.runRevision}-${ctx.inventoryGeneration}-${kind}-${itemId}`,seat,device:p.device,participantId:p.participantId,expectedOwnerGeneration:ctx.ownerGeneration,expectedInventoryGeneration:ctx.inventoryGeneration,expectedRunRevision:ctx.runRevision,expectedContextGeneration:ctx.contextGeneration,kind,itemId,...patch};
}
async function catalogRun(witness){
  const { ITEM_CATALOG }=await sources.import('market/catalog');
  const game=new Game(113,'pond','arcade',false,ITEM_CATALOG,'butter');
  const race=(witness?witness.acquire:createRaceSession)(game,{seats:[{seat:'p1',device:'keyboard-a',characterId:'butter'},{seat:'p2',device:'keyboard-b',characterId:'pip'}]});
  return flat({game,race,session:race.session});
}
test('Race owner shop exact 30 price capacity stale wallet no-waste and explicit legacy catalogue denial',async()=>{
  const witness=reuse.lifetime();
  const run=await catalogRun(witness),[p1,p2]=run.session.players;p2.run.creditCoins(29);p2.run.advanceScore(100);
  let request,before;
  witness.interval('insufficient-wallet',()=>{
  assert.equal(run.session.actCoOpMarket(marketRequest(run,'p2','open')).ok,true);
  request=marketRequest(run,'p2','buy-consumable','mud-splash');before=observation(run);
  assert.equal(run.session.actCoOpMarket(request).ok,false);assert.equal(observation(run),before);
  });p2.run.creditCoins(1);
  witness.interval('exact-price',()=>{request=marketRequest(run,'p2','buy-consumable','mud-splash');assert.equal(run.session.actCoOpMarket(request).ok,true);assert.equal(p2.run.wallet,0);assert.equal(p1.run.wallet,0);
  });p2.run.creditCoins(30);
  witness.interval('capacity-owner-replay-legacy',()=>{request=marketRequest(run,'p2','buy-consumable','mud-splash');before=observation(run);assert.equal(run.session.actCoOpMarket(request).ok,false);assert.equal(observation(run),before);
  request=marketRequest(run,'p2','buy-consumable','fog-lantern');assert.equal(run.session.actCoOpMarket({...request,device:'keyboard-a'}).ok,false);assert.equal(run.session.actCoOpMarket(request).ok,true);
  before=observation(run);assert.equal(run.session.actCoOpMarket(request).ok,false);assert.equal(observation(run),before);
  for(const id of ['revival','flare']){request=marketRequest(run,'p2','buy-consumable',id);before=observation(run);assert.equal(run.session.actCoOpMarket(request).ok,false);assert.equal(observation(run),before);}
  const context=run.session.coOpMarketSnapshot();assert.deepEqual(context.offers.filter(o=>o.source==='consumable').map(o=>o.itemId),['mud-splash','fog-lantern']);
  });
  for(const item of p2.run.catalog.values()){
    assert.equal(p2.run.itemEligible(item.id),item.kind==='cosmetic');
    if(item.kind==='cosmetic')continue;
    const offer={id:`forged-${item.id}`,itemId:item.id,price:1,sold:false};p2.run.market.offers.push(offer);p2.run.creditCoins(100);
    const wallet=p2.run.wallet;assert.equal(p2.run.buy(offer.id).ok,false);assert.equal(p2.run.wallet,wallet);assert.equal(offer.sold,false);
  }
  const filtered=run.session.coOpMarketSnapshot();assert.ok(filtered.offers.every(o=>o.source==='consumable'||p2.run.catalog.get(o.itemId).kind==='cosmetic'));
  witness.finish();
});

test('protected claims and purchases reject while ghost departure preserve and actual death clears only owner items',()=>{
  for(const kind of ['protected','ghost','departed']){
    const run=flat(raceRun(seedFor('mud-splash'))),p=run.session.players[0],pickup=run.session.consumableSnapshot().pickups.find(p=>p.row===1&&p.itemId==='mud-splash');locate(p,pickup.x,pickup.y);locate(run.session.players[1],4,0);
    if(kind==='protected')run.session.updateRecovery(p,v=>({...v,protectionUntil:run.session.world.time+10}));
    if(kind==='ghost')run.session.deviceLost('p1');if(kind==='departed')run.session.depart('p1','confirmed-leave');step(run);
    assert.equal(run.session.consumableSnapshot().charges.find(c=>c.seat==='p1')['mud-splash'],0);assert.ok(run.session.consumableSnapshot().pickups.some(c=>c.id===pickup.id));
  }
  for(const lifecycle of ['ghost','departed','death']){
    const run=collected('mud-splash'),p=run.session.players[0];
    if(lifecycle==='ghost')run.session.deviceLost('p1');else if(lifecycle==='departed')run.session.depart('p1','confirmed-leave');else{p.powerReadyAt=999;run.session.damage('p1',{cause:'fog',amount:99,reason:'fatal'});}
    assert.equal(run.session.consumableSnapshot().charges.find(c=>c.seat==='p1')['mud-splash'],lifecycle==='death'?0:1);
    assert.equal(run.session.players[1].statistics.deaths,0);
  }
});

test('RNG isolation preserves released terrain denomination market mob spill audio and next outputs across order/player counts',async()=>{
  const {createRunSeed}=await sources.import('run-seed'),{generateSeedLane}=await sources.import('levels/index'),{coinDenominationForRow}=await sources.import('coin-denominations');
  const {createDeathSpill}=await sources.import('death-spill'),{builtinBuffer}=await sources.import('audio');
  const {ITEM_CATALOG}=await sources.import('market/catalog');
  function audio(cue){const ctx={sampleRate:8000,createBuffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return {sampleRate:rate,length,duration:length/rate,numberOfChannels:channels,getChannelData:i=>data[i]};}};return Array.from(builtinBuffer(ctx,cue,'pond').getChannelData(0));}
  function observe(interleave){
    const game=new Game(0x12345678,'pond','arcade',false,ITEM_CATALOG,'butter');
    const observations=[];
    for(const schema of [1,2,3])for(const row of [1,17,90,503]){interleave();observations.push(generateSeedLane(createRunSeed(0x12345678,'pond','arcade',false,schema),row),coinDenominationForRow(0x12345678,row));}
    for(const score of [100,200]){interleave();game.run.advanceScore(score);observations.push(structuredClone(game.run.market));}
    for(let i=0;i<4;i++){interleave();observations.push(game.run.random(),game.mobDirector.rng());}
    for(const seed of [1,2]){interleave();observations.push(createDeathSpill(90,[],1,1,0,seed));}
    for(const cue of ['coin','splash']){interleave();observations.push(audio(cue));}
    return observations;
  }
  const baseline=observe(()=>{});
  for(const count of [2,3,4])for(const reverse of [false,true]){
    const rows=reverse?[503,90,17,1]:[1,17,90,503];
    assert.deepEqual(observe(()=>{for(let player=0;player<count;player++)for(const row of rows)sampleItemDrop(RACE_DROP_SCHEMA,{courseSeed:0x12345678,row,slot:0});}),baseline);
    const run=raceRun(113,count);assert.equal(run.session.players.length,count);assert.equal(run.race.descriptor.itemVersion,RACE_ITEM_SCHEMA);
  }
});

test('Mud actual-ground boundary 16 inclusive and reversed owner/target roster independence',()=>{
  for(const seat of ['p1','p2'])for(const delta of [16,16.001,-16,-16.001]){
    const run=collected('mud-splash',seat),owner=run.session.players.find(p=>p.seat===seat),target=run.session.players.find(p=>p!==owner);
    locate(owner,0,20);locate(target,0,20+delta);owner.earnedDistance=900;target.earnedDistance=1;
    run.session.roster.reverse();const before=observation(run),plan=run.race.items.plan(owner.seat,'mud-splash',target.seat);assert.equal(observation(run),before);
    assert.equal(plan.ok,Math.abs(delta)<=16);assert.equal(run.race.items.commit(plan),Math.abs(delta)<=16);
  }
});

test('Lantern pauses and resets actual fog exposure then ordinary cadence resumes',()=>{
  const run=collected('fog-lantern'),[owner,leader]=run.session.players;
  for(let hop=0;hop<14;hop++){assert.equal(run.session.dispatch({seat:leader.seat,direction:'forward'}),true);while(leader.hop>0)step(run);}
  step(run,40);assert.ok(run.race.fogState(owner.seat).exposure>0);
  const health=owner.health,plan=run.race.items.plan(owner.seat,'fog-lantern');assert.equal(run.race.items.commit(plan),true);assert.equal(run.race.fogState(owner.seat).exposure,0);
  step(run,359);assert.equal(owner.health,health);assert.equal(run.race.fogState(owner.seat).exposure,0);
  step(run,122);assert.ok(owner.health<health);
});

test('Race item plans deny other modes, malformed policies and catalogues without mutation',async()=>{
  const {planConsumableCredit,validateConsumableCatalogue}=await sources.import('consumables');
  const {RACE_ITEMS}=await sources.import('race-items');
  for(const capabilities of [[],['survive-together'],['relay']])for(const itemId of ['mud-splash','fog-lantern']){
    const owner={id:'p1',generation:0};assert.equal(planConsumableCredit({catalogue:RACE_ITEMS,mode:{capabilities},owner,inventory:{owner,generation:0,charges:{}},expectedInventoryGeneration:0,itemId}).ok,false);
  }
  for(const catalogue of [[],[RACE_ITEMS[0],RACE_ITEMS[0]],[{...RACE_ITEMS[0],price:NaN}],[{...RACE_ITEMS[0],maxCharges:2}]])assert.throws(()=>validateConsumableCatalogue(catalogue));
  const {LocalSession}=await sources.import('session'),game=new Game(113,'pond'),session=LocalSession.stage(game).commit();
  const {DEFAULT_ITEM_SCHEMA}=await sources.import('consumable-drops'),{CONSUMABLES}=await sources.import('consumables');
  for(const patch of [{eligible:undefined},{capabilities:42},{schema:{...DEFAULT_ITEM_SCHEMA,version:'unknown'}},{schema:{...DEFAULT_ITEM_SCHEMA,items:{0:'mud-splash'}}}]){
    assert.throws(()=>session.installConsumableWorld({catalogue:CONSUMABLES,schema:DEFAULT_ITEM_SCHEMA,capabilities:[],eligible:()=>true,activate:()=>false,...patch}));assert.equal(session.consumableSnapshot(),undefined);
  }
});

 test('repeat active effects and protected shop commits keep the newly purchased charge and wallet',()=>{
  for(const item of ['mud-splash','fog-lantern']){
    const run=collected(item),owner=run.session.players[0];assert.equal(run.race.items.commit(run.race.items.plan('p1',item,'p2')),true);
    owner.run.advanceScore(100);owner.run.creditCoins(60);assert.equal(run.session.actCoOpMarket(marketRequest(run,'p1','open')).ok,true);
    assert.equal(run.session.actCoOpMarket(marketRequest(run,'p1','buy-consumable',item)).ok,true);
    const before=observation(run),plan=run.race.items.plan('p1',item,'p2');assert.equal(plan.ok,false);assert.equal(run.race.items.commit(plan),false);assert.equal(observation(run),before);
    const other=item==='mud-splash'?'fog-lantern':'mud-splash',request=marketRequest(run,'p1','buy-consumable',other);
    run.session.updateRecovery(owner,v=>({...v,protectionUntil:run.session.world.time+10}));
    const protectedState=observation(run);assert.equal(run.session.actCoOpMarket(request).ok,false);assert.equal(observation(run),protectedState);
  }
});

test('expired temporary cooldown cannot extend a hop delay beyond its active deadline',()=>{
  const run=flat(raceRun()),p=run.session.players[0];
  assert.equal(p.setHopCooldown(1.35,.01),true);assert.equal(run.session.dispatch({seat:'p1',direction:'forward'}),true);
  while(p.hop>0)step(run);
  assert.equal(p.hopCooldown.multiplier,1);assert.equal(run.session.dispatch({seat:'p1',direction:'forward'}),true);
});
