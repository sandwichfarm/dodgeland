import { createRequire } from 'node:module';
import { applicabilityIdentity } from './applicability.mjs';
import { builtinRuleDispositions } from './builtin-rule-applicability.mjs';
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
export const BROWSER_STRATUM='browser-presentation-owner-lifecycle';
export const BROWSER_APPLICABILITY_SOURCES=Object.freeze({
 'src/main.ts':'33be7291c0e3c14910039fdb8a1d44e895273f79e132f9a0c9873b3d3166add4',
 'src/gamepad.ts':'be02cdecae3683f9f0b8a5698d90eec393759ce91ea40b24bc18128e7da479e5',
 'src/session-input.ts':'e42c0af885310c699a275aa819c7d66d6902e20164db08cacacf5aee7017da9f',
 'src/mode-rules.ts':'cadda595a1cfa02769eee70e3f925b125b14c7fdf6faf93b9a83f45bb79c89f2',
});
const authority='.planning/phases/07-release-evidence-pr/07-03-BROWSER-SCOPE-FINDING.md';
const before=(a,b)=>a.line<b.line||a.line===b.line&&a.column<=b.column;
const contains=(a,b)=>b?.start&&b?.end&&before(a.start,b.start)&&before(b.end,a.end);
/** Browser application projection only. Node compatibility API remains globally applicable. */
export function browserApplicabilityDispositions({mode,sources,closureSources,canonicalSources,configSources}){
 if(mode!==BROWSER_STRATUM)throw Error('Exact browser application stratum required');
 if(!Array.isArray(sources))throw Error('Source inventory required');
 const selected=new Map();
 for(const source of sources){const path=source.path.replaceAll('\\','/'),key=Object.keys(BROWSER_APPLICABILITY_SOURCES).find(k=>path===k||path.endsWith('/'+k));if(!key)continue;if(selected.has(key))throw Error('Duplicate reviewed source');const identity=applicabilityIdentity(source);if(identity.sourceHash!==BROWSER_APPLICABILITY_SOURCES[key])throw Error('Reviewed browser source changed: '+key);selected.set(key,{source,identity});}
 if(selected.size!==Object.keys(BROWSER_APPLICABILITY_SOURCES).length)throw Error('Missing reviewed browser source');
 const main=selected.get('src/main.ts').source.source,mainTree=ts.createSourceFile('main.ts',main,ts.ScriptTarget.Latest,true),calls=[];
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(mainTree)==='createGamepadControls')calls.push(n);ts.forEachChild(n,visit);}visit(mainTree);
 if(calls.length!==1||calls[0].arguments.length!==5||!ts.isArrowFunction(calls[0].arguments[4])||calls[0].arguments[4].body.getText(mainTree)!=='router.receive(state, now)')throw Error('Reviewed browser snapshot binding absent');
 const{source,identity}=selected.get('src/gamepad.ts'),tree=ts.createSourceFile('gamepad.ts',source.source,ts.ScriptTarget.Latest,true);
 if(tree.parseDiagnostics.length)throw Error('Invalid reviewed source');
 const point=o=>{const p=tree.getLineAndCharacterOfPosition(o);return{line:p.line+1,column:p.character};},span=n=>({start:point(n.getStart(tree)),end:point(n.end)}),ranges=[],functions=[];
 const owner=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='GamepadInput');if(!owner)throw Error('Reviewed compatibility class absent');
 for(const member of owner.members)if(!(member.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword))&&(member.body||member.initializer))ranges.push(span(member));
 for(const name of['pressed','directionOf']){const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);if(!fn?.body)throw Error('Reviewed private helper absent');ranges.push(span(fn.body));functions.push(span(fn));}
 const output=[],emit=(kind,id,arm)=>output.push({mode,path:source.path,...identity,kind,id,...(arm===undefined?{}:{arm}),callReason:'The sole pinned shipped main factory call always supplies onSnapshot; createGamepadControls therefore never constructs GamepadInput. Private pressed/directionOf are called only from that instance closure.',stateReason:'Production browser application payloads only. Exported compatibility API remains in Node, global, per-file and shared-input accounting. Module allocation, factory guards/transport, router and main callbacks remain applicable.',authority});
 for(const[id,site]of Object.entries(source.coverage.statementMap))if(ranges.some(r=>contains(r,site)))emit('statement',id);
 for(const[id,site]of Object.entries(source.coverage.fnMap))if([...ranges,...functions].some(r=>contains(r,site.loc)&&contains(r,site.decl)))emit('function',id);
 for(const[id,site]of Object.entries(source.coverage.branchMap))for(const[arm,loc]of site.locations.entries())if(ranges.some(r=>contains(r,loc)))emit('branch',id,arm);
 return [...output,...builtinRuleDispositions({mode,source:selected.get('src/mode-rules.ts').source,closureSources,canonicalSources,appConfigSources:configSources})];
}
