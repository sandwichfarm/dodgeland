import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { applicabilityIdentity } from './applicability.mjs';
import { builtinRuleDispositions } from './builtin-rule-applicability.mjs';
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
// Complete src transition reviewed in 07-03-RELAY-EFFECTS-CLOSURE.md.
// A new/changed caller anywhere invalidates this closure, even outside the stratum.
const callerInventoryHash='97f037fa041e738d931c54fb47f98d85632b8c0e4eaa7275f500e9c300787bd6';
// Deliberately reviewed pins: never regenerate automatically when production changes.
export const TURN_APPLICABILITY_SOURCES=Object.freeze({
 'src/mode-rules.ts':'cadda595a1cfa02769eee70e3f925b125b14c7fdf6faf93b9a83f45bb79c89f2',
 'src/relay.ts':'e789deca92e5e17ec683cbbd3103b9b9b3d3e726d6e36712fa5aec4c755c7f89',
 'src/race.ts':'d2ecf7bbc185520fdad9b441c52775297b4929f455e665e38caabebebacb62da',
 'src/session.ts':'e90fc363667108ab1608f713e40b479e800930b160c90d9348439f75f0cf38f9',
 'src/session-recovery.ts':'35119abd8ac6551d253ec0ada320c934fd5a9cf20c142444e3afdb4094093b9c',
 'src/recovery.ts':'835df7ab867c3421e7d295778c864ceba83f0ea10e588c4c6f4d95cdc2c1702b',
 'src/shared-world-effects.ts':'715dce9a98a83c398aa3a3d43531568008a9cefaa9be8df766a921dd2eb43a45',
 'src/game.ts':'8836f978c5afa8df069b51d9a72ea3bdbd5025b3cb6540d747dbaf14b2aa38cd',
 'src/market/run.ts':'ba755b3573ca4acaf2a11ce7b77c277df526a16b2801cca612ee55feee36de6f',
 'src/consumable-drops.ts':'2fc4a1c55dc7f37dbcac2b7091661e3a284d3292eddf1460da423a39520dec4a',
 'src/consumables.ts':'6a28f19753ce1755167869c6b087b174962ced99725d68e02b2c24f9950c9d12',
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
const effectAuthority='.planning/phases/07-release-evidence-pr/07-03-RELAY-EFFECTS-CLOSURE.md';
const before=(a,b)=>a.line<b.line||a.line===b.line&&a.column<=b.column;
const contains=(a,b)=>b?.start&&b?.end&&before(a.start,b.start)&&before(b.end,a.end);
function checkCallerInventory(inventory){
 if(!Array.isArray(inventory)||inventory.length!==158)throw Error('Missing reviewed turn caller inventory');
 const callerRows=inventory.map(row=>{
  const match=row.path?.replaceAll('\\','/').match(/(?:^|\/)src\/(.+\.ts)$/);
  if(!match||typeof row.source!=='string')throw Error('Invalid reviewed turn caller inventory');
  return ['src/'+match[1],createHash('sha256').update(row.source).digest('hex')];
 }).sort(([a],[b])=>a<b?-1:a>b?1:0);
 if(new Set(callerRows.map(([path])=>path)).size!==158||createHash('sha256').update(JSON.stringify(callerRows)).digest('hex')!==callerInventoryHash)throw Error('Reviewed turn caller inventory changed');
}
export function turnApplicabilityDispositions({mode,sources,authoritySources,closureSources,canonicalSources}){
 if(!['relay','race'].includes(mode))throw Error('Turn mode required');
 if(!Array.isArray(sources))throw Error('Source inventory required');
 if(!Array.isArray(authoritySources))throw Error('Missing turn caller authority');
 checkCallerInventory(closureSources);checkCallerInventory(canonicalSources);
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
  if(key==='src/mode-rules.ts'){output.push(...builtinRuleDispositions({mode,source,closureSources,canonicalSources}));continue;}
  const tree=ts.createSourceFile(key,source.source,ts.ScriptTarget.Latest,true);if(tree.parseDiagnostics.length)throw Error('Invalid reviewed source');
  const point=o=>{const p=tree.getLineAndCharacterOfPosition(o);return{line:p.line+1,column:p.character};};
  const span=n=>({start:point(n.getStart(tree)),end:point(n.end)}),ranges=[],functions=[],falseOutcomes=[];
  const stagingReference='.planning/phases/07-release-evidence-pr/07-03-TURN-STAGING-CLOSURE.md';
  const add=(node,reason,onlyFunction=false,reference)=>(onlyFunction?functions:ranges).push({span:span(node),reason,reference});
  const all=[];function walk(n){all.push(n);ts.forEachChild(n,walk);}walk(tree);
  const member=(owner,name)=>{const c=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===owner),m=c?.members.find(n=>name==='constructor'?ts.isConstructorDeclaration(n):n.name?.getText(tree)===name);if(!m?.body)throw Error('Reviewed member absent: '+owner+'.'+name);return m;};
  const callable=(name,reason,reference)=>{
   const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name),variable=all.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(tree)===name);
   const node=fn??variable?.initializer;if(!node||!(ts.isFunctionDeclaration(node)||ts.isArrowFunction(node))||!node.body)throw Error('Reviewed callable absent: '+name);
   add(node.body,reason,false,reference);add(node,reason,true,reference);
  };
  const personal='Both pinned coordinators construct the default personal-only SessionRecoveryController; recover rejects other kinds before planning. No independent generic planner execution is attributed to these modes.';
  const shared='Only Survive and Relay attach shared-effect policy. Pinned Race never installs it; its refresh guard returns before setter/resolver execution. Relay shared effects remain counted.';
  const unused='Application-unused compatibility wrapper: pinned production callers use underlying world/actor helpers instead. Direct API evidence remains globally accountable.';
  const noItems='Relay installs consumables:false; no ConsumableWorld or captured item policy exists. Shared bootstrap registration and absent-extension guards remain applicable.';
  const appearance='Race restricts every closed-roster inventory to appearance-only before play. No successful card, pack or power acquisition can populate it; public rejection guards and cosmetic transactions remain applicable.';
  if(key==='src/session.ts'){
   const staged='Pinned turn factories supply validated explicit rosters/matching frozen mode/default capacity4. Only exact unavailable initializer/fallback/then execution is removed; actual constructor, evaluated guard, staging, placement and rollback remain accountable.';
   const admit='Closed turn modes reject live admission before private admitPlan. Its only turn call is stage(plan,false,false) before active start; actual construction, guards, bindRecovery and roster insertion remain accountable.';
   const unavailableThen=(node,reason)=>{if(!ts.isIfStatement(node)||node.elseStatement)throw Error('Reviewed false-only guard changed');add(node.thenStatement,reason,false,stagingReference);falseOutcomes.push({span:span(node),reason,reference:stagingReference});};
   const parameter=(owner,method,name)=>{const value=member(owner,method).parameters.find(p=>p.name.getText(tree)===name)?.initializer;if(!value)throw Error('Reviewed explicit parameter changed: '+owner+'.'+method+'.'+name);add(value,method==='admitPlan'?admit:staged,false,stagingReference);};
   for(const[owner,method,name]of [['SessionPlayer','constructor','primary'],['LocalSession','constructor','options'],['LocalSession','stage','options'],['LocalSessionStage','constructor','originalPrimaryDevice'],['LocalSession','admitPlan','start'],['LocalSession','admitPlan','emit']])parameter(owner,method,name);
   const sessionConstructor=member('LocalSession','constructor'),throws=sessionConstructor.body.statements.filter(n=>ts.isIfStatement(n)&&ts.isThrowStatement(n.thenStatement));
   if(throws.length!==3)throw Error('Reviewed session constructor guards changed');for(const node of throws)unavailableThen(node,staged);
   const stage=member('LocalSession','stage'),within=(owner)=>all.filter(n=>n.pos>=owner.body.pos&&n.end<=owner.body.end);
   const defaults=within(stage).filter(n=>ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.QuestionQuestionToken&&(['new SharedWorld(game)',"new SessionPlayer(world, 'p1', 'keyboard-a', game.characterId, true)",'DEFAULT_CHARACTER'].includes(n.right.getText(tree))||n.left.getText(tree)==='options.roster'));
   if(defaults.length!==4)throw Error('Reviewed turn stage fallbacks changed');for(const node of defaults)add(node.right,staged,false,stagingReference);
   const unique=stage.body.statements.filter(n=>ts.isIfStatement(n)&&ts.isThrowStatement(n.thenStatement));if(unique.length!==1)throw Error('Reviewed stage uniqueness guard changed');unavailableThen(unique[0],staged);
   const plan=member('LocalSession','admitPlan'),planGuards=plan.body.statements.filter(n=>ts.isIfStatement(n)&&['start && !player.start()','this.active','emit'].includes(n.expression.getText(tree)));
   if(planGuards.length!==3)throw Error('Reviewed staged admission guards changed');for(const node of planGuards)unavailableThen(node,admit);
   const start=planGuards.find(n=>n.expression.getText(tree)==='start && !player.start()').expression;add(start.right,admit,false,stagingReference);
   const handler='Both fixed frozen turn handlers always provide canAct/canTransact/simulates. Only the missing-handler nullish fallback is unavailable; dispatch, callback execution, filters and returned values remain counted.';
   for(const[name,text]of [['canAct','this.mode?.handlers.canAct?.(seat)'],['canTransact','this.mode?.handlers.canTransact?.(seat)'],['update','this.mode?.handlers.simulates?.(player)'],['views','this.mode?.handlers.simulates?.(player)'],...(mode==='relay'?[['refreshSharedWorldEffects','this.mode?.handlers.simulates?.(player)']]:[])]){
    const nodes=within(member('LocalSession',name)).filter(n=>ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.QuestionQuestionToken&&n.left.getText(tree)===text);if(nodes.length!==1)throw Error('Reviewed fixed handler fallback changed: '+name);add(nodes[0].right,handler,false,stagingReference);
   }
   const seatReference='.planning/phases/07-release-evidence-pr/07-03-SEAT-CALL-CLOSURE.md';
   const constructor=member('SessionPlayer','constructor');let placementFallbacks=0;
   for(const node of all.filter(n=>n.pos>=constructor.body.pos&&n.end<=constructor.body.end)){
    if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.QuestionQuestionToken&&['placement?.x','placement?.y'].includes(node.left.getText(tree))){
     add(node.right,'All three pinned application allocations either return through primary=true or receive the frozen safePlacement point through private admitPlan. Only the omitted-placement fallback operand is unavailable; constructor, placement reads and spawn guard remain applicable.',false,seatReference);
     placementFallbacks++;
    }
   }
   if(placementFallbacks!==2)throw Error('Reviewed seat placement fallbacks changed');
   add(member('LocalSessionStage','commitAdmission'),'Complete pinned application reference/value-flow inventory has no call or extraction of this staged-admission wrapper. Shipped setup uses stage.commit/cancel and actual live admission uses session.admit directly.',false,seatReference);
   if(mode==='relay'){
    callable('composeSessionModeDefinition','The sole pinned application call is Race.composeRaceDefinition. Relay captures its own fixed handler object and never invokes this authoring composer; Race validation and module allocation remain applicable.',seatReference);
    add(member('SessionPlayer','setHopCooldown'),'The sole pinned caller is RaceItems Mud Splash activation. Relay never installs the Race item policy; cooldown getters, noteHop, movement and field initialization remain applicable.',false,seatReference);
   }
   const reference='.planning/phases/07-release-evidence-pr/07-03-PERSONAL-CALL-CLOSURE.md';
   const cells=member('LocalSession','recoverySafeCells');let flareOperands=0,flareBodies=0;
   for(const node of all.filter(n=>n.pos>=cells.pos&&n.end<=cells.end)){
    if(ts.isConditionalExpression(node)&&node.condition.getText(tree)==="kind === 'flare'"){add(node.whenTrue,personal,false,reference);flareOperands++;}
    if(ts.isIfStatement(node)&&node.expression.getText(tree)==="kind === 'flare'"){add(node.thenStatement,personal,false,reference);flareBodies++;}
   }
   if(flareOperands!==2||flareBodies!==1)throw Error('Reviewed personal-only safe-cell flow changed');
   if(mode==='race')add(member('LocalSession','transferPosition'),'Complete pinned caller inventory resolves this method only from Relay.confirm. Canonical Race never transfers a Relay baton; acquisition and personal/reclaim placement remain applicable.',false,reference);
   for(const name of['selectMobTarget','view'])add(member('SharedWorld',name),unused);
   if(mode==='race')add(member('LocalSession','installSharedWorldEffects'),shared,false,effectAuthority);
   add(member('LocalSession','sharedWorldEffectsSnapshot'),unused,false,effectAuthority);
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
   if(mode==='race')for(const statement of [...refresh.body.statements].slice(1))add(statement,shared,false,effectAuthority);
  }
  if(key==='src/game.ts'){
   const reference='.planning/phases/07-release-evidence-pr/07-03-TURN-UPDATE-CLOSURE.md';
   const standalone='Complete pinned caller inventory: main.frame selects LocalSession.update for a running owner; reset replaces that owner synchronously and pagehide cancels RAF. Canonical turn lifetimes never invoke standalone Game.update. Shared player updates use drivesWorld:false inside SharedWorld.resolvePlayer.';
   for(const name of ['update','updateMobs'])add(member('Game',name),standalone,false,reference);
   const tail=member('Game','finishPlayerUpdate');
   for(const node of all.filter(n=>n.pos>=tail.pos&&n.end<=tail.end))if(ts.isIfStatement(node)&&['drivesWorld',"drivesWorld && this.pursuitEnabled && this.rules.pursuit.strategy === 'wave'","this.state === 'playing' && drivesWorld"].includes(node.expression.getText(tree)))add(node.thenStatement,standalone,false,reference);
   const collect=member('Game','collectCoins'),statements=[...collect.body.statements],dispatch=statements.findIndex(n=>ts.isIfStatement(n)&&n.expression.getText(tree)==='sessionPlayer');
   if(dispatch<0||!ts.isBlock(statements[dispatch].thenStatement)||statements[dispatch].thenStatement.statements.at(-1)?.getText(tree)!=='return;')throw Error('Shared coin dispatch changed');
   for(const statement of statements.slice(dispatch+1))add(statement,'All pinned collectCoins calls occur inside finishPlayerUpdate during resolvePlayer with the same active world. collectSessionCoins returns before this solo-only remainder. Shared dispatch and every shared contact/claim guard remain accountable.',false,reference);
   for(const name of['worldForRow','actorPositions'])callable(name,unused);
   add(member('Game','syncSharedEffects'),unused);
   if(mode==='race')add(member('Game','setSharedWorldEffects'),shared,false,effectAuthority);
   if(mode==='relay')add(member('Game','installWorldExtension'),noItems);
  }
  if(key==='src/consumable-drops.ts'&&mode==='relay'){
   for(const name of['freeze','signed','validate','mix32','draw','consumablePickupId','classifyConsumableBucket','classifyItemBucket','sampleConsumableDrop','sampleItemDrop'])callable(name,noItems);
  }
  if(key==='src/consumables.ts'&&mode==='relay'){
   const reference='.planning/phases/07-release-evidence-pr/07-03-TURN-DEBIT-FINDING.md';
   const reason='Complete pinned caller/value-flow proof resolves both debit calls inside private ConsumableWorld.use; Relay never allocates that instance. targetsFor has only the debit caller. Credit, shared helpers, module initialization and public absent-instance guards remain applicable.';
   for(const name of ['planConsumableDebit','targetsFor'])callable(name,reason,reference);
  }
  if(key==='src/consumables.ts'&&mode==='race'){
   const reference='.planning/phases/07-release-evidence-pr/07-03-RACE-TARGET-POLICY-CLOSURE.md';
   const reason='Complete pinned Race catalogue/caller/value-flow proof: common debit receives exactly one validated living seat after synchronous RaceItems.valid with an owned charge. Captured catalogue is supplied explicitly. Actual earlier request rejection and every evaluated helper guard remain counted.';
   const fn=name=>tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name),targets=fn('targetsFor'),debit=fn('planConsumableDebit');
   if(!targets?.body||!debit?.body)throw Error('Race tactical helpers changed');
   const inside=(n,owner)=>n.pos>=owner.pos&&n.end<=owner.end;
   const conditions=all.filter(n=>ts.isIfStatement(n)&&inside(n,targets)),guarded=all.filter(n=>ts.isIfStatement(n)&&inside(n,debit)&&['charges[item.id] < 1',"'ok' in targets"].includes(n.expression.getText(tree)));
   if(conditions.length!==11||guarded.length!==2||[...conditions,...guarded].some(n=>n.elseStatement))throw Error('Race tactical validation guards changed');
   for(const condition of [...conditions,...guarded]){add(condition.thenStatement,reason,false,reference);falseOutcomes.push({span:span(condition),reason,reference});}
   const cooperative=conditions.filter(n=>ts.isBinaryExpression(n.expression)&&n.expression.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken&&["item.targetPolicy === 'dead-teammate'","item.targetPolicy === 'dead-teammates-and-active-regroup'"].includes(n.expression.left.getText(tree)));
   if(cooperative.length!==4)throw Error('Race cooperative-only target operands changed');
   for(const condition of cooperative)add(condition.expression.right,reason,false,reference);
   for(const name of ['definition','chargesFor']){const param=fn(name)?.parameters.find(p=>p.name.getText(tree)==='catalogue');if(param?.initializer?.getText(tree)!=='CONSUMABLES')throw Error('Race supplied catalogue default changed');add(param.initializer,reason,false,reference);}
  }
  if(key==='src/market/run.ts'){
   if(mode==='relay'){
    add(member('RunInventory','restrictItems'),'Only Race.attach restricts item access; Relay retains initialized standard access.');
    add(member('RunInventory','spendCoins'),'Relay has no consumable capabilities, so adapter dispatch rejects every consumable before its companion debit. Ordinary purchases remain applicable.');
   }else{
    const emptyReference='.planning/phases/07-release-evidence-pr/07-03-RACE-EMPTY-INVENTORY-CLOSURE.md';
    const empty='Complete pinned construction/write/call closure: Race cards and timed powers initialize empty and appearance-only access prevents every nonempty writer. Tactical charges and innate powers use separate state. Empty traversal, guards, score/milestone updates and cosmetic operations remain applicable.';
    const reducer=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='reduceItems'),score=member('RunInventory','advanceScore');
    if(!reducer?.body)throw Error('Race inventory reducer changed');
    const loops=all.filter(n=>ts.isForOfStatement(n)&&[reducer,score].some(owner=>n.pos>=owner.pos&&n.end<=owner.end)&&['components','powers','this.cards.flatMap(card => card.components)','this.powers'].includes(n.expression.getText(tree)));
    if(loops.length!==4)throw Error('Race empty inventory loops changed');
    for(const loop of loops)add(loop.statement,empty,false,emptyReference);
    const callbacks=all.filter(n=>ts.isArrowFunction(n)&&n.getText(tree)==='card => card.components');
    if(callbacks.length!==3)throw Error('Race empty component traversals changed');
    for(const callback of callbacks)add(callback,empty,false,emptyReference);
    const expiry=all.filter(n=>ts.isIfStatement(n)&&n.expression.getText(tree)==='retained.length !== this.powers.length');
    if(expiry.length!==1||expiry[0].elseStatement)throw Error('Race empty power expiry changed');
    add(expiry[0].thenStatement,empty,false,emptyReference);
    falseOutcomes.push({span:span(expiry[0]),reason:empty,reference:emptyReference});
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
  if(key==='src/shared-world-effects.ts'&&mode==='race'){
   const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='resolveSharedWorldEffects');if(!fn?.body)throw Error('Shared resolver absent');add(fn.body,shared,false,effectAuthority);add(fn,shared,true,effectAuthority);
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
  const emit=(kind,id,arm,rule)=>output.push({mode,path:source.path,...identity,kind,id,...(arm===undefined?{}:{arm}),callReason:rule.reason,stateReason:'Exact unchanged Relay/Race composition across actual acquisition, play, pause and terminal intervals; both Arcade and Flow remain applicable. Module initialization, guards and crossing spans remain in scope.',authority:rule.reference??(['src/session.ts','src/game.ts','src/market/run.ts','src/consumable-drops.ts'].includes(key)?closureAuthority:authority)});
  for(const[id,site]of Object.entries(source.coverage.statementMap)){const r=eligible(site);if(r)emit('statement',id,undefined,r);}
  for(const[id,site]of Object.entries(source.coverage.fnMap)){const r=[...ranges,...functions].find(r=>contains(r.span,site.loc)&&contains(r.span,site.decl));if(r)emit('function',id,undefined,r);}
  for(const[id,site]of Object.entries(source.coverage.branchMap))for(const[arm,loc]of site.locations.entries()){
   let r=eligible(loc)||implicitRule(site,arm,loc);
   if(!r&&site.type==='if'&&arm===0&&site.locations.length===2&&sameSpan(site.loc,loc))r=falseOutcomes.find(r=>sameSpan(r.span,site.loc));
   if(r?.reference===stagingReference&&!['if','cond-expr','binary-expr','default-arg','switch'].includes(site.type))r=undefined;
   if(r)emit('branch',id,arm,r);
  }
 }
 return output;
}
