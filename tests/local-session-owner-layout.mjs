import assert from 'node:assert/strict';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url);
// Capture normal, portrait and short-wide evidence before the smallest frame:
// one compact interaction failure should not erase useful larger-frame proof.
const sizes = [[900, 600], [320, 560], [1000, 280], [2400, 1200], [200, 160], [240, 240]];
const themes = {
  dark: { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } },
  light: { colors: { background: '#f5f0df', text: '#243b32', primary: '#477953' } },
};
const pad = (index, pressed = []) => ({
  index, id: `Owner layout ${index}`, mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })),
});

test('four real inventories remain inspectable through one responsive owner surface', { timeout: 180_000 }, async () => {
  const artifact = await stat(new URL('../dist/index.html', import.meta.url));
  const digest = async file => createHash('sha256').update(await readFile(new URL(`../${file}`, import.meta.url))).digest('hex');
  const sourceDigests = {};
  for (const file of ['src/main.ts', 'src/market-ui.ts', 'src/run-hand.ts', 'src/hand-layout.css']) {
    assert.ok((await stat(new URL(`../${file}`, import.meta.url))).mtimeMs <= artifact.mtimeMs, `${file} requires a new production build`);
    sourceDigests[file] = await digest(file);
  }
  await mkdir(output, { recursive: true });
  const evidence = {
    artifact: 'Actual production module, muted opaque allow-scripts iframe',
    fixture: 'Authorized shell pad snapshots enter four-seat play. CDP stages distinct real RunInventory contents; all inspection and owner selection uses production controls.',
    artifactSha256: await digest('dist/index.html'), sourceDigests,
    frames: [], deficiencies: [], errors: [], external: [],
  };
  const app = await createMarketGameFixture(evidence, { gamepads: true });
  const { page, frame, iframe, advance, onGame, onSession, resize, sendPads } = app;
  const settle = async () => {
    await advance(240);
    await frame.evaluate(() => document.getAnimations().forEach(animation => {
      if (Number.isFinite(animation.effect?.getComputedTiming().iterations)) animation.finish();
    }));
  };
  const fail = (message, data) => evidence.deficiencies.push({ message, data });
  const snapshot = async (state, width, height, theme) => {
    const metrics = await frame.evaluate(state => {
      const visible = node => {
        if (!node || node.closest('[hidden]')) return false;
        const css = getComputedStyle(node), rect = node.getBoundingClientRect();
        return css.display !== 'none' && css.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const rectData = node => {
        const r = node.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { id: node.id, text: node.textContent.trim(), left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
          font: parseFloat(getComputedStyle(node).fontSize),
          fits: r.left >= -.5 && r.top >= -.5 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5,
          hit: node === hit || node.contains(hit), hitNode: hit instanceof HTMLElement ? `${hit.id}.${hit.className}` : hit?.nodeName, inert: !!node.closest('[inert]'),
          label: node.getAttribute('aria-label'), disabled: !!node.disabled };
      };
      const textData = node => {
        const range = document.createRange(); range.selectNodeContents(node);
        const fragments = [...range.getClientRects()].filter(r => r.width && r.height);
        const contained = rect => {
          if (rect.left < -.5 || rect.top < -.5 || rect.right > innerWidth + .5 || rect.bottom > innerHeight + .5) return false;
          for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const css = getComputedStyle(parent);
            if (!/hidden|clip|auto|scroll/.test(`${css.overflowX} ${css.overflowY}`)) continue;
            const bounds = parent.getBoundingClientRect();
            if (rect.left < bounds.left - .5 || rect.top < bounds.top - .5 || rect.right > bounds.right + .5 || rect.bottom > bounds.bottom + .5) return false;
          }
          return true;
        };
        return { ...rectData(node), readable: fragments.every(r =>
          [r.left + 1, r.left + r.width / 2, r.right - 1].every(x => {
            const hit = document.elementFromPoint(x, r.top + r.height / 2);
            return hit === node || node.contains(hit);
          })), contained: fragments.length > 0 && fragments.every(contained) };
      };
      // The card inspector is a foreground sheet. Its own controls and owner
      // must be reachable; covered market offers belong to the underlying page.
      const inspecting = state.startsWith('hand-');
      const controls = [...document.querySelectorAll(inspecting ? '#run-inventory button' : '#market button, #run-inventory button')].filter(visible).map(rectData);
      const identities = (inspecting ? ['run-hand-owner', 'run-hand-detail-owner'] : ['market-owner', 'run-hand-owner']).map(id => document.getElementById(id)).filter(visible).map(textData);
      const details = inspecting ? ['run-hand-name', 'run-hand-copy'].map(id => document.getElementById(id)).filter(visible).map(textData) : [];
      const offers = inspecting ? [] : [...document.querySelectorAll('#market .market-item :is(.card-name, .market-cosmetic-name, .market-tile-price)')].filter(visible).map(textData);
      const items = [...document.querySelectorAll('#run-hand-items, #run-hand-items :is(button, span)')].filter(visible).map(textData);
      const itemControls = [...document.querySelectorAll('#run-hand-items button')].filter(visible).map(node => node.getAttribute('aria-label') ?? node.textContent.trim());
      const scrollers = [...document.querySelectorAll('#market, #market *, #run-inventory, #run-inventory *')].filter(visible).filter(node => {
        const css = getComputedStyle(node);
        return /auto|scroll/.test(`${css.overflowX} ${css.overflowY}`) && (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1);
      }).map(node => node.id || node.className);
      return { controls, identities, details, scrollers, notice: visible(document.querySelector('.too-small')),
        market: visible(document.getElementById('market')), hand: visible(document.getElementById('run-inventory')),
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        selected: [...document.querySelectorAll('#market-owner-strip [aria-pressed="true"]')].map(node => node.dataset.id),
        handCards: [...document.querySelectorAll('[data-hand-card]')].filter(visible).map(node => ({ id: node.dataset.handCard, label: node.getAttribute('aria-label'), text: node.textContent })), offers, items, itemControls,
      };
    }, state);
    const key = `${state}-${width}x${height}-${theme}`;
    await iframe.screenshot({ path: new URL(`local-session-owner-${key}.png`, output).pathname });
    evidence.frames.push({ state, width, height, theme, ...metrics });
    if (width < 240) {
      if (!metrics.notice || metrics.controls.length || metrics.hand || metrics.market) fail(`${key}: only minimum-size notice may remain`, metrics);
      return;
    }
    if (metrics.notice || metrics.document.width > width || metrics.document.height > height || metrics.scrollers.length) fail(`${key}: surface must fit without scrolling`, metrics);
    if (!metrics.market || !metrics.hand) fail(`${key}: open market and persistent hand must remain available`, metrics);
    for (const control of metrics.controls) {
      if (!control.fits || !control.hit || control.inert) fail(`${key}: control is clipped, covered or inert`, control);
    }
    const ownerControls = metrics.controls.filter(control => ['run-hand-owner', 'run-hand-detail-owner'].includes(control.id) || /View P[1-4]/.test(control.label ?? ''));
    if (!ownerControls.length) fail(`${key}: no reachable owner controls`, metrics);
    for (const control of ownerControls) {
      if (control.width < 43.5 || control.height < 43.5) fail(`${key}: owner target must be at least 44px`, control);
    }
    if (!metrics.identities.length || metrics.identities.some(item => !item.readable || !item.fits || item.font < 16 || !/Viewing P[1-4] [▲●◆■] · \S/.test(item.text))) fail(`${key}: full owner identity must be legible`, metrics.identities);
    if (state.startsWith('hand-') && (metrics.details.length !== 2 || metrics.details.some(item => !item.readable || !item.fits || item.font < 16))) fail(`${key}: card title and current description page must remain readable`, metrics.details);
    if (!state.startsWith('hand-') && (metrics.offers.length === 0 || metrics.offers.some(item => !item.readable || !item.contained || item.font < 14))) fail(`${key}: each visible offer name and price must remain readable within its clipped ancestors`, metrics.offers);
    if (!state.startsWith('hand-') && (metrics.items.length === 0 || metrics.items.some(item => !item.readable || !item.contained || !item.fits || item.font < 16))) fail(`${key}: the distinct Items row must remain readable and in bounds`, metrics.items);
    if (!state.startsWith('hand-') && metrics.selected[0] === 'p1' && (!metrics.itemControls.includes('Use Revival ×1') || !metrics.itemControls.includes('Use Flare ×1'))) fail(`${key}: P1’s charged Revival and Flare controls must both remain visible`, metrics.itemControls);
    if (!state.startsWith('hand-') && metrics.selected[0] !== 'p1' && metrics.itemControls.length) fail(`${key}: uncharged owners must not inherit P1 item controls`, metrics.itemControls);
    if (metrics.selected.length !== 1) fail(`${key}: exactly one market owner must be selected`, metrics.selected);
  };
  try {
    await sendPads([pad(0), pad(1)]);
    await sendPads([pad(0, [0]), pad(1)]);
    await sendPads([pad(0), pad(1)]);
    await sendPads([pad(0), pad(1, [0])]);
    await frame.locator('#session-add-keyboard').click();
    await frame.locator('#session-add-keyboard').click();
    await frame.locator('#local-session-start').click();
    await settle();
    await onGame(function () {
      this.mobs.splice(0);
      for (const lane of this.rows.values()) {
        Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
        delete lane.actors; delete lane.coinActor;
      }
    });
    const inventories = await onSession(function () {
      const ids = ['magnet', 'traffic-speed', 'platform-length', 'side-resist'];
      return this.players.map((player, index) => {
        const run = player.run;
        run.advanceScore(100); run.creditCoins(1000); run.open();
        const stock = run.market.offers;
        const item = run.catalog.get(ids[index]);
        run.market.offers = [{ id: 'owner-layout-purchase', itemId: item.id, price: item.price, sold: false, section: 'cards' }];
        const result = run.buy('owner-layout-purchase');
        if (!result.ok) throw new Error(result.message);
        run.market.offers = stock; run.market.remaining = 10000; run.close(); run.changed();
        return { seat: player.seat, character: player.characterId, cards: run.cards, wallet: run.wallet };
      });
    });
    const charged = await onSession(function () {
      const player = this.players.find(value => value.seat === 'p1');
      player.run.advanceScore(100); player.run.creditCoins(60);
      let context = this.openCoOpMarket({ seat: player.seat, device: player.device, participantId: player.participantId });
      if (!context) throw new Error('P1 needs a co-op market context for the physical Items-row fixture');
      const act = (kind, itemId) => this.actCoOpMarket({ actionId: `owner-layout-${kind}-${itemId ?? 'window'}`, seat: player.seat, device: player.device, participantId: player.participantId,
        expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration, expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration, kind, itemId });
      let result = act('open'); if (!result.ok) throw new Error(result.message); context = result.context;
      result = act('buy-consumable', 'revival'); if (!result.ok) throw new Error(result.message); context = result.context;
      result = act('buy-consumable', 'flare'); if (!result.ok) throw new Error(result.message); context = result.context;
      result = act('close'); if (!result.ok) throw new Error(result.message);
      return this.consumableSnapshot().charges.map(value => ({ seat: value.seat, revival: value.revival, flare: value.flare }));
    });
    assert.deepEqual(charged, [{ seat: 'p1', revival: 1, flare: 1 }, { seat: 'p2', revival: 0, flare: 0 }, { seat: 'p3', revival: 0, flare: 0 }, { seat: 'p4', revival: 0, flare: 0 }], 'the layout fixture credits both P1 consumables through the authoritative co-op adapter only');
    assert.equal(new Set(inventories.map(value => value.cards[0].id)).size, 1, 'fixture deliberately exercises colliding per-inventory card IDs');
    assert.equal(new Set(inventories.map(value => value.cards[0].name)).size, 4, 'all four inventories have different actual card contents');
    await resize(720, 600); await settle();
    assert.equal(await frame.locator('#session-seats [data-seat="p1"] [data-session-hud="power"]').evaluate(node => {
      const range = document.createRange(); range.selectNodeContents(node);
      return [...range.getClientRects()].every(rect => [rect.left + 1, rect.left + rect.width / 2, rect.right - 1]
        .every(x => node.contains(document.elementFromPoint(x, rect.top + rect.height / 2))));
    }), true, 'the 720px shared shelf keeps wrapped owner power text readable beside the reserved Market lane');
    await settle();
    await frame.locator('#market-open').click(); await settle();
    assert.equal(await frame.locator('#market').isVisible(), true, 'shared market must actually open');
    const marketNode = await frame.locator('#market').elementHandle();
    const handNode = await frame.locator('#run-inventory').elementHandle();
    for (const theme of Object.keys(themes)) {
      await frame.evaluate(value => window.marketGameFixture.setTheme(value), themes[theme]);
      for (const [width, height] of sizes) {
        await resize(width, height); await settle();
        if (width >= 240 && !await frame.locator('#market').isVisible()) { await app.open(); await settle(); }
        await snapshot('market', width, height, theme);
        if (width < 240) continue;
        for (const inventory of inventories) {
          const control = frame.locator(`#market-owner-strip [data-id="${inventory.seat}"]`);
          await control.click(); await settle();
          assert.equal(await frame.locator('#market').isVisible(), true, 'switching owner keeps the market open');
          assert.equal(await frame.locator('#run-panel').isVisible(), false, 'another owner’s market must not expose the underlying solo pause panel');
          assert.match(await frame.locator('#market-owner').innerText(), new RegExp(`Viewing ${inventory.seat.toUpperCase()} `));
          const card = frame.locator(`[data-hand-card="${inventory.cards[0].id}"]`);
          await card.click(); await settle();
          assert.equal(await frame.locator('#run-hand-name').innerText(), inventory.cards[0].name, 'displayed card belongs to the selected owner, even when IDs collide');
          assert.equal(await frame.locator('#run-hand-sell').isEnabled(), true, 'the labelled active owner can sell through the validated context');
          await snapshot(`hand-${inventory.seat}`, width, height, theme);
          const descriptionPages = [];
          for (let index = 0; index < 30; index++) {
            descriptionPages.push(await frame.locator('#run-hand-copy').innerText());
            const next = frame.locator('#run-hand-detail-next');
            if (!await next.isVisible() || !await next.isEnabled()) break;
            await next.click(); await settle();
          }
          const normalize = text => text.replace(/\s+/g, ' ').trim();
          assert.equal(normalize(descriptionPages.join(' ')), normalize(inventory.cards[0].description), 'every word of the real card description remains reachable through its visible pager');
          if (inventory.seat === 'p4') {
            await frame.locator('#run-hand-detail-owner').click(); await settle();
            assert.match(await frame.locator('#market-owner').innerText(), /Viewing P1 /, 'foreground owner control actually selects the next real inventory');
            assert.equal(await frame.locator('#run-hand-detail').isVisible(), false, 'owner switch clears the previous card inspector');
          } else {
            await frame.locator('#run-hand-close').click(); await settle();
          }
          assert.equal(await frame.locator('#run-panel').isVisible(), false, 'closing an inspected card returns to the selected owner’s market');
        }
        assert.equal(await marketNode.evaluate(node => node === document.querySelector('#market')), true, 'one existing market tree');
        assert.equal(await handNode.evaluate(node => node === document.querySelector('#run-inventory')), true, 'one existing hand tree');
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await resize(900, 600); await settle();
    await snapshot('reduced-motion', 900, 600, 'light');
    assert.deepEqual(await onSession(function () { return this.players.map(player => ({ seat: player.seat, character: player.characterId, cards: player.run.cards, wallet: player.run.wallet })); }), inventories, 'read-only inspection does not mutate any inventory');
    for (const [file, hash] of Object.entries(sourceDigests)) assert.equal(await digest(file), hash, `${file} changed during visual verification`);
    assert.equal(await digest('dist/index.html'), evidence.artifactSha256, 'production artifact changed during visual verification');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
    assert.deepEqual(evidence.deficiencies, [], 'every required frame must remain readable and interactive');
  } catch (error) {
    evidence.failure = String(error);
    await iframe.screenshot({ path: new URL('local-session-owner-failure.png', output).pathname }).catch(() => {});
    throw error;
  } finally {
    await writeFile(new URL('local-session-owner-layout.json', output), JSON.stringify(evidence, null, 2));
    await app.close();
  }
});
