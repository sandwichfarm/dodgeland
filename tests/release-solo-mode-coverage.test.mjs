import test from 'node:test';
import assert from 'node:assert/strict';
import {runDifferentialMatrix} from './solo-parity-snapshot.mjs';
import {createSoloModelRecorder} from '../tools/release-coverage/solo-model-attribution.mjs';
import {PINNED_BASELINE_SHA} from './solo-baseline.mjs';
const step=count=>({kind:'step',count});
function lane(game,module,kind='meadow',extra={}){
 game.rows.set(0,{...module.generateLane(game.seed,0,game.home,game.gentle),index:0,kind,blocked:[],decorations:[],coin:null,phase:0,speed:kind==='river'?.5:0,spacing:20,length:kind==='river'?5:1.15,variant:0,...extra});
}
const scenarios=[];
for(const mode of ['arcade','stroll']){
 const base={mode,home:'pond',characterId:'butter',keepTrace:true};
 scenarios.push(
  {...base,name:`${mode}-movement`,seed:0x10203040,tape:[{kind:'move',direction:'forward'},{kind:'move',direction:'forward'},step(18),{kind:'move',direction:'left'},step(18),{kind:'move',direction:'back'},step(18),{kind:'move',direction:'right'}]},
  {...base,name:`${mode}-traffic`,seed:19,setup:(game,module)=>{lane(game,module,'road');game.state='playing';game.x=game.fromX=.975;},tape:[{kind:'move',direction:'left'},step(24)]},
  {...base,name:`${mode}-river`,seed:23,setup:(game,module)=>{lane(game,module,'river');game.state='playing';},tape:[step(24)]},
  {...base,name:`${mode}-pause-hurt`,seed:79,setup:(game,module)=>{lane(game,module,'road');game.state='playing';game.x=game.fromX=-.975;},tape:[{kind:'move',direction:'right'},step(18),{kind:'call',method:'pause'},step(24),{kind:'call',method:'resume'},step(24)]},
  {...base,name:`${mode}-market`,seed:41,setup:game=>{game.state='playing';},tape:[{kind:'call',target:'run',method:'advanceScore',args:[100]},{kind:'call',method:'openMarket'},step(12),{kind:'call',method:'closeMarket'},step(12)]},
  {...base,name:`${mode}-terminal`,seed:59,setup:game=>{game.state='playing';game.run.creditCoins(9);},tape:[{kind:'call',method:'end',args:['terminal ordering','traffic','front']},step(12),{kind:'call',method:'advanceDeathVisuals',args:[.25]}]},
  {...base,name:`${mode}-actors`,seed:443,setup:game=>{game.state='playing';game.maxY=game.y=game.fromY=400;game.time=45;game.ensureRows();},tape:[step(12),{kind:'fixture',apply:(game,module)=>{
   const river=[...game.rows.values()].find(lane=>lane.kind==='river'&&lane.actors);assert.ok(river,'generated progressive river exists');
   const actor=module.laneActors(river,game.time).find(actor=>Math.abs(actor.x)<3);assert.ok(actor,'visible platform');
   game.state='playing';game.y=game.fromY=game.maxY=river.index;game.x=game.fromX=actor.x;game.hop=0;game.waveRow=river.index-100;
   river.coin=0;river.coinActor=actor.id;river.coinDenomination='bar';const before=game.coins;
   const anchor=module.coinPosition(river,game.time);assert.ok(anchor);assert.equal(anchor.y,river.index);
   for(let n=0;n<24;n++)game.update(1/120);
   assert.equal(game.state,'playing');assert.equal(river.coin,null);assert.equal(game.coins,before+2);assert.notEqual(game.x,actor.x,'real platform carries rider');
   return {coins:game.coins,anchor,carried:game.x};
  }}]},
  {...base,name:`${mode}-mobs`,seed:207,setup:game=>{game.state='playing';game.maxY=game.y=game.fromY=160;game.time=45;game.ensureRows();},tape:[step(24),{kind:'fixture',apply:(game,module)=>{
   if(mode==='stroll'){assert.equal(game.mobs.length,0);for(let n=0;n<480;n++)game.update(1/120);assert.equal(game.mobs.length,0);return {disabled:true};}
   const observed={};
   for(const kind of ['slime','crab','wasp']){
    game.state='playing';game.x=game.fromX=0;game.y=game.fromY=game.maxY=160;game.hop=0;game.waveRow=-100;game.powerLandingGrace=100;
    for(let row=157;row<=165;row++)safeRow(game,module,row);game.mobs.length=0;
    const mob={id:900,kind,x:1,y:160,fromX:1,fromY:160,targetX:1,targetY:160,phase:'rest',phaseLeft:.001,phaseDuration:.001};game.mobs.push(mob);
    const phases=new Set();for(let n=0;n<960;n++){game.update(1/120);phases.add(mob.phase);}
    if(kind==='slime')assert.ok(phases.has('walking'),'slime plans real walking');else for(const phase of ['windup','moving','rest'])assert.ok(phases.has(phase),`${kind} reaches ${phase}`);
    assert.equal(game.state,'playing');observed[kind]=[...phases];
   }return observed;
  }}]},
 );
}
// Eight extra lifetimes: six independently bound schema Games and one longer same-owner tape per base.
function safeRow(game,module,row){game.rows.set(row,{...module.generateLane(game.seed,row,game.home,game.gentle),index:row,kind:'meadow',blocked:[],decorations:[],coin:null,coinActor:undefined,actors:undefined,phase:0,speed:0,spacing:20,length:4,variant:0});}
function paidOffer(game,id){const item=game.run.catalog.get(id);assert.ok(item);const offer={id:`bounded-${id}-${game.run.revision}`,itemId:id,price:item.price,sold:false};game.run.market.offers.push(offer);const before=game.run.wallet;const result=game.run.buy(offer.id);assert.equal(result.ok,true,result.message);assert.equal(game.run.wallet,before-item.price);return result;}
const breadth=[];
for(const mode of ['arcade','stroll']){
 for(const schema of [1,2,3])breadth.push({name:`${mode}-schema-${schema}`,mode,fromSeed:true,seed:{schema,seed:0xffffffff,home:'shuffle',mode,gentle:true},setup:game=>{game.state='playing';game.maxY=game.y=game.fromY=1000000;game.ensureRows();},tape:[step(24)]});
 const tape=[];
 for(const [denomination,value]of [['coin',1],['bar',2],['small-sack',5],['big-sack',10],['huge-sack',25]])tape.push(
  {kind:'fixture',apply:(game,module)=>{safeRow(game,module,1);Object.assign(game.rows.get(1),{coin:0,coinDenomination:denomination});return game.coins;}},
  step(240),
  {kind:'fixture',apply:game=>{assert.equal(game.rows.get(1).coin,null,`${denomination} collected`);assert.equal(game.attractedCoins.has(1),false,'resolved pull cleaned');return {denomination,value,coins:game.coins};}}
 );
 tape.push({kind:'fixture',apply:game=>{
  const coins=game.coins;assert.equal(coins,43,'all five denominations credited once');
  assert.equal(game.openMarket(),true);
  for(const card of [...game.run.cards])assert.equal(game.run.sell(card.id).ok,true);
  const card=paidOffer(game,'coin-multiplier').cards[0];assert.equal(game.run.sell(card.id).ok,true);assert.equal(game.run.sell(card.id).ok,false);
  const before=game.run.wallet;paidOffer(game,'pack-pocket');const paid=game.run.wallet;assert.ok(paid<before);const draft=game.run.pendingPack;assert.equal(draft.choices.length,3);const selected=draft.choices[2].id;
  assert.equal(game.run.claimPack([selected]).ok,true);assert.equal(game.run.wallet,paid,'claim never charges again');assert.equal(game.run.claimPack([selected]).ok,false);
  for(const owned of [...game.run.cards])assert.equal(game.run.sell(owned.id).ok,true);
  paidOffer(game,'pack-pocket');assert.equal(game.run.skipPack().ok,true);assert.equal(game.run.skipPack().ok,false);
  // A paid full hand must explicitly replace one owned card when claiming a paid pack.
  while(game.run.cards.length<game.run.cardCapacity)paidOffer(game,'coin-multiplier');
  paidOffer(game,'pack-pocket');const replacement=game.run.pendingPack.choices.find(card=>card.components.every(component=>!['extra-pocket','broad-deck'].includes(component.itemId))).id,discard=game.run.cards[0].id;
  assert.equal(game.run.previewPack([replacement]).valid,false,'full hand cannot silently expand');
  assert.equal(game.run.previewPack([replacement],[discard,discard]).valid,false,'duplicate discard rejected');
  const replacementWallet=game.run.wallet;
  assert.equal(game.run.claimPack([replacement],[discard]).ok,true);
  assert.equal(game.run.wallet,replacementWallet);assert.equal(game.run.cards.some(card=>card.id===discard),false);
  assert.equal(game.run.cards.length,game.run.cardCapacity);
  for(const owned of [...game.run.cards])assert.equal(game.run.sell(owned.id).ok,true);
  paidOffer(game,'look-hat-cap');paidOffer(game,'look-hat-aviator');
  assert.equal(game.run.equippedCosmetics.find(item=>item.appearance.style==='hat').id,'look-hat-aviator');
  assert.equal(game.run.equipCosmetic('look-hat-cap').ok,true);
  assert.equal(game.run.equippedCosmetics.find(item=>item.appearance.style==='hat').id,'look-hat-cap');
  const equippedRevision=game.run.revision;assert.equal(game.run.equipCosmetic('look-hat-cap').ok,true);assert.equal(game.run.revision,equippedRevision);
  paidOffer(game,'score-income');assert.equal(game.run.advanceScore(125),1,'held score card earns on new threshold');assert.equal(game.run.advanceScore(125),0);
  for(const owned of [...game.run.cards])assert.equal(game.run.sell(owned.id).ok,true);
  paidOffer(game,'power-coin-rush');game.closeMarket();game.run.tick(2);
  assert.equal(game.run.powers[0].remaining,6);assert.equal(game.openMarket(),true);
  paidOffer(game,'power-coin-rush');assert.equal(game.run.powers.length,1);assert.equal(game.run.powers[0].remaining,8,'refresh does not duplicate active power');
  game.closeMarket();game.run.tick(8);assert.equal(game.run.powers.length,0);assert.equal(game.run.effects.coinMultiplier,1,'expiry removes modifiers');
  // Renew the real invitation after active time, then generate fresh rows with a held modifier.
  game.run.advanceScore(200);assert.equal(game.openMarket(),true);paidOffer(game,'scenery-clear');game.closeMarket();
  return {coins,packClosed:game.run.pendingPack===null};
 }});
 tape.push({kind:'fixture',apply:(game,module)=>{
  game.rows.clear();game.ensureRows();let originalBlocked=0,retainedBlocked=0;
  for(const [row,lane]of game.rows){originalBlocked+=module.generateLane(game.seed,row,game.home,game.gentle).blocked.length;retainedBlocked+=lane.blocked.length;}
  assert.ok(originalBlocked>retainedBlocked,'held scenery card clears newly generated blockers');
  assert.equal(game.openMarket(),true);for(const card of [...game.run.cards])assert.equal(game.run.sell(card.id).ok,true);game.closeMarket();
  return {originalBlocked,retainedBlocked};
 }});
 tape.push({kind:'fixture',apply:(game,module)=>{game.health=1;game.hurtRemaining=0;game.maxY=game.y=game.fromY=0;game.hop=0;game.waveRow=-100;safeRow(game,module,0);}});
 for(let row=1;row<=100;row++)tape.push({kind:'fixture',apply:(game,module)=>safeRow(game,module,row)},{kind:'move',direction:'forward'},step(18));
 tape.push({kind:'fixture',apply:game=>{assert.equal(game.maxY,100);assert.equal(game.health,1.5,'real100-row regeneration');return {health:game.health,milestone:game.healedMilestone};}});
 for(const [characterId,cause]of [['butter','water'],['sunny','traffic'],['pip','mob'],['petal','traffic'],['beep','train'],['rust','mob'],['pebble','wave']])tape.push(
  {kind:'fixture',apply:(game,module)=>{game.setCharacter(characterId);assert.equal(game.characterId,characterId);game.state='playing';game.health=game.maxHealth;game.hurtRemaining=0;game.powerReadyAt=0;game.powerRescue=null;game.powerLandingGrace=0;game.hop=0;game.caughtByWave=false;game.waveRow=-100;game.mobs.length=0;for(let row=game.y-3;row<=game.y+5;row++)safeRow(game,module,row);}},
  {kind:'call',method:'end',args:['bounded innate rescue',cause,characterId==='petal'?'rear':undefined]},step(12)
 );
 tape.push({kind:'fixture',apply:game=>{assert.ok(game.run.cosmetics.length>=2);game.powerReadyAt=game.maxY+100;game.powerRescue=null;game.powerLandingGrace=0;game.hurtRemaining=0;game.state='playing';game.end('owned cosmetics fatal spill','train');assert.equal(game.state,'dead');assert.equal(game.run.cosmetics.length,0);assert.ok(game.deathSpill.cosmetics.length>=2);return {spilled:game.deathSpill.cosmetics};}});
 breadth.push({name:`${mode}-paid-pickup-health-powers`,seed:113,mode,catalogIds:['magnet','coin-multiplier','regen-bonus','extra-pocket','broad-deck','crossing-guard','pack-pocket','look-hat-cap','look-hat-aviator','score-income','power-coin-rush','scenery-clear'],setup:(game,module)=>{game.state='playing';safeRow(game,module,0);game.run.advanceScore(100);assert.equal(game.openMarket(),true);game.run.creditCoins(1000);paidOffer(game,'magnet');game.closeMarket();},tape});
}
// A rejected trade must leave the current run usable, including a paid draft.
// Use actual authored items and compare every observation to the pinned game.
for(const mode of ['arcade','stroll'])breadth.push({
 name:`${mode}-shop-boundaries`,seed:113,mode,
 catalogIds:['coin-multiplier','magnet','regen-bonus','extra-pocket','score-income','broad-deck','scenery-clear','pack-pocket','pack-satchel','look-shirt-sailor','look-halo','power-shield','power-freeze'],
 setup:(game,module)=>{game.state='playing';safeRow(game,module,0);game.run.advanceScore(100);game.run.creditCoins(2.375);},
 tape:[{kind:'fixture',apply:game=>{
  const run=game.run;
  const snapshot=()=>JSON.stringify({run,state:game.state,x:game.x,y:game.y,hop:game.hop,time:game.time,coins:game.coins,health:game.health});
  const reject=action=>{const before=snapshot(),result=action();assert.equal(result.ok,false,result.message);assert.equal(snapshot(),before,'rejection cannot debit, advance RNG, discard assets or move the duck');};
  const offerFor=id=>{const item=run.catalog.get(id);assert.ok(item);const offer={id:`guard-${id}-${run.market.offers.length}`,itemId:id,price:item.price,sold:false};run.market.offers.push(offer);return offer;};
  reject(()=>run.buy('missing'));
  reject(()=>run.equipCosmetic('look-shirt-sailor'));
  reject(()=>run.claimPack([]));reject(()=>run.sell('missing'));
  assert.equal(game.openMarket(),true);
  assert.equal(game.move('forward'),false,'shopping cannot move the duck');
  reject(()=>run.buy('missing'));reject(()=>run.equipCosmetic('look-shirt-sailor'));
  const unaffordable=offerFor('coin-multiplier');reject(()=>run.buy(unaffordable.id));
  assert.equal(unaffordable.sold,false);
  run.creditCoins(2000);
  assert.equal(run.buy(unaffordable.id).ok,true);reject(()=>run.buy(unaffordable.id));
  for(const card of [...run.cards])assert.equal(run.sell(card.id).ok,true);
  const pocket=paidOffer(game,'extra-pocket').cards[0];
  for(let n=0;n<4;n++)paidOffer(game,'coin-multiplier');
  assert.equal(run.cards.length,5);assert.equal(run.cardCapacity,5);
  reject(()=>run.sell(pocket.id));
  const overflow=offerFor('magnet');reject(()=>run.buy(overflow.id));assert.equal(overflow.sold,false);
  assert.equal(run.sell(run.cards.find(card=>card.id!==pocket.id).id).ok,true);
  assert.equal(run.sell(pocket.id).ok,true);assert.equal(run.cards.length,3);assert.equal(run.cardCapacity,3);

  paidOffer(game,'pack-pocket');
  const draft=run.pendingPack,paid=run.wallet;
  reject(()=>run.buy(overflow.id));reject(()=>run.claimPack([]));reject(()=>run.claimPack(['outside-draft']));
  const choice=draft.choices.find(card=>card.components.every(c=>c.itemId!=='extra-pocket')).id;
  reject(()=>run.claimPack([choice]));
  reject(()=>run.claimPack([choice],['outside-hand']));
  const discard=run.cards[0].id;
  assert.equal(run.claimPack([choice],[discard]).ok,true);
  assert.equal(run.cards.length,3);assert.equal(run.cards.some(card=>card.id===discard),false);
  assert.equal(run.wallet,paid);reject(()=>run.claimPack([choice]));
  for(const card of [...run.cards])assert.equal(run.sell(card.id).ok,true);

  let bonus=0;
  for(let n=0;n<8;n++){
   paidOffer(game,'pack-satchel');const draft=run.pendingPack,wallet=run.wallet;
   assert.equal(draft.choices.length,5);assert.equal(new Set(draft.choices.map(card=>card.id)).size,5);
   assert.equal(draft.picks,draft.bonus?2:1);
   if(draft.bonus){bonus++;reject(()=>run.claimPack([draft.choices[0].id,draft.choices[0].id]));}
   assert.equal(run.skipPack().ok,true);assert.equal(run.wallet,wallet);assert.equal(run.cards.length,0);
  }
  assert.ok(bonus>0,'fixed paid-pack sequence exercises an actual two-pick bonus');
  paidOffer(game,'look-shirt-sailor');paidOffer(game,'look-halo');
  assert.deepEqual(run.equippedCosmetics.map(item=>item.id).sort(),['look-halo','look-shirt-sailor']);
  const duplicateLook=offerFor('look-shirt-sailor');reject(()=>run.buy(duplicateLook.id));
  paidOffer(game,'power-shield');paidOffer(game,'power-freeze');game.closeMarket();
  assert.ok(run.effects.shield>0);assert.equal(run.advanceScore(125),0,'temporary protection earns no score income');
  game.end('shielded traffic contact','traffic');assert.equal(game.state,'playing');
  const remaining=Math.max(...run.powers.map(power=>power.remaining));run.tick(remaining);
  assert.equal(run.powers.length,0);assert.equal(run.effects.shield,0);
  game.end('unshielded train contact','train');assert.equal(game.state,'dead');
  assert.equal(run.wallet,0);assert.equal(run.cosmetics.length,0);assert.equal(run.cards.length,0);
  reject(()=>run.sell('missing'));reject(()=>run.buy(overflow.id));reject(()=>run.claimPack([]));
  assert.equal(game.openMarket(),false);
  return {bonus,capacity:run.cardCapacity,dead:game.state};
 }}],
});

