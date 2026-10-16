// Actual built controls and SDK snapshots; debugger observations are read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createMarketGameFixture, sessionControlsPage, sessionHudAction } from './market-game-fixture.mjs';
import {createHash} from 'node:crypto';
import {start as startRace,intent,earnTogether} from './race-browser-fixture.mjs';
const output = new URL('../artifacts/cross-mode-presentation/', import.meta.url);
await mkdir(output,{recursive:true});
const sourcePaths=['src/main.ts','src/render.ts','src/session-ui.css','src/race-ui.ts','src/race-ui.css','src/relay-ui.ts','src/relay-ui.css','src/run-hand.ts','src/run-hand.css','src/hand-layout.css','tests/cross-mode-presentation.mjs','tests/market-game-fixture.mjs'];
const hashes={};for(const path of [...sourcePaths,'dist/index.html'])hashes[path]=createHash('sha256').update(await readFile(new URL(`../${path}`,import.meta.url))).digest('hex');
await writeFile(new URL('source-provenance.json',output),JSON.stringify({created:new Date().toISOString(),hashes},null,2));
const pad = (index, pressed=[]) => ({index,id:`presentation-${index}`,connected:true,mapping:'standard',timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:+pressed.includes(i),touched:false}))});
const themes={dark:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'},light:{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}};
for(const activation of ['Enter','Space'])test(`P6 review settled child owns native Tab and ${activation} leave actions`,{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{await setup(app,'race');await app.resize(240,240);
  const state=()=>app.onSession(function(){return {time:this.world.time,players:this.players.map(p=>({id:p.participantId,seat:p.seat,x:p.x,y:p.y,wallet:p.run.wallet,participation:p.participation}))};});
  const before=await state();await sessionHudAction(app,'p1','item');await app.advance(100);
  const board=app.frame.locator('#survive-lifecycle-board'),focused=()=>app.frame.evaluate(()=>document.activeElement?.textContent);
  assert.equal(await focused(),'Keep racing');await app.page.keyboard.press('Tab');assert.equal(await focused(),'Leave Race');
  await app.page.keyboard.press('Tab');assert.equal(await focused(),'Keep racing');await app.page.keyboard.press('Shift+Tab');assert.equal(await focused(),'Leave Race');await app.page.keyboard.press('Shift+Tab');assert.equal(await focused(),'Keep racing');
  await app.page.keyboard.press(activation);await app.advance(100);assert.equal(await board.count(),0);
  assert.equal(await app.frame.locator('[data-seat="p1"] [data-session-hud="item"]').evaluate(n=>n===document.activeElement),true,'cancel restores original parent action');assert.deepEqual(await state(),before);
  await app.page.keyboard.press(activation);await app.advance(100);await app.page.keyboard.press('Tab');assert.equal(await focused(),'Leave Race');
  await app.page.keyboard.down('w');await app.page.keyboard.press(activation);await app.advance(100);await app.page.keyboard.up('w');
  assert.equal(await board.count(),0);assert.equal(await app.frame.locator('#session-seats').getAttribute('data-session-hud-inspect'),'false');assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'paused');
  const after=await state();assert.equal(after.players[0].participation,'departed');assert.deepEqual(after.players.slice(1),before.players.slice(1));assert.equal(after.time,before.time);assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});
test('P6 review recovery child native focus wraps and returns to the original owner',{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{await setup(app,'flow');await app.resize(240,240);await sessionHudAction(app,'p2','item');await app.advance(100);
  const focused=()=>app.frame.evaluate(()=>document.activeElement?.textContent),before=await app.onSession(function(){return {time:this.world.time,charges:this.consumableSnapshot(),players:this.players.map(p=>({id:p.participantId,x:p.x,y:p.y,wallet:p.run.wallet}))};});
  assert.equal(await app.frame.getByRole('button',{name:'Resume run',exact:true}).isVisible(),false,'existing compact recovery omits its redundant Resume action');
  assert.equal(await focused(),'Back to paused run');await app.page.keyboard.press('Tab');assert.equal(await focused(),'Leave P2 run');await app.page.keyboard.press('Tab');assert.equal(await focused(),'Back to paused run');await app.page.keyboard.press('Shift+Tab');assert.equal(await focused(),'Leave P2 run');await app.page.keyboard.press('Tab');
  await app.page.keyboard.press('Space');await app.advance(100);assert.equal(await app.frame.locator('#survive-recovery-board').count(),0);assert.equal(await app.frame.locator('[data-seat="p2"] [data-session-hud="item"]').evaluate(n=>n===document.activeElement),true);
  assert.deepEqual(await app.onSession(function(){return {time:this.world.time,charges:this.consumableSnapshot(),players:this.players.map(p=>({id:p.participantId,x:p.x,y:p.y,wallet:p.run.wallet}))};}),before);assert.equal(await app.frame.locator('.session-hud-selected').getAttribute('data-seat'),'p2');assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'paused');assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});
test('P6 review Controls live label announces only a changed page',{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{await setup(app,'race');await app.resize(240,240);await app.frame.locator('#session-controls-open').click();await app.advance(100);
  await app.frame.evaluate(()=>{const label=document.querySelector('#session-control-pages nav span');window.pageLabelChanges=[];window.pageLabelObserver=new MutationObserver(records=>window.pageLabelChanges.push(...records.map(()=>label.textContent)));window.pageLabelObserver.observe(label,{childList:true,characterData:true,subtree:true});});
  await app.advance(1000);assert.deepEqual(await app.frame.evaluate(()=>window.pageLabelChanges),[],'unchanged paused frames must not rewrite the live label');
  await app.frame.getByRole('button',{name:'Next controls',exact:true}).click();await app.advance(1000);assert.deepEqual(await app.frame.evaluate(()=>window.pageLabelChanges),['Tools']);assert.equal(await app.frame.locator('#session-control-pages nav span').getAttribute('aria-live'),'polite');await app.frame.evaluate(()=>window.pageLabelObserver.disconnect());assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});
function separated(a,b,gap=8){return a.right+gap<=b.left||b.right+gap<=a.left||a.bottom+gap<=b.top||b.bottom+gap<=a.top;}
async function setup(app,variant='arcade'){
  if(variant==='arcade'||variant==='flow'){await app.frame.evaluate(delivery=>window.marketGameFixture.deliverIntent(delivery),{...intent,payload:{seed:variant==='arcade'?'ph3-00000071-pond-a-n':'ph3-00000071-pond-s-n'}});await app.frame.locator('#play').click();await app.frame.locator('#pause').click();}
  await app.frame.locator('#local-play').click();
  for(let i=0;i<2;i++){await app.sendPads([pad(0),pad(1)]);await app.sendPads([pad(0,i===0?[0]:[]),pad(1,i===1?[0]:[])]);await app.sendPads([pad(0),pad(1)]);}
  if(variant==='race')await app.frame.locator('#race-play').click();
  if(variant==='relay')await app.frame.locator('#relay-play').click();
  await app.frame.locator('#local-session-start').click();await app.advance(80);
  assert.equal(await app.onSession(function(){return this.players.length;}),4);
  const mode=await app.onSession(function(){return {base:this.definition.id,composed:!!this.mode,sharedItems:!!this.consumableSnapshot(),coOpMarket:!!this.coOpMarket,restrictedActors:!!this.mode?.handlers.canAct};});assert.equal(mode.base,variant==='arcade'?'arcade':'stroll');assert.equal(mode.composed,true);if(variant==='arcade'||variant==='flow'){assert.equal(mode.coOpMarket,true);assert.equal(mode.sharedItems,true);assert.equal(mode.restrictedActors,false);}
  await app.frame.locator('#pause').click();await app.advance(32);
}
async function footprints(app){return app.frame.evaluate(()=>{
  const visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).clipPath!=='inset(50%)'&&!n.closest('[hidden]');
  return [...document.querySelectorAll('.session-hud-tile,.session-hud-details,.session-hud-summary,.score-block,.coin-count,#pluck,#character-power,#active-run-powers,.world-label,#chapter-label,.hud-tools button,.bottom-bar button,#run-hand-owner,#run-hand-items button,.relay-distance,.race-distance,.race-lifecycle,#session-controls-open,#toast,#idle,#market-open,#hint')].filter(visible).map(n=>{const r=n.getBoundingClientRect();return {name:n.id||n.className,rect:{left:r.left,top:r.top,right:r.right+3,bottom:r.bottom+3}};});
});}
async function capture(app,evidence,name){
  const travelers=await app.observeTravelers(),panels=await footprints(app);
  assert.ok(travelers.length,'actual traveler calls observed');
  const collisions=[];
  for(const p of travelers){assert.ok(p.bodies.length,`actual voxel draw for ${p.text}`);for(const body of [{rect:p.rect,kind:'label'},...p.bodies])for(const panel of panels)if(!separated(body.rect,panel.rect))collisions.push({traveler:p.text,kind:body.kind,panel:panel.name,body:body.rect,dom:panel.rect});}
  await app.iframe.screenshot({path:new URL(`${name}.png`,output).pathname});
  evidence.captures.push({name,travelers,panels,collisions});return collisions;
}
test('P6 tracer full production bodies and packed labels clear the four-seat HUD',{timeout:90000},async()=>{
  assert.equal(separated({left:0,right:10,top:0,bottom:10},{left:18,right:30,top:0,bottom:10}),true);
  assert.equal(separated({left:0,right:10,top:0,bottom:10},{left:17.99,right:30,top:0,bottom:10}),false);
  const evidence={errors:[],external:[],captures:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
  await mkdir(output,{recursive:true});
  try{await setup(app);for(const [name,colors]of Object.entries(themes)){await app.frame.evaluate(colors=>window.marketGameFixture.setTheme({colors}),colors);await app.advance(32);const collisions=await capture(app,evidence,`tracer-${name}`);assert.deepEqual(collisions,[],'G1 full body/nameplate versus visible DOM must have 8px clearance');}}
  finally{await writeFile(new URL('tracer-geometry.json',output),JSON.stringify(evidence,null,2));await app.close();}
});
for(const variant of ['arcade','flow','race','relay'])test(`P6 scene ${variant} initial and actual lateral travel`,{timeout:90000},async()=>{
 const evidence={errors:[],external:[],captures:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:{sender:'presentation-proof',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed:'ph3-00000071-pond-s-n'}}});
 try{await setup(app,variant);
  for(const pose of ['initial','left','right','right-positive']){
   if(pose!=='initial'){
    await app.frame.locator('#pause').click();await app.frame.locator('#scene').focus();
    const left=pose==='left';await app.page.keyboard.press(left?'a':'d');
    if(variant!=='relay'){await app.page.keyboard.press(left?'ArrowLeft':'ArrowRight');await app.sendPads([pad(0,[left?14:15]),pad(1,[left?14:15])]);await app.sendPads([pad(0),pad(1)]);}
    await app.advance(220);await app.frame.locator('#pause').click();await app.advance(32);
   }
   for(const [theme,colors]of Object.entries(themes)){await app.frame.evaluate(colors=>window.marketGameFixture.setTheme({colors}),colors);await app.advance(32);await capture(app,evidence,`${variant}-${pose}-${theme}`);}
  }
  assert.deepEqual(evidence.captures.flatMap(c=>c.collisions),[]);
  assert.ok(evidence.captures.every(c=>c.travelers.length===(variant==='relay'?1:4)));
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);
 }finally{await writeFile(new URL(`${variant}-scene.json`,output),JSON.stringify(evidence,null,2));await app.close();}
});
for(const variant of ['arcade','flow','race','relay'])test(`P6 frames ${variant} summaries and details`,{timeout:90000},async()=>{
 const evidence={errors:[],external:[],captures:[],failures:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{await setup(app,variant);
 for(const [theme,colors]of Object.entries(themes))for(const [width,height]of [[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]]){
  await app.resize(width,height);await app.frame.evaluate(colors=>window.marketGameFixture.setTheme({colors}),colors);await app.advance(32);
  const failures=await app.frame.evaluate(({width,height})=>{
   const failures=[],visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]');
   if(document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)failures.push('document overflow');
   if(width<240){if(document.querySelector('.too-small').textContent!=='Needs 240×240 to play — enlarge this pane.')failures.push('minimum copy');if([...document.querySelectorAll('button')].some(visible))failures.push('controls below minimum');return failures;}
   const seats=document.querySelector('#session-seats'),r=seats.getBoundingClientRect(),limit=width>=1600&&height>=900?416:width===240?108:height<420?80:width<480?144:160;
   if(r.bottom>limit+.5)failures.push(`top band ${r.bottom} > ${limit}`);
   for(const n of seats.querySelectorAll('button'))if(visible(n)){const r=n.getBoundingClientRect();if(r.width<43.5||r.height<43.5||r.left<0||r.right>width||r.top<0||r.bottom>height)failures.push(`control bounds ${n.textContent}`);}
   for(const n of document.querySelectorAll('.score-block,.hud-tools .coin-count,#pluck,#character-power,#active-run-powers'))if(visible(n))failures.push(`duplicate ${n.id||n.className}`);
   return failures;
  },{width,height});
  const name=`${variant}-${width}x${height}-${theme}`;if(width>=240){const collisions=await capture(app,evidence,`${name}-geometry`);failures.push(...collisions.map(c=>`envelope ${c.traveler}/${c.panel}`));}await app.iframe.screenshot({path:new URL(`${name}.png`,output).pathname});evidence.captures.push({name,width,height,theme,failures});evidence.failures.push(...failures.map(x=>`${name}: ${x}`));
 }
 assert.deepEqual(evidence.failures,[]);
 }finally{await writeFile(new URL(`${variant}-frames.json`,output),JSON.stringify(evidence,null,2));await app.close();}
});
const compactControlReport={errors:[],external:[],captures:[],completedVariants:[],complete:false};
for(const variant of ['arcade','race','relay'])test(`P6 compact controls ${variant} leave the actual travelers and eighty pixels of live course clear`,{timeout:60000},async()=>{
 const evidence={errors:[],external:[],captures:[]};let app;
 try{
  app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});await setup(app,variant);await app.resize(240,240);
  await capture(app,evidence,`${variant}-compact-control-gap`);
  const controls=await app.frame.evaluate(()=>[...document.querySelectorAll('#session-seats,.hud-tools button,.bottom-bar button,#run-hand-owner,#run-hand-items button')].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]')).map(n=>({name:n.id||n.className,text:n.textContent,rect:n.getBoundingClientRect().toJSON()})));
  evidence.captures.at(-1).controls=controls;await app.close();app=null;
  assert.deepEqual(evidence.captures.flatMap(c=>c.collisions),[],`${variant} live control footprints must not cover actual travelers`);
  compactControlReport.completedVariants.push(variant);
 }finally{
  compactControlReport.errors.push(...evidence.errors);compactControlReport.external.push(...evidence.external);compactControlReport.captures.push(...evidence.captures);
  compactControlReport.complete=['arcade','race','relay'].every(name=>compactControlReport.completedVariants.includes(name));
  await writeFile(new URL('compact-control-gap.json',output),JSON.stringify(compactControlReport,null,2));await app?.close();
 }
});
test('P6 tracer shared personal status replaces solo widgets and regular details operate',{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{await setup(app);const visible=await app.frame.locator('.score-block,.hud-tools .coin-count,#pluck,#character-power,#active-run-powers').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]')).map(n=>n.id||n.className));assert.deepEqual(visible,[],'G2 no duplicate solo personal status');
 const state=()=>app.onSession(function(){return {time:this.world.time,players:this.players.map(p=>({seat:p.seat,x:p.x,y:p.y,health:p.health,wallet:p.run.wallet}))};});const before=await state();
 const identity=app.frame.locator('[data-seat="p1"] [data-session-hud="identity"]');await identity.click();assert.equal(await app.frame.locator('#session-seats').getAttribute('data-session-hud-inspect'),'true');await app.frame.getByRole('button',{name:'Next details',exact:true}).click();await app.iframe.screenshot({path:new URL('tracer-inspection.png',output).pathname});await app.frame.getByRole('button',{name:'Close details',exact:true}).click();assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'paused','shared prior user pause retained');
 await identity.focus();await app.page.keyboard.press('Enter');assert.equal(await app.frame.locator('#session-seats').getAttribute('data-session-hud-inspect'),'true');await app.page.keyboard.press('Tab');assert.equal(await app.frame.locator('#session-seats').evaluate(n=>n.contains(document.activeElement)),true);await app.frame.getByRole('button',{name:'Close details',exact:true}).focus();await app.page.keyboard.press('Space');await app.advance(80);assert.deepEqual(await state(),before,'inspection has no clock/position/economy side effect');
 }finally{await app.close();}
});
for(const variant of ['flow','race'])for(const priorPaused of [true,false])test(`P6 departing compact ${variant} owner restores hand home and prior pause ${priorPaused}`,{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{await setup(app,variant);
  const home=await app.frame.locator('#run-inventory').evaluate(n=>n.parentElement.id);
  if(!priorPaused)await app.frame.locator('#pause').click();
  await app.resize(240,240);await sessionControlsPage(app,'p2',variant==='race'?'Gear':'Items');
  assert.equal(await app.frame.locator('#run-inventory').getAttribute('data-embedded-controls'),variant==='race'?'hand':'items');
  const before=await app.onSession(function(){return this.players.filter(p=>p.seat!=='p2').map(p=>({id:p.participantId,x:p.x,y:p.y,wallet:p.run.wallet}));});
  await app.frame.getByRole('button',{name:'Close controls',exact:true}).click();
  await sessionHudAction(app,'p2','item');
  if(variant!=='race')await app.frame.getByRole('button',{name:'Leave P2 run',exact:true}).click();
  await app.frame.locator('#survive-lifecycle-board').getByRole('button',{name:variant==='race'?'Leave Race':'Leave run',exact:true}).click();
  assert.equal(await app.frame.locator('#session-seats').getAttribute('data-session-hud-inspect'),'false');
  assert.equal(await app.frame.locator('#session-control-pages').isVisible(),false);
  assert.equal(await app.frame.locator('#run-inventory').count(),1);
  assert.equal(await app.frame.locator('#run-inventory').getAttribute('data-embedded-controls'),null);
  assert.equal(await app.frame.locator('#run-inventory').evaluate(n=>n.parentElement.id),home);
  assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),priorPaused?'paused':'playing');
  assert.equal(await app.frame.locator('.session-hud-selected').getAttribute('data-seat'),variant==='race'?'p2':'p1');
  assert.deepEqual(await app.onSession(function(){return this.players.filter(p=>p.seat!=='p2').map(p=>({id:p.participantId,x:p.x,y:p.y,wallet:p.run.wallet}));}),before);
  await app.advance(32);
  await app.iframe.screenshot({path:new URL(`compact-departure-${variant}-${priorPaused}.png`,output).pathname});
  assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});
