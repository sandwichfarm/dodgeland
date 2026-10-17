import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { applicabilityIdentity } from './applicability.mjs';
import { builtinRuleDispositions } from './builtin-rule-applicability.mjs';

const ts = createRequire(new URL('../../package.json', import.meta.url))('typescript');
const reviewed = Object.freeze({
  'src/market/run.ts': { hash:'ba755b3573ca4acaf2a11ce7b77c277df526a16b2801cca612ee55feee36de6f', owner:'RunInventory', members:['restrictItems','spendCoins','resumeAfterDeath'] },
  'src/market/types.ts': { hash:'d1e216d95749be95069851fe36b38009e9b86e86931fd4590330f794b2b4bb4c', callables:['itemEligibility'] },

  'src/mobs.ts': { hash:'6077ac4fd884ef16f9fe8ab3f3db77a431b2d2853adbeddc1d0d843b595018d1' },
  'src/mode-rules.ts': { hash:'cadda595a1cfa02769eee70e3f925b125b14c7fdf6faf93b9a83f45bb79c89f2' },
  'src/game.ts': { hash: '04d7556c96b37b03539f270c2ce2c8e2b620c301d729a1fd6238be8e66d9413b', owner: 'Game', callables:['worldForRow','actorPositions'], helpers: [], members: ['syncSharedEffects', 'collectSessionCoins', 'sessionPickupContact', 'operationFor', 'inPlayerOperation', 'startPlayer', 'movePlayer', 'updateSessionPlayer', 'damagePlayer', 'advancePlayerDeathVisuals', 'advanceSharedWorld', 'advanceSharedPursuit', 'awardSessionPickup', 'updateSessionMobs', 'setSharedWorldEffects', 'resetSharedWorldEffects', 'syncSharedWorldEffects', 'installWorldExtension', 'updateSessionWorldExtension'] },
  'src/recovery.ts': { hash:'835df7ab867c3421e7d295778c864ceba83f0ea10e588c4c6f4d95cdc2c1702b', callables:['reject','stable','isLivingRecoverySubject','planRecovery','commitRecoveryPlan'] },
  'src/shared-world-effects.ts': { hash:'715dce9a98a83c398aa3a3d43531568008a9cefaa9be8df766a921dd2eb43a45', callables:['resolveSharedWorldEffects'] },
  'src/consumables.ts': { hash:'6a28f19753ce1755167869c6b087b174962ced99725d68e02b2c24f9950c9d12', callables:['reject','validGeneration','validId','definition','holdsCapability','sameOwner','chargesFor','validateBase','resulting','targetsFor','planConsumableCredit','planConsumableDebit'] },
  'src/consumable-drops.ts': { hash:'2fc4a1c55dc7f37dbcac2b7091661e3a284d3292eddf1460da423a39520dec4a', callables:['freeze','signed','validate','mix32','draw','consumablePickupId','classifyConsumableBucket','classifyItemBucket','sampleConsumableDrop','sampleItemDrop'] },
  'src/session.ts': { hash: '399fb31a96ca12befaae95b992951a348f53259071f18f0c59967d39f8c3e3e9', owner: 'LocalSession', helpers: [] },
  'src/co-op-market.ts': { hash: '037a96c9f9436346f06306cac74808aab5e92e205ce2c42bebb1dbd16ca24c22', owner: 'CoOpMarketAdapter', helpers: ['actionId', 'isMarketWindowOpen', 'canBuyOrEquip'] },
});
export const SOLO_AUTHORITY_PINS = Object.freeze({"src/main.ts": "33be7291c0e3c14910039fdb8a1d44e895273f79e132f9a0c9873b3d3166add4", "src/render.ts": "b6b5ae2ff1a4af8e3f6a0bf2c96bfcc3e83b11e95e38892ccaa6f33f3c2122c2", "src/race.ts": "d2ecf7bbc185520fdad9b441c52775297b4929f455e665e38caabebebacb62da", "src/session-recovery.ts": "35119abd8ac6551d253ec0ada320c934fd5a9cf20c142444e3afdb4094093b9c", "src/levels/v1.ts": "2528a12bdc80d8da5579dccf04cd64509a2ceeb7f3ff229b9cb970207c4f5c56"});
const authority = '.planning/phases/07-release-evidence-pr/07-03-SOLO-CALL-CLOSURE.md';
const before = (a, b) => a.line < b.line || a.line === b.line && a.column <= b.column;
const contains = (outer, inner) => inner?.start && inner?.end && before(outer.start, inner.start) && before(inner.end, outer.end);

