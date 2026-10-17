import { createRequire } from 'node:module';
import { applicabilityIdentity } from './applicability.mjs';

const ts = createRequire(new URL('../../package.json', import.meta.url))('typescript');
const reviewed = Object.freeze({
  'src/game.ts': { hash: 'fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6', owner: 'Game', helpers: [], members: ['collectSessionCoins', 'sessionPickupContact'] },
  'src/session.ts': { hash: '5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed', owner: 'LocalSession', helpers: [] },
  'src/co-op-market.ts': { hash: '037a96c9f9436346f06306cac74808aab5e92e205ce2c42bebb1dbd16ca24c22', owner: 'CoOpMarketAdapter', helpers: ['actionId', 'isMarketWindowOpen', 'canBuyOrEquip'] },
});
const authority = '.planning/phases/07-release-evidence-pr/07-03-MODE-SCOPE-FINDING.md';
const before = (a, b) => a.line < b.line || a.line === b.line && a.column <= b.column;
const contains = (outer, inner) => inner?.start && inner?.end && before(outer.start, inner.start) && before(inner.end, outer.end);

/** Reviewed stable-solo applicability only; this does not establish interval provenance. */
export function soloApplicabilityDispositions({ mode, sources }) {
  if (!['solo-arcade', 'solo-flow'].includes(mode)) throw Error('Stable solo mode required');
  if (!Array.isArray(sources)) throw Error('Source inventory required');
  const dispositions = [], seen = new Set();
  for (const source of sources) {
    const path = source.path.replaceAll('\\', '/');
    const key = Object.keys(reviewed).find(key => path === key || path.endsWith('/' + key));
    if (!key) continue;
    if (seen.has(key)) throw Error('Duplicate reviewed source');
    seen.add(key);
    const rule = reviewed[key], identity = applicabilityIdentity(source);
    if (identity.sourceHash !== rule.hash) throw Error('Reviewed solo source changed: ' + key);
    const tree = ts.createSourceFile(key, source.source, ts.ScriptTarget.Latest, true);
    if (tree.parseDiagnostics.length) throw Error('Invalid reviewed source');
    const point = offset => { const p = tree.getLineAndCharacterOfPosition(offset); return { line: p.line + 1, column: p.character }; };
    const span = node => ({ start: point(node.getStart(tree)), end: point(node.end) });
    const ranges = [], functionRanges = [];
    const reasons = [];
    const addRange = (node, reason, functionsOnly = false) => { const range=span(node); (functionsOnly?functionRanges:ranges).push(range); reasons.push({range,reason}); };
    const owner = tree.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === rule.owner);
    if (!owner) throw Error('Reviewed class absent');
    for (const member of owner.members) {
      if (rule.members && !rule.members.includes(member.name?.getText(tree))) continue;
      if (member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) continue;
      // Instance field initializers execute only upon construction. Type-only fields have no sites.
      if (member.body || member.initializer) addRange(member,rule.members ? 'Game.collectCoins calls collectSessionCoins only with world.sessionActive and resolvingPlayer; sessionPickupContact is private and called only by that collector. Strict owned solo cannot enter either body.' : `${rule.owner} instance execution requires LocalSession construction/attachment.`);
    }
    if(rule.members && rule.members.some(name=>!owner.members.some(member=>member.name?.getText(tree)===name&&member.body)))throw Error('Reviewed Game collector absent');
    for (const helper of rule.helpers) {
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
      members('SharedWorld',['beginFrame','update','resolvingPlayer','resolvePlayer','claimPickup','claimPickupPull','resolvePickups','releaseInactivePickupClaims'],'LocalSession.update owns shared frame/update/arbitration; Game.collectCoins enters claims only under sessionActive and resolvingPlayer. Solo Game.update uses its own path.');
      members('SessionPlayer',['setHopCooldown','hopCooldown','canHop','noteHop','interactions','recordInteraction','start','move','update'],'SessionPlayer adapter calls originate in LocalSession/Race; Game scoringPlayer is null on untouched primary solo, gating hop/interaction paths.');
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
    const eligible = site => ranges.some(range => contains(range, site));
    const add = (kind, id, arm, site) => dispositions.push({ mode, path: source.path, ...identity, kind, id,
      ...(arm === undefined ? {} : { arm }),
      callReason: reasons.find(({range})=>contains(range,site))?.reason ?? 'Reviewed session-only callable body.',
      stateReason: 'Stable solo interval requires independently observed absence of session ownership AND Local Play staging/transition; no session-acquisition or mixed-mode counters are credited here; actual primary solo Game construction remains applicable.',
      authority });
    for (const [id, site] of Object.entries(source.coverage.statementMap)) if (eligible(site)) add('statement', id, undefined, site);
    for (const [id, site] of Object.entries(source.coverage.fnMap)) if ([...ranges, ...functionRanges].some(range => contains(range, site.loc) && contains(range, site.decl))) add('function', id, undefined, site.loc);
    for (const [id, site] of Object.entries(source.coverage.branchMap)) for (const [arm, location] of site.locations.entries()) if (eligible(location)) add('branch', id, arm, location);
  }
  if (seen.size !== Object.keys(reviewed).length) throw Error('Missing reviewed solo source');
  return dispositions;
}
