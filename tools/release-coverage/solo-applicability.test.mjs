import { createRequire } from 'node:module';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { instrumentSources, reportCoverage } from './instrument.mjs';
import { reportApplicability } from './applicability.mjs';
import { soloApplicabilityDispositions as generateSoloDispositions, SOLO_AUTHORITY_PINS } from './solo-applicability.mjs';

const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
const directory = await mkdtemp(join(tmpdir(), 'solo-applicability-'));
after(() => rm(directory, { recursive: true, force: true }));
const root = resolve(new URL('../..', import.meta.url).pathname);
const authoritySources=await Promise.all(Object.keys(SOLO_AUTHORITY_PINS).map(async path=>({path,source:await readFile(join(root,path),'utf8')})));
const audit=JSON.parse(await readFile(join(root,'.planning/phases/07-release-evidence-pr/07-03-PAUSED-MOVEMENT-REFERENCE-AUDIT.json'),'utf8'));
const closureSources=await Promise.all(Object.keys(audit.sourceHashes).filter(path=>!path.endsWith('.d.ts')).map(async path=>({path,source:await readFile(join(root,path),'utf8')})));
const soloApplicabilityDispositions=input=>generateSoloDispositions({authoritySources,closureSources,canonicalSources:closureSources,...input});
const texts = Object.fromEntries(await Promise.all(['src/market/run.ts','src/market/types.ts','src/session.ts', 'src/co-op-market.ts', 'src/game.ts', 'src/recovery.ts', 'src/shared-world-effects.ts', 'src/mobs.ts', 'src/mode-rules.ts', 'src/consumables.ts', 'src/consumable-drops.ts'].map(async path => [path, await readFile(join(root, path), 'utf8')])));
const inventory = instrumentSources(texts, root);
// Explicit synthetic zero realm supplies schema only; this is not runtime credit.
const mapped = await reportCoverage(inventory, [Object.fromEntries(Object.values(inventory).map(row => [row.path, row.zero]))], directory);
const sources = Object.values(inventory).map(row => ({ path: row.path, source: row.source, map: row.map, coverage: mapped.map.fileCoverageFor(row.path).toJSON() }));
const attributed = Object.fromEntries(sources.map(row => [row.path, structuredClone(row.coverage)]));
const session = sources.find(row => row.path.endsWith('/session.ts'));
const line = fragment => session.source.slice(0, session.source.indexOf(fragment)).split('\n').length;

test('actual mapped source excludes only reviewed solo-inapplicable execution and keeps shared owners', () => {
  const before = structuredClone(sources);
  for (const mode of ['solo-arcade', 'solo-flow']) {
    const dispositions = soloApplicabilityDispositions({ mode, sources });
    const excluded = new Set(dispositions.filter(d => d.path === session.path && d.kind === 'function').map(d => d.id));
    const retainedLines=[line('function alias('),line('constructor(game: Game)'),line('noteProgress(row:'),line('constructor(world: SharedWorld')];
    for(const at of retainedLines){
      const ids=Object.entries(session.coverage.fnMap).filter(([,site])=>site.decl.start.line===at).map(([id])=>id);
      assert.ok(ids.length,`retained source line ${at} has a mapped function`);
      for(const id of ids)assert.equal(excluded.has(id),false,`retained shared/uncertain function ${id}`);
    }
    for(const fragment of ['get label()', 'private get rescueFraction()', 'get groundX()', 'get groundY()', 'get personalScore()', 'selectMobTarget(', 'view(): SharedWorld', 'static stage(', 'captureConsumablePolicy(', 'beginFrame(', 'resolvePickups()', 'recordInteraction(event:', 'setHopCooldown(', 'constructor(readonly game: Game', 'constructor(private readonly session: LocalSession']){
      const at=line(fragment),ids=Object.entries(session.coverage.fnMap).filter(([,site])=>site.decl.start.line===at).map(([id])=>id);
      assert.ok(ids.length,`reviewed source line ${at} has a mapped function`);
      for(const id of ids)assert.equal(excluded.has(id),true,`reviewed session-only function ${id}`);
    }
    assert.ok(excluded.size > 180, 'bounded member dispositions include real private item machinery');
    assert.ok(dispositions.some(d => d.path.endsWith('/co-op-market.ts') && d.kind === 'branch'));
    const report = reportApplicability({ mode, sources, attributed, dispositions });
    assert.equal(report.raw.functions.total, Object.values(attributed).reduce((sum, c) => sum + Object.keys(c.f).length, 0));
    assert.ok(report.applicable.functions.total < report.raw.functions.total);
    assert.ok(report.applicable.functions.total > 0);
    assert.deepEqual(report.dispositions, dispositions);
  }
  assert.deepEqual(sources, before);
});

