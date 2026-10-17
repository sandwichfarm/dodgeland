import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarketGameFixture, sessionHudAction } from './market-game-fixture.mjs';
import { loadSources } from './source-loader.mjs';
import { snapshotRealm, recordInterval } from '../tools/release-coverage/browser.mjs';
import { SOLO_DEFINITION_SOURCE_HASH, validateSoloDefinition } from '../tools/release-coverage/solo-definition-evidence.mjs';

test('visible seeded 49/50/51 hops carry a fractional platform baton through the unchanged built world', {timeout:120000}, async()=>{
 const evidence={errors:[],external:[],checkpoints:[]};
 const sources=await loadSources(['game']);const {platformSupports}=await sources.import('game');
 const app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{sender:'relay-continuity-proof',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed:'ph3-00000064-pond-s-n'}}});
 const read=()=>app.onSession(function(){const p=this.players[0],host=this.world.host;return {x:p.x,y:p.y,health:p.health,hop:p.hop,time:this.world.time,scale:this.world.rules.simulation.worldTimeScale,rows:[...this.world.rows],state:p.state,
   safeForward:!host.mobHazard(p.x,p.y,p.x,p.y+1,this.world.time,this.world.time+.15,.4)};});
 try {
  await app.frame.locator('#local-play').click();await app.frame.locator('#relay-play').click();assert.equal(await app.frame.locator('#relay-tiles').inputValue(),'50');await app.frame.locator('#local-session-start').click();await app.advance(80);await app.frame.locator('#scene').focus();
  for(let row=1;row<=50;row++){
   let ready=false;
   for(let wait=0;wait<600&&!ready;wait++){
    const state=await read();assert.equal(state.state,'playing',`living approach to row ${row}`);
    const rows=new Map(state.rows),next=rows.get(row);ready=state.safeForward;
    if(row===49)ready=platformSupports(next,state.x,state.time+.145*state.scale)&&platformSupports(rows.get(50),state.x,state.time+.40*state.scale);
    if(row===50)ready=platformSupports(next,state.x,state.time+.145*state.scale);
    if(!ready)await app.advance(25);
   }
   assert.equal(ready,true,`safe visible approach to row ${row}`);await app.page.keyboard.press('w');await app.advance(170);
   const state=await read();assert.equal(state.y,row,`real forward key reaches row ${row}`);assert.equal(state.state,'playing');
   if(row===49){assert.equal(await app.frame.locator('#relay-handoff').count(),0);evidence.checkpoints.push({row,state});}
  }
  await app.frame.getByRole('heading',{name:'Leg 1 complete',exact:true}).waitFor();
  const snapshot=()=>app.onSession(function(){return {time:this.world.time,tick:this.world.simulationTick,rows:[...this.world.rows],seed:this.world.seed,mobs:this.world.host.mobs,claims:[...this.world.pickupOwners]};});
  // RNG is an opaque closure: prove identity here; semantic next-draw proof is in relay-boundary.test.mjs.
  const before=await snapshot(),outgoing=await read();assert.notEqual(outgoing.x,Math.round(outgoing.x),'actual platform carry produces fractional x');
  await app.onSession(function(){window.marketGameFixture.observedRelayOwners={world:this.world,rows:this.world.rows,rng:this.world.host.mobDirector.rng};});
  const assets=()=>app.onSession(function(){return this.players.map(p=>({seat:p.seat,wallet:p.run.wallet,cards:p.run.cards,health:p.health,earned:p.completedForwardTiles,power:p.powerRemaining,recovery:{charge:p.recovery?.charge,personalHighWater:p.recovery?.personalHighWater,nextRecharge:p.recovery?.nextRecharge,deathGeneration:p.recovery?.deathGeneration,offer:p.recovery?.offer}}));});
  const personal=await assets();await app.advance(500);assert.deepEqual(await snapshot(),before);
  await app.page.keyboard.press('ArrowUp');assert.equal(await app.frame.locator('#relay-handoff').count(),0);assert.deepEqual(await snapshot(),before);assert.deepEqual(await assets(),personal);
  assert.equal(await app.onSession(function(){const o=window.marketGameFixture.observedRelayOwners;return this.world===o.world&&this.world.rows===o.rows&&this.world.host.mobDirector.rng===o.rng;}),true);
  assert.deepEqual(await app.onSession(function(){return {x:this.players[1].x,y:this.players[1].y};}),{x:outgoing.x,y:50});
  await app.page.keyboard.press('ArrowUp');await app.advance(170);assert.equal(await app.onSession(function(){return this.world.frontier;}),51);assert.equal(await app.onSession(function(){return this.players[1].completedForwardTiles;}),1);
  evidence.checkpoints.push({row:50,outgoing,world:before},{row:51,personal:await assets()});
  await app.iframe.screenshot({path:'/tmp/relay-runtime-earned-51.png'});assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await app.frame.evaluate(()=>window.marketGameFixture.forbidden),[]);
 }finally {const {writeFile}=await import('node:fs/promises');await writeFile('/tmp/relay-runtime-earned-continuity.json',JSON.stringify(evidence,null,2));await app.close();await sources.dispose();}
});

