import {SOLO_DEFINITION_SOURCE_HASH,validateSoloDefinition} from '../tools/release-coverage/solo-definition-evidence.mjs';
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
   let kind='solo',participants=1,definitionEvidence;
   {
    definitionEvidence=await app.onGame(function(){
     const normalize=v=>v===undefined?{__undefined:true}:typeof v==='function'?{__function:true}:Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
     const frozen=v=>!v||typeof v!=='object'||Object.isFrozen(v)&&Object.values(v).every(frozen);
     return {snapshot:normalize(this.definition),rulesIdentity:this.rules===this.definition.rules&&this.world.definition===this.definition&&this.world.rules===this.rules,deepFrozen:frozen(this.definition)};
    });definitionEvidence.sourceHash=SOLO_DEFINITION_SOURCE_HASH;validateSoloDefinition(definitionEvidence,base);
   }
   const ownership=await app.sessionOwnership();
   if(mode.startsWith('solo-')){
    assert.deepEqual(ownership,{worldIsOwn:true,playerIsOwn:true,sessionActive:false,playerSessionAbsent:true,sessionBindings:0,stageBindings:0},'stable solo has no live or staged session owner');
   }
   if(!mode.startsWith('solo-')){
    const actual=await app.onSession(function(){return {base:this.definition.id,kind:this.mode?.handlers.retainDeadDevice?'race':this.mode?.handlers.canAct?'relay':this.mode?'survive':'uncomposed',participants:this.players.length};});
    assert.equal(actual.base,game.base);kind=actual.kind;participants=actual.participants;
    assert.ok(ownership.sessionBindings>0,'the scope observer finds a committed session');
    assert.equal(ownership.sessionActive,true);assert.equal(ownership.playerSessionAbsent,false);assert.equal(ownership.stageBindings,0);
   }
   assert.equal(game.base,base);assert.equal(game.state,'playing');assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'playing');assert.equal(kind,mode.startsWith('solo-')?'solo':mode.startsWith('survive-')?'survive':mode);
   return {mode,base:game.base,kind,state:game.state,participants,definitionEvidence,ownership:mode.startsWith('solo-')?{...ownership,canonicalDefinition:true,canonicalRules:true}:ownership};
  };
  const before=await snapshotRealm(app.frame,await observe());
  const start=await app.onGame(function(){return {x:this.x,y:this.y,time:this.time};});
  await app.frame.locator('#scene').focus();await app.frame.locator('[data-direction="right"]').click();await app.advance(220);
  const moved=await app.onGame(function(){return {x:this.x,y:this.y,time:this.time};});assert.ok(moved.x>start.x,'actual right hop changes position');assert.ok(moved.time>start.time);
  assert.equal(await app.frame.locator('#character-call').isDisabled(),true,'muted fixture retains unavailable call feedback');
  await app.frame.locator('#pause').click();const paused=await app.onGame(function(){return {x:this.x,y:this.y,time:this.time,state:this.state};});assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'paused');await app.advance(300);assert.deepEqual(await app.onGame(function(){return {x:this.x,y:this.y,time:this.time,state:this.state};}),paused);
  await app.frame.locator(await app.frame.locator('#play').isVisible()?'#play':'#pause').click();await app.advance(32);
  const afterObservation=await observe(),after=await snapshotRealm(app.frame,afterObservation);recordInterval(before,after,mode);
  if(mode.startsWith('solo-')){
   // Outside the attributed interval: demonstrate the observer catches staging
   // even though the actual Game has not adopted a multiplayer session yet.
   await app.frame.locator('#pause').click();await app.frame.locator('#local-play').click();
   const staged=await app.sessionOwnership();assert.ok(staged.stageBindings>0);
   assert.equal(staged.sessionActive,false);assert.equal(staged.playerSessionAbsent,true);
   await app.frame.locator('#local-session-back').click();
   const {canonicalDefinition,canonicalRules,...actualOwnership}=afterObservation.ownership;assert.deepEqual(await app.sessionOwnership(),actualOwnership);
  }
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await app.frame.evaluate(()=>window.marketGameFixture.forbidden),[]);
 }finally{await app.close();}
});
