// Production artifact, actual SDK adapter and an opaque allow-scripts iframe.
// The runtime fixture owns delivery queuing. CDP reads live module state and
// stages terrain/stock only; no app-side test hooks or replacement SDK modules.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const evidence = { artifact: 'Production build in opaque allow-scripts iframe',
  fixture: 'Muted Chromium; injected runtime queues NAP-INTENT deliveries until SDK subscription. CDP re-resolves live Game after resets.',
  scenarios: [], errors: [], external: [] };
const delivery = payload => ({ sender: 'fixture-game-launcher', archetype: 'game', action: 'open', convention: 'napplet:game/open', ...(payload === undefined ? {} : { payload }) });

function installFixture(options) {
  const f = window.gameIntentFixture = {
    writes: [], handlers: {}, order: [], closed: 0, subscribed: 0,
    hydrated: false, audioContexts: 0, deliveries: 0,
  };
  const nativeAudioContext = window.AudioContext;
  if (nativeAudioContext) window.AudioContext = new Proxy(nativeAudioContext, {
    construct(target, args) { f.audioContexts++; return Reflect.construct(target, args); },
  });
  const queue = options.initial ? [options.initial] : [], listeners = new Set();
  f.deliver = value => {
    if (!listeners.size) { queue.push(value); return; }
    for (const listener of listeners) { f.deliveries++; listener(value); }
  };
  f.releaseStorage = () => {};
  window.napplet = {
    storage: {
      async getItem() {
        f.order.push('storage:start');
        if (options.delayStorage) await new Promise(resolve => { f.releaseStorage = resolve; });
        f.hydrated = true; f.order.push('storage:done');
        return JSON.stringify({ mode: 'arcade', coins: 7, runs: 3, muted: true, selected: 'butter', travelerVersion: 2 });
      },
      async setItem(key, value) { f.writes.push({ key, value }); },
    },
    theme: {
      async get() { f.order.push('theme'); return { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }; },
      onChanged() { return { close() {} }; },
    },
    keys: {
      async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; },
      onAction(id, fn) { f.handlers[id] = fn; return { close() { delete f.handlers[id]; } }; },
      unregisterAction() {},
    },
  };
  if (options.domain !== 'absent') window.napplet.intent = options.domain === 'legacy' ? { async invoke() {} } : {
    onDelivery(listener) {
      f.subscribed++; f.order.push('intent:subscribe');
      if (options.domain === 'throws') throw new Error('Fixture intent subscription unavailable');
      listeners.add(listener);
      for (const value of queue.splice(0)) { f.deliveries++; listener(value); }
      let closed = false;
      return { close() { if (!closed) { closed = true; f.closed++; listeners.delete(listener); } } };
    },
  };
}

const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
async function setup(options = {}) {
  const injected = `<script>(${installFixture.toString()})(${JSON.stringify(options)});</script>`;
  const harness = `<!doctype html><style>html,body{margin:0;overflow:hidden}iframe{display:block;border:0;width:900px;height:600px}</style><iframe title="Game intent fixture" sandbox="allow-scripts"></iframe><script>document.querySelector('iframe').srcdoc=${json(built.replace('<head>', '<head>' + injected))};</script>`;
  const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.setDefaultTimeout(8000); await page.clock.install();
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    evidence.external.push(route.request().url()); return route.abort();
  });
  const cdp = await page.context().newCDPSession(page), contexts = new Map();
  cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context));
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
  cdp.on('Runtime.executionContextsCleared', () => contexts.clear());
  await cdp.send('Runtime.enable'); await page.goto(`http://127.0.0.1:${server.address().port}`);
  const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.waitForFunction(() => window.gameIntentFixture?.order.includes('storage:start'));
  const ready = async () => {
    await frame.waitForFunction(() => !!window.gameIntentFixture.handlers['puddlehop.market']);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
    assert.equal(await frame.evaluate(() => location.origin), 'null');
    assert.equal(await frame.locator('#sound-toggle').getAttribute('aria-pressed'), 'true');
  };
  if (!options.delayStorage) await ready();
  // Do not cache the Game object: a valid launch deliberately replaces it.
  async function onGame(fn, ...args) {
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
        if (!match.result.value) continue;
        const result = await cdp.send('Runtime.callFunctionOn', { objectId: binding.value.objectId, functionDeclaration: fn.toString(), returnByValue: true, arguments: args.map(value => ({ value })) });
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
      }
    }
    throw new Error('Game was not found through production debugger scope.');
  }
  const snapshot = () => onGame(function () { return {
    seed: this.seedCode, state: this.state, mode: this.mode, score: this.maxY, time: this.time,
    health: this.health, wallet: this.run.wallet, cards: this.run.cards, cosmetics: this.run.cosmetics,
    pending: this.run.pendingPack, market: this.run.market, open: this.run.isOpen,
  }; });
  const send = value => frame.evaluate(value => window.gameIntentFixture.deliver(value), value);
  const advance = ms => page.clock.runFor(ms);
  return { page, frame, ready, onGame, snapshot, send, advance,
    async close() { await browser.close(); await new Promise(resolve => server.close(resolve)); } };
}

