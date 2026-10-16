// Exercise the unchanged production main loop. CDP observes lexical owners and
// arranges a progressed-run fixture; all setup/cancel/start actions use real UI.
import assert from 'node:assert/strict';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';
import { chromium } from 'playwright';
const output=artifactDirectoryForCoverage(new URL('../artifacts/',import.meta.url),'local-session-adoption-runtime');
import { artifactDirectoryForCoverage } from '../tools/release-coverage/browser.mjs';

const artifact = new URL('../dist/index.html', import.meta.url);
const built = await readFile(artifact, 'utf8');
const inputs = ['main.ts', 'session.ts', 'session-ui.ts', 'session-ui.css', 'game.ts', 'market/run.ts'];
assert.ok((await stat(artifact)).mtimeMs >= Math.max(...await Promise.all(inputs.map(async file => (await stat(new URL(`../src/${file}`, import.meta.url))).mtimeMs))), 'Build current sources before adoption integration.');
function installRuntime() {
  window.adoptionFixture = { hydrated: false };
  window.napplet = { storage: {
    async getItem(key) {
      if (key !== 'puddlehop.progress.v1') return null;
      window.adoptionFixture.hydrated = true;
      return JSON.stringify({ selected: 'butter', travelerVersion: 2, coins: 1000, best: 1000, mode: 'stroll', muted: true });
    }, async setItem() {},
  } };
}
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const harness = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<iframe id="napplet" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>
document.querySelector('iframe').srcdoc=${json(built.replace('<head>', `<head><script>(${installRuntime.toString()})()<` + '/script>'))};
</script>`;

function randomSequence(state, count, wrap = false) {
  return Array.from({ length: count }, () => {
    state += 0x6d2b79f5;
    if (wrap) state >>>= 0;
    let value = Math.imul(state ^ state >>> 15, state | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  });
}

test('progressed solo setup cancels unchanged and commits the same owners and RNG continuation', { timeout: 60_000 }, async () => {
  const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(harness); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const errors = [];
  try {
    browser = await chromium.launch({ args: ['--mute-audio'] });
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    page.setDefaultTimeout(5000); await page.clock.install();
    page.on('pageerror', error => errors.push(error.message));
    const cdp = await page.context().newCDPSession(page), contexts = new Map();
    cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context));
    cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
    cdp.on('Runtime.executionContextsCleared', () => contexts.clear());
    await cdp.send('Runtime.enable');
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' });
    const frame = await (await page.locator('#napplet').elementHandle()).contentFrame();
    await frame.waitForFunction(() => window.adoptionFixture?.hydrated);
    await frame.locator('#play').waitFor();
    assert.equal(await frame.evaluate(() => location.origin), 'null');
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50);

    async function owner(predicate) {
      const { frameTree } = await cdp.send('Page.getFrameTree');
      const context = [...contexts.values()].find(value => value.auxData?.frameId === frameTree.childFrames[0].frame.id && value.auxData?.isDefault);
      const { result: handler } = await cdp.send('Runtime.evaluate', { contextId: context.id, includeCommandLineAPI: true, expression: 'getEventListeners(document.getElementById("pause")).click[0].listener' });
      const details = await cdp.send('Runtime.getProperties', { objectId: handler.objectId, ownProperties: true });
      const scopes = details.internalProperties.find(value => value.name === '[[Scopes]]').value;
      const list = await cdp.send('Runtime.getProperties', { objectId: scopes.objectId, ownProperties: true });
      for (const scope of list.result) {
        if (!scope.value?.objectId || scope.value.description === 'Global') continue;
        const bindings = await cdp.send('Runtime.getProperties', { objectId: scope.value.objectId, ownProperties: true });
        for (const binding of bindings.result) {
          if (binding.value?.type !== 'object' || !binding.value.objectId) continue;
          const match = await cdp.send('Runtime.callFunctionOn', { objectId: binding.value.objectId, returnByValue: true, functionDeclaration: predicate.toString() });
          if (match.result.value) return binding.value.objectId;
        }
      }
      throw new Error('Production owner not found in debugger scopes.');
    }
    const game = () => owner(function () { return this?.rows instanceof Map && typeof this.move === 'function' && typeof this.update === 'function' && Array.isArray(this.mobs); });
    const session = () => owner(function () { return this?.world?.rows instanceof Map && Array.isArray(this.players) && typeof this.dispatch === 'function'; });
    async function call(objectId, fn, args = [], byValue = true) {
      const result = await cdp.send('Runtime.callFunctionOn', { objectId, functionDeclaration: fn.toString(), arguments: args, returnByValue: byValue });
      assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
      return byValue ? result.result.value : result.result.objectId;
    }
    const observe = async () => call(await game(), function () {
      return JSON.parse(JSON.stringify({
        state: this.state, x: this.x, y: this.y, fromX: this.fromX, fromY: this.fromY,
        maxY: this.maxY, time: this.time, idle: this.idle, hop: this.hop, coins: this.coins,
        health: this.health, hurt: this.hurtRemaining, wave: this.waveRow, character: this.characterId,
        powerReadyAt: this.powerReadyAt, powerNotice: this.powerNotice, healed: this.healedMilestone,
        seed: this.seed, seedCode: this.seedCode, rows: [...this.rows], attractedCoins: [...this.attractedCoins],
        mobs: this.mobs, director: this.mobDirector, run: this.run,
      }));
    });

    await frame.locator('#play').click();
    // Arrange a safe corridor, retaining the other generated lanes/actor phases.
    // Fractional x represents the supported offset left by a moving log.
    await call(await game(), function () {
      this.x = this.fromX = .37;
      for (const lane of this.rows.values()) if (lane.index <= 8) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
    });
    await frame.locator('#scene').focus();
    for (let hop = 0; hop < 6; hop++) { await frame.locator('#scene').click({ position: { x: 450, y: 350 } }); await page.clock.runFor(220); }
    assert.equal((await observe()).maxY, 6, 'six real pointer hops progress the existing solo run');
    assert.equal((await observe()).x, .37, 'free log-offset grid remains intact');
    await page.clock.runFor(1000);
    await frame.locator('#pause').click();
    // Give the progressed fixture earned assets through the real inventory API.
    // Purchasing a personal magnet and cosmetic leaves shared-world policy alone.
    const fixture = await call(await game(), function () {
      this.run.creditCoins(100);
      this.run.advanceScore(100); this.run.open();
      const look = [...this.run.catalog.values()].find(item => item.kind === 'cosmetic');
      for (const id of ['magnet', look.id]) {
        const item = this.run.catalog.get(id);
        this.run.market.offers.push({ id: `adoption-${id}`, itemId: id, price: item.price, sold: false });
        const result = this.run.buy(`adoption-${id}`);
        if (!result.ok) throw new Error(result.message);
      }
      this.run.close(); this.health = this.maxHealth - 1; this.powerReadyAt = 100;
      // Advance the real actor stream before adoption; a recreated stream fails.
      for (let draw = 0; draw < 3; draw++) this.mobDirector.rng();
      return { marketState: this.run.state, mobSeed: (this.seed ^ 0x76ab41c3) >>> 0 };
    });
    const original = await game();
    const retained = await call(original, function () { return {
      game: this, world: this.world, player: this.player, run: this.run, rows: this.rows,
      lanes: [...this.rows.values()], director: this.mobDirector, rng: this.mobDirector.rng,
      attracted: this.attractedCoins, runSeed: this.runSeed,
    }; }, [], false);
    async function sameOwners() {
      const current = await game();
      return call(retained, function (game) { return {
        game: this.game === game, world: this.world === game.world, player: this.player === game.player,
        inventory: this.run === game.run, rows: this.rows === game.rows,
        lanes: this.lanes.every(lane => game.rows.get(lane.index) === lane),
        director: this.director === game.mobDirector, rng: this.rng === game.mobDirector.rng,
        attracted: this.attracted === game.attractedCoins, runSeed: this.runSeed === game.runSeed,
      }; }, [{ objectId: current }]);
    }
    let before = await observe();
    assert.equal(before.state, 'paused'); assert.equal(before.run.cards.length, 1); assert.equal(before.run.cosmetics.length, 1);
    assert.ok(before.time > 1, `progressed simulation time: ${before.time}`);
    assert.ok(before.run.wallet > 0, `remaining wallet: ${before.run.wallet}`);
    assert.ok(before.rows.some(([, lane]) => lane.kind !== 'meadow'), 'unmodified generated traffic or river lanes remain in the fixture');
    await frame.locator('#local-play').click();
    await frame.getByRole('button', { name: 'Next available traveler' }).click();
    await page.clock.runFor(2000);
    assert.deepEqual(await observe(), before, 'setup and draft character changes cannot step or mutate the solo owner');
    await frame.locator('#local-session-back').click();
    assert.deepEqual(await observe(), before, 'cancel returns the exact paused solo state and inventory');
    const cancelledOwners = await sameOwners();
    assert.ok(Object.values(cancelledOwners).every(Boolean), JSON.stringify(cancelledOwners));
    await frame.locator('#play').click();
    await frame.locator('#scene').click({ position: { x: 450, y: 350 } });
    await page.clock.runFor(220);
    await frame.locator('#pause').click();
    before = await observe();
    assert.equal(before.maxY, 7, 'cancel restores playable solo input instead of leaving the owner suspended');
    assert.equal(before.x, .37);
    // Normal progress may retire old rows. Retain the actual pre-commit course,
    // while keeping every long-lived owner reference captured before cancel.
    await call(retained, function () { this.lanes = [...this.game.rows.values()]; });

    await frame.locator('#local-play').click();
    await page.clock.runFor(2000);
    assert.deepEqual(await observe(), before, 'reopening setup cannot consume clocks, market time, or RNG');
    await frame.locator('#local-session-start').click();
    const committed = await observe();
    assert.deepEqual(committed, { ...before, state: 'playing' }, 'commit resumes without resetting course, actor phases, progress, health, powers or assets');
    const committedOwners = await sameOwners();
    assert.ok(Object.values(committedOwners).every(Boolean), JSON.stringify(committedOwners));
    assert.deepEqual(await call(await session(), function (game) { return {
      running: this.running, world: this.world === game.world, primary: this.players[0] === game.player,
      primaryRun: this.players[0].run === game.run, otherRun: this.players[1].run !== game.run,
      count: this.players.length,
    }; }, [{ objectId: original }]), { running: true, world: true, primary: true, primaryRun: true, otherRun: true, count: 2 });
    const next = await call(await game(), function () { return {
      market: Array.from({ length: 4 }, () => this.run.random()),
      mobs: Array.from({ length: 4 }, () => this.mobDirector.rng()),
    }; });
    assert.deepEqual(next.market, randomSequence(fixture.marketState, 4, true), 'next market draws continue the existing stream');
    assert.deepEqual(next.mobs, randomSequence(fixture.mobSeed, 7).slice(3), 'next actor draws continue after previously consumed draws');
    const positions = () => session().then(id => call(id, function () { return this.players.map(player => ({ seat: player.seat, x: player.x, y: player.y })); }));
    const starting = await positions();
    await frame.locator('#scene').focus(); await page.keyboard.press('w'); await page.clock.runFor(220);
    assert.deepEqual(await positions(), starting.map((player, index) => ({ ...player, y: player.y + (index === 0 ? 1 : 0) })), 'adopted P1 responds to Keyboard A without moving P2');
    await page.keyboard.press('ArrowUp'); await page.clock.runFor(220);
    assert.deepEqual(await positions(), starting.map(player => ({ ...player, y: player.y + 1 })), 'new P2 responds to Keyboard B without moving P1 again');
    assert.deepEqual(errors, []);
    await mkdir(output, { recursive: true });
    await writeFile(new URL('local-session-adoption-runtime.json', output), JSON.stringify({
      artifact: 'built production opaque iframe; real UI transitions; debugger owner observation',
      progress: { hops: before.maxY, x: before.x, time: before.time, wallet: before.run.wallet },
      cancelledOwners, committedOwners, next, errors,
    }, null, 2));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});