async function start(app, length = 50) {
  await app.frame.locator('#local-play').click();
  await app.frame.locator('#relay-play').click();
  await app.frame.locator('#relay-tiles').fill(String(length));
  await app.frame.locator('#local-session-start').click(); await app.advance(80);
  await app.onSession(function () { for (const lane of this.world.rows.values()) Object.assign(lane, {kind:'meadow',blocked:[],decorations:[],actors:undefined,coin:null}); });
}
async function marketStock(app) {
  await app.onSession(function () {
    for (const player of this.players) {
      const run=player.run; run.advanceScore(100); run.creditCoins(200);
      const item=run.catalog.get('magnet'); run.market.offers=[{id:'active-offer',itemId:item.id,price:item.price,sold:false,section:'cards'}]; run.revision++;
    }
  }); await app.advance(80);
}
const owners = app => app.onSession(function () { return this.players.map(p=>({seat:p.seat,wallet:p.run.wallet,cards:p.run.cards,open:p.run.isOpen,revision:p.run.revision})); });

test('built active Relay market buys through the existing authoritative adapter without installing world consumables', {timeout:30000}, async()=>{
  const evidence={errors:[],external:[]}, app=await createMarketGameFixture(evidence);
  try {
    await start(app);
    for(const light of [false,true]) for(const [width,height] of [[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]]) {
      await app.resize(width,height);await app.frame.evaluate(light=>window.marketGameFixture.setTheme({colors:light?{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'}}),light);
      if(width>=240) assert.deepEqual(await app.frame.locator('#run-hand-owner, #run-hand-items').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.top<0||r.left<0||r.right>innerWidth+1||r.bottom>innerHeight+1;}).map(n=>n.id)),[]);
      await app.iframe.screenshot({path:`/tmp/relay-runtime-empty-${width}x${height}-${light?'light':'dark'}.png`});
    }
    await app.resize(900,600);await app.key('pause');await marketStock(app);
    const before=await owners(app);
    assert.equal(await app.onSession(function(){return this.consumableSnapshot()===undefined;}),true);
    await app.frame.locator('#market-open').click(); await app.advance(100);
    assert.equal((await owners(app))[0].open,true,'valid active runner must open its real inventory');
    await app.frame.locator('[data-market-action="inspect"][data-id="offer:active-offer"]').click();
    await app.frame.locator('#market-inspect-action').click(); await app.advance(100);
    const after=await owners(app); assert.equal(after[0].cards.length,1); assert.ok(after[0].wallet<before[0].wallet); assert.deepEqual(after[1],before[1]);
    assert.equal(await app.onSession(function(){return this.consumableSnapshot()===undefined;}),true);
    assert.equal(await app.frame.locator('[data-market-action="buy-consumable"]').count(),0);
    assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.external,[]);
  } finally {await app.close();}
});

test('built inactive Relay inspection names its owner and exposes the exact read-only reason in the single tree', {timeout:30000}, async()=>{
  const evidence={errors:[],external:[]}, app=await createMarketGameFixture(evidence);
  try {
    await start(app); await marketStock(app);
    await app.frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click(); await app.advance(80);
    await app.frame.locator('#market-open').click(); await app.advance(100);
    assert.match(await app.frame.locator('#market-owner').innerText(),/^Viewing P2 · /);
    assert.match(await app.frame.locator('#market-window').innerText(),/Only the active runner can use the relay hand\./);
    assert.equal(await app.frame.locator('#market').count(),1); assert.equal(await app.frame.locator('#run-inventory').count(),1);
    assert.equal(await app.frame.locator('#run-hand-items').innerText(),'Items: —');
    const before=await owners(app); await app.advance(1000); assert.deepEqual(await owners(app),before);
    assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.external,[]);
  } finally {await app.close();}
});

