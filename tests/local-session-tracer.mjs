import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadSources } from './source-loader.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const mainSource = await readFile(resolve(root, 'src/main.ts'), 'utf8');
const artifact = new URL('../dist/index.html', import.meta.url);
const artifactInputs = [
  'index.html',
  'src/game.ts',
  'src/main.ts',
  'src/render.ts',
  'src/session.ts',
  'src/styles.css',
];
let built;
try {
  const [html, artifactStatus, ...inputStatuses] = await Promise.all([
    readFile(artifact, 'utf8'), stat(artifact), ...artifactInputs.map(input => stat(resolve(root, input))),
  ]);
  assert.ok(artifactStatus.mtimeMs >= Math.max(...inputStatuses.map(input => input.mtimeMs)), 'dist/index.html is stale; run pnpm build before this tracer.');
  built = html;
} catch (error) {
  throw new Error(`Built local-session tracer requires current dist/index.html; run pnpm build first. ${error instanceof Error ? error.message : String(error)}`);
}
assert.ok(['local-play', 'local-session-start', 'local-session-back', 'session-seats'].every(id => built.includes(id)), 'dist/index.html lacks the Local Play tracer controls; run pnpm build after integrating them.');
const sources = await loadSources(['game', 'session']);
after(() => sources.dispose());

test('Local Play remains an explicit, cancelable entry from the solo surface', () => {
  assert.match(mainSource, /Local Play/, 'main must expose an explicit Local Play action');
  assert.match(mainSource, /Back to solo/, 'local setup must offer a route back to unchanged solo play');
});

test('one LocalSession advances one shared world while dispatching two stable seats', async () => {
  const { Game, platformSupports } = await sources.import('game');
  const { LocalSession, SharedWorld, SessionPlayer } = await sources.import('session');
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  game.move('forward');
  game.update(game.rules.movement.hopDuration);

  const cancelled = LocalSession.stage(game, { secondaryCharacterId: 'pip' });
  assert.equal(typeof cancelled.cancel, 'function');
  assert.equal(typeof cancelled.commit, 'function');
  assert.strictEqual(cancelled.cancel(), game, 'Back to solo must retain the original Game instance');
  assert.throws(() => cancelled.commit(), /cancelled LocalSession stage cannot be committed/i, 'cancelled setup cannot later seize the solo run');

  const session = LocalSession.stage(game, { secondaryCharacterId: 'pip' }).commit();
  assert.ok(session instanceof LocalSession);
  assert.ok(session.world instanceof SharedWorld);
  assert.strictEqual(session.world, game.world, 'commit adopts the existing shared world');
  assert.strictEqual(session.players[0], game.player, 'commit adopts the existing primary player');
  assert.equal(session.players.length, 2);
  assert.ok(session.players.every(player => player instanceof SessionPlayer));
  assert.deepEqual(session.players.map(player => player.seat), ['p1', 'p2']);
  assert.deepEqual(session.players.map(player => player.characterId), ['butter', 'pip']);

  const before = session.players.map(player => ({ seat: player.seat, x: player.x, y: player.y }));
  const worldTime = session.world.time;
  session.dispatch({ seat: 'p1', direction: 'forward' });
  session.dispatch({ seat: 'p2', direction: 'forward' });
  session.update(1 / 60);

  assert.equal(session.world.time, worldTime + 1 / 60, 'two seat actions still advance shared time once');
  assert.deepEqual(session.players.map(player => ({ seat: player.seat, x: player.x, y: player.y })), before.map(player => ({ ...player, y: player.y + 1 })), 'the two keyboard seats move different players in the same world tick');

  game.end('P1 terminal regression guard');
  assert.equal(game.state, 'dead');
  assert.equal(session.players[1].state, 'playing');
  const terminalTime = session.world.time;
  const terminalTick = session.world.simulationTick;
  session.update(1 / 60);
  assert.equal(session.world.time, terminalTime + 1 / 60, 'P2 keeps the shared course advancing after P1 reaches a terminal state');
  assert.equal(session.world.simulationTick, terminalTick + 1, 'a terminal primary still permits exactly one world tick for an active P2');

  const highRowGame = new Game(29, 'pond', 'arcade', false, [], 'butter');
  let highRowFound = false;
  for (let row = 100; row < 180 && !highRowFound; row++) {
    highRowGame.maxY = row;
    highRowGame.ensureRows();
    const lane = highRowGame.rows.get(row);
    const next = highRowGame.rows.get(row + 1);
    if (!lane || !next) continue;
    for (const x of [-1, 1, -2, 2]) {
      if (lane.blocked.includes(x) || (lane.kind === 'river' && !platformSupports(lane, x, highRowGame.time)) || next.blocked.includes(x)) continue;
      highRowGame.x = 0; highRowGame.y = row; highRowGame.fromX = 0; highRowGame.fromY = row;
      highRowFound = true;
      break;
    }
  }
  assert.ok(highRowFound, 'fixture must find a high row with a legal P2 forward hop');
  const highRowSession = LocalSession.stage(highRowGame, { secondaryCharacterId: 'pip' }).commit();
  const highRowP2 = highRowSession.players.find(player => player.seat === 'p2');
  assert.ok(highRowP2);
  assert.equal(highRowP2.run.wallet, 0, 'P2 begins with a new personal wallet even when staged far into P1 progress');
  assert.equal(highRowP2.earnedDistance, 0, 'P2 begins with no inherited personal distance');
  assert.equal(highRowSession.dispatch({ seat: 'p2', direction: 'forward' }), true);
  assert.equal(highRowP2.earnedDistance, 1, 'P2 earns its first personal distance from its first high-row hop');

  let riverGame;
  let riverLane;
  for (let seed = 1; seed < 128 && !riverGame; seed++) {
    const candidate = new Game(seed, 'pond', 'arcade', false, [], 'butter');
    const lane = [...candidate.rows.values()].find(value => value.kind === 'river');
    if (lane) { riverGame = candidate; riverLane = lane; }
  }
  assert.ok(riverGame && riverLane, 'fixture must find a generated river lane');
  riverGame.x = 0; riverGame.y = riverLane.index; riverGame.maxY = riverLane.index;
  try {
    const riverP2 = LocalSession.stage(riverGame, { secondaryCharacterId: 'pip' }).session.players.find(player => player.seat === 'p2');
    assert.ok(riverP2);
    assert.equal(platformSupports(riverLane, riverP2.x, riverGame.time), true, 'river staging selects a supported P2 seat');
  } catch (error) {
    assert.match(String(error), /No safe distinct seat/i, 'a river without a supported distinct position fails explicitly');
  }
});

