import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test, { after } from 'node:test';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';

const modules = await compileSources('render');
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html');
  response.end(source ?? '<!doctype html><style>body{margin:0;background:#f4f2df}canvas{display:block}</style><canvas width="720" height="500"></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--mute-audio'] });
after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
const page = await browser.newPage({ viewport: { width: 720, height: 500 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${server.address().port}`);
await page.evaluate(async () => {
  const [{ Renderer }, { Game, HOP_TIME }, { worldById, characterById }, { mobDefinition }, { mobPose }] = await Promise.all([
    import('/render.js'), import('/game.js'), import('/content.js'), import('/mobs.js'), import('/mob-models.js'),
  ]);
  window.frames = [];
  const canvas = document.querySelector('canvas');
  const makeRenderer = (target = canvas) => {
    const renderer = new Renderer(target);
    renderer.width = target.width; renderer.height = target.height; renderer.scale = 110;
    return renderer;
  };
  const blank = () => { const target = document.createElement('canvas'); target.width = 720; target.height = 500; return target; };
  const fingerprint = pixels => {
    let hash = 2166136261;
    for (const component of pixels) hash = Math.imul(hash ^ component, 16777619);
    return hash;
  };
  window.mobScene = ({ kind = 'slime', phase = 'rest', phaseProgress = .5, time = 0, reduced = false, state = 'playing', advance = 0, movingX, worldId = 'orchard', save = '' } = {}) => {
    const renderer = makeRenderer(); renderer.reduced = reduced;
    const game = new Game(1, worldId);
    const world = worldById(worldId);
    game.rows = new Map(Array.from({ length: 20 }, (_, offset) => {
      const index = offset - 5;
      return [index, { index, world, kind: 'meadow', speed: 0, spacing: 20, length: 2, phase: 0, variant: 0, blocked: [], decorations: [], coin: null, period: 8, warning: 1 }];
    }));
    game.state = state; game.time = time; game.waveRow = -20;
    game.x = game.fromX = 2.75; game.y = game.fromY = 1;
    const mob = { id: 1, kind, x: movingX ?? -1.25, y: 0, fromX: -1.25, fromY: 0, targetX: .95, targetY: .3, phase, phaseLeft: 1 - phaseProgress, phaseDuration: 1 };
    if (phase === 'spawning') { mob.targetX = mob.fromX; mob.targetY = mob.fromY; }
    game.mobs.push(mob);
    if (advance) game.update(advance);
    const drawn = [];
    const draw = renderer.turnedModel.bind(renderer);
    renderer.turnedModel = (model, x, y, lift, yaw) => { drawn.push({ model, x, y, lift, yaw }); draw(model, x, y, lift, yaw); };
    renderer.draw(game, 'butter', 0);
    const actual = renderer.ctx.getImageData(0, 0, 720, 500).data;
    const pose = mobPose(mob, game.time, reduced);
    const reference = makeRenderer(blank());
    reference.turnedModel(pose.model, mob.x, mob.y, pose.lift, pose.yaw);
    const mask = reference.ctx.getImageData(0, 0, 720, 500).data;
    let visible = 0, obscured = 0;
    for (let y = 1; y < 499; y++) for (let x = 1; x < 719; x++) {
      const i = (y * 720 + x) * 4;
      if ([i, i - 4, i + 4, i - 2880, i + 2880].some(p => mask[p + 3] !== 255)) continue;
      visible++;
      if ([0, 1, 2].some(channel => Math.abs(actual[i + channel] - mask[i + channel]) > 2)) obscured++;
    }
    // Measure the actual drawn central body footprint against an independent
    // physics-radius disk. Decorative wings, claws and antennae do not enter it.
    const coreColor = { slime: '#699945', crab: '#c35d73', wasp: '#e6b744' }[kind];
    const core = pose.model.find(v => v.color === coreColor && v.x === 0 && v.y === 0);
    const footprint = makeRenderer(blank());
    const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
    const points = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
      const vx = x * core.w / 2, vy = y * core.d / 2;
      return footprint.project(mob.x + vx * c - vy * s, mob.y - vx * s - vy * c);
    });
    footprint.ctx.beginPath(); points.forEach(([x, y], index) => index ? footprint.ctx.lineTo(x, y) : footprint.ctx.moveTo(x, y)); footprint.ctx.closePath(); footprint.ctx.fill();
    const corePixels = footprint.ctx.getImageData(0, 0, 720, 500).data;
    const disk = makeRenderer(blank()), radius = mobDefinition(kind).radius;
    disk.ctx.beginPath();
    for (let n = 0; n <= 96; n++) {
      const angle = n / 96 * Math.PI * 2;
      const point = disk.project(mob.x + Math.cos(angle) * radius, mob.y + Math.sin(angle) * radius);
      if (n) disk.ctx.lineTo(...point); else disk.ctx.moveTo(...point);
    }
    disk.ctx.fill();
    const circlePixels = disk.ctx.getImageData(0, 0, 720, 500).data;
    let diskPixels = 0, outside = 0;
    for (let i = 3; i < circlePixels.length; i += 4) if (circlePixels[i] === 255) { diskPixels++; if (!corePixels[i]) outside++; }
    const marker = makeRenderer(blank()); marker.mobMarker(mob);
    const markerPixels = marker.ctx.getImageData(0, 0, 720, 500).data;
    let spawnPixels = 0, targetPixels = 0, linePixels = 0;
    for (let i = 0; i < markerPixels.length; i += 4) {
      if (markerPixels[i + 3] === 255) {
        if (markerPixels[i] === 217 && markerPixels[i + 1] === 255) spawnPixels++;
        if (markerPixels[i] === 244 && markerPixels[i + 1] === 154) targetPixels++;
        if (markerPixels[i] === 255 && markerPixels[i + 1] === 224) linePixels++;
      }
    }
    if (save) {
      const crop = document.createElement('canvas'); crop.width = 390; crop.height = 210;
      crop.getContext('2d').drawImage(canvas, 150, 210, 390, 210, 0, 0, 390, 210);
      window.frames.push({ canvas: crop, label: save });
    }
    return { kind, phase, visible, obscured, radius, core: { x: core.x, y: core.y, w: core.w, d: core.d }, diskPixels, outside,
      drawn: drawn.find(item => item.model.some(v => v.color === coreColor)),
      modelFingerprint: fingerprint(mask), markerFingerprint: fingerprint(markerPixels), sceneFingerprint: fingerprint(actual),
      spawnPixels, targetPixels, linePixels, time: game.time, mobX: mob.x, mobY: mob.y };
  };
  window.mobContactSheet = () => {
    const output = document.createElement('canvas'); output.width = 1230; output.height = Math.ceil(window.frames.length / 3) * 248;
    const ctx = output.getContext('2d'); ctx.fillStyle = '#f4f2df'; ctx.fillRect(0, 0, output.width, output.height);
    window.frames.forEach((frame, i) => { const x = i % 3 * 410, y = Math.floor(i / 3) * 248;
      ctx.drawImage(frame.canvas, x + 10, y + 30); ctx.fillStyle = '#263c38'; ctx.font = '14px sans-serif'; ctx.fillText(frame.label, x + 14, y + 21);
    });
    return output.toDataURL().split(',')[1];
  };
  window.mobWarningCase = ({ kind = 'crab', phase = 'windup', reduced = false, state = 'playing', width = 240, height = 240, scale = 15 } = {}) => {
    const surface = document.createElement('canvas'); surface.width = width; surface.height = height;
    const renderer = new Renderer(surface); Object.assign(renderer, { width, height, scale, reduced });
    const game = new Game(1, 'orchard'), world = worldById('orchard');
    game.rows = new Map(Array.from({ length: 20 }, (_, n) => {
      const index = n - 5;
      return [index, { index, world, kind: 'meadow', speed: 0, spacing: 20, length: 2, phase: 0, variant: 0, blocked: [], decorations: [], coin: null, period: 8, warning: 1 }];
    }));
    game.state = state; game.waveRow = -20; game.time = .35;
    // A close attacker directly behind the duck reproduces a hidden ground
    // telegraph. Keep its body, target and render order completely ordinary.
    const mob = { id: 1, kind, x: 0, y: -.5, fromX: 0, fromY: -.5, targetX: 0, targetY: 0, phase, phaseLeft: .5, phaseDuration: 1 };
    game.mobs.push(mob); renderer.draw(game, 'butter', 0);
    const actual = renderer.ctx.getImageData(0, 0, width, height).data;
    const maskCanvas = document.createElement('canvas'); maskCanvas.width = width; maskCanvas.height = height;
    const maskRenderer = new Renderer(maskCanvas); Object.assign(maskRenderer, { width, height, scale, reduced });
    const measure = pixels => {
      let opaque = 0, hidden = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] === 255) {
        opaque++;
        if ([0, 1, 2].some(channel => Math.abs(actual[i + channel] - pixels[i + channel]) > 2)) hidden++;
      }
      return { opaque, hidden };
    };
    maskRenderer.mobWindupWarning(mob);
    const mask = maskRenderer.ctx.getImageData(0, 0, width, height).data;
    const warning = measure(mask), warningFingerprint = fingerprint(mask);
    maskRenderer.ctx.clearRect(0, 0, width, height); maskRenderer.mobMarker(mob);
    const ground = measure(maskRenderer.ctx.getImageData(0, 0, width, height).data);
    maskRenderer.ctx.clearRect(0, 0, width, height);
    maskRenderer.turnedModel(characterById('butter').model, game.groundX, game.groundY, 0, 0);
    const duckPixels = maskRenderer.ctx.getImageData(0, 0, width, height).data;
    let duckOverlap = 0;
    for (let i = 3; i < mask.length; i += 4) if (mask[i] > 200 && duckPixels[i] > 200) duckOverlap++;
    const anchor = renderer.project(mob.x, mob.y, 1.75);
    return { warning, ground, duckOverlap, warningFingerprint, anchor, image: surface.toDataURL().split(',')[1] };
  };
  window.hopFrames = [];
  window.mobHopCase = ({ kind, reduced, gap, phase = 'rest', save = '' }) => {
    const renderer = makeRenderer(); renderer.reduced = reduced;
    const game = new Game(1, 'orchard');
    const world = worldById('orchard');
    game.rows = new Map(Array.from({ length: 15 }, (_, n) => {
      const index = n - 5;
      return [index, { index, world, kind: 'meadow', speed: 0, spacing: 20, length: 2, phase: 0, variant: 0, blocked: [], decorations: [], coin: null, period: 8, warning: 1 }];
    }));
    game.state = 'playing'; game.waveRow = -20;
    game.x = game.fromX = 0; game.y = 1; game.fromY = 0; game.hop = HOP_TIME / 2;
    const radius = mobDefinition(kind).radius;
    const x = radius + .2 + gap, y = .5;
    const mob = { id: 1, kind, x, y, fromX: x, fromY: y, targetX: 0, targetY: y, phase, phaseLeft: 1, phaseDuration: 1 };
    game.mobs.push(mob);
    let duck;
    const draw = renderer.turnedModel.bind(renderer);
    renderer.turnedModel = (model, x, y, lift, yaw) => {
      if (model === characterById('butter').model) duck = { x, y, lift, yaw };
      draw(model, x, y, lift, yaw);
    };
    renderer.draw(game, 'butter', 0);
    const a = makeRenderer(blank()), b = makeRenderer(blank());
    a.turnedModel(characterById('butter').model, duck.x, duck.y, duck.lift, duck.yaw);
    const pose = mobPose(mob, game.time, reduced); b.turnedModel(pose.model, x, y, pose.lift, pose.yaw);
    const duckPixels = a.ctx.getImageData(0, 0, 720, 500).data;
    const mobPixels = b.ctx.getImageData(0, 0, 720, 500).data;
    let visibleOverlap = 0;
    for (let i = 3; i < duckPixels.length; i += 4) if (duckPixels[i] > 200 && mobPixels[i] > 200) visibleOverlap++;
    game.update(0);
    if (save) {
      const crop = document.createElement('canvas'); crop.width = 280; crop.height = 190;
      crop.getContext('2d').drawImage(canvas, 250, 180, 280, 190, 0, 0, 280, 190);
      window.hopFrames.push({ canvas: crop, label: `${save} · ${game.state === 'dead' ? 'caught' : 'safe'}` });
    }
    return { state: game.state, cause: game.deathCause, duck, visibleOverlap, separation: Math.hypot(x - duck.x, y - duck.y) - radius - .2 };
  };
  window.mobHopSheet = () => {
    const output = document.createElement('canvas'); output.width = 600; output.height = Math.ceil(window.hopFrames.length / 2) * 224;
    const ctx = output.getContext('2d'); ctx.fillStyle = '#f4f2df'; ctx.fillRect(0, 0, output.width, output.height);
    window.hopFrames.forEach((frame, i) => { const x = i % 2 * 300, y = Math.floor(i / 2) * 224;
      ctx.drawImage(frame.canvas, x + 10, y + 28); ctx.fillStyle = '#263c38'; ctx.font = '13px sans-serif'; ctx.fillText(frame.label, x + 12, y + 19);
    });
    return output.toDataURL().split(',')[1];
  };
});
const artifacts = new URL('../artifacts/', import.meta.url);
await mkdir(artifacts, { recursive: true });

test('all mob cores cover their real contact disks and retain distinct visible bodies', async () => {
  const results = [];
  for (const kind of ['slime', 'crab', 'wasp']) {
    const result = await page.evaluate(options => window.mobScene(options), { kind, phase: 'rest' }); results.push(result);
    assert.equal(result.core.x, 0); assert.equal(result.core.y, 0);
    assert.ok(Math.abs(result.core.w - result.radius * 2) < 1e-8 && Math.abs(result.core.d - result.radius * 2) < 1e-8);
    assert.ok(result.diskPixels > 600, `${kind}: physical footprint has meaningful coverage`);
    assert.equal(result.outside, 0, `${kind}: no invisible contact extends outside the solid body footprint`);
    assert.ok(result.visible > 1600, `${kind}: small bodies remain readable`);
    assert.equal(result.obscured, 0, `${kind}: terrain and telegraphs cannot clip the model`);
  }
  assert.equal(new Set(results.map(item => item.modelFingerprint)).size, 3);
  await writeFile(new URL('mob-body-alignment.json', artifacts), JSON.stringify(results, null, 2));
});

test('arrivals warn while walking and recovery leave the ground clear', async () => {
  for (const kind of ['slime', 'crab', 'wasp']) {
    const spawn = await page.evaluate(options => window.mobScene(options), { kind, phase: 'spawning' });
    assert.ok(spawn.spawnPixels > 20); assert.equal(spawn.targetPixels, 0);
    for (const phase of ['walking', 'rest']) {
      const scene = await page.evaluate(options => window.mobScene(options), { kind, phase });
      assert.equal(scene.spawnPixels + scene.targetPixels + scene.linePixels, 0, `${kind} ${phase}: no attack warning`);
    }
  }
});

test('crab and wasp committed attacks retain persistent ground warnings', async () => {
  for (const kind of ['crab', 'wasp']) {
    const windup = await page.evaluate(options => window.mobScene(options), { kind, phase: 'windup' });
    const reduced = await page.evaluate(options => window.mobScene(options), { kind, phase: 'windup', reduced: true, time: 7 });
    assert.ok(windup.targetPixels > 20 && windup.linePixels > 80, `${kind}: target and travel line both readable`);
    assert.equal(windup.obscured, 0, `${kind}: ground warning lies under its solid body`);
    assert.equal(windup.markerFingerprint, reduced.markerFingerprint, 'Less motion preserves every danger marker');
  }
});

test('close windups remain visibly warned above the duck at compact and large scales', async () => {
  const evidence = [];
  for (const kind of ['crab', 'wasp']) for (const [width, height, scale] of [[240, 240, 15], [320, 560, 20], [900, 600, 58], [2400, 1200, 100]]) {
    let fingerprint;
    for (const reduced of [false, true]) for (const state of ['playing', 'paused']) {
      const result = await page.evaluate(options => window.mobWarningCase(options), { kind, width, height, scale, reduced, state });
      assert.ok(result.warning.opaque > 45, `${kind}: readable warning even in a compact frame`);
      assert.equal(result.warning.hidden, 0, `${kind}: every opaque warning pixel stays above the bodies`);
      assert.equal(result.duckOverlap, 0, `${kind}: the badge clears the close duck's head`);
      assert.ok(result.ground.hidden > result.ground.opaque * .35, 'fixture actually obscures the close ground path');
      if (fingerprint !== undefined) assert.equal(result.warningFingerprint, fingerprint, 'warning stays static through pause and Less motion');
      fingerprint = result.warningFingerprint;
      if (!reduced && state === 'playing') await writeFile(new URL(`mob-close-warning-${kind}-${width}x${height}.png`, artifacts), Buffer.from(result.image, 'base64'));
      const { image, ...measured } = result; evidence.push({ kind, width, height, scale, reduced, state, ...measured });
    }
  }
  for (const kind of ['slime', 'crab', 'wasp']) for (const phase of kind === 'slime' ? ['walking', 'windup'] : ['spawning', 'walking', 'moving', 'rest']) {
    const result = await page.evaluate(options => window.mobWarningCase(options), { kind, phase });
    assert.equal(result.warning.opaque, 0, `${kind} ${phase}: no overhead attack badge`);
  }
  await writeFile(new URL('mob-close-warning.json', artifacts), JSON.stringify(evidence, null, 2));
});