const pad = (index, pressed = [], id = `Relay controller ${index}`) => ({index,id,mapping:'standard',connected:true,timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:false}))});
async function safe(app) { await app.onSession(function(){for(const lane of this.world.rows.values()) Object.assign(lane,{kind:'meadow',blocked:[],decorations:[],actors:undefined,coin:null});}); }
async function request(app, kind='buy') {
  return app.onSession(function(kind){const p=this.players[0],c=this.coOpMarketSnapshot();return {actionId:`captured-${kind}`,seat:p.seat,device:p.device,participantId:p.participantId,expectedOwnerGeneration:c.ownerGeneration,expectedInventoryGeneration:c.inventoryGeneration,expectedRunRevision:c.runRevision,expectedContextGeneration:c.contextGeneration,kind,offerId:'active-offer',itemId:'revival'};},kind);
}
async function apply(app, value) {return app.onSession(function(value){return this.actCoOpMarket(value);},value);}
async function captureOwnerSurface(app,name) {
 for(const light of [false,true]) for(const [width,height] of [[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]]) {
  await app.resize(width,height);await app.frame.evaluate(light=>window.marketGameFixture.setTheme({colors:light?{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'}}),light);await app.advance(50);
  assert.equal(await app.frame.locator('#market').count(),1);assert.equal(await app.frame.locator('#run-inventory').count(),1);
  if(width>=240) {
   assert.equal(await app.frame.locator('#market').isVisible(),true);
   const invalid=await app.frame.locator('#market-owner-strip button, #market-close, #market-claim, #market-inspect-action').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.width<28||r.height<28||r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1;}).map(n=>n.id||n.textContent));if(invalid.length) await app.iframe.screenshot({path:`/tmp/relay-runtime-${name}-clip.png`});assert.deepEqual(invalid,[],`${name} ${width}x${height}`);
  }
  await app.iframe.screenshot({path:`/tmp/relay-runtime-${name}-${width}x${height}-${light?'light':'dark'}.png`});
 }
 await app.resize(900,600);
}
async function boundaryEvidence(app,evidence) {assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await app.frame.evaluate(()=>window.marketGameFixture.forbidden),[]);}

test('actual Relay owner transactions reject all ineligible items before debit and stale lifecycle generations after reclaim', {timeout:30000}, async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true});
 try {
  await start(app);await marketStock(app);await app.frame.locator('#market-open').click();await app.advance(100);
  const before=await owners(app),stale=await request(app);
  for(const itemId of ['revival','flare']) {
   const result=await apply(app,{...stale,actionId:`ineligible-${itemId}`,kind:'buy-consumable',itemId});
   assert.equal(result.ok,false);assert.match(result.message,new RegExp('is not available in Relay\\.'));assert.deepEqual(await owners(app),before);
  }
  assert.equal(await app.onSession(function(){return this.useConsumable({ownerSeat:'p1',itemId:'flare'});}),false);
  await app.frame.locator('[data-market-action="inspect"][data-id="offer:active-offer"]').click();
  await app.onSession(function(){return this.deviceLost('p1');});await app.advance(100);
  assert.equal(await app.frame.locator('#market').isVisible(),false);assert.equal(await app.frame.locator('#run-hand-detail').isVisible(),false);
  const lost=await owners(app);assert.equal((await apply(app,stale)).ok,false);assert.deepEqual(await owners(app),lost);
  await app.onSession(function(){return this.reclaim('p1','keyboard-a');});await app.advance(100);
  assert.equal((await apply(app,stale)).ok,false);assert.equal((await owners(app))[0].wallet,before[0].wallet);
  assert.equal(await app.frame.locator('#market-inspect').isVisible(),false);
  await boundaryEvidence(app,evidence);
 }finally{await app.close();}
});

