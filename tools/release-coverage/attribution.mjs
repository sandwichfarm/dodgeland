import { mergePayloads } from './collector.mjs';

export const modes = ['solo-arcade','solo-flow','survive-arcade','survive-flow','relay','race'];
function checkObservation(o) {
 if(!o||!modes.includes(o.mode)||o.state!=='playing')throw Error('Missing live mode evidence');
 const kind=o.mode.startsWith('solo-')?'solo':o.mode.startsWith('survive-')?'survive':o.mode;
 const base=o.mode.endsWith('arcade')?'arcade':'stroll';
 if(o.kind!==kind||o.base!==base||!Number.isInteger(o.participants)||(kind==='solo'?o.participants!==1:o.participants<2||o.participants>4))throw Error('Invalid actual mode/base evidence');
}
export function deriveInterval(inventory,before,after,id) {
 if(typeof id!=='string'||!id)throw Error('Missing interval ID');
 checkObservation(before?.observation);checkObservation(after?.observation);
 if(JSON.stringify(before.observation)!==JSON.stringify(after.observation))throw Error('Mode changed during interval');
 for(const key of ['jobId','buildScope','artifactHash','provenance'])if(!before[key]||before[key]!==after[key])throw Error('Interval identity mismatch');
 if(before.provenance!=='public-input'||before.buildScope!=='production')throw Error('Invalid mode provenance');
 if(!Number.isSafeInteger(before.sequence)||before.sequence<0||!Number.isSafeInteger(after.sequence)||after.sequence<=before.sequence)throw Error('Invalid interval order');
 const a=before.payload,b=after.payload;
 if(a.runId!==b.runId||a.realmId!==b.realmId)throw Error('Cross run/realm interval');
 // Validate hashes, canonical schemas and counters independently before subtraction.
 for(const payload of [a,b])mergePayloads(inventory,[payload],{runId:a.runId,expectedRealms:[a.realmId]});
 const coverage=structuredClone(b.coverage);
 for(const path of Object.keys(a.coverage))if(!coverage[path])throw Error('Source disappeared during interval');
 for(const [path,file]of Object.entries(coverage))for(const metric of ['s','f','b'])for(const key of Object.keys(file[metric])){
  const end=metric==='b'?file[metric][key]:[file[metric][key]],start=metric==='b'?(a.coverage[path]?.[metric][key]??end.map(()=>0)):[a.coverage[path]?.[metric][key]??0];
  const delta=end.map((n,i)=>{if(n<start[i])throw Error('Counter decreased');return n-start[i];});file[metric][key]=metric==='b'?delta:delta[0];
 }
 const payload={...structuredClone(b),realmId:`interval:${a.realmId}:${id}`,coverage};
 return {id,mode:before.observation.mode,parentRealm:a.realmId,runId:a.runId,jobId:before.jobId,buildScope:before.buildScope,artifactHash:before.artifactHash,provenance:before.provenance,start:before.sequence,end:after.sequence,observation:structuredClone(before.observation),payload};
}
export function validateIntervals(inventory,intervals) {
 const seen=new Set(),ends=new Map();
 const sorted=[...intervals].sort((a,b)=>a.parentRealm.localeCompare(b.parentRealm)||a.start-b.start||a.id.localeCompare(b.id));
 for(const interval of sorted){
  checkObservation(interval.observation);
  const key=`${interval.runId}:${interval.parentRealm}:${interval.id}`,parent=`${interval.runId}:${interval.parentRealm}`;
  if(seen.has(key))throw Error('Duplicate interval');seen.add(key);
  if(!Number.isSafeInteger(interval.start)||!Number.isSafeInteger(interval.end)||interval.start<0||interval.end<=interval.start||(ends.get(parent)??-1)>interval.start)throw Error('Overlapping interval');ends.set(parent,interval.end);
  if(interval.mode!==interval.observation.mode||interval.provenance!=='public-input'||interval.buildScope!=='production'||!interval.jobId||!interval.artifactHash||interval.payload.runId!==interval.runId||interval.payload.realmId!==`interval:${interval.parentRealm}:${interval.id}`)throw Error('Interval binding mismatch');
  mergePayloads(inventory,[interval.payload],{runId:interval.runId,expectedRealms:[interval.payload.realmId]});
 }
 return sorted;
}
