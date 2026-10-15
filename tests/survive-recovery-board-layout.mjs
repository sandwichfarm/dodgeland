import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const sizes = [[240, 240], [320, 560], [900, 600], [1000, 280], [2400, 1200]];
const themes = {
  dark: { colors: { background: '#18232a', text: '#f4f2df', primary: '#a6c97d' } },
  light: { colors: { background: '#f4f2df', text: '#263c38', primary: '#477953' } },
};

test('four-player recovery boards fit every supported frame without scrolling or obscured focus', { timeout: 120000 }, async () => {
  const evidence = { errors: [], external: [], frames: [] }, app = await createMarketGameFixture(evidence);
  const { frame, page, iframe, onSession, resize, advance } = app;
  const output = new URL('../artifacts/', import.meta.url);
  try {
    await mkdir(output, { recursive: true }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await frame.locator('#play').click(); await frame.locator('#pause').click();
    await frame.locator('#local-play').click(); await frame.getByRole('button', { name: /start together/i }).click();
    // Layout fixtures use the real session admission/transaction/terminal APIs.
    // Visible join and four-controller ownership are covered by runtime suites.
    assert.equal(await onSession(function () {
      for (const lane of this.world.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined });
      if (!this.admit({ seat: 'p3', device: 'gamepad-2', characterId: 'pip' }) || !this.admit({ seat: 'p4', device: 'gamepad-3', characterId: 'petal' })) return false;
      const owner = this.players.find(player => player.seat === 'p1'); owner.run.advanceScore(100); owner.run.creditCoins(60); owner.run.open();
      for (const itemId of ['revival', 'flare']) {
        const context = this.openCoOpMarket({ seat: owner.seat, device: owner.device, participantId: owner.participantId });
        if (!this.actCoOpMarket({ actionId: `board-layout-${itemId}`, seat: owner.seat, device: owner.device, participantId: owner.participantId,
          expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration,
          expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration, kind: 'buy-consumable', itemId }).ok) return false;
      }
      owner.run.close();
      for (const player of this.players.filter(player => player.seat !== 'p1')) this.world.host.inPlayerOperation(player, context => context.end('Board layout train', 'train'));
      this.update(1 / 120); return this.players.slice(1).every(player => player.participation === 'dead');
    }), true);
    await advance(50);

    async function capture(state, theme, width, height, pageIndex = 0) {
      await resize(width, height);
      const board = frame.locator('#survive-recovery-board');
      const metrics = await board.evaluate(root => {
        const visible = node => node.getClientRects().length && !node.closest('[hidden]') && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden';
        const elements = [document.documentElement, document.body, root, ...root.querySelectorAll('*')].filter(visible);
        const overflow = elements.filter(node => node.clientWidth && node.clientHeight && getComputedStyle(node).display !== 'inline').filter(node => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1).map(node => ({ tag: node.tagName, class: node.className, text: node.textContent.slice(0, 70), width: node.clientWidth, scrollWidth: node.scrollWidth, height: node.clientHeight, scrollHeight: node.scrollHeight }));
        const controls = [...root.querySelectorAll('button')].filter(visible).map(node => {
          const rect = node.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return { text: node.textContent, valid: rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight && (hit === node || node.contains(hit)) };
        });
        const focused = document.activeElement, rect = focused?.getBoundingClientRect();
        return { overflow, controls, focused: focused?.textContent, focusVisible: root.contains(focused) && visible(focused) && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight };
      });
      evidence.frames.push({ state, theme, width, height, pageIndex, metrics });
      await iframe.screenshot({ path: new URL(`survive-recovery-${state}-${theme}-${width}x${height}-${pageIndex}.png`, output).pathname });
      assert.deepEqual(metrics.overflow, [], `${state}/${theme}/${width}×${height}: no board or content scrollbars`);
      assert.ok(metrics.controls.length > 0 && metrics.controls.every(control => control.valid), `${state}/${theme}/${width}×${height}: all visible44px actions fit and receive pointer input: ${JSON.stringify(metrics.controls)}`);
      assert.equal(metrics.focusVisible, true, `${state}/${theme}/${width}×${height}: focus remains visible inside the retained board`);
      const controls = board.locator('button:visible:not([disabled])');
      await controls.first().focus(); await page.keyboard.press('Shift+Tab');
      assert.equal(await controls.last().evaluate(node => document.activeElement === node), true, 'reverse Tab wraps to the last visible action, excluding controls on other pages');
      await page.keyboard.press('Tab');
      assert.equal(await controls.first().evaluate(node => document.activeElement === node), true, 'Tab wraps within the current bounded page');
    }

    async function checkPages(state, theme, width, height) {
      const board = frame.locator('#survive-recovery-board'), seen = new Set();
      const expected = state === 'items' ? ['Use Revival ×1', 'Use Flare ×1', 'Leave P1 run']
        : state === 'revival' ? ['p2', 'p3', 'p4'] : ['Sunny', 'Pip', 'Petal'];
      for (let pageIndex = 0; pageIndex < 8; pageIndex++) {
        await capture(state, theme, width, height, pageIndex);
        if (state === 'revival') {
          for (const target of await board.locator('[data-target]').all()) if (await target.isVisible()) {
            const seat = await target.getAttribute('data-target'); await target.click();
            assert.equal(await board.getAttribute('data-recovery-target'), seat, 'every displayed target can actually be selected');
            seen.add(seat);
          }
        } else {
          const text = await board.innerText(); for (const value of expected) if (text.includes(value)) seen.add(value);
        }
        if (expected.every(value => seen.has(value))) break;
        const next = await board.getByRole('button', { name: /next/i }).all();
        let advanced = false;
        for (const control of next) if (await control.isVisible() && await control.isEnabled()) { await control.click(); advanced = true; break; }
        if (!advanced) {
          const people = board.getByRole('button', { name: 'People', exact: true });
          if (await people.isVisible()) { await people.click(); advanced = true; }
        }
        if (!advanced) break;
      }
      assert.deepEqual([...seen].sort(), [...expected].sort(), `${state}/${theme}/${width}×${height}: pagination must keep every action or affected teammate reachable`);
      const actions = board.getByRole('button', { name: 'Actions', exact: true });
      if (await actions.isVisible()) await actions.click();
    }

    for (const [theme, value] of Object.entries(themes)) {
      await frame.evaluate(value => window.marketGameFixture.setTheme(value), value);
      await resize(900, 600);
      await frame.locator('#session-seats [data-seat="p1"] [data-session-hud="item"]').click();
      for (const [width, height] of sizes) await checkPages('items', theme, width, height);
      await resize(900, 600);
      await frame.getByRole('button', { name: 'Back to paused run', exact: true }).click();
      for (const item of ['Flare', 'Revival']) {
        await resize(900, 600);
        await frame.locator('#session-seats [data-seat="p1"] [data-session-hud="item"]').click();
        await frame.getByRole('button', { name: `Use ${item} ×1`, exact: true }).click();
        for (const [width, height] of sizes) await checkPages(item.toLowerCase(), theme, width, height);
        await resize(900, 600);
        {
          await onSession(function () { for (const lane of this.world.rows.values()) lane.blocked = Array.from({ length: 11 }, (_, index) => index - 5); });
          const before = await onSession(function () { return { charges: this.consumableSnapshot().charges, positions: this.players.map(player => [player.x, player.y, player.participation]) }; });
          const target = await frame.locator('#survive-recovery-board').getAttribute('data-recovery-target');
          const message = item === 'Flare' ? 'The flock can’t regroup safely yet. Flare kept.' : `${target.toUpperCase()} can’t return safely yet. Revival kept.`;
          await frame.getByRole('button', { name: `Use ${item}`, exact: true }).click();
          for (const [width, height] of sizes) {
            if (item === 'Flare') await checkPages('kept-flare', theme, width, height);
            else await capture('kept-revival', theme, width, height);
            assert.equal(await frame.getByText(message, { exact: true }).isVisible(), true, 'the retained-charge outcome remains visible after resize and paging');
          }
          assert.deepEqual(await onSession(function () { return { charges: this.consumableSnapshot().charges, positions: this.players.map(player => [player.x, player.y, player.participation]) }; }), before);
          await onSession(function () { for (const lane of this.world.rows.values()) lane.blocked = []; });
          await resize(900, 600);
        }
        await frame.getByRole('button', { name: 'Back to paused run', exact: true }).click();
      }
    }
    // Once everyone uses their real personal offer, both item selectors must
    // show the no-target outcome without spending the owner's charges.
    assert.equal(await onSession(function () {
      return ['p2', 'p3', 'p4'].every(ownerSeat => this.recover({ kind: 'personal', ownerSeat }));
    }), true);
    await advance(50);
    for (const item of ['Flare', 'Revival']) {
      await resize(900, 600);
      await frame.locator('#session-seats [data-seat="p1"] [data-session-hud="item"]').click();
      await frame.getByRole('button', { name: `Use ${item} ×1`, exact: true }).click();
      for (const [width, height] of sizes) await capture(`no-target-${item.toLowerCase()}`, 'light', width, height);
      await resize(900, 600);
      await frame.getByRole('button', { name: 'Back to paused run', exact: true }).click();
    }
    // An empty owner's item shelf must focus its first usable action, rather
    // than the disabled Revival button, and remain usable at the minimum size.
    await frame.locator('#session-seats [data-seat="p2"] [data-session-hud="item"]').click();
    for (const [width, height] of sizes) await capture('empty-items', 'light', width, height);
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally {
    await writeFile(new URL('survive-recovery-board-layout.json', output), JSON.stringify(evidence, null, 2));
    await app.close();
  }
});
