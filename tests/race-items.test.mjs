import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'race', 'session', 'mode-rules', 'survive-together', 'consumables', 'consumable-drops', 'market/catalog', 'run-seed', 'levels/index', 'coin-denominations', 'death-spill', 'audio']);
after(sources.dispose);
const { Game } = await sources.import('game');
const { createRaceSession } = await sources.import('race');

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
  const seats=[['p1','butter','keyboard-a'],['p2','pip','keyboard-b'],['p3','sunny','gamepad-0'],['p4','moss','gamepad-1']].slice(0,count).map(([seat,characterId,device])=>({seat,characterId,device}));
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
      if(sampleItemDrop(RACE_DROP_SCHEMA,{courseSeed:seed,row:1,slot:0}).itemId!==item)continue;
      const candidate=raceRun(seed),p=candidate.session.consumableSnapshot().pickups.find(p=>p.row===1&&p.itemId===item);
      if(p&&candidate.game.rows.get(1).kind==='river'&&Math.abs(p.x)<3){run=candidate;pickup=p;}
    }
    assert.ok(pickup,'bounded real seeded river item');
    const p=run.session.players[0];locate(run.session.players[1],4,0);
    // Land on the real log with a fractional horizontal hop grid. The default
    // attraction covers its residual half-tile offset; no synthetic item is injected.
    locate(p,pickup.x+.45,0);assert.equal(run.session.dispatch({seat:'p1',direction:'forward'}),true);
    assert.notEqual(p.x,Math.round(p.x));
    for(let i=0;i<120&&!run.session.consumableSnapshot().claims.some(c=>c.pickupId===pickup.id);i++)step(run);
    assert.equal(p.state,'playing');assert.equal(run.session.consumableSnapshot().charges.find(c=>c.seat==='p1')[item],1);
    assert.equal(run.session.consumableSnapshot().claims.filter(c=>c.pickupId===pickup.id).length,1);
  }
});

function marketRequest(run,seat,kind,itemId,patch={}){
  const p=run.session.players.find(p=>p.seat===seat),ctx=run.session.openCoOpMarket({seat,device:p.device,participantId:p.participantId});assert.ok(ctx);
  return {actionId:`market-${seat}-${ctx.runRevision}-${ctx.inventoryGeneration}-${kind}-${itemId}`,seat,device:p.device,participantId:p.participantId,expectedOwnerGeneration:ctx.ownerGeneration,expectedInventoryGeneration:ctx.inventoryGeneration,expectedRunRevision:ctx.runRevision,expectedContextGeneration:ctx.contextGeneration,kind,itemId,...patch};
}
async function catalogRun(){
  const { ITEM_CATALOG }=await sources.import('market/catalog');
  const game=new Game(113,'pond','arcade',false,ITEM_CATALOG,'butter');
  const race=createRaceSession(game,{seats:[{seat:'p1',device:'keyboard-a',characterId:'butter'},{seat:'p2',device:'keyboard-b',characterId:'pip'}]});
  return flat({game,race,session:race.session});
}
test('Race owner shop exact 30 price capacity stale wallet no-waste and explicit legacy catalogue denial',async()=>{
  const run=await catalogRun(),[p1,p2]=run.session.players;p2.run.creditCoins(29);p2.run.advanceScore(100);
  assert.equal(run.session.actCoOpMarket(marketRequest(run,'p2','open')).ok,true);
  let request=marketRequest(run,'p2','buy-consumable','mud-splash'),before=observation(run);
  assert.equal(run.session.actCoOpMarket(request).ok,false);assert.equal(observation(run),before);
  p2.run.creditCoins(1);request=marketRequest(run,'p2','buy-consumable','mud-splash');assert.equal(run.session.actCoOpMarket(request).ok,true);assert.equal(p2.run.wallet,0);assert.equal(p1.run.wallet,0);
  p2.run.creditCoins(30);request=marketRequest(run,'p2','buy-consumable','mud-splash');before=observation(run);assert.equal(run.session.actCoOpMarket(request).ok,false);assert.equal(observation(run),before);
  request=marketRequest(run,'p2','buy-consumable','fog-lantern');assert.equal(run.session.actCoOpMarket({...request,device:'keyboard-a'}).ok,false);assert.equal(run.session.actCoOpMarket(request).ok,true);
  before=observation(run);assert.equal(run.session.actCoOpMarket(request).ok,false);assert.equal(observation(run),before);
  for(const id of ['revival','flare']){request=marketRequest(run,'p2','buy-consumable',id);before=observation(run);assert.equal(run.session.actCoOpMarket(request).ok,false);assert.equal(observation(run),before);}
  const context=run.session.coOpMarketSnapshot();assert.deepEqual(context.offers.filter(o=>o.source==='consumable').map(o=>o.itemId),['mud-splash','fog-lantern']);
  for(const item of p2.run.catalog.values()){
    assert.equal(p2.run.itemEligible(item.id),item.kind==='cosmetic');
    if(item.kind==='cosmetic')continue;
    const offer={id:`forged-${item.id}`,itemId:item.id,price:1,sold:false};p2.run.market.offers.push(offer);p2.run.creditCoins(100);
    const wallet=p2.run.wallet;assert.equal(p2.run.buy(offer.id).ok,false);assert.equal(p2.run.wallet,wallet);assert.equal(offer.sold,false);
  }
  const filtered=run.session.coOpMarketSnapshot();assert.ok(filtered.offers.every(o=>o.source==='consumable'||p2.run.catalog.get(o.itemId).kind==='cosmetic'));
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