test('P6 compact disclosure reuses controls and restores prior pause and focus',{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try {await setup(app,'race');await app.resize(240,240);
 assert.equal(await app.frame.locator('#session-controls-open').textContent(),'Notice');assert.match(await app.frame.locator('#session-controls-open').getAttribute('aria-label'),/Notice available/);
 const before=await app.onSession(function(){return {time:this.world.time,players:this.players.map(p=>({seat:p.seat,x:p.x,y:p.y,wallet:p.run.wallet}))};});
 await app.frame.locator('#session-controls-open').click();
 for(const page of ['Play','Tools','Gear']){
  assert.equal(await app.frame.locator('#session-control-pages nav span').textContent(),page);
  await app.iframe.screenshot({path:new URL(`controls-${page}.png`,output).pathname});
  if(page==='Play'){const message=await app.frame.locator('#toast').textContent();assert.equal(await app.frame.locator('#session-control-notice').textContent(),message);assert.ok(message.length>20);await app.advance(4000);assert.equal(await app.frame.locator('#session-control-notice').textContent(),message);assert.equal(await app.frame.locator('#session-control-notice').isVisible(),true);}
  if(page==='Gear'){assert.equal(await app.frame.locator('#run-hand-owner').isVisible(),true);assert.equal(await app.frame.locator('[data-hand-gear="open"]').isVisible(),true);}
  assert.deepEqual(await app.frame.locator('#session-control-pages').evaluate(root=>[...root.querySelectorAll('button')].filter(n=>!n.disabled&&!n.closest('[hidden]')&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden').flatMap(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44||r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight?[{text:n.textContent,rect:r.toJSON()}]:[];})),[]);
  await app.frame.getByRole('button',{name:'Next controls',exact:true}).click();
 }
 await app.frame.getByRole('button',{name:'Close controls',exact:true}).click();await app.advance(80);
 assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'paused');assert.equal(await app.frame.locator('#session-controls-open').evaluate(n=>n===document.activeElement),true);
 assert.deepEqual(await app.onSession(function(){return {time:this.world.time,players:this.players.map(p=>({seat:p.seat,x:p.x,y:p.y,wallet:p.run.wallet}))};}),before);
 assert.equal(await app.frame.locator('#run-inventory').count(),1);assert.equal(await app.frame.locator('#sound-toggle').count(),1);assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});

for(const variant of ['arcade','flow','race','relay'])test(`P6 detail pages ${variant} remain bounded and complete`,{timeout:90000},async()=>{
 const evidence={errors:[],external:[],failures:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{await setup(app,variant);
 for(const [width,height]of [[240,240],[320,560],[900,600],[1000,280],[2400,1200]]){
  await app.resize(width,height);await app.frame.locator('[data-seat="p1"] [data-session-hud="identity"]').click();
  for(let page=0;page<4;page++){
   const failures=await app.frame.locator('[data-seat="p1"] .session-hud-details').evaluate(root=>[...root.children].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]')).flatMap(n=>{const r=n.getBoundingClientRect();return r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight?[`${n.textContent}: ${JSON.stringify(r.toJSON())}`]:[];}));
   evidence.failures.push(...failures.map(f=>`${width}x${height} page${page}: ${f}`));
   await app.iframe.screenshot({path:new URL(`${variant}-details-${width}x${height}-${page}.png`,output).pathname});
   await app.frame.getByRole('button',{name:'Next details',exact:true}).click();
  }
  await app.frame.getByRole('button',{name:'Close details',exact:true}).click();
 }
 assert.deepEqual(evidence.failures,[]);
 }finally{await writeFile(new URL(`${variant}-details.json`,output),JSON.stringify(evidence,null,2));await app.close();}
});

for(const [item,seed]of [['mud-splash','ph3-000002dc-pond-s-n'],['fog-lantern','ph3-00000658-pond-s-n']])test(`P6 lifecycle actual ${item} retains owner target and child actions through resize`,{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{...intent,payload:{seed}}});
 try{await startRace(app);await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);await app.resize(240,240);await app.frame.locator('#session-controls-open').click();
 await app.frame.getByRole('button',{name:'Next controls',exact:true}).click();await app.frame.getByRole('button',{name:'Next controls',exact:true}).click();
 const before=await app.onSession(function(){return {time:this.world.time,uses:this.consumableSnapshot().uses.length};});
 await app.frame.getByRole('button',{name:item==='mud-splash'?'Use Mud Splash':'Use Fog Lantern',exact:true}).click();await app.iframe.screenshot({path:new URL(`embedded-${item}-target.png`,output).pathname});
 const targetState=await app.onSession(function(){return JSON.stringify({time:this.world.time,players:this.players.map(p=>({id:p.participantId,x:p.x,y:p.y,health:p.health})),items:this.consumableSnapshot()});});
 for(const [w,h]of [[200,160],[1000,280],[320,560],[240,240]]){await app.resize(w,h);await app.advance(100);assert.equal(await app.onSession(function(){return JSON.stringify({time:this.world.time,players:this.players.map(p=>({id:p.participantId,x:p.x,y:p.y,health:p.health})),items:this.consumableSnapshot()});}),targetState);if(w>=240){assert.match(await app.frame.locator('#survive-lifecycle-board h2').textContent(),/Viewing P1/);assert.equal(await app.frame.getByRole('button',{name:item==='mud-splash'?'Use on P2':'Light lantern',exact:true}).isVisible(),true);}}
 await app.frame.getByRole('button',{name:item==='mud-splash'?'Use on P2':'Light lantern',exact:true}).click();await app.advance(32);
 assert.equal(await app.onSession(function(){return this.consumableSnapshot().uses.length;}),before.uses+1);assert.equal(await app.onSession(function(){return this.world.time;}),before.time);
 assert.equal(await app.frame.locator('#run-inventory').count(),1);await app.frame.getByRole('button',{name:'Close controls',exact:true}).click();assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'playing');assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});
test('P6 shared inspection cancellation and retry restore exact reduced solo canvas',{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:intent});
 try{await app.page.emulateMedia({reducedMotion:'reduce'});await app.advance(32);const pixels=()=>app.frame.locator('#scene').evaluate(canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let raw='';for(let i=0;i<data.length;i+=8192)raw+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(raw);});const before=await pixels();const soloStatus=await app.frame.locator('.score-block').isVisible();
 await app.frame.locator('#local-play').click();await app.frame.locator('#local-session-back').click();await app.advance(32);assert.equal((await pixels())===before,true,'actual decoded solo canvas pixels restored');
 await startRace(app,'1');await app.frame.locator('[data-seat="p1"] [data-session-hud="identity"]').click();await app.frame.getByRole('button',{name:'Close details',exact:true}).click();await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.page.keyboard.press('ArrowUp');await app.advance(250);await app.frame.getByRole('button',{name:'Race again',exact:true}).click();await app.frame.evaluate(delivery=>window.marketGameFixture.deliverIntent(delivery),intent);await app.advance(32);
 assert.equal((await pixels())===before,true,'actual solo canvas pixels restored');assert.equal(await app.frame.locator('.score-block').isVisible(),soloStatus);assert.equal(await app.frame.locator('#session-controls-open').isVisible(),false);assert.equal(await app.frame.locator('#sound-toggle').count(),1);assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});
