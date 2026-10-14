// Actual Paja 5197 layout verification. CDP supplies an explicitly labelled
// late-score meadow fixture; production source, theme protocol and UI are real.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const evidence = { runtime: 'Paja 5197, opaque allow-scripts iframe', fixture: 'CDP stages score 480 and an isolated three-species render fixture above the gameplay cap: quiet walking, warned windup, and eased strike; browser clock controlled', frames: [], errors: [] };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.clock.install();
  const cdp = await page.context().newCDPSession(page), contexts = new Map();
  cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context));
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
  cdp.on('Runtime.executionContextsCleared', () => contexts.clear());
  await cdp.send('Runtime.enable');
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.goto(process.env.DOWN_TO_DUCK_MOB_LAYOUT_URL ?? 'http://127.0.0.1:5197/');
  const iframe = page.locator('iframe');
  await page.frameLocator('iframe').locator('#sound-preview-cue option[value="death.mob"]').waitFor({ state: 'attached' });
  const frame = page.frames().find(f => f.name() === 'napplet-frame');
  assert.ok(frame); assert.equal(await iframe.getAttribute('sandbox'), 'allow-scripts');
  assert.equal(await frame.evaluate(() => location.origin), 'null');
  await frame.waitForFunction(() => window.napplet?.theme);
  const shellTheme = await frame.evaluate(() => window.napplet.theme.get());
  await page.clock.pauseAt((await frame.evaluate(() => Date.now())) + 100);
  const { frameTree } = await cdp.send('Page.getFrameTree');
  const frameId = frameTree.childFrames[0].frame.id;
  const context = [...contexts.values()].find(c => c.auxData?.frameId === frameId && c.auxData?.isDefault);
  assert.ok(context);
  const { result: handler } = await cdp.send('Runtime.evaluate', {
    contextId: context.id, includeCommandLineAPI: true,
    expression: 'getEventListeners(document.getElementById("pause")).click[0].listener',
  });
  const details = await cdp.send('Runtime.getProperties', { objectId: handler.objectId, ownProperties: true });
  const scopes = details.internalProperties.find(p => p.name === '[[Scopes]]').value;
  const list = await cdp.send('Runtime.getProperties', { objectId: scopes.objectId, ownProperties: true });
  let gameId, rendererId;
  for (const scope of list.result) {
    if (!scope.value?.objectId || scope.value.description === 'Global') continue;
    const bindings = await cdp.send('Runtime.getProperties', { objectId: scope.value.objectId, ownProperties: true });
    for (const binding of bindings.result) {
      if (binding.value?.type !== 'object' || !binding.value.objectId) continue;
      const match = await cdp.send('Runtime.callFunctionOn', {
        objectId: binding.value.objectId, returnByValue: true,
        functionDeclaration: 'function() { return this?.rows instanceof Map && typeof this.move === "function" && Array.isArray(this.mobs) ? "game" : this?.canvas instanceof HTMLCanvasElement && typeof this.project === "function" && typeof this.draw === "function" ? "renderer" : null; }',
      });
      if (match.result.value === 'game') gameId = binding.value.objectId;
      if (match.result.value === 'renderer') rendererId = binding.value.objectId;
    }
  }
  assert.ok(gameId && rendererId, 'actual game and renderer found in debugger scopes');
  async function gameCall(fn, ...args) {
    const result = await cdp.send('Runtime.callFunctionOn', { objectId: gameId, functionDeclaration: fn.toString(), returnByValue: true, arguments: args.map(value => ({ value })) });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await gameCall(function () {
    this.state = 'ready'; this.x = this.fromX = 0; this.y = this.fromY = this.maxY = 480;
    this.time = 45; this.idle = this.hop = 0; this.waveRow = 474;
    this.run.advanceScore(480); this.run.tick(16);
    this.ensureRows(); for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  });
  await page.clock.runFor(2200);
  async function stage() {
    return gameCall(function () {
      this.state = 'playing'; this.time = 45; this.idle = this.hop = 0; this.waveRow = 474;
      this.mobs.splice(0, this.mobs.length,
        { id: 10, kind: 'slime', x: -2.45, y: 479, fromX: -2.7, fromY: 479, targetX: -2.2, targetY: 479, phase: 'walking', phaseLeft: .4, phaseDuration: .8 },
        { id: 11, kind: 'crab', x: 1.5, y: 479, fromX: 1.5, fromY: 479, targetX: 1.5, targetY: 480.25, phase: 'windup', phaseLeft: 1, phaseDuration: 1.2 },
        { id: 12, kind: 'wasp', x: -2, y: 481, fromX: -2.8, fromY: 481, targetX: -1.2, targetY: 481, phase: 'moving', phaseLeft: .25, phaseDuration: .5 },
      );
      this.onMobSpawn(this.mobs[2]);
    });
  }
  for (const theme of ['light', 'dark']) {
    const changed = { ...shellTheme, colors: { ...shellTheme.colors,
      background: theme === 'light' ? '#f4f2df' : '#242b32', text: theme === 'light' ? '#263c38' : '#f0eee5', primary: theme === 'light' ? '#477763' : '#9fc28a',
    } };
    await page.evaluate(theme => document.querySelector('iframe').contentWindow.postMessage({ type: 'theme.changed', theme }, '*'), changed);
    for (const [width, height] of [[240, 240], [320, 560], [900, 600], [2400, 1200], [1000, 240], [200, 160]]) {
      await page.setViewportSize({ width: Math.max(width + 400, 1000), height: Math.max(height + 60, 700) });
      await iframe.evaluate((element, size) => { element.style.width = `${size.width}px`; element.style.height = `${size.height}px`; element.style.flex = 'none'; }, { width, height });
      await stage(); await page.clock.runFor(48);
      const result = await frame.evaluate(() => {
        const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
        const toast = document.getElementById('toast'), bounds = rect(toast);
        const fits = r => r.x >= 0 && r.y >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5;
        const overlap = r => bounds.x < r.right && bounds.right > r.x && bounds.y < r.bottom && bounds.bottom > r.y;
        const buttons = [...document.querySelectorAll('button')].filter(e => e.offsetParent && !e.disabled).map(e => {
          const r = rect(e), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return { id: e.id || e.getAttribute('aria-label'), fits: fits(r), hit: e === hit || e.contains(hit), overlapsToast: overlap(r) };
        });
        const labels = ['.score-block', '.world-label'].flatMap(selector => {
          const element = document.querySelector(selector);
          return element.offsetParent ? [{ selector, bounds: rect(element), overlapsToast: overlap(rect(element)) }] : [];
        });
        return { width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
          notice: getComputedStyle(document.querySelector('.too-small')).display === 'grid', backgrounds: ['html','body','#app'].map(selector => getComputedStyle(document.querySelector(selector)).backgroundColor),
          toast: { text: toast.textContent, fits: fits(bounds), fullText: toast.scrollHeight <= toast.clientHeight && toast.scrollWidth <= toast.clientWidth, bounds }, buttons, labels };
      });
      assert.equal(result.width, width); assert.equal(result.height, height); assert.equal(result.overflow, false);
      assert.equal(result.notice, width < 240 || height < 240);
      assert.ok(result.backgrounds.every(c => c === result.backgrounds[0]));
      assert.equal(result.backgrounds[0], theme === 'light' ? 'rgb(244, 242, 223)' : 'rgb(36, 43, 50)');
      assert.ok(result.buttons.every(button => button.fits && button.hit && !button.overlapsToast), JSON.stringify(result));
      assert.ok(result.labels.every(label => !label.overlapsToast), `spawn hint covers the score/world label: ${JSON.stringify(result)}`);
      if (!result.notice) {
        assert.match(result.toast.text, /Bramble Wasp spotted!/);
        assert.ok(result.toast.fits && result.toast.fullText);
        // Compare the production canvas with each fixture mob omitted in turn.
        // This proves all three actually contribute visible body/marker pixels,
        // including compact/short frames, without adding a shipped debug hook.
        const pixels = await cdp.send('Runtime.callFunctionOn', { objectId: rendererId, returnByValue: true, arguments: [{ objectId: gameId }], functionDeclaration: function (game) {
          const snapshot = () => this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
          this.draw(game, 'butter', 0); const full = snapshot(); const observations = [];
          for (let index = 0; index < game.mobs.length; index++) {
            const mob = game.mobs.splice(index, 1)[0]; this.draw(game, 'butter', 0); const removed = snapshot();
            let changed = 0; for (let p = 0; p < full.length; p += 4) if ([0, 1, 2].some(c => Math.abs(full[p + c] - removed[p + c]) > 5)) changed++;
            game.mobs.splice(index, 0, mob);
            observations.push({ kind: mob.kind, phase: mob.phase, changedPixels: changed, anchor: this.project(mob.x, mob.y), scale: this.scale });
          }
          this.draw(game, 'butter', 0); return observations;
        }.toString() });
        if (pixels.exceptionDetails) throw new Error(JSON.stringify(pixels.exceptionDetails));
        result.mobs = pixels.result.value;
        assert.equal(result.mobs.length, 3);
        assert.ok(result.mobs.every(mob => mob.changedPixels > 12 && mob.anchor[0] >= 0 && mob.anchor[0] <= width && mob.anchor[1] >= 0 && mob.anchor[1] <= height), JSON.stringify(result.mobs));
      }
      evidence.frames.push({ theme, ...result });
      await iframe.screenshot({ path: new URL(`mob-layout-${width}x${height}-${theme}.png`, output).pathname });
      if (!result.notice) {
        await gameCall(function () { this.time = 45; this.waveRow = this.groundY - 2; });
        await page.clock.runFor(32);
        const warning = await frame.evaluate(() => {
          const toast = document.getElementById('toast'), panel = document.getElementById('idle'), r = panel.getBoundingClientRect();
          const overlaps = [...document.querySelectorAll('button,.score-block,.world-label')].filter(element => element.offsetParent).filter(element => {
            const b = element.getBoundingClientRect(); return r.x < b.right && r.right > b.x && r.y < b.bottom && r.bottom > b.y;
          }).map(element => element.id || element.className || element.getAttribute('aria-label'));
          return { toast: toast.textContent, visible: !panel.hidden, fits: r.x >= 0 && r.y >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5, overlaps };
        });
        assert.equal(warning.toast, '', 'urgent wave guidance suppresses the transient spawn hint');
        assert.ok(warning.visible && warning.fits); assert.deepEqual(warning.overlaps, []);
        evidence.frames.at(-1).waveWarning = warning;
        await iframe.screenshot({ path: new URL(`mob-layout-wave-${width}x${height}-${theme}.png`, output).pathname });
      }
    }
  }
  assert.deepEqual(evidence.errors, []);
  await writeFile(new URL('mob-layout.json', output), JSON.stringify(evidence, null, 2) + '\n');
  console.log('PASS: active mobs and spawn hint in actual Paja, five supported sizes + minimum notice, light/dark, visible canvas bodies and reachable controls.');
} finally { await browser.close(); }