const hazardNames=[];
for(const mode of ['arcade','stroll']){
 const base={mode,home:'pond',characterId:'butter',seed:23};
 for(const direction of [-1,1])for(const boxed of [false,true]){
  const name=`${mode}-side-contact-${direction}-${boxed?'boxed':'clear'}`;hazardNames.push(name);
  breadth.push({...base,name,setup:(game,module)=>{
   for(const row of game.rows.keys())safeRow(game,module,row);
   lane(game,module,'road',{direction,speed:0});
   if(boxed){game.rows.get(-1).blocked=[0];game.rows.get(1).blocked=[0];}
   game.state='playing';game.y=game.fromY=-1;
  },tape:[{kind:'move',direction:'forward'},step(36),{kind:'fixture',apply:game=>{
   assert.equal(game.state,'playing');assert.equal(game.health,1,'a side contact removes two feathers once');
   assert.ok(game.hurtRemaining>0,'the overlap cannot immediately apply another hit');
   if(boxed){assert.equal(game.y,0,'no recoil is forced into either blocked refuge');assert.equal(game.hop,0);}
   return {health:game.health,y:game.y};
  }}]});
 }
 {
  const name=`${mode}-unsafe-water`;hazardNames.push(name);
  breadth.push({...base,name,setup:(game,module)=>{
   for(const row of game.rows.keys())game.rows.set(row,{...module.generateLane(game.seed,row,game.home),index:row,kind:'river',actors:undefined,blocked:[],coin:null,phase:10,speed:0,spacing:20,length:2});
   for(const row of [-1,1]){safeRow(game,module,row);game.rows.get(row).blocked=Array.from({length:11},(_,i)=>i-5);}
   game.state='playing';game.run.creditCoins(9);
  },tape:[step(1),{kind:'fixture',apply:game=>{
   assert.equal(game.state,'dead');assert.equal(game.deathCause,'water');assert.equal(game.powerRescue,null);
   assert.equal(game.powerRemaining,0,'an impossible landing never spends the innate charge');
   assert.equal(game.run.wallet,0);assert.equal(game.deathSpill.wallet,9);
   return {cause:game.deathCause,wallet:game.run.wallet};
  }}]});
 }
 {
  const name=`${mode}-river-edge-bounce`;hazardNames.push(name);
  breadth.push({...base,name,setup:(game,module)=>{
   for(const row of game.rows.keys())safeRow(game,module,row);
   lane(game,module,'river',{phase:5.51,speed:0,length:4});game.state='playing';game.x=game.fromX=5.51;
  },tape:[step(1),{kind:'fixture',apply:game=>{
   assert.equal(game.state,'playing');assert.ok(game.powerRescue);assert.equal(game.powerRemaining,100);
   assert.equal(game.maxY,0,'the bank rescue grants no forward progress');assert.equal(game.coins,0);
   return {cause:game.powerRescue.power.id,x:game.x,y:game.y};
  }}]});
 }
 for(const shield of [false,true]){
  const name=`${mode}-train-${shield?'shield':'fatal'}`;hazardNames.push(name);
  breadth.push({...base,name,catalogIds:shield?['power-shield']:[],setup:(game,module)=>{
   for(const row of game.rows.keys())safeRow(game,module,row);game.state='playing';
   if(shield){game.run.advanceScore(100);game.run.creditCoins(100);assert.equal(game.openMarket(),true);paidOffer(game,'power-shield');game.closeMarket();}
   lane(game,module,'rail',{phase:2.375,period:9,warning:1.5,speed:1});
  },tape:[step(1),{kind:'fixture',apply:game=>{
   assert.equal(game.state,shield?'playing':'dead');assert.equal(game.health,shield?3:0);
   assert.equal(game.powerRemaining,0,'a train never consumes the duck water rescue');
   if(!shield)assert.equal(game.deathCause,'train');
   return {state:game.state,health:game.health};
  }}]});
 }
 {
  const name=`${mode}-generated-coin-modifiers`;hazardNames.push(name);
  breadth.push({...base,name,catalogIds:['coin-chance','river-coins','road-coins'],setup:(game,module)=>{
   game.state='playing';game.run.advanceScore(100);game.run.creditCoins(1000);assert.equal(game.openMarket(),true);
   for(const id of ['coin-chance','river-coins','road-coins'])paidOffer(game,id);game.closeMarket();
   game.y=game.fromY=game.maxY=200;
  },tape:[{kind:'fixture',apply:(game,module)=>{
   game.rows.clear();game.ensureRows();
   const streams=[...game.rows.values()].filter(row=>row.kind==='river');
   assert.ok(streams.some(row=>row.coin!==null),'held River Gold creates actual progressive stream pickups');
   assert.ok([...game.rows.values()].some(row=>row.index>203&&row.coinActor===null),'distant platform binding stays deferred');
   const before=game.coins;
   game.rows.set(200,{...module.generateLane(game.seed,200,game.home),index:200,kind:'road',actors:undefined,blocked:[],coin:0,coinActor:undefined,phase:10,speed:0,spacing:20,length:1.15});
   game.update(0);assert.equal(game.coins,before+2,'Road Toll adds exactly one to the touching ordinary coin');
   assert.equal(game.rows.get(200).coin,null);assert.equal(game.state,'playing');
   return {streamCoins:streams.filter(row=>row.coin!==null).map(row=>row.index),coins:game.coins};
  }}]});
 }
}

