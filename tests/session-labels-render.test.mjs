import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test, { after } from 'node:test';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';

// Browser render-unit evidence: real production Renderer, SessionPlayer views,
// and native text metrics. Built-main integration is covered by the layout suite.
const modules = await compileSources(['render', 'session', 'game']);
const server = createServer((request, response) => {
  const source = modules.get(request.url);
  response.setHeader('Content-Type', source ? 'text/javascript' : 'text/html');
  response.end(source ?? '<!doctype html><style>body{margin:0}canvas{display:block}</style><canvas></canvas>');
});
after(() => new Promise(resolve => server.close(resolve)));

test('session labels remain complete, separate and seat-stable when travelers meet', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const cases = await page.evaluate(async () => {
      const [{ Renderer }, { Game }, { LocalSession, SessionPlayer }] = await Promise.all([
        import('/render.js'), import('/game.js'), import('/session.js'),
      ]);
      const canvas = document.querySelector('canvas');
      const observations = [];
      for (const [width, height] of [[240, 240], [320, 560], [900, 600], [1000, 280], [2400, 1200]]) {
        canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
        for (const count of [2, 4]) for (const arrangement of ['initial', 'same-tile']) {
          const game = new Game(89, 'pond', 'stroll', false, undefined, 'butter');
          Object.assign(game.rows.get(0), { kind: 'meadow', blocked: [], decorations: [], coin: null });
          const characters = ['butter', 'sunny', 'pip', 'petal'];
          const players = [game.player];
          for (let index = 1; index < count; index++) players.push(new SessionPlayer(game.world, `p${index + 1}`, `gamepad-${index - 1}`, characters[index]));
          const session = new LocalSession(game.world, players);
          session.start();
          if (arrangement === 'same-tile') for (const player of players) Object.assign(player, { x: 0, fromX: 0, y: 0, fromY: 0, hop: 0 });
          const renderer = new Renderer(canvas); renderer.resize(); renderer.reduced = true;
          const context = renderer.ctx, nativeFill = CanvasRenderingContext2D.prototype.fillText.bind(context);
          let labels = [];
          context.fillText = (text, x, y, ...rest) => {
            if (/^[▲●◆■] P[1-4] · /.test(text)) {
              const metric = context.measureText(text), padding = context.lineWidth / 2;
              labels.push({ text, left: x - metric.actualBoundingBoxLeft - padding,
                right: x + metric.actualBoundingBoxRight + padding,
                top: y - metric.actualBoundingBoxAscent - padding,
                bottom: y + metric.actualBoundingBoxDescent + padding });
            }
            nativeFill(text, x, y, ...rest);
          };
          renderer.drawSession(game.world, players.map(player => player.render()), 0);
          const first = labels; labels = [];
          renderer.drawSession(game.world, [...players].reverse().map(player => player.render()), 0);
          observations.push({ width, height, count, arrangement, labels: first, reversed: labels });
        }
      }
      return observations;
    });
    const artifacts = new URL('../artifacts/', import.meta.url);
    await mkdir(artifacts, { recursive: true });
    await writeFile(new URL('session-labels-render.json', artifacts), JSON.stringify({ errors, cases }, null, 2));
    assert.deepEqual(errors, []);
    assert.equal(cases.length, 20);
    for (const scene of cases) {
      const name = `${scene.width}×${scene.height}/${scene.count}/${scene.arrangement}`;
      assert.equal(scene.labels.length, scene.count, `${name}: every traveler has a label`);
      assert.deepEqual(scene.reversed, scene.labels, `${name}: roster order never changes label placement`);
      const expectedLabels = ['▲ P1 · Butter', '● P2 · Sunny', '◆ P3 · Pip', '■ P4 · Petal'];
      for (const [index, label] of scene.labels.entries()) {
        assert.equal(label.text, expectedLabels[index], `${name}: shape, seat and assigned character match exactly`);
        assert.ok(label.left >= 0 && label.right <= scene.width && label.top >= 0 && label.bottom <= scene.height, `${name}: visible traveler label stays in frame: ${JSON.stringify(label)}`);
        for (const previous of scene.labels.slice(0, index)) {
          const overlaps = label.left < previous.right && label.right > previous.left && label.top < previous.bottom && label.bottom > previous.top;
          assert.equal(overlaps, false, `${name}: ${previous.text} overlaps ${label.text}`);
        }
      }
    }
  } finally { await browser.close(); }
});
