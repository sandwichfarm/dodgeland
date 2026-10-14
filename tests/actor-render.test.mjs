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
  response.end(source ?? '<!doctype html><canvas width="900" height="600"></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--mute-audio'] });
after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });

test('traffic models preserve old cars and share visible chassis bounds in either direction', async () => {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const [{ Renderer }, { WORLDS }, { vehicleBounds }, { vehicleModel, vehicleModelWidth }] = await Promise.all([
      import('/render.js'), import('/content.js'), import('/game.js'), import('/vehicle-models.js'),
    ]);
    const sheet = document.createElement('canvas'); sheet.width = 1260; sheet.height = 840;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#e2e2ce'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    const frames = [];
    for (let row = 0; row < WORLDS.length; row++) {
      const world = WORLDS[row];
      for (const [column, kind] of ['car', 'truck', 'sports'].entries()) for (const direction of [-1, 1]) {
        const lane = { world, variant: 0, length: 1.8, speed: direction };
        const actor = { kind, variant: 0, length: kind === 'truck' ? 2.8 : kind === 'sports' ? 1.5 : 1.8, speed: direction };
        const model = vehicleModel(lane, actor), chassis = model.reduce((a, b) => a.w * a.d > b.w * b.d ? a : b);
        const scale = actor.length / vehicleModelWidth(model), bounds = vehicleBounds(lane, actor);
        const expected = { minX: chassis.x * scale * direction - chassis.w * scale / 2, maxX: chassis.x * scale * direction + chassis.w * scale / 2,
          minY: -chassis.y - chassis.d / 2, maxY: -chassis.y + chassis.d / 2 };
        const canvas = document.createElement('canvas'); canvas.width = 210; canvas.height = 118;
        const renderer = new Renderer(canvas); Object.assign(renderer, { width: 210, height: 118, scale: 55 });
        renderer.ctx.fillStyle = world.colors.road; renderer.ctx.fillRect(0, 0, 210, 118);
        renderer.shadow(0, 0, actor.length); renderer.model(model, 0, 0, 0, scale * direction);
        const left = (column * 2 + (direction > 0 ? 1 : 0)) * 210, top = row * 140;
        ctx.drawImage(canvas, left, top + 22); ctx.fillStyle = '#263c38'; ctx.font = '12px sans-serif';
        ctx.fillText(`${world.id} ${kind} ${direction < 0 ? '←' : '→'}`, left + 8, top + 16);
        frames.push({ world: world.id, kind, direction, bounds, expected, parts: model.length, height: Math.max(...model.map(v => v.z + v.h)),
          legacy: vehicleModel(lane) === world.vehicles[0], carOriginal: kind !== 'car' || model === world.vehicles[0], cached: model === vehicleModel(lane, actor) });
      }
    }
    return { frames, png: sheet.toDataURL().split(',')[1] };
  });
  const artifacts = new URL('../artifacts/', import.meta.url); await mkdir(artifacts, { recursive: true });
  await writeFile(new URL('actor-models-sheet.png', artifacts), Buffer.from(result.png, 'base64'));
  assert.deepEqual(errors, []); assert.equal(result.frames.length, 36);
  for (const frame of result.frames) {
    assert.deepEqual(frame.bounds, frame.expected, `${frame.world}/${frame.kind}/${frame.direction} visible chassis matches collisions`);
    assert.ok(frame.legacy && frame.carOriginal && frame.cached);
    if (frame.kind === 'truck') assert.ok(frame.height > 1 && frame.parts >= 17, 'truck has tall cargo body, cab and six wheels');
    if (frame.kind === 'sports') assert.ok(frame.height < .65 && frame.parts >= 17, 'sports car stays visibly low with stripes and spoiler');
  }
  await page.close();
});

