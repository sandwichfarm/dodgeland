import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const evidence = {
  artifact: 'Production build in an opaque allow-scripts iframe',
  fixture: 'Muted Chromium; SDK storage/theme/keys injected. CDP stages safe terrain, owned cards and stock. Hand inspection, sales, pages and pack selection use visible controls.',
  scenarios: [], frames: [], errors: [], external: [],
};
const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const app = await createMarketGameFixture(evidence);
const { page, frame, iframe, advance, onGame, resize, key, open, stageMarket, stageOffers } = app;
let currentCase = 'boot';
const shelf = frame.locator('#run-inventory');
const handCard = id => frame.locator(`[data-hand-card="${id}"]`);
const state = () => onGame(function () {
  return { cards: this.run.cards, wallet: this.run.wallet, capacity: this.run.cardCapacity,
    pending: this.run.pendingPack, powers: this.run.powers, effects: this.run.effects, open: this.run.isOpen,
    state: this.state, x: this.x, y: this.y, time: this.time };
});
async function settle() {
  await advance(200);
  await frame.evaluate(() => document.getAnimations().forEach(animation => {
    if (Number.isFinite(animation.effect?.getComputedTiming().iterations)) animation.finish();
  }));
}
async function closeHand() {
  if (await frame.locator('#run-hand-detail').isVisible()) { await frame.locator('#run-hand-close').click(); await settle(); }
}
async function browse() {
  await closeHand();
  if (await frame.locator('#market-inspect').isVisible()) { await frame.locator('#market-inspect-back').click(); await settle(); }
}
async function gameplay() {
  await closeHand();
  if (await frame.locator('#drawer').isVisible()) { await frame.locator('#close-drawer').click(); await settle(); }
  if (await frame.locator('#market').isVisible()) { await frame.locator('#market-close').click(); await settle(); }
  if ((await state()).state === 'paused') { await frame.locator('#play').click(); await settle(); }
  assert.equal((await state()).state, 'playing');
}
async function market() { await closeHand(); await gameplay(); await open(); await settle(); }
async function stageHand(ids) {
  await onGame(function (ids) {
    this.run.cards = [];
    this.run.changed();
    this.run.creditCoins(1000);
    const stock = this.run.market.offers;
    for (const [index, itemId] of ids.entries()) {
      const item = this.run.catalog.get(itemId);
      const offer = { id: `hand-fixture-${this.run.revision}-${index}`, itemId, price: item.price, sold: false, section: 'cards' };
      this.run.market.offers = [offer];
      const result = this.run.buy(offer.id);
      if (!result.ok) throw new Error(result.message);
    }
    this.run.market.offers = stock; this.run.revision++;
    this.syncEffects();
  }, ids);
  await settle();
  return (await state()).cards;
}
async function inspect(source, id) {
  await browse();
  if (source === 'offer') {
    await frame.locator('#market-shop-tab').click(); await settle();
    assert.equal(await frame.locator('#market-pagination').isVisible(), false, 'Every offer stays on the market table');
    assert.equal(await frame.locator('#market-categories').isVisible(), false, 'Market stock has no category navigation');
  }
  for (let i = 0; i < 10 && await frame.locator('#market-prev').isVisible() && await frame.locator('#market-prev').isEnabled(); i++) {
    await frame.locator('#market-prev').click(); await settle();
  }
  for (let i = 0; i < 12; i++) {
    const tile = frame.locator(`[data-market-action="inspect"][data-id="${source}:${id}"]`);
    if (await tile.isVisible()) { await tile.click(); await settle(); return; }
    assert.notEqual(source, 'offer', `Offer ${id} must be visible on the single market page`);
    assert.equal(await frame.locator('#market-next').isVisible(), true, `${source}:${id} has a reachable page`);
    assert.equal(await frame.locator('#market-next').isEnabled(), true, `${source}:${id} is present`);
    await frame.locator('#market-next').click(); await settle();
  }
  assert.fail(`Unable to inspect ${source}:${id}`);
}
async function findHand(id) {
  await closeHand();
  for (let i = 0; i < 8 && await frame.locator('#run-hand-prev').isVisible() && await frame.locator('#run-hand-prev').isEnabled(); i++) {
    await frame.locator('#run-hand-prev').click(); await settle();
  }
  for (let i = 0; i < 8; i++) {
    if (await handCard(id).isVisible()) return handCard(id);
    assert.equal(await frame.locator('#run-hand-next').isVisible(), true, `Owned ${id} has a reachable shelf page`);
    assert.equal(await frame.locator('#run-hand-next').isEnabled(), true, `Owned ${id} remains in the hand`);
    await frame.locator('#run-hand-next').click(); await settle();
  }
  assert.fail(`Unable to reach held card ${id}`);
}
async function sell(card) {
  await (await findHand(card.id)).click(); await settle();
  assert.equal(await frame.locator('#run-hand-name').innerText(), card.name);
  if (currentCase === 'Offer inspection sale') await iframe.screenshot({ path: new URL('run-hand-offer-320x560.png', output).pathname });
  assert.equal(await frame.locator('#run-hand-sell').isEnabled(), true);
  await frame.locator('#run-hand-sell').click(); await settle();
}
async function handLayout(label) {
  currentCase = label;
  const metrics = await frame.evaluate(() => {
    const hand = document.getElementById('run-inventory');
    const visible = node => !!node.getClientRects().length && !node.closest('[hidden]') && getComputedStyle(node).visibility !== 'hidden';
    const rect = hand.getBoundingClientRect();
    const controls = [...hand.querySelectorAll('button')].filter(visible).map(node => {
      const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { id: node.id || node.dataset.handKey, width: r.width, height: r.height,
        fits: r.left >= -.5 && r.top >= -.5 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5,
        hit: hit === node || node.contains(hit), inert: !!node.closest('[inert]') };
    });
    const scrollers = [hand, ...hand.querySelectorAll('*')].filter(visible).filter(node => {
      const css = getComputedStyle(node); return ['auto', 'scroll'].includes(css.overflowX) || ['auto', 'scroll'].includes(css.overflowY);
    }).map(node => node.id || node.className);
    const outer = [document.documentElement, document.body, document.getElementById('app')].map(node => ({ left: node.scrollLeft, top: node.scrollTop }));
    return { width: innerWidth, height: innerHeight, hand: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
      visible: visible(hand), controls, scrollers, outer };
  });
  assert.equal(metrics.visible, true, `${label}: owned cards stay visible`);
  assert.ok(metrics.controls.length > 0, `${label}: owned cards remain interactive`);
  assert.deepEqual(metrics.controls.filter(control => control.width < 43.9 || control.height < 43.9 || !control.fits || !control.hit || control.inert), [], `${label}: hand targets fit, receive input, and are at least 44px`);
  assert.deepEqual(metrics.scrollers, [], `${label}: hand has no scroll regions`);
  assert.ok(metrics.outer.every(item => !item.left && !item.top), `${label}: frame never scrolls`);
  evidence.frames.push({ label, ...metrics });
  const shot = { 'dark 240x240 pause': 'run-hand-pause-240x240.png', 'dark 900x600 market': 'run-hand-market-900x600.png', 'dark 2400x1200 market': 'run-hand-market-2400x1200.png' }[label];
  if (shot) await iframe.screenshot({ path: new URL(shot, output).pathname });
  return metrics.hand;
}
function samePlace(expected, actual, label) {
  for (const edge of ['left', 'right', 'top', 'bottom']) assert.ok(Math.abs(expected[edge] - actual[edge]) <= 1, `${label}: stable hand ${edge} (${expected[edge]} vs ${actual[edge]})`);
}
const ordinary = ['magnet', 'traffic-speed', 'platform-length'];
try {
  assert.equal(await frame.locator('#sound-toggle').getAttribute('aria-pressed'), 'true', 'Runtime checks start muted');
  await stageMarket();
  const six = await stageHand(['extra-pocket', 'extra-pocket', ...ordinary, 'side-resist']);
  assert.equal((await state()).cards.length, 6); assert.equal((await state()).capacity, 6);
  const [stock] = await stageOffers(['traffic-spacing']);
  for (const theme of ['dark', 'light']) {
    await frame.evaluate(theme => window.marketGameFixture.setTheme({ colors: theme === 'dark'
      ? { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' }
      : { background: '#f5f0df', text: '#243b32', primary: '#477953' } }), theme);
    for (const [width, height] of [[240, 240], [320, 560], [900, 600], [2400, 1200]]) {
      await resize(width, height); await settle(); await gameplay();
      const anchor = await handLayout(`${theme} ${width}x${height} gameplay`);
      await frame.locator('#pause').click(); await settle();
      samePlace(anchor, await handLayout(`${theme} ${width}x${height} pause`), 'Pause');
      await frame.locator('#choose').click(); await settle();
      samePlace(anchor, await handLayout(`${theme} ${width}x${height} collection`), 'Collection');
      await market();
      samePlace(anchor, await handLayout(`${theme} ${width}x${height} market`), 'Market');
      await inspect('offer', stock.id);
      samePlace(anchor, await handLayout(`${theme} ${width}x${height} offer inspection`), 'Offer inspection');
      await browse();
      for (const card of six) assert.equal(await (await findHand(card.id)).isVisible(), true, `${card.name} reachable at ${width}x${height}`);
    }
  }
  evidence.scenarios.push('Six owned cards remain at the same viewport location in gameplay, pause, collection, market and offer details at four frame sizes in both themes; all are reachable without scrolling.');

  currentCase = 'Offer inspection sale';
  await resize(320, 560); await settle();
  const cards = await stageHand(ordinary);
  const offers = await stageOffers(['traffic-spacing', 'side-resist', 'coin-multiplier']);
  const offer = offers[2];
  await onGame(function (wallet) { this.run.wallet = wallet; this.run.revision++; }, offer.price - cards[0].saleValue);
  await inspect('offer', offer.id);
  const name = await frame.locator('#market-inspect-name').innerText();
  const pageBefore = await frame.locator('#market-page-count').textContent();
  const before = await state();
  assert.equal(await frame.locator('#market-inspect-action').isDisabled(), true);
  await sell(cards[0]);
  const sold = await state();
  assert.equal(sold.wallet, before.wallet + cards[0].saleValue);
  assert.equal(sold.cards.some(card => card.id === cards[0].id), false);
  assert.equal(sold.effects.coinRadius, .1, 'Selling the magnet preserves the duck’s base coin gravity');
  assert.equal(await frame.locator('#market-inspect-name').innerText(), name, 'Sale preserves inspected market offer');
  assert.equal(await frame.locator('#market-inspect').isVisible(), true, 'Sale keeps the current market page open');
  assert.equal(await frame.locator('#market-inspect-action').isEnabled(), true, 'Sale immediately updates offer affordability');
  assert.equal(await frame.locator('#market-page-count').textContent(), pageBefore, 'Sale preserves market page position');
  evidence.scenarios.push('Selling from the persistent hand preserves the inspected offer and its page, removes its modifier, and immediately makes an affordable purchase available.');

  currentCase = 'Pack draft sale';
  await browse(); await stageHand(ordinary);
  const [pack] = await stageOffers(['pack-satchel']);
  await onGame(function () { this.run.state = 0; });
  await inspect('offer', pack.id); await frame.locator('#market-inspect-action').click(); await settle();
  const packed = await state();
  const choice = await onGame(function () {
    return this.run.pendingPack.choices.find(card => this.run.previewPack([card.id], [this.run.cards[0].id]).capacity === this.run.cardCapacity);
  });
  assert.ok(choice, 'Pack sale fixture chooses a card that leaves the default hand capacity unchanged');
  assert.equal(packed.pending.picks, 1);
  await inspect('choice', choice.id); await frame.locator('#market-inspect-action').click(); await settle();
  assert.match(await frame.locator('#market-pick-count').innerText(), /1\s*\/\s*1/);
  for (const [width, height] of [[240, 240], [320, 560], [900, 600], [2400, 1200]]) {
    await resize(width, height); await settle(); await handLayout(`Pack selection ${width}x${height}`);
  }
  await resize(320, 560); await settle();
  const draftBefore = await state(); await sell(draftBefore.cards[0]);
  const draftAfter = await state();
  assert.deepEqual(draftAfter.pending, draftBefore.pending, 'Selling never rerolls, replaces, or closes the pending pack');
  assert.equal(draftAfter.wallet, draftBefore.wallet + draftBefore.cards[0].saleValue);
  assert.match(await frame.locator('#market-pick-count').innerText(), /1\s*\/\s*1/, 'Pack selection survives the hand sale');
  assert.match(await frame.locator('#market-claim').innerText(), /Keep/, 'Free slot is reflected immediately in pack claim');
  await frame.locator('#market-claim').click(); await settle();
  assert.equal((await state()).pending, null); assert.equal((await state()).cards.length, 3);
  assert.ok((await state()).cards.some(card => card.id === choice.id));
  evidence.scenarios.push('Selling while choosing a pack preserves exact draft and selection, pays the sale, and permits the selected card to be kept without leaving the draft.');

  currentCase = 'Gameplay and keyboard hand controls';
  await gameplay();
  const playCard = (await state()).cards[0];
  const button = await findHand(playCard.id); await button.focus();
  const beforeKey = await state(); await key('play');
  assert.equal(await frame.locator('#run-hand-detail').isVisible(), true, 'SDK Enter inspects the focused hand card');
  assert.equal((await state()).state, 'paused', 'Inspecting a hand card pauses the trail');
  assert.equal((await state()).x, beforeKey.x); assert.equal((await state()).y, beforeKey.y, 'SDK Enter does not hop through the hand');
  const pausedTime = (await state()).time; await key('right'); await advance(300);
  assert.equal((await state()).time, pausedTime); assert.equal((await state()).x, beforeKey.x);
  await frame.locator('#run-hand-sell').click(); await settle();
  assert.equal((await state()).cards.some(card => card.id === playCard.id), false, 'Cards can be sold from a paused gameplay inspection');
  assert.equal((await state()).state, 'playing', 'Completing an inspection opened during play safely resumes the trail');
  const resumed = await state(); await key('left');
  assert.equal((await state()).x, resumed.x - 1, 'Closing gameplay inspection returns SDK direction control to the duck');
  await frame.locator('#pause').click(); await settle();
  await frame.locator('#play').focus();
  let tabReachedHand = false;
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    if (await frame.evaluate(() => document.getElementById('run-inventory').contains(document.activeElement))) { tabReachedHand = true; break; }
  }
  assert.equal(tabReachedHand, true, 'Native pause-menu Tab navigation includes the persistent hand');
  const pauseCard = (await state()).cards[0];
  await (await findHand(pauseCard.id)).click(); await settle(); await closeHand();
  assert.equal((await state()).state, 'paused', 'Closing hand details opened from pause keeps the game paused');
  evidence.scenarios.push('SDK Enter and direction commands operate the focused hand without moving the duck; gameplay inspection pauses safely, sale resumes, native Tab reaches cards, and an already-paused run stays paused.');

  currentCase = 'Power-only HUD';
  await gameplay();
  const inventoryBeforePower = await state();
  const powerName = await onGame(function () {
    this.run.cards = []; this.run.powers = [{ id: 'hand-test-power', itemId: 'power-freeze', remaining: 9 }];
    this.run.changed(); this.syncEffects(); return this.run.catalog.get('power-freeze').name;
  });
  await settle();
  assert.equal(await frame.locator('#active-run-powers').isVisible(), true, 'Timed powers retain a HUD with no held cards');
  assert.ok((await frame.locator('#active-run-powers').innerText()).includes(powerName));
  assert.match(await frame.locator('#active-run-powers').innerText(), /[0-9]+s/, 'Power countdown stays visible independently of the hand');
  await onGame(function (saved) { this.run.cards = saved.cards; this.run.powers = saved.powers; this.run.changed(); this.syncEffects(); }, inventoryBeforePower);
  await settle(); await frame.locator('#pause').click(); await settle();
  evidence.scenarios.push('Resuming from a hand inspection restores SDK movement to the duck; a power-only inventory still shows the active power and countdown.');

  currentCase = 'Minimum size and death cleanup';
  await resize(200, 160); await settle();
  assert.equal(await frame.locator('.too-small').isVisible(), true);
  assert.equal(await shelf.isVisible(), false, 'Below minimum size only the size notice remains');
  await resize(320, 560); await settle();
  assert.equal(await shelf.isVisible(), true, 'The hand returns intact after resizing above minimum');
  await gameplay();
  await onGame(function () { this.end('Fixture death', false, 'traffic', 'front'); }); await advance(1400); await settle();
  assert.equal((await state()).cards.length, 0);
  assert.equal(await frame.locator('#run-cards [data-hand-card]').count(), 0, 'Death removes every current-card button');
  assert.equal(await frame.locator('#run-hand-detail').isVisible(), false);
  await frame.locator('#play').click(); await settle();
  assert.equal(await frame.locator('#run-cards [data-hand-card]').count(), 0, 'Retry cannot resurrect a held card');
  assert.equal(await frame.locator('#sound-toggle').getAttribute('aria-pressed'), 'true', 'Runtime checks never unmute sound');
  evidence.scenarios.push('Minimum-size recovery preserves cards; death and retry clear held-card controls and any open inspector.');
  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  await writeFile(new URL('run-hand-runtime.json', output), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ scenarios: evidence.scenarios, frames: evidence.frames.length, errors: evidence.errors }, null, 2));
} catch (error) {
  evidence.failure = { case: currentCase, message: String(error) };
  await writeFile(new URL('run-hand-runtime.json', output), JSON.stringify(evidence, null, 2));
  await iframe.screenshot({ path: new URL('run-hand-runtime-failure.png', output).pathname }).catch(() => {});
  throw error;
} finally { await app.close(); }
