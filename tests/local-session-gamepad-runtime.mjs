// Exercise both supported NAP-GAMEPAD transports against the built app. The
// shell fixture owns snapshots; the game never polls native Gamepad APIs.
import assert from 'node:assert/strict';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { chromium } from 'playwright';
import { artifactDirectoryForCoverage, artifactForCoverage, registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';
const output=artifactDirectoryForCoverage(new URL('../artifacts/',import.meta.url),'local-session-gamepad-runtime');

const artifact=artifactForCoverage(new URL('../dist/index.html', import.meta.url));
const built = await readFile(artifact, 'utf8');
assert.ok(built.includes('gamepad.subscribe') && built.includes('local-session-start') && built.includes('requestFirstPlayer'), 'Build current Local Play gamepad integration first.');
const buildStamp = await stat(artifact);
const sourceStamps = await Promise.all(['../src/main.ts', '../src/gamepad.ts', '../src/session-input.ts', '../src/session-ui.ts', '../src/session-ui.css', '../src/session.ts'].map(path => stat(new URL(path, import.meta.url))));
assert.ok(buildStamp.mtimeMs >= Math.max(...sourceStamps.map(source => source.mtimeMs)), 'Build Local Play after every source edit before this fixture.');

function installTransport(mode) {
  const runtime = window.localTransport = { hydrated: false, closed: 0, subscriptions: 0 };
  const initial = { available: true, focused: true, pads: [] };
  let state = initial;
  const handlers = new Set();
  window.navigator.getGamepads = () => { throw new Error('Native gamepad polling is forbidden in this fixture.'); };
  window.napplet = {
    storage: {
      async getItem() { runtime.hydrated = true; return JSON.stringify({ mode: 'arcade', coins: 1000, runs: 0, muted: true, selected: 'butter', travelerVersion: 2 }); },
      async setItem() {},
    },
    gamepad: mode === 'binding' ? {
      get available() { return state.available; }, get focused() { return state.focused; }, getGamepads: () => state.pads,
      onChange(handler) { runtime.subscriptions++; handlers.add(handler); return { close() { handlers.delete(handler); runtime.closed++; } }; },
    } : {},
  };
  if (mode === 'binding') addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'gamepad.state') return;
    state = event.data; for (const handler of handlers) handler(state);
  });
}

