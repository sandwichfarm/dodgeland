// Source-bound release evidence integrity and actual normal-build acquisition.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => assert.match(value, /^[a-f0-9]{64}$/);
const nonempty = value => assert.ok(typeof value === 'string' && value.trim());
const unique = (rows, key) => assert.equal(new Set(rows.map(key)).size, rows.length, 'Duplicate evidence identity');

function rectangle(value) {
  assert.ok(value && ['left', 'top', 'right', 'bottom'].every(key => Number.isFinite(value[key])));
  assert.ok(value.left < value.right && value.top < value.bottom);
}
export function clearanceAtLeast8(a, b) {
  rectangle(a); rectangle(b);
  return a.right + 8 <= b.left || b.right + 8 <= a.left || a.bottom + 8 <= b.top || b.bottom + 8 <= a.top;
}

const identityTuple = capture => [capture.mode, capture.base, capture.state, capture.frame.width, capture.frame.height,
  capture.theme, capture.motion, capture.participant];
function compare(a, b) {
  const left = identityTuple(a), right = identityTuple(b);
  for (let index = 0; index < left.length; index++) {
    if (left[index] === right[index]) continue;
    return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}
export const canonicalCaptures = captures => [...captures].sort(compare);

function pngDimensions(bytes) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length >= 33, 'Missing/truncated PNG bytes');
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(8), 13); assert.equal(bytes.subarray(12, 16).toString(), 'IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function checkGeometry(geometry) {
  assert.equal(geometry.measured, true); assert.equal(geometry.minimumCssPixels, 8);
  assert.ok(Array.isArray(geometry.actors) && geometry.actors.length > 0, 'Actual actor footprint required');
  assert.ok(Array.isArray(geometry.panels) && geometry.panels.length > 0, 'Visible opaque panel footprint required');
  const parts = [];
  for (const actor of geometry.actors) {
    nonempty(actor.id); assert.ok(Array.isArray(actor.parts) && actor.parts.length > 0);
    assert.ok(actor.parts.some(part => part.kind === 'body'));
    assert.ok(actor.parts.some(part => part.kind === 'nameplate'));
    for (const part of actor.parts) { rectangle(part.rect); parts.push({ actor: actor.id, ...part }); }
  }
  for (const label of geometry.worldLabels ?? []) { nonempty(label.text); rectangle(label.rect); parts.push({ actor: label.text, ...label }); }
  const collisions = [];
  for (const part of parts) for (const panel of geometry.panels) {
    nonempty(panel.name); rectangle(panel.rect);
    if (!clearanceAtLeast8(part.rect, panel.rect)) collisions.push({ actor: part.actor, kind: part.kind, panel: panel.name });
  }
  assert.deepEqual(collisions, [], 'Actual recorded footprints require inclusive8px clearance');
  assert.deepEqual(geometry.collisions, collisions, 'Declared clearance summary must agree with recorded geometry');
}

export async function validateVisualManifest(manifest, { artifactHash, sourceHashes, requiredCaptureIds, readImage }) {
  assert.equal(manifest.schema, 'release-visual-evidence-1'); digest(artifactHash);
  assert.equal(manifest.normalArtifactHash, artifactHash); assert.deepEqual(manifest.sourceHashes, sourceHashes);
  assert.ok(Object.keys(sourceHashes).length > 0); Object.values(sourceHashes).forEach(digest);
  assert.ok(Array.isArray(manifest.captures) && manifest.captures.length > 0);
  assert.ok(Array.isArray(requiredCaptureIds) && requiredCaptureIds.length > 0);
  unique(manifest.captures, capture => capture.id);
  unique(manifest.captures, capture => capture.image);
  unique(manifest.captures, capture => JSON.stringify(identityTuple(capture)));
  assert.equal(new Set(requiredCaptureIds).size, requiredCaptureIds.length);
  for (const id of requiredCaptureIds) assert.ok(manifest.captures.some(capture => capture.id === id), `Missing required capture ${id}`);
  for (const capture of manifest.captures) {
    nonempty(capture.id); nonempty(capture.mode); nonempty(capture.base); nonempty(capture.state); nonempty(capture.participant);
    assert.ok(['dark', 'light'].includes(capture.theme)); assert.ok(['full', 'reduced'].includes(capture.motion));
    assert.ok(Number.isSafeInteger(capture.frame.width) && capture.frame.width > 0);
    assert.ok(Number.isSafeInteger(capture.frame.height) && capture.frame.height > 0);
    assert.match(capture.image, /^docs\/release-evidence\/images\/[a-z0-9-]+\.png$/);
    digest(capture.imageSha256); assert.equal(capture.normalArtifactHash, artifactHash);
    assert.deepEqual(capture.sourceHashes, sourceHashes);
    assert.ok(['public-input', 'component-model', 'arranged-layout'].includes(capture.acquisition.kind));
    nonempty(capture.acquisition.commandId); assert.equal(capture.acquisition.terminalExit, 0);
    assert.equal(capture.acquisition.actualModeAsserted, true);
    const bytes = await readImage(capture.image); assert.equal(sha(bytes), capture.imageSha256);
    assert.deepEqual(pngDimensions(bytes), capture.frame);
    if (capture.clearance) checkGeometry(capture.clearance);
    else assert.notEqual(capture.state, 'hud', 'HUD tracer requires actual recorded geometry');
  }
  return { captures: manifest.captures.length, completeRequiredSet: true,
    ordering: canonicalCaptures(manifest.captures).map(capture => capture.id),
    limit: 'Integrity/recorded geometry only;does not supply acquisition,visual inspection or whole-clause proof' };
}

