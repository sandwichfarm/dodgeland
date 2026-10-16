import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';
import { artifactDirectoryForCoverage } from '../tools/release-coverage/browser.mjs';

const result = Object.freeze({ mode: 'survive-together', outcome: 'all-dead', podium: 'team', distance: 314, elapsedSeconds: 120,
  contributions: [
    ['p1', 'butter', 'dead'], ['p2', 'sunny', 'device-lost'], ['p3', 'pip', 'departed'], ['p4', 'petal', 'dead'],
  ].map(([seat, characterId, lifecycle], index) => Object.freeze({ seat, characterId, lifecycle, participantId: `result-owner-${index}`, furthestDistance: 90 + index, coins: 20 + index,
    deaths: index + 1, selfRevives: 1, teammateRevives: index, itemsFound: 4 + index, itemsUsed: index, ghostSeconds: 3 })) });

// Component proof only: compiled production component + real renderer/font in
// an opaque iframe. Main's terminal/lifecycle integration has separate tests.
test('immutable co-op results page every participant without ranking, overflow, or lost focus', { timeout: 120000 }, async () => {
  const modules = await compileSources(['survive-results-ui']);
  const css = await readFile(new URL('../src/survive-results-ui.css', import.meta.url), 'utf8');
  const material = (await readFile(new URL('../src/game-ui.css', import.meta.url), 'utf8')).split('#app .game-board')[0];
  const font = await readFile(new URL('../src/fonts/LilitaOne-Regular.ttf', import.meta.url));
  const errors = [], frames = [];
  const artifact = artifactDirectoryForCoverage(new URL('../artifacts/', import.meta.url),'survive-results-ui'); await mkdir(artifact, { recursive: true });
  let origin;
  const server = createServer((request, response) => {
    const path = new URL(request.url, origin).pathname;
    response.setHeader('Access-Control-Allow-Origin', '*');
    if (path === '/fonts/LilitaOne-Regular.ttf') { response.setHeader('Content-Type', 'font/ttf'); response.end(font); return; }
    if (modules.has(path)) { response.setHeader('Content-Type', 'text/javascript'); response.end(modules.get(path)); return; }
    const document = `<!doctype html><base href="${origin}/"><style>
      html,body,#app{margin:0;width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--fg)}
      #app{position:relative;--hand-space:0px} ${material} ${css}
      </style><div id="app"><button id="origin">Previous screen</button><button id="already-inert" inert>Unavailable</button><section id="results"></section></div>
      <script type="module">import {createSurviveResultsBoard} from '/survive-results-ui.js';
      const snapshot = ${JSON.stringify(result)}; snapshot.contributions.forEach(Object.freeze); Object.freeze(snapshot.contributions); Object.freeze(snapshot);
      window.resultsFixture = { snapshot, again:0, seed:'ph3-1234abcd-pond-a-n' };
      document.querySelector('#origin').focus();
      resultsFixture.board=createSurviveResultsBoard(document.querySelector('#results'),{onAgain:()=>resultsFixture.again++});
      resultsFixture.board.show(snapshot, resultsFixture.seed);</script>`;
    const harness = `<!doctype html><style>html,body{margin:0}iframe{display:block;border:0;width:100vw;height:100vh}</style><iframe sandbox="allow-scripts"></iframe><script>document.querySelector('iframe').srcdoc=${JSON.stringify(document).replaceAll('<', '\\u003c')};</script>`;
    response.setHeader('Content-Type', 'text/html'); response.end(harness);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 600 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(5000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    const iframe = page.locator('iframe'), frame = await (await iframe.elementHandle()).contentFrame();
    await frame.waitForFunction(() => window.resultsFixture?.board);
    await frame.evaluate(() => document.fonts.ready);
    const original = await frame.evaluate(() => JSON.stringify(resultsFixture.snapshot));
    for (const theme of ['dark', 'light']) {
      await frame.evaluate(theme => {
        const style = document.documentElement.style;
        style.setProperty('--bg', theme === 'dark' ? '#242b32' : '#faf8f0');
        style.setProperty('--fg', theme === 'dark' ? '#f0eee5' : '#1d3027');
        style.setProperty('--primary', theme === 'dark' ? '#9fc28a' : '#37634c');
      }, theme);
      for (const [width, height] of [[240,240],[320,560],[900,600],[1000,280],[2400,1200]]) {
        await page.setViewportSize({ width, height });
        await frame.waitForFunction(size => innerWidth === size.width && innerHeight === size.height, { width, height });
        await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        // Each traversal starts at the first page using the visible previous action.
        while (await frame.getByRole('button', { name: 'Previous results', exact: true }).isEnabled()) await frame.getByRole('button', { name: 'Previous results', exact: true }).click();
        const seen = {};
        for (;;) {
          const layout = await frame.evaluate(() => {
            const root = document.querySelector('#results');
            const visible = node => node.getClientRects().length && getComputedStyle(node).display !== 'none';
            const overflow = [document.documentElement, document.body, root, ...root.querySelectorAll('*')].filter(visible).filter(node => node.clientWidth && node.clientHeight && !['IMG','BUTTON','H3'].includes(node.tagName) && getComputedStyle(node).display !== 'inline').filter(node => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2).map(node => ({ tag: node.tagName, class: node.className, w: node.clientWidth, sw: node.scrollWidth, h: node.clientHeight, sh: node.scrollHeight }));
            const controls = [...root.querySelectorAll('button')].filter(visible).map(node => {
              const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
              return { text: node.textContent, valid: r.width >= 44 && r.height >= 44 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && (hit === node || node.contains(hit)) };
            });
            const players = [...root.querySelectorAll('.survive-result-player')].map(node => ({ id: node.dataset.participant, bottom: node.getBoundingClientRect().bottom, finish: node.querySelector('.survive-result-finish').textContent,
              stats: Object.fromEntries([...node.querySelectorAll('dl > div')].map(group => [group.querySelector('dt').textContent, Number(group.querySelector('dd').textContent)])) }));
            return { overflow, controls, players, focus: root.contains(document.activeElement) && !!document.activeElement.getClientRects().length, text: root.textContent };
          });
          assert.deepEqual(layout.overflow, [], `${theme}/${width}x${height}: overflow`);
          assert.deepEqual(layout.controls.filter(control => !control.valid), [], 'all visible actions fit and remain44px');
          assert.ok(layout.focus, 'focus stays on the retained result page');
          assert.ok(!/1st|2nd|3rd|4th|winner|rank/i.test(layout.text));
          assert.ok(layout.players.every(player => Math.abs(player.bottom - layout.players[0].bottom) < 1), 'one equal-height team perch');
          for (const player of layout.players) seen[player.id] = { finish: player.finish, stats: { ...seen[player.id]?.stats, ...player.stats } };
          if (!(await frame.getByRole('button', { name: 'Next results', exact: true }).isEnabled())) break;
          await frame.getByRole('button', { name: 'Next results', exact: true }).click();
        }
        for (const player of result.contributions) assert.deepEqual(seen[player.participantId], {
          finish: player.lifecycle === 'device-lost' ? 'Disconnected' : player.lifecycle === 'departed' ? 'Left run' : 'Down',
          stats: { Hops: player.furthestDistance, 'Coins found': player.coins, Rescues: player.teammateRevives, 'Items found': player.itemsFound },
        });
        await iframe.screenshot({ path: new URL(`survive-results-${theme}-${width}x${height}.png`, artifact).pathname });
        frames.push({ theme, width, height, participants: Object.keys(seen).length });
      }
      await page.setViewportSize({ width: 200, height: 160 });
      assert.equal(await frame.locator('.survive-results-tiny').innerText(), 'Needs 240×240 to play — enlarge this pane.');
      assert.equal(await frame.locator('.survive-results-sheet').isVisible(), false);
      await iframe.screenshot({ path: new URL(`survive-results-${theme}-200x160.png`, artifact).pathname });
      frames.push({ theme, width: 200, height: 160, notice: true });
    }
    const selected = await frame.locator('.survive-results-page').innerText();
    await frame.evaluate(() => resultsFixture.board.show(resultsFixture.snapshot, resultsFixture.seed));
    assert.equal(await frame.locator('.survive-results-page').innerText(), selected, 'repeated main renders do not reset result paging');
    await page.setViewportSize({ width: 320, height: 560 });
    await frame.waitForFunction(() => document.querySelector('#results').contains(document.activeElement) && document.activeElement.getClientRects().length);
    const retainedPage = await frame.locator('.survive-results-page').innerText();
    await frame.getByRole('button', { name: 'Seed', exact: true }).click();
    const seed = frame.getByRole('textbox', { name: 'Run seed', exact: true });
    assert.equal(await seed.inputValue(), 'ph3-1234abcd-pond-a-n');
    await frame.evaluate(() => {
      document.execCommand = () => false;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Denied')) } });
    });
    await frame.getByRole('button', { name: 'Copy seed', exact: true }).click();
    await frame.getByText('Selected. Use your device’s Copy.', { exact: true }).waitFor();
    assert.deepEqual(await seed.evaluate(node => [node.selectionStart, node.selectionEnd, document.activeElement === node]), [0, 'ph3-1234abcd-pond-a-n'.length, true], 'denied clipboard access leaves the complete seed selected inside the active modal');
    for (const [width, height] of [[240,240],[320,560],[900,600],[1000,280],[2400,1200]]) {
      await page.setViewportSize({ width, height });
      await frame.waitForFunction(size => innerWidth === size.width && innerHeight === size.height, { width, height });
      const layout = await frame.locator('#results').evaluate(root => {
        const controls = [...root.querySelectorAll('button,textarea')].filter(node => node.getClientRects().length);
        return controls.map(node => { const r = node.getBoundingClientRect(); return { label: node.textContent || node.getAttribute('aria-label'), valid: r.width >= 44 && r.height >= 44 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, overflow: node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1 }; });
      });
      assert.ok(layout.every(control => control.valid && !control.overflow), `seed page ${width}×${height}: ${JSON.stringify(layout)}`);
      assert.equal(await seed.inputValue(), 'ph3-1234abcd-pond-a-n');
      await iframe.screenshot({ path: new URL(`survive-results-seed-${width}x${height}.png`, artifact).pathname });
    }
    await page.setViewportSize({ width: 200, height: 160 });
    assert.equal(await seed.isVisible(), false);
    await page.setViewportSize({ width: 320, height: 560 });
    await frame.waitForFunction(() => document.querySelector('#results').contains(document.activeElement) && document.activeElement.getClientRects().length);
    assert.equal(await seed.isVisible(), true, 'returning from the size floor retains the seed page');
    assert.equal(await frame.getByText('Selected. Use your device’s Copy.', { exact: true }).isVisible(), true, 'resize retains the copy outcome');
    await frame.getByRole('button', { name: 'Back to results', exact: true }).click();
    assert.equal(await frame.locator('.survive-results-page').innerText(), retainedPage, 'the seed page preserves the viewed participant and metric');
    await frame.getByRole('button', { name: 'Hop again', exact: true }).focus();
    await page.keyboard.press('Tab');
    assert.equal(await frame.evaluate(() => document.querySelector('#results').contains(document.activeElement)), true);
    await frame.getByRole('button', { name: 'Hop again', exact: true }).click();
    assert.equal(await frame.evaluate(() => resultsFixture.again), 1);
    assert.equal(await frame.evaluate(() => JSON.stringify(resultsFixture.snapshot)), original, 'presentation never mutates the committed result');
    await frame.evaluate(() => resultsFixture.board.hide());
    assert.equal(await frame.evaluate(() => document.activeElement.id), 'origin');
    assert.equal(await frame.locator('#already-inert').evaluate(node => node.inert), true, 'preexisting modal state is preserved');
    await frame.evaluate(() => resultsFixture.board.dispose());
    assert.deepEqual(errors, []);
    await writeFile(new URL('survive-results-component.json', artifact), JSON.stringify({ scope: 'compiled production component; main integration verified separately', frames, errors }, null, 2));
  } catch (error) {
    await browser.contexts()[0]?.pages()[0]?.locator('iframe').screenshot({ path: new URL('survive-results-component-failure.png', artifact).pathname }).catch(() => {});
    throw error;
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
