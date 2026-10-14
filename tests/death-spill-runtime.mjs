// Main-loop integration on the built app, inside the real opaque iframe boundary.
// CDP stages the loss; timing, inputs, focus, preference and rendering use the UI.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const artifacts = new URL('../artifacts/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const evidence = { artifact: 'Production build in opaque allow-scripts iframe', scenarios: [], errors: [], external: [] };

async function setup(theme = 'dark', width = 900, height = 600, reduced = false, wallet = 18) {
  const app = await createMarketGameFixture(evidence);
  await app.resize(width, height);
  await app.frame.evaluate(theme => window.marketGameFixture.setTheme({ colors: theme === 'dark'
    ? { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' }
    : { background: '#f4f2df', text: '#263c38', primary: '#477763' } }), theme);
  if (reduced) {
    await app.frame.locator('#choose').click();
    await app.frame.locator('#camp-tab').click();
    await app.frame.locator('#reduced-motion').check();
    await app.frame.locator('#close-drawer').click(); await app.advance(32);
    assert.ok(await app.frame.evaluate(() => window.marketGameFixture.writes.some(write => JSON.parse(write.value).reduced)), 'user-triggered SDK persistence records Less motion');
  }
  await app.frame.locator('#play').click();
  await app.onGame(function (wallet) {
    if (typeof this.advanceDeathVisuals !== 'function') throw new Error('Build death-spill integration before running this fixture');
    for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
    this.run.wallet = wallet;
    this.run.cosmetics = wallet ? ['look-hat-beanie', 'look-shirt-sailor', 'look-hat-boater'] : [];
    this.run.equipped = wallet ? { head: 'look-hat-beanie', shirt: 'look-shirt-sailor' } : {};
    this.end('Spill integration fixture', 'traffic', 'front');
  }, wallet);
  await app.advance(32);
  return app;
}

for (const [theme, width, height] of [['dark', 900, 600], ['light', 320, 560]]) {
  const app = await setup(theme, width, height);
  const { frame, page, iframe, onGame, advance, resize } = app;
  try {
    assert.equal(await frame.locator('#coins').textContent(), '0');
    assert.equal(await frame.locator('#run-panel').isHidden(), true, 'the world stays visible while possessions fall');
    const snapshot = await onGame(function () { return { time: this.time, score: this.maxY, drops: this.deathSpill.drops.length, wallet: this.deathSpill.wallet, cosmetics: this.deathSpill.cosmetics.length }; });
    assert.equal(snapshot.wallet, 18); assert.equal(snapshot.cosmetics, 3); assert.equal(snapshot.drops, 21);
    await frame.evaluate(() => window.marketGameFixture.handlers['puddlehop.play']());
    await advance(200);
    assert.equal(await onGame(function () { return this.state; }), 'dead');
    assert.equal(await frame.locator('#run-panel').isHidden(), true, 'early Enter cannot reset the run');
    await iframe.screenshot({ path: new URL(`death-spill-runtime-${theme}-falling.png`, artifacts).pathname });

    // Blur and document visibility use the real app lifecycle handlers, with
    // only the browser-owned visibility getter controlled by this fixture.
    await frame.evaluate(() => window.dispatchEvent(new Event('blur')));
    const blurred = await onGame(function () { return this.deathSpill.age; });
    await advance(1600);
    assert.equal(await onGame(function () { return this.deathSpill.age; }), blurred);
    assert.equal(await frame.locator('#run-panel').isHidden(), true);
    await frame.evaluate(() => window.dispatchEvent(new Event('focus'))); await advance(64);
    await frame.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hidden = await onGame(function () { return this.deathSpill.age; });
    await advance(1600); assert.equal(await onGame(function () { return this.deathSpill.age; }), hidden);
    await frame.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await advance(32);
    await resize(200, 160);
    const tiny = await onGame(function () { return this.deathSpill.age; });
    assert.equal(await frame.locator('.too-small').isVisible(), true);
    await advance(1600); assert.equal(await onGame(function () { return this.deathSpill.age; }), tiny);
    await resize(width, height); await advance(1400);
    assert.equal(await frame.locator('#result-content').isVisible(), true);
    assert.equal(await frame.locator('#play').isVisible(), true);
    assert.match(await frame.locator('#play').textContent(), /Hop again/);
    assert.deepEqual(await onGame(function () { return { time: this.time, score: this.maxY }; }), { time: snapshot.time, score: snapshot.score });
    assert.equal(await onGame(function () { return this.run.wallet; }), 0);
    await iframe.screenshot({ path: new URL(`death-spill-runtime-${theme}-result.png`, artifacts).pathname });
    await frame.locator('#play').click(); await advance(32);
    assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'playing');
    assert.equal(await frame.locator('#run-panel').isHidden(), true);
    assert.equal(await frame.locator('#coins').textContent(), '0');
    evidence.scenarios.push({ theme, width, height, snapshot, checks: ['visible spill before result', 'early Enter blocked', 'blur freezes reveal', 'hidden frame freezes reveal', 'undersized frame freezes reveal', 'world clocks stay frozen', 'result/retry work'] });
  } finally { await app.close(); }
}

for (const [label, reduced, wallet] of [['Less motion', true, 18], ['Empty wallet', false, 0]]) {
  const app = await setup('dark', 900, 600, reduced, wallet);
  try {
    assert.equal(await app.frame.locator('#result-content').isVisible(), true, `${label} avoids waiting for an animation`);
    assert.equal(await app.frame.locator('#run-panel').isVisible(), true);
    assert.equal(await app.frame.locator('#coins').textContent(), '0');
    if (reduced) {
      const before = await app.frame.locator('canvas').first().evaluate(canvas => canvas.toDataURL()); await app.advance(600);
      const after = await app.frame.locator('canvas').first().evaluate(canvas => canvas.toDataURL());
      assert.ok(before === after, 'Less motion shows settled belongings without tumble animation');
    }
    evidence.scenarios.push({ label, check: 'Immediate accessible result; no animation wait' });
  } finally { await app.close(); }
}
assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
await writeFile(new URL('death-spill-runtime.json', artifacts), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
