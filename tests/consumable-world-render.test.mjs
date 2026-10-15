import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test, { after } from 'node:test';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';

// Native-canvas render-unit evidence using production simulation and Renderer.
// This fixture does not claim to verify built-main menus or shell integration.
const modules = await compileSources(['render', 'game', 'session', 'survive-together']);
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html; charset=utf-8');
  response.end(source ?? '<!doctype html><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--mute-audio'] });
after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });

test('world items have distinct models, authoritative positions, and no pixels after teardown', async () => {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const artifacts = new URL('../artifacts/', import.meta.url);
  await mkdir(artifacts, { recursive: true });
  const reports = [];
  for (const [width, height] of [[200, 160], [320, 560], [900, 600], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const report = await page.evaluate(async () => {
      const [{ Renderer }, { Game }, { LocalSession }, { createSurviveTogetherDefinition }] = await Promise.all([
        import('/render.js'), import('/game.js'), import('/session.js'), import('/survive-together.js'),
      ]);
      const game = new Game(0xb4184ed2, 'pond', 'stroll', false, [], 'butter');
      for (const lane of game.rows.values()) Object.assign(lane, {
        kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined,
        actors: undefined, phase: 0, speed: 0, spacing: 20, length: 4,
      });
      const session = LocalSession.stage(game, {
        roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'sunny' }],
        mode: createSurviveTogetherDefinition(game.definition),
      }).commit();
      for (const [index, player] of session.players.entries()) {
        player.x = player.fromX = index ? 3 : -3;
        player.y = player.fromY = player.maxY = 0;
      }
      const canvas = document.querySelector('canvas'), renderer = new Renderer(canvas);
      renderer.resize(); renderer.reduced = true;
      const pickups = session.consumableSnapshot().pickups;
      const labels = [], geometry = Object.fromEntries(pickups.map(pickup => [pickup.itemId, []]));
      const nativeFill = renderer.ctx.fillText.bind(renderer.ctx);
      renderer.ctx.fillText = (text, x, y, ...rest) => {
        if (['Revival', 'Flare', 'Protected'].includes(text)) labels.push({ text, x, y });
        nativeFill(text, x, y, ...rest);
      };
      let insideModel = false;
      const record = (model, x, y) => {
        const pickup = pickups.find(item => item.x === x && item.y === y);
        if (pickup) geometry[pickup.itemId].push(...model.map(({ x, y, z, w, d, h }) => ({ x, y, z, w, d, h })));
      };
      for (const method of ['model', 'turnedModel']) {
        const native = renderer[method].bind(renderer);
        renderer[method] = (model, x, y, ...rest) => {
          record(model, x, y); insideModel = true;
          try { return native(model, x, y, ...rest); } finally { insideModel = false; }
        };
      }
      const nativeCube = renderer.cube.bind(renderer);
      renderer.cube = (voxel, x, y, ...rest) => {
        if (!insideModel) record([voxel], x, y);
        return nativeCube(voxel, x, y, ...rest);
      };
      const beforeState = JSON.stringify(session.consumableSnapshot());
      renderer.drawSession(game.world, session.views(), 0);
      const withItems = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const png = canvas.toDataURL().split(',')[1];
      const itemLabels = labels.splice(0);
      const observedGeometry = structuredClone(geometry);
      const unchanged = JSON.stringify(session.consumableSnapshot()) === beforeState;
      session.stop();
      renderer.drawSession(game.world, session.views(), 0);
      const withoutItems = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let changed = 0;
      for (let index = 0; index < withItems.length; index += 4) {
        if ([0, 1, 2].some(channel => withItems[index + channel] !== withoutItems[index + channel])) changed++;
      }
      return { width: innerWidth, height: innerHeight, scale: renderer.scale,
        pickups: pickups.map(pickup => ({ ...pickup, ground: renderer.project(pickup.x, pickup.y) })),
        labels: itemLabels, geometry: observedGeometry, teardownLabels: labels,
        absent: session.consumableSnapshot() === undefined && game.worldExtensionSnapshot() === undefined,
        changed, unchanged, png };
    });
    await writeFile(new URL(`consumable-world-${width}x${height}.png`, artifacts), Buffer.from(report.png, 'base64'));
    delete report.png; reports.push(report);
  }
  await writeFile(new URL('consumable-world-render.json', artifacts), JSON.stringify({ errors, reports }, null, 2));
  await page.close();
  assert.deepEqual(errors, []);
  for (const report of reports) {
    assert.deepEqual(report.labels.map(label => label.text).sort(), ['Flare', 'Revival']);
    assert.equal(report.pickups.length, 2);
    assert.equal(report.unchanged, true, 'render reads must not mutate the item capability');
    assert.ok(report.geometry.revival.length > 0 && report.geometry.flare.length > 0, 'both types have real rendered geometry');
    assert.notDeepEqual(report.geometry.revival, report.geometry.flare, 'item silhouettes must differ without relying on color or text');
    for (const pickup of report.pickups) {
      const label = report.labels.find(value => value.text.toLowerCase() === pickup.itemId);
      assert.ok(Math.abs(label.x - pickup.ground[0]) < 1e-8, 'item label follows its authoritative horizontal projection');
      assert.ok(label.y < pickup.ground[1] && label.y > pickup.ground[1] - report.scale * 2);
      assert.ok(label.x >= 0 && label.x <= report.width && label.y >= 0 && label.y <= report.height);
    }
    assert.ok(report.changed > 20, 'teardown removes actual visible pickup pixels');
    assert.deepEqual(report.teardownLabels, []);
    assert.equal(report.absent, true);
  }
});