export async function validateSheets(manifest, readImage) {
  assert.ok(Array.isArray(manifest.sheets) && manifest.sheets.length === 8, 'Eight current mode/base/theme sheets required');
  unique(manifest.sheets, s => s.id); unique(manifest.sheets, s => s.image);
  const assigned = [];
  for (const sheet of manifest.sheets) {
    const expected = canonicalCaptures(manifest.captures).filter(c => `${c.mode === 'survive' ? `survive-${c.base === 'arcade' ? 'arcade' : 'flow'}` : c.mode}-${c.theme}` === sheet.id).map(c => c.id);
    assert.ok(expected.length > 0); assert.deepEqual(sheet.captureIds, expected, 'Every sheet contains its exact stable source image set');
    assert.match(sheet.image, /^docs\/release-evidence\/images\/sheet-[a-z-]+\.png$/);
    const bytes = await readImage(sheet.image); assert.equal(sha(bytes), sheet.imageSha256); assert.deepEqual(pngDimensions(bytes), sheet.frame);
    assigned.push(...sheet.captureIds);
  }
  assert.deepEqual(assigned.sort(), manifest.captures.map(c => c.id).sort());
  return { sheets: manifest.sheets.length, everyCaptureRepresented: true };
}

export function validateClauseRows(document, { inventory, sourceHashes, executions, captures, allowPendingShip = false }) {
  const executionMap = new Map(executions.map(row => [row.id, row])), captureMap = new Map(captures.map(row => [row.id, row]));
  unique(executions, row => row.id); unique(captures, row => row.id);
  let pendingShip = false;
  for (const group of ['originalClauses', 'requirements']) {
    assert.ok(Array.isArray(document[group])); unique(document[group], row => row.id);
    assert.equal(document[group].length, inventory[group].length, `Complete ${group} inventory required`);
    for (const original of inventory[group]) {
      const row = document[group].find(candidate => candidate.id === original.id);
      assert.ok(row, `Missing ${original.id}`); assert.equal(row.text, original.text, 'Original scope must remain verbatim');
      const pendingPrClause = row.id === 'SHIP-01' || (row.id === 'UR-L46-06' && original.text === 'PR Opened');
      if (pendingPrClause && row.status === 'pending-pr' && allowPendingShip) {
        assert.ok(Array.isArray(row.limits) && row.limits.length > 0);
        pendingShip = true; continue;
      }
      assert.equal(row.status, 'verified', 'Unsupported completion or pending obligation');
      assert.ok(Array.isArray(row.authority) && row.authority.length > 0);
      for (const authority of row.authority) { digest(authority.sha256); assert.equal(authority.sha256, sourceHashes[authority.path]); }
      assert.ok(Array.isArray(row.obligations) && row.obligations.length > 0);
      for (const obligation of row.obligations) {
        nonempty(obligation.description);
        assert.ok(Array.isArray(obligation.executionIds) && obligation.executionIds.length > 0, 'Named actual behavior evidence required');
        for (const id of obligation.executionIds) {
          const execution = executionMap.get(id); assert.ok(execution, `Unknown execution ${id}`);
          assert.equal(execution.terminalExit, 0); nonempty(execution.commandId);
          if (execution.kind === 'measured-command') {
            nonempty(execution.receiptPath); digest(execution.receiptSha256);
            assert.ok(Array.isArray(execution.assertions) && execution.assertions.length > 0);
            for (const assertion of execution.assertions) {
              nonempty(assertion.name); assert.ok(Object.hasOwn(assertion, 'actual') && Object.hasOwn(assertion, 'expected'));
              assert.deepEqual(assertion.actual, assertion.expected, assertion.name);
            }
            continue;
          }
          nonempty(execution.testFile);
          digest(execution.testSourceHash); digest(execution.artifactHash);
          assert.ok(['public-input', 'component-model', 'arranged-layout', 'supplemental-protocol'].includes(execution.kind));
          assert.ok(Array.isArray(execution.cases) && execution.cases.length > 0); execution.cases.forEach(nonempty);
          if (document.caseReferencesRequired) {
            const selected = obligation.caseRefs?.[id];
            assert.ok(Array.isArray(selected) && selected.length > 0, 'Each behavioral obligation needs named executed assertions');
            for (const name of selected) assert.ok(execution.cases.includes(name), `Unexecuted case reference ${name}`);
          }
        }
        assert.ok(Array.isArray(obligation.visualIds));
        for (const id of obligation.visualIds) assert.ok(captureMap.has(id), `Unknown visual ${id}`);
        if (obligation.requiresVisual) assert.ok(obligation.visualIds.length > 0);
      }
      assert.ok(Array.isArray(row.limits));
    }
  }
  return { originalClauses: document.originalClauses.length, requirements: document.requirements.length,
    pendingShip, limit: 'Inventory/reference integrity;human semantic review and source/terminal verification remain necessary' };
}

