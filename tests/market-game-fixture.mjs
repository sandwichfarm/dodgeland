// Built app only. CDP stages game state; every market interaction uses real UI.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

export async function createMarketGameFixture(evidence, options = {}) {
  const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  function installFixture(options) {
    const fixture = window.marketGameFixture = { writes: [], handlers: {}, hydrated: false, forbidden: [], voices: [] };
    if (options.auditBoundary) {
      const forbidden = name => () => { fixture.forbidden.push(name); throw new Error(`Forbidden browser authority: ${name}`); };
      navigator.getGamepads = forbidden('navigator.getGamepads');
      for (const name of ['fetch', 'WebSocket', 'EventSource']) window[name] = forbidden(name);
      for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(window, name, { configurable: true, get: forbidden(name) });
    }
    if (options.observeAudio) {
      Math.random = () => 0;
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        createBufferSource() {
          const source = super.createBufferSource(), start = source.start.bind(source);
          source.start = (...args) => {
            let fingerprint = 2166136261;
            for (const sample of source.buffer?.getChannelData(0) ?? []) fingerprint = Math.imul(fingerprint ^ Math.round(sample * 1e6), 16777619);
            fixture.voices.push({ fingerprint, loop: source.loop }); return start(...args);
          };
          return source;
        }
      };
    }
    const themes = new Set();
    fixture.theme = { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } };
    fixture.setTheme = theme => { fixture.theme = theme; for (const fn of themes) fn(theme); };
    window.napplet = {
      storage: {
        async getItem() { fixture.hydrated = true; return JSON.stringify({ mode: 'stroll', coins: 0, muted: !options.observeAudio, selected: options.selected ?? 'butter', travelerVersion: 2 }); },
        async setItem(key, value) { fixture.writes.push({ key, value }); },
      },
      theme: { async get() { return fixture.theme; }, onChanged(fn) { themes.add(fn); return { close() { themes.delete(fn); } }; } },
      keys: {
        async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; },
        onAction(id, fn) { fixture.handlers[id] = fn; return { close() { delete fixture.handlers[id]; } }; },
        unregisterAction() {},
      },
    };
    if (options.initialIntent) window.napplet.intent = {
      onDelivery(listener) {
        fixture.deliverIntent=listener;listener(options.initialIntent);
        return { close() { delete fixture.deliverIntent; } };
      },
    };
    if (options.gamepads) window.napplet.gamepad = {};
  }
  const artifact = JSON.stringify(built.replace('<head>', `<head><script>(${installFixture.toString()})(${JSON.stringify({ gamepads: !!options.gamepads, initialIntent: options.initialIntent, auditBoundary: !!options.auditBoundary, observeAudio: !!options.observeAudio, selected: options.selected })});</script>`)).replaceAll('<', '\\u003c');
  const harness = `<!doctype html><style>html,body{margin:0;overflow:hidden;background:#111}iframe{display:block;border:0;width:900px;height:600px}</style><iframe title="Market game fixture" sandbox="allow-scripts"></iframe><script>
const frame=document.querySelector('iframe');
window.marketPads=(pads,focused=true)=>frame.contentWindow.postMessage({type:'gamepad.state',available:true,focused,pads},'*');
addEventListener('message',event=>{if(event.source===frame.contentWindow&&event.data?.type==='gamepad.subscribe')window.marketPads([]);});
frame.srcdoc=${artifact};</script>`;
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
  const objectIds = new Map();
  async function onObject(kind, fn, args) {
    if (!objectIds.has(kind)) {
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
          const predicate = kind === 'renderer' ? 'function(){return this?.canvas instanceof HTMLCanvasElement && typeof this.drawSession === "function" && typeof this.project === "function";}' : kind === 'game'
            ? 'function(){return this?.rows instanceof Map && typeof this.move === "function" && this.run?.catalog instanceof Map;}'
            : 'function(){return Array.isArray(this?.players) && this.world?.rows instanceof Map && typeof this.dispatch === "function" && typeof this.views === "function";}';
          const match = await cdp.send('Runtime.callFunctionOn', { objectId: binding.value.objectId, returnByValue: true, functionDeclaration: predicate });
          if (match.result.value) objectIds.set(kind, binding.value.objectId);
        }
      }
      assert.ok(objectIds.has(kind), `${kind} is discoverable through production debugger scope, with no app test hook`);
    }
    const result = await cdp.send('Runtime.callFunctionOn', { objectId: objectIds.get(kind), functionDeclaration: fn.toString(), returnByValue: true, arguments: args.map(value => ({ value })) });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const onGame = (fn, ...args) => onObject('game', fn, args);
  const onSession = (fn, ...args) => onObject('session', fn, args);
  async function sendPads(pads, focused = true) {
    await page.evaluate(({ pads, focused }) => window.marketPads(pads, focused), { pads, focused });
    await frame.evaluate(() => Promise.resolve()); await advance(32);
  }
  async function resize(width, height) {
    await page.setViewportSize({ width: Math.max(width, 900), height: Math.max(height, 600) });
    await iframe.evaluate((node, size) => { node.style.width = `${size.width}px`; node.style.height = `${size.height}px`; }, { width, height });
    await frame.waitForFunction(size => innerWidth === size.width && innerHeight === size.height, { width, height });
    await advance(80);
    // The virtual clock advances RAF/timers, not native ResizeObserver delivery.
    // Wait for layout observers and their focus-restoration microtasks before
    // callers inspect the resized UI. This never supplies focus itself.
    await frame.evaluate(() => new Promise(resolve => {
      const observer = new ResizeObserver(() => {
        observer.disconnect();
        queueMicrotask(resolve);
      });
      observer.observe(document.getElementById('app'));
    }));
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
  // Observe actual production draw arguments through debugger breakpoints. No
  // monkey-patching, substitute renderer, state staging or app test hook.
  async function observeTravelers() {
    await onObject('renderer', function () { return this.width; }, []);
    const records = [], failures = [], breakpoints = new Map();
    await cdp.send('Debugger.enable');
    const paused = async event => {
      try {
        const method = breakpoints.get(event.hitBreakpoints?.[0]);
        if (method) {
          const result = await cdp.send('Debugger.evaluateOnCallFrame', {
            callFrameId: event.callFrames[0].callFrameId, returnByValue: true,
            expression: `(${function (method, args, renderer) {
              if (method === 'appendTraveler') {
                const [player, character, , , , , text, position] = args;
                if (!text || !position) return null;
                const ctx = renderer.ctx, font = Math.max(10, renderer.scale * .22);
                ctx.save(); ctx.font = `bold ${font}px sans-serif`;
                const width = ctx.measureText(text).width + Math.max(4, renderer.scale * .09);
                ctx.restore();
                const status = (player.protectionUntil ?? 0) > player.time ? Math.max(9, renderer.scale * .17) + Math.max(4, renderer.scale * .06) : 0;
                return { kind: 'label', character, text, x: player.groundX, y: player.groundY,
                  hop: player.hop, rect: { left: position[0] - width / 2, right: position[0] + width / 2,
                    top: position[1] - font - Math.max(4, renderer.scale * .06) - status, bottom: position[1] + 2 } };
              }
              const [model, x, row, lift = 0, turn = 1, tilt = 0, floorAligned = false] = args;
              const yaw = method === 'turnedModel' ? (args[4] ?? 0) : 0;
              const cos = Math.cos(yaw), sin = Math.sin(yaw), pc = Math.cos(tilt), ps = Math.sin(tilt);
              const floor = floorAligned ? -Math.min(...model.flatMap(v => [v.y-v.d/2,v.y+v.d/2].flatMap(y => [v.z,v.z+v.h].map(z => y*ps+z*pc)))) : 0;
              const points = model.flatMap(v => [v.x-v.w/2,v.x+v.w/2].flatMap(vx => [v.y-v.d/2,v.y+v.d/2].flatMap(vy => [v.z,v.z+v.h].map(vz => {
                if (method === 'model') return renderer.project(x + vx * turn, row - vy, lift + vz);
                const py = vy*pc-vz*ps, pz = vy*ps+vz*pc;
                return renderer.project(x+vx*cos-py*sin,row-vx*sin-py*cos,lift+floor+pz);
              }))));
              return { kind: 'body', method, x, y: row, lift, yaw, vertices: points.length,
                rect: { left: Math.min(...points.map(p=>p[0])), right: Math.max(...points.map(p=>p[0])), top: Math.min(...points.map(p=>p[1])), bottom: Math.max(...points.map(p=>p[1])) } };
            }.toString()})(${JSON.stringify(method)}, arguments, this)`,
          });
          if (result.exceptionDetails) failures.push(result.exceptionDetails);
          else if (result.result.value) records.push(result.result.value);
        }
      } catch (error) { failures.push(String(error)); }
      finally { await cdp.send('Debugger.resume').catch(() => {}); }
    };
    cdp.on('Debugger.paused', paused);
    try {
      for (const method of ['appendTraveler', 'turnedModel', 'model']) {
        const { result } = await cdp.send('Runtime.callFunctionOn', { objectId: objectIds.get('renderer'), functionDeclaration: 'function(name){return this[name];}', arguments: [{value:method}] });
        const { breakpointId } = await cdp.send('Debugger.setBreakpointOnFunctionCall', { objectId: result.objectId });
        breakpoints.set(breakpointId, method);
      }
      await advance(17);
    } finally {
      for (const breakpointId of breakpoints.keys()) await cdp.send('Debugger.removeBreakpoint', { breakpointId });
      cdp.off('Debugger.paused', paused); await cdp.send('Debugger.disable');
    }
    assert.deepEqual(failures, [], 'read-only production geometry observation');
    const labels = [...new Map(records.filter(r=>r.kind==='label').map(r=>[r.text,r])).values()];
    return labels.map(label => ({ ...label, bodies: records.filter(r=>r.kind==='body' && Math.abs(r.x-label.x)<1e-8 && Math.abs(r.y-label.y)<1e-8) }));
  }
  return { browser, page, frame, iframe, advance, onGame, onSession, onRenderer:(fn,...args)=>onObject('renderer',fn,args), sendPads, resize, key, open, stageMarket, stageOffers,
    observeTravelers,
    refreshOwners() { objectIds.clear(); },
    async close() { await browser.close(); await new Promise(resolve => server.close(resolve)); } };
}

