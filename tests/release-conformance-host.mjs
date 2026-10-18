// Test-host code only. The production artifact never imports this module/shim.
import assert from 'node:assert/strict';
import { readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const observedJourneys = new WeakSet();
export const isObservedJourney = value => observedJourneys.has(value);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export async function dependencyPackage(name, ownerEntry) {
  const require = createRequire(ownerEntry);
  for (const directory of require.resolve.paths(name) ?? []) {
    const path = resolve(directory, name, 'package.json');
    try {
      const bytes = await readFile(path);
      const metadata = JSON.parse(bytes);
      if (metadata.name === name) return { path: await realpath(path), metadata, sha256: sha(bytes) };
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  throw Error(`Dependency package not found in owning context: ${name}`);
}

// Resolution follows the installed SDK dependency context and public export.
// No guessed pnpm version directory and no new dependency are involved.
export async function resolveOfficialStorage() {
  const sdkEntry = await realpath(fileURLToPath(import.meta.resolve('@napplet/sdk')));
  const sdk = await dependencyPackage('@napplet/sdk', import.meta.url);
  const nap = await dependencyPackage('@napplet/nap', sdkEntry);
  const exportEntry = nap.metadata.exports['./storage/shim']?.import;
  assert.equal(typeof exportEntry, 'string');
  const entry = resolve(dirname(nap.path), exportEntry);
  return { entry, sdkEntry, sdkVersion: sdk.metadata.version, napVersion: nap.metadata.version,
    sdkPackageHash: sdk.sha256, napPackageHash: nap.sha256,
    sdkEntryHash: sha(await readFile(sdkEntry)),
    publicExport: '@napplet/nap/storage/shim', entryHash: sha(await readFile(entry)) };
}

// Serialized into the host prefix. Keep all dependencies explicit arguments.
function installHost(nappletStorage, installStorageShim) {
  const fixture = window.releaseConformance = {
    invocations: [], reads: [], inbound: [], forbidden: [],
    subscriptions: { opened: {}, closed: {}, duplicateClose: 0 },
    keys: {}, shimCleanupCalls: 0, rafDelivered: 0,
  };
  const pendingFrames = new Set(), observers = new Set(), listeners = new Map();
  const describe = target => target === window ? 'window' : 'document';
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
    target.addEventListener = (type, handler, options) => {
      if (['message', 'keydown', 'keyup'].includes(type)) {
        const capture = typeof options === 'boolean' ? options : !!options?.capture;
        const key = `${describe(target)}:${type}:${capture}`;
        const entries = listeners.get(key) ?? new Set(); entries.add(handler); listeners.set(key, entries);
      }
      return add(type, handler, options);
    };
    target.removeEventListener = (type, handler, options) => {
      const capture = typeof options === 'boolean' ? options : !!options?.capture;
      listeners.get(`${describe(target)}:${type}:${capture}`)?.delete(handler);
      return remove(type, handler, options);
    };
  }
  const nativeRaf = window.requestAnimationFrame.bind(window), nativeCancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => {
    const id = nativeRaf(time => { pendingFrames.delete(id); fixture.rafDelivered++; callback(time); });
    pendingFrames.add(id); return id;
  };
  window.cancelAnimationFrame = id => { pendingFrames.delete(id); return nativeCancel(id); };
  const NativeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends NativeObserver {
    observe(...args) { observers.add(this); return super.observe(...args); }
    disconnect() { observers.delete(this); return super.disconnect(); }
  };
  const forbidden = name => () => { fixture.forbidden.push(name); throw Error(`Forbidden authority: ${name}`); };
  navigator.getGamepads = forbidden('navigator.getGamepads');
  for (const name of ['fetch', 'WebSocket', 'EventSource', 'XMLHttpRequest']) window[name] = forbidden(name);
  for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) Object.defineProperty(window, name, {
    configurable: true, get: forbidden(name),
  });
  const observeMessage = event => {
    if (event.data?.type?.startsWith('storage.')) fixture.inbound.push({
      parentSource: event.source === parent, origin: event.origin, data: event.data,
    });
  };
  window.addEventListener('message', observeMessage);
  const closeShim = installStorageShim();
  const subscribe = (kind, closeExtra = () => {}) => {
    fixture.subscriptions.opened[kind] = (fixture.subscriptions.opened[kind] ?? 0) + 1;
    let closed = false;
    return { close() {
      if (closed) { fixture.subscriptions.duplicateClose++; return; }
      closed = true; fixture.subscriptions.closed[kind] = (fixture.subscriptions.closed[kind] ?? 0) + 1; closeExtra();
    } };
  };
  window.napplet = {
    storage: {
      getItem(key) {
        const record = { key, fulfilled: 0, rejected: 0 }; fixture.reads.push(record);
        const promise = nappletStorage.getItem(key);
        promise.then(() => { record.fulfilled++; }, error => { record.rejected++; record.error = error.message; });
        return promise;
      },
      // Deliberately non-async: this returns the exact official invocation promise.
      setItem(key, value) {
        const record = { token: fixture.invocations.length, key, value, fulfilled: 0, rejected: 0 };
        fixture.invocations.push(record);
        const promise = nappletStorage.setItem(key, value);
        promise.then(() => { record.fulfilled++; }, error => { record.rejected++; record.error = error.message; });
        return promise;
      },
    },
    theme: {
      async get() { return { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }; },
      onChanged(callback) { fixture.themeCallback = callback; return subscribe('theme', () => { delete fixture.themeCallback; }); },
    },
    intent: {
      onDelivery(callback) { fixture.intentCallback = callback; return subscribe('intent', () => { delete fixture.intentCallback; }); },
    },
    keys: {
      async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; },
      onAction(id, callback) { fixture.keys[id] = callback; return subscribe('keys', () => { delete fixture.keys[id]; }); },
      unregisterAction(id) { (fixture.unregistered ??= []).push(id); },
    },
  };
  fixture.snapshot = () => ({
    invocations: structuredClone(fixture.invocations), reads: structuredClone(fixture.reads),
    inbound: structuredClone(fixture.inbound), subscriptions: structuredClone(fixture.subscriptions),
    activeKeyHandlers: Object.keys(fixture.keys).length,
    registeredUnregisters: (fixture.unregistered ?? []).length,
    activeFrames: pendingFrames.size, activeObservers: observers.size,
    listeners: Object.fromEntries([...listeners].map(([key, value]) => [key, value.size])),
    forbidden: [...fixture.forbidden], rafDelivered: fixture.rafDelivered,
    installedGlobal: typeof window.napplet === 'object',
    gamepadPresent: !!window.napplet.gamepad, origin: location.origin,
  });
  fixture.cleanupHost = () => {
    fixture.shimCleanupCalls++; closeShim(); window.removeEventListener('message', observeMessage);
  };
}