test('rendered bodies stay at physical positions throughout walking and strikes, including Less motion', async () => {
  for (const kind of ['slime', 'crab', 'wasp']) for (const phase of kind === 'slime' ? ['walking'] : ['walking', 'moving']) for (const movingX of [-.8, -.1, .65]) for (const reduced of [false, true]) {
    const result = await page.evaluate(options => window.mobScene(options), { kind, phase, movingX, reduced });
    assert.equal(result.drawn.x, movingX); assert.equal(result.drawn.y, 0);
    assert.ok(result.visible > 1400); assert.equal(result.obscured, 0);
  }
});

test('grounded slime, walking crab and floating wasp have distinct preparation and recovery poses', async () => {
  for (const kind of ['slime', 'crab', 'wasp']) {
    const early = await page.evaluate(options => window.mobScene(options), { kind, phase: 'walking', time: .12 });
    const later = await page.evaluate(options => window.mobScene(options), { kind, phase: 'walking', time: .35 });
    assert.notEqual(early.modelFingerprint, later.modelFingerprint, `${kind}: visible walking gait`);
    assert.equal(early.drawn.yaw, later.drawn.yaw, 'gait never changes physical direction');
    if (kind === 'slime') {
      assert.equal(early.drawn.lift, 0); assert.equal(later.drawn.lift, 0);
      assert.equal(early.drawn.model[0].z, .015); assert.equal(later.drawn.model[0].z, .015);
    } else {
      const windup = await page.evaluate(options => window.mobScene(options), { kind, phase: 'windup', phaseProgress: .8, time: .35 });
      const rest = await page.evaluate(options => window.mobScene(options), { kind, phase: 'rest', time: .35 });
      assert.notEqual(windup.modelFingerprint, later.modelFingerprint, `${kind}: preparation differs from pursuit`);
      assert.notEqual(windup.modelFingerprint, rest.modelFingerprint, `${kind}: recovery releases preparation`);
      if (kind === 'crab') {
        const restingLater = await page.evaluate(options => window.mobScene(options), { kind, phase: 'rest', time: .8 });
        assert.equal(rest.modelFingerprint, restingLater.modelFingerprint, 'crab plants its feet throughout recovery');
      } else assert.ok(windup.drawn.lift < rest.drawn.lift, 'wasp settles before its strike');
    }
  }
});

