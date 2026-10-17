import { artifactForCoverage, artifactDirectoryForCoverage, registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';
// Verify the real development and production artifacts, each in an opaque frame.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const production = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const development = await readFile(artifactForCoverage(new URL('../dist-dev/index.html', import.meta.url), 'development'), 'utf8');
const coverageProduction = await readFile(artifactForCoverage(new URL('../dist/index.html', import.meta.url)), 'utf8');
const output = artifactDirectoryForCoverage(new URL('../artifacts/', import.meta.url), 'devtools-runtime');
assert.throws(() => artifactForCoverage('', 'not-a-build'), /Invalid browser build scope/);
const developmentMarkers = ['development-tools', 'development-jump-form', 'development-score', 'development-seed-form', 'Load copied seed', 'Jump or load starts a fresh sandbox run', 'SANDBOX · records disabled', '+25 run coins', 'DEVELOPMENT RUN', 'Sandbox finished. Lifetime records unchanged.'];
for (const marker of developmentMarkers) {
  assert.ok(development.includes(marker), `Development artifact includes ${marker}`);
  assert.ok(!production.includes(marker), `Production artifact excludes ${marker}`);
}
async function artifactFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) files.push(...await artifactFiles(path)); else files.push(path);
  }
  return files;
}
for (const path of await artifactFiles(new URL('../dist/', import.meta.url))) {
  const artifact = await readFile(path, 'utf8');
  for (const marker of developmentMarkers) assert.ok(!artifact.includes(marker), `No separately shipped production asset contains ${marker}: ${path.pathname}`);
  assert.ok(!/devtools(?:-state)?[.-]/.test(path.pathname), 'No production development module asset');
  for (const symbol of ['jumpDevelopmentRun', 'developmentDiagnostics', 'DEVELOPMENT_SCORE_LIMIT', 'sandboxRun', 'mountDevTools']) assert.ok(!artifact.includes(symbol), `Production excludes development symbol ${symbol}`);
}
assert.ok(!/<script\b[^>]*\bsrc=|<link\b[^>]*\brel=["']stylesheet/i.test(development), 'Development artifact remains self-contained for opaque iframe preview');

function installFixture(deferStorage = false) {
  Math.random = () => .125;
  const f = window.developmentFixture = { handlers: {}, writes: [], themes: [], ready: false };
  let theme = { colors: { background: '#152821', text: '#f3ecd4', primary: '#e6c164' } };
  f.theme = value => { theme = value; f.themes.forEach(callback => callback(value)); };
  window.napplet = {
    storage: { async getItem(key) { if (key !== 'puddlehop.progress.v1') return null; if (deferStorage) await new Promise(resolve => { f.resolveStorage = resolve; }); return JSON.stringify({ travelerVersion: 2, mode: 'arcade', coins: 9, best: 17, runs: 4, muted: true }); }, async setItem(key, value) { f.writes.push({ key, value }); } },
    theme: { async get() { return theme; }, onChanged(callback) { f.themes.push(callback); return { close() { f.themes.splice(f.themes.indexOf(callback), 1); } }; } },
    keys: { async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; }, onAction(id, callback) { f.handlers[id] = callback; return { close() { delete f.handlers[id]; } }; }, unregisterAction() {} },
  };
}
const injected = `<script>(${installFixture.toString()})(__DEFER_STORAGE__);</script>`;
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const harness = `<!doctype html><body style="margin:0"><iframe title="Development artifact fixture" sandbox="allow-scripts" style="width:900px;height:600px;border:0"></iframe><script>const variants=${json({ development, production: coverageProduction })};window.mount=(variant,fixture=true,deferStorage=false)=>{document.querySelector('iframe').srcdoc=fixture?variants[variant].replace('<head>','<head>'+${json(injected)}.replace('__DEFER_STORAGE__',String(deferStorage))):variants[variant];};window.mount('development');</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const evidence = { artifacts: ['dist-dev/index.html', 'dist/index.html'], scenarios: [], frames: [], errors: [], external: [] };
await mkdir(output, { recursive: true });
let browser, frame, identity, generation = 0;
async function beginRealm(page, scenario, buildScope) {
  if (frame) await collectRealm(frame, identity);
  frame = undefined;
  identity = { suite: process.argv[1], scenario, frame: 'opaque-app', generation: generation++, scope: 'current', buildScope };
  if (process.env.DOWN_TO_DUCK_COVERAGE_CONFIG) {
    assert.throws(() => registerRealm(page, { ...identity, buildScope: 'missing' }), /Missing browser build scope/);
    assert.throws(() => registerRealm(page, { ...identity, jobId: 'wrong-job' }), /Wrong browser job/);
  }
  registerRealm(page, identity);
}
try {
  browser = await chromium.launch({ args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.setDefaultTimeout(8000); await page.clock.install();
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.route('**/*', route => { if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue(); evidence.external.push(route.request().url()); return route.abort(); });
  await beginRealm(page, 'development-controls', 'development');
  await page.goto(`http://127.0.0.1:${server.address().port}/?dev=1&debug=1`);
  frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.waitForFunction(() => !!window.developmentFixture?.handlers['puddlehop.market'] && !!document.querySelector('#development-toggle'));
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
  const advance = ms => page.clock.runFor(ms);
  const state = () => frame.locator('#development-state').innerText();
  const key = async name => { await frame.evaluate(name => window.developmentFixture.handlers[`puddlehop.${name}`](), name); await advance(30); };
  assert.equal(await frame.evaluate(() => location.origin), 'null');
  // Closing the inspector restores the underlying run and input surface for
  // every supported route, without resuming a paused run or changing records.
  for (const close of ['toggle', 'button', 'escape', 'blur', 'visibility']) {
    await frame.locator('#development-toggle').click(); await advance(20);
    assert.equal(await frame.locator('#app').evaluate(app => app.inert), true);
    const inspected = await state();
    if (close === 'toggle') await frame.locator('#development-toggle').click();
    if (close === 'button') await frame.locator('#development-close').click();
    if (close === 'escape') await frame.locator('#development-score').press('Escape');
    if (close === 'blur') await frame.evaluate(() => {
      dispatchEvent(new Event('blur'));
      dispatchEvent(new Event('focus'));
    });
    if (close === 'visibility') {
      // Host visibility delivery is arranged explicitly; no claim of a native
      // operating-system background transition is made by this browser case.
      await frame.evaluate(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.equal(await frame.locator('#development-panel').isVisible(), true, 'a visible-state notification keeps the inspector open');
      await frame.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }
    await advance(20);
    assert.equal(await frame.locator('#development-panel').isVisible(), false, close);
    assert.equal(await frame.locator('#app').evaluate(app => app.inert), false, `${close} restores game input availability`);
    await frame.locator('#development-toggle').click(); await advance(20);
    assert.equal(await state(), inspected, `${close} leaves inspected simulation unchanged`);
    await frame.locator('#development-close').click();
  }
  await frame.locator('#development-toggle').click();
  await frame.locator('[data-development-score="100"]').click(); await advance(30);
  assert.match(await state(), /SANDBOX · records disabled · paused/);
  assert.match(await state(), /score 100 · position 0.00, 100.00 · hop 0.000/);
  assert.match(await state(), /chapter 4/); assert.match(await state(), /market 100/);
  assert.equal(await frame.locator('#score').innerText(), '100');
  const frozen = await state();
  await advance(1000); assert.equal(await state(), frozen, 'inspector pauses real simulation');
  await frame.locator('#development-score').fill('123');
  await frame.locator('#development-score').press('ArrowLeft');
  for (const action of ['forward', 'forward-w', 'pause', 'play', 'market', 'call']) await key(action);
  assert.equal(await state(), frozen, 'injected SDK keys cannot change the run while typing inspector input');
  await frame.locator('#development-jump-form button').click(); await advance(20);
  assert.match(await state(), /score 123/, 'typed score works with a real click inside the sandbox');
  await frame.locator('#development-score').fill('100');
  await frame.locator('#development-score').press('Enter'); await advance(20);
  assert.match(await state(), /score 100/, 'Enter runs the same local jump without native form submission');
  await frame.locator('#development-coins').click();
  await frame.locator('#development-score').focus();
  await page.keyboard.down('Enter');
  assert.equal(await frame.locator('#coins').innerText(), '0', 'the fresh Enter performs the requested reset');
  await frame.locator('#development-coins').click();
  await frame.locator('#development-score').focus();
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  assert.equal(await frame.locator('#coins').innerText(), '25', 'a held Enter repeat cannot reset the sandbox again');
  await frame.locator('#development-score').press('Enter'); await advance(20);
  assert.equal(await frame.locator('#coins').innerText(), '0');
  assert.equal(await frame.locator('#market').isVisible(), false);
  await frame.locator('#development-coins').click(); await advance(20);
  assert.equal(await frame.locator('#coins').innerText(), '25'); assert.match(await state(), /wallet 25/);
  await frame.locator('#development-heal').click(); await frame.locator('#development-clear-mobs').click();
  assert.match(await state(), /health 3.00\/3/); assert.match(await state(), /mobs none/);
  const sandboxWrites = await frame.evaluate(() => window.developmentFixture.writes.length);
  await frame.locator('#development-resume').click(); await advance(40);
  assert.equal(await frame.locator('#development-panel').isVisible(), false);
  await key('market'); assert.equal(await frame.locator('#market').isVisible(), true, 'teleport creates an actual functional market invitation');
  await key('market'); await advance(11000);
  assert.equal(await frame.locator('#result-content').isVisible(), true, 'sandbox survives gameplay and reaches normal death UI');
  assert.equal(await frame.locator('#result-score').innerText(), '100');
  assert.equal(await frame.evaluate(() => window.developmentFixture.writes.length), sandboxWrites, 'sandbox mutations and death never write lifetime records');
  assert.equal(await frame.locator('#best').textContent(), 'BEST 17', 'hidden HUD retains the lifetime record while the death board is open');
  await frame.locator('#play').click(); await advance(40);
  assert.equal(await frame.locator('#score').innerText(), '0'); assert.equal(await frame.locator('#coins').innerText(), '0');
  await frame.locator('#development-toggle').click(); await advance(20);
  assert.match(await state(), /UNMODIFIED RUN/);
  await frame.locator('#development-resume').click(); await advance(15000);
  const saved = await frame.evaluate(() => JSON.parse(window.developmentFixture.writes.at(-1).value));
  assert.equal(saved.best, 17); assert.equal(saved.coins, 9); assert.equal(saved.runs, 5, 'clean retry records normally after sandbox run');
  evidence.scenarios.push('score jump updates actual position/map/chapter/camera, safe landing and market; sandbox coins/heal/clear; input capture; paused clocks; no lifetime changes; clean retry restores persistence');

  await frame.locator('#development-toggle').click(); await frame.locator('[data-development-score="480"]').click(); await advance(20);
  assert.match(await state(), /score 480/); assert.match(await state(), /chapter 16/);
  const beforeInvalid = await state();
  await frame.locator('#development-seed').fill('ph99-1234abcd-frost-s-g');
  await frame.locator('#development-seed-form button').click(); await advance(20);
  assert.equal(await state(), beforeInvalid, 'unsupported schema leaves current sandbox untouched');
  assert.match(await frame.locator('#development-status').innerText(), /unsupported/i);
  const shared = 'ph1-1234abcd-frost-s-g';
  await frame.locator('#development-seed').fill(shared);
  await frame.locator('#development-seed-form button').click(); await advance(20);
  assert.match(await state(), /paused · stroll/); assert.match(await state(), /score 0/);
  assert.match(await state(), /Snowdrop Pass/); assert.ok((await state()).includes(shared));
  assert.equal(await frame.locator('#coins').innerText(), '0');
  await frame.locator('#development-coins').click();
  await frame.locator('#development-seed').press('Enter'); await advance(20);
  assert.equal(await frame.locator('#coins').innerText(), '0', 'Enter loads a fresh seed run in the sandbox');
  assert.match(await state(), /paused · stroll/);
  await frame.locator('[data-development-score="480"]').click(); await advance(20);
  assert.match(await state(), /score 480/); assert.ok((await state()).includes(shared), 'score jump preserves the copied versioned identity');
  for (const schema of [2, 3]) {
    const currentShared = `ph${schema}-1234abcd-frost-s-g`;
    await frame.locator('#development-seed').fill(currentShared);
    await frame.locator('#development-seed-form button').click(); await advance(20);
    assert.match(await state(), /paused · stroll/); assert.match(await state(), /score 0/);
    assert.match(await state(), /Snowdrop Pass/); assert.ok((await state()).includes(currentShared));
    await frame.locator('[data-development-score="480"]').click(); await advance(20);
    assert.match(await state(), /score 480/); assert.ok((await state()).includes(currentShared), 'course retains its schema when jumping to varied traffic and rivers');
  }
  evidence.scenarios.push('load copied schema 1, 2 and 3 seeds restores encoded world/mode/gentle/schema in a fresh paused sandbox; invalid versions do not mutate; score jumps preserve all identities');
  const canvas = await frame.locator('#scene').evaluate(canvas => canvas.toDataURL()); assert.ok(canvas.length > 1000, 'far map renders');
  for (const theme of ['dark', 'light']) {
    await frame.evaluate(theme => window.developmentFixture.theme({ colors: theme === 'dark' ? { background: '#152821', text: '#f3ecd4', primary: '#e6c164' } : { background: '#f4f2df', text: '#263c38', primary: '#477763' } }), theme);
    for (const [width, height] of [[200, 160], [240, 240], [320, 560], [900, 600], [1000, 240], [2400, 1200]]) {
      await page.setViewportSize({ width: Math.max(1000, width), height: Math.max(700, height) });
      await page.locator('iframe').evaluate((el, { width, height }) => { el.style.width = `${width}px`; el.style.height = `${height}px`; }, { width, height }); await advance(64);
      if (width < 240) { assert.equal(await frame.locator('#development-toggle').isVisible(), false); assert.equal(await frame.locator('.too-small').isVisible(), true); }
      else {
        if (!await frame.locator('#development-panel').isVisible()) await frame.locator('#development-toggle').click();
        const bounds = await frame.locator('#development-panel').evaluate(el => { const box = el.getBoundingClientRect(); return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: el.clientWidth, scrollWidth: el.scrollWidth }; });
        assert.ok(bounds.left >= 0 && bounds.top >= 0 && bounds.right <= width && bounds.bottom <= height, JSON.stringify(bounds));
        assert.ok(bounds.scrollWidth <= bounds.width + 1, 'inspector has no horizontal overflow');
        if ((width === 900 && theme === 'dark') || (width === 320 && theme === 'light')) await page.locator('iframe').screenshot({ path: new URL(`development-${width}-${theme}.png`, output).pathname });
      }
      evidence.frames.push({ width, height, theme });
    }
  }
  await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
  assert.equal(await frame.locator('#development-tools').count(), 0, 'teardown removes inspector and its listeners');
  assert.equal(await frame.evaluate(() => Object.keys(window.developmentFixture.handlers).length), 0);

  // Hydration must not replace a sandbox that was edited on the ready screen.
  await beginRealm(page, 'development-hydration', 'development');
  await page.evaluate(() => window.mount('development', true, true));
  frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.waitForFunction(() => !!window.developmentFixture?.resolveStorage && !!document.querySelector('#development-toggle'));
  await frame.locator('#development-toggle').click(); await frame.locator('#development-coins').click(); await advance(30);
  assert.match(await state(), /SANDBOX · records disabled · ready/);
  const pendingSeed = (await state()).match(/seed (\d+)/)[1];
  assert.equal(await frame.locator('#coins').innerText(), '25');
  await frame.evaluate(() => window.developmentFixture.resolveStorage());
  await frame.waitForFunction(() => !!window.developmentFixture.handlers['puddlehop.market']); await advance(40);
  assert.equal(await frame.locator('#coins').innerText(), '25', 'late hydration cannot reset an edited ready-screen sandbox');
  assert.match(await state(), /SANDBOX · records disabled · ready/);
  assert.equal((await state()).match(/seed (\d+)/)[1], pendingSeed, 'late storage preserves the inspected map seed');
  assert.equal(await frame.locator('#best').innerText(), 'BEST 17', 'lifetime records still hydrate');
  evidence.scenarios.push('delayed storage hydration preserves ready-screen sandbox wallet, seed and record-isolation flag');

  // Replacing a multiplayer world must retire its old owners and input routes,
  // not leave a solo inspector describing a different world from the renderer.
  for (const replacement of ['jump', 'load']) {
    await beginRealm(page, `development-local-play-${replacement}`, 'development');
    await page.locator('iframe').evaluate(el => { el.style.width = '900px'; el.style.height = '600px'; });
    await page.evaluate(() => window.mount('development'));
    frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    await frame.waitForFunction(() => !!window.developmentFixture?.handlers['puddlehop.market'] && !!document.querySelector('#development-toggle'));
    await frame.locator('#local-play').click();
    await frame.locator('#local-session-start').click();
    assert.equal(await frame.locator('#session-seats [data-seat]').count(), 2);
    const writesBefore = await frame.evaluate(() => window.developmentFixture.writes.length);
    await frame.locator('#development-toggle').click();
    if (replacement === 'jump') await frame.locator('[data-development-score="100"]').click();
    else {
      await frame.locator('#development-seed').fill('ph3-1234abcd-frost-s-g');
      await frame.locator('#development-seed-form button').click();
    }
    await advance(30);
    const score = replacement === 'jump' ? 100 : 0;
    assert.match(await state(), new RegExp(`SANDBOX · records disabled · paused[\\s\\S]*score ${score} · position 0.00, ${score}.00`));
    assert.equal(await frame.locator('#session-seats').isVisible(), false, `${replacement} retires the previous multiplayer world and its HUD`);
    assert.equal(await frame.locator('#local-session-setup').isVisible(), false);
    await frame.locator('#development-resume').click(); await advance(40);
    await frame.waitForFunction(() => !!window.developmentFixture.handlers['puddlehop.right']);
    await key('right'); await advance(180);
    await frame.locator('#development-toggle').click();
    assert.match(await state(), new RegExp(`score ${score} · position 1.00, ${score}.00`), 'restored solo input moves the inspected world');
    await frame.locator('#development-coins').click();
    assert.match(await state(), /wallet 25/);
    assert.equal(await frame.evaluate(() => window.developmentFixture.writes.length), writesBefore, 'replacing a session and manipulating its sandbox cannot persist lifetime records');
    evidence.scenarios.push(`public local-play → development ${replacement} retires session owners, restores solo input and preserves sandbox record isolation`);
  }

  await beginRealm(page, 'production-boundary', 'production');
  await page.evaluate(() => window.mount('production'));
  frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.waitForFunction(() => !!window.developmentFixture?.handlers['puddlehop.market']);
  assert.equal(await frame.locator('#development-tools').count(), 0, 'production has no controls or diagnostic text even with dev/debug URL flags');
  assert.equal(await frame.evaluate(() => Object.keys(window).some(key => /devtools|jumpDevelopment|developmentScore/i.test(key))), false, 'no public debug mutation API');
  await frame.locator('#play').click(); await advance(30);
  assert.equal(await frame.locator('#score').innerText(), '0');
  evidence.scenarios.push('production artifact and every emitted asset exclude dev modules/UI/debug labels; production iframe exposes no controls or debug mutation globals');
  await beginRealm(page, 'development-no-sdk', 'development');
  await page.evaluate(() => window.mount('development', false));
  frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.locator('#development-toggle').click(); await frame.locator('[data-development-score="99"]').click(); await advance(30);
  assert.match(await state(), /score 99/); assert.match(await state(), /market none/);
  evidence.scenarios.push('development inspector works without optional SDK domains');
  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  await writeFile(new URL('development-runtime.json', output), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { try { if (frame) await collectRealm(frame, identity); } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); } }
