import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test, { after } from 'node:test';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';

const modules = await compileSources('market-scene');
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html');
  response.end(source ?? '<!doctype html><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}canvas{display:block;width:100%;height:100%}</style><canvas></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--mute-audio'] });
after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });

test('the market scene covers every frame and theme with a full opaque world', async () => {
  const page = await browser.newPage({ deviceScaleFactor: 3 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    const { createMarketScene } = await import('/market-scene.js');
    window.scene = createMarketScene(document.querySelector('canvas'));
  });
  const artifacts = new URL('../artifacts/', import.meta.url); await mkdir(artifacts, { recursive: true });
  const palettes = {
    dark: { background: '#17382e', foreground: '#fff3c9', primary: '#d6b570' },
    light: { background: '#f2f1dc', foreground: '#263d31', primary: '#9e733a' },
  };
  for (const [width, height] of [[200, 160], [320, 560], [900, 600], [1200, 800]]) {
    await page.setViewportSize({ width, height });
    for (const [theme, palette] of Object.entries(palettes)) {
      const result = await page.evaluate(async palette => {
        window.scene.update({ visible: true, reducedMotion: true, ...palette });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let minAlpha = 255;
        for (let i = 3; i < pixels.length; i += 4) minAlpha = Math.min(minAlpha, pixels[i]);
        return { width: canvas.width, height: canvas.height, minAlpha, png: canvas.toDataURL().split(',')[1] };
      }, palette);
      assert.equal(result.width, width * 2, 'DPR is capped at two');
      assert.equal(result.height, height * 2); assert.equal(result.minAlpha, 255, `${width}×${height}/${theme} completely obscures play`);
      await writeFile(new URL(`market-scene-${width}x${height}-${theme}.png`, artifacts), Buffer.from(result.png, 'base64'));
    }
  }
  assert.deepEqual(errors, []);
  await page.close();
});

test('hidden and disposed market scenes do no drawing and resume at their current size', async () => {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    const { createMarketScene } = await import('/market-scene.js');
    window.scene = createMarketScene(document.querySelector('canvas'));
    window.state = { visible: true, reducedMotion: false, background: '#17382e', foreground: '#fff3c9', primary: '#d6b570' };
    window.scene.update(window.state);
    window.scene.update({ ...window.state, visible: false });
  });
  await page.setViewportSize({ width: 320, height: 560 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.evaluate(() => document.querySelector('canvas').width), 900, 'a hidden resize performs no painting');
  const result = await page.evaluate(() => {
    window.scene.update(window.state);
    const canvas = document.querySelector('canvas'), before = canvas.toDataURL();
    window.scene.dispose();
    window.scene.update({ ...window.state, background: '#eeeeee' });
    return { width: canvas.width, height: canvas.height, unchanged: before === canvas.toDataURL() };
  });
  assert.deepEqual(result, { width: 320, height: 560, unchanged: true });
  await page.close();
});