/** Explicit public disclosure navigation for inherited shared HUD actions.
 * Does not intercept locators or mutate the model. Acquisition provenance stays
 * with each caller; read-only identity checks prevent acting on another seat. */
export async function sessionHudAction(app, seat, field, { click = true } = {}) {
  assert.ok(['item','revive','decline'].includes(field));
  const identity = await app.onSession(function(seat){const p=this.players.find(p=>p.seat===seat);return {base:this.definition.id,composed:!!this.mode,participant:p?.participantId};},seat);
  assert.ok(identity.composed && identity.participant, `actual composed participant ${seat}`);
  const frame=app.frame, root=frame.locator('#session-seats'), owner=frame.locator(`[data-seat="${seat}"] .session-hud-identity`);
  if(await root.getAttribute('data-session-hud-inspect')==='true' && await frame.locator('.session-hud-selected').getAttribute('data-seat')!==seat)await frame.getByRole('button',{name:'Close details',exact:true}).click();
  if(await frame.locator('.session-hud-selected').getAttribute('data-seat')!==seat)await owner.click();
  if(await root.getAttribute('data-session-hud-inspect')!=='true')await owner.click();
  const page=field==='item'?'3':'2';
  for(let n=0;n<4&&await frame.locator('.session-hud-selected').getAttribute('data-session-hud-page')!==page;n++)await frame.getByRole('button',{name:'Next details',exact:true}).click();
  assert.equal(await frame.locator('.session-hud-selected').getAttribute('data-seat'),seat);
  assert.equal(await app.onSession(function(seat){return this.players.find(p=>p.seat===seat)?.participantId;},seat),identity.participant);
  const action=frame.locator(`[data-seat="${seat}"] ${field==='decline'?'[data-race-decline]':`[data-session-hud="${field}"]`}`);
  assert.equal(await action.isVisible(),true,`${seat} ${field} is reachable through visible details`);
  if(click){await action.click();if(field!=='item'&&await frame.getByRole('button',{name:'Close details',exact:true}).isVisible())await frame.getByRole('button',{name:'Close details',exact:true}).click();}
  return action;
}