test('production dispositions are deterministic and fail closed on source drift or missing owners', () => {
  const input = { mode: 'solo-arcade', sources };
  assert.deepEqual(soloApplicabilityDispositions(input), soloApplicabilityDispositions(input));
  assert.throws(() => soloApplicabilityDispositions({ ...input, mode: 'race' }), /solo/);
  assert.throws(() => soloApplicabilityDispositions({ ...input, sources: sources.slice(1) }), /Missing/);
  assert.throws(() => soloApplicabilityDispositions({ ...input, sources: [...sources, sources[0]] }), /Duplicate/);
  const changed = structuredClone(sources); changed[0].source += '\n';
  assert.throws(() => soloApplicabilityDispositions({ ...input, sources: changed }), /changed/);
});

test('mapped exclusions cannot conceal an observed solo hit or survive source-map/schema drift', () => {
  const mode = 'solo-arcade', dispositions = soloApplicabilityDispositions({ mode, sources });
  for (const kind of ['statement', 'function', 'branch']) {
    const d = dispositions.find(row => row.kind === kind), hits = structuredClone(attributed);
    if (kind === 'branch') hits[d.path].b[d.id][d.arm] = 1;
    else hits[d.path][kind === 'statement' ? 's' : 'f'][d.id] = 1;
    assert.throws(() => reportApplicability({ mode, sources, attributed: hits, dispositions }), /contradicted/);
  }
  const changed = structuredClone(sources); changed[0].map.file = 'changed.js';
  assert.throws(() => reportApplicability({ mode, sources: changed, attributed, dispositions }), /stale/);
  const schema = structuredClone(sources), hits = structuredClone(attributed);
  schema[0].coverage.fnMap['0'].name = 'changed'; hits[schema[0].path].fnMap['0'].name = 'changed';
  assert.throws(() => reportApplicability({ mode, sources: schema, attributed: hits, dispositions }), /stale/);
});


test('new stage and secondary callback exclusions reject hits while preserving initialization',()=>{
 const mode='solo-arcade',dispositions=soloApplicabilityDispositions({mode,sources});
 const at=line('static stage('),id=Object.entries(session.coverage.fnMap).find(([,site])=>site.decl.start.line===at)[0];
 const hits=structuredClone(attributed);hits[session.path].f[id]=1;
 assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);
 const callbackLine=line("onCoin: SessionPlayerCallbacks['onCoin']");
 const callbackId=Object.entries(session.coverage.fnMap).find(([,site])=>site.decl.start.line===callbackLine)[0];
 assert.ok(dispositions.some(d=>d.path===session.path&&d.kind==='function'&&d.id===callbackId));
 const statements=Object.entries(session.coverage.statementMap).filter(([,site])=>site.start.line===callbackLine);
 assert.ok(statements.length);
 for(const [id]of statements)assert.ok(!dispositions.some(d=>d.path===session.path&&d.kind==='statement'&&d.id===id),'callback allocation remains applicable');
 const alias=Object.entries(session.coverage.fnMap).find(([,site])=>site.decl.start.line===line('function alias('))[0];
 const sharedHits=structuredClone(attributed);sharedHits[session.path].f[alias]=1;
 assert.equal(reportApplicability({mode,sources,attributed:sharedHits,dispositions}).applicable.functions.covered,1);
});


