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
test('bounded actual solo bases retain pinned movement, hazards, recovery, economy and terminal behavior',{timeout:120000},async()=>{
 const results=await runDifferentialMatrix(scenarios,{currentRecorderFactory:createSoloModelRecorder});
 assert.equal(results.length,16);
 for(let index=0;index<results.length;index+=8){
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
});