test('the gameplay renderer uses individual seeded traffic and platform lengths', async () => {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const [{ Renderer }, { Game, laneActors }, { generateSeedLane }, { vehicleModel, vehicleModelWidth }] = await Promise.all([
      import('/render.js'), import('/game.js'), import('/levels/index.js'), import('/vehicle-models.js'),
    ]);
    const run = { schema: 2, seed: 31, home: 'orchard', mode: 'stroll', gentle: false };
    const scenes = [];
    for (let row = 150; row < 550 && scenes.length < 3; row++) {
      const lane = generateSeedLane(run, row);
      for (let time = 0; time < 18 && scenes.length < 3; time += .5) {
        const actors = laneActors(lane, time).filter(actor => Math.abs(actor.x) < 5);
        const kinds = new Set(actors.map(actor => actor.kind));
        const want = lane.kind === 'river' && new Set(actors.map(actor => actor.length)).size > 1 ? 'river'
          : kinds.has('truck') && kinds.has('car') ? 'truck'
          : actors.some(actor => actor.kind === 'sports' && actor.accelerating) ? 'sports' : '';
        if (!want || scenes.some(scene => scene.kind === want)) continue;
        scenes.push({ kind: want, lane, time });
      }
    }
    const canvas = document.querySelector('canvas');
    const sheet = document.createElement('canvas'); sheet.width = 900; sheet.height = 340 * scenes.length;
    const ctx = sheet.getContext('2d'), checks = [];
    for (const [index, scene] of scenes.entries()) {
      const game = new Game(run), lane = scene.lane;
      game.rows.clear(); game.rows.set(lane.index, lane); game.maxY = game.y = game.fromY = lane.index;
      game.x = game.fromX = 4.8; game.time = scene.time;
      const renderer = new Renderer(canvas); Object.assign(renderer, { width: 900, height: 600, scale: 60, camera: lane.index });
      const calls = [], draw = renderer.model.bind(renderer), marks = [], tile = renderer.tile.bind(renderer);
      renderer.model = (model, x, y, lift, scale) => { calls.push({ model, x, y, scale }); draw(model, x, y, lift, scale); };
      renderer.tile = (x, y, w, d, color) => { marks.push({ x, y, w, d, color }); tile(x, y, w, d, color); };
      renderer.draw(game, 'butter', 0);
      const actors = laneActors(lane, game.time).filter(actor => Math.abs(actor.x) < 5);
      for (const actor of actors) {
        const call = calls.find(call => call.x === actor.x && call.y === lane.index && call.model === (lane.kind === 'river'
          ? lane.world.platforms[lane.variant % lane.world.platforms.length] : vehicleModel(lane, actor)));
        checks.push({ kind: actor.kind, found: Boolean(call), length: actor.length, drawnLength: call ? lane.kind === 'river' ? call.scale
          : Math.abs(call.scale) * vehicleModelWidth(call.model) : 0, direction: call?.scale < 0 ? -1 : 1, expectedDirection: Math.sign(lane.speed) });
      }
      const acceleration = actors.some(actor => actor.kind === 'sports' && actor.accelerating);
      const streaks = marks.filter(mark => mark.color === '#fff0cf' && mark.d === .026).length;
      marks.length = 0; renderer.reduced = true; renderer.draw(game, 'butter', 0);
      checks.push({ acceleration, streaks, reducedStreaks: marks.filter(mark => mark.color === '#fff0cf' && mark.d === .026).length });
      ctx.fillStyle = '#e2e2ce'; ctx.fillRect(0, index * 340, 900, 340);
      ctx.fillStyle = '#263c38'; ctx.font = '18px sans-serif'; ctx.fillText(`${scene.kind} · row ${lane.index} · ${lane.speed > 0 ? 'right' : 'left'}`, 16, index * 340 + 27);
      ctx.drawImage(canvas, 0, 170, 900, 300, 0, index * 340 + 40, 900, 300);
    }
    return { checks, kinds: scenes.map(scene => scene.kind), png: sheet.toDataURL().split(',')[1] };
  });
  await writeFile(new URL('../artifacts/actor-gameplay-sheet.png', import.meta.url), Buffer.from(result.png, 'base64'));
  assert.deepEqual(errors, []);
  assert.deepEqual(result.kinds.sort(), ['river', 'sports', 'truck']);
  for (const check of result.checks) {
    if ('found' in check) {
      assert.ok(check.found, `${check.kind} is drawn with its shared actor model`);
      assert.ok(Math.abs(check.drawnLength - check.length) < 1e-9, `${check.kind} uses its own length`);
      if (check.kind !== 'platform') assert.equal(check.direction, check.expectedDirection);
    } else {
      if (check.acceleration) assert.ok(check.streaks > 0, 'accelerating sports car has a small road streak');
      assert.equal(check.reducedStreaks, 0, 'Less motion removes road streaks');
    }
  }
  await page.close();
});
