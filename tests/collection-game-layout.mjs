import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const evidence = { frames: [], behavior: [], layoutFailures: [], errors: [], external: [] };
const fixture = await createMarketGameFixture(evidence);
const { page, frame, iframe, resize, advance, key } = fixture;
const themes = {
  dark: { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } },
  light: { colors: { background: '#faf5e7', text: '#263c38', primary: '#477953' } },
};
const compact = text => text.replace(/\s+/g, ' ').trim();
await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
async function section(name) {
  if (await frame.locator(`#${name}-tab`).isVisible()) await frame.locator(`#${name}-tab`).click();
  else { await frame.locator('#collection-sections').click(); await frame.locator(`button[data-collection-tab="${name}"]`).click(); }
  await advance(50);
}
async function inspect(label) {
  const result = await frame.evaluate(() => {
    const board = document.getElementById('drawer'), box = board.getBoundingClientRect();
    const failures = [];
    for (const node of board.querySelectorAll('button, input, select, h2, h3, p, label, img')) {
      if (node.closest('[hidden]') || !node.getClientRects().length) continue;
      const style = getComputedStyle(node); if (style.visibility === 'hidden' || style.display === 'none') continue;
      const rect = node.getBoundingClientRect(), name = node.id || node.textContent.slice(0, 30);
      if (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1) failures.push(`${name}: outside board`);
      if (node.matches('button, input, select') && (rect.width < 43 || rect.height < 43)) failures.push(`${name}: target ${rect.width}x${rect.height}`);
      if (node.matches('h2,h3,p,label,button') && (node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2)) failures.push(`${name}: text clipped`);
    }
    for (const node of [document.documentElement, document.body, board, document.getElementById('collection-body')]) {
      if (node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2) failures.push(`${node.id || node.tagName}: overflow`);
    }
    const description = board.querySelector('.collection-showcase:not([hidden]) .collection-description');
    const select = board.querySelector('.collection-showcase:not([hidden]) > button');
    if (description?.getClientRects().length && select && description.getBoundingClientRect().bottom > select.getBoundingClientRect().top - 2) failures.push('description overlaps selection');
    return { failures, centered: Math.abs(box.left + box.width / 2 - innerWidth / 2) < 1 && Math.abs(box.top + box.height / 2 - innerHeight / 2) < 1, font: getComputedStyle(board).fontFamily, width: innerWidth, height: innerHeight };
  });
  if (result.failures.length) evidence.layoutFailures.push({ label, failures: result.failures });
  assert.equal(result.centered, true, `${label}: centered`);
  assert.match(result.font, /Lilita One/);
  return result;
}
async function readerText() {
  const chunks = [];
  for (let tries = 0; tries < 80; tries++) {
    chunks.push(await frame.locator('#collection-reader-copy').textContent());
    const label = await frame.locator('#collection-info').textContent();
    const [, current, total] = label.match(/(\d+)\/(\d+)/) ?? [];
    if (current === total) break;
    await frame.locator('#collection-next').click(); await advance(20);
  }
  return compact(chunks.join(' '));
}
try {
  await frame.locator('#choose').click(); await advance(250);
  for (const [theme, value] of Object.entries(themes)) {
    await frame.evaluate(value => window.marketGameFixture.setTheme(value), value); await advance(50);
    for (const [width, height] of [[240, 240], [320, 560], [390, 844], [844, 390], [900, 600], [1440, 900], [2400, 1200]]) {
      await resize(width, height); await section('travelers');
      const states = []; states.push(await inspect(`${theme} ${width}x${height} traveler`));
      if (width === 900 && height === 600) {
        for (let traveler = 0; traveler < 7; traveler++) { await inspect(`${theme} all traveler ${traveler}`); await frame.locator('#collection-next').click(); }
      }
      await iframe.screenshot({ path: new URL(`../artifacts/collection-${theme}-${width}x${height}.png`, import.meta.url).pathname });
      await frame.locator('#collection-info').click(); await advance(50);
      states.push(await inspect(`${theme} ${width}x${height} power`));
      assert.match(await readerText(), /Bounce out of a fatal splash or river drift onto a nearby bank/);
      await frame.locator('#collection-info').click(); await section('worlds');
      states.push(await inspect(`${theme} ${width}x${height} world`));
      await section('sounds');
      // Each ordinary settings page plus the complete paged status and credits.
      for (let index = 0; index < 7; index++) {
        states.push(await inspect(`${theme} ${width}x${height} sound ${index}`));
        if (index < 6) await frame.locator('#collection-next').click();
      }
      await frame.locator('#collection-next').click(); await advance(50);
      states.push(await inspect(`${theme} ${width}x${height} sound status`));
      assert.match(await readerText(), /Shared packs are unavailable/);
      await frame.locator('#collection-next').click(); await advance(50);
      states.push(await inspect(`${theme} ${width}x${height} credits`));
      assert.match(await readerText(), /CC BY 3\.0 or later/);
      await section('camp'); states.push(await inspect(`${theme} ${width}x${height} camp`));
      await frame.locator('#collection-next').click(); states.push(await inspect(`${theme} ${width}x${height} save status`));
      assert.match(await readerText(), /Progress saved by your shell/);
      evidence.frames.push({ theme, width, height, states: states.length });
    }
    await resize(200, 160);
    assert.equal(await frame.locator('.too-small').isVisible(), true);
    assert.equal(await frame.locator('#drawer').isVisible(), false);
  }
  await resize(240, 240); await section('travelers');
  const names = ['Butter', 'Sunny', 'Pip', 'Petal', 'Beep', 'Rust', 'Pebble'];
  for (const name of names) {
    assert.equal(await frame.locator('#collection-traveler-name').textContent(), name);
    await frame.locator('#collection-info').click(); const text = await readerText();
    assert.match(text, /Recharge after 100 new blocks/); assert.match(text, /Call:/);
    await frame.locator('#collection-info').click(); await frame.locator('#collection-next').click();
  }
  await frame.locator('#collection-next').click(); await frame.locator('#collection-traveler-select').click(); await advance(80);
  assert.match(await frame.locator('#collection-traveler-select').textContent(), /Traveling together/);
  assert.equal(await frame.evaluate(() => JSON.parse(window.marketGameFixture.writes.at(-1).value).selected), 'sunny');
  evidence.behavior.push('All 7 traveler powers and unlock stories reachable at minimum size; choosing Sunny persists through SDK storage');
  await section('worlds');
  const worlds = new Set(); for (let at = 0; at < 8; at++) { worlds.add(await frame.locator('#collection-world-name').textContent()); await frame.locator('#collection-next').click(); }
  assert.equal(worlds.size, 8);
  await frame.locator('#collection-next').click(); await frame.locator('#collection-world-select').click(); await advance(80);
  assert.equal(await frame.evaluate(() => JSON.parse(window.marketGameFixture.writes.at(-1).value).world), 'shuffle');
  evidence.behavior.push('Home, shuffle and all 6 worlds browse and persist');
  await section('sounds');
  // Previous frame ended on credits; return to the first sound page through next.
  while (await frame.locator('#drawer').getAttribute('data-collection-sound') !== 'pack') { await frame.locator('#collection-next').click(); await advance(20); }
  assert.equal(await frame.locator('#sound-pack').isEnabled(), true);
  await frame.locator('#sound-pack').selectOption('arcade'); await advance(50);
  await frame.locator('#collection-next').click(); await frame.locator('#sound-muted').uncheck(); await advance(50);
  await frame.locator('#collection-next').click(); await frame.locator('#music-volume').focus();
  const before = Number(await frame.locator('#music-volume').inputValue()); await frame.locator('#music-volume').press('ArrowRight'); await advance(50);
  assert.equal(Number(await frame.locator('#music-volume').inputValue()), before + 1);
  await key('right'); assert.equal(Number(await frame.locator('#music-volume').inputValue()), before + 6);
  for (let at = 0; at < 4; at++) await frame.locator('#collection-next').click();
  assert.equal(await frame.locator('#sound-load').isDisabled(), true); assert.equal(await frame.locator('#sound-address').isDisabled(), true);
  evidence.behavior.push('Built-in sound settings remain enabled without shared pack domains; native and SDK slider navigation both work');
  await section('camp'); await frame.locator('#reduced-motion').check(); await advance(50);
  assert.equal(await frame.evaluate(() => JSON.parse(window.marketGameFixture.writes.at(-1).value).reduced), true);
  await frame.locator('#close-drawer').focus();
  for (let at = 0; at < 12; at++) { await page.keyboard.press('Tab'); assert.equal(await frame.evaluate(() => document.getElementById('drawer').contains(document.activeElement)), true); }
  await frame.locator('#close-drawer').click(); await resize(900, 600); await frame.locator('#play').click(); await frame.locator('#pause').click(); await frame.locator('#choose').click();
  await frame.locator('#close-drawer').click();
  assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'paused');
  assert.equal(await frame.locator('#play').evaluate(node => node === document.activeElement), true);
  evidence.behavior.push('Less motion persists, keyboard focus remains inside collection, pause restores focus on close');
  assert.deepEqual(evidence.layoutFailures, []); assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  console.log(JSON.stringify({ frames: evidence.frames.length, behavior: evidence.behavior.length, errors: evidence.errors }));
} finally {
  await writeFile(new URL('../artifacts/collection-game-layout.json', import.meta.url), JSON.stringify(evidence, null, 2)); await fixture.close();
}