test('pause freezes mob poses and reduced motion removes only decorative movement', async () => {
  for (const kind of ['slime', 'crab', 'wasp']) {
    const live = await page.evaluate(options => window.mobScene(options), { kind, phase: 'walking', time: 2.3 });
    const paused = await page.evaluate(options => window.mobScene(options), { kind, phase: 'walking', time: 2.3, state: 'paused', advance: 1 });
    assert.equal(paused.time, 2.3); assert.equal(paused.modelFingerprint, live.modelFingerprint);
    for (const phase of kind === 'slime' ? ['walking'] : ['walking', 'windup', 'moving', 'rest']) {
      const reduced = await page.evaluate(options => window.mobScene(options), { kind, time: 0, phase, reduced: true });
      const later = await page.evaluate(options => window.mobScene(options), { kind, time: 4, phase, reduced: true });
      assert.equal(reduced.modelFingerprint, later.modelFingerprint);
    }
  }
});

test('mob warnings and bodies remain visible across all biomes and produce review scenes', async () => {
  for (const worldId of ['pond', 'orchard', 'neon', 'dunes', 'frost']) for (const kind of ['slime', 'crab', 'wasp']) {
    const result = await page.evaluate(options => window.mobScene(options), { kind, worldId, phase: kind === 'slime' ? 'walking' : 'windup' });
    assert.equal(result.obscured, 0); assert.ok(result.visible > 1600);
  }
  for (const phase of ['spawning', 'walking', 'windup', 'moving', 'rest']) for (const kind of ['slime', 'crab', 'wasp']) {
    if (kind === 'slime' && (phase === 'windup' || phase === 'moving')) continue;
    await page.evaluate(options => window.mobScene(options), { kind, phase, time: .35, movingX: phase === 'moving' ? -.3 : undefined, save: `${kind} · ${phase}` });
  }
  await writeFile(new URL('mob-scenes.png', artifacts), Buffer.from(await page.evaluate(() => window.mobContactSheet()), 'base64'));
});

