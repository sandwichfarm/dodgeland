import {SOLO_DEFINITION_SNAPSHOTS,SOLO_DEFINITION_SOURCE_HASH,validateSoloDefinition} from './solo-definition-evidence.mjs';
const canonicalEvidence={sourceHash:SOLO_DEFINITION_SOURCE_HASH,snapshot:SOLO_DEFINITION_SNAPSHOTS.arcade,rulesIdentity:true,deepFrozen:true};
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { instrumentSources } from './instrument.mjs';
import { capturePayload, mergePayloads } from './collector.mjs';
import { deriveInterval, validateIntervals } from './attribution.mjs';
import { validateModeRows, validateModelSidecar } from './run.mjs';
import { createTurnModelRecorder } from './turn-model-attribution.mjs';
import { loadSources } from '../../tests/source-loader.mjs';

test('turn recorder rejects forged canonical rules and detached ownership and stays failed',async()=>{
 const sources=await loadSources(['game','relay','race','session','mode-rules']);
 const foreign=await loadSources(['game','session','mode-rules']);
 const previous=globalThis.__coverage__;
 try{
  const authority={...await sources.import('game'),...await sources.import('session'),...await sources.import('mode-rules')};
  const inventory=instrumentSources({'counter.ts':'function step() { return 1; } step();'},'/turn-owner-controls');
  const context=vm.createContext({});vm.runInContext(inventory['counter.ts'].code,context);globalThis.__coverage__=context.__coverage__;
  const identity={runId:'synthetic',realmId:'synthetic',jobId:'synthetic',artifactHash:'synthetic'};
  for(const mode of ['relay','race']){
   const module=await sources.import(mode),factory=mode==='relay'?module.createRelaySession:module.createRaceSession,Coordinator=mode==='relay'?module.RelayCoordinator:module.RaceCoordinator;
   const proposal={seats:[{seat:'p1',device:'keyboard-a',characterId:'butter'},{seat:'p2',device:'gamepad-0',characterId:'pip'}]};
   const mutations=[
    game=>{const definition=Object.freeze({...game.definition});game.definition=game.world.definition=definition;game.player.session.definition=definition;},
    game=>{const definition=Object.freeze({...game.definition,rules:Object.freeze({...game.rules,health:Object.freeze({...game.rules.health,maxHealth:99})})});game.definition=game.world.definition=game.player.session.definition=definition;game.rules=game.world.rules=definition.rules;},
    game=>{const definition={...game.definition,rules:{...game.rules,lifecycle:{afterHop:()=>{}}}};game.definition=game.world.definition=game.player.session.definition=definition;game.rules=game.world.rules=definition.rules;},
    game=>{game.world.sessionActive=false;},
    game=>{game.player.session.active=false;},
    game=>{game.player.session=undefined;},
    game=>{game.player.world={...game.world};},
    game=>{game.world={...game.world};},
    game=>{game.player.session.players[1].participantId='replacement';},
    game=>{game.player.session.players[1].characterId='miso';},
   ];
   for(const mutate of mutations){
    const game=new authority.Game(113,'pond','arcade',false,[],'butter');
    const recorder=createTurnModelRecorder({mode,inventory,identity,factory,Coordinator,authority});
    recorder.acquire(game,proposal);mutate(game);
    assert.throws(()=>recorder.interval('invalid',()=>{}),/canonical|ownership|owner/i);
    assert.throws(()=>recorder.finish(),/Missing acquired owner/,'failed evidence must never be recoverable');
   }
   const game=new authority.Game(113,'pond','arcade',false,[],'butter');
   const definition=Object.freeze({...game.definition});game.definition=game.world.definition=definition;
   const forged=createTurnModelRecorder({mode,inventory,identity,factory,Coordinator,authority});
   assert.throws(()=>forged.acquire(game,proposal),/canonical|ownership|owner/i);
   assert.throws(()=>forged.finish(),/Missing acquired owner/);
   const wrongModule={...authority,...await foreign.import('session')};
   const mixed=createTurnModelRecorder({mode,inventory,identity,factory,Coordinator,authority:wrongModule});
   assert.throws(()=>mixed.acquire(new authority.Game(113),proposal),/canonical|ownership|owner/i);
   const valid=createTurnModelRecorder({mode,inventory,identity,factory,Coordinator,authority});
   const live=valid.acquire(new authority.Game(113),proposal);
   valid.interval('order-and-device-change',()=>{live.session.players.reverse();live.session.players[0].device='gamepad-9';});
   assert.equal(valid.finish().intervals.length,2,'device aliases and roster ordering are not participant identity');
   const stopped=createTurnModelRecorder({mode,inventory,identity,factory,Coordinator,authority});
   const stoppedOwner=stopped.acquire(new authority.Game(113),proposal);
   assert.throws(()=>stopped.interval('stopped-during-action',()=>stoppedOwner.session.stop()),/owner/i);
   stoppedOwner.session.active=true;
   assert.throws(()=>stopped.finish(),/Missing acquired owner/,'restoring a failed boundary cannot rehabilitate it');
  }
 }finally{await sources.dispose();await foreign.dispose();if(previous===undefined)delete globalThis.__coverage__;else globalThis.__coverage__=previous;}
});

