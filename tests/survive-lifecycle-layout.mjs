import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { createMarketGameFixture, sessionHudAction } from './market-game-fixture.mjs';

const frames = [[200, 160], [240, 240], [320, 560], [1000, 280]];
const themes = {
  dark: { colors: { background: '#18232a', text: '#f4f2df', primary: '#a6c97d' } },
  light: { colors: { background: '#f4f2df', text: '#263c38', primary: '#477953' } },
};
const pad = (index, pressed = []) => ({ index, id: `Lifecycle layout ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })) });

async function snapshotFocus(frame) {
  return frame.evaluate(() => {
    const active = document.activeElement;
    const chain = [];
    for (let node = active instanceof HTMLElement ? active : null; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      chain.push({ tag: node.tagName, id: node.id, inert: node.inert, hidden: node.hidden, display: style.display, visibility: style.visibility });
    }
    return { active: active instanceof HTMLElement ? { tag: active.tagName, id: active.id, label: active.textContent?.trim().slice(0, 80) } : null, chain };
  });
}

async function selectHudDetailsPage(frame, seat, page) {
  const root=frame.locator('#session-seats'),tile = frame.locator(`#session-seats [data-seat="${seat}"]`);
  if(await frame.locator('.session-hud-selected').getAttribute('data-seat')!==seat){if(await root.getAttribute('data-session-hud-inspect')==='true')await frame.getByRole('button',{name:'Close details',exact:true}).click();await tile.locator('.session-hud-identity').click();}
  if(await root.getAttribute('data-session-hud-inspect')!=='true')await tile.locator('.session-hud-identity').click();
  const next = tile.locator('[data-session-hud-pager] button').last();
  assert.equal(await next.count(), 1, `${seat} has exactly one next compact-details control`);
  assert.equal(await next.isVisible(), true, `${seat} exposes the compact-details pager: ${await tile.innerHTML()}`);
  while (Number(await tile.getAttribute('data-session-hud-page')) !== page) await next.click();
}

async function capture(frame, iframe, resize, evidence, state, text, { modal = false, onSupported } = {}) {
  for (const [themeName, theme] of Object.entries(themes)) for (const [width, height] of frames) {
    await frame.evaluate(value => window.marketGameFixture.setTheme(value), theme);
    await resize(width, height);
    if (width >= 240 && height >= 240) await onSupported?.({ width, height });
    const metrics = await frame.evaluate(({ text, width, height }) => {
      const visible = node => {
        if (!(node instanceof HTMLElement) || !node.getClientRects().length || node.closest('[hidden]')) return false;
        for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (ancestor.inert || ancestor.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
        }
        return true;
      };
      const controls = [...document.querySelectorAll('button')].filter(visible).map(node => {
        const rect = node.getBoundingClientRect(), hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { label: node.textContent?.trim(), valid: rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.top >= 0 && rect.right <= width && rect.bottom <= height && (hit === node || node.contains(hit)) };
      });
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let hasText = false;
      for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
        if (textNode.nodeValue?.includes(text) && visible(textNode.parentElement)) { hasText = true; break; }
      }
      const containers = [...document.querySelectorAll('#survive-recovery-board, #survive-lifecycle-board')].filter(visible).map(node => ({ id: node.id, overflow: node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1 }));
      const active = document.activeElement;
      return {
        notice: visible(document.querySelector('.too-small')),
        hasText,
        scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
        controls,
        containers,
        modalFocus: active instanceof HTMLElement && !!active.closest('#survive-recovery-board, #survive-lifecycle-board'),
        active: active instanceof HTMLElement ? { tag: active.tagName, id: active.id, label: active.textContent?.trim().slice(0, 80), recoveryAction: active.dataset.recoveryAction } : null,
      };
    }, { text, width, height });
    evidence.frames.push({ state, themeName, width, height, metrics });
    await iframe.screenshot({ path: new URL(`survive-lifecycle-${state}-${themeName}-${width}x${height}.png`, new URL('../artifacts/', import.meta.url)).pathname });
    if (width < 240 || height < 240) {
      assert.equal(metrics.notice, true, `${state}/${themeName}/${width}×${height} shows only the tiny notice`);
    } else {
      assert.equal(metrics.notice, false, `${state}/${themeName}/${width}×${height} restores the lifecycle state`);
      assert.equal(metrics.hasText, true, `${state}/${themeName}/${width}×${height} retains its textual lifecycle cue`);
      assert.ok(metrics.scroll[0] <= width && metrics.scroll[1] <= height, `${state}/${themeName}/${width}×${height} has no document overflow`);
      assert.ok(metrics.controls.every(control => control.valid), `${state}/${themeName}/${width}×${height} keeps all visible actions hit-testable: ${JSON.stringify(metrics.controls)}`);
      assert.ok(metrics.containers.every(container => !container.overflow), `${state}/${themeName}/${width}×${height} has no board overflow`);
      if (modal) assert.equal(metrics.modalFocus, true, `${state}/${themeName}/${width}×${height} retains focus inside its modal: ${JSON.stringify(metrics.active)}`);
    }
  }
}

