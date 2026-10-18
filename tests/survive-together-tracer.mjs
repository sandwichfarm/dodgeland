import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test, { after } from 'node:test';
import { chromium } from 'playwright';
import { loadSources } from './source-loader.mjs';
import { artifactForCoverage, registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';

const sources = await loadSources(['game', 'mode-rules', 'session', 'survive-together']);
after(() => sources.dispose());

test('Survive Together adopts a progressed Arcade run and safely joins a unique second player', async () => {
  const { Game } = await sources.import('game');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { LocalSession } = await sources.import('session');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');

  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  game.move('forward');
  game.update(game.rules.movement.hopDuration);
  const before = {
    world: game.world,
    player: game.player,
    run: game.run,
    time: game.time,
    seed: game.seed,
    x: game.x,
    y: game.y,
  };

  const definition = createSurviveTogetherDefinition(SOLO_ARCADE_MODE);
  const stage = LocalSession.stage(game, { roster: [], primaryDevice: 'gamepad-1', mode: definition });
  assert.strictEqual(stage.cancel(), game, 'cancel must leave the live solo owner in place');
  assert.strictEqual(game.world, before.world);
  assert.strictEqual(game.player, before.player);
  assert.equal(game.player.device, 'keyboard-a', 'cancelling a staged controller owner restores the solo device identity');
  assert.strictEqual(game.run, before.run);
  assert.deepEqual({ time: game.time, seed: game.seed, x: game.x, y: game.y }, { time: before.time, seed: before.seed, x: before.x, y: before.y });

  const emptyStage = LocalSession.stage(game, { roster: [], mode: definition });
  const promotedStage = LocalSession.stage(game, { roster: [], primaryDevice: 'gamepad-1', mode: definition });
  emptyStage.cancel();
  const promotedSession = promotedStage.commit();
  assert.equal(promotedSession.players[0]?.device, 'gamepad-1', 'commit reapplies the selected P1 device after cancelling a prior setup stage');
  assert.ok(game.worldExtensionSnapshot(), 'a committed Survive session owns the one live world extension');
  promotedSession.stop();
  assert.equal(game.worldExtensionSnapshot(), undefined, 'stopping the abandoned committed session releases its world extension before a new adoption');

  const session = LocalSession.stage(game, { roster: [], mode: definition }).commit();
  assert.strictEqual(session.world, before.world, 'commit retains the original world');
  assert.strictEqual(session.players[0], before.player, 'commit retains the original player record');
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'pip' }), true, 'a fresh unique player joins only after safe placement succeeds');
  assert.deepEqual(session.players.map(player => player.seat), ['p1', 'p2']);
  assert.deepEqual(session.players.map(player => player.characterId), ['butter', 'pip']);
  assert.equal(session.admit({ device: 'keyboard-c', characterId: 'pip' }), false, 'a duplicate character never reserves a seat');
  assert.equal(session.players.length, 2, 'a rejected admission leaves the live roster unchanged');

  const worldTime = session.world.time;
  assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), true);
  session.update(1 / 60);
  assert.equal(session.world.time, worldTime + 1 / 60, 'both seats share exactly one world tick');
});

test('the same Survive Together composition accepts Flow rules without core mode selection', async () => {
  const { Game } = await sources.import('game');
  const { SOLO_STROLL_MODE } = await sources.import('mode-rules');
  const { LocalSession } = await sources.import('session');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');

  const game = new Game(29, 'pond', 'stroll', false, [], 'butter');
  const session = LocalSession.stage(game, { roster: [], mode: createSurviveTogetherDefinition(SOLO_STROLL_MODE) }).commit();
  assert.equal(session.admit({ device: 'keyboard-b', characterId: 'pip' }), true);
  assert.equal(session.definition.rules, SOLO_STROLL_MODE.rules, 'the composition keeps the stored Flow rules intact');
  assert.equal(session.players.length, 2);
});