export async function verifyMeasuredExecution(execution, readReceipt) {
  assert.equal(execution.kind, 'measured-command');
  const bytes = await readReceipt(execution.receiptPath);
  assert.equal(sha(bytes), execution.receiptSha256, 'Measured receipt bytes changed');
  const receipt = JSON.parse(bytes);
  for (const binding of execution.sourceBindings ?? []) assert.equal(sha(await readReceipt(binding.path)), binding.sha256, `Stale measured source ${binding.path}`);
  const at = path => {
    assert.ok(Array.isArray(path) && path.length > 0);
    let value = receipt;
    for (const key of path) { assert.ok(value !== null && typeof value === 'object' && Object.hasOwn(value, key), `Missing receipt field ${key}`); value = value[key]; }
    return value;
  };
  assert.equal(execution.terminalExit, 0); assert.equal(at(execution.terminalPath), 0, 'Actual measured command did not succeed');
  assert.ok(execution.assertions.length > 0);
  for (const assertion of execution.assertions) {
    assert.deepEqual(at(assertion.receiptPath), assertion.actual, 'Assertion must be read from the literal receipt');
    assert.deepEqual(assertion.actual, assertion.expected, assertion.name);
  }
  return true;
}

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const evidenceRoot = resolve(root, 'docs/release-evidence');
const tracerId = 'survive-flow-hud-900x600-dark-reduced-all';
const frames = [[200, 160], [240, 240], [320, 560], [900, 600], [1000, 280], [2400, 1200]];
const themes = {
  dark: { background: '#242b32', text: '#f0eee5', primary: '#9fc28a' },
  light: { background: '#f6f1e5', text: '#24362d', primary: '#4b7b61' },
};
const variants = ['survive-arcade', 'survive-flow', 'relay', 'race'];
const idFor = (variant, state, width, height, theme, motion = 'reduced') => `${variant}-${state}-${width}x${height}-${theme}-${motion}-all`;

export function requiredVisualIds() {
  const ids = [];
  for (const variant of variants) for (const [width, height] of frames) for (const theme of Object.keys(themes)) {
    ids.push(idFor(variant, width < 240 ? 'minimum-notice' : 'hud', width, height, theme));
  }
  // Lifecycle/result cells are mandatory independently of the HUD matrix. A
  // partially acquired HUD set cannot silently become the complete contract.
  for (const [variant, states] of [
    ['survive-flow', ['setup', 'recovery', 'items', 'market', 'results']],
    ['survive-arcade', ['setup', 'recovery', 'results']],
    ['relay', ['setup', 'handoff', 'disconnect', 'market', 'results-tie']],
    ['race', ['setup', 'fog', 'items', 'results-tie', 'results-dnf']],
  ]) for (const state of states) for (const theme of Object.keys(themes)) ids.push(idFor(variant, state, 900, 600, theme,
    (variant === 'race' && state !== 'setup' || variant === 'relay' && !['setup', 'market'].includes(state)) ? 'full' : 'reduced'));
  for (const theme of Object.keys(themes)) {
    ids.push(idFor('survive-flow', 'recovery', 1000, 280, theme));
    ids.push(idFor('survive-flow', 'owner-target', 320, 560, theme));
    ids.push(idFor('race', 'hud', 900, 600, theme, 'full'));
  }
  return ids;
}

export function validateCaptureReceipt(bytes, acquisition) {
  assert.equal(sha(bytes), acquisition.receiptSha256, 'Capture receipt bytes changed');
  const receipt = JSON.parse(bytes);
  assert.equal(receipt.commandId, acquisition.commandId);
  assert.equal(receipt.terminalExit, 0); assert.equal(receipt.signal, null);
  assert.ok(Number.isSafeInteger(receipt.pid) && receipt.pid > 0);
  assert.ok(Array.isArray(receipt.argv) && receipt.argv.includes('--capture-worker'));
  nonempty(receipt.startedAt); nonempty(receipt.finishedAt); nonempty(receipt.outputText);
  assert.equal(sha(receipt.outputText), receipt.logSha256, 'Retained capture output changed');
  return receipt;
}

async function currentSources() {
  const paths = execFileSync('git', ['ls-files', '-z', 'src', 'tests', 'tools', 'examples', 'docs/mode-rules.md', 'index.html', 'package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'tsconfig.json'], { cwd: root }).toString().split('\0').filter(Boolean);
  paths.push('tools/release-coverage/evidence.mjs', 'tests/release-evidence.test.mjs');
  const hashes = {};
  for (const path of [...new Set(paths)].sort()) hashes[path] = sha(await readFile(resolve(root, path)));
  return hashes;
}
const pad = (index, pressed = []) => ({ index, id: `release-${index}`, connected: true, mapping: 'standard', timestamp: 1,
  axes: [0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: +pressed.includes(i), touched: false })) });

