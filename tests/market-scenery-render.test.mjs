import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test, { after } from 'node:test';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';

// Rasterize the real renderer and real generated lanes. These artifacts are
// review aids; assertions cover placement and invariants rather than snapshots.
const modules = await compileSources(['render', 'market-scenery']);
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html');
  response.end(source ?? '<!doctype html><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch();
after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });

test('market stands rasterize at existing generated obstacles without changing lanes', async () => {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const sheet = await page.evaluate(async () => {
    const [{ Renderer }, { Game }, { marketScenery }] = await Promise.all([
      import('/render.js'), import('/game.js'), import('/market-scenery.js'),
    ]);
    const examples = new Map(), fixtures = [];
    // Home changes the chapter at row 100; choose actual generated scenes with
    // market obstacles inside the playable width, without editing their layout.
    for (const home of ['dunes', 'bloom', 'neon']) {
      let best;
      for (let seed = 1; seed <= 80; seed++) {
        const game = new Game(seed, home); game.maxY = game.y = game.fromY = 100; game.ensureRows();
        if (game.lane.kind !== 'meadow') continue;
        const stands = [];
        for (const lane of game.rows.values()) for (const decoration of lane.decorations) {
          const stand = marketScenery(seed, lane, decoration);
          if (!stand) continue;
          if (!examples.has(stand.size)) examples.set(stand.size, { stand, original: lane.world.scenery[decoration.variant] });
          if (lane.index >= 96 && lane.index <= 107 && Math.abs(decoration.x) <= 5) stands.push({ x: decoration.x, row: lane.index, size: stand.size });
        }
        if (!best || stands.length > best.stands.length) best = { seed, home, world: game.lane.world.id, stands };
      }
      if (!best?.stands.length) throw new Error(`No generated interior market stand fixture for ${home}`);
      fixtures.push(best);
    }
    const canvas = document.querySelector('canvas'); canvas.width = 960; canvas.height = 600;
    const renderer = new Renderer(canvas); renderer.width = 960; renderer.height = 600; renderer.scale = 100;
    const ctx = renderer.ctx; ctx.fillStyle = '#263c38'; ctx.fillRect(0, 0, 960, 600);
    const descriptors = [];
    for (const [column, size] of ['counter', 'cart', 'stall'].entries()) {
      const example = examples.get(size);
      if (!example) throw new Error(`No naturally generated ${size} example`);
      const left = column * 320;
      ctx.fillStyle = '#f3e9c8'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(size, left + 24, 32);
      for (const [row, [label, model]] of [['Original obstacle', example.original], ['Market replacement', example.stand.model]].entries()) {
        ctx.fillStyle = '#e7ddbd'; ctx.font = '15px sans-serif'; ctx.fillText(label, left + 24, row * 280 + 60);
        ctx.save(); ctx.translate(left + 160 - 480, row * 280 + 242 - 426);
        renderer.tile(0, 0, 1.35, 1.1, '#94ae6d'); renderer.shadow(0, 0, .7); renderer.model(model, 0, 0);
        ctx.restore();
      }
      descriptors.push({ size, footprint: example.stand.footprint, voxels: example.stand.model });
    }
    return { fixtures, descriptors, png: canvas.toDataURL('image/png').split(',')[1] };
  });
  assert.deepEqual(sheet.descriptors.map(value => value.size), ['counter', 'cart', 'stall']);
  for (const stand of sheet.descriptors) {
    assert.ok(Number.isFinite(stand.footprint) && stand.footprint > 0);
    assert.ok(stand.voxels.length > 0);
    for (const voxel of stand.voxels) for (const key of ['x', 'y', 'z', 'w', 'd', 'h']) assert.ok(Number.isFinite(voxel[key]));
  }
  const artifacts = new URL('../artifacts/', import.meta.url);
  await mkdir(artifacts, { recursive: true });
  await writeFile(new URL('market-scenery-models.png', artifacts), Buffer.from(sheet.png, 'base64'));
  const results = [];
  for (const [index, dimensions] of [[320, 560], [900, 600], [1440, 900]].entries()) {
    await page.setViewportSize({ width: dimensions[0], height: dimensions[1] });
    const result = await page.evaluate(async ({ fixture, score }) => {
      const [{ Renderer }, { Game }, { marketScenery }] = await Promise.all([
        import('/render.js'), import('/game.js'), import('/market-scenery.js'),
      ]);
      const game = new Game(fixture.seed, fixture.home); game.maxY = game.y = game.fromY = score; game.ensureRows();
      game.state = 'paused'; game.waveRow = score - 6; game.run.advanceScore(score);
      const canvas = document.querySelector('canvas'), renderer = new Renderer(canvas); renderer.resize(); renderer.camera = score;
      const before = JSON.stringify([...game.rows.values()]), replacements = [], calls = [];
      for (const lane of game.rows.values()) for (const decoration of lane.decorations) {
        const stand = marketScenery(game.seed, lane, decoration);
        if (stand) replacements.push({ x: decoration.x, row: lane.index, size: stand.size, model: stand.model, original: lane.world.scenery[decoration.variant] });
      }
      const drawModel = renderer.model.bind(renderer);
      renderer.model = (model, x, row, ...rest) => { calls.push({ model, x, row }); drawModel(model, x, row, ...rest); };
      renderer.draw(game, 'butter', 0);
      const marketPixels = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const png = canvas.toDataURL('image/png').split(',')[1];
      const replacementCalls = replacements.map(stand => calls.filter(call => call.x === stand.x && call.row === stand.row && JSON.stringify(call.model) === JSON.stringify(stand.model)).length);
      // Draw the same generated frame using its original scenery models. The
      // difference must exist in real pixels, not only in helper return values.
      renderer.model = (model, x, row, ...rest) => {
        const replacement = replacements.find(stand => stand.x === x && stand.row === row && JSON.stringify(model) === JSON.stringify(stand.model));
        drawModel(replacement?.original ?? model, x, row, ...rest);
      };
      renderer.draw(game, 'butter', 0);
      const originalPixels = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let changedPixels = 0;
      for (let i = 0; i < marketPixels.length; i += 4) if (marketPixels[i] !== originalPixels[i] || marketPixels[i + 1] !== originalPixels[i + 1] || marketPixels[i + 2] !== originalPixels[i + 2]) changedPixels++;
      return { seed: fixture.seed, home: fixture.home, world: game.lane.world.id, score,
        unchanged: before === JSON.stringify([...game.rows.values()]), replacementCalls, changedPixels,
        replacements: replacements.map(({ x, row, size }) => ({ x, row, size })), png };
    }, { fixture: sheet.fixtures[index], score: 100 });
    assert.equal(result.unchanged, true, 'drawing must not mutate the generated lanes or collision state');
    assert.ok(result.replacements.length > 0);
    assert.ok(result.replacementCalls.every(count => count === 1), 'each replacement is rendered once at its original obstacle coordinates');
    assert.ok(result.changedPixels > 50, 'market scenery changes visible Canvas pixels');
    await writeFile(new URL(`market-scenery-${dimensions.join('x')}.png`, artifacts), Buffer.from(result.png, 'base64'));
    const { png, ...report } = result; results.push({ ...report, dimensions });
  }
  const ordinary = await page.evaluate(async () => {
    const [{ Renderer }, { Game }, { marketScenery }] = await Promise.all([import('/render.js'), import('/game.js'), import('/market-scenery.js')]);
    const game = new Game(12, 'pond'); game.maxY = game.y = game.fromY = 50; game.ensureRows();
    const original = JSON.stringify([...game.rows.values()]);
    const replacements = [...game.rows.values()].flatMap(lane => lane.decorations.map(decoration => marketScenery(game.seed, lane, decoration))).filter(Boolean);
    const renderer = new Renderer(document.querySelector('canvas')); renderer.resize(); renderer.camera = 50; renderer.draw(game, 'butter', 0);
    return { replacements: replacements.length, unchanged: original === JSON.stringify([...game.rows.values()]) };
  });
  assert.deepEqual(ordinary, { replacements: 0, unchanged: true });
  assert.deepEqual(errors, []);
  await writeFile(new URL('market-scenery-render.json', artifacts), JSON.stringify({ scenes: results, ordinary, errors }, null, 2));
  await page.close();
});