let bundledRuntime;
async function runtimePrefix() {
  if (bundledRuntime) return bundledRuntime;
  const official = await resolveOfficialStorage();
  // Use Vite's already-installed bundler directly. This loads no project Vite
  // config, dotenv files or signing/deployment configuration and writes no build.
  const { build } = createRequire(import.meta.resolve('vite'))('esbuild');
  const runtimeSource = `import {nappletStorage,installStorageShim} from ${JSON.stringify(official.entry)};(${installHost.toString()})(nappletStorage,installStorageShim);`;
  const result = await build({
    stdin: {
      contents: runtimeSource,
      sourcefile: 'release-conformance-runtime.js', resolveDir: dirname(official.entry),
    },
    bundle: true, write: false, minify: false, format: 'iife', platform: 'browser', target: 'es2022', metafile: true,
  });
  assert.equal(result.outputFiles.length, 1);
  const code = result.outputFiles[0].text;
  const bundledSources = {};
  for (const input of Object.keys(result.metafile.inputs)) {
    const generated = input === 'release-conformance-runtime.js' || input.endsWith('/release-conformance-runtime.js');
    bundledSources[input] = { kind: generated ? 'generated-prefix' : 'installed-package-source',
      sha256: generated ? sha(runtimeSource) : sha(await readFile(resolve(input))) };
  }
  bundledRuntime = { code, hash: sha(code), official: { ...official, bundledSources } };
  return bundledRuntime;
}

