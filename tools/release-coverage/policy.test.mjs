import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {evaluatePolicy, resolveCommandInventory, validateFullManifest} from './run.mjs';
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
test('mechanical commands resolve recursive scripts, canonical arrays, spreads and tracked globs',()=>{
 const scripts={'test:all':'pnpm test:unit && DOWN_TO_DUCK_AUDIO_BROWSER=firefox node tests/sound.mjs','test:unit':'node --test tests/a*.test.mjs'};
 const source="const tail=[['pnpm',['test:all']]];const blocks=[['gate',[...tail,['node',['tests/extra.mjs']]]]];";
 const inventory=resolveCommandInventory(scripts,source,['tests/a.test.mjs','tests/extra.mjs','tests/sound.mjs']);
 assert.deepEqual(inventory.entries.map(r=>r.path),['tests/a.test.mjs','tests/extra.mjs','tests/sound.mjs']);assert.ok(inventory.commands.some(r=>r.env.DOWN_TO_DUCK_AUDIO_BROWSER==='firefox'));
 assert.throws(()=>resolveCommandInventory({'test:x':'node $UNKNOWN'},'const blocks=[];',[]),/unresolved/i);
 assert.throws(()=>resolveCommandInventory({'test:x':'node --test tests/missing*.mjs'},'const blocks=[];',[]),/unmatched/i);
 assert.throws(()=>resolveCommandInventory({'test:x':'pnpm test:x'},'const blocks=[];',[]),/cycle/i);
});
test('complete dispatch rejects omitted owners, variants and declared realm requirements without launching suites',()=>{
 const inventory={entries:[{path:'tests/a.mjs'},{path:'tests/sound.mjs'}],commands:[{executable:'node',args:['tests/sound.mjs'],env:{DOWN_TO_DUCK_AUDIO_BROWSER:'firefox'}}]};
 const manifest={complete:true,execution:{jobs:[{id:'a',file:'tests/a.mjs',role:'node',requiredRealms:['node']},{id:'sound',file:'tests/sound.mjs',role:'browser',requiredRealms:['browser'],env:{DOWN_TO_DUCK_AUDIO_BROWSER:'firefox'}}],controls:[]}};
 assert.equal(validateFullManifest(manifest,inventory),true);
 for(const change of [m=>m.complete=false,m=>m.execution.jobs.pop(),m=>m.execution.jobs[1].env={},m=>m.execution.jobs[1].requiredRealms=[],m=>m.execution.jobs.push(m.execution.jobs[0])]){const broken=structuredClone(manifest);change(broken);assert.throws(()=>validateFullManifest(broken,inventory));}
});
