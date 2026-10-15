import assert from 'node:assert/strict';
import { mkdir, stat, writeFile } from 'node:fs/promises';
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
  for (const file of ['src/main.ts', 'src/market-ui.ts', 'src/run-hand.ts', 'src/hand-layout.css']) {
    assert.ok((await stat(new URL(`../${file}`, import.meta.url))).mtimeMs <= artifact.mtimeMs, `${file} requires a new production build`);
  }
  await mkdir(output, { recursive: true });
  const evidence = {
    artifact: 'Actual production module, muted opaque allow-scripts iframe',
    fixture: 'Authorized shell pad snapshots enter four-seat play. CDP stages distinct real RunInventory contents; all inspection and owner selection uses production controls.',
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
        return { id: node.id, text: node.textContent.trim(), width: r.width, height: r.height,
          font: parseFloat(getComputedStyle(node).fontSize),
          fits: r.left >= -.5 && r.top >= -.5 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5,
          hit: node === hit || node.contains(hit), inert: !!node.closest('[inert]'),
          label: node.getAttribute('aria-label'), disabled: !!node.disabled };
      };
      const textData = node => {
        const range = document.createRange(); range.selectNodeContents(node);
        const fragments = [...range.getClientRects()].filter(r => r.width && r.height);
        return { ...rectData(node), readable: fragments.every(r =>
          [r.left + 1, r.left + r.width / 2, r.right - 1].every(x => {
            const hit = document.elementFromPoint(x, r.top + r.height / 2);
            return hit === node || node.contains(hit);
          })) };
      };
      // The card inspector is a foreground sheet. Its own controls and owner
      // must be reachable; covered market offers belong to the underlying page.
      const inspecting = state.startsWith('hand-');
      const controls = [...document.querySelectorAll(inspecting ? '#run-inventory button' : '#market button, #run-inventory button')].filter(visible).map(rectData);
      const identities = (inspecting ? ['run-hand-owner'] : ['market-owner', 'run-hand-owner']).map(id => document.getElementById(id)).filter(visible).map(textData);
      const scrollers = [...document.querySelectorAll('#market, #market *, #run-inventory, #run-inventory *')].filter(visible).filter(node => {
        const css = getComputedStyle(node);
        return /auto|scroll/.test(`${css.overflowX} ${css.overflowY}`) && (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1);
      }).map(node => node.id || node.className);
      return { controls, identities, scrollers, notice: visible(document.querySelector('.too-small')),
        market: visible(document.getElementById('market')), hand: visible(document.getElementById('run-inventory')),
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        selected: [...document.querySelectorAll('#market-owner-strip [aria-pressed="true"]')].map(node => node.dataset.id),
        handCards: [...document.querySelectorAll('[data-hand-card]')].filter(visible).map(node => ({ id: node.dataset.handCard, label: node.getAttribute('aria-label'), text: node.textContent })),
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
    const ownerControls = metrics.controls.filter(control => control.id === 'run-hand-owner' || /View P[1-4]/.test(control.label ?? ''));
    if (!ownerControls.length) fail(`${key}: no reachable owner controls`, metrics);
    for (const control of ownerControls) {
      if (control.width < 43.5 || control.height < 43.5) fail(`${key}: owner target must be at least 44px`, control);
    }
    if (!metrics.identities.length || metrics.identities.some(item => !item.readable || !item.fits || item.font < 16 || !/Viewing P[1-4] [▲●◆■] · \S/.test(item.text))) fail(`${key}: full owner identity must be legible`, metrics.identities);
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
    assert.equal(new Set(inventories.map(value => value.cards[0].id)).size, 1, 'fixture deliberately exercises colliding per-inventory card IDs');
    assert.equal(new Set(inventories.map(value => value.cards[0].name)).size, 4, 'all four inventories have different actual card contents');
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
          assert.match(await frame.locator('#market-owner').innerText(), new RegExp(`Viewing ${inventory.seat.toUpperCase()} `));
          const card = frame.locator(`[data-hand-card="${inventory.cards[0].id}"]`);
          await card.click(); await settle();
          assert.equal(await frame.locator('#run-hand-name').innerText(), inventory.cards[0].name, 'displayed card belongs to the selected owner, even when IDs collide');
          assert.equal(await frame.locator('#run-hand-sell').isDisabled(), true, 'unimplemented shared sale is explicitly unavailable');
          await snapshot(`hand-${inventory.seat}`, width, height, theme);
          await frame.locator('#run-hand-close').click(); await settle();
        }
        assert.equal(await marketNode.evaluate(node => node === document.querySelector('#market')), true, 'one existing market tree');
        assert.equal(await handNode.evaluate(node => node === document.querySelector('#run-inventory')), true, 'one existing hand tree');
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await resize(900, 600); await settle();
    await snapshot('reduced-motion', 900, 600, 'light');
    assert.deepEqual(await onSession(function () { return this.players.map(player => ({ seat: player.seat, character: player.characterId, cards: player.run.cards, wallet: player.run.wallet })); }), inventories, 'read-only inspection does not mutate any inventory');
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
