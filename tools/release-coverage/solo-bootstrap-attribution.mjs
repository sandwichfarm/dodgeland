import {readFile,writeFile} from 'node:fs/promises';
import {capturePayload} from './collector.mjs';
import {deriveInterval,validateIntervals} from './attribution.mjs';

// An absent pre-import Game record means zero execution, not an empty successful parent.
// Normalize a snapshot copy only; never initialize or reset global instrumentation counters.
export function bootstrapSnapshot(inventory,raw,identity){
 const game=Object.values(inventory).find(row=>row.path.endsWith('/game.ts'));
 if(!game)throw Error('Missing bootstrap Game source');
 return capturePayload(inventory,{[game.path]:game.zero,...raw},identity);
}
export async function createSoloBootstrapRecorder(configPath=process.env.DOWN_TO_DUCK_COVERAGE_CONFIG){
 const config=configPath?JSON.parse(await readFile(configPath,'utf8')):null;
 if(config&&!config.modelAttribution)throw Error('Missing bootstrap attribution config');
 const inventory=config?JSON.parse(await readFile(config.inventoryPath,'utf8')):null;
 const identity=config?{runId:config.runId,realmId:config.modelAttribution.realmId,jobId:config.jobId,artifactHash:config.browserBuilds.modules.artifactHash,buildScope:'production',provenance:'component-model'}:null;
 let sequence=0,failed=false,active=false;const intervals=[],names=new Set();
 const snapshot=observation=>({...identity,observation,sequence:sequence++,payload:bootstrapSnapshot(inventory,globalThis.__coverage__,identity)});
 const add=(before,after,id)=>{const interval=deriveInterval(inventory,before,after,id);validateIntervals(inventory,[...intervals,interval]);intervals.push(interval);};
 return {
  async witness(name,base,load,construct,tape){
   if(active||names.has(name)||!['arcade','stroll'].includes(base))throw Error('Invalid bootstrap lifetime');
   active=true;names.add(name);let LocalSession,original,observed,stageCalls=0,checks=0,game,world,player;
   const common={ownerId:name,kind:'solo',base,mode:base==='arcade'?'solo-arcade':'solo-flow'};
   function observe(){
    if(!game||game.world!==world||game.player!==player||world.host!==game||player.world!==world||!player.primary||game.definition.id!==base||world.sessionActive||player.session!==undefined||stageCalls||LocalSession.stage!==observed)throw Error('Bootstrap ownership/staging mismatch');
    return {...common,phase:game.state,participants:1,ownership:{worldIsOwn:true,playerIsOwn:true,sessionActive:false,playerSessionAbsent:true,stageCalls,boundaryChecks:++checks}};
   }
   try{
    const before=inventory?snapshot({...common,phase:'acquiring',participants:0}):null;
    const loaded=await load();LocalSession=loaded.session.LocalSession;original=LocalSession.stage;
    observed=function(...args){stageCalls++;return original.apply(this,args);};LocalSession.stage=observed;
    game=construct(loaded);world=game.world;player=game.player;
    const acquired=observe();if(inventory)add(before,snapshot(acquired),`${name}:acquisition`);
    const start=inventory?snapshot(observe()):null;
    await tape(game,loaded,()=>observe());observe();
    if(inventory)add(start,snapshot(observe()),`${name}:runtime`);
   }catch(error){failed=true;throw error;}finally{if(LocalSession&&original)LocalSession.stage=original;active=false;}
  },
  async finish(){
   if(failed||active||names.size!==2)throw Error('Incomplete bootstrap witnesses');
   if(inventory){validateIntervals(inventory,intervals);await writeFile(config.modelAttribution.output,JSON.stringify({identity,intervals,payload:capturePayload(inventory,globalThis.__coverage__,identity)}));}
  },
 };
}
