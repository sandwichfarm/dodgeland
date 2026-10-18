import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { relative, resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadSources } from './source-loader.mjs';
import { registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sources = await loadSources(['game', 'mode-rules', 'solo-ui']);
after(() => sources.dispose());
const styles = await readFile(resolve(root, 'src/styles.css'), 'utf8');
const harness = `<!doctype html><link rel="stylesheet" href="/styles.css"><div id="app"><div id="pluck" role="meter"><span id="pluck-feathers"></span><span id="pluck-value"></span></div><div id="chase-meter" role="progressbar"><span id="chase-fill"></span></div></div><script type="module">
  import { Game } from '/game.js';
  import { composeModeDefinition } from '/mode-rules.js';
  import { installHealthMeter, updateChaseMeter, updateHealthMeter } from '/solo-ui.js';
  window.installMeter = (health, pursuit = {}) => {
    const definition = composeModeDefinition({ health, pursuit });
    const game = new Game(11, 'pond', 'arcade', false, [], 'butter', { definition });
    const meter = document.getElementById('pluck');
    const clips = installHealthMeter(meter, document.getElementById('pluck-feathers'), game.rules.health);
    updateHealthMeter(meter, document.getElementById('pluck-value'), clips, game.health, game.maxHealth, String);
    const chase = document.getElementById('chase-meter'), fill = document.getElementById('chase-fill');
    updateChaseMeter(chase, fill, 4, game.rules.pursuit.warningSeconds);
    const bounds = meter.getBoundingClientRect();
    return {
      max: meter.getAttribute('aria-valuemax'), clips: clips.map(clip => Number(clip.getAttribute('width'))),
      columns: getComputedStyle(document.getElementById('pluck-feathers')).gridTemplateColumns,
      featherSize: getComputedStyle(meter).getPropertyValue('--pluck-feather-size').trim(),
      fits: bounds.x >= 0 && bounds.right <= innerWidth && meter.scrollWidth <= meter.clientWidth && meter.scrollHeight <= meter.clientHeight,
      chaseMax: chase.getAttribute('aria-valuemax'), chaseFill: fill.style.width,
    };
  };
</script>`;

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  if (pathname === '/') { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); return; }
  if (pathname === '/styles.css') { response.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' }); response.end(styles); return; }
  const file = resolve(sources.directory, `.${pathname}`);
  if (relative(sources.directory, file).startsWith('..')) { response.writeHead(404); response.end(); return; }
  try { response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }); response.end(await readFile(file)); }
  catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
after(() => new Promise(resolve => server.close(resolve)));

test('real composed games install usable health and chase meters in a muted browser DOM', async () => {
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  let page;
  const identity={suite:process.argv[1],scenario:'composed-meters',frame:'component-dom',generation:0,scope:'current'};
  try {
    page = await browser.newPage({ viewport: { width: 240, height: 240 } });
    registerRealm(page,identity);
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => typeof window.installMeter === 'function');
    const install = (health, pursuit) => page.evaluate(([nextHealth, nextPursuit]) => window.installMeter(nextHealth, nextPursuit), [health, pursuit]);

    assert.deepEqual(await install({ maxHealth: 4 }, { warningSeconds: 8 }), {
      max: '4', clips: [22, 22, 22, 22], columns: '16px 16px 16px 16px', featherSize: '16px', fits: true, chaseMax: '8', chaseFill: '50%',
    });
    assert.deepEqual(await install({ maxHealth: 2.5, frontDamage: 2.5 }, { warningSeconds: 0 }), {
      max: '2.5', clips: [22, 22, 11], columns: '16px 16px 16px', featherSize: '16px', fits: true, chaseMax: '0', chaseFill: '0%',
    });
    assert.deepEqual(await install({ maxHealth: 10 }, { warningSeconds: 5 }), {
      max: '10', clips: [22, 22, 22, 22, 22, 22, 22, 22, 22, 22], columns: '12px 12px 12px 12px 12px', featherSize: '12px', fits: true, chaseMax: '5', chaseFill: '80%',
    });
    assert.deepEqual(await install({}, { warningSeconds: 5 }), {
      max: '3', clips: [22, 22, 22], columns: '16px 16px 16px', featherSize: '16px', fits: true, chaseMax: '5', chaseFill: '80%',
    });
  } finally { try{if(page)await collectRealm(page,identity);}finally{await browser.close();} }
});
