import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {instrumentSources} from './instrument.mjs';
import {bootstrapSnapshot,createSoloBootstrapRecorder} from './solo-bootstrap-attribution.mjs';

const fake=base=>{const game={definition:{id:base},state:'ready'};game.world={host:game,sessionActive:false};game.player={world:game.world,primary:true};return game;};
test('wrong actual base, hidden staged construction and failed import cannot complete bootstrap',async()=>{
 for(const failure of ['base','stage','import']){
  const recorder=await createSoloBootstrapRecorder(null),session={LocalSession:{stage(){return {};}}},original=session.LocalSession.stage;
  await assert.rejects(()=>recorder.witness('reject','arcade',async()=>{if(failure==='import')throw Error('import failed');return{session};},()=>{if(failure==='stage')session.LocalSession.stage();return fake(failure==='base'?'stroll':'arcade');},async()=>{}));
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
