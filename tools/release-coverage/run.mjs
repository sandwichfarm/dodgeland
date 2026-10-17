import {validateSoloDefinition} from './solo-definition-evidence.mjs';
import { mkdir, readFile, writeFile, readdir, cp, rm, stat } from 'node:fs/promises';
import { resolve, join, dirname, relative, matchesGlob } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { globSync, readFileSync, readdirSync } from 'node:fs';
import { buildInventory, repositoryRoot, nodeWorkerBinding } from './inventory.mjs';
import { mergePayloads } from './collector.mjs';
import { developmentApplicabilityDispositions, DEVELOPMENT_CONFIG_PINS } from './development-applicability.mjs';
import { browserApplicabilityDispositions, BROWSER_STRATUM } from './browser-applicability.mjs';
import { reportApplicability } from './applicability.mjs';
import { soloApplicabilityDispositions, SOLO_AUTHORITY_PINS } from './solo-applicability.mjs';
import { turnApplicabilityDispositions, TURN_APPLICABILITY_SOURCES, TURN_AUTHORITY_PINS } from './turn-applicability.mjs';
import { reportCoverage, hash } from './instrument.mjs';
import { pathToFileURL } from 'node:url';
import { validateIntervals, modes } from './attribution.mjs';
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');

export function resolveCommandInventory(scripts,canonicalSource,tracked){
 const entries=new Map(),commands=[],seen=new Set();
 const expand=token=>{if(/[\$`]/.test(token))throw Error(`Unresolved shell expression ${token}`);if(/[*?[]/.test(token)){const found=tracked.filter(p=>matchesGlob(p,token));if(!found.length)throw Error(`Unmatched command glob ${token}`);return found;}return [token];};
 function command(executable,args,env={},origin='canonical',stack=[]){
  if(executable==='pnpm'&&scripts[args[0]]){const name=args[0];if(stack.includes(name))throw Error('Package script cycle');shell(scripts[name],`package:${name}`,[...stack,name]);return;}
  const record={executable,args,env,origin};const key=JSON.stringify(record);if(!seen.has(key)){commands.push(record);seen.add(key);}
  if(executable!=='node')return;
  for(const arg of args.filter(a=>!a.startsWith('-')))for(const path of expand(arg)){
   if(!path.endsWith('.mjs'))throw Error(`Unresolved node entry ${path}`);
   if(!tracked.includes(path))throw Error(`Unmatched node entry ${path}`);
   if(!entries.has(path))entries.set(path,{path,origins:[]});entries.get(path).origins.push(origin);
  }
 }
 function shell(text,origin,stack){
  if(/[\$`]/.test(text))throw Error(`Unresolved shell expression in ${origin}`);
  // The repository scripts use quoted argv and &&. Unknown shell control flow fails closed.
  const tokens=text.match(/"(?:[^"\\]|\\.)*"|'[^']*'|&&|[^\s]+/g)??[];let part=[];
  const flush=()=>{if(!part.length)return;const env={};while(/^[A-Z_][A-Z0-9_]*=/.test(part[0]??'')){const token=part.shift(),at=token.indexOf('=');env[token.slice(0,at)]=token.slice(at+1);}const executable=part.shift();if(part.some(t=>/[;|<>]/.test(t)))throw Error('Unresolved shell control flow');command(executable,part,env,origin,stack);part=[];};
  for(const token of tokens){if(token==='&&'){flush();continue;}part.push(/^['"]/.test(token)?token.slice(1,-1):token);}flush();
 }
 for(const name of Object.keys(scripts).filter(n=>n.startsWith('test:')||n.startsWith('audio:')))shell(scripts[name],`package:${name}`,[name]);
 const source=ts.createSourceFile('phase6-gate.mjs',canonicalSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),bindings=new Map();
 function value(node){if(ts.isStringLiteralLike(node))return node.text;if(ts.isIdentifier(node)&&bindings.has(node.text))return bindings.get(node.text);if(ts.isArrayLiteralExpression(node))return node.elements.flatMap(e=>ts.isSpreadElement(e)?value(e.expression):[value(e)]);throw Error(`Unresolved canonical expression ${node.getText(source)}`);}
 for(const statement of source.statements)if(ts.isVariableStatement(statement))for(const d of statement.declarationList.declarations)if(ts.isIdentifier(d.name)&&d.initializer)bindings.set(d.name.text,value(d.initializer));
 if(!bindings.has('blocks'))throw Error('Missing canonical command blocks');
 for(const [name,rows]of bindings.get('blocks'))for(const [exe,args]of rows)command(exe,args,{},`phase6:${name}`);
 return {entries:[...entries.values()].sort((a,b)=>a.path.localeCompare(b.path)),commands};
}

export function expectedNodeRealms(jobs,workerRoles){
 const realms=[],filenames=new Set();
 for(const job of jobs){
  const role=workerRoles[job.file];
  if(job.nodeRealmId!==undefined&&(role!=='mixed'||job.modelAttribution||job.nodeRealmId!==`${job.file}#${job.id}`))throw Error('Invalid alternate Node job identity');
  if(!['node','mixed'].includes(role))continue;
  const realmId=job.nodeRealmId??job.file;
  const binding=nodeWorkerBinding({jobId:job.id,nodeRealmId:job.nodeRealmId,workerRoles,expectedWorkers:[job.file],expectedRealms:[realmId]},job.file);
  if(realms.includes(realmId)||filenames.has(binding.filename))throw Error('Duplicate Node parent or output');
  realms.push(realmId);filenames.add(binding.filename);
 }
 return realms;
}

export function validateFullManifest(manifest,inventory){
 if(!manifest.complete||!manifest.execution)throw Error('Full collection incomplete');
 const {jobs,controls}=manifest.execution;if(!jobs?.length||!Array.isArray(controls))throw Error('Missing execution jobs/controls');
 const ids=new Set();for(const job of jobs){if(ids.has(job.id))throw Error('Duplicate job');ids.add(job.id);if(!['node','browser','mixed'].includes(job.role)||!job.requiredRealms?.length||JSON.stringify(job.requiredRealms)!==JSON.stringify(job.role==='mixed'?['node','browser']:[job.role]))throw Error('Missing declared realm requirements');}
 for(const entry of inventory.entries)if(!jobs.some(j=>j.file===entry.path)&&!controls.includes(entry.path))throw Error(`Missing owner ${entry.path}`);
 expectedNodeRealms(jobs,Object.fromEntries(jobs.map(job=>[job.file,job.role])));
 const variantFiles=new Set(inventory.commands.filter(c=>c.env.DOWN_TO_DUCK_AUDIO_BROWSER).flatMap(c=>c.args.filter(p=>p.endsWith('.mjs'))));
 for(const c of inventory.commands)for(const file of c.args.filter(p=>variantFiles.has(p))){const browser=c.env.DOWN_TO_DUCK_AUDIO_BROWSER??'chromium';if(!jobs.some(j=>j.file===file&&(j.env?.DOWN_TO_DUCK_AUDIO_BROWSER??'chromium')===browser))throw Error(`Missing browser variant ${file}: ${browser}`);}
 return true;
}

export async function auditExecutionInventory(manifest){
 const tracked=spawnSync('git',['ls-files','-z'],{cwd:repositoryRoot,encoding:'utf8'});if(tracked.status!==0)throw Error('Tracked command inventory failed');
 const paths=tracked.stdout.split('\0').filter(Boolean),pkg=JSON.parse(await readFile(join(repositoryRoot,'package.json'),'utf8'));
 const resolved=resolveCommandInventory(pkg.scripts,await readFile(join(repositoryRoot,'tests/phase6-gate.mjs'),'utf8'),paths);
 // This plan's new original-purpose suite is an explicit additive entry, never a replacement.
 resolved.entries.push({path:'tools/release-coverage/turn-reuse-attribution.test.mjs',origins:['plan07-03:turn-reuse-attribution-calibration']},{path:'tools/release-coverage/development-applicability.test.mjs',origins:['plan07-03:development-applicability-calibration']},{path:'tools/release-coverage/node-job-identity.test.mjs',origins:['plan07-03:repeated-mixed-parent-calibration']},{path:'tools/release-coverage/development-artifact.test.mjs',origins:['plan07-03:development-artifact-calibration']},{path:'tests/release-solo-bootstrap.test.mjs',origins:['plan07-03:solo-bootstrap-attribution']},{path:'tests/release-mode-coverage.mjs',origins:['plan07-12:mode-attribution']},{path:'tests/release-survive-mode-coverage.test.mjs',origins:['plan07-03:component-mode-attribution']},{path:'tests/release-solo-mode-coverage.test.mjs',origins:['plan07-03:solo-component-attribution']},{path:'tests/release-turn-mode-coverage.test.mjs',origins:['plan07-03:turn-component-attribution']});resolved.entries.sort((a,b)=>a.path.localeCompare(b.path));
 const closure=new Map(),queue=resolved.entries.map(r=>r.path);
 while(queue.length){const path=queue.shift();if(closure.has(path))continue;const text=await readFile(join(repositoryRoot,path),'utf8'),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),imports=[],dynamic=[];
  function add(spec){if(!spec.startsWith('.'))return;const target=relative(repositoryRoot,resolve(repositoryRoot,dirname(path),spec));if(!paths.includes(target))throw Error(`Unresolved local import ${path}: ${spec}`);imports.push(target);if(target.startsWith('tests/'))queue.push(target);}
  function visit(node){if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier))add(node.moduleSpecifier.text);if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword){const arg=node.arguments[0];if(ts.isStringLiteralLike(arg))add(arg.text);else dynamic.push(arg.getText(source));}ts.forEachChild(node,visit);}visit(source);
  const approved=manifest.execution?.dynamicImports?.[path]??[];for(const expression of dynamic)if(!approved.some(row=>row.expression===expression&&row.resolution))throw Error(`Unresolved dynamic import ${path}: ${expression}`);
  const entry=resolved.entries.some(r=>r.path===path),job=manifest.execution?.jobs?.find(j=>j.file===path);
  const disposition=entry?(manifest.execution?.controls?.includes(path)?'control':job?.role??'unclassified-entry'):manifest.execution?.closureDispositions?.[path];
  if(!entry&&!disposition)throw Error(`Unclassified transitive responsibility ${path}`);
  closure.set(path,{path,origins:resolved.entries.find(r=>r.path===path)?.origins??['local-import'],imports,dynamic,dynamicResolutions:approved,sourceHash:hash(text),disposition});
 }
 const developmentControls=[];for(const name of ['dev','dev:app','preview','preview:dev'])if(pkg.scripts[name])developmentControls.push({name,command:pkg.scripts[name],disposition:'interactive development control; not a production coverage worker'});
 const devSource=await readFile(join(repositoryRoot,'tools/dev.mjs'),'utf8');developmentControls.push({path:'tools/dev.mjs',sourceHash:hash(devSource),imports:[...devSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]),disposition:'User-requested Paja launcher; no application counter contribution'});
 return {...resolved,closure:[...closure.values()].sort((a,b)=>a.path.localeCompare(b.path)),developmentControls,startingDiscovery:{entries:133,closure:138},scope:'Mechanically resolved current package commands, canonical arrays and local import closure; counts are discovery, not executed suites'};
}

