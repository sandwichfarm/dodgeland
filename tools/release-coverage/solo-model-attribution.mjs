import { readFile, writeFile } from 'node:fs/promises';
import { capturePayload } from './collector.mjs';
import { deriveInterval, validateIntervals } from './attribution.mjs';

/** Test-only opt-in for bounded, unmodified current-engine parity scenarios. */
export async function createSoloModelRecorder({LocalSession},configPath=process.env.DOWN_TO_DUCK_COVERAGE_CONFIG){
 const config=configPath?JSON.parse(await readFile(configPath,'utf8')):null;
 if(config&&!config.modelAttribution)throw Error('Missing solo model configuration');
 const inventory=config?JSON.parse(await readFile(config.inventoryPath,'utf8')):null;
 const identity=config?{runId:config.runId,realmId:config.modelAttribution.realmId,jobId:config.jobId,artifactHash:config.browserBuilds.modules.artifactHash,buildScope:'production',provenance:'component-model'}:null;
 let sequence=0,stageCalls=0,active=false;
 const original=LocalSession.stage,intervals=[],names=new Set();
 // Transparent observer: it delegates all arguments/results/errors unchanged. Valid solo traces never call it.
 function observedStage(...args){stageCalls++;return original.apply(this,args);}
 LocalSession.stage=observedStage;
 const capture=observation=>({...identity,sequence:sequence++,observation,payload:capturePayload(inventory,globalThis.__coverage__,identity)});
 function add(before,after,id){const interval=deriveInterval(inventory,before,after,id);validateIntervals(inventory,[interval]);intervals.push(interval);}
 return {
  scenario(name,base){
   if(active||names.has(name)||!['arcade','stroll'].includes(base))throw Error('Concurrent/duplicate/unknown solo scenario');
   active=true;names.add(name);let game,world,player,boundaryChecks=0,before;
   const common={mode:base==='arcade'?'solo-arcade':'solo-flow',base,kind:'solo',ownerId:name};
   function boundary(){
    if(!game||game.world!==world||game.player!==player||world.host!==game||player.world!==world||!player.primary||game.definition.id!==base||world.sessionActive||player.session!==undefined||stageCalls!==0||LocalSession.stage!==observedStage)throw Error('Solo component ownership/staging changed');
    boundaryChecks++;
   }
   function observation(){boundary();return {...common,phase:game.state,participants:1,ownership:{worldIsOwn:true,playerIsOwn:true,sessionActive:false,playerSessionAbsent:true,stageCalls,boundaryChecks}};}
   return {
    acquire(construct){
     const start=inventory?capture({...common,phase:'acquiring',participants:0}):null;
     game=construct();world=game.world;player=game.player;boundary();
     if(inventory)add(start,capture(observation()),`${name}:acquisition`);
     return game;
    },
    begin(){boundary();if(inventory)before=capture(observation());},
    boundary,
    end(){boundary();if(inventory)add(before,capture(observation()),`${name}:runtime`);active=false;},
   };
  },
  async finish(){
   if(active||stageCalls||!names.size)throw Error('Incomplete or staged solo component witness');
   if(inventory){validateIntervals(inventory,intervals);await writeFile(config.modelAttribution.output,JSON.stringify({identity,intervals,payload:capturePayload(inventory,globalThis.__coverage__,identity)}));}
  },
  dispose(){LocalSession.stage=original;},
 };
}