test('P6 compact controls preserve owner page motion and assigned fresh controller focus',{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{await setup(app);await app.frame.locator('[data-seat="p3"] [data-session-hud="identity"]').click();await app.resize(240,240);await app.frame.locator('#session-controls-open').click();await app.frame.getByRole('button',{name:'Next controls',exact:true}).click();
 const before=await app.onSession(function(){return {time:this.world.time,players:this.players.map(p=>({x:p.x,y:p.y,wallet:p.run.wallet}))};});
 await app.frame.getByRole('button',{name:'Close controls',exact:true}).focus();await app.sendPads([pad(0),pad(1,[0])]);await app.sendPads([pad(0),pad(1)]);assert.equal(await app.frame.locator('#session-control-pages').isVisible(),true);
 await app.page.emulateMedia({reducedMotion:'reduce'});await app.advance(32);assert.equal(await app.onRenderer(function(){return this.reduced;}),true);
 await app.resize(200,160);await app.resize(320,560);assert.equal(await app.frame.locator('#session-control-pages nav span').textContent(),'Tools');assert.match(await app.frame.locator('#session-controls-owner').textContent(),/P3/);
 await app.frame.locator('#collection').click();await app.frame.locator('#collection-sections').click();await app.frame.locator('[data-collection-tab="camp"]').click();await app.frame.locator('#reduced-motion').check();await app.frame.locator('#close-drawer').click();await app.page.emulateMedia({reducedMotion:'no-preference'});await app.advance(32);assert.equal(await app.onRenderer(function(){return this.reduced;}),true);
 await app.frame.getByRole('button',{name:'Close controls',exact:true}).focus();await app.sendPads([pad(0,[0]),pad(1)]);assert.equal(await app.frame.locator('#session-control-pages').isVisible(),true,'held edge after child context is suppressed');await app.sendPads([pad(0),pad(1)]);await app.sendPads([pad(0,[0]),pad(1)]);assert.equal(await app.frame.locator('#session-control-pages').isVisible(),false);await app.sendPads([pad(0),pad(1)]);
 assert.deepEqual(await app.onSession(function(){return {time:this.world.time,players:this.players.map(p=>({x:p.x,y:p.y,wallet:p.run.wallet}))};}),before);assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});

test('P6 earned shared card remains inspectable in embedded hand',{timeout:120000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:intent});
 try{await app.frame.locator('#play').click();await app.frame.locator('#pause').click();await app.frame.locator('#local-play').click();await app.frame.locator('#local-session-start').click();await app.advance(32);assert.equal(await app.onSession(function(){return !!this.coOpMarket;}),true);await earnTogether(app,100);
 const available=await app.onSession(function(){const p=this.players[0];return {wallet:p.run.wallet,offers:p.run.market.offers.filter(o=>p.run.catalog.get(o.itemId)?.kind==='card'&&o.price<=p.run.wallet)};});assert.ok(available.offers.length,JSON.stringify(available));
 await app.frame.locator('#market-open').click();const offer=available.offers[0];await app.frame.locator(`[data-offer="${offer.id}"]`).click();await app.frame.locator('#market-inspect-action').click();console.log('purchase result',await app.frame.locator('#market-inspect-note').textContent(),JSON.stringify(await app.onSession(function(){return {cards:this.players[0].run.cards,wallet:this.players[0].run.wallet,events:this.players[0].statistics};})));await app.page.keyboard.press('Escape');await app.advance(200);await app.resize(240,240);await app.frame.locator('#session-controls-open').click();for(let i=0;i<2;i++)await app.frame.getByRole('button',{name:'Next controls',exact:true}).click();
 console.log('earned hand',JSON.stringify(await app.onSession(function(){return this.players[0].run.snapshot?.()??{cards:this.players[0].run.cards,powers:this.players[0].run.powers};})));await app.iframe.screenshot({path:new URL('earned-hand-before.png',output).pathname});assert.equal(await app.frame.locator('[data-hand-card]:visible').count(),1);await app.frame.locator('[data-hand-card]:visible').click();await app.iframe.screenshot({path:new URL('earned-hand-detail.png',output).pathname});assert.equal(await app.frame.locator('#run-hand-detail').isVisible(),true);
 const rect=await app.frame.locator('#run-hand-detail').boundingBox();assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=240&&rect.y+rect.height<=240);await app.frame.locator('#run-hand-close').click();await app.frame.getByRole('button',{name:'Close controls',exact:true}).click();assert.equal(await app.frame.locator('#run-inventory').count(),1);assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});