export async function preserveJobArtifacts(job,directory,action){
 const patterns=job.artifactPatterns??[];
 for(const pattern of patterns)if(!pattern.startsWith('artifacts/')||pattern.includes('..')||pattern==='artifacts/**'||pattern.startsWith('artifacts/release-coverage'))throw Error('Unsafe artifact preservation pattern');
 const expand=()=>{const found=[...new Set(patterns.flatMap(p=>globSync(p,{cwd:repositoryRoot})))].sort();return found.filter(p=>!found.some(parent=>p!==parent&&p.startsWith(parent+'/')));};
 const originals=expand(),backups=join(directory,'prior-artifacts',job.id);for(const path of originals)await cp(join(repositoryRoot,path),join(backups,path),{recursive:true});
 try{return await action();}finally{for(const path of expand()){await cp(join(repositoryRoot,path),join(directory,'suite-artifacts',job.id,path),{recursive:true});await rm(join(repositoryRoot,path),{recursive:true,force:true});}for(const path of originals)await cp(join(backups,path),join(repositoryRoot,path),{recursive:true});}
}

export function validateModeRows(inventory,rows,required=modes){
 const intervals=validateIntervals(inventory,rows.flatMap(r=>r.intervals??[]));
 const totals=new Map();
 for(const interval of intervals){
  const parents=rows.filter(r=>r.realmId===interval.parentRealm&&r.payload?.runId===interval.runId);
  const parent=parents[0];
  if(parents.length!==1||!parent?.payload||interval.artifactHash!==(parent.identity?.artifactHash??parent.artifactHash)||interval.jobId!==(parent.identity?.jobId??parent.identity?.suite))throw Error('Missing/mismatched interval parent');
  const parentKey=JSON.stringify([interval.runId,interval.parentRealm]);
  if(!totals.has(parentKey)){
   mergePayloads(inventory,[parent.payload],{runId:interval.runId,expectedRealms:[interval.parentRealm]});
   totals.set(parentKey,new Map());
  }
  const sums=totals.get(parentKey);
  for(const [path,file]of Object.entries(interval.payload.coverage))for(const metric of ['s','f','b'])for(const key of Object.keys(file[metric])){
   const counts=metric==='b'?file[metric][key]:[file[metric][key]],whole=metric==='b'?parent.payload.coverage[path]?.[metric][key]:[parent.payload.coverage[path]?.[metric][key]];
   for(const [arm,n]of counts.entries()){
    const site=JSON.stringify([path,metric,key,arm]),sum=(sums.get(site)??0)+n;
    if(!Number.isSafeInteger(sum))throw Error('Unsafe aggregate interval counter');
    if(!whole||!Number.isSafeInteger(whole[arm])||sum>whole[arm])throw Error('Interval aggregate exceeds parent counters');
    sums.set(site,sum);
   }
  }
 }
 for(const mode of required)if(!intervals.some(i=>i.mode===mode))throw Error(`Missing exclusive mode ${mode}`);
 return intervals;
}

