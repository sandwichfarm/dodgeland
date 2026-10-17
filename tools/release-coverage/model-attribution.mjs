import { capturePayload } from './collector.mjs';
import { deriveInterval, validateIntervals } from './attribution.mjs';

let nextSequence = 0;

// Test-only, synchronous owner: module imports/boot precede construction of this recorder.
// One recorder owns one composed Survive session; no mixed worker totals become intervals.
export function createSurviveModelRecorder({ inventory, identity, counters = () => globalThis.__coverage__ }) {
 let session, game, composition;
 const intervals = [];
 function observe() {
  const base = game.definition.id;
  if(!['arcade','stroll'].includes(base))throw Error('Unsupported Survive base');
  const common = {mode:base==='arcade'?'survive-arcade':'survive-flow',base,kind:'survive'};
  if(!session)return {...common,phase:'acquiring',sessionId:null,participants:0};
  if(session.world.host!==game||session.definition!==game.definition||session.mode!==composition||composition.definition!==game.definition)throw Error('Changed composed session owner');
  const phase=session.result?'settled':game.state==='paused'?'paused':session.players.some(p=>p.state==='playing'&&p.participation==='active')?'playing':'pending';
  return {...common,phase,sessionId:session.id,participants:session.players.length};
 }
 function snapshot() {
  const observation=observe();
  return {...identity,buildScope:'production',provenance:'component-model',sequence:nextSequence++,observation,
   payload:capturePayload(inventory,counters(),identity)};
 }
 function record(id,before) {
  const interval=deriveInterval(inventory,before,snapshot(),`${session.id}:${id}`);
  validateIntervals(inventory,[...intervals,interval]);intervals.push(interval);return interval;
 }
 return {
  acquire(owner,createDefinition,commit) {
   if(game)throw Error('Recorder already acquired');game=owner;
   const before=snapshot();
   composition=createDefinition(game.definition);
   session=commit(composition);
   if(!session||typeof session.then==='function')throw Error('Acquisition must synchronously return its actual session');
   record('acquisition',before);return session;
  },
  interval(id,action) {
   if(!session)throw Error('Missing acquired session');
   const before=snapshot(),result=action(session);
   if(result&&typeof result.then==='function')throw Error('Component interval must be synchronous');
   record(id,before);return result;
  },
  finish() {
   if(!session)throw Error('Missing acquired session');
   validateIntervals(inventory,intervals);
   // Parent is a full snapshot, persisted once by the worker collector. Do not merge deltas globally.
   return {payload:snapshot().payload,intervals:structuredClone(intervals),identity:{...identity,buildScope:'production',provenance:'component-model'}};
  },
 };
}
