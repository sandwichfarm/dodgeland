// Real built opaque iframe; only public controls, SDK pads and read-only observations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createMarketGameFixture} from './market-game-fixture.mjs';
const output=new URL('../artifacts/race-layout/',import.meta.url);
const frames=[[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]];
const themes={dark:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'},light:{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}};
const pad=(index,pressed=[])=>({index,id:`race-layout-${index}`,connected:true,mapping:'standard',timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:false}))});
const intent=seed=>({sender:'race-layout',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed}});

test('Race full frame theme motion matrix preserves authoritative state and accessible controls',{timeout:180000},async()=>{
 const evidence={errors:[],external:[],captures:[],failures:[],deviceAudio:'--mute-audio',privateWrites:false};
 let app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true,initialIntent:intent('ph3-000002dc-pond-s-n')});await mkdir(output,{recursive:true});
 const snapshot=()=>app.onSession(function(){return JSON.stringify({players:this.players.map(p=>({seat:p.seat,id:p.participantId,character:p.characterId,device:p.device,x:p.x,y:p.y,health:p.health,earned:p.earnedDistance,offer:p.recovery.offer,charges:this.consumableSnapshot()?.charges.find(c=>c.seat===p.seat)})),result:this.result});}).catch(()=>null);
 async function capture(state,selector){
  console.log('Race capture',state);const before=await snapshot();
  for(const [theme,colors]of Object.entries(themes))for(const [width,height]of frames){
   await app.resize(width,height);await app.frame.evaluate(colors=>window.marketGameFixture.setTheme({colors}),colors);await app.advance(32);
   const observation=await app.frame.evaluate(({selector,width})=>{
    const failures=[],visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]');
    if(document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)failures.push('document overflow');
    const board=document.querySelector(selector);
    if(width===200){const notice=[...document.querySelectorAll('*')].find(n=>!n.children.length&&n.textContent.trim()==='Needs 240×240 to play — enlarge this pane.');if(!notice||!visible(notice))failures.push('minimum notice');if([...document.querySelectorAll('button,input')].some(visible))failures.push('controls below minimum');}
    else if(!board||!visible(board))failures.push('missing surface');else{
     for(const node of board.querySelectorAll('button,input'))if(visible(node)){const r=node.getBoundingClientRect();if(r.width<43.5||r.height<43.5||r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1)failures.push(`target bounds: ${node.id||node.textContent}`);if(!node.disabled){const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(hit!==node&&!node.contains(hit))failures.push(`occluded: ${node.id||node.textContent}`);}}
     for(const node of [board,...board.querySelectorAll('section,nav,dl')])if(visible(node)&&/(auto|scroll)/.test(getComputedStyle(node).overflow)&&(node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1))failures.push(`scrollbar: ${node.id||node.className}`);
     for(const node of board.querySelectorAll('h2,h3,p,button,dt,dd,label,input,span'))if(visible(node)){const box=node.getBoundingClientRect();if(box.bottom>innerHeight+1||box.right>innerWidth+1||box.x<0||box.y<0)failures.push(`content bounds: ${node.id||node.textContent}`);const c=getComputedStyle(node);if(![16,20,28,44].includes(parseFloat(c.fontSize)))failures.push(`type role: ${node.id||node.tagName} ${c.fontSize}`);if(![400,600].includes(+c.fontWeight))failures.push(`type weight: ${node.id||node.tagName} ${c.fontWeight}`);}
     if(board.matches('[role="dialog"]')&&(!board.getAttribute('aria-labelledby')||board.getAttribute('aria-modal')!=='true'))failures.push('dialog semantics');
    }
    return {failures,focus:document.activeElement?.id,motion:matchMedia('(prefers-reduced-motion: reduce)').matches||!!document.querySelector('#app.ui-less-motion')};
   },{selector,width});
   if(before&&await snapshot()!==before)observation.failures.push('authoritative state changed across resize');
   const name=`${state}-${width}x${height}-${theme}.png`;await app.iframe.screenshot({path:new URL(name,output).pathname});evidence.captures.push({state,width,height,theme,name,...observation});evidence.failures.push(...observation.failures.map(message=>({state,width,height,theme,message})));
  }await app.resize(900,600);
 }
 try{
  const f=app.frame;await f.locator('#local-play').click();for(let i=0;i<2;i++){await app.sendPads([pad(0),pad(1)]);await app.sendPads([pad(0,i===0?[0]:[]),pad(1,i===1?[0]:[])]);await app.sendPads([pad(0),pad(1)]);}await f.locator('#race-play').click();await capture('setup','#session-board');await f.locator('#race-finish').fill('0');await capture('invalid','#session-board');await f.locator('#race-finish').fill('500');await f.locator('#race-configuration').getByRole('button',{name:'Roster',exact:true}).click();await capture('roster','#session-board');await f.locator('#race-configuration').getByRole('button',{name:'Settings',exact:true}).click();await f.locator('#local-session-start').click();await app.advance(32);assert.equal(await app.onSession(function(){return this.players.length;}),4);await capture('four-racers','#session-seats');
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);
 }finally{
  await writeFile(new URL('report.json',output),JSON.stringify(evidence,null,2));
  const sheet=await app.browser.newPage({viewport:{width:1440,height:900}});for(const theme of ['dark','light']){const cards=await Promise.all(evidence.captures.filter(c=>c.theme===theme).map(async c=>`<figure><figcaption>${c.state} ${c.width}×${c.height}</figcaption><img src="data:image/png;base64,${(await readFile(new URL(c.name,output))).toString('base64')}"></figure>`));await sheet.setContent(`<style>body{margin:0;background:#ccc;font:14px sans-serif}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}figure{margin:0}img{width:100%;height:190px;object-fit:contain;background:#333}</style><div class="grid">${cards.join('')}</div>`);await sheet.screenshot({path:new URL(`contact-${theme}.png`,output).pathname,fullPage:true});}await sheet.close();await app.close();
 }assert.deepEqual(evidence.failures,[]);
});
