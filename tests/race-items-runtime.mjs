import assert from 'node:assert/strict';
import {loadSources} from './source-loader.mjs';
import {createMarketGameFixture} from './market-game-fixture.mjs';
const source=await loadSources(['game','race-items']);
const {Game}=await source.import('game'),{RACE_DROP_SCHEMA}=await source.import('race-items'),{sampleItemDrop}=await source.import('consumable-drops');
try{for(const item of ['mud-splash','fog-lantern']){
  let code;
  for(let seed=0;seed<100000;seed++){
    if(sampleItemDrop(RACE_DROP_SCHEMA,{courseSeed:seed,row:1,slot:0}).itemId!==item)continue;
    const candidate=`ph3-${seed.toString(16).padStart(8,'0')}-pond-s-n`,game=Game.fromSeed(candidate);
    if([0,1].every(y=>game.rows.get(y).kind==='meadow'&&!game.rows.get(y).blocked.includes(0))){code=candidate;break;}
  }
  assert.ok(code);console.log(item,code);
  const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{sender:'race-items-proof',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed:code}}});
  try{
    await app.frame.locator('#local-play').click();await app.frame.locator('#race-play').click();await app.frame.locator('#local-session-start').click();await app.advance(80);
    for(const light of [false,true])for(const [w,h]of [[320,560],[900,600]]){
      await app.resize(w,h);await app.frame.evaluate(light=>window.marketGameFixture.setTheme({colors:light?{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'}}),light);
      await app.iframe.screenshot({path:`/tmp/race-05-04-${item}-${w}-${light?'light':'dark'}.png`});
    }
    for(let i=0;i<1;i++){await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);}
    const snapshot=await app.onSession(function(){return this.consumableSnapshot();});
    assert.equal(snapshot.charges.find(c=>c.seat==='p1')[item],1);assert.ok(snapshot.claims.length);assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await app.frame.evaluate(()=>window.marketGameFixture.forbidden),[]);
    console.log('actual keyboard collected',item);
  }finally{await app.close();}
}}finally{await source.dispose();}
