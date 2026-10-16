import { artifactDirectoryForCoverage, registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';
const coverageArtifacts = artifactDirectoryForCoverage(new URL('../artifacts/', import.meta.url), 'market-preview');
const coveragePages = new Map();
let coverageGeneration = 0;
function registerPage(page) {
  const identity = { suite: process.argv[1], scenario: 'market-preview', frame: 'component-page', generation: coverageGeneration++, scope: 'current' };
  registerRealm(page, identity); coveragePages.set(page, identity);
}
async function closePage(page) {
  try { await collectRealm(page, coveragePages.get(page)); }
  finally { coveragePages.delete(page); await page.close(); }
}
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test, { after } from 'node:test';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';

const modules = await compileSources(['market-preview', 'market/catalog']);
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html');
  response.end(source ?? '<!doctype html><style>body{margin:0;background:#28463f}canvas{display:block;width:240px;height:210px}</style>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--mute-audio'] });
after(async () => { try { for (const page of coveragePages.keys()) await closePage(page); } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); } });

async function fixture() {
  const page = await browser.newPage({ viewport: { width: 640, height: 600 }, deviceScaleFactor: 2 });
  registerPage(page);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    const [{ createMarketPreview }, { CHARACTERS }, { ITEM_CATALOG }, { Renderer }] = await Promise.all([
      import('/market-preview.js'), import('/content.js'), import('/market/catalog.js'), import('/render.js'),
    ]);
    window.characters = CHARACTERS;
    window.cosmetics = ITEM_CATALOG.filter(item => item.kind === 'cosmetic');
    window.makePreview = createMarketPreview;
    window.getItem = id => window.cosmetics.find(item => item.id === id);
    window.preview = createMarketPreview({ kind: 'cosmetic', item: window.cosmetics[0] });
    document.body.append(window.preview.element);
    window.snapshot = () => window.preview.element.toDataURL();
    // Keep the browser's real Canvas, layout, visibility and observer behavior.
    // Only the animation clock is controlled, for deterministic angle sampling.
    window.pendingFrames = new Map(); window.frameId = 0; window.time = 1000;
    window.requestAnimationFrame = callback => { const id = ++window.frameId; window.pendingFrames.set(id, callback); return id; };
    window.cancelAnimationFrame = id => window.pendingFrames.delete(id);
    window.stepFrames = frames => {
      for (let i = 0; i < frames; i++) {
        window.time += 50;
        const callbacks = [...window.pendingFrames.values()]; window.pendingFrames.clear();
        for (const callback of callbacks) callback(window.time);
      }
    };
    const turned = Renderer.prototype.turnedModel;
    window.draws = 0;
    Renderer.prototype.turnedModel = function(model, x, y, lift, yaw) {
      window.draws++;
      window.pose = { yaw, scale: this.scale, parts: model.length };
      turned.call(this, model, x, y, lift, yaw);
    };
  });
  await page.waitForFunction(() => window.preview.element.width === 480 && window.preview.element.getContext('2d').getImageData(200, 150, 50, 50).data.some(value => value), null, { polling: 20, timeout: 5000 });
  return page;
}

