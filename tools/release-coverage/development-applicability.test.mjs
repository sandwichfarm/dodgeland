import test,{after}from'node:test';
import assert from'node:assert/strict';
import{readFile,writeFile,mkdtemp,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join,resolve}from'node:path';
import{instrumentSources,reportCoverage,hash}from'./instrument.mjs';
import{reportApplicability}from'./applicability.mjs';
import{developmentApplicabilityDispositions as dispositions,DEVELOPMENT_CONFIG_PINS}from'./development-applicability.mjs';
import{projectDevelopmentApplicability}from'./run.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname),directory=await mkdtemp(join(tmpdir(),'development-applicability-'));after(()=>rm(directory,{recursive:true,force:true}));
const proof=JSON.parse(await readFile(join(root,'.planning/phases/07-release-evidence-pr/07-03-DEVELOPMENT-APP-CLOSURE-PROOF.json'),'utf8'));
const authoritySources=await Promise.all(proof.map(async({path})=>({path,source:await readFile(join(root,path),'utf8')})));
const configSources=await Promise.all(Object.keys(DEVELOPMENT_CONFIG_PINS).map(async path=>({path,source:await readFile(join(root,path),'utf8')})));
const targets=['src/game.ts','src/session.ts','src/consumable-drops.ts'];
const inventory=instrumentSources(Object.fromEntries(authoritySources.filter(s=>targets.includes(s.path)).map(s=>[s.path,s.source])),root);
const mapped=await reportCoverage(inventory,[Object.fromEntries(Object.values(inventory).map(r=>[r.path,r.zero]))],directory);
// Synthetic mapped zeros calibrate evaluator behavior; no production hit credit.
const sources=Object.values(inventory).map(r=>({path:r.path,source:r.source,map:r.map,coverage:mapped.map.fileCoverageFor(r.path).toJSON()}));
const attributed=Object.fromEntries(sources.map(s=>[s.path,structuredClone(s.coverage)]));
const args={mode:'development',sources,authoritySources,configSources};
const line=(s,fragment)=>{const n=s.source.indexOf(fragment);assert.ok(n>=0,fragment);return s.source.slice(0,n).split('\n').length;};
test('ten named callable bodies are projected; actual frame/initialization/default crossing sites stay',()=>{
 const original=structuredClone(sources),ds=dispositions(args);
 for(const[file,names]of Object.entries({'game.ts':['export function worldForRow(','export function actorPositions(','  syncSharedEffects('],'session.ts':['  selectMobTarget(','  view():','  sharedWorldEffectsSnapshot('],'consumable-drops.ts':['export function classifyConsumableBucket(','export function consumablePickupId(','export function classifyItemBucket(','export function sampleConsumableDrop(']})){
  const s=sources.find(s=>s.path.endsWith('/'+file));for(const name of names){const n=line(s,name),ids=Object.entries(s.coverage.fnMap).filter(([,site])=>site.decl.start.line===n).map(([id])=>id);assert.ok(ids.length,name);assert.ok(ids.some(id=>ds.some(d=>d.path===s.path&&d.kind==='function'&&d.id===id)),name);}
 }
 for(const[file,names]of Object.entries({'game.ts':['  updateSessionMobs(','  private collectSessionCoins('],'session.ts':['  releaseInactivePickupClaims(','  resolvePickups('],'consumable-drops.ts':['export function sampleItemDrop(','export function validateConsumableSchema(','export function registerConsumableSchema(']})){const s=sources.find(s=>s.path.endsWith('/'+file));for(const name of names){const n=line(s,name);const sites=Object.entries(s.coverage.fnMap).filter(([,site])=>site.decl.start.line===n);assert.ok(sites.length,name);for(const[id]of sites)assert.equal(ds.some(d=>d.path===s.path&&d.kind==='function'&&d.id===id),false,name);}}
 const drops=sources.find(s=>s.path.endsWith('/consumable-drops.ts'));
 for(const fragment of['export const DEFAULT_ITEM_SCHEMA','const schemas =','const BUCKETS =']){const n=line(drops,fragment),sites=Object.entries(drops.coverage.statementMap).filter(([,site])=>site.start.line===n);assert.ok(sites.length);for(const[id]of sites)assert.equal(ds.some(d=>d.path===drops.path&&d.kind==='statement'&&d.id===id),false);}
 const report=reportApplicability({mode:'development',sources,attributed,dispositions:ds});assert.ok(report.applicable.functions.total<report.raw.functions.total);assert.deepEqual(sources,original);
});
test('complete authority rejects addition removal duplicate source and new caller drift plus config drift',()=>{
 for(const modified of [authoritySources.slice(1),[...authoritySources,{path:'src/new-caller.ts',source:'export const invoke=x=>x.view();'}],[...authoritySources.slice(1),authoritySources[1]]])assert.throws(()=>dispositions({...args,authoritySources:modified}),/authority|inventory/);
 const changed=structuredClone(authoritySources);changed.find(s=>s.path==='src/market/items/magnet.ts').source+='\n// new caller or eager-glob behavior\n';assert.throws(()=>dispositions({...args,authoritySources:changed}),/inventory changed/);
 for(const source of configSources){const modified=structuredClone(configSources);modified.find(s=>s.path===source.path).source+='\n';assert.throws(()=>dispositions({...args,configSources:modified}),/config changed/);}
 const changedSource=structuredClone(sources);changedSource[0].source+='\n';assert.throws(()=>dispositions({...args,sources:changedSource}),/differs/);
 assert.throws(()=>dispositions({...args,sources:sources.slice(1)}),/Missing/);assert.throws(()=>dispositions({...args,sources:[...sources,sources[0]]}),/Duplicate/);
 assert.throws(()=>dispositions({...args,mode:'relay'}),/Exact development/);
});
test('stale source maps/schema and positive excluded counts fail, with raw maps unchanged',()=>{
 const ds=dispositions(args);
 for(const kind of['statement','function','branch']){const d=ds.find(d=>d.kind===kind);assert.ok(d);const hits=structuredClone(attributed);if(kind==='branch')hits[d.path].b[d.id][d.arm]=1;else hits[d.path][kind==='function'?'f':'s'][d.id]=1;assert.throws(()=>reportApplicability({mode:'development',sources,attributed:hits,dispositions:ds}),/contradicted/);}
 const map=structuredClone(sources);map[0].map.file='changed';assert.throws(()=>reportApplicability({mode:'development',sources:map,attributed,dispositions:ds}),/stale/);
 const schema=structuredClone(sources),hits=structuredClone(attributed);schema[0].coverage.fnMap['0'].name='changed';hits[schema[0].path].fnMap['0'].name='changed';assert.throws(()=>reportApplicability({mode:'development',sources:schema,attributed:hits,dispositions:ds}),/stale/);
});
test('crossing, unmapped, unknown and implicit-else branches and signature allocation remain applicable',()=>{
 const modified=structuredClone(sources),s=modified.find(s=>s.path.endsWith('/consumable-drops.ts')),n=line(s,'export function classifyConsumableBucket(');
 const body={start:{line:n+1,column:2},end:{line:n+1,column:10}},cross={start:{line:n-1,column:0},end:{line:n+1,column:10}};
 for(const[id,loc,type]of[['cross',cross,'cond-expr'],['missing',{},'if'],['unknown',body,'future-branch']]){s.coverage.branchMap[id]={type,loc,locations:[loc]};s.coverage.b[id]=[0];}
 const ifSite=Object.values(s.coverage.branchMap).find(b=>b.type==='if'&&b.loc.start?.line===n+1);assert.ok(ifSite);s.coverage.branchMap.implicit={...structuredClone(ifSite),locations:[ifSite.loc,ifSite.loc]};s.coverage.b.implicit=[0,0];
 s.coverage.statementMap.signature={start:{line:n,column:0},end:{line:n,column:20}};s.coverage.s.signature=0;
 s.coverage.branchMap.defaultParameter={type:'default-arg',loc:s.coverage.statementMap.signature,locations:[s.coverage.statementMap.signature]};s.coverage.b.defaultParameter=[0];
 const ds=dispositions({...args,sources:modified});for(const id of['cross','missing','unknown','signature','defaultParameter'])assert.equal(ds.some(d=>d.path===s.path&&d.id===id),false,id);assert.equal(ds.some(d=>d.id==='implicit'&&d.arm===1),false);
});
test('runner rejects Node, unproved or wrong-artifact DEV labels before projection',async()=>{
 const artifactHash='a'.repeat(64),realmId='browser:fixture',row={status:'collected',realmId,identity:{scope:'current',jobId:'fixture',buildScope:'development',artifactHash},payload:{realmId},artifactProof:{buildScope:'development',artifactHash,developmentTools:true,scriptHashes:['b'.repeat(64)]}};
 const invalid=[[],[{...row,realmId:'node:fixture'}],[{...row,status:'registered'}],[{...row,artifactProof:undefined}],[{...row,identity:{...row.identity,scope:'oracle'}}],[{...row,payload:{realmId:'other'}}],[{...row,artifactProof:{...row.artifactProof,developmentTools:false}}],[{...row,artifactProof:{...row.artifactProof,scriptHashes:[]}}],[{...row,artifactProof:{...row.artifactProof,artifactHash:'c'.repeat(64)}}]];
 for(const rows of invalid)await assert.rejects(()=>projectDevelopmentApplicability({}, {}, [], rows,{artifactHash}),/verified collected/);
});

