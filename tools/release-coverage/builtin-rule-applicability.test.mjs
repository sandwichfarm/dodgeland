import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {instrumentSources,reportCoverage} from './instrument.mjs';
import {reportApplicability} from './applicability.mjs';
import {builtinRuleDispositions} from './builtin-rule-applicability.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname),ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
const audit=JSON.parse(await readFile(join(root,'.planning/phases/07-release-evidence-pr/07-03-PAUSED-MOVEMENT-REFERENCE-AUDIT.json'),'utf8'));
const callers=await Promise.all(Object.keys(audit.sourceHashes).filter(path=>!path.endsWith('.d.ts')).map(async path=>({path,source:await readFile(join(root,path),'utf8')})));
const directory=await mkdtemp(join(tmpdir(),'builtin-rule-scope-'));after(()=>rm(directory,{recursive:true,force:true}));
const text=await readFile(join(root,'src/mode-rules.ts'),'utf8'),inventory=instrumentSources({'src/mode-rules.ts':text},root);
// Synthetic zero schema is only a tool calibration; it supplies no gameplay credit.
const mapped=await reportCoverage(inventory,[Object.fromEntries(Object.values(inventory).map(r=>[r.path,r.zero]))],directory),record=Object.values(inventory)[0];
const source={path:record.path,source:record.source,map:record.map,coverage:mapped.map.fileCoverageFor(record.path).toJSON()},sources=[source],attributed={[source.path]:structuredClone(source.coverage)};
const input={source,closureSources:callers,canonicalSources:callers},modes=['solo-arcade','solo-flow','relay','race'];
const run=(mode,extra={})=>builtinRuleDispositions({...input,mode,...extra});
const has=(rows,kind,id,arm)=>rows.some(d=>d.kind===kind&&d.id===id&&(arm===undefined||d.arm===arm));
const tree=ts.createSourceFile(source.path,text,ts.ScriptTarget.Latest,true),point=o=>{const p=tree.getLineAndCharacterOfPosition(o);return{line:p.line+1,column:p.character};},range=n=>({start:point(n.getStart(tree)),end:point(n.end)}),guards=[];
const visit=n=>{if(ts.isIfStatement(n)&&ts.isExpressionStatement(n.thenStatement)&&ts.isCallExpression(n.thenStatement.expression)&&n.thenStatement.expression.expression.getText(tree)==='fail')guards.push(n);ts.forEachChild(n,visit);};visit(tree);

test('only exact invalid true outcomes and private throw execution are unavailable',()=>{
 assert.equal(guards.length,17);
 for(const mode of modes){
  const rows=run(mode);assert.ok(rows.length);assert.deepEqual(rows,run(mode));
  for(const guard of guards){
   const site=Object.entries(source.coverage.branchMap).find(([,b])=>b.type==='if'&&JSON.stringify(b.loc)===JSON.stringify(range(guard)));assert.ok(site,guard.getText(tree));
   assert.equal(has(rows,'branch',site[0],0),true);assert.equal(has(rows,'branch',site[0],1),false);
   const evaluated=Object.entries(source.coverage.statementMap).filter(([,s])=>JSON.stringify(s)===JSON.stringify(site[1].loc));assert.ok(evaluated.length);for(const[id]of evaluated)assert.equal(has(rows,'statement',id),false);
  }
  const functions=Object.entries(source.coverage.fnMap).filter(([id])=>has(rows,'function',id));assert.equal(functions.length,1);assert.equal(functions[0][1].name,'fail');
  assert.ok(Object.entries(source.coverage.fnMap).filter(([,f])=>f.name!=='fail').every(([id])=>!has(rows,'function',id)));
  for(const[id,b]of Object.entries(source.coverage.branchMap))if(b.type==='default-arg')for(const arm of b.locations.keys())assert.equal(has(rows,'branch',id,arm),false,'default allocation stays counted');
 }
});

test('all added dispositions reject real positive hits, keeping raw counters and numerators',()=>{
 for(const mode of modes){
  const rows=run(mode),base=reportApplicability({mode,sources,attributed,dispositions:[]}),projected=reportApplicability({mode,sources,attributed,dispositions:rows});assert.deepEqual(base.raw,projected.raw);
  for(const metric of ['lines','statements','functions','branches'])assert.equal(base.applicable[metric].covered,projected.applicable[metric].covered);
  for(const d of rows){const hits=structuredClone(attributed);if(d.kind==='branch')hits[d.path].b[d.id][d.arm]=1;else hits[d.path][d.kind==='statement'?'s':'f'][d.id]=1;assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions:rows}),/contradicted/);}
 }
});

test('both complete disk and canonical caller sets fail closed for new, missing, changed and duplicate sources',()=>{
 for(const mode of modes){
  for(const key of ['closureSources','canonicalSources'])for(const value of [undefined,callers.slice(1),[...callers,callers[0]],callers.slice(1).concat(callers[1]),[...callers,{path:'src/new-author.ts',source:'export const author = composeModeDefinition;'}],callers.map(r=>r.path==='src/audio.ts'?{...r,source:r.source+'\n// authoring caller'}:r),callers.map((r,i)=>i===0?{...r,path:'not-src.ts'}:r)])assert.throws(()=>run(mode,{[key]:value}),/caller inventory/);
 }
 assert.throws(()=>run('development'),/stratum/);assert.throws(()=>run('race',{source:undefined}),/required/);assert.throws(()=>run('race',{source:{...source,source:text+'\n'}}),/source changed/);
});

test('unknown malformed empty inverted and crossing branch/statement locations remain applicable',()=>{
 const mode='race',original=run(mode),selected=original.filter(d=>d.kind==='branch');assert.ok(selected.length>=17);
 for(const d of selected)for(const mutate of [b=>{b.type='unknown';},b=>{b.locations.push({start:{},end:{}});},b=>{b.loc.start.column++;},b=>{b.loc.end.line++;},b=>{b.locations[d.arm]={start:{},end:{}};},b=>{b.locations[d.arm].start.extra=true;},b=>{const loc=b.locations[d.arm];loc.end={line:loc.start.line,column:Math.max(0,loc.start.column-1)};},b=>{b.locations[d.arm]={start:{line:1,column:0},end:{line:99999,column:0}};}]){
  const changed=structuredClone(source);mutate(changed.coverage.branchMap[d.id]);assert.equal(has(run(mode,{source:changed}),'branch',d.id,d.arm),false,`${d.id}/${d.arm} must stay counted`);
 }
 const statement=original.find(d=>d.kind==='statement'),changed=structuredClone(source),loc=changed.coverage.statementMap[statement.id];loc.end={line:loc.start.line,column:Math.max(0,loc.start.column-1)};assert.equal(has(run(mode,{source:changed}),'statement',statement.id),false);
});

test('source-map or schema drift cannot reuse emitted identities',()=>{
 const mode='race',rows=run(mode),changed=structuredClone(source);changed.map.file='divergent.js';assert.throws(()=>reportApplicability({mode,sources:[changed],attributed,dispositions:rows}),/stale/);
 const schema=structuredClone(source),hits=structuredClone(attributed);schema.coverage.fnMap['0'].name='different';hits[schema.path].fnMap['0'].name='different';assert.throws(()=>reportApplicability({mode,sources:[schema],attributed:hits,dispositions:rows}),/stale/);
});
