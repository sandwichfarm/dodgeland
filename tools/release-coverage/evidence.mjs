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
  ]) for (const state of states) for (const theme of Object.keys(themes)) ids.push(idFor(variant, state, 900, 600, theme));
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
  const paths = execFileSync('git', ['ls-files', '-z', 'src', 'tests', 'tools', 'examples', 'index.html', 'package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'tsconfig.json'], { cwd: root }).toString().split('\0').filter(Boolean);
  paths.push('tools/release-coverage/evidence.mjs', 'tests/release-evidence.test.mjs');
  const hashes = {};
  for (const path of [...new Set(paths)].sort()) hashes[path] = sha(await readFile(resolve(root, path)));
  return hashes;
}
const pad = (index, pressed = []) => ({ index, id: `release-${index}`, connected: true, mapping: 'standard', timestamp: 1,
  axes: [0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: +pressed.includes(i), touched: false })) });

async function actualSetup(app, variant) {
  const survive = variant.startsWith('survive-');
  if (survive) { await app.frame.locator('#play').click(); await app.frame.locator('#pause').click(); }
  await app.frame.locator('#local-play').click();
  for (let index = 0; index < 2; index++) {
    await app.sendPads([pad(0), pad(1)]);
    await app.sendPads([pad(0, index === 0 ? [0] : []), pad(1, index === 1 ? [0] : [])]);
    await app.sendPads([pad(0), pad(1)]);
  }
  if (!survive) await app.frame.locator(variant === 'relay' ? '#relay-play' : '#race-play').click();
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

async function captureWorker(kind, outputPath) {
  assert.ok(['tracer', 'required'].includes(kind));
  assert.equal(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, undefined, 'Visual proof requires the normal artifact');
  const { createMarketGameFixture } = await import('../../tests/market-game-fixture.mjs');
  const sourceHashes = await currentSources(), normalArtifactHash = sha(await readFile(resolve(root, 'dist/index.html')));
  const captures = [];
  for (const variant of kind === 'tracer' ? ['survive-flow'] : variants) {
    const evidence = { errors: [], external: [] };
    const app = await createMarketGameFixture(evidence, { gamepads: true, auditBoundary: true, initialIntent: {
      sender: 'release-visual-proof', archetype: 'game', action: 'open', convention: 'napplet:game/open',
      payload: { seed: variant === 'survive-arcade' ? 'ph3-00000071-pond-a-n' : 'ph3-00000071-pond-s-n' },
    } });
    try {
      await app.page.emulateMedia({ reducedMotion: 'reduce' });
      const actual = await actualSetup(app, variant);
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
      assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
      assert.deepEqual(await app.frame.evaluate(() => marketGameFixture.forbidden), []);
    } finally { await app.close(); }
  }
  assert.deepEqual(await currentSources(), sourceHashes, 'Source mutation during capture');
  assert.equal(sha(await readFile(resolve(root, 'dist/index.html'))), normalArtifactHash);
  await writeFile(outputPath, JSON.stringify({ schema: 'release-visual-evidence-1', createdAt: new Date().toISOString(),
    sourceHashes, normalArtifactHash, captures: canonicalCaptures(captures),
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
  for (const capture of manifest.captures) Object.assign(capture.acquisition, { commandId, terminalExit: terminal.code,
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
  return validateVisualManifest(manifest, { artifactHash: sha(await readFile(resolve(root, 'dist/index.html'))),
    sourceHashes: await currentSources(), requiredCaptureIds: tracer ? [tracerId] : requiredVisualIds(),
    readImage: path => readFile(resolve(root, path)) });
}

async function main() {
  const [action, kind, output] = process.argv.slice(2);
  if (action === '--capture-worker') return captureWorker(kind, output);
  if (action === '--capture-tracer') return acquire('tracer');
  if (action === '--capture-required') return acquire('required');
  if (action === '--check-tracer') return console.log(JSON.stringify(await checkCurrent(true)));
  if (action === '--check') return console.log(JSON.stringify(await checkCurrent(false)));
  throw Error('Supported: --capture-tracer,--check-tracer,--capture-required,--check');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error); process.exitCode = 1; });