const initialCode = 'ph2-1234abcd-pond-s-n';
const app = await setup({ delayStorage: true, initial: delivery({ seed: initialCode }) });
try {
  const { frame, ready, onGame, snapshot, send, advance } = app;
  assert.equal(await frame.evaluate(() => window.gameIntentFixture.subscribed), 0, 'hydrate before subscribing to queued launch delivery');
  await frame.evaluate(() => window.gameIntentFixture.releaseStorage()); await ready();
  assert.equal((await snapshot()).seed, initialCode);
  assert.equal((await snapshot()).state, 'ready', 'external launch prepares a run without auto-play');
  assert.match(await frame.locator('#mode').textContent(), /Stroll/);
  assert.match(await frame.locator('#chase-instructions').textContent(), /No wave/);
  assert.deepEqual(await frame.evaluate(() => window.gameIntentFixture.order.slice(0, 4)), ['storage:start', 'storage:done', 'intent:subscribe', 'theme']);
  assert.equal(await frame.evaluate(() => window.gameIntentFixture.audioContexts), 0, 'queued launch does not unlock sound');
  evidence.scenarios.push('Queued seed survives delayed storage hydration; mode/help reflect seed; launches stay ready and silent.');

  const invalid = [
    delivery(null), delivery([]), delivery('seed'), delivery({ seed: 7 }), delivery({ seed: 'ph99-1234abcd-pond-s-n' }),
    delivery({ seed: `${initialCode}\n` }), delivery({ seed: initialCode, mode: 'arcade' }), delivery({ mode: 'race' }),
    delivery({ score: 1000 }), delivery({ seed: initialCode, coins: 1000 }),
    { ...delivery({ mode: 'stroll' }), convention: 'napplet:game/open?mode=stroll' },
    { ...delivery({ mode: 'stroll' }), action: 'restart' }, { ...delivery(), archetype: 'note' },
  ];
  const beforeInvalid = await snapshot();
  for (const value of invalid) { await send(value); assert.deepEqual(await snapshot(), beforeInvalid, `Rejected delivery ${JSON.stringify(value)}`); }
  evidence.scenarios.push(`${invalid.length} malformed, unsupported, unknown-field or mismatched deliveries preserve the run.`);

  await frame.locator('#choose').click(); await advance(32);
  assert.equal(await frame.locator('#drawer').isVisible(), true);
  const browsing = await snapshot(); await send(delivery()); await send(delivery({}));
  assert.deepEqual(await snapshot(), browsing);
  assert.equal(await frame.locator('#drawer').isVisible(), true, 'plain open does not dismiss the current menu');
  await frame.locator('#close-drawer').click(); await advance(32);

  for (const code of ['ph1-10203040-pond-a-g', 'ph2-10203040-pond-s-n', 'ph3-10203040-pond-a-n']) {
    await send(delivery({ seed: code })); assert.equal((await snapshot()).seed, code);
    assert.equal((await snapshot()).state, 'ready');
    assert.match(await frame.locator('#mode').textContent(), code.includes('-s-') ? /Stroll/ : /Arcade/);
  }
  await send(delivery({ mode: 'stroll' }));
  assert.equal((await snapshot()).mode, 'stroll'); assert.equal((await snapshot()).state, 'ready');
  assert.match((await snapshot()).seed, /^ph3-[0-9a-f]{8}-[a-z]+-s-/);
  evidence.scenarios.push('Schema 1/2/3 seed replay and mode-only opening prepare the expected ready screen; plain open preserves menus.');

  const liveCode = 'ph3-00c0ffee-pond-s-n'; await send(delivery({ seed: liveCode }));
  await frame.locator('#play').click();
  await onGame(function () {
    for (const lane of this.rows.values()) { Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null }); delete lane.actors; delete lane.coinActor; }
    Object.assign(this.rows.get(1), { coin: 0, coinDenomination: 'small-sack' });
  });
  await frame.locator('[data-direction="forward"]').click(); await advance(500);
  assert.equal((await snapshot()).score, 1); assert.equal((await snapshot()).wallet, 5);
  const active = await snapshot();
  await send(delivery({ seed: 'ph3-00000001-pond-a-n' })); await send(delivery({ seed: liveCode })); await send(delivery({ mode: 'arcade' }));
  assert.deepEqual(await snapshot(), active, 'active run is never restarted by a new or repeated launch');
  await advance(32); // Notifications are painted by the main frame loop.
  assert.match(await frame.locator('#toast').textContent(), /run|finish|playing/i);
  await frame.locator('#pause').click(); await advance(32);
  const paused = await snapshot(); await send(delivery({ mode: 'arcade' }));
  assert.deepEqual(await snapshot(), paused, 'paused run is retained');
  await frame.locator('#play').click();
  await onGame(function () { this.maxY = 25; this.end('Intent replay callback fixture', 'traffic', 'front'); });
  const deadCode = (await snapshot()).seed;
  await send(delivery({ seed: initialCode }));
  assert.equal((await snapshot()).seed, deadCode, 'death presentation cannot be cut off by incoming launch');
  await advance(2000);
  await frame.waitForFunction(() => window.gameIntentFixture.writes.some(write => { const p = JSON.parse(write.value); return p.coins === 12 && p.runs === 4 && p.strollBest === 25; }));
  assert.equal(await frame.locator('#result-score').textContent(), '25');
  await send(delivery({ seed: initialCode }));
  assert.equal((await snapshot()).seed, initialCode); assert.equal((await snapshot()).state, 'ready');
  evidence.scenarios.push('User-started seeded run collects a 5-coin sack and records lifetime coins/best/run count; active, paused and death-spill runs resist replacement; completed run accepts next seed.');

  await frame.locator('#play').click();
  await onGame(function () {
    this.x = this.fromX = 0; this.y = this.fromY = this.maxY = 99; this.hop = 0; this.waveRow = 0; this.ensureRows(); this.mobs.splice(0);
    for (const lane of this.rows.values()) { Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null }); delete lane.actors; delete lane.coinActor; }
    this.run.creditCoins(100);
  });
  await frame.locator('[data-direction="forward"]').click(); await advance(500);
  await frame.locator('#market-open').click(); await advance(300);
  const packResult = await onGame(function () {
    const card = [...this.run.catalog.values()].find(item => item.kind === 'card' && item.rarity === 'common');
    const pack = this.run.catalog.get('pack-satchel');
    this.run.market.offers = [card, pack].map((item, index) => ({ id: `intent-fixture-${index}`, itemId: item.id, price: item.price, sold: false, section: index ? 'rare' : 'cards' }));
    return [this.run.buy('intent-fixture-0').ok, this.run.buy('intent-fixture-1').ok];
  });
  assert.deepEqual(packResult, [true, true]); await advance(32);
  const packOpen = await snapshot(); assert.ok(packOpen.pending); assert.equal(packOpen.cards.length, 1);
  assert.equal(await frame.locator('#market').isVisible(), true);
  await send(delivery()); await send(delivery({ seed: 'ph3-00000001-pond-a-n' }));
  assert.deepEqual(await snapshot(), packOpen);
  assert.equal(await frame.locator('#market').isVisible(), true, 'delivery preserves the current pack page');
  evidence.scenarios.push('Plain/new seeded opens preserve market view, owned card, paid pack choices and unspent wallet.');

  await frame.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  assert.equal(await frame.evaluate(() => window.gameIntentFixture.closed), 1);
  const delivered = await frame.evaluate(() => window.gameIntentFixture.deliveries);
  await send(delivery({ seed: initialCode }));
  assert.equal(await frame.evaluate(() => window.gameIntentFixture.deliveries), delivered, 'disposed app no longer receives deliveries');
  assert.equal(await frame.evaluate(() => Object.keys(window.gameIntentFixture.handlers).length), 0);
  evidence.scenarios.push('Pagehide closes the SDK delivery subscription and shortcut bindings.');
} finally { await app.close(); }

