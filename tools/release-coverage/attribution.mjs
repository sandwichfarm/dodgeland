import { mergePayloads } from './collector.mjs';

export const modes = ['solo-arcade','solo-flow','survive-arcade','survive-flow','relay','race'];
function checkObservation(o) {
 if(!o||!modes.includes(o.mode)||o.state!=='playing')throw Error('Missing live mode evidence');
 const kind=o.mode.startsWith('solo-')?'solo':o.mode.startsWith('survive-')?'survive':o.mode;
 const base=o.mode.endsWith('arcade')?'arcade':'stroll';
 if(kind==='solo'&&Object.entries({worldIsOwn:true,playerIsOwn:true,sessionActive:false,playerSessionAbsent:true,sessionBindings:0,stageBindings:0}).some(([key,value])=>o.ownership?.[key]!==value))throw Error('Missing actual solo ownership evidence');
 if(o.kind!==kind||o.base!==base||!Number.isInteger(o.participants)||(kind==='solo'?o.participants!==1:o.participants<2||o.participants>4))throw Error('Invalid actual mode/base evidence');
}
function checkComponent(o) {
 const solo=o?.mode?.startsWith('solo-'),turn=['relay','race'].includes(o?.mode);
 if(!o || !['solo-arcade','solo-flow','survive-arcade','survive-flow','relay','race'].includes(o.mode) || o.kind!==(solo?'solo':turn?o.mode:'survive') || (turn?!['arcade','stroll'].includes(o.base):o.base!==(o.mode.endsWith('arcade')?'arcade':'stroll')))throw Error('Invalid component mode evidence');
 if(solo){
  if(!['acquiring','ready','playing','paused','dead'].includes(o.phase)||typeof o.ownerId!=='string'||!o.ownerId)throw Error('Invalid solo component phase/owner');
  if(o.phase==='acquiring'){if(o.participants!==0)throw Error('Invalid solo acquisition');}
  else if(o.participants!==1||Object.entries({worldIsOwn:true,playerIsOwn:true,sessionActive:false,playerSessionAbsent:true,stageCalls:0}).some(([key,value])=>o.ownership?.[key]!==value)||!Number.isSafeInteger(o.ownership.boundaryChecks)||o.ownership.boundaryChecks<1)throw Error('Invalid solo component ownership');
  return;
 }
 if(!['acquiring','playing','paused','pending','settled'].includes(o.phase))throw Error('Invalid component lifecycle phase');
 if(o.phase==='acquiring') { if(o.sessionId!==null || o.participants!==0)throw Error('Invalid acquisition evidence'); }
 else if(typeof o.sessionId!=='string'||!o.sessionId||!Number.isInteger(o.participants)||o.participants<1||o.participants>4)throw Error('Missing component session identity');
}
function checkPair(before,after,provenance) {
 if(provenance==='component-model') {
  checkComponent(before);checkComponent(after);
  if(before.ownerId!==after.ownerId)throw Error('Solo owner changed during interval');
  if(before.mode!==after.mode||before.base!==after.base||after.phase==='acquiring'||(before.phase!=='acquiring'&&before.sessionId!==after.sessionId))throw Error('Component session changed during interval');
 } else {
  if(provenance!=='public-input')throw Error('Invalid mode provenance');
  checkObservation(before);checkObservation(after);
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Mode changed during interval');
 }
}
export function deriveInterval(inventory,before,after,id) {
 if(typeof id!=='string'||!id)throw Error('Missing interval ID');
 checkPair(before?.observation,after?.observation,before?.provenance);
 for(const key of ['jobId','buildScope','artifactHash','provenance'])if(!before[key]||before[key]!==after[key])throw Error('Interval identity mismatch');
 if(before.buildScope!=='production')throw Error('Invalid mode provenance');
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
 return {id,mode:before.observation.mode,parentRealm:a.realmId,runId:a.runId,jobId:before.jobId,buildScope:before.buildScope,artifactHash:before.artifactHash,provenance:before.provenance,start:before.sequence,end:after.sequence,observation:structuredClone(before.observation),...(before.provenance==='component-model'?{endObservation:structuredClone(after.observation)}:{}),payload};
}
export function validateIntervals(inventory,intervals) {
 const seen=new Set(),ends=new Map();
 const sorted=[...intervals].sort((a,b)=>a.parentRealm.localeCompare(b.parentRealm)||a.start-b.start||a.id.localeCompare(b.id));
 for(const interval of sorted){
  if(interval.provenance==='component-model'&&!interval.endObservation)throw Error('Missing component endpoint observation');
  checkPair(interval.observation,interval.endObservation??interval.observation,interval.provenance);
  const key=`${interval.runId}:${interval.parentRealm}:${interval.id}`,parent=`${interval.runId}:${interval.parentRealm}`;
  if(seen.has(key))throw Error('Duplicate interval');seen.add(key);
  if(!Number.isSafeInteger(interval.start)||!Number.isSafeInteger(interval.end)||interval.start<0||interval.end<=interval.start||(ends.get(parent)??-1)>interval.start)throw Error('Overlapping interval');ends.set(parent,interval.end);
  if(interval.mode!==interval.observation.mode||!['public-input','component-model'].includes(interval.provenance)||interval.buildScope!=='production'||!interval.jobId||!interval.artifactHash||interval.payload.runId!==interval.runId||interval.payload.realmId!==`interval:${interval.parentRealm}:${interval.id}`)throw Error('Interval binding mismatch');
  mergePayloads(inventory,[interval.payload],{runId:interval.runId,expectedRealms:[interval.payload.realmId]});
 }
 return sorted;
}
