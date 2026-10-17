import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { applicabilityIdentity } from './applicability.mjs';
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
export const DEVELOPMENT_STRATUM='development';
// Exact two-file transition reviewed in 07-03-RELAY-EFFECTS-CLOSURE.md.
export const DEVELOPMENT_AUTHORITY_DIGEST='cde4b39081b7ec1d6878fb50adbd2b7f40c59d10afb4ec595530fda1553fca1c';
export const DEVELOPMENT_CONFIG_PINS=Object.freeze({
 'index.html':'cb9773abc32939bdf61664b7e850eb044aa3f37aef79f61d50e9b69346ce7c0b',
 'vite.config.ts':'cc82c2ed6058718e3fe09ff1e6b55f8504b14bd60ebf59ef3a4488da510b5e30',
 'tsconfig.json':'b58c33dad9bf85858576fa3cf6fd491a57f472d712813ee6211f59856eb0acc4',
});
const candidates={
 'src/game.ts':[['','worldForRow'],['','actorPositions'],['Game','syncSharedEffects']],
 'src/session.ts':[['SharedWorld','selectMobTarget'],['SharedWorld','view'],['LocalSession','sharedWorldEffectsSnapshot']],
 'src/consumable-drops.ts':[['','classifyConsumableBucket'],['','consumablePickupId'],['','classifyItemBucket'],['','sampleConsumableDrop']],
};
const authority='.planning/phases/07-release-evidence-pr/07-03-DEVELOPMENT-APP-CLOSURE-PROOF.md';
const sha=value=>createHash('sha256').update(value).digest('hex');
const valid=p=>Number.isSafeInteger(p?.line)&&p.line>0&&Number.isSafeInteger(p?.column)&&p.column>=0;
const before=(a,b)=>a.line<b.line||a.line===b.line&&a.column<=b.column;
const contains=(a,b)=>valid(b?.start)&&valid(b?.end)&&before(b.start,b.end)&&before(a.start,b.start)&&before(b.end,a.end);
/** Pure source-bound dispositions. Caller must separately establish genuine DEV app provenance. */
export function developmentApplicabilityDispositions({mode,sources,authoritySources,configSources}){
 if(mode!==DEVELOPMENT_STRATUM)throw Error('Exact development application stratum required');
 if(!Array.isArray(authoritySources)||authoritySources.length!==158)throw Error('Complete reviewed development authority required');
 const entries=authoritySources.map(s=>{if(!/^src\/.+\.(ts|tsx|js|mjs)$/.test(s.path)||s.path.endsWith('.d.ts')||typeof s.source!=='string')throw Error('Invalid development authority');return{path:s.path,sha256:sha(s.source)};}).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(new Set(entries.map(e=>e.path)).size!==158||sha(JSON.stringify(entries))!==DEVELOPMENT_AUTHORITY_DIGEST)throw Error('Reviewed development caller inventory changed');
 if(!Array.isArray(configSources)||configSources.length!==3)throw Error('Development config authority required');
 for(const[path,pin]of Object.entries(DEVELOPMENT_CONFIG_PINS)){const found=configSources.filter(s=>s.path===path);if(found.length!==1||sha(found[0].source)!==pin)throw Error('Reviewed development config changed: '+path);}
 if(!Array.isArray(sources))throw Error('Mapped development sources required');
 const selected=new Map();
 for(const source of sources){const key=Object.keys(candidates).find(p=>source.path===p||source.path.endsWith('/'+p));if(!key)continue;if(selected.has(key))throw Error('Duplicate development candidate source');const identity=applicabilityIdentity(source);if(identity.sourceHash!==entries.find(e=>e.path===key)?.sha256)throw Error('Development mapped source differs from authority');selected.set(key,{source,identity});}
 if(selected.size!==3)throw Error('Missing development candidate source');
 const output=[];
 for(const[key,{source,identity}]of selected){
  const tree=ts.createSourceFile(key,source.source,ts.ScriptTarget.Latest,true);if(tree.parseDiagnostics.length)throw Error('Invalid development source');
  const point=o=>{const p=tree.getLineAndCharacterOfPosition(o);return{line:p.line+1,column:p.character};};
  const span=n=>({start:point(n.getStart(tree)),end:point(n.end)}),ranges=[];
  for(const[owner,name]of candidates[key]){
   const container=owner?tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===owner):tree;
   const fn=(owner?container?.members:tree.statements)?.find(n=>(owner?ts.isMethodDeclaration(n):ts.isFunctionDeclaration(n))&&n.name?.getText(tree)===name);
   if(!fn?.body)throw Error('Reviewed development callable absent: '+owner+'.'+name);
   ranges.push({body:span(fn.body),callable:span(fn),name:span(fn.name),symbol:[owner,name].filter(Boolean).join('.')});
  }
  const ifs=[];function walk(n){if(ts.isIfStatement(n))ifs.push(n);ts.forEachChild(n,walk);}walk(tree);
  const emit=(kind,id,r,arm)=>output.push({mode,path:source.path,...identity,kind,id,...(arm===undefined?{}:{arm}),callReason:`${r.symbol}: complete pinned158-module DEV import/reference closure has no caller, extraction, alias or import-time invocation.`,stateReason:'Actual verified built DEV application only; declaration allocation, module initialization, shared validators and actual frame routes remain applicable. Direct API evidence remains globally accountable.',authority});
  for(const[id,loc]of Object.entries(source.coverage.statementMap)){const r=ranges.find(r=>contains(r.body,loc));if(r)emit('statement',id,r);}
  for(const[id,site]of Object.entries(source.coverage.fnMap)){
   const r=ranges.find(r=>contains(r.body,site.loc)&&contains(r.body,site.decl)
    // Source-map loc may begin in an erased return annotation. Bind the
    // root function to its exact AST name and full ending body; never widen
    // statement/branch/default-parameter exclusions to the signature.
    ||contains(r.callable,site.loc)&&contains(r.name,site.decl)&&contains(site.decl,r.name)&&before(r.name.end,site.loc.start)&&site.loc.end.line===r.body.end.line&&site.loc.end.column===r.body.end.column);
   if(r)emit('function',id,r);
  }
  for(const[id,site]of Object.entries(source.coverage.branchMap)){
   if(!['if','cond-expr','binary-expr','default-arg','switch'].includes(site.type)||!Array.isArray(site.locations))continue;
   const r=ranges.find(r=>contains(r.body,site.loc));if(!r)continue;
   for(const[arm,loc]of site.locations.entries()){
    if(!contains(r.body,loc))continue;
    if(site.type==='if'&&arm===1){const node=ifs.find(n=>{const s=span(n);return s.start.line===site.loc.start.line&&s.start.column===site.loc.start.column;});if(!node?.elseStatement)continue;}
    emit('branch',id,r,arm);
   }
  }
 }
 return output;
}
