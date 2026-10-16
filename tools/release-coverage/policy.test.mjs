import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {evaluatePolicy} from './run.mjs';
import {buildInventory} from './inventory.mjs';

const summary=(covered=100,total=100)=>Object.fromEntries(['lines','functions','branches'].map(m=>[m,{covered,total}]));
const floors={global:{lines:90,functions:90,branches:85},ordinary:{lines:90,functions:90,branches:85},critical:{lines:95,functions:95,branches:90},mode:{lines:90,functions:90,branches:85}};
const fixture=()=>({files:['a.ts','b.ts'],critical:['a.ts'],floors,strata:{mode:['a.ts','b.ts']}});

test('ratified policy enumerates every executable source, critical authority and all nine strata',async()=>{
 const policy=JSON.parse(await readFile(new URL('./policy.json',import.meta.url)));
 const inventory=await buildInventory();
 assert.deepEqual(policy.files,inventory.files.filter(r=>r.kind==='executable').map(r=>r.path));
 assert.deepEqual(policy.floors,floors);assert.equal(policy.critical.length,20);
 assert.ok(policy.critical.includes('src/game.ts'));assert.ok(policy.critical.includes('src/market/run.ts'));
 assert.equal(Object.keys(policy.strata).length,9);
 for(const paths of Object.values(policy.strata)){assert.ok(paths.length);assert.equal(new Set(paths).size,paths.length);assert.ok(paths.every(p=>policy.files.includes(p)));}
 const all=Object.fromEntries(policy.files.map(p=>[p,summary()]));
 assert.equal(evaluatePolicy(policy,all,Object.fromEntries(Object.keys(policy.strata).map(p=>[p,summary()]))).pass,true);
});
test('exact equality passes; one count below critical ordinary global and mode floors fails before rounding',()=>{
 const p=fixture(),a={lines:{covered:95,total:100},functions:{covered:95,total:100},branches:{covered:90,total:100}},b={lines:{covered:90,total:100},functions:{covered:90,total:100},branches:{covered:85,total:100}};
 assert.equal(evaluatePolicy(p,{'a.ts':a,'b.ts':b},{mode:b}).pass,true);
 for(const metric of ['lines','functions','branches'])for(const file of ['a.ts','b.ts']){
  const files=structuredClone({'a.ts':a,'b.ts':b});files[file][metric].covered--;
  assert.ok(evaluatePolicy(p,files,{mode:b}).failures.some(f=>f.name===file&&f.metric===metric));
 }
 const near=summary(9000,10001),result=evaluatePolicy({...p,critical:[]},{'a.ts':near,'b.ts':near},{mode:summary()});
 assert.ok(result.failures.some(f=>f.name==='global'&&f.metric==='lines'));
 assert.ok(evaluatePolicy(p,{'a.ts':summary(),'b.ts':summary()},{mode:near}).failures.some(f=>f.name==='mode'));
});
test('empty omitted unknown groups fail and zero-site metrics remain not applicable',()=>{
 const p=fixture(),files={'a.ts':summary(),'b.ts':summary()};
 assert.throws(()=>evaluatePolicy(p,{'a.ts':summary()},{mode:summary()}),/inventory mismatch/);
 assert.throws(()=>evaluatePolicy({...p,strata:{mode:[]} },files,{mode:summary()}),/Invalid stratum/);
 assert.throws(()=>evaluatePolicy({...p,strata:{mode:['unknown']} },files,{mode:summary()}),/Invalid stratum/);
 assert.throws(()=>evaluatePolicy(p,files,{}),/Missing coverage group/);
 assert.throws(()=>evaluatePolicy(p,{'a.ts':summary(0,0),'b.ts':summary(0,0)},{mode:summary(0,0)}),/Empty executable/);
 files['a.ts'].branches={total:0,covered:0};assert.equal(evaluatePolicy(p,files,{mode:summary()}).pass,true);
});
test('complete candidate inventory retains pending owners and full collection fails closed',async()=>{
 const manifest=JSON.parse(await readFile(new URL('./suites.json',import.meta.url)));
 const audit=JSON.parse(await readFile(new URL('../../.planning/phases/07-release-evidence-pr/07-02-REALM-AUDIT.json',import.meta.url)));
 assert.deepEqual(manifest.candidates.map(r=>r.path),audit.files.map(r=>r.path));
 assert.equal(manifest.pendingAdapters.length,21);assert.equal(manifest.complete,false);
 assert.deepEqual(manifest.groups['legacy-foundation'].files,['tests/gamepad.test.mjs','tests/sound.test.mjs']);
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const run=spawnSync(process.execPath,['tools/release-coverage/run.mjs','--report-only'],{encoding:'utf8',env});
 assert.equal(run.status,1);assert.match(run.stderr,/Full collection incomplete/);
});
