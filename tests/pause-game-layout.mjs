import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const evidence = { artifact: 'Production build in an opaque allow-scripts iframe', frames: [], scenarios: [], errors: [], external: [] };
const app = await createMarketGameFixture(evidence);
const { page, frame, iframe, advance, resize, key, onGame } = app;
let caseName = 'setup';

async function layout(label) {
  await frame.evaluate(() => document.getAnimations().forEach(animation => { if (Number.isFinite(animation.effect?.getComputedTiming().iterations)) animation.finish(); }));
  const metrics = await frame.evaluate(() => {
    const visible = node => !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const panel = document.getElementById('run-panel'), box = panel.getBoundingClientRect();
    const nodes = [panel, ...panel.querySelectorAll('*')].filter(visible);
    const buttons = nodes.filter(node => node.tagName === 'BUTTON').map(node => {
      const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { id: node.id || node.dataset.pauseTopic, width: r.width, height: r.height,
        fits: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        hit: hit === node || node.contains(hit) };
    });
    const overflow = nodes.filter(node => node.clientWidth && node.clientHeight && !node.matches('svg,svg *')).flatMap(node => {
      const style = getComputedStyle(node);
      return node.scrollHeight > node.clientHeight + 2 || node.scrollWidth > node.clientWidth + 2 || ['auto','scroll'].includes(style.overflowY) || ['auto','scroll'].includes(style.overflowX)
        ? [{ id: node.id || node.className, width: node.clientWidth, height: node.clientHeight, scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight, overflow: style.overflow }] : [];
    });
    return { box: { x: box.x, y: box.y, width: box.width, height: box.height }, width: innerWidth, height: innerHeight, buttons, overflow,
      font: getComputedStyle(panel).fontFamily, loaded: document.fonts.check('24px "Lilita One"'),
      tint: getComputedStyle(document.querySelector('.game-surface'), '::after').backgroundColor,
      focused: document.activeElement?.id, active: document.getElementById('app').dataset.pauseOpen,
      headingSize: parseFloat(getComputedStyle(document.getElementById('pause-heading')).fontSize) };
  });
  evidence.lastMetrics = { label, ...metrics };
  assert.equal(metrics.active, 'true', label);
  assert.ok(Math.abs(metrics.box.x + metrics.box.width / 2 - metrics.width / 2) < 1, `${label}: centered horizontally`);
  assert.ok(Math.abs(metrics.box.y + metrics.box.height / 2 - metrics.height / 2) < 1, `${label}: centered vertically`);
  assert.ok(metrics.box.x >= 0 && metrics.box.y >= 0 && metrics.box.x + metrics.box.width <= metrics.width && metrics.box.y + metrics.box.height <= metrics.height, `${label}: board fits`);
  assert.match(metrics.font, /Lilita One/); assert.equal(metrics.loaded, true);
  assert.notEqual(metrics.tint, 'rgba(0, 0, 0, 0)', `${label}: game is visibly tinted`);
  assert.ok(metrics.buttons.every(button => button.width >= 43.9 && button.height >= 43.9 && button.fits && button.hit), `${label}: large visible buttons ${JSON.stringify(metrics.buttons)}`);
  assert.deepEqual(metrics.overflow, [], `${label}: no scrolling or clipped text ${JSON.stringify(metrics.overflow)}`);
  return metrics;
}

