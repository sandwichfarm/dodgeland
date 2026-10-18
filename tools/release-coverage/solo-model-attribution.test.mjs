import test from 'node:test';
import assert from 'node:assert/strict';
import {runDifferentialMatrix} from '../../tests/solo-parity-snapshot.mjs';
import {createSoloModelRecorder} from './solo-model-attribution.mjs';

test('bounded component opt-in rejects one-sided perturbation before recorder acquisition',async()=>{
 let acquired=false,disposed=false;
 await assert.rejects(()=>runDifferentialMatrix([{name:'reject-perturbed',seed:1,tape:[],perturbCurrent:{command:0,step:0,callback:'onCoin'}}],{currentRecorderFactory:()=>({scenario(){acquired=true;},dispose(){disposed=true;}})}),/refuses perturbed/);
 assert.equal(acquired,false);assert.equal(disposed,true);
});
test('transparent stage observer catches staged then canceled current ownership and restores method',async()=>{
 let currentSession,original;
 await assert.rejects(()=>runDifferentialMatrix([{name:'reject-staging',seed:1,tape:[],setup:game=>{if(game.world)currentSession.stage(game,{roster:[]}).cancel();}}],{currentRecorderFactory:async module=>{currentSession=module.LocalSession;original=currentSession.stage;return createSoloModelRecorder(module,null);}}),/ownership\/staging/);
 assert.equal(currentSession.stage,original);
});

test('opted-in parity refuses an unbound nested roundtrip Game',async()=>{
 await assert.rejects(()=>runDifferentialMatrix([{name:'reject-nested-game',seed:1,tape:[{kind:'roundtrip'}]}],{currentRecorderFactory:module=>createSoloModelRecorder(module,null)}),/independent ownership for nested Game/);
});

test('finish rejects duplicate overlapping intervals after incremental validation',async()=>{
 const {instrumentSources}=await import('./instrument.mjs');
 const {loadSources}=await import('../../tests/source-loader.mjs');
 const definitions=await loadSources(['mode-rules']);
 const {SOLO_ARCADE_MODE,SOLO_STROLL_MODE}=await definitions.import('mode-rules');
 const {mkdtemp,writeFile,rm,access}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const directory=await mkdtemp(join(tmpdir(),'solo-finish-negative-'));
 const inventory=instrumentSources({'proof.ts':'export function untouched(){ return 1; }'},'/solo-finish-negative');
 const previous=globalThis.__coverage__;globalThis.__coverage__=Object.fromEntries(Object.values(inventory).map(r=>[r.path,structuredClone(r.zero)]));
 let recorder;
 try{
  await writeFile(join(directory,'inventory.json'),JSON.stringify(inventory));
  await writeFile(join(directory,'config.json'),JSON.stringify({runId:'synthetic',jobId:'synthetic',inventoryPath:join(directory,'inventory.json'),browserBuilds:{modules:{artifactHash:'synthetic'}},modelAttribution:{realmId:'synthetic',output:join(directory,'output.json')}}));
  recorder=await createSoloModelRecorder({LocalSession:{stage(){throw Error('not called');}},SOLO_ARCADE_MODE,SOLO_STROLL_MODE},join(directory,'config.json'));
  const witness=recorder.scenario('synthetic-owner','arcade');
  witness.acquire(()=>{const game={definition:SOLO_ARCADE_MODE,rules:SOLO_ARCADE_MODE.rules,state:'ready'};game.world={host:game,definition:game.definition,rules:game.rules,sessionActive:false};game.player={world:game.world,primary:true};return game;});
  witness.begin();witness.end();witness.end();
  await assert.rejects(()=>recorder.finish(),/Duplicate interval|Overlapping interval/);
  await assert.rejects(()=>access(join(directory,'output.json')));
 }finally{recorder?.dispose();await definitions.dispose();if(previous===undefined)delete globalThis.__coverage__;else globalThis.__coverage__=previous;await rm(directory,{recursive:true,force:true});}
});