function installLocalRuntime() {
  const fixture = window.localSessionFixture = { hydrated: false, actions: [], handlers: {}, writes: [], unregistered: [] };
  const themeListeners = new Set();
  const currentTheme = { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } };
  window.napplet = {
    storage: {
      async getItem() { fixture.hydrated = true; return JSON.stringify({ mode: 'arcade', coins: 0, runs: 0, muted: true, selected: 'butter', travelerVersion: 2 }); },
      async setItem(key, value) { fixture.writes.push({ key, value }); },
    },
    theme: {
      async get() { return currentTheme; },
      onChanged(listener) { themeListeners.add(listener); return { close() { themeListeners.delete(listener); } }; },
    },
    keys: {
      async registerAction(action) { fixture.actions.push(action); return { actionId: action.id, binding: action.defaultKey }; },
      onAction(id, handler) { fixture.handlers[id] = handler; return { close() { delete fixture.handlers[id]; } }; },
      unregisterAction(id) { fixture.unregistered.push(id); delete fixture.handlers[id]; },
    },
  };
}

const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const injected = `<script>(${installLocalRuntime.toString()})();</script>`;
const harness = `<!doctype html><body style="margin:0"><iframe title="Local session tracer" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>document.querySelector('iframe').srcdoc=${json(built.replace('<head>', '<head>' + injected))};</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });

function seatRows(frame) {
  return frame.locator('#session-seats [data-seat]').evaluateAll(nodes => nodes.map(node => {
    const text = node.textContent ?? '';
    return { seat: node.dataset.seat, text, y: Number(text.split('·').at(-1)?.trim()) };
  }));
}

test('the built opaque iframe drives actual Local Play setup and shell keyboard actions', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const serverPort = server.address().port;
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:${serverPort}`);
    const iframe = page.locator('iframe');
    const frame = await (await iframe.elementHandle()).contentFrame();
    assert.ok(frame);
    assert.equal(await iframe.getAttribute('sandbox'), 'allow-scripts');
    assert.equal(await frame.evaluate(() => location.origin), 'null');
    await frame.waitForFunction(() => window.localSessionFixture?.hydrated && typeof window.localSessionFixture.handlers['puddlehop.forward-w'] === 'function', undefined, { timeout: 8_000 }).catch(() => { throw new Error(errors.join('\n') || 'built iframe did not boot its injected NIP-5D runtime'); });
    const actions = await frame.evaluate(() => window.localSessionFixture.actions);
    assert.equal(actions.find(action => action.id === 'puddlehop.forward-w')?.defaultKey, 'w');
    assert.equal(actions.find(action => action.id === 'puddlehop.forward')?.defaultKey, 'ArrowUp');

    await frame.locator('#local-play').click();
    assert.equal(await frame.locator('#local-session-setup').isHidden(), false);
    await frame.locator('#local-session-back').click();
    assert.equal(await frame.locator('#local-session-setup').isHidden(), true, 'Back to solo cancels real staged setup');

    await frame.locator('#local-play').click();
    await frame.locator('#local-session-start').click();
    await frame.locator('#session-seats [data-seat="p1"]').waitFor();
    const before = await seatRows(frame);
    assert.deepEqual(before.map(player => player.seat), ['p1', 'p2']);
    assert.ok(before.every(player => /^P[12] /.test(player.text)), 'the actual HUD retains marker and P-number labels');

    const shellAction = id => frame.evaluate(id => window.localSessionFixture.handlers[id](), id);
    await shellAction('puddlehop.forward-w');
    await shellAction('puddlehop.forward');
    await frame.waitForFunction(() => [...document.querySelectorAll('#session-seats [data-seat]')].every(node => Number(node.textContent?.split('·').at(-1)?.trim()) === 1));
    const after = await seatRows(frame);

    assert.deepEqual(after.map(player => player.y), before.map(player => player.y + 1), 'W routes P1 and ArrowUp routes P2 through the real shell action handlers');
    assert.deepEqual(errors, [], 'the built opaque iframe reports no boot errors');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