test('all cosmetic items and dressed travelers render visibly through a full 3D turn without clipping or zoom', async () => {
  const page = await fixture();
  const result = await page.evaluate(() => {
    const costumes = ['look-hat-boater', 'look-shirt-sailor', 'look-halo'].map(window.getItem);
    const subjects = [
      ...window.cosmetics.map(item => ({ name: item.name, subject: { kind: 'cosmetic', item } })),
      ...window.characters.map(character => ({ name: character.name, subject: { kind: 'character', character, cosmetics: costumes } })),
    ];
    const sheet = document.createElement('canvas'); sheet.width = 960; sheet.height = 240 * Math.ceil(subjects.length / 2);
    const sheetContext = sheet.getContext('2d');
    sheetContext.fillStyle = '#28463f'; sheetContext.fillRect(0, 0, sheet.width, sheet.height);
    const results = [];
    for (let index = 0; index < subjects.length; index++) {
      const { name, subject } = subjects[index];
      window.preview.setActive(false); window.preview.setReducedMotion(true); window.preview.setSubject(subject);
      window.preview.setReducedMotion(false);
      const first = window.snapshot(), initialScale = window.pose.scale;
      const frames = [];
      window.preview.setActive(true);
      // ~45-degree intervals sample all faces through one complete turn.
      for (let angle = 0; angle < 9; angle++) {
        if (angle) window.stepFrames(19);
        const canvas = window.preview.element, ctx = canvas.getContext('2d');
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let painted = 0, border = 0, colors = new Set();
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const at = (y * width + x) * 4;
          if (!data[at + 3]) continue;
          painted++;
          if (x < 4 || y < 4 || x >= width - 4 || y >= height - 4) border++;
          if (data[at + 3] === 255) colors.add(`${data[at]},${data[at + 1]},${data[at + 2]}`);
        }
        frames.push({ painted, border, colors: colors.size, scale: window.pose.scale, yaw: window.pose.yaw });
        if (angle === 0 || angle === 3) {
          const column = index % 2 * 2 + (angle === 3 ? 1 : 0), row = Math.floor(index / 2);
          sheetContext.drawImage(canvas, column * 240, row * 240 + 26, 240, 210);
          sheetContext.fillStyle = '#f9e5b7'; sheetContext.font = '13px sans-serif';
          sheetContext.fillText(`${name}${angle ? ' · turned' : ''}`, column * 240 + 8, row * 240 + 20);
        }
      }
      results.push({ name, label: window.preview.element.getAttribute('aria-label'), frames, changed: first !== window.snapshot(), initialScale });
    }
    window.preview.dispose();
    return { results, expected: window.characters.length + window.cosmetics.length, png: sheet.toDataURL().split(',')[1] };
  });
  await mkdir(coverageArtifacts, { recursive: true });
  await writeFile(new URL('market-preview-sheet.png', coverageArtifacts), Buffer.from(result.png, 'base64'));
  assert.equal(result.results.length, result.expected);
  for (const entry of result.results) {
    assert.ok(entry.changed, `${entry.name} shows different faces when rotated`);
    assert.ok(entry.label.includes(entry.name));
    for (const frame of entry.frames) {
      assert.equal(frame.border, 0, `${entry.name} stays inside the canvas at ${frame.yaw}`);
      assert.ok(frame.painted > 1200, `${entry.name} is visible at ${frame.yaw}`);
      assert.ok(frame.colors >= 2, `${entry.name} has shaded three-dimensional faces`);
      assert.equal(frame.scale, entry.initialScale, 'turning never changes the framing');
    }
  }
  await closePage(page);
});

