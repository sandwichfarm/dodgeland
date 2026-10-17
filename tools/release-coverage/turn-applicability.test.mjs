import test,{after}from'node:test';
import assert from'node:assert/strict';
import{readFile,mkdtemp,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join,resolve}from'node:path';
import{createRequire}from'node:module';
import{instrumentSources,reportCoverage}from'./instrument.mjs';
import{reportApplicability}from'./applicability.mjs';
import{TURN_APPLICABILITY_SOURCES,TURN_AUTHORITY_PINS,turnApplicabilityDispositions as generateTurnDispositions}from'./turn-applicability.mjs';
const directory=await mkdtemp(join(tmpdir(),'turn-applicability-'));after(()=>rm(directory,{recursive:true,force:true}));
const root=resolve(new URL('../..',import.meta.url).pathname);
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
const authoritySources=await Promise.all(Object.keys(TURN_AUTHORITY_PINS).map(async path=>({path,source:await readFile(join(root,path),'utf8')})));
const audit=JSON.parse(await readFile(join(root,'.planning/phases/07-release-evidence-pr/07-03-INNATE-HOP-REFERENCE-AUDIT.json'),'utf8'));
const closureSources=await Promise.all(Object.keys(audit.sourceHashes).filter(path=>!path.endsWith('.d.ts')).map(async path=>({path,source:await readFile(join(root,path),'utf8')})));
const turnApplicabilityDispositions=input=>generateTurnDispositions({authoritySources,closureSources,canonicalSources:closureSources,...input});
const texts=Object.fromEntries(await Promise.all([...new Set([...Object.keys(TURN_APPLICABILITY_SOURCES),'src/mode-rules.ts'])].map(async path=>[path,await readFile(join(root,path),'utf8')])));
const inventory=instrumentSources(texts,root);
// A zero schema realm only, never gameplay evidence or mode coverage credit.
const mapped=await reportCoverage(inventory,[Object.fromEntries(Object.values(inventory).map(row=>[row.path,row.zero]))],directory);
const sources=Object.values(inventory).map(row=>({path:row.path,source:row.source,map:row.map,coverage:mapped.map.fileCoverageFor(row.path).toJSON()}));
const attributed=Object.fromEntries(sources.map(row=>[row.path,structuredClone(row.coverage)]));
const sourceFor=name=>sources.find(row=>row.path.endsWith('/'+name));
const line=(source,fragment)=>{const index=source.source.indexOf(fragment);assert.notEqual(index,-1,fragment);return source.source.slice(0,index).split('\n').length;};
function functionIds(source,fragment){const at=line(source,fragment),ids=Object.entries(source.coverage.fnMap).filter(([,site])=>site.decl.start.line===at).map(([id])=>id);assert.ok(ids.length,fragment);return ids;}
function excluded(dispositions,source,id,kind='function'){return dispositions.some(d=>d.path===source.path&&d.kind===kind&&d.id===id);}

test('standalone update closure requires the complete reviewed caller inventory',()=>{
 for(const mode of ['relay','race']){
  assert.throws(()=>generateTurnDispositions({mode,sources,authoritySources}),/caller inventory/);
  assert.throws(()=>generateTurnDispositions({mode,sources,authoritySources,closureSources}),/caller inventory/);
  for(const canonicalSources of [closureSources.slice(1),closureSources.slice(1).concat(closureSources[1]),closureSources.map(s=>s.path==='src/audio.ts'?{...s,source:s.source+'\n// divergent compiled source'}:s)])assert.throws(()=>turnApplicabilityDispositions({mode,sources,canonicalSources}),/caller inventory/);
  for(const changed of [closureSources.slice(1),[...closureSources,closureSources[0]],[...closureSources,{path:'src/new-caller.ts',source:'export const invoke = game => game.update(1);'}],closureSources.map(s=>s.path==='src/audio.ts'?{...s,source:s.source+'\n// new call edge'}:s)])assert.throws(()=>turnApplicabilityDispositions({mode,sources,closureSources:changed}),/caller inventory/);
  const dispositions=turnApplicabilityDispositions({mode,sources}),game=sourceFor('game.ts');
  for(const fragment of ['  update(dt: number): void {','private updateMobs('])for(const id of functionIds(game,fragment))assert.equal(excluded(dispositions,game,id),true,fragment);
  for(const fragment of ['const sessionSeat = undefined;','const chaseTime = Math.max(0, this.time - this.rules.pursuit.grace)']){
   const lines=game.source.split('\n').flatMap((text,i)=>text.includes(fragment)?[i+1]:[]);
   for(const at of lines.filter(at=>at>=630))for(const [id,site]of Object.entries(game.coverage.statementMap).filter(([,s])=>s.start.line===at))assert.equal(excluded(dispositions,game,id,'statement'),true,fragment+' '+at);
  }
  for(const fragment of ['private finishPlayerUpdate(','private collectCoins(','private collectSessionCoins(','  closeMarket('])for(const id of functionIds(game,fragment))assert.equal(excluded(dispositions,game,id),false,'retained '+fragment);
  const ifLine=line(game,'if (sessionPlayer) { this.collectSessionCoins');
  for(const [id,site]of Object.entries(game.coverage.statementMap).filter(([,s])=>s.start.line===ifLine))assert.equal(excluded(dispositions,game,id,'statement'),false,'shared dispatch retained');
  for(const kind of ['statement','function','branch']){
   const site=dispositions.find(d=>d.kind===kind&&d.authority.endsWith('07-03-TURN-UPDATE-CLOSURE.md'));assert.ok(site,kind);
   const hits=structuredClone(attributed);if(kind==='branch')hits[site.path].b[site.id][site.arm]=1;else hits[site.path][kind==='statement'?'s':'f'][site.id]=1;
   assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/,'new closure rejects actual '+kind+' hits');
  }
 }
});

