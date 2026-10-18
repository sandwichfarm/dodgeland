import { artifactDirectoryForCoverage, registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';
const coverageArtifacts = artifactDirectoryForCoverage(new URL('../artifacts/', import.meta.url), 'wearables-render');
const coveragePages = new Map();
let coverageGeneration = 0;
function registerPage(page) {
  const identity = { suite: process.argv[1], scenario: 'wearables-render', frame: 'component-page', generation: coverageGeneration++, scope: 'current' };
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

const modules = await compileSources(['render', 'market/catalog']);
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html');
  response.end(source ?? '<!doctype html><canvas width="210" height="220"></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--mute-audio'] });
after(async () => { try { for (const page of coveragePages.keys()) await closePage(page); } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); } });

test('actual Canvas clothes stay attached at both yaw angles, preserve the bill, and share the real hop transform', async () => {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  registerPage(page);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const [{ Renderer }, { CHARACTERS }, { dressedModel }, { ITEM_CATALOG }, { Game, HOP_TIME }] = await Promise.all([
      import('/render.js'), import('/content.js'), import('/wearables.js'), import('/market/catalog.js'), import('/game.js'),
    ]);
    const items = new Map(ITEM_CATALOG.map(item => [item.id, item]));
    const canvas = document.querySelector('canvas');
    const renderer = new Renderer(canvas); renderer.width = 210; renderer.height = 220; renderer.scale = 115;
    const sheet = document.createElement('canvas'); sheet.width = 1260; sheet.height = CHARACTERS.length * 240;
    const ctx = sheet.getContext('2d'); ctx.fillStyle = '#203c39'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    const outfits = [['look-hat-boater', 'look-shirt-sailor'], ['look-hat-cap', 'look-shirt-vest'], ['look-hat-beanie', 'look-shirt-sailor']];
    const pixelsFor = (hex, data) => {
      const value = parseInt(hex.slice(1), 16), rgb = [value >> 16, value >> 8 & 255, value & 255];
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (Math.abs((data[i] - rgb[0]) - (data[i + 1] - rgb[1])) < 2
          && Math.abs((data[i] - rgb[0]) - (data[i + 2] - rgb[2])) < 2
          && Math.abs(data[i] - rgb[0]) < 26 && data[i + 3] === 255) count++;
      }
      return count;
    };
    const frames = [];
    for (let row = 0; row < CHARACTERS.length; row++) {
      const traveler = CHARACTERS[row];
      for (let outfit = 0; outfit < outfits.length; outfit++) for (let turn = 0; turn < 2; turn++) {
        const worn = outfits[outfit].map(id => items.get(id)), yaw = turn * Math.PI / 3;
        const draw = model => {
          renderer.ctx.fillStyle = '#b6c59a'; renderer.ctx.fillRect(0, 0, 210, 220);
          renderer.shadow(0, 0); renderer.turnedModel(model, 0, 0, 0, yaw);
          return renderer.ctx.getImageData(0, 0, 210, 220).data;
        };
        const bare = draw(traveler.model), bareBill = pixelsFor('#f39838', bare);
        const clothed = dressedModel(traveler, worn), data = draw(clothed);
        const column = outfit * 2 + turn, left = column * 210, top = row * 240;
        ctx.drawImage(canvas, left, top + 20);
        ctx.fillStyle = '#f5e6bc'; ctx.font = '12px sans-serif';
        ctx.fillText(`${traveler.name} · ${worn[0].name}${turn ? ' ↻' : ''}`, left + 7, top + 15);
        frames.push({ traveler: traveler.id, outfit: outfits[outfit], yaw,
          hatPixels: pixelsFor(worn[0].appearance.color, data), shirtPixels: pixelsFor(worn[1].appearance.color, data),
          bareBill, dressedBill: pixelsFor('#f39838', data) });
      }
    }
    // Exercise the complete gameplay renderer, not just the composed preview.
    const game = new Game(18, 'orchard', 'arcade', false, ITEM_CATALOG);
    for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', decorations: [], blocked: [], coin: null });
    game.state = 'playing'; game.run.advanceScore(100); game.openMarket(); game.run.creditCoins(100);
    for (const id of outfits[0]) {
      const item = items.get(id), offer = { id, itemId: id, sold: false, price: item.price };
      game.run.market.offers.push(offer);
      if (!game.run.buy(id).ok) throw new Error('Fixture purchase failed');
    }
    game.closeMarket();
    const poses = [], turned = renderer.turnedModel.bind(renderer);
    renderer.turnedModel = (model, x, y, lift, yaw) => {
      poses.push({ lift, yaw, parts: model.length, hat: model.some(v => v.color === items.get('look-hat-boater').appearance.color) });
      turned(model, x, y, lift, yaw);
    };
    game.time = 3; renderer.draw(game, 'butter', 0);
    game.hop = HOP_TIME / 2; renderer.draw(game, 'butter', 0);
    renderer.reduced = true; renderer.draw(game, 'butter', 0);
    return { frames, poses, travelerCount: CHARACTERS.length, png: sheet.toDataURL().split(',')[1] };
  });
  const artifacts = coverageArtifacts;
  await mkdir(artifacts, { recursive: true });
  await writeFile(new URL('wearables-sheet.png', artifacts), Buffer.from(result.png, 'base64'));
  await writeFile(new URL('wearables-render.json', artifacts), JSON.stringify({ frames: result.frames, poses: result.poses }, null, 2));
  assert.deepEqual(errors, []);
  assert.equal(result.frames.length, result.travelerCount * 6);
  for (const frame of result.frames) {
    assert.ok(frame.hatPixels > 35, `${frame.traveler}/${frame.outfit[0]} has visible hat pixels at yaw ${frame.yaw}`);
    assert.ok(frame.shirtPixels > 35, `${frame.traveler}/${frame.outfit[1]} has visible shirt pixels at yaw ${frame.yaw}`);
    // A brim may naturally overlap the far edge from the rear camera, but the
    // oversized orange bill must retain a clear majority of its visible area.
    if (frame.traveler === 'butter') assert.ok(frame.dressedBill >= frame.bareBill * .6, 'wearing clothes must keep the duck bill readable');
  }
  assert.equal(result.poses.length, 3);
  assert.ok(result.poses.every(pose => pose.hat && pose.parts > 25), 'clothes and duck use one composed model');
  assert.ok(result.poses[0].yaw > .9);
  assert.ok(result.poses[1].lift > result.poses[0].lift + .25, 'clothes share the body hop');
  assert.equal(result.poses[2].yaw, 0); assert.equal(result.poses[2].lift, 0, 'Less motion keeps clothing while removing decorative turns and bounce');
  await closePage(page);
});