export async function collectJourney(scenario, artifactPath) {
  assert.ok(['matching-reply', 'wrong-id', 'wrong-window', 'missing-reply', 'no-invocation'].includes(scenario));
  const artifact = await readFile(artifactPath, 'utf8'), runtime = await runtimePrefix();
  assert.ok(artifact.includes('<head>'));
  const srcdoc = artifact.replace('<head>', `<head><script>${runtime.code.replaceAll('</script', '<\\/script')}</script>`);
  const encoded = JSON.stringify(srcdoc).replaceAll('<', '\\u003c');
  const html = `<!doctype html><style>html,body{margin:0}#app-frame{border:0;width:900px;height:600px}#sibling{display:none}</style>
<iframe id="app-frame" sandbox="allow-scripts"></iframe><iframe id="sibling" sandbox="allow-scripts"></iframe><script>
const frame=document.querySelector('#app-frame'),sibling=document.querySelector('#sibling');
const host=window.conformanceHost={transcript:[],holdWrites:false,held:[],siblingAcks:[],values:new Map(),commits:[]};
host.reply=data=>{host.transcript.push({direction:'in',timestamp:performance.now(),transport:'parent-postMessage',data});frame.contentWindow.postMessage(data,'*');};
host.commitHeld=id=>{const request=host.held.find(data=>data.id===id);if(!request)throw Error('No observed held request');host.values.set(request.key,request.value);host.commits.push({id:request.id,key:request.key,value:request.value});host.reply({type:'storage.set.result',id:request.id});};
host.wrongWindow=data=>sibling.contentWindow.postMessage({type:'conformance-probe',data},'*');
addEventListener('message',event=>{
 if(event.source===sibling.contentWindow&&event.data?.type==='probe-sent'){host.siblingAcks.push(event.data.id);return;}
 if(event.source!==frame.contentWindow||!event.data?.type?.startsWith('storage.'))return;
 const data=event.data;host.transcript.push({direction:'out',timestamp:performance.now(),origin:event.origin,matchedFrameSource:true,data});
 if(data.type==='storage.get')host.reply({type:'storage.get.result',id:data.id,value:host.values.get(data.key)??null});
 else if(data.type==='storage.set'){if(host.holdWrites)host.held.push(data);else{host.values.set(data.key,data.value);host.reply({type:'storage.set.result',id:data.id});}}
});
sibling.srcdoc='<script>addEventListener("message",event=>{if(event.source!==parent||event.data?.type!=="conformance-probe")return;parent.frames[0].postMessage(event.data.data,"*");parent.postMessage({type:"probe-sent",id:event.data.data.id},"*");});<\\/script>';
frame.srcdoc=${encoded};</script>`;
  const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const errors = [], external = [];
  try {
    browser = await chromium.launch({ args: ['--mute-audio'] });
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    page.setDefaultTimeout(8000);
    page.on('pageerror', error => errors.push(error.message));
    const port = server.address().port;
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === `http://127.0.0.1:${port}`) return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    await page.goto(`http://127.0.0.1:${port}`);
    const frame = await (await page.locator('#app-frame').elementHandle()).contentFrame();
    // Back-menu is the last registration in the actual current boot sequence.
    // Readiness does not use a prepopulated status label or any app state hook.
    await frame.waitForFunction(() => !!window.releaseConformance?.keys['puddlehop.back-menu']);
    await frame.waitForFunction(() => window.releaseConformance.reads.every(read => read.fulfilled === 1));
    // The ready board intentionally hides the HUD. Enter the run through its
    // visible Play action; never force-click a hidden preference control.
    await frame.locator('#play').click();
    await frame.locator('#sound-toggle').waitFor({ state: 'visible' });
    await frame.waitForFunction(() => window.releaseConformance.invocations.every(write => write.fulfilled === 1 && write.rejected === 0));
    const baseline = { receiver: await page.evaluate(() => conformanceHost.transcript.length),
      snapshot: await frame.evaluate(() => releaseConformance.snapshot()) };
    assert.equal(baseline.snapshot.origin, 'null');
    assert.equal(baseline.snapshot.gamepadPresent, false);
    await page.evaluate(() => { conformanceHost.holdWrites = true; });
    const checkpoints = [];
    let request;
    if (scenario !== 'no-invocation') {
      await frame.locator('#sound-toggle').click();
      await page.waitForFunction(() => conformanceHost.held.length === 1);
      request = await page.evaluate(() => conformanceHost.held[0]);
      const beforeReply = await frame.evaluate(() => releaseConformance.snapshot());
      const invocation = beforeReply.invocations.at(-1);
      assert.equal(invocation.fulfilled, 0); assert.equal(invocation.rejected, 0);
      assert.equal(invocation.key, request.key); assert.equal(invocation.value, request.value);
      checkpoints.push({ stage: 'before-reply', invocation });
      const reply = { type: 'storage.set.result', id: request.id };
      if (scenario === 'wrong-id') {
        await page.evaluate(data => conformanceHost.reply(data), { ...reply, id: 'unrelated-request-id' });
        await frame.waitForFunction(() => releaseConformance.inbound.some(event => event.data.id === 'unrelated-request-id'));
      } else if (scenario === 'wrong-window') {
        await page.evaluate(data => conformanceHost.wrongWindow(data), reply);
        await page.waitForFunction(id => conformanceHost.siblingAcks.includes(id), request.id);
        await frame.waitForFunction(id => releaseConformance.inbound.some(event => event.data.id === id && !event.parentSource), request.id);
      }
      if (scenario === 'wrong-id' || scenario === 'wrong-window') {
        const snapshot = await frame.evaluate(() => releaseConformance.snapshot());
        assert.equal(snapshot.invocations.at(-1).fulfilled, 0); assert.equal(snapshot.invocations.at(-1).rejected, 0);
        checkpoints.push({ stage: 'mismatched-reply', invocation: snapshot.invocations.at(-1) });
      }
      if (scenario === 'missing-reply') {
        // Observe the official real 5000ms timeout. No replacement clock/timer.
        await frame.waitForFunction(() => releaseConformance.invocations.at(-1)?.rejected === 1);
        const snapshot = await frame.evaluate(() => releaseConformance.snapshot());
        assert.equal(snapshot.invocations.at(-1).fulfilled, 0);
        assert.match(snapshot.invocations.at(-1).error, /timed out/);
        checkpoints.push({ stage: 'real-timeout', invocation: snapshot.invocations.at(-1) });
      } else {
        await page.evaluate(id => conformanceHost.commitHeld(id), request.id);
        await frame.waitForFunction(() => releaseConformance.invocations.at(-1)?.fulfilled === 1);
        await page.evaluate(data => conformanceHost.reply(data), reply);
        await frame.waitForFunction(id => releaseConformance.inbound.filter(event => event.parentSource && event.data.id === id).length >= 2, request.id);
        const snapshot = await frame.evaluate(() => releaseConformance.snapshot());
        assert.equal(snapshot.invocations.at(-1).fulfilled, 1); assert.equal(snapshot.invocations.at(-1).rejected, 0);
        checkpoints.push({ stage: 'matched-and-duplicate', invocation: snapshot.invocations.at(-1) });
      }
    } else {
      await page.waitForTimeout(100);
      const snapshot = await frame.evaluate(() => releaseConformance.snapshot());
      assert.equal(snapshot.invocations.length, baseline.snapshot.invocations.length);
      assert.equal(await page.evaluate(() => conformanceHost.held.length), 0);
    }
    const beforeDispose = await frame.evaluate(() => releaseConformance.snapshot());
    await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
    const afterFirstDispose = await frame.evaluate(() => releaseConformance.snapshot());
    await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(75);
    const afterSecondDispose = await frame.evaluate(() => releaseConformance.snapshot());
    for (const kind of ['keys', 'theme', 'intent']) {
      assert.ok(beforeDispose.subscriptions.opened[kind] > 0);
      assert.equal(afterFirstDispose.subscriptions.closed[kind], beforeDispose.subscriptions.opened[kind]);
      assert.equal(afterSecondDispose.subscriptions.closed[kind], afterFirstDispose.subscriptions.closed[kind]);
    }
    assert.equal(afterSecondDispose.subscriptions.duplicateClose, 0);
    assert.equal(afterSecondDispose.activeFrames, 0); assert.equal(afterSecondDispose.activeObservers, 0);
    assert.equal(afterSecondDispose.rafDelivered, afterFirstDispose.rafDelivered);
    assert.equal(afterSecondDispose.activeKeyHandlers, 0);
    assert.equal(afterSecondDispose.registeredUnregisters, beforeDispose.subscriptions.opened.keys);
    // Product disposal must not be confused with host-installed shim cleanup.
    assert.equal(afterSecondDispose.listeners['window:message:false'], 2);
    await frame.evaluate(() => releaseConformance.cleanupHost());
    const afterHostCleanup = await frame.evaluate(() => releaseConformance.snapshot());
    assert.equal(afterHostCleanup.listeners['window:message:false'], 0);
    assert.deepEqual(afterHostCleanup.forbidden, []); assert.deepEqual(errors, []); assert.deepEqual(external, []);
    const transcript = await page.evaluate(() => conformanceHost.transcript);
    const hostStorage = await page.evaluate(() => ({ commits: conformanceHost.commits, entries: [...conformanceHost.values] }));
    if (scenario !== 'no-invocation' && scenario !== 'missing-reply') {
      assert.deepEqual(hostStorage.commits, [{ id: request.id, key: request.key, value: request.value }]);
      assert.deepEqual(hostStorage.entries.find(([key]) => key === request.key), [request.key, request.value]);
    } else assert.deepEqual(hostStorage.commits, []);
    const sandboxTokens = (await page.locator('#app-frame').getAttribute('sandbox')).split(/\s+/);
    const receipt = { scenario, artifactHash: sha(artifact), runtimeHash: runtime.hash, official: runtime.official,
      sandbox: { allowScripts: sandboxTokens.includes('allow-scripts'), allowSameOrigin: sandboxTokens.includes('allow-same-origin') },
      source: 'actual opaque-frame receiver and official shim promises; test-host-only instrumentation',
      baseline, request: request ?? null, checkpoints, transcript, hostStorage, beforeDispose, afterFirstDispose,
      afterSecondDispose, afterHostCleanup, errors, external,
      scope: { actualStorageWire: true, productSubscriptions: ['keys', 'theme', 'intent'],
        absentGamepad: true, nativePolling: false, hardwareMeasured: false,
        shimTimersCancelled: false, shimCleanupIsHostOwned: true } };
    observedJourneys.add(receipt); return receipt;
  } finally {
    await browser?.close(); await new Promise(resolve => server.close(resolve));
  }
}