export function validateModelSidecar(inventory,row,parents,{runId,jobId,realmId,artifactHash,expectations}){
 if(row?.identity?.provenance!=='component-model'||row.identity.jobId!==jobId||row.identity.runId!==runId||row.identity.realmId!==realmId||row.identity.artifactHash!==artifactHash)throw Error('Model sidecar identity mismatch');
 const found=parents.filter(p=>p.runId===runId&&p.realmId===realmId);
 if(found.length!==1||JSON.stringify(row.payload)!==JSON.stringify(found[0]))throw Error('Model sidecar differs from independent Node parent');
 if(!Array.isArray(expectations)||!expectations.length||new Set(expectations.map(e=>e.mode)).size!==expectations.length)throw Error('Invalid model expectations');
 const bound={...row,realmId,payload:found[0]};
 const intervals=validateModeRows(inventory,[bound],expectations.map(e=>e.mode));
 if(intervals.some(i=>i.provenance!=='component-model'||!expectations.some(e=>e.mode===i.mode)))throw Error('Unexpected model interval');
 for(const expected of expectations){
  const actual=intervals.filter(i=>i.mode===expected.mode);
  if(expected.scenarios){
   if(actual.length!==expected.scenarios.length*2||new Set(expected.scenarios).size!==expected.scenarios.length)throw Error('Incomplete solo scenarios');
   for(const [index,name]of expected.scenarios.entries()){
    const [acquisition,runtime]=actual.slice(index*2,index*2+2);
    if(acquisition.id!==`${name}:acquisition`||runtime.id!==`${name}:runtime`||acquisition.observation.phase!=='acquiring'||acquisition.endObservation.phase!=='ready'||runtime.observation.phase!=='ready'||acquisition.endObservation.ownerId!==name||runtime.endObservation.ownerId!==name)throw Error('Incomplete solo scenario lifecycle');
   }
  }else{
   if(actual.length!==expected.phases.length||actual.some((i,n)=>i.observation.phase!==expected.phases[n][0]||i.endObservation.phase!==expected.phases[n][1]))throw Error('Incomplete model lifecycle intervals');
   const lifetimes=expected.lifetimes??1;
   if(!Number.isSafeInteger(lifetimes)||lifetimes<1||new Set(actual.map(i=>i.endObservation.sessionId)).size!==lifetimes||actual.filter(i=>i.observation.phase==='acquiring').length!==lifetimes)throw Error('Unexpected model session lifetimes');
   const acquired=new Set();let activeSession;
   for(const interval of actual){if(interval.observation.phase==='acquiring'){if(acquired.has(interval.endObservation.sessionId))throw Error('Repeated model session acquisition');acquired.add(interval.endObservation.sessionId);activeSession=interval.endObservation.sessionId;}else if(interval.observation.sessionId!==activeSession||interval.endObservation.sessionId!==activeSession)throw Error('Unbound model session lifetime');}
  }
 }
 return bound;
}