test('keyboard fallback inspection pauses deliberately, closes cleanly, and handoff rejects captured owner actions', {timeout:30000}, async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true});
 try {
  await start(app,1);await marketStock(app);await app.frame.locator('#market-open').click();await app.advance(100);
  const stale=await request(app),time=await app.onSession(function(){return this.world.time;});
  await app.frame.locator('#market-owner-strip [data-id="p2"]').click();await app.advance(1000);
  assert.equal(await app.onSession(function(){return this.world.time;}),time);
  assert.equal((await apply(app,stale)).ok,false);
  await app.key('market');await app.advance(100);assert.equal(await app.frame.locator('#market').isVisible(),false);
  await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);
  assert.equal(await app.frame.getByRole('heading',{name:'Leg 1 complete'}).isVisible(),true);
  const frozen=await app.onSession(function(){return {time:this.world.time,positions:this.players.map(p=>[p.x,p.y,p.hop]),assets:this.players.map(p=>[p.run.wallet,p.run.cards,p.personalScore])};});
  await app.advance(1000);await app.page.keyboard.press('w');await app.advance(100);
  assert.deepEqual(await app.onSession(function(){return {time:this.world.time,positions:this.players.map(p=>[p.x,p.y,p.hop]),assets:this.players.map(p=>[p.run.wallet,p.run.cards,p.personalScore])};}),frozen);
  await app.page.keyboard.press('ArrowUp');await app.advance(100);
  assert.equal(await app.frame.locator('#relay-handoff').count(),0);assert.equal((await apply(app,stale)).ok,false);
  assert.equal(await app.onSession(function(){return this.players[1].personalScore;}),0,'confirmation and placement give no personal credit');
  await boundaryEvidence(app,evidence);
 }finally{await app.close();}
});