/** Reviewed stable-solo applicability only; this does not establish interval provenance. */
export function soloApplicabilityDispositions({ mode, sources, authoritySources, closureSources, canonicalSources }) {
  if (!['solo-arcade', 'solo-flow'].includes(mode)) throw Error('Stable solo mode required');
  if (!Array.isArray(sources)) throw Error('Source inventory required');
  if(!Array.isArray(authoritySources))throw Error('Missing solo caller authority');
  for(const [path,pin] of Object.entries(SOLO_AUTHORITY_PINS)){
    const rows=authoritySources.filter(s=>s.path.replaceAll('\\','/')===path||s.path.replaceAll('\\','/').endsWith('/'+path));
    if(rows.length!==1)throw Error('Missing or duplicate solo caller authority: '+path);
    if(createHash('sha256').update(rows[0].source).digest('hex')!==pin)throw Error('Reviewed solo caller authority changed: '+path);
  }
  const dispositions = [], seen = new Set();
  for (const source of sources) {
    const path = source.path.replaceAll('\\', '/');
    const key = Object.keys(reviewed).find(key => path === key || path.endsWith('/' + key));
    if (!key) continue;
    if (seen.has(key)) throw Error('Duplicate reviewed source');
    seen.add(key);
    const rule = reviewed[key], identity = applicabilityIdentity(source);
    if (identity.sourceHash !== rule.hash) throw Error('Reviewed solo source changed: ' + key);
    if(key==='src/mode-rules.ts')dispositions.push(...builtinRuleDispositions({mode,source,closureSources,canonicalSources}));
    const tree = ts.createSourceFile(key, source.source, ts.ScriptTarget.Latest, true);
    if (tree.parseDiagnostics.length) throw Error('Invalid reviewed source');
    const point = offset => { const p = tree.getLineAndCharacterOfPosition(offset); return { line: p.line + 1, column: p.character }; };
    const span = node => ({ start: point(node.getStart(tree)), end: point(node.end) });
    const ranges = [], functionRanges = [], guardArms = [];
    const reasons = [];
    const addRange = (node, reason, functionsOnly = false) => { const range=span(node); (functionsOnly?functionRanges:ranges).push(range); reasons.push({range,reason}); };
    for(const name of rule.callables??[]){
      const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
      const variable=tree.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]).find(n=>n.name.getText(tree)===name);
      const callable=fn??variable?.initializer;
      if(!callable||!(ts.isFunctionDeclaration(callable)||ts.isArrowFunction(callable))||!callable.body)throw Error('Reviewed callable absent: '+name);
      const reason=key==='src/game.ts'&&['worldForRow','actorPositions'].includes(name)?`${name} is an application-unused compatibility wrapper; underlying generation/actor functions remain applicable and API tests remain globally accountable.`:key==='src/market/types.ts'?'itemEligibility is called only by the nonstandard itemAllowed operand; strict solo inventory retains standard access.':`${name} belongs to the reviewed session service call closure; strict solo neither stages nor attaches session services. Import-time bootstrap validation remains applicable.`;
      addRange(callable.body,reason);addRange(callable,reason,true);
    }
    const owner = tree.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === rule.owner);
    if (rule.owner && !owner) throw Error('Reviewed class absent');
    for (const member of owner?.members??[]) {
      if (rule.members && !rule.members.includes(member.name?.getText(tree))) continue;
      if (member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) continue;
      // Instance field initializers execute only upon construction. Type-only fields have no sites.
      if (member.body || member.initializer) addRange(member,rule.owner==='Game'&&member.name?.getText(tree)==='syncSharedEffects' ? 'Application-unused compatibility wrapper: no production caller invokes syncSharedEffects; underlying syncEffects and direct API evidence remain accountable.' : rule.owner==='RunInventory' ? ({restrictItems:'Only Race.attach restricts item access; solo retains initialized standard access.',spendCoins:'Only CoOpMarketAdapter calls this companion debit primitive; solo purchases use ordinary inventory transactions.',resumeAfterDeath:'Only SessionRecoveryController calls this empty-economy resume primitive; solo retry creates a new Game.'}[member.name?.getText(tree)]) : rule.members ? 'Reviewed Game session adapter: complete callers are session services or guarded by world.sessionActive. Strict owned solo rejects session attachment and staging; ordinary Game functions and dispatch guards remain applicable.' : `${rule.owner} instance execution requires LocalSession construction/attachment.`);
    }
    if(rule.members && rule.members.some(name=>!owner.members.some(member=>member.name?.getText(tree)===name&&member.body)))throw Error('Reviewed Game collector absent');
    for (const helper of rule.helpers??[]) {
      const declaration = tree.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(d => d.name.getText(tree) === helper);
      if (!declaration?.initializer || !ts.isArrowFunction(declaration.initializer)) throw Error('Reviewed helper absent');
      // Leave its module-level function-value initialization applicable; only calls are session-only.
      addRange(declaration.initializer.body,`${helper} is called only through ${rule.owner}.`);
      addRange(declaration.initializer,`${helper} is called only through ${rule.owner}.`,true);
    }
    if(key==='src/session.ts'){
      const classNamed=name=>{const node=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);if(!node)throw Error('Reviewed class absent: '+name);return node;};
      const members=(name,names,reason)=>{const owner=classNamed(name);for(const memberName of names){const member=owner.members.find(m=>m.name?.getText(tree)===memberName);if(!member?.body)throw Error('Reviewed member absent: '+name+'.'+memberName);addRange(member,reason);}};
      members('LocalSession',['stage'],'LocalSession.stage constructs LocalSession/LocalSessionStage; strict solo forbids staging even when canceled.');
      for(const name of ['LocalSessionStage','ConsumableWorld'])for(const member of classNamed(name).members)if(member.body||member.initializer)addRange(member,name==='LocalSessionStage'?'LocalSessionStage exists only after staged LocalSession allocation.':'Private ConsumableWorld is allocated only by LocalSession.installConsumableWorld and installed by composed session handlers.');
      members('SharedWorld',['selectMobTarget','view'],'Application-unused compatibility projections; no production caller reaches these wrappers, while direct API tests remain globally accountable.');
      members('SharedWorld',['beginFrame','update','resolvingPlayer','resolvePlayer','claimPickup','claimPickupPull','resolvePickups','releaseInactivePickupClaims'],'LocalSession.update owns shared frame/update/arbitration; Game.collectCoins enters claims only under sessionActive and resolvingPlayer. Solo Game.update uses its own path.');
      members('SessionPlayer',['label','rescueFraction','groundX','groundY','power','personalScore','powerRemaining','powerReady','powerFlash','render','setHopCooldown','hopCooldown','canHop','noteHop','interactions','recordInteraction','start','move','update'],'SessionPlayer adapter calls originate in LocalSession/Race; Game scoringPlayer is null on untouched primary solo, gating hop/interaction paths.');
      for(const name of ['composeSessionModeDefinition','captureConsumablePolicy']){
        const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);if(!fn?.body)throw Error('Reviewed helper absent: '+name);
        addRange(fn, name==='captureConsumablePolicy'?'Policy validation is called only by LocalSession.installConsumableWorld.':'Session definition composition is called by Race construction, not solo Game definitions.');
      }
      const device=tree.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]).find(n=>n.name.getText(tree)==='isDeviceId');
      if(!device?.initializer||!ts.isArrowFunction(device.initializer))throw Error('Reviewed device helper absent');
      addRange(device.initializer.body,'isDeviceId is called only by LocalSession admission/reclaim.');addRange(device.initializer,'isDeviceId is called only by LocalSession admission/reclaim.',true);
      const player=classNamed('SessionPlayer'),constructor=player.members.find(ts.isConstructorDeclaration);
      const primaryIndex=constructor?.body?.statements.findIndex(n=>ts.isIfStatement(n)&&n.expression.getText(tree)==='primary');
      if(primaryIndex===undefined||primaryIndex<0)throw Error('Reviewed primary constructor branch absent');
      for(const statement of [...constructor.body.statements].slice(primaryIndex+1))addRange(statement,'Primary SessionPlayer constructor returns before this secondary-seat allocation/placement branch.');
      for(const name of ['onCoin','onHurt','onHeal','onEnd','onPower']){
        const field=player.members.find(m=>m.name?.getText(tree)===name);
        if(!field?.initializer||!ts.isArrowFunction(field.initializer))throw Error('Reviewed callback default absent');
        addRange(field.initializer,'Primary constructor alias adopts existing Game callback before any invocation; this placeholder function is overwritten. Initialization statement remains applicable.',true);
      }
    }
    if(key==='src/market/types.ts'){
      const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='itemAllowed');
      const expression=fn?.body?.statements[0]?.expression;
      if(!expression||!ts.isBinaryExpression(expression)||expression.left.getText(tree)!=="access === 'standard'"||expression.right.getText(tree)!=='itemEligibility(item).appearance')throw Error('Reviewed standard item guard changed');
      addRange(expression.right,'Strict solo retains initialized standard access; only Race attach calls restrictItems. Standard guard remains applicable.');
    }
    if(key==='src/game.ts'){
      const reason='Strict owned solo has no session or operation context. Source-bound assignment/caller closure proves only this dispatch body or operand unavailable; predicate evaluation and ordinary fallback remain applicable.';
      const falseGuards={ensureRows:['this.world?.sessionActive'],move:['this.scoringPlayer'],end:['participant'],collideVehicles:['this.sessionProtected()'],finishPlayerUpdate:['this.operationPlayer && this.hop < 1e-9'],lifecycle:['this.operationPlayer && !this.operationPlayer.primary'],collectCoins:['sessionPlayer','pickupOwner && pickupOwner !== sessionSeat','sessionSeat','sessionSeat && !pickupOwner']};
      const methods=['pursuitEnabled','scoringPlayer','sessionProtected',...Object.keys(falseGuards)];
      for(const name of methods){
        const method=owner.members.find(n=>n.name?.getText(tree)===name);if(!method?.body)throw Error('Solo dispatch member absent: '+name);
        const nodes=[];const visit=n=>{nodes.push(n);ts.forEachChild(n,visit);};visit(method.body);
        for(const condition of falseGuards[name]??[]){
          const matches=nodes.filter(n=>ts.isIfStatement(n)&&n.expression.getText(tree)===condition);
          if(matches.length!==(name==='collectCoins'&&condition==='sessionSeat'?3:1))throw Error('Solo dispatch guard changed: '+name+'/'+condition);
          for(const node of matches){addRange(node.thenStatement,reason);guardArms.push({node,arm:0,reason});}
        }
        if(name==='finishPlayerUpdate'){
          const matches=nodes.filter(n=>ts.isIfStatement(n)&&n.expression.getText(tree)==='drivesWorld');
          if(matches.length!==3||matches.some(n=>n.elseStatement))throw Error('Solo world driver guards changed');
          for(const node of matches)guardArms.push({node,arm:1,reason:'Only Game.update calls finishPlayerUpdate in strict solo, passing literal true. Keep the evaluated predicate and body; only its impossible false outcome is unavailable.'});
        }
        for(const node of nodes){
          if(ts.isConditionalExpression(node)&&(node.condition.getText(tree)==='this.world?.sessionActive'||name==='collectCoins'&&node.condition.getText(tree)==='sessionSeat'))addRange(node.whenTrue,reason);
          if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken&&['this.world?.sessionActive','!!this.operationPlayer','this.operationPlayer','this.scoringPlayer',...(name==='collectCoins'?['pickupOwner','sessionSeat']:[])].includes(node.left.getText(tree)))addRange(node.right,reason);
        }
      }
    }
    if(key==='src/mobs.ts'&&mode==='solo-flow'){
      const reason='Pinned SOLO_STROLL_MODE disables pursuers. Game.updateMobs still invokes MobDirector.update, whose first guard clears mobs and returns before this private AI closure. mobDefinition bootstrap stays applicable.';
      const director=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MobDirector');if(!director)throw Error('Reviewed MobDirector absent');
      const update=director.members.find(n=>n.name?.getText(tree)==='update');
      if(!update?.body||update.body.statements[0].getText(tree)!=='if (!game.rules.pursuers.enabled) { this.mobs.length = 0; return; }')throw Error('Reviewed Flow mob guard changed');
      for(const statement of [...update.body.statements].slice(1))addRange(statement,reason);
      for(const name of ['clearPath','plan','walkTarget','spawn']){const member=director.members.find(n=>n.name?.getText(tree)===name);if(!member?.body)throw Error('Reviewed mob member absent: '+name);addRange(member,reason);}
      for(const name of ['mobPacing','mobMotionProgress','mobTuning','runTuning','sweptMobContact']){const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);if(!fn?.body)throw Error('Reviewed mob callable absent: '+name);addRange(fn.body,reason);addRange(fn,reason,true);}
    }
    const eligible = site => ranges.some(range => contains(range, site));
    // Istanbul emits an empty second location for an absent else. Only an exact
    // source IfStatement wholly inside a reviewed unavailable range supplies its proof.
    const unavailableImplicitIfs=[];
    const visit=node=>{if(ts.isIfStatement(node)&&!node.elseStatement&&eligible(span(node)))unavailableImplicitIfs.push(span(node));ts.forEachChild(node,visit);};visit(tree);
    const samePoint=(a,b)=>a?.line===b?.line&&a?.column===b?.column;
    const sameSpan=(a,b)=>samePoint(a?.start,b?.start)&&samePoint(a?.end,b?.end);
    const emptyPoint=p=>p&&typeof p==='object'&&!Array.isArray(p)&&(Object.keys(p).length===0||(Object.keys(p).length===2&&Object.hasOwn(p,'line')&&Object.hasOwn(p,'column')&&p.line===undefined&&p.column===undefined));
    const syntheticElse=(site,arm,location)=>arm===1&&site.type==='if'&&site.locations.length===2&&location&&Object.keys(location).length===2&&emptyPoint(location.start)&&emptyPoint(location.end)&&unavailableImplicitIfs.some(range=>sameSpan(range,site.loc));
    const provenGuard=(site,arm,location)=>site.type==='if'&&site.locations.length===2&&guardArms.find(proof=>proof.arm===arm&&sameSpan(span(proof.node),site.loc)&&(arm===0?(sameSpan(location,site.loc)||sameSpan(location,span(proof.node.thenStatement))):location&&Object.keys(location).length===2&&emptyPoint(location.start)&&emptyPoint(location.end)));
    const add = (kind, id, arm, site, guard) => dispositions.push({ mode, path: source.path, ...identity, kind, id,
      ...(arm === undefined ? {} : { arm }),
      callReason: guard?.reason ?? reasons.find(({range})=>contains(range,site))?.reason ?? 'Reviewed session-only callable body.',
      stateReason: 'Stable solo interval requires independently observed absence of session ownership AND Local Play staging/transition; no session-acquisition or mixed-mode counters are credited here; actual primary solo Game construction remains applicable.',
      authority: guard||key==='src/game.ts'?'.planning/phases/07-release-evidence-pr/07-03-SOLO-DISPATCH-ARMS.md':['src/session.ts','src/market/run.ts','src/market/types.ts'].includes(key)?'.planning/phases/07-release-evidence-pr/07-03-SOLO-PROJECTION-SCOPE.md':key==='src/mobs.ts'?'.planning/phases/07-release-evidence-pr/07-03-FLOW-MOB-SCOPE.md':authority });
    for (const [id, site] of Object.entries(source.coverage.statementMap)) if (eligible(site)) add('statement', id, undefined, site);
    for (const [id, site] of Object.entries(source.coverage.fnMap)) if ([...ranges, ...functionRanges].some(range => contains(range, site.loc) && contains(range, site.decl))) add('function', id, undefined, site.loc);
    for (const [id, site] of Object.entries(source.coverage.branchMap)) for (const [arm, location] of site.locations.entries()) {
      const guard=provenGuard(site,arm,location);
      if(guard)add('branch',id,arm,site.loc,guard);else if (eligible(location)) add('branch', id, arm, location); else if(syntheticElse(site,arm,location)) add('branch',id,arm,site.loc);
    }
  }
  if (seen.size !== Object.keys(reviewed).length) throw Error('Missing reviewed solo source');
  return dispositions;
}
