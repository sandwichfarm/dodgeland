import { createRequire } from 'node:module';
import { applicabilityIdentity } from './applicability.mjs';
import { applicationUnusedApplicabilityDispositions } from './application-unused-applicability.mjs';
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
const pins={
 'src/game.ts':'8836f978c5afa8df069b51d9a72ea3bdbd5025b3cb6540d747dbaf14b2aa38cd',
 'src/session.ts':'e90fc363667108ab1608f713e40b479e800930b160c90d9348439f75f0cf38f9',
};
const authority='.planning/phases/07-release-evidence-pr/07-03-APPLICATION-CONSTRUCTION-CLOSURE.md';
const valid=p=>Number.isSafeInteger(p?.line)&&p.line>0&&Number.isSafeInteger(p?.column)&&p.column>=0;
const before=(a,b)=>a.line<b.line||a.line===b.line&&a.column<=b.column;
const contains=(a,b)=>valid(b?.start)&&valid(b?.end)&&before(b.start,b.end)&&before(a.start,b.start)&&before(b.end,a.end);
const same=(a,b)=>valid(a?.start)&&valid(a?.end)&&a.start.line===b?.start?.line&&a.start.column===b?.start?.column&&a.end.line===b?.end?.line&&a.end.column===b?.end?.column;
const empty=p=>p&&typeof p==='object'&&!Array.isArray(p)&&(Object.keys(p).length===0||Object.keys(p).length===2&&Object.hasOwn(p,'line')&&Object.hasOwn(p,'column')&&p.line===undefined&&p.column===undefined);

