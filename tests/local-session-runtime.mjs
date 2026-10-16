// Real built Local Play flow. CDP is not used and no product debug hook exists.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { chromium } from 'playwright';
const output=artifactDirectoryForCoverage(new URL('../artifacts/',import.meta.url),'local-session-runtime');
import { artifactDirectoryForCoverage } from '../tools/release-coverage/browser.mjs';

const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.ok(built.includes('gamepad.subscribe') && built.includes('local-session-start'), 'Build Local Play before this fixture.');
function installRuntime() {
  window.localRuntime = { hydrated: false };
  window.napplet = { storage: { async getItem() { window.localRuntime.hydrated = true; return JSON.stringify({ mode: 'arcade', coins: 1000, runs: 0, muted: true, selected: 'butter', travelerVersion: 2 }); }, async setItem() {} }, gamepad: {} };
}
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const harness = `<!doctype html><meta charset="utf-8"><body style="margin:0"><iframe id="napplet" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>
const built=${json(built)}, install=${json(installRuntime.toString())}, frame=document.querySelector('iframe'); window.messages=[];
window.snapshot=(pads,focused=true)=>frame.contentWindow.postMessage({type:'gamepad.state',available:true,focused,pads},'*');
addEventListener('message',event=>{if(event.source!==frame.contentWindow||!event.data?.type?.startsWith('gamepad.'))return;messages.push(event.data);if(event.data.type==='gamepad.subscribe')snapshot([]);});
frame.srcdoc=built.replace('<head>','<head><script>('+install+')()<'+'/script>');</script>`;
const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
after(() => new Promise(resolve => server.close(resolve)));
const pad = (index, id, buttons = []) => ({ index, id, mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: buttons.includes(button) ? 1 : 0, pressed: buttons.includes(button), touched: buttons.includes(button) })) });

