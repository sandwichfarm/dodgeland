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
   // main.ts statically imports race.ts even for a solo launch. Its catalogue
   // and schema initializers execute, but no Race/LocalSession is constructed.
   const modules=await loadSources(['game','market/catalog','actors','race']);current.push(modules);
   assert.notEqual(modules.directory,baseline.directory);if(current.length===2)assert.notEqual(current[0].directory,modules.directory);
   const saved=JSON.stringify({mode:base,world:'pond',selected:'pip',best:1000,coins:1000,runs:7,reduced:true,muted:true,
    musicVolume:-2,ambienceVolume:.4,effectsVolume:3,soundPack:'custom',soundAddress:'   '});
   const expectedProgress=baselineGame.parseProgress(saved);
   const expected=new baselineGame.Game(113,expectedProgress.world,expectedProgress.mode,false,baselineCatalog.ITEM_CATALOG,expectedProgress.selected);
   await recorder.witness(`bootstrap-${base}`,base,async()=>{
    const game=await modules.import('game'),catalog=await modules.import('market/catalog'),actors=await modules.import('actors'),session=await modules.import('session');
    await modules.import('race');
    const progress=game.parseProgress(saved);
    assert.deepEqual(progress,expectedProgress,'legacy saved preferences retain pinned migration and validation');
    assert.equal(progress.selected,'butter','the old implicit Pip default migrates to the duck');
    assert.equal(progress.mode,base);assert.equal(progress.soundPack,'pond');
    assert.deepEqual([progress.musicVolume,progress.ambienceVolume,progress.effectsVolume],[0,.4,1]);
    assert.notEqual(game.Game,baselineGame.Game);return {game,catalog,actors,session,progress,modeRules:await modules.import('mode-rules')};
   },loaded=>new loaded.game.Game(113,loaded.progress.world,loaded.progress.mode,false,loaded.catalog.ITEM_CATALOG,loaded.progress.selected),async(actual,loaded,boundary)=>{
    const compare=command=>compareTracePoint({scenario:`bootstrap-${base}`,command,step:0,baseline:snapshotGame(expected,baselineGame),current:snapshotGame(actual,loaded.game)});
    compare('acquired');
    assert.equal(actual.run.wallet,0,'lifetime coins from the save never become the new run wallet');
    for(const direction of ['forward','left','right']){
     assert.equal(actual.move(direction),expected.move(direction));boundary();
     for(let step=0;step<18;step++){expected.update(1/120);actual.update(1/120);boundary();}
     compare(direction);
    }
    assert.equal(actual.definition.id,base);assert.equal(actual.state,'playing');
    // A standalone Game has no UI listeners. Real pickup, contact, healing,
    // innate rescue and death must still work through its default callbacks.
    const place=(game,module,row)=>{
     game.state='playing';game.x=game.fromX=0;game.y=game.fromY=game.maxY=row;game.hop=0;game.waveRow=row-100;game.mobs.length=0;
     game.ensureRows();
     for(const lane of game.rows.values())Object.assign(lane,{kind:'meadow',blocked:[],decorations:[],coin:null,coinActor:undefined,actors:undefined,phase:0,speed:0,spacing:20,length:1.15,variant:0});
    };
    const both=operation=>{operation(expected,baselineGame);operation(actual,loaded.game);boundary();};
    const step=count=>{for(let n=0;n<count;n++){expected.update(1/120);actual.update(1/120);boundary();}};
    const initialCoins=actual.coins,initialWallet=actual.run.wallet;
    both((game,module)=>{place(game,module,0);game.rows.get(0).coin=0;game.rows.get(0).coinDenomination='bar';});step(1);
    assert.equal(actual.coins,initialCoins+2);assert.equal(actual.run.wallet,initialWallet+2);compare('listenerless pickup');
    both(game=>{game.x=game.fromX=-.975;Object.assign(game.rows.get(0),{kind:'road',speed:1});});
    assert.equal(actual.move('right'),expected.move('right'));step(18);
    assert.equal(actual.health,2,'rear contact removes one feather without a listener');compare('listenerless hurt');
    both((game,module)=>{place(game,module,99);game.health=1;game.hurtRemaining=0;});
    assert.equal(actual.move('forward'),expected.move('forward'));step(18);
    assert.equal(actual.maxY,100);assert.equal(actual.health,1.5);compare('listenerless regeneration');
    both(game=>game.end('listenerless water rescue','water'));step(90);
    assert.equal(actual.state,'playing');assert.equal(actual.powerRemaining,100);compare('listenerless innate rescue');
    both(game=>game.end('listenerless fatal train','train'));step(30);
    assert.equal(actual.state,'dead');assert.equal(actual.deathCause,'train');assert.equal(actual.run.wallet,0);assert.equal(actual.deathSpill.wallet,initialWallet+2);compare('listenerless terminal spill');
   });
  }
  await recorder.finish();
 }finally{await baseline.dispose();for(const modules of current)await modules.dispose();}
});
