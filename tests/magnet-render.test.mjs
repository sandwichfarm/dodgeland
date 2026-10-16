import { artifactDirectoryForCoverage, registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';
const coverageArtifacts = artifactDirectoryForCoverage(new URL('../artifacts/', import.meta.url), 'magnet-render');
const coveragePages = new Map();
let coverageGeneration = 0;
function registerPage(page) {
  const identity = { suite: process.argv[1], scenario: 'magnet-render', frame: 'component-page', generation: coverageGeneration++, scope: 'current' };
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

// Actual Canvas pixels complement the simulation and mock-renderer unit tests.
const modules = await compileSources(['render', 'market/items/magnet']);
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html');
  response.end(source ?? '<!doctype html><style>body{margin:0}canvas{display:block}</style><canvas width="720" height="500"></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--mute-audio'] });
after(async () => { try { for (const page of coveragePages.keys()) await closePage(page); } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); } });

test('real canvas shows the coin approaching the duck and disappearing only at arrival', async () => {
  const page = await browser.newPage({ viewport: { width: 720, height: 500 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  registerPage(page);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const [{ Renderer }, { Game, coinPosition }, { default: magnet }] = await Promise.all([
      import('/render.js'), import('/game.js'), import('/market/items/magnet.js'),
    ]);
    const canvas = document.querySelector('canvas');
    const strip = document.createElement('canvas'); strip.width = 1020; strip.height = 520;
    const output = strip.getContext('2d'); output.fillStyle = '#223c35'; output.fillRect(0, 0, strip.width, strip.height);
    const results = [];
    for (const reduced of [false, true]) {
      const game = new Game(12, 'orchard', 'arcade', false, [magnet]);
      for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', decorations: [], blocked: [], coin: null });
      game.state = 'playing'; game.run.advanceScore(100); game.openMarket();
      for (let index = 0; index < 2; index++) {
        game.run.creditCoins(magnet.price);
        const id = `render-magnet-${index}`;
        game.run.market.offers.push({ id, itemId: magnet.id, price: magnet.price, sold: false });
        if (!game.run.buy(id).ok) throw new Error('Magnet fixture purchase failed');
      }
      game.closeMarket();
      const reward = game.rows.get(1); reward.coin = 1;
      let payouts = 0; game.onCoin = () => payouts++;
      const renderer = new Renderer(canvas);
      renderer.width = 720; renderer.height = 500; renderer.scale = 100; renderer.reduced = reduced;
      let drawn = [];
      const cube = renderer.cube.bind(renderer);
      renderer.cube = (voxel, x, y, lift) => {
        if (voxel.color === '#f1cd64') drawn.push({ x, y });
        cube(voxel, x, y, lift);
      };
      const frame = (label, column) => {
        drawn = []; renderer.draw(game, 'butter', 0);
        const data = renderer.ctx.getImageData(0, 0, 720, 500).data;
        const colors = new Set(['219,183,78', '232,196,91', '253,217,112']);
        let pixels = 0, xTotal = 0, yTotal = 0;
        for (let y = 190; y < 390; y++) for (let x = 280; x < 570; x++) {
          const index = (y * 720 + x) * 4;
          if (colors.has(`${data[index]},${data[index + 1]},${data[index + 2]}`)) { pixels++; xTotal += x; yTotal += y; }
        }
        const top = reduced ? 260 : 0, left = column * 340;
        output.drawImage(canvas, 250, 170, 340, 220, left, top + 32, 340, 220);
        output.fillStyle = '#f5e6bc'; output.font = '14px sans-serif';
        output.fillText(`${reduced ? 'Less motion' : 'Normal'} · ${label}`, left + 12, top + 22);
        return { label, pixels, centroid: pixels ? { x: xTotal / pixels, y: yTotal / pixels } : null,
          drawn: [...drawn], coin: coinPosition(reward, game.time), coins: game.coins, payouts };
      };
      const before = frame('Before attraction', 0);
      // Advance real fixed simulation steps until the coin has visibly moved.
      for (let index = 0; index < 120 && (!reward.coinPull || reward.coinPull.x > .68); index++) game.update(1 / 120);
      const middle = frame('Pulling toward duck', 1);
      game.pause(); const frozenImage = canvas.toDataURL(); game.update(10); renderer.draw(game, 'butter', 0);
      const pauseFrozen = canvas.toDataURL() === frozenImage;
      game.resume();
      for (let index = 0; index < 180; index++) game.update(1 / 120);
      const arrival = frame('Collected', 2);
      results.push({ reduced, before, middle, arrival, pauseFrozen });
    }
    return { results, png: strip.toDataURL('image/png').split(',')[1] };
  });
  assert.deepEqual(errors, []);
  for (const run of result.results) {
    assert.ok(run.before.pixels > 150, 'the initial gold coin actually rasterizes');
    assert.ok(run.middle.pixels > 100, 'the attracted coin remains visible between origin and duck');
    assert.ok(run.middle.centroid.x < run.before.centroid.x - 20, 'visible gold pixels move toward the duck');
    assert.equal(run.before.drawn.length, 1); assert.equal(run.middle.drawn.length, 1, 'no coin remains drawn at the old row');
    assert.deepEqual(run.middle.drawn[0], run.middle.coin);
    assert.equal(run.middle.coins, 0); assert.equal(run.middle.payouts, 0);
    assert.equal(run.pauseFrozen, true, 'the actual paused frame remains identical');
    assert.equal(run.arrival.pixels, 0); assert.deepEqual(run.arrival.drawn, []);
    assert.equal(run.arrival.coin, null); assert.equal(run.arrival.coins, 1); assert.equal(run.arrival.payouts, 1);
  }
  assert.deepEqual(result.results[0].middle.coin, result.results[1].middle.coin, 'Less motion retains physical attraction');
  const artifacts = coverageArtifacts;
  await mkdir(artifacts, { recursive: true });
  await writeFile(new URL('magnet-pull-strip.png', artifacts), Buffer.from(result.png, 'base64'));
  await writeFile(new URL('magnet-render.json', artifacts), JSON.stringify(result.results, null, 2));
  await closePage(page);
});