test('an actual personal return draws protection only until its active-time deadline', async () => {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const [{ Renderer }, { Game }, { LocalSession }, { createSurviveTogetherDefinition }] = await Promise.all([
      import('/render.js'), import('/game.js'), import('/session.js'), import('/survive-together.js'),
    ]);
    const game = new Game(113, 'pond', 'stroll', false, [], 'butter');
    for (const lane of game.rows.values()) Object.assign(lane, {
      kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined,
      actors: undefined, phase: 0, speed: 0, spacing: 20, length: 4,
    });
    const session = LocalSession.stage(game, {
      roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'sunny' }],
      mode: createSurviveTogetherDefinition(game.definition),
    }).commit();
    const target = session.players.find(player => player.seat === 'p2');
    target.y = target.fromY = 2; target.powerReadyAt = 10000;
    Object.assign(game.rows.get(2), { kind: 'river', phase: 10, length: 1 });
    session.update(1 / 120);
    const died = target.state === 'dead';
    Object.assign(game.rows.get(2), { kind: 'meadow', phase: 0 });
    const recovered = session.recover({ kind: 'personal', ownerSeat: 'p2' });
    const canvas = document.querySelector('canvas'), renderer = new Renderer(canvas);
    renderer.resize(); renderer.reduced = true;
    let labels = [];
    const nativeFill = renderer.ctx.fillText.bind(renderer.ctx);
    renderer.ctx.fillText = (text, ...rest) => { if (text === 'Protected') labels.push(text); nativeFill(text, ...rest); };
    renderer.drawSession(game.world, session.views(), 0);
    const activeLabels = labels.splice(0), png = canvas.toDataURL().split(',')[1];
    const actual = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    renderer.drawSession(game.world, session.views().map(view => ({ ...view, protectionUntil: 0 })), 0);
    const without = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let changed = 0;
    for (let index = 0; index < actual.length; index += 4) if ([0, 1, 2].some(channel => actual[index + channel] !== without[index + channel])) changed++;
    for (let frame = 0; frame < 253; frame++) session.update(1 / 120);
    labels = [];
    renderer.drawSession(game.world, session.views(), 0);
    return { died, recovered, activeLabels, expiredLabels: labels, changed, png,
      expired: game.time >= target.recovery.protectionUntil };
  });
  const artifacts = new URL('../artifacts/', import.meta.url);
  await mkdir(artifacts, { recursive: true });
  await writeFile(new URL('consumable-protected-return.png', artifacts), Buffer.from(result.png, 'base64'));
  delete result.png;
  await writeFile(new URL('consumable-protected-return.json', artifacts), JSON.stringify(result, null, 2));
  await page.close();
  assert.equal(result.died, true); assert.equal(result.recovered, true);
  assert.deepEqual(result.activeLabels, ['Protected']);
  assert.ok(result.changed > 30, 'protection produces actual halo/label pixels');
  assert.equal(result.expired, true);
  assert.deepEqual(result.expiredLabels, []);
});
