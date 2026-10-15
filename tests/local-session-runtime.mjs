// Real built Local Play flow. CDP is not used and no product debug hook exists.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { chromium } from 'playwright';

const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.ok(built.includes('gamepad.subscribe') && built.includes('local-session-start'), 'Build Local Play before this fixture.');
function installRuntime() {
  window.localRuntime = { hydrated: false };
  window.napplet = { storage: { async getItem() { window.localRuntime.hydrated = true; return JSON.stringify({ mode: 'arcade', coins: 1000, runs: 0, muted: true, selected: 'butter', travelerVersion: 2 }); }, async setItem() {} }, gamepad: {} };
}
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const harness = `<!doctype html><meta charset="utf-8"><body style="margin:0"><iframe id="napplet" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>
const built=${json(built)}, install=${json(installRuntime.toString())}, frame=document.querySelector('iframe'); window.messages=[];
window.snapshot=(pads,focused=true)=>frame.contentWindow.postMessage({type:'gamepad.state',available:true,focused,pads},'*');
addEventListener('message',event=>{if(event.source!==frame.contentWindow||!event.data?.type?.startsWith('gamepad.'))return;messages.push(event.data);if(event.data.type==='gamepad.subscribe')snapshot([]);});
frame.srcdoc=built.replace('<head>','<head><script>('+install+')()<'+'/script>');</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
after(() => new Promise(resolve => server.close(resolve)));
const pad = (index, id, buttons = []) => ({ index, id, mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: buttons.includes(button) ? 1 : 0, pressed: buttons.includes(button), touched: buttons.includes(button) })) });

test('two shell controllers enter Local Play, move independently, reclaim, and teardown once', { timeout: 30_000 }, async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    page.setDefaultTimeout(5_000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded', timeout: 5_000 });
    const frame = await (await page.locator('#napplet').elementHandle()).contentFrame();
    const waitFor = async (predicate, step) => {
      try {
        await frame.waitForFunction(predicate, undefined, { timeout: 5_000 });
      } catch (error) {
        const app = await frame.locator('#app').innerText().catch(() => '<missing app>');
        assert.fail(`${step} did not finish: ${error.message}\npage errors: ${errors.join(' | ') || '<none>'}\napp: ${app.slice(0, 700)}`);
      }
    };
    await waitFor(() => window.localRuntime?.hydrated, 'runtime hydration');
    const send = async (pads, focused = true) => { await page.evaluate(([next, focus]) => window.snapshot(next, focus), [pads, focused]); await frame.evaluate(() => Promise.resolve()); await page.waitForTimeout(30); };
    const alpha = 'Alpha controller', beta = 'Beta controller';
    await send([pad(0, alpha)]); await send([pad(0, alpha, [0])]);
    await waitFor(() => document.querySelector('#app')?.dataset.runState === 'playing', 'first controller solo start');
    await send([pad(0, alpha), pad(1, beta)]); await send([pad(0, alpha), pad(1, beta, [0])]);
    await waitFor(() => !document.querySelector('#local-session-setup')?.hasAttribute('hidden'), 'second controller Local Play setup');
    assert.equal(await frame.locator('#local-session-start').isDisabled(), false);
    await frame.locator('#local-session-start').click();
    await waitFor(() => document.querySelectorAll('#session-seats [data-seat]').length === 2, 'session HUD after Start');
    const labels = await frame.locator('#session-seats [data-seat]').allInnerTexts();
    assert.ok(labels.every(label => /P[12].*[▲●]/.test(label)), `HUD identity combines P-number and a geometric marker: ${labels.join(' | ')}`);
    const distance = async seat => Number((await frame.locator(`#session-seats [data-seat="${seat}"]`).innerText()).match(/(\d+) tiles/)?.[1] ?? -1);
    const beforeMoves = await Promise.all(['p1', 'p2'].map(distance));
    await send([pad(0, alpha, [12]), pad(1, beta, [12])]); await page.waitForTimeout(120); await send([pad(0, alpha), pad(1, beta)]);
    const afterMoves = await Promise.all(['p1', 'p2'].map(distance));
    assert.ok(afterMoves[0] > beforeMoves[0] && afterMoves[1] > beforeMoves[1], `fresh edges independently advance both visible production seats (${beforeMoves} -> ${afterMoves})`);
    await send([pad(0, alpha)]); await page.waitForTimeout(50);
    assert.match(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Waiting to reclaim/);
    await send([pad(0, alpha), pad(1, beta, [0])]); await page.waitForTimeout(30); await send([pad(0, alpha), pad(1, beta)]);
    assert.match(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Waiting to reclaim/, 'returning held input is seeded, never reclaimed');
    await send([pad(0, alpha), pad(1, beta, [0])]); await page.waitForTimeout(30); await send([pad(0, alpha), pad(1, beta)]);
    assert.doesNotMatch(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Waiting to reclaim/, 'only a fresh post-neutral edge reclaims P2');
    const before = await page.evaluate(() => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length);
    await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
    await page.waitForFunction(count => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length === count + 1, before);
    await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
    await page.locator('#napplet').screenshot({ path: new URL('../artifacts/local-session-runtime-900.png', import.meta.url).pathname });
    await writeFile(new URL('../artifacts/local-session-runtime.json', import.meta.url), JSON.stringify({ scenarios: ['first solo controller', 'second controller setup', 'two seat run', 'disconnect/reclaim', 'single teardown'], errors }, null, 2));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
