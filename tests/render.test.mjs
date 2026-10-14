import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test, { after } from 'node:test';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';

// A small independent Canvas fixture; no game server, shell, network assets, or timing luck.
const modules = await compileSources('render', { sourceDirectory: process.env.DOWN_TO_DUCK_RENDER_SOURCE_DIR });
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html');
  response.end(source ?? '<!doctype html><style>body{margin:0;background:#f4f2df}canvas{display:block}</style><canvas id="scene" width="720" height="500"></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch();
after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
const page = await browser.newPage({ viewport: { width: 720, height: 500 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${server.address().port}`);
await page.evaluate(async () => {
  const [{ Renderer }, { Game, HOP_TIME }, { worldById, characterById, box }] = await Promise.all([
    import('/render.js'), import('/game.js'), import('/content.js'),
  ]);
  window.renderCase = ({ worldId = 'pond', variant = 1, offset = 0.25, height = 0.1, from = 0, to = 0, progress = 1, foreground = false, reduced = false }) => {
    const canvas = document.querySelector('#scene');
    const renderer = new Renderer(canvas);
    renderer.width = canvas.width; renderer.height = canvas.height; renderer.scale = 120;
    renderer.reduced = reduced;
    const game = new Game(1);
    const world = { ...worldById(worldId), scenery: [[box(0, 0, 0, 0.58, 0.5, 0.9, '#cc4466')]] };
    const riverRow = from === to ? 0 : 1;
    const lane = index => ({
      index, world, kind: index === riverRow ? 'river' : 'meadow', speed: 0, spacing: 20,
      length: 2, phase: offset, variant, blocked: [], decorations: [], coin: null, period: 8, warning: 1,
    });
    game.rows = new Map([-2, -1, 0, 1, 2, 3].map(index => [index, lane(index)]));
    if (foreground) {
      game.rows.get(0).kind = 'meadow';
      game.rows.get(0).decorations = [{ x: 0.23, variant: 0 }];
    }
    game.state = 'playing'; game.time = 0; game.idle = 0;
    game.x = game.fromX = 0; game.y = to; game.fromY = from; game.maxY = 0;
    game.hop = from === to ? 0 : HOP_TIME * (1 - progress);
    renderer.draw(game, 'pip', 0);

    // Independently render Pip at the known slab height. Flower/ridge voxels are
    // decoration, so expectations are the authored lily/log/ice slab tops.
    const expected = document.createElement('canvas');
    expected.width = canvas.width; expected.height = canvas.height;
    const reference = new Renderer(expected);
    reference.width = canvas.width; reference.height = canvas.height; reference.scale = renderer.scale;
    const step = progress;
    const row = from + (to - from) * step;
    const sourceHeight = foreground ? 0 : from === riverRow ? height : 0;
    const targetHeight = foreground ? 0 : to === riverRow ? height : 0;
    const lift = sourceHeight + (targetHeight - sourceHeight) * step + (reduced || from === to ? 0 : Math.sin(step * Math.PI) * 0.36);
    reference.model(characterById('pip').model, 0, row, lift);
    const actual = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const mask = reference.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0, obscured = 0;
    for (let y = 1; y < canvas.height - 1; y++) for (let x = 1; x < canvas.width - 1; x++) {
      const i = (y * canvas.width + x) * 4;
      // Erode one pixel so antialiasing against a different background is excluded.
      if ([i, i - 4, i + 4, i - canvas.width * 4, i + canvas.width * 4].some(p => mask[p + 3] !== 255)) continue;
      opaque++;
      if ([0, 1, 2].some(channel => Math.abs(actual[i + channel] - mask[i + channel]) > 2)) obscured++;
    }
    return { opaque, obscured, row, lift };
  };
  window.renderWaveCase = ({ worldId = 'pond', front = -1.6, mode = 'arcade', state = 'playing', reduced = false, time = 2, caught = false, platform = false } = {}) => {
    const canvas = document.querySelector('#scene');
    const renderer = new Renderer(canvas);
    renderer.width = canvas.width; renderer.height = canvas.height; renderer.scale = 60;
    renderer.reduced = reduced;
    const game = new Game(1, worldId, mode);
    const world = worldById(worldId);
    game.rows = new Map(Array.from({ length: 40 }, (_, offset) => {
      const index = offset - 16;
      return [index, {
        index, world, kind: platform && index === 0 ? 'river' : 'meadow', speed: 0, spacing: 20,
        length: 2, phase: 0.25, variant: 0, blocked: [], decorations: [], coin: null, period: 8, warning: 1,
      }];
    }));
    game.state = state; game.time = time; game.waveRow = front; game.caughtByWave = caught;
    renderer.draw(game, 'butter', 0);
    const actual = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const water = new Set(['24,124,145', '35,158,177', '110,217,211', '242,255,222', '184,240,220', '118,212,210', '55,158,172']);
    let wavePixels = 0, foamPixels = 0, splashPixels = 0, fingerprint = 2166136261;
    for (let i = 0; i < actual.length; i += 4) {
      const rgb = `${actual[i]},${actual[i + 1]},${actual[i + 2]}`;
      if (water.has(rgb)) wavePixels++;
      if (rgb === '242,255,222') foamPixels++;
      if (['254,255,234', '220,233,200', '233,246,213', '196,252,232', '162,218,198', '175,231,211'].includes(rgb)) splashPixels++;
      fingerprint = Math.imul(fingerprint ^ actual[i], 16777619);
    }
    const sample = row => {
      const [x, y] = renderer.project(3, row);
      const i = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
      return Array.from(actual.slice(i, i + 3)).join(',');
    };
    const expected = document.createElement('canvas');
    expected.width = canvas.width; expected.height = canvas.height;
    const reference = new Renderer(expected);
    reference.width = canvas.width; reference.height = canvas.height; reference.scale = renderer.scale;
    reference.turnedModel(characterById('butter').model, 0, 0, platform ? 0.21 : 0);
    const mask = reference.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0, obscured = 0;
    for (let y = 1; y < canvas.height - 1; y++) for (let x = 1; x < canvas.width - 1; x++) {
      const i = (y * canvas.width + x) * 4;
      if ([i, i - 4, i + 4, i - canvas.width * 4, i + canvas.width * 4].some(p => mask[p + 3] !== 255)) continue;
      opaque++;
      if ([0, 1, 2].some(channel => Math.abs(actual[i + channel] - mask[i + channel]) > 2)) obscured++;
    }
    return { wavePixels, foamPixels, splashPixels, fingerprint, ahead: sample(front + .2), behind: sample(front - .2), fixedProbe: sample(-1), opaque, obscured };
  };
  window.collisionFrames = [];
  window.saveCollisionFrame = label => {
    const canvas = document.querySelector('#scene');
    const crop = document.createElement('canvas'); crop.width = 380; crop.height = 230;
    crop.getContext('2d').drawImage(canvas, 170, 180, 380, 230, 0, 0, 380, 230);
    window.collisionFrames.push({ canvas: crop, label });
  };
  window.renderTrainEndCase = ({ center, save = '' }) => {
    const canvas = document.querySelector('#scene');
    const renderer = new Renderer(canvas);
    renderer.width = canvas.width; renderer.height = canvas.height; renderer.scale = 120;
    const game = new Game(1, 'orchard');
    const world = worldById('orchard');
    game.rows = new Map(Array.from({ length: 12 }, (_, offset) => {
      const index = offset - 4;
      return [index, {
        index, world, kind: index === 0 ? 'rail' : 'meadow', speed: 1, spacing: 24,
        // Deliberately retain the old generated length: train collision must
        // follow the visible carriage geometry, not an unrelated lane value.
        length: 13, phase: 1.5 + (center + 19) / 38 * 1.75, variant: 0,
        blocked: [], decorations: [], coin: null, period: 10, warning: 1.5,
      }];
    }));
    game.state = 'playing';
    const carriageBounds = [];
    const cube = renderer.cube.bind(renderer);
    renderer.cube = (voxel, x, row, lift = 0) => {
      if (voxel.color === '#e1b668') carriageBounds.push({
        minX: x + voxel.x - voxel.w / 2, maxX: x + voxel.x + voxel.w / 2,
        minRow: row - voxel.y - voxel.d / 2, maxRow: row - voxel.y + voxel.d / 2,
      });
      cube(voxel, x, row, lift);
    };
    renderer.draw(game, 'butter', 0);
    const visibleMin = Math.min(...carriageBounds.map(bounds => bounds.minX));
    const visibleMax = Math.max(...carriageBounds.map(bounds => bounds.maxX));
    // Independently rasterize the actual drawn carriage ground footprints and
    // the duck's authored body footprint. Height can visually occlude a nearby
    // object in this camera, so full projected sprite overlap is not contact.
    const mask = document.createElement('canvas'); mask.width = canvas.width; mask.height = canvas.height;
    const reference = new Renderer(mask);
    reference.width = canvas.width; reference.height = canvas.height; reference.scale = renderer.scale;
    for (const bounds of carriageBounds) reference.tile((bounds.minX + bounds.maxX) / 2, (bounds.minRow + bounds.maxRow) / 2, bounds.maxX - bounds.minX, bounds.maxRow - bounds.minRow, '#ffffff');
    const trainPixels = reference.ctx.getImageData(0, 0, mask.width, mask.height).data;
    reference.ctx.clearRect(0, 0, mask.width, mask.height);
    const body = characterById('butter').model.find(voxel => voxel.color === '#f8d45e');
    reference.tile(body.x, -body.y, body.w, body.d, '#ffffff');
    const duckPixels = reference.ctx.getImageData(0, 0, mask.width, mask.height).data;
    let overlapPixels = 0, bodyPixels = 0, visibleTrainPixels = 0;
    for (let i = 3; i < trainPixels.length; i += 4) {
      if (duckPixels[i] === 255) bodyPixels++;
      if (trainPixels[i] === 255) visibleTrainPixels++;
      if (duckPixels[i] > 0 && trainPixels[i] > 0) overlapPixels++;
    }
    if (save) window.saveCollisionFrame(save);
    game.update(0);
    return { center, visibleMin, visibleMax, carriageCount: carriageBounds.length, bodyPixels, visibleTrainPixels, overlapPixels, state: game.state, reason: game.reason };
  };
  window.renderHopCollisionCase = ({ from, to, progress, reduced, save = '' }) => {
    const canvas = document.querySelector('#scene');
    const renderer = new Renderer(canvas);
    renderer.width = canvas.width; renderer.height = canvas.height; renderer.scale = 100;
    renderer.reduced = reduced;
    const game = new Game(1, 'orchard');
    const world = worldById('orchard');
    game.rows = new Map(Array.from({ length: 14 }, (_, offset) => {
      const index = offset - 5;
      return [index, {
        index, world, kind: 'meadow', speed: 0, spacing: 20, length: 2, phase: 0,
        variant: 0, blocked: [], decorations: [], coin: null, period: 8, warning: 1,
      }];
    }));
    game.state = 'playing'; game.time = 0;
    [game.fromX, game.fromY] = from; [game.x, game.y] = to;
    game.hop = HOP_TIME * (1 - progress);
    const expectedX = from[0] + (to[0] - from[0]) * progress;
    const expectedY = from[1] + (to[1] - from[1]) * progress;
    game.waveRow = expectedY - .08;
    let drawn;
    const turnedModel = renderer.turnedModel.bind(renderer);
    renderer.turnedModel = (model, x, row, lift, yaw) => {
      drawn = { x, row, lift };
      turnedModel(model, x, row, lift, yaw);
    };
    renderer.draw(game, 'butter', 0);
    if (save) window.saveCollisionFrame(save);
    const mask = document.createElement('canvas'); mask.width = canvas.width; mask.height = canvas.height;
    const reference = new Renderer(mask);
    reference.width = canvas.width; reference.height = canvas.height; reference.scale = renderer.scale;
    const lift = reduced ? 0 : Math.sin(progress * Math.PI) * .36;
    reference.turnedModel(characterById('butter').model, expectedX, expectedY, lift);
    const actual = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixels = reference.ctx.getImageData(0, 0, mask.width, mask.height).data;
    let opaque = 0, misplaced = 0;
    for (let y = 1; y < canvas.height - 1; y++) for (let x = 1; x < canvas.width - 1; x++) {
      const i = (y * canvas.width + x) * 4;
      if ([i, i - 4, i + 4, i - canvas.width * 4, i + canvas.width * 4].some(p => pixels[p + 3] !== 255)) continue;
      opaque++;
      if ([0, 1, 2].some(channel => Math.abs(actual[i + channel] - pixels[i + channel]) > 2)) misplaced++;
    }
    const safeGap = game.waveGap;
    game.update(0);
    const safeState = game.state;
    game.waveRow = expectedY + .001;
    game.update(0);
    return { drawn, expectedX, expectedY, lift, opaque, misplaced, safeGap, safeState, caughtState: game.state, caughtByWave: game.caughtByWave };
  };
  window.collisionContactSheet = () => {
    const canvas = document.createElement('canvas'); canvas.width = 800;
    canvas.height = Math.ceil(window.collisionFrames.length / 2) * 270;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f4f2df'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    window.collisionFrames.forEach((frame, index) => {
      const x = index % 2 * 400, y = Math.floor(index / 2) * 270;
      ctx.drawImage(frame.canvas, x + 10, y + 32);
      ctx.fillStyle = '#263c38'; ctx.font = '14px sans-serif'; ctx.fillText(frame.label, x + 14, y + 22);
    });
    return canvas.toDataURL('image/png').split(',')[1];
  };
  window.duckFrames = [];
  window.renderDuckCase = ({ character = 'butter', time = 0, state = 'playing', reduced = false, advance = 0, save = '' } = {}) => {
    const canvas = document.querySelector('#scene');
    const renderer = new Renderer(canvas);
    renderer.width = canvas.width; renderer.height = canvas.height; renderer.scale = 120;
    renderer.reduced = reduced;
    // Plain, safe ground isolates the real traveler rendering from moving scenery.
    const game = new Game(1, 'orchard', 'stroll');
    const world = worldById('orchard');
    game.rows = new Map(Array.from({ length: 20 }, (_, offset) => {
      const index = offset - 5;
      return [index, {
        index, world, kind: 'meadow', speed: 0, spacing: 20, length: 2,
        phase: 0, variant: 0, blocked: [], decorations: [], coin: null, period: 8, warning: 1,
      }];
    }));
    game.time = time; game.state = state;
    game.update(advance);
    renderer.draw(game, character, 0);
    const pixels = renderer.ctx.getImageData(250, 210, 220, 190).data;
    let billPixels = 0, eyePixels = 0, minBillX = Infinity, maxBillX = -Infinity;
    let changedPixels = 0;
    let fingerprint = 2166136261, bodyFingerprint = 2166136261;
    for (let y = 0; y < 190; y++) for (let x = 0; x < 220; x++) {
      const i = (y * 220 + x) * 4;
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
      // Recognize the authored hues across changing face illumination, without
      // relying on the renderer's yaw-dependent shading values.
      if ((r - g === 91 && g - b === 96) || (r - g === 95 && g - b === 68)) {
        billPixels++; minBillX = Math.min(minBillX, x); maxBillX = Math.max(maxBillX, x);
      }
      if (r >= 10 && r <= 60 && g - r === 16 && b - r === 4) eyePixels++;
      if (window.previousDuckPixels && [0, 1, 2].some(channel => Math.abs(pixels[i + channel] - window.previousDuckPixels[i + channel]) > 8)) changedPixels++;
      for (let channel = 0; channel < 3; channel++) {
        fingerprint = Math.imul(fingerprint ^ pixels[i + channel], 16777619);
        // Below the neck: a changed silhouette here proves this is a body turn,
        // not merely an animated face or a shifted head.
        if (y >= 105) bodyFingerprint = Math.imul(bodyFingerprint ^ pixels[i + channel], 16777619);
      }
    }
    window.previousDuckPixels = pixels;
    if (save) {
      const crop = document.createElement('canvas'); crop.width = 220; crop.height = 190;
      crop.getContext('2d').drawImage(canvas, 250, 210, 220, 190, 0, 0, 220, 190);
      window.duckFrames.push({ canvas: crop, label: save });
    }
    return { billPixels, billWidth: maxBillX - minBillX + 1, eyePixels, fingerprint, bodyFingerprint, changedPixels, gameTime: game.time };
  };
  window.duckContactSheet = () => {
    const canvas = document.createElement('canvas');
    canvas.width = window.duckFrames.length * 240; canvas.height = 232;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f4f2df'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    window.duckFrames.forEach((frame, index) => {
      ctx.drawImage(frame.canvas, index * 240 + 10, 32);
      ctx.fillStyle = '#263c38'; ctx.font = '14px sans-serif'; ctx.fillText(frame.label, index * 240 + 14, 22);
    });
    return canvas.toDataURL('image/png').split(',')[1];
  };
});

const artifacts = new URL('../artifacts/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const label = process.env.DOWN_TO_DUCK_RENDER_ARTIFACT_LABEL ?? 'after';

test('Pip remains fully visible on either side of lily, log and ice platform centers', async () => {
  const results = [];
  for (const platform of [
    { name: 'lily', worldId: 'pond', variant: 1, height: 0.1 },
    { name: 'log', worldId: 'pond', variant: 0, height: 0.21 },
    { name: 'ice', worldId: 'frost', variant: 0, height: 0.14 },
  ]) for (const offset of [0.25, -0.25]) {
    const result = await page.evaluate(options => window.renderCase(options), { ...platform, offset });
    results.push({ platform: platform.name, offset, ...result });
    if (platform.name === 'lily' && offset === 0.25) {
      await page.locator('#scene').screenshot({ path: new URL(`render-${label}.png`, artifacts).pathname });
    }
  }
  await writeFile(new URL(`render-${label}.json`, artifacts), JSON.stringify(results, null, 2));
  for (const result of results) {
    assert.ok(result.opaque > 1000, 'reference mask includes a meaningful character silhouette');
    assert.equal(result.obscured, 0, `${result.platform}, platform center ${result.offset}: support must not paint over Pip at its slab height`);
  }
});

test('land-to-water and water-to-land hops follow the interpolated support surface plus their jump arc', async () => {
  for (const [from, to] of [[0, 1], [1, 0]]) for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    const result = await page.evaluate(options => window.renderCase(options), { from, to, progress });
    assert.ok(result.opaque > 1000);
    assert.equal(result.obscured, 0, `hop ${from}→${to} at ${progress}: Pip must occupy the expected surface-relative position`);
  }
  for (const [from, to] of [[0, 1], [1, 0]]) for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    const reduced = await page.evaluate(options => window.renderCase(options), { from, to, progress, reduced: true });
    assert.equal(reduced.obscured, 0, `reduced hop ${from}→${to} at ${progress}: same ground and support interpolation without jump lift`);
  }
});

test('foreground scenery still occludes the player where their silhouettes overlap', async () => {
  const result = await page.evaluate(() => window.renderCase({ foreground: true }));
  assert.ok(result.obscured > result.opaque * 0.1, 'foreground scenery actually covers the overlapping character pixels');
  assert.ok(result.obscured < result.opaque * 0.95, 'the fixture also leaves visible character pixels');
});

test('the wave has an obvious full-width front that follows its world-space collision row in every biome', async () => {
  for (const worldId of ['pond', 'orchard', 'neon', 'dunes', 'frost', 'bloom']) {
    const result = await page.evaluate(options => window.renderWaveCase(options), { worldId });
    assert.ok(result.wavePixels > 45000, `${worldId}: substantial visibly flooded ground`);
    assert.ok(result.foamPixels > 1500, `${worldId}: contrasting foam clearly marks the front`);
    assert.notEqual(result.ahead, result.behind, `${worldId}: flood stops at the world-space boundary`);
    assert.ok(['110,217,211', '242,255,222'].includes(result.behind), `${worldId}: foam sits immediately behind the boundary`);
  }
  const distant = await page.evaluate(() => window.renderWaveCase({ front: -2 }));
  const near = await page.evaluate(() => window.renderWaveCase({ front: -0.6 }));
  assert.notEqual(distant.fixedProbe, near.fixedProbe, 'the same ground becomes water only when the collision front passes it');
  assert.ok(near.wavePixels > distant.wavePixels + 30000, 'approaching front visibly claims more of the frame');
  await page.evaluate(() => window.renderWaveCase({ worldId: 'orchard', front: -1.2 }));
  await page.locator('#scene').screenshot({ path: new URL('wave-approaching.png', artifacts).pathname });
});

test('ready and Stroll scenes have no chasing wave; reduced motion retains the exact advancing front', async () => {
  for (const options of [{ state: 'ready' }, { mode: 'stroll' }]) {
    const result = await page.evaluate(options => window.renderWaveCase(options), options);
    assert.equal(result.wavePixels, 0);
  }
  const still = await page.evaluate(() => window.renderWaveCase({ reduced: true, time: 1 }));
  const later = await page.evaluate(() => window.renderWaveCase({ reduced: true, time: 7 }));
  assert.ok(still.wavePixels > 45000, 'reduced motion keeps the hazard visible');
  assert.equal(still.fingerprint, later.fingerprint, 'reduced motion removes decorative water movement');
  const advanced = await page.evaluate(() => window.renderWaveCase({ reduced: true, time: 7, front: -.6 }));
  assert.ok(advanced.wavePixels > still.wavePixels + 20000, 'reduced motion does not hide meaningful front movement');
});

test('the wave preserves a safe duck silhouette on ground and raised river platforms', async () => {
  for (const platform of [false, true]) for (const reduced of [false, true]) {
    const result = await page.evaluate(options => window.renderWaveCase(options), { front: -.01, platform, reduced });
    assert.ok(result.opaque > 300);
    assert.equal(result.obscured, 0, `safe duck remains fully visible, platform=${platform}, reduced=${reduced}`);
  }
});

test('paused water stays frozen and getting caught leaves a distinct contact splash', async () => {
  const playing = await page.evaluate(() => window.renderWaveCase({ time: 4 }));
  const paused = await page.evaluate(() => window.renderWaveCase({ time: 4, state: 'paused' }));
  assert.equal(paused.fingerprint, playing.fingerprint, 'pausing preserves the same water surface');
  const otherDeath = await page.evaluate(() => window.renderWaveCase({ state: 'dead', front: 0 }));
  const caught = await page.evaluate(() => window.renderWaveCase({ state: 'dead', front: 0, caught: true }));
  assert.notEqual(caught.fingerprint, otherDeath.fingerprint, 'wave contact has its own splash feedback');
  assert.ok(caught.splashPixels > otherDeath.splashPixels + 100, 'contact adds visible raised foam around the traveler');
  await page.locator('#scene').screenshot({ path: new URL('wave-caught.png', artifacts).pathname });
});

test('Butter has a visible oversized bill and turns the body far enough to show a side eye', async () => {
  const neutral = await page.evaluate(() => window.renderDuckCase({ time: 0, save: 'Facing forward' }));
  const side = await page.evaluate(() => window.renderDuckCase({ time: 3, save: 'Looking around' }));
  const returned = await page.evaluate(() => window.renderDuckCase({ time: 6, save: 'Facing forward again' }));
  const contactSheet = await page.evaluate(() => window.duckContactSheet());
  await writeFile(new URL('duck-turns.png', artifacts), Buffer.from(contactSheet, 'base64'));
  await writeFile(new URL('duck-turns.json', artifacts), JSON.stringify({ neutral, side, returned }, null, 2));
  assert.ok(neutral.billPixels > 150, 'the orange bill remains visible while Butter faces forward');
  assert.ok(neutral.billWidth > 60, 'the broad bill visibly extends beyond the head');
  assert.ok(side.billPixels > 150, 'the bill remains a clear part of the turned face');
  assert.ok(side.eyePixels > neutral.eyePixels + 10, 'the turn exposes more of the side eye');
  assert.notEqual(side.fingerprint, neutral.fingerprint, 'the complete traveler visibly turns');
  assert.notEqual(side.bodyFingerprint, neutral.bodyFingerprint, 'the lower body turns with the face');
  assert.equal(returned.fingerprint, neutral.fingerprint, 'Butter settles back to its straight forward pose');
});

test('duck turns freeze on pause, respect reduced motion, and leave other travelers unchanged', async () => {
  const turning = await page.evaluate(() => window.renderDuckCase({ time: 3 }));
  const paused = await page.evaluate(() => window.renderDuckCase({ time: 3, state: 'paused', advance: 2 }));
  assert.equal(paused.gameTime, 3, 'paused gameplay does not advance the animation clock');
  assert.equal(paused.fingerprint, turning.fingerprint, 'pause preserves the current body pose');
  const neutral = await page.evaluate(() => window.renderDuckCase({ time: 0 }));
  for (const time of [1, 3, 6]) {
    const reduced = await page.evaluate(time => window.renderDuckCase({ time, reduced: true }), time);
    assert.equal(reduced.fingerprint, neutral.fingerprint, `reduced motion retains a static forward pose at ${time}s`);
  }
  const frog = await page.evaluate(() => window.renderDuckCase({ character: 'pip', time: 0 }));
  const laterFrog = await page.evaluate(() => window.renderDuckCase({ character: 'pip', time: 3 }));
  assert.equal(frog.fingerprint, laterFrog.fingerprint, 'other travelers keep their existing rendering');
});

test('the duck begins and finishes a turn without a visible pose jump', async () => {
  await page.evaluate(() => window.renderDuckCase({ time: 2 }));
  const begins = await page.evaluate(() => window.renderDuckCase({ time: 2.001 }));
  assert.ok(begins.changedPixels < 30, `a near-zero turn must not reorder visible body parts (${begins.changedPixels} changed pixels)`);
  await page.evaluate(() => window.renderDuckCase({ time: 4.149 }));
  const finishes = await page.evaluate(() => window.renderDuckCase({ time: 4.15 }));
  assert.ok(finishes.changedPixels < 30, `settling forward must not reorder visible body parts (${finishes.changedPixels} changed pixels)`);
});


test('visible clearance beside either train end remains safe', async () => {
  const results = [];
  for (const center of [-6.71, 6.71]) {
    const result = await page.evaluate(options => window.renderTrainEndCase(options), { center, save: center < 0 ? 'Clear of train ahead' : 'Clear of train behind' });
    results.push(result);
    assert.equal(result.carriageCount, 5, 'the fixture observes the five carriages actually drawn');
    assert.ok(result.bodyPixels > 1500 && result.visibleTrainPixels > 5000, 'both visible footprints have meaningful pixel coverage');
    assert.equal(result.overlapPixels, 0, 'the visible grounded bodies have a real gap');
  }
  await writeFile(new URL(`collision-train-${label}.json`, artifacts), JSON.stringify(results, null, 2));
  for (const result of results) assert.equal(result.state, 'playing', `train center ${result.center}: visible clearance must not cause ${result.reason}`);
});

test('normal and reduced motion show the same hop ground position used by wave collision', async () => {
  const results = [];
  for (const [from, to] of [[[0, 0], [0, 1]], [[0, 1], [0, 0]], [[0, 0], [1, 0]]]) {
    for (const progress of [.25, .5, .75]) for (const reduced of [false, true]) {
      const save = from[1] === 0 && to[1] === 1 && progress === .5 ? (reduced ? 'Less motion: same ground position' : 'Normal hop: same ground position') : '';
      const result = await page.evaluate(options => window.renderHopCollisionCase(options), { from, to, progress, reduced, save });
      results.push({ from, to, progress, reduced, ...result });
    }
  }
  await writeFile(new URL(`collision-hop-${label}.json`, artifacts), JSON.stringify(results, null, 2));
  const contactSheet = await page.evaluate(() => window.collisionContactSheet());
  await writeFile(new URL(`collision-scenes-${label}.png`, artifacts), Buffer.from(contactSheet, 'base64'));
  for (const result of results) {
    const description = `${result.from}→${result.to}, progress=${result.progress}, reduced=${result.reduced}`;
    assert.ok(Math.abs(result.drawn.x - result.expectedX) < 1e-9 && Math.abs(result.drawn.row - result.expectedY) < 1e-9, `${description}: drawn ground matches physical hop`);
    assert.ok(Math.abs(result.drawn.lift - result.lift) < 1e-9, `${description}: only normal motion has jump lift`);
    assert.ok(result.opaque > 1500);
    assert.equal(result.misplaced, 0, `${description}: the actual duck pixels occupy the correct hop position`);
    assert.ok(Math.abs(result.safeGap - .08) < 1e-9, `${description}: foam-to-ground gap agrees with drawing`);
    assert.equal(result.safeState, 'playing');
    assert.equal(result.caughtState, 'dead');
    assert.equal(result.caughtByWave, true);
  }
});

test('car fronts follow traffic direction and drawn chassis match collision bounds', async () => {
  const cases = await page.evaluate(async () => {
    const [{ Renderer }, { Game, vehicleBounds }, { WORLDS }] = await Promise.all([import('/render.js'), import('/game.js'), import('/content.js')]);
    const results = [];
    for (const world of WORLDS) for (let variant = 0; variant < world.vehicles.length; variant++) for (const speed of [-2, 2]) {
      const game = new Game(1, world.id, 'stroll');
      const lane = { ...game.rows.get(0), kind: 'road', speed, phase: 0, spacing: 30, variant, world, length: variant ? 1.8 : 1.15, decorations: [], coin: null };
      game.rows = new Map([[0, lane]]);
      const renderer = new Renderer(document.querySelector('#scene'));
      renderer.width = 720; renderer.height = 500; renderer.scale = 60;
      const parts = [];
      renderer.cube = (v, x, row) => { if (x === 0 && row === 0) parts.push(v); };
      renderer.draw(game, 'butter', 0);
      const headlight = parts.find(v => v.color === '#fff0b3');
      const chassis = parts.reduce((largest, v) => v.w * v.d > largest.w * largest.d ? v : largest);
      results.push({ world: world.id, variant, speed, lightX: headlight.x,
        widthsPositive: parts.every(v => v.w > 0), expected: vehicleBounds(lane),
        drawn: { minX: chassis.x - chassis.w / 2, maxX: chassis.x + chassis.w / 2, minY: -chassis.y - chassis.d / 2, maxY: -chassis.y + chassis.d / 2 } });
    }
    return results;
  });
  assert.ok(cases.length >= 24);
  for (const result of cases) {
    assert.equal(Math.sign(result.lightX), Math.sign(result.speed), `${result.world}: headlights point along travel`);
    assert.ok(result.widthsPositive, 'mirroring does not invert voxel dimensions');
    assert.deepEqual(result.drawn, result.expected, `${result.world}: rendered body equals damage geometry`);
  }
});

test('decorative hop lowers beside a car without moving the collision position', async () => {
  const results = await page.evaluate(async () => {
    const [{ Renderer }, { Game, HOP_TIME }] = await Promise.all([import('/render.js'), import('/game.js')]);
    return [false, true].flatMap(reduced => [0, 5].map(carX => {
      const game = new Game(1, 'orchard', 'stroll');
      for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', decorations: [], coin: null });
      Object.assign(game.rows.get(1), { kind: 'road', phase: carX, spacing: 30, speed: 1, length: 1.15 });
      game.y = 1; game.fromY = 0; game.hop = HOP_TIME / 2;
      const renderer = new Renderer(document.querySelector('#scene'));
      renderer.width = 720; renderer.height = 500; renderer.scale = 80; renderer.reduced = reduced;
      let position;
      renderer.turnedModel = (model, x, y, lift) => { position = { x, y, lift }; };
      renderer.draw(game, 'butter', 0);
      return { reduced, carX, ...position };
    }));
  });
  for (const r of results) {
    assert.equal(r.x, 0); assert.equal(r.y, .5, 'the physical ground position stays unchanged');
    if (r.reduced) assert.equal(r.lift, 0);
    else if (r.carX === 0) assert.ok(r.lift > 0 && r.lift < .13, 'low arc keeps a glancing impact visually connected');
    else assert.equal(r.lift, .36, 'open-ground hop retains full bounce');
  }
});