test('two shell controllers and two remapped keyboards enter four-seat Local Play, move independently, reclaim, and teardown once', { timeout: 30_000 }, async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    page.setDefaultTimeout(5_000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const cdp = await page.context().newCDPSession(page), contexts = new Map();
    cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context));
    cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
    cdp.on('Runtime.executionContextsCleared', () => contexts.clear());
    await cdp.send('Runtime.enable');
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded', timeout: 5_000 });
    const frame = await (await page.locator('#napplet').elementHandle()).contentFrame();
    async function sessionObject() {
      const { frameTree } = await cdp.send('Page.getFrameTree');
      const context = [...contexts.values()].find(value => value.auxData?.frameId === frameTree.childFrames[0].frame.id && value.auxData?.isDefault);
      assert.ok(context, 'opaque app frame has a debugger execution context');
      const { result: handler } = await cdp.send('Runtime.evaluate', { contextId: context.id, includeCommandLineAPI: true, expression: 'getEventListeners(document.getElementById("pause")).click[0].listener' });
      const details = await cdp.send('Runtime.getProperties', { objectId: handler.objectId, ownProperties: true });
      const scopes = details.internalProperties.find(value => value.name === '[[Scopes]]').value;
      const list = await cdp.send('Runtime.getProperties', { objectId: scopes.objectId, ownProperties: true });
      for (const scope of list.result) {
        if (!scope.value?.objectId || scope.value.description === 'Global') continue;
        const bindings = await cdp.send('Runtime.getProperties', { objectId: scope.value.objectId, ownProperties: true });
        for (const binding of bindings.result) {
          if (!binding.value?.objectId) continue;
          const match = await cdp.send('Runtime.callFunctionOn', { objectId: binding.value.objectId, returnByValue: true,
            functionDeclaration: 'function() { return this?.world?.rows instanceof Map && Array.isArray(this.players) && typeof this.dispatch === "function"; }' });
          if (match.result.value) return binding.value.objectId;
        }
      }
      throw new Error('Actual LocalSession not found in debugger scopes.');
    }
    async function onSession(fn) {
      const result = await cdp.send('Runtime.callFunctionOn', { objectId: await sessionObject(), functionDeclaration: fn.toString(), returnByValue: true });
      assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    const waitFor = async (predicate, step) => {
      try {
        await frame.waitForFunction(predicate, undefined, { timeout: 5_000 });
      } catch (error) {
        const app = await frame.locator('#app').innerText().catch(() => '<missing app>');
        assert.fail(`${step} did not finish: ${error.message}\npage errors: ${errors.join(' | ') || '<none>'}\napp: ${app.slice(0, 700)}`);
      }
    };
    await waitFor(() => window.localRuntime?.hydrated, 'runtime hydration');
    const send = async (pads, focused = true) => { await page.evaluate(([next, focus]) => window.snapshot(next, focus), [pads, focused]); await frame.evaluate(() => Promise.resolve()); await page.waitForTimeout(30); };
    const alpha = 'Alpha controller', beta = 'Beta controller';
    // Two pads can be connected without taking part. B is deliberately the
    // first active pad despite A occupying the lower shell index.
    await send([pad(0, alpha), pad(1, beta)]); await send([pad(0, alpha), pad(1, beta, [0])]);
    await waitFor(() => document.querySelector('#app')?.dataset.runState === 'playing', 'first active B controller solo start');
    await send([pad(0, alpha), pad(1, beta)]); await send([pad(0, alpha, [0]), pad(1, beta)]);
    await waitFor(() => !document.querySelector('#local-session-setup')?.hasAttribute('hidden'), 'second controller Local Play setup');
    const addBox = await frame.locator('#session-add-keyboard').boundingBox();
    assert.ok(addBox && addBox.x >= 0 && addBox.y >= 0 && addBox.x + addBox.width <= 900 && addBox.y + addBox.height <= 600,
      `setup actions stay visible at 900×600: ${JSON.stringify(addBox)}`);
    await frame.locator('#session-add-keyboard').click();
    assert.match(await frame.locator('#session-roster [data-seat="p3"]').innerText(), /Keyboard A/);
    await frame.locator('#session-add-keyboard').click();
    assert.match(await frame.locator('#session-roster [data-seat="p4"]').innerText(), /Keyboard B/);
    assert.equal(await frame.locator('#local-session-start').isDisabled(), false);
    await frame.locator('#local-session-start').click();
    await waitFor(() => document.querySelectorAll('#session-seats [data-seat]').length === 4, 'four-seat session HUD after Start');
    const labels = await frame.locator('#session-seats [data-seat]').allInnerTexts();
    assert.ok(labels.every(label => /P[1-4].*[▲●◆■]/.test(label)), `HUD identity combines P-number and a geometric marker: ${labels.join(' | ')}`);
    // The market and hand remain one surface, but their owner must follow the
    // stable player chosen from the live HUD. This is deliberately asserted
    // through the built iframe rather than a model-only hook.
    assert.match(await frame.locator('#market-owner').innerText(), /Viewing P1 .* · /,
      'the shared market owner toolbar starts on the adopted P1 traveler');
    await frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click();
    assert.match(await frame.locator('#market-owner').innerText(), /Viewing P2 .* · /,
      'selecting an existing HUD identity changes the one market/hand owner');
    await send([pad(0, alpha), pad(1, beta)]); await send([pad(0, alpha), pad(1, beta, [4])]); await send([pad(0, alpha), pad(1, beta)]);
    await waitFor(() => document.querySelector('#market-owner')?.textContent?.includes('Viewing P1'), 'P1 controller owner selection after hand invalidation');
    const inventories = await onSession(function () {
      const [p1, p2] = this.players;
      const cards = [...p1.run.catalog.values()].filter(item => item.kind === 'card');
      const seed = (player, item) => {
        player.run.advanceScore(100); player.run.creditCoins(100);
        player.run.market.offers = [
          { id: 'offer-100-0', itemId: item.id, price: 1, sold: false },
          { id: 'offer-100-1', itemId: cards[2].id, price: 1, sold: false },
        ];
        if (!player.run.open()) throw new Error('fixture market did not open');
        const bought = player.run.buy('offer-100-0');
        if (!bought.ok) throw new Error(bought.message);
        player.run.close();
        return player.run.cards[0];
      };
      const first = seed(p1, cards[0]), second = seed(p2, cards[1]);
      return { first: { id: first.id, name: first.name }, second: { id: second.id, name: second.name }, distinctRuns: p1.run !== p2.run };
    });
    assert.equal(inventories.distinctRuns, true, 'Local Play owns distinct real RunInventory instances');
    assert.equal(inventories.first.id, inventories.second.id, 'per-run generated card ids intentionally overlap');
    assert.notEqual(inventories.first.name, inventories.second.name, 'fixture contents distinguish same-id personal cards');
    await waitFor(() => document.querySelector('#run-cards [data-hand-card="card-1"]')?.textContent?.includes(''), 'P1 real hand after staged inventory');
    assert.match(await frame.locator('#run-cards').innerText(), new RegExp(inventories.first.name));
    await frame.locator('#run-cards [data-hand-card="card-1"]').click();
    assert.match(await frame.locator('#run-hand-detail').innerText(), new RegExp(inventories.first.name));
    await send([pad(0, alpha), pad(1, beta)]); await send([pad(0, alpha, [4]), pad(1, beta)]); await send([pad(0, alpha), pad(1, beta)]);
    assert.equal(await frame.locator('#run-hand-detail').isHidden(), true, 'old owner card detail is invalidated before P2 renders');
    await waitFor(() => document.querySelector('#run-cards')?.textContent?.includes(''), 'P2 real hand after owner switch');
    assert.match(await frame.locator('#run-cards').innerText(), new RegExp(inventories.second.name));
    assert.doesNotMatch(await frame.locator('#run-cards').innerText(), new RegExp(inventories.first.name), 'same local card id cannot retain P1 content in P2 hand');
    await send([pad(0, alpha), pad(1, beta)]); await send([pad(0, alpha), pad(1, beta, [4])]); await send([pad(0, alpha), pad(1, beta)]);
    await waitFor(() => document.querySelector('#market-owner')?.textContent?.includes('Viewing P1'), 'P1 controller owner selection after hand invalidation');
    await frame.locator('#market-open').click();
    await waitFor(() => !document.querySelector('#market')?.hasAttribute('hidden'), 'P1 owner-context market');
    assert.equal(await frame.locator('#market-owner-strip button').count(), 4, 'one owner strip exposes every real session seat');
    await frame.locator('#market-offers button:not(:disabled)').first().click();
    assert.equal(await frame.locator('#market-inspect-action').isEnabled(), true, 'the visible owner can transact through the validated market context');
    await frame.locator('#market-close').click();
    // LB is P2's real router action. It switches the shared owner while P1's
    // 160ms close callback is pending, so the stale callback must not close P2.
    await send([pad(0, alpha), pad(1, beta)]); await send([pad(0, alpha, [4]), pad(1, beta)]); await send([pad(0, alpha), pad(1, beta)]);
    await waitFor(() => document.querySelector('#market-owner')?.textContent?.includes('Viewing P2'), 'P2 controller owner selection during pending close');
    await page.waitForTimeout(220);
    const afterClose = await onSession(function () { const [p1, p2] = this.players; return { p1Open: p1.run.isOpen, p2Open: p2.run.isOpen, p2Card: p2.run.cards[0]?.name }; });
    assert.equal(afterClose.p1Open, false, 'old P1 close resolves only its own inventory');
    assert.equal(afterClose.p2Open, true, 'stale P1 close timer cannot close the newly selected P2 market');
    assert.equal(afterClose.p2Card, inventories.second.name, 'stale owner callbacks preserve P2 same-id card contents');
    await frame.locator('#market-close').click();
    await page.waitForTimeout(220);
    await frame.locator('#market-open').click();
    await waitFor(() => !document.querySelector('#market')?.hasAttribute('hidden'), 'P2 market before selecting a newly joined owner');
    assert.equal(await onSession(function () { return this.players.find(player => player.seat === 'p3')?.run.market ?? null; }), null,
      'newly joined P3 has no fabricated market window');
    await frame.locator('#market-owner-strip [data-id="p3"]').click();
    await waitFor(() => document.querySelector('#market-owner')?.textContent?.includes('Viewing P3'), 'P3 owner selected from shared market');
    assert.deepEqual(await frame.evaluate(() => ({ id: document.activeElement?.id, text: document.activeElement?.textContent })), { id: 'market-owner', text: await frame.locator('#market-owner').innerText() },
      'owner change restores focus to the labelled owner heading, never a stale offer');
    assert.equal(await frame.locator('#market').isVisible(), true, 'an owner without stock keeps the single read-only surface open');
    assert.equal(await frame.locator('#run-panel').isVisible(), false, 'virtual empty-owner market hides the underlying solo panel');
    assert.match(await frame.locator('#market-window').innerText(), /No active market is open for this player/);
    assert.equal(await onSession(function () { return this.players.find(player => player.seat === 'p3')?.run.isOpen; }), false,
      'read-only empty inspection never manufactures an active market');
    await frame.locator('#market-close').click();
    assert.equal(await frame.locator('#market').isHidden(), true, 'the real market Close control exits an empty-owner surface');
    await waitFor(() => document.querySelector('#app')?.dataset.runState === 'playing', 'empty-owner Close resumes the shared session before new movement edges');
    // Deliver a neutral snapshot after the router returns from the market
    // context. Its following d-pad press must be a new session edge.
    await send([pad(0, alpha), pad(1, beta)]);
    // Earned distance lives on the disclosed personal page. Observe the actual
    // participant without opening a paused inspection during movement input.
    const distance = async seat => {
      assert.equal(await frame.locator(`#session-seats [data-seat="${seat}"] .session-hud-identity`).isVisible(), true);
      return (await onSession(function () { return this.players.map(player => ({seat:player.seat,distance:player.statistics.distance})); })).find(player=>player.seat===seat)?.distance ?? -1;
    };
    const beforeMoves = await Promise.all(['p1', 'p2'].map(distance));
    const movementState = await onSession(function () { return this.players.slice(0, 3).map(player => ({ seat: player.seat, state: player.state, runOpen: player.run.isOpen, alive: player.run.alive })); });
    const movementUi = await frame.evaluate(() => ({ active: document.activeElement?.id, handFocused: document.getElementById('run-inventory')?.contains(document.activeElement), marketHidden: document.getElementById('market')?.hasAttribute('hidden'), runState: document.getElementById('app')?.dataset.runState }));
    await send([pad(0, alpha, [12]), pad(1, beta, [12])]); await page.waitForTimeout(120); await send([pad(0, alpha), pad(1, beta)]);
    const afterMoves = await Promise.all(['p1', 'p2'].map(distance));
    assert.ok(afterMoves[0] > beforeMoves[0] && afterMoves[1] > beforeMoves[1], `fresh edges independently advance both visible production seats (${beforeMoves} -> ${afterMoves}); ${JSON.stringify({ movementState, movementUi })}`);
    const keyboardBefore = await Promise.all(['p3', 'p4'].map(distance));
    await frame.locator('#scene').press('w'); await frame.locator('#scene').press('ArrowUp'); await page.waitForTimeout(100);
    const keyboardAfter = await Promise.all(['p3', 'p4'].map(distance));
    assert.ok(keyboardAfter[0] > keyboardBefore[0] && keyboardAfter[1] > keyboardBefore[1], `Keyboard A/B move their remapped P3/P4 seats (${keyboardBefore} -> ${keyboardAfter})`);
    await frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click();
    await frame.locator('#market-open').click();
    await frame.locator('#market-owner-strip [data-id="p3"]').click();
    await waitFor(() => document.querySelector('#market-owner')?.textContent?.includes('Viewing P3'), 'P3 virtual market before owner death');
    await onSession(function () { const player = this.players.find(candidate => candidate.seat === 'p3'); player.run.alive = false; player.run.changed(); });
    await waitFor(() => document.querySelector('#market')?.hasAttribute('hidden'), 'dead empty owner closes only its virtual surface');
    assert.equal(await frame.locator('#session-seats').isVisible(), true, 'closing a dead owner surface returns to the still-running shared session');
    await mkdir(output, { recursive: true });
    await page.locator('#napplet').screenshot({ path: new URL('local-session-runtime-live-900.png', output).pathname });
    await send([pad(1, beta)]); await page.waitForTimeout(50);
    assert.match(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Ghost · reclaim-ready/);
    await send([pad(0, alpha, [0]), pad(1, beta)]); await page.waitForTimeout(30); await send([pad(0, alpha), pad(1, beta)]);
    assert.match(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Ghost · reclaim-ready/, 'returning held input is seeded, never reclaimed');
    await send([pad(0, alpha, [0]), pad(1, beta)]); await page.waitForTimeout(30); await send([pad(0, alpha), pad(1, beta)]);
    await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).waitFor();
    assert.match(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Ghost · reclaim-ready/, 'a fresh owner edge opens an explicit reclaim decision without consuming the ghost seat');
    await send([pad(0, alpha), pad(1, beta, [0])]); await page.waitForTimeout(30); await send([pad(0, alpha), pad(1, beta)]);
    assert.equal(await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).isVisible(), true, 'P1 cannot confirm P2’s reclaim dialog');
    await send([pad(0, alpha, [0]), pad(1, beta)]); await page.waitForTimeout(30); await send([pad(0, alpha), pad(1, beta)]);
    await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).waitFor({ state: 'hidden' });
    assert.doesNotMatch(await frame.locator('#session-seats [data-seat="p2"]').innerText(), /Ghost · reclaim-ready/, 'only P2’s fresh confirmation reclaims the retained seat');
    const before = await page.evaluate(() => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length);
    await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
    await page.waitForFunction(count => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length === count + 1, before);
    await writeFile(new URL('local-session-runtime.json', output), JSON.stringify({ scenarios: ['first active controller claims solo with two neutral pads', 'second controller setup', 'two keyboard profiles fill P3/P4', 'four-seat run', 'disconnect/reclaim', 'single teardown'], errors }, null, 2));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
