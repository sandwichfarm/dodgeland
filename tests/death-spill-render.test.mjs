import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test, { after } from 'node:test';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';

const modules = await compileSources(['render', 'market/catalog', 'cosmetic-model', 'death-spill']);
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html; charset=utf-8');
  response.end(source ?? '<!doctype html><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--mute-audio'] });
after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });

test('real spilled models match market geometry, tumble above the floor, and remain visible after settling', async () => {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const reports = [];
  const artifacts = new URL('../artifacts/', import.meta.url);
  await mkdir(artifacts, { recursive: true });
  for (const size of [[720, 500], [320, 560]]) {
    await page.setViewportSize({ width: size[0], height: size[1] });
    const result = await page.evaluate(async () => {
      const [{ Renderer }, { Game }, { ITEM_CATALOG }, { cosmeticModel }, { spillPose }] = await Promise.all([
        import('/render.js'), import('/game.js'), import('/market/catalog.js'), import('/cosmetic-model.js'), import('/death-spill.js'),
      ]);
      const looks = ITEM_CATALOG.filter(item => item.kind === 'cosmetic');
      const width = innerWidth, height = innerHeight, canvas = document.querySelector('canvas');
      const renderer = new Renderer(canvas); renderer.resize();
      const sheet = document.createElement('canvas'); sheet.width = width * 4; sheet.height = (height + 28) * 3;
      const output = sheet.getContext('2d'); output.fillStyle = '#233b35'; output.fillRect(0, 0, sheet.width, sheet.height);
      const frames = [];
      const turned = renderer.turnedModel.bind(renderer), project = renderer.project.bind(renderer);
      let draws = [], active;
      renderer.project = (x, y, z = 0) => {
        if (active) { active.minZ = Math.min(active.minZ, z); active.finite &&= [x, y, z].every(Number.isFinite); }
        return project(x, y, z);
      };
      renderer.turnedModel = (model, x, y, z, yaw, tilt, floor) => {
        if (floor) {
          active = { model, x, y, z, yaw, tilt, minZ: Infinity, finite: true }; draws.push(active);
        }
        turned(model, x, y, z, yaw, tilt, floor); active = undefined;
      };
      for (const [row, cause] of ['traffic', 'water', 'wave'].entries()) {
        const game = new Game(71, 'pond', 'arcade', false, ITEM_CATALOG, cause === 'water' ? 'sunny' : 'butter');
        for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
        if (cause === 'water') Object.assign(game.lane, { kind: 'river', phase: 10, spacing: 20, length: 1, speed: 0 });
        game.state = 'playing'; game.run.wallet = 24; game.run.cosmetics = looks.map(item => item.id);
        game.run.equipped = { head: 'look-hat-beanie', shirt: 'look-shirt-sailor' };
        if (cause === 'wave') { game.waveRow = 0; game.caughtByWave = true; }
        renderer.camera = 0;
        for (const [column, age] of [-1, 0, .5, 2].entries()) {
          if (age === 0) game.end('Fixture death', cause, 'front');
          if (age >= 0) game.deathSpill.age = age;
          draws = []; renderer.draw(game, game.characterId, 0);
          const actual = renderer.ctx.getImageData(0, 0, width, height).data;
          output.drawImage(canvas, column * width, row * (height + 28) + 28);
          output.fillStyle = '#fff1cd'; output.font = '16px sans-serif';
          output.fillText(`${cause} · ${age < 0 ? 'before death' : age === 0 ? 'release' : `${age}s`}`, column * width + 12, row * (height + 28) + 20);
          if (age < 0) continue;
          const captured = draws;
          const snapshot = game.deathSpill; game.deathSpill = null; renderer.draw(game, game.characterId, 0); game.deathSpill = snapshot;
          const baseline = renderer.ctx.getImageData(0, 0, width, height).data;
          let changed = 0;
          for (let i = 0; i < actual.length; i += 4) if (actual[i] !== baseline[i] || actual[i + 1] !== baseline[i + 1] || actual[i + 2] !== baseline[i + 2]) changed++;
          const cosmetics = looks.map(item => {
            const original = cosmeticModel(item), minX = Math.min(...original.map(v => v.x - v.w / 2));
            const scale = .72 / (Math.max(...original.map(v => v.x + v.w / 2)) - minX);
            const expected = original.map(v => ({ ...v, x: v.x * scale, y: v.y * scale, z: v.z * scale, w: v.w * scale, d: v.d * scale, h: v.h * scale }));
            const match = captured.filter(draw => JSON.stringify(draw.model) === JSON.stringify(expected));
            const drop = snapshot.drops.find(drop => drop.item === item), pose = spillPose(drop, age);
            return { id: item.id, matches: match.length, pose, draw: match[0] ? { ...match[0], model: undefined } : null };
          });
          frames.push({ cause, age, changed, draws: captured.length, expectedDraws: snapshot.drops.length,
            finite: captured.every(draw => draw.finite), floorAligned: captured.every(draw => Math.abs(draw.minZ - draw.z) < 1e-9), cosmetics });
        }
        renderer.reduced = true; game.deathSpill.age = 0; renderer.draw(game, game.characterId, 0);
        const reduced = canvas.toDataURL(); game.deathSpill.age = 2; renderer.draw(game, game.characterId, 0);
        frames.push({ cause, reducedMotionStable: canvas.toDataURL() === reduced }); renderer.reduced = false;
      }
      return { frames, png: sheet.toDataURL('image/png').split(',')[1] };
    });
    await writeFile(new URL(`death-spill-${size.join('x')}.png`, artifacts), Buffer.from(result.png, 'base64'));
    for (const frame of result.frames) {
      if ('reducedMotionStable' in frame) { assert.equal(frame.reducedMotionStable, true); continue; }
      assert.equal(frame.draws, frame.expectedDraws, 'every dropped body is rendered exactly once');
      assert.equal(frame.finite, true); assert.equal(frame.floorAligned, true, 'tilted model corners stay at or above the supplied floor');
      assert.ok(frame.changed > (size[0] === 320 ? 25 : 100), `${size[0]}/${frame.cause}/${frame.age} has actual fallen-item pixels`);
      for (const item of frame.cosmetics) {
        assert.equal(item.matches, 1, `${item.id} retains its actual market model`);
        for (const key of ['x', 'y', 'yaw', 'tilt']) assert.ok(Math.abs(item.draw[key] - item.pose[key]) < 1e-9);
        assert.ok(Math.abs(item.draw.z - item.pose.z - .015) < 1e-9);
      }
    }
    reports.push({ size, frames: result.frames });
  }
  assert.deepEqual(errors, []);
  await writeFile(new URL('death-spill-render.json', artifacts), JSON.stringify({ reports, errors }, null, 2));
  await page.close();
});
