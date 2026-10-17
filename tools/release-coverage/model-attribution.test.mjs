import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {instrumentSources} from './instrument.mjs';
import {createSurviveModelRecorder} from './model-attribution.mjs';
import {validateIntervals} from './attribution.mjs';

test('model recorder validates exact owner and keeps consecutive recorder sequences disjoint',()=>{
 const inventory=instrumentSources({'proof.ts':'function work(){ return 1; }'},'/model-proof');
 const context=vm.createContext({});vm.runInContext(inventory['proof.ts'].code,context);
 const rows=[];
 for(const id of ['first','second']){
  const game={definition:{id:'arcade'},state:'playing'};
  const recorder=createSurviveModelRecorder({inventory,identity:{runId:'run',realmId:'realm',jobId:'proof',artifactHash:'source'},counters:()=>context.__coverage__});
  const session=recorder.acquire(game,definition=>({definition}),mode=>({id,mode,definition:game.definition,world:{host:game},players:[{state:'playing',participation:'active'}]}));
  recorder.interval('runtime',()=>vm.runInContext('work()',context));
  assert.throws(()=>recorder.acquire(game,()=>{},()=>{}),/already/);
  const original=session.mode;session.mode={definition:game.definition};assert.throws(()=>recorder.interval('wrong-owner',()=>{}),/owner/);session.mode=original;
  rows.push(recorder.finish());
 }
 assert.equal(validateIntervals(inventory,rows.flatMap(row=>row.intervals)).length,4);
 assert.equal(Object.values(rows.at(-1).payload.coverage['/model-proof/proof.ts'].f)[0],2);
});
