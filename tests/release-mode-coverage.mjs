import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarketGameFixture } from './market-game-fixture.mjs';
import { snapshotRealm, recordInterval } from '../tools/release-coverage/browser.mjs';

for(const mode of ['solo-arcade','solo-flow','survive-arcade','survive-flow','relay','race'])test(`exclusive actual ${mode} interval`,{timeout:60000},async()=>{
 const base=mode.endsWith('arcade')?'arcade':'stroll';
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{sender:'release-mode-proof',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed:`ph3-00000071-pond-${base==='arcade'?'a':'s'}-n`}}});
 try{
  if(mode.startsWith('solo-'))await app.frame.locator('#play').click();
  else{
   if(mode.startsWith('survive-')){await app.frame.locator('#play').click();await app.frame.locator('#pause').click();}
   await app.frame.locator('#local-play').click();
   if(mode==='relay')await app.frame.locator('#relay-play').click();
   if(mode==='race')await app.frame.locator('#race-play').click();
   await app.frame.locator('#local-session-start').click();
  }
  await app.advance(32);
  const observe=async()=>{
   const game=await app.onGame(function(){return {base:this.definition.id,state:this.state};});
   let kind='solo',participants=1;
   if(!mode.startsWith('solo-')){
    const actual=await app.onSession(function(){return {base:this.definition.id,kind:this.mode?.handlers.retainDeadDevice?'race':this.mode?.handlers.canAct?'relay':this.mode?'survive':'uncomposed',participants:this.players.length};});
    assert.equal(actual.base,game.base);kind=actual.kind;participants=actual.participants;
   }
   assert.equal(game.base,base);assert.equal(game.state,'playing');assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'playing');assert.equal(kind,mode.startsWith('solo-')?'solo':mode.startsWith('survive-')?'survive':mode);
   return {mode,base:game.base,kind,state:game.state,participants};
  };
  const before=await snapshotRealm(app.frame,await observe());
  const start=await app.onGame(function(){return {x:this.x,y:this.y,time:this.time};});
  await app.frame.locator('#scene').focus();await app.frame.locator('[data-direction="right"]').click();await app.advance(220);
  const moved=await app.onGame(function(){return {x:this.x,y:this.y,time:this.time};});assert.ok(moved.x>start.x,'actual right hop changes position');assert.ok(moved.time>start.time);
  assert.equal(await app.frame.locator('#character-call').isDisabled(),true,'muted fixture retains unavailable call feedback');
  await app.frame.locator('#pause').click();const paused=await app.onGame(function(){return {x:this.x,y:this.y,time:this.time,state:this.state};});assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'paused');await app.advance(300);assert.deepEqual(await app.onGame(function(){return {x:this.x,y:this.y,time:this.time,state:this.state};}),paused);
  await app.frame.locator(await app.frame.locator('#play').isVisible()?'#play':'#pause').click();await app.advance(32);
  const after=await snapshotRealm(app.frame,await observe());recordInterval(before,after,mode);
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await app.frame.evaluate(()=>window.marketGameFixture.forbidden),[]);
 }finally{await app.close();}
});