test('Game collector closure excludes exact private bodies but retains solo collector and rejects positive hits',()=>{
 const mode='solo-arcade',dispositions=soloApplicabilityDispositions({mode,sources});
 const game=sources.find(row=>row.path.endsWith('/game.ts'));
 const at=fragment=>game.source.slice(0,game.source.indexOf(fragment)).split('\n').length;
 const functionId=fragment=>Object.entries(game.coverage.fnMap).find(([,site])=>site.decl.start.line===at(fragment))[0];
 const excluded=dispositions.filter(d=>d.path===game.path&&d.kind==='function');
 for(const id of [functionId('private collectSessionCoins('),functionId('private sessionPickupContact(')])assert.ok(excluded.some(d=>d.id===id));
 for(const kind of ['function','statement','branch']){
  const d=dispositions.find(d=>d.path===game.path&&d.kind===kind);assert.ok(d);
  const hits=structuredClone(attributed);if(kind==='branch')hits[d.path].b[d.id][d.arm]=1;else hits[d.path][kind==='function'?'f':'s'][d.id]=1;
  assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);
 }
 const solo=functionId('private collectCoins(');assert.ok(!excluded.some(d=>d.id===solo));
 const hits=structuredClone(attributed);hits[game.path].f[solo]=1;
 assert.equal(reportApplicability({mode,sources,attributed:hits,dispositions}).applicable.functions.covered,1);
 const changed=structuredClone(sources);changed.find(s=>s.path===game.path).source+='\n';
 assert.throws(()=>soloApplicabilityDispositions({mode,sources:changed}),/changed/);
});


test('session service closures retain bootstrap functions and ordinary Game dispatch guards',()=>{
 const selected={
  'game.ts':['operationFor','inPlayerOperation','startPlayer','movePlayer','updateSessionPlayer','damagePlayer','advancePlayerDeathVisuals','advanceSharedWorld','advanceSharedPursuit','awardSessionPickup','updateSessionMobs','setSharedWorldEffects','resetSharedWorldEffects','syncSharedWorldEffects','installWorldExtension','updateSessionWorldExtension'],
  'recovery.ts':['reject','stable','isLivingRecoverySubject','planRecovery','commitRecoveryPlan'],
  'shared-world-effects.ts':['resolveSharedWorldEffects'],
  'consumables.ts':['reject','validGeneration','validId','definition','holdsCapability','sameOwner','chargesFor','validateBase','resulting','targetsFor','planConsumableCredit','planConsumableDebit'],
  'consumable-drops.ts':['freeze','signed','validate','mix32','draw','consumablePickupId','classifyConsumableBucket','classifyItemBucket','sampleConsumableDrop','sampleItemDrop'],
 };
 const kept={'game.ts':['pursuitEnabled','sessionProtected','update','move','collectCoins','ensureRows'], 'consumables.ts':['freeze','validateConsumableCatalogue'], 'consumable-drops.ts':['unsigned','registerConsumableSchema','validateConsumableSchema','consumableSchema']};
 function ids(source,name){
  const rows=source.source.split('\n'),index=rows.findIndex(row=>new RegExp('^\\s*(?:(?:export|private|public|protected|async|get|function|const)\\s+)*'+name+'(?:\\s*[=(<]|\\s*\\()').test(row));assert.ok(index>=0,name);
  const found=Object.entries(source.coverage.fnMap).filter(([,site])=>site.decl.start.line===index+1).map(([id])=>id);assert.ok(found.length,name);return found;
 }
 for(const mode of['solo-arcade','solo-flow']){
  const dispositions=soloApplicabilityDispositions({mode,sources});
  for(const [file,names]of Object.entries(selected)){const source=sources.find(s=>s.path.endsWith('/'+file));for(const name of names)for(const id of ids(source,name))assert.ok(dispositions.some(d=>d.path===source.path&&d.kind==='function'&&d.id===id),'excluded '+name);}
  for(const [file,names]of Object.entries(kept)){const source=sources.find(s=>s.path.endsWith('/'+file));for(const name of names)for(const id of ids(source,name))assert.equal(dispositions.some(d=>d.path===source.path&&d.kind==='function'&&d.id===id),false,'kept '+name);}
  for(const file of Object.keys(selected)){
   const source=sources.find(s=>s.path.endsWith('/'+file)),d=dispositions.find(d=>d.path===source.path&&d.kind==='function'),hits=structuredClone(attributed);assert.ok(d);hits[d.path].f[d.id]=1;assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);
   const changed=structuredClone(sources);changed.find(s=>s.path===source.path).source+='\n';assert.throws(()=>soloApplicabilityDispositions({mode,sources:changed}),/changed/);
   assert.throws(()=>soloApplicabilityDispositions({mode,sources:sources.filter(s=>s.path!==source.path)}),/Missing/);
  }
 }
});