test('bounded actual solo bases retain pinned movement, hazards, recovery, economy and terminal behavior',{timeout:120000},async()=>{
 const results=await runDifferentialMatrix([...scenarios,...breadth],{currentRecorderFactory:createSoloModelRecorder});
 assert.equal(results.length,44);
 for(let index=0;index<16;index+=8){
  const [movement,traffic,river,hurt,market,terminal,actors,mobs]=results.slice(index,index+8);
  for(const result of results.slice(index,index+8)){assert.equal(result.baselineSha,PINNED_BASELINE_SHA);assert.ok(result.points>1);}
  assert.ok(movement.results.some(p=>p.result===true));assert.ok(movement.results.some(p=>p.result===false));
  assert.ok(Array.isArray(traffic.final.game.gameFuture.touchingCars));assert.equal(river.final.game.state,'playing');
  assert.equal(hurt.trace[20].game.hurtRemaining,hurt.trace[44].game.hurtRemaining);assert.ok(hurt.final.game.hurtRemaining<hurt.trace[44].game.hurtRemaining);
  assert.equal(market.final.game.inventory.future.maxScore,100);assert.equal(market.final.game.inventory.visible.isOpen,false);
  assert.equal(terminal.final.game.deathSpill.wallet,9);assert.equal(terminal.final.game.time,0);
  assert.deepEqual(terminal.final.callbacks.find(e=>e.name==='onEnd').payload.inventoryCleared,{wallet:0,cards:[],powers:[],cosmetics:[]});
  assert.ok(actors.final.game.rows.length>0);if(scenarios[index+7].mode==='arcade')assert.ok(mobs.final.game.mobs.actors.length>0,'Arcade pursuers must spawn');else assert.equal(mobs.final.game.mobs.actors.length,0,'Flow definition disables pursuers');
 }
 for(const [index,scenario]of breadth.entries()){
  const result=results[16+index];assert.equal(result.baselineSha,PINNED_BASELINE_SHA);
  if(scenario.name.includes('-schema-')){assert.equal(result.final.game.rows.length,39);assert.equal(result.final.game.rows[0].row,999990);assert.equal(result.final.game.rows.at(-1).row,1000028);assert.equal(result.final.game.runSeed.schema,scenario.seed.schema);}
  else if(scenario.name.endsWith('-paid-pickup-health-powers')){assert.deepEqual(result.final.callbacks.filter(e=>e.name==='onCoin').map(e=>e.payload.amount),[1,2,5,10,25]);assert.equal(result.final.callbacks.filter(e=>e.name==='onPower').length,7,'all seven authored traveler powers execute');assert.ok(result.final.callbacks.some(e=>e.name==='onHeal'&&e.payload.amount===.5));}
  else if(scenario.name.endsWith('-shop-boundaries')){assert.equal(result.final.game.state,'dead');assert.equal(result.final.game.inventory.visible.wallet,0);assert.deepEqual(result.final.game.inventory.visible.cards,[]);}
  else assert.ok(hazardNames.includes(scenario.name),'each added hazard has explicit in-tape assertions and pinned final comparison');
 }
});
