// The unchanged production artifact in an opaque iframe. Clipboard fixtures
// exercise browser permission outcomes; the run and death screen remain real.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const artifact = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });

function installFixture() {
  Math.random = () => .12345;
  const f = window.seedFixture = { mode: 'native', writes: [], handlers: {}, themes: [] };
  const nativeCopy = document.execCommand.bind(document);
  const nativeClipboard = navigator.clipboard;
  document.execCommand = (...args) => {
    if (f.mode === 'native') return nativeCopy(...args);
    if (f.mode === 'throw') throw new Error('Copy blocked');
    return false;
  };
  Object.defineProperty(navigator, 'clipboard', { configurable: true, get() {
    if (f.mode === 'native') return nativeClipboard;
    if (f.mode === 'absent') return undefined;
    return { writeText(value) {
      f.writes.push(value);
      if (f.mode === 'success') return Promise.resolve();
      if (f.mode === 'pending') return new Promise(resolve => { f.resolveCopy = resolve; });
      return Promise.reject(new Error('Clipboard denied'));
    } };
  } });
  let theme = { colors: { background: '#f4f2df', text: '#263c38', primary: '#477763' } };
  f.setTheme = next => { theme = next; f.themes.forEach(callback => callback(next)); };
  window.napplet = {
    storage: { async getItem() { return JSON.stringify({ mode: 'arcade', muted: true }); }, async setItem() {} },
    theme: { async get() { return theme; }, onChanged(callback) { f.themes.push(callback); return { close() {} }; } },
    keys: { async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; }, onAction(id, callback) { f.handlers[id] = callback; return { close() { delete f.handlers[id]; } }; }, unregisterAction() {} },
  };
}
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const html = `<!doctype html><body style="margin:0"><iframe title="Seed sharing fixture" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>document.querySelector('iframe').srcdoc=${json(artifact.replace('<head>', `<head><script>(${installFixture.toString()})();</script>`))};</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const evidence = { artifact: 'dist/index.html', scenarios: [], frames: [], errors: [], external: [] };
const browser = await chromium.launch({ args: ['--mute-audio'] });
let phase = 'clipboard behavior';
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 750 } });
  await context.grantPermissions(['clipboard-read'], { origin });
  const page = await context.newPage();
  page.setDefaultTimeout(8000); await page.clock.install();
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.route('**/*', route => { if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue(); evidence.external.push(route.request().url()); return route.abort(); });
  await page.goto(origin);
  const iframe = page.locator('iframe');
  const frame = await (await iframe.elementHandle()).contentFrame();
  await frame.waitForFunction(() => !!window.seedFixture?.handlers['puddlehop.play']);
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50);
  const advance = ms => page.clock.runFor(ms);
  async function seedPage() {
    if (!await frame.locator('#run-seed-code').isVisible()) {
      await frame.locator('[data-run-topic="seed"]').click(); await advance(250);
    }
  }
  async function resultHome() {
    if (await frame.locator('#run-menu-back').isVisible()) {
      await frame.locator('#run-menu-back').click(); await advance(250);
    }
  }
  async function panelLayout(label) {
    phase = label;
    // Capture the resting board, after its short opening/resize transition.
    await advance(250);
    await frame.locator('#run-panel').evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {}))));
    const layout = await frame.evaluate(() => {
      const panel = document.querySelector('#run-panel'), box = panel.getBoundingClientRect();
      const visible = node => {
        const rect = node.getBoundingClientRect(), css = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && css.visibility !== 'hidden' && !node.closest('[hidden]');
      };
      const controls = [...panel.querySelectorAll('button, textarea')].filter(visible).map(node => {
        const rect = node.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { id: node.id, fits: rect.x >= box.x && rect.y >= box.y && rect.right <= box.right + .5 && rect.bottom <= box.bottom + .5,
          width: rect.width, height: rect.height, hit: node === hit || node.contains(hit) };
      });
      const overflow = [panel, ...panel.querySelectorAll('*')].filter(visible).filter(node => {
        const css = getComputedStyle(node);
        return node.scrollWidth > node.clientWidth + 1 || (node.scrollHeight > node.clientHeight + 1 && (node instanceof HTMLTextAreaElement || /auto|scroll/.test(css.overflowY)));
      }).map(node => node.id || node.className);
      return { centered: Math.abs(box.x + box.width / 2 - innerWidth / 2) < 2 && Math.abs(box.y + box.height / 2 - innerHeight / 2) < 2,
        fits: box.x >= 0 && box.y >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
        controls, overflow, rootOverflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
        backgrounds: ['html', 'body', '#app'].map(selector => getComputedStyle(document.querySelector(selector)).backgroundColor) };
    });
    assert.ok(layout.centered && layout.fits, `${label}: centered result board ${JSON.stringify(layout)}`);
    assert.equal(layout.rootOverflow, false); assert.deepEqual(layout.overflow, [], `${label}: no scrolling`);
    assert.ok(layout.backgrounds.every(value => value === layout.backgrounds[0]));
    for (const control of layout.controls) assert.ok(control.fits && control.hit && control.width >= 43.5 && control.height >= 43.5, `${label}: visible 44px control ${JSON.stringify(control)}`);
    return layout;
  }
  assert.equal(await frame.evaluate(() => location.origin), 'null');
  assert.equal(await frame.locator('#run-seed').isHidden(), true, 'ready screen has no stale seed');
  await frame.locator('#play').click(); await advance(20000);
  assert.equal(await frame.locator('#result-content').isVisible(), true, 'natural wave catch reaches real game-over UI');
  const token = await frame.locator('#run-seed-code').inputValue();
  assert.ok(token.length >= 12 && token.length < 100, `full versioned seed: ${token}`);
  assert.match(token, /^ph3-[0-9a-f]{8}-[a-z]+-a-[ng]$/, 'new runs copy the current course schema');
  assert.equal(await frame.locator('#run-seed-code').getAttribute('readonly'), '');
  await frame.locator('#copy-seed').click();
  assert.equal(await frame.locator('#copy-seed-status').innerText(), 'Seed copied.');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), token, 'real opaque-frame copy writes exactly the displayed seed');
  await frame.locator('#run-seed-code').click();
  assert.equal(await frame.locator('#copy-seed-status').innerText(), 'Seed copied.');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), token, 'clicking the displayed seed copies the same complete token');
  evidence.scenarios.push('Real user gesture copies complete game-over seed from opaque allow-scripts frame to browser clipboard');

  await frame.evaluate(() => {
    window.seedFixture.mutations = 0;
    new MutationObserver(records => { window.seedFixture.mutations += records.length; }).observe(document.querySelector('#run-seed'), { childList: true, subtree: true, attributes: true, characterData: true });
  });
  await frame.locator('#run-seed-code').focus(); await advance(500);
  assert.equal(await frame.evaluate(() => document.activeElement.id), 'run-seed-code', 'frame updates do not take text selection focus');
  assert.equal(await frame.evaluate(() => window.seedFixture.mutations), 0, 'unchanged end state performs no repeated seed DOM writes');

  await frame.evaluate(() => { window.seedFixture.mode = 'success'; });
  await frame.locator('#copy-seed').focus(); await page.keyboard.press('Space');
  await frame.waitForFunction(() => document.querySelector('#copy-seed-status').textContent === 'Seed copied.');
  assert.deepEqual(await frame.evaluate(() => window.seedFixture.writes), [token]);
  assert.equal(await frame.evaluate(() => document.activeElement.id), 'copy-seed', 'successful async copy preserves initiating button focus');
  await frame.evaluate(() => window.seedFixture.handlers['puddlehop.play']());
  assert.equal(await frame.locator('#result-content').isVisible(), true, 'shell Enter on Copy does not restart the run');
  assert.equal(await frame.evaluate(() => window.seedFixture.writes.at(-1)), token);
  await frame.locator('#run-seed-code').focus();
  const fieldCopiesBefore = await frame.evaluate(() => window.seedFixture.writes.length);
  await frame.evaluate(() => window.seedFixture.handlers['puddlehop.play']());
  assert.equal(await frame.locator('#result-content').isVisible(), true, 'shell Enter in selected seed preserves game-over screen');
  assert.equal(await frame.evaluate(() => window.seedFixture.writes.length), fieldCopiesBefore + 1, 'shell Enter on the seed invokes copy');
  assert.equal(await frame.evaluate(() => window.seedFixture.writes.at(-1)), token);
  for (const mode of ['denied', 'throw', 'absent']) {
    await frame.evaluate(mode => { window.seedFixture.mode = mode; }, mode);
    await frame.locator('#copy-seed').click();
    await frame.waitForFunction(() => document.querySelector('#copy-seed-status').textContent.includes('device’s Copy'));
    const selection = await frame.locator('#run-seed-code').evaluate(field => ({ start: field.selectionStart, end: field.selectionEnd, focus: document.activeElement === field }));
    assert.deepEqual(selection, { start: 0, end: token.length, focus: true });
    assert.equal(await frame.locator('#copy-seed').isEnabled(), true);
    assert.doesNotMatch(await frame.locator('#copy-seed-status').innerText(), /copied/i, 'denied copy never reports success');
  }
  await frame.evaluate(() => { window.seedFixture.mode = 'pending'; });
  await frame.locator('#copy-seed').click();
  await frame.locator('#play').focus();
  await frame.evaluate(() => window.seedFixture.resolveCopy());
  await frame.waitForFunction(() => document.querySelector('#copy-seed-status').textContent === 'Seed copied.');
  assert.equal(await frame.evaluate(() => document.activeElement.id), 'play', 'late success does not take focus from the next action');
  evidence.scenarios.push('Keyboard activation, async clipboard success, denied/throwing/absent clipboard with selected manual fallback, stable per-frame text/focus');

  const endedRoute = await frame.locator('#result-route').innerText();
  assert.match(endedRoute, /Butter/);
  await frame.locator('#choose').click(); await advance(250);
  await frame.locator('#collection-next').click(); await advance(20);
  assert.equal(await frame.locator('#collection-traveler-name').innerText(), 'Sunny');
  await frame.locator('#collection-traveler-select').click(); await advance(20);
  await frame.locator('#close-drawer').click(); await advance(250);
  assert.equal(await frame.locator('#result-route').innerText(), endedRoute, 'changing the next traveler preserves the traveler recorded in the completed run');
  assert.equal(await frame.locator('#run-seed-code').inputValue(), token, 'changing the next traveler preserves the completed course seed');
  evidence.scenarios.push('Changing the next traveler preserves the completed run’s traveler and seed.');

  for (const theme of ['dark', 'light']) {
    const colors = theme === 'dark' ? { background: '#152821', text: '#f3ecd4', primary: '#e6c164' } : { background: '#f4f2df', text: '#263c38', primary: '#477763' };
    await frame.evaluate(colors => window.seedFixture.setTheme({ colors }), colors);
    for (const [width, height] of [[900, 600], [320, 560], [2400, 1200], [1000, 240], [240, 240], [200, 160]]) {
      await page.setViewportSize({ width: Math.max(1100, width), height: Math.max(750, height) });
      await iframe.evaluate((node, { width, height }) => { node.style.width = `${width}px`; node.style.height = `${height}px`; }, { width, height });
      await advance(48);
      if (width < 240) {
        assert.equal(await frame.locator('.too-small').isVisible(), true);
        assert.equal(await frame.locator('#copy-seed').isVisible(), false);
      } else {
        await resultHome();
        assert.equal(await frame.locator('#play').isVisible(), true, `${theme} ${width}×${height}: retry visible on results home`);
        await panelLayout(`${theme} ${width}×${height} results home`);
        if (width === 240 || width === 900) await iframe.screenshot({ path: new URL(`seed-result-${width}-${theme}.png`, output).pathname });
        await seedPage();
        await panelLayout(`${theme} ${width}×${height} seed page`);
        assert.equal(await frame.locator('#run-seed-code').inputValue(), token, 'every size shows the complete seed');
        await frame.evaluate(() => { window.seedFixture.mode = 'absent'; });
        await frame.locator('#run-seed-code').click();
        const selected = await frame.locator('#run-seed-code').evaluate(field => ({ start: field.selectionStart, end: field.selectionEnd, focus: document.activeElement === field }));
        assert.deepEqual(selected, { start: 0, end: token.length, focus: true }, `${theme} ${width}×${height}: displayed seed stays copyable without clipboard permission`);
        await panelLayout(`${theme} ${width}×${height} manual copy feedback`);
        if (width === 240 || width === 900) await iframe.screenshot({ path: new URL(`seed-copy-${width}-${theme}.png`, output).pathname });
        if (await frame.locator('#run-menu-back').isVisible()) {
          await frame.evaluate(() => window.seedFixture.handlers['puddlehop.back-menu']()); await advance(250);
          assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'dead', 'Escape from the seed returns to results without retrying');
          assert.equal(await frame.locator('#play').isVisible(), true);
        }
        await resultHome();
      }
      evidence.frames.push({ theme, width, height });
    }
  }

  await iframe.evaluate(node => { node.style.width = '900px'; node.style.height = '600px'; }); await advance(48);
  phase = 'retry and teardown';
  await resultHome(); await seedPage();
  await frame.evaluate(() => { window.seedFixture.mode = 'pending'; });
  await frame.locator('#copy-seed').click();
  assert.equal(await frame.locator('#copy-seed').isDisabled(), true);
  await frame.locator('#play').click(); await advance(32);
  assert.equal(await frame.locator('#run-seed').isHidden(), true);
  assert.equal(await frame.locator('#run-seed-code').inputValue(), '');
  await frame.evaluate(() => window.seedFixture.resolveCopy()); await advance(32);
  assert.equal(await frame.locator('#copy-seed-status').innerText(), '', 'late previous-run promise cannot repaint new run');
  await advance(20000);
  await frame.locator('#copy-seed').click();
  await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
  await frame.evaluate(() => window.seedFixture.resolveCopy());
  assert.notEqual(await frame.locator('#copy-seed-status').innerText(), 'Seed copied.', 'disposed UI ignores late clipboard completion');
  evidence.scenarios.push('Retry clears the seed and invalidates delayed copy completion; teardown releases handler and ignores in-flight copy');

  // The local Paja preview exercises the real shell injection and sandbox too.
  const pajaURL = process.env.DOWN_TO_DUCK_SEED_RUNTIME_URL ?? 'http://127.0.0.1:5197/';
  phase = 'actual Paja clipboard';
  const paja = await context.newPage();
  paja.setDefaultTimeout(10000); await paja.clock.install();
  paja.on('pageerror', error => evidence.errors.push(error.message));
  await context.grantPermissions(['clipboard-read'], { origin: new URL(pajaURL).origin });
  await paja.goto(pajaURL);
  const pajaIframe = paja.locator('iframe');
  await paja.frameLocator('iframe').locator('#copy-seed').waitFor({ state: 'attached' });
  const pajaFrame = await (await pajaIframe.elementHandle()).contentFrame();
  assert.equal(await pajaIframe.getAttribute('sandbox'), 'allow-scripts');
  assert.equal(await pajaFrame.evaluate(() => location.origin), 'null');
  await paja.clock.pauseAt((await paja.evaluate(() => Date.now())) + 100);
  await pajaFrame.locator('#play').click(); await paja.clock.runFor(20000);
  assert.equal(await pajaFrame.locator('#result-content').isVisible(), true);
  const pajaToken = await pajaFrame.locator('#run-seed-code').inputValue();
  assert.match(pajaToken, /^ph3-/, 'actual shell uses the current course schema');
  if (!await pajaFrame.locator('#run-seed-code').isVisible()) { await pajaFrame.locator('[data-run-topic="seed"]').click(); await paja.clock.runFor(250); }
  await pajaFrame.locator('#run-seed-code').click();
  assert.equal(await pajaFrame.locator('#copy-seed-status').innerText(), 'Seed copied.');
  assert.equal(await paja.evaluate(() => navigator.clipboard.readText()), pajaToken);
  await pajaIframe.screenshot({ path: new URL('seed-result-paja.png', output).pathname });
  evidence.scenarios.push('Actual Paja shell: natural death and real clipboard copy succeed in its unmodified opaque sandbox');

  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  await writeFile(new URL('seed-copy-runtime.json', output), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  evidence.failure = { phase, message: String(error) };
  const page = browser.contexts()[0]?.pages().at(-1);
  await page?.locator('iframe').screenshot({ path: new URL('seed-copy-failure.png', output).pathname }).catch(() => {});
  await writeFile(new URL('seed-copy-runtime.json', output), JSON.stringify(evidence, null, 2));
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
