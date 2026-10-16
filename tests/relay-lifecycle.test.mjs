import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';
import { semanticValue } from './solo-parity-snapshot.mjs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { createMarketGameFixture } from './market-game-fixture.mjs';
const sources = await loadSources(['game', 'relay', 'session-input']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { createRelaySession } = await sources.import('relay');
const { GamepadRouter } = await sources.import('session-input');
const STEP = 1 / 120;
function setup(count = 3) {
  const game = new Game(121, 'pond', 'stroll', false, [], 'butter');
  for (const row of game.rows.keys()) game.rows.set(row, { ...generateLane(game.seed, row, game.home), kind: 'meadow', blocked: [], decorations: [], coin: null });
  const relay = createRelaySession(game, { seats: ['butter', 'pip', 'sunny'].slice(0, count).map((characterId, index) => ({ seat: `p${index + 1}`, characterId, device: `gamepad-${index}` })), tilesPerLeg: 1 });
  return { game, relay, session: relay.session };
}
function ticks(run, count = 120) { for (let i = 0; i < count; i++) run.session.update(STEP); }
function assets(run) { return semanticValue(run.session.players.map(p => ({ seat: p.seat, run: p.run, health: p.health, score: p.personalScore, completed: p.completedForwardTiles, deaths: p.statistics.deaths, spill: p.deathSpill }))); }
function act(run, kind, actor) { return run.relay.command({ ...run.relay.actionToken(actor), kind }); }

test('inactive loss retains assets and live time, and normal boundary rotation bypasses it', () => {
  const run = setup(), before = assets(run);
  assert.equal(run.session.deviceLost('p2'), true); ticks(run, 2);
  assert.equal(run.relay.snapshot().phase, 'running'); assert.ok(run.game.time > 0); assert.deepEqual(assets(run), before);
  run.session.dispatch({ seat: 'p1', direction: 'forward' }); ticks(run);
  assert.equal(run.relay.incomingSeat, 'p3');
  assert.equal(run.relay.confirm(run.relay.confirmation()), true); assert.equal(run.relay.activeSeat, 'p3');
});

test('active loss freezes a partial hop; original reclaim preserves it and wrong device cannot mutate', () => {
  const run = setup(); run.session.dispatch({ seat: 'p1', direction: 'forward' }); ticks(run, 2);
  const p = run.session.players[0], before = assets(run), position = [p.x, p.y, p.hop, p.fromY];
  run.session.deviceLost('p1'); const time = run.game.time;
  assert.equal(run.relay.snapshot().phase, 'disconnected'); ticks(run, 2000);
  assert.equal(run.game.time, time); assert.deepEqual(assets(run), before);
  assert.equal(run.session.reclaim('p1', 'gamepad-9'), false);
  assert.equal(run.session.reclaim('p1', 'gamepad-0'), true);
  assert.deepEqual([p.x, p.y, p.hop, p.fromY], position); ticks(run);
  assert.equal(run.relay.snapshot().phase, 'handoff');
});

test('skip requires a connected actor and a fresh second confirmation; cancel preserves the turn', () => {
  const run = setup(); run.session.deviceLost('p1'); const before = assets(run);
  assert.equal(act(run, 'skip', 'p1'), false);
  const stale = { ...run.relay.actionToken('p2'), kind: 'confirm' };
  assert.equal(act(run, 'skip', 'p2'), true); assert.equal(run.relay.snapshot().phase, 'confirm-skip');
  assert.equal(run.relay.command(stale), false); assert.equal(act(run, 'cancel', 'p2'), true);
  assert.equal(run.relay.activeSeat, 'p1'); assert.deepEqual(assets(run), before);
  assert.equal(act(run, 'skip', 'p2'), true); assert.equal(act(run, 'confirm', 'p2'), true);
  assert.equal(run.relay.activeSeat, 'p2'); assert.equal(run.session.players[0].participation, 'device-lost');
  assert.deepEqual(assets(run), before); assert.equal(run.relay.snapshot().outcomes.at(-1).outcome, 'skipped');
});

test('all disconnected seats wait indefinitely and reclaim restores the expected original turn', () => {
  const run = setup(); for (const p of run.session.players) run.session.deviceLost(p.seat);
  assert.equal(run.relay.snapshot().phase, 'waiting-for-reclaim'); const time = run.game.time; ticks(run, 2000);
  assert.equal(run.game.time, time); assert.equal(run.session.admit({ device: 'gamepad-8', characterId: 'miso' }), false);
  assert.equal(run.session.reclaim('p1', 'gamepad-0'), true); assert.equal(run.relay.activeSeat, 'p1');
  assert.equal(run.relay.snapshot().phase, 'running');
});

test('leave is confirmed and archived without death; remaining reclaimable seats wait then end once', () => {
  const run = setup(2), before = assets(run); run.session.deviceLost('p2');
  assert.equal(act(run, 'leave', 'p1'), true); assert.equal(act(run, 'cancel', 'p1'), true);
  assert.deepEqual(assets(run), before); assert.equal(run.session.players[0].participation, 'active');
  assert.equal(act(run, 'leave', 'p1'), true); assert.equal(act(run, 'confirm', 'p1'), true);
  assert.equal(run.relay.snapshot().phase, 'waiting-for-reclaim'); assert.deepEqual(assets(run), before);
  assert.equal(run.session.reclaim('p2', 'gamepad-1'), true);
  assert.equal(act(run, 'leave', 'p2'), true); assert.equal(act(run, 'confirm', 'p2'), true);
  assert.equal(run.relay.snapshot().phase, 'ended');
  const terminal = semanticValue({ relay: run.relay.snapshot(), lifecycle: run.session.lifecycle, assets: assets(run) });
  assert.equal(run.session.deviceLost('p2'), false); assert.equal(run.session.reclaim('p1', 'gamepad-0'), false);
  assert.equal(run.session.depart('p1'), false); ticks(run);
  assert.deepEqual(semanticValue({ relay: run.relay.snapshot(), lifecycle: run.session.lifecycle, assets: assets(run) }), terminal);
});

for (const choice of ['accept', 'decline', 'expire']) test(`actual death ${choice} settles the shared personal offer before rotation`, () => {
  const run = setup(2); run.game.run.creditCoins(11); run.session.players[1].run.creditCoins(17);
  run.game.end('Fixture traffic fatality', 'traffic'); ticks(run, 1);
  const p = run.session.players[0]; assert.equal(p.statistics.deaths, 1); assert.ok(p.recovery.offer);
  assert.equal(p.run.wallet, 0); assert.equal(run.session.players[1].run.wallet, 17);
  assert.equal(run.relay.activeSeat, 'p1'); assert.equal(run.relay.snapshot().phase, 'recovery');
  if (choice === 'accept') {
    assert.equal(run.session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
    assert.equal(run.relay.activeSeat, 'p1'); assert.equal(run.relay.snapshot().phase, 'running');
    assert.equal(p.recovery.charge, 'spent'); assert.ok(p.recovery.protectionUntil > run.game.time);
  } else {
    if (choice === 'decline') { run.session.declineRecovery('p1'); ticks(run, 1); } else ticks(run, 1100);
    assert.equal(run.relay.activeSeat, 'p2'); assert.equal(run.relay.snapshot().outcomes.at(-1).outcome, 'dead');
    assert.equal(p.statistics.deaths, 1);
  }
});

const pad = (index, pressed = [], id = `original-${index}`) => ({ index, id, mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0, touched: pressed.includes(i) })) });
test('dead runner device loss freezes its existing offer and original reclaim resumes recovery, not life', () => {
  const run = setup(2); run.game.end('Fixture traffic fatality', 'traffic'); ticks(run, 1);
  const player = run.session.players[0], offer = player.recovery.offer, before = assets(run), time = run.game.time;
  run.relay.disconnect('p1'); ticks(run, 2000);
  assert.equal(run.game.time, time); assert.deepEqual(player.recovery.offer, offer); assert.deepEqual(assets(run), before);
  assert.equal(act(run, 'skip', 'p2'), false, 'another seat cannot skip an unsettled personal death offer');
  assert.equal(run.relay.activeSeat, 'p1'); assert.deepEqual(player.recovery.offer, offer);
  assert.equal(run.relay.reclaim('p1', 'gamepad-9'), false);
  assert.equal(run.relay.reclaim('p1', 'gamepad-0'), true);
  assert.equal(player.participation, 'dead'); assert.equal(run.relay.snapshot().phase, 'recovery');
  assert.equal(run.session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
  assert.equal(player.statistics.deaths, 1); assert.equal(run.relay.activeSeat, 'p1');
});

test('last runner actual death settles once after decline and rejects terminal lifecycle events', () => {
  const run = setup(2); assert.equal(run.session.depart('p2'), true);
  run.game.end('Fixture traffic fatality', 'traffic'); ticks(run, 1);
  assert.equal(run.relay.snapshot().phase, 'recovery'); assert.equal(run.session.declineRecovery('p1'), true);
  assert.equal(run.relay.snapshot().phase, 'ended'); assert.equal(run.relay.snapshot().outcomes.at(-1).outcome, 'dead');
  const before = semanticValue({ state: run.relay.snapshot(), assets: assets(run), time: run.game.time });
  run.relay.disconnect('p1'); assert.equal(run.relay.reclaim('p1', 'gamepad-0'), false); ticks(run, 1000);
  assert.deepEqual(semanticValue({ state: run.relay.snapshot(), assets: assets(run), time: run.game.time }), before);
});
test('real device leases reject changed slots, strangers and stale epochs; held reclaim edges never hop', () => {
  const run = setup(2), devices = new Map(); let offered, reclaimed = 0;
  const router = new GamepadRouter({ context: () => `${run.relay.snapshot().phase}:${run.relay.snapshot().revision}`,
    dispatch: action => run.session.dispatch(action), acceptsDevice: () => false,
    lifecycle: event => { if (event.type === 'seen') devices.set(event.device.index, event.device); if (event.type === 'disconnected' && event.seat) run.session.deviceLost(event.seat); },
    requestReclaim: (device, seat, input) => { if (!input.actions.includes('confirm')) return; offered = device; if (router.canReclaim(device, seat) && run.relay.reclaim(seat, device.deviceId)) { assert.equal(router.reclaim(device), true); reclaimed++; } },
  });
  const send = pads => router.receive({ available: true, focused: true, pads }, 100);
  send([pad(0), pad(1)]); router.assign(devices.get(0), 'p1'); router.assign(devices.get(1), 'p2');
  const stale = devices.get(0); send([pad(1)]);
  send([pad(9, [0], 'original-0'), pad(1)]); assert.equal(reclaimed, 0);
  send([pad(0, [0], 'stranger'), pad(1)]); assert.equal(reclaimed, 0);
  send([pad(0, [0]), pad(1)]); assert.equal(reclaimed, 0); assert.equal(router.canReclaim(stale, 'p1'), false);
  send([pad(0), pad(1)]); send([pad(0, [0]), pad(1)]); assert.equal(reclaimed, 1);
  assert.notEqual(offered.epoch, stale.epoch); assert.equal(run.session.players[0].y, 0);
  send([pad(0, [0]), pad(1)]); router.update(1000); assert.equal(run.session.players[0].y, 0);
  router.close();
});

test('a disappearing confirmation actor invalidates the modal and retained pending handoff reclaims once', () => {
  const run = setup(); run.session.deviceLost('p1'); act(run, 'skip', 'p2');
  const stale = { ...run.relay.actionToken('p2'), kind: 'confirm' };
  run.session.deviceLost('p2'); assert.equal(run.relay.snapshot().phase, 'disconnected'); assert.equal(run.relay.command(stale), false);
  assert.equal(run.session.reclaim('p1', 'gamepad-0'), true);
  run.session.dispatch({ seat: 'p1', direction: 'forward' }); ticks(run);
  assert.equal(run.relay.snapshot().phase, 'handoff'); const ticket = run.relay.confirmation();
  run.session.deviceLost('p1'); assert.equal(run.session.reclaim('p1', 'gamepad-0'), true);
  assert.equal(run.relay.snapshot().phase, 'handoff'); assert.equal(run.relay.confirm(ticket), false);
  assert.equal(run.relay.confirm(run.relay.confirmation()), true); assert.equal(run.relay.activeSeat, 'p3');
});

test('inactive leave archives immutable contribution without releasing the frozen roster', () => {
  const run = setup(); const before = assets(run); act(run, 'leave', 'p2'); act(run, 'confirm', 'p2');
  assert.equal(run.session.players.length, 3); assert.equal(run.session.players[1].participation, 'departed');
  assert.equal(run.relay.activeSeat, 'p1'); assert.deepEqual(assets(run), before);
  const archived = run.session.contributions[0]; assert.equal(archived.seat, 'p2'); assert.ok(Object.isFrozen(archived.statistics));
  assert.equal(run.session.reclaim('p2', 'gamepad-1'), false);
});

function installRuntime() {
  let pads = [], themeChanged = () => {}; const listeners = new Set();
  window.relayFixture = { emit(next) { pads = next; for (const listener of listeners) listener({ available: true, focused: true, pads }); }, theme(light) { themeChanged({ colors: light ? { background: '#f6f1e5', text: '#24362d', primary: '#4b7b61' } : { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }); } };
  window.napplet = {
    storage: { async getItem() { return JSON.stringify({ mode: 'stroll', muted: true, selected: 'butter', travelerVersion: 2 }); }, async setItem() {} },
    theme: { async get() { return { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }; }, onChanged(listener) { themeChanged = listener; return { close() {} }; } },
    keys: { async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; }, onAction() { return { close() {} }; }, unregisterAction() {} },
    gamepad: { get available() { return true; }, get focused() { return true; }, getGamepads() { return pads; }, onChange(listener) { listeners.add(listener); return { close() { listeners.delete(listener); } }; } },
  };
}
async function browserRun(run) {
  const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const harness = `<!doctype html><iframe sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>document.querySelector('iframe').srcdoc=${JSON.stringify(built.replace('<head>', `<head><script>(${installRuntime.toString()})();</script>`)).replaceAll('<', '\\u003c')};</script>`;
  const server = createServer((_, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage({ viewport: { width: 930, height: 630 }, reducedMotion: 'reduce' }); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`); const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    await frame.locator('#play').waitFor(); await run({ page, frame, send: pads => frame.evaluate(pads => window.relayFixture.emit(pads), pads) }); assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
async function assertBoardContrast(frame) {
  const failures = await frame.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const context = canvas.getContext('2d');
    const luminance = color => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      const values = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    };
    const board = document.querySelector('#survive-lifecycle-board') ?? document.querySelector('#relay-handoff');
    return [...board.querySelectorAll('button,h2,p')].filter(node => node.getClientRects().length).flatMap(node => {
      let background = node, color = getComputedStyle(background).backgroundColor;
      while ((color === 'transparent' || color === 'rgba(0, 0, 0, 0)') && background.parentElement) { background = background.parentElement; color = getComputedStyle(background).backgroundColor; }
      const a = luminance(getComputedStyle(node).color), b = luminance(color), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      return ratio < 4.5 ? [{ text: node.textContent, ratio }] : [];
    });
  });
  assert.deepEqual(failures, []);
}

test('built Relay routes original reclaim, fresh skip/cancel, deliberate leave and terminal UI', { timeout: 90_000 }, async () => browserRun(async ({ page, frame, send }) => {
  await frame.locator('#local-play').click(); await frame.locator('#session-roster [data-seat="p2"]').click();
  await frame.getByRole('button', { name: 'Leave this seat', exact: true }).click();
  await send([pad(0)]); await send([pad(0, [0])]); await send([pad(0)]);
  await frame.locator('#relay-play').click(); await frame.locator('#relay-tiles').fill('1'); await frame.locator('#local-session-start').click();
  await send([]); await page.waitForTimeout(60); assert.equal(await frame.locator('#relay-handoff').count(), 0, 'inactive loss is not a modal');
  await send([pad(0, [0])]); assert.equal(await frame.locator('#survive-lifecycle-board').count(), 0, 'held reconnect cannot reclaim');
  await send([pad(0)]); await send([pad(0, [0])]); await frame.getByRole('heading', { name: /Continue as/ }).waitFor();
  await send([pad(0)]); await send([pad(0, [0])]); await frame.waitForFunction(() => !document.querySelector('#survive-lifecycle-board'));
  await send([pad(0)]); await frame.locator('#scene').focus(); await page.keyboard.press('w');
  await frame.getByRole('heading', { name: 'Leg 1 complete' }).waitFor(); await send([pad(0)]); await send([pad(0, [0])]);
  await frame.waitForFunction(() => !document.querySelector('#relay-handoff')); await send([]);
  await frame.getByRole('heading', { name: 'P2 controller disconnected.' }).waitFor();
  async function capture(name) {
    for (const light of [false, true]) for (const [width, height] of [[240,240],[320,560],[900,600],[1000,280],[2400,1200]]) {
      await page.setViewportSize({ width: width + 30, height: height + 30 });
      await page.locator('iframe').evaluate((node, [w,h]) => { node.style.width = `${w}px`; node.style.height = `${h}px`; }, [width,height]);
      await frame.evaluate(light => window.relayFixture.theme(light), light); await page.waitForTimeout(30);
      const invalid = await frame.evaluate(() => [...(document.querySelector('#survive-lifecycle-board') ?? document.querySelector('#relay-handoff')).querySelectorAll('button')].filter(node => node.getClientRects().length).filter(node => {
        const r = node.getBoundingClientRect();
        if (r.width < 44 || r.height < 44 || r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || !node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))) return true;
        for (let parent = node.parentElement; parent; parent = parent.parentElement) { const style = getComputedStyle(parent); if (!/(hidden|clip|auto|scroll)/.test(style.overflow)) continue; const bounds = parent.getBoundingClientRect(); if (r.left < bounds.left - 1 || r.right > bounds.right + 1 || r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1) return true; }
        return false;
      }).map(node => node.textContent));
      assert.deepEqual(invalid, [], `${name} ${width}x${height}`);
      await assertBoardContrast(frame);
      await page.locator('iframe').screenshot({ path: `/tmp/relay-lifecycle-${name}-${width}x${height}-${light ? 'light' : 'dark'}.png` });
    }
    await page.setViewportSize({ width: 930, height: 630 }); await page.locator('iframe').evaluate(node => { node.style.width = '900px'; node.style.height = '600px'; }); await page.waitForTimeout(30);
  }
  await capture('disconnected');
  await frame.getByRole('button', { name: 'Skip P2', exact: true }).click(); await frame.getByRole('heading', { name: 'Skip P2 this turn?' }).waitFor(); await capture('skip');
  await frame.getByRole('button', { name: 'Back', exact: true }).click(); await frame.getByRole('heading', { name: 'P2 controller disconnected.' }).waitFor();
  await send([pad(0)]); await send([pad(0, [0])]); await frame.getByRole('heading', { name: /Continue as/ }).waitFor(); await capture('reclaim');
  await send([pad(0)]); await send([pad(0, [0])]); await frame.waitForFunction(() => !document.querySelector('#survive-lifecycle-board') && !document.querySelector('#relay-handoff'));
  await send([pad(0)]); await send([pad(0, [3])]); await frame.getByRole('heading', { name: 'Leave Relay as P2?' }).waitFor(); await capture('leave');
  await frame.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await send([pad(0)]); await send([pad(0, [3])]); await frame.getByRole('button', { name: 'Leave Relay', exact: true }).last().click();
  await frame.waitForFunction(() => !document.querySelector('#relay-handoff'));
  await frame.locator('[data-seat="p1"] [data-session-hud="item"]').click(); await frame.getByRole('heading', { name: 'Leave Relay as P1?' }).waitFor();
  await frame.locator('#relay-handoff').getByRole('button', { name: 'Leave Relay', exact: true }).click(); await frame.getByRole('heading', { name: 'No runner remains.' }).waitFor(); await capture('ended');
}));

test('built fresh keyboard skip leaves the original reserved seat waiting after the last connected departure', { timeout: 45_000 }, async () => browserRun(async ({ page, frame, send }) => {
  await frame.locator('#local-play').click(); await frame.locator('#session-roster [data-seat="p2"]').click(); await frame.getByRole('button', { name: 'Leave this seat', exact: true }).click();
  await send([pad(0)]); await send([pad(0, [0])]); await send([pad(0)]); await frame.locator('#relay-play').click(); await frame.locator('#relay-tiles').fill('1'); await frame.locator('#local-session-start').click();
  await frame.locator('#scene').focus(); await page.keyboard.press('w'); await frame.getByRole('heading', { name: 'Leg 1 complete' }).waitFor();
  await send([pad(0)]); await send([pad(0, [0])]); await frame.waitForFunction(() => !document.querySelector('#relay-handoff')); await send([]);
  await frame.getByRole('heading', { name: 'P2 controller disconnected.' }).waitFor();
  await page.keyboard.down('w'); await frame.getByRole('heading', { name: 'Skip P2 this turn?' }).waitFor();
  await page.keyboard.down('w'); assert.equal(await frame.locator('#relay-handoff[data-phase="confirm-skip"]').count(), 1);
  await page.keyboard.up('w'); await page.keyboard.press('d'); await page.keyboard.press('w');
  await frame.waitForFunction(() => !document.querySelector('#relay-handoff'));
  await frame.locator('[data-seat="p1"] [data-session-hud="item"]').click(); await frame.locator('#relay-handoff').getByRole('button', { name: 'Leave Relay', exact: true }).click();
  await frame.getByRole('heading', { name: 'Waiting for a player to reclaim.' }).waitFor();
  for (const light of [false, true]) for (const [width,height] of [[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]]) {
    await page.setViewportSize({ width: width + 30, height: height + 30 }); await page.locator('iframe').evaluate((node, [w,h]) => { node.style.width = `${w}px`; node.style.height = `${h}px`; }, [width,height]);
    await frame.evaluate(light => window.relayFixture.theme(light), light); await page.waitForTimeout(30);
    assert.equal(await frame.locator('#relay-handoff button').count(), 0);
    if (width === 200) assert.equal(await frame.locator('#relay-handoff').isVisible(), false);
    else assert.equal(await frame.getByRole('heading', { name: 'Waiting for a player to reclaim.' }).isVisible(), true);
    await page.locator('iframe').screenshot({ path: `/tmp/relay-lifecycle-waiting-${width}x${height}-${light ? 'light' : 'dark'}.png` });
  }
  await page.setViewportSize({ width: 930, height: 630 }); await page.locator('iframe').evaluate(node => { node.style.width = '900px'; node.style.height = '600px'; }); await page.waitForTimeout(40);
  await send([pad(0, [0])]); assert.equal(await frame.locator('#survive-lifecycle-board').count(), 0);
  await send([pad(0)]); await send([pad(0, [0])]); await frame.getByRole('heading', { name: /Continue as/ }).waitFor();
  await send([pad(0)]); await send([pad(0, [0])]); await frame.waitForFunction(() => !document.querySelector('#relay-handoff') && !document.querySelector('#survive-lifecycle-board'));
}));

for (const choice of ['accept', 'decline', 'expire']) test(`built personal recovery ${choice} uses the production death transaction and visible Relay board`, { timeout: 45_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence);
  try {
    await app.frame.locator('#local-play').click(); await app.frame.locator('#relay-play').click(); await app.frame.locator('#local-session-start').click(); await app.advance(80);
    await app.onSession(function () {
      for (const lane of this.world.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null, actors: undefined });
      this.players[0].run.creditCoins(11); this.players[1].run.creditCoins(17);
      this.world.host.end('Production fixture train contact', 'train'); this.update(1 / 120);
    });
    await app.advance(80); assert.equal(await app.frame.getByRole('heading', { name: 'P1 can return' }).isVisible(), true);
    if (choice === 'accept') {
      await app.key('pause');
      for (const light of [false, true]) for (const [width, height] of [[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]]) {
        await app.resize(width, height);
        await app.frame.evaluate(light => window.marketGameFixture.setTheme({ colors: light ? { background: '#f6f1e5', text: '#24362d', primary: '#4b7b61' } : { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }), light);
        if (width > 200) {
          await assertBoardContrast(app.frame);
          assert.equal(await app.frame.getByRole('heading', { name: 'P1 can return' }).isVisible(), true);
          assert.deepEqual(await app.frame.locator('#relay-handoff button').evaluateAll(nodes => nodes.filter(node => { const r = node.getBoundingClientRect(); return r.width < 44 || r.height < 44 || r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || !node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }).map(node => node.textContent)), []);
        }
        await app.iframe.screenshot({ path: `/tmp/relay-lifecycle-recovery-${width}x${height}-${light ? 'light' : 'dark'}.png` });
      }
      await app.resize(900,600); await app.key('pause');
      await app.frame.getByRole('button', { name: 'Revive P1', exact: true }).click();
    }
    else if (choice === 'decline') await app.frame.getByRole('button', { name: 'Continue without revive', exact: true }).click();
    else {
      await app.key('pause'); const before = await app.onSession(function () { return this.world.time; }); await app.advance(9000);
      assert.equal(await app.onSession(function () { return this.world.time; }), before); assert.equal(await app.frame.getByRole('heading', { name: 'P1 can return' }).isVisible(), true);
      await app.key('pause'); await app.advance(9000);
    }
    await app.advance(80);
    const actual = await app.onSession(function () { return this.players.map(p => ({ state: p.state, participation: p.participation, deaths: p.statistics.deaths, wallet: p.run.wallet, charge: p.recovery.charge, offer: !!p.recovery.offer })); });
    assert.equal(actual[0].deaths, 1); assert.equal(actual[0].wallet, 0); assert.equal(actual[1].wallet, 17);
    assert.equal(actual[0].state, choice === 'accept' ? 'playing' : 'dead'); assert.equal(actual[0].offer, false);
    assert.equal(await app.frame.locator('#relay-handoff').count(), 0);
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});
