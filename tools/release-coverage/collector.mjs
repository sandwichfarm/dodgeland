import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { threadId } from 'node:worker_threads';
import coverage from 'istanbul-lib-coverage';

export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export function schemaHash(file) { return digest([file.path,file.statementMap,file.fnMap,file.branchMap]); }
export function validateInventory(inventory, expectedSources=Object.keys(inventory ?? {})) {
  if (!inventory || !Object.keys(inventory).length || !expectedSources.length) throw Error('Empty source inventory');
  if(expectedSources.length!==new Set(expectedSources).size) throw Error('Duplicate expected source');
  for(const name of expectedSources) if(!inventory[name]) throw Error(`Missing source ${name}`);
  if(Object.keys(inventory).length!==expectedSources.length) throw Error('Unknown inventory source');
  const paths=new Set(); let executable=0;
  for(const row of Object.values(inventory)) {
    if(paths.has(row.path))throw Error('Duplicate source identity');paths.add(row.path);
    if(row.zero.path!==row.path)throw Error('Source path mismatch');
    if(digest(row.source)!==row.sourceHash)throw Error('Source hash mismatch');
    if(digest(row.map)!==row.mapHash || digest(row.zero.inputSourceMap)!==row.mapHash)throw Error('Map mismatch');
    executable+=Object.keys(row.zero.statementMap).length+Object.keys(row.zero.fnMap).length;
  }
  if(!executable)throw Error('Empty executable inventory');
  return new Map(Object.values(inventory).map(row=>[row.path,row]));
}
function checkCounters(file, zero) {
  for(const metric of ['s','f','b']) {
    if(JSON.stringify(Object.keys(file[metric]??{}))!==JSON.stringify(Object.keys(zero[metric])))throw Error('Counter schema mismatch');
    for(const key of Object.keys(zero[metric])) {
      const counts=metric==='b'?file[metric][key]:[file[metric][key]];
      if(!Array.isArray(counts)||counts.length!==(metric==='b'?zero[metric][key].length:1)||counts.some(n=>!Number.isSafeInteger(n)||n<0))throw Error('Invalid counter');
    }
  }
}
export function capturePayload(inventory, raw, {runId,realmId}) {
  const records=validateInventory(inventory);
  if(!runId||!realmId)throw Error('Missing run/realm identity');
  if(!raw || !Object.keys(raw).length)throw Error('Empty payload');
  const identities=[];
  for(const path of Object.keys(raw).sort()) {
    const row=records.get(path);if(!row)throw Error(`Unknown source ${path}`);
    if(schemaHash(raw[path])!==schemaHash(row.zero))throw Error('Schema mismatch');
    if(digest(raw[path].inputSourceMap)!==row.mapHash)throw Error('Map mismatch');
    checkCounters(raw[path],row.zero);
    identities.push({path,sourceHash:row.sourceHash,mapHash:row.mapHash,schemaHash:schemaHash(row.zero)});
  }
  return {version:1,runId,realmId,pid:process.pid,threadId,identities,coverage:structuredClone(raw)};
}
export function mergePayloads(inventory,payloads,{runId,expectedRealms,expectedSources=Object.keys(inventory)}) {
  const records=validateInventory(inventory,expectedSources);
  if(!runId||!Array.isArray(expectedRealms)||!expectedRealms.length||new Set(expectedRealms).size!==expectedRealms.length)throw Error('Invalid required realms');
  if(!Array.isArray(payloads))throw Error('Missing realm payloads');
  const seen=new Set();const map=coverage.createCoverageMap({});
  for(const row of records.values())map.addFileCoverage(structuredClone(row.zero));
  for(const payload of [...payloads].sort((a,b)=>String(a.realmId).localeCompare(String(b.realmId)))) {
    if(payload.runId!==runId||payload.version!==1)throw Error('Run mismatch');
    if(!expectedRealms.includes(payload.realmId))throw Error('Unknown realm');
    if(seen.has(payload.realmId))throw Error('Duplicate realm');seen.add(payload.realmId);
    if(!payload.coverage||!Object.keys(payload.coverage).length)throw Error('Empty payload');
    for(const path of Object.keys(payload.coverage))if(!records.has(path))throw Error('Unknown source');
    if(!Array.isArray(payload.identities)||payload.identities.length!==Object.keys(payload.coverage).length)throw Error('Missing source identity');
    const identityPaths=new Set();
    for(const identity of payload.identities){
      if(identityPaths.has(identity.path))throw Error('Duplicate source identity');identityPaths.add(identity.path);
      const row=records.get(identity.path);if(!row)throw Error('Unknown source');
      if(identity.sourceHash!==row.sourceHash)throw Error('Source hash mismatch');
      if(identity.schemaHash!==schemaHash(row.zero))throw Error('Schema mismatch');
      if(identity.mapHash!==row.mapHash)throw Error('Map mismatch');
    }
    for(const [path,file]of Object.entries(payload.coverage)){
      const row=records.get(path);if(!row)throw Error('Unknown source');
      if(!identityPaths.has(path))throw Error('Missing source identity');
      if(schemaHash(file)!==schemaHash(row.zero))throw Error('Schema mismatch');
      if(digest(file.inputSourceMap)!==row.mapHash)throw Error('Map mismatch');
      checkCounters(file,row.zero);
    }
    map.merge(payload.coverage);
  }
  for(const realm of expectedRealms)if(!seen.has(realm))throw Error(`Missing realm ${realm}`);
  return JSON.parse(JSON.stringify(map.toJSON()));
}
// Explicit Node worker preload; never loaded by the product build.
if(process.env.RELEASE_COVERAGE_INVENTORY){
  const inventory=JSON.parse(readFileSync(process.env.RELEASE_COVERAGE_INVENTORY,'utf8'));
  process.once('exit',()=>{
    try { const payload=capturePayload(inventory,globalThis.__coverage__,{runId:process.env.RELEASE_COVERAGE_RUN,realmId:process.env.RELEASE_COVERAGE_REALM});writeFileSync(process.env.RELEASE_COVERAGE_OUTPUT,JSON.stringify(payload)); }
    catch(error){console.error(error.message);process.exitCode=1;}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try {if(process.argv[2]!=='--validate')throw Error('Usage: collector.mjs --validate input.json');const input=JSON.parse(readFileSync(process.argv[3],'utf8'));mergePayloads(input.inventory,input.payloads,input.options);console.log('VALID');}
  catch(error){console.error(error.message);process.exitCode=1;}
}