test('P6 actual pursuit warning remains visible in the bounded action band',{timeout:60000},async()=>{
 const evidence={errors:[],external:[],captures:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 try{await setup(app,'arcade');await app.frame.locator('#pause').click();
  for(let i=0;i<50&&!await app.onGame(function(){return this.warning;});i++)await app.advance(250);
  assert.equal(await app.onGame(function(){return this.warning;}),true);await app.resize(240,240);
  const forward=app.frame.locator('[data-direction="forward"]');assert.match(await forward.textContent(),/^↑ \d+s$/);assert.equal(await forward.getAttribute('aria-describedby'),'chase-action');assert.equal(await forward.evaluate(n=>n.scrollHeight<=n.clientHeight&&n.scrollWidth<=n.clientWidth),true,'entire warning label fits the44px control');
  assert.deepEqual(await capture(app,evidence,'compact-actual-wave-warning'),[]);assert.deepEqual(evidence.errors,[]);
 }finally{await writeFile(new URL('actual-warning.json',output),JSON.stringify(evidence,null,2));await app.close();}
});

test('P6 lifecycle tracer preserves regular owner page focus through compact short and minimum frames',{timeout:60000},async()=>{
 const evidence={errors:[],external:[],states:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent});
 const snapshot=()=>app.onSession(function(){return {mode:this.mode.id,base:this.definition.id,time:this.world.time,players:this.players.map(p=>({id:p.participantId,seat:p.seat,x:p.x,y:p.y,health:p.health,run:{wallet:p.run.wallet,cards:p.run.cards,pending:p.run.pendingPack},recovery:p.recovery}))};});
 try{await setup(app,'flow');const before=await snapshot();
  const owner=app.frame.locator('[data-seat="p2"] .session-hud-identity');await owner.click();await owner.focus();await app.page.keyboard.press('Enter');
  await app.frame.getByRole('button',{name:'Next details',exact:true}).focus();await app.page.keyboard.press('Space');
  const page=await app.frame.locator('.session-hud-selected').getAttribute('data-session-hud-page');assert.equal(page,'1');
  for(const [w,h]of [[320,560],[1000,280],[200,160],[240,240],[900,600]]){
   await app.resize(w,h);await app.advance(200);
   assert.deepEqual(await snapshot(),before);assert.equal(await app.frame.locator('.session-hud-selected').getAttribute('data-seat'),'p2');assert.equal(await app.frame.locator('.session-hud-selected').getAttribute('data-session-hud-page'),page);
   if(w<240)assert.equal(await app.frame.locator('.too-small').isVisible(),true);
   else {assert.equal(await app.frame.getByRole('button',{name:'Next details',exact:true}).evaluate(n=>n===document.activeElement),true,'logical detail action retains focus');await app.iframe.screenshot({path:new URL(`lifecycle-inspection-${w}x${h}.png`,output).pathname});}
  }
  await app.frame.getByRole('button',{name:'Close details',exact:true}).focus();await app.page.keyboard.press('Enter');await app.advance(80);
  assert.deepEqual(await snapshot(),before);assert.equal(await owner.evaluate(n=>n===document.activeElement),true);assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'paused');assert.deepEqual(evidence.errors,[]);
 }finally{await app.close();}
});
