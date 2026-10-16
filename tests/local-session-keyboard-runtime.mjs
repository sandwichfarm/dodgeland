import assert from 'node:assert/strict';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { artifactDirectoryForCoverage } from '../tools/release-coverage/browser.mjs';
const output=artifactDirectoryForCoverage(new URL('../artifacts/',import.meta.url),'local-session-keyboard-runtime');

await mkdir(output,{recursive:true});
const root = fileURLToPath(new URL('../', import.meta.url));
const artifact = new URL('../dist/index.html', import.meta.url);
const inputs = ['index.html', 'src/main.ts', 'src/session.ts', 'src/keyboard-input.ts', 'src/session-ui.ts', 'src/session-ui.css'];
const [built, artifactStatus, ...inputStatuses] = await Promise.all([readFile(artifact, 'utf8'), stat(artifact), ...inputs.map(path => stat(resolve(root, path)))]);
assert.ok(artifactStatus.mtimeMs >= Math.max(...inputStatuses.map(input => input.mtimeMs)), 'dist is stale; run pnpm build before the keyboard iframe proof.');

function installKeyboardRuntime() {
  const fixture = window.keyboardRuntimeFixture = { actions: [], handlers: {}, unregistered: [], writes: [] };
  const light = window.name === 'keyboard-light';
  window.napplet = {
    storage: {
      async getItem(key) { return key === 'puddlehop.progress.v1' ? JSON.stringify({ mode: 'arcade', coins: 1000, runs: 0, muted: true, selected: 'butter', travelerVersion: 2 }) : null; },
      async setItem(key, value) { fixture.writes.push({ key, value }); },
    },
    theme: { async get() { return { colors: light ? { background: '#f4f2df', text: '#f0eee5', primary: '#477953' } : { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }; }, onChanged() { return { close() {} }; } },
    keys: {
      async registerAction(action) { fixture.actions.push(action); return { actionId: action.id, binding: action.defaultKey }; },
      onAction(id, handler) { fixture.handlers[id] = handler; return { close() { delete fixture.handlers[id]; fixture.unregistered.push(id); } }; },
      unregisterAction(id) { delete fixture.handlers[id]; fixture.unregistered.push(id); },
    },
  };
}

const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const injected = `<script>(${installKeyboardRuntime.toString()})();</script>`;
const harness = `<!doctype html><body style="margin:0"><iframe title="Native keyboard proof" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>const frame=document.querySelector('iframe');frame.name=location.search.includes('theme=light')?'keyboard-light':'keyboard-dark';frame.srcdoc=${json(built.replace('<head>', '<head>' + injected))};</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
after(() => new Promise(resolve => server.close(resolve)));

const seatRows = frame => frame.locator('#session-seats [data-seat]').evaluateAll(nodes => nodes.map(node => ({ seat: node.dataset.seat, y: Number(node.querySelector('[data-session-hud="health"]')?.textContent?.match(/(\d+)\s+tiles\b/)?.[1]) })));
const editorBounds = frame => frame.evaluate(() => {
  const editor = document.querySelector('#session-keyboard-editor');
  const controls = [...editor.querySelectorAll('button')].map(button => {
    const rect = button.getBoundingClientRect();
    return { text: button.textContent?.trim(), left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, height: rect.height, fontSize: Number.parseFloat(getComputedStyle(button).fontSize) };
  });
  const rowLabel = editor.querySelector('.session-controls-row > span');
  const status = editor.querySelector('.session-controls-status');
  const statusRect = status?.getBoundingClientRect();
  return { width: innerWidth, height: innerHeight, controls, labelFontSize: rowLabel ? Number.parseFloat(getComputedStyle(rowLabel).fontSize) : 16, activeText: document.activeElement?.textContent?.trim(), status: { text: status?.textContent?.trim(), top: statusRect?.top, bottom: statusRect?.bottom, fontSize: status ? Number.parseFloat(getComputedStyle(status).fontSize) : 0 } };
});
function assertEditorFits(layout) {
  assert.ok(layout.controls.length > 0);
  for (const control of layout.controls) {
    assert.ok(control.left >= 0 && control.top >= 0 && control.right <= layout.width && control.bottom <= layout.height, `${control.text} must remain inside the iframe`);
    assert.ok(control.height >= 44 && control.right - control.left >= 44, `${control.text} must retain a 44px target`);
    assert.ok(control.fontSize >= 16, `${control.text} must retain the reviewed 16px text floor`);
  }
  assert.ok(layout.labelFontSize >= 16, 'action labels retain the reviewed 16px text floor');
  if (layout.status.text) assert.ok(layout.status.top >= 0 && layout.status.bottom <= layout.height && layout.status.fontSize >= 16, 'live status remains visible at the 16px floor');
}

test('opaque iframe receives native keyboard profiles only after overlapping owned shortcuts close', { timeout: 60_000 }, async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const iframe = page.locator('iframe');
    let frame = await (await iframe.elementHandle()).contentFrame();
    assert.ok(frame);
    assert.equal(await iframe.getAttribute('sandbox'), 'allow-scripts');
    assert.equal(await frame.evaluate(() => location.origin), 'null');
    await frame.waitForFunction(() => typeof window.keyboardRuntimeFixture?.handlers['puddlehop.forward-w'] === 'function');

    await frame.locator('#local-play').click();
    await frame.locator('#local-session-start').click();
    await frame.locator('#session-seats [data-seat="p1"]').waitFor();
    await frame.waitForFunction(() => !window.keyboardRuntimeFixture.handlers['puddlehop.forward-w'] && !window.keyboardRuntimeFixture.handlers['puddlehop.forward']);
    const activeHandlers = await frame.evaluate(() => Object.keys(window.keyboardRuntimeFixture.handlers));
    assert.ok(activeHandlers.includes('puddlehop.pause') && activeHandlers.includes('puddlehop.play') && activeHandlers.includes('puddlehop.back-menu'), 'global pause, confirm, and Escape safety shortcuts stay registered');

    const before = await seatRows(frame);
    assert.ok(before.every(row => Number.isFinite(row.y)), 'each keyboard seat reports a real personal distance');
    await frame.locator('#scene').press('w');
    await frame.locator('#scene').press('ArrowUp');
    await frame.waitForFunction(expected => [...document.querySelectorAll('#session-seats [data-seat]')].every(node => Number(node.querySelector('[data-session-hud="health"]')?.textContent?.match(/(\d+)\s+tiles\b/)?.[1]) === expected[node.dataset.seat]), Object.fromEntries(before.map(row => [row.seat, row.y + 1])));
    const after = await seatRows(frame);
    assert.deepEqual(after.map(row => row.y), before.map(row => row.y + 1), 'real native W and ArrowUp move independent seats through the opaque iframe');

    await frame.locator('#scene').focus();
    await page.keyboard.down('w');
    await frame.evaluate(() => window.dispatchEvent(new Event('blur')));
    await frame.waitForFunction(() => document.querySelector('#app')?.dataset.runState === 'paused');
    await frame.evaluate(() => window.dispatchEvent(new Event('focus')));
    // A running LocalSession hides the solo run panel; resume through the
    // visible shared pause control instead of its hidden solo Play button.
    await frame.locator('#pause').click();
    await frame.waitForFunction(() => document.querySelector('#app')?.dataset.runState === 'playing');
    const resumed = await seatRows(frame);
    await page.keyboard.down('w');
    await page.waitForTimeout(60);
    assert.deepEqual(await seatRows(frame), resumed, 'a key held across focus loss is seeded and cannot create a stale move');
    await page.keyboard.up('w');
    await page.waitForTimeout(260);
    await frame.locator('#scene').focus();
    await frame.locator('#scene').press('w');
    await frame.waitForFunction(expected => Number([...document.querySelectorAll('#session-seats [data-seat="p1"]')][0]?.querySelector('[data-session-hud="health"]')?.textContent?.match(/(\d+)\s+tiles\b/)?.[1]) === expected, resumed.find(row => row.seat === 'p1').y + 1);

    await page.goto(`http://127.0.0.1:${server.address().port}`);
    frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    assert.ok(frame);
    await frame.waitForFunction(() => typeof window.keyboardRuntimeFixture?.handlers['puddlehop.forward-w'] === 'function');
    await frame.locator('#local-play').click();
    await frame.locator('#local-session-controls').click();
    for (let index = 0; index < 4; index++) await frame.getByRole('button', { name: 'More' }).click();
    await frame.locator('.session-binding').filter({ hasText: 'Q' }).click();
    assert.equal(await frame.evaluate(() => document.activeElement?.getAttribute('aria-pressed')), 'true', 'capture keeps focus on the replacement capture control');
    await iframe.screenshot({ path: new URL('local-session-keyboard-capture-900-reduced-dark.png', output).pathname });
    await frame.locator('.session-binding[aria-pressed="true"]').press('e');
    await frame.waitForFunction(() => [...document.querySelectorAll('.session-binding')].some(binding => binding.textContent === 'E'));
    const writes = await frame.evaluate(() => window.keyboardRuntimeFixture.writes.length);
    await frame.getByRole('tab', { name: /P2/ }).click();
    await frame.locator('.session-binding').filter({ hasText: '.' }).click();
    await frame.locator('.session-binding[aria-pressed="true"]').press('e');
    await frame.waitForFunction(() => document.querySelector('.session-controls-status')?.textContent?.includes('already controls P1'));
    assert.equal(await frame.evaluate(() => document.activeElement?.textContent?.trim()), '.', 'conflict returns focus to the newly rendered binding control');
    await iframe.screenshot({ path: new URL('local-session-keyboard-conflict-900-reduced-dark.png', output).pathname });
    assert.equal(await frame.evaluate(() => window.keyboardRuntimeFixture.writes.length), writes, 'a duplicate key never reaches SDK storage');
    await frame.getByRole('tab', { name: /P1/ }).click();
    await frame.getByRole('button', { name: 'More' }).click();
    await frame.getByRole('button', { name: 'Reset Keyboard A' }).click();
    assert.equal(await frame.evaluate(() => document.activeElement?.textContent), 'Keep current controls', 'reset puts focus on the safe action');
    await iframe.screenshot({ path: new URL('local-session-keyboard-reset-900-reduced-dark.png', output).pathname });
    await frame.getByRole('button', { name: 'Keep current controls' }).click();
    assert.equal(await frame.evaluate(() => document.activeElement?.textContent?.trim()), 'Reset Keyboard A', 'cancel returns focus to the live reset action');
    await frame.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await frame.evaluate(() => document.activeElement?.className), 'session-binding', 'paging focuses the first binding on the newly rendered page');
    assertEditorFits(await editorBounds(frame));
    await iframe.screenshot({ path: new URL('local-session-keyboard-back-900-reduced-dark.png', output).pathname });
    await iframe.evaluate(node => { node.style.width = '240px'; node.style.height = '240px'; });
    await iframe.screenshot({ path: new URL('local-session-keyboard-before-back-240-reduced-dark.png', output).pathname });
    for (let index = 0; index < 4; index++) await frame.getByRole('button', { name: 'Back', exact: true }).click();
    assertEditorFits(await editorBounds(frame));
    await iframe.screenshot({ path: new URL('local-session-keyboard-back-240-reduced-dark.png', output).pathname });
    await frame.locator('.session-binding').filter({ hasText: 'W' }).click();
    assert.equal(await frame.evaluate(() => document.activeElement?.getAttribute('aria-pressed')), 'true');
    await iframe.screenshot({ path: new URL('local-session-keyboard-capture-240-reduced-dark.png', output).pathname });
    assertEditorFits(await editorBounds(frame));
    await frame.locator('.session-binding[aria-pressed="true"]').press('Escape');
    assert.equal(await frame.evaluate(() => document.activeElement?.className), 'session-binding', 'Escape returns focus to a live binding control');
    for (let index = 0; index < 4; index++) await frame.getByRole('button', { name: 'More' }).click();
    await frame.getByRole('tab', { name: /P2/ }).click();
    await frame.locator('.session-binding').filter({ hasText: '.' }).click();
    await frame.locator('.session-binding[aria-pressed="true"]').press('e');
    await frame.waitForFunction(() => document.querySelector('.session-controls-status')?.textContent?.includes('already controls P1'));
    assertEditorFits(await editorBounds(frame));
    await iframe.screenshot({ path: new URL('local-session-keyboard-conflict-240-reduced-dark.png', output).pathname });
    await frame.getByRole('tab', { name: /P1/ }).click();
    await frame.getByRole('button', { name: 'More' }).click();
    await frame.getByRole('button', { name: 'Reset Keyboard A' }).click();
    assert.equal(await frame.evaluate(() => document.activeElement?.textContent), 'Keep current controls');
    assertEditorFits(await editorBounds(frame));
    await iframe.screenshot({ path: new URL('local-session-keyboard-reset-240-reduced-dark.png', output).pathname });
    await frame.getByRole('button', { name: 'Keep current controls' }).click();

    await iframe.evaluate(node => { node.style.width = '900px'; node.style.height = '600px'; });
    await page.goto(`http://127.0.0.1:${server.address().port}?theme=light`);
    frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    assert.ok(frame);
    await frame.waitForFunction(() => typeof window.keyboardRuntimeFixture?.handlers['puddlehop.forward-w'] === 'function');
    await frame.locator('#local-play').click();
    await frame.locator('#local-session-controls').click();
    assertEditorFits(await editorBounds(frame));
    assert.ok(await frame.evaluate(() => {
      const ink = getComputedStyle(document.querySelector('.local-session-setup')).color;
      return !ink.includes('0.871') && !ink.includes('240');
    }), 'light theme renders controls in the game board ink rather than the pale runtime foreground');
    const lightWrites = await frame.evaluate(() => window.keyboardRuntimeFixture.writes.length);
    await frame.locator('.session-binding').filter({ hasText: 'W' }).click();
    await frame.getByRole('button', { name: 'More' }).click();
    await frame.locator('#session-keyboard-editor').press('e');
    assert.equal(await frame.evaluate(() => window.keyboardRuntimeFixture.writes.length), lightWrites, 'paging cancels capture before a later key can mutate its hidden row');
    await frame.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await frame.locator('.session-binding').textContent(), 'W', 'the hidden captured row retains its prior key after page navigation');
    await frame.locator('.session-binding').filter({ hasText: 'W' }).click();
    await iframe.screenshot({ path: new URL('local-session-keyboard-capture-900-reduced-light.png', output).pathname });
    await frame.locator('.session-binding[aria-pressed="true"]').press('Escape');
    assert.deepEqual(errors, [], 'the muted native-key iframe reports no page errors');
  } finally { await browser.close(); }
});