test('exact opt-in closures are excluded but guards, common world and acquisition remain applicable',()=>{
 const before=structuredClone(sources),session=sourceFor('session.ts'),recovery=sourceFor('session-recovery.ts');
 for(const mode of['relay','race']){
  const dispositions=turnApplicabilityDispositions({mode,sources});assert.ok(dispositions.length);
  for(const fragment of['static stage(','prepareAdmission(admission:','installCoOpMarket(','private refreshSharedWorldEffects()','constructor(game: Game)','noteProgress(row:','releaseInactivePickupClaims('])for(const id of functionIds(session,fragment))assert.equal(excluded(dispositions,session,id),false,fragment);
  const claimLine=line(session,"const activeSeats = new Set(players.filter");
  for(const [map,kind]of [['statementMap','statement'],['fnMap','function'],['branchMap','branch']]){
   const sites=Object.entries(session.coverage[map]).filter(([,site])=>(site.loc??site).start.line===claimLine);
   assert.ok(sites.length,'mapped live pickup predicate '+kind);
   for(const[id]of sites)assert.equal(excluded(dispositions,session,id,kind),false,'live pickup predicate '+kind+' '+id);
  }
  for(const id of functionIds(recovery,'recover(session:'))assert.equal(excluded(dispositions,recovery,id),false);
  const guardLine=line(recovery,"if (!owner || session.result || !this.allowed.includes(request.kind))");
  const guards=Object.entries(recovery.coverage.statementMap).filter(([,site])=>site.start.line===guardLine);assert.ok(guards.length);for(const[id]of guards)assert.equal(excluded(dispositions,recovery,id,'statement'),false);
  for(const id of functionIds(session,'constructor(private readonly session: LocalSession'))assert.equal(excluded(dispositions,session,id),mode==='relay');
  const shared=sourceFor('shared-world-effects.ts');for(const id of functionIds(shared,'export function resolveSharedWorldEffects'))assert.equal(excluded(dispositions,shared,id),true);
  for(const key of['src/relay.ts','src/race.ts'])assert.equal(dispositions.some(d=>d.path.endsWith('/'+key)),false,'no broad '+key+' exclusions');
  for(const[file,fragments]of Object.entries({'game.ts':['openMarket():','  closeMarket(','resetSharedWorldEffects():','syncSharedWorldEffects():','worldExtensionSnapshot<','updateSessionWorldExtension('],'market/run.ts':['constructor(seed:','buy(offerId:','previewPack(ids:','claimPack(ids:','skipPack():','sell(cardId:','tick(dt:','private capacityFor(']})){
   const source=sourceFor(file);for(const fragment of fragments)for(const id of functionIds(source,fragment))assert.equal(excluded(dispositions,source,id),false,'kept '+fragment);
  }
  const report=reportApplicability({mode,sources,attributed,dispositions});assert.ok(report.applicable.functions.total<report.raw.functions.total);assert.deepEqual(report.dispositions,dispositions);
 }
 assert.deepEqual(sources,before);
});