export function projectSoloApplicability(mode,inventory,mapped,paths,intervals){
 const witnesses=intervals.filter(i=>i.mode===mode);
 for(const witness of witnesses)for(const observed of (witness.provenance==='component-model'?[witness.observation,witness.endObservation]:[witness.observation]))if(observed?.phase!=='acquiring')validateSoloDefinition(observed?.definitionEvidence,observed?.base);
 if(!witnesses.length||witnesses.some(i=>{
  if(i.provenance==='public-input')return Object.entries({worldIsOwn:true,playerIsOwn:true,sessionActive:false,playerSessionAbsent:true,sessionBindings:0,stageBindings:0}).some(([key,value])=>i.observation?.ownership?.[key]!==value);
  if(i.provenance!=='component-model')return true;
  const observations=i.observation.phase==='acquiring'?[i.endObservation]:[i.observation,i.endObservation];
  return observations.some(o=>!o||Object.entries({worldIsOwn:true,playerIsOwn:true,sessionActive:false,playerSessionAbsent:true,stageCalls:0}).some(([key,value])=>o.ownership?.[key]!==value)||!(o.ownership.boundaryChecks>0));
 }))throw Error('Solo applicability requires actual stable ownership');
 const sources=paths.map(path=>{
  const absolute=resolve(repositoryRoot,path),record=Object.values(inventory).find(r=>r.path===absolute);
  if(!record||!mapped[absolute])throw Error('Missing mapped applicability source');
  return {path:absolute,source:record.source,map:record.map,coverage:mapped[absolute]};
 });
 const attributed=Object.fromEntries(sources.map(s=>[s.path,mapped[s.path]]));
 return reportApplicability({mode,sources,attributed,dispositions:soloApplicabilityDispositions({mode,sources,authoritySources:Object.keys(SOLO_AUTHORITY_PINS).map(path=>{const record=Object.values(inventory).find(r=>r.path===resolve(repositoryRoot,path));if(!record)throw Error("Missing solo caller authority: "+path);return {path,source:record.source};})})});
}

export function projectTurnApplicability(mode,inventory,mapped,paths,intervals){
 if(!['relay','race'].includes(mode))throw Error('Turn applicability mode required');
 const witnesses=intervals.filter(i=>i.mode===mode);
 if(!witnesses.length)throw Error('Turn applicability requires actual mode witnesses');
 validateIntervals(inventory,witnesses);
 const sources=paths.map(path=>{
  const absolute=resolve(repositoryRoot,path),record=Object.values(inventory).find(r=>r.path===absolute);
  if(!record||!mapped[absolute])throw Error('Missing mapped applicability source');
  return {path:absolute,source:record.source,map:record.map,coverage:mapped[absolute]};
 });
 const attributed=Object.fromEntries(sources.map(s=>[s.path,mapped[s.path]]));
 const authoritySources=Object.keys(TURN_APPLICABILITY_SOURCES).filter(path=>!paths.includes(path)).map(path=>{
  const absolute=resolve(repositoryRoot,path),record=Object.values(inventory).find(r=>r.path===absolute);
  if(!record||!mapped[absolute])throw Error('Missing mapped turn authority source');
  return {path:absolute,source:record.source,map:record.map,coverage:mapped[absolute]};
 });
 const callerSources=Object.keys(TURN_AUTHORITY_PINS).map(path=>{const record=Object.values(inventory).find(r=>r.path===resolve(repositoryRoot,path));if(!record)throw Error('Missing turn caller authority: '+path);return {path,source:record.source};});
 // Check disk independently: tracked-only inventory must not hide a new caller.
 const names=readdirSync(join(repositoryRoot,'src'),{recursive:true}).filter(path=>/\.(ts|tsx|js|mjs)$/.test(path)&&!path.endsWith('.d.ts')).sort();
 const closureSources=names.map(path=>({path:'src/'+path.replaceAll('\\','/'),source:readFileSync(join(repositoryRoot,'src',path),'utf8')}));
 const canonicalSources=Object.values(inventory).map(record=>({path:record.path,source:record.source}));
 const dispositions=turnApplicabilityDispositions({mode,sources:[...sources,...authoritySources],authoritySources:callerSources,closureSources,canonicalSources});
 if(dispositions.some(d=>!sources.some(source=>source.path===d.path)))throw Error('Turn authority outside stratum cannot carry dispositions');
 return {...reportApplicability({mode,sources,attributed,dispositions}),authoritySources:[...authoritySources,...callerSources].map(source=>({path:source.path,sourceHash:hash(source.source)}))};
}

export function projectBrowserApplicability(inventory,mapped,paths,rows){
 if(!rows.length||rows.some(row=>row.status!=='collected'||row.identity?.buildScope!=='production'||!row.identity?.artifactHash||!row.identity?.jobId||!row.payload))throw Error('Browser applicability requires collected production application realms');
 const sources=paths.map(path=>{
  const absolute=resolve(repositoryRoot,path),record=Object.values(inventory).find(r=>r.path===absolute);
  if(!record||!mapped[absolute])throw Error('Missing mapped browser applicability source');
  return {path:absolute,source:record.source,map:record.map,coverage:mapped[absolute]};
 });
 const attributed=Object.fromEntries(sources.map(s=>[s.path,mapped[s.path]]));
 return reportApplicability({mode:BROWSER_STRATUM,sources,attributed,dispositions:browserApplicabilityDispositions({mode:BROWSER_STRATUM,sources})});
}

