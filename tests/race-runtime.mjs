import assert from 'node:assert/strict';
import test from 'node:test';
import {createMarketGameFixture,sessionHudAction,sessionControlsPage} from './market-game-fixture.mjs';
import {intent,start,earnTogether,pad,mixedSetup,freshReclaim} from './race-browser-fixture.mjs';
import { snapshotRealm, recordInterval } from '../tools/release-coverage/browser.mjs';
import { SOLO_DEFINITION_SOURCE_HASH, validateSoloDefinition } from '../tools/release-coverage/solo-definition-evidence.mjs';

// Observe ownership without calling a production resolver/planner. These bounded
// intervals never include earnTogether's private hazard queries or Node oracle.
async function publicSnapshot(app) {
 const game=await app.onGame(function(){
  const normalize=v=>v===undefined?{__undefined:true}:typeof v==='function'?{__function:true}:Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
  const frozen=v=>!v||typeof v!=='object'||Object.isFrozen(v)&&Object.values(v).every(frozen);
  return {base:this.definition.id,state:this.state,definitionEvidence:{snapshot:normalize(this.definition),rulesIdentity:this.rules===this.definition.rules&&this.world.definition===this.definition&&this.world.rules===this.rules,deepFrozen:frozen(this.definition)}};
 });
 const definitionEvidence={...game.definitionEvidence,sourceHash:SOLO_DEFINITION_SOURCE_HASH};validateSoloDefinition(definitionEvidence,game.base);
 const actual=await app.onSession(function(){return {base:this.definition.id,kind:this.mode?.handlers.retainDeadDevice?'race':this.mode?.handlers.canAct?'relay':'other',participants:this.players.length,sessionId:this.id,active:this.active};});
 const ownership=await app.sessionOwnership();
 assert.equal(actual.base,'stroll');assert.equal(game.base,actual.base);assert.equal(game.state,'playing');assert.equal(actual.kind,'race');assert.equal(actual.active,true);
 assert.equal(ownership.sessionActive,true);assert.equal(ownership.playerSessionAbsent,false);assert.ok(ownership.sessionBindings>0);assert.equal(ownership.stageBindings,0);
 assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'playing');
 return snapshotRealm(app.frame,{mode:'race',base:game.base,kind:actual.kind,state:game.state,participants:actual.participants,sessionId:actual.sessionId,definitionEvidence});
}
async function finishPublicInterval(app,before,id) {
 const after=await publicSnapshot(app);
 if(before?.buildScope==='production')recordInterval(before,after,id);
}

test('camera fog ribbon edge marker HUD and reduced motion retain authoritative observations',{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:intent});
 try{await app.page.emulateMedia({reducedMotion:'reduce'});const f=await start(app);const interval=await publicSnapshot(app);assert.equal(await f.locator('[data-race-fog]').count(),2);await sessionHudAction(app,'p1','revive',{click:false});assert.match(await f.locator('[data-seat="p1"] [data-session-hud="revive"]').innerText(),/Personal revive.*250/);await f.getByRole('button',{name:'Previous details',exact:true}).click();assert.match(await f.locator('[data-seat="p1"] [data-session-hud="power"]').innerText(),/Power.*100/);await f.getByRole('button',{name:'Close details',exact:true}).click();assert.equal(await f.locator('[data-race-boundary]').count(),1);await f.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(300);const state=await app.onSession(function(){return {frontier:this.result?.leaderFrontier,earned:this.players[0].earnedDistance};});assert.equal(state.earned,1);assert.deepEqual(await app.onRenderer(function(){return {reduced:this.reduced,camera:this.camera};}),{reduced:true,camera:1});await app.page.keyboard.press('s');await app.advance(300);assert.equal(await app.onRenderer(function(){return this.camera;}),1);assert.match(await f.locator('[data-race-lead]').innerText(),/Lead 1/);await finishPublicInterval(app,interval,'race-camera-forward-back');assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);}finally{await app.close();}
});
test('Viewing P owner Race gear Wardrobe no legacy surface',{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:intent});
 try{const f=await start(app);assert.equal(await f.locator('#run-inventory:visible').count(),1);assert.equal(await f.locator('.run-hand-empty').count(),0);await f.getByRole('button',{name:'Race gear',exact:true}).click();assert.match(await f.locator('#market-owner').innerText(),/Viewing P1.*Butter/);assert.equal(await f.locator('#market-heading').innerText(),'Race gear');assert.equal(await f.locator('#market').getByText('Mud Splash',{exact:true}).count(),1);assert.equal(await f.locator('#market').getByText('Fog Lantern',{exact:true}).count(),1);assert.equal(await f.locator('#market').getByRole('button',{name:'Wardrobe',exact:true}).count(),1);assert.equal(await f.locator('.run-hand-empty').count(),0);assert.deepEqual(evidence.errors,[]);}finally{await app.close();}
});