function installSurviveRuntime(mode = 'arcade') {
  const listeners = new Set();
  let pads = [];
  window.surviveFixture = {
    emit(next) { pads = next; for (const listener of listeners) listener({ available: true, focused: true, pads }); },
  };
  window.napplet = {
    storage: { async getItem() { return JSON.stringify({ mode, muted: true, selected: 'butter', travelerVersion: 2 }); }, async setItem() {} },
    theme: { async get() { return { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }; }, onChanged() { return { close() {} }; } },
    keys: { async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; }, onAction() { return { close() {} }; }, unregisterAction() {} },
    gamepad: { get available() { return true; }, get focused() { return true; }, getGamepads() { return pads; }, onChange(listener) { listeners.add(listener); return { close() { listeners.delete(listener); } }; } },
  };
}

const pad = (index, id, buttons = []) => ({ index, id, mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: buttons.includes(button) ? 1 : 0, pressed: buttons.includes(button), touched: buttons.includes(button) })) });

test('the muted opaque iframe consumes a live second-controller edge, cancels unchanged, then commits two players', { timeout: 30_000 }, async () => {
  const built = await readFile(artifactForCoverage(new URL('../dist/index.html', import.meta.url)), 'utf8');
  assert.match(built, /survive-together|Play together\?/, 'run pnpm build after wiring Survive Together');
  const setup = `<script>(${installSurviveRuntime.toString()})('arcade');</script>`;
  const harness = `<!doctype html><iframe sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>document.querySelector('iframe').srcdoc=${JSON.stringify(built.replace('<head>', '<head>' + setup)).replaceAll('<', '\\u003c')};</script>`;
  const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  let frame;
  const identity = { suite: process.argv[1], scenario: 'survive-arcade-adoption', frame: 'opaque-app', generation: 0, scope: 'current' };
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    registerRealm(page, identity);
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    assert.ok(frame);
    await frame.locator('#play').waitFor();
    const send = pads => frame.evaluate(next => window.surviveFixture.emit(next), pads);
    const neutral = [pad(0, 'alpha'), pad(1, 'beta')];
    await send(neutral); await send([pad(0, 'alpha', [0]), pad(1, 'beta')]); await send(neutral);
    await frame.waitForFunction(() => document.querySelector('#app')?.dataset.runState === 'playing');
    await send([pad(0, 'alpha', [12]), pad(1, 'beta')]); await send(neutral);
    await frame.waitForFunction(() => Number(document.querySelector('#score')?.textContent ?? 0) > 0);
    const before = await frame.locator('#score').textContent();
    assert.ok(Number(before) > 0, 'the Arcade adoption begins from a progressed live run');
    await send([pad(0, 'alpha'), pad(1, 'beta', [0])]); await send(neutral);
    await frame.waitForFunction(() => !document.querySelector('#local-session-setup')?.hasAttribute('hidden'));
    assert.equal(await frame.locator('#local-session-heading').textContent(), 'Play together?');
    assert.equal(await frame.locator('#local-session-back').textContent(), 'Keep playing solo');
    assert.equal(await frame.evaluate(() => document.activeElement?.id), 'local-session-back', 'preserving a solo run makes the safe cancel action the initial focus');
    await frame.locator('#local-session-back').click();
    assert.equal(await frame.locator('#score').textContent(), before, 'cancel leaves the progressed solo run unchanged');
    // Cancelling restores the solo controller lease. A neutral snapshot must
    // seed that restored context before the next deliberate join edge.
    await send(neutral); await page.waitForTimeout(40);
    await send([pad(0, 'alpha'), pad(1, 'beta', [0])]); await send(neutral);
    await frame.locator('#local-session-start').click();
    await frame.waitForFunction(() => document.querySelectorAll('#session-seats [data-seat]').length === 2);
    assert.equal(await frame.locator('#score').textContent(), before, 'commit preserves the live solo score');
    assert.deepEqual(await frame.locator('#session-seats [data-seat]').evaluateAll(nodes => nodes.map(node => node.dataset.seat)), ['p1', 'p2']);
    const threeNeutral = [pad(0, 'alpha'), pad(1, 'beta'), pad(2, 'gamma')];
    await send(threeNeutral); await send([pad(0, 'alpha'), pad(1, 'beta'), pad(2, 'gamma', [0])]); await send(threeNeutral);
    await frame.waitForFunction(() => !document.querySelector('#local-session-setup')?.hasAttribute('hidden'));
    assert.equal(await frame.locator('#local-session-heading').textContent(), 'Join this run');
    assert.equal(await frame.locator('#local-session-start').textContent(), 'Join as P3');
    await frame.locator('#local-session-back').click();
    assert.equal(await frame.locator('#session-seats [data-seat]').count(), 2, 'declining a live join never creates a player');
    await send(threeNeutral); await page.waitForTimeout(40);
    await send([pad(0, 'alpha'), pad(1, 'beta'), pad(2, 'gamma', [0])]); await send(threeNeutral);
    await frame.locator('#local-session-start').click();
    await frame.waitForFunction(() => document.querySelectorAll('#session-seats [data-seat]').length === 3);
    assert.deepEqual(await frame.locator('#session-seats [data-seat]').evaluateAll(nodes => nodes.map(node => node.dataset.seat)), ['p1', 'p2', 'p3']);
    assert.deepEqual(errors, []);
  } finally {
    try { if (frame) await collectRealm(frame, identity); }
    finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
  }
});