function fixture() {
 const inventory=instrumentSources({'counter.ts':'function step(flag: boolean) { if (flag) return 1; return 2; }','unimported.ts':'export function never() { return 3; }'},'/attribution');
 const context=vm.createContext({});vm.runInContext(inventory['counter.ts'].code,context);
 const observation={mode:'solo-arcade',base:'arcade',definitionEvidence:canonicalEvidence,kind:'solo',state:'playing',participants:1,ownership:{canonicalDefinition:true,canonicalRules:true,worldIsOwn:true,playerIsOwn:true,sessionActive:false,playerSessionAbsent:true,sessionBindings:0,stageBindings:0}};
 const snapshot=sequence=>({sequence,jobId:'mode-proof',buildScope:'production',artifactHash:'artifact',observation,provenance:'public-input',payload:capturePayload(inventory,JSON.parse(JSON.stringify(context.__coverage__)),{runId:'run',realmId:'realm'})});
 const before=snapshot(0);vm.runInContext('step(true);step(false);',context);const after=snapshot(1);
 return {inventory,context,snapshot,before,after};
}
test('public multiplayer intervals require complete canonical base evidence',()=>{
 for(const mode of ['relay','race','survive-arcade','survive-flow']){
  const {inventory,before,after}=fixture(),base=mode==='survive-arcade'?'arcade':'stroll';
  const observation={mode,base,kind:mode.startsWith('survive-')?'survive':mode,state:'playing',participants:2,definitionEvidence:{...canonicalEvidence,snapshot:SOLO_DEFINITION_SNAPSHOTS[base]}};
  before.observation=after.observation=observation;
  assert.equal(deriveInterval(inventory,before,after,'valid-public-base').mode,mode);
  for(const evidence of [undefined,{...observation.definitionEvidence,deepFrozen:false},{...observation.definitionEvidence,snapshot:SOLO_DEFINITION_SNAPSHOTS[base==='arcade'?'stroll':'arcade']}]){
   const start=structuredClone(before),end=structuredClone(after);start.observation.definitionEvidence=end.observation.definitionEvidence=evidence;
   assert.throws(()=>deriveInterval(inventory,start,end,'invalid-public-base'),/definition evidence/);
  }
 }
});
test('exclusive interval exact function/branch counts retain zeros and never duplicate global totals',()=>{
 const {inventory,before,after}=fixture();const interval=deriveInterval(inventory,before,after,'first');
 const file=interval.payload.coverage['/attribution/counter.ts'];assert.deepEqual(Object.values(file.s),[2,1,1]);assert.deepEqual(Object.values(file.f),[2]);assert.deepEqual(Object.values(file.b),[[1,1]]);
 const map=mergePayloads(inventory,[interval.payload],{runId:'run',expectedRealms:[interval.payload.realmId]});assert.ok(Object.values(map['/attribution/unimported.ts'].s).every(n=>n===0));
 assert.deepEqual(validateIntervals(inventory,[interval]),[interval]);assert.equal(Object.values(after.payload.coverage['/attribution/counter.ts'].f)[0],2);
 const zero=deriveInterval(inventory,{...after,sequence:2},{...after,sequence:3},'zero');assert.ok(Object.values(zero.payload.coverage['/attribution/counter.ts'].f).every(n=>n===0));
});
test('mode report rejects missing mode, wrong parent hash and delta greater than whole snapshot',()=>{
 const {inventory,before,after}=fixture(),interval=deriveInterval(inventory,before,after,'first');
 const row={realmId:'realm',identity:{jobId:'mode-proof',artifactHash:'artifact'},payload:after.payload,intervals:[interval]};
 assert.equal(validateModeRows(inventory,[row],['solo-arcade']).length,1);
 assert.throws(()=>validateModeRows(inventory,[row]),/Missing exclusive mode/);
 const wrong=structuredClone(row);wrong.identity.artifactHash='wrong';assert.throws(()=>validateModeRows(inventory,[wrong],['solo-arcade']),/parent/);
 const inflated=structuredClone(row);inflated.intervals[0].payload.coverage['/attribution/counter.ts'].f['0']=3;assert.throws(()=>validateModeRows(inventory,[inflated],['solo-arcade']),/exceeds parent/);
});
test('identity schema counter mode and interval replay failures reject before attribution',()=>{
 const {inventory,before,after}=fixture();
 for(const mutate of [s=>s.payload.runId='other',s=>s.payload.realmId='other',s=>s.jobId='other',s=>s.artifactHash='other',s=>s.buildScope='development',s=>s.sequence=0,s=>s.observation={...s.observation,mode:'race'},s=>s.observation={...s.observation,state:'paused'},s=>s.provenance='mixed-total',s=>s.payload.identities[0].sourceHash='wrong',s=>s.payload.coverage['/attribution/counter.ts'].statementMap={},s=>s.payload.coverage['/attribution/counter.ts'].f['0']=-1]){
  const changed=structuredClone(after);mutate(changed);assert.throws(()=>deriveInterval(inventory,before,changed,'bad'));
 }
 const decreased=structuredClone(after);decreased.payload.coverage['/attribution/counter.ts'].s['0']=0;
 const baseline=structuredClone(before);baseline.payload.coverage['/attribution/counter.ts'].s['0']=4;assert.throws(()=>deriveInterval(inventory,baseline,decreased,'decreased'),/decreas/i);
 assert.throws(()=>deriveInterval(inventory,{...before,observation:null},after,'missing'),/mode/i);
 const first=deriveInterval(inventory,before,after,'first');assert.throws(()=>validateIntervals(inventory,[first,first]),/duplicate|overlap/i);
 const overlapping=deriveInterval(inventory,before,{...after,sequence:2},'second');assert.throws(()=>validateIntervals(inventory,[first,overlapping]),/overlap/i);
 const next=deriveInterval(inventory,{...after,sequence:2},{...after,sequence:3},'next');assert.deepEqual(validateIntervals(inventory,[next,first]).map(i=>i.id),['first','next']);
});