test('mixed keyboard/controller Relay preserves per-seat calls, fresh boards, recovery, waiting, immutable results and retry', {timeout:90000}, async()=>{
 const evidence={errors:[],external:[]},fingerprints={};
 for(const selected of ['butter','sunny']) {
  const calibration=await createMarketGameFixture(evidence,{observeAudio:true,selected,auditBoundary:true});
  try {await calibration.frame.locator('#play').click();await calibration.frame.locator('#character-call').click();await calibration.advance(20);fingerprints[selected]=await calibration.frame.evaluate(()=>window.marketGameFixture.voices.filter(v=>!v.loop).at(-1).fingerprint);await boundaryEvidence(calibration,evidence);}finally{await calibration.close();}
 }
 assert.notEqual(fingerprints.butter,fingerprints.sunny);
 const app=await createMarketGameFixture(evidence,{gamepads:true,observeAudio:true,auditBoundary:true});
 const calls=()=>app.frame.evaluate(()=>window.marketGameFixture.voices.filter(v=>!v.loop).map(v=>v.fingerprint));
 const count=async id=>(await calls()).filter(v=>v===fingerprints[id]).length;
 const heading=name=>app.frame.getByRole('heading',{name});
 try {
  await app.frame.locator('#local-play').click();await app.frame.locator('#session-roster [data-seat="p2"]').click();await app.frame.getByRole('button',{name:'Leave this seat',exact:true}).click();
  await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);
  await app.frame.locator('#relay-play').click();await app.frame.locator('#relay-tiles').fill('1');await app.frame.locator('#local-session-start').click();await app.advance(80);await safe(app);
  assert.deepEqual(await app.onSession(function(){return this.players.map(p=>[p.seat,p.device,p.characterId]);}),[['p1','keyboard-a','butter'],['p2','gamepad-0','sunny']]);
  await app.frame.locator('#scene').focus();const b=await count('butter'),p=await count('sunny');
  await app.page.keyboard.press('q');assert.equal(await count('butter'),b+1);await app.page.keyboard.press('q');assert.equal(await count('butter'),b+1);
  await app.sendPads([pad(0,[2])]);assert.equal(await count('sunny'),p,'inactive call has no authority');await app.sendPads([pad(0)]);
  const initial=await app.onSession(function(){return this.players.map(p=>[p.x,p.y]);});await app.sendPads([pad(0,[12])]);await app.advance(200);assert.deepEqual(await app.onSession(function(){return this.players.map(p=>[p.x,p.y]);}),initial);
  await app.sendPads([]);const live=await app.onSession(function(){return this.world.time;});await app.advance(200);assert.ok(await app.onSession(function(){return this.world.time;})>live,'inactive loss continues');
  await app.sendPads([pad(0,[0])]);assert.equal(await app.frame.locator('#survive-lifecycle-board').count(),0);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await heading(/Continue as/).waitFor();await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);
  await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(240);assert.equal(await heading('Leg 1 complete').isVisible(),true);
  const frozen=await app.onSession(function(){return this.world.time;});await app.advance(600);assert.equal(await app.onSession(function(){return this.world.time;}),frozen);
  await app.page.keyboard.press('w');assert.equal(await heading('Leg 1 complete').isVisible(),true);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0,[0])]);
  assert.equal(await app.frame.locator('#relay-handoff').count(),0);assert.equal(await app.onSession(function(){return this.players[1].personalScore;}),0);
  await app.sendPads([pad(0)]);await app.sendPads([pad(0,[2])]);assert.equal(await count('sunny'),p+1);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[2])]);assert.equal(await count('sunny'),p+1);await app.sendPads([pad(0)]);await app.advance(500);await app.sendPads([pad(0,[2])]);assert.equal(await count('sunny'),p+2);await app.sendPads([pad(0)]);
  await marketStock(app);await app.frame.locator('#market-open').click();await app.advance(100);assert.equal(await app.frame.locator('#market').isVisible(),true);assert.match(await app.frame.locator('#market-owner').innerText(),/^Viewing P2 · /);const funds=await owners(app);await app.iframe.screenshot({path:'/tmp/relay-runtime-controller-market.png'});await app.frame.locator('[data-market-action="inspect"][data-id="offer:active-offer"]').click();await app.frame.locator('#market-inspect-action').focus();await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);assert.equal((await owners(app))[1].cards.length,1);assert.ok((await owners(app))[1].wallet<funds[1].wallet);assert.equal((await owners(app))[0].wallet,funds[0].wallet);await app.key('market');
  await app.sendPads([]);assert.equal(await heading('P2 controller disconnected.').isVisible(),true);const stopped=await app.onSession(function(){return this.world.time;});await app.advance(1000);assert.equal(await app.onSession(function(){return this.world.time;}),stopped);
  await app.sendPads([pad(1),pad(0,[],'wrong-device')]);await app.sendPads([pad(1,[0]),pad(0,[0],'wrong-device')]);assert.equal(await app.frame.locator('#survive-lifecycle-board').count(),0);
  await app.frame.getByRole('button',{name:'Skip P2',exact:true}).click();await app.frame.getByRole('button',{name:'Back',exact:true}).click();
  await app.frame.getByRole('button',{name:'Skip P2',exact:true}).click();await app.frame.getByRole('button',{name:'Skip P2',exact:true}).click();await app.frame.getByRole('button',{name:"Start P1's leg",exact:true}).click();
  await app.onGame(function(){this.end('Runtime real train death','train');});await app.advance(80);assert.equal(await heading('P1 can return').isVisible(),true);await app.frame.getByRole('button',{name:'Revive P1',exact:true}).click();await app.advance(80);
  assert.equal(await app.onSession(function(){return this.players[0].recovery.charge;}),'spent');
  await sessionHudAction(app, 'p1', 'item');await app.frame.getByRole('button',{name:'Keep playing',exact:true}).click();await sessionHudAction(app, 'p1', 'item');await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();
  assert.equal(await heading('Waiting for a player to reclaim.').isVisible(),true);
  await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await heading(/Continue as/).waitFor();await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);
  await app.sendPads([pad(0,[3])]);await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();assert.equal(await heading('Relay results').isVisible(),true);
  const result=await app.onSession(function(){return this.result;});await app.sendPads([pad(0,[12])]);await app.page.keyboard.press('w');await app.advance(500);assert.deepEqual(await app.onSession(function(){return this.result;}),result);
  await app.frame.getByRole('button',{name:'Hop again',exact:true}).click();await app.advance(100);assert.equal(await app.frame.locator('#relay-handoff').count(),0);assert.deepEqual(await app.onSession(function(){return this.result;}),result,'teardown cannot mutate old result');await boundaryEvidence(app,evidence);
 }finally{await app.close();}
});

