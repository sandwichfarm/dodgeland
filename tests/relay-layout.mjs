// Built production UI only: no private-state writes or alternate render model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createMarketGameFixture} from './market-game-fixture.mjs';
const output=new URL('../artifacts/relay-layout/',import.meta.url);
const frames=[[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]];
const pad=(index,pressed=[])=>({index,id:`Layout controller ${index}`,mapping:'standard',connected:true,timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:false}))});
const themes={dark:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'},light:{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}};

test('Relay visible controls preserve every layout state across frames, themes and motion preferences', {timeout:180000},async()=>{
 const evidence={errors:[],external:[],captures:[],failures:[]},app=await createMarketGameFixture(evidence,{gamepads:true,auditBoundary:true});
 await mkdir(output,{recursive:true});
 async function capture(state,selector){
  for(const [theme,colors] of Object.entries(themes)) for(const [width,height] of frames){
   await app.resize(width,height);await app.frame.evaluate(colors=>window.marketGameFixture.setTheme({colors}),colors);await app.advance(80);
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
     if(board.matches('[role="dialog"]')&&(!board.getAttribute('aria-labelledby')||board.getAttribute('aria-modal')!=='true'))failures.push('dialog semantics');
    }
    return {failures,heading:board?.querySelector('h2')?.textContent,focus:document.activeElement?.id,notice:width===200};
   },{selector,width});
   const name=`${state}-${width}x${height}-${theme}.png`;await app.iframe.screenshot({path:new URL(name,output).pathname});evidence.captures.push({state,width,height,theme,name,...result});evidence.failures.push(...result.failures.map(message=>({state,width,height,theme,message})));
  }
  await app.resize(900,600);
 }
 try{
  await app.frame.locator('#local-play').click();await app.frame.locator('#session-roster [data-seat="p2"]').click();await app.frame.getByRole('button',{name:'Leave this seat',exact:true}).click();await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);
  await app.frame.locator('#relay-play').click();await capture('setup','#session-board');
  await app.frame.locator('#relay-tiles').fill('0');await capture('invalid','#session-board');assert.equal(await app.frame.locator('#local-session-start').isDisabled(),true);
  await app.frame.locator('#relay-tiles').fill('1');await app.frame.locator('.relay-setup-nav').getByRole('button',{name:'Order',exact:true}).click();await app.frame.getByRole('button',{name:/Move later: P1/}).click();await capture('order','#session-board');await app.frame.getByRole('button',{name:/Move earlier: P1/}).click();
  await app.frame.locator('#local-session-start').click();await app.advance(80);await app.frame.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(250);await app.frame.getByRole('heading',{name:'Leg 1 complete'}).waitFor();await capture('handoff','#relay-handoff');
  await app.frame.getByRole('button',{name:'View relay',exact:true}).click();await capture('roster','#relay-handoff');await app.frame.getByRole('button',{name:'Back to handoff',exact:true}).click();
  await app.frame.getByRole('button',{name:"Start P2's leg",exact:true}).focus();await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);assert.equal(await app.frame.locator('#relay-handoff').count(),0);await app.sendPads([]);await capture('disconnected','#relay-handoff');
  await app.frame.getByRole('button',{name:'Skip P2',exact:true}).click();await capture('skip','#relay-handoff');await app.frame.getByRole('button',{name:'Back',exact:true}).click();
  await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await capture('reclaim','#survive-lifecycle-board');await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);
  await app.sendPads([pad(0,[3])]);await capture('leave','#relay-handoff');await app.frame.getByRole('button',{name:'Keep playing',exact:true}).click();await app.sendPads([]);await app.frame.getByRole('button',{name:'Skip P2',exact:true}).click();await app.frame.getByRole('button',{name:'Skip P2',exact:true}).click();await app.frame.getByRole('button',{name:"Start P1's leg",exact:true}).click();
  await app.frame.locator('[data-seat="p1"] [data-session-hud="item"]').click();await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();await capture('waiting','#relay-handoff');
  await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[0])]);await app.sendPads([pad(0)]);await app.sendPads([pad(0,[3])]);await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();
  await capture('results','#relay-handoff');await app.frame.locator('.relay-results-nav button').nth(1).click();await capture('players','#relay-handoff');await app.frame.locator('.relay-results-nav button').nth(1).click();await capture('legs','#relay-handoff');
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await app.frame.evaluate(()=>window.marketGameFixture.forbidden),[]);
 }finally{
  await writeFile(new URL('report.json',output),JSON.stringify(evidence,null,2));
  await writeFile(new URL('index.html',output),`<!doctype html><title>Relay layout evidence</title><style>body{margin:0;font:14px sans-serif;background:#ddd}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}figure{margin:0}img{width:100%;height:220px;object-fit:contain;background:#222}</style><div class="grid">${evidence.captures.map(c=>`<figure><figcaption>${c.state} ${c.width}×${c.height} ${c.theme}</figcaption><img src="${c.name}"></figure>`).join('')}</div>`);
  await app.close();
 }
 assert.deepEqual(evidence.failures,[]);
});
