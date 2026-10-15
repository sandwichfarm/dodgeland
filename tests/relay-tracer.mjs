import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';
import { chromium } from 'playwright';
import { loadSources } from './source-loader.mjs';

test('Relay settles a real hop, freezes, and transfers one unchanged world to a fresh incoming seat', async () => {
  const sources = await loadSources(['game', 'relay']);
  try {
    const { Game } = await sources.import('game');
    const { createRelaySession } = await sources.import('relay');
    const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
    const relay = createRelaySession(game, { seats: [
      { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
      { seat: 'p2', characterId: 'pip', device: 'keyboard-b' },
    ], tilesPerLeg: '1' });
    const session = relay.session, world = game.world;
    assert.strictEqual(session.world, world);
    assert.equal(relay.snapshot().activeSeat, 'p1');
    assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), false);
    assert.equal(session.admit({ device: 'gamepad-3', characterId: 'clover' }), false);
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    assert.equal(relay.snapshot().phase, 'running', 'an accepted airborne hop is not a handoff');
    for (let i = 0; i < 60 && relay.snapshot().phase === 'running'; i++) session.update(1 / 120);
    assert.equal(relay.snapshot().phase, 'handoff');
    assert.equal(game.player.hop, 0);
    const before = JSON.stringify({ time: world.time, tick: world.simulationTick, rows: [...world.rows], seed: world.seed, mobs: world.mobs, frontier: world.frontier });
    session.update(1);
    assert.equal(JSON.stringify({ time: world.time, tick: world.simulationTick, rows: [...world.rows], seed: world.seed, mobs: world.mobs, frontier: world.frontier }), before);
    const incoming = session.players[1], credit = incoming.completedForwardTiles, wallet = incoming.run.wallet;
    const ticket = relay.snapshot().transferGeneration;
    assert.equal(relay.confirm({ seat: 'p1', device: 'keyboard-a', generation: ticket }), false);
    assert.equal(relay.confirm({ seat: 'p2', device: 'keyboard-b', generation: ticket - 1 }), false);
    assert.equal(relay.confirm({ seat: 'p2', device: 'keyboard-b', generation: ticket }), true);
    assert.equal(relay.confirm({ seat: 'p2', device: 'keyboard-b', generation: ticket }), false);
    assert.strictEqual(session.world, world);
    assert.equal(JSON.stringify({ time: world.time, tick: world.simulationTick, rows: [...world.rows], seed: world.seed, mobs: world.mobs, frontier: world.frontier }), before);
    assert.equal(incoming.completedForwardTiles, credit); assert.equal(incoming.run.wallet, wallet);
    assert.equal(incoming.hop, 0);
    assert.equal(relay.snapshot().activeSeat, 'p2');
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), true);
  } finally { await sources.dispose(); }
});

function installRuntime() {
  const listeners = new Set(); let pads = [];
  window.relayFixture = { emit(next) { pads = next; for (const listener of listeners) listener({ available: true, focused: true, pads }); } };
  window.napplet = {
    storage: { async getItem() { return JSON.stringify({ mode: 'arcade', muted: true, selected: 'butter', travelerVersion: 2 }); }, async setItem() {} },
    theme: { async get() { return { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }; }, onChanged() { return { close() {} }; } },
    keys: { async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; }, onAction() { return { close() {} }; }, unregisterAction() {} },
    gamepad: { get available() { return true; }, get focused() { return true; }, getGamepads() { return pads; }, onChange(listener) { listeners.add(listener); return { close() { listeners.delete(listener); } }; } },
  };
}
const pad = (index, buttons = []) => ({ index, id: `relay-${index}`, mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: buttons.includes(button) ? 1 : 0, pressed: buttons.includes(button), touched: buttons.includes(button) })) });