const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const harness = `<!doctype html><meta charset="utf-8"><body style="margin:0"><iframe id="napplet" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>
const built=${json(built)}, install=${json(installTransport.toString())}, frame=document.querySelector('iframe'); window.messages=[];
window.send=state=>frame.contentWindow.postMessage({type:'gamepad.state',...state},'*');
addEventListener('message',event=>{if(event.source!==frame.contentWindow||!event.data?.type?.startsWith('gamepad.'))return;messages.push(event.data);if(event.data.type==='gamepad.subscribe')window.send({available:true,focused:true,pads:[]});});
window.mount=mode=>{window.messages=[];frame.srcdoc=built.replace('<head>','<head><script>('+install+')('+JSON.stringify(mode)+')<'+'/script>');};window.mount('wire');</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
after(() => new Promise(resolve => server.close(resolve)));

const pad = (index, id, buttons = []) => ({ index, id, mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: buttons.includes(button) ? 1 : 0, pressed: buttons.includes(button), touched: buttons.includes(button) })) });

test('wire and injected binding route actual Local Play seats, seed context changes, reclaim, and close once', { timeout: 45_000 }, async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  const evidence = { scenarios: [], errors: [] };
  let frame,identity,generation=0;
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    const register=()=>{identity={suite:process.argv[1],scenario:'controller-transports',frame:'opaque-app',generation:generation++,scope:'current'};registerRealm(page,identity);};
    register();
    page.setDefaultTimeout(6_000); page.on('pageerror', error => evidence.errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    frame=await (await page.locator('#napplet').elementHandle()).contentFrame();
    await frame.waitForFunction(()=>window.localTransport?.hydrated);
    const mount = async mode => {
      await collectRealm(frame,identity);frame=undefined;register();
      await page.evaluate(next => window.mount(next), mode);
      frame = await (await page.locator('#napplet').elementHandle()).contentFrame();
      await frame.waitForFunction(() => window.localTransport?.hydrated);
      await frame.locator('#play').waitFor();
    };
    const send = async (pads, focused = true) => {
      await page.evaluate(([next, isFocused]) => window.send({ available: true, focused: isFocused, pads: next }), [pads, focused]);
      await frame.evaluate(() => Promise.resolve()); await page.waitForTimeout(35);
    };
    const press = async (pads, next) => { await send(pads); await send(next); await page.waitForTimeout(90); await send(pads); };
    const distance = async seat => {
      assert.equal(await frame.locator(`#session-seats [data-seat="${seat}"] .session-hud-identity`).isVisible(),true);
      return Number((await frame.locator(`#session-seats [data-seat="${seat}"] [data-session-hud="health"]`).textContent()).match(/(\d+) tiles/)?.[1] ?? -1);
    };

    for (const mode of ['wire', 'binding']) {
      await mount(mode);
      const alpha = `${mode} alpha`, beta = `${mode} beta`;
      const neutral = [pad(0, alpha), pad(1, beta)];
      // Neither connected controller owns solo until it has a fresh action.
      await send(neutral); await press(neutral, [pad(0, alpha, [0]), pad(1, beta)]);
      await frame.waitForFunction(() => document.querySelector('#app')?.dataset.runState === 'playing');
      await press(neutral, [pad(0, alpha), pad(1, beta, [0])]);
      await frame.waitForFunction(() => !document.querySelector('#local-session-setup')?.hasAttribute('hidden'));
      await frame.locator('#local-session-start').click();
      await frame.waitForFunction(() => document.querySelectorAll('#session-seats [data-seat]').length === 2);
      await send(neutral);
      assert.equal(await distance('p1'), 0, `${mode}: the consumed join edge never hops P1`);

      const beforeP1 = await distance('p1'), beforeP2 = await distance('p2');
      await press(neutral, [pad(0, alpha, [12]), pad(1, beta)]);
      const p1Only = await distance('p1'), p2Still = await distance('p2');
      assert.deepEqual([p1Only, p2Still], [beforeP1 + 1, beforeP2], `${mode}: one P1 edge has exactly one P1 hop`);
      await press(neutral, [pad(0, alpha), pad(1, beta, [12])]);
      const p1Still = await distance('p1'), p2Only = await distance('p2');
      assert.deepEqual([p1Still, p2Only], [p1Only, p2Still + 1], `${mode}: one P2 edge has exactly one P2 hop`);

      // An assigned peer must be reseeded when P1 opens pause in this snapshot.
      await press(neutral, [pad(0, alpha, [9]), pad(1, beta, [0])]);
      assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'paused', `${mode}: P1 pauses`);
      await send(neutral); await press(neutral, [pad(0, alpha, [0]), pad(1, beta)]);
      assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'playing', `${mode}: a fresh post-neutral P1 confirm resumes`);

      await send([pad(0, alpha)]); await page.waitForTimeout(50);
      assert.match(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Ghost · reclaim-ready/, `${mode}: P2 disconnects`);
      const p1BeforeDisconnectMove = await distance('p1');
      await press([pad(0, alpha)], [pad(0, alpha, [12])]);
      assert.equal(await distance('p1'), p1BeforeDisconnectMove + 1, `${mode}: P1 keeps exactly one hop while P2 is disconnected`);
      const p2BeforeReclaim = await distance('p2');
      await send([pad(0, alpha), pad(1, beta, [0])]); await send(neutral);
      assert.match(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Ghost · reclaim-ready/, `${mode}: held reconnect is seeded`);
      await press(neutral, [pad(0, alpha), pad(1, beta, [0])]);
      await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).waitFor();
      assert.match(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Ghost · reclaim-ready/, `${mode}: fresh controller edge opens an explicit reclaim decision without consuming P2`);
      await press(neutral, [pad(0, alpha, [0]), pad(1, beta)]);
      assert.equal(await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).isVisible(), true, `${mode}: P1 cannot confirm P2's reclaim decision`);
      await press(neutral, [pad(0, alpha), pad(1, beta, [0])]);
      await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).waitFor({ state: 'hidden' });
      assert.doesNotMatch(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Ghost · reclaim-ready/, `${mode}: P2's fresh confirmation reclaims its retained seat`);
      assert.equal(await distance('p2'), p2BeforeReclaim, `${mode}: reclaim edge is consumed without a hop`);
      await send(neutral, false);
      assert.doesNotMatch(await frame.locator('#session-seats [data-seat="p1"]').innerText(), /Ghost · reclaim-ready/, `${mode}: global focus loss does not mark P1 disconnected`);
      assert.doesNotMatch(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Ghost · reclaim-ready/, `${mode}: global focus loss does not mark P2 disconnected`);
      const frozenFocusDistances = await Promise.all(['p1', 'p2'].map(distance));
      await send([pad(0, alpha, [12]), pad(1, beta, [12])], false);
      assert.deepEqual(await Promise.all(['p1', 'p2'].map(distance)), frozenFocusDistances, `${mode}: global focus loss suspends every controller edge`);
      await send(neutral);

      const beforeClose = await page.evaluate(() => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length);
      if (mode === 'wire') assert.equal(await page.evaluate(() => window.messages.filter(message => message.type === 'gamepad.subscribe').length), 1, 'wire subscribes once');
      else assert.equal(await frame.evaluate(() => window.localTransport.subscriptions), 1, 'binding subscribes once');
      await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
      if (mode === 'wire') await page.waitForFunction(count => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length === count + 1, beforeClose);
      else assert.equal(await frame.evaluate(() => window.localTransport.closed), 1, 'binding closes exactly once');
      await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
      const frozen = { state: await frame.locator('#app').getAttribute('data-run-state'), distances: await Promise.all(['p1', 'p2'].map(distance)) };
      await send([pad(0, alpha, [12, 9, 2]), pad(1, beta, [12, 9, 2])]); await page.waitForTimeout(80);
      assert.deepEqual({ state: await frame.locator('#app').getAttribute('data-run-state'), distances: await Promise.all(['p1', 'p2'].map(distance)) }, frozen, `${mode}: pagehide ignores late move, pause, and call edges`);
      if (mode === 'wire') assert.equal(await page.evaluate(() => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length), beforeClose + 1, 'wire unsubscribes once after repeated pagehide');
      else assert.equal(await frame.evaluate(() => window.localTransport.closed), 1, 'binding closes once after repeated pagehide');
      evidence.scenarios.push({ mode, checks: ['first-active solo ownership', 'second-controller setup', 'exactly-one independent P1/P2 movement', 'modal context seeding', 'isolated disconnect, held reconnect, owner-confirmed reclaim', 'global focus safety', 'single transport teardown and late-edge suppression'] });
    }
    assert.deepEqual(evidence.errors, []);
    await mkdir(output, { recursive: true });
    await writeFile(new URL('local-session-gamepad-runtime.json', output), JSON.stringify(evidence, null, 2));
  } finally { try{if(identity)await collectRealm(frame,identity);}finally{await browser.close();} }
});
