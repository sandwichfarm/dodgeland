// Built production UI only: no private-state writes or alternate render model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createMarketGameFixture,sessionHudAction} from './market-game-fixture.mjs';
const output=new URL('../artifacts/relay-layout/',import.meta.url);
const frames=[[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]];
const pad=(index,pressed=[])=>({index,id:`Layout controller ${index}`,mapping:'standard',connected:true,timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:false}))});
const themes={dark:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'},light:{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}};

test('Relay visible controls preserve every layout state across frames, themes and motion preferences', {timeout:180000},async()=>{
 const evidence={errors:[],external:[],captures:[],failures:[]};let app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true});
 await mkdir(output,{recursive:true});
 async function capture(state,selector){
  console.log(`layout start ${state} ${new Date().toISOString()}`);
  const originalHeading=await app.frame.locator(selector+' h2').first().textContent().catch(()=>null);
  const retained=await app.onSession(function(){return JSON.stringify({roster:this.players.map(p=>[p.seat,p.characterId,p.participantId,p.x,p.y]),result:this.result});}).catch(()=>null);
  for(const [theme,colors] of Object.entries(themes)) for(const [width,height] of frames){
   await app.resize(width,height);await app.frame.evaluate(colors=>window.marketGameFixture.setTheme({colors}),colors);await app.advance(80);
   if(width===200&&state==='handoff'){await app.page.keyboard.press('w');await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);}
   const result=await app.frame.evaluate(({selector,width})=>{
    const failures=[],visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]');
    if(document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)failures.push('document overflow');
    const board=document.querySelector(selector);
    if(width===200){const notice=[...document.querySelectorAll('*')].find(n=>n.children.length===0&&n.textContent.trim()==='Needs 240×240 to play — enlarge this pane.');if(!notice||!visible(notice))failures.push('minimum notice');if([...document.querySelectorAll('button,input')].some(visible))failures.push('controls below minimum');}
    else if(!board||!visible(board))failures.push('missing surface');
    else{
     for(const node of board.querySelectorAll('button,input'))if(visible(node)){const r=node.getBoundingClientRect();if(r.width<43.5||r.height<43.5||r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1)failures.push(`target bounds: ${node.id||node.textContent}`);}
     for(const node of [board,...board.querySelectorAll('section,nav,dl')])if(visible(node)&&/(auto|scroll)/.test(getComputedStyle(node).overflow)&& (node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1))failures.push(`scrollbar: ${node.id||node.className}`);
     for(const node of board.querySelectorAll('h2,h3,p,button,dt,dd,label,input'))if(visible(node)&&![16,20,28,44].includes(parseFloat(getComputedStyle(node).fontSize)))failures.push(`type role: ${node.id||node.tagName} ${getComputedStyle(node).fontSize}`);
     for(const node of board.querySelectorAll('button:not(:disabled),input:not(:disabled)'))if(visible(node)){const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(hit!==node&&!node.contains(hit))failures.push(`occluded target: ${node.id||node.textContent}`);}
     for(const node of board.querySelectorAll('h2,h3,p,button,dt,dd,label,input'))if(visible(node)&&![400,600].includes(Number(getComputedStyle(node).fontWeight)))failures.push(`type weight: ${node.id||node.tagName} ${getComputedStyle(node).fontWeight}`);
     if(document.querySelector('#app.ui-less-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches){for(const n of [board,...board.querySelectorAll('*')])if(getComputedStyle(n).animationName!=='none'||getComputedStyle(n).transitionDuration.split(',').some(t=>parseFloat(t)>0))failures.push(`motion: ${n.id||n.className}`);}
     if(board.matches('[role="dialog"]')&&(!board.getAttribute('aria-labelledby')||board.getAttribute('aria-modal')!=='true'))failures.push('dialog semantics');
    }
    return {failures,heading:board?.querySelector('h2')?.textContent??null,focus:document.activeElement?.id,motion:!!document.querySelector('#app.ui-less-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches,notice:width===200};
   },{selector,width});
   if(state.includes('motion'))assert.equal(result.motion,true,'motion preference is active');
   if(width>=240){assert.equal(result.heading,originalHeading,`${state} heading survives resize`);if(retained)assert.equal(await app.onSession(function(){return JSON.stringify({roster:this.players.map(p=>[p.seat,p.characterId,p.participantId,p.x,p.y]),result:this.result});}),retained,`${state} identities/positions/result survive resize`);}
   const name=`${state}-${width}x${height}-${theme}.png`;await app.iframe.screenshot({path:new URL(name,output).pathname,timeout:15000});evidence.captures.push({state,width,height,theme,name,...result});evidence.failures.push(...result.failures.map(message=>({state,width,height,theme,message})));
  }
  await app.resize(900,600);
  if(await app.frame.locator('#relay-announcement').count()){
   await app.frame.evaluate(()=>{const f=window.marketGameFixture;f.layoutAnnouncements=0;f.layoutObserver=new MutationObserver(records=>f.layoutAnnouncements+=records.length);f.layoutObserver.observe(document.getElementById('relay-announcement'),{childList:true,subtree:true,characterData:true});});
   await app.advance(80);assert.equal(await app.frame.evaluate(()=>{window.marketGameFixture.layoutObserver.disconnect();return window.marketGameFixture.layoutAnnouncements;}),0,`${state} does not repeat live announcements on unchanged frames`);
  }
  if(await app.frame.locator(selector).getAttribute('role')==='dialog'){await app.page.keyboard.press('Tab');assert.equal(await app.frame.locator(selector).evaluate(n=>n.contains(document.activeElement)),true,`${state} traps focus`);await app.page.keyboard.press('Shift+Tab');assert.equal(await app.frame.locator(selector).evaluate(n=>n.contains(document.activeElement)),true);}
 }
 try{
  await app.frame.locator('#local-play').click();await app.frame.locator('#session-roster [data-seat="p2"]').click();await app.frame.getByRole('button',{name:'Leave this seat',exact:true}).click();await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);
  await app.frame.locator('#relay-play').click();await capture('setup','#session-board');await app.frame.locator('.relay-setup-nav').getByRole('button',{name:'Roster',exact:true}).click();await capture('setup-roster','#session-board');await app.frame.locator('.relay-setup-nav').getByRole('button',{name:'Length',exact:true}).click();
  await app.frame.locator('#relay-tiles').fill('0');await capture('invalid','#session-board');assert.equal(await app.frame.locator('#local-session-start').isDisabled(),true);
  await app.frame.locator('#relay-tiles').fill('1');await app.frame.locator('.relay-setup-nav').getByRole('button',{name:'Order',exact:true}).click();await app.frame.getByRole('button',{name:/Move later: P1/}).click();await capture('order','#session-board');await app.frame.getByRole('button',{name:/Move earlier: P1/}).click();
  await app.frame.locator('#local-session-start').click();await app.advance(80);
  await capture('live-hud','#session-seats');await app.key('pause');
  await app.sendPads([]);await capture('inactive-disconnected','#session-seats');await app.key('pause');
  await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);
  await app.frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click();await capture('owner-restriction','#run-inventory');assert.match(await app.frame.locator('#run-hand-owner-note').innerText(),/Only the active runner/);await app.frame.locator('#session-seats [data-seat="p1"] .session-hud-identity').click();await app.key('pause');
  await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);await app.frame.getByRole('heading',{name:'Leg 1 complete'}).waitFor();await capture('handoff','#relay-handoff');await app.page.emulateMedia({reducedMotion:'reduce'});await capture('handoff-system-motion','#relay-handoff');await app.page.emulateMedia({reducedMotion:'no-preference'});
  await app.frame.getByRole('button',{name:'View relay',exact:true}).click();await capture('roster','#relay-handoff');await app.frame.getByRole('button',{name:'Back to handoff',exact:true}).click();
  await app.frame.getByRole('button',{name:"Start P2's leg",exact:true}).focus();await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);assert.equal(await app.frame.locator('#relay-handoff').count(),0);await app.sendPads([]);await capture('disconnected','#relay-handoff');
  await app.frame.getByRole('button',{name:'Skip P2',exact:true}).click();await capture('skip','#relay-handoff');await app.frame.getByRole('button',{name:'Back',exact:true}).click();
  await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await capture('reclaim','#survive-lifecycle-board');await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);
  await app.sendPads([pad(0,[3])]);await capture('leave','#relay-handoff');await app.frame.getByRole('button',{name:'Keep playing',exact:true}).click();assert.equal(await app.frame.evaluate(()=>document.activeElement.id),'scene','cancel restores scene focus');await app.sendPads([]);await app.frame.getByRole('button',{name:'Skip P2',exact:true}).click();await app.frame.getByRole('button',{name:'Skip P2',exact:true}).click();await app.frame.getByRole('button',{name:"Start P1's leg",exact:true}).click();
  await sessionHudAction(app, 'p1', 'item');await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();await capture('waiting','#relay-handoff');
  await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[3])]);await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();
  await capture('results','#relay-handoff');await app.frame.locator('.relay-results-nav button').nth(1).click();await capture('players','#relay-handoff');await app.frame.locator('.relay-results-nav button').nth(1).click();await capture('legs','#relay-handoff');
  // A second real run earns equal contributions; no result or world state is injected.
  const prior=await app.onSession(function(){return this.result;});
  await app.frame.getByRole('button',{name:'Hop again',exact:true}).click();await app.advance(80);await app.close();app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true});
  await app.frame.locator('#local-play').click();await app.frame.locator('#relay-play').click();await app.frame.locator('#relay-tiles').fill('1');await app.frame.locator('#local-session-start').click();await app.advance(80);
  await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);await app.frame.getByRole('button',{name:"Start P2's leg",exact:true}).click();await app.frame.locator('#scene').focus();await app.page.keyboard.press('ArrowUp');await app.advance(250);await app.frame.getByRole('button',{name:"Start P1's leg",exact:true}).click();
  for(const seat of ['p1','p2']){await sessionHudAction(app, seat, 'item');await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();if(seat==='p1')await app.frame.getByRole('button',{name:"Start P2's leg",exact:true}).click();}
  assert.deepEqual((await app.onSession(function(){return this.result;})).podium.map(p=>p.label),['=1']);assert.equal(prior.distance,1);
  await app.frame.getByRole('button',{name:'Next result page',exact:true}).click();await capture('tied-podium','#relay-handoff');await app.page.emulateMedia({reducedMotion:'reduce'});await capture('result-system-motion','#relay-handoff');await app.page.emulateMedia({reducedMotion:'no-preference'});
  await app.frame.getByRole('button',{name:'Hop again',exact:true}).click();await app.advance(80);await app.close();app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true});
  await app.frame.locator('#choose').click();await app.frame.locator('#camp-tab').click();await app.frame.locator('#reduced-motion').check();await app.frame.locator('#close-drawer').click();
  await app.frame.locator('#local-play').click();await app.frame.locator('#relay-play').click();await app.frame.locator('#relay-tiles').fill('999');await app.frame.locator('#local-session-start').click();await app.advance(80);
  // Observe the generated course, then use only real keys and clock to encounter a hazard.
  let offered=false;
  for(let steps=0;steps<100&&!offered;steps++){
   await app.frame.locator('#scene').focus();await app.page.keyboard.press(steps%9===8?'a':'w');await app.advance(250);
   const observation=await app.onSession(function(){const p=this.players[0];return {offer:!!p.recovery?.offer,kind:this.world.rows.get(Math.round(p.y))?.kind};});
   offered=observation.offer;
   if(['road','rail','river'].includes(observation.kind))for(let wait=0;wait<60&&!offered;wait++){await app.advance(200);offered=await app.onSession(function(){return !!this.players[0].recovery?.offer;});}
  }
  assert.equal(offered,true,'real generated hazard creates personal revival offer');await capture('recovery-app-motion','#relay-handoff');await app.frame.getByRole('button',{name:'Revive P1',exact:true}).click();await app.advance(80);assert.equal(await app.onSession(function(){return this.players[0].recovery.charge;}),'spent');
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await app.frame.evaluate(()=>window.marketGameFixture.forbidden),[]);
 }finally{
  await writeFile(new URL('report.json',output),JSON.stringify(evidence,null,2));
  await writeFile(new URL('index.html',output),`<!doctype html><title>Relay layout evidence</title><style>body{margin:0;font:14px sans-serif;background:#ddd}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}figure{margin:0}img{width:100%;height:220px;object-fit:contain;background:#222}</style><div class="grid">${evidence.captures.map(c=>`<figure><figcaption>${c.state} ${c.width}×${c.height} ${c.theme}</figcaption><img src="${c.name}"></figure>`).join('')}</div>`);
  const sheet=await app.browser.newPage({viewport:{width:1440,height:900}});
  for(const theme of ['dark','light']){
   const cards=await Promise.all(evidence.captures.filter(c=>c.theme===theme).map(async c=>`<figure><figcaption>${c.state} ${c.width}×${c.height}</figcaption><img src="data:image/png;base64,${(await readFile(new URL(c.name,output))).toString('base64')}"></figure>`));
   await sheet.setContent(`<style>body{margin:0;background:#bbb;font:14px sans-serif}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}figure{margin:0}img{width:100%;height:190px;object-fit:contain;background:#333}</style><div class="grid">${cards.join('')}</div>`);await sheet.screenshot({path:new URL(`contact-${theme}.png`,output).pathname,fullPage:true});
  }
  await sheet.close();await app.close();
 }
 assert.deepEqual(evidence.failures,[]);
});