async function actualSetup(app, variant, beforeStart) {
  const survive = variant.startsWith('survive-');
  if (survive) { await app.frame.locator('#play').click(); await app.frame.locator('#pause').click(); }
  await app.frame.locator('#local-play').click();
  for (let index = 0; index < 2; index++) {
    await app.sendPads([pad(0), pad(1)]);
    await app.sendPads([pad(0, index === 0 ? [0] : []), pad(1, index === 1 ? [0] : [])]);
    await app.sendPads([pad(0), pad(1)]);
  }
  if (!survive) await app.frame.locator(variant === 'relay' ? '#relay-play' : '#race-play').click();
  await beforeStart?.();
  await app.frame.locator('#local-session-start').click(); await app.advance(80);
  const actual = await app.onSession(function () {
    return { base: this.definition.id, composed: !!this.mode, players: this.players.map(p => ({ seat: p.seat, participantId: p.participantId, characterId: p.characterId })),
      coOpMarket: !!this.coOpMarket, sharedItems: !!this.consumableSnapshot(), restrictedActors: !!this.mode?.handlers.canAct };
  });
  assert.equal(actual.base, variant === 'survive-arcade' ? 'arcade' : 'stroll');
  assert.equal(actual.composed, true); assert.equal(actual.players.length, 4);
  assert.equal(new Set(actual.players.map(p => p.characterId)).size, 4);
  if (survive) { assert.equal(actual.coOpMarket, true); assert.equal(actual.sharedItems, true); assert.equal(actual.restrictedActors, false); }
  if (variant === 'relay') { assert.equal(actual.restrictedActors, true); assert.equal(await app.frame.locator('#session-seats').getAttribute('data-relay-hud'), 'true'); }
  if (variant === 'race') assert.equal(await app.frame.locator('[data-race-hud]').count(), 4);
  await app.frame.locator('#pause').click(); await app.advance(32);
  return actual;
}

async function actualPanels(app) {
  return app.frame.evaluate(() => {
    const visible = n => n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden' && getComputedStyle(n).clipPath !== 'inset(50%)' && !n.closest('[hidden]');
    return [...document.querySelectorAll('.session-hud-tile,.session-hud-details,.session-hud-summary,.score-block,.coin-count,#pluck,#character-power,#active-run-powers,.world-label,#chapter-label,.hud-tools button,.bottom-bar button,#run-hand-owner,#run-hand-items button,.relay-distance,.race-distance,.race-lifecycle,#session-controls-open,#toast,#idle,#market-open,#hint')]
      .filter(visible).map(n => { const r = n.getBoundingClientRect(); return { name: n.id || n.className || n.getAttribute('aria-label') || n.localName, rect: { left: r.left, top: r.top, right: r.right + 3, bottom: r.bottom + 3 } }; });
  });
}

