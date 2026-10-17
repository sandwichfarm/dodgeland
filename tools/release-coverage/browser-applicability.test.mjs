import test,{after}from'node:test';
import assert from'node:assert/strict';
import{readFile,mkdtemp,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join,resolve}from'node:path';
import{instrumentSources,reportCoverage}from'./instrument.mjs';
import{reportApplicability}from'./applicability.mjs';
import{applicationUnusedApplicabilityDispositions}from'./application-unused-applicability.mjs';
import{BROWSER_STRATUM,BROWSER_APPLICABILITY_SOURCES,browserApplicabilityDispositions as generateBrowserDispositions}from'./browser-applicability.mjs';
const directory=await mkdtemp(join(tmpdir(),'browser-applicability-'));after(()=>rm(directory,{recursive:true,force:true}));
const root=resolve(new URL('../..',import.meta.url).pathname);
const callerAudit=JSON.parse(await readFile(join(root,'.planning/phases/07-release-evidence-pr/07-03-PAUSED-MOVEMENT-REFERENCE-AUDIT.json'),'utf8'));
const callers=await Promise.all(Object.keys(callerAudit.sourceHashes).filter(path=>!path.endsWith('.d.ts')).map(async path=>({path,source:await readFile(join(root,path),'utf8')})));
const configSources=await Promise.all(['index.html','vite.config.ts','tsconfig.json'].map(async path=>({path,source:await readFile(join(root,path),'utf8')})));
const browserApplicabilityDispositions=input=>generateBrowserDispositions({closureSources:callers,canonicalSources:callers,configSources,...input});
const texts=Object.fromEntries(await Promise.all([...new Set([...Object.keys(BROWSER_APPLICABILITY_SOURCES),'src/mode-rules.ts','src/game.ts','src/session.ts','src/consumable-drops.ts'])].map(async p=>[p,await readFile(join(root,p),'utf8')])));
const inventory=instrumentSources(texts,root),mapped=await reportCoverage(inventory,[Object.fromEntries(Object.values(inventory).map(row=>[row.path,row.zero]))],directory);
// Synthetic zero schema only; no browser behavior or hit credit is claimed.
const sources=Object.values(inventory).map(row=>({path:row.path,source:row.source,map:row.map,coverage:mapped.map.fileCoverageFor(row.path).toJSON()})),attributed=Object.fromEntries(sources.map(row=>[row.path,structuredClone(row.coverage)]));
const gamepad=sources.find(row=>row.path.endsWith('/gamepad.ts')),mode=BROWSER_STRATUM;
const line=fragment=>{const offset=gamepad.source.indexOf(fragment);assert.ok(offset>=0);return gamepad.source.slice(0,offset).split('\n').length;};
const functionIds=fragment=>{const at=line(fragment),ids=Object.entries(gamepad.coverage.fnMap).filter(([,site])=>site.decl.start.line===at).map(([id])=>id);assert.ok(ids.length,fragment);return ids;};
test('browser projection excludes only legacy instance/private helpers and retains factory/transport/parser',()=>{
 const before=structuredClone(sources),dispositions=browserApplicabilityDispositions({mode,sources}),excluded=new Set(dispositions.filter(d=>d.path===gamepad.path&&d.kind==='function').map(d=>d.id));
 for(const fragment of['function pressed(','function directionOf(','constructor(private readonly actions','receive(state: GamepadState','private seed():'])for(const id of functionIds(fragment))assert.ok(excluded.has(id),fragment);
 for(const fragment of['function record(','function inRange(','export function parseGamepadState(','export function createGamepadControls(','const receive = (raw:','const message = (event:','const close = ():'])for(const id of functionIds(fragment))assert.equal(excluded.has(id),false,fragment);
 assert.ok(dispositions.every(d=>d.path===gamepad.path||['mode-rules.ts','game.ts','session.ts','consumable-drops.ts'].some(name=>d.path.endsWith('/'+name))));
 const factoryLine=line('const input = onSnapshot');for(const[id,site]of Object.entries(gamepad.coverage.statementMap))if(site.start.line===factoryLine)assert.equal(dispositions.some(d=>d.path===gamepad.path&&d.kind==='statement'&&d.id===id),false);
 const report=reportApplicability({mode,sources,attributed,dispositions});assert.ok(report.applicable.functions.total<report.raw.functions.total);assert.deepEqual(sources,before);
 // The same actual compatibility sites remain accountable in other strata.
 const d=dispositions.find(d=>d.kind==='function'),hits=structuredClone(attributed);hits[d.path].f[d.id]=1;
 assert.equal(reportApplicability({mode:'relay',sources,attributed:hits,dispositions:[]}).applicable.functions.covered,1);
});
test('browser source pins and exact stratum fail closed',()=>{
 assert.deepEqual(browserApplicabilityDispositions({mode,sources}),browserApplicabilityDispositions({mode,sources}));
 for(const wrong of['relay','race','development','shared-input'])assert.throws(()=>browserApplicabilityDispositions({mode:wrong,sources}),/Exact browser/);
 for(const s of sources){const changed=structuredClone(sources);changed.find(row=>row.path===s.path).source+='\n';assert.throws(()=>browserApplicabilityDispositions({mode,sources:changed}),/changed|differs/);}
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
 for(const name of['GAMEPAD_DEADZONE','GAMEPAD_RELEASE_ZONE','GAMEPAD_REPEAT_DELAY','GAMEPAD_REPEAT_INTERVAL']){const at=line('export const '+name),sites=Object.entries(gamepad.coverage.statementMap).filter(([,site])=>site.start.line===at);assert.ok(sites.length);for(const[id]of sites)assert.equal(dispositions.some(d=>d.path===gamepad.path&&d.kind==='statement'&&d.id===id),false);}
});