test('component lifecycle binds acquisition and changing participant counts to one actual session',()=>{
 const {inventory,before,after}=fixture();
 const common={mode:'survive-flow',base:'stroll',kind:'survive'};
 before.provenance=after.provenance='component-model';
 before.observation={...common,phase:'acquiring',sessionId:null,participants:0};
 after.observation={...common,phase:'playing',sessionId:'local-1',participants:2};
 const acquisition=deriveInterval(inventory,before,after,'acquire');
 const end={...after,sequence:2,observation:{...common,phase:'settled',sessionId:'local-1',participants:1}};
 const lifecycle=deriveInterval(inventory,after,end,'settle');
 assert.equal(validateIntervals(inventory,[acquisition,lifecycle]).length,2);
 assert.equal(lifecycle.endObservation.phase,'settled');
 for(const observation of [ {...end.observation,sessionId:'local-2'}, {...end.observation,phase:'unknown'}, {...end.observation,participants:0}, {...end.observation,mode:'survive-arcade'}, {...end.observation,phase:'acquiring',sessionId:null,participants:0} ])assert.throws(()=>deriveInterval(inventory,after,{...end,observation},'bad'));
 const forged=structuredClone(lifecycle);forged.endObservation.sessionId='other';assert.throws(()=>validateIntervals(inventory,[forged]),/session/);
 const mixed=structuredClone(end);mixed.provenance='public-input';assert.throws(()=>deriveInterval(inventory,after,mixed,'mixed'),/identity/);
});

test('disjoint intervals cannot collectively exceed their one parent snapshot',()=>{
 const {inventory,before,after}=fixture();
 const first=deriveInterval(inventory,before,after,'one');
 const second=deriveInterval(inventory,{...before,sequence:2},{...after,sequence:3},'two');
 const row={realmId:'realm',identity:{jobId:'mode-proof',artifactHash:'artifact'},payload:after.payload,intervals:[first,second]};
 assert.throws(()=>validateModeRows(inventory,[row],['solo-arcade']),/exceeds parent/);
});

test('component interval requires its explicit terminal observation',()=>{
 const {inventory,before,after}=fixture();
 const observation={mode:'survive-flow',base:'stroll',kind:'survive',phase:'playing',sessionId:'local-1',participants:2};
 before.provenance=after.provenance='component-model';before.observation=after.observation=observation;
 const interval=deriveInterval(inventory,before,after,'component');delete interval.endObservation;
 assert.throws(()=>validateIntervals(inventory,[interval]),/endpoint/);
});