async function viewCapture(app, variant, state, width, height, theme, sourceHashes, normalArtifactHash, acquisitionKind, selector, actual) {
  await app.resize(width, height);
  await app.frame.evaluate(colors => marketGameFixture.setTheme({ colors }), themes[theme]); await app.advance(80);
  assert.equal(await app.frame.locator(selector).isVisible(), true, `${variant}/${state} surface is actually visible`);
  const observation = await app.frame.locator(selector).evaluate(board => {
    const visible = n => n.getClientRects().length && !n.closest('[hidden]') && getComputedStyle(n).visibility !== 'hidden';
    const controls = [...board.querySelectorAll('button,input')].filter(visible).map(n => {
      const r = n.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { text: n.getAttribute('aria-label') || n.textContent, fits: r.width >= 43.5 && r.height >= 43.5 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5, hit: hit === n || n.contains(hit) };
    });
    return { controls, documentOverflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
      boardOverflow: board.scrollHeight > board.clientHeight + 1 || board.scrollWidth > board.clientWidth + 1,
      heading: board.querySelector('h2')?.textContent, selectedTarget: board.getAttribute('data-recovery-target'),
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
  });
  assert.equal(observation.reduced, true); assert.equal(observation.documentOverflow, false); assert.equal(observation.boardOverflow, false);
  assert.ok(observation.controls.length > 0 && observation.controls.every(c => c.fits && c.hit), `${variant}/${state} visible controls fit and receive pointer input: ${JSON.stringify(observation.controls)}`);
  const id = idFor(variant, state, width, height, theme), image = `docs/release-evidence/images/${id}.png`;
  await mkdir(resolve(evidenceRoot, 'images'), { recursive: true }); await app.iframe.screenshot({ path: resolve(root, image) });
  console.log(`Captured ${id} (${acquisitionKind})`);
  return { id, mode: variant.startsWith('survive-') ? 'survive' : variant, base: variant === 'survive-arcade' ? 'arcade' : 'stroll', state,
    frame: { width, height }, theme, motion: 'reduced', participant: 'all', image, imageSha256: sha(await readFile(resolve(root, image))), normalArtifactHash, sourceHashes,
    acquisition: { kind: acquisitionKind, actualModeAsserted: true, actualMode: actual, observation,
      arrangement: acquisitionKind === 'component-model' ? 'Production RunInventory score/credit and mode transaction/end/recovery APIs arrange the visual state; subsequent menu actions and rendering use the shipped UI. This is not unassisted gameplay acquisition. No camera or renderer replacement.' : 'Visible setup controls and injected runtime theme; no private world/actor/camera writes' } };
}

async function surviveViews(app, variant, actual, captures, sourceHashes, normalArtifactHash) {
  const { sessionHudAction } = await import('../../tests/market-game-fixture.mjs');
  await app.resize(900, 600);
  // Same explicit production-component setup as the existing recovery-board
  // matrix, without modifying lanes, coordinates, camera or renderer.
  const arranged = await app.onSession(function () {
    const owner = this.players[0]; owner.run.advanceScore(100); owner.run.creditCoins(500); owner.run.open();
    for (const itemId of ['revival', 'flare']) {
      const context = this.openCoOpMarket({ seat: owner.seat, device: owner.device, participantId: owner.participantId });
      const result = this.actCoOpMarket({ actionId: `release-view-${itemId}`, seat: owner.seat, device: owner.device, participantId: owner.participantId,
        expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration,
        expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration, kind: 'buy-consumable', itemId });
      if (!result.ok) throw Error(result.message);
    }
    owner.run.close(); return { base: this.definition.id, players: this.players.length, charges: this.consumableSnapshot() };
  });
  assert.equal(arranged.base, actual.base); assert.equal(arranged.players, 4);
  await app.advance(32); await app.frame.locator('#market-open').click(); await app.advance(300);
  for (const theme of Object.keys(themes)) captures.push(await viewCapture(app, variant, 'market', 900, 600, theme, sourceHashes, normalArtifactHash, 'component-model', '#market', actual));
  await app.frame.locator('#market-close').click(); await app.advance(300);
  await app.onSession(function () {
    for (const player of this.players.slice(1)) this.world.host.inPlayerOperation(player, context => context.end('Release visual fixture train', 'train'));
    this.update(1 / 120);
    if (!this.players.slice(1).every(player => player.participation === 'dead')) throw Error('Arranged teammates did not enter actual dead lifecycle');
  }); await app.advance(32);
  await sessionHudAction(app, 'p1', 'item'); await app.advance(32);
  for (const theme of Object.keys(themes)) captures.push(await viewCapture(app, variant, 'items', 900, 600, theme, sourceHashes, normalArtifactHash, 'component-model', '#survive-recovery-board', actual));
  await app.frame.getByRole('button', { name: 'Use Revival ×1', exact: true }).click(); await app.advance(32);
  assert.ok(await app.frame.locator('#survive-recovery-board').getAttribute('data-recovery-target'), 'Actual dead teammate is selected');
  for (const theme of Object.keys(themes)) {
    captures.push(await viewCapture(app, variant, 'recovery', 900, 600, theme, sourceHashes, normalArtifactHash, 'component-model', '#survive-recovery-board', actual));
    if (variant === 'survive-flow') {
      captures.push(await viewCapture(app, variant, 'recovery', 1000, 280, theme, sourceHashes, normalArtifactHash, 'component-model', '#survive-recovery-board', actual));
      const target = await app.frame.locator('#survive-recovery-board').getAttribute('data-recovery-target');
      captures.push(await viewCapture(app, variant, 'owner-target', 320, 560, theme, sourceHashes, normalArtifactHash, 'component-model', '#survive-recovery-board', actual));
      assert.equal(await app.frame.locator('#survive-recovery-board').getAttribute('data-recovery-target'), target, 'Actual selected target survives compact resize');
    }
  }
  await app.resize(900, 600); await app.frame.getByRole('button', { name: 'Back to paused run', exact: true }).click();
  const closeDetails = app.frame.getByRole('button', { name: 'Close details', exact: true });
  if (await closeDetails.isVisible()) await closeDetails.click();
  // Ending a paused primary is intentionally ignored by the engine. Resume
  // through the actual UI before arranging the final component death.
  if (await app.frame.getByRole('button', { name: 'Resume game', exact: true }).isVisible()) await app.frame.getByRole('button', { name: 'Resume game', exact: true }).click();
  assert.equal(await app.onGame(function () { return this.state; }), 'playing', 'Visible resume must actually release the paused primary');
  const result = await app.onSession(function () {
    const owner = this.players[0]; this.world.host.inPlayerOperation(owner, context => context.end('Release visual fixture train', 'train'));
    this.update(1 / 120); for (const player of this.players) this.declineRecovery(player.seat); this.update(1 / 120);
    return { mode: this.result?.mode, contributions: this.result?.contributions, frozen: Object.isFrozen(this.result),
      diagnostic: { time: this.world.time, hostState: this.world.host.state, players: this.players.map(p => ({ seat: p.seat, state: p.state, participation: p.participation, recovery: p.recovery })) } };
  });
  assert.equal(result.mode, 'survive-together', JSON.stringify(result.diagnostic)); assert.equal(result.contributions.length, 4); assert.equal(result.frozen, true);
  await app.advance(80);
  for (const theme of Object.keys(themes)) captures.push(await viewCapture(app, variant, 'results', 900, 600, theme, sourceHashes, normalArtifactHash, 'component-model', '#survive-results-root', { ...actual, result }));
}

async function runLayout(variant) {
  const commandId = `normal-${variant}-layout`, argv = ['tests/strict-node-tests.mjs', `tests/${variant}-layout.mjs`];
  const child = spawn(process.execPath, argv, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let outputText = ''; const startedAt = new Date().toISOString();
  for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => { outputText += bytes; process.stdout.write(bytes); });
  const terminal = await new Promise((accept, reject) => { child.once('error', reject); child.once('close', (terminalExit, signal) => accept({ terminalExit, signal })); });
  assert.equal(terminal.signal, null); assert.equal(terminal.terminalExit, 0, `${variant} layout must actually finish`);
  return { commandId, executable: process.execPath, argv, pid: child.pid, startedAt, finishedAt: new Date().toISOString(), ...terminal, outputText, outputSha256: sha(outputText) };
}

async function createSheets(captures) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ args: ['--mute-audio'] }); const sheets = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    for (const variant of variants) for (const theme of Object.keys(themes)) {
      const selected = canonicalCaptures(captures).filter(c => (c.mode === 'survive' ? `survive-${c.base === 'arcade' ? 'arcade' : 'flow'}` : c.mode) === variant && c.theme === theme);
      const figures = [];
      for (const capture of selected) figures.push(`<figure><figcaption>${capture.state} · ${capture.frame.width}×${capture.frame.height} · ${capture.motion} · ${capture.acquisition.kind}</figcaption><img src="data:image/png;base64,${(await readFile(resolve(root, capture.image))).toString('base64')}"></figure>`);
      await page.setContent(`<style>html,body{margin:0;background:#26342f;color:#fff4d4;font:16px/1.3 monospace}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:8px}figure{margin:0;min-width:0}figcaption{height:48px;font-size:13px}img{display:block;width:100%;height:240px;object-fit:contain;background:#111d18}</style><div class="grid">${figures.join('')}</div>`);
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      const image = `docs/release-evidence/images/sheet-${variant}-${theme}.png`;
      await page.screenshot({ path: resolve(root, image), fullPage: true }); const bytes = await readFile(resolve(root, image));
      sheets.push({ id: `${variant}-${theme}`, image, imageSha256: sha(bytes), frame: pngDimensions(bytes), captureIds: selected.map(c => c.id) });
    }
    return sheets;
  } finally { await browser.close(); }
}

