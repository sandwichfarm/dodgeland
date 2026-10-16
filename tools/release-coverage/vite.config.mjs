import { defineConfig, mergeConfig } from 'vite';
import normal from '../../vite.config.ts';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

export default defineConfig(()=>{
 const config=JSON.parse(readFileSync(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8'));
 const scope=process.env.DOWN_TO_DUCK_COVERAGE_BUILD_SCOPE??'production';
 if(!['production','development'].includes(scope))throw Error('Invalid coverage build scope');
 const outDir=config.browserBuilds?.[scope]?.directory??(scope==='production'?config.browserBuild:undefined);
 if(!outDir)throw Error('Missing coverage build directory');
 const inventory=JSON.parse(readFileSync(config.inventoryPath,'utf8'));
 const root=resolve('src');
 return mergeConfig(normal,{build:{outDir,emptyOutDir:true},plugins:[{
  name:'release-canonical-coverage',enforce:'pre',
  load(id){const name=relative(root,id.split('?')[0]).split('\\').join('/');const row=inventory[name];if(!row)return null;if(readFileSync(id,'utf8')!==row.source)throw Error(`Changed canonical source ${name}`);return {code:row.code,map:null};},
 }]});
});