test('caller proof fails closed before counters and exact newly reviewed callable closures stay bounded',()=>{
 for(const mode of['relay','race']){
  assert.throws(()=>generateTurnDispositions({mode,sources}),/authority/);
  assert.throws(()=>turnApplicabilityDispositions({mode,sources,authoritySources:authoritySources.slice(1)}),/authority/);
  assert.throws(()=>turnApplicabilityDispositions({mode,sources,authoritySources:[...authoritySources,authoritySources[0]]}),/duplicate.*authority/);
  for(const[key]of Object.entries(TURN_AUTHORITY_PINS)){
   const changed=structuredClone(authoritySources);changed.find(s=>s.path===key).source+='\n// new caller';
   assert.throws(()=>turnApplicabilityDispositions({mode,sources,authoritySources:changed}),/authority changed/);
  }
  const dispositions=turnApplicabilityDispositions({mode,sources});
  const selection={'game.ts':['export function worldForRow(','export function actorPositions(','syncSharedEffects(player:','setSharedWorldEffects('],
   'session.ts':['selectMobTarget(','view():','installSharedWorldEffects(','sharedWorldEffectsSnapshot()']};
  if(mode==='relay'){
   selection['session.ts'].push('function captureConsumablePolicy(','installConsumableWorld(');
   selection['game.ts'].push('installWorldExtension(');
   selection['consumable-drops.ts']=['export function sampleItemDrop(','export function sampleConsumableDrop(','export function classifyItemBucket('];
   selection['market/run.ts']=['restrictItems(','spendCoins('];
  }else selection['market/run.ts']=['private hold(','private cardPool('];
  for(const[file,fragments]of Object.entries(selection)){
   const source=sourceFor(file);for(const fragment of fragments)for(const id of functionIds(source,fragment))assert.ok(excluded(dispositions,source,id),'excluded '+fragment);
   for(const kind of['statement','function','branch']){
    const d=dispositions.find(d=>d.path===source.path&&d.kind===kind);assert.ok(d,file+' '+kind);
    const hits=structuredClone(attributed);if(kind==='branch')hits[d.path].b[d.id][d.arm]=1;else hits[d.path][kind==='statement'?'s':'f'][d.id]=1;
    assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);
   }
  }
  const drops=sourceFor('consumable-drops.ts');
  for(const text of['export function registerConsumableSchema(','export function validateConsumableSchema(','export function consumableSchema('])for(const id of functionIds(drops,text))assert.equal(excluded(dispositions,drops,id),false,'schema bootstrap retained');
 }
});

test('Race retains legacy action guards while excluding only their impossible success bodies',()=>{
 const source=sourceFor('market/run.ts'),race=turnApplicabilityDispositions({mode:'race',sources}),relay=turnApplicabilityDispositions({mode:'relay',sources});
 for(const fragment of["if (this.pendingPack) return this.fail", "if (!offer || !item || !this.itemEligible(item.id))", 'if (!this.alive || !this.isOpen || !this.market || this.market.remaining <= 0 || !draft', 'if (!preview.valid)', 'if (!this.alive || !this.isOpen || !this.market || this.market.remaining <= 0 || !this.pendingPack)', 'if (index < 0 ||']){
  const at=line(source,fragment),statements=Object.entries(source.coverage.statementMap).filter(([,s])=>s.start.line===at);
  assert.ok(statements.length);for(const[id]of statements)assert.equal(excluded(race,source,id,'statement'),false,'rejection '+fragment);
 }
 for(const fragment of['const capacity = this.capacityFor([...this.cards','const draft: PackDraft =','const existing = this.powers.find','const selected = ids.map','const cards = ids.map','const remaining = this.cards.filter']){
  const at=line(source,fragment),statements=Object.entries(source.coverage.statementMap).filter(([,s])=>s.start.line===at);
  assert.ok(statements.length);for(const[id]of statements){assert.ok(excluded(race,source,id,'statement'),'Race success '+fragment);assert.equal(excluded(relay,source,id,'statement'),false,'Relay purchase '+fragment);}
 }
 const session=sourceFor('session.ts');
 for(const fragment of['if (this.policy) {','if (!this.policy.eligible(owner, action.itemId))','const plan = planConsumableDebit({ catalogue:this.policy!.catalogue']){
  const at=line(session,fragment),statements=Object.entries(session.coverage.statementMap).filter(([,s])=>s.start.line===at);
  assert.ok(statements.length);for(const[id]of statements)assert.equal(excluded(race,session,id,'statement'),false,'tactical policy '+fragment);
 }
});

