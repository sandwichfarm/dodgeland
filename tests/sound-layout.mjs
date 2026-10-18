// Focused layout acceptance in the real Paja shell; run after pnpm build.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const evidence = { runtime: 'Paja; sandbox="allow-scripts"', frames: [], errors: [] };
// Snapshot hydrated controls before the first test action. Settings are changed
// only through the app's visible controls, including failure-path cleanup.
async function captureSoundPreferences(frame) {
  await frame.locator('#sound-pack option[value="pond"]').waitFor({ state: 'attached' });
  await frame.waitForFunction(() => !window.napplet?.storage || document.querySelector('#storage-status').textContent !== 'Progress lasts for this session');
  return {
    pack: await frame.locator('#sound-pack').inputValue(), muted: await frame.locator('#sound-muted').isChecked(),
    music: await frame.locator('#music-volume').inputValue(), ambience: await frame.locator('#ambience-volume').inputValue(), effects: await frame.locator('#effects-volume').inputValue(),
    persisted: await frame.locator('#storage-status').textContent() === 'Progress saved by your shell',
  };
}
async function restoreSoundPreferences(frame, page, iframe, soundPage, original) {
  await page.setViewportSize({ width: 1400, height: 850 });
  await iframe.evaluate(node => { node.style.width = '900px'; node.style.height = '600px'; node.style.flex = 'none'; });
  await frame.waitForFunction(() => innerWidth === 900 && innerHeight === 600);
  await soundPage('pack');
  if (await frame.locator('#sound-pack').inputValue() !== original.pack) await frame.locator('#sound-pack').selectOption(original.pack);
  await soundPage('mute');
  await frame.locator('#sound-muted').setChecked(original.muted);
  for (const name of ['music', 'ambience', 'effects']) {
    await soundPage(name);
    const slider = frame.locator(`#${name}-volume`), target = Number(original[name]);
    if (Number(await slider.inputValue()) !== target) {
      await slider.focus(); await slider.press('Home');
      // PageUp changes a native range by ten percent; arrows finish the exact
      // original value without generating a write for every percentage point.
      for (let count = 0; count < Math.floor(target / 10); count++) await slider.press('PageUp');
      for (let count = 0; Number(await slider.inputValue()) !== target && count < 100; count++) await slider.press(Number(await slider.inputValue()) < target ? 'ArrowRight' : 'ArrowLeft');
    }
    assert.equal(await slider.inputValue(), original[name], `Restored original ${name} mix`);
  }
  assert.equal(await frame.locator('#sound-pack').inputValue(), original.pack, 'Restored original pack');
  assert.equal(await frame.locator('#sound-muted').isChecked(), original.muted, 'Restored original mute');
  if (original.persisted) await frame.waitForFunction(async original => {
    const raw = await window.napplet.storage.getItem('puddlehop.progress.v1');
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return saved?.soundPack === original.pack && saved?.muted === original.muted &&
      ['music', 'ambience', 'effects'].every(name => Math.round(saved?.[`${name}Volume`] * 100) === Number(original[name]));
  }, original);
}
const browser = await chromium.launch({ args: ['--mute-audio'] });
let restorePreferences;
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
  page.setDefaultTimeout(8_000);
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.goto(process.env.DOWN_TO_DUCK_LAYOUT_URL ?? 'http://127.0.0.1:5197/');
  const iframe = page.locator('iframe');
  await iframe.waitFor();
  assert.equal(await iframe.getAttribute('sandbox'), 'allow-scripts');
  const frame = await (await iframe.elementHandle()).contentFrame();
  await frame.locator('#music-volume').waitFor({ state: 'attached' });
  await frame.waitForFunction(() => !!window.napplet?.theme);
  await frame.evaluate(() => {
    window.layoutKeyEvents = [];
    window.addEventListener('keydown', event => {
      window.layoutKeyEvents.push({ id: event.target.id, key: event.key, get prevented() { return event.defaultPrevented; } });
    }, true);
  });
  async function sounds() {
    if (await frame.locator('#drawer').isHidden()) {
      if (!(await frame.locator('#choose').isVisible()) && !(await frame.locator('#collection').isVisible())) await frame.locator('[data-run-topic="options"]:visible').click();
      await frame.locator(await frame.locator('#choose').isVisible() ? '#choose' : '#collection').click();
    }
    if (await frame.locator('#sounds-tab').isVisible()) await frame.locator('#sounds-tab').click();
    else { await frame.locator('#collection-sections').click(); await frame.locator('button[data-collection-tab="sounds"]').click(); }
  }
  async function soundPage(name) {
    if (await frame.locator('#drawer').getAttribute('data-collection-tab') === 'sounds' && await frame.locator('#drawer').getAttribute('data-collection-sound') === name) return;
    await sounds();
    for (let at = 0; at < ['pack', 'mute', 'music', 'ambience', 'effects', 'preview', 'shared'].indexOf(name); at++) await frame.locator('#collection-next').click();
  }
  const original = await captureSoundPreferences(frame);
  evidence.originalPreferences = original;
  restorePreferences = async () => { await restoreSoundPreferences(frame, page, iframe, soundPage, original); evidence.preferencesRestored = true; };
  const shellTheme = await frame.evaluate(() => window.napplet.theme.get());
  // Exercise the same documented event the runtime sends when its theme changes.
  for (const theme of ['light', 'dark']) {
    const colors = theme === 'light'
      ? { background: '#f5f3e9', text: '#273b36', primary: '#467d63' }
      : { background: '#202a2e', text: '#eff1e5', primary: '#a6d3a9' };
    await page.evaluate(theme => document.querySelector('iframe').contentWindow.postMessage({ type: 'theme.changed', theme }, '*'), { ...shellTheme, colors });
    await frame.waitForFunction(color => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() === color, colors.background);
    for (const [width, height] of [[200, 160], [240, 240], [320, 560], [900, 600], [2400, 1200], [1000, 240]]) {
      await page.setViewportSize({ width: Math.max(1100, width + 450), height: Math.max(720, height + 150) });
      await iframe.evaluate((node, size) => {
        node.style.width = `${size.width}px`; node.style.height = `${size.height}px`; node.style.flex = 'none';
      }, { width, height });
      await frame.waitForFunction(size => innerWidth === size.width && innerHeight === size.height, { width, height });
      await page.waitForTimeout(80);
      const result = await frame.evaluate(() => ({
        width: innerWidth, height: innerHeight,
        notice: getComputedStyle(document.querySelector('.too-small')).display === 'grid',
        overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
        backgrounds: ['html', 'body', '#app'].map(selector => getComputedStyle(document.querySelector(selector)).backgroundColor),
      }));
      assert.equal(result.overflow, false, `${theme} ${width}×${height} document overflow`);
      assert.equal(result.notice, width < 240 || height < 240);
      assert.ok(result.backgrounds.every(color => color === result.backgrounds[0]));
      const controls = [];
      if (!result.notice) {
        await sounds();
        for (const id of ['sound-pack', 'sound-muted', 'music-volume', 'ambience-volume', 'effects-volume', 'sound-preview-cue', 'sound-preview', 'sound-address', 'sound-load']) {
          await soundPage(({ 'sound-pack': 'pack', 'sound-muted': 'mute', 'music-volume': 'music', 'ambience-volume': 'ambience', 'effects-volume': 'effects', 'sound-preview-cue': 'preview', 'sound-preview': 'preview', 'sound-address': 'shared', 'sound-load': 'shared' })[id]);
          const locator = frame.locator(`#${id}`);
          const metrics = await locator.evaluate(node => {
            const r = node.getBoundingClientRect(), panel = document.querySelector('#sound-panel').getBoundingClientRect();
            const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return { id: node.id, width: r.width, height: r.height, fits: r.x >= 0 && r.y >= panel.y - .5 && r.right <= innerWidth + .5 && r.bottom <= panel.bottom + .5,
              hit: hit === node || node.contains(hit), disabled: node.disabled };
          });
          assert.ok(metrics.width >= 44 && metrics.height >= 44, 'Settings retain large targets');
          assert.ok(metrics.fits && metrics.hit, `${theme} ${width}×${height}: ${JSON.stringify(metrics)}`);
          if (!metrics.disabled) {
            if (id.endsWith('-volume')) {
              await locator.focus(); await locator.press('Home'); await locator.press('ArrowRight');
              metrics.keyboardArrowWorks = await locator.inputValue() === '1';
              await locator.click();
              const value = Number(await locator.inputValue());
              assert.ok(value > 0 && value < 100, 'pointer click changes the slider');
              assert.equal(await frame.locator(`#${id}-value`).textContent(), `${value}%`);
              await locator.press('End');
            } else if (id === 'sound-pack') {
              await frame.evaluate(() => { window.layoutKeyEvents = []; });
              await locator.selectOption('pond'); await locator.focus(); await locator.press('ArrowDown'); await locator.press('Enter');
              // Headless native select popups do not commit arrow navigation on
              // this platform, even on a blank page. Verify the app leaves the
              // native key default intact, then exercise selection explicitly.
              metrics.keyboardNavigationUnclaimed = await frame.evaluate(id => window.layoutKeyEvents.some(event => event.id === id && event.key === 'ArrowDown') && window.layoutKeyEvents.filter(event => event.id === id).every(event => !event.prevented), id);
              await locator.click(); await locator.press('Escape'); await locator.selectOption('pond');
            } else if (id === 'sound-preview-cue') {
              await frame.evaluate(() => { window.layoutKeyEvents = []; });
              await locator.selectOption('hop'); await locator.focus(); await locator.press('ArrowDown'); await locator.press('Enter');
              metrics.keyboardNavigationUnclaimed = await frame.evaluate(id => window.layoutKeyEvents.some(event => event.id === id && event.key === 'ArrowDown') && window.layoutKeyEvents.filter(event => event.id === id).every(event => !event.prevented), id);
              await locator.click(); await locator.press('Escape'); await locator.selectOption('call.duck');
            } else if (id === 'sound-muted') {
              await locator.check(); await locator.uncheck();
            } else if (id === 'sound-address') await locator.fill('not-a-pack');
            else if (id === 'sound-load') {
              await locator.click();
              await frame.waitForFunction(() => document.querySelector('#sound-load').textContent === 'Load pack');
              assert.match(await frame.locator('#sound-status').textContent(), /address|30063|naddr|pack/i);
            } else await locator.click();
          }
          controls.push(metrics);
        }
        await soundPage('preview');
        const panel = await frame.locator('#sound-panel').evaluate(node => ({ width: node.clientWidth, scrollWidth: node.scrollWidth, height: node.clientHeight, scrollHeight: node.scrollHeight }));
        assert.ok(panel.scrollWidth <= panel.width + 1 && panel.scrollHeight <= panel.height + 1, `${theme} ${width}×${height} sound panel has no scrolling`);
        result.panel = panel;
        // Every frame shows the cue-preview page; all settings were reached by actual page controls.
      }
      await iframe.screenshot({ path: new URL(`soundscape-layout-${width}x${height}-${theme}.png`, output).pathname });
      evidence.frames.push({ theme, ...result, controls });
    }
  }
  assert.deepEqual(evidence.errors, []);
  await writeFile(new URL('soundscape-layout.json', output), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Verified ${evidence.frames.length} light/dark frame combinations and ${evidence.frames.reduce((sum, entry) => sum + entry.controls.length, 0)} reachable controls in Paja. Evidence: artifacts/soundscape-layout.json`);
  const keyboardFailures = evidence.frames.flatMap(entry => entry.controls.filter(control => control.keyboardArrowWorks === false || control.keyboardNavigationUnclaimed === false).map(control => `${entry.theme} ${entry.width}×${entry.height} ${control.id}`));
  assert.deepEqual(keyboardFailures, [], 'Arrow keys must edit focused sliders/dropdowns instead of being consumed by game shortcuts');
} finally {
  try { await restorePreferences?.(); }
  finally {
    await writeFile(new URL('soundscape-layout.json', output), JSON.stringify(evidence, null, 2) + '\n');
    await browser.close();
  }
}
