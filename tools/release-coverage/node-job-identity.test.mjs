import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { nodeWorkerBinding, persistNodePayload } from './inventory.mjs';
import { expectedNodeRealms } from './run.mjs';
import { instrumentSources } from './instrument.mjs';
import { mergePayloads } from './collector.mjs';

const worker='tests/race-runtime.mjs';
const original={id:'race-runtime',file:worker,role:'mixed'};
const variant={id:'race-runtime-development',file:worker,role:'mixed',nodeRealmId:`${worker}#race-runtime-development`};
const roles={[worker]:'mixed'};
function config(job,extra={}){return {runId:'synthetic-node-binding',jobId:job.id,workerRoles:roles,expectedWorkers:[worker],expectedRealms:[worker,variant.nodeRealmId],...(job.nodeRealmId?{nodeRealmId:job.nodeRealmId}:{}),...extra};}

test('unique Node/model identities remain stable; repeated mixed job gets exact independent parent',()=>{
 assert.deepEqual(nodeWorkerBinding(config(original),worker),{role:'mixed',realmId:worker,filename:'tests__race-runtime.mjs.json'});
 assert.deepEqual(nodeWorkerBinding(config(variant),worker),{role:'mixed',realmId:variant.nodeRealmId,filename:'tests__race-runtime.mjs#race-runtime-development.json'});
 assert.deepEqual(expectedNodeRealms([original,variant],roles),[worker,variant.nodeRealmId]);
 assert.deepEqual(expectedNodeRealms([{...original,modelAttribution:{modes:['race']}}],roles),[worker]);
 assert.throws(()=>expectedNodeRealms([original,{...variant,nodeRealmId:undefined}],roles),/Duplicate Node/);
 assert.throws(()=>expectedNodeRealms([original,variant,variant],roles),/Duplicate Node/);
 assert.throws(()=>expectedNodeRealms([{...variant,modelAttribution:{}}],roles),/Invalid alternate/);
});

test('alternate identity rejects missing expected parent, wrong worker/job and nonmixed roles',()=>{
 assert.throws(()=>nodeWorkerBinding(config(variant,{expectedRealms:[worker]}),worker),/Missing expected/);
 assert.throws(()=>nodeWorkerBinding(config(variant,{nodeRealmId:`${worker}#wrong`}),worker),/Invalid alternate/);
 assert.throws(()=>nodeWorkerBinding(config(variant),'tests/other.mjs'),/Unexpected test worker/);
 for(const role of ['node','browser','control']){
  assert.throws(()=>nodeWorkerBinding(config(variant,{workerRoles:{[worker]:role}}),worker),/Invalid alternate/);
  assert.throws(()=>expectedNodeRealms([variant],{[worker]:role}),/Invalid alternate/);
 }
 // Even distinct realm names cannot alias the same persisted filename.
 assert.throws(()=>expectedNodeRealms([{id:'a',file:'tests/a.mjs'},{id:'b',file:'tests__a.mjs'}],{'tests/a.mjs':'node','tests__a.mjs':'node'}),/Duplicate Node parent or output/);
});

test('two synthetic independent parents persist once, merge globally and fail missing/duplicate/overwrite',async()=>{
 const root=await mkdtemp(join(tmpdir(),'node-job-binding-'));
 try{
  const inventory=instrumentSources({'fixture.ts':'const value = 3;\n'},root);
  const contexts=[{},{}];
  for(const context of contexts)runInNewContext(inventory['fixture.ts'].code,context);
  const payloads=[original,variant].map((job,index)=>persistNodePayload(config(job,{payloadDirectory:root}),worker,inventory,contexts[index].__coverage__));
  assert.equal((await readdir(root)).length,2);
  for(const [index,job]of [original,variant].entries()){
   const path=join(root,nodeWorkerBinding(config(job),worker).filename);
   assert.deepEqual(JSON.parse(await readFile(path,'utf8')),payloads[index]);
   assert.equal('buildScope' in payloads[index],false,'Node module evidence is not development browser evidence');
  }
  const options={runId:'synthetic-node-binding',expectedRealms:[worker,variant.nodeRealmId]};
  const merged=mergePayloads(inventory,payloads,options);
  const path=inventory['fixture.ts'].path;
  for(const id of Object.keys(merged[path].s))assert.equal(merged[path].s[id],payloads[0].coverage[path].s[id]+payloads[1].coverage[path].s[id]);
  assert.throws(()=>mergePayloads(inventory,[payloads[0]],options),/Missing realm/);
  assert.throws(()=>mergePayloads(inventory,[...payloads,payloads[0]],options),/Duplicate realm/);
  const target=join(root,nodeWorkerBinding(config(variant),worker).filename),before=await readFile(target,'utf8');
  assert.throws(()=>persistNodePayload(config(variant,{payloadDirectory:root}),worker,inventory,contexts[1].__coverage__),{code:'EEXIST'});
  assert.equal(await readFile(target,'utf8'),before);
 }finally{await rm(root,{recursive:true,force:true});}
});
