import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=/i, 'artifact is self-contained');
assert.doesNotMatch(html, /\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)|document\.cookie|window\.nostr/);
const pajaCommand = process.env.DOWN_TO_DUCK_PAJA_CLI ? process.execPath : 'kehto';
const pajaPrefix = process.env.DOWN_TO_DUCK_PAJA_CLI ? [process.env.DOWN_TO_DUCK_PAJA_CLI] : ['paja'];
const runtime = spawn(pajaCommand, [...pajaPrefix, '--target-url', 'http://127.0.0.1:5175', '--port', '5198', '--theme', 'light', '--relay-mode', 'disabled', '--storage-mode', 'local', '--firewall-mode', 'observe', '--', 'pnpm', 'vite', 'preview', '--host', '127.0.0.1', '--port', '5175', '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; runtime.stdout.on('data', b => log += b); runtime.stderr.on('data', b => log += b);
const ready = new Promise((resolve, reject) => {
  runtime.once('error', reject); runtime.once('exit', code => reject(new Error(`Runtime exited ${code}: ${log}`)));
  const timer = setTimeout(() => { clearInterval(poll); reject(new Error(`Runtime readiness timeout: ${log}`)); }, 15_000);
  const poll = setInterval(() => { if (log.includes('Local:')) { clearInterval(poll); clearTimeout(timer); resolve(); } }, 100);
});
let browser, darkRuntime;
const evidence = { artifact: 'single self-contained HTML; forbidden surfaces absent', frames: [], waveFrames: [], scenarios: [], runtime: 'Paja; opaque sandbox allow-scripts', errors: [] };
try {
  await ready; browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.clock.install();
  await page.addInitScript(() => {
    const native = window.AudioContext;
    window.callAudioObservations = [];
    window.AudioContext = class extends native {
      createBufferSource() {
        const source = super.createBufferSource(), start = source.start.bind(source);
        source.start = (...args) => { window.callAudioObservations.push(source.buffer?.duration); return start(...args); };
        return source;
      }
    };
  });
  page.on('pageerror', e => evidence.errors.push(e.message));
  await page.goto('http://127.0.0.1:5198/');
  const frame = () => page.frames().find(f => f.name() === 'napplet-frame');
  await page.frameLocator('iframe').locator('#goal').waitFor();
  await page.waitForFunction(() => document.body.innerText.includes('keys.registerAction.result'));
  assert.equal(await page.locator('iframe').getAttribute('sandbox'), 'allow-scripts');
  let f = frame();
  await f.waitForFunction(() => document.querySelector('#character-call').getAttribute('aria-label') === 'Make Butter quack (Q)');
  assert.equal(await f.locator('#world-label').textContent(), 'Apricot Grove');
  await f.locator('#character-call').click();
  await f.waitForFunction(() => window.callAudioObservations.length === 1);
  await page.waitForTimeout(480);
  await page.keyboard.press('q');
  await f.waitForFunction(() => window.callAudioObservations.length === 2);
  assert.equal(await f.locator('#score').textContent(), '0');
  assert.equal(await f.locator('#ready-content').isVisible(), true);
  evidence.scenarios.push('default duck call button and actual shell Q binding play audio without starting or moving the traveler');
  await f.getByRole('button', { name: 'Hop forward', exact: true }).click(); await page.waitForTimeout(180);
  await f.locator('canvas').click({ position: { x: 500, y: 350 } }); await page.waitForTimeout(180);
  await page.keyboard.press('s'); await page.waitForTimeout(180);
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(180);
  await page.keyboard.press('w'); await page.waitForTimeout(180);
  assert.equal(await f.locator('#score').innerText(), '2');
  await f.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
  });
  assert.equal(await f.locator('#pause-content').isVisible(), true);
  await page.keyboard.press('Enter'); await page.waitForTimeout(120);
  await page.locator('iframe').evaluate(e => { e.style.width = '200px'; e.style.height = '160px'; }); await page.waitForTimeout(120);
  await page.locator('iframe').evaluate(e => { e.style.width = '900px'; e.style.height = '600px'; }); await page.waitForTimeout(120);
  assert.equal(await f.locator('#pause-content').isVisible(), true);
  await page.keyboard.press('Enter'); await page.waitForTimeout(120);
  await page.keyboard.press('p'); await page.waitForTimeout(120); assert.equal(await f.locator('#pause-content').isVisible(), true);
  const score = await f.locator('#score').innerText(); await page.waitForTimeout(300); assert.equal(await f.locator('#score').innerText(), score);
  evidence.scenarios.push('touch tap + buttons + Arrow/WASD + Enter resume + P pause + background visibility event pause');
  // Every primary control is visible, inside its frame, and actually receives the click.
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') {
      darkRuntime = spawn(pajaCommand, [...pajaPrefix, '--target-url', 'http://127.0.0.1:5175', '--port', '5196', '--theme', 'dark', '--relay-mode', 'disabled', '--storage-mode', 'local', '--firewall-mode', 'observe'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      await new Promise((resolve, reject) => {
        let output = ''; const timer = setTimeout(() => reject(new Error('Dark runtime readiness timeout')), 10000);
        darkRuntime.once('error', reject); darkRuntime.stdout.on('data', b => { output += b; if (output.includes('Runtime URL:')) { clearTimeout(timer); resolve(); } });
      });
      await page.goto('http://127.0.0.1:5196/');
      await page.frameLocator('iframe').locator('#goal').waitFor(); await page.waitForTimeout(300);
    }
    f = frame();
    for (const [width, height] of [[200,160], [320,560], [900,600], [2400,1200], [240,240], [1000,240]]) {
      await page.setViewportSize({ width: Math.max(width + 400, 1000), height: Math.max(height + 60, 700) });
      await page.locator('iframe').evaluate((e, size) => { e.style.width = `${size.width}px`; e.style.height = `${size.height}px`; e.style.flex = 'none'; }, { width, height });
      await page.waitForTimeout(100);
      const result = await f.evaluate(() => {
        const rects = [...document.querySelectorAll('button')].filter(e => e.offsetParent && !e.disabled).map(e => {
          const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return { id: e.id || e.getAttribute('aria-label'), fits: r.x >= 0 && r.y >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5, hit: e === hit || e.contains(hit) };
        });
        return { width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight, notice: getComputedStyle(document.querySelector('.too-small')).display === 'grid', backgrounds: ['html','body','#app'].map(s => getComputedStyle(document.querySelector(s)).backgroundColor), buttons: rects };
      });
      assert.equal(result.width, width); assert.equal(result.height, height); assert.equal(result.overflow, false); assert.equal(result.notice, width < 240 || height < 240);
      assert.ok(result.backgrounds.every(c => c === result.backgrounds[0]));
      const rgb = result.backgrounds[0].match(/\d+/g).map(Number);
      assert.ok(theme === 'light' ? rgb[0] > 200 : rgb[0] < 80, 'shell theme really applied');
      assert.ok(result.buttons.every(b => b.fits && b.hit), JSON.stringify(result));
      evidence.frames.push({ theme, ...result });
      await page.locator('iframe').screenshot({ path: new URL(`frame-${width}x${height}-${theme}.png`, output).pathname });
    }
  }
  evidence.scenarios.push('light/dark host themes cover html/body/root; minimum-size notice preserves the run');
  await page.setViewportSize({ width: 1400, height: 900 }); await page.locator('iframe').evaluate(e => { e.style.width = '900px'; e.style.height = '600px'; });
  // Exercise the documented shell-pushed event; Paja's simulation picker updates its provider only on reload.
  const shellTheme = await f.evaluate(() => window.napplet.theme.get());
  const changedTheme = { ...shellTheme, colors: { ...shellTheme.colors, background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } };
  await page.evaluate(theme => document.querySelector('iframe').contentWindow.postMessage({ type: 'theme.changed', theme }, '*'), changedTheme);
  await page.waitForTimeout(100);
  assert.equal(await f.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(36, 43, 50)');
  evidence.scenarios.push('documented shell theme.changed event repaints the current view without reload');
  await f.getByRole('button', { name: 'Travelers and worlds', exact: true }).click();
  assert.equal(await f.locator('#traveler-grid .content-card').count(), 6); assert.equal(await f.locator('#traveler-grid button:disabled').count(), 4);
  await f.getByRole('button', { name: 'Worlds', exact: true }).click(); assert.equal(await f.locator('#world-grid .content-card').count(), 8);
  await f.getByRole('button', { name: /Snowdrop Pass/ }).click(); await f.getByRole('checkbox', { name: 'Less motion' }).check();
  await f.getByRole('button', { name: 'Close collection', exact: true }).click();
  await page.waitForFunction(() => document.body.innerText.includes('storage.set.result'));
  await page.waitForTimeout(3100);
  await page.getByRole('button', { name: 'Reload', exact: true }).click(); await page.waitForTimeout(400); f = frame();
  assert.equal(await f.locator('#world-label').innerText(), 'Snowdrop Pass');
  await f.getByRole('button', { name: 'Travelers and worlds', exact: true }).click(); assert.equal(await f.getByRole('checkbox', { name: 'Less motion' }).isChecked(), true);
  await f.getByRole('button', { name: 'Close collection', exact: true }).click();
  evidence.scenarios.push('6 travelers, 6 worlds + home/shuffle; chosen world and motion preferences persist across shell reload');
  assert.equal(await f.locator('#idle').isVisible(), false, 'the wave warning stays hidden before play');
  // Freeze while still ready, then advance simulation explicitly. Assertions and
  // screenshots must not consume the player's escape margin on slower machines.
  await page.clock.pauseAt((await f.evaluate(() => Date.now())) + 1000);
  await f.getByRole('button', { name: 'Hop forward', exact: true }).dispatchEvent('click');
  const advanceUntilWarning = async limit => {
    for (let elapsed = 0; elapsed < limit && !await f.locator('#idle').isVisible(); elapsed += 100) await page.clock.runFor(100);
    assert.equal(await f.locator('#idle').isVisible(), true, 'continuous wave pursuit eventually warns the player');
  };
  await advanceUntilWarning(8000);
  assert.match(await f.locator('#chase-message').innerText(), /Wave (?:closing in|at your heels)/);
  assert.match(await f.locator('#idle').innerText(), /Hop ↑ forward to escape/);
  assert.match(await f.locator('#chase-time').innerText(), /^[1-5]s$/);
  const chaseMeter = f.locator('#chase-meter');
  assert.equal(await chaseMeter.getAttribute('role'), 'progressbar');
  assert.equal(await chaseMeter.getAttribute('aria-valuemin'), '0');
  assert.equal(await chaseMeter.getAttribute('aria-valuemax'), '5');
  assert.ok(Number(await chaseMeter.getAttribute('aria-valuenow')) > 0);
  assert.ok(await f.locator('[data-direction="forward"]').evaluate(button => button.classList.contains('escape')), 'the escape direction is indicated on its button');
  await page.screenshot({ clip: await page.locator('iframe').boundingBox(), path: new URL('wave-warning-reduced-motion.png', output).pathname });
  await f.getByRole('button', { name: 'Pause game', exact: true }).dispatchEvent('click');
  assert.equal(await f.locator('#idle').isVisible(), false, 'paused play hides the urgent prompt');
  const chaseSnapshot = () => f.evaluate(() => ({
    time: document.querySelector('#chase-time').textContent,
    value: document.querySelector('#chase-meter').getAttribute('aria-valuenow'),
    fill: document.querySelector('#chase-fill').style.width,
  }));
  const frozenChase = await chaseSnapshot();
  await page.clock.runFor(500);
  assert.deepEqual(await chaseSnapshot(), frozenChase, 'pause freezes the visible wave countdown and precise margin');
  await f.getByRole('button', { name: 'Resume game', exact: true }).dispatchEvent('click');
  assert.equal(await f.locator('#idle').isVisible(), true);
  await f.getByRole('button', { name: 'Hop forward', exact: true }).dispatchEvent('click');
  await page.clock.runFor(200);
  assert.equal(await f.locator('#score').innerText(), '2');
  assert.equal(await f.locator('#idle').isVisible(), false, 'creating a safe gap clears the warning');
  assert.equal(await f.locator('[data-direction="forward"]').evaluate(button => button.classList.contains('escape')), false, 'the escape cue clears with the safe gap');
  await page.clock.runFor(500);
  assert.equal(await f.locator('#idle').isVisible(), false, 'forward movement buys a sustained safe margin');
  await advanceUntilWarning(4000);
  // Keep browser time controlled while resizing an active warning: pausing the game correctly
  // hides its prompt, so paused/ready layout checks cannot cover this state.
  for (const theme of ['light', 'dark']) {
    const warningTheme = { ...shellTheme, colors: { ...shellTheme.colors,
      background: theme === 'light' ? '#f4f2df' : '#242b32',
      text: theme === 'light' ? '#263c38' : '#f0eee5',
      primary: theme === 'light' ? '#477763' : '#9fc28a',
    } };
    await page.evaluate(theme => document.querySelector('iframe').contentWindow.postMessage({ type: 'theme.changed', theme }, '*'), warningTheme);
    for (const [width, height] of [[320,560], [240,240], [900,600], [2400,1200]]) {
      await page.setViewportSize({ width: Math.max(width + 400, 1000), height: Math.max(height + 60, 700) });
      await page.locator('iframe').evaluate((iframe, size) => { iframe.style.width = `${size.width}px`; iframe.style.height = `${size.height}px`; }, { width, height });
      await page.clock.runFor(32);
      const result = await f.evaluate(() => {
        const warning = document.querySelector('#idle'), rect = warning.getBoundingClientRect();
        const button = document.querySelector('[data-direction="forward"]'), target = button.getBoundingClientRect();
        const hit = document.elementFromPoint(target.x + target.width / 2, target.y + target.height / 2);
        return {
          width: innerWidth, height: innerHeight, visible: !warning.hidden,
          fits: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
          overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
          action: document.querySelector('#chase-action').textContent,
          background: getComputedStyle(warning).backgroundColor,
          reachable: button === hit || button.contains(hit),
        };
      });
      assert.equal(result.width, width); assert.equal(result.height, height);
      assert.equal(result.visible, true); assert.equal(result.fits, true); assert.equal(result.overflow, false); assert.equal(result.reachable, true);
      assert.match(result.action, /Hop ↑ forward to escape/);
      assert.equal(result.background, theme === 'light' ? 'rgb(244, 242, 223)' : 'rgb(36, 43, 50)');
      evidence.waveFrames.push({ theme, ...result });
      await page.screenshot({ clip: await page.locator('iframe').boundingBox(), path: new URL(`wave-${width}x${height}-${theme}.png`, output).pathname });
    }
  }
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.locator('iframe').evaluate(iframe => { iframe.style.width = '900px'; iframe.style.height = '600px'; });
  await page.clock.runFor(32);
  await page.clock.resume();
  await f.locator('#result-content:not([hidden])').waitFor({ timeout: 7000 });
  assert.match(await f.locator('#reason').innerText(), /wave/i); assert.equal(await f.locator('#result-score').innerText(), '2');
  assert.equal(await f.locator('#idle').isVisible(), false, 'capture clears the warning');
  await page.locator('iframe').screenshot({ path: new URL('wave-caught-reduced-motion.png', output).pathname });
  await f.getByRole('button', { name: 'Hop again', exact: true }).click(); assert.equal(await f.locator('#score').innerText(), '0');
  evidence.scenarios.push('wave warning has forward guidance and an accessible margin meter; pause freezes pursuit, forward movement buys time, and capture/retry work with reduced motion');
  await f.getByRole('button', { name: 'Pause game', exact: true }).click();
  await f.getByRole('button', { name: 'Travelers and worlds', exact: true }).click();
  await f.getByRole('button', { name: 'Close collection', exact: true }).click();
  // A known saved-progress fixture exercises unlocks and each traveler's native starting world.
  await f.evaluate(async () => window.napplet.storage.setItem('puddlehop.progress.v1', JSON.stringify({ best: 75, coins: 30, runs: 4, selected: 'pip', travelerVersion: 2, world: 'home', mode: 'arcade', reduced: false })));
  const beforeFixture = await f.evaluate(() => window.napplet.storage.getItem('puddlehop.progress.v1'));
  assert.equal(JSON.parse(beforeFixture).best, 75);
  await page.waitForTimeout(3100);
  await page.getByRole('button', { name: 'Reload', exact: true }).click(); await page.waitForTimeout(600); f = frame();
  const afterFixture = await f.evaluate(() => window.napplet.storage.getItem('puddlehop.progress.v1'));
  assert.equal(JSON.parse(afterFixture).best, 75);
  assert.equal(await f.locator('#best').innerText(), 'BEST 75');
  await f.getByRole('button', { name: 'Travelers and worlds', exact: true }).click();
  assert.equal(await f.locator('#traveler-grid button:disabled').count(), 2);
  await f.getByRole('button', { name: /Butter.*Choose traveler/ }).click(); assert.equal(await f.locator('#world-label').innerText(), 'Apricot Grove');
  await f.getByRole('button', { name: /Beep.*Choose traveler/ }).click(); assert.equal(await f.locator('#world-label').innerText(), 'Moonlit Market');
  await f.getByRole('button', { name: 'Close collection', exact: true }).click();
  evidence.scenarios.push('saved coin/distance milestones unlock travelers; choosing a traveler sets its home-world theme');
  await f.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.waitForFunction(() => document.body.innerText.includes('keys.unregisterAction'));
  evidence.scenarios.push('pagehide releases registered keyboard bindings and stops the view');
  // Reload without optional storage, keyboard and theme. Buttons keep the whole game usable.
  for (const domain of ['storage', 'keys', 'theme']) await page.getByRole('button', { name: domain, exact: true }).click();
  await page.waitForTimeout(3100);
  await page.getByRole('button', { name: 'Reload', exact: true }).click(); await page.waitForTimeout(400); f = frame();
  assert.equal(await f.evaluate(() => Boolean(window.napplet.storage)), false);
  assert.equal(await f.locator('#character-call').textContent(), 'Quack');
  await f.locator('#character-call').click();
  await f.waitForFunction(() => window.callAudioObservations.length === 1);
  await f.getByRole('button', { name: 'Hop forward', exact: true }).click(); await page.waitForTimeout(180); assert.equal(await f.locator('#score').innerText(), '1');
  evidence.scenarios.push('optional storage/keys/theme absent: session progress + button gameplay and character calls work');
  assert.deepEqual(evidence.errors, []);
  console.log(`Runtime smoke passed: ${evidence.scenarios.length} scenarios, ${evidence.frames.length} frame/theme checks, ${evidence.waveFrames.length} active wave frame/theme checks.`);
} finally {
  await writeFile(new URL('runtime-evidence.json', output), JSON.stringify(evidence, null, 2));
  await browser?.close(); darkRuntime?.kill('SIGINT'); runtime.kill('SIGINT');
}
