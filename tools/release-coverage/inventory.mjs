import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instrumentSources, hash } from './instrument.mjs';
import { capturePayload } from './collector.mjs';

export const repositoryRoot=fileURLToPath(new URL('../../',import.meta.url));
export async function buildInventory(){
 const result=spawnSync('git',['ls-files','-z','src'],{cwd:repositoryRoot,encoding:'utf8'});
 if(result.error||result.status!==0)throw Error('Tracked source inventory failed');
 const paths=result.stdout.split('\0').filter(Boolean).sort();if(!paths.length)throw Error('Empty tracked source inventory');
 const sources={},files=[];
 for(const path of paths){const source=await readFile(resolve(repositoryRoot,path));const kind=path.endsWith('.d.ts')?'declaration':path.endsWith('.ts')?'typescript':path.endsWith('.css')?'stylesheet':'asset';files.push({path,kind,sourceHash:hash(source.toString('utf8'))});if(kind==='typescript')sources[path.slice(4)]=source.toString('utf8');}
 const inventory=instrumentSources(sources,resolve(repositoryRoot,'src'));
 for(const file of files)if(file.kind==='typescript'){const zero=inventory[file.path.slice(4)].zero;file.kind=Object.keys(zero.statementMap).length+Object.keys(zero.fnMap).length?'executable':'no-executable-sites';}
 return {root:resolve(repositoryRoot,'src'),files,inventory};
}
/** Explicit alternate realms are allowed only for a registered repeated job. */
export function nodeWorkerBinding(config,worker){
 const role=config.workerRoles?.[worker]??'node';
 if(!(config.expectedWorkers??config.expectedRealms).includes(worker))throw Error(`Unexpected test worker ${worker}`);
 if(!['node','browser','mixed','control'].includes(role))throw Error(`Unknown worker role ${role}`);
 const realmId=config.nodeRealmId??worker;
 if(config.nodeRealmId!==undefined&&(role!=='mixed'||!config.jobId||realmId!==`${worker}#${config.jobId}`))throw Error('Invalid alternate Node realm');
 if(['node','mixed'].includes(role)&&!config.expectedRealms.includes(realmId))throw Error('Missing expected Node realm');
 return {role,realmId,filename:realmId.replaceAll('/','__')+'.json'};
}
export function persistNodePayload(config,worker,inventory,raw){
 const binding=nodeWorkerBinding(config,worker);
 if(binding.role==='browser'||binding.role==='control'){if(raw)throw Error('Undeclared Node source execution');return;}
 const payload=capturePayload(inventory,raw,{runId:config.runId,realmId:binding.realmId});
 writeFileSync(join(config.payloadDirectory,binding.filename),JSON.stringify(payload),{flag:'wx'});
 return payload;
}
// Controlled strict-runner preload. A durable config chooses identity, never executable code.
if(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG&&process.env.NODE_TEST_CONTEXT==='child-v8'){
 const config=JSON.parse(readFileSync(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8'));
 const worker=relative(repositoryRoot,resolve(process.argv[1])).split('\\').join('/');
 nodeWorkerBinding(config,worker);
 const inventory=JSON.parse(readFileSync(config.inventoryPath,'utf8'));
 process.once('exit',()=>{
  try{persistNodePayload(config,worker,inventory,globalThis.__coverage__);}
  catch(error){console.error('Coverage worker failed:',error.message);process.exitCode=1;}
 });
}
