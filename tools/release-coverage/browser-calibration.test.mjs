import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { sources, calibrationHtml } from './fixtures.mjs';
import { instrumentSources, reportCoverage, hash } from './instrument.mjs';
import { capturePayload, mergePayloads } from './collector.mjs';

const evidenceRoot=resolve('artifacts/release-coverage/calibration');
async function inventoryFixture(){
 const root=join(evidenceRoot,'sources');await mkdir(root,{recursive:true});
 for(const[name,text]of Object.entries(sources))await writeFile(join(root,name),text);
 return instrumentSources(sources,root);
}
async function openFrame(page,inventory,id){
 const html=calibrationHtml(inventory);
 await page.evaluate(({html,id})=>{const frame=document.createElement('iframe');frame.id=id;frame.setAttribute('sandbox','allow-scripts');frame.srcdoc=html;document.body.append(frame);},{html,id});
 const frame=await(await page.locator('#'+id).elementHandle()).contentFrame();
 await frame.locator('#positive').waitFor();await frame.waitForFunction(()=>document.body.dataset.ready==='true');
 assert.equal(await frame.evaluate(()=>location.origin),'null');return frame;
}
for(const[label,buttons,expected]of[
 ['positive',['positive'],{lines:[1,4],functions:[1,3],branches:[1,4],statements:[2,5]}],
 ['negative',['negative'],{lines:[2,4],functions:[1,3],branches:[1,4],statements:[2,5]}],
 ['both',['positive','negative'],{lines:[2,4],functions:[1,3],branches:[2,4],statements:[3,5]}],
])test(`actual opaque browser semantic calibration: ${label}`,async()=>{
 const inventory=await inventoryFixture(),errors=[],external=[];const browser=await chromium.launch({args:['--mute-audio']});
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())});
  const frame=await openFrame(page,inventory,'fixture');
  for(const id of buttons)await frame.locator('#'+id).click();
  assert.equal(await frame.locator('#output').textContent(),buttons.at(-1)==='positive'?'positive':'nonpositive');
  const raw=await frame.evaluate(()=>globalThis.__coverage__);
  const result=await reportCoverage(inventory,[raw],join(evidenceRoot,'browser-'+label));
  for(const[metric,pair]of Object.entries(expected))assert.deepEqual([result.summary[metric].covered,result.summary[metric].total],pair,metric);
  assert.equal(result.map.fileCoverageFor(inventory['unexecuted.ts'].path).toSummary().functions.covered,0);
  await writeFile(join(evidenceRoot,'browser-'+label,'payload.json'),JSON.stringify(capturePayload(inventory,raw,{runId:'browser-calibration',realmId:label}),null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 }finally{await browser.close();}
});
test('two frames and reload retain exactly one payload per realm and match actual Node schemas',async()=>{
 const inventory=await inventoryFixture();const browser=await chromium.launch({args:['--mute-audio']});
 try{
  const page=await browser.newPage(),payloads=[],runId='realms';
  for(const[id,button]of [['first','positive'],['second','negative']]){
   const frame=await openFrame(page,inventory,id);await frame.locator('#'+button).click();
   payloads.push(capturePayload(inventory,await frame.evaluate(()=>globalThis.__coverage__),{runId,realmId:id}));
  }
  // Real iframe navigation reloads the fixture. Capture the old realm before replacing it.
  await page.locator('#first').evaluate((frame,html)=>{frame.srcdoc=html},calibrationHtml(inventory));
  const reloaded=await(await page.locator('#first').elementHandle()).contentFrame();await reloaded.waitForFunction(()=>document.body.dataset.ready==='true');await reloaded.locator('#positive').click();
  payloads.push(capturePayload(inventory,await reloaded.evaluate(()=>globalThis.__coverage__),{runId,realmId:'first-reloaded'}));
  const specifier='data:text/javascript;base64,'+Buffer.from(inventory['exercised.ts'].code).toString('base64');
  const node=spawnSync(process.execPath,['--input-type=module','-e',`const m=await import(${JSON.stringify(specifier)});m.choose(1);console.log(JSON.stringify(globalThis.__coverage__));`],{encoding:'utf8'});
  assert.equal(node.status,0,node.stderr);assert.equal(node.signal,null);
  payloads.push(capturePayload(inventory,JSON.parse(node.stdout),{runId,realmId:'node'}));
  assert.deepEqual(payloads[0].identities,payloads[3].identities,'actual Node/browser content/map/schema identity');
  const options={runId,expectedRealms:['first','second','first-reloaded','node']};
  const merged=mergePayloads(inventory,payloads,options);
  assert.deepEqual(merged,mergePayloads(inventory,[...payloads].reverse(),options));
  assert.throws(()=>mergePayloads(inventory,payloads.slice(1),options),/Missing realm/);
  assert.throws(()=>mergePayloads(inventory,[...payloads,payloads[0]],options),/Duplicate realm/);
  const malformed=structuredClone(payloads);malformed[1].coverage={};assert.throws(()=>mergePayloads(inventory,malformed,options),/Empty payload/);
  const mismatch=structuredClone(payloads);mismatch[3].identities[0].schemaHash='different-node-schema';assert.throws(()=>mergePayloads(inventory,mismatch,options),/Schema mismatch/);
  const result=await reportCoverage(inventory,[merged],join(evidenceRoot,'combined-realms'));
  assert.deepEqual([result.summary.lines.covered,result.summary.lines.total],[2,4]);assert.deepEqual([result.summary.branches.covered,result.summary.branches.total],[2,4]);
  await writeFile(join(evidenceRoot,'combined-realms','payloads.json'),JSON.stringify(payloads,null,2));
  const toolFiles=['package.json','pnpm-lock.yaml','instrument.mjs','collector.mjs','fixtures.mjs'];const toolHashes={};for(const file of toolFiles)toolHashes[file]=hash(await readFile(new URL(file,import.meta.url),'utf8'));
  await writeFile(join(evidenceRoot,'provenance.json'),JSON.stringify({scope:'calibration fixtures only; no production coverage',node:process.version,toolHashes,sources:Object.fromEntries(Object.entries(inventory).map(([name,row])=>[name,{sourceHash:row.sourceHash,mapHash:row.mapHash}])),realms:options.expectedRealms},null,2));
 }finally{await browser.close();}
});