for(const [item,seed]of [['mud-splash','ph3-000002dc-pond-s-n'],['fog-lantern','ph3-00000658-pond-s-n']])test(`actual ${item==='mud-splash'?'Mud Splash':'Fog Lantern'} collection target commit and immutable success`,{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,observeAudio:true,initialIntent:{...intent,payload:{seed}}});
 try{const f=await start(app);const interval=await publicSnapshot(app);await f.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);
 const before=await app.onSession(function(){return {charges:this.consumableSnapshot().charges,uses:this.consumableSnapshot().uses,players:this.players.map(p=>({health:p.health,wallet:p.run.wallet,earned:p.earnedDistance,ground:p.groundY}))};});assert.equal(before.charges[0][item],1);
 await f.getByRole('button',{name:item==='mud-splash'?'Use Mud Splash':'Use Fog Lantern',exact:true}).click();
 assert.match(await f.locator('#survive-lifecycle-board').innerText(),/Viewing P1 · Butter/);
 await f.getByRole('button',{name:item==='mud-splash'?'Use on P2':'Light lantern',exact:true}).click();await app.advance(32);
 const after=await app.onSession(function(){return {charges:this.consumableSnapshot().charges,uses:this.consumableSnapshot().uses,players:this.players.map(p=>({health:p.health,wallet:p.run.wallet,earned:p.earnedDistance,ground:p.groundY}))};});assert.equal(after.charges[0][item],0);assert.equal(after.uses.length,before.uses.length+1);assert.deepEqual(after.players,before.players);assert.equal(await f.locator('#survive-lifecycle-board').count(),0);await sessionHudAction(app,item==='mud-splash'?'p2':'p1','item',{click:false});assert.match(await f.locator('[data-race-effect]:visible').innerText(),item==='mud-splash'?/Mudded/:/Fog Lantern/);if(item==='fog-lantern'){await f.getByRole('button',{name:'Next details',exact:true}).click();assert.match(await f.locator('[data-race-fog]:visible').innerText(),/Lantern · fog safe/);}await f.getByRole('button',{name:'Close details',exact:true}).click();
 await app.iframe.screenshot({path:`/tmp/race-05-06-${item}-effect.png`});await finishPublicInterval(app,interval,`race-collect-use-${item}`);assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);
 }finally{await app.close();}
});

