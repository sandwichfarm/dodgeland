import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';
import { chromium } from 'playwright';
import { loadSources } from './source-loader.mjs';
import { semanticValue, snapshotGame } from './solo-parity-snapshot.mjs';

test('Relay settles a real hop, freezes, and transfers one unchanged world to a fresh incoming seat', async () => {
  const sources = await loadSources(['game', 'relay']);
  try {
    const gameModule = await sources.import('game');
    const { Game } = gameModule;
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
    const semanticWorld = () => {
      const snapshot = snapshotGame(game, gameModule);
      return semanticValue({ rows: snapshot.rows, attractedCoins: snapshot.attractedCoins, mobs: snapshot.mobs, laneSpeeds: snapshot.gameFuture.laneSpeeds,
        seed: world.seed, runSeed: world.runSeed, time: world.time, waveRow: world.waveRow, frontier: world.frontier, activeFloor: world.activeFloor,
        claims: world.pickupOwners, inventory: session.players.map(player => ({ seat: player.seat, run: semanticValue(player.run), health: player.health, earned: player.personalScore, power: player.powerRemaining, personal: player.completedForwardTiles })) });
    };
    const exactWorld = semanticWorld(), rng = world.mobDirector.rng, rowOwners = [...world.rows.values()];
    const before = JSON.stringify({ time: world.time, tick: world.simulationTick, rows: [...world.rows], seed: world.seed, mobs: world.mobs, frontier: world.frontier });
    session.update(1);
    assert.equal(JSON.stringify({ time: world.time, tick: world.simulationTick, rows: [...world.rows], seed: world.seed, mobs: world.mobs, frontier: world.frontier }), before);
    const incoming = session.players[1], credit = incoming.completedForwardTiles, wallet = incoming.run.wallet;
    const ticket = relay.snapshot().transferGeneration;
    assert.equal(relay.confirm({ ...relay.confirmation(), seat: 'p1', device: 'keyboard-a', generation: ticket }), false);
    assert.equal(relay.confirm({ ...relay.confirmation(), generation: ticket - 1 }), false);
    const confirmation = relay.confirmation();
    assert.equal(relay.confirm(confirmation), true);
    assert.equal(relay.confirm(confirmation), false);
    assert.strictEqual(session.world, world);
    assert.equal(JSON.stringify({ time: world.time, tick: world.simulationTick, rows: [...world.rows], seed: world.seed, mobs: world.mobs, frontier: world.frontier }), before);
    assert.equal(incoming.completedForwardTiles, credit); assert.equal(incoming.run.wallet, wallet);
    assert.equal(incoming.hop, 0);
    assert.deepEqual(semanticWorld(), exactWorld, 'all world and inventory future state survives transfer');
    assert.strictEqual(world.mobDirector.rng, rng);
    assert.ok(rowOwners.every(row => world.rows.get(row.index) === row));
    assert.equal(relay.snapshot().activeSeat, 'p2');
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), true);
  } finally { await sources.dispose(); }
});

test('a confirmation captured before incoming-seat disconnect cannot authorize reclaimed participation', async () => {
  const sources = await loadSources(['game', 'relay']);
  try {
    const { Game } = await sources.import('game'), { createRelaySession } = await sources.import('relay');
    const relay = createRelaySession(new Game(113, 'pond', 'arcade', false, [], 'butter'), { seats: [
      { seat: 'p1', characterId: 'butter', device: 'keyboard-a' }, { seat: 'p2', characterId: 'pip', device: 'gamepad-0' },
    ], tilesPerLeg: 1 });
    const session = relay.session;
    session.dispatch({ seat: 'p1', direction: 'forward' });
    for (let i = 0; i < 60 && relay.snapshot().phase === 'running'; i++) session.update(1 / 120);
    const incoming = session.players[1];
    const stale = { seat: incoming.seat, device: incoming.device, generation: relay.snapshot().transferGeneration, participantId: incoming.participantId, lifecycleGeneration: session.lifecycle.length };
    assert.equal(session.deviceLost('p2'), true); assert.equal(session.offerReclaim('p2', 'gamepad-0'), true); assert.equal(session.reclaim('p2', 'gamepad-0'), true);
    assert.equal(relay.confirm(stale), false, 'old lifecycle token cannot confirm after reconnect');
    assert.equal(relay.confirm(relay.confirmation()), true, 'fresh original-seat identity may continue');
  } finally { await sources.dispose(); }
});