test('Flow excludes only post-disabled-guard mob execution and retains bootstrap plus Arcade',()=>{
 const mob=sources.find(s=>s.path.endsWith('/mobs.ts')),game=sources.find(s=>s.path.endsWith('/game.ts'));
 const at=(source,text)=>{const index=source.source.indexOf(text);assert.ok(index>=0,text);return source.source.slice(0,index).split('\n').length;};
 const ids=(source,text)=>{const found=Object.entries(source.coverage.fnMap).filter(([,site])=>site.decl.start.line===at(source,text)).map(([id])=>id);assert.ok(found.length,text);return found;};
 const flow=soloApplicabilityDispositions({mode:'solo-flow',sources}),arcade=soloApplicabilityDispositions({mode:'solo-arcade',sources});
 assert.equal(arcade.some(d=>d.path===mob.path),false,'all mob behavior stays applicable in Arcade');
 for(const text of['export function mobDefinition(', 'constructor(private rng:', 'update(game: Game,'])for(const id of ids(mob,text))assert.equal(flow.some(d=>d.path===mob.path&&d.kind==='function'&&d.id===id),false,text);
 for(const text of['mobBlocked(x:', 'mobHazard(fromX:', 'private updateMobs('])for(const id of ids(game,text))assert.equal(flow.some(d=>d.path===game.path&&d.kind==='function'&&d.id===id),false,text);
 for(const text of['private clearPath(','private plan(','private walkTarget(','private spawn(','export function mobPacing(','export function mobMotionProgress(','export function mobTuning(','function runTuning(','export function sweptMobContact('])for(const id of ids(mob,text))assert.ok(flow.some(d=>d.path===mob.path&&d.kind==='function'&&d.id===id),text);
 const guard=at(mob,'if (!game.rules.pursuers.enabled)'),sites=Object.entries(mob.coverage.statementMap).filter(([,site])=>site.start.line===guard);assert.ok(sites.length);for(const[id]of sites)assert.equal(flow.some(d=>d.path===mob.path&&d.kind==='statement'&&d.id===id),false,'guard clear and return retained');
 const hits=structuredClone(attributed);for(const id of ids(mob,'export function mobDefinition('))hits[mob.path].f[id]=1;
 assert.ok(reportApplicability({mode:'solo-flow',sources,attributed:hits,dispositions:flow}).applicable.functions.covered>0,'real bootstrap calls remain accountable');
 for(const kind of['statement','function','branch']){const d=flow.find(d=>d.path===mob.path&&d.kind===kind);assert.ok(d);const positive=structuredClone(attributed);if(kind==='branch')positive[d.path].b[d.id][d.arm]=1;else positive[d.path][kind==='function'?'f':'s'][d.id]=1;assert.throws(()=>reportApplicability({mode:'solo-flow',sources,attributed:positive,dispositions:flow}),/contradicted/);}
 for(const file of['mobs.ts','mode-rules.ts','game.ts']){const source=sources.find(s=>s.path.endsWith('/'+file)),changed=structuredClone(sources);changed.find(s=>s.path===source.path).source+='\n';assert.throws(()=>soloApplicabilityDispositions({mode:'solo-flow',sources:changed}),/changed/);assert.throws(()=>soloApplicabilityDispositions({mode:'solo-flow',sources:sources.filter(s=>s.path!==source.path)}),/Missing/);}
 const crossing=structuredClone(sources),m=crossing.find(s=>s.path===mob.path);m.coverage.branchMap.crossing={type:'cond-expr',line:guard,loc:{start:{line:guard,column:0},end:{line:guard+2,column:0}},locations:[{start:{line:guard,column:0},end:{line:guard+2,column:0}}]};m.coverage.b.crossing=[0];assert.equal(soloApplicabilityDispositions({mode:'solo-flow',sources:crossing}).some(d=>d.id==='crossing'),false);
});


