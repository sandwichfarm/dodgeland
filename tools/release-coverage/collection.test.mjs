import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildInventory } from './inventory.mjs';
import { instrumentSources } from './instrument.mjs';
import vm from 'node:vm';

test('browser realm registration fails closed before missing duplicate or mismatched capture',async()=>{
 const {createBrowserCollector}=await import('./browser.mjs');
 const inventory=instrumentSources({'fixture.ts':'export const answer = 42;'},'/coverage-browser');
 const context=vm.createContext({});vm.runInContext(inventory['fixture.ts'].code.replace('export const','const'),context);
 const raw=JSON.parse(JSON.stringify(context.__coverage__));
 const output=await mkdtemp(join(tmpdir(),'browser-realms-'));
 try {
  const collector=createBrowserCollector({runId:'browser-proof',payloadDirectory:output},inventory);
  const identity={suite:'test-owner',scenario:'actual-start',frame:'opaque-app',generation:0,scope:'current'};
  const frame={evaluate:async()=>raw};
  collector.registerRealm(frame,identity);
  assert.throws(()=>collector.finishRealms(),/Missing/);
  assert.throws(()=>collector.registerRealm(frame,identity),/Duplicate/);
  await collector.collectRealm(frame,identity);
  assert.equal(collector.finishRealms().length,1);
  await assert.rejects(collector.collectRealm(frame,identity),/Duplicate/);
  const next={...identity,generation:1};collector.registerRealm(frame,next);
  const malformed=structuredClone(raw);Object.values(malformed)[0].statementMap={};
  await assert.rejects(collector.collectRealm({evaluate:async()=>malformed},next),/Schema/);
  assert.throws(()=>collector.finishRealms(),/Missing/);
 } finally {await rm(output,{recursive:true,force:true});}
});

test('independent tracked-source inventory retains all source classes and canonical zeros',async()=>{
 const result=await buildInventory();
 const tracked=spawnSync('git',['ls-files','-z','src'],{encoding:'utf8'});assert.equal(tracked.status,0);
 assert.deepEqual(result.files.map(row=>row.path).sort(),tracked.stdout.split('\0').filter(Boolean).sort());
 assert.ok(result.files.some(row=>row.kind==='stylesheet'));assert.ok(result.files.some(row=>row.kind==='declaration'));
 assert.ok(result.inventory['session.ts']);assert.ok(result.inventory['main.ts']);
 for(const row of Object.values(result.inventory)){assert.equal(Object.values(row.zero.s).reduce((a,b)=>a+b,0),0);assert.ok(row.sourceHash);assert.ok(row.mapHash);}
});
test('real shared session suites emit complete source-bound worker reports through strict gate',async()=>{
 const output=await mkdtemp(join(tmpdir(),'release-collection-'));try{
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const run=spawnSync(process.execPath,['tools/release-coverage/run.mjs','--suite','shared-tracer','--report-only','--output',output],{encoding:'utf8',env,maxBuffer:32*1024*1024,timeout:120000});
  assert.equal(run.error,undefined);assert.equal(run.signal,null);assert.equal(run.status,0,run.stdout+run.stderr);
  assert.match(run.stdout,/REPORT ONLY/);assert.doesNotMatch(run.stdout,/RELEASE PASS/);
  const report=JSON.parse(await readFile(join(output,'report','coverage-final.json'),'utf8'));
  for(const name of ['session.ts','game.ts']){const key=Object.keys(report).find(key=>key.endsWith('/src/'+name));assert.ok(key,name);assert.ok(Object.values(report[key].s).some(n=>n>0),name);}
  const manifest=JSON.parse(await readFile(join(output,'manifest.json'),'utf8'));
  assert.deepEqual(manifest.expectedRealms,['tests/local-session.test.mjs','tests/session-world.test.mjs']);assert.equal(manifest.payloadCount,2);assert.equal(manifest.thresholdsEvaluated,false);assert.equal(manifest.status,'report-only');
  assert.ok(manifest.files.some(row=>row.path==='src/main.ts'));
 }finally{await rm(output,{recursive:true,force:true});}
});

test('coverage opt-in leaves default and immutable-oracle loader output untouched',async()=>{
 const {compileSources}=await import('../../tests/source-loader.mjs');
 const {extractPinnedBaseline}=await import('../../tests/solo-baseline.mjs');
 const pinned=await extractPinnedBaseline();const output=await mkdtemp(join(tmpdir(),'coverage-oracle-'));
 try{
  const config=join(output,'config.json');await writeFile(config,JSON.stringify({inventoryPath:join(output,'must-not-be-read.json')}));
  const baseline=await compileSources('game',{sourceDirectory:pinned.sourceDirectory,coverage:config});
  assert.ok(baseline.size>0);for(const code of baseline.values())assert.doesNotMatch(code,/__coverage__/);
  const ordinary=await compileSources('gamepad');assert.doesNotMatch(ordinary.get('/gamepad.js'),/__coverage__/);
 }finally{await pinned.dispose();await rm(output,{recursive:true,force:true});}
});