function installRuntime() {
  const listeners = new Set(); let pads = []; let themeChanged = () => {};
  window.relayFixture = { theme(light) { themeChanged({ colors: light ? { background: '#f6f1e5', text: '#24362d', primary: '#4b7b61' } : { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }); }, emit(next) { pads = next; for (const listener of listeners) listener({ available: true, focused: true, pads }); } };
  window.napplet = {
    storage: { async getItem() { return JSON.stringify({ mode: 'arcade', muted: true, selected: 'butter', travelerVersion: 2 }); }, async setItem() {} },
    theme: { async get() { return { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }; }, onChanged(listener) { themeChanged = listener; return { close() {} }; } },
    keys: { async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; }, onAction() { return { close() {} }; }, unregisterAction() {} },
    gamepad: { get available() { return true; }, get focused() { return true; }, getGamepads() { return pads; }, onChange(listener) { listeners.add(listener); return { close() { listeners.delete(listener); } }; } },
  };
}
const pad = (index, buttons = []) => ({ index, id: `relay-${index}`, mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: buttons.includes(button) ? 1 : 0, pressed: buttons.includes(button), touched: buttons.includes(button) })) });

async function withRelayBrowser(run) {
  const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const harness = `<!doctype html><iframe sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>document.querySelector('iframe').srcdoc=${JSON.stringify(built.replace('<head>', `<head><script>(${installRuntime.toString()})();</script>`)).replaceAll('<', '\\u003c')};</script>`;
  const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage({ viewport: { width: 930, height: 630 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    await frame.locator('#play').waitFor();
    await run({ page, frame, send: pads => frame.evaluate(next => window.relayFixture.emit(next), pads) });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}

test('held inactive controller input cannot confirm the transfer or become the next hop', { timeout: 30_000 }, async () => withRelayBrowser(async ({ page, frame, send }) => {
  await frame.locator('#local-play').click();
  await frame.locator('#session-roster [data-seat="p2"]').click();
  await frame.getByRole('button', { name: 'Leave this seat', exact: true }).click();
  await send([pad(0)]); await send([pad(0, [0])]); await send([pad(0)]);
  await frame.locator('#relay-play').click(); await frame.locator('#relay-tiles').fill('1');
  await frame.locator('#local-session-start').click();
  await send([pad(0)]); await send([pad(0, [0, 9, 5])]);
  await frame.locator('#scene').focus(); await page.keyboard.press('w');
  await frame.getByRole('heading', { name: 'Leg 1 complete', exact: true }).waitFor();
  await send([pad(0, [0, 9, 5])]); await page.waitForTimeout(120);
  assert.equal(await frame.locator('#relay-handoff').count(), 1, 'held inactive confirm/pause/market cannot act');
  await send([pad(0)]); await send([pad(0, [0])]);
  await frame.waitForFunction(() => !document.querySelector('#relay-handoff'));
  const score = await frame.locator('#score').textContent();
  await send([pad(0, [0])]); await page.waitForTimeout(120);
  assert.equal(await frame.locator('#score').textContent(), score, 'confirm edge and held confirm never hop');
  await send([pad(0)]); await send([pad(0, [12])]); await send([pad(0)]);
  await frame.getByRole('heading', { name: 'Leg 2 complete', exact: true }).waitFor();
  await send([pad(0), pad(1)]); await send([pad(0), pad(1, [0])]);
  assert.equal(await frame.locator('#session-seats [data-seat]').count(), 2);
}));

// Dependency regression: primary and secondary participants must both derive
// personal score from earned movement. A Relay-only offset would conceal the
// same defect in other forms of non-crediting placement.
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
        assert.equal(relay.confirm({ ...relay.confirmation(), seat: incoming.seat, device: incoming.device }), true);
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
  const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
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

test('setup validates every roster size and length atomically and freezes copied stable order', async () => {
  const sources = await loadSources(['game', 'relay']);
  try {
    const { Game } = await sources.import('game'), { createRelaySession, validateRelaySetup } = await sources.import('relay');
    const seats = [
      { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
      { seat: 'p2', characterId: 'pip', device: 'keyboard-b' },
      { seat: 'p3', characterId: 'clover', device: 'gamepad-0' },
      { seat: 'p4', characterId: 'ember', device: 'gamepad-1' },
    ];
    // Obtain the fourth catalog identity from the shipped catalog, not a test catalog.
    const content = await sources.import('content');
    seats.forEach((seat, index) => { seat.characterId = content.CHARACTERS[index].id; });
    for (const count of [2, 3, 4]) for (const length of [undefined, 1, 50, 999]) {
      const draft = seats.slice(0, count).map(seat => ({ ...seat })).reverse();
      const relay = createRelaySession(new Game(113, 'pond', 'arcade', false, [], 'butter'), { seats: draft, tilesPerLeg: length });
      assert.deepEqual(relay.setup.seats.map(seat => seat.seat), draft.map(seat => seat.seat));
      assert.equal(relay.activeSeat, draft[0].seat); assert.equal(relay.setup.tilesPerLeg, length ?? 50);
      assert.equal(relay.session.players.length, count);
      const frozen = JSON.stringify(relay.setup); draft[0].characterId = 'changed'; draft.reverse();
      assert.equal(JSON.stringify(relay.setup), frozen);
      assert.ok(Object.isFrozen(relay.setup) && Object.isFrozen(relay.setup.seats) && relay.setup.seats.every(Object.isFrozen));
      assert.equal(relay.session.admit({ device: 'gamepad-9', characterId: 'butter' }), false);
    }
    const bad = ['', '1.5', '-1', '+1', '0', '1000', ' 50', '50 ', '01'].map(tilesPerLeg => ({ seats: seats.slice(0, 2), tilesPerLeg }));
    bad.push(...[
      [], seats.slice(0, 1), [seats[1], seats[2]], [seats[0], seats[0]],
      [seats[0], { ...seats[1], characterId: seats[0].characterId }],
      [seats[0], { ...seats[1], device: 'keyboard-a' }],
      [seats[0], { ...seats[1], device: null }],
      [seats[0], { ...seats[1], disconnected: true }],
    ].map(seats => ({ seats, tilesPerLeg: 50 })));
    for (const proposal of bad) {
      const game = new Game(113, 'pond', 'arcade', false, [], 'butter'), world = game.world, player = game.player;
      const before = semanticValue(snapshotGame(game, await sources.import('game')));
      assert.throws(() => validateRelaySetup(proposal)); assert.throws(() => createRelaySession(game, proposal));
      assert.strictEqual(game.world, world); assert.strictEqual(game.player, player);
      assert.deepEqual(semanticValue(snapshotGame(game, await sources.import('game'))), before);
    }
  } finally { await sources.dispose(); }
});

test('invalid Relay length stays disabled through the existing roster editor', { timeout: 30_000 }, async () => withRelayBrowser(async ({ frame }) => {
  await frame.locator('#local-play').click(); await frame.locator('#relay-play').click();
  await frame.locator('#relay-tiles').fill('0');
  assert.equal(await frame.locator('#local-session-start').isDisabled(), true);
  await frame.locator('.relay-setup-nav').getByRole('button', { name: 'Roster', exact: true }).click();
  await frame.locator('#session-roster [data-seat="p2"]').click();
  assert.equal(await frame.locator('#relay-tiles').inputValue(), '0');
  assert.equal(await frame.locator('#local-session-start').isDisabled(), true);
  assert.equal(await frame.locator('#local-session-start').textContent(), 'Start Relay');
}));

for (const count of [3, 4]) test(`visible ${count}-seat setup preserves stable identities while reordering runners`, { timeout: 30_000 }, async () => withRelayBrowser(async ({ page, frame, send }) => {
  await frame.locator('#local-play').click();
  const pads = [];
  for (let index = 0; index < count - 2; index++) {
    pads.push(pad(index)); await send(pads); await send(pads.map(item => item.index === index ? pad(index, [0]) : item)); await send(pads);
  }
  assert.equal(await frame.locator('#session-roster .session-ready').count(), count);
  await frame.locator('#relay-play').click();
  assert.equal(await frame.locator('#relay-tiles').inputValue(), '50');
  await frame.locator('#relay-tiles').fill('1');
  await frame.getByRole('button', { name: 'Order', exact: true }).click();
  await frame.getByRole('button', { name: 'Move later: P1, position 1', exact: true }).click();
  assert.match(await frame.locator('.relay-order').textContent(), /2\. ▲ P1/);
  await frame.locator('#local-session-start').click();
  assert.equal(await frame.locator('#session-seats [data-seat]').count(), count);
  const initial = await frame.locator('#score').textContent();
  await frame.locator('#scene').focus(); await page.keyboard.press('w'); await page.waitForTimeout(120);
  assert.equal(await frame.locator('#score').textContent(), initial);
  await page.keyboard.press('ArrowUp');
  await frame.getByRole('heading', { name: 'Leg 1 complete', exact: true }).waitFor();
  assert.match(await frame.locator('#relay-handoff').textContent(), /P2 carried/);
  await frame.getByRole('button', { name: 'View relay', exact: true }).click();
  assert.match(await frame.locator('.relay-summary').textContent(), /1\/.*P2/);
  await frame.getByRole('button', { name: 'Back to handoff', exact: true }).click();
  await frame.getByRole('button', { name: "Start P1's leg", exact: true }).click();
  assert.equal(await frame.locator('#relay-handoff').count(), 0);
}));

test('Relay configuration and handoff remain bounded across frame sizes and runtime themes', { timeout: 60_000 }, async () => withRelayBrowser(async ({ page, frame }) => {
  await frame.locator('#local-play').click(); await frame.locator('#relay-play').click();
  const sizes = [[240, 240], [320, 560], [900, 600], [1000, 280], [2400, 1200]];
  async function inspect(name) {
    for (const light of [false, true]) for (const [width, height] of sizes) {
      await page.setViewportSize({ width: width + 30, height: height + 30 });
      await page.locator('iframe').evaluate((iframe, size) => { iframe.style.width = `${size[0]}px`; iframe.style.height = `${size[1]}px`; }, [width, height]);
      await frame.evaluate(light => window.relayFixture.theme(light), light);
      await page.waitForTimeout(30);
      const outside = await frame.evaluate(() => [...document.querySelectorAll('#session-board input, #session-board button, #relay-handoff button')].filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden').filter(node => { const rect = node.getBoundingClientRect(); return rect.width < 44 || rect.height < 44 || rect.left < 0 || rect.top < 0 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1; }).map(node => ({ text: node.textContent, rect: node.getBoundingClientRect().toJSON() })));
      assert.deepEqual(outside, [], `${name} ${width}x${height} ${light ? 'light' : 'dark'}`);
      const clipped = await frame.evaluate(() => [...document.querySelectorAll('#session-board button, #session-board input, #relay-handoff button')].filter(node => node.getClientRects().length).filter(node => {
        const rect = node.getBoundingClientRect();
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent); if (!/(hidden|clip|auto|scroll)/.test(style.overflow)) continue;
          const bounds = parent.getBoundingClientRect();
          if (rect.left < bounds.left + parseFloat(style.borderLeftWidth) - 1 || rect.right > bounds.right - parseFloat(style.borderRightWidth) + 1 || rect.top < bounds.top + parseFloat(style.borderTopWidth) - 1 || rect.bottom > bounds.bottom - parseFloat(style.borderBottomWidth) + 1) return true;
        }
        return false;
      }).map(node => node.textContent));
      assert.deepEqual(clipped, [], `${name} controls cannot intersect a clipping ancestor at ${width}x${height}`);
      if (name === 'handoff') {
        const ratios = await frame.evaluate(() => [...document.querySelectorAll('#relay-handoff button:not(:disabled)')].filter(node => node.getClientRects().length).map(node => {
          const style = getComputedStyle(node);
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const context = canvas.getContext('2d');
          const luminance = color => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(channel => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0); };
          const foreground = luminance(style.color), background = luminance(style.backgroundColor);
          return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
        }));
        assert.ok(ratios.every(ratio => ratio >= 4.5), `handoff contrast ratios: ${ratios}`);
      }

      await page.locator('iframe').screenshot({ path: `/tmp/relay-${name}-${width}x${height}-${light ? 'light' : 'dark'}.png` });
    }
  }
  await inspect('length');
  await frame.locator('.relay-setup-nav').getByRole('button', { name: 'Roster', exact: true }).click(); await inspect('roster');
  await frame.getByRole('button', { name: 'Order', exact: true }).click(); await inspect('order');
  await frame.getByRole('button', { name: 'Length', exact: true }).click(); await frame.locator('#relay-tiles').fill('1');
  await frame.locator('#local-session-start').click(); await frame.locator('#scene').focus(); await page.keyboard.press('w');
  await frame.getByRole('heading', { name: 'Leg 1 complete', exact: true }).waitFor(); await inspect('handoff');
  await page.locator('iframe').evaluate(iframe => { iframe.style.width = '200px'; iframe.style.height = '160px'; });
  await page.waitForTimeout(30);
  assert.equal(await frame.locator('#relay-handoff').isVisible(), false);
  assert.match(await frame.locator('body').innerText(), /Needs 240×240 to play/);
}));

test('leaving Relay setup preserves the original solo and Survive Together setup paths', { timeout: 30_000 }, async () => withRelayBrowser(async ({ page, frame }) => {
  await frame.locator('#local-play').click(); await frame.locator('#relay-play').click();
  await frame.locator('#relay-tiles').fill('0'); await frame.locator('#local-session-back').click();
  await frame.locator('#play').click(); await frame.locator('#scene').focus(); await page.keyboard.press('w');
  await frame.locator('#pause').click(); await frame.locator('#local-play').click();
  await frame.getByRole('heading', { name: 'Play together?', exact: true }).waitFor();
  assert.equal(await frame.locator('#relay-configuration').count(), 0);
  assert.equal(await frame.locator('#session-roster').isVisible(), true);
  assert.equal(await frame.locator('#local-session-start').isEnabled(), true);
  await frame.locator('#local-session-start').click();
  assert.equal(await frame.locator('#session-seats [data-seat]').count(), 2);
}));