test('caller authority is mandatory and stale new callers fail before any counters',()=>{
 assert.throws(()=>generateSoloDispositions({mode:'solo-arcade',sources}),/authority/);
 assert.throws(()=>soloApplicabilityDispositions({mode:'solo-arcade',sources,authoritySources:authoritySources.slice(1)}),/authority/);
 assert.throws(()=>soloApplicabilityDispositions({mode:'solo-arcade',sources,authoritySources:[...authoritySources,authoritySources[0]]}),/duplicate.*authority/);
 const changed=structuredClone(authoritySources);changed[0].source+='\n// new caller';
 assert.throws(()=>soloApplicabilityDispositions({mode:'solo-arcade',sources,authoritySources:changed}),/authority changed/);
 const d=soloApplicabilityDispositions({mode:'solo-arcade',sources});
 for(const suffix of ['/market/run.ts','/market/types.ts']){
  const hit=d.find(x=>x.path.endsWith(suffix)&&x.kind==='function');assert.ok(hit);
  const counts=structuredClone(attributed);counts[hit.path].f[hit.id]=1;
  assert.throws(()=>reportApplicability({mode:'solo-arcade',sources,attributed:counts,dispositions:d}),/contradicted/);
 }
 const types=sources.find(x=>x.path.endsWith('/market/types.ts'));
 const at=types.source.slice(0,types.source.indexOf('export function itemAllowed')).split('\n').length;
 for(const [id,site]of Object.entries(types.coverage.fnMap))if(site.decl.start.line===at)assert.equal(d.some(x=>x.path===types.path&&x.kind==='function'&&x.id===id),false);
});