test('the muted opaque iframe joins a progressed Flow run without replacing its run state', { timeout: 30_000 }, async () => {
  const built = await readFile(artifactForCoverage(new URL('../dist/index.html', import.meta.url)), 'utf8');
  const setup = `<script>(${installSurviveRuntime.toString()})('stroll');</script>`;
  const harness = `<!doctype html><iframe sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>document.querySelector('iframe').srcdoc=${JSON.stringify(built.replace('<head>', '<head>' + setup)).replaceAll('<', '\\u003c')};</script>`;
  const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  let frame;
  const identity = { suite: process.argv[1], scenario: 'survive-flow-adoption', frame: 'opaque-app', generation: 0, scope: 'current' };
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    registerRealm(page, identity);
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    assert.ok(frame);
    await frame.locator('#play').waitFor();
    const send = pads => frame.evaluate(next => window.surviveFixture.emit(next), pads);
    const neutral = [pad(0, 'alpha'), pad(1, 'beta')];
    await send(neutral); await send([pad(0, 'alpha', [0]), pad(1, 'beta')]); await send(neutral);
    await frame.waitForFunction(() => document.querySelector('#app')?.dataset.runState === 'playing');
    await send([pad(0, 'alpha', [12]), pad(1, 'beta')]); await send(neutral);
    await frame.waitForFunction(() => Number(document.querySelector('#score')?.textContent ?? 0) > 0);
    const before = await frame.locator('#score').textContent();
    assert.ok(Number(before) > 0, 'the Flow adoption begins from a progressed live run');
    await send([pad(0, 'alpha'), pad(1, 'beta', [0])]); await send(neutral);
    await frame.waitForFunction(() => !document.querySelector('#local-session-setup')?.hasAttribute('hidden'));
    assert.equal(await frame.locator('#local-session-heading').textContent(), 'Play together?');
    assert.equal(await frame.locator('#local-session-back').textContent(), 'Keep playing solo');
    assert.equal(await frame.evaluate(() => document.activeElement?.id), 'local-session-back');
    await frame.locator('#local-session-start').click();
    await frame.waitForFunction(() => document.querySelectorAll('#session-seats [data-seat]').length === 2);
    assert.equal(await frame.locator('#score').textContent(), before, 'Flow keeps its live score when the new player commits');
    assert.deepEqual(await frame.locator('#session-seats [data-seat]').evaluateAll(nodes => nodes.map(node => node.dataset.seat)), ['p1', 'p2']);
    assert.deepEqual(errors, []);
  } finally {
    try { if (frame) await collectRealm(frame, identity); }
    finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
  }
});
