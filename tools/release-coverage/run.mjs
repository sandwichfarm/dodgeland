import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { buildInventory, repositoryRoot } from './inventory.mjs';
import { mergePayloads } from './collector.mjs';
import { reportCoverage } from './instrument.mjs';

async function main(){
 const args=process.argv.slice(2);let suite,output=resolve(repositoryRoot,'artifacts/release-coverage/shared-tracer'),reportOnly=false;
 for(let i=0;i<args.length;i++){if(args[i]==='--suite')suite=args[++i];else if(args[i]==='--output')output=resolve(args[++i]);else if(args[i]==='--report-only')reportOnly=true;else throw Error(`Unknown option ${args[i]}`);}
 if(suite!=='shared-tracer')throw Error('Only the explicit shared-tracer is implemented; full collection is not available yet');
 if(!reportOnly)throw Error('Full policy gate is not implemented; report-only must be explicit');
 const expectedRealms=['tests/local-session.test.mjs','tests/session-world.test.mjs'];
 const data=await buildInventory(),runId=randomUUID(),payloadDirectory=join(output,runId);await mkdir(payloadDirectory,{recursive:true});
 const inventoryPath=join(payloadDirectory,'inventory.json');await writeFile(inventoryPath,JSON.stringify(data.inventory));
 const configPath=join(payloadDirectory,'config.json');await writeFile(configPath,JSON.stringify({runId,inventoryPath,payloadDirectory,expectedRealms}));
 const env={...process.env,DOWN_TO_DUCK_COVERAGE_CONFIG:configPath};delete env.NODE_TEST_CONTEXT;
 const result=spawnSync(process.execPath,['tests/strict-node-tests.mjs',...expectedRealms],{cwd:repositoryRoot,env,stdio:'inherit'});
 if(result.error||result.signal||result.status!==0)throw Error(`Collected suite failed: ${result.error?.message??result.signal??result.status}`);
 const payloads=[];for(const name of await readdir(payloadDirectory))if(name.startsWith('tests__')&&name.endsWith('.json'))payloads.push(JSON.parse(await readFile(join(payloadDirectory,name),'utf8')));
 const merged=mergePayloads(data.inventory,payloads,{runId,expectedRealms,expectedSources:Object.keys(data.inventory)});
 const report=await reportCoverage(data.inventory,[merged],join(output,'report'));
 await writeFile(join(output,'manifest.json'),JSON.stringify({status:'report-only',thresholdsEvaluated:false,runId,expectedRealms,payloadCount:payloads.length,files:data.files,summary:report.summary},null,2));
 console.log('REPORT ONLY — thresholds not evaluated; not release acceptance.');
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