async function readTopic(topic) {
  await frame.locator(`[data-pause-topic="${topic}"]`).click(); await advance(40);
  const chunks = [];
  for (let pageIndex = 0; pageIndex < 30; pageIndex++) {
    await layout(`${caseName}-${topic}-${pageIndex}`);
    chunks.push(await frame.locator('#pause-reader-copy').innerText());
    if (await frame.locator('#pause-next').isDisabled()) break;
    await frame.locator('#pause-next').click(); await advance(20);
    assert.ok(pageIndex < 29, 'information has a finite final page');
  }
  await frame.locator('#pause-back').click(); await advance(20);
  assert.equal(await frame.locator('#play').isVisible(), true);
  return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

try {
  await frame.locator('#play').click(); await key('pause'); await advance(300);
  const frozenTime = await onGame(function () { return this.time; });
  const themes = { dark: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' }, light: { background: '#f4f2df', text: '#263c38', primary: '#477953' } };
  for (const [theme, colors] of Object.entries(themes)) {
    await frame.evaluate(colors => window.marketGameFixture.setTheme({ colors }), colors);
    for (const [width, height] of [[200,160], [240,240], [320,360], [320,560], [390,500], [390,844], [759,559], [760,560], [844,390], [900,600], [1440,1000], [2400,1200]]) {
      caseName = `${theme}-${width}x${height}`;
      await resize(width, height); await advance(300); await frame.evaluate(() => document.fonts.ready);
      if (width < 240 || height < 240) {
        assert.equal(await frame.locator('.too-small').isVisible(), true);
        assert.equal(await frame.locator('#run-panel').isVisible(), false);
        evidence.frames.push({ theme, width, height, minimumNotice: true }); continue;
      }
      const metrics = await layout(caseName);
      if (width >= 760 && height >= 560) assert.ok(metrics.headingSize >= 40);
      if (await frame.locator('[data-pause-topic="power"]').isVisible()) {
        const expected = await frame.locator('#pause-power').evaluate(node => [node.querySelector('strong')?.textContent, node.querySelector('span')?.textContent].filter(Boolean).join('. '));
        assert.equal(await readTopic('power'), expected, `${caseName}: every word of power information is reachable`);
        const rules = await readTopic('rules');
        assert.match(rules, /Rear bumps cost 1 feather/); assert.match(rules, /Side hits cost 2 feathers/); assert.match(rules, /100 hops/); assert.match(rules, /unless your character power saves you/);
      } else {
        assert.equal(await frame.locator('#pause-power').isVisible(), true);
        assert.equal(await frame.locator('#pause-power span').isVisible(), true);
      }
      await iframe.screenshot({ path: new URL(`pause-${caseName}.png`, output).pathname });
      evidence.frames.push({ theme, width, height, targetCount: metrics.buttons.length, headingSize: metrics.headingSize });
    }
  }
  assert.equal(await onGame(function () { return this.time; }), frozenTime, 'all pause screens and resizes keep the game clock frozen');
  assert.equal(await frame.evaluate(() => [...document.head.childNodes].some(node => node.nodeType === Node.COMMENT_NODE && node.textContent.includes('SIL OPEN FONT LICENSE Version 1.1') && node.textContent.includes('PERMISSION & CONDITIONS'))), true, 'the artifact retains the bundled font license');
  await resize(240,240);
  for (const character of ['butter','sunny','pip','petal','beep','rust','pebble']) {
    await onGame(function (id) { this.setCharacter(id); }, character); await advance(40);
    const expected = await frame.locator('#pause-power').evaluate(node => [node.querySelector('strong')?.textContent, node.querySelector('span')?.textContent].filter(Boolean).join('. '));
    assert.equal(await readTopic('power'), expected, `${character}: entire power description at the smallest supported frame`);
    await resize(900,600); await layout(`${character}: complete power at the smallest overview`); await resize(240,240);
  }
  await onGame(function () { this.setCharacter('butter'); }); await advance(30);
  await resize(240,240); await advance(50);
  await frame.locator('[data-pause-topic="power"]').click(); await advance(30);
  const first = await frame.locator('#pause-reader-copy').innerText();
  await resize(320,560); await layout('power after resize');
  assert.equal(await frame.locator('#pause-reader').isVisible(), true);
  await key('back-menu'); assert.equal(await frame.locator('#pause-home').isVisible(), true);
  assert.ok(first.length);
  // Tab and SDK Enter operate the focused pause control, including info pages.
  await frame.locator('[data-pause-topic="rules"]').focus(); await key('play');
  assert.equal(await frame.locator('#pause-reader').isVisible(), true);
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab');
    assert.equal(await frame.evaluate(() => document.getElementById('run-panel').contains(document.activeElement) && !!document.activeElement.getClientRects().length), true);
  }
  await key('back-menu'); await frame.locator('#play').click(); await advance(30);
  assert.equal(await frame.locator('#run-panel').isVisible(), false);
  assert.equal(await onGame(function () { return this.state; }), 'playing');
  assert.equal(await frame.locator('#app').getAttribute('data-pause-open'), 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await key('pause'); await advance(10);
  assert.equal(await frame.locator('#run-panel').evaluate(node => getComputedStyle(node).animationName), 'none');
  await frame.locator('#choose').click(); await advance(50);
  assert.equal(await frame.locator('#drawer').isVisible(), true);
  assert.equal(await frame.locator('#app').getAttribute('data-pause-open'), 'false', 'collection is not covered by the pause backdrop');
  await frame.locator('#close-drawer').click(); await advance(50); await layout('pause restored after collection');
  assert.equal(await frame.locator('#play').evaluate(node => node === document.activeElement), true);
  evidence.scenarios.push('Centered tinted pause board at 24 frame/theme combinations; local font; all targets >=44px; no scrolling; complete rules and power pages; resize persistence; Tab/SDK Enter/Back and resume; frozen clocks.');
  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  await writeFile(new URL('pause-game-layout.json', output), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  evidence.failure = { caseName, message: String(error) };
  await iframe.screenshot({ path: new URL('pause-game-failure.png', output).pathname }).catch(() => {});
  await writeFile(new URL('pause-game-layout.json', output), JSON.stringify(evidence, null, 2));
  throw error;
} finally { await app.close(); }
