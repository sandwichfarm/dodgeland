import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { instrumentSources } from './instrument.mjs';
import { capturePayload, mergePayloads } from './collector.mjs';
import { deriveInterval, validateIntervals } from './attribution.mjs';

function fixture() {
 const inventory=instrumentSources({'counter.ts':'function step(flag: boolean) { if (flag) return 1; return 2; }','unimported.ts':'export function never() { return 3; }'},'/attribution');
 const context=vm.createContext({});vm.runInContext(inventory['counter.ts'].code,context);
 const observation={mode:'solo-arcade',base:'arcade',kind:'solo',state:'playing',participants:1};
 const snapshot=sequence=>({sequence,jobId:'mode-proof',buildScope:'production',artifactHash:'artifact',observation,provenance:'public-input',payload:capturePayload(inventory,JSON.parse(JSON.stringify(context.__coverage__)),{runId:'run',realmId:'realm'})});
 const before=snapshot(0);vm.runInContext('step(true);step(false);',context);const after=snapshot(1);
 return {inventory,context,snapshot,before,after};
}
test('exclusive interval exact function/branch counts retain zeros and never duplicate global totals',()=>{
 const {inventory,before,after}=fixture();const interval=deriveInterval(inventory,before,after,'first');
 const file=interval.payload.coverage['/attribution/counter.ts'];assert.deepEqual(Object.values(file.f),[2]);assert.deepEqual(Object.values(file.b),[[1,1]]);
 const map=mergePayloads(inventory,[interval.payload],{runId:'run',expectedRealms:[interval.payload.realmId]});assert.ok(Object.values(map['/attribution/unimported.ts'].s).every(n=>n===0));
 assert.deepEqual(validateIntervals(inventory,[interval]),[interval]);assert.equal(Object.values(after.payload.coverage['/attribution/counter.ts'].f)[0],2);
 const zero=deriveInterval(inventory,{...after,sequence:2},{...after,sequence:3},'zero');assert.ok(Object.values(zero.payload.coverage['/attribution/counter.ts'].f).every(n=>n===0));
});
test('identity schema counter mode and interval replay failures reject before attribution',()=>{
 const {inventory,before,after}=fixture();
 for(const mutate of [s=>s.payload.runId='other',s=>s.payload.realmId='other',s=>s.jobId='other',s=>s.artifactHash='other',s=>s.buildScope='development',s=>s.sequence=0,s=>s.observation={...s.observation,mode:'race'},s=>s.provenance='mixed-total',s=>s.payload.identities[0].sourceHash='wrong',s=>s.payload.coverage['/attribution/counter.ts'].statementMap={},s=>s.payload.coverage['/attribution/counter.ts'].f['0']=-1]){
  const changed=structuredClone(after);mutate(changed);assert.throws(()=>deriveInterval(inventory,before,changed,'bad'));
 }
 const decreased=structuredClone(after);decreased.payload.coverage['/attribution/counter.ts'].s['0']=0;
 const baseline=structuredClone(before);baseline.payload.coverage['/attribution/counter.ts'].s['0']=4;assert.throws(()=>deriveInterval(inventory,baseline,decreased,'decreased'),/decreas/i);
 assert.throws(()=>deriveInterval(inventory,{...before,observation:null},after,'missing'),/mode/i);
 const first=deriveInterval(inventory,before,after,'first');assert.throws(()=>validateIntervals(inventory,[first,first]),/duplicate|overlap/i);
 const overlapping=deriveInterval(inventory,before,{...after,sequence:2},'second');assert.throws(()=>validateIntervals(inventory,[first,overlapping]),/overlap/i);
 const next=deriveInterval(inventory,{...after,sequence:2},{...after,sequence:3},'next');assert.deepEqual(validateIntervals(inventory,[next,first]).map(i=>i.id),['first','next']);
});