/** Source accounting only; existing validator binds two complete authorities/configs. */
export function applicationConstructionApplicabilityDispositions(input){
 const {mode,sources}=input;
 if(!['development','browser-presentation-owner-lifecycle'].includes(mode))throw Error('Exact application construction stratum required');
 // Production validation also requires independent canonical authority. Its
 // original output is discarded; the ten-body mapper itself stays unchanged.
 applicationUnusedApplicabilityDispositions({...input,mode:'browser-presentation-owner-lifecycle'});
 const selected=new Map();for(const source of sources){const key=Object.keys(pins).find(p=>source.path===p||source.path.endsWith('/'+p));if(!key)continue;if(selected.has(key))throw Error('Duplicate construction source');const identity=applicabilityIdentity(source);if(identity.sourceHash!==pins[key])throw Error('Reviewed construction source changed');selected.set(key,{source,identity});}
 if(selected.size!==2)throw Error('Missing construction source');
 const output=[];
 for(const[key,{source,identity}]of selected){
  const tree=ts.createSourceFile(key,source.source,ts.ScriptTarget.Latest,true);if(tree.parseDiagnostics.length)throw Error('Invalid construction source');
  const point=o=>{const p=tree.getLineAndCharacterOfPosition(o);return{line:p.line+1,column:p.character};},span=n=>({start:point(n.getStart(tree)),end:point(n.end)}),nodes=[];
  function walk(n){nodes.push(n);ts.forEachChild(n,walk);}walk(tree);
  const method=(owner,name)=>{const cls=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===owner),m=name==='constructor'?cls?.members.find(ts.isConstructorDeclaration):cls?.members.find(n=>n.name?.getText(tree)===name);if(!m?.body)throw Error('Construction member changed: '+owner+'.'+name);return m;};
  const inside=(n,owner)=>n.pos>=owner.pos&&n.end<=owner.end,ranges=[],falseIfs=[],functionRanges=[];
  const add=(n,reason)=>ranges.push({span:span(n),reason});
  const impossible=(n,reason)=>{if(n.elseStatement)throw Error('Construction guard changed');add(n.thenStatement,reason);falseIfs.push({span:span(n),reason});};
  if(key==='src/game.ts'){
   const owner=method('Game','collectCoins'),reason='The unchanged solo remainder binds const sessionSeat=undefined and pickupOwner is consequently undefined. Owner-only then/RHS paths cannot execute; evaluated reads/guards/false outcomes and all real coin behavior remain counted.';
   const declarations=nodes.filter(n=>ts.isVariableDeclaration(n)&&inside(n,owner)&&n.name.getText(tree)==='sessionSeat');if(declarations.length!==1||declarations[0].initializer?.getText(tree)!=='undefined'||!(declarations[0].parent.flags&ts.NodeFlags.Const))throw Error('Solo coin ownership constant changed');
   const ternaries=nodes.filter(n=>ts.isConditionalExpression(n)&&inside(n,owner)&&n.condition.getText(tree)==='sessionSeat');if(ternaries.length!==1)throw Error('Solo owner selection changed');add(ternaries[0].whenTrue,reason);
   const guards=nodes.filter(n=>ts.isIfStatement(n)&&inside(n,owner)&&['sessionSeat','sessionSeat && !pickupOwner','pickupOwner && pickupOwner !== sessionSeat'].includes(n.expression.getText(tree)));if(guards.length!==5)throw Error('Solo owner guards changed');
   for(const guard of guards){impossible(guard,reason);if(ts.isBinaryExpression(guard.expression))add(guard.expression.right,reason);}
  }else{
   const reason='Complete pinned application allocation/call/value closure supplies owned Game world/player,explicit stage options/rosters and admission placement. Actual guards,constructors,live admission/terrain rejection and start/emit remain counted.';
   const player=method('SessionPlayer','constructor'),stage=method('LocalSession','stage'),wrapper=method('LocalSessionStage','commitAdmission'),stageCtor=method('LocalSessionStage','constructor');
   for(const[owner,name]of [[player,'primary'],[stage,'options'],[stageCtor,'originalPrimaryDevice']]){const p=owner.parameters.find(p=>p.name.getText(tree)===name);if(!p?.initializer)throw Error('Construction initializer changed');add(p.initializer,reason);}
   const placements=nodes.filter(n=>ts.isBinaryExpression(n)&&inside(n,player)&&n.operatorToken.kind===ts.SyntaxKind.QuestionQuestionToken&&['placement?.x','placement?.y'].includes(n.left.getText(tree)));if(placements.length!==2)throw Error('Supplied placement fallback changed');for(const n of placements)add(n.right,reason);
   const guard=nodes.filter(n=>ts.isIfStatement(n)&&inside(n,player)&&n.expression.getText(tree)==='spawn === undefined');if(guard.length!==1)throw Error('Supplied spawn guard changed');impossible(guard[0],reason);
   const fallbacks=nodes.filter(n=>ts.isBinaryExpression(n)&&inside(n,stage)&&n.operatorToken.kind===ts.SyntaxKind.QuestionQuestionToken&&['(game as Game & { world?: SharedWorld }).world','(game as Game & { player?: SessionPlayer }).player','options.roster'].includes(n.left.getText(tree)));if(fallbacks.length!==3)throw Error('Owned stage fallbacks changed');for(const n of fallbacks)add(n.right,reason);
   const unused='Complete pinned application reference/import/reflection closure has no call or extraction of LocalSessionStage.commitAdmission. Module/class allocation,commit/cancel,session.admit and every live admission path remain counted.';
   add(wrapper.body,unused);functionRanges.push({span:span(wrapper),reason:unused});
  }
  const eligible=loc=>ranges.find(r=>contains(r.span,loc));
  const emit=(kind,id,r,arm)=>output.push({mode,path:source.path,...identity,kind,id,...(arm===undefined?{}:{arm}),callReason:r.reason,stateReason:'Exact current application entry/build and independent complete158-module source authorities. Global/per-file and public authoring/API callers are unaffected. No hitcount-based inference.',authority});
  for(const[id,loc]of Object.entries(source.coverage.statementMap)){const r=eligible(loc);if(r)emit('statement',id,r);}
  for(const[id,fn]of Object.entries(source.coverage.fnMap)){const r=[...ranges,...functionRanges].find(r=>contains(r.span,fn.loc)&&contains(r.span,fn.decl));if(r)emit('function',id,r);}
  for(const[id,site]of Object.entries(source.coverage.branchMap))for(const[arm,loc]of site.locations.entries()){
   if(!['if','cond-expr','binary-expr','default-arg','switch'].includes(site.type))continue;
   let r=eligible(loc);
   if(!r&&site.type==='if'&&site.locations.length===2&&arm===0&&same(site.loc,loc))r=falseIfs.find(r=>same(r.span,site.loc));
   if(!r&&site.type==='if'&&site.locations.length===2&&arm===1&&empty(loc?.start)&&empty(loc?.end)){
    const matches=nodes.filter(n=>ts.isIfStatement(n)&&!n.elseStatement&&same(span(n),site.loc));if(matches.length===1)r=eligible(span(matches[0]));
   }
   if(r)emit('branch',id,r,arm);
  }
 }
 return output;
}
