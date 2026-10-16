import { mkdir, readFile, writeFile, readdir, cp, rm, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { buildInventory, repositoryRoot } from './inventory.mjs';
import { mergePayloads } from './collector.mjs';
import { reportCoverage, hash } from './instrument.mjs';
import { pathToFileURL } from 'node:url';

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
 if(!suite)throw Error('Full collection incomplete: required07-07/08/09 adapters and inventory are pending');
 const group=manifest?.groups?.[suite]??foundation[suite];if(!group)throw Error(`Unknown suite ${suite}`);
 if(!reportOnly)throw Error('Named foundation suites require explicit report-only');
 output??=resolve(repositoryRoot,'artifacts/release-coverage',suite);
 const workerRoles=Object.fromEntries(group.files.map(file=>[file,group.roles?.[file]??group.role]));
 const expectedRealms=group.files.filter(file=>['node','mixed'].includes(workerRoles[file]));
 const jobs=group.jobs??null;
 if(jobs){
  if(!jobs.length||new Set(jobs.map(j=>j.id)).size!==jobs.length)throw Error('Empty/duplicate browser jobs');
  for(const job of jobs)if(!/^[a-z0-9-]+$/.test(job.id)||!group.files.includes(job.file)||workerRoles[job.file]!=='browser'||Object.entries(job.env??{}).some(([k,v])=>k!=='DOWN_TO_DUCK_AUDIO_BROWSER'||!['chromium','firefox'].includes(v)))throw Error('Invalid browser job');
  if(group.files.some(file=>!jobs.some(job=>job.file===file)))throw Error('Missing browser job owner');
 }
 const buildScopes=group.buildScopes??['production'];
 if(!buildScopes.length||new Set(buildScopes).size!==buildScopes.length||buildScopes.some(s=>!['production','development'].includes(s)))throw Error('Invalid build scopes');
 const runId=randomUUID(),payloadDirectory=join(output,runId);await mkdir(payloadDirectory,{recursive:true});
 const inventoryPath=join(payloadDirectory,'inventory.json');await writeFile(inventoryPath,JSON.stringify(data.inventory));
 const browserBuild=join(payloadDirectory,'build'),browserArtifact=join(browserBuild,'index.html');
 const browserBuilds=Object.fromEntries(buildScopes.map(scope=>[scope,{directory:join(browserBuild,scope),artifact:join(browserBuild,scope,'index.html')}]));
 const config={runId,inventoryPath,payloadDirectory,expectedRealms,expectedWorkers:group.files,workerRoles,browserBuild,browserArtifact,browserBuilds};
 const configPath=join(payloadDirectory,'config.json');await writeFile(configPath,JSON.stringify(config));
 const env={...process.env,DOWN_TO_DUCK_COVERAGE_CONFIG:configPath,NODE_ENV:'production'};delete env.NODE_TEST_CONTEXT;
 const normalArtifact=resolve(repositoryRoot,'dist/index.html'),normalHash=group.browser?hash(await readFile(normalArtifact)):null,preserved=[];
 try{
  if(group.browser){for(const scope of buildScopes){run('pnpm',['exec','vite','build','--mode',scope,'--config','tools/release-coverage/vite.config.mjs'],{...env,NODE_ENV:scope,DOWN_TO_DUCK_COVERAGE_BUILD_SCOPE:scope});browserBuilds[scope].artifactHash=hash(await readFile(browserBuilds[scope].artifact));}
   config.browserArtifact=browserBuilds.production?.artifact;await writeFile(configPath,JSON.stringify(config));
  }
  for(const path of group.artifactDirectories??[]){const original=resolve(repositoryRoot,path),backup=join(payloadDirectory,'prior-artifacts',path),present=!!await stat(original).catch(()=>null);if(present)await cp(original,backup,{recursive:true});preserved.push({original,backup,path,present});}
  if(jobs){for(const job of jobs){const jobConfig=join(payloadDirectory,'job-'+job.id+'.json');await writeFile(jobConfig,JSON.stringify({...config,jobId:job.id,expectedWorkers:[job.file]}));run(process.execPath,['tests/strict-node-tests.mjs',job.file],{...env,...job.env,DOWN_TO_DUCK_COVERAGE_CONFIG:jobConfig});}}
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
 if(jobs)for(const job of jobs){const rows=browserRows.filter(r=>r.identity.jobId===job.id&&resolve(r.identity.suite)===resolve(repositoryRoot,job.file));if(!rows.length)throw Error(`Missing browser job ${job.id}`);for(const scope of job.requiredBuildScopes??['production'])if(!rows.some(r=>r.identity.buildScope===scope&&r.identity.artifactHash===browserBuilds[scope]?.artifactHash))throw Error(`Missing browser job scope ${job.id}/${scope}`);}
 const allRealms=[...expectedRealms,...browserRows.map(row=>row.realmId)];
 const merged=mergePayloads(data.inventory,payloads,{runId,expectedRealms:allRealms,expectedSources:Object.keys(data.inventory)});
 const report=await reportCoverage(data.inventory,[merged],join(output,'report'));
 await writeFile(join(output,'manifest.json'),JSON.stringify({status:'report-only',thresholdsEvaluated:false,runId,expectedRealms:allRealms,payloadCount:payloads.length,files:data.files,summary:report.summary,normalArtifactHash:normalHash,browserArtifactHash:group.browser?browserBuilds.production?.artifactHash:null,browserBuilds:group.browser?browserBuilds:null,jobs,workerRoles,provenance:group.provenance??'existing assertions with actual/arranged distinctions retained',browserRows:browserRows.map(({identity,realmId})=>({identity,realmId}))},null,2));
 console.log('REPORT ONLY — thresholds not evaluated; not release acceptance.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
