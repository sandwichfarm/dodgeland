// Explicit test-host collection. Nothing in the normal app imports this module.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function createBrowserCollector(config, inventory) {
 const realms=new Map();
 function enrich(identity) {
  if(!config.jobId)return identity;
  const buildScope=identity.buildScope??'production',build=config.browserBuilds?.[buildScope];
  if(!['production','development'].includes(buildScope)||!build?.artifactHash)throw Error('Missing browser build scope');
  if(identity.jobId&&identity.jobId!==config.jobId)throw Error('Wrong browser job');
  return {...identity,jobId:config.jobId,buildScope,artifactHash:build.artifactHash};
 }
 function key(identity) {
  for(const field of ['suite','scenario','frame','scope'])if(typeof identity?.[field]!=='string'||!identity[field])throw Error(`Missing browser ${field}`);
  if(identity.scope!=='current'||!Number.isSafeInteger(identity.generation)||identity.generation<0)throw Error('Invalid browser scope/generation');
  return 'browser:'+JSON.stringify([identity.suite,identity.scenario,identity.frame,identity.generation,identity.scope,...(identity.jobId?[identity.jobId,identity.buildScope,identity.artifactHash]:[])]);
 }
 function persist(row){writeFileSync(join(config.payloadDirectory,'browser-'+digest(row.identity)+'.json'),JSON.stringify(row));}
 return {
  registerRealm(target,identity){identity=enrich(identity);const id=key(identity);if(realms.has(id))throw Error('Duplicate browser realm');const row={realmId:id,identity:structuredClone(identity),status:'registered'};realms.set(id,row);persist(row);return id;},
  async collectRealm(target,identity){identity=enrich(identity);const id=key(identity),row=realms.get(id);if(!row)throw Error('Missing registered browser realm');if(row.status==='collected')throw Error('Duplicate browser snapshot');const raw=await target.evaluate(()=>globalThis.__coverage__);const {capturePayload}=await import('./collector.mjs');const payload=capturePayload(inventory,raw,{runId:config.runId,realmId:id});Object.assign(row,{status:'collected',payload});persist(row);return payload;},
  finishRealms(){for(const row of realms.values())if(row.status!=='collected')throw Error(`Missing browser payload ${row.realmId}`);return [...realms.values()];},
 };
}
let active;
function collector(){
 if(!process.env.DOWN_TO_DUCK_COVERAGE_CONFIG)return null;
 if(!active){const config=JSON.parse(readFileSync(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8'));active=createBrowserCollector(config,JSON.parse(readFileSync(config.inventoryPath,'utf8')));process.once('exit',()=>{try{active.finishRealms();}catch(error){console.error(error.message);process.exitCode=1;}});}
 return active;
}
export function artifactForCoverage(defaultArtifact,buildScope='production'){
 if(!['production','development'].includes(buildScope))throw Error('Invalid browser build scope');
 if(!process.env.DOWN_TO_DUCK_COVERAGE_CONFIG)return defaultArtifact;
 const config=JSON.parse(readFileSync(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8'));
 const artifact=config.browserBuilds?.[buildScope]?.artifact??(buildScope==='production'?config.browserArtifact:undefined);
 if(!artifact)throw Error('Missing isolated browser artifact scope');return artifact;
}
export function artifactDirectoryForCoverage(defaultDirectory,owner){
 if(!process.env.DOWN_TO_DUCK_COVERAGE_CONFIG)return defaultDirectory;
 if(!/^[a-z0-9-]+$/.test(owner))throw Error('Invalid artifact owner');
 const config=JSON.parse(readFileSync(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8'));
 return pathToFileURL(join(config.payloadDirectory,'suite-artifacts',owner)+'/');
}
export const registerRealm=(target,identity)=>collector()?.registerRealm(target,identity);
export const collectRealm=(target,identity)=>collector()?.collectRealm(target,identity);
export const finishRealms=()=>collector()?.finishRealms()??[];
