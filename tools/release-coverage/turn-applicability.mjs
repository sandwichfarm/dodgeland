import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { applicabilityIdentity } from './applicability.mjs';
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
// Deliberately reviewed pins: never regenerate automatically when production changes.
export const TURN_APPLICABILITY_SOURCES=Object.freeze({
 'src/relay.ts':'f5c1eea5b82e6e42d7b6bbc6a95f7f0d28aa7ad7468c4464e0217ab9f89e6c02',
 'src/race.ts':'d2ecf7bbc185520fdad9b441c52775297b4929f455e665e38caabebebacb62da',
 'src/session.ts':'f8ce62cdc5c87557636cce62f0b15005bfa5f9cde42c708d67915b4c1ebcec39',
 'src/session-recovery.ts':'35119abd8ac6551d253ec0ada320c934fd5a9cf20c142444e3afdb4094093b9c',
 'src/recovery.ts':'835df7ab867c3421e7d295778c864ceba83f0ea10e588c4c6f4d95cdc2c1702b',
 'src/shared-world-effects.ts':'715dce9a98a83c398aa3a3d43531568008a9cefaa9be8df766a921dd2eb43a45',
 'src/game.ts':'fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6',
 'src/market/run.ts':'ba755b3573ca4acaf2a11ce7b77c277df526a16b2801cca612ee55feee36de6f',
 'src/consumable-drops.ts':'2fc4a1c55dc7f37dbcac2b7091661e3a284d3292eddf1460da423a39520dec4a',
});
export const TURN_AUTHORITY_PINS=Object.freeze({
 'src/main.ts':'33be7291c0e3c14910039fdb8a1d44e895273f79e132f9a0c9873b3d3166add4',
 'src/render.ts':'b6b5ae2ff1a4af8e3f6a0bf2c96bfcc3e83b11e95e38892ccaa6f33f3c2122c2',
 'src/survive-together.ts':'dbc77f00e9c37ee845920c3b63da30f8f661582e37da4f30bb2d2f72c3c4b69b',
 'src/race-items.ts':'2a43c05772c1f641595ca9bee7cc2bb486e3b2a922ebab412fc65e189708432b',
 'src/co-op-market.ts':'037a96c9f9436346f06306cac74808aab5e92e205ce2c42bebb1dbd16ca24c22',
 'src/market/types.ts':'d1e216d95749be95069851fe36b38009e9b86e86931fd4590330f794b2b4bb4c',
 'src/levels/v1.ts':'2528a12bdc80d8da5579dccf04cd64509a2ceeb7f3ff229b9cb970207c4f5c56',
});
const authority='.planning/phases/07-release-evidence-pr/07-03-TURN-SCOPE-FINDINGS.md';
const closureAuthority='.planning/phases/07-release-evidence-pr/07-03-TURN-CALL-CLOSURE-REVIEW.md';
const before=(a,b)=>a.line<b.line||a.line===b.line&&a.column<=b.column;
const contains=(a,b)=>b?.start&&b?.end&&before(a.start,b.start)&&before(b.end,a.end);
export function turnApplicabilityDispositions({mode,sources,authoritySources}){
 if(!['relay','race'].includes(mode))throw Error('Turn mode required');
 if(!Array.isArray(sources))throw Error('Source inventory required');
 if(!Array.isArray(authoritySources))throw Error('Missing turn caller authority');
 for(const[path,pin]of Object.entries(TURN_AUTHORITY_PINS)){
  const rows=authoritySources.filter(s=>s.path.replaceAll('\\','/')===path||s.path.replaceAll('\\','/').endsWith('/'+path));
  if(rows.length!==1)throw Error('Missing or duplicate turn caller authority: '+path);
  if(createHash('sha256').update(rows[0].source).digest('hex')!==pin)throw Error('Reviewed turn caller authority changed: '+path);
 }
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
  const callable=(name,reason)=>{
   const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name),variable=all.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(tree)===name);
   const node=fn??variable?.initializer;if(!node||!(ts.isFunctionDeclaration(node)||ts.isArrowFunction(node))||!node.body)throw Error('Reviewed callable absent: '+name);
   add(node.body,reason);add(node,reason,true);
  };
  const personal='Both pinned coordinators construct the default personal-only SessionRecoveryController; recover rejects other kinds before planning. No independent generic planner execution is attributed to these modes.';
  const shared='Only Survive attaches shared-effect policy; pinned Relay/Race attachments do not. refreshSharedWorldEffects returns before resolver execution.';
  const unused='Application-unused compatibility wrapper: pinned production callers use underlying world/actor helpers instead. Direct API evidence remains globally accountable.';
  const noItems='Relay installs consumables:false; no ConsumableWorld or captured item policy exists. Shared bootstrap registration and absent-extension guards remain applicable.';
  const appearance='Race restricts every closed-roster inventory to appearance-only before play. No successful card, pack or power acquisition can populate it; public rejection guards and cosmetic transactions remain applicable.';
  if(key==='src/session.ts'){
   for(const name of['selectMobTarget','view'])add(member('SharedWorld',name),unused);
   for(const name of['installSharedWorldEffects','sharedWorldEffectsSnapshot'])add(member('LocalSession',name),shared);
   if(mode==='relay'){
    const c=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='ConsumableWorld');if(!c)throw Error('ConsumableWorld absent');
    for(const m of c.members)if(m.body||m.initializer)add(m,'Relay attachment installs market with consumables:false and never installs private ConsumableWorld; no instance exists in this composition.');
    callable('captureConsumablePolicy',noItems);add(member('LocalSession','installConsumableWorld'),noItems);
   }else{
    const use=member('ConsumableWorld','use'),statements=[...use.body.statements];
    const index=statements.findIndex(n=>ts.isIfStatement(n)&&n.expression.getText(tree)==='this.policy');
    const policy=statements[index];
    if(index<0||!ts.isBlock(policy.thenStatement)||!ts.isReturnStatement(policy.thenStatement.statements.at(-1)))throw Error('Race item-policy return changed');
    for(const statement of statements.slice(index+1))add(statement,'Race installs its eligible/activate item policy before market setup; the policy branch always returns before the Survive fallback. Guard, debit and tactical policy execution stay applicable.');
   }
   const refresh=member('LocalSession','refreshSharedWorldEffects');
   if(refresh.body.statements[0].getText(tree)!=='if (!this.sharedEffectPolicy) return;')throw Error('Shared-effect guard changed');
   for(const statement of [...refresh.body.statements].slice(1))add(statement,shared);
  }
  if(key==='src/game.ts'){
   for(const name of['worldForRow','actorPositions'])callable(name,unused);
   add(member('Game','syncSharedEffects'),unused);
   add(member('Game','setSharedWorldEffects'),shared);
   if(mode==='relay')add(member('Game','installWorldExtension'),noItems);
  }
  if(key==='src/consumable-drops.ts'&&mode==='relay'){
   for(const name of['freeze','signed','validate','mix32','draw','consumablePickupId','classifyConsumableBucket','classifyItemBucket','sampleConsumableDrop','sampleItemDrop'])callable(name,noItems);
  }
  if(key==='src/market/run.ts'){
   if(mode==='relay'){
    add(member('RunInventory','restrictItems'),'Only Race.attach restricts item access; Relay retains initialized standard access.');
    add(member('RunInventory','spendCoins'),'Relay has no consumable capabilities, so adapter dispatch rejects every consumable before its companion debit. Ordinary purchases remain applicable.');
   }else{
    for(const name of['hold','cardPool'])add(member('RunInventory',name),appearance);
    const buy=member('RunInventory','buy');
    for(const n of all.filter(n=>n.pos>=buy.pos&&n.end<=buy.end)){
     if(ts.isIfStatement(n)&&["item.kind === 'card'","item.kind === 'pack'","item.kind === 'power'"].includes(n.expression.getText(tree)))add(n.thenStatement,appearance);
     if(ts.isConditionalExpression(n)&&n.condition.getText(tree)==="item.kind === 'pack'")add(n.whenTrue,appearance);
    }
    const afterGuard=(name,text)=>{
     const statements=[...member('RunInventory',name).body.statements],index=statements.findIndex(n=>ts.isIfStatement(n)&&n.expression.getText(tree)===text);
     if(index<0||!ts.isReturnStatement(statements[index].thenStatement))throw Error('Race inventory guard changed: '+name);
     for(const statement of statements.slice(index+1))add(statement,appearance);
    };
    afterGuard('previewPack','!this.alive || !this.isOpen || !this.market || this.market.remaining <= 0 || !draft || !this.itemEligible(draft.packId)');
    afterGuard('claimPack','!preview.valid');
    afterGuard('skipPack','!this.alive || !this.isOpen || !this.market || this.market.remaining <= 0 || !this.pendingPack');
    afterGuard('sell','index < 0 || this.cards[index]!.components.some(component => !this.itemEligible(component.itemId))');
    const tick=member('RunInventory','tick');
    for(const n of all.filter(n=>n.pos>=tick.pos&&n.end<=tick.end)){
     if(ts.isForOfStatement(n)&&n.expression.getText(tree)==='this.powers')add(n.statement,appearance);
     if(ts.isArrowFunction(n)&&n.getText(tree)==='power => power.remaining > 0')add(n,appearance);
    }
   }
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
  const implicit=all.filter(n=>ts.isIfStatement(n)&&!n.elseStatement&&eligible(span(n)));
  const samePoint=(a,b)=>a?.line===b?.line&&a?.column===b?.column;
  const sameSpan=(a,b)=>samePoint(a?.start,b?.start)&&samePoint(a?.end,b?.end);
  const emptyPoint=p=>p&&typeof p==='object'&&!Array.isArray(p)&&(Object.keys(p).length===0||(Object.keys(p).length===2&&Object.hasOwn(p,'line')&&Object.hasOwn(p,'column')&&p.line===undefined&&p.column===undefined));
  const implicitRule=(site,arm,loc)=>arm===1&&site.type==='if'&&site.locations.length===2&&loc&&Object.keys(loc).length===2&&emptyPoint(loc.start)&&emptyPoint(loc.end)&&implicit.map(span).filter(s=>sameSpan(s,site.loc)).map(eligible)[0];
  const emit=(kind,id,arm,rule)=>output.push({mode,path:source.path,...identity,kind,id,...(arm===undefined?{}:{arm}),callReason:rule.reason,stateReason:'Exact unchanged Relay/Race composition across actual acquisition, play, pause and terminal intervals; both Arcade and Flow remain applicable. Module initialization, guards and crossing spans remain in scope.',authority:['src/session.ts','src/game.ts','src/market/run.ts','src/consumable-drops.ts'].includes(key)?closureAuthority:authority});
  for(const[id,site]of Object.entries(source.coverage.statementMap)){const r=eligible(site);if(r)emit('statement',id,undefined,r);}
  for(const[id,site]of Object.entries(source.coverage.fnMap)){const r=[...ranges,...functions].find(r=>contains(r.span,site.loc)&&contains(r.span,site.decl));if(r)emit('function',id,undefined,r);}
  for(const[id,site]of Object.entries(source.coverage.branchMap))for(const[arm,loc]of site.locations.entries()){const r=eligible(loc)||implicitRule(site,arm,loc);if(r)emit('branch',id,arm,r);}
 }
 return output;
}
