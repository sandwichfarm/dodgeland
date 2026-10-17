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
  {...base,name:`${mode}-actors`,seed:443,setup:game=>{game.state='playing';game.maxY=game.y=game.fromY=400;game.time=45;game.ensureRows();},tape:[step(12)]},
  {...base,name:`${mode}-mobs`,seed:207,setup:game=>{game.state='playing';game.maxY=game.y=game.fromY=160;game.time=45;game.ensureRows();},tape:[step(24)]},
 );
}
// Eight extra lifetimes: six independently bound schema Games and one longer same-owner tape per base.
function safeRow(game,module,row){game.rows.set(row,{...module.generateLane(game.seed,row,game.home,game.gentle),index:row,kind:'meadow',blocked:[],decorations:[],coin:null,coinActor:undefined,actors:undefined,phase:0,speed:0,spacing:20,length:4,variant:0});}
function paidOffer(game,id){const item=game.run.catalog.get(id);assert.ok(item);const offer={id:`bounded-${id}-${game.run.revision}`,itemId:id,price:item.price,sold:false};game.run.market.offers.push(offer);const before=game.run.wallet;const result=game.run.buy(offer.id);assert.equal(result.ok,true,result.message);assert.equal(game.run.wallet,before-item.price);return result;}
const breadth=[];
for(const mode of ['arcade','stroll']){
 for(const schema of [1,2,3])breadth.push({name:`${mode}-schema-${schema}`,mode,seed:{schema,seed:0xffffffff,home:'shuffle',mode,gentle:true},setup:game=>{game.state='playing';game.maxY=game.y=game.fromY=1000000;game.ensureRows();},tape:[step(24)]});
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
  game.closeMarket();return {coins,packClosed:game.run.pendingPack===null};
 }});
 tape.push({kind:'fixture',apply:(game,module)=>{game.health=1;game.hurtRemaining=0;game.maxY=game.y=game.fromY=0;game.hop=0;game.waveRow=-100;safeRow(game,module,0);}});
 for(let row=1;row<=100;row++)tape.push({kind:'fixture',apply:(game,module)=>safeRow(game,module,row)},{kind:'move',direction:'forward'},step(18));
 tape.push({kind:'fixture',apply:game=>{assert.equal(game.maxY,100);assert.equal(game.health,1.5,'real100-row regeneration');return {health:game.health,milestone:game.healedMilestone};}});
 for(const [characterId,cause]of [['butter','water'],['sunny','traffic'],['pip','mob'],['petal','traffic'],['beep','train'],['rust','mob'],['pebble','wave']])tape.push(
  {kind:'fixture',apply:(game,module)=>{game.characterId=characterId;game.state='playing';game.health=game.maxHealth;game.hurtRemaining=0;game.powerReadyAt=0;game.powerRescue=null;game.powerLandingGrace=0;game.hop=0;game.caughtByWave=false;game.waveRow=-100;game.mobs.length=0;for(let row=game.y-3;row<=game.y+5;row++)safeRow(game,module,row);}},
  {kind:'call',method:'end',args:['bounded innate rescue',cause,characterId==='petal'?'rear':undefined]},step(12)
 );
 breadth.push({name:`${mode}-paid-pickup-health-powers`,seed:113,mode,catalogIds:['magnet','coin-multiplier','regen-bonus','extra-pocket','broad-deck','crossing-guard','pack-pocket'],setup:(game,module)=>{game.state='playing';safeRow(game,module,0);game.run.advanceScore(100);assert.equal(game.openMarket(),true);game.run.creditCoins(1000);paidOffer(game,'magnet');game.closeMarket();},tape});
}
test('bounded actual solo bases retain pinned movement, hazards, recovery, economy and terminal behavior',{timeout:120000},async()=>{
 const results=await runDifferentialMatrix([...scenarios,...breadth],{currentRecorderFactory:createSoloModelRecorder});
 assert.equal(results.length,24);
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
  else{assert.deepEqual(result.final.callbacks.filter(e=>e.name==='onCoin').map(e=>e.payload.amount),[1,2,5,10,25]);assert.equal(result.final.callbacks.filter(e=>e.name==='onPower').length,7,'all seven authored traveler powers execute');assert.ok(result.final.callbacks.some(e=>e.name==='onHeal'&&e.payload.amount===.5));}
 }
});
