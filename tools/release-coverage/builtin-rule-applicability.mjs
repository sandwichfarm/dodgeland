import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {applicabilityIdentity} from './applicability.mjs';
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
const callerDigest='9ef7fa9ebc20c98c6d807c10529ddd36365a47d533614c41d46470d2463a7eef';
const sourceHash='cadda595a1cfa02769eee70e3f925b125b14c7fdf6faf93b9a83f45bb79c89f2';
const authority='.planning/phases/07-release-evidence-pr/07-03-BUILTIN-RULE-CLOSURE.md';
const hash=value=>createHash('sha256').update(value).digest('hex');
function checkCallers(rows){
 if(!Array.isArray(rows)||rows.length!==158)throw Error('Complete built-in caller inventory required');
 const values=rows.map(row=>{if(typeof row?.path!=='string'||typeof row.source!=='string')throw Error('Invalid built-in caller inventory');const match=row.path.replaceAll('\\','/').match(/(?:^|\/)src\/(.+\.(?:ts|tsx|js|mjs))$/);if(!match||row.path.endsWith('.d.ts'))throw Error('Invalid built-in caller inventory');return ['src/'+match[1],hash(row.source)];}).sort(([a],[b])=>a<b?-1:a>b?1:0);
 if(new Set(values.map(([path])=>path)).size!==158||hash(JSON.stringify(values))!==callerDigest)throw Error('Reviewed built-in caller inventory changed');
}
const point=p=>p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).length===2&&Number.isSafeInteger(p.line)&&p.line>0&&Number.isSafeInteger(p.column)&&p.column>=0;
const span=s=>s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).length===2&&point(s.start)&&point(s.end);
const before=(a,b)=>a.line<b.line||a.line===b.line&&a.column<=b.column;
const contains=(a,b)=>span(a)&&span(b)&&before(b.start,b.end)&&before(a.start,b.start)&&before(b.end,a.end);
const same=(a,b)=>span(a)&&span(b)&&a.start.line===b.start.line&&a.start.column===b.start.column&&a.end.line===b.end.line&&a.end.column===b.end.column;
/** Exact failure-path dispositions for the two source-pinned built-in composers. */
export function builtinRuleDispositions({mode,source,closureSources,canonicalSources}){
 if(!['solo-arcade','solo-flow','relay','race'].includes(mode))throw Error('Built-in mode stratum required');
 checkCallers(closureSources);checkCallers(canonicalSources);
 if(typeof source?.path!=='string'||!/(?:^|\/)src\/mode-rules\.ts$/.test(source.path.replaceAll('\\','/')))throw Error('Mapped mode-rules source required');
 const identity=applicabilityIdentity(source);if(identity.sourceHash!==sourceHash)throw Error('Reviewed built-in rule source changed');
 const tree=ts.createSourceFile(source.path,source.source,ts.ScriptTarget.Latest,true);if(tree.parseDiagnostics.length)throw Error('Invalid built-in rule source');
 const pos=n=>{const p=tree.getLineAndCharacterOfPosition(n);return {line:p.line+1,column:p.character};},range=n=>({start:pos(n.getStart(tree)),end:pos(n.end)});
 const fail=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='fail');if(!fail?.body)throw Error('Reviewed fail helper absent');
 const guards=[],conditionals=[],ranges=[range(fail.body)];
 const visit=n=>{if(ts.isIfStatement(n)&&!n.elseStatement&&ts.isExpressionStatement(n.thenStatement)&&ts.isCallExpression(n.thenStatement.expression)&&ts.isIdentifier(n.thenStatement.expression.expression)&&n.thenStatement.expression.expression.text==='fail'){guards.push(n);ranges.push(range(n.thenStatement));}if(ts.isConditionalExpression(n))conditionals.push(n);ts.forEachChild(n,visit);};visit(tree);
 if(guards.length!==17)throw Error('Reviewed built-in validation guards changed');
 const output=[],eligible=site=>ranges.some(r=>contains(r,site));
 const emit=(kind,id,arm)=>output.push({mode,path:source.path,...identity,kind,id,...(arm===undefined?{}:{arm}),callReason:'Complete pinned caller inventory has exactly two fixed valid built-in composer calls. This exact authoring failure execution cannot run; successful validation and module initialization remain applicable.',stateReason:'Actual canonical built-in definition/rules are independently observed at acquisition/endpoints. No invalid custom-mode authoring or whole mixed-worker credit belongs to this stratum.',authority});
 for(const[id,site]of Object.entries(source.coverage.statementMap))if(eligible(site))emit('statement',id);
 for(const[id,site]of Object.entries(source.coverage.fnMap))if(contains(range(fail),site.loc)&&contains(range(fail),site.decl))emit('function',id);
 for(const[id,site]of Object.entries(source.coverage.branchMap)){
  if(!['if','cond-expr'].includes(site.type)||!Array.isArray(site.locations)||site.locations.length!==2)continue;
  for(const[arm,loc]of site.locations.entries()){
   const guard=arm===0&&site.type==='if'&&site.locations.length===2&&guards.some(n=>same(range(n),site.loc)&&(same(loc,site.loc)||same(loc,range(n.thenStatement))));
   const failureArgument=site.type==='cond-expr'&&conditionals.some(n=>same(range(n),site.loc)&&eligible(range(n))&&same(loc,range(arm===0?n.whenTrue:n.whenFalse)));
   if(guard||failureArgument)emit('branch',id,arm);
  }
 }
 return output;
}