test('actual Race gear purchases follow earned market milestone without private state writes',{timeout:120000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{...intent,payload:{seed:'ph3-00000071-pond-s-n'}}});
 try{const f=await start(app);await earnTogether(app,100);
 const read=()=>app.onSession(function(){return this.players.map(p=>({earned:p.earnedDistance,wallet:p.run.wallet,market:p.run.market,stats:p.statistics}));});
 const inspect=async()=>{await f.locator('#run-hand-items').getByRole('button',{name:'Race gear',exact:true}).click();await f.locator('[data-market-action="inspect"][data-id="consumable:consumable:mud-splash"]').click();};
 const first=await read();assert.ok(first[0].market);assert.ok(first[0].wallet<30);await inspect();assert.equal(await f.locator('#market-inspect-action').isDisabled(),true);assert.match(await f.locator('#market-inspect-note').innerText(),/Not enough coins/);assert.equal((await read())[0].wallet,first[0].wallet);assert.equal((await read())[0].stats.marketPurchases,first[0].stats.marketPurchases);
 await app.page.keyboard.press('Escape');await app.page.keyboard.press('Escape');await app.advance(300);
 await earnTogether(app,200);const before=await read();console.log('earned next market',before[0].earned,before[0].wallet);assert.ok(before[0].wallet>=30);await inspect();await f.locator('#market-inspect-action').click();await app.advance(20);
 assert.equal(await app.onSession(function(){return this.consumableSnapshot().charges[0]['mud-splash'];}),1);assert.equal((await read())[0].wallet,before[0].wallet-30);assert.equal((await read())[0].stats.marketPurchases,before[0].stats.marketPurchases+1);assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});

test('mixed uninterrupted Race again journey ties ghost reclaim waiting timeout recovery grace DNF and teardown',{timeout:120000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,observeAudio:true,initialIntent:intent});
 const f=app.frame,read=()=>app.onSession(function(){return {time:this.world.time,result:this.result,players:this.players.map(p=>({seat:p.seat,device:p.device,state:p.state,y:p.y,health:p.health,earned:p.earnedDistance,wallet:p.run.wallet,charge:p.recovery.charge,protection:p.recovery.protectionUntil,offer:p.recovery.offer}))};});
 async function retry(){const frozen=JSON.stringify((await read()).result);await f.getByRole('button',{name:'Race again',exact:true}).click();await f.evaluate(delivery=>window.marketGameFixture.deliverIntent(delivery),intent);assert.equal(JSON.stringify((await read()).result),frozen);app.refreshOwners();}
 try{
  await mixedSetup(app,{finish:'1'});await app.page.evaluate(pads=>window.marketPads(pads,true),[pad(0,[12])]);await app.page.keyboard.press('w');await app.advance(250);assert.deepEqual((await read()).result.players.map(p=>p.rankLabel),['=1','=1']);await retry();
  await mixedSetup(app,{seconds:'30',index:1});await app.sendPads([]);const lost=await read();await app.advance(500);assert.ok((await read()).time>lost.time);await app.sendPads([pad(9,[12,0])]);assert.equal(await f.locator('#survive-lifecycle-board').count(),0);await freshReclaim(app,9);const reclaimed=await read();assert.equal(reclaimed.players[1].device,'gamepad-9');assert.deepEqual(reclaimed.players[1].earned,lost.players[1].earned);assert.equal(reclaimed.players[1].protection,lost.players[1].protection);
  await app.sendPads([]);await sessionHudAction(app, 'p1', 'item');await f.locator('#survive-lifecycle-board').getByRole('button',{name:'Leave Race',exact:true}).click();await app.advance(40);const waiting=await read();await app.advance(13000);assert.equal((await read()).time,waiting.time);assert.match(await f.locator('#session-seats').innerText(),/Waiting for a player to reclaim/);await freshReclaim(app,8);await app.advance(31000);assert.equal((await read()).result.outcome,'time');assert.equal((await read()).result.players[0].dnf,'Left');await retry();
  await mixedSetup(app,{index:2});for(let i=0;i<40;i++){const row=await app.onSession(function(){return this.world.rows.get(this.players[0].y)?.kind;});if(row==='road'||(await read()).players[0].state==='dead')break;await app.page.keyboard.press('w');await app.advance(250);}
  for(let i=0;i<120&&(await read()).players[0].state!=='dead';i++)await app.advance(250);assert.ok((await read()).players[0].offer);await sessionHudAction(app, 'p1', 'revive');await app.advance(32);assert.equal((await read()).players[0].charge,'spent');assert.ok((await read()).players[0].protection>(await read()).time);
  for(let i=0;i<10&&(await read()).players[0].y>0;i++){await f.locator('#scene').focus();await app.page.keyboard.press('s');await app.advance(180);}
  await app.sendPads([]);await app.advance(12500);assert.match(await f.locator('[data-seat="p2"] .session-hud-summary').innerText(),/forfeited/);
  await sessionHudAction(app, 'p1', 'item');await f.locator('#survive-lifecycle-board').getByRole('button',{name:'Leave Race',exact:true}).click();await app.advance(32);assert.deepEqual((await read()).result.players.map(p=>p.dnf),['Left','Forfeited']);
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await f.evaluate(()=>window.marketGameFixture.forbidden),[]);await f.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));assert.deepEqual(await f.evaluate(()=>Object.keys(window.marketGameFixture.handlers)),[]);
 }finally{await app.close();}
});


