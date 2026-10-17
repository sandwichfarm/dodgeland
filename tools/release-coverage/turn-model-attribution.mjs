import { capturePayload } from './collector.mjs';
import { deriveInterval, validateIntervals } from './attribution.mjs';
import { definitionEvidence, validateSoloDefinition } from './solo-definition-evidence.mjs';
import { bootstrapSnapshot } from './solo-bootstrap-attribution.mjs';

let sequence = 0;

/** Test-only recorder for one actual imported Relay/Race coordinator lifetime. */
export function createTurnModelRecorder({ mode, inventory, identity, factory, Coordinator, authority, load }) {
 if (!['relay','race'].includes(mode) || (load===undefined ? typeof factory !== 'function' || typeof Coordinator !== 'function' : typeof load!=='function')) throw Error('Missing turn-mode factory');
 let game, owner, session, composition, sessionId, setup, expectedBase, world, player, roster, loading=false, failed=false;
 const intervals = [];
 function canonical() {
  if(!authority||!['Game','LocalSession','SharedWorld','SessionPlayer'].every(key=>typeof authority[key]==='function')||!authority.SOLO_ARCADE_MODE||!authority.SOLO_STROLL_MODE)throw Error('Missing same-module turn authority');
  const base=game.definition.id,definition=base==='arcade'?authority.SOLO_ARCADE_MODE:authority.SOLO_STROLL_MODE;
  if(!(game instanceof authority.Game)||!(game.world instanceof authority.SharedWorld)||!(game.player instanceof authority.SessionPlayer)||game.definition!==definition||game.world.host!==game||game.player.world!==game.world||game.player.primary!==true)throw Error('Invalid canonical turn ownership');
  const evidence=definitionEvidence(game.definition,game.rules,game.world);validateSoloDefinition(evidence,base);return evidence;
 }
 function observe() {
  const base=game?.definition.id??expectedBase;
  if(!['arcade','stroll'].includes(base))throw Error('Invalid turn-mode base');
  const common={mode,kind:mode,base};
  const evidence=game?canonical():undefined;
  if(!owner)return {...common,phase:'acquiring',sessionId:null,participants:0};
  const players=session.players;
  if(!(owner instanceof Coordinator)||!(session instanceof authority.LocalSession)||owner.session!==session||game.world!==world||game.player!==player||session.world!==world||session.mode!==composition||composition.definition!==game.definition||session.definition!==game.definition||session.id!==sessionId||world.sessionActive!==true||Object.getOwnPropertyDescriptor(session,'active')?.value!==true||JSON.stringify(mode==='relay'?owner.setup:owner.descriptor)!==setup)throw Error('Changed turn-mode owner');
  if(players.length!==roster.size||players.length<2||players.length>4||new Set(players).size!==players.length||!players.includes(player)||players.some(p=>!(p instanceof authority.SessionPlayer)||p.world!==world||p.session!==session||!roster.has(p)||roster.get(p)!==JSON.stringify([p.seat,p.participantId,p.characterId,p.primary])))throw Error('Changed turn-mode roster ownership');
  const phase=owner.result?'settled':game.state==='paused'?'paused':mode==='relay'?(owner.snapshot().phase==='running'?'playing':'pending'):owner.waiting?'pending':'playing';
  return {...common,phase,sessionId,participants:players.length,definitionEvidence:evidence,ownership:{canonicalDefinition:true,canonicalRules:true,sameModule:true,sessionActive:true,sessionRunning:true,worldIsOwn:true,playerIsOwn:true,rosterStable:true}};
 }
 function adopt(proposal){
  canonical();owner=factory(game,proposal);session=owner.session;composition=session.mode;sessionId=session.id;world=game.world;player=game.player;
  // Capture the roster data without adding a production getter invocation.
  const players=Object.getOwnPropertyDescriptor(session,'roster')?.value;
  if(!Array.isArray(players))throw Error('Missing actual turn roster ownership');
  roster=new Map(players.map(p=>[p,JSON.stringify([p.seat,p.participantId,p.characterId,p.primary])]));
  setup=JSON.stringify(mode==='relay'?owner.setup:owner.descriptor);
  if(!composition||mode==='race'&&owner.descriptor.schema!=='race-1'||mode==='relay'&&!Number.isInteger(owner.setup.tilesPerLeg))throw Error('Invalid actual composition');
 }
 function guarded(action){try{return action();}catch(error){failed=true;throw error;}}
 function snapshot(){return {...identity,buildScope:'production',provenance:'component-model',sequence:sequence++,observation:observe(),payload:capturePayload(inventory,globalThis.__coverage__,identity)};}
 function record(id,before){const interval=deriveInterval(inventory,before,snapshot(),`${sessionId}:${id}`);validateIntervals(inventory,[...intervals,interval]);intervals.push(interval);}
 return {
  async acquireFresh(base,proposal){
   if(game||loading||failed||typeof load!=='function'||!['arcade','stroll'].includes(base))throw Error('Invalid fresh turn-mode acquisition');
   loading=true;expectedBase=base;
   try{
    // Snapshot a copy before actual ESM imports. Never reset global counters or
    // reuse an earlier mode's initialization counts for this lifetime.
    const before={...identity,buildScope:'production',provenance:'component-model',sequence:sequence++,observation:observe(),payload:bootstrapSnapshot(inventory,globalThis.__coverage__,identity)};
    const loaded=await load();({factory,Coordinator,authority}=loaded);
    if(typeof factory!=='function'||typeof Coordinator!=='function'||typeof loaded.createGame!=='function')throw Error('Missing loaded turn-mode factory');
    game=loaded.createGame();if(game.definition.id!==base)throw Error('Acquired unexpected actual base');
    adopt(proposal);
    record('acquisition',before);return {game,owner,loaded};
   }catch(error){failed=true;throw error;}finally{loading=false;}
  },
  acquire(value,proposal){
   if(game||loading||failed)throw Error('Recorder already acquired');
   return guarded(()=>{game=value;const before=snapshot();adopt(proposal);record('acquisition',before);return owner;});
  },
  acquireFrom(createGame,base,proposal){
   if(game||loading||failed||!['arcade','stroll'].includes(base))throw Error('Invalid turn-mode acquisition');
   return guarded(()=>{expectedBase=base;const before=snapshot();game=createGame();
    if(game.definition.id!==base)throw Error('Acquired unexpected actual base');
    adopt(proposal);record('acquisition',before);return {game,owner};});
  },
  interval(id,action){if(!session||loading||failed)throw Error('Missing acquired owner');return guarded(()=>{const before=snapshot(),result=action(owner);if(result&&typeof result.then==='function')throw Error('Turn-mode interval must be synchronous');record(id,before);return result;});},
  finish(){if(!session||loading||failed)throw Error('Missing acquired owner');return guarded(()=>{validateIntervals(inventory,intervals);return {identity:{...identity,buildScope:'production',provenance:'component-model'},payload:snapshot().payload,intervals:structuredClone(intervals)};});},
 };
}