test('paid Relay pack and sale remain with active owner while inactive inspection clears all draft selections', {timeout:45000}, async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true});
 const settle=()=>app.advance(300), snapshot=()=>app.onSession(function(){return this.players.map(p=>({seat:p.seat,wallet:p.run.wallet,cards:p.run.cards,pending:p.run.pendingPack}));});
 const observe=async()=>{
  const game=await app.onGame(function(){
   const normalize=v=>v===undefined?{__undefined:true}:typeof v==='function'?{__function:true}:Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
   const frozen=v=>!v||typeof v!=='object'||Object.isFrozen(v)&&Object.values(v).every(frozen);
   return {base:this.definition.id,state:this.state,definitionEvidence:{snapshot:normalize(this.definition),rulesIdentity:this.rules===this.definition.rules&&this.world.definition===this.definition&&this.world.rules===this.rules,deepFrozen:frozen(this.definition)}};
  });
  const definitionEvidence={...game.definitionEvidence,sourceHash:SOLO_DEFINITION_SOURCE_HASH};validateSoloDefinition(definitionEvidence,game.base);
  const actual=await app.onSession(function(){return {base:this.definition.id,kind:this.mode?.handlers.retainDeadDevice?'race':this.mode?.handlers.canAct?'relay':'other',participants:this.players.length,sessionId:this.id,active:this.active};});
  const ownership=await app.sessionOwnership();
  assert.equal(actual.base,'stroll');assert.equal(game.base,actual.base);assert.equal(game.state,'playing');assert.equal(actual.kind,'relay');assert.equal(actual.active,true);
  assert.equal(ownership.sessionActive,true);assert.equal(ownership.playerSessionAbsent,false);assert.ok(ownership.sessionBindings>0);assert.equal(ownership.stageBindings,0);
  assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'playing');
  return {mode:'relay',base:game.base,kind:actual.kind,state:game.state,participants:actual.participants,sessionId:actual.sessionId,definitionEvidence};
 };
 async function inspect(source,id){if(await app.frame.locator('#market-inspect').isVisible()){await app.frame.locator('#market-inspect-back').click();await settle();}const tile=app.frame.locator(`[data-market-action="inspect"][data-id="${source}:${id}"]`);for(let i=0;i<10&&!await tile.isVisible();i++){await app.frame.locator('#market-next').click();await settle();}await tile.click();await app.frame.locator('#market-inspect-action').click();await settle();}
 try{
  await start(app);await app.onSession(function(){for(const p of this.players){const r=p.run;r.advanceScore(100);r.creditCoins(600);r.open();for(const id of ['magnet','traffic-speed','platform-length']){const item=r.catalog.get(id);r.market.offers=[{id,itemId:id,price:item.price,sold:false,section:'cards'}];if(!r.buy(id).ok)throw Error('prior inventory');}const item=r.catalog.get('pack-satchel');r.market.offers=[{id:'paid-pack',itemId:item.id,price:item.price,sold:false,section:'extras'}];r.state=0;r.revision++;if(p.seat==='p2'&&!r.buy('paid-pack').ok)throw Error('prior paid draft');r.close();}});await settle();
  // Attribute actual owner UI actions only; the pre-owned hand, offers and
  // funds above remain explicit arrangements outside the measured interval.
  const beforeInterval=await snapshotRealm(app.frame,await observe());
  await app.frame.locator('#market-open').click();await settle();
  const before=await snapshot();await inspect('offer','paid-pack');const paid=await snapshot();assert.ok(paid[0].pending);assert.ok(paid[0].wallet<before[0].wallet);assert.deepEqual(paid[1],before[1]);
  const choice=await app.onSession(function(){const r=this.players[0].run;return r.pendingPack.choices.find(c=>r.previewPack([c.id],[r.cards[0].id]).capacity===r.cardCapacity);});await captureOwnerSurface(app,'paid-pack');await inspect('choice',choice.id);await app.frame.locator('#market-claim').click();await settle();await inspect('discard',paid[0].cards[1].id);
  await app.frame.locator('#market-owner-strip [data-id="p2"]').click();await settle();assert.equal(await app.frame.locator('#market-inspect').isVisible(),false);assert.equal(await app.frame.locator('#run-hand-detail').isVisible(),false);assert.deepEqual(await snapshot(),paid);assert.equal(await app.frame.locator('#market-close').isVisible(),true);await captureOwnerSurface(app,'readonly');await app.frame.locator('#market-close').click();await settle();assert.equal(await app.frame.locator('#market').isVisible(),false);assert.deepEqual(await snapshot(),paid);await app.frame.locator('#market-open').click();await settle();
  await app.frame.locator(`[data-hand-card="${paid[1].cards[0].id}"]`).click();await settle();assert.equal(await app.frame.locator('#run-hand-sell').isEnabled(),false);assert.match(await app.frame.locator('#run-hand-detail').innerText(),/Only the active runner can use the relay hand\./);
  await app.frame.locator('#market-owner-strip [data-id="p1"]').click();await settle();assert.match(await app.frame.locator('#market-pick-count').innerText(),/0\s*\/\s*1/);assert.deepEqual(await snapshot(),paid);
  await inspect('choice',choice.id);await app.frame.locator(`[data-hand-card="${paid[0].cards[0].id}"]`).click();await settle();await app.frame.locator('#run-hand-sell').click();await settle();const sold=await snapshot();assert.equal(sold[0].wallet,paid[0].wallet+paid[0].cards[0].saleValue);assert.deepEqual(sold[0].pending,paid[0].pending);assert.deepEqual(sold[1],paid[1]);
  await app.frame.locator('#market-claim').click();await settle();const claimed=await snapshot();assert.equal(claimed[0].pending,null);assert.deepEqual(claimed[0].cards.map(c=>c.id),[...paid[0].cards.slice(1).map(c=>c.id),choice.id]);assert.deepEqual(claimed[1],paid[1]);await boundaryEvidence(app,evidence);
  await app.frame.locator('#market-close').click();await app.advance(350);
  if(await app.onGame(function(){return this.state==='paused';}))await app.key('pause');
  assert.deepEqual(await snapshot(),claimed,'closing the market retains both owners and the selected pack result');
  const afterInterval=await snapshotRealm(app.frame,await observe());
  if(beforeInterval)recordInterval(beforeInterval,afterInterval,'relay-paid-pack-sale-owner');
 }finally{await app.close();}
});