test('mixed per-seat audio cooldown mute and app reduced motion with keyboard-only fallback',{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,observeAudio:true,auditBoundary:true,initialIntent:intent});
 try{const f=app.frame;await f.locator('#choose').click();await f.locator('#collection-sections').click();await f.locator('[data-collection-tab="camp"]').click();await f.locator('#reduced-motion').check();await f.locator('#close-drawer').click();await mixedSetup(app);const voices=()=>f.evaluate(()=>window.marketGameFixture.voices.filter(v=>!v.loop).map(v=>v.fingerprint));
 let n=(await voices()).length;await app.page.keyboard.press('q');assert.equal((await voices()).length,n+1);const first=(await voices()).at(-1);await app.page.keyboard.press('q');assert.equal((await voices()).length,n+1);
 await app.sendPads([pad(0,[2])]);assert.equal((await voices()).length,n+2);assert.notEqual((await voices()).at(-1),first);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[2])]);assert.equal((await voices()).length,n+2);await app.sendPads([pad(0)]);
 await f.locator('#sound-toggle').click();await app.advance(900);n=(await voices()).length;await f.locator('#scene').focus();await app.page.keyboard.press('q');await app.sendPads([pad(0,[2])]);assert.equal((await voices()).length,n);await app.sendPads([pad(0)]);
 await app.advance(32);assert.equal(await app.onRenderer(function(){return this.reduced;}),true);assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
 const fallback=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:intent});try{await start(fallback,'1');await fallback.frame.locator('#scene').focus();await fallback.page.keyboard.press('w');await fallback.page.keyboard.press('ArrowUp');await fallback.advance(250);assert.equal((await fallback.onSession(function(){return this.result.players;})).length,2);await fallback.frame.getByRole('button',{name:'Race again',exact:true}).click();assert.equal(await fallback.frame.locator('#local-play').isVisible(),true);assert.deepEqual(await fallback.frame.evaluate(()=>window.marketGameFixture.forbidden),[]);}finally{await fallback.close();}
});

test('stale target disconnect and owner switch reject without wasting Mud Splash',{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:{...intent,payload:{seed:'ph3-000002dc-pond-s-n'}}});
 try{await mixedSetup(app);const interval=await publicSnapshot(app);const f=app.frame;await app.page.keyboard.press('w');await app.advance(250);const charge=()=>app.onSession(function(){return this.consumableSnapshot().charges[0]['mud-splash'];});assert.equal(await charge(),1);
 await f.getByRole('button',{name:'Use Mud Splash',exact:true}).click();const frozen=await app.onSession(function(){return this.world.time;});await app.advance(500);assert.equal(await app.onSession(function(){return this.world.time;}),frozen);await app.sendPads([]);await app.advance(32);if(await f.locator('#survive-lifecycle-board').count()){await f.getByRole('button',{name:'Use on P2',exact:true}).click();assert.match(await f.locator('#survive-lifecycle-board').innerText(),/needs an active racer/);await f.getByRole('button',{name:'Back',exact:true}).click();}assert.equal(await charge(),1);
 await f.getByRole('button',{name:'Use Mud Splash',exact:true}).click();assert.match(await f.locator('#survive-lifecycle-board').innerText(),/No racer is in range/);assert.equal(await f.locator('#survive-lifecycle-board .primary').isDisabled(),true);await f.getByRole('button',{name:'Back',exact:true}).click();assert.equal(await charge(),1);await freshReclaim(app,1);
 await f.locator('[data-seat="p2"] [data-session-hud="identity"]').click();assert.match(await f.locator('#run-inventory').innerText(),/Viewing P2/);assert.equal(await f.getByRole('button',{name:'Use Mud Splash',exact:true}).isDisabled(),true);assert.equal(await charge(),1);await finishPublicInterval(app,interval,'race-stale-target-disconnect-reclaim-owner');assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});

