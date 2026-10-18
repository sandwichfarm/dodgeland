import { artifactDirectoryForCoverage, registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';
const coverageArtifacts = artifactDirectoryForCoverage(new URL('../artifacts/', import.meta.url), 'coin-denominations-render');
const coveragePages = new Map();
let coverageGeneration = 0;
function registerPage(page) {
  const identity = { suite: process.argv[1], scenario: 'coin-denominations-render', frame: 'component-page', generation: coverageGeneration++, scope: 'current' };
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

const modules = await compileSources(['render', 'coin-denominations', 'coin-models', 'market/items/magnet']);
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html');
  response.end(source ?? '<!doctype html><style>body{margin:0}canvas{display:block}</style><canvas width="720" height="500"></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--mute-audio'] });
after(async () => { try { for (const page of coveragePages.keys()) await closePage(page); } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); } });

test('all five pickups render distinct growing silhouettes and readable values in the actual world', async () => {
  const page = await browser.newPage({ viewport: { width: 720, height: 500 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  registerPage(page);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const [{ Renderer }, { Game }, { COIN_DENOMINATIONS }, { coinPickupModel }] = await Promise.all([
      import('/render.js'), import('/game.js'), import('/coin-denominations.js'), import('/coin-models.js'),
    ]);
    const canvas = document.querySelector('canvas');
    const renderer = new Renderer(canvas);
    renderer.width = 720; renderer.height = 500; renderer.scale = 110;
    const game = new Game(12, 'orchard', 'stroll');
    for (const lane of game.rows.values()) {
      Object.assign(lane, { kind: 'meadow', decorations: [], blocked: [], coin: null });
      delete lane.coinActor; delete lane.coinPull;
    }
    game.state = 'playing'; game.time = 0;
    const reward = game.rows.get(1), results = [];
    const sheet = document.createElement('canvas'); sheet.width = 1100; sheet.height = 480;
    const output = sheet.getContext('2d'); output.fillStyle = '#233e35'; output.fillRect(0, 0, sheet.width, sheet.height);
    const maskCanvas = document.createElement('canvas'); maskCanvas.width = 720; maskCanvas.height = 500;
    const maskRenderer = new Renderer(maskCanvas);
    maskRenderer.width = 720; maskRenderer.height = 500; maskRenderer.scale = 110;
    const model = renderer.model.bind(renderer), cube = renderer.cube.bind(renderer), fillText = renderer.ctx.fillText.bind(renderer.ctx);
    let activeModel, activeId, drawn = [], labels = [];
    renderer.model = (value, x, y, lift, ...rest) => {
      if (value === activeModel) drawn.push({ x, y, lift });
      return model(value, x, y, lift, ...rest);
    };
    renderer.cube = (voxel, x, y, lift, ...rest) => {
      if (activeId === 'coin' && voxel === activeModel[0]) drawn.push({ x, y, lift });
      return cube(voxel, x, y, lift, ...rest);
    };
    renderer.ctx.fillText = (text, x, y, ...rest) => {
      if (/^(2|5|10|25)$/.test(String(text))) labels.push({ text: String(text), x, y,
        bottom: y + renderer.ctx.measureText(String(text)).actualBoundingBoxDescent + renderer.ctx.lineWidth / 2 });
      return fillText(text, x, y, ...rest);
    };
    for (const reduced of [false, true]) for (let index = 0; index < COIN_DENOMINATIONS.length; index++) {
      const denomination = COIN_DENOMINATIONS[index];
      activeId = denomination.id; activeModel = coinPickupModel(activeId); drawn = []; labels = [];
      reward.coin = 1; reward.coinDenomination = denomination.id; renderer.reduced = reduced;
      renderer.draw(game, 'butter', 0);
      const pose = drawn[0];
      maskRenderer.ctx.clearRect(0, 0, 720, 500);
      if (activeId === 'coin') {
        maskRenderer.cube(activeModel[0], pose.x, pose.y, pose.lift);
        maskRenderer.cube(activeModel[1], pose.x, pose.y, 0);
      } else maskRenderer.model(activeModel, pose.x, pose.y, pose.lift);
      const { data } = maskRenderer.ctx.getImageData(0, 0, 720, 500);
      const actual = renderer.ctx.getImageData(0, 0, 720, 500).data;
      let painted = 0, visible = 0, minX = 720, maxX = 0, minY = 500, maxY = 0, fingerprint = 2166136261;
      for (let y = 0; y < 500; y++) for (let x = 0; x < 720; x++) {
        const at = (y * 720 + x) * 4;
        if (data[at + 3] !== 255) continue;
        painted++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        if ([0, 1, 2].every(channel => Math.abs(actual[at + channel] - data[at + channel]) <= 2)) visible++;
        fingerprint = Math.imul(fingerprint ^ (at + data[at] + data[at + 1] + data[at + 2]), 16777619);
      }
      const [centerX, floorY] = renderer.project(1, 1);
      const left = index * 220, top = reduced ? 240 : 0;
      output.drawImage(canvas, centerX - 105, floorY - 148, 210, 200, left + 5, top + 35, 210, 200);
      output.fillStyle = '#f5e6bc'; output.font = 'bold 15px sans-serif';
      output.fillText(`${denomination.name} · ${denomination.value}`, left + 12, top + 19);
      output.font = '12px sans-serif'; output.fillText(reduced ? 'Less motion' : 'Normal', left + 12, top + 34);
      results.push({ id: denomination.id, value: denomination.value, reduced, drawn, labels, painted, visible,
        width: maxX - minX + 1, height: maxY - minY + 1, top: minY, fingerprint });
    }
    return { results, png: sheet.toDataURL().split(',')[1] };
  });
  const artifacts = coverageArtifacts;
  await mkdir(artifacts, { recursive: true });
  await writeFile(new URL('coin-denominations.png', artifacts), Buffer.from(result.png, 'base64'));
  await writeFile(new URL('coin-denominations-render.json', artifacts), JSON.stringify(result.results, null, 2));
  assert.deepEqual(errors, []);
  for (const reduced of [false, true]) {
    const rows = result.results.filter(row => row.reduced === reduced);
    assert.equal(rows.length, 5);
    assert.equal(new Set(rows.map(row => row.fingerprint)).size, 5, 'all denominations have distinct actual pixels');
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      assert.equal(row.drawn.length, 1, `${row.id} is drawn exactly once`);
      assert.ok(row.painted > 500, `${row.id} has a substantial visible model`);
      assert.ok(row.visible > row.painted * .98, `${row.id} is not hidden behind the ground or traveler`);
      if (index) assert.ok(row.width > rows[index - 1].width, `${row.id} has a wider silhouette than the preceding denomination`);
      if (index >= 3) assert.ok(row.height > rows[index - 1].height, 'larger sacks are also visibly taller');
      if (row.value === 1) assert.deepEqual(row.labels, []);
      else {
        assert.deepEqual(row.labels.map(label => label.text), [String(row.value)]);
        assert.ok(row.labels[0].bottom < row.top, `${row.id}'s outlined value sits above the model`);
      }
    }
  }
  await closePage(page);
});