test('a personal-revive offer remains readable across compact lifecycle frames', { timeout: 120_000 }, async () => {
  const evidence = { errors: [], external: [], frames: [] }, app = await createMarketGameFixture(evidence);
  const { frame, iframe, advance, onSession, resize } = app;
  try {
    await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
    await frame.locator('#play').click(); await frame.locator('#pause').click(); await frame.locator('#local-play').click();
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(80);
    assert.equal(await onSession(function () {
      const player = this.players.find(value => value.seat === 'p1');
      this.world.host.inPlayerOperation(player, context => context.end('Lifecycle layout traffic', 'traffic', 'front'));
      this.update(1 / 120); return player.participation === 'dead' && !!player.recovery?.offer;
    }), true);
    await resize(240, 240);
    const p1Identity = frame.locator('#session-seats [data-seat="p1"] [data-session-hud="identity"]');
    await p1Identity.click();
    assert.equal(await frame.locator('#session-seats').getAttribute('data-session-hud-inspect'), 'true', 'the selected P1 compact tap opens its recovery offer details');
    await assert.doesNotReject(() => frame.locator('[data-seat="p1"] [data-session-hud="health"]').filter({hasText:/0\/3 feathers/}).waitFor());
    await selectHudDetailsPage(frame, 'p1', 1); await assert.doesNotReject(() => frame.locator('#session-seats [data-seat="p1"] [data-session-hud="power"]').waitFor());
    await selectHudDetailsPage(frame, 'p1', 2); await assert.doesNotReject(() => frame.getByText(/Use personal revive/).waitFor());
    await capture(frame, iframe, resize, evidence, 'personal-offer', 'Use personal revive', {
      onSupported: async ({ height }) => {
        if (height <= 319 && await frame.locator('#session-seats').getAttribute('data-session-hud-inspect') !== 'true') await p1Identity.click();
        if (height <= 319) await selectHudDetailsPage(frame, 'p1', 2);
      },
    });
    assert.deepEqual(evidence.errors, []);
  } finally { await writeFile(new URL('../artifacts/survive-lifecycle-layout.json', import.meta.url), JSON.stringify(evidence, null, 2)); await app.close(); }
});

test('ghost and deliberate-leave cues remain bounded without creating a replacement seat', { timeout: 120_000 }, async () => {
  const evidence = { errors: [], external: [], frames: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, iframe, advance, sendPads, resize } = app;
  try {
    await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
    await sendPads([pad(0), pad(1)]); await sendPads([pad(0, [0]), pad(1)]); await sendPads([pad(0), pad(1)]); await sendPads([pad(0), pad(1, [0])]); await sendPads([pad(0), pad(1)]);
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(80);
    await sendPads([pad(0)]); await advance(80);
    await resize(240, 240);
    const p2Identity = frame.locator('#session-seats [data-seat="p2"] [data-session-hud="identity"]');
    await p2Identity.click(); await p2Identity.click();
    await frame.locator('#session-seats[data-session-hud-inspect="true"] [data-seat="p2"] [data-session-hud="device"]').waitFor();
    await selectHudDetailsPage(frame, 'p2', 1); await assert.doesNotReject(() => frame.locator('#session-seats [data-seat="p2"] [data-session-hud="power"]').waitFor());
    await selectHudDetailsPage(frame, 'p2', 3); await assert.doesNotReject(() => frame.locator('#session-seats [data-seat="p2"] [data-session-hud="item"]').waitFor());
    await selectHudDetailsPage(frame, 'p2', 0);
    await capture(frame, iframe, resize, evidence, 'ghost', 'Waiting to reclaim', {
      onSupported: async ({ height }) => {
        if (height <= 319 && await frame.locator('#session-seats').getAttribute('data-session-hud-inspect') !== 'true') await p2Identity.click();
        if (height <= 319) await selectHudDetailsPage(frame, 'p2', 0);
      },
    });
    await resize(900, 600);
    await sendPads([pad(0), pad(1)]); await sendPads([pad(0), pad(1, [0])]); await sendPads([pad(0), pad(1)]);
    await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).waitFor();
    assert.equal(await frame.getByRole('dialog', { name: 'Reclaim P2', exact: true }).isVisible(), true);
    evidence.focus = [{ state: 'reclaim-before-tiny', ...(await snapshotFocus(frame)) }];
    await capture(frame, iframe, resize, evidence, 'reclaim', 'Continue as Sunny. Your items are still here.', { modal: true });
    await resize(900, 600); await frame.getByRole('button', { name: 'Not now', exact: true }).click();
    await sessionHudAction(app, 'p1', 'item');
    await frame.getByRole('button', { name: 'Leave P1 run', exact: true }).click();
    await frame.getByRole('heading', { name: 'Leave as P1?', exact: true }).waitFor();
    assert.equal(await frame.getByRole('dialog', { name: 'Leave as P1?', exact: true }).isVisible(), true);
    evidence.focus.push({ state: 'leave-before-tiny', ...(await snapshotFocus(frame)) });
    await capture(frame, iframe, resize, evidence, 'leave-confirm', 'Your run ends, but this is not a death.', { modal: true });
    await resize(900, 600); await frame.getByRole('button', { name: 'Leave run', exact: true }).click();
    await capture(frame, iframe, resize, evidence, 'departed', 'P1 left the run');
    assert.deepEqual(evidence.errors, []);
  } finally { await writeFile(new URL('../artifacts/survive-lifecycle-layout.json', import.meta.url), JSON.stringify(evidence, null, 2)); await app.close(); }
});