test('Race HUD gear target visual review across themes and compact regular short wide frames',{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{...intent,payload:{seed:'ph3-000002dc-pond-s-n'}}});
 try{const f=await start(app);await f.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);
 for(const theme of ['dark','light']){await f.evaluate(theme=>window.marketGameFixture.setTheme({colors:theme==='dark'?{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'}:{background:'#f2eee1',text:'#292d28',primary:'#426c38'}}),theme);
 for(const [w,h]of [[320,560],[900,600],[1000,280],[2400,1200]]){await app.resize(w,h);await app.advance(32);await app.iframe.screenshot({path:`/tmp/race-05-06-${theme}-${w}-hud.png`});await sessionControlsPage(app,'p1','Gear');
 await f.getByRole('button',{name:'Use Mud Splash',exact:true}).click();await app.iframe.screenshot({path:`/tmp/race-05-06-${theme}-${w}-target.png`});await f.getByRole('button',{name:'Back',exact:true}).click();
 await f.locator('#run-hand-items').getByRole('button',{name:'Race gear',exact:true}).click();await app.iframe.screenshot({path:`/tmp/race-05-06-${theme}-${w}-gear.png`});await app.page.keyboard.press('Escape');
 }}assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});

test('already-lit Fog Lantern revalidation preserves a second actually collected charge',{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{...intent,payload:{seed:'ph3-001fe673-pond-s-n'}}});
 try{const f=await start(app);const interval=await publicSnapshot(app);await f.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);const charge=()=>app.onSession(function(){return this.consumableSnapshot().charges[0]['fog-lantern'];});assert.equal(await charge(),1);await f.getByRole('button',{name:'Use Fog Lantern',exact:true}).click();await f.getByRole('button',{name:'Light lantern',exact:true}).click();assert.equal(await charge(),0);await f.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);assert.equal(await charge(),1);await f.getByRole('button',{name:'Use Fog Lantern',exact:true}).click();assert.equal(await f.getByRole('button',{name:'Light lantern',exact:true}).isDisabled(),true);assert.equal(await charge(),1);await f.getByRole('button',{name:'Back',exact:true}).click();await finishPublicInterval(app,interval,'race-lantern-second-collected-charge');assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});

test('Mud Splash excludes a protected racer after actual personal revival',{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{...intent,payload:{seed:'ph3-000002dc-pond-s-n'}}});
 try{const f=await start(app);const interval=await publicSnapshot(app);await f.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);const read=()=>app.onSession(function(){const p=this.players[1];return {row:this.world.rows.get(p.y)?.kind,state:p.state,offer:p.recovery.offer,protected:p.recovery.protectionUntil>this.world.time,charge:this.consumableSnapshot().charges[0]['mud-splash']};});
 for(let i=0;i<160&&!(await read()).offer;i++){if((await read()).row!=='road'){await f.locator('#scene').focus();await app.page.keyboard.press('ArrowUp');}await app.advance(200);}assert.ok((await read()).offer,JSON.stringify(await read()));await sessionHudAction(app, 'p2', 'revive');await app.advance(32);assert.equal((await read()).protected,true);await f.locator('[data-seat="p1"] [data-session-hud="identity"]').click();await f.getByRole('button',{name:'Use Mud Splash',exact:true}).click();assert.match(await f.locator('#survive-lifecycle-board').innerText(),/No racer is in range/);assert.equal(await f.locator('#survive-lifecycle-board .primary').isDisabled(),true);assert.equal((await read()).charge,1);await f.getByRole('button',{name:'Back',exact:true}).click();await finishPublicInterval(app,interval,'race-protected-revived-target');assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});