test('turntable stops when hidden, offscreen, reduced or disposed and returns home after hover', async () => {
  const page = await fixture();
  const initial = await page.evaluate(() => {
    const home = window.snapshot();
    const beforeUpdates = window.draws;
    for (let i = 0; i < 20; i++) {
      window.preview.setActive(false); window.preview.setVisible(true); window.preview.setReducedMotion(false);
    }
    const idleDraws = window.draws - beforeUpdates;
    window.preview.setActive(true); window.stepFrames(24);
    const turned = window.snapshot();
    window.preview.setActive(false); window.stepFrames(60);
    return { home, turned, returned: window.snapshot(), pending: window.pendingFrames.size, idleDraws };
  });
  assert.notEqual(initial.home, initial.turned);
  assert.equal(initial.home, initial.returned);
  assert.equal(initial.pending, 0, 'no continuous work while idle');
  assert.equal(initial.idleDraws, 0, 'repeated market state updates do not redraw unchanged previews');

  const suspended = await page.evaluate(() => {
    window.preview.setActive(true); window.stepFrames(12);
    window.preview.setVisible(false);
    const before = window.snapshot(); window.stepFrames(50);
    const hidden = { before, after: window.snapshot(), pending: window.pendingFrames.size };
    window.preview.setVisible(true); window.stepFrames(12);
    const resumed = window.snapshot();
    window.preview.setReducedMotion(true);
    const reduced = window.snapshot(); window.stepFrames(30);
    return { hidden, resumed, reduced, afterReduced: window.snapshot(), pending: window.pendingFrames.size };
  });
  assert.equal(suspended.hidden.before, suspended.hidden.after);
  assert.equal(suspended.hidden.pending, 0);
  assert.notEqual(suspended.resumed, suspended.hidden.before);
  assert.equal(suspended.reduced, initial.home);
  assert.equal(suspended.reduced, suspended.afterReduced);
  assert.equal(suspended.pending, 0);

  await page.evaluate(() => window.preview.setReducedMotion(false));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => window.pendingFrames.size === 0, null, { polling: 20, timeout: 5000 });
  assert.equal(await page.evaluate(() => window.snapshot()), initial.home, 'OS reduced motion is also respected');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => window.pendingFrames.size === 1, null, { polling: 20, timeout: 5000 });
  await page.evaluate(() => { window.preview.element.style.marginTop = '1000px'; });
  await page.waitForFunction(() => window.pendingFrames.size === 0, null, { polling: 20, timeout: 5000 });
  await page.evaluate(() => { window.preview.element.style.marginTop = '0'; });
  await page.waitForFunction(() => window.pendingFrames.size === 1, null, { polling: 20, timeout: 5000 });

  const hiddenDocument = await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    const hidden = window.pendingFrames.size;
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    return { hidden, visible: window.pendingFrames.size };
  });
  assert.deepEqual(hiddenDocument, { hidden: 0, visible: 1 });

  await page.evaluate(() => { window.preview.element.style.width = '160px'; window.preview.element.style.height = '128px'; });
  await page.waitForFunction(() => window.preview.element.width === 320 && window.preview.element.height === 256, null, { polling: 20, timeout: 5000 });
  const disposed = await page.evaluate(() => {
    window.preview.dispose(); window.preview.dispose();
    window.preview.setActive(true); window.preview.setVisible(true); window.preview.setReducedMotion(false);
    window.preview.setSubject({ kind: 'cosmetic', item: window.cosmetics[1] });
    document.dispatchEvent(new Event('visibilitychange'));
    window.stepFrames(20);
    return { pending: window.pendingFrames.size, width: window.preview.element.width, height: window.preview.element.height };
  });
  assert.deepEqual(disposed, { pending: 0, width: 1, height: 1 });
  await closePage(page);
});

test('changing the current traveler or equipment updates the actual portrait and accessible description', async () => {
  const page = await fixture();
  const result = await page.evaluate(() => {
    const butter = window.characters.find(character => character.id === 'butter');
    const beep = window.characters.find(character => character.id === 'beep');
    window.preview.setSubject({ kind: 'character', character: butter, cosmetics: [] });
    const bare = window.snapshot();
    window.preview.setSubject({ kind: 'character', character: butter, cosmetics: [window.getItem('look-hat-boater'), window.getItem('look-shirt-sailor')] });
    const dressed = window.snapshot(), label = window.preview.element.getAttribute('aria-label');
    window.preview.setSubject({ kind: 'character', character: beep, cosmetics: [] });
    const other = window.snapshot(), otherLabel = window.preview.element.getAttribute('aria-label');
    window.preview.dispose();
    return { bare, dressed, other, label, otherLabel };
  });
  assert.notEqual(result.bare, result.dressed);
  assert.notEqual(result.dressed, result.other);
  assert.match(result.label, /Butter wearing Straw Boater, Sailor Shirt/);
  assert.match(result.otherLabel, /Beep/);
  await closePage(page);
});