test('browser built-in failures require complete independent callers and reject all positive excluded sites',()=>{
 const rules=sources.find(s=>s.path.endsWith('/mode-rules.ts')),dispositions=browserApplicabilityDispositions({mode,sources});
 assert.throws(()=>browserApplicabilityDispositions({mode,sources,configSources:undefined}),/config/);
 const selected=dispositions.filter(d=>d.path===rules.path);assert.ok(selected.length>20);
 assert.ok(selected.every(d=>d.authority.endsWith('07-03-APP-BUILTIN-RULE-CLOSURE.md')));
 for(const[id,fn]of Object.entries(rules.coverage.fnMap))assert.equal(selected.some(d=>d.kind==='function'&&d.id===id),fn.name==='fail');
 for(const d of selected){const hits=structuredClone(attributed);if(d.kind==='branch')hits[d.path].b[d.id][d.arm]=1;else hits[d.path][d.kind==='statement'?'s':'f'][d.id]=1;assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);}
 for(const key of ['closureSources','canonicalSources'])for(const value of [undefined,callers.slice(1),[...callers,callers[0]],callers.map(s=>s.path==='src/audio.ts'?{...s,source:s.source+'\n// new authoring caller'}:s)])assert.throws(()=>browserApplicabilityDispositions({mode,sources,[key]:value}),/caller inventory/);
});


test('browser excludes only the ten source-proved API bodies and rejects all positive excluded hits',()=>{
 const dispositions=browserApplicabilityDispositions({mode,sources});
 const selected=dispositions.filter(d=>d.authority.endsWith('07-03-APP-UNUSED-CLOSURE.md'));
 assert.deepEqual(Object.fromEntries(['statement','function','branch'].map(kind=>[kind,selected.filter(d=>d.kind===kind).length])),{statement:25,function:15,branch:29});
 assert.ok(selected.every(d=>d.mode===mode&&d.stateReason.includes('Production browser')));
 for(const d of selected){const hits=structuredClone(attributed);if(d.kind==='branch')hits[d.path].b[d.id][d.arm]=1;else hits[d.path][d.kind==='statement'?'s':'f'][d.id]=1;assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);}
 for(const [suffix,fragments]of [
  ['game.ts',['export function laneActors(','export function coinPosition(','syncSharedWorldEffects():']],
  ['session.ts',['releaseInactivePickupClaims(','dispatch(action:']],
  ['consumable-drops.ts',['export function sampleItemDrop(','export function validateConsumableSchema(']],
 ]){const source=sources.find(s=>s.path.endsWith('/'+suffix));for(const fragment of fragments){const offset=source.source.indexOf(fragment);assert.ok(offset>=0,fragment);const at=source.source.slice(0,offset).split('\n').length;const matches=Object.entries(source.coverage.fnMap).filter(([,fn])=>fn.decl.start.line===at);assert.ok(matches.length,fragment);for(const[id]of matches)assert.equal(selected.some(d=>d.path===source.path&&d.kind==='function'&&d.id===id),false,fragment);}}
 const report=reportApplicability({mode,sources,attributed,dispositions});assert.equal(report.raw.branches.covered,0);assert.equal(report.applicable.branches.covered,0);
 const removed=sources.filter(s=>!s.path.endsWith('/consumable-drops.ts'));assert.throws(()=>browserApplicabilityDispositions({mode,sources:removed}),/Missing/);
});


test('shared unused-body browser projection independently requires complete compiled authority',()=>{
 const input={mode,sources,authoritySources:callers,canonicalSources:callers,configSources};
 const selected=applicationUnusedApplicabilityDispositions(input);assert.equal(selected.length,69);
 for(const value of [undefined,callers.slice(1),[...callers,callers[0]],callers.map(s=>s.path==='src/audio.ts'?{...s,source:s.source+'\n// unrelated new caller'}:s)])assert.throws(()=>applicationUnusedApplicabilityDispositions({...input,canonicalSources:value}),/canonical caller inventory/);
 for(const wrong of ['relay','race','shared-input'])assert.throws(()=>applicationUnusedApplicabilityDispositions({...input,mode:wrong}),/Exact application/);
});
