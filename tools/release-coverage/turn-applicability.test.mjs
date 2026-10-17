import test,{after}from'node:test';
import assert from'node:assert/strict';
import{readFile,mkdtemp,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join,resolve}from'node:path';
import{instrumentSources,reportCoverage}from'./instrument.mjs';
import{reportApplicability}from'./applicability.mjs';
import{TURN_APPLICABILITY_SOURCES,turnApplicabilityDispositions}from'./turn-applicability.mjs';
const directory=await mkdtemp(join(tmpdir(),'turn-applicability-'));after(()=>rm(directory,{recursive:true,force:true}));
const root=resolve(new URL('../..',import.meta.url).pathname);
const texts=Object.fromEntries(await Promise.all([...Object.keys(TURN_APPLICABILITY_SOURCES),'src/game.ts','src/market/run.ts'].map(async path=>[path,await readFile(join(root,path),'utf8')])));
const inventory=instrumentSources(texts,root);
// A zero schema realm only, never gameplay evidence or mode coverage credit.
const mapped=await reportCoverage(inventory,[Object.fromEntries(Object.values(inventory).map(row=>[row.path,row.zero]))],directory);
const sources=Object.values(inventory).map(row=>({path:row.path,source:row.source,map:row.map,coverage:mapped.map.fileCoverageFor(row.path).toJSON()}));
const attributed=Object.fromEntries(sources.map(row=>[row.path,structuredClone(row.coverage)]));
const sourceFor=name=>sources.find(row=>row.path.endsWith('/'+name));
const line=(source,fragment)=>{const index=source.source.indexOf(fragment);assert.notEqual(index,-1);return source.source.slice(0,index).split('\n').length;};
function functionIds(source,fragment){const at=line(source,fragment),ids=Object.entries(source.coverage.fnMap).filter(([,site])=>site.decl.start.line===at).map(([id])=>id);assert.ok(ids.length,fragment);return ids;}
function excluded(dispositions,source,id,kind='function'){return dispositions.some(d=>d.path===source.path&&d.kind===kind&&d.id===id);}

test('exact opt-in closures are excluded but guards, common world and acquisition remain applicable',()=>{
 const before=structuredClone(sources),session=sourceFor('session.ts'),recovery=sourceFor('session-recovery.ts');
 for(const mode of['relay','race']){
  const dispositions=turnApplicabilityDispositions({mode,sources});assert.ok(dispositions.length);
  for(const fragment of['static stage(','prepareAdmission(admission:','installCoOpMarket(','private refreshSharedWorldEffects()','constructor(game: Game)','noteProgress(row:'])for(const id of functionIds(session,fragment))assert.equal(excluded(dispositions,session,id),false,fragment);
  for(const id of functionIds(recovery,'recover(session:'))assert.equal(excluded(dispositions,recovery,id),false);
  const guardLine=line(recovery,"if (!owner || session.result || !this.allowed.includes(request.kind))");
  const guards=Object.entries(recovery.coverage.statementMap).filter(([,site])=>site.start.line===guardLine);assert.ok(guards.length);for(const[id]of guards)assert.equal(excluded(dispositions,recovery,id,'statement'),false);
  for(const id of functionIds(session,'constructor(private readonly session: LocalSession'))assert.equal(excluded(dispositions,session,id),mode==='relay');
  const shared=sourceFor('shared-world-effects.ts');for(const id of functionIds(shared,'export function resolveSharedWorldEffects'))assert.equal(excluded(dispositions,shared,id),true);
  for(const key of['src/game.ts','src/market/run.ts','src/relay.ts','src/race.ts'])assert.equal(dispositions.some(d=>d.path.endsWith('/'+key)),false,'no broad '+key+' exclusions');
  const report=reportApplicability({mode,sources,attributed,dispositions});assert.ok(report.applicable.functions.total<report.raw.functions.total);assert.deepEqual(report.dispositions,dispositions);
 }
 assert.deepEqual(sources,before);
});

test('reviewed turn identities fail closed on stale composition, source, missing and duplicate inventory',()=>{
 for(const mode of['relay','race']){
  const input={mode,sources};assert.deepEqual(turnApplicabilityDispositions(input),turnApplicabilityDispositions(input));
  for(const key of Object.keys(TURN_APPLICABILITY_SOURCES)){
   const changed=structuredClone(sources);changed.find(row=>row.path.endsWith('/'+key)).source+='\n';assert.throws(()=>turnApplicabilityDispositions({...input,sources:changed}),/changed/);
  }
  assert.throws(()=>turnApplicabilityDispositions({...input,sources:sources.filter(row=>!row.path.endsWith('/src/relay.ts'))}),/Missing/);
  assert.throws(()=>turnApplicabilityDispositions({...input,sources:[...sources,sourceFor('relay.ts')]}),/Duplicate/);
 }
 assert.throws(()=>turnApplicabilityDispositions({mode:'solo-arcade',sources}),/Turn mode/);
});

test('every excluded counter kind rejects observed positive hits and stale map/schema identities',()=>{
 for(const mode of['relay','race']){
  const dispositions=turnApplicabilityDispositions({mode,sources});
  for(const kind of['statement','function','branch']){
   const d=dispositions.find(d=>d.kind===kind);assert.ok(d,kind);const hits=structuredClone(attributed);
   if(kind==='branch')hits[d.path].b[d.id][d.arm]=1;else hits[d.path][kind==='statement'?'s':'f'][d.id]=1;
   assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);
  }
  const changed=structuredClone(sources);changed.find(row=>row.path.endsWith('/session.ts')).map.file='stale.js';assert.throws(()=>reportApplicability({mode,sources:changed,attributed,dispositions}),/stale/);
  const schema=structuredClone(sources),hits=structuredClone(attributed),s=schema.find(row=>row.path.endsWith('/session.ts'));s.coverage.fnMap['0'].name='changed';hits[s.path].fnMap['0'].name='changed';assert.throws(()=>reportApplicability({mode,sources:schema,attributed:hits,dispositions}),/stale/);
 }
});

test('branch arms crossing a proved range stay applicable and module initialization is retained',()=>{
 const session=sourceFor('session.ts'),start=line(session,'private refreshSharedWorldEffects()');
 const crossing=structuredClone(sources),s=crossing.find(row=>row.path===session.path);
 s.coverage.branchMap['crossing']={type:'cond-expr',line:start,loc:{start:{line:start,column:0},end:{line:start+6,column:0}},locations:[{start:{line:start,column:0},end:{line:start+6,column:0}}]};s.coverage.b.crossing=[0];
 for(const mode of['relay','race']){
  const dispositions=turnApplicabilityDispositions({mode,sources:crossing});assert.equal(dispositions.some(d=>d.id==='crossing'),false);
  const recovery=sourceFor('recovery.ts'),at=line(recovery,'const stable =');
  const allocation=Object.entries(recovery.coverage.statementMap).filter(([,site])=>site.start.line===at&&site.start.column<recovery.source.split('\n')[at-1].indexOf('=>'));
  assert.ok(allocation.length);for(const[id]of allocation)assert.equal(excluded(dispositions,recovery,id,'statement'),false);
 }
});