for(const transition of ['death','leave']) test(`every captured market action loses authority after actual ${transition}`,{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true});
 try{
  await start(app);await marketStock(app);await app.frame.locator('#market-open').click();await app.advance(80);const stale=await request(app);
  await app.frame.locator('[data-market-action="inspect"][data-id="offer:active-offer"]').click();
  await app.onSession(function(transition){if(transition==='death'){this.players[0].run.close();this.world.host.resume();this.world.host.end('Runtime real death','train');this.update(1/120);}else this.depart('p1');},transition);await app.advance(100);
  assert.equal(await app.frame.locator('#market').isVisible(),false);assert.equal(await app.frame.locator('#market-inspect').isVisible(),false);assert.equal(await app.frame.locator('#run-hand-detail').isVisible(),false);
  const after=await owners(app);for(const kind of ['open','close','buy','sell','claim-pack','skip-pack','equip','buy-consumable']){assert.equal((await apply(app,{...stale,kind,actionId:`stale-${transition}-${kind}`})).ok,false);assert.deepEqual(await owners(app),after);}
  if(transition==='death'){await app.frame.getByRole('button',{name:'Continue without revive',exact:true}).click();await app.advance(80);}
  await app.frame.getByRole('button',{name:"Start P2's leg",exact:true}).click();await app.advance(80);assert.equal((await apply(app,stale)).ok,false);assert.equal(await app.onSession(function(){return this.consumableSnapshot()===undefined;}),true);await boundaryEvidence(app,evidence);
 }finally{await app.close();}
});