test('only AST-bound unavailable implicit else arms receive parent proof',()=>{
 const mode='solo-arcade',dispositions=soloApplicabilityDispositions({mode,sources});
 const targets=[];
 for(const suffix of ['/co-op-market.ts','/recovery.ts','/shared-world-effects.ts']){
  const source=sources.find(s=>s.path.endsWith(suffix));
  const entry=Object.entries(source.coverage.branchMap).find(([id,b])=>b.type==='if'&&b.locations.length===2&&JSON.stringify(b.locations[1])==='{"start":{},"end":{}}'&&dispositions.some(d=>d.path===source.path&&d.kind==='branch'&&d.id===id&&d.arm===1));
  assert.ok(entry,'real mapped unavailable implicit else '+suffix+' '+JSON.stringify(Object.entries(source.coverage.branchMap).filter(([,b])=>b.type==='if').slice(0,1).map(([id,b])=>({id,b,keys:Object.keys(b.locations[1].start)}))));const[id,branch]=entry;targets.push({source,id,branch});
  const positive=structuredClone(attributed);positive[source.path].b[id][1]=1;
  assert.throws(()=>reportApplicability({mode,sources,attributed:positive,dispositions}),/contradicted/);
 }
 const {source,id,branch}=targets[0];
 for(const mutate of [b=>{b.type='unknown';},b=>{b.locations[1].start.line=b.loc.start.line;},b=>{b.locations[1].extra=true;},b=>{b.loc.start.column++;},b=>{b.loc.end.line++;},b=>{b.locations.push({start:{},end:{}});}]){
  const altered=structuredClone(sources),row=altered.find(s=>s.path===source.path);mutate(row.coverage.branchMap[id]);
  assert.equal(soloApplicabilityDispositions({mode,sources:altered}).some(d=>d.path===source.path&&d.kind==='branch'&&d.id===id&&d.arm===1),false,'malformed/unknown/nonmatching parent remains applicable');
 }
 const altered=structuredClone(sources),row=altered.find(s=>s.path===source.path);
 row.coverage.branchMap.unmatched={...structuredClone(branch),loc:{start:{line:1,column:0},end:{line:99999,column:0}},locations:[branch.locations[0],{start:{},end:{}}]};row.coverage.b.unmatched=[0,0];
 assert.equal(soloApplicabilityDispositions({mode,sources:altered}).some(d=>d.id==='unmatched'&&d.arm===1),false,'crossing parent cannot prove unavailable else');
 const game=sources.find(s=>s.path.endsWith('/game.ts'));
 for(const[id,b]of Object.entries(game.coverage.branchMap))if(b.type==='if'&&b.locations[1]&&JSON.stringify(b.locations[1])==='{"start":{},"end":{}}'&&!dispositions.some(d=>d.path===game.path&&d.kind==='branch'&&d.id===id&&d.arm===0)){
  const removed=dispositions.find(d=>d.path===game.path&&d.kind==='branch'&&d.id===id&&d.arm===1);
  if(removed)assert.match(removed.callReason,/Only Game.update calls finishPlayerUpdate/,'only separately proved true driver guard may lose its false arm');
 }
});


test('actual explicit else and empty arm zero cannot inherit implicit-else proof',()=>{
 const mode='solo-arcade',dispositions=soloApplicabilityDispositions({mode,sources});
 let selected;
 for(const source of sources){
  const tree=ts.createSourceFile(source.path,source.source,ts.ScriptTarget.Latest,true);
  const explicit=[];const point=offset=>{const p=tree.getLineAndCharacterOfPosition(offset);return {line:p.line+1,column:p.character};};
  const visit=node=>{if(ts.isIfStatement(node)&&node.elseStatement)explicit.push({start:point(node.getStart(tree)),end:point(node.end)});ts.forEachChild(node,visit);};visit(tree);
  for(const[id,b]of Object.entries(source.coverage.branchMap))if(b.type==='if'&&b.locations.length===2&&explicit.some(span=>JSON.stringify(span)===JSON.stringify(b.loc))&&dispositions.some(d=>d.path===source.path&&d.kind==='branch'&&d.id===id&&d.arm===1)){selected={source,id};break;}
  if(selected)break;
 }
 assert.ok(selected,'actual mapped explicit else inside reviewed unavailable range');
 for(const arm of[0,1]){
  const altered=structuredClone(sources),row=altered.find(s=>s.path===selected.source.path);row.coverage.branchMap[selected.id].locations[arm]={start:{},end:{}};
  assert.equal(soloApplicabilityDispositions({mode,sources:altered}).some(d=>d.path===row.path&&d.kind==='branch'&&d.id===selected.id&&d.arm===arm),false,'empty explicit-else/arm-zero remains applicable');
 }
});

