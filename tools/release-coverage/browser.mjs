// Explicit test-host collection. Nothing in the normal app imports this module.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { deriveInterval, validateIntervals } from './attribution.mjs';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function createBrowserCollector(config, inventory) {
 const realms=new Map();
 function enrich(identity) {
  if(!config.jobId)return identity;
  const buildScope=identity.buildScope??config.defaultBuildScope??'production',build=config.browserBuilds?.[buildScope];
  if(!['production','development','modules'].includes(buildScope)||!build?.artifactHash)throw Error('Missing browser build scope');
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
  async collectRealm(target,identity){identity=enrich(identity);const id=key(identity),row=realms.get(id);if(!row)throw Error('Missing registered browser realm');if(row.status==='collected')throw Error('Duplicate browser snapshot');if(config.verifyArtifactScope&&!row.artifactProof)throw Error('Missing actual browser artifact proof');const raw=await target.evaluate(()=>globalThis.__coverage__);const {capturePayload}=await import('./collector.mjs');const payload=capturePayload(inventory,raw,{runId:config.runId,realmId:id});Object.assign(row,{status:'collected',payload});persist(row);return payload;},
  async verifyRealmArtifact(target,identity){
   identity=enrich(identity);const row=realms.get(key(identity));if(!row||row.status!=='registered')throw Error('Missing live artifact realm');
   if(!config.verifyArtifactScope)return;
   if(identity.buildScope==='development')await target.waitForFunction(()=>!!document.querySelector('#development-tools'));
   const observed=await target.evaluate(()=>({scripts:[...document.scripts].map(script=>script.textContent),developmentTools:!!document.querySelector('#development-tools')}));
   row.artifactProof=verifyArtifactScope(config,identity,observed);persist(row);
  },
  async snapshotRealm(target,observation){
   const pending=[...realms.values()].filter(row=>row.status==='registered');if(pending.length!==1)throw Error('Mode snapshot requires one live registered realm');
   const row=pending[0],{capturePayload}=await import('./collector.mjs');
   const payload=capturePayload(inventory,await target.evaluate(()=>globalThis.__coverage__),{runId:config.runId,realmId:row.realmId});
   return {sequence:row.sequence=(row.sequence??-1)+1,jobId:row.identity.jobId??row.identity.suite,buildScope:row.identity.buildScope??'production',artifactHash:row.identity.artifactHash??config.browserBuilds?.production?.artifactHash,provenance:'public-input',observation:structuredClone(observation),payload};
  },
  recordInterval(before,after,id){const row=realms.get(before.payload.realmId);if(!row||row.status!=='registered')throw Error('Interval parent is not live');const interval=deriveInterval(inventory,before,after,id);row.intervals=validateIntervals(inventory,[...(row.intervals??[]),interval]);persist(row);return interval;},
  finishRealms(){for(const row of realms.values())if(row.status!=='collected')throw Error(`Missing browser payload ${row.realmId}`);return [...realms.values()];},
 };
}
let active;
function collector(){
 if(!process.env.DOWN_TO_DUCK_COVERAGE_CONFIG)return null;
 if(!active){const config=JSON.parse(readFileSync(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8'));active=createBrowserCollector(config,JSON.parse(readFileSync(config.inventoryPath,'utf8')));process.once('exit',()=>{try{active.finishRealms();}catch(error){console.error(error.message);process.exitCode=1;}});}
 return active;
}
export function resolveCoverageArtifact(config,explicitScope){
 const buildScope=explicitScope??config.defaultBuildScope??'production';
 if(!['production','development'].includes(buildScope))throw Error('Invalid browser build scope');
 const build=config.browserBuilds?.[buildScope],artifact=build?.artifact??(buildScope==='production'?config.browserArtifact:undefined);
 if(!artifact)throw Error('Missing isolated browser artifact scope');
 return {buildScope,artifact,artifactHash:build?.artifactHash};
}
export function artifactForCoverage(defaultArtifact,buildScope){
 if(buildScope!==undefined&&!['production','development'].includes(buildScope))throw Error('Invalid browser build scope');
 if(!process.env.DOWN_TO_DUCK_COVERAGE_CONFIG)return defaultArtifact;
 const config=JSON.parse(readFileSync(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8'));
 return resolveCoverageArtifact(config,buildScope).artifact;
}
export function verifyArtifactScope(config,identity,observed){
 const selected=resolveCoverageArtifact(config,identity.buildScope),bytes=readFileSync(selected.artifact);
 if(!selected.artifactHash||identity.artifactHash!==selected.artifactHash||digest(bytes)!==selected.artifactHash)throw Error('Browser artifact bytes/hash mismatch');
 const scripts=[...bytes.toString('utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(text=>text.trim());
 if(!scripts.length||!Array.isArray(observed?.scripts)||scripts.some(text=>!observed.scripts.includes(text)))throw Error('Executed inline artifact script mismatch');
 if(observed.developmentTools!==(selected.buildScope==='development'))throw Error('Actual development tools presence mismatch');
 return {buildScope:selected.buildScope,artifactHash:selected.artifactHash,scriptHashes:scripts.map(digest),developmentTools:observed.developmentTools};
}
export const verifyRealmArtifact=(target,identity)=>collector()?.verifyRealmArtifact(target,identity);
export function artifactDirectoryForCoverage(defaultDirectory,owner){
 if(!process.env.DOWN_TO_DUCK_COVERAGE_CONFIG)return defaultDirectory;
 if(!/^[a-z0-9-]+$/.test(owner))throw Error('Invalid artifact owner');
 const config=JSON.parse(readFileSync(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8'));
 const artifactOwner=config.verifyArtifactScope?config.jobId:owner;
 if(!/^[a-z0-9-]+$/.test(artifactOwner??''))throw Error('Invalid isolated artifact job');
 return pathToFileURL(join(config.payloadDirectory,'suite-artifacts',artifactOwner)+'/');
}
export const registerRealm=(target,identity)=>collector()?.registerRealm(target,identity);
export const collectRealm=(target,identity)=>collector()?.collectRealm(target,identity);
export const finishRealms=()=>collector()?.finishRealms()??[];
export const snapshotRealm=(target,observation)=>collector()?.snapshotRealm(target,observation);
export const recordInterval=(before,after,id)=>collector()?.recordInterval(before,after,id);
