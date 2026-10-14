// Exercise the production HUD in an opaque iframe, without app test hooks.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const evidence = { artifact: 'dist/index.html', frames: [], scenarios: [], errors: [], external: [] };
const app = await createMarketGameFixture(evidence);
const { frame, iframe, page, resize, advance, onGame, key } = app;
let caseName = 'initial';

async function hudLayout() {
  return frame.evaluate(() => {
    const visible = node => {
      const css = getComputedStyle(node), box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && css.visibility !== 'hidden' && css.display !== 'none' && !node.closest('[hidden]');
    };
    const nodes = [...document.querySelectorAll('.hud button, .bottom-bar button, #market-open')].filter(visible);
    const buttons = nodes.map(node => {
      const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { id: node.id || node.getAttribute('aria-label'), x: box.x, y: box.y, right: box.right, bottom: box.bottom,
        width: box.width, height: box.height, hit: node === hit || node.contains(hit),
        fits: box.x >= -.5 && box.y >= -.5 && box.right <= innerWidth + .5 && box.bottom <= innerHeight + .5,
        font: getComputedStyle(node).fontFamily };
    });
    const overlaps = [];
    for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i], b = buttons[j];
      if (Math.min(a.right, b.right) - Math.max(a.x, b.x) > .5 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > .5) overlaps.push([a.id, b.id]);
    }
    return { buttons, overlaps, rootOverflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
      backgrounds: ['html', 'body', '#app'].map(selector => getComputedStyle(document.querySelector(selector)).backgroundColor) };
  });
}

try {
  await frame.locator('#play').click();
  await onGame(function () {
    for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  });
  const themes = { dark: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' }, light: { background: '#f4f2df', text: '#263c38', primary: '#477953' } };
  for (const [theme, colors] of Object.entries(themes)) {
    await frame.evaluate(colors => window.marketGameFixture.setTheme({ colors }), colors);
    for (const [width, height] of [[240,240], [320,560], [390,844], [844,390], [900,600], [2400,1200]]) {
      caseName = `${theme}-${width}x${height}`;
      await resize(width, height); await advance(100); await frame.evaluate(() => document.fonts.ready);
      assert.equal(await onGame(function () { return this.state; }), 'playing');
      const metrics = await hudLayout();
      assert.equal(metrics.rootOverflow, false, `${caseName}: no document scrolling`);
      assert.deepEqual(metrics.overlaps, [], `${caseName}: actionable controls do not overlap`);
      assert.ok(metrics.buttons.length >= 8, `${caseName}: sound, pause, collection, call and four directions remain reachable`);
      for (const button of metrics.buttons) {
        assert.ok(button.fits && button.hit, `${caseName}: ${JSON.stringify(button)}`);
        assert.ok(button.width >= 43.5 && button.height >= 43.5, `${caseName}: 44px target ${JSON.stringify(button)}`);
        assert.match(button.font, /Lilita One/, `${caseName}: game lettering ${button.id}`);
      }
      assert.ok(metrics.backgrounds.every(color => color === metrics.backgrounds[0]), `${caseName}: theme paints complete surface`);
      await iframe.screenshot({ path: new URL(`hud-${caseName}.png`, output).pathname });
      evidence.frames.push({ theme, width, height, ...metrics });
    }
  }
  evidence.scenarios.push('Playing HUD: 12 frame/theme combinations, controls at least 44px, hit-tested, no actionable overlap or document scrolling, bundled game lettering.');

  await resize(320,560);
  const muteBefore = await frame.locator('#sound-toggle').getAttribute('aria-pressed');
  const writesBefore = await frame.evaluate(() => window.marketGameFixture.writes.length);
  await frame.locator('#sound-toggle').click(); await advance(20);
  assert.notEqual(await frame.locator('#sound-toggle').getAttribute('aria-pressed'), muteBefore);
  await frame.locator('#sound-toggle').click(); await advance(20);
  assert.equal(await frame.locator('#sound-toggle').getAttribute('aria-pressed'), muteBefore);
  await frame.waitForFunction(before => window.marketGameFixture.writes.length > before, writesBefore);
  await frame.locator('#pause').click(); await advance(300);
  assert.equal(await onGame(function () { return this.state; }), 'paused');
  const frozenTime = await onGame(function () { return this.time; });
  await advance(1000);
  assert.equal(await onGame(function () { return this.time; }), frozenTime);
  await frame.locator('#choose').click(); await advance(100);
  assert.equal(await frame.locator('#drawer').isVisible(), true);
  if (await frame.locator('#sounds-tab').isVisible()) await frame.locator('#sounds-tab').click();
  else {
    await frame.locator('#collection-sections').click();
    await frame.locator('button[data-collection-tab="sounds"]').click();
  }
  await advance(100);
  assert.equal(await frame.locator('#sound-pack').isEnabled(), true, 'built-in sounds remain available without optional domains');
  for (let index = 0; index < 10 && !await frame.locator('#sound-address').isVisible(); index++) {
    await frame.locator('#collection-next').click(); await advance(20);
  }
  assert.equal(await frame.locator('#sound-address').isVisible(), true, 'shared sound page remains reachable');
  assert.equal(await frame.locator('#sound-address').isDisabled(), true, 'shared pack input disabled without OUTBOX/RESOURCE');
  assert.equal(await frame.locator('#sound-load').isDisabled(), true, 'shared pack loading disabled without OUTBOX/RESOURCE');
  await frame.locator('#close-drawer').click(); await advance(300);
  assert.equal(await onGame(function () { return this.state; }), 'paused');
  assert.equal(await frame.locator('#play').evaluate(node => node === document.activeElement), true, 'closing collection restores pause action focus');
  await key('play');
  assert.equal(await onGame(function () { return this.state; }), 'playing');
  await frame.locator('#collection').click(); await advance(100);
  await frame.locator('#close-drawer').click(); await advance(100);
  assert.equal(await onGame(function () { return this.state; }), 'playing', 'collection opened during play resumes that run');
  evidence.scenarios.push('Mute persists through user-triggered SDK storage; real pause freezes time; collection restores pause focus or resumes play; absent OUTBOX/RESOURCE only disable shared sound packs.');

  await resize(200,160);
  assert.equal(await frame.locator('.too-small').isVisible(), true);
  assert.equal(await onGame(function () { return this.state; }), 'paused');
  await resize(320,560); await advance(300);
  assert.equal(await frame.locator('#pause-content').isVisible(), true, 'returning from undersized frame preserves paused run');
  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  await writeFile(new URL('hud-game-layout.json', output), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ frames: evidence.frames.length, scenarios: evidence.scenarios, errors: evidence.errors }, null, 2));
} catch (error) {
  evidence.failure = { caseName, message: String(error) };
  await iframe.screenshot({ path: new URL('hud-game-failure.png', output).pathname }).catch(() => {});
  await writeFile(new URL('hud-game-layout.json', output), JSON.stringify(evidence, null, 2));
  throw error;
} finally { await app.close(); }
