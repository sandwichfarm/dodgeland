// Real built opaque iframe; only public controls, SDK pads and read-only observations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createMarketGameFixture,sessionHudAction} from './market-game-fixture.mjs';
import {earnTogether,mixedSetup,freshReclaim} from './race-browser-fixture.mjs';
const output=new URL('../artifacts/race-layout/',import.meta.url);
const frames=[[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]];
const themes={dark:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'},light:{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}};
const pad=(index,pressed=[])=>({index,id:`race-layout-${index}`,connected:true,mapping:'standard',timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:false}))});
const intent=seed=>({sender:'race-layout',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed}});

test('Race full frame theme motion matrix preserves authoritative state and accessible controls',async(t)=>{
 const evidence={errors:[],external:[],captures:[],failures:[],deviceAudio:'--mute-audio',privateWrites:false,stages:[],complete:false};
 let app,activeSignal,journeyPassed=false,originalFailure;
 const closes=new WeakMap();
 const check=()=>{t.signal.throwIfAborted();activeSignal?.throwIfAborted();};
 function closeOnce(fixture){
  if(!fixture)return Promise.resolve();
  if(!closes.has(fixture))closes.set(fixture,fixture.close());
  return closes.get(fixture);
 }
 async function fresh(seed='ph3-00000071-pond-s-n'){
  check();await closeOnce(app);check();
  const opening=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent(seed)});
  app=opening;
  try{check();}catch(error){await closeOnce(opening);throw error;}
  return app.frame;
 }
 // Node's timeout does not await an async test body. Close its real fixture on
 // abort, then await the body and cleanup before any later stage/test can start.
 async function stage(name,action){
  check();let passed=false,body,abortCleanup,aborted=false;
  await t.test(name,{timeout:180000},async(child)=>{
   activeSignal=child.signal;
   const abort=()=>{aborted=true;abortCleanup=closeOnce(app).catch(error=>{evidence.cleanupFailure=String(error);});};
   child.signal.addEventListener('abort',abort,{once:true});
   body=(async()=>{try{check();await action();check();assert.deepEqual(evidence.failures,[]);assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);evidence.stages.push(name);passed=true;}finally{child.signal.removeEventListener('abort',abort);}})();
   await body;
  });
  await body?.catch(error=>{originalFailure??=error;});
  await abortCleanup;
  activeSignal=undefined;
  check();assert.equal(aborted,false,`stage aborted: ${name}`);assert.equal(passed,true,`stage did not complete: ${name}`);
 }
 await mkdir(output,{recursive:true});
 async function resume(){if(await app.frame.getByRole('button',{name:'Close details',exact:true}).isVisible())await app.frame.getByRole('button',{name:'Close details',exact:true}).click();if(await app.onGame(function(){return this.state==='paused';}))await app.frame.locator('#pause').click();await app.frame.locator('#scene').focus();}
 const snapshot=()=>app.onSession(function(){return JSON.stringify({players:this.players.map(p=>({seat:p.seat,id:p.participantId,character:p.characterId,device:p.device,x:p.x,y:p.y,health:p.health,earned:p.earnedDistance,offer:p.recovery.offer,charges:this.consumableSnapshot()?.charges.find(c=>c.seat===p.seat)})),result:this.result});}).catch(()=>null);
 async function capture(state,selector){
  check();console.log('Race capture',state);const before=await snapshot();check();
  for(const [theme,colors]of Object.entries(themes))for(const [width,height]of frames){
   check();await app.resize(width,height);await app.frame.evaluate(colors=>window.marketGameFixture.setTheme({colors}),colors);await app.advance(32);
   if(state==='recovery-actions'&&width>=240)await sessionHudAction(app,'p1','revive',{click:false});
   const observation=await app.frame.evaluate(({selector,width})=>{
    const failures=[],visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]');
    if(document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)failures.push('document overflow');
    const board=document.querySelector(selector);
    if(width===200){const notice=[...document.querySelectorAll('*')].find(n=>!n.children.length&&n.textContent.trim()==='Needs 240×240 to play — enlarge this pane.');if(!notice||!visible(notice))failures.push('minimum notice');if([...document.querySelectorAll('button,input')].some(visible))failures.push('controls below minimum');}
    else if(!board||!visible(board))failures.push('missing surface');else{
     for(const node of board.querySelectorAll('button,input'))if(visible(node)){const r=node.getBoundingClientRect();if(r.width<43.5||r.height<43.5||r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1)failures.push(`target bounds: ${node.id||node.textContent}`);if(!node.disabled){const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(hit!==node&&!node.contains(hit))failures.push(`occluded: ${node.id||node.textContent}`);}}
     for(const node of [board,...board.querySelectorAll('section,nav,dl')])if(visible(node)&&/(auto|scroll)/.test(getComputedStyle(node).overflow)&&(node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1))failures.push(`scrollbar: ${node.id||node.className}`);
     for(const node of board.querySelectorAll('h2,h3,p,button,dt,dd,label,input,span'))if(visible(node)){const box=node.getBoundingClientRect();if(box.bottom>innerHeight+1||box.right>innerWidth+1||box.x<0||box.y<0)failures.push(`content bounds: ${node.id||node.textContent}`);const c=getComputedStyle(node);if(![16,20,28,44].includes(parseFloat(c.fontSize)))failures.push(`type role: ${node.id||node.tagName} ${c.fontSize}`);if(![400,600].includes(+c.fontWeight))failures.push(`type weight: ${node.id||node.tagName} ${c.fontWeight}`);}
     for(const price of board.querySelectorAll('.market-tile-price'))if(visible(price)){const bounds=price.closest('button').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(price);for(const r of range.getClientRects())if(r.top<bounds.top||r.bottom>bounds.bottom||r.left<bounds.left||r.right>bounds.right)failures.push(`clipped availability text: ${price.textContent}`);}
     const dialogName=(board.getAttribute('aria-labelledby')??'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent??'').join(' ').trim()||board.getAttribute('aria-label')?.trim();
     if(board.matches('[role="dialog"]')&&(!dialogName||board.getAttribute('aria-modal')!=='true'))failures.push('dialog semantics');
    }
    return {failures,focus:document.activeElement?.id,motion:matchMedia('(prefers-reduced-motion: reduce)').matches||!!document.querySelector('#app.ui-less-motion')};
   },{selector,width});
   if(before&&await snapshot()!==before)observation.failures.push('authoritative state changed across resize');
   check();const name=`${state}-${width}x${height}-${theme}.png`;const image=await app.iframe.screenshot();check();await writeFile(new URL(name,output),image);check();evidence.captures.push({state,width,height,theme,name,...observation});evidence.failures.push(...observation.failures.map(message=>({state,width,height,theme,message})));
  }check();await app.resize(900,600);
  if(await app.frame.locator(selector).getAttribute('role')==='dialog'){await app.page.keyboard.press('Tab');assert.equal(await app.frame.locator(selector).evaluate(n=>n.contains(document.activeElement)||(n.getAttribute('aria-owns')??'').split(' ').some(id=>document.getElementById(id)?.contains(document.activeElement))),true,`${state} focus stays in dialog`);await app.page.keyboard.press('Shift+Tab');assert.equal(await app.frame.locator(selector).evaluate(n=>n.contains(document.activeElement)||(n.getAttribute('aria-owns')??'').split(' ').some(id=>document.getElementById(id)?.contains(document.activeElement))),true);}
 }
 try{
  let f;
  await stage('setup, Mud and owner gear',async()=>{
  f=await fresh('ph3-000002dc-pond-s-n');await f.locator('#local-play').click();for(let i=0;i<2;i++){await app.sendPads([pad(0),pad(1)]);await app.sendPads([pad(0,i===0?[0]:[]),pad(1,i===1?[0]:[])]);await app.sendPads([pad(0),pad(1)]);}await f.locator('#race-play').click();await capture('setup','#session-board');await f.getByRole('button',{name:'Rules',exact:true}).click();await capture('rules','#session-board');await f.getByRole('button',{name:'Settings',exact:true}).click();await f.locator('#race-finish').fill('0');await capture('invalid','#session-board');await f.locator('#race-finish').fill('500');await f.locator('#race-configuration').getByRole('button',{name:'Roster',exact:true}).click();await capture('roster','#session-board');await f.locator('#race-configuration').getByRole('button',{name:'Settings',exact:true}).click();await f.locator('#local-session-start').click();await app.advance(32);assert.equal(await app.onSession(function(){return this.players.length;}),4);await capture('four-racers','#session-seats');
  await resume();await app.page.keyboard.press('w');await app.advance(250);await f.getByRole('button',{name:'Use Mud Splash',exact:true}).click();await capture('mud-target','#survive-lifecycle-board');await app.page.emulateMedia({reducedMotion:'reduce'});await capture('target-motion','#survive-lifecycle-board');await app.page.emulateMedia({reducedMotion:'no-preference'});await f.getByRole('button',{name:'Use on P2',exact:true}).click();await app.advance(32);await capture('mud-effect','#session-seats');
  await f.getByRole('button',{name:'Race gear',exact:true}).click();await capture('gear','#market');await f.getByRole('button',{name:'Wardrobe',exact:true}).click();await capture('wardrobe','#market');await f.locator('#market-owner-strip button').nth(1).click();await capture('owner-switch','#market');await app.page.keyboard.press('Escape');
  });
  await stage('fog line, exposure and damage',async()=>{
  // A public generated course and genuine keys establish exact-line pressure.
  f=await fresh();await mixedSetup(app);await earnTogether(app,12);await capture('fog-line','#session-seats');assert.match(await f.locator('[data-seat="p2"] [data-race-fog]').textContent(),/Fog line/);await resume();await earnTogether(app,13);await capture('fog-exposed','#session-seats');await resume();await app.advance(1100);assert.ok(await app.onSession(function(){return this.players[1].health<3;}),'fog lands real health loss');await capture('fog-landed','#session-seats');
  });
  await stage('four tied finishers and participant pages',async()=>{
  // Four real same-tick finishers; result pages retain one frozen snapshot.
  f=await fresh();await f.locator('#local-play').click();for(let i=0;i<2;i++){await app.sendPads([pad(0),pad(1)]);await app.sendPads([pad(0,i===0?[0]:[]),pad(1,i===1?[0]:[])]);await app.sendPads([pad(0),pad(1)]);}await f.locator('#race-play').click();await f.locator('#race-finish').fill('1');await f.locator('#local-session-start').click();await app.advance(32);await f.locator('#scene').focus();await app.page.evaluate(pads=>window.marketPads(pads,true),[pad(0,[12]),pad(1,[12])]);await app.page.keyboard.press('w');await app.page.keyboard.press('ArrowUp');await app.advance(250);await capture('four-tie','#survive-results-root');const seenParticipants=new Set();for(let i=0;i<40&&seenParticipants.size<4;i++){await f.getByRole('button',{name:'Next results',exact:true}).click();const participant=await f.locator('[data-participant]').getAttribute('data-participant');if(!seenParticipants.has(participant)){seenParticipants.add(participant);await capture(`participant-${seenParticipants.size}`,'#survive-results-root');}}assert.equal(seenParticipants.size,4);


  });
  await stage('Lantern confirmation, effect and rejection',async()=>{
  f=await fresh('ph3-001fe673-pond-s-n');await mixedSetup(app);await app.page.keyboard.press('w');await app.advance(250);await f.getByRole('button',{name:'Use Fog Lantern',exact:true}).click();await capture('lantern-confirm','#survive-lifecycle-board');await f.getByRole('button',{name:'Light lantern',exact:true}).click();await app.advance(32);await capture('lantern-effect','#session-seats');await resume();await app.page.keyboard.press('w');await app.advance(250);await f.getByRole('button',{name:'Use Fog Lantern',exact:true}).click();await capture('lantern-already-lit','#survive-lifecycle-board');await f.getByRole('button',{name:'Back',exact:true}).click();
  });
  await stage('stale Mud target and no target',async()=>{
  f=await fresh('ph3-000002dc-pond-s-n');await mixedSetup(app);await app.page.keyboard.press('w');await app.advance(250);await f.getByRole('button',{name:'Use Mud Splash',exact:true}).click();await app.sendPads([]);if(await f.locator('#survive-lifecycle-board').count())await f.getByRole('button',{name:'Back',exact:true}).click();await capture('stale-target-disconnected','#session-seats');await f.getByRole('button',{name:'Use Mud Splash',exact:true}).click();await capture('no-target','#survive-lifecycle-board');assert.equal(await f.locator('#survive-lifecycle-board .primary').isDisabled(),true);await f.getByRole('button',{name:'Back',exact:true}).click();
  });
  await stage('disconnect, reclaim, waiting and timeout',async()=>{
  f=await fresh();await mixedSetup(app,{seconds:'30'});await app.sendPads([]);await capture('disconnected','#session-seats');await app.sendPads([pad(9)]);await app.sendPads([pad(9,[0])]);await capture('reclaim','#survive-lifecycle-board');await app.sendPads([pad(9)]);await app.sendPads([pad(9,[0])]);await app.sendPads([pad(9)]);await app.sendPads([]);await sessionHudAction(app, 'p1', 'item');await capture('leave','#survive-lifecycle-board');await f.locator('#survive-lifecycle-board').getByRole('button',{name:'Leave Race',exact:true}).click();await capture('waiting','#session-seats');await freshReclaim(app,8);await resume();await app.advance(31000);await capture('timeout-dnf','#survive-results-root');
  });
  await stage('personal recovery, protection and forfeit',async()=>{
  f=await fresh();await mixedSetup(app);for(let i=0;i<160;i++){const state=await app.onSession(function(){return {offer:!!this.players[0].recovery.offer,row:this.world.rows.get(this.players[0].y)?.kind};});if(state.offer)break;if(state.row!=='road')await app.page.keyboard.press('w');await app.advance(200);}assert.equal(await app.onSession(function(){return !!this.players[0].recovery.offer;}),true);await capture('personal-recovery','#session-seats');await capture('recovery-actions','#session-seats');await sessionHudAction(app, 'p1', 'revive');await app.advance(32);await capture('protected','#session-seats');await resume();for(let i=0;i<10&&await app.onSession(function(){return this.players[0].y>0;});i++){await app.page.keyboard.press('s');await app.advance(180);}await app.sendPads([]);await resume();await app.advance(12500);await capture('forfeited-last-racer','#session-seats');await sessionHudAction(app, 'p1', 'item');await f.locator('#survive-lifecycle-board').getByRole('button',{name:'Leave Race',exact:true}).click();await capture('left-forfeited-dnf','#survive-results-root');
  });
  await stage('app reduced motion',async()=>{
  f=await fresh();await f.locator('#choose').click();await f.locator('#collection-sections').click();await f.locator('[data-collection-tab="camp"]').click();await f.locator('#reduced-motion').check();await f.locator('#close-drawer').click();await mixedSetup(app);await capture('app-motion','#session-seats');assert.equal(await app.onRenderer(function(){return this.reduced;}),true);
  });
  check();assert.equal(evidence.stages.length,8);
  const expectedStates=['setup', 'rules', 'invalid', 'roster', 'four-racers', 'mud-target', 'target-motion', 'mud-effect', 'gear', 'wardrobe', 'owner-switch', 'fog-line', 'fog-exposed', 'fog-landed', 'four-tie', 'participant-1', 'participant-2', 'participant-3', 'participant-4', 'lantern-confirm', 'lantern-effect', 'lantern-already-lit', 'stale-target-disconnected', 'no-target', 'disconnected', 'reclaim', 'leave', 'waiting', 'timeout-dnf', 'personal-recovery', 'recovery-actions', 'protected', 'forfeited-last-racer', 'left-forfeited-dnf', 'app-motion'];
  assert.deepEqual(evidence.captures.map(c=>`${c.state}/${c.theme}/${c.width}x${c.height}`).sort(),expectedStates.flatMap(state=>Object.keys(themes).flatMap(theme=>frames.map(([w,h])=>`${state}/${theme}/${w}x${h}`))).sort());
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await f.evaluate(()=>window.marketGameFixture.forbidden),[]);
  assert.deepEqual(evidence.failures,[]);check();journeyPassed=true;
 }catch(error){originalFailure??=error;}
 finally{
  try{
   // Incomplete/canceled journeys retain partial JSON, never success sheets.
   if(journeyPassed){check();
  const sheet=await app.browser.newPage({viewport:{width:1440,height:900}});for(const theme of ['dark','light']){check();const cards=await Promise.all(evidence.captures.filter(c=>c.theme===theme).map(async c=>`<figure><figcaption>${c.state} ${c.width}×${c.height}</figcaption><img src="data:image/png;base64,${(await readFile(new URL(c.name,output))).toString('base64')}"></figure>`));await sheet.setContent(`<style>body{margin:0;background:#ccc;font:14px sans-serif}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}figure{margin:0}img{width:100%;height:190px;object-fit:contain;background:#333}</style><div class="grid">${cards.join('')}</div>`);check();await sheet.screenshot({path:new URL(`contact-${theme}.png`,output).pathname,fullPage:true});}await sheet.close();
   }
  }catch(error){originalFailure??=error;journeyPassed=false;}
  finally{
   try{await closeOnce(app);}catch(error){originalFailure??=error;journeyPassed=false;}
   evidence.complete=journeyPassed&&!originalFailure&&!t.signal.aborted&&!activeSignal?.aborted&&!evidence.cleanupFailure;
   if(originalFailure)evidence.failure=String(originalFailure);
   await writeFile(new URL('report.json',output),JSON.stringify(evidence,null,2));
  }
 }
 if(originalFailure)throw originalFailure;
 assert.equal(evidence.complete,true,'all eight journeys and cleanup completed');
});

test('unchanged Race lifecycle notice does not repeat live announcements',async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:intent('ph3-00000071-pond-s-n')});
 try{const f=app.frame;await f.locator('#local-play').click();await f.locator('#race-play').click();await f.locator('#local-session-start').click();await app.advance(32);await f.evaluate(()=>{const fixture=window.marketGameFixture;fixture.raceAnnouncements=0;fixture.noticeObserver=new MutationObserver(records=>fixture.raceAnnouncements+=records.length);fixture.noticeObserver.observe(document.querySelector('.race-lifecycle'),{childList:true,subtree:true,characterData:true});});await app.advance(200);assert.equal(await f.evaluate(()=>{window.marketGameFixture.noticeObserver.disconnect();return window.marketGameFixture.raceAnnouncements;}),0);}finally{await app.close();}
});
