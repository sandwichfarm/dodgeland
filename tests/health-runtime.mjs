// Built-artifact Pluck integration in an opaque allow-scripts iframe. CDP stages
// explicit road contacts / score 99; real controls, simulation, health, HUD and
// Web Audio carry each encounter. This does not claim a natural 100-hop run.
// The production module is unchanged and has no test hooks.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.ok(built.includes('hurt.rear') && built.includes('health.restore'), 'Build the current Pluck implementation first.');
const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });

function installFixture() {
  Math.random = () => 0;
  const observation = window.healthFixture = { voices: [], writes: [], hydrated: false };
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    createBufferSource() {
      const source = super.createBufferSource();
      const voice = { loop: false, fingerprint: 0, duration: 0, stops: 0, ended: false };
      const start = source.start.bind(source), stop = source.stop.bind(source);
      source.start = (...args) => {
        voice.loop = source.loop; voice.duration = source.buffer?.duration ?? 0;
        let fingerprint = 2166136261;
        for (const sample of source.buffer?.getChannelData(0) ?? []) fingerprint = Math.imul(fingerprint ^ Math.round(sample * 1e6), 16777619);
        voice.fingerprint = fingerprint; observation.voices.push(voice);
        return start(...args);
      };
      source.stop = (...args) => { voice.stops++; return stop(...args); };
      source.addEventListener('ended', () => { voice.ended = true; });
      return source;
    }
  };
  const themes = new Set();
  observation.theme = { colors: { background: '#f4f2df', text: '#263c38', primary: '#477763' } };
  observation.setTheme = theme => { observation.theme = theme; themes.forEach(listener => listener(theme)); };
  window.napplet = {
    theme: {
      async get() { return observation.theme; },
      onChanged(listener) { themes.add(listener); return { close() { themes.delete(listener); } }; },
    },
    storage: {
      async getItem() { observation.hydrated = true; return JSON.stringify({ mode: 'stroll' }); },
      async setItem(key, value) { observation.writes.push({ key, value }); },
    },
  };
}
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const injected = `<script>(${installFixture.toString()})();</script>`;
const harness = `<!doctype html><body style="margin:0"><iframe id="napplet" title="Pluck integration fixture" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>
const artifact = ${json(built.replace('<head>', '<head>' + injected))};
window.mount = () => { document.querySelector('iframe').srcdoc = artifact; };
window.mount();</script>`;
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const evidence = { artifact: 'unmodified production module; opaque allow-scripts iframe',
  fixture: 'CDP closure inspection supplies road contacts and score 99; subsequent controls and simulation are real',
  scenarios: [], frames: [], errors: [], external: [] };
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.setDefaultTimeout(8000);
  await page.clock.install();
  const cdp = await page.context().newCDPSession(page), contexts = new Map();
  cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context));
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
  cdp.on('Runtime.executionContextsCleared', () => contexts.clear());
  await cdp.send('Runtime.enable');
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    evidence.external.push(route.request().url()); return route.abort();
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  let frame;
  async function currentFrame() {
    frame = await (await page.locator('#napplet').elementHandle()).contentFrame();
    await frame.locator('#sound-preview-cue option[value="hurt.rear"]').waitFor({ state: 'attached' });
    await frame.waitForFunction(() => window.healthFixture?.hydrated);
    return frame;
  }
  await currentFrame();
  assert.equal(await frame.evaluate(() => location.origin), 'null');
  assert.equal(await page.locator('iframe').getAttribute('sandbox'), 'allow-scripts');

  // Obtain the actual live Game from the click handler's module scope. No
  // generated variable names, source rewriting, or production debug hook.
  async function gameObject() {
    const { frameTree } = await cdp.send('Page.getFrameTree');
    const frameId = frameTree.childFrames[0].frame.id;
    const context = [...contexts.values()].find(candidate => candidate.auxData?.frameId === frameId && candidate.auxData?.isDefault);
    assert.ok(context, 'opaque app frame has a debugger execution context');
    const { result: handler } = await cdp.send('Runtime.evaluate', {
      contextId: context.id, includeCommandLineAPI: true,
      expression: 'getEventListeners(document.getElementById("pause")).click[0].listener',
    });
    const details = await cdp.send('Runtime.getProperties', { objectId: handler.objectId, ownProperties: true });
    const scopes = details.internalProperties.find(property => property.name === '[[Scopes]]').value;
    const list = await cdp.send('Runtime.getProperties', { objectId: scopes.objectId, ownProperties: true });
    for (const scope of list.result) {
      if (!scope.value?.objectId || scope.value.description === 'Global') continue;
      const bindings = await cdp.send('Runtime.getProperties', { objectId: scope.value.objectId, ownProperties: true });
      for (const binding of bindings.result) {
        if (binding.value?.type !== 'object' || !binding.value.objectId) continue;
        const match = await cdp.send('Runtime.callFunctionOn', {
          objectId: binding.value.objectId, returnByValue: true,
          functionDeclaration: 'function() { return this?.rows instanceof Map && typeof this.move === "function" && typeof this.update === "function" && Array.isArray(this.mobs); }',
        });
        if (match.result.value) return binding.value.objectId;
      }
    }
    throw new Error('Could not locate the actual Game in module debugger scopes.');
  }
  async function onGame(fn, ...args) {
    const result = await cdp.send('Runtime.callFunctionOn', {
      objectId: await gameObject(), functionDeclaration: fn.toString(), returnByValue: true,
      arguments: args.map(value => ({ value })),
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const snapshot = () => onGame(function () {
    return { state: this.state, score: this.maxY, x: this.x, y: this.y, time: this.time, hop: this.hop,
      cause: this.deathCause, health: this.health, maxHealth: this.maxHealth, hurtRemaining: this.hurtRemaining };
  });
  async function advance(ms) { await page.clock.runFor(ms); }
  async function move(direction) { await frame.locator(`[data-direction="${direction}"]`).dispatchEvent('click'); await advance(160); }
  const effects = () => frame.evaluate(() => window.healthFixture.voices.filter(voice => !voice.loop));
  const heard = async fingerprint => (await effects()).filter(voice => voice.fingerprint === fingerprint).length;

  // Audition the shipped pack through ordinary controls to identify actual PCM.
  await frame.locator('#collection').click(); await frame.locator('#sounds-tab').click();
  const fingerprints = {};
  for (const cue of ['hurt.rear', 'hurt.side', 'health.restore', 'death.traffic']) {
    await frame.locator('#sound-preview-cue').selectOption(cue);
    await frame.locator('#sound-preview').click();
    fingerprints[cue] = (await effects()).at(-1).fingerprint;
  }
  assert.equal(new Set(Object.values(fingerprints)).size, 4);
  await frame.locator('#close-drawer').click();
  await page.clock.pauseAt((await frame.evaluate(() => Date.now())) + 50);

  const hud = () => frame.evaluate(() => ({
    value: Number(document.querySelector('#pluck').getAttribute('aria-valuenow')),
    text: document.querySelector('#pluck-value').textContent,
    description: document.querySelector('#pluck').getAttribute('aria-valuetext'),
    feathers: [...document.querySelectorAll('#pluck-feathers clipPath rect')].map(rect => Number(rect.getAttribute('width'))),
    recovering: document.querySelector('#pluck').classList.contains('recovering'),
    low: document.querySelector('#pluck').classList.contains('low'),
  }));
  async function remount() {
    await page.evaluate(() => window.mount()); await currentFrame();
    await frame.locator('#character-call').dispatchEvent('click'); await advance(32);
  }
  async function road(face) {
    await onGame(function (face) {
      this.x = this.fromX = face === 'rear' ? -1 : face === 'front' ? 1 : 0;
      this.y = this.fromY = this.maxY = face === 'side' ? 7 : 8;
      this.time = this.idle = this.hop = 0;
      this.ensureRows();
      for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
      Object.assign(this.rows.get(8), { kind: 'road', speed: 1, phase: 0, spacing: 20, length: 1.15 });
    }, face);
    await advance(1600);
  }
  for (const [face, direction, remaining, featherWidths] of [
    ['rear', 'right', 2, [22, 22, 0]], ['side', 'forward', 1, [22, 0, 0]],
  ]) {
    if (face === 'side') await remount();
    await road(face);
    assert.equal((await snapshot()).health, 3);
    const hurtBefore = await heard(fingerprints[`hurt.${face}`]), fatalBefore = await heard(fingerprints['death.traffic']);
    await move(direction);
    const hurt = await snapshot(), visible = await hud();
    assert.equal(hurt.state, 'playing'); assert.equal(hurt.health, remaining); assert.equal(hurt.cause, null);
    assert.ok(hurt.hurtRemaining > .8 && hurt.hurtRemaining <= 1);
    assert.deepEqual(visible, { value: remaining, text: String(remaining), description: `${remaining} of 3 feathers`, feathers: featherWidths, recovering: true, low: remaining <= 1 });
    assert.equal(await heard(fingerprints[`hurt.${face}`]), hurtBefore + 1);
    assert.equal(await heard(fingerprints['death.traffic']), fatalBefore, 'surviving a hit never emits death audio');
    await page.locator('iframe').screenshot({ path: new URL(`health-runtime-${face}.png`, output).pathname });
    await frame.locator('#pause').dispatchEvent('click');
    const paused = await snapshot(), pausedHud = await hud(), effectsBeforePause = (await effects()).length;
    assert.equal(paused.state, 'paused');
    await advance(1800);
    assert.deepEqual(await snapshot(), paused, 'pause freezes health and recovery protection');
    assert.deepEqual(await hud(), pausedHud);
    assert.equal((await effects()).length, effectsBeforePause, 'pause emits no health cues');
    await frame.locator('#pause').dispatchEvent('click');
    await advance(1100);
    assert.equal((await snapshot()).health, remaining, 'one encounter costs Pluck once and recoils to safety');
    assert.equal((await snapshot()).hurtRemaining, 0);
    assert.equal((await hud()).recovering, false);
    assert.equal(await heard(fingerprints[`hurt.${face}`]), hurtBefore + 1, 'continued simulation does not repeat the impact');
    evidence.scenarios.push({ face, afterContact: hurt, hud: visible, pausedMs: 1800 });
  }

  // Keep the actual one-Pluck survivor, then supply only the late-score scenery.
  // The milestone and restoration must be earned by the real forward control.
  await onGame(function () {
    this.state = 'ready'; this.x = this.fromX = 0; this.y = this.fromY = this.maxY = 99;
    this.time = this.idle = this.hop = 0; this.ensureRows();
    for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  });
  await advance(1600);
  const restoresBefore = await heard(fingerprints['health.restore']);
  await move('forward');
  const restored = await snapshot(), restoredHud = await hud();
  assert.equal(restored.score, 100); assert.equal(restored.health, 1.5); assert.equal(restored.state, 'playing');
  assert.deepEqual(restoredHud.feathers, [22, 11, 0]); assert.equal(restoredHud.text, '1½');
  assert.equal(restoredHud.description, '1.5 of 3 feathers');
  assert.equal(await heard(fingerprints['health.restore']), restoresBefore + 1);
  assert.match(await frame.locator('#toast').textContent(), /pluck returns.*½ feather/);
  await page.locator('iframe').screenshot({ path: new URL('health-runtime-restored.png', output).pathname });
  await move('back'); await move('forward');
  assert.equal((await snapshot()).health, 1.5, 'recrossing a previously scored row cannot farm recovery');
  assert.equal(await heard(fingerprints['health.restore']), restoresBefore + 1);
  evidence.scenarios.push({ milestone: 100, afterRecovery: restored, hud: restoredHud });

  await remount(); await road('front');
  const fatalBefore = await heard(fingerprints['death.traffic']);
  const hurtBeforeFatal = (await effects()).filter(voice => [fingerprints['hurt.rear'], fingerprints['hurt.side']].includes(voice.fingerprint)).length;
  await move('left');
  const dead = await snapshot();
  assert.equal(dead.state, 'dead'); assert.equal(dead.cause, 'traffic'); assert.equal(dead.health, 0);
  assert.equal(await heard(fingerprints['death.traffic']), fatalBefore + 1);
  assert.equal((await effects()).filter(voice => [fingerprints['hurt.rear'], fingerprints['hurt.side']].includes(voice.fingerprint)).length, hurtBeforeFatal);
  assert.deepEqual((await hud()).feathers, [0, 0, 0]);
  await advance(400); await frame.locator('#play').dispatchEvent('click'); await advance(32);
  assert.equal((await snapshot()).health, 3); assert.equal((await snapshot()).score, 0);
  assert.deepEqual((await hud()).feathers, [22, 22, 22]);
  assert.equal((await hud()).recovering, false);
  assert.equal(await frame.evaluate(() => window.healthFixture.writes.length > 0), true, 'a completed real encounter reaches SDK storage');
  evidence.scenarios.push({ face: 'front', fatal: dead, retry: await snapshot() });

  // Frame/theme fixtures retain the real HUD, theme helper and canvas render.
  // Check the fractional state together with all primary labels and controls.
  for (const theme of ['light', 'dark']) {
    await frame.evaluate(theme => window.healthFixture.setTheme({ colors: {
      background: theme === 'light' ? '#f4f2df' : '#242b32',
      text: theme === 'light' ? '#263c38' : '#f0eee5', primary: theme === 'light' ? '#477763' : '#9fc28a',
    } }), theme);
    for (const [width, height] of [[200, 160], [240, 240], [320, 560], [900, 600], [2400, 1200], [1000, 240]]) {
      await page.setViewportSize({ width: Math.max(width + 40, 1000), height: Math.max(height + 40, 700) });
      await page.locator('iframe').evaluate((element, size) => { element.style.width = `${size.width}px`; element.style.height = `${size.height}px`; }, { width, height });
      await onGame(function () {
        this.state = 'playing'; this.mode = 'stroll'; this.health = 1.5; this.x = this.fromX = 0; this.y = this.fromY = this.maxY = 0;
        this.hop = this.time = this.idle = 0;
        for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
      });
      await advance(48);
      const result = await frame.evaluate(() => {
        const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
        const fits = r => r.x >= 0 && r.y >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5;
        const meter = document.getElementById('pluck'), bounds = rect(meter);
        const overlaps = r => bounds.x < r.right && bounds.right > r.x && bounds.y < r.bottom && bounds.bottom > r.y;
        const visible = element => element.offsetParent && getComputedStyle(element).visibility !== 'hidden';
        const buttons = [...document.querySelectorAll('button')].filter(element => visible(element) && !element.disabled).map(element => {
          const r = rect(element), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return { id: element.id || element.getAttribute('aria-label'), fits: fits(r), hit: element === hit || element.contains(hit), overlapsPluck: overlaps(r) };
        });
        const labels = [...document.querySelectorAll('.score-block,.world-label,.coin-count,#toast,#idle')].filter(visible).map(element => ({
          id: element.id || element.className, bounds: rect(element), overlapsPluck: overlaps(rect(element)),
        }));
        return { width: innerWidth, height: innerHeight, notice: getComputedStyle(document.querySelector('.too-small')).display === 'grid',
          overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
          backgrounds: ['html', 'body', '#app'].map(selector => getComputedStyle(document.querySelector(selector)).backgroundColor),
          meter: { visible: Boolean(visible(meter)), fits: fits(bounds), fullText: meter.scrollWidth <= meter.clientWidth && meter.scrollHeight <= meter.clientHeight, bounds,
            feathers: [...document.querySelectorAll('#pluck-feathers clipPath rect')].map(rect => Number(rect.getAttribute('width'))) }, buttons, labels };
      });
      assert.equal(result.width, width); assert.equal(result.height, height); assert.equal(result.overflow, false);
      assert.equal(result.notice, width < 240 || height < 240);
      assert.ok(result.backgrounds.every(color => color === result.backgrounds[0]));
      assert.equal(result.backgrounds[0], theme === 'light' ? 'rgb(244, 242, 223)' : 'rgb(36, 43, 50)');
      if (!result.notice) {
        assert.ok(result.meter.visible && result.meter.fits && result.meter.fullText, JSON.stringify(result));
        assert.deepEqual(result.meter.feathers, [22, 11, 0]);
        assert.ok(result.buttons.every(button => button.fits && button.hit && !button.overlapsPluck), JSON.stringify(result));
        assert.ok(result.labels.every(label => !label.overlapsPluck), JSON.stringify(result));
      }
      evidence.frames.push({ theme, ...result });
      await page.locator('iframe').screenshot({ path: new URL(`health-layout-${width}x${height}-${theme}.png`, output).pathname });
      if (!result.notice) {
        await onGame(function () { this.mode = 'arcade'; this.time = 6; this.waveRow = this.groundY - 2; });
        await advance(32);
        const warning = await frame.evaluate(() => {
          const panel = document.getElementById('idle'), r = panel.getBoundingClientRect();
          const overlaps = [...document.querySelectorAll('button,.score-block,.world-label,#pluck')].filter(element => element.offsetParent).filter(element => {
            const b = element.getBoundingClientRect(); return r.x < b.right && r.right > b.x && r.y < b.bottom && r.bottom > b.y;
          }).map(element => element.id || element.className || element.getAttribute('aria-label'));
          return { visible: !panel.hidden, fits: r.x >= 0 && r.y >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5, overlaps };
        });
        assert.ok(warning.visible && warning.fits); assert.deepEqual(warning.overlaps, [], 'wave guidance clears the Pluck bar and existing HUD');
        evidence.frames.at(-1).waveWarning = warning;
        await page.locator('iframe').screenshot({ path: new URL(`health-layout-wave-${width}x${height}-${theme}.png`, output).pathname });
      }
    }
  }
  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  evidence.fingerprints = fingerprints;
  await writeFile(new URL('health-runtime.json', output), JSON.stringify(evidence, null, 2) + '\n');
  console.log('PASS: built Pluck integration — rear/side damage, half-feather milestone, pause protection, fatal audio, retry, SDK result save and 12 frame/theme layouts.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