test('implicit absent-else arms need exact AST containment; malformed and reachable parents stay counted',()=>{
 for(const mode of['relay','race']){
  const dispositions=turnApplicabilityDispositions({mode,sources});
  const source=sourceFor(mode==='relay'?'consumable-drops.ts':'market/run.ts');
  const [id,branch]=Object.entries(source.coverage.branchMap).find(([id,b])=>b.type==='if'&&b.locations.length===2&&JSON.stringify(b.locations[1])==='{"start":{},"end":{}}'&&dispositions.some(d=>d.path===source.path&&d.kind==='branch'&&d.id===id&&d.arm===1))??[];
  assert.ok(branch,'real mapped implicit else');
  const hits=structuredClone(attributed);hits[source.path].b[id][1]=1;assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);
  for(const mutate of[b=>{b.type='unknown';},b=>{b.locations[1].start.line=b.loc.start.line;},b=>{b.locations[1].extra=true;},b=>{b.loc.start.column++;},b=>{b.loc.end.line++;},b=>{b.locations.push({start:{},end:{}});},b=>{b.loc={start:{line:1,column:0},end:{line:99999,column:0}};}]){
   const changed=structuredClone(sources);mutate(changed.find(s=>s.path===source.path).coverage.branchMap[id]);
   assert.equal(turnApplicabilityDispositions({mode,sources:changed}).some(d=>d.path===source.path&&d.kind==='branch'&&d.id===id&&d.arm===1),false);
  }
  const game=sourceFor('game.ts');for(const[id,b]of Object.entries(game.coverage.branchMap))if(b.type==='if'&&b.locations[1]&&JSON.stringify(b.locations[1])==='{"start":{},"end":{}}'&&!dispositions.some(d=>d.path===game.path&&d.kind==='branch'&&d.id===id&&d.arm===0))assert.equal(dispositions.some(d=>d.path===game.path&&d.kind==='branch'&&d.id===id&&d.arm===1),false,'reachable guard');
 }
});

test('empty explicit else or arm zero cannot inherit parent proof',()=>{
 for(const mode of['relay','race']){
  const dispositions=turnApplicabilityDispositions({mode,sources});let selected;
  for(const source of sources){
   const tree=ts.createSourceFile(source.path,source.source,ts.ScriptTarget.Latest,true),explicit=[];
   const point=o=>{const p=tree.getLineAndCharacterOfPosition(o);return {line:p.line+1,column:p.character};};
   const visit=n=>{if(ts.isIfStatement(n)&&n.elseStatement)explicit.push({start:point(n.getStart(tree)),end:point(n.end)});ts.forEachChild(n,visit);};visit(tree);
   for(const[id,b]of Object.entries(source.coverage.branchMap))if(b.type==='if'&&b.locations.length===2&&explicit.some(span=>JSON.stringify(span)===JSON.stringify(b.loc))&&dispositions.some(d=>d.path===source.path&&d.kind==='branch'&&d.id===id&&d.arm===1)){selected={source,id};break;}
   if(selected)break;
  }
  assert.ok(selected,'actual explicit else in reviewed body');
  for(const arm of[0,1]){const changed=structuredClone(sources),row=changed.find(s=>s.path===selected.source.path);row.coverage.branchMap[selected.id].locations[arm]={start:{},end:{}};assert.equal(turnApplicabilityDispositions({mode,sources:changed}).some(d=>d.path===row.path&&d.kind==='branch'&&d.id===selected.id&&d.arm===arm),false);}
 }
});

test('reviewed turn identities fail closed on stale composition, source, missing and duplicate inventory',()=>{
 for(const mode of['relay','race']){
  const input={mode,sources};assert.deepEqual(turnApplicabilityDispositions(input),turnApplicabilityDispositions(input));
  for(const key of Object.keys(TURN_APPLICABILITY_SOURCES)){
   const changed=structuredClone(sources);changed.find(row=>row.path.endsWith('/'+key)).source+='\n';assert.throws(()=>turnApplicabilityDispositions({...input,sources:changed}),/changed/);
  }
  assert.throws(()=>turnApplicabilityDispositions({...input,sources:sources.filter(row=>!row.path.endsWith('/src/relay.ts'))}),/Missing/);
  assert.throws(()=>turnApplicabilityDispositions({...input,sources:[...sources,sourceFor('relay.ts')]}),/Duplicate/);
 }
 assert.throws(()=>turnApplicabilityDispositions({mode:'solo-arcade',sources}),/Turn mode/);
});