test('Mud Splash out-of-range and departed targets preserve charges; owner switch is isolated from selection',{timeout:45000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{...intent,payload:{seed:'ph3-000002dc-pond-s-n'}}});
 try{const f=await start(app);await f.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);await f.getByRole('button',{name:'Use Mud Splash',exact:true}).click();assert.equal(await f.locator('#session-seats').evaluate(el=>!!el.closest('[inert]')),true);await f.getByRole('button',{name:'Back',exact:true}).click();await f.locator('[data-seat="p2"] [data-session-hud="identity"]').click();assert.equal(await f.locator('#survive-lifecycle-board').count(),0);await f.locator('[data-seat="p1"] [data-session-hud="identity"]').click();
 await earnTogether(app,17);const read=()=>app.onSession(function(){return {charges:this.consumableSnapshot().charges[0]['mud-splash'],players:this.players.map(p=>({ground:p.groundY,state:p.state}))};});const before=await read();assert.ok(before.players[0].ground-before.players[1].ground>16);assert.equal(before.players[1].state,'playing');const interval=await publicSnapshot(app);await f.getByRole('button',{name:'Use Mud Splash',exact:true}).click();assert.match(await f.locator('#survive-lifecycle-board').innerText(),/No racer is in range/);assert.equal(await f.locator('#survive-lifecycle-board .primary').isDisabled(),true);await f.getByRole('button',{name:'Back',exact:true}).click();assert.equal((await read()).charges,1);
 await sessionHudAction(app, 'p2', 'item');await f.locator('#survive-lifecycle-board').getByRole('button',{name:'Leave Race',exact:true}).click();await f.locator('[data-seat="p1"] [data-session-hud="identity"]').click();await f.getByRole('button',{name:'Use Mud Splash',exact:true}).click();assert.match(await f.locator('#survive-lifecycle-board').innerText(),/No racer is in range/);assert.equal((await read()).charges,1);await f.getByRole('button',{name:'Back',exact:true}).click();await finishPublicInterval(app,interval,'race-out-of-range-departed-target');assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});

for(const outcome of ['finish','timeout-dnf'])test(`assigned controller operates frozen Race results after ${outcome}`,{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{
  const f=app.frame;await mixedSetup(app,{finish:outcome==='finish'?'1':'500',seconds:'30'});
  if(outcome==='finish'){
   await app.page.keyboard.press('w');await app.sendPads([pad(0,[0])]);await app.advance(300);
  }else{
   await sessionHudAction(app, 'p1', 'item');await f.locator('#survive-lifecycle-board').getByRole('button',{name:'Leave Race',exact:true}).click();
   await app.advance(29800);await app.sendPads([pad(0,[0])]);await app.advance(400);
  }
  const root=f.locator('#survive-results-root');await root.getByRole('heading',{name:'Race results',exact:true}).waitFor();
  const frozen=await app.onSession(function(){return JSON.stringify(this.result);});
  assert.equal(JSON.parse(frozen).outcome,outcome==='finish'?'finish':'time');
  if(outcome==='timeout-dnf')assert.equal(JSON.parse(frozen).players[0].dnf,'Left');
  const snapshot=()=>app.onSession(function(){return JSON.stringify({result:this.result,time:this.world.time,players:this.players.map(p=>({x:p.x,y:p.y,earned:p.earnedDistance,wallet:p.run.wallet,cards:p.run.cards,health:p.health}))});});
  const settled=await snapshot();await app.advance(1000);await app.sendPads([pad(0,[0])]);assert.equal(await root.isVisible(),true,'held settlement confirm cannot retry');assert.equal(await snapshot(),settled);
  await app.sendPads([pad(0)]);
  // Unknown controller cannot operate the assigned seat's terminal surface.
  const initialFocus=await f.evaluate(()=>document.activeElement?.textContent);await app.sendPads([pad(0),pad(7,[0])]);assert.equal(await root.isVisible(),true);assert.equal(await f.evaluate(()=>document.activeElement?.textContent),initialFocus);await app.sendPads([pad(0)]);
  await app.sendPads([pad(0,[14])]);assert.equal(await root.getByRole('button',{name:'Next results',exact:true}).evaluate(n=>n===document.activeElement),true,'fresh assigned direction reaches paging');await app.sendPads([pad(0)]);
  await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);assert.equal(await root.locator('[data-participant]').count(),1,'fresh confirm opens participant breakdown');assert.equal(await snapshot(),settled);
  await app.sendPads([pad(0,[15])]);await app.sendPads([pad(0)]);assert.equal(await root.getByRole('button',{name:'Race again',exact:true}).evaluate(n=>n===document.activeElement),true);
  // Non-result actions remain consumed without movement, items or clock changes.
  for(const button of [2,3,4,9]){await app.sendPads([pad(0,[button])]);await app.sendPads([pad(0)]);}assert.equal(await snapshot(),settled);
  await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);assert.equal(await root.isVisible(),false);assert.equal(await f.locator('#local-play').isVisible(),true);
  assert.equal(await app.onSession(function(){return JSON.stringify(this.result);}),frozen,'previous session result survives retry');assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);
 }finally{await app.close();}
});

