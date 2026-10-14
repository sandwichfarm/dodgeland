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
  response.end(source ?? '<!doctype html><canvas width="480" height="320"></canvas>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--mute-audio'] });
after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });

test('every rescue draws the selected traveler on its continuous arc, with quieter Less motion feedback', async () => {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const [{ Renderer }, { Game, generateLane }, { CHARACTERS }] = await Promise.all([
      import('/render.js'), import('/game.js'), import('/content.js'),
    ]);
    const sheet = document.createElement('canvas'); sheet.width = 960; sheet.height = CHARACTERS.length * 320;
    const ctx = sheet.getContext('2d'), frames = [];
    for (const [row, character] of CHARACTERS.entries()) {
      const game = new Game(23, 'pond', 'arcade', false, [], character.id);
      for (const index of game.rows.keys()) game.rows.set(index, { ...generateLane(23, index, 'pond'), kind: index === 0 ? 'river' : 'meadow',
        blocked: [], decorations: [], coin: null, speed: 0, phase: 10, length: 2, spacing: 20 });
      game.state = 'playing'; game.health = .5;
      const cause = game.power.causes[0];
      if (cause === 'wave') game.waveRow = 0;
      game.end('visual fixture', cause, 'side');
      if (!game.powerRescue) throw new Error(`${character.id} did not activate`);
      const original = { x: game.groundX, y: game.groundY };
      game.update(game.power.duration / 2);
      const actual = { x: game.groundX, y: game.groundY };
      for (const [column, reduced] of [false, true].entries()) {
        const canvas = document.querySelector('canvas');
        const renderer = new Renderer(canvas); Object.assign(renderer, { width: 480, height: 320, scale: 40, camera: .5, reduced });
        const draw = renderer.turnedModel.bind(renderer), calls = [];
        renderer.turnedModel = (model, x, y, lift, yaw) => {
          if (model === character.model) calls.push({ x, y, lift, yaw });
          draw(model, x, y, lift, yaw);
        };
        renderer.draw(game, character.id, 0);
        ctx.drawImage(canvas, column * 480, row * 320);
        ctx.fillStyle = '#263c38'; ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${character.name} · ${game.power.name} · ${reduced ? 'Less motion' : 'Full motion'}`, column * 480 + 12, row * 320 + 24);
        frames.push({ character: character.id, reduced, calls, actual, midpoint: { x: (original.x + game.x) / 2, y: (original.y + game.y) / 2 },
          expectedLift: game.power.lift * (reduced ? .3 : 1), powerFlash: game.powerFlash,
          pixels: canvas.getContext('2d').getImageData(0, 0, 480, 320).data.some(value => value > 0) });
      }
    }
    return { frames, png: sheet.toDataURL().split(',')[1] };
  });
  const artifacts = new URL('../artifacts/', import.meta.url); await mkdir(artifacts, { recursive: true });
  await writeFile(new URL('character-powers-sheet.png', artifacts), Buffer.from(result.png, 'base64'));
  assert.deepEqual(errors, []); assert.equal(result.frames.length, 14);
  for (const frame of result.frames) {
    assert.equal(frame.calls.length, 1, `${frame.character} is drawn once`);
    const call = frame.calls[0];
    assert.ok(frame.pixels && frame.powerFlash > 0);
    assert.deepEqual({ x: call.x, y: call.y }, frame.actual, 'rendering shares the simulation position');
    assert.ok(Math.abs(call.x - frame.midpoint.x) < 1e-9 && Math.abs(call.y - frame.midpoint.y) < 1e-9, 'rescue does not teleport to its endpoint');
    assert.ok(Math.abs(call.lift - frame.expectedLift) < 1e-9, 'Less motion reduces decorative height without changing ground travel');
    if (frame.reduced) assert.equal(call.yaw, 0);
  }
  await page.close();
});