/** DEV projection requires the real collected application's artifact proof, never a Node scope label. */
export async function projectDevelopmentApplicability(inventory,mapped,paths,rows,build){
 if(!rows.length||!build?.artifactHash||rows.some(row=>row.status!=='collected'||row.identity?.scope!=='current'||row.identity?.buildScope!=='development'||!row.identity?.jobId||!row.realmId?.startsWith('browser:')||row.payload?.realmId!==row.realmId||row.identity.artifactHash!==build.artifactHash||row.artifactProof?.buildScope!=='development'||row.artifactProof?.artifactHash!==build.artifactHash||row.artifactProof?.developmentTools!==true||!Array.isArray(row.artifactProof?.scriptHashes)||!row.artifactProof.scriptHashes.length||row.artifactProof.scriptHashes.some(h=>!(/^[a-f0-9]{64}$/).test(h))))throw Error('Development applicability requires verified collected current DEV application realms');
 if(typeof build.artifact!=='string'||!build.artifact)throw Error('Missing development artifact path');
 let bytes;try{bytes=await readFile(build.artifact);}catch{throw Error('Missing or unreadable development artifact');}
 if(hash(bytes)!==build.artifactHash)throw Error('Development artifact bytes/hash mismatch');
 // Match browser.verifyArtifactScope: nonempty inline scripts, source order,
 // and JSON-string digest for each script (Buffer hash for the HTML artifact).
 const scripts=[...bytes.toString('utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(text=>text.trim());
 const expectedScripts=scripts.map(script=>hash(JSON.stringify(script)));
 if(!expectedScripts.length||rows.some(row=>JSON.stringify(row.artifactProof.scriptHashes)!==JSON.stringify(expectedScripts)))throw Error('Development executed inline script proof mismatch');
 const sources=paths.map(path=>{
  const absolute=resolve(repositoryRoot,path),record=Object.values(inventory).find(r=>r.path===absolute);
  if(!record||!mapped[absolute])throw Error('Missing mapped development applicability source');
  return {path:absolute,source:record.source,map:record.map,coverage:mapped[absolute]};
 });
 // Inspect the complete current source inventory, including newly added files;
 // tracked-only instrumentation inventory cannot hide an untracked new caller.
 const names=(await readdir(join(repositoryRoot,'src'),{recursive:true})).filter(p=>/\.(ts|tsx|js|mjs)$/.test(p)&&!p.endsWith('.d.ts')).sort();
 const authoritySources=await Promise.all(names.map(async p=>({path:'src/'+p.replaceAll('\\','/'),source:await readFile(join(repositoryRoot,'src',p),'utf8')})));
 const configSources=await Promise.all(Object.keys(DEVELOPMENT_CONFIG_PINS).map(async path=>({path,source:await readFile(join(repositoryRoot,path),'utf8')})));
 // The built canonical graph must agree with reviewed disk authority in full,
 // not just the three files whose callable bodies receive dispositions.
 const canonicalSources=Object.values(inventory).map(record=>({path:relative(repositoryRoot,record.path).replaceAll('\\','/'),source:record.source})).filter(s=>/\.(ts|tsx|js|mjs)$/.test(s.path)&&!s.path.endsWith('.d.ts'));
 const actual=new Map();for(const source of canonicalSources){if(actual.has(source.path))throw Error('Duplicate canonical development source');actual.set(source.path,source.source);}
 if(actual.size!==authoritySources.length||authoritySources.some(s=>actual.get(s.path)!==s.source))throw Error('Canonical development source inventory differs from reviewed authority');
 const attributed=Object.fromEntries(sources.map(s=>[s.path,mapped[s.path]]));
 const dispositions=developmentApplicabilityDispositions({mode:'development',sources,authoritySources,configSources});
 return {...reportApplicability({mode:'development',sources,attributed,dispositions}),authoritySources:authoritySources.map(s=>({path:s.path,sourceHash:hash(s.source)})),configSources:configSources.map(s=>({path:s.path,sourceHash:hash(s.source)}))};
}

export function evaluatePolicy(policy,files,strata){
 const failures=[];
 const check=(name,summary,floors)=>{
  if(!summary)throw Error(`Missing coverage group ${name}`);
  for(const metric of ['lines','functions','branches']){
   const {total,covered}=summary[metric]??{};
   if(!Number.isSafeInteger(total)||!Number.isSafeInteger(covered)||total<0||covered<0||covered>total)throw Error(`Invalid metric ${name}/${metric}`);
   const floor=floors?.[metric];if(!Number.isInteger(floor)||floor<0||floor>100)throw Error('Invalid policy floor');
   if(total&&BigInt(covered)*100n<BigInt(total)*BigInt(floor))failures.push({name,metric,covered,total,floor});
  }
 };
 if(!policy?.files?.length||new Set(policy.files).size!==policy.files.length)throw Error('Empty or duplicate policy inventory');
 if(Object.keys(files).sort().join('\n')!==[...policy.files].sort().join('\n'))throw Error('Policy source inventory mismatch');
 const global=Object.fromEntries(['lines','functions','branches'].map(m=>[m,{total:0,covered:0}]));
 for(const name of policy.files){check(name,files[name],policy.critical.includes(name)?policy.floors.critical:policy.floors.ordinary);for(const m of Object.keys(global)){global[m].total+=files[name][m].total;global[m].covered+=files[name][m].covered;}}
 if(!global.lines.total&&!global.functions.total)throw Error('Empty executable report');
 check('global',global,policy.floors.global);
 if(!policy.strata||!Object.keys(policy.strata).length)throw Error('Empty policy strata');
 for(const [name,paths]of Object.entries(policy.strata)){
  if(!paths.length||new Set(paths).size!==paths.length||paths.some(p=>!policy.files.includes(p)))throw Error(`Invalid stratum ${name}`);
  check(name,strata?.[name],policy.floors.mode);
 }
 return {pass:failures.length===0,failures};
}
function run(command,args,env){const r=spawnSync(command,args,{cwd:repositoryRoot,env,stdio:'inherit'});if(r.error||r.signal||r.status!==0)throw Error(`Command failed: ${command} ${args.join(' ')} (${r.error?.message??r.signal??r.status})`);}

async function main(){
 const args=process.argv.slice(2);let suite,output,reportOnly=false,checkPolicy=false;
 for(let i=0;i<args.length;i++){if(args[i]==='--suite')suite=args[++i];else if(args[i]==='--output')output=resolve(args[++i]);else if(args[i]==='--report-only')reportOnly=true;else if(args[i]==='--check-policy')checkPolicy=true;else throw Error(`Unknown option ${args[i]}`);}
 const data=await buildInventory();
 if(checkPolicy){const policy=JSON.parse(await readFile(new URL('./policy.json',import.meta.url),'utf8'));const names=data.files.filter(r=>r.kind==='executable').map(r=>r.path);if(JSON.stringify(names)!==JSON.stringify(policy.files))throw Error('Policy inventory stale');if(policy.critical.some(p=>!names.includes(p)))throw Error('Unknown critical source');console.log('Policy inventory matches every executable source.');return;}
 let manifest;try{manifest=JSON.parse(await readFile(new URL('./suites.json',import.meta.url),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const foundation={'shared-tracer':{files:['tests/local-session.test.mjs','tests/session-world.test.mjs'],role:'node'},'browser-tracer':{files:['tests/cross-mode-presentation.mjs'],role:'mixed',browser:true,artifactDirectories:['artifacts/cross-mode-presentation']}};
 let executionInventory;
 if(!suite){executionInventory=await auditExecutionInventory(manifest);validateFullManifest(manifest,executionInventory);}
 const full=!suite;
 const group=full?{files:[...new Set(manifest.execution.jobs.map(j=>j.file))],roles:Object.fromEntries(manifest.execution.jobs.map(j=>[j.file,j.role])),jobs:manifest.execution.jobs,browser:true,buildScopes:['production','development'],provenance:'Complete mechanically resolved original suites; current/oracle/altered scopes kept separate'}:manifest?.groups?.[suite]??foundation[suite];if(!group)throw Error(`Unknown suite ${suite}`);
 if(!full&&!reportOnly)throw Error('Named foundation suites require explicit report-only');
 output??=resolve(repositoryRoot,'artifacts/release-coverage',suite??'full');
 const workerRoles=Object.fromEntries(group.files.map(file=>[file,group.roles?.[file]??group.role]));
 const jobs=group.jobs??null;
 const expectedRealms=jobs?expectedNodeRealms(jobs,workerRoles):group.files.filter(file=>['node','mixed'].includes(workerRoles[file]));
 if(jobs){
  if(!jobs.length||new Set(jobs.map(j=>j.id)).size!==jobs.length)throw Error('Empty/duplicate browser jobs');
  for(const job of jobs)if(!/^[a-z0-9-]+$/.test(job.id)||!group.files.includes(job.file)||!['node','browser','mixed'].includes(workerRoles[job.file])||Object.entries(job.env??{}).some(([k,v])=>k!=='DOWN_TO_DUCK_AUDIO_BROWSER'||!['chromium','firefox'].includes(v)))throw Error('Invalid browser job');
  if(group.files.some(file=>!jobs.some(job=>job.file===file)))throw Error('Missing browser job owner');
 }
 const buildScopes=group.buildScopes??['production'];
 if(!buildScopes.length||new Set(buildScopes).size!==buildScopes.length||buildScopes.some(s=>!['production','development'].includes(s)))throw Error('Invalid build scopes');
 const runId=randomUUID(),payloadDirectory=join(output,runId);await mkdir(payloadDirectory,{recursive:true});
 const inventoryPath=join(payloadDirectory,'inventory.json');await writeFile(inventoryPath,JSON.stringify(data.inventory));
 const browserBuild=join(payloadDirectory,'build'),browserArtifact=join(browserBuild,'index.html');
 const browserBuilds=Object.fromEntries(buildScopes.map(scope=>[scope,{directory:join(browserBuild,scope),artifact:join(browserBuild,scope,'index.html')}]));
 browserBuilds.modules={artifactHash:hash(Object.values(data.inventory).map(r=>[r.path,r.sourceHash,r.mapHash,hash(r.code)])),description:'Canonical compileSources module graph; not a standalone Vite artifact'};
 const config={runId,inventoryPath,payloadDirectory,expectedRealms,expectedWorkers:group.files,workerRoles,browserBuild,browserArtifact,browserBuilds};
 const configPath=join(payloadDirectory,'config.json');await writeFile(configPath,JSON.stringify(config));
 const env={...process.env,DOWN_TO_DUCK_COVERAGE_CONFIG:configPath,NODE_ENV:'production'};delete env.NODE_TEST_CONTEXT;
 const normalArtifact=resolve(repositoryRoot,'dist/index.html'),normalHash=group.browser?hash(await readFile(normalArtifact)):null,preserved=[],jobLedger=[];
 try{
  if(group.browser){for(const scope of buildScopes){run('pnpm',['exec','vite','build','--mode',scope,'--config','tools/release-coverage/vite.config.mjs'],{...env,NODE_ENV:scope,DOWN_TO_DUCK_COVERAGE_BUILD_SCOPE:scope});browserBuilds[scope].artifactHash=hash(await readFile(browserBuilds[scope].artifact));}
   config.browserArtifact=browserBuilds.production?.artifact;await writeFile(configPath,JSON.stringify(config));
  }
  for(const path of group.artifactDirectories??[]){const original=resolve(repositoryRoot,path),backup=join(payloadDirectory,'prior-artifacts',path),present=!!await stat(original).catch(()=>null);if(present)await cp(original,backup,{recursive:true});preserved.push({original,backup,path,present});}
  if(full){await writeFile(join(payloadDirectory,'execution-inventory.json'),JSON.stringify(executionInventory,null,2));const controlEnv={...process.env};delete controlEnv.DOWN_TO_DUCK_COVERAGE_CONFIG;delete controlEnv.NODE_TEST_CONTEXT;for(const file of manifest.execution.controls.filter(p=>p.endsWith('.test.mjs'))){console.log(`CONTROL ${file}`);run(process.execPath,['tests/strict-node-tests.mjs',file],controlEnv);jobLedger.push({file,role:'control',exitCode:0});}}
  if(jobs){for(const job of jobs){const jobConfig=join(payloadDirectory,'job-'+job.id+'.json');await writeFile(jobConfig,JSON.stringify({...config,jobId:job.id,...(job.nodeRealmId?{nodeRealmId:job.nodeRealmId}:{}),verifyArtifactScope:job.verifyArtifactScope===true,defaultBuildScope:job.defaultBuildScope??'production',expectedWorkers:[job.file],...(job.modelAttribution?{modelAttribution:{realmId:job.file,output:join(payloadDirectory,`model-${job.id}.json`)}}:{})}));console.log(`${new Date().toISOString()} BEGIN ${job.id}`);await preserveJobArtifacts(job,payloadDirectory,async()=>run(process.execPath,['tests/strict-node-tests.mjs',job.file],{...env,...job.env,DOWN_TO_DUCK_COVERAGE_CONFIG:jobConfig}));jobLedger.push({id:job.id,file:job.file,role:workerRoles[job.file],exitCode:0});await writeFile(join(payloadDirectory,'job-ledger.json'),JSON.stringify(jobLedger,null,2));console.log(`${new Date().toISOString()} PASS ${job.id}`);}}
  else run(process.execPath,['tests/strict-node-tests.mjs',...group.files],env);
 }finally{
  for(const {original,backup,path,present}of preserved){if(await stat(original).catch(()=>null))await cp(original,join(payloadDirectory,'suite-artifacts',path),{recursive:true});await rm(original,{recursive:true,force:true});if(present)await cp(backup,original,{recursive:true});}
  if(normalHash!==null&&hash(await readFile(normalArtifact))!==normalHash)throw Error('Normal dist changed during collection');
 }
 const payloads=[],browserRows=[];for(const name of await readdir(payloadDirectory)){
  if(name.startsWith('tests__')&&name.endsWith('.json'))payloads.push(JSON.parse(await readFile(join(payloadDirectory,name),'utf8')));
  if(name.startsWith('browser-')&&name.endsWith('.json')){const row=JSON.parse(await readFile(join(payloadDirectory,name),'utf8'));if(row.status!=='collected')throw Error(`Missing browser realm ${row.realmId}`);browserRows.push(row);payloads.push(row.payload);}
 }
 for(const file of group.files.filter(f=>['browser','mixed'].includes(workerRoles[f])))if(!browserRows.some(row=>resolve(row.identity.suite)===resolve(repositoryRoot,file)))throw Error(`Missing browser owner ${file}`);
 if(jobs)for(const job of jobs.filter(j=>workerRoles[j.file]!=='node')){const rows=browserRows.filter(r=>r.identity.jobId===job.id&&resolve(r.identity.suite)===resolve(repositoryRoot,job.file));if(rows.length<(job.minimumBrowserRealms??1))throw Error(`Missing browser job ${job.id}`);for(const scope of job.requiredBuildScopes??[job.defaultBuildScope??'production'])if(!rows.some(r=>r.identity.buildScope===scope&&r.identity.artifactHash===browserBuilds[scope]?.artifactHash))throw Error(`Missing browser job scope ${job.id}/${scope}`);}
 const modelRows=[];
 for(const job of jobs??[])if(job.modelAttribution){
  const sidecar=JSON.parse(await readFile(join(payloadDirectory,`model-${job.id}.json`),'utf8'));
  modelRows.push(validateModelSidecar(data.inventory,sidecar,payloads,{runId,jobId:job.id,realmId:job.file,artifactHash:browserBuilds.modules.artifactHash,expectations:job.modelAttribution}));
 }
 const allRealms=[...expectedRealms,...browserRows.map(row=>row.realmId)];
 const merged=mergePayloads(data.inventory,payloads,{runId,expectedRealms:allRealms,expectedSources:Object.keys(data.inventory)});
 const report=await reportCoverage(data.inventory,[merged],join(output,'report'));
 let policyResult,attribution;
 if(full||modelRows.length||browserRows.length){
  const policy=JSON.parse(await readFile(new URL('./policy.json',import.meta.url),'utf8')),intervals=validateModeRows(data.inventory,[...browserRows,...modelRows],full?modes:[...new Set([...modelRows,...browserRows].flatMap(r=>(r.intervals??[]).map(i=>i.mode)))]),strata={},strataProof={},provenanceStrata={},rawStrata={},applicability={};
  const summaries=map=>Object.fromEntries(policy.files.map(p=>[p,map.fileCoverageFor(resolve(repositoryRoot,p)).toSummary().toJSON()]));
  for(const [name,paths]of Object.entries(policy.strata)){
   if(!full&&!intervals.some(i=>i.mode===name)&&!(name===BROWSER_STRATUM&&browserRows.some(r=>r.identity.buildScope==='production'))&&!(name==='development'&&browserRows.some(r=>r.identity.buildScope==='development')))continue;
   const selected=modes.includes(name)?intervals.filter(i=>i.mode===name).map(i=>i.payload):name==='development'?browserRows.filter(r=>r.identity.buildScope==='development').map(r=>r.payload):name===BROWSER_STRATUM?browserRows.filter(r=>r.identity.buildScope==='production').map(r=>r.payload):payloads;
   if(!selected.length)throw Error(`Missing stratum evidence ${name}`);
   const raw=mergePayloads(data.inventory,selected,{runId,expectedRealms:selected.map(p=>p.realmId)}),stratumReport=await reportCoverage(data.inventory,[raw],join(output,'strata',name)),files=summaries(stratumReport.map);
   strata[name]=Object.fromEntries(['lines','functions','branches'].map(metric=>[metric,paths.reduce((sum,p)=>({covered:sum.covered+files[p][metric].covered,total:sum.total+files[p][metric].total}),{covered:0,total:0})]));
   rawStrata[name]=structuredClone(strata[name]);
   if(name.startsWith('solo-')||['relay','race'].includes(name)){
    applicability[name]=(name.startsWith('solo-')?projectSoloApplicability:projectTurnApplicability)(name,data.inventory,stratumReport.map.toJSON(),paths,intervals);
    strata[name]=Object.fromEntries(['lines','functions','branches'].map(metric=>[metric,applicability[name].applicable[metric]]));
   }
   if(name===BROWSER_STRATUM){
    applicability[name]=projectBrowserApplicability(data.inventory,stratumReport.map.toJSON(),paths,browserRows.filter(r=>r.identity.buildScope==='production'));
    strata[name]=Object.fromEntries(['lines','functions','branches'].map(metric=>[metric,applicability[name].applicable[metric]]));
   }
   if(name==='development'){
    applicability[name]=await projectDevelopmentApplicability(data.inventory,stratumReport.map.toJSON(),paths,browserRows.filter(r=>r.identity.buildScope==='development'),browserBuilds.development);
    strata[name]=Object.fromEntries(['lines','functions','branches'].map(metric=>[metric,applicability[name].applicable[metric]]));
   }
   if(modes.includes(name)){
    provenanceStrata[name]={};
    for(const provenance of [...new Set(intervals.filter(i=>i.mode===name).map(i=>i.provenance))]){
     const deltas=intervals.filter(i=>i.mode===name&&i.provenance===provenance).map(i=>i.payload);
     const mergedProvenance=mergePayloads(data.inventory,deltas,{runId,expectedRealms:deltas.map(p=>p.realmId)});
     const proof=await reportCoverage(data.inventory,[mergedProvenance],join(output,'strata',name,provenance)),mapped=summaries(proof.map);
     provenanceStrata[name][provenance]=Object.fromEntries(['lines','functions','branches'].map(metric=>[metric,paths.reduce((sum,p)=>({covered:sum.covered+mapped[p][metric].covered,total:sum.total+mapped[p][metric].total}),{covered:0,total:0})]));
    }
   }
   strataProof[name]={sourcePaths:paths,realms:selected.map(p=>p.realmId),basis:modes.includes(name)?'verified exclusive interval delta':'actual complete source-bound realm snapshots'};
  }
  policyResult=full?evaluatePolicy(policy,summaries(report.map),strata):{pass:false,failures:[],thresholdsEvaluated:false};policyResult.failures.sort((a,b)=>a.name.localeCompare(b.name)||a.metric.localeCompare(b.metric));attribution={strata,rawStrata,applicability,strataProof,provenanceStrata,policyBasis:'Solo, turn, production browser and verified DEV application strata use source-bound applicability; raw/global/per-file maps unchanged; Survive strata raw',intervals:intervals.map(({payload,...identity})=>identity),globalUses:'complete parent snapshots only; interval deltas never added globally'};
  await writeFile(join(output,'shortfalls.json'),JSON.stringify(policyResult,null,2));await writeFile(join(output,'attribution.json'),JSON.stringify(attribution,null,2));await writeFile(join(output,'shortfalls.txt'),policyResult.failures.map(f=>`${f.name} ${f.metric}: ${f.covered}/${f.total}; floor ${f.floor}%`).join('\n')+'\n');
 }
 await writeFile(join(output,'manifest.json'),JSON.stringify({status:reportOnly?'report-only':policyResult?.pass?'enforced-pass':'enforced-fail',thresholdsEvaluated:full,policyResult,runId,expectedRealms:allRealms,payloadCount:payloads.length,files:data.files,summary:report.summary,normalArtifactHash:normalHash,browserArtifactHash:group.browser?browserBuilds.production?.artifactHash:null,browserBuilds:group.browser?browserBuilds:null,jobs,workerRoles,separateScopes:manifest?.separateScopes,provenance:group.provenance??'existing assertions with actual/arranged distinctions retained',browserRows:browserRows.map(({identity,realmId})=>({identity,realmId}))},null,2));
 if(full){await writeFile(join(output,'execution-inventory.json'),JSON.stringify(executionInventory,null,2));await writeFile(join(output,'job-ledger.json'),JSON.stringify(jobLedger,null,2));console.log(`FULL COLLECTION: ${jobLedger.length} terminal jobs/controls; ${payloads.length} payloads; ${policyResult.failures.length} exact floor shortfalls`);if(!reportOnly&&!policyResult.pass)process.exitCode=1;}
 console.log(full?(reportOnly?'REPORT ONLY — exact floors evaluated; shortfalls are not release acceptance.':policyResult.pass?'ENFORCED COVERAGE PASS':'ENFORCED COVERAGE FAIL'):'REPORT ONLY — thresholds not evaluated; not release acceptance.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