const earlyPlay = await setup({ delayStorage: true, initial: delivery({ seed: initialCode }) });
try {
  await earlyPlay.frame.locator('#play').click();
  await earlyPlay.onGame(function () {
    for (const lane of this.rows.values()) { Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null }); delete lane.actors; delete lane.coinActor; }
  });
  await earlyPlay.frame.locator('[data-direction="forward"]').click(); await earlyPlay.advance(500);
  const started = await earlyPlay.snapshot();
  await earlyPlay.frame.evaluate(() => window.gameIntentFixture.releaseStorage()); await earlyPlay.ready();
  const hydrated = await earlyPlay.snapshot();
  assert.equal(hydrated.seed, started.seed); assert.equal(hydrated.state, 'playing'); assert.equal(hydrated.score, 1);
  assert.equal(await earlyPlay.frame.evaluate(() => window.gameIntentFixture.deliveries), 1);
  evidence.scenarios.push('If a player starts before storage arrives, the queued launch preserves that active run after hydration.');
} finally { await earlyPlay.close(); }

for (const domain of ['absent', 'legacy', 'throws']) {
  const fallback = await setup({ domain });
  try {
    await fallback.frame.locator('#play').click();
    await fallback.onGame(function () {
      for (const lane of this.rows.values()) { Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null }); delete lane.actors; delete lane.coinActor; }
    });
    await fallback.frame.locator('[data-direction="forward"]').click(); await fallback.advance(500);
    assert.equal((await fallback.snapshot()).state, 'playing'); assert.equal((await fallback.snapshot()).score, 1);
    evidence.scenarios.push(`${domain} intent domain leaves normal gameplay and shell shortcuts operational.`);
  } finally { await fallback.close(); }
}

assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
await writeFile(new URL('game-intents-runtime.json', output), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
