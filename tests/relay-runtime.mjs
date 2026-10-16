import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarketGameFixture } from './market-game-fixture.mjs';

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
  await app.frame.locator('[data-seat="p1"] [data-session-hud="item"]').click();await app.frame.getByRole('button',{name:'Keep playing',exact:true}).click();await app.frame.locator('[data-seat="p1"] [data-session-hud="item"]').click();await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();
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
 async function inspect(source,id){if(await app.frame.locator('#market-inspect').isVisible()){await app.frame.locator('#market-inspect-back').click();await settle();}const tile=app.frame.locator(`[data-market-action="inspect"][data-id="${source}:${id}"]`);for(let i=0;i<10&&!await tile.isVisible();i++){await app.frame.locator('#market-next').click();await settle();}await tile.click();await app.frame.locator('#market-inspect-action').click();await settle();}
 try{
  await start(app);await app.onSession(function(){for(const p of this.players){const r=p.run;r.advanceScore(100);r.creditCoins(600);r.open();for(const id of ['magnet','traffic-speed','platform-length']){const item=r.catalog.get(id);r.market.offers=[{id,itemId:id,price:item.price,sold:false,section:'cards'}];if(!r.buy(id).ok)throw Error('prior inventory');}const item=r.catalog.get('pack-satchel');r.market.offers=[{id:'paid-pack',itemId:item.id,price:item.price,sold:false,section:'extras'}];r.state=0;r.revision++;if(p.seat==='p2'&&!r.buy('paid-pack').ok)throw Error('prior paid draft');r.close();}});await settle();await app.frame.locator('#market-open').click();await settle();
  const before=await snapshot();await inspect('offer','paid-pack');const paid=await snapshot();assert.ok(paid[0].pending);assert.ok(paid[0].wallet<before[0].wallet);assert.deepEqual(paid[1],before[1]);
  const choice=await app.onSession(function(){const r=this.players[0].run;return r.pendingPack.choices.find(c=>r.previewPack([c.id],[r.cards[0].id]).capacity===r.cardCapacity);});await captureOwnerSurface(app,'paid-pack');await inspect('choice',choice.id);await app.frame.locator('#market-claim').click();await settle();await inspect('discard',paid[0].cards[1].id);
  await app.frame.locator('#market-owner-strip [data-id="p2"]').click();await settle();assert.equal(await app.frame.locator('#market-inspect').isVisible(),false);assert.equal(await app.frame.locator('#run-hand-detail').isVisible(),false);assert.deepEqual(await snapshot(),paid);assert.equal(await app.frame.locator('#market-close').isVisible(),true);await captureOwnerSurface(app,'readonly');await app.frame.locator('#market-close').click();await settle();assert.equal(await app.frame.locator('#market').isVisible(),false);assert.deepEqual(await snapshot(),paid);await app.frame.locator('#market-open').click();await settle();
  await app.frame.locator(`[data-hand-card="${paid[1].cards[0].id}"]`).click();await settle();assert.equal(await app.frame.locator('#run-hand-sell').isEnabled(),false);assert.match(await app.frame.locator('#run-hand-detail').innerText(),/Only the active runner can use the relay hand\./);
  await app.frame.locator('#market-owner-strip [data-id="p1"]').click();await settle();assert.match(await app.frame.locator('#market-pick-count').innerText(),/0\s*\/\s*1/);assert.deepEqual(await snapshot(),paid);
  await inspect('choice',choice.id);await app.frame.locator(`[data-hand-card="${paid[0].cards[0].id}"]`).click();await settle();await app.frame.locator('#run-hand-sell').click();await settle();const sold=await snapshot();assert.equal(sold[0].wallet,paid[0].wallet+paid[0].cards[0].saleValue);assert.deepEqual(sold[0].pending,paid[0].pending);assert.deepEqual(sold[1],paid[1]);
  await app.frame.locator('#market-claim').click();await settle();const claimed=await snapshot();assert.equal(claimed[0].pending,null);assert.deepEqual(claimed[0].cards.map(c=>c.id),[...paid[0].cards.slice(1).map(c=>c.id),choice.id]);assert.deepEqual(claimed[1],paid[1]);await boundaryEvidence(app,evidence);
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