// Dependency regression: the primary compatibility facade still derives its
// personal score from spatial maxY. Keep these RED until the shared engine is
// repaired; a Relay-only offset would conceal the same recovery defect.
for (const check of ['innate cooldown', 'economy score']) {
  test(`returning P1 preserves earned ${check} across a real two-leg transfer`, async () => {
    const sources = await loadSources(['game', 'relay']);
    try {
      const { Game } = await sources.import('game');
      const { createRelaySession } = await sources.import('relay');
      const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
      const relay = createRelaySession(game, { seats: [
        { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
        { seat: 'p2', characterId: 'pip', device: 'keyboard-b' },
      ], tilesPerLeg: 1 });
      const primary = game.player;
      if (check === 'innate cooldown') {
        game.end('Water power regression', 'water');
        assert.equal(primary.powerRescue?.power.id, 'water-bounce');
        assert.equal(primary.powerRemaining, 100);
        for (let i = 0; i < 400 && primary.powerRescue; i++) relay.session.update(1 / 120);
        assert.equal(primary.powerRescue, null);
      }
      for (let leg = 1; leg <= 2; leg++) {
        assert.equal(relay.session.dispatch({ seat: relay.activeSeat, direction: 'forward' }), true);
        for (let i = 0; i < 100 && relay.snapshot().phase !== 'handoff'; i++) relay.session.update(1 / 120);
        assert.equal(relay.snapshot().phase, 'handoff');
        const incoming = relay.session.players.find(player => player.seat === relay.incomingSeat);
        assert.equal(relay.confirm({ seat: incoming.seat, device: incoming.device, generation: relay.snapshot().transferGeneration }), true);
      }
      assert.equal(primary.earnedDistance, 1);
      if (check === 'innate cooldown') assert.equal(primary.powerRemaining, 99, 'P2 movement and P1 placement cannot recharge P1 innate power');
      else {
        assert.equal(relay.session.dispatch({ seat: 'p1', direction: 'forward' }), true);
        assert.equal(primary.earnedDistance, 2);
        assert.equal(primary.run.maxScore, 2, 'the next P1 hop cannot mint skipped-row economy milestones');
      }
    } finally { await sources.dispose(); }
  });
}

test('muted built opaque iframe configures Relay and consumes fresh incoming confirmation', { timeout: 30_000 }, async () => {
  const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(built, /Start Relay/, 'build must contain the real Relay setup');
  const setup = `<script>(${installRuntime.toString()})();</script>`;
  const harness = `<!doctype html><iframe sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>document.querySelector('iframe').srcdoc=${JSON.stringify(built.replace('<head>', '<head>' + setup)).replaceAll('<', '\\u003c')};</script>`;
  const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(harness); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    await frame.locator('#play').waitFor();
    await frame.locator('#local-play').click();
    await frame.locator('#relay-play').click();
    assert.equal(await frame.locator('#relay-tiles').inputValue(), '50');
    await frame.locator('#relay-tiles').fill('1');
    await frame.locator('#local-session-start').click();
    await frame.locator('#scene').focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await frame.locator('#relay-handoff').count(), 0, 'inactive keyboard cannot progress the runner');
    await page.keyboard.press('w');
    await frame.getByRole('heading', { name: 'Leg 1 complete', exact: true }).waitFor();
    const score = await frame.locator('#score').textContent();
    await page.keyboard.press('w');
    assert.equal(await frame.getByRole('heading', { name: 'Leg 1 complete', exact: true }).count(), 1);
    await page.keyboard.press('ArrowUp');
    await frame.waitForFunction(() => !document.querySelector('#relay-handoff'));
    assert.equal(await frame.locator('#score').textContent(), score, 'confirmation cannot also hop');
    await page.keyboard.press('ArrowUp');
    await frame.getByRole('heading', { name: 'Leg 2 complete', exact: true }).waitFor();
    await frame.evaluate(next => window.relayFixture.emit(next), [pad(2)]);
    await frame.evaluate(next => window.relayFixture.emit(next), [pad(2, [0])]);
    assert.equal(await frame.locator('#session-seats [data-seat]').count(), 2);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
