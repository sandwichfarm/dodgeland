import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url); await mkdir(output, { recursive: true });
const evidence = { artifact: 'Built app in an opaque allow-scripts iframe', frames: [], scenarios: [], errors: [], external: [] };
const fixture = await createMarketGameFixture(evidence), { page, frame, iframe, advance, resize, key, onGame } = fixture;
let current = 'setup';
const colors = { dark: { background:'#242b32', text:'#f0eee5', primary:'#9fc28a' }, light: { background:'#f4f2df', text:'#263c38', primary:'#477953' } };
async function layout(name) {
  current = name;
  await frame.evaluate(() => document.getAnimations().forEach(animation => { if (Number.isFinite(animation.effect?.getComputedTiming().iterations)) animation.finish(); }));
  const result = await frame.evaluate(() => {
    const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const panel = document.getElementById('run-panel'), r = panel.getBoundingClientRect(), style = getComputedStyle(panel);
    const nodes = [panel,...panel.querySelectorAll('*')].filter(visible);
    return { center: [r.x+r.width/2-innerWidth/2,r.y+r.height/2-innerHeight/2], fits:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,
      font:style.fontFamily, paper:style.backgroundColor, wood:style.borderTopColor, tint:getComputedStyle(document.querySelector('.game-surface'),'::after').backgroundColor,
      state:document.querySelector('#app').dataset.runState,page:document.querySelector('#app').dataset.runMenuPage,viewport:[innerWidth,innerHeight],panel:{x:r.x,y:r.y,width:r.width,height:r.height},
      text:nodes.filter(node=>node.matches('button')).flatMap(node=>[...function*(){const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);while(walker.nextNode())if(walker.currentNode.textContent.trim()&&visible(walker.currentNode.parentElement))yield walker.currentNode;}()].map(n=>{const range=document.createRange();range.selectNodeContents(n);const b=node.getBoundingClientRect();return{id:node.id||node.dataset.runTopic, fits:[...range.getClientRects()].every(t=>t.left>=b.left&&t.right<=b.right&&t.top>=b.top&&t.bottom<=b.bottom)};})),
      controls:nodes.filter(node=>node.matches('button,textarea')).map(node=>{const b=node.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2); return {id:node.id||node.dataset.runTopic,x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height, fits:b.x>=r.x&&b.y>=r.y&&b.right<=r.right&&b.bottom<=r.bottom,hit:hit===node||node.contains(hit)};}),
      overflow:nodes.filter(node=>node.clientWidth&&node.clientHeight&&!node.matches('img,svg,svg *')).filter(node=>node.scrollWidth>node.clientWidth+2||node.scrollHeight>node.clientHeight+2||['auto','scroll'].includes(getComputedStyle(node).overflowY)).map(node=>({id:node.id||node.className,width:node.clientWidth,height:node.clientHeight,sw:node.scrollWidth,sh:node.scrollHeight})),
      focused:document.activeElement?.id,
    };
  });
  evidence.last = { name, ...result };
  assert.ok(result.center.every(value=>Math.abs(value)<1),`${name} centered`); assert.ok(result.fits,`${name} fits`);
  assert.match(result.font,/Lilita One/); assert.notEqual(result.tint,'rgba(0, 0, 0, 0)');
  const readyActions = result.state === 'ready' && (result.page === 'options' || (result.page === 'home' && result.viewport[0] >= 320 && result.viewport[1] >= 460));
  if (readyActions) for(const id of ['play','choose','local-play','mode']) assert.ok(result.controls.some(c=>c.id===id), `${name}: ready action ${id} remains visible`);
  if (result.state === 'dead') assert.ok(!result.controls.some(c=>c.id==='local-play'), `${name}: results preserve original Local Play absence`);
  assert.deepEqual(result.text.filter(t=>!t.fits),[],`${name} complete control text fits`);
  assert.deepEqual(result.controls.flatMap((a,i)=>result.controls.slice(i+1).filter(b=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y).map(b=>[a.id,b.id])),[],`${name} action rectangles do not overlap`);
  (evidence.observations ??= []).push({name,...result});
  assert.deepEqual(result.overflow,[],`${name} overflow: ${JSON.stringify(result.overflow)}`);
  assert.ok(result.controls.every(c=>c.width>=43.9&&c.height>=43.9&&c.fits&&c.hit),`${name} controls: ${JSON.stringify(result.controls)}`);
  return result;
}
async function topic(name) { await frame.locator(`[data-run-topic="${name}"]:visible`).click(); await advance(40); }
async function home() { if(await frame.locator('#run-menu-back').isVisible()) {await frame.locator('#run-menu-back').click();await advance(40);} }
async function read(topicName) {
  await topic(topicName); const chunks=[];
  for(let i=0;i<50;i++) {
    await layout(`${current}/${topicName}/${i}`);chunks.push(await frame.locator(topicName==='stats'?'#run-menu-stat-page':'#run-menu-copy').innerText());
    if(await frame.locator('#run-menu-next').isDisabled()) break;
    await frame.locator('#run-menu-next').click();await advance(20);assert.ok(i<49);
  }
  await home();return chunks.join(' ').replace(/\s+/g,' ').trim();
}
try {
  await frame.evaluate(()=>document.fonts.ready);
  for(const state of ['ready','dead']) {
    if(state==='dead') {
      await resize(900,600); await frame.locator('#play').click();
      await onGame(function(){this.maxY=137;this.y=this.fromY=137;this.x=this.fromX=0;this.hop=0;this.time=72.5;this.coins=23;this.ensureRows();this.powerUsedAt=this.maxY;this.end('Caught by the wave.','wave');});
      await advance(1300);
      assert.equal(await frame.locator('#result-score').innerText(),'137');
      assert.equal(await frame.locator('#result-coins').innerText(),'23');
      assert.equal(await frame.locator('#result-time').innerText(),'2:05');
      assert.equal(await frame.locator('#result-best').innerText(),'137');
      assert.equal(await frame.locator('#result-chapter').innerText(),'5');
      assert.match(await frame.locator('#run-seed-code').inputValue(),/^ph3-/);
    }
    for(const [theme,palette]of Object.entries(colors)) {
      await frame.evaluate(colors=>window.marketGameFixture.setTheme({colors}),palette);
      for(const [width,height]of [[200,160],[240,240],[320,360],[320,560],[390,844],[844,390],[900,600],[1440,1000],[2400,1200]]) {
        await home();await resize(width,height);await advance(250);current=`${state}-${theme}-${width}x${height}`;
        if(width<240){assert.equal(await frame.locator('.too-small').isVisible(),true);evidence.frames.push({state,theme,width,height,minimum:true});continue;}
        const metrics=await layout(current);
        if(state==='ready') {
          assert.match(await read('help'),/Tap to hop.*Market every 100 hops/s);
          assert.match(await read('power'),/Water Bounce/);
        } else if(await frame.locator('[data-run-topic="stats"]').isVisible()) {
          const text=await read('stats');assert.match(text,/Distance 137 hops/);assert.match(text,/Coins found 23/);assert.match(text,/Active time 2:05/);assert.match(text,/Chapter 5/);assert.match(text.replaceAll('This run ',''),/Run wallet and items lost/);assert.match(text.replaceAll('Run ended ',''),/Caught by the wave\./);
          await topic('seed');await layout(`${state}-${theme}-${width}x${height}-seed`);
          const token=await frame.locator('#run-seed-code').inputValue();assert.match(token,/^ph3-/);
          assert.equal(await frame.locator('#play').isVisible(),true);await home();
        }
        if(await frame.locator('[data-run-topic="options"]:visible').count()) {await topic('options');await layout('options');if(width<=390)await iframe.screenshot({path:new URL(`run-menu-options-${state}-${theme}-${width}x${height}.png`,output).pathname});assert.equal(await frame.locator('#choose').isVisible(),true);assert.equal(await frame.locator('#mode').isVisible(),true);await home();}
        await iframe.screenshot({path:new URL(`run-menu-${state}-${theme}-${width}x${height}.png`,output).pathname});
        evidence.frames.push({state,theme,width,height,controls:metrics.controls.length});
      }
    }
  }
  await resize(240,240);
  await topic('stats');await key('back-menu');assert.equal(await frame.locator('[data-run-topic="stats"]').isVisible(),true);
  await frame.locator('[data-run-topic="seed"]').focus();await key('play');assert.equal(await frame.locator('#run-seed-code').isVisible(),true);
  for(let n=0;n<8;n++){await page.keyboard.press('Tab');assert.equal(await frame.evaluate(()=>document.getElementById('run-panel').contains(document.activeElement)),true);}
  await page.emulateMedia({reducedMotion:'reduce'});await advance(20);assert.equal(await frame.locator('#run-panel').evaluate(node=>getComputedStyle(node).animationName),'none');
  await home();await resize(900,600);const deadMaterial=await layout('result material');
  await frame.locator('#play').click();await key('pause');await advance(250);
  const pauseMaterial=await frame.locator('#run-panel').evaluate(node=>({paper:getComputedStyle(node).backgroundColor,wood:getComputedStyle(node).borderTopColor,font:getComputedStyle(node).fontFamily}));
  assert.equal(deadMaterial.paper,pauseMaterial.paper);assert.equal(deadMaterial.wood,pauseMaterial.wood);assert.equal(deadMaterial.font,pauseMaterial.font);
  evidence.scenarios.push('Ready/results centered and tinted in 36 frame/theme/state cases, every control ≥44px, no scrolling, complete compact text/stat/seed pages, live resize; real run values; same font/paper/wood as pause; focus and SDK Enter/Back; reduced motion.');
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);
} catch(error) {evidence.failure={current,message:String(error)};await iframe.screenshot({path:new URL('run-menu-failure.png',output).pathname}).catch(()=>{});throw error;}
finally {await writeFile(new URL('run-menu-layout.json',output),JSON.stringify(evidence,null,2));await fixture.close();}
console.log(JSON.stringify(evidence,null,2));