test('parent bounds reject unsafe sums and invalid or ambiguous canonical parents',()=>{
 const {inventory,before,after}=fixture();
 const first=deriveInterval(inventory,before,after,'one');
 const second=deriveInterval(inventory,{...before,sequence:2},{...after,sequence:3},'two');
 const row={realmId:'realm',identity:{jobId:'mode-proof',artifactHash:'artifact'},payload:structuredClone(after.payload),intervals:[first,second]};
 const path='/attribution/counter.ts';
 row.payload.coverage[path].f['0']=Number.MAX_SAFE_INTEGER;
 first.payload.coverage[path].f['0']=Number.MAX_SAFE_INTEGER;
 // Zero statement/branch deltas so this case reaches the function overflow guard.
 for(const interval of [first,second]){for(const id of Object.keys(interval.payload.coverage[path].s))interval.payload.coverage[path].s[id]=0;for(const id of Object.keys(interval.payload.coverage[path].b))interval.payload.coverage[path].b[id].fill(0);}
 assert.throws(()=>validateModeRows(inventory,[row],['solo-arcade']),/Unsafe aggregate/);
 row.intervals=[first];row.payload.coverage[path].f['0']=-1;
 assert.throws(()=>validateModeRows(inventory,[row],['solo-arcade']),/Invalid counter/);
 row.payload=after.payload;
 assert.throws(()=>validateModeRows(inventory,[row,{...row,intervals:[]}],['solo-arcade']),/parent/);
});


test('model sidecar requires independent parent, exact phases and actual config binding',()=>{
 const {inventory,before,after}=fixture();
 before.provenance=after.provenance='component-model';
 const common={mode:'survive-flow',base:'stroll',kind:'survive'};
 before.observation={...common,phase:'acquiring',sessionId:null,participants:0};
 after.observation={...common,phase:'playing',sessionId:'local-1',participants:2};
 const interval=deriveInterval(inventory,before,after,'acquire');
 const row={identity:{runId:'run',realmId:'realm',jobId:'mode-proof',artifactHash:'artifact',provenance:'component-model'},payload:after.payload,intervals:[interval]};
 const options={runId:'run',realmId:'realm',jobId:'mode-proof',artifactHash:'artifact',expectations:[{mode:'survive-flow',phases:[['acquiring','playing']]}]};
 assert.equal(validateModelSidecar(inventory,row,[after.payload],options).realmId,'realm');
 assert.throws(()=>validateModelSidecar(inventory,row,[],options),/independent/);
 assert.throws(()=>validateModelSidecar(inventory,row,[before.payload],options),/independent/);
 assert.throws(()=>validateModelSidecar(inventory,row,[after.payload],{...options,jobId:'wrong'}),/identity/);
 assert.throws(()=>validateModelSidecar(inventory,{...row,intervals:[]},[after.payload],options),/Missing exclusive/);
 assert.throws(()=>validateModelSidecar(inventory,row,[after.payload],{...options,expectations:[{mode:'survive-flow',phases:[['playing','settled']]}]}),/Incomplete/);
});

test('solo applicability projection refuses absent or nonpublic ownership evidence before dispositions',async()=>{
 const {projectSoloApplicability}=await import('./run.mjs');
 for(const intervals of [[],[{mode:'solo-arcade',provenance:'component-model',observation:{}}],[{mode:'solo-arcade',provenance:'public-input',observation:{ownership:{canonicalDefinition:true,canonicalRules:true,worldIsOwn:true}}}]])assert.throws(()=>projectSoloApplicability('solo-arcade',{}, {},[],intervals),/stable ownership|definition evidence/);
});