async function captureWorker(kind, outputPath) {
  assert.ok(['tracer', 'required'].includes(kind));
  assert.equal(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, undefined, 'Visual proof requires the normal artifact');
  const { createMarketGameFixture } = await import('../../tests/market-game-fixture.mjs');
  const sourceHashes = await currentSources(), normalArtifactHash = sha(await readFile(resolve(root, 'dist/index.html')));
  const captures = [], executions = [];
  for (const variant of kind === 'tracer' ? ['survive-flow'] : variants) {
    const evidence = { errors: [], external: [] };
    const app = await createMarketGameFixture(evidence, { gamepads: true, auditBoundary: true, initialIntent: {
      sender: 'release-visual-proof', archetype: 'game', action: 'open', convention: 'napplet:game/open',
      payload: { seed: variant === 'survive-arcade' ? 'ph3-00000071-pond-a-n' : 'ph3-00000071-pond-s-n' },
    } });
    try {
      await app.page.emulateMedia({ reducedMotion: 'reduce' });
      const setupCaptures = [];
      const actual = await actualSetup(app, variant, kind === 'required' ? async () => {
        assert.equal(await app.frame.locator('#session-board').isVisible(), true);
        for (const theme of Object.keys(themes)) setupCaptures.push(await viewCapture(app, variant, 'setup', 900, 600, theme, sourceHashes, normalArtifactHash, 'public-input', '#session-board'));
      } : undefined);
      for (const capture of setupCaptures) { capture.acquisition.actualMode = actual; captures.push(capture); }
      for (const [width, height] of kind === 'tracer' ? [[900, 600]] : frames) for (const theme of kind === 'tracer' ? ['dark'] : Object.keys(themes)) {
        await app.resize(width, height); await app.frame.evaluate(colors => window.marketGameFixture.setTheme({ colors }), themes[theme]); await app.advance(32);
        const state = width < 240 ? 'minimum-notice' : 'hud', id = idFor(variant, state, width, height, theme);
        const capture = { id, mode: variant.startsWith('survive') ? 'survive' : variant, base: actual.base, state,
          frame: { width, height }, theme, motion: 'reduced', participant: 'all', normalArtifactHash, sourceHashes,
          image: `docs/release-evidence/images/${id}.png`,
          acquisition: { kind: 'public-input', actualModeAsserted: true, actualMode: actual,
            observer: 'Read-only production draw arguments; no world,actor or camera writes',
            setup: 'Visible Play/Pause/Local Play/mode/Start; two keyboards and two authorized controller snapshots; visible Pause holds actual state' } };
        if (width >= 240) {
          const travelers = await app.observeTravelers();
          assert.equal(travelers.length, variant === 'relay' ? 1 : 4);
          capture.clearance = { measured: true, minimumCssPixels: 8, collisions: [],
            actors: travelers.map(p => ({ id: p.text, parts: [{ kind: 'nameplate', rect: p.rect }, ...p.bodies.map(body => ({ kind: 'body', rect: body.rect }))] })),
            panels: await actualPanels(app) };
          checkGeometry(capture.clearance);
        } else {
          assert.equal(await app.frame.locator('.too-small').isVisible(), true);
          assert.equal(await app.frame.locator('.too-small').textContent(), 'Needs 240×240 to play — enlarge this pane.');
        }
        const image = resolve(root, capture.image); await mkdir(dirname(image), { recursive: true });
        await app.iframe.screenshot({ path: image }); capture.imageSha256 = sha(await readFile(image)); captures.push(capture);
        console.log(`Captured ${id}`);
      }
      if (kind === 'required' && variant.startsWith('survive-')) await surviveViews(app, variant, actual, captures, sourceHashes, normalArtifactHash);
      if (kind === 'required' && variant === 'relay') {
        await app.resize(900, 600);
        await app.onSession(function () { const run = this.players[0].run; run.advanceScore(100); run.creditCoins(500); });
        await app.advance(32); await app.frame.locator('#market-open').click(); await app.advance(300);
        for (const theme of Object.keys(themes)) captures.push(await viewCapture(app, variant, 'market', 900, 600, theme, sourceHashes, normalArtifactHash, 'component-model', '#market', actual));
      }
      if (kind === 'required' && variant === 'race') {
        await app.resize(900, 600); await app.page.emulateMedia({ reducedMotion: 'no-preference' });
        for (const theme of Object.keys(themes)) {
          await app.frame.evaluate(colors => marketGameFixture.setTheme({ colors }), themes[theme]); await app.advance(32);
          const id = idFor(variant, 'hud', 900, 600, theme, 'full');
          const image = `docs/release-evidence/images/${id}.png`; await app.iframe.screenshot({ path: resolve(root, image) });
          const travelers = await app.observeTravelers();
          const clearance = { measured: true, minimumCssPixels: 8, collisions: [], actors: travelers.map(p => ({ id: p.text, parts: [{ kind: 'nameplate', rect: p.rect }, ...p.bodies.map(b => ({ kind: 'body', rect: b.rect }))] })), panels: await actualPanels(app) };
          checkGeometry(clearance);
          captures.push({ id, mode: variant, base: actual.base, state: 'hud', frame: { width: 900, height: 600 }, theme, motion: 'full', participant: 'all', normalArtifactHash, sourceHashes, image, imageSha256: sha(await readFile(resolve(root, image))), clearance,
            acquisition: { kind: 'public-input', actualModeAsserted: true, actualMode: actual, observer: 'Read-only production voxel and packed label draw arguments' } });
        }
      }
      assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
      assert.deepEqual(await app.frame.evaluate(() => marketGameFixture.forbidden), []);
    } finally { await app.close(); }
  }
  if (kind === 'required') {
    for (const variant of ['relay', 'race']) {
      const execution = await runLayout(variant); executions.push(execution);
      const reportPath = `artifacts/${variant}-layout/report.json`, reportBytes = await readFile(resolve(root, reportPath)), report = JSON.parse(reportBytes);
      assert.equal(report.complete, true); assert.deepEqual(report.failures, []); assert.deepEqual(report.errors, []);
      const states = variant === 'relay' ? { handoff: 'handoff', disconnect: 'disconnected', 'results-tie': 'tied-podium' }
        : { fog: 'fog-exposed', items: 'mud-target', 'results-tie': 'four-tie', 'results-dnf': 'timeout-dnf' };
      for (const [state, originalState] of Object.entries(states)) for (const theme of Object.keys(themes)) {
        const observed = report.captures.find(c => c.state === originalState && c.width === 900 && c.height === 600 && c.theme === theme);
        assert.ok(observed); assert.deepEqual(observed.failures, []);
        const id = idFor(variant, state, 900, 600, theme, 'full'), image = `docs/release-evidence/images/${id}.png`;
        const bytes = await readFile(resolve(root, `artifacts/${variant}-layout/${observed.name}`));
        await writeFile(resolve(root, image), bytes);
        captures.push({ id, mode: variant, base: 'stroll', state, frame: { width: 900, height: 600 }, theme, motion: 'full', participant: 'all', image, imageSha256: sha(bytes), normalArtifactHash, sourceHashes,
          acquisition: { kind: 'public-input', actualModeAsserted: true, testFile: `tests/${variant}-layout.mjs`, testSourceHash: sourceHashes[`tests/${variant}-layout.mjs`],
            commandId: execution.commandId, observedCapture: observed, reportPath, reportSha256: sha(reportBytes),
            modeEvidence: 'Existing built UI journey asserts actual mode-specific surface and retains authoritative roster/result state across every resize; no private state writes',
            limits: ['This lifecycle/result image has DOM/focus/motion checks; full voxel clearance is measured by the independent normal HUD matrix'] } });
      }
    }
  }
  const sheets = kind === 'required' ? await createSheets(captures) : [];
  assert.deepEqual(await currentSources(), sourceHashes, 'Source mutation during capture');
  assert.equal(sha(await readFile(resolve(root, 'dist/index.html'))), normalArtifactHash);
  await writeFile(outputPath, JSON.stringify({ schema: 'release-visual-evidence-1', createdAt: new Date().toISOString(),
    sourceHashes, normalArtifactHash, captures: canonicalCaptures(captures), executions, sheets,
    limits: ['Test-host storage/theme/keys fixtures and authorized controller snapshots; no physical-device measurement', 'No human visual acceptance supplied by integrity checks'] }, null, 2) + '\n');
}

