import { artifactForCoverage, artifactDirectoryForCoverage, registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';
// Actual built app in an opaque iframe. CDP stages score/coins/clear terrain;
// market controls, effects, inventory and all subsequent simulation are real.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const built = await readFile(artifactForCoverage(new URL('../dist/index.html', import.meta.url)), 'utf8');
assert.ok(built.includes('market'), 'Build the market implementation first.');
const output = artifactDirectoryForCoverage(new URL('../artifacts/', import.meta.url), 'market-runtime');
await mkdir(output, { recursive: true });

function installFixture() {
  Math.random = () => (window.marketFixture?.seed ?? 0) / 4294967296;
  const f = window.marketFixture = { hydrated: false, writes: [], handlers: {}, actions: [], closed: 0 };
  let pad = { available: true, focused: true, pads: [] };
  const pads = new Set(), themes = new Set();
  f.theme = { colors: { background: '#f4f2df', text: '#263c38', primary: '#477763' } };
  f.setTheme = theme => { f.theme = theme; themes.forEach(fn => fn(theme)); };
  addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'gamepad.state') return;
    pad = event.data; pads.forEach(fn => fn(pad));
  });
  window.napplet = {
    storage: {
      async getItem() { f.hydrated = true; return JSON.stringify({ mode: 'stroll', coins: 9, muted: true, selected: 'pip', travelerVersion: 2 }); },
      async setItem(key, value) { f.writes.push({ key, value }); },
    },
    theme: { async get() { return f.theme; }, onChanged(fn) { themes.add(fn); return { close() { themes.delete(fn); } }; } },
    keys: {
      async registerAction(action) { f.actions.push(action); return { actionId: action.id, binding: action.defaultKey }; },
      onAction(id, fn) { f.handlers[id] = fn; return { close() { delete f.handlers[id]; } }; },
      unregisterAction() {},
    },
    gamepad: {
      get available() { return pad.available; }, get focused() { return pad.focused; },
      getGamepads: () => pad.pads,
      onChange(fn) { pads.add(fn); return { close() { pads.delete(fn); f.closed++; } }; },
    },
  };
}
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const injected = `<script>(${installFixture.toString()})();</script>`;
const harness = `<!doctype html><body style="margin:0"><iframe title="Market integration fixture" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>
const artifact=${json(built.replace('<head>', '<head>' + injected))};
window.mount=()=>document.querySelector('iframe').srcdoc=artifact;
window.send=state=>document.querySelector('iframe').contentWindow.postMessage({type:'gamepad.state',...state},'*');
window.mount();</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const evidence = { artifact: 'unchanged built module in opaque allow-scripts iframe',
  fixture: 'Muted Chromium. CDP stages score-minus-one, earned coins, one explicit transaction offer in its bounded table section, seeded bonus state and meadow terrain; real market actions and simulation follow. Controller is injected NAP-GAMEPAD, not physical hardware.',
  scenarios: [], frames: [], errors: [], external: [] };
let browser, frame;
const identity = { suite: process.argv[1], scenario: 'market-runtime', frame: 'opaque-app', generation: 0, scope: 'current' };
try {
  browser = await chromium.launch({ args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.setDefaultTimeout(8000); await page.clock.install();
  const cdp = await page.context().newCDPSession(page), contexts = new Map();
  cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context));
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
  cdp.on('Runtime.executionContextsCleared', () => contexts.clear()); await cdp.send('Runtime.enable');
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.route('**/*', route => { if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue(); evidence.external.push(route.request().url()); return route.abort(); });
  registerRealm(page, identity);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.waitForFunction(() => window.marketFixture?.hydrated && !!window.marketFixture.handlers['puddlehop.market']);
  // Leave room for the browser round trip when running layout in parallel.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  const advance = ms => page.clock.runFor(ms);
  assert.equal(await frame.evaluate(() => location.origin), 'null');
  assert.equal(await frame.locator('#sound-toggle').getAttribute('aria-pressed'), 'true', 'Runtime checks start muted');
  assert.equal(await frame.evaluate(() => window.marketFixture.actions.find(a => a.id === 'puddlehop.market').defaultKey), 'm');

  async function gameObject() {
    const { frameTree } = await cdp.send('Page.getFrameTree');
    const context = [...contexts.values()].find(c => c.auxData?.frameId === frameTree.childFrames[0].frame.id && c.auxData?.isDefault);
    const { result: handler } = await cdp.send('Runtime.evaluate', { contextId: context.id, includeCommandLineAPI: true,
      expression: 'getEventListeners(document.getElementById("pause")).click[0].listener' });
    const detail = await cdp.send('Runtime.getProperties', { objectId: handler.objectId, ownProperties: true });
    const scopeList = detail.internalProperties.find(p => p.name === '[[Scopes]]').value;
    const scopes = await cdp.send('Runtime.getProperties', { objectId: scopeList.objectId, ownProperties: true });
    for (const scope of scopes.result) {
      if (!scope.value?.objectId || scope.value.description === 'Global') continue;
      const bindings = await cdp.send('Runtime.getProperties', { objectId: scope.value.objectId, ownProperties: true });
      for (const binding of bindings.result) {
        if (binding.value?.type !== 'object' || !binding.value.objectId) continue;
        const match = await cdp.send('Runtime.callFunctionOn', { objectId: binding.value.objectId, returnByValue: true,
          functionDeclaration: 'function(){return this?.rows instanceof Map && typeof this.move === "function" && this.run?.catalog instanceof Map;}' });
        if (match.result.value) return binding.value.objectId;
      }
    }
    throw new Error('Live Game was not found through module debugger scopes.');
  }
  async function onGame(fn, ...args) {
    const result = await cdp.send('Runtime.callFunctionOn', { objectId: await gameObject(), functionDeclaration: fn.toString(), returnByValue: true, arguments: args.map(value => ({ value })) });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const snapshot = () => onGame(function () {
    return { state: this.state, score: this.maxY, time: this.time, hop: this.hop, health: this.health,
      earned: this.coins, wallet: this.run.wallet, cards: this.run.cards, powers: this.run.powers,
      cosmetics: this.run.cosmetics, equippedCosmetics: this.run.equippedCosmetics.map(item => item.id), effects: this.run.effects, open: this.run.isOpen, market: this.run.market, pending: this.run.pendingPack };
  });
  async function key(id = 'market') { await frame.evaluate(id => window.marketFixture.handlers[`puddlehop.${id}`](), id); await advance(320); }
  async function send(buttons = [], extra = {}) {
    await page.evaluate(({ buttons, extra }) => window.send({ available: true, focused: true, pads: [{ index: 0, id: 'Market fixture pad', mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ value: buttons.includes(i) ? 1 : 0, pressed: buttons.includes(i), touched: buttons.includes(i) })) }], ...extra }), { buttons, extra });
    await frame.evaluate(() => Promise.resolve()); await advance(1);
  }
  async function press(button) { await send(); await send([button]); await advance(320); await send(); }
  async function stageScore(score) {
    await onGame(function (score) {
      this.x = this.fromX = 0; this.y = this.fromY = this.maxY = score; this.hop = 0;
      this.waveRow = score - 100; this.ensureRows();
      for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
      this.mobs.splice(0);
    }, score);
  }

  const stagedOffers = new Map();
  let offerSequence = 0;
  async function stageOffers(ids) {
    const offers = await onGame(function (ids, sequence) {
      return ids.map((id, index) => {
        const item = this.run.catalog.get(id);
        return { id: `fixture-${sequence}-${index}`, itemId: id, price: item.price, sold: false,
          section: item.kind === 'card' ? 'cards' : item.kind === 'cosmetic' ? 'extras' : 'rare', item };
      });
    }, ids, offerSequence++);
    offers.forEach(offer => stagedOffers.set(offer.id, offer));
    return offers;
  }
  async function presentOffer(id) {
    const offer = stagedOffers.get(id);
    assert.ok(offer, `Explicit fixture offer exists: ${id}`);
    await onGame(function (offer) {
      if (this.run.market.offers.some(current => current.id === offer.id)) return;
      const { item, ...stock } = offer;
      const limit = stock.section === 'cards' ? 3 : stock.section === 'extras' ? 2 : 1;
      const positions = this.run.market.offers.flatMap((current, index) => current.section === stock.section ? [index] : []);
      if (positions.length >= limit) this.run.market.offers[positions[0]] = stock;
      else this.run.market.offers.push(stock);
      this.run.revision++;
    }, offer);
    await advance(32);
  }
  const ordinaryChoices = draft => onGame(function (choices) {
    return choices.filter(card => this.run.previewPack([card.id]).capacity === this.run.cardCapacity);
  }, draft.choices);

  // Browse only the current screen and page. Details expose the transaction;
  // nothing relies on hidden controls or synthetic clicks on offscreen stock.
  async function backToBrowse() {
    if (await frame.locator('#market-inspect').isVisible()) {
      await frame.locator('#market-inspect-back').click(); await advance(32);
    }
  }
  async function firstPage() {
    while (await frame.locator('#market-pagination').isVisible() && await frame.locator('#market-prev').isEnabled()) {
      await frame.locator('#market-prev').click(); await advance(32);
    }
  }
  async function showEntry(source, id) {
    await backToBrowse();
    if (source !== 'choice') {
      const view = source === 'offer' ? 'shop' : 'wardrobe';
      if (source === 'offer') await presentOffer(id);
      if (await frame.locator('#market').getAttribute('data-market-view') !== view) {
        await frame.locator(`#market-${view}-tab`).click(); await advance(32);
      }
      if (source === 'look' && await frame.locator('#market-categories').isVisible()) {
        const tab = frame.locator('#market-categories [data-id="all"]');
        if (await tab.getAttribute('aria-pressed') !== 'true') { await tab.click(); await advance(32); }
      }
    }
    await firstPage();
    const tile = frame.locator(`[data-market-action="inspect"][data-id="${source}:${id}"]`);
    for (let tries = 0; tries < 32; tries++) {
      if (await tile.isVisible()) return tile;
      assert.notEqual(source, 'offer', `Every offer is on the single market page: ${id}`);
      assert.equal(await frame.locator('#market-pagination').isVisible() && await frame.locator('#market-next').isEnabled(), true, `Can page to ${source}:${id}`);
      await frame.locator('#market-next').click(); await advance(32);
    }
    assert.fail(`Item was not found: ${source}:${id}`);
  }
  async function inspectEntry(source, id) {
    await (await showEntry(source, id)).click(); await advance(32);
    assert.equal(await frame.locator('#market-inspect').isVisible(), true);
    return frame.locator('#market-inspect-action');
  }
  async function choose(id, via = 'click') {
    const action = await inspectEntry('choice', id);
    if (via === 'keyboard') { await action.focus(); await key('play'); }
    else if (via === 'gamepad') { await action.focus(); await press(0); }
    else { await action.click(); await advance(32); }
  }
  async function pageItems(selector) {
    await backToBrowse(); await firstPage();
    const found = [];
    for (let tries = 0; tries < 32; tries++) {
      found.push(...await frame.locator(selector).evaluateAll(nodes => nodes.map(node => ({ id: node.dataset.card ?? node.dataset.cosmetic ?? node.dataset.power, text: node.textContent }))));
      if (!await frame.locator('#market-pagination').isVisible() || !await frame.locator('#market-next').isEnabled()) break;
      await frame.locator('#market-next').click(); await advance(32);
    }
    return found;
  }

  const previewCanvas = owner => owner.locator('canvas.market-preview-canvas');
  const previewPixels = owner => previewCanvas(owner).evaluate(canvas => canvas.toDataURL());
  async function assertModel(owner, label) {
    assert.equal(await previewCanvas(owner).isVisible(), true, `${label}: model canvas is visible`);
    const image = await previewCanvas(owner).evaluate(canvas => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0; const colors = new Set();
      for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 32) {
        ink++; colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      }
      return { width: canvas.width, height: canvas.height, ink, colors: colors.size };
    });
    assert.ok(image.width > 20 && image.height > 20 && image.ink > 100 && image.colors > 4,
      `${label}: real shaded model pixels ${JSON.stringify(image)}`);
    return image;
  }
  const traveler = frame.locator('#market-traveler-model');
  async function leavePreviews() {
    await frame.locator('#market-close').hover(); await frame.locator('#market-close').focus(); await advance(2000);
  }

  // Scenarios are below; selectors track the public UI contract, not minified names.
  await frame.locator('#play').click();
  await key(); assert.equal((await snapshot()).open, false, 'no market before milestone');
  await stageScore(99);
  await onGame(function () { this.awardCoins(1000); });
  await frame.locator('[data-direction="forward"]').click(); await advance(180);
  assert.equal((await snapshot()).market.milestone, 100);
  await key();
  assert.equal((await snapshot()).open, true); assert.equal((await snapshot()).state, 'paused');
  const frozen = await snapshot(); await advance(5000);
  assert.deepEqual(await snapshot(), frozen, 'shopping freezes simulation, inventory timers and invitation');
  evidence.scenarios.push('100 milestone through real hop; M opens; shopping freezes all clocks');

  assert.equal(await frame.locator('#market').isVisible(), true);
  assert.equal(await frame.locator('#run-inventory').isVisible(), true, 'the shared hand stays on the market table');
  assert.equal(await frame.locator('#run-inventory').evaluate(node => node.inert), false, 'the hand remains interactive inside the market');
  assert.match(await frame.locator('#market').getAttribute('aria-owns'), /run-inventory/);
  assert.equal(await frame.locator('#market-traveler-name').textContent(), 'Pip', 'portrait uses the chosen traveler, not a fixed duck');
  assert.equal(await frame.evaluate(() => document.activeElement.dataset.marketAction), 'inspect', 'entry focuses the first visible find');
  const generated = await onGame(function () { return this.run.market.offers.map(offer => ({ ...offer, item: this.run.catalog.get(offer.itemId) })); });
  assert.equal(generated.filter(offer => offer.section === 'cards' && offer.item.kind === 'card').length, 3);
  assert.equal(generated.filter(offer => offer.section === 'extras' && offer.item.kind === 'cosmetic').length, 2);
  const rareFinds = generated.filter(offer => offer.section === 'rare');
  assert.ok(rareFinds.length <= 1);
  assert.ok(rareFinds.every(offer => offer.item.kind === 'pack' || ['rare', 'epic', 'legendary'].includes(offer.item.rarity)));
  assert.equal(new Set(generated.map(offer => offer.itemId)).size, generated.length);
  generated.forEach(offer => stagedOffers.set(offer.id, offer));
  assert.equal(await frame.locator('#market-pagination').isVisible(), false, 'All market stock appears on one page');
  assert.equal(await frame.locator('#market-categories').isVisible(), false, 'The market has no Cards/Rare/Gear category navigation');
  assert.equal(await frame.locator('#market-hand-tab').isVisible(), false, 'Market and Wardrobe are the only main views');
  await frame.locator('#market-wardrobe-tab').click(); await advance(32);
  await assertModel(traveler, 'current traveler in Wardrobe');
  await frame.locator('#market-shop-tab').click(); await advance(32);
  evidence.scenarios.push('Generated stock has three random cards, two cosmetics, and at most one rare find or pack on one table; Wardrobe retains the chosen traveler preview');
  const stock = await stageOffers(['pack-pocket', 'pack-satchel', 'magnet', 'power-shield', 'look-halo', 'look-hat-boater', 'look-hat-cap', 'look-shirt-sailor']);
  const hatOffer = stock.find(offer => offer.item.id === 'look-hat-boater');
  const hatPreview = frame.locator(`#market-offers [data-offer="${hatOffer.id}"]`);
  for (const offer of stock.filter(offer => offer.item.kind === 'cosmetic')) {
    const item = await showEntry('offer', offer.id);
    assert.equal(await item.evaluate(node => node.classList.contains('playing-card')), false, `${offer.item.name} is an item display, not a card`);
    assert.equal(await item.locator('.card-corner, .card-rarity, .card-rank').count(), 0, `${offer.item.name} has no card ranks or corners`);
    assert.match(await item.innerText(), new RegExp(offer.item.name));
    await assertModel(item, offer.item.name);
  }
  await showEntry('offer', hatOffer.id);
  await leavePreviews();
  const front = await previewPixels(hatPreview);
  await hatPreview.hover(); await advance(600);
  assert.notEqual(await previewPixels(hatPreview), front, 'hover turns the rendered model pixels');
  assert.equal(await previewCanvas(hatPreview).evaluate(node => getComputedStyle(node).transform), 'none', 'turning is in the model, not a flat canvas transform');
  await leavePreviews();
  const unfocusedHat = await previewPixels(hatPreview);
  await hatPreview.focus(); await advance(600);
  assert.notEqual(await previewPixels(hatPreview), unfocusedHat, 'keyboard focus also turns the model');
  await leavePreviews();
  const stoppedHat = await previewPixels(hatPreview); await advance(600);
  assert.equal(await previewPixels(hatPreview), stoppedHat, 'leaving the preview stops its turn');
  for (const preference of ['os', 'app']) {
    if (preference === 'os') await page.emulateMedia({ reducedMotion: 'reduce' });
    else await frame.locator('#reduced-motion').evaluate(node => { node.checked = true; node.dispatchEvent(new Event('change')); });
    await hatPreview.hover(); await hatPreview.focus(); await advance(64);
    const still = await previewPixels(hatPreview); await advance(600);
    assert.equal(await previewPixels(hatPreview), still, `${preference} reduced motion keeps a still model on hover/focus`);
    await leavePreviews();
    if (preference === 'os') await page.emulateMedia({ reducedMotion: 'no-preference' });
    else await frame.locator('#reduced-motion').evaluate(node => { node.checked = false; node.dispatchEvent(new Event('change')); });
    await advance(32);
  }
  evidence.scenarios.push('Cosmetics use shaded model canvases without card decoration; hover and keyboard focus rotate pixels; leaving or either reduced-motion preference stops rotation; portrait follows the selected Pip traveler');
  const buyButton = id => frame.locator(`[data-market-action="buy"][data-id="${id}"]`);
  async function buy(offer) {
    const before = await snapshot();
    await (await inspectEntry('offer', offer.id)).click(); await advance(32);
    const after = await snapshot();
    assert.equal(after.wallet, before.wallet - offer.price);
    assert.equal(after.earned, before.earned, 'spending leaves earned-coin records intact');
    assert.equal(await buyButton(offer.id).isVisible(), false, 'purchase details close after a successful purchase');
    assert.equal(after.market.offers.find(item => item.id === offer.id).sold, true);
    assert.equal(await frame.locator('#market-wallet').innerText(), `${after.wallet} ◆`);
    return after;
  }
  const pack = stock.find(offer => offer.item.id === 'pack-pocket');
  const packed = await buy(pack);
  assert.equal(packed.cards.length, 0, 'revealed candidates are not equipped');
  assert.deepEqual(packed.effects, frozen.effects);
  assert.equal(packed.pending.choices.length, 3); assert.equal(packed.pending.picks, 1);
  assert.equal(await frame.locator('#market-draft').isVisible(), true);
  assert.equal(await frame.locator('#market-claim').isDisabled(), true);
  await key(); await key('pause'); await key('back-menu');
  assert.equal((await snapshot()).open, true, 'all manual close shortcuts preserve an unfinished draft');
  const smallChoice = (await ordinaryChoices(packed.pending))[0];
  assert.ok(smallChoice, 'The pack fixture contains a card that leaves the hand capacity unchanged');
  await choose(packed.pending.choices.find(card => card.id !== smallChoice.id).id);
  await choose(smallChoice.id);
  assert.equal(await frame.locator('#market-choices [aria-pressed="true"]').count(), 1, 'single pick can be replaced');
  const unfinished = await snapshot();
  await frame.evaluate(() => dispatchEvent(new Event('blur'))); await advance(32);
  assert.equal((await snapshot()).open, false); assert.equal((await snapshot()).state, 'paused');
  assert.deepEqual((await snapshot()).pending, unfinished.pending);
  await advance(20000); assert.deepEqual(await snapshot(), { ...unfinished, open: false }, 'closed unfinished draft freezes the world and invitation');
  await frame.evaluate(() => dispatchEvent(new Event('focus')));
  await frame.locator('#play').click(); await advance(32);
  assert.equal((await snapshot()).open, true, 'resume returns to card selection');
  assert.equal((await snapshot()).wallet, packed.wallet, 'returning does not charge again');
  await frame.locator('#market-claim').click(); await advance(32);
  const claimedSmall = await snapshot();
  assert.equal(claimedSmall.pending, null); assert.deepEqual(claimedSmall.cards.map(c => c.id), [smallChoice.id]);
  assert.equal(await frame.locator('#run-cards [data-hand-card]').count(), 1);
  assert.equal(await frame.locator('#market').getAttribute('data-market-view'), 'shop');
  assert.equal(await frame.locator(`#run-cards [data-hand-card="${smallChoice.id}"]`).isVisible(), true, 'claimed card immediately joins the persistent hand without a separate hand page');
  assert.notDeepEqual(claimedSmall.effects, frozen.effects);
  const large = stock.find(offer => offer.item.id === 'pack-satchel');
  await onGame(function () { this.run.state = 0; }); // Seeded regular outcome; bonus coverage follows below.
  const openedLarge = await buy(large);
  assert.equal(openedLarge.pending.choices.length, 5); assert.equal(openedLarge.pending.picks, 1); assert.equal(openedLarge.pending.bonus, false);
  const largeOrdinary = await ordinaryChoices(openedLarge.pending);
  const largeChoice = largeOrdinary.find(card => card.components[0].itemId !== smallChoice.components[0].itemId) ?? largeOrdinary[0];
  assert.ok(largeChoice, 'The large-pack fixture contains a card that leaves the hand capacity unchanged');
  await choose(largeChoice.id, 'keyboard');
  await frame.locator('#market-claim').focus(); await key('play');
  assert.equal((await snapshot()).cards.length, 2, 'keyboard confirm keeps exactly one large-pack card');
  assert.equal((await snapshot()).pending, null);
  evidence.scenarios.push('Small 3/keep1 and regular Large 5/keep1; exact confirmation, no unselected effects, keyboard selection, forced-close recovery with no charge or reroll');
  await buy(stock.find(offer => offer.item.kind === 'card'));
  assert.equal((await snapshot()).cards.length, 3, 'three cards fill the default hand');
  const [blockedOffer] = await stageOffers(['traffic-speed']);
  const blockedAction = await inspectEntry('offer', blockedOffer.id);
  const full = await snapshot();
  await blockedAction.click(); await advance(32);
  assert.deepEqual(await snapshot(), full, 'a fourth ordinary card cannot spend coins or change the hand');
  const power = stock.find(offer => offer.item.kind === 'power');
  const powered = await buy(power);
  assert.equal(powered.powers.length, 1);
  assert.equal(powered.powers[0].remaining, power.item.duration);
  assert.equal(await frame.locator('#market').getAttribute('data-market-view'), 'shop', 'A power purchase returns to the market table');
  assert.equal(await frame.locator('#run-cards [data-power]').count(), 0, 'the shared hand is reserved for held cards');
  await frame.locator('#market-wardrobe-tab').click(); await advance(32);
  await assertModel(traveler, 'traveler before getting dressed');
  const beforeCosmetic = await frame.locator('#scene').evaluate(canvas => canvas.toDataURL());
  const beforePortrait = await previewPixels(traveler);
  const cosmetic = stock.find(offer => offer.item.kind === 'cosmetic');
  const dressed = await buy(cosmetic);
  assert.deepEqual(dressed.cosmetics, [cosmetic.item.id]);
  assert.notEqual(await frame.locator('#scene').evaluate(canvas => canvas.toDataURL()), beforeCosmetic, 'cosmetic changes real canvas rendering while the run clock is frozen');
  assert.notEqual(await previewPixels(traveler), beforePortrait, 'current-traveler preview immediately shows the bought effect');
  assert.match(await frame.locator('#market-traveler-outfit').innerText(), new RegExp(cosmetic.item.name));
  const canvasPixels = () => frame.locator('#scene').evaluate(canvas => canvas.toDataURL());
  const lookOffer = id => stock.find(offer => offer.item.id === id);
  const beforeHat = await canvasPixels();
  const portraitBeforeHat = await previewPixels(traveler);
  const hatted = await buy(lookOffer('look-hat-boater'));
  assert.deepEqual(hatted.equippedCosmetics, ['look-hat-boater', 'look-halo']);
  assert.match(await frame.locator('#market-traveler-outfit').innerText(), /Boater/);
  assert.notEqual(await canvasPixels(), beforeHat, 'the hat changes the rendered traveler');
  assert.notEqual(await previewPixels(traveler), portraitBeforeHat, 'current-traveler preview shows the hat');
  const ownedHat = frame.locator('#market-wardrobe-items [data-cosmetic="look-hat-boater"]');
  assert.equal(await ownedHat.evaluate(node => node.classList.contains('playing-card')), false, 'owned cosmetic also uses an item display');
  assert.equal(await ownedHat.locator('.card-corner, .card-rarity, .card-rank').count(), 0);
  await assertModel(ownedHat, 'owned hat');
  const beforeShirt = await canvasPixels();
  const portraitBeforeShirt = await previewPixels(traveler);
  const clothed = await buy(lookOffer('look-shirt-sailor'));
  assert.deepEqual(clothed.equippedCosmetics, ['look-hat-boater', 'look-shirt-sailor', 'look-halo']);
  assert.match(await frame.locator('#market-traveler-outfit').innerText(), /Sailor/);
  const boaterAndShirt = await canvasPixels();
  const portraitBoaterAndShirt = await previewPixels(traveler);
  assert.notEqual(boaterAndShirt, beforeShirt, 'a shirt renders alongside the hat and effect');
  assert.notEqual(portraitBoaterAndShirt, portraitBeforeShirt, 'current-traveler preview shows hat, shirt and effect together');
  const capped = await buy(lookOffer('look-hat-cap'));
  assert.deepEqual(capped.equippedCosmetics, ['look-hat-cap', 'look-shirt-sailor', 'look-halo']);
  assert.ok(capped.cosmetics.includes('look-hat-boater'), 'a replacement hat remains owned for this run');
  await showEntry('look', 'look-hat-boater');
  assert.equal(await frame.locator('#market-wardrobe-items [data-cosmetic="look-hat-boater"]').count(), 1);
  assert.doesNotMatch(await frame.locator('#market-traveler-outfit').innerText(), /Boater/);
  assert.match(await frame.locator('#market-traveler-outfit').innerText(), new RegExp(lookOffer('look-hat-cap').item.name));
  assert.notEqual(await canvasPixels(), boaterAndShirt, 'switching hats updates the traveler');
  assert.notEqual(await previewPixels(traveler), portraitBoaterAndShirt, 'switching hats updates the current-traveler preview');
  const portraitCapped = await previewPixels(traveler);
  await (await inspectEntry('look', 'look-hat-boater')).click(); await advance(32);
  const reworn = await snapshot();
  assert.deepEqual(reworn.equippedCosmetics, ['look-hat-boater', 'look-shirt-sailor', 'look-halo']);
  assert.equal(reworn.wallet, capped.wallet, 'wearing an owned item does not charge again');
  assert.deepEqual(reworn.cosmetics, capped.cosmetics, 'switching hats preserves all purchased clothing');
  assert.equal(await frame.locator('#run-cards [data-cosmetic]').count(), 0, 'cosmetics stay with the traveler rather than taking card positions');
  assert.equal(await canvasPixels(), boaterAndShirt, 'rewearing the old hat restores the same frozen traveler appearance');
  assert.ok(await previewPixels(traveler) !== portraitCapped, 'rewearing the old hat updates the current-traveler model at the same wardrobe inventory size');
  await assertModel(traveler, 'reworn hat with shirt and effect');
  const outfit = await frame.locator('#market-traveler-outfit').innerText();
  for (const id of ['look-hat-boater', 'look-shirt-sailor', 'look-halo']) assert.match(outfit, new RegExp(lookOffer(id).item.name));
  assert.doesNotMatch(outfit, new RegExp(lookOffer('look-hat-cap').item.name));
  evidence.scenarios.push('Hat + shirt + effect coexist in scene and current-traveler preview; cosmetics remain separate from held cards; owned looks remain item models; second hat stays owned; Wear restores the first hat for free without changing shirt/effect');
  const held = await snapshot(); await advance(3000);
  assert.deepEqual(await snapshot(), held, 'purchased powers remain frozen while shopping');

  assert.equal(await frame.locator('#market-combine').count(), 0, 'fusion is removed');
  assert.equal(await frame.locator('[data-market-action="select"]').count(), 0);
  assert.equal(await onGame(function () { return typeof this.run.combine; }), 'undefined');
  assert.deepEqual(await frame.locator('#run-cards [data-hand-card]').evaluateAll(nodes => nodes.map(node => node.dataset.handCard)), held.cards.map(card => card.id), 'bought and chosen cards share the persistent hand');
  assert.equal(await frame.locator('#market-hand-tab').isVisible(), false, 'Timed powers do not introduce a third main tab');
  await showEntry('look', cosmetic.item.id);
  assert.match(await frame.locator('#market-wardrobe-items').innerText(), new RegExp(cosmetic.item.name));
  assert.equal(await frame.locator('#market-wardrobe-items [data-card], #market-wardrobe-items [data-power]').count(), 0, 'wardrobe contains no ability cards or powers');
  assert.equal((await pageItems('#market-wardrobe-items [data-cosmetic]')).length, held.cosmetics.length, 'every owned cosmetic has a place in the wardrobe');
  assert.equal(await frame.locator('#market-traveler').isVisible(), true, 'current traveler stays visible alongside the separate wardrobe');
  const cardToSell = held.cards[0];
  const [fundingOffer] = await stageOffers(['traffic-spacing']);
  await presentOffer(fundingOffer.id);
  await onGame(function (offerId, saleValue) {
    this.run.market.offers.find(offer => offer.id === offerId).price = this.run.wallet + saleValue;
    this.run.revision++;
  }, fundingOffer.id, cardToSell.saleValue);
  await advance(32);
  await inspectEntry('offer', fundingOffer.id);
  assert.equal(await frame.locator('#market-inspect-action').isDisabled(), true, 'inspected offer initially needs the sale coins');
  const beforeSale = await snapshot();
  await frame.locator(`#run-cards [data-hand-card="${cardToSell.id}"]`).click(); await advance(32);
  assert.equal(await frame.locator('#run-hand-detail').isVisible(), true);
  assert.equal(await frame.locator('#market').getAttribute('data-market-view'), 'inspect', 'opening a held card preserves the current shop inspection');
  await frame.locator('#run-hand-sell').click(); await advance(32);
  const sold = await snapshot();
  assert.equal(sold.wallet, beforeSale.wallet + cardToSell.saleValue);
  assert.equal(sold.cards.length, beforeSale.cards.length - 1);
  assert.equal(await frame.locator(`#run-cards [data-hand-card="${cardToSell.id}"]`).count(), 0);
  assert.equal(await frame.locator('#run-hand-detail').isHidden(), true);
  assert.equal(await frame.locator('#market').getAttribute('data-market-view'), 'inspect', 'selling returns to the same offer without Back or category changes');
  assert.equal(await frame.locator('#market-inspect-action').getAttribute('data-id'), fundingOffer.id);
  assert.equal(await frame.locator('#market-inspect-action').isEnabled(), true, 'sale immediately makes the current offer affordable');
  assert.notDeepEqual(sold.effects, beforeSale.effects, 'selling removes actual live card modifiers');
  evidence.scenarios.push({ shop: 'pack choices and direct cards in persistent hand; cosmetics in Wardrobe; timed powers stay out of the held-card slots; selling funds the currently inspected offer without navigation; no fusion API/UI', pack: pack.item.id, power: power.item.id, cosmetic: cosmetic.item.id });

  await backToBrowse();
  await frame.locator('#market-wardrobe-tab').click(); await advance(32);
  await traveler.focus(); await advance(160);
  const closingPortrait = await previewCanvas(traveler).elementHandle();
  await key(); assert.equal((await snapshot()).open, false);
  assert.equal(await frame.locator('#active-run-powers').isVisible(), true, 'Timed powers remain visible in the gameplay HUD');
  assert.match(await frame.locator('#active-run-powers').innerText(), new RegExp(power.item.name));
  assert.match(await frame.locator('#active-run-powers').innerText(), /[0-9]+s/, 'Timed power HUD includes remaining seconds');
  const closedPixels = await closingPortrait.evaluate(canvas => canvas.toDataURL()); await advance(400);
  assert.equal(await closingPortrait.evaluate(canvas => canvas.toDataURL()), closedPixels, 'closing the market stops rendering the previous preview');
  const retained = (await snapshot()).market.offers;
  await send(); await press(4);
  assert.equal((await snapshot()).open, true, 'LB opens market');
  assert.deepEqual((await snapshot()).market.offers, retained, 'reopening preserves sold-out stock');
  const beforeDirection = await snapshot(); await key('forward');
  assert.equal((await snapshot()).score, beforeDirection.score, 'movement key navigates market rather than moving the traveler');
  assert.equal(await frame.evaluate(() => [...document.querySelectorAll('#market, #run-inventory')].some(node => node.contains(document.activeElement))), true);
  await frame.locator('#market-close').focus(); await page.keyboard.press('Tab');
  assert.equal(await frame.evaluate(() => [...document.querySelectorAll('#market, #run-inventory')].some(node => node.contains(document.activeElement))), true, 'native Tab remains in the market and its shared hand');
  await press(1); assert.equal((await snapshot()).open, false, 'B closes and resumes');

  await key(); await send([], { focused: false }); await advance(50);
  assert.equal((await snapshot()).open, false); assert.equal((await snapshot()).state, 'paused', 'controller focus loss closes without resuming');
  const unfocused = await snapshot(); await advance(1000);
  assert.deepEqual(await snapshot(), unfocused);
  await send([0]); await advance(100); assert.equal((await snapshot()).state, 'paused', 'held confirm on focus return cannot resume');
  await press(0); await key();
  assert.equal((await snapshot()).open, true);
  await frame.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await advance(32); assert.equal((await snapshot()).open, false); assert.equal((await snapshot()).state, 'paused');
  const hidden = await snapshot(); await advance(1500); assert.deepEqual(await snapshot(), hidden);
  await frame.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await frame.locator('#play').click(); await key();
  await page.locator('iframe').evaluate(el => { el.style.width = '200px'; el.style.height = '160px'; }); await advance(64);
  assert.equal((await snapshot()).open, false); assert.equal((await snapshot()).state, 'paused');
  assert.equal(await frame.locator('.too-small').isVisible(), true);
  await page.locator('iframe').evaluate(el => { el.style.width = '900px'; el.style.height = '600px'; }); await advance(64);
  assert.equal((await snapshot()).state, 'paused', 'enlarging preserves pause');
  await frame.locator('#play').click(); await key();
  await key('pause');
  assert.equal((await snapshot()).open, false); assert.equal((await snapshot()).state, 'playing', 'pause binding closes the market safely');
  await advance(16_000);
  assert.equal((await snapshot()).market, null, 'invitation expires only with active play');
  assert.deepEqual((await snapshot()).powers, [], 'temporary powers expire with active play');
  await key(); assert.equal((await snapshot()).open, false);
  await frame.locator('[data-direction="back"]').click(); await advance(180);
  await frame.locator('[data-direction="forward"]').click(); await advance(180);
  assert.equal((await snapshot()).market, null, 'backtracking cannot regenerate expired stock');
  evidence.scenarios.push('M/LB/B navigation, modal focus, controller focus loss, hidden document, minimum size, expiry and no backtracking reroll');

  await stageScore(199);
  await frame.locator('[data-direction="forward"]').click(); await advance(180);
  assert.equal((await snapshot()).market.milestone, 200);
  await press(4); assert.equal((await snapshot()).open, true);
  const [nextCard] = await stageOffers(['traffic-speed']);
  const beforePadBuy = await snapshot();
  await (await showEntry('offer', nextCard.id)).focus(); await press(0);
  assert.equal((await snapshot()).wallet, beforePadBuy.wallet, 'gamepad inspection spends nothing');
  await frame.locator('#market-inspect-action').focus(); await press(0);
  assert.equal((await snapshot()).wallet, beforePadBuy.wallet - nextCard.price, 'gamepad A buys the focused offer');
  assert.equal((await snapshot()).cards.length, beforePadBuy.cards.length + 1);
  await press(1);
  await onGame(function () { this.end('Market fixture: fatal train encounter.', 'train'); }); await advance(1200);
  const dead = await snapshot();
  assert.equal(dead.state, 'dead'); assert.equal(dead.wallet, 0); assert.equal(dead.market, null);
  assert.deepEqual(dead.cards, []); assert.deepEqual(dead.powers, []); assert.deepEqual(dead.cosmetics, []); assert.deepEqual(dead.equippedCosmetics, []);
  assert.equal(await frame.locator('#run-inventory').isHidden(), true);
  const stored = await frame.evaluate(() => JSON.parse(window.marketFixture.writes.at(-1).value));
  assert.equal(stored.coins, 1009, 'lifetime history survives purchases and death');
  assert.ok(['cards', 'wallet', 'powers', 'cosmetics', 'market'].every(key => !(key in stored)), 'run assets never persist');
  await frame.locator('#play').click(); await advance(20);
  const retry = await snapshot();
  assert.equal(retry.state, 'playing'); assert.equal(retry.score, 0); assert.equal(retry.wallet, 0);
  assert.deepEqual(retry.cards, []); assert.deepEqual(retry.powers, []); assert.deepEqual(retry.cosmetics, []); assert.deepEqual(retry.equippedCosmetics, []);
  evidence.scenarios.push('200-point return, gamepad purchase, death clears every run asset, retry empty, lifetime progress persists');

  // A known seeded bonus is bought through the same built UI on a fresh run.
  await onGame(function () { this.end('Reset for bonus fixture', 'train'); }); await advance(1200);
  await frame.evaluate(() => { window.marketFixture.seed = 3; });
  await frame.locator('#play').click(); await advance(20);
  await stageScore(99); await onGame(function () { this.awardCoins(40); });
  await frame.locator('[data-direction="forward"]').click(); await advance(180); await key();
  const [bonusOffer] = await stageOffers(['pack-satchel']);
  await onGame(function () { this.run.state = 7; }); // Reproducible first random value below the 20% threshold.
  const bonus = await buy(bonusOffer);
  assert.equal(bonus.pending.picks, 2); assert.equal(bonus.pending.bonus, true); assert.equal(bonus.pending.choices.length, 5);
  assert.match(await frame.locator('#market-draft').innerText(), /bonus/i);
  await choose(bonus.pending.choices[1].id, 'gamepad');
  assert.equal(await frame.locator('#market-claim').isDisabled(), true, 'bonus requires two selections');
  await choose(bonus.pending.choices[4].id, 'gamepad');
  assert.equal(await frame.locator('#market-claim').isEnabled(), true);
  await choose(bonus.pending.choices[2].id);
  assert.equal((await pageItems('#market-choices [aria-pressed="true"]')).length, 2, 'bonus quota cannot be exceeded across pages');
  await frame.locator('#market-claim').focus(); await press(0);
  const bonusKept = await snapshot();
  assert.equal(bonusKept.pending, null);
  assert.deepEqual(bonusKept.cards.map(c => c.id), [bonus.pending.choices[1].id, bonus.pending.choices[4].id]);
  assert.equal(await frame.locator('#run-cards [data-hand-card]').count(), 2);
  evidence.scenarios.push('Seeded Large bonus deals five, requires two different choices, caps selection at two, and confirms through gamepad A');

  assert.equal(await frame.locator('#sound-toggle').getAttribute('aria-pressed'), 'true', 'Runtime checks never unmute sound');
  await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
  assert.equal(await frame.evaluate(() => Object.keys(window.marketFixture.handlers).length), 0, 'all SDK actions are released');
  assert.equal(await frame.evaluate(() => window.marketFixture.closed), 1, 'controller subscription closes');

  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  await writeFile(new URL('market-runtime.json', output), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { try { if (frame) await collectRealm(frame, identity); } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); } }