for (const activation of ['Enter','Space']) test(`handoff ${activation} activates the focused Start, View, roster and Back controls without a hop`, {timeout:30000}, async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true});
 try {
  await app.frame.locator('#local-play').click();await app.frame.locator('#relay-play').click();await app.frame.locator('#relay-tiles').fill('1');await app.frame.locator('#local-session-start').click();await app.advance(80);
  await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);
  const board=app.frame.locator('#relay-handoff');await app.frame.getByRole('heading',{name:'Leg 1 complete'}).waitFor();
  const positions=()=>app.onSession(function(){return this.players.map(p=>({seat:p.seat,x:p.x,y:p.y,earned:p.completedForwardTiles}));});
  const frozen=await positions();
  await app.page.keyboard.press('Tab');assert.equal(await app.frame.evaluate(()=>document.activeElement.textContent),'View relay');
  await app.page.keyboard.press(activation);assert.equal(await board.getAttribute('data-summary'),'true');assert.deepEqual(await positions(),frozen);
  await app.page.keyboard.press('Tab');assert.equal(await app.frame.evaluate(()=>document.activeElement.textContent),'Next');await app.page.keyboard.press(activation);assert.match(await board.locator('.relay-summary').innerText(),/2\/2 · P2/);
  await app.page.keyboard.press('Tab');assert.equal(await app.frame.evaluate(()=>document.activeElement.textContent),'Previous');await app.page.keyboard.press(activation);assert.match(await board.locator('.relay-summary').innerText(),/1\/2 · P1/);
  assert.equal(await app.frame.evaluate(()=>document.activeElement.textContent),'Back to handoff');await app.page.keyboard.press(activation);assert.equal(await board.getAttribute('data-summary'),'false');assert.equal(await app.frame.evaluate(()=>document.activeElement.textContent),"Start P2's leg");
  assert.deepEqual(await positions(),frozen);await app.page.keyboard.down(activation);await app.advance(120);assert.equal(await board.count(),0);
  const placed=await positions();assert.equal(placed[1].earned,0);assert.equal(placed[1].y,1);await app.page.keyboard.down(activation);await app.advance(120);assert.deepEqual(await positions(),placed);await app.page.keyboard.up(activation);
  for(const seat of ['p2','p1']){
   await sessionHudAction(app, seat, 'item');await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();
   if(seat==='p2')await app.page.keyboard.press(activation);
  }
  await app.frame.getByRole('heading',{name:'Relay results',exact:true}).waitFor();await app.page.keyboard.press(activation);assert.equal(await board.getAttribute('data-result-view'),'players','departed keyboard owners retain terminal navigation');
  for(let i=0;i<4&&await app.frame.evaluate(()=>document.activeElement.textContent)!=='Hop again';i++)await app.page.keyboard.press('Tab');
  assert.equal(await app.frame.evaluate(()=>document.activeElement.textContent),'Hop again');await app.page.keyboard.press(activation);assert.equal(await board.count(),0);
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);
 }finally{await app.close();}
});

test('handoff controller focus activates read-only roster controls while only a fresh incoming seat can Start', {timeout:30000}, async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true});
 const edge=async button=>{await app.sendPads([pad(0)]);await app.sendPads([pad(0,[button])]);await app.sendPads([pad(0)]);};
 try{
  await app.frame.locator('#local-play').click();await app.frame.locator('#session-roster [data-seat="p2"]').click();await app.frame.getByRole('button',{name:'Leave this seat',exact:true}).click();await edge(0);
  await app.frame.locator('#relay-play').click();await app.frame.locator('#relay-tiles').fill('1');await app.frame.locator('#local-session-start').click();await app.advance(80);
  await app.sendPads([pad(0,[0])]);await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);
  const board=app.frame.locator('#relay-handoff');await app.frame.getByRole('heading',{name:'Leg 1 complete'}).waitFor();
  await app.sendPads([pad(0,[0])]);assert.equal(await board.count(),1,'held incoming confirm is stale across the boundary');
  await app.page.keyboard.press('Enter');await app.page.keyboard.press('Space');await app.page.keyboard.press('w');assert.equal(await board.count(),1,'keyboard P1 cannot start controller P2');
  await edge(15);assert.equal(await app.frame.evaluate(()=>document.activeElement.textContent),'View relay');await edge(0);assert.equal(await board.getAttribute('data-summary'),'true');
  await edge(15);assert.equal(await app.frame.evaluate(()=>document.activeElement.textContent),'Next');await edge(0);assert.match(await board.locator('.relay-summary').innerText(),/2\/2 · P2/);
  await edge(15);assert.equal(await app.frame.evaluate(()=>document.activeElement.textContent),'Previous');await edge(0);assert.match(await board.locator('.relay-summary').innerText(),/1\/2 · P1/);
  await edge(0);assert.equal(await board.getAttribute('data-summary'),'false');assert.equal(await app.frame.evaluate(()=>document.activeElement.textContent),"Start P2's leg");
  await edge(0);assert.equal(await board.count(),0);assert.equal(await app.onSession(function(){return this.players[1].completedForwardTiles;}),0);
  await app.advance(120);assert.equal(await app.onSession(function(){return this.players[1].y;}),1);assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);
 }finally{await app.close();}
});
