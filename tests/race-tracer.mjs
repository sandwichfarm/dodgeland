import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSources } from './source-loader.mjs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

test('Race completes earned settled movement in one shared world and freezes its result', async () => {
  const sources = await loadSources(['game', 'race']);
  try {
    const { Game } = await sources.import('game');
    const { createRaceSession } = await sources.import('race');
    const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
    const race = createRaceSession(game, { seats: [
      { seat: 'p1', characterId: 'butter', device: 'keyboard-a' },
      { seat: 'p2', characterId: 'pip', device: 'gamepad-0' },
    ], finishTiles: 1, activeSeconds: 30 });
    assert.strictEqual(race.session.world, game.world);
    assert.notStrictEqual(race.session.players[0].run, race.session.players[1].run);
    assert.equal(race.session.dispatch({ seat: 'p2', direction: 'left' }), true);
    assert.equal(race.session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    assert.equal(race.result, undefined, 'airborne movement cannot finish');
    const tick = game.world.simulationTick;
    race.session.update(1 / 120);
    assert.equal(game.world.simulationTick, tick + 1, 'two players advance one world tick');
    for (let i = 0; i < 60; i++) race.session.update(1 / 120);
    assert.equal(race.result, undefined, 'a first finisher does not stop the remaining racer');
    assert.equal(race.session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    assert.equal(race.session.dispatch({ seat: 'p2', direction: 'forward' }), true);
    for (let i = 0; i < 100 && !race.result; i++) race.session.update(1 / 120);
    assert.equal(race.result.outcome, 'finish');
    assert.deepEqual(race.result.winners, ['p1']);
    assert.equal(race.result.descriptor.settings.finishTiles, 1);
    assert.ok(Object.isFrozen(race.result));
    assert.ok(Object.isFrozen(race.result.descriptor.seats));
    const result = race.result, time = game.world.time;
    assert.equal(race.session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    race.session.update(1);
    assert.strictEqual(race.result, result); assert.equal(game.world.time, time);
    assert.equal(race.session.admit({ device: 'gamepad-1', characterId: 'clover' }), false);
  } finally { await sources.dispose(); }
});

function runtime() {
  let pads = []; const listeners = new Set();
  window.raceTransport = next => { pads = next; listeners.forEach(fn => fn({ available: true, focused: true, pads })); };
  window.napplet = {
    storage: { async getItem() { return JSON.stringify({ mode: 'arcade', muted: true, selected: 'butter', travelerVersion: 2 }); }, async setItem() {} },
    theme: { async get() { return { colors: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' } }; }, onChanged() { return { close() {} }; } },
    keys: { async registerAction(action) { return { actionId: action.id, binding: action.defaultKey }; }, onAction() { return { close() {} }; }, unregisterAction() {} },
    gamepad: { get available() { return true; }, get focused() { return true; }, getGamepads() { return pads; }, onChange(fn) { listeners.add(fn); return { close() { listeners.delete(fn); } }; } },
  };
}
const pad = (buttons = [], index = 0) => ({ index, id: `race-${index}`, mapping: 'standard', connected: true, timestamp: 1, axes: [0,0,0,0], buttons: Array.from({ length: 17 }, (_, i) => ({ value: buttons.includes(i) ? 1 : 0, pressed: buttons.includes(i), touched: buttons.includes(i) })) });
test('built opaque iframe Race start consumed, mixed inputs finish, late device stays out, retry returns solo', { timeout: 30000 }, async () => {
  const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const harness = `<!doctype html><iframe sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>document.querySelector('iframe').srcdoc=${JSON.stringify(built.replace('<head>', `<head><script>(${runtime.toString()})();</script>`)).replaceAll('<', '\\u003c')};</script>`;
  const server = createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(harness); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage({ viewport: { width: 940, height: 640 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    const send = pads => frame.evaluate(next => window.raceTransport(next), pads);
    await frame.locator('#local-play').click();
    await frame.locator('#session-roster [data-seat="p2"]').click();
    await frame.getByRole('button', { name: 'Leave this seat', exact: true }).click();
    await send([pad()]); await send([pad([0])]); await send([pad()]);
    await frame.locator('#race-play').click();
    assert.equal(await frame.locator('#race-finish').inputValue(), '500');
    assert.equal(await frame.locator('#race-time').inputValue(), '180');
    await frame.locator('#race-finish').fill('1'); await frame.locator('#race-time').fill('30');
    await frame.locator('#race-finish').fill('1.5');
    assert.equal(await frame.locator('#local-session-start').isDisabled(), true);
    assert.equal(await frame.locator('#race-finish').evaluate(node => node === document.activeElement), true);
    assert.equal(await frame.locator('#race-time').inputValue(), '30');
    assert.equal(await frame.locator('#race-setup-error').textContent(), 'Choose 1–9999 whole finish tiles.');
    await frame.locator('#race-finish').fill('1');
    await frame.locator('#local-session-start').focus(); await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    assert.equal(await frame.locator('#race-results-heading').count(), 0, 'start did not hop');
    await send([pad(), pad([],1)]); await send([pad(),pad([0],1)]); await send([pad(),pad([],1)]);
    assert.equal(await frame.locator('#local-session-setup').isVisible(), false);
    assert.equal(await frame.locator('#session-seats [data-seat]').count(), 2);
    await send([pad([14])]); await send([pad()]);
    await frame.locator('#scene').focus(); await page.keyboard.press('w');
    await page.waitForTimeout(400);
    assert.equal(await frame.locator('#race-results-heading').count(), 0, 'remaining racer continues');
    await send([pad([12])]); await send([pad()]);
    await frame.getByRole('heading', { name: 'Race complete.', exact: true }).waitFor();
    assert.match(await frame.locator('#survive-results-root').textContent(), /Winner P1/);
    await page.screenshot({ path: '/tmp/down-to-duck-05-01-race-result.png' });
    await frame.getByRole('button', { name: 'Hop again', exact: true }).click();
    await frame.locator('#local-play').click(); await frame.locator('#local-session-back').click();
    await frame.locator('#play').click();
    assert.equal(await frame.locator('#session-seats').isVisible(), false);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});

test('settings and unique roster validate atomically; locked roster captures schema and stable order for 2/3/4 seats', async () => {
  const sources = await loadSources(['game','race','run-seed']);
  try {
    const { Game } = await sources.import('game');
    const { createRunSeed } = await sources.import('run-seed');
    const { validateRaceSetup, createRaceSession, RACE_DEFAULTS } = await sources.import('race');
    const seats = ['butter','pip','sunny','petal'].map((characterId,i) => ({ seat: `p${i+1}`, characterId, device: i < 2 ? `keyboard-${i ? 'b':'a'}` : `gamepad-${i-2}` }));
    const base = { seats: seats.slice(0,2) };
    assert.deepEqual(validateRaceSetup(base).settings, RACE_DEFAULTS);
    for (const key of ['finishTiles','activeSeconds']) for (const value of [NaN, Infinity, -1, 0, 1.5, null, true, {}, '', '1e2', ' 50', key === 'finishTiles' ? 10000 : 29, key === 'finishTiles' ? 10000 : 3601]) {
      const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
      const world = game.world, player = game.player, rows = [...world.rows];
      assert.throws(() => createRaceSession(game, { ...base, [key]: value }));
      assert.strictEqual(game.world, world); assert.strictEqual(game.player, player); assert.equal(game.state, 'ready'); assert.deepEqual([...world.rows], rows);
    }
    for (const proposal of [{ ...base, surprise: 1 }, { seats: [] }, { seats: seats.slice(0,1) }, { seats: [...seats,seats[0]] }, { seats: [seats[0], { ...seats[1], characterId: 'butter' }] }, { seats: [seats[0], { ...seats[1], disconnected: true }] }, { seats: [seats[0], { ...seats[1], device: 'keyboard-a' }] }, { seats: [seats[0], { ...seats[1], device: { toString: () => 'keyboard-b' } }] }]) assert.throws(() => validateRaceSetup(proposal));
    for (const count of [2,3,4]) {
      const seed = createRunSeed(113, 'pond', 'arcade', false, 3);
      const input = seats.slice(0,count).map(p => ({...p})).reverse();
      const race = createRaceSession(new Game(seed, 'pond', 'arcade', false, [], 'butter'), { seats: input, finishTiles: 9999, activeSeconds: 3600 });
      assert.deepEqual(race.descriptor.seats.map(p => p.seat), seats.slice(0,count).map(p => p.seat));
      assert.deepEqual(race.descriptor.runSeed, seed);
      assert.ok(Object.isFrozen(race.descriptor.runSeed));
      input[0].characterId = 'changed';
      assert.notEqual(race.descriptor.seats.at(-1).characterId, 'changed');
      input[0].characterId = seats[count-1].characterId;
      assert.equal(race.session.admit({ device: 'gamepad-9', characterId: 'clover' }), false);
      assert.equal(race.session.players.length, count);
    }
  } finally { await sources.dispose(); }
});

test('forced placement cannot finish or credit personal distance in the production Race', async () => {
  const sources = await loadSources(['game','race']);
  try {
    const { Game } = await sources.import('game'), { createRaceSession } = await sources.import('race');
    const race = createRaceSession(new Game(113,'pond','arcade',false,[],'butter'), { seats: [{seat:'p1',characterId:'butter',device:'keyboard-a'},{seat:'p2',characterId:'pip',device:'keyboard-b'}], finishTiles:1 });
    const player = race.session.players[1], before = [player.personalScore, player.completedForwardTiles, player.powerRemaining, player.recovery.personalHighWater];
    assert.equal(race.session.placeTurnPosition('p2',{x:0,y:1}), true);
    race.session.update(1/120);
    assert.equal(race.isFinished('p2'), false); assert.equal(race.result, undefined);
    assert.deepEqual([player.personalScore, player.completedForwardTiles, player.powerRemaining, player.recovery.personalHighWater], before);
  } finally { await sources.dispose(); }
});
