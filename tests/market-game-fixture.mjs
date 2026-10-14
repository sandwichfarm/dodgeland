// Built app only. CDP stages game state; every market interaction uses real UI.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

export async function createMarketGameFixture(evidence) {
  const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  function installFixture() {
    const fixture = window.marketGameFixture = { writes: [], handlers: {}, hydrated: false };
    const themes = new Set();
    fixture.theme = { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } };
    fixture.setTheme = theme => { fixture.theme = theme; for (const fn of themes) fn(theme); };
    window.napplet = {
      storage: {
        async getItem() { fixture.hydrated = true; return JSON.stringify({ mode: 'stroll', coins: 0, muted: true, selected: 'butter', travelerVersion: 2 }); },
        async setItem(key, value) { fixture.writes.push({ key, value }); },
      },
      theme: { async get() { return fixture.theme; }, onChanged(fn) { themes.add(fn); return { close() { themes.delete(fn); } }; } },
      keys: {
        async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; },
        onAction(id, fn) { fixture.handlers[id] = fn; return { close() { delete fixture.handlers[id]; } }; },
        unregisterAction() {},
      },
    };
  }
  const artifact = JSON.stringify(built.replace('<head>', `<head><script>(${installFixture.toString()})();</script>`)).replaceAll('<', '\\u003c');
  const harness = `<!doctype html><style>html,body{margin:0;overflow:hidden;background:#111}iframe{display:block;border:0;width:900px;height:600px}</style><iframe title="Market game fixture" sandbox="allow-scripts"></iframe><script>document.querySelector('iframe').srcdoc=${artifact};</script>`;
  const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.setDefaultTimeout(6000);
  await page.clock.install();
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    evidence.external.push(route.request().url()); return route.abort();
  });
  const cdp = await page.context().newCDPSession(page), contexts = new Map();
  cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context));
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
  cdp.on('Runtime.executionContextsCleared', () => contexts.clear());
  await cdp.send('Runtime.enable');
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const iframe = page.locator('iframe');
  const frame = await (await iframe.elementHandle()).contentFrame();
  await frame.waitForFunction(() => window.marketGameFixture?.hydrated && !!window.marketGameFixture.handlers['puddlehop.market']);
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  assert.equal(await frame.evaluate(() => location.origin), 'null');
  const advance = ms => page.clock.runFor(ms);
  let gameId;
  async function onGame(fn, ...args) {
    if (!gameId) {
      const { frameTree } = await cdp.send('Page.getFrameTree');
      const context = [...contexts.values()].find(value => value.auxData?.frameId === frameTree.childFrames[0].frame.id && value.auxData?.isDefault);
      const { result: handler } = await cdp.send('Runtime.evaluate', { contextId: context.id, includeCommandLineAPI: true, expression: 'getEventListeners(document.getElementById("pause")).click[0].listener' });
      const detail = await cdp.send('Runtime.getProperties', { objectId: handler.objectId, ownProperties: true });
      const scopes = await cdp.send('Runtime.getProperties', { objectId: detail.internalProperties.find(value => value.name === '[[Scopes]]').value.objectId, ownProperties: true });
      for (const scope of scopes.result) {
        if (!scope.value?.objectId || scope.value.description === 'Global') continue;
        const bindings = await cdp.send('Runtime.getProperties', { objectId: scope.value.objectId, ownProperties: true });
        for (const binding of bindings.result) {
          if (binding.value?.type !== 'object' || !binding.value.objectId) continue;
          const match = await cdp.send('Runtime.callFunctionOn', { objectId: binding.value.objectId, returnByValue: true, functionDeclaration: 'function(){return this?.rows instanceof Map && typeof this.move === "function" && this.run?.catalog instanceof Map;}' });
          if (match.result.value) gameId = binding.value.objectId;
        }
      }
      assert.ok(gameId, 'Game is discoverable through production debugger scope, with no app test hook');
    }
    const result = await cdp.send('Runtime.callFunctionOn', { objectId: gameId, functionDeclaration: fn.toString(), returnByValue: true, arguments: args.map(value => ({ value })) });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function resize(width, height) {
    await page.setViewportSize({ width: Math.max(width, 900), height: Math.max(height, 600) });
    await iframe.evaluate((node, size) => { node.style.width = `${size.width}px`; node.style.height = `${size.height}px`; }, { width, height });
    await frame.waitForFunction(size => innerWidth === size.width && innerHeight === size.height, { width, height });
    await advance(80);
  }
  async function key(id) { await frame.evaluate(id => window.marketGameFixture.handlers[`puddlehop.${id}`](), id); await advance(250); }
  async function open() {
    if (await frame.locator('#market').isVisible()) return;
    if (await onGame(function () { return this.state === 'paused'; })) await frame.locator('#play').click();
    await frame.locator('#market-open').click(); await advance(300);
  }
  async function stageMarket() {
    await frame.locator('#play').click();
    await onGame(function () {
      this.x = this.fromX = 0; this.y = this.fromY = this.maxY = 99; this.hop = 0;
      this.waveRow = 0; this.ensureRows(); this.mobs.splice(0);
      for (const lane of this.rows.values()) {
        Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
        delete lane.actors; delete lane.coinActor;
      }
      this.run.creditCoins(1000);
    });
    await frame.locator('[data-direction="forward"]').click(); await advance(200);
    assert.equal(await onGame(function () { return this.run.market?.milestone; }), 100);
    await open();
  }
  async function stageOffers(ids, replace = true) {
    const offers = await onGame(function (ids, replace) {
      const offers = ids.map((id, index) => {
        const item = this.run.catalog.get(id);
        return { id: `layout-${this.run.revision}-${index}`, itemId: id, price: item.price, sold: false,
          section: item.kind === 'card' ? 'cards' : item.kind === 'cosmetic' ? 'extras' : 'rare' };
      });
      this.run.market.offers = replace ? offers : [...this.run.market.offers, ...offers];
      this.run.revision++; return offers;
    }, ids, replace);
    await advance(40); return offers;
  }
  return { browser, page, frame, iframe, advance, onGame, resize, key, open, stageMarket, stageOffers,
    async close() { await browser.close(); await new Promise(resolve => server.close(resolve)); } };
}
