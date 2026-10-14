import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const evidence = { fixture: 'Production opaque iframe; muted Chromium. Real controls inspect, buy and equip; CDP stages stock and safe terrain.', frames: [], scenarios: [], errors: [], external: [] };
const app = await createMarketGameFixture(evidence);
const { page, frame, iframe, advance, onGame, resize, stageMarket, stageOffers } = app;
let currentCase = 'setup';
async function settle() {
  await advance(240);
  await frame.evaluate(() => document.getAnimations().forEach(animation => {
    if (Number.isFinite(animation.effect?.getComputedTiming().iterations)) animation.finish();
  }));
}
async function back() {
  if (await frame.locator('#market-inspect').isVisible()) await frame.locator('#market-inspect-back').click();
  await settle();
}
async function tab(view) {
  await back(); await frame.locator(`#market-${view}-tab`).click(); await settle();
}
const tile = id => frame.locator(`[data-market-action="inspect"][data-id="offer:${id}"]`);
async function inspect(offer) {
  await tab('shop'); assert.equal(await tile(offer.id).isVisible(), true, 'Every stock item can be selected directly on the board');
  await tile(offer.id).click(); await settle();
  assert.equal(await frame.locator('#market-inspect').isVisible(), true);
}
async function layout(label) {
  const result = await frame.evaluate(() => {
    const market = document.getElementById('market');
    const visible = node => !!node.getClientRects().length && !node.closest('[hidden]') && getComputedStyle(node).visibility !== 'hidden';
    const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const buttons = [...market.querySelectorAll('button,[tabindex="0"]')].filter(visible).map(node => {
      const r = rect(node), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { id: node.id || node.dataset.marketKey, ...r, hit: hit === node || node.contains(hit), disabled: !!node.disabled };
    });
    const scrollers = [market, ...market.querySelectorAll('*')].filter(visible).filter(node => {
      const css = getComputedStyle(node); return ['auto', 'scroll'].includes(css.overflowX) || ['auto', 'scroll'].includes(css.overflowY);
    }).map(node => node.id || node.className);
    const active = [...market.querySelectorAll('[data-market-action="inspect"]')].filter(node => visible(node) && !node.disabled).map(node => ({ id: node.dataset.id, text: node.textContent, ...rect(node) }));
    const shelf = document.getElementById('run-inventory');
    return { width: innerWidth, height: innerHeight, view: market.dataset.marketView, buttons, scrollers, active,
      market: rect(market), hand: visible(shelf) ? rect(shelf) : null,
      outer: [document.documentElement, document.body, document.getElementById('app')].map(node => [node.scrollLeft, node.scrollTop]) };
  });
  evidence.last = { label, ...result };
  assert.deepEqual(result.buttons.filter(b => b.width < 43.9 || b.height < 43.9 || b.x < -.5 || b.y < -.5 || b.right > result.width + .5 || b.bottom > result.height + .5 || !b.hit), [], `${label}: all visible controls fit, receive input and are at least44px`);
  assert.deepEqual(result.scrollers, [], `${label}: no scroll regions`);
  assert.ok(result.outer.every(([x,y]) => !x && !y), `${label}: page remains unscrolled`);
  if (result.hand) assert.ok(result.market.bottom <= result.hand.y + 12, `${label}: shop reserves the persistent hand`);
  evidence.frames.push({ label, ...result }); return result;
}
async function board(label, stock) {
  await tab('shop'); const result = await layout(label);
  assert.equal(await frame.locator('#market-pagination').isVisible(), false, `${label}: no shop paging`);
  assert.equal(await frame.locator('#market-categories').isVisible(), false, `${label}: no shop category navigation`);
  const tabs = await frame.locator('.market-view-tabs button:visible').allTextContents();
  assert.equal(tabs.length, 2, `${label}: only Market and Wardrobe tabs`);
  assert.match(tabs[0], /Market/); assert.match(tabs[1], /Wardrobe/);
  const visibleOffers = result.active.filter(item => item.id.startsWith('offer:'));
  assert.equal(visibleOffers.length, stock.length, `${label}: all purchasable stock is on this one page`);
  for (const offer of stock) assert.ok(visibleOffers.some(item => item.id === `offer:${offer.id}` && item.text.includes(String(offer.price))), `${label}: ${offer.itemId} and its price visible`);
  if (stock.length === 6) {
    const entries = stock.map(offer => visibleOffers.find(item => item.id === `offer:${offer.id}`));
    const [a,b,c,d,e,f] = entries;
    assert.ok(Math.abs(a.y-b.y)<2 && Math.abs(b.y-c.y)<2 && a.x<b.x && b.x<c.x, `${label}: three cards in top row`);
    assert.ok(Math.abs(d.y-e.y)<2 && Math.abs(e.y-f.y)<2 && d.x<e.x && e.x<f.x && d.y>a.y+a.height-2, `${label}: find then two cosmetics in bottom row`);
    assert.ok(Math.abs(a.x-d.x)<2 && Math.abs(b.x-e.x)<2 && Math.abs(c.x-f.x)<2, `${label}: columns align`);
    const cosmeticModels = frame.locator('#market-offers .market-cosmetic-display canvas:visible');
    // The shortest layouts use names/prices; all taller boards expose real item models.
    if (result.market.height > 240) assert.equal(await cosmeticModels.count(), 2);
  }
  return result;
}
async function buy(offer) {
  await inspect(offer); await frame.locator('#market-inspect-action').click(); await settle();
  assert.equal(await onGame(function(id) { return this.run.market.offers.find(item => item.id === id).sold; }, offer.id), true);
}
async function screenshot(name) { await iframe.screenshot({ path: new URL(`market-board-${name}.png`, output).pathname }); }
try {
  await stageMarket();
  // Buying through the UI also gives the Wardrobe real owned hats/shirts and a live hand.
  const first = await stageOffers(['magnet','traffic-speed','platform-length','power-shield','look-hat-boater','look-shirt-sailor']);
  const before = await board('Initial six-slot board', first);
  await buy(first[0]);
  await tab('shop');
  const after = await board('Purchased card leaves its slot', first.slice(1));
  for (const item of after.active) {
    const original = before.active.find(entry => entry.id === item.id);
    assert.ok(original && Math.abs(original.x-item.x)<2 && Math.abs(original.y-item.y)<2, 'Purchases never reorder remaining offers');
  }
  assert.equal(await frame.locator('#run-cards [data-hand-card]').count(), 1, 'Purchased card is immediately in the shared hand');
  await buy(first[4]); await buy(first[5]);
  assert.equal(await frame.locator('#market-wardrobe').isVisible(), true, 'Cosmetic purchase opens its wardrobe');
  assert.equal(await onGame(function() { return this.run.equippedCosmetics.length; }), 2);
  evidence.scenarios.push('UI purchases preserve stock positions, move cards into the shared hand, and equip hat/shirt in the Wardrobe.');

  const stock = await stageOffers(['road-coins','traffic-speed','train-warning','power-coin-rush','look-hat-beanie','look-shirt-vest']);
  for (const theme of ['dark','light']) {
    await frame.evaluate(theme => window.marketGameFixture.setTheme({ colors: theme === 'dark'
      ? { background:'#242b32',text:'#f0eee5',primary:'#9fc28a' }
      : { background:'#f5f0df',text:'#243b32',primary:'#477953' } }), theme);
    for (const [width,height] of [[240,240],[320,560],[390,844],[844,390],[900,600],[1440,1000],[2400,1200]]) {
      currentCase = `${theme} ${width}x${height}`;
      await resize(width,height); await settle();
      await board(`${currentCase} market`, stock);
      if (theme==='dark' && [240,320,900,2400].includes(width)) await screenshot(`${width}x${height}`);
      // Every offer is directly selectable even at the minimum supported frame.
      for (const offer of stock) {
        await inspect(offer); await layout(`${currentCase} inspect ${offer.itemId}`);
        const definition = await onGame(function(id) { return this.run.catalog.get(id); }, offer.itemId);
        assert.equal(await frame.locator('#market-inspect-name').textContent(), definition.name);
        await back();
      }
      await tab('wardrobe'); await layout(`${currentCase} wardrobe`);
      assert.equal(await frame.locator('#market-traveler-model').isVisible(), true, 'Wardrobe always shows the current traveler');
      assert.equal(await frame.locator('#market-traveler-name').textContent(), 'Butter');
      const model = await frame.locator('#market-traveler-model canvas').evaluate(canvas => {
        const rgba = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        return { width:canvas.width, height:canvas.height, ink:rgba.filter((_,i) => i%4===3 && rgba[i]>32).length };
      });
      assert.ok(model.width>=20 && model.height>=20 && model.ink>100, 'Traveler preview contains a shaded 3D model');
      assert.ok(await frame.locator('#market-wardrobe-items [data-market-action="inspect"]:visible').count()>0, 'Owned cosmetics are beside the traveler');
      if (theme==='dark' && [240,320,900].includes(width)) await screenshot(`wardrobe-${width}x${height}`);
    }
  }
  evidence.scenarios.push('All six stock items stay on one aligned3×2 board in seven frame sizes and both themes; every offer opens details; Wardrobe retains traveler and owned cosmetics.');

  currentCase='Empty rare slot and resized return';
  await tab('shop');
  await onGame(function() { this.run.market.offers = this.run.market.offers.filter(offer => offer.section!=='rare'); this.run.revision++; });
  await settle(); const remaining = stock.filter(offer => offer.section!=='rare');
  await board('Empty special slot', remaining);
  const empty = await frame.locator('#market-offers').innerText();
  assert.match(empty, /find|rare|special/i, 'Missing rare find remains an explained empty slot');
  await resize(200,160); await settle();
  assert.equal(await frame.locator('.too-small').isVisible(), true);
  await resize(320,560); await settle(); await app.open();
  await board('Recovered six-slot board', remaining);
  evidence.scenarios.push('An absent rare item keeps its reserved space; minimum-size notice and resize restore current stock.');

  currentCase='Expanded inventory long names';
  const longest=await onGame(function() {
    const items=[...this.run.catalog.values()], names=kind=>items.filter(item=>item.kind===kind).sort((a,b)=>b.name.length-a.name.length);
    return [...names('card').slice(0,3).map(item=>item.id),'pack-satchel',...names('cosmetic').slice(0,2).map(item=>item.id)];
  });
  const longStock=await stageOffers(longest); await resize(240,240); await settle();
  await board('Longest inventory names at minimum size',longStock);
  const overflow=await frame.locator('[data-market-slot]').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+1 || node.scrollWidth>node.clientWidth+1).map(node=>node.textContent));
  assert.deepEqual(overflow,[],'Long names keep their price inside the six-slot board');
  await screenshot('long-names-240x240');

  currentCase='Pack selection and resize';
  const [pack] = await stageOffers(['pack-satchel']);
  await onGame(function() { this.run.state=7; });
  await buy(pack);
  const draft = await onGame(function() { return this.run.pendingPack; });
  assert.equal(draft.picks,2);
  async function choice(id) {
    await back();
    for(let i=0;i<10 && await frame.locator('#market-prev').isEnabled();i++) { await frame.locator('#market-prev').click(); await settle(); }
    for(let i=0;i<10;i++) {
      const card=frame.locator(`[data-market-action="inspect"][data-id="choice:${id}"]`);
      if(await card.isVisible()) { await card.click(); await settle(); return; }
      assert.equal(await frame.locator('#market-next').isEnabled(),true);
      await frame.locator('#market-next').click(); await settle();
    }
    assert.fail('Pack choice unreachable');
  }
  for(const card of [draft.choices[0],draft.choices[4]]) {
    await choice(card.id); await frame.locator('#market-inspect-action').click(); await settle();
  }
  for(const [width,height] of [[240,240],[320,560],[844,390],[900,600],[2400,1200]]) {
    await resize(width,height); await settle();
    await choice(draft.choices[4].id); await layout(`Pack details ${width}x${height}`);
    await back(); await layout(`Pack selection ${width}x${height}`);
    assert.equal(await frame.locator('#market-claim').isEnabled(),true,'Bonus picks survive resize');
    const feedback=await frame.locator('.market-choice.is-selected:visible').first().evaluate(node => ({scale:new DOMMatrixReadOnly(getComputedStyle(node).transform).a, opacity:parseFloat(getComputedStyle(node,'::before').opacity)}));
    assert.ok(Math.abs(feedback.scale-1.2)<.002 && feedback.opacity>0 && feedback.opacity<=.2,'Selection retains20% lift and subtle starburst');
  }
  await page.emulateMedia({reducedMotion:'reduce'}); await settle();
  assert.equal(await frame.locator('.market-choice.is-selected:visible').first().evaluate(node => getComputedStyle(node,'::before').animationName),'none');
  await frame.locator('#market-skip').click(); await settle();
  assert.equal(await onGame(function() { return this.run.pendingPack; }),null);
  evidence.scenarios.push('Bonus pack selections retain20% lift and low-opacity starburst, fit beside the hand through resize, respect reduced motion and remain skippable.');
  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  await writeFile(new URL('market-board-runtime.json',output),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({ frames:evidence.frames.length,scenarios:evidence.scenarios,errors:evidence.errors },null,2));
} catch(error) {
  evidence.failure={currentCase,message:String(error),stack:error.stack};
  await writeFile(new URL('market-board-runtime.json',output),JSON.stringify(evidence,null,2));
  await screenshot('failure').catch(()=>{}); throw error;
} finally { await app.close(); }
