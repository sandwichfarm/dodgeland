import { createRequire } from 'node:module';
import { applicabilityIdentity } from './applicability.mjs';
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
// Deliberately reviewed pins: never regenerate automatically when production changes.
export const TURN_APPLICABILITY_SOURCES=Object.freeze({
 'src/relay.ts':'f5c1eea5b82e6e42d7b6bbc6a95f7f0d28aa7ad7468c4464e0217ab9f89e6c02',
 'src/race.ts':'d2ecf7bbc185520fdad9b441c52775297b4929f455e665e38caabebebacb62da',
 'src/session.ts':'5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed',
 'src/session-recovery.ts':'35119abd8ac6551d253ec0ada320c934fd5a9cf20c142444e3afdb4094093b9c',
 'src/recovery.ts':'835df7ab867c3421e7d295778c864ceba83f0ea10e588c4c6f4d95cdc2c1702b',
 'src/shared-world-effects.ts':'715dce9a98a83c398aa3a3d43531568008a9cefaa9be8df766a921dd2eb43a45',
});
const authority='.planning/phases/07-release-evidence-pr/07-03-TURN-SCOPE-FINDINGS.md';
const before=(a,b)=>a.line<b.line||a.line===b.line&&a.column<=b.column;
const contains=(a,b)=>b?.start&&b?.end&&before(a.start,b.start)&&before(b.end,a.end);
export function turnApplicabilityDispositions({mode,sources}){
 if(!['relay','race'].includes(mode))throw Error('Turn mode required');
 if(!Array.isArray(sources))throw Error('Source inventory required');
 const selected=new Map();
 for(const source of sources){const path=source.path.replaceAll('\\','/'),key=Object.keys(TURN_APPLICABILITY_SOURCES).find(k=>path===k||path.endsWith('/'+k));if(!key)continue;if(selected.has(key))throw Error('Duplicate reviewed source');const identity=applicabilityIdentity(source);if(identity.sourceHash!==TURN_APPLICABILITY_SOURCES[key])throw Error('Reviewed turn source changed: '+key);selected.set(key,{source,identity});}
 if(selected.size!==Object.keys(TURN_APPLICABILITY_SOURCES).length)throw Error('Missing reviewed turn source');
 const output=[];
 for(const[key,{source,identity}]of selected){
  const tree=ts.createSourceFile(key,source.source,ts.ScriptTarget.Latest,true);if(tree.parseDiagnostics.length)throw Error('Invalid reviewed source');
  const point=o=>{const p=tree.getLineAndCharacterOfPosition(o);return{line:p.line+1,column:p.character};};
  const span=n=>({start:point(n.getStart(tree)),end:point(n.end)}),ranges=[],functions=[];
  const add=(node,reason,onlyFunction=false)=>(onlyFunction?functions:ranges).push({span:span(node),reason});
  const all=[];function walk(n){all.push(n);ts.forEachChild(n,walk);}walk(tree);
  const member=(owner,name)=>{const c=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===owner),m=c?.members.find(n=>n.name?.getText(tree)===name);if(!m?.body)throw Error('Reviewed member absent: '+owner+'.'+name);return m;};
  const personal='Both pinned coordinators construct the default personal-only SessionRecoveryController; recover rejects other kinds before planning. No independent generic planner execution is attributed to these modes.';
  const shared='Only Survive attaches shared-effect policy; pinned Relay/Race attachments do not. refreshSharedWorldEffects returns before resolver execution.';
  if(key==='src/session.ts'){
   if(mode==='relay'){
    const c=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='ConsumableWorld');if(!c)throw Error('ConsumableWorld absent');
    for(const m of c.members)if(m.body||m.initializer)add(m,'Relay attachment installs market with consumables:false and never installs private ConsumableWorld; no instance exists in this composition.');
   }
   const refresh=member('LocalSession','refreshSharedWorldEffects');
   if(refresh.body.statements[0].getText(tree)!=='if (!this.sharedEffectPolicy) return;')throw Error('Shared-effect guard changed');
   for(const statement of [...refresh.body.statements].slice(1))add(statement,shared);
  }
  if(key==='src/shared-world-effects.ts'){
   const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='resolveSharedWorldEffects');if(!fn?.body)throw Error('Shared resolver absent');add(fn.body,shared);add(fn,shared,true);
  }
  if(key==='src/session-recovery.ts'){
   const recover=member('SessionRecoveryController','recover');
   for(const n of all.filter(n=>n.pos>=recover.pos&&n.end<=recover.end)){
    if(ts.isConditionalExpression(n)){
     const condition=n.condition.getText(tree);
     if(condition==="request.kind === 'personal'")add(n.whenFalse,personal);
     if(condition==="request.kind === 'flare'")add(n.whenTrue,personal);
    }
   }
   const apply=member('SessionRecoveryController','apply');
   for(const n of all.filter(n=>n.pos>=apply.pos&&n.end<=apply.end))if(ts.isIfStatement(n)&&n.expression.getText(tree)==="kind === 'personal'"&&n.elseStatement)add(n.elseStatement,personal);
  }
  if(key==='src/recovery.ts'){
   const stable=all.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(tree)==='stable');if(!stable?.initializer||!ts.isArrowFunction(stable.initializer))throw Error('Reviewed stable helper absent');add(stable.initializer.body,personal);add(stable.initializer,personal,true);
   const plan=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='planRecovery');if(!plan)throw Error('Recovery planner absent');
   for(const n of all.filter(n=>n.pos>=plan.pos&&n.end<=plan.end)){
    if(ts.isConditionalExpression(n)&&n.condition.getText(tree)==="request.kind === 'personal'")add(n.whenFalse,personal);
    if(ts.isIfStatement(n)&&n.expression.getText(tree)==="request.kind === 'personal'"&&n.elseStatement)add(n.elseStatement,personal);
    if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken&&n.left.getText(tree)==="request.kind === 'flare'")add(n.right,personal);
   }
  }
  const eligible=site=>ranges.find(r=>contains(r.span,site));
  const emit=(kind,id,arm,rule)=>output.push({mode,path:source.path,...identity,kind,id,...(arm===undefined?{}:{arm}),callReason:rule.reason,stateReason:'Exact unchanged Relay/Race composition across actual acquisition, play, pause and terminal intervals; both Arcade and Flow remain applicable. Module initialization, guards and crossing spans remain in scope.',authority});
  for(const[id,site]of Object.entries(source.coverage.statementMap)){const r=eligible(site);if(r)emit('statement',id,undefined,r);}
  for(const[id,site]of Object.entries(source.coverage.fnMap)){const r=[...ranges,...functions].find(r=>contains(r.span,site.loc)&&contains(r.span,site.decl));if(r)emit('function',id,undefined,r);}
  for(const[id,site]of Object.entries(source.coverage.branchMap))for(const[arm,loc]of site.locations.entries()){const r=eligible(loc);if(r)emit('branch',id,arm,r);}
 }
 return output;
}