for(const mode of ['survive','relay'])test(`assigned controller terminal routing preserves ${mode} results`,{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{
  const f=app.frame;if(mode==='survive'){await f.locator('#play').click();await f.locator('#pause').click();}await f.locator('#local-play').click();await f.locator('#session-roster [data-seat="p2"]').click();await f.getByRole('button',{name:'Leave this seat',exact:true}).click();await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);if(mode==='relay')await f.locator('#relay-play').click();await f.locator('#local-session-start').click();await app.advance(32);
  if(mode==='relay'){await sessionHudAction(app, 'p1', 'item');await f.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();await f.getByRole('button',{name:"Start P2's leg",exact:true}).click();}
  else {await sessionHudAction(app, 'p1', 'item');await f.getByRole('button',{name:'Leave P1 run',exact:true}).click();await f.getByRole('button',{name:'Leave run',exact:true}).click();}
  if(await app.onGame(function(){return this.state==='paused';}))await f.locator('#pause').click();
  await app.sendPads([pad(0)]);
  for(let i=0;i<180;i++){const state=await app.onSession(function(){const p=this.players.find(p=>p.seat==='p2');return {offer:!!p.recovery.offer,row:this.world.rows.get(p.y)?.kind};});if(state.offer)break;if(state.row!=='road'){await app.sendPads([pad(0,[12])]);await app.sendPads([pad(0)]);}await app.advance(200);}
  assert.equal(await app.onSession(function(){return !!this.players.find(p=>p.seat==='p2').recovery.offer;}),true,'real traffic creates a personal offer');
  if(mode==='relay')await f.getByRole('button',{name:'Continue without revive',exact:true}).click();else await app.advance(8500);const root=f.locator(mode==='relay'?'#relay-handoff[data-phase=ended]':'#survive-results-root');await root.waitFor({state:'visible'});const frozen=await app.onSession(function(){return JSON.stringify(this.result);});
  const next=root.getByRole('button',{name:mode==='relay'?'Next result page':'Next results',exact:true});const paged=await next.isEnabled();await (paged?next:root.getByRole('button',{name:'Seed',exact:true})).focus();await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);assert.equal(await root.isVisible(),true);if(!paged){await root.getByRole('button',{name:'Back to results',exact:true}).focus();await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);}assert.equal(await app.onSession(function(){return JSON.stringify(this.result);}),frozen);
  await root.getByRole('button',{name:'Hop again',exact:true}).focus();await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);assert.equal(await root.isVisible(),false);assert.equal(await app.onSession(function(){return JSON.stringify(this.result);}),frozen);assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});
