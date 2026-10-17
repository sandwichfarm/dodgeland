import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const evidence = { artifact: 'Built application in opaque allow-scripts iframe', fixture: 'CDP stages coins, named stock and seeded pack RNG only. Purchases, picks, discards, skips and confirmations use visible UI controls.', scenarios: [], frames: [], errors: [], external: [] };
const app = await createMarketGameFixture(evidence);
const { page, frame, iframe, advance, onGame, resize, open, stageMarket, stageOffers } = app;
const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
async function settle() {
  await advance(300);
  await frame.evaluate(() => document.getAnimations().forEach(animation => { if (Number.isFinite(animation.effect?.getComputedTiming().iterations)) animation.finish(); }));
}
const snapshot = () => onGame(function () { return { cards: this.run.cards, wallet: this.run.wallet, capacity: this.run.cardCapacity, pending: this.run.pendingPack, open: this.run.isOpen, state: this.state, effects: this.run.effects, time: this.time, remaining: this.run.market?.remaining }; });
async function browse() { if (await frame.locator('#market-inspect').isVisible()) { await frame.locator('#market-inspect-back').click(); await settle(); } }
async function find(source, id) {
  await browse();
  if (source === 'offer') {
    await frame.locator('#market-shop-tab').click(); await settle();
    const category = await onGame(function(id) { return this.run.market.offers.find(item => item.id === id).section; }, id);
    if (await frame.locator('#market-categories').isVisible()) { await frame.locator(`#market-categories [data-id="${category}"]`).click(); await settle(); }
  }
  while (await frame.locator('#market-prev').isVisible() && await frame.locator('#market-prev').isEnabled()) { await frame.locator('#market-prev').click(); await settle(); }
  for (let i = 0; i < 10; i++) {
    const tile = frame.locator(`[data-market-action="inspect"][data-id="${source}:${id}"]`);
    if (await tile.isVisible()) return tile;
    assert.equal(await frame.locator('#market-next').isEnabled(), true, `${source}:${id} is reachable`);
    await frame.locator('#market-next').click(); await settle();
  }
  assert.fail(`No page for ${source}:${id}`);
}
async function inspect(source, id) { await (await find(source, id)).click(); await settle(); return frame.locator('#market-inspect-action'); }
async function transact(source, id) { await (await inspect(source, id)).click(); await settle(); return snapshot(); }
async function buyCard(id) { const [offer] = await stageOffers([id]); return transact('offer', offer.id); }
async function pack(state = 0) {
  const [offer] = await stageOffers(['pack-satchel']);
  await onGame(function(state) { this.run.state = state; }, state);
  const before = await snapshot(), after = await transact('offer', offer.id);
  assert.equal(after.wallet, before.wallet - offer.price, 'Opening charges once even with a full hand');
  assert.deepEqual(after.cards, before.cards, 'Opening does not equip candidates or discard old cards');
  assert.ok(after.pending); return { before, after, offer };
}
// These scenarios assert a three-slot hand. Expanded inventory adds three
// more slot-changing cards; exercise those semantics in the explicit capacity
// scenarios below rather than accidentally selecting one as a neutral pick.
const slotCards = new Set(['extra-pocket', 'travel-light', 'field-pack', 'ballast', 'glass-purse']);
const ordinary = draft => draft.choices.filter(card => card.components.every(component => !slotCards.has(component.itemId)));
async function choose(card) { await transact('choice', card.id); }
async function makeRoom() {
  assert.equal(await frame.locator('#market-claim').textContent(), 'Make room');
  await frame.locator('#market-claim').click(); await settle();
  assert.equal(await frame.locator('#market').getAttribute('data-market-draft-phase'), 'replace');
  assert.equal(await frame.locator('#market-draft-heading').innerText(), 'Make room');
}
async function discard(card) { await transact('discard', card.id); }
async function claim() { await frame.locator('#market-claim').click(); await settle(); return snapshot(); }
async function assertLayout(label) {
  const result = await frame.evaluate(() => {
    const visible = node => !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden' && !getComputedStyle(node).clipPath.includes('inset(50%');
    const root = document.getElementById('market'), controls = [...root.querySelectorAll('button,[tabindex="0"]')].filter(visible).map(node => {
      const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { id: node.id || node.dataset.marketKey, w: r.width, h: r.height, fits: r.left >= -.5 && r.top >= -.5 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5, hit: hit === node || node.contains(hit) };
    });
    const style = document.createElement('style'); style.textContent = '#market,#market *,#market *::before,#market *::after{transform:none!important;translate:none!important;transition:none!important}#market .market-choice::before{display:none!important}'; document.head.append(style);
    const overflowing = [root, ...root.querySelectorAll('*')].filter(visible).filter(node => getComputedStyle(node).display !== 'inline' && node.clientWidth && node.clientHeight && !node.matches('canvas')).filter(node => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2).map(node => ({ id: node.id || node.className, w: node.clientWidth, sw: node.scrollWidth, h: node.clientHeight, sh: node.scrollHeight }));
    style.remove();
    return { width: innerWidth, height: innerHeight, controls, overflowing, focus: root.contains(document.activeElement) && visible(document.activeElement) && !document.activeElement.closest('[inert]') };
  });
  assert.deepEqual(result.controls.filter(item => item.w < 43.9 || item.h < 43.9 || !item.fits || !item.hit), [], `${label}: targets remain visible, tappable and at least44px`);
  assert.deepEqual(result.overflowing, [], `${label}: no clipped/scrolling contents`);
  assert.ok(result.focus, `${label}: focus remains in current screen`);
  evidence.frames.push({ label, width: result.width, height: result.height });
}
async function stateWith(id) {
  return onGame(function(id) {
    for (let state = 0; state < 2000; state++) {
      const probe = new this.run.constructor(1, [...this.run.catalog.values()]);
      probe.advanceScore(100); probe.creditCoins(1000); probe.open();
      const item = probe.catalog.get('pack-satchel');
      probe.market.offers = [{ id: 'seed-search', itemId: item.id, price: item.price, sold: false, section: 'extras' }];
      probe.state = state; probe.buy('seed-search');
      if (probe.pendingPack?.picks === 1 && probe.pendingPack.choices.some(card => card.components[0].itemId === id)) return state;
    }
    throw new Error(`No seed found for ${id}`);
  }, id);
}
try {
  await stageMarket(); await resize(320, 560); await settle();
  await buyCard('magnet'); await buyCard('traffic-speed'); await buyCard('platform-length');
  const full = await snapshot(); assert.equal(full.cards.length, 3); assert.equal(full.capacity, 3);
  const [blocked] = await stageOffers(['traffic-spacing']);
  await transact('offer', blocked.id);
  assert.match(await frame.locator('#market-inspect-note').innerText(), /Hand full/);
  assert.ok(await frame.locator('#market-inspect-note').isVisible(), 'Failed direct-card purchase visibly explains hand capacity');
  assert.deepEqual((await snapshot()).cards, full.cards); assert.equal((await snapshot()).wallet, full.wallet);
  await resize(240, 240); await settle(); await frame.locator('#market-inspect-action').click(); await settle();
  await assertLayout('Failed purchase explanation at240square');
  await resize(320, 560); await settle();
  await browse();

  const regular = await pack(0), chosen = ordinary(regular.after.pending)[0];
  for (const [width, height] of [[240, 240], [320, 560], [390, 844], [844, 390], [900, 600], [1440, 1000], [2400, 1200]]) {
    await resize(width, height); await settle(); await assertLayout(`draft and skip ${width}x${height}`);
  }
  await resize(320, 560); await settle();
  await choose(chosen); await makeRoom();
  assert.equal(await frame.locator('#market-pick-count').innerText(), '4 / 3 cards');
  assert.equal(await frame.locator('#market-claim').isDisabled(), true);
  await discard(full.cards[0]);
  assert.equal(await frame.locator('#market-pick-count').innerText(), '3 / 3 cards');
  assert.equal(await frame.locator('#market-claim').isEnabled(), true);
  assert.deepEqual((await snapshot()).cards, full.cards, 'Discard marks do not mutate the hand before final confirmation');
  await frame.locator('#market-picks-back').click(); await settle();
  assert.equal(await frame.locator('#market').getAttribute('data-market-draft-phase'), 'choose');
  assert.equal(await frame.locator('#market-claim').isEnabled(), true, 'Returning to choices retains exact picks');
  await makeRoom();
  assert.equal(await frame.locator('#market-claim').isEnabled(), true, 'Returning to replacement retains discard marks');
  for (const [width, height] of [[240, 240], [320, 560], [844, 390], [900, 600], [1440, 1000]]) {
    await resize(width, height); await settle(); await assertLayout(`replacement ${width}x${height}`);
    await inspect('discard', full.cards[0].id); await assertLayout(`discard details ${width}x${height}`); await browse();
    assert.equal(await frame.locator('#market-claim').isEnabled(), true, 'Discard selection survives resize');
  }
  await resize(320, 560); await settle();
  const pending = await snapshot(); await frame.evaluate(() => dispatchEvent(new Event('blur'))); await settle();
  assert.equal((await snapshot()).open, false); await advance(10000);
  assert.deepEqual((await snapshot()).cards, pending.cards); assert.deepEqual((await snapshot()).pending, pending.pending);
  assert.equal((await snapshot()).time, pending.time); assert.equal((await snapshot()).remaining, pending.remaining);
  await frame.evaluate(() => dispatchEvent(new Event('focus'))); await frame.locator('#play').click(); await settle();
  assert.equal(await frame.locator('#market').getAttribute('data-market-draft-phase'), 'replace');
  assert.equal(await frame.locator('#market-claim').isEnabled(), true, 'Forced-close recovery keeps discards and picks');
  const replaced = await claim();
  assert.deepEqual(replaced.cards.map(card => card.id), [...full.cards.slice(1).map(card => card.id), chosen.id]);
  assert.equal(replaced.wallet, regular.after.wallet, 'Discard replacement earns no sale money and costs no extra coins');
  evidence.scenarios.push('Full three-card hand opens regular Large Pack; exact choose/discard/confirm replaces atomically; selection survives pages, five frame sizes, and forced close');

  const bonus = await pack(7), bonusPicks = ordinary(bonus.after.pending).slice(0, 2);
  assert.equal(bonus.after.pending.picks, 2); await choose(bonusPicks[0]); await choose(bonusPicks[1]); await makeRoom();
  await discard(bonus.before.cards[0]); assert.equal(await frame.locator('#market-pick-count').innerText(), '4 / 3 cards');
  assert.equal(await frame.locator('#market-claim').isDisabled(), true);
  await discard(bonus.before.cards[1]); assert.equal(await frame.locator('#market-pick-count').innerText(), '3 / 3 cards');
  const bonusKept = await claim();
  assert.deepEqual(bonusKept.cards.map(card => card.id), [bonus.before.cards[2].id, ...bonusPicks.map(card => card.id)]);
  evidence.scenarios.push('Full-hand bonus Large Pack keeps exactly two new cards and requires two explicit old-card discards');

  const more = await pack(await stateWith('extra-pocket'));
  const extra = more.after.pending.choices.find(card => card.components[0].itemId === 'extra-pocket');
  await choose(extra); assert.match(await frame.locator('#market-claim').innerText(), /Keep/);
  const expanded = await claim(); assert.equal(expanded.cards.length, 4); assert.equal(expanded.capacity, 5);
  await buyCard('side-resist');
  const shrink = await pack(0), shrinkPick = ordinary(shrink.after.pending)[0];
  await choose(shrinkPick); await makeRoom(); await discard(extra);
  assert.equal(await frame.locator('#market-pick-count').innerText(), '5 / 3 cards', 'Discarding a slot card recomputes final capacity');
  assert.equal(await frame.locator('#market-claim').isDisabled(), true);
  const others = shrink.before.cards.filter(card => card.id !== extra.id); await discard(others[0]);
  assert.equal(await frame.locator('#market-pick-count').innerText(), '4 / 3 cards');
  assert.equal(await frame.locator('#market-claim').isDisabled(), true);
  await discard(others[1]);
  const shrunk = await claim(); assert.equal(shrunk.cards.length, 3); assert.equal(shrunk.capacity, 3);
  assert.equal(shrunk.cards.some(card => card.id === extra.id), false);
  evidence.scenarios.push('Capacity-increasing pick expands a full hand; discarding its two-slot card later recomputes capacity and requires two additional discards');

  const less = await pack(await stateWith('travel-light'));
  const light = less.after.pending.choices.find(card => card.components[0].itemId === 'travel-light');
  await choose(light); await makeRoom();
  assert.equal(await frame.locator('#market-pick-count').innerText(), '4 / 2 cards');
  await discard(less.before.cards[0]); assert.equal(await frame.locator('#market-claim').isDisabled(), true);
  await discard(less.before.cards[1]); const reduced = await claim();
  assert.equal(reduced.cards.length, 2); assert.equal(reduced.capacity, 2);
  const restore = await pack(0), restorePick = ordinary(restore.after.pending)[0];
  await choose(restorePick); await makeRoom(); await discard(light);
  assert.equal(await frame.locator('#market-pick-count').innerText(), '2 / 3 cards');
  const restored = await claim(); assert.equal(restored.cards.length, 2); assert.equal(restored.capacity, 3);
  evidence.scenarios.push('Capacity-reducing pick projects two slots; replacing it later restores three slots without stale arithmetic');

  await buyCard('rear-resist');
  for (const replacement of [false, true]) {
    const skipped = await pack(0);
    if (replacement) { await choose(ordinary(skipped.after.pending)[0]); await makeRoom(); await discard(skipped.before.cards[0]); }
    await resize(240, 240); await settle(); await assertLayout(replacement ? 'Skip replacement' : 'Skip draft');
    assert.match(await frame.locator('#market-skip').getAttribute('aria-label'), /no cards.*not refunded/);
    await frame.locator('#market-skip').click(); await settle();
    const after = await snapshot(); assert.equal(after.pending, null);
    assert.deepEqual(after.cards, skipped.before.cards, 'Skipping keeps every original card, including marked discards');
    assert.equal(after.wallet, skipped.after.wallet, 'Skipping a paid pack grants no refund');
    assert.equal(await frame.locator('#market').getAttribute('data-market-view'), 'shop');
    await resize(320, 560); await settle();
  }
  evidence.scenarios.push('Skip works from choices and replacement; keeps no candidates, preserves old cards, and gives no refund');
  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  await writeFile(new URL('market-pack-replacement.json', output), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  await iframe.screenshot({ path: new URL('market-pack-replacement-failure.png', output).pathname }).catch(() => {});
  throw error;
} finally { await app.close(); }
