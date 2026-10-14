// Production artifact in an opaque iframe; the fixture is a shell implementing
// NAP-GAMEPAD draft PR #108. Physical hardware and Kehto support are not claimed.
// CDP stages clear terrain/death only; all tested input uses the shipped module.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.ok(built.includes('gamepad.subscribe') && built.includes('gamepad-help'), 'Build current gamepad integration first.');
function installFixture(mode) {
  Math.random = () => 0;
  const observation = window.gamepadFixture = { voices: [], writes: [], closed: 0, hydrated: false };
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    createBufferSource() {
      const source = super.createBufferSource(), start = source.start.bind(source);
      source.start = (...args) => {
        let fingerprint = 2166136261;
        for (const sample of source.buffer?.getChannelData(0) ?? []) fingerprint = Math.imul(fingerprint ^ Math.round(sample * 1e6), 16777619);
        observation.voices.push({ loop: source.loop, fingerprint }); return start(...args);
      };
      return source;
    }
  };
  window.napplet = { storage: { async getItem() { observation.hydrated = true; return null; }, async setItem(key, value) { observation.writes.push({ key, value }); } } };
  if (mode === 'wire') window.napplet.gamepad = {};
  if (mode === 'binding') {
    let state = { available: true, focused: false, pads: [] };
    const handlers = new Set();
    window.addEventListener('message', event => {
      if (event.source !== parent || event.data?.type !== 'gamepad.state') return;
      state = event.data; for (const handler of handlers) handler(state);
    });
    window.napplet.gamepad = { get available() { return state.available; }, get focused() { return state.focused; }, getGamepads: () => state.pads, onChange: handler => { handlers.add(handler); return { close: () => { handlers.delete(handler); observation.closed++; } }; } };
    // Runtime-provided bindings may subscribe at install, per the draft.
    parent.postMessage({ type: 'gamepad.subscribe' }, '*');
  }
}
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const harness = `<!doctype html><body style="margin:0"><iframe id="napplet" title="Gamepad fixture" sandbox="allow-scripts" allow="gamepad 'none'" style="border:0;width:900px;height:600px"></iframe><script>
const built = ${json(built)}, install = ${json(installFixture.toString())};
window.messages = [];
window.send = state => document.querySelector('iframe').contentWindow.postMessage({ type: 'gamepad.state', ...state }, '*');
window.neutral = () => ({ available: true, focused: true, pads: [{ index: 3, id: 'Fixture standard pad', mapping: 'standard', connected: true, timestamp: 1, axes: [0,0,0,0], buttons: Array.from({length:17}, () => ({value:0,pressed:false,touched:false})) }] });
addEventListener('message', event => {
 if (event.source !== document.querySelector('iframe').contentWindow || !event.data?.type?.startsWith('gamepad.')) return;
 window.messages.push(event.data);
 if (event.data.type === 'gamepad.subscribe') window.send(window.neutral());
});
window.mount = mode => {
 window.messages = [];
 const injected = '<script>(' + install + ')(' + JSON.stringify(mode) + ')<' + '/script>';
 document.querySelector('iframe').srcdoc = built.replace('<head>', '<head>' + injected);
};
window.mount('wire');</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const evidence = { artifact: 'unchanged production module in opaque allow-scripts iframe', shell: 'canonical NAP-GAMEPAD PR #108 snapshot fixture; no physical-controller or Kehto claim', scenarios: [], errors: [], external: [] };
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.setDefaultTimeout(8000); await page.clock.install();
  const cdp = await page.context().newCDPSession(page), contexts = new Map();
  cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context));
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
  cdp.on('Runtime.executionContextsCleared', () => contexts.clear()); await cdp.send('Runtime.enable');
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.route('**/*', route => { if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue(); evidence.external.push(route.request().url()); return route.abort(); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  let frame;
  async function currentFrame() {
    frame = await (await page.locator('#napplet').elementHandle()).contentFrame();
    await frame.waitForFunction(() => window.gamepadFixture?.hydrated);
    await frame.locator('#play').waitFor();
  }
  await currentFrame(); await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50);
  const advance = ms => page.clock.runFor(ms);
  async function gameObject() {
    const { frameTree } = await cdp.send('Page.getFrameTree');
    const context = [...contexts.values()].find(candidate => candidate.auxData?.frameId === frameTree.childFrames[0].frame.id && candidate.auxData?.isDefault);
    const { result: handler } = await cdp.send('Runtime.evaluate', { contextId: context.id, includeCommandLineAPI: true, expression: 'getEventListeners(document.getElementById("pause")).click[0].listener' });
    const details = await cdp.send('Runtime.getProperties', { objectId: handler.objectId, ownProperties: true });
    const scopes = details.internalProperties.find(property => property.name === '[[Scopes]]').value;
    const list = await cdp.send('Runtime.getProperties', { objectId: scopes.objectId, ownProperties: true });
    for (const scope of list.result) {
      if (!scope.value?.objectId || scope.value.description === 'Global') continue;
      const bindings = await cdp.send('Runtime.getProperties', { objectId: scope.value.objectId, ownProperties: true });
      for (const binding of bindings.result) {
        if (binding.value?.type !== 'object' || !binding.value.objectId) continue;
        const match = await cdp.send('Runtime.callFunctionOn', { objectId: binding.value.objectId, returnByValue: true, functionDeclaration: 'function() { return this?.rows instanceof Map && typeof this.move === "function" && typeof this.update === "function" && Array.isArray(this.mobs); }' });
        if (match.result.value) return binding.value.objectId;
      }
    }
    throw new Error('Live game not found through debugger scopes.');
  }
  async function onGame(fn, ...args) {
    const result = await cdp.send('Runtime.callFunctionOn', { objectId: await gameObject(), functionDeclaration: fn.toString(), returnByValue: true, arguments: args.map(value => ({ value })) });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const snapshot = () => onGame(function () { return { state: this.state, x: this.x, y: this.y, score: this.maxY, time: this.time, health: this.health }; });
  async function send(buttons = [], axes = [0, 0], overrides = {}) {
    await page.evaluate(({ buttons, axes, overrides }) => {
      const state = window.neutral(); state.pads[0].axes = axes;
      state.pads[0].buttons.forEach((button, i) => { button.value = buttons.includes(i) ? 1 : 0; button.pressed = button.touched = buttons.includes(i); });
      window.send({ ...state, ...overrides });
    }, { buttons, axes, overrides });
    // postMessage is asynchronous; flush its task without advancing simulation.
    await frame.evaluate(() => Promise.resolve());
    await advance(1);
  }
  async function press(button) { await send(); await send([button]); await advance(20); await send(); }
  async function focusControl(selector) {
    for (let step = 0; step < 24; step++) {
      if (await frame.locator(selector).evaluate(node => node === document.activeElement)) return;
      await press(13);
    }
    assert.fail(`D-pad could not reach ${selector}; focused ${await frame.evaluate(() => document.activeElement.id)}`);
  }
  async function resize(width, height) {
    await page.locator('#napplet').evaluate((element, size) => { element.style.width = `${size.width}px`; element.style.height = `${size.height}px`; }, { width, height });
    await advance(100);
  }
  async function clearLanes() { await onGame(function () { this.waveRow = -100; this.ensureRows(); for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null }); }); }
  const effects = () => frame.evaluate(() => window.gamepadFixture.voices.filter(voice => !voice.loop));

  for (const mode of ['wire', 'binding']) {
    if (mode !== 'wire') { await page.evaluate(mode => window.mount(mode), mode); await currentFrame(); }
    await frame.waitForFunction(() => document.querySelector('#character-call').textContent.includes('· X'));
    assert.equal(await frame.evaluate(() => location.origin), 'null');
    assert.equal(await page.locator('#napplet').getAttribute('sandbox'), 'allow-scripts');
    await focusControl('[data-run-topic="help"]');
    await send([0, 13]); await advance(600);
    assert.equal(await frame.locator('#run-menu-reader').isVisible(), true, 'A opens ready instructions');
    assert.equal(await frame.evaluate(() => document.activeElement.id), 'run-menu-back', 'held input is reseeded when the ready menu changes view');
    assert.equal((await snapshot()).state, 'ready'); await send(); await press(1);
    assert.equal(await frame.locator('#run-menu-reader').isHidden(), true, 'B returns from instructions without starting');
    await press(0); assert.equal((await snapshot()).state, 'playing', `${mode}: A starts`); await clearLanes();
    await frame.locator('#character-call').click();
    const quack = (await effects()).at(-1).fingerprint; await advance(500);
    const first = await snapshot(); await send([12]); await advance(170); await send();
    assert.equal((await snapshot()).y, first.y + 1, `${mode}: D-pad moves forward`);
    await send([], [1, 0]); await advance(650); await send();
    assert.ok((await snapshot()).x >= first.x + 3, `${mode}: held stick repeats`);
    const beforeDrift = await snapshot(); await send([], [.25, -.25]); await advance(400); await send();
    assert.equal((await snapshot()).x, beforeDrift.x, 'stick drift does not move');
    const beforeCall = (await effects()).filter(effect => effect.fingerprint === quack).length;
    await press(2); assert.equal((await effects()).filter(effect => effect.fingerprint === quack).length, beforeCall + 1, `${mode}: X plays actual character call`);
    await press(9); assert.equal((await snapshot()).state, 'paused'); const paused = await snapshot(); await advance(800); assert.equal((await snapshot()).time, paused.time);
    await resize(320,560); await focusControl('[data-pause-topic="power"]');
    await send([0, 13]); await advance(600);
    assert.equal(await frame.locator('#pause-reader').isVisible(), true, 'A opens compact pause information');
    assert.equal(await frame.evaluate(() => document.activeElement.id), 'pause-back', 'held input is reseeded when the pause menu changes view');
    await send(); await press(1);
    assert.equal(await frame.locator('#pause-reader').isHidden(), true, 'B returns to pause home');
    await press(0); assert.equal((await snapshot()).state, 'playing', 'A resumes');
    await resize(900,600);
    await press(3); assert.equal(await frame.locator('#drawer').isVisible(), true); assert.equal((await snapshot()).state, 'paused');
    assert.equal(await frame.evaluate(() => document.activeElement.id), 'collection-sections', 'opening the collection focuses its section menu');
    await focusControl('#collection-next'); await press(0);
    assert.equal(await frame.locator('#collection-traveler-name').innerText(), 'Sunny', 'D-pad and A browse the next traveler');
    await focusControl('#collection-traveler-select');
    await press(0); assert.equal(await frame.locator('#drawer').isVisible(), true, 'A selects the focused traveler');
    assert.equal(await frame.locator('#collection-traveler-select').getAttribute('aria-pressed'), 'true');
    await focusControl('#collection-sections'); await send([0, 13]); await advance(600);
    assert.equal(await frame.locator('#collection-menu').isVisible(), true, 'A opens collection sections');
    assert.equal(await frame.locator('button[data-collection-tab="travelers"]').evaluate(node => node === document.activeElement), true, 'held input is reseeded when collection changes view');
    await send(); await focusControl('button[data-collection-tab="sounds"]'); await press(0);
    assert.equal(await frame.locator('#sound-pack').isVisible(), true, 'controller opens sound settings');
    await press(1); assert.equal(await frame.locator('#drawer').isVisible(), false); assert.equal((await snapshot()).state, 'playing', 'B closes collection and restores run');
    await send([12]); await advance(170); await send([], [0, 0], { focused: false }); await advance(20);
    assert.equal((await snapshot()).state, 'paused', 'shell focus loss pauses before wave can kill');
    const unfocused = await snapshot(); await advance(800); assert.equal((await snapshot()).time, unfocused.time);
    await send([0, 12]); await advance(600); assert.equal((await snapshot()).state, 'paused', 'held input on focus return does not resume');
    await press(0); assert.equal((await snapshot()).state, 'playing');
    await send([], [0, 0], { pads: [] }); await advance(20); assert.equal((await snapshot()).state, 'paused', 'disconnect pauses');
    assert.equal(await frame.locator('#gamepad-help').isHidden(), true);
    await send([0]); await advance(20); assert.equal((await snapshot()).state, 'paused', 'reconnect held A does not resume');
    await press(0); assert.equal((await snapshot()).state, 'playing');
    await onGame(function () { this.end('Fixture train encounter.', 'train'); }); await advance(400);
    assert.equal((await snapshot()).state, 'dead');
    await resize(320,560); await focusControl('[data-run-topic="stats"]');
    await send([0, 13]); await advance(600);
    assert.equal(await frame.locator('#run-menu-stat-page').isVisible(), true, 'A opens result stats');
    assert.equal(await frame.evaluate(() => document.activeElement.id), 'run-menu-back', 'held input is reseeded when results change view');
    await send(); await press(1); await focusControl('[data-run-topic="seed"]'); await press(0);
    assert.equal(await frame.locator('#run-seed-code').isVisible(), true, 'A opens compact seed page');
    await focusControl('#run-seed-code'); await press(0);
    assert.match(await frame.locator('#copy-seed-status').innerText(), /copied|Copy/i, 'controller invokes seed copy or manual fallback');
    assert.equal((await snapshot()).state, 'dead', 'copying through A never retries');
    await press(1); assert.equal(await frame.locator('#run-menu-reader').isHidden(), true, 'B returns from seed page without retrying');
    await press(0); assert.equal((await snapshot()).state, 'playing', 'A retries'); assert.equal((await snapshot()).score, 0);
    await resize(900,600);
    assert.ok(await frame.evaluate(() => window.gamepadFixture.writes.length > 0), 'actual SDK storage operation records completed run');
    await send([12]); await advance(170); await page.locator('#napplet').evaluate(element => { element.style.width = '200px'; element.style.height = '160px'; }); await advance(50);
    const small = await snapshot(); assert.equal(small.state, 'paused'); await advance(600); assert.equal((await snapshot()).time, small.time);
    await page.locator('#napplet').evaluate(element => { element.style.width = '900px'; element.style.height = '600px'; }); await advance(50);
    await send([0]); await advance(50); assert.equal((await snapshot()).state, 'paused', 'enlargement does not act on old held input');
    await press(0); assert.equal((await snapshot()).state, 'playing');
    const beforeClose = await page.evaluate(() => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length);
    await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
    if (mode === 'wire') {
      await page.waitForFunction(count => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length === count + 1, beforeClose);
    } else assert.equal(await frame.evaluate(() => window.gamepadFixture.closed), 1, 'binding listener closed');
    const done = await snapshot(); await send([0, 12]); await advance(600); assert.deepEqual(await snapshot(), done, 'pagehide cancels input and simulation');
    const messages = await page.evaluate(() => window.messages);
    assert.ok(messages.every(message => Object.keys(message).length === 1 && ['gamepad.subscribe', 'gamepad.unsubscribe'].includes(message.type)), 'canonical no-ID messages');
    evidence.scenarios.push({ mode, controls: ['ready instructions and view-change input seeding', 'start', 'D-pad', 'stick repeat', 'deadzone', 'character call PCM', 'pause information/resume and input seeding', 'collection traveler/section/sound navigation and input seeding', 'shell focus', 'disconnect/reconnect', 'result stats/seed copy/back/retry and input seeding', 'small frame', 'teardown'], messages });
  }
  await page.evaluate(() => window.mount('absent')); await currentFrame();
  assert.equal(await frame.locator('#gamepad-help').isHidden(), true); await send(); await send([0, 12]); await advance(500);
  assert.equal((await snapshot()).state, 'ready'); assert.deepEqual(await page.evaluate(() => window.messages), []);
  await frame.locator('#play').click(); assert.equal((await snapshot()).state, 'playing');
  await frame.locator('[data-direction="forward"]').click(); await advance(170); assert.equal((await snapshot()).score, 1, 'pointer controls work without gamepad domain');
  evidence.scenarios.push({ mode: 'absent', controls: ['no probe or subscription', 'unsolicited snapshots ignored', 'pointer fallback'] });
  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  await writeFile(new URL('../artifacts/gamepad-runtime.json', import.meta.url), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