async function acquire(kind) {
  const commandId = `visual-${kind}-${new Date().toISOString().replaceAll(/[^0-9]/g, '')}`;
  const directory = resolve(root, 'artifacts/release-coverage', commandId); await mkdir(directory, { recursive: false });
  const pending = resolve(directory, 'pending.json'), log = resolve(directory, 'capture.log');
  const argv = [fileURLToPath(import.meta.url), '--capture-worker', kind, pending];
  const startedAt = new Date().toISOString(); let transcript = '';
  const child = spawn(process.execPath, argv, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => { transcript += bytes; process.stdout.write(bytes); });
  const terminal = await new Promise((accept, reject) => { child.once('error', reject); child.once('close', (code, signal) => accept({ code, signal })); });
  await writeFile(log, transcript);
  const receipt = { commandId, executable: process.execPath, argv, pid: child.pid, startedAt, finishedAt: new Date().toISOString(),
    terminalExit: terminal.code, signal: terminal.signal, logPath: log, logSha256: sha(await readFile(log)), outputText: transcript };
  await writeFile(resolve(directory, 'command.json'), JSON.stringify(receipt, null, 2) + '\n');
  assert.equal(terminal.signal, null); assert.equal(terminal.code, 0, `Capture failed; retained ${directory}`);
  const manifest = JSON.parse(await readFile(pending));
  assert.deepEqual(manifest.sourceHashes, await currentSources());
  assert.equal(manifest.normalArtifactHash, sha(await readFile(resolve(root, 'dist/index.html'))));
  const receiptPath = `docs/release-evidence/${commandId}.json`;
  for (const capture of manifest.captures) Object.assign(capture.acquisition, { nestedCommandId: capture.acquisition.commandId, commandId, terminalExit: terminal.code,
    receiptPath, receiptSha256: sha(JSON.stringify(receipt, null, 2) + '\n') });
  await writeFile(resolve(root, receiptPath), JSON.stringify(receipt, null, 2) + '\n');
  const target = kind === 'tracer' ? 'tracer.json' : 'manifest.json';
  await writeFile(resolve(evidenceRoot, target), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Actual terminal capture receipt: ${receiptPath}`);
}

async function checkCurrent(tracer) {
  const manifest = JSON.parse(await readFile(resolve(evidenceRoot, tracer ? 'tracer.json' : 'manifest.json')));
  for (const capture of manifest.captures) {
    const receiptBytes = await readFile(resolve(root, capture.acquisition.receiptPath));
    validateCaptureReceipt(receiptBytes, capture.acquisition);
  }
  const result = await validateVisualManifest(manifest, { artifactHash: sha(await readFile(resolve(root, 'dist/index.html'))),
    sourceHashes: await currentSources(), requiredCaptureIds: tracer ? [tracerId] : requiredVisualIds(),
    readImage: path => readFile(resolve(root, path)) });
  if (!tracer) Object.assign(result, await validateSheets(manifest, path => readFile(resolve(root, path))));
  return result;
}

async function checkClauses(requirePr) {
  await checkCurrent(false);
  const document = JSON.parse(await readFile(resolve(evidenceRoot, 'clauses.json')));
  const inventory = JSON.parse(await readFile(resolve(root, '.planning/phases/07-release-evidence-pr/07-CLAUSE-PREPARATION.json')));
  assert.equal(document.caseReferencesRequired, true);
  const requestLines = (await readFile(resolve(root, '.planning/USER-REQUEST.md'), 'utf8')).split('\n');
  for (const row of inventory.originalClauses) assert.equal(requestLines[row.line - 1].slice(row.startColumn - 1, row.endColumnExclusive - 1), row.text, 'Original request span changed');
  const requirementText = await readFile(resolve(root, '.planning/REQUIREMENTS.md'), 'utf8');
  for (const row of inventory.requirements) assert.ok(requirementText.includes(`**${row.id}**: ${row.text}`), `Original requirement changed ${row.id}`);
  for (const [path, expected] of Object.entries(document.sourceHashes)) assert.equal(sha(await readFile(resolve(root, path))), expected, `Stale clause authority ${path}`);
  const bytes = await readFile(resolve(root, document.executionsSource.path)); assert.equal(sha(bytes), document.executionsSource.sha256);
  const actual = JSON.parse(bytes);
  for (const [path, expected] of Object.entries(actual.sourceHashes)) assert.equal(sha(await readFile(resolve(root, path))), expected, `Stale executed input ${path}`);
  assert.equal(actual.normalArtifactRawSha256, sha(await readFile(resolve(root, 'dist/index.html'))));
  assert.equal(sha(await readFile(resolve(root, actual.enforcingProof))), actual.enforcingProofSha256);
  for (const execution of actual.executions) {
    assert.equal(sha(await readFile(resolve(root, execution.testFile))), execution.testSourceHash);
    assert.equal(execution.terminalExit, 0);
    if (execution.outputText) {
      assert.equal(sha(execution.outputText), execution.rawOutputSha256);
      for (const name of execution.cases) assert.ok(execution.outputText.split('\n').some(line => /^\s*ok \d+ - /.test(line) && line.trim().endsWith(`- ${name}`)), `Missing actual positive case ${name}`);
    }
  }
  for (const execution of document.additionalExecutions ?? []) await verifyMeasuredExecution(execution, path => readFile(resolve(root, path)));
  assert.deepEqual(document.taxonomy.map(row => row.id).sort(), ['A07-E3', 'A07-E5', 'A07-ES']);
  assert.ok(document.taxonomy.every(row => row.status === 'unclassified-contract-retained' && row.contract && row.evidence));
  const manifest = JSON.parse(await readFile(resolve(evidenceRoot, 'manifest.json')));
  return validateClauseRows(document, { inventory, sourceHashes: document.sourceHashes,
    executions: [...actual.executions, ...(document.additionalExecutions ?? [])], captures: manifest.captures, allowPendingShip: !requirePr });
}

async function main() {
  const [action, kind, output] = process.argv.slice(2);
  if (action === '--capture-worker') return captureWorker(kind, output);
  if (action === '--capture-tracer') return acquire('tracer');
  if (action === '--capture-required') return acquire('required');
  if (action === '--check-tracer') return console.log(JSON.stringify(await checkCurrent(true)));
  if (action === '--check') return console.log(JSON.stringify(await checkCurrent(false)));
  if (action === '--check-clauses') return console.log(JSON.stringify(await checkClauses(kind === '--require-pr')));
  throw Error('Supported: --capture-tracer,--check-tracer,--capture-required,--check,--check-clauses [--require-pr]');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error); process.exitCode = 1; });