test('the huge sack and its value label follow magnet attraction until one 25-coin payout', async () => {
  const page = await browser.newPage({ viewport: { width: 720, height: 500 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  registerPage(page);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const [{ Renderer }, { Game, coinPosition }, { coinPickupModel }, { default: magnet }] = await Promise.all([
      import('/render.js'), import('/game.js'), import('/coin-models.js'), import('/market/items/magnet.js'),
    ]);
    const runs = [];
    for (const reduced of [false, true]) {
      const game = new Game(12, 'orchard', 'arcade', false, [magnet]);
      for (const lane of game.rows.values()) {
        Object.assign(lane, { kind: 'meadow', decorations: [], blocked: [], coin: null });
        delete lane.coinActor; delete lane.coinPull;
      }
      game.state = 'playing'; game.run.advanceScore(100); game.openMarket();
      for (let index = 0; index < 2; index++) {
        game.run.creditCoins(magnet.price);
        const id = `sack-magnet-${index}`;
        game.run.market.offers.push({ id, itemId: magnet.id, price: magnet.price, sold: false });
        if (!game.run.buy(id).ok) throw new Error('Magnet fixture purchase failed');
      }
      game.closeMarket();
      const reward = game.rows.get(1); reward.coin = 1; reward.coinDenomination = 'huge-sack';
      const payouts = []; game.onCoin = amount => payouts.push(amount);
      const renderer = new Renderer(document.querySelector('canvas'));
      renderer.width = 720; renderer.height = 500; renderer.scale = 110; renderer.reduced = reduced;
      const sack = coinPickupModel('huge-sack'), model = renderer.model.bind(renderer), fillText = renderer.ctx.fillText.bind(renderer.ctx);
      let drawn = [], labels = [];
      renderer.model = (value, x, y, lift, ...rest) => {
        if (value === sack) drawn.push({ x, y });
        return model(value, x, y, lift, ...rest);
      };
      renderer.ctx.fillText = (text, x, y, ...rest) => {
        if (String(text) === '25') labels.push({ x, y });
        return fillText(text, x, y, ...rest);
      };
      const frame = () => {
        drawn = []; labels = []; renderer.draw(game, 'butter', 0);
        return { drawn: [...drawn], labels: [...labels], coin: coinPosition(reward, game.time), coins: game.coins, payouts: [...payouts] };
      };
      const before = frame();
      for (let index = 0; index < 120 && (!reward.coinPull || reward.coinPull.x > .68); index++) game.update(1 / 120);
      const middle = frame();
      game.pause(); const frozen = renderer.ctx.canvas.toDataURL(); game.update(10); frame();
      const pauseFrozen = renderer.ctx.canvas.toDataURL() === frozen;
      game.resume(); for (let index = 0; index < 180; index++) game.update(1 / 120);
      const arrival = frame(); runs.push({ reduced, before, middle, arrival, pauseFrozen });
      renderer.ctx.fillText = fillText;
    }
    return runs;
  });
  assert.deepEqual(errors, []);
  for (const run of result) {
    assert.equal(run.before.drawn.length, 1); assert.equal(run.middle.drawn.length, 1);
    assert.deepEqual(run.middle.drawn[0], run.middle.coin, 'the entire sack follows the real coin position');
    assert.ok(run.middle.coin.x < run.before.coin.x - .30);
    assert.ok(run.middle.labels[0].x < run.before.labels[0].x - 20, 'the 25 label moves with its sack');
    assert.equal(run.middle.coins, 0); assert.deepEqual(run.middle.payouts, []);
    assert.equal(run.pauseFrozen, true);
    assert.deepEqual(run.arrival.drawn, []); assert.deepEqual(run.arrival.labels, []);
    assert.equal(run.arrival.coin, null); assert.equal(run.arrival.coins, 25); assert.deepEqual(run.arrival.payouts, [25]);
  }
  assert.deepEqual(result[0].middle.coin, result[1].middle.coin, 'Less motion preserves meaningful attraction');
  await writeFile(new URL('coin-denominations-magnet.json', coverageArtifacts), JSON.stringify(result, null, 2));
  await closePage(page);
});
