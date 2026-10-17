import { capturePayload } from './collector.mjs';
import { deriveInterval, validateIntervals } from './attribution.mjs';

let sequence = 0;

/** Test-only recorder for one actual imported Relay/Race coordinator lifetime. */
export function createTurnModelRecorder({ mode, inventory, identity, factory, Coordinator }) {
 if (!['relay','race'].includes(mode) || typeof factory !== 'function' || typeof Coordinator !== 'function') throw Error('Missing turn-mode factory');
 let game, owner, session, composition, sessionId, setup, expectedBase;
 const intervals = [];
 function observe() {
  const base=game?.definition.id??expectedBase;
  if(!['arcade','stroll'].includes(base))throw Error('Invalid turn-mode base');
  const common={mode,kind:mode,base};
  if(!owner)return {...common,phase:'acquiring',sessionId:null,participants:0};
  if(!(owner instanceof Coordinator)||owner.session!==session||session.world.host!==game||session.mode!==composition||session.definition!==game.definition||session.id!==sessionId||JSON.stringify(mode==='relay'?owner.setup:owner.descriptor)!==setup)throw Error('Changed turn-mode owner');
  const phase=owner.result?'settled':game.state==='paused'?'paused':mode==='relay'?(owner.snapshot().phase==='running'?'playing':'pending'):owner.waiting?'pending':'playing';
  return {...common,phase,sessionId,participants:session.players.length};
 }
 function snapshot(){return {...identity,buildScope:'production',provenance:'component-model',sequence:sequence++,observation:observe(),payload:capturePayload(inventory,globalThis.__coverage__,identity)};}
 function record(id,before){const interval=deriveInterval(inventory,before,snapshot(),`${sessionId}:${id}`);validateIntervals(inventory,[...intervals,interval]);intervals.push(interval);}
 return {
  acquire(value,proposal){
   if(game)throw Error('Recorder already acquired');game=value;const before=snapshot();
   owner=factory(game,proposal);session=owner.session;composition=session.mode;sessionId=session.id;
   setup=JSON.stringify(mode==='relay'?owner.setup:owner.descriptor);
   if(!composition||mode==='race'&&owner.descriptor.schema!=='race-1'||mode==='relay'&&!Number.isInteger(owner.setup.tilesPerLeg))throw Error('Invalid actual composition');
   record('acquisition',before);return owner;
  },
  acquireFrom(createGame,base,proposal){
   if(game||!['arcade','stroll'].includes(base))throw Error('Invalid turn-mode acquisition');
   expectedBase=base;const before=snapshot();game=createGame();
   if(game.definition.id!==base)throw Error('Acquired unexpected actual base');
   owner=factory(game,proposal);session=owner.session;composition=session.mode;sessionId=session.id;
   setup=JSON.stringify(mode==='relay'?owner.setup:owner.descriptor);
   if(!composition||mode==='race'&&owner.descriptor.schema!=='race-1'||mode==='relay'&&!Number.isInteger(owner.setup.tilesPerLeg))throw Error('Invalid actual composition');
   record('acquisition',before);return {game,owner};
  },
  interval(id,action){if(!session)throw Error('Missing acquired owner');const before=snapshot(),result=action(owner);if(result&&typeof result.then==='function')throw Error('Turn-mode interval must be synchronous');record(id,before);return result;},
  finish(){if(!session)throw Error('Missing acquired owner');validateIntervals(inventory,intervals);return {identity:{...identity,buildScope:'production',provenance:'component-model'},payload:snapshot().payload,intervals:structuredClone(intervals)};},
 };
}
