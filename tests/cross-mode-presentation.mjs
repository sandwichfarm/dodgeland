// Actual built controls and SDK snapshots; debugger observations are read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';
const output = new URL('../artifacts/cross-mode-presentation/', import.meta.url);
const pad = (index, pressed=[]) => ({index,id:`presentation-${index}`,connected:true,mapping:'standard',timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:+pressed.includes(i),touched:false}))});
const themes={dark:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'},light:{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}};
function separated(a,b,gap=8){return a.right+gap<=b.left||b.right+gap<=a.left||a.bottom+gap<=b.top||b.bottom+gap<=a.top;}
async function setup(app,variant='arcade'){
  if(variant==='arcade')await app.frame.locator('#mode').click();
  await app.frame.locator('#local-play').click();
  for(let i=0;i<2;i++){await app.sendPads([pad(0),pad(1)]);await app.sendPads([pad(0,i===0?[0]:[]),pad(1,i===1?[0]:[])]);await app.sendPads([pad(0),pad(1)]);}
  await app.frame.locator('#local-session-start').click();await app.advance(80);
  assert.equal(await app.onSession(function(){return this.players.length;}),4);
  await app.frame.locator('#pause').click();await app.advance(32);
}
async function footprints(app){return app.frame.evaluate(()=>{
  const visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]');
  return [...document.querySelectorAll('.session-hud-tile,.session-hud-details,.score-block,.coin-count,#pluck,#character-power,#active-run-powers,.world-label,#chapter-label,.hud-tools button,.bottom-bar button,#run-hand,.hand-owner,.relay-distance,.race-distance,.race-lifecycle')].filter(visible).map(n=>{const r=n.getBoundingClientRect();return {name:n.id||n.className,rect:{left:r.left,top:r.top,right:r.right+3,bottom:r.bottom+3}};});
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
  const evidence={errors:[],external:[],captures:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true});
  await mkdir(output,{recursive:true});
  try{await setup(app);for(const [name,colors]of Object.entries(themes)){await app.frame.evaluate(colors=>window.marketGameFixture.setTheme({colors}),colors);await app.advance(32);const collisions=await capture(app,evidence,`tracer-${name}`);assert.deepEqual(collisions,[],'G1 full body/nameplate versus visible DOM must have 8px clearance');}}
  finally{await writeFile(new URL('tracer-geometry.json',output),JSON.stringify(evidence,null,2));await app.close();}
});
test('P6 tracer shared personal status replaces solo widgets and regular details operate',{timeout:60000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true});
 try{await setup(app);const visible=await app.frame.locator('.score-block,.hud-tools .coin-count,#pluck,#character-power,#active-run-powers').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]')).map(n=>n.id||n.className));assert.deepEqual(visible,[],'G2 no duplicate solo personal status');
 const state=()=>app.onSession(function(){return {time:this.world.time,players:this.players.map(p=>({seat:p.seat,x:p.x,y:p.y,health:p.health,wallet:p.run.wallet}))};});const before=await state();
 const identity=app.frame.locator('[data-seat="p1"] [data-session-hud="identity"]');await identity.click();assert.equal(await app.frame.locator('#session-seats').getAttribute('data-session-hud-inspect'),'true');await app.frame.getByRole('button',{name:'Next details',exact:true}).click();await app.iframe.screenshot({path:new URL('tracer-inspection.png',output).pathname});await app.frame.getByRole('button',{name:'Close details',exact:true}).click();assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'paused','shared prior user pause retained');
 await identity.focus();await app.page.keyboard.press('Enter');assert.equal(await app.frame.locator('#session-seats').getAttribute('data-session-hud-inspect'),'true');await app.page.keyboard.press('Tab');assert.equal(await app.frame.locator('#session-seats').evaluate(n=>n.contains(document.activeElement)),true);await app.frame.getByRole('button',{name:'Close details',exact:true}).focus();await app.page.keyboard.press('Space');await app.advance(80);assert.deepEqual(await state(),before,'inspection has no clock/position/economy side effect');
 }finally{await app.close();}
});
