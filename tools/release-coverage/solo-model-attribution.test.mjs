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