test('DEV runner projects verified-shape synthetic counters without mutating its input maps',async()=>{
 const artifact=join(directory,'explicit-calibration.html'),script='globalThis.calibrationOnly = true;',bytes=Buffer.from(`<html><script>${script}</script></html>`);
 await writeFile(artifact,bytes);
 const artifactHash=hash(bytes),build={artifact,artifactHash},realmId='browser:synthetic-calibration',rows=[{status:'collected',realmId,identity:{scope:'current',jobId:'synthetic-calibration',buildScope:'development',artifactHash},payload:{realmId},artifactProof:{buildScope:'development',artifactHash,developmentTools:true,scriptHashes:[hash(JSON.stringify(script))]}}];
 const canonical=Object.fromEntries(authoritySources.map(s=>[s.path,{path:resolve(root,s.path),source:s.source}]));
 Object.assign(canonical,inventory);
 // Instrument inventory keys are also src/relative; preserve one record per file.
 const input=structuredClone(attributed),report=await projectDevelopmentApplicability(canonical,input,targets,rows,build);
 const badScripts=structuredClone(rows);badScripts[0].artifactProof.scriptHashes=['f'.repeat(64)];await assert.rejects(()=>projectDevelopmentApplicability(canonical,input,targets,badScripts,build),/inline script/);
 const badDigest=structuredClone(rows);badDigest[0].identity.artifactHash=badDigest[0].artifactProof.artifactHash='f'.repeat(64);await assert.rejects(()=>projectDevelopmentApplicability(canonical,input,targets,badDigest,{...build,artifactHash:'f'.repeat(64)}),/bytes\/hash/);
 await assert.rejects(()=>projectDevelopmentApplicability(canonical,input,targets,rows,{artifactHash}),/artifact path/);
 await assert.rejects(()=>projectDevelopmentApplicability(canonical,input,targets,rows,{...build,artifact:join(directory,'absent.html')}),/unreadable development artifact/);
 const other=join(directory,'other.html');await writeFile(other,'<script>different()</script>');await assert.rejects(()=>projectDevelopmentApplicability(canonical,input,targets,rows,{...build,artifact:other}),/bytes\/hash/);
 await writeFile(artifact,'<script>changed()</script>');await assert.rejects(()=>projectDevelopmentApplicability(canonical,input,targets,rows,build),/bytes\/hash/);await writeFile(artifact,bytes);

 for(const path of ['src/main.ts','src/market/catalog.ts']){const changed=structuredClone(canonical);changed[path].source+='\n// changed built caller while filesystem is unchanged\n';await assert.rejects(()=>projectDevelopmentApplicability(changed,input,targets,rows,build),/Canonical development source inventory/);}
 const missing=structuredClone(canonical);delete missing['src/main.ts'];await assert.rejects(()=>projectDevelopmentApplicability(missing,input,targets,rows,build),/Canonical development source inventory/);
 const extra={...canonical,newCaller:{path:resolve(root,'src/new-caller.ts'),source:'export const call=x=>x.view();'}};await assert.rejects(()=>projectDevelopmentApplicability(extra,input,targets,rows,build),/Canonical development source inventory/);
 await assert.rejects(()=>projectDevelopmentApplicability({...canonical,duplicate:canonical['src/main.ts']},input,targets,rows,build),/Duplicate canonical/);
 assert.equal(report.mode,'development');assert.equal(report.authoritySources.length,158);assert.equal(report.configSources.length,3);assert.ok(report.dispositions.length);assert.deepEqual(input,attributed);
});