test('peak-hop contact looks connected while real near misses stay safe in both motion modes', async () => {
  const results = [];
  for (const kind of ['slime', 'crab', 'wasp']) for (const gap of [-.02, .06]) for (const reduced of [false, true]) {
    const options = { kind, gap, reduced, save: `${kind} ${gap < 0 ? 'contact' : 'near miss'} · ${reduced ? 'less motion' : 'normal hop'}` };
    const result = await page.evaluate(options => window.mobHopCase(options), options); results.push({ ...options, ...result });
    assert.equal(result.duck.x, 0); assert.equal(result.duck.y, .5, 'the hop uses its physical midpoint');
    assert.ok(result.duck.lift <= .101, 'nearby pursuers keep cosmetic hops visibly grounded');
    if (gap < 0) {
      assert.equal(result.state, 'dead'); assert.equal(result.cause, 'mob');
      assert.ok(result.visibleOverlap > 20, `${kind}: the catching mob visibly contacts the duck even at peak hop`);
    } else assert.equal(result.state, 'playing', `${kind}: the separated body cores remain safe`);
    assert.ok(Math.abs(result.separation - gap) < 1e-8);
  }
  for (const options of [{ gap: 2, phase: 'rest' }, { gap: 0, phase: 'spawning' }]) {
    const result = await page.evaluate(options => window.mobHopCase(options), { kind: 'slime', reduced: false, ...options });
    assert.ok(Math.abs(result.duck.lift - .36) < 1e-8, 'distant or harmless spawning mobs preserve ordinary full hops');
  }
  await writeFile(new URL('mob-hop-contact.json', artifacts), JSON.stringify(results, null, 2));
  await writeFile(new URL('mob-hop-contact.png', artifacts), Buffer.from(await page.evaluate(() => window.mobHopSheet()), 'base64'));
});