test('solo component owner/staging evidence and turn base identity remain explicit',()=>{
 const {inventory,before,after}=fixture();before.provenance=after.provenance='component-model';
 const solo={mode:'solo-arcade',base:'arcade',definitionEvidence:canonicalEvidence,kind:'solo',ownerId:'actual-game-1',participants:1,phase:'playing',ownership:{canonicalDefinition:true,canonicalRules:true,worldIsOwn:true,playerIsOwn:true,sessionActive:false,playerSessionAbsent:true,stageCalls:0,boundaryChecks:2}};
 before.observation=after.observation=solo;
 assert.equal(deriveInterval(inventory,before,after,'solo').mode,'solo-arcade');
 for(const changed of [{...solo,ownerId:'other'},{...solo,ownership:{...solo.ownership,stageCalls:1}},{...solo,ownership:{...solo.ownership,playerSessionAbsent:false}}])assert.throws(()=>deriveInterval(inventory,before,{...after,observation:changed},'bad'));
 for(const mode of ['relay','race']){
  before.observation={mode,base:'arcade',kind:mode,phase:'acquiring',sessionId:null,participants:0};
  after.observation={mode,base:'arcade',kind:mode,phase:'playing',sessionId:'actual-session',participants:2,definitionEvidence:canonicalEvidence,ownership:{canonicalDefinition:true,canonicalRules:true,sameModule:true,sessionActive:true,sessionRunning:true,worldIsOwn:true,playerIsOwn:true,rosterStable:true}};
  for(const field of ['definitionEvidence','ownership']){const invalid=structuredClone(after);delete invalid.observation[field];assert.throws(()=>deriveInterval(inventory,before,invalid,'missing-evidence'));}
  for(const field of Object.keys(after.observation.ownership)){const invalid=structuredClone(after);invalid.observation.ownership[field]=false;assert.throws(()=>deriveInterval(inventory,before,invalid,'false-ownership'));}
  assert.equal(deriveInterval(inventory,before,after,mode).mode,mode);
  assert.throws(()=>deriveInterval(inventory,before,{...after,observation:{...after.observation,base:'stroll'}},'changed-base'));
 }
});

test('turn applicability refuses absent or invalid actual mode intervals before projection',async()=>{
 const {projectTurnApplicability}=await import('./run.mjs');
 assert.throws(()=>projectTurnApplicability('solo-arcade',{}, {},[],[]),/Turn applicability mode/);
 assert.throws(()=>projectTurnApplicability('relay',{}, {},[],[]),/actual mode witnesses/);
 assert.throws(()=>projectTurnApplicability('relay',{}, {},[],[{mode:'race'}]),/actual mode witnesses/);
 assert.throws(()=>projectTurnApplicability('relay',{}, {},[],[{mode:'relay',provenance:'component-model',observation:{}}]));
});

test('browser applicability refuses nonproduction or uncollected evidence',async()=>{
 const {projectBrowserApplicability}=await import('./run.mjs');
 for(const rows of [[],[{status:'collected',identity:{buildScope:'development',artifactHash:'hash',jobId:'job'},payload:{}}],[{status:'missing',identity:{buildScope:'production',artifactHash:'hash',jobId:'job'},payload:{}}],[{status:'collected',identity:{buildScope:'production'},payload:{}}]])assert.throws(()=>projectBrowserApplicability({}, {},[],rows),/collected production/);
});

