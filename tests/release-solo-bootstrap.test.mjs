import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSources} from './source-loader.mjs';
import {extractPinnedBaseline,PINNED_BASELINE_SHA} from './solo-baseline.mjs';
import {snapshotGame,compareTracePoint} from './solo-parity-snapshot.mjs';
import {createSoloBootstrapRecorder} from '../tools/release-coverage/solo-bootstrap-attribution.mjs';

test('fresh actual solo bootstraps retain pinned acquisition and movement',{timeout:120000},async()=>{
 await using oracle=await extractPinnedBaseline();assert.equal(oracle.sha,PINNED_BASELINE_SHA);
 const baseline=await loadSources(['game','market/catalog','actors'],oracle.sourceDirectory);
 const current=[];const recorder=await createSoloBootstrapRecorder();
 try{
  const baselineGame=await baseline.import('game'),baselineCatalog=await baseline.import('market/catalog');await baseline.import('actors');
  for(const base of ['arcade','stroll']){
   const modules=await loadSources(['game','market/catalog','actors']);current.push(modules);
   assert.notEqual(modules.directory,baseline.directory);if(current.length===2)assert.notEqual(current[0].directory,modules.directory);
   const expected=new baselineGame.Game(113,'pond',base,false,baselineCatalog.ITEM_CATALOG,'butter');
   await recorder.witness(`bootstrap-${base}`,base,async()=>{
    const game=await modules.import('game'),catalog=await modules.import('market/catalog'),actors=await modules.import('actors'),session=await modules.import('session');
    assert.notEqual(game.Game,baselineGame.Game);return {game,catalog,actors,session};
   },loaded=>new loaded.game.Game(113,'pond',base,false,loaded.catalog.ITEM_CATALOG,'butter'),async(actual,loaded,boundary)=>{
    const compare=command=>compareTracePoint({scenario:`bootstrap-${base}`,command,step:0,baseline:snapshotGame(expected,baselineGame),current:snapshotGame(actual,loaded.game)});
    compare('acquired');
    for(const direction of ['forward','left','right']){
     assert.equal(actual.move(direction),expected.move(direction));boundary();
     for(let step=0;step<18;step++){expected.update(1/120);actual.update(1/120);boundary();}
     compare(direction);
    }
    assert.equal(actual.definition.id,base);assert.equal(actual.state,'playing');
   });
  }
  await recorder.finish();
 }finally{await baseline.dispose();for(const modules of current)await modules.dispose();}
});