test('every excluded counter kind rejects observed positive hits and stale map/schema identities',()=>{
 for(const mode of['relay','race']){
  const dispositions=turnApplicabilityDispositions({mode,sources});
  for(const kind of['statement','function','branch']){
   const d=dispositions.find(d=>d.kind===kind);assert.ok(d,kind);const hits=structuredClone(attributed);
   if(kind==='branch')hits[d.path].b[d.id][d.arm]=1;else hits[d.path][kind==='statement'?'s':'f'][d.id]=1;
   assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);
  }
  const changed=structuredClone(sources);changed.find(row=>row.path.endsWith('/session.ts')).map.file='stale.js';assert.throws(()=>reportApplicability({mode,sources:changed,attributed,dispositions}),/stale/);
  const schema=structuredClone(sources),hits=structuredClone(attributed),s=schema.find(row=>row.path.endsWith('/session.ts'));s.coverage.fnMap['0'].name='changed';hits[s.path].fnMap['0'].name='changed';assert.throws(()=>reportApplicability({mode,sources:schema,attributed:hits,dispositions}),/stale/);
 }
});

test('branch arms crossing a proved range stay applicable and module initialization is retained',()=>{
 const session=sourceFor('session.ts'),start=line(session,'private refreshSharedWorldEffects()');
 const crossing=structuredClone(sources),s=crossing.find(row=>row.path===session.path);
 s.coverage.branchMap['crossing']={type:'cond-expr',line:start,loc:{start:{line:start,column:0},end:{line:start+6,column:0}},locations:[{start:{line:start,column:0},end:{line:start+6,column:0}}]};s.coverage.b.crossing=[0];
 for(const mode of['relay','race']){
  const dispositions=turnApplicabilityDispositions({mode,sources:crossing});assert.equal(dispositions.some(d=>d.id==='crossing'),false);
  const recovery=sourceFor('recovery.ts'),at=line(recovery,'const stable =');
  const allocation=Object.entries(recovery.coverage.statementMap).filter(([,site])=>site.start.line===at&&site.start.column<recovery.source.split('\n')[at-1].indexOf('=>'));
  assert.ok(allocation.length);for(const[id]of allocation)assert.equal(excluded(dispositions,recovery,id,'statement'),false);
 }
});

test('personal-only turn recovery excludes precise Flare paths while safe acquisition remains live',()=>{
 const session=sourceFor('session.ts'),reference='07-03-PERSONAL-CALL-CLOSURE.md';
 for(const mode of ['relay','race']){
  const dispositions=turnApplicabilityDispositions({mode,sources});
  for(const fragment of ['recoverySafeCells(kind:','private safePlacement(','prepareAdmission(admission:','static stage('])for(const id of functionIds(session,fragment))assert.equal(excluded(dispositions,session,id),false,'kept '+fragment);
  for(const id of functionIds(session,'transferPosition(outgoingSeat:'))assert.equal(excluded(dispositions,session,id),mode==='race','Relay transfer is retained; Race has no caller');
  for(const fragment of ['const remaining = cells.filter','const ordered = [...targets].sort','return Object.freeze(ordered.map'])for(const id of functionIds(session,fragment))assert.equal(excluded(dispositions,session,id),true,'Flare-only callback '+fragment);
  for(const fragment of ["const returning = new Set(kind === 'flare'", "      : kind === 'flare'"]){
   const at=line(session,fragment),branches=Object.entries(session.coverage.branchMap).filter(([,site])=>site.loc.start.line===at);assert.ok(branches.length,fragment);
   assert.ok(branches.some(([id])=>dispositions.some(d=>d.path===session.path&&d.kind==='branch'&&d.id===id&&d.arm===0&&d.authority.endsWith(reference))),'exact Flare true operand '+fragment);
  }
  const guardAt=line(session,"    if (kind === 'flare') {"),guards=Object.entries(session.coverage.statementMap).filter(([,site])=>site.start.line===guardAt);assert.ok(guards.length);for(const[id]of guards)assert.equal(excluded(dispositions,session,id,'statement'),false,'outer kind guard remains');
  const selected=dispositions.filter(d=>d.authority.endsWith(reference));assert.ok(selected.length);
  for(const d of selected){
   const hits=structuredClone(attributed);if(d.kind==='branch')hits[d.path].b[d.id][d.arm]=1;else hits[d.path][d.kind==='statement'?'s':'f'][d.id]=1;
   assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/,'every new excluded '+d.kind+' rejects positive hits');
  }
 }
});


test('actual turn modes retain built-in validation but exclude unreachable authoring failures',()=>{
 const rules=sourceFor('mode-rules.ts');assert.ok(rules);
 for(const mode of ['relay','race']){
  const dispositions=turnApplicabilityDispositions({mode,sources});
  for(const [name,expected]of [['function fail(',true],['function numberAt(',false],['function checkUnknown(',false],['function mergeGroup<',false],['export function composeModeDefinition(',false],['function freeze<',false],['export function isModeDefinition(',false]])for(const id of functionIds(rules,name))assert.equal(excluded(dispositions,rules,id),expected,name);
 }
});