test('fresh turn acquisition measures only its import and rejects failed or changed ownership',async()=>{
 // Synthetic calibration only: these counters and coordinators are never
 // admitted as a production suite or used for release percentages.
 const inventory=instrumentSources({'game.ts':'function initialize() { return 7; } initialize();'},'/fresh-turn-calibration');
 const previous=globalThis.__coverage__,context=vm.createContext({}),results=[];
 const identity={runId:'synthetic',realmId:'synthetic',jobId:'synthetic',artifactHash:'synthetic'};
 try{
  delete globalThis.__coverage__;
  const definitions=SOLO_DEFINITION_SNAPSHOTS;
  class SharedWorld {constructor(game){this.host=game;this.definition=game.definition;this.rules=game.rules;this.sessionActive=true;}}
  class SessionPlayer {constructor(world,primary,seat){Object.assign(this,{world,primary,seat,participantId:seat,characterId:seat});}}
  class Game {constructor(base='arcade'){this.definition=definitions[base];this.rules=this.definition.rules;this.world=new SharedWorld(this);this.player=new SessionPlayer(this.world,true,'p1');this.state='playing';}}
  class LocalSession {constructor(game,mode){this.id=`calibration-${mode}`;this.world=game.world;this.definition=game.definition;this.mode={definition:game.definition};this.roster=this.players=[game.player,new SessionPlayer(this.world,false,'p2')];this.active=true;for(const p of this.players)p.session=this;}}
  const authority={Game,SharedWorld,SessionPlayer,LocalSession,SOLO_ARCADE_MODE:definitions.arcade,SOLO_STROLL_MODE:definitions.stroll};
  for(const mode of ['relay','race']){
   class Coordinator {
    constructor(game){this.session=new LocalSession(game,mode);this.setup={tilesPerLeg:50};this.descriptor={schema:'race-1'};}
    snapshot(){return {phase:'running'};}
   }
   const recorder=createTurnModelRecorder({mode,inventory,identity,load:async()=>{
    vm.runInContext(inventory['game.ts'].code,context);globalThis.__coverage__=context.__coverage__;
    return {authority,Coordinator,factory:game=>new Coordinator(game),createGame:()=>new Game()};
   }});
   const {owner}=await recorder.acquireFresh('arcade',{}),result=recorder.finish(),interval=result.intervals[0];results.push(result);
   assert.equal(interval.observation.phase,'acquiring');assert.equal(interval.endObservation.sessionId,owner.session.id);
   assert.deepEqual(Object.values(interval.payload.coverage['/fresh-turn-calibration/game.ts'].f),[1],'each fresh initialization contributes its actual delta');
   validateIntervals(inventory,result.intervals);
   await assert.rejects(()=>recorder.acquireFresh('arcade',{}),/Invalid fresh/);
   owner.session.world.host={};assert.throws(()=>recorder.interval('wrong-owner',()=>{}),/canonical turn ownership|Changed turn-mode owner/);
  }
  assert.equal(validateModeRows(inventory,[{realmId:identity.realmId,identity,payload:results.at(-1).payload,intervals:results.flatMap(r=>r.intervals)}],['relay','race']).length,2,'all fresh deltas fit their one independent parent');
  for(const fault of ['import','factory','base','coordinator']){
   class Coordinator {}
   const recorder=createTurnModelRecorder({mode:'relay',inventory,identity,load:async()=>{
    if(fault==='import')throw Error('import failed');
    return {authority,Coordinator,factory:fault==='factory'?null:game=>({session:{id:'synthetic',world:{host:game},definition:game.definition,mode:{},players:[{},{}]},setup:{tilesPerLeg:50}}),createGame:()=>new Game(fault==='base'?'stroll':'arcade')};
   }});
   await assert.rejects(()=>recorder.acquireFresh('arcade',{}));
   assert.throws(()=>recorder.finish(),/Missing acquired owner/);
  }
  let resolveImport;
  const pending=createTurnModelRecorder({mode:'relay',inventory,identity,load:()=>new Promise(resolve=>{resolveImport=resolve;})});
  const acquisition=pending.acquireFresh('arcade',{});
  await assert.rejects(()=>pending.acquireFresh('arcade',{}),/Invalid fresh/);
  assert.throws(()=>pending.finish(),/Missing acquired owner/);
  resolveImport({});await assert.rejects(()=>acquisition,/Missing loaded/);
 }finally{if(previous===undefined)delete globalThis.__coverage__;else globalThis.__coverage__=previous;}
});


test('canonical definition evidence rejects missing forged and mismatched snapshots',()=>{
 assert.equal(validateSoloDefinition(canonicalEvidence,'arcade'),true);
 for(const value of [undefined,{canonicalDefinition:true,canonicalRules:true},{...canonicalEvidence,sourceHash:'forged'},{...canonicalEvidence,rulesIdentity:false},{...canonicalEvidence,deepFrozen:false},{...canonicalEvidence,snapshot:SOLO_DEFINITION_SNAPSHOTS.stroll}])assert.throws(()=>validateSoloDefinition(value,'arcade'),/evidence/);
 const changed=structuredClone(canonicalEvidence);changed.snapshot.rules.pursuit.speed=1.23;assert.throws(()=>validateSoloDefinition(changed,'arcade'),/evidence/);
});


test('direct solo projection refuses missing canonical evidence before mapping',async()=>{
 const {projectSoloApplicability}=await import('./run.mjs');
 const observation={base:'arcade',phase:'playing',ownership:{worldIsOwn:true,playerIsOwn:true,sessionActive:false,playerSessionAbsent:true,stageCalls:0,boundaryChecks:1}};
 assert.throws(()=>projectSoloApplicability('solo-arcade',{}, {},[],[{mode:'solo-arcade',provenance:'component-model',observation,endObservation:observation}]),/definition evidence/);
});

test('canonical expected definitions cannot be mutated by an importing caller',()=>{
 assert.throws(()=>{SOLO_DEFINITION_SNAPSHOTS.arcade.rules.pursuit.speed=1.23;},TypeError);
 assert.throws(()=>{SOLO_DEFINITION_SNAPSHOTS.stroll.rules.pursuers.introductionThresholds.push(999);},TypeError);
 assert.equal(validateSoloDefinition(canonicalEvidence,'arcade'),true);
});
