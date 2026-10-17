import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {hash} from './instrument.mjs';
import {resolveCoverageArtifact,verifyArtifactScope,createBrowserCollector,artifactForCoverage,artifactDirectoryForCoverage} from './browser.mjs';

test('artifact selection and identity share the job default; explicit mixed-build overrides remain exact',()=>{
 const config={defaultBuildScope:'development',browserBuilds:{production:{artifact:'/prod',artifactHash:'p'},development:{artifact:'/dev',artifactHash:'d'}}};
 assert.equal(resolveCoverageArtifact(config).artifact,'/dev');
 assert.equal(resolveCoverageArtifact(config,'production').artifact,'/prod');
 assert.equal(resolveCoverageArtifact({...config,defaultBuildScope:undefined}).artifact,'/prod');
 assert.throws(()=>resolveCoverageArtifact(config,'modules'),/Invalid/);
 assert.throws(()=>resolveCoverageArtifact({...config,browserBuilds:{production:config.browserBuilds.production}}),/Missing/);
});
test('actual artifact script bytes and development UI must both match the declared build',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'development-artifact-'));
 try{
  const production=join(dir,'production.html'),development=join(dir,'development.html');
  const p='globalThis.fixtureBuild="production";',d='globalThis.fixtureBuild="development";';
  await writeFile(production,`<script type="module">${p}</script>`);await writeFile(development,`<script type="module">${d}</script>`);
  const config={defaultBuildScope:'development',browserBuilds:{production:{artifact:production,artifactHash:hash(await readFile(production))},development:{artifact:development,artifactHash:hash(await readFile(development))}}};
  const identity={buildScope:'development',artifactHash:config.browserBuilds.development.artifactHash};
  assert.equal(verifyArtifactScope(config,identity,{scripts:['fixture injection',d],developmentTools:true}).buildScope,'development');
  assert.throws(()=>verifyArtifactScope(config,identity,{scripts:[p],developmentTools:true}),/script mismatch/);
  assert.throws(()=>verifyArtifactScope(config,identity,{scripts:[d],developmentTools:false}),/presence/);
  assert.throws(()=>verifyArtifactScope(config,{...identity,artifactHash:'wrong'},{scripts:[d],developmentTools:true}),/hash/);
  await writeFile(development,`<script>${p}</script>`);
  assert.throws(()=>verifyArtifactScope(config,identity,{scripts:[p],developmentTools:true}),/hash/);
  const prod={buildScope:'production',artifactHash:config.browserBuilds.production.artifactHash};
  assert.throws(()=>verifyArtifactScope(config,prod,{scripts:[p],developmentTools:true}),/presence/);
  assert.equal(verifyArtifactScope(config,prod,{scripts:[p],developmentTools:false}).developmentTools,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('opted-in jobs cannot collect a registered realm without actual artifact proof',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'development-proof-'));
 try{
  const config={runId:'synthetic',payloadDirectory:dir,jobId:'job',verifyArtifactScope:true,defaultBuildScope:'development',browserBuilds:{development:{artifactHash:'synthetic'}}};
  const collector=createBrowserCollector(config,{}),identity={suite:'synthetic',scenario:'missing',frame:'iframe',scope:'current',generation:0};
  collector.registerRealm({},identity);
  await assert.rejects(()=>collector.collectRealm({evaluate(){throw Error('must not evaluate counters');}},identity),/Missing actual browser artifact proof/);
  assert.throws(()=>collector.finishRealms(),/Missing browser payload/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('selected job artifact and output directory cannot alias the production job',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'development-selection-')),prior=process.env.DOWN_TO_DUCK_COVERAGE_CONFIG;
 try{
  const configPath=join(dir,'config.json'),config={payloadDirectory:dir,jobId:'market-runtime-development',verifyArtifactScope:true,defaultBuildScope:'development',browserBuilds:{production:{artifact:'/production.html'},development:{artifact:'/development.html'}}};
  await writeFile(configPath,JSON.stringify(config));process.env.DOWN_TO_DUCK_COVERAGE_CONFIG=configPath;
  assert.equal(artifactForCoverage('/ordinary.html'),'/development.html');
  assert.equal(artifactForCoverage('/ordinary.html','production'),'/production.html');
  assert.ok(artifactDirectoryForCoverage('/ordinary','market-runtime').pathname.endsWith('/suite-artifacts/market-runtime-development/'));
  await writeFile(configPath,JSON.stringify({...config,verifyArtifactScope:false,defaultBuildScope:'production',jobId:'market-runtime'}));
  assert.equal(artifactForCoverage('/ordinary.html'),'/production.html');
  assert.ok(artifactDirectoryForCoverage('/ordinary','market-runtime').pathname.endsWith('/suite-artifacts/market-runtime/'));
 }finally{if(prior===undefined)delete process.env.DOWN_TO_DUCK_COVERAGE_CONFIG;else process.env.DOWN_TO_DUCK_COVERAGE_CONFIG=prior;await rm(dir,{recursive:true,force:true});}
});
