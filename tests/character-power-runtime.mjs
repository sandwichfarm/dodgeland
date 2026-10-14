// Built UI integration: CDP stages one rescue and distance milestones on the
// real Game. No production debug API is added and this is not a natural run.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.ok(built.includes('character-power-status') && built.includes('Chicken Out'), 'Build character powers before running this fixture.');
function installFixture() {
  Math.random = () => .125;
  const fixture = window.powerFixture = { writes: [], listeners: [] };
  let theme = { colors: { background: '#152821', text: '#f3ecd4', primary: '#e6c164' } };
  fixture.theme = value => { theme = value; fixture.listeners.forEach(listener => listener(theme)); };
  window.napplet = {
    theme: { async get() { return theme; }, onChanged(listener) { fixture.listeners.push(listener); return { close() {} }; } },
    storage: {
      async getItem() { return JSON.stringify({ travelerVersion: 2, selected: 'butter', coins: 1000, best: 1000, mode: 'stroll', muted: true }); },
      async setItem(key, value) { fixture.writes.push({ key, value }); },
    },
  };
}
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const artifact = built.replace('<head>', `<head><script>(${installFixture.toString()})();</script>`);
const harness = `<!doctype html><body style="margin:0"><iframe title="Character powers fixture" sandbox="allow-scripts" style="width:900px;height:600px;border:0"></iframe><script>document.querySelector('iframe').srcdoc=${json(artifact)};</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const evidence = { artifact: 'Production artifact in an opaque allow-scripts iframe', scenarios: [], frames: [], errors: [] };
await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
let browser;
try {
  browser = await chromium.launch({ args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.setDefaultTimeout(8000); await page.clock.install();
  page.on('pageerror', error => evidence.errors.push(error.message));
  const cdp = await page.context().newCDPSession(page), contexts = new Map();
  cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context));
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
  await cdp.send('Runtime.enable');
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.waitForFunction(() => !!window.powerFixture?.listeners.length && document.querySelector('#character-power-name')?.textContent);
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
  const advance = ms => page.clock.runFor(ms);
  async function gameObject() {
    const { frameTree } = await cdp.send('Page.getFrameTree');
    const context = [...contexts.values()].find(value => value.auxData?.frameId === frameTree.childFrames[0].frame.id && value.auxData?.isDefault);
    const { result: handler } = await cdp.send('Runtime.evaluate', { contextId: context.id, includeCommandLineAPI: true, expression: 'getEventListeners(document.getElementById("pause")).click[0].listener' });
    const details = await cdp.send('Runtime.getProperties', { objectId: handler.objectId, ownProperties: true });
    const scopes = details.internalProperties.find(value => value.name === '[[Scopes]]').value;
    const list = await cdp.send('Runtime.getProperties', { objectId: scopes.objectId, ownProperties: true });
    for (const scope of list.result) {
      if (!scope.value?.objectId || scope.value.description === 'Global') continue;
      const bindings = await cdp.send('Runtime.getProperties', { objectId: scope.value.objectId, ownProperties: true });
      for (const binding of bindings.result) {
        if (binding.value?.type !== 'object' || !binding.value.objectId) continue;
        const match = await cdp.send('Runtime.callFunctionOn', { objectId: binding.value.objectId, returnByValue: true,
          functionDeclaration: 'function() { return this?.rows instanceof Map && typeof this.setCharacter === "function" && typeof this.update === "function"; }' });
        if (match.result.value) return binding.value.objectId;
      }
    }
    throw new Error('Actual Game not found in debugger scope.');
  }
  async function onGame(fn, ...args) {
    const result = await cdp.send('Runtime.callFunctionOn', { objectId: await gameObject(), functionDeclaration: fn.toString(), returnByValue: true, arguments: args.map(value => ({ value })) });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const meter = () => frame.locator('#character-power').evaluate(el => ({
    name: el.getAttribute('aria-label'), value: Number(el.getAttribute('aria-valuenow')), max: Number(el.getAttribute('aria-valuemax')),
    description: el.getAttribute('aria-valuetext'), status: document.querySelector('#character-power-status').textContent,
  }));
  assert.equal(await frame.evaluate(() => location.origin), 'null');
  assert.equal((await meter()).status, 'Ready');
  assert.match(await frame.locator('#ready-power').textContent(), /Automatic.*100 new blocks/);
  await frame.locator('#play').click(); await advance(32);
  await onGame(function () {
    this.y = this.fromY = this.maxY = 32; this.ensureRows();
    Object.assign(this.rows.get(31), { kind: 'meadow', blocked: [], decorations: [], coin: null });
    this.end('Water rescue fixture', 'water');
  }); await advance(32);
  const rescued = await onGame(function () { return { state: this.state, remaining: this.powerRemaining, power: this.power.name }; });
  assert.equal(rescued.state, 'playing'); assert.equal(rescued.remaining, 100);
  assert.equal((await meter()).value, 0); assert.equal((await meter()).status, '100 blocks');
  assert.ok((await frame.locator('#toast').textContent()).includes(rescued.power));
  assert.equal(await frame.locator('#character-power').evaluate(el => el.classList.contains('activated')), true);
  evidence.scenarios.push('Water rescue invokes real main callback, keeps playing, announces activation despite a chapter change and changes independent power meter to 100-block recharge.');
  await advance(700);

  await frame.locator('#collection').click(); await advance(16);
  const travelers = new Set();
  for (let index = 0; index < 7; index++) {
    travelers.add(await frame.locator('#collection-traveler-name').textContent());
    assert.ok(await frame.locator('#collection-power-name').textContent(), 'Every traveler lists a named power.');
    assert.match(await frame.locator('#collection-power-copy').textContent(), /Automatic.*100 new blocks/, 'Every traveler lists automatic activation and cooldown.');
    await frame.locator('#collection-next').click();
  }
  assert.equal(travelers.size, 7);
  await frame.locator('#collection-next').click();
  assert.equal(await frame.locator('#collection-traveler-name').textContent(), 'Sunny');
  await frame.locator('#collection-traveler-select').click(); await advance(32);
  const switched = await onGame(function () { return { character: this.characterId, remaining: this.powerRemaining, power: this.power.name }; });
  assert.equal(switched.character, 'sunny'); assert.equal(switched.remaining, 100);
  assert.equal((await meter()).name, switched.power);
  assert.match(await frame.locator('#pause-power').textContent(), /100 blocks.*Automatic.*100 new blocks/);
  await frame.locator('#close-drawer').click(); await advance(32);
  await frame.locator('#pause').click(); await advance(16);
  await advance(5000); assert.equal((await meter()).status, '100 blocks', 'Waiting while paused does not recharge.');
  await onGame(function () { this.y = this.fromY = this.maxY += 99; this.ensureRows(); }); await advance(16);
  assert.equal((await meter()).status, '1 block'); assert.equal((await meter()).value, 99);
  await onGame(function () { this.y = this.fromY = ++this.maxY; this.ensureRows(); }); await advance(16);
  assert.equal((await meter()).status, 'Ready'); assert.equal((await meter()).value, 100);
  evidence.scenarios.push('Sunny selection updates the active power while keeping shared recharge; meter and pause description follow 99/100 new distance thresholds.');

  await frame.locator('#choose').click(); await frame.locator('#camp-tab').click(); await frame.locator('#reduced-motion').check();
  await frame.locator('#close-drawer').click(); await advance(16);
  assert.equal(await frame.locator('#character-power-fill').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  for (const theme of ['dark', 'light']) {
    await frame.evaluate(theme => window.powerFixture.theme({ colors: theme === 'dark' ? { background: '#152821', text: '#f3ecd4', primary: '#e6c164' } : { background: '#f4f2df', text: '#263c38', primary: '#477763' } }), theme);
    for (const [width, height] of [[200, 160], [240, 240], [320, 560], [900, 600], [2400, 1200]]) {
      await page.setViewportSize({ width: Math.max(1000, width), height: Math.max(700, height) });
      await page.locator('iframe').evaluate((el, size) => { el.style.width = `${size.width}px`; el.style.height = `${size.height}px`; }, { width, height }); await advance(64);
      if (width < 240) {
        assert.equal(await frame.locator('.too-small').isVisible(), true);
        assert.equal(await frame.locator('#character-power').isVisible(), false);
      } else for (const state of ['paused', 'ready']) {
        await onGame(function (state) { this.state = state; }, state); await advance(32);
        const layout = await frame.evaluate(() => {
          const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
          return { play: box('#play'), panel: box('#run-panel'), overflows: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
            fill: getComputedStyle(document.querySelector('#run-panel')).backgroundColor };
        });
        assert.equal(await frame.locator('#character-power').isVisible(), false, 'Modal board hides the gameplay HUD.');
        assert.ok(layout.play.top >= 0 && layout.play.bottom <= height, 'Primary action is visible.');
        assert.ok(layout.panel.top >= 0 && layout.panel.bottom <= height, 'Run board stays in frame.');
        assert.ok(Math.abs((layout.panel.left + layout.panel.right) / 2 - width / 2) < 1 && Math.abs((layout.panel.top + layout.panel.bottom) / 2 - height / 2) < 1, 'Ready and pause boards share centered positioning.');
        assert.equal(layout.overflows, false); assert.notEqual(layout.fill, 'rgba(0, 0, 0, 0)');
        const inlinePower = frame.locator(`#${state === 'ready' ? 'ready' : 'pause'}-power`);
        let powerText;
        if (await inlinePower.isVisible()) powerText = await inlinePower.textContent();
        else {
          const prefix = state === 'ready' ? 'run-menu' : 'pause';
          await frame.locator(state === 'ready' ? '[data-run-topic="power"]' : '[data-pause-topic="power"]').click(); await advance(32);
          const chunks = [];
          for (let at = 0; at < 30; at++) {
            chunks.push(await frame.locator(`#${prefix === 'pause' ? 'pause-reader' : 'run-menu'}-copy`).textContent());
            if (await frame.locator(`#${prefix}-next`).isDisabled()) break;
            await frame.locator(`#${prefix}-next`).click(); await advance(16);
          }
          powerText = chunks.join(' '); await frame.locator(`#${prefix}-back`).click(); await advance(16);
        }
        assert.match(powerText.replace(/\s+/g, ' '), /Chicken Out.*Automatic.*100 new blocks/, 'Full power information remains reachable in each menu.');
        if ((theme === 'dark' && (width === 900 || width === 240)) || (theme === 'light' && width === 320)) await page.locator('iframe').screenshot({ path: new URL(`../artifacts/character-power-${width}-${theme}-${state}.png`, import.meta.url).pathname });
      }
      if (width >= 240) {
        await onGame(function () { Object.assign(this.lane, { kind: 'meadow', blocked: [], coin: null }); this.state = 'playing'; }); await advance(32);
        assert.equal(await frame.locator('#character-power').isVisible(), true, 'Power meter returns during play, including the smallest frame.');
        const active = await frame.locator('#character-power').evaluate(el => { const r = el.getBoundingClientRect(), pluck = document.querySelector('#pluck').getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, pluckBottom: pluck.bottom }; });
        assert.ok(active.left >= 0 && active.right <= width && active.top >= active.pluckBottom && active.bottom <= height, JSON.stringify(active));
        if ((theme === 'dark' && width === 900) || (theme === 'light' && width === 320)) await page.locator('iframe').screenshot({ path: new URL(`../artifacts/character-power-${width}-${theme}-playing.png`, import.meta.url).pathname });
        await onGame(function () { this.pause(); }); await advance(16);
      }
      evidence.frames.push({ width, height, theme });
    }
  }
  evidence.scenarios.push('Both runtime themes, declared minimum, five frame sizes, centered menu boards with full power pages, gameplay HUD spacing and reduced-motion preference.');
  assert.deepEqual(evidence.errors, []);
  await writeFile(new URL('../artifacts/character-power-runtime.json', import.meta.url), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
