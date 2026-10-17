import test,{after}from'node:test';
import assert from'node:assert/strict';
import{readFile,mkdtemp,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join,resolve}from'node:path';
import{instrumentSources,reportCoverage}from'./instrument.mjs';
import{reportApplicability}from'./applicability.mjs';
import{BROWSER_STRATUM,BROWSER_APPLICABILITY_SOURCES,browserApplicabilityDispositions}from'./browser-applicability.mjs';
const directory=await mkdtemp(join(tmpdir(),'browser-applicability-'));after(()=>rm(directory,{recursive:true,force:true}));
const root=resolve(new URL('../..',import.meta.url).pathname);
const texts=Object.fromEntries(await Promise.all(Object.keys(BROWSER_APPLICABILITY_SOURCES).map(async p=>[p,await readFile(join(root,p),'utf8')])));
const inventory=instrumentSources(texts,root),mapped=await reportCoverage(inventory,[Object.fromEntries(Object.values(inventory).map(row=>[row.path,row.zero]))],directory);
// Synthetic zero schema only; no browser behavior or hit credit is claimed.
const sources=Object.values(inventory).map(row=>({path:row.path,source:row.source,map:row.map,coverage:mapped.map.fileCoverageFor(row.path).toJSON()})),attributed=Object.fromEntries(sources.map(row=>[row.path,structuredClone(row.coverage)]));
const gamepad=sources.find(row=>row.path.endsWith('/gamepad.ts')),mode=BROWSER_STRATUM;
const line=fragment=>{const offset=gamepad.source.indexOf(fragment);assert.ok(offset>=0);return gamepad.source.slice(0,offset).split('\n').length;};
const functionIds=fragment=>{const at=line(fragment),ids=Object.entries(gamepad.coverage.fnMap).filter(([,site])=>site.decl.start.line===at).map(([id])=>id);assert.ok(ids.length,fragment);return ids;};
test('browser projection excludes only legacy instance/private helpers and retains factory/transport/parser',()=>{
 const before=structuredClone(sources),dispositions=browserApplicabilityDispositions({mode,sources}),excluded=new Set(dispositions.filter(d=>d.kind==='function').map(d=>d.id));
 for(const fragment of['function pressed(','function directionOf(','constructor(private readonly actions','receive(state: GamepadState','private seed():'])for(const id of functionIds(fragment))assert.ok(excluded.has(id),fragment);
 for(const fragment of['function record(','function inRange(','export function parseGamepadState(','export function createGamepadControls(','const receive = (raw:','const message = (event:','const close = ():'])for(const id of functionIds(fragment))assert.equal(excluded.has(id),false,fragment);
 assert.ok(dispositions.every(d=>d.path===gamepad.path));
 const factoryLine=line('const input = onSnapshot');for(const[id,site]of Object.entries(gamepad.coverage.statementMap))if(site.start.line===factoryLine)assert.equal(dispositions.some(d=>d.kind==='statement'&&d.id===id),false);
 const report=reportApplicability({mode,sources,attributed,dispositions});assert.ok(report.applicable.functions.total<report.raw.functions.total);assert.deepEqual(sources,before);
 // The same actual compatibility sites remain accountable in other strata.
 const d=dispositions.find(d=>d.kind==='function'),hits=structuredClone(attributed);hits[d.path].f[d.id]=1;
 assert.equal(reportApplicability({mode:'relay',sources,attributed:hits,dispositions:[]}).applicable.functions.covered,1);
});
test('browser source pins and exact stratum fail closed',()=>{
 assert.deepEqual(browserApplicabilityDispositions({mode,sources}),browserApplicabilityDispositions({mode,sources}));
 for(const wrong of['relay','race','development','shared-input'])assert.throws(()=>browserApplicabilityDispositions({mode:wrong,sources}),/Exact browser/);
 for(const s of sources){const changed=structuredClone(sources);changed.find(row=>row.path===s.path).source+='\n';assert.throws(()=>browserApplicabilityDispositions({mode,sources:changed}),/changed/);}
 assert.throws(()=>browserApplicabilityDispositions({mode,sources:sources.slice(1)}),/Missing/);assert.throws(()=>browserApplicabilityDispositions({mode,sources:[...sources,sources[0]]}),/Duplicate/);
});
test('excluded positive hits and stale source maps/schema cannot be hidden',()=>{
 const dispositions=browserApplicabilityDispositions({mode,sources});
 for(const kind of['statement','function','branch']){const d=dispositions.find(d=>d.kind===kind);assert.ok(d);const hits=structuredClone(attributed);if(kind==='branch')hits[d.path].b[d.id][d.arm]=1;else hits[d.path][kind==='statement'?'s':'f'][d.id]=1;assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);}
 const changed=structuredClone(sources);changed.find(s=>s.path===gamepad.path).map.file='stale.js';assert.throws(()=>reportApplicability({mode,sources:changed,attributed,dispositions}),/stale/);
 const schema=structuredClone(sources),hits=structuredClone(attributed),s=schema.find(s=>s.path===gamepad.path);s.coverage.fnMap['0'].name='changed';hits[s.path].fnMap['0'].name='changed';assert.throws(()=>reportApplicability({mode,sources:schema,attributed:hits,dispositions}),/stale/);
});
test('crossing branch spans and exported module constant allocations remain applicable',()=>{
 const changed=structuredClone(sources),s=changed.find(s=>s.path===gamepad.path),start=line('function directionOf('),end=line('export interface GamepadControls');
 s.coverage.branchMap.crossing={type:'cond-expr',line:start,loc:{start:{line:start,column:0},end:{line:end,column:0}},locations:[{start:{line:start,column:0},end:{line:end,column:0}}]};s.coverage.b.crossing=[0];
 const dispositions=browserApplicabilityDispositions({mode,sources:changed});assert.equal(dispositions.some(d=>d.id==='crossing'),false);
 for(const name of['GAMEPAD_DEADZONE','GAMEPAD_RELEASE_ZONE','GAMEPAD_REPEAT_DELAY','GAMEPAD_REPEAT_INTERVAL']){const at=line('export const '+name),sites=Object.entries(gamepad.coverage.statementMap).filter(([,site])=>site.start.line===at);assert.ok(sites.length);for(const[id]of sites)assert.equal(dispositions.some(d=>d.kind==='statement'&&d.id===id),false);}
});
