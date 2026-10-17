import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture, sessionHudAction } from './market-game-fixture.mjs';

const sizes = [[240, 240], [320, 560], [900, 600], [1000, 280], [2400, 1200]];
const themes = {
  dark: { colors: { background: '#18232a', text: '#f4f2df', primary: '#a6c97d' } },
  light: { colors: { background: '#f4f2df', text: '#263c38', primary: '#477953' } },
};

test('four-player recovery boards fit every supported frame without scrolling or obscured focus', async t => {
  const evidence = { errors: [], external: [], frames: [], stages: [], complete: false };
  let app, frame, page, iframe, onSession, resize, advance, activeSignal, originalFailure;
  const closes = new WeakMap(), output = new URL('../artifacts/', import.meta.url);
  const check = () => { t.signal.throwIfAborted(); activeSignal?.throwIfAborted(); };
  const operation = async action => { check(); const value = await action(); check(); return value; };
  function closeOnce(fixture) { if (!fixture) return Promise.resolve(); if (!closes.has(fixture)) closes.set(fixture, fixture.close()); return closes.get(fixture); }
  async function stage(name, action) {
    check(); let body, cleanup, passed = false, aborted = false;
    await t.test(name, { timeout: 120000 }, async child => {
      activeSignal = child.signal;
      const abort = () => { aborted = true; cleanup = closeOnce(app).catch(error => { evidence.cleanupFailure = String(error); }); };
      child.signal.addEventListener('abort', abort, { once: true });
      body = (async () => { try { check(); await action(); check(); evidence.stages.push(name); passed = true; } finally { child.signal.removeEventListener('abort', abort); } })();
      await body;
    });
    await body?.catch(error => { originalFailure ??= error; }); await cleanup;
    activeSignal = undefined; check(); assert.equal(aborted, false, name + ' aborted'); assert.equal(passed, true, name + ' did not finish');
  }
  try {
    await stage('setup', async () => {
      const opening = await createMarketGameFixture(evidence); app = opening;
      try { check(); } catch (error) { await closeOnce(opening); throw error; }
      ({ frame, page, iframe, onSession, resize, advance } = app);
    await operation(() => mkdir(output, { recursive: true })); await operation(() => page.emulateMedia({ reducedMotion: 'reduce' }));
    await operation(() => frame.locator('#play').click()); await operation(() => frame.locator('#pause').click());
    await operation(() => frame.locator('#local-play').click()); await operation(() => frame.getByRole('button', { name: /start together/i }).click());
    // Layout fixtures use the real session admission/transaction/terminal APIs.
    // Visible join and four-controller ownership are covered by runtime suites.
    assert.equal(await operation(() => onSession(function () {
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
    })), true);
    await operation(() => advance(50));

    });

    async function capture(state, theme, width, height, pageIndex = 0) {
      await operation(() => resize(width, height));
      const board = frame.locator('#survive-recovery-board');
      const metrics = await operation(() => board.evaluate(root => {
        const visible = node => node.getClientRects().length && !node.closest('[hidden]') && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden';
        const elements = [document.documentElement, document.body, root, ...root.querySelectorAll('*')].filter(visible);
        const overflow = elements.filter(node => node.clientWidth && node.clientHeight && getComputedStyle(node).display !== 'inline').filter(node => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1).map(node => ({ tag: node.tagName, class: node.className, text: node.textContent.slice(0, 70), width: node.clientWidth, scrollWidth: node.scrollWidth, height: node.clientHeight, scrollHeight: node.scrollHeight }));
        const controls = [...root.querySelectorAll('button')].filter(visible).map(node => {
          const rect = node.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return { text: node.textContent, valid: rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight && (hit === node || node.contains(hit)) };
        });
        const focused = document.activeElement, rect = focused?.getBoundingClientRect();
        return { overflow, controls, focused: focused?.textContent, focusVisible: root.contains(focused) && visible(focused) && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight };
      }));
      check(); evidence.frames.push({ state, theme, width, height, pageIndex, metrics });
      const image = await operation(() => iframe.screenshot());
      await operation(() => writeFile(new URL(`survive-recovery-${state}-${theme}-${width}x${height}-${pageIndex}.png`, output), image));
      assert.deepEqual(metrics.overflow, [], `${state}/${theme}/${width}×${height}: no board or content scrollbars`);
      assert.ok(metrics.controls.length > 0 && metrics.controls.every(control => control.valid), `${state}/${theme}/${width}×${height}: all visible44px actions fit and receive pointer input: ${JSON.stringify(metrics.controls)}`);
      assert.equal(metrics.focusVisible, true, `${state}/${theme}/${width}×${height}: focus remains visible inside the retained board`);
      const controls = board.locator('button:visible:not([disabled])');
      await operation(() => controls.first().focus()); await operation(() => page.keyboard.press('Shift+Tab'));
      assert.equal(await operation(() => controls.last().evaluate(node => document.activeElement === node)), true, 'reverse Tab wraps to the last visible action, excluding controls on other pages');
      await operation(() => page.keyboard.press('Tab'));
      assert.equal(await operation(() => controls.first().evaluate(node => document.activeElement === node)), true, 'Tab wraps within the current bounded page');
    }

    async function checkPages(state, theme, width, height) {
      const board = frame.locator('#survive-recovery-board'), seen = new Set();
      const expected = state === 'items' ? ['Use Revival ×1', 'Use Flare ×1', 'Leave P1 run']
        : state === 'revival' ? ['p2', 'p3', 'p4'] : ['Sunny', 'Pip', 'Petal'];
      for (let pageIndex = 0; pageIndex < 8; pageIndex++) {
        await operation(() => capture(state, theme, width, height, pageIndex));
        if (state === 'revival') {
          for (const target of await operation(() => board.locator('[data-target]').all())) if (await operation(() => target.isVisible())) {
            const seat = await operation(() => target.getAttribute('data-target')); await operation(() => target.click());
            assert.equal(await operation(() => board.getAttribute('data-recovery-target')), seat, 'every displayed target can actually be selected');
            seen.add(seat);
          }
        } else {
          const text = await operation(() => board.innerText()); for (const value of expected) if (text.includes(value)) seen.add(value);
        }
        if (expected.every(value => seen.has(value))) break;
        const next = await operation(() => board.getByRole('button', { name: /next/i }).all());
        let advanced = false;
        for (const control of next) if (await operation(() => control.isVisible()) && await operation(() => control.isEnabled())) { await operation(() => control.click()); advanced = true; break; }
        if (!advanced) {
          const people = board.getByRole('button', { name: 'People', exact: true });
          if (await operation(() => people.isVisible())) { await operation(() => people.click()); advanced = true; }
        }
        if (!advanced) break;
      }
      assert.deepEqual([...seen].sort(), [...expected].sort(), `${state}/${theme}/${width}×${height}: pagination must keep every action or affected teammate reachable`);
      const actions = board.getByRole('button', { name: 'Actions', exact: true });
      if (await operation(() => actions.isVisible())) await operation(() => actions.click());
    }

    for (const [theme, value] of Object.entries(themes)) {
      await stage(theme + ' matrix', async () => {
      await operation(() => frame.evaluate(value => window.marketGameFixture.setTheme(value), value));
      await operation(() => resize(900, 600));
      await operation(() => sessionHudAction(app, 'p1', 'item'));
      for (const [width, height] of sizes) await operation(() => checkPages('items', theme, width, height));
      await operation(() => resize(900, 600));
      await operation(() => frame.getByRole('button', { name: 'Back to paused run', exact: true }).click());
      for (const item of ['Flare', 'Revival']) {
        await operation(() => resize(900, 600));
        await operation(() => sessionHudAction(app, 'p1', 'item'));
        await operation(() => frame.getByRole('button', { name: `Use ${item} ×1`, exact: true }).click());
        for (const [width, height] of sizes) await operation(() => checkPages(item.toLowerCase(), theme, width, height));
        const retainedTarget = await operation(() => frame.locator('#survive-recovery-board').getAttribute('data-recovery-target'));
        await operation(() => resize(200, 160));
        assert.equal(await operation(() => frame.locator('.too-small').isVisible()), true);
        assert.equal(await operation(() => frame.locator('#survive-recovery-board button:visible').count()), 0, 'unsupported frames expose only the size notice');
        await operation(() => capture(`restored-${item.toLowerCase()}`, theme, 240, 240));
        assert.equal(await operation(() => frame.locator('#survive-recovery-board').getAttribute('data-recovery-target')), retainedTarget, 'tiny-frame suspension retains the selected target');
        await operation(() => resize(900, 600));
        {
          await operation(() => onSession(function () { for (const lane of this.world.rows.values()) lane.blocked = Array.from({ length: 11 }, (_, index) => index - 5); }));
          const before = await operation(() => onSession(function () { return { charges: this.consumableSnapshot().charges, positions: this.players.map(player => [player.x, player.y, player.participation]) }; }));
          const target = await operation(() => frame.locator('#survive-recovery-board').getAttribute('data-recovery-target'));
          const message = item === 'Flare' ? 'The flock can’t regroup safely yet. Flare kept.' : `${target.toUpperCase()} can’t return safely yet. Revival kept.`;
          await operation(() => frame.getByRole('button', { name: `Use ${item}`, exact: true }).click());
          for (const [width, height] of sizes) {
            if (item === 'Flare') await operation(() => checkPages('kept-flare', theme, width, height));
            else await operation(() => capture('kept-revival', theme, width, height));
            assert.equal(await operation(() => frame.getByText(message, { exact: true }).isVisible()), true, 'the retained-charge outcome remains visible after resize and paging');
          }
          assert.deepEqual(await operation(() => onSession(function () { return { charges: this.consumableSnapshot().charges, positions: this.players.map(player => [player.x, player.y, player.participation]) }; })), before);
          await operation(() => onSession(function () { for (const lane of this.world.rows.values()) lane.blocked = []; }));
          await operation(() => resize(900, 600));
        }
        await operation(() => frame.getByRole('button', { name: 'Back to paused run', exact: true }).click());
      }
      });
    }
    await stage('no-target and empty', async () => {
    // Once everyone uses their real personal offer, both item selectors must
    // show the no-target outcome without spending the owner's charges.
    assert.equal(await operation(() => onSession(function () {
      return ['p2', 'p3', 'p4'].every(ownerSeat => this.recover({ kind: 'personal', ownerSeat }));
    })), true);
    await operation(() => advance(50));
    for (const item of ['Flare', 'Revival']) {
      await operation(() => resize(900, 600));
      await operation(() => sessionHudAction(app, 'p1', 'item'));
      await operation(() => frame.getByRole('button', { name: `Use ${item} ×1`, exact: true }).click());
      for (const [width, height] of sizes) await operation(() => capture(`no-target-${item.toLowerCase()}`, 'light', width, height));
      await operation(() => resize(900, 600));
      await operation(() => frame.getByRole('button', { name: 'Back to paused run', exact: true }).click());
    }
    // An empty owner's item shelf must focus its first usable action, rather
    // than the disabled Revival button, and remain usable at the minimum size.
    await operation(() => sessionHudAction(app, 'p2', 'item'));
    for (const [width, height] of sizes) await operation(() => capture('empty-items', 'light', width, height));
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
    });
    await stage('cleanup', async () => { await closeOnce(app); });
    const expectedCells = [];
    const pageCounts = { items:[1,1,1,1,1], flare:[5,5,1,5,1], 'kept-flare':[4,5,1,5,1], revival:[3,3,1,3,1], 'kept-revival':[1,1,1,1,1] };
    for (const theme of Object.keys(themes)) {
      for (const [state,counts] of Object.entries(pageCounts)) sizes.forEach(([width,height],index) => { for(let page=0;page<counts[index];page++) expectedCells.push([state,theme,width,height,page].join(':')); });
      for (const state of ['restored-flare','restored-revival']) expectedCells.push([state,theme,240,240,0].join(':'));
    }
    for (const state of ['no-target-flare','no-target-revival','empty-items']) for (const [width,height] of sizes) expectedCells.push([state,'light',width,height,0].join(':'));
    assert.deepEqual(evidence.frames.map(f => [f.state,f.theme,f.width,f.height,f.pageIndex].join(':')).sort(), expectedCells.sort(), 'exact original state/theme/frame/page inventory retained');
    assert.equal(evidence.frames.length, 127, 'all original recovery matrix pages remain');
    assert.equal(new Set(evidence.frames.map(f => [f.state,f.theme,f.width,f.height,f.pageIndex].join(':'))).size, 127, 'matrix cells remain unique');
    assert.deepEqual(evidence.stages, ['setup','dark matrix','light matrix','no-target and empty','cleanup']);
    evidence.complete = true;
  } catch (error) { originalFailure ??= error; evidence.failure = String(originalFailure); throw originalFailure; }
  finally {
    try { await closeOnce(app); } catch (error) { evidence.complete = false; evidence.cleanupFailure = String(error); if (!originalFailure) throw error; }
    finally { await mkdir(output, { recursive: true }); await writeFile(new URL('survive-recovery-board-layout.json', output), JSON.stringify(evidence, null, 2)); }
  }
});