test('strict solo dispatch excludes only proved outcomes while guard evaluation and real fallback remain',()=>{
 const game=sources.find(s=>s.path.endsWith('/game.ts')),text=game.source.split('\n');
 for(const mode of['solo-arcade','solo-flow']){
  const dispositions=soloApplicabilityDispositions({mode,sources});
  const has=(kind,id,arm)=>dispositions.some(d=>d.path===game.path&&d.kind===kind&&d.id===id&&(arm===undefined||d.arm===arm));
  for(const [fragment,impossible]of [['if (this.world?.sessionActive) this.syncSharedWorldEffects()',0],['if (this.scoringPlayer) this.scoringPlayer.earnedDistance++',0],['if (this.sessionProtected()) return;',0],['if (sessionPlayer) {',0],['if (sessionSeat) this.world.pickupOwners.delete',0],['if (drivesWorld) this.updateMobs',1]]){
   const at=text.findIndex(line=>line.includes(fragment))+1;assert.ok(at,fragment);
   const candidates=Object.entries(game.coverage.branchMap).filter(([,site])=>site.type==='if'&&site.loc.start.line===at&&site.locations.length===2);
   const entry=candidates.find(([id])=>has('branch',id,impossible));assert.ok(entry,'proved outcome '+fragment);
   const[id,site]=entry;assert.equal(has('branch',id,1-impossible),false,'reachable opposite '+fragment);
   const guards=Object.entries(game.coverage.statementMap).filter(([,s])=>JSON.stringify(s)===JSON.stringify(site.loc));
   assert.ok(guards.length,'actual predicate statement '+fragment);for(const[sid]of guards)assert.equal(has('statement',sid),false);
   const positive=structuredClone(attributed);positive[game.path].b[id][impossible]=1;
   assert.throws(()=>reportApplicability({mode,sources,attributed:positive,dispositions}),/contradicted/);
   for(const mutate of [b=>{b.type='unknown';},b=>{b.loc.start.column++;},b=>{b.loc.end.line++;},b=>{b.locations[impossible]={start:{line:1,column:0},end:{line:99999,column:0}};},b=>{b.locations.push({start:{},end:{}});}]){
    const changed=structuredClone(sources);mutate(changed.find(s=>s.path===game.path).coverage.branchMap[id]);
    assert.equal(soloApplicabilityDispositions({mode,sources:changed}).some(d=>d.path===game.path&&d.kind==='branch'&&d.id===id&&d.arm===impossible),false,'malformed guard proof stays counted');
   }
  }
  // Conditions with other rejection causes do not become wholly false just
  // because one session-related operand is unavailable.
  for(const fragment of["if (this.state !== 'playing' || this.hop > 0",'if (!request || !Number.isFinite(request.amount)',"if (this.pursuitEnabled && this.rules.pursuit.strategy === 'wave')"]){
   const at=text.findIndex(line=>line.includes(fragment))+1;assert.ok(at,fragment);
   const entries=Object.entries(game.coverage.branchMap).filter(([,b])=>b.type==='if'&&b.loc.start.line===at);assert.ok(entries.length);
   for(const[id,b]of entries)for(let arm=0;arm<b.locations.length;arm++)assert.equal(has('branch',id,arm),false,'compound/rule guard retained '+fragment);
  }
 }
});


test('built-in authoring failures are excluded while successful composition and all guards remain',()=>{
 const rules=sources.find(s=>s.path.endsWith('/mode-rules.ts'));
 const at=text=>rules.source.slice(0,rules.source.indexOf(text)).split('\n').length;
 for(const mode of ['solo-arcade','solo-flow']){
  const dispositions=soloApplicabilityDispositions({mode,sources});
  for(const [name,expected]of [['function fail(',true],['function numberAt(',false],['function checkUnknown(',false],['function mergeGroup<',false],['export function composeModeDefinition(',false],['function freeze<',false],['export function isModeDefinition(',false]]){
   const ids=Object.entries(rules.coverage.fnMap).filter(([,f])=>f.decl.start.line===at(name));assert.ok(ids.length,name);
   for(const[id]of ids)assert.equal(dispositions.some(d=>d.path===rules.path&&d.kind==='function'&&d.id===id),expected,name);
  }
 }
});
