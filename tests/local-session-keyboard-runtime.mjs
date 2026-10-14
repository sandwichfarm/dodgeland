import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifact = new URL('../dist/index.html', import.meta.url);
const inputs = ['index.html', 'src/main.ts', 'src/session.ts', 'src/keyboard-input.ts', 'src/session-ui.ts', 'src/session-ui.css'];
const [built, artifactStatus, ...inputStatuses] = await Promise.all([readFile(artifact, 'utf8'), stat(artifact), ...inputs.map(path => stat(resolve(root, path)))]);
assert.ok(artifactStatus.mtimeMs >= Math.max(...inputStatuses.map(input => input.mtimeMs)), 'dist is stale; run pnpm build before the keyboard iframe proof.');

function installKeyboardRuntime() {
  const fixture = window.keyboardRuntimeFixture = { actions: [], handlers: {}, unregistered: [], writes: [] };
  window.napplet = {
    storage: {
      async getItem(key) { return key === 'puddlehop.progress.v1' ? JSON.stringify({ mode: 'arcade', coins: 1000, runs: 0, muted: true, selected: 'butter', travelerVersion: 2 }) : null; },
      async setItem(key, value) { fixture.writes.push({ key, value }); },
    },
    theme: { async get() { return { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }; }, onChanged() { return { close() {} }; } },
    keys: {
      async registerAction(action) { fixture.actions.push(action); return { actionId: action.id, binding: action.defaultKey }; },
      onAction(id, handler) { fixture.handlers[id] = handler; return { close() { delete fixture.handlers[id]; fixture.unregistered.push(id); } }; },
      unregisterAction(id) { delete fixture.handlers[id]; fixture.unregistered.push(id); },
    },
  };
}

const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const injected = `<script>(${installKeyboardRuntime.toString()})();</script>`;
const harness = `<!doctype html><body style="margin:0"><iframe title="Native keyboard proof" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>document.querySelector('iframe').srcdoc=${json(built.replace('<head>', '<head>' + injected))};</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
after(() => new Promise(resolve => server.close(resolve)));

const seatRows = frame => frame.locator('#session-seats [data-seat]').evaluateAll(nodes => nodes.map(node => ({ seat: node.dataset.seat, y: Number(node.textContent?.split('·').at(-1)?.trim()) })));

test('opaque iframe receives native keyboard profiles only after overlapping owned shortcuts close', { timeout: 20_000 }, async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
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
    await frame.locator('#scene').press('w');
    await frame.locator('#scene').press('ArrowUp');
    await frame.waitForFunction(expected => [...document.querySelectorAll('#session-seats [data-seat]')].every(node => Number(node.textContent?.split('·').at(-1)?.trim()) === expected[node.dataset.seat]), Object.fromEntries(before.map(row => [row.seat, row.y + 1])));
    const after = await seatRows(frame);
    assert.deepEqual(after.map(row => row.y), before.map(row => row.y + 1), 'real native W and ArrowUp move independent seats through the opaque iframe');

    await frame.locator('#scene').focus();
    await page.keyboard.down('w');
    await frame.evaluate(() => window.dispatchEvent(new Event('blur')));
    await frame.waitForFunction(() => document.querySelector('#app')?.dataset.runState === 'paused');
    await frame.evaluate(() => window.dispatchEvent(new Event('focus')));
    await frame.locator('#play').click();
    const resumed = await seatRows(frame);
    await page.keyboard.down('w');
    await page.waitForTimeout(60);
    assert.deepEqual(await seatRows(frame), resumed, 'a key held across focus loss is seeded and cannot create a stale move');
    await page.keyboard.up('w');
    await page.waitForTimeout(260);
    await frame.locator('#scene').focus();
    await frame.locator('#scene').press('w');
    await frame.waitForFunction(expected => Number([...document.querySelectorAll('#session-seats [data-seat="p1"]')][0]?.textContent?.split('·').at(-1)?.trim()) === expected, resumed.find(row => row.seat === 'p1').y + 1);

    await page.goto(`http://127.0.0.1:${server.address().port}`);
    frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    assert.ok(frame);
    await frame.waitForFunction(() => typeof window.keyboardRuntimeFixture?.handlers['puddlehop.forward-w'] === 'function');
    await frame.locator('#local-play').click();
    await frame.locator('#local-session-controls').click();
    await frame.locator('.session-binding').filter({ hasText: 'Q' }).click();
    await page.screenshot({ path: resolve(root, 'artifacts/local-session-keyboard-capture-900.png') });
    await frame.locator('.session-binding[aria-pressed="true"]').press('e');
    await frame.waitForFunction(() => [...document.querySelectorAll('.session-binding')].some(binding => binding.textContent === 'E'));
    const writes = await frame.evaluate(() => window.keyboardRuntimeFixture.writes.length);
    await frame.getByRole('tab', { name: /P2/ }).click();
    await frame.locator('.session-binding').filter({ hasText: '.' }).click();
    await frame.locator('.session-binding[aria-pressed="true"]').press('e');
    await frame.waitForFunction(() => document.querySelector('.session-controls-status')?.textContent?.includes('already controls P1'));
    await page.screenshot({ path: resolve(root, 'artifacts/local-session-keyboard-conflict-900.png') });
    assert.equal(await frame.evaluate(() => window.keyboardRuntimeFixture.writes.length), writes, 'a duplicate key never reaches SDK storage');
    await frame.getByRole('tab', { name: /P1/ }).click();
    await frame.getByRole('button', { name: 'Reset Keyboard A' }).click();
    assert.equal(await frame.evaluate(() => document.activeElement?.textContent), 'Keep current controls', 'reset puts focus on the safe action');
    await page.screenshot({ path: resolve(root, 'artifacts/local-session-keyboard-reset-900.png') });
    await frame.getByRole('button', { name: 'Keep current controls' }).click();
    await iframe.evaluate(node => { node.style.width = '240px'; node.style.height = '240px'; });
    await page.screenshot({ path: resolve(root, 'artifacts/local-session-keyboard-controls-240.png') });
    assert.deepEqual(errors, [], 'the muted native-key iframe reports no page errors');
  } finally { await browser.close(); }
});
