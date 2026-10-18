import test,{after} from 'node:test';
import {loadSources} from '../../tests/source-loader.mjs';
import {createSoloModelRecorder} from './solo-model-attribution.mjs';
const source=await loadSources(['game','mode-rules','session']);after(()=>source.dispose());
const modeRules=await source.import('mode-rules');
const {Game}=await source.import('game');
const sessionModule=await source.import('session');
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {instrumentSources} from './instrument.mjs';
import {bootstrapSnapshot,createSoloBootstrapRecorder} from './solo-bootstrap-attribution.mjs';

const fake=base=>{const definition=modeRules.soloModeDefinition(base),game={definition,rules:definition.rules,state:'ready'};game.world={host:game,definition,rules:definition.rules,sessionActive:false};game.player={world:game.world,primary:true};return game;};
test('wrong actual base, hidden staged construction and failed import cannot complete bootstrap',async()=>{
 for(const failure of ['base','stage','import']){
  const recorder=await createSoloBootstrapRecorder(null),session={LocalSession:{stage(){return {};}}},original=session.LocalSession.stage;
  await assert.rejects(()=>recorder.witness('reject','arcade',async()=>{if(failure==='import')throw Error('import failed');return{session,modeRules};},()=>{if(failure==='stage')session.LocalSession.stage();return fake(failure==='base'?'stroll':'arcade');},async()=>{}));
  assert.equal(session.LocalSession.stage,original);await assert.rejects(()=>recorder.finish(),/Incomplete/);
 }
});
test('fresh imports execute separately, cached imports do not, and oracle adds no counters',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'bootstrap-calibration-')),previous=globalThis.__coverage__;
 // Tooling-only synthetic realm; production never resets counters.
 delete globalThis.__coverage__;
 try{
  const inventory=instrumentSources({'game.ts':'export const initialized = 7;'},'/bootstrap-calibration'),row=Object.values(inventory)[0],identity={runId:'synthetic',realmId:'synthetic'};
  const before=bootstrapSnapshot(inventory,undefined,identity);assert.equal(globalThis.__coverage__,undefined);
  await writeFile(join(dir,'first.mjs'),row.code);await writeFile(join(dir,'second.mjs'),row.code);await writeFile(join(dir,'oracle.mjs'),'export const initialized = 7;');
  const first=await import(pathToFileURL(join(dir,'first.mjs')).href);assert.equal(first.initialized,7);
  const one=bootstrapSnapshot(inventory,globalThis.__coverage__,identity);
  await import(pathToFileURL(join(dir,'first.mjs')).href);assert.deepEqual(bootstrapSnapshot(inventory,globalThis.__coverage__,identity),one,'ESM cache adds no bootstrap execution');
  await import(pathToFileURL(join(dir,'oracle.mjs')).href);assert.deepEqual(bootstrapSnapshot(inventory,globalThis.__coverage__,identity),one,'uninstrumented oracle contributes no counters');
  const second=await import(pathToFileURL(join(dir,'second.mjs')).href);assert.equal(second.initialized,7);
  const two=bootstrapSnapshot(inventory,globalThis.__coverage__,identity);
  const id=Object.keys(row.zero.s)[0],a=one.coverage[row.path].s[id]-before.coverage[row.path].s[id],b=two.coverage[row.path].s[id]-one.coverage[row.path].s[id];
  assert.equal(a,1);assert.equal(b,1);assert.equal(a+b,two.coverage[row.path].s[id]);
 }finally{if(previous===undefined)delete globalThis.__coverage__;else globalThis.__coverage__=previous;await rm(dir,{recursive:true,force:true});}
});


test('same-id custom definition and runtime rules replacement never receive canonical solo credit',async()=>{
 for(const base of ['arcade','stroll']){
  const custom=modeRules.composeModeDefinition({id:base,pursuit:{speed:1.23}});
  const recorder=await createSoloModelRecorder({...sessionModule,...modeRules},null);
  try{assert.throws(()=>recorder.scenario('custom',base).acquire(()=>new Game(113,'pond',base,false,[],undefined,{definition:custom})),/ownership/);}finally{recorder.dispose();}
  const next=await createSoloModelRecorder({...sessionModule,...modeRules},null);
  try{const witness=next.scenario('runtime',base),game=witness.acquire(()=>new Game(113,'pond',base));witness.begin();game.rules=custom.rules;assert.throws(()=>witness.end(),/ownership/);}finally{next.dispose();}
  const bootstrap=await createSoloBootstrapRecorder(null);
  await assert.rejects(()=>bootstrap.witness('custom',base,async()=>({session:sessionModule,modeRules}),()=>new Game(113,'pond',base,false,[],undefined,{definition:custom}),async()=>{}),/ownership/);
  await assert.rejects(()=>bootstrap.finish(),/Incomplete/);
 }
});

test('observers consume canonical constants without invoking production resolver',async()=>{
 const definitions={...modeRules,soloModeDefinition(){throw Error('Observer invoked resolver');}};
 const recorder=await createSoloModelRecorder({...sessionModule,...definitions},null);
 try{const witness=recorder.scenario('constant','arcade');witness.acquire(()=>fake('arcade'));witness.begin();witness.boundary();witness.end();await recorder.finish();}finally{recorder.dispose();}
 const bootstrap=await createSoloBootstrapRecorder(null);
 for(const base of ['arcade','stroll'])await bootstrap.witness(base,base,async()=>({session:sessionModule,modeRules:definitions}),()=>fake(base),async(_game,_loaded,boundary)=>boundary());
 await bootstrap.finish();
});
