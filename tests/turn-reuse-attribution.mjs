import {readFile,writeFile} from 'node:fs/promises';
import {createTurnModelRecorder} from '../tools/release-coverage/turn-model-attribution.mjs';
import {capturePayload} from '../tools/release-coverage/collector.mjs';

// Opt-in attribution around existing assertions, never around the entire worker.
export async function turnReuseAttribution({mode,factory,Coordinator,lifetimes}) {
 const path=process.env.DOWN_TO_DUCK_COVERAGE_CONFIG;
 const config=path?JSON.parse(await readFile(path,'utf8')):null;
 const model=config?.modelAttribution;
 const inventory=model?JSON.parse(await readFile(config.inventoryPath,'utf8')):null;
 const identity=model?{runId:config.runId,realmId:model.realmId,jobId:config.jobId,artifactHash:config.browserBuilds.modules.artifactHash,buildScope:'production',provenance:'component-model'}:null;
 const records=[];let opened=0,active=false;
 return {
  lifetime(){
   if(active)throw Error('Overlapping reused turn lifetime');active=true;opened++;
   const recorder=inventory?createTurnModelRecorder({mode,factory,Coordinator,inventory,identity}):null;
   let finished=false;
   return {
    acquire(game,proposal){if(finished)throw Error('Finished reused turn lifetime');return recorder?recorder.acquire(game,proposal):factory(game,proposal);},
    interval(id,action){if(finished)throw Error('Finished reused turn lifetime');return recorder?recorder.interval(id,action):action();},
    finish(){if(finished)throw Error('Duplicate reused turn completion');if(recorder)records.push(recorder.finish());finished=true;active=false;},
   };
  },
  async finish(){
   if(active||opened!==lifetimes||inventory&&records.length!==lifetimes)throw Error('Incomplete reused turn lifetimes');
   if(inventory)await writeFile(model.output,JSON.stringify({identity,intervals:records.flatMap(r=>r.intervals),payload:capturePayload(inventory,globalThis.__coverage__,identity)}));
  },
 };
}
