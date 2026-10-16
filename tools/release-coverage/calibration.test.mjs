import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { spawnSync } from 'node:child_process';
import { capturePayload, mergePayloads } from './collector.mjs';
import { instrumentSources, reportCoverage } from './instrument.mjs';

import { sources, globSources } from './fixtures.mjs';
for (const [label, calls, expected] of [
  ['positive', [1], { lines: [1, 4], functions: [1, 3], branches: [1, 4], statements: [2, 5] }],
  ['negative', [-1], { lines: [2, 4], functions: [1, 3], branches: [1, 4], statements: [2, 5] }],
  ['both', [1, -1], { lines: [2, 4], functions: [1, 3], branches: [2, 4], statements: [3, 5] }],
]) {
  test(`exact semantic Node calibration: ${label}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'release-calibration-'));
    try {
      for (const [name, source] of Object.entries(sources)) await writeFile(join(root, name), source);
      const inventory = instrumentSources(sources, root);
      globalThis.__coverage__ = {};
      const module = await import(`data:text/javascript;base64,${Buffer.from(inventory['exercised.ts'].code).toString('base64')}`);
      for (const call of calls) assert.equal(module.choose(call), call > 0 ? 'positive' : 'nonpositive');
      const result = await reportCoverage(inventory, [globalThis.__coverage__], join(root, 'report'));
      for (const [metric, pair] of Object.entries(expected)) assert.deepEqual([result.summary[metric].covered, result.summary[metric].total], pair, metric);
      assert.deepEqual(result.files.sort(), ['exercised.ts', 'unexecuted.ts'].map(name => join(root, name)).sort());
      const untouched = result.map.fileCoverageFor(join(root, 'unexecuted.ts')).toSummary();
      assert.equal(untouched.functions.covered, 0); assert.equal(untouched.functions.total, 1);
      const lines = result.map.fileCoverageFor(join(root, 'exercised.ts')).getLineCoverage();
      assert.deepEqual(Object.keys(lines).map(Number), [5, 6, 8]);
      const json = JSON.parse(await readFile(join(root, 'report', 'coverage-final.json'), 'utf8'));
      assert.equal(Object.keys(json).length, 2);
      assert.match(await readFile(join(root, 'report', 'lcov.info'), 'utf8'), /BRF:2/);
      assert.match(await readFile(join(root, 'report', 'text.txt'), 'utf8'), /All files/);
    } finally { delete globalThis.__coverage__; await rm(root, { recursive: true, force: true }); }
  });
}

async function fixtureTree(sourceSet) {
  const root = await mkdtemp(join(tmpdir(), 'coverage-identities-'));
  for (const [name, text] of Object.entries(sourceSet)) { await mkdir(dirname(join(root, name)), { recursive: true }); await writeFile(join(root, name), text); }
  const inventory = instrumentSources(sourceSet, root);
  const output = join(root, 'emitted'); await mkdir(output); await writeFile(join(output, 'package.json'), '{"type":"module"}');
  for (const [name, record] of Object.entries(inventory)) { const target=join(output,name.replace(/\.ts$/,'.js')); await mkdir(dirname(target),{recursive:true}); await writeFile(target,record.code); }
  return { root, output, inventory };
}
test('source-level eager default glob preserves item identity and erased declarations', async () => {
  const tree=await fixtureTree(globSources);
  try {
    globalThis.__coverage__={};
    const module=await import(pathToFileURL(join(tree.output,'catalog.js')).href);
    assert.equal(module.total(),5);
    const result=await reportCoverage(tree.inventory,[globalThis.__coverage__],join(tree.root,'report'));
    for(const name of ['items/a.ts','items/b.ts']) { const file=result.map.fileCoverageFor(join(tree.root,name)); assert.deepEqual(Object.keys(file.getLineCoverage()).map(Number),[1]); assert.equal(file.toSummary().lines.covered,1); }
    const catalog=result.map.fileCoverageFor(join(tree.root,'catalog.ts'));
    assert.deepEqual(Object.keys(catalog.getLineCoverage()).map(Number),[3,5]);
    const declarations=tree.inventory['declarations.ts']; assert.equal(Object.keys(declarations.zero.statementMap).length,0); assert.equal(Object.keys(declarations.zero.fnMap).length,0);
    assert.throws(()=>instrumentSources({'bad.ts':"export const x=import.meta.glob('./items/*.ts', { eager: false });"},tree.root),/Unsupported glob/);
    assert.throws(()=>instrumentSources({},tree.root),/Empty source inventory/);
    assert.throws(()=>instrumentSources({'../escape.ts':'export const x=1'},tree.root),/outside root/);
  } finally { delete globalThis.__coverage__; await rm(tree.root,{recursive:true,force:true}); }
});
test('actual worker preload captures once before temporary source cleanup; merge is permutation invariant',async()=>{
 const tree=await fixtureTree(sources);
 try {
  const inventoryPath=join(tree.root,'inventory.json');await writeFile(inventoryPath,JSON.stringify(tree.inventory));
  const workerEntry=join(tree.output,'worker.mjs');await writeFile(workerEntry,`import {choose} from './exercised.js';choose(Number(process.env.CALIBRATION_VALUE));`);
  const payloads=[];
  for(const [realmId,value] of [['positive',1],['negative',-1]]) {
   const outputPath=join(tree.root,realmId+'.json');
   // Separate temporary module instances retain the same original source identity.
   const instance=join(tree.root,'instance-'+realmId);await mkdir(instance);await writeFile(join(instance,'package.json'),'{"type":"module"}');await writeFile(join(instance,'exercised.js'),tree.inventory['exercised.ts'].code);await writeFile(join(instance,'worker.mjs'),await readFile(workerEntry,'utf8'));
   await new Promise((resolve,reject)=>{const worker=new Worker(pathToFileURL(join(instance,'worker.mjs')),{execArgv:['--import',new URL('./collector.mjs',import.meta.url).href],env:{...process.env,RELEASE_COVERAGE_INVENTORY:inventoryPath,RELEASE_COVERAGE_OUTPUT:outputPath,RELEASE_COVERAGE_RUN:'workers',RELEASE_COVERAGE_REALM:realmId,CALIBRATION_VALUE:String(value)}});worker.once('error',reject);worker.once('exit',code=>code===0?resolve():reject(Error('worker exit '+code)));});
   payloads.push(JSON.parse(await readFile(outputPath,'utf8')));
   await rm(instance,{recursive:true,force:true});
  }
  assert.notEqual(payloads[0].threadId,payloads[1].threadId);
  const options={runId:'workers',expectedRealms:['positive','negative']};
  const forward=mergePayloads(tree.inventory,payloads,options), reverse=mergePayloads(tree.inventory,[...payloads].reverse(),options);
  assert.deepEqual(forward,reverse);
  await rm(tree.output,{recursive:true,force:true});
  const result=await reportCoverage(tree.inventory,[forward],join(tree.root,'report'));
  assert.equal(result.summary.branches.covered,2);assert.equal(result.summary.branches.total,4);
 } finally {await rm(tree.root,{recursive:true,force:true});}
});
test('real subprocess validator rejects missing/duplicate/unknown/hash/schema/map/counter evidence',async()=>{
 const tree=await fixtureTree(sources);
 try {
  globalThis.__coverage__={};const module=await import(pathToFileURL(join(tree.output,'exercised.js')).href);module.choose(1);
  const clean=capturePayload(tree.inventory,globalThis.__coverage__,{runId:'negatives',realmId:'node'});
  const base={inventory:tree.inventory,payloads:[clean],options:{runId:'negatives',expectedRealms:['node'],expectedSources:Object.keys(tree.inventory)}};
  const cases=[['clean',()=>{},true,/VALID/],['empty',x=>x.payloads=[],false,/Missing realm/],['duplicate',x=>x.payloads.push(structuredClone(clean)),false,/Duplicate realm/],['realm',x=>x.payloads[0].realmId='unknown',false,/Unknown realm/],['run',x=>x.payloads[0].runId='old',false,/Run mismatch/],['source',x=>delete x.inventory['unexecuted.ts'],false,/Missing source/],['hash',x=>x.payloads[0].identities[0].sourceHash='wrong',false,/Source hash mismatch/],['schema',x=>x.payloads[0].identities[0].schemaHash='wrong',false,/Schema mismatch/],['map',x=>x.payloads[0].identities[0].mapHash='wrong',false,/Map mismatch/],['counter',x=>Object.values(x.payloads[0].coverage)[0].s[0]=-1,false,/Invalid counter/],['unknown-source',x=>x.payloads[0].coverage['/unknown.ts']=Object.values(x.payloads[0].coverage)[0],false,/Unknown source/],['missing-payload',x=>x.payloads[0].coverage={},false,/Empty payload/]];
  for(const [name,mutate,success,pattern]of cases){const input=structuredClone(base);mutate(input);const file=join(tree.root,name+'.json');await writeFile(file,JSON.stringify(input));const child=spawnSync(process.execPath,[new URL('./collector.mjs',import.meta.url).pathname,'--validate',file],{encoding:'utf8'});assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.equal(child.status===0,success,name+child.stderr);assert.match(child.stdout+child.stderr,pattern,name);}
 }finally{delete globalThis.__coverage__;await rm(tree.root,{recursive:true,force:true});}
});
