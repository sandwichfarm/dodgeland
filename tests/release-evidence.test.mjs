// Integrity negative controls; fixture bytes never count as production captures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { clearanceAtLeast8, canonicalCaptures, validateVisualManifest, validateClauseRows, requiredVisualIds, validateCaptureReceipt, validateSheets, verifyMeasuredExecution } from '../tools/release-coverage/evidence.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMxoAAAAASUVORK5CYII=', 'base64');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = 'a'.repeat(64), artifactHash = 'b'.repeat(64);
const capture = (theme = 'dark') => ({
  id: `race-hud-1x1-${theme}-reduced-all`, mode: 'race', base: 'stroll', state: 'hud',
  frame: { width: 1, height: 1 }, theme, motion: 'reduced', participant: 'all',
  image: `docs/release-evidence/images/race-hud-1x1-${theme}.png`, imageSha256: sha(png),
  normalArtifactHash: artifactHash, sourceHashes: { 'src/main.ts': sourceHash },
  acquisition: { kind: 'public-input', commandId: 'normal-capture', terminalExit: 0,
    actualModeAsserted: true, observer: 'production-draw-arguments-read-only' },
  clearance: { measured: true, collisions: [], minimumCssPixels: 8,
    actors: [{ id: 'p1', parts: [{ kind: 'body', rect: { left: 0, top: 0, right: 1, bottom: 1 } },
      { kind: 'nameplate', rect: { left: 0, top: 0, right: 1, bottom: 1 } }] }],
    worldLabels: [], panels: [{ name: 'HUD', rect: { left: 9, top: 0, right: 10, bottom: 1 } }] },
});
const manifest = () => ({ schema: 'release-visual-evidence-1', normalArtifactHash: artifactHash,
  sourceHashes: { 'src/main.ts': sourceHash }, captures: [capture()] });
const options = { artifactHash, sourceHashes: { 'src/main.ts': sourceHash },
  requiredCaptureIds: [capture().id], readImage: async () => png };

test('inclusive8px clearance accepts8 and rejects7.99,touching,nonfinite and malformed rectangles', () => {
  const body = { left: 0, top: 0, right: 10, bottom: 10 };
  assert.equal(clearanceAtLeast8(body, { left: 18, top: 0, right: 30, bottom: 10 }), true);
  assert.equal(clearanceAtLeast8(body, { left: 17.99, top: 0, right: 30, bottom: 10 }), false);
  assert.equal(clearanceAtLeast8(body, { left: 10, top: 0, right: 30, bottom: 10 }), false);
  assert.throws(() => clearanceAtLeast8(body, { left: NaN, top: 0, right: 30, bottom: 10 }));
  assert.throws(() => clearanceAtLeast8(body, { left: 30, top: 0, right: 10, bottom: 10 }));
});

test('capture ordering is stable under permutation and does not mutate caller order', () => {
  const input = [capture('light'), capture('dark')], original = input.map(row => row.id);
  assert.deepEqual(canonicalCaptures(input), canonicalCaptures([...input].reverse()));
  assert.deepEqual(input.map(row => row.id), original);
});

test('one source-bound PNG fixture validates integrity', async () => {
  const result = await validateVisualManifest(manifest(), options);
  assert.equal(result.captures, 1); assert.equal(result.completeRequiredSet, true);
});

test('empty,missing,duplicate,stale,wrong-frame and failed-source evidence never passes', async () => {
  const mutations = [
    value => { value.captures = []; },
    value => { value.captures.push(structuredClone(value.captures[0])); },
    value => { value.captures.push({ ...structuredClone(value.captures[0]), id: 'another-theme', theme: 'light' }); },
    value => { value.captures[0].imageSha256 = 'c'.repeat(64); },
    value => { value.captures[0].normalArtifactHash = 'c'.repeat(64); },
    value => { value.captures[0].sourceHashes['src/main.ts'] = 'c'.repeat(64); },
    value => { value.captures[0].frame.width = 2; },
    value => { value.captures[0].acquisition.terminalExit = 1; },
    value => { value.captures[0].acquisition.actualModeAsserted = false; },
    value => { value.captures[0].image = '../outside.png'; },
    value => { value.captures[0].clearance.collisions = [{ panel: 'HUD' }]; },
    value => { value.captures[0].clearance.minimumCssPixels = 7.99; },
    value => { value.captures[0].clearance.panels[0].rect.left = 8.99; },
    value => { value.captures[0].clearance.actors = []; },
  ];
  for (const alter of mutations) { const value = manifest(); alter(value); await assert.rejects(validateVisualManifest(value, options)); }
  await assert.rejects(validateVisualManifest(manifest(), { ...options, readImage: async () => { throw Error('Missing image'); } }));
  await assert.rejects(validateVisualManifest(manifest(), { ...options, requiredCaptureIds: ['missing-required'] }));
});

const inventory = { originalClauses: [{ id: 'UR-1', text: 'Every original clause remains.' }],
  requirements: [{ id: 'SHIP-01', text: 'Actual open PR.' }] };
const execution = { id: 'full05/race-runtime', terminalExit: 0, kind: 'public-input',
  testFile: 'tests/race-runtime.mjs', testSourceHash: sourceHash,
  cases: ['actual Race journey'], commandId: 'full05', artifactHash };
const clauseRows = () => ({ originalClauses: [{ id: 'UR-1', text: inventory.originalClauses[0].text,
  status: 'verified', authority: [{ path: 'src/main.ts', sha256: sourceHash }],
  obligations: [{ description: 'Preserve the complete clause.', executionIds: [execution.id], visualIds: [] }], limits: [] }],
  requirements: [{ id: 'SHIP-01', text: inventory.requirements[0].text, status: 'pending-pr',
    authority: [], obligations: [], limits: ['PR not opened yet.'] }] });
const clauseOptions = { inventory, sourceHashes: { 'src/main.ts': sourceHash },
  executions: [execution], captures: [], allowPendingShip: true };

test('original clauses and requirements remain exact;SHIP alone may remain visibly pending before final PR', () => {
  assert.equal(validateClauseRows(clauseRows(), clauseOptions).pendingShip, true);
  assert.throws(() => validateClauseRows(clauseRows(), { ...clauseOptions, allowPendingShip: false }));
});

test('omitted,duplicate,altered,unsupported-complete or unexecuted clause proof fails', () => {
  for (const alter of [
    value => { value.originalClauses = []; },
    value => { value.originalClauses.push(structuredClone(value.originalClauses[0])); },
    value => { value.originalClauses[0].text = 'Narrower substituted scope'; },
    value => { value.originalClauses[0].obligations = []; },
    value => { value.originalClauses[0].obligations[0].executionIds = []; },
    value => { value.originalClauses[0].obligations[0].executionIds = ['invented-run']; },
    value => { value.originalClauses[0].status = 'complete'; },
    value => { value.originalClauses[0].status = 'pending-pr'; },
  ]) { const value = clauseRows(); alter(value); assert.throws(() => validateClauseRows(value, clauseOptions)); }
  assert.throws(() => validateClauseRows(clauseRows(), { ...clauseOptions, executions: [{ ...execution, terminalExit: 1 }] }));
});

test('an external command must retain a receipt and successful measured assertions', () => {
  const command = { id: execution.id, kind: 'measured-command', commandId: 'gh-pr-readback', terminalExit: 0,
    receiptPath: 'docs/release-evidence/pr-readback.json', receiptSha256: sourceHash,
    assertions: [{ name: 'actual PR open state', actual: 'OPEN', expected: 'OPEN' }] };
  assert.equal(validateClauseRows(clauseRows(), { ...clauseOptions, executions: [command] }).pendingShip, true);
  const closed = structuredClone(command); closed.assertions[0].actual = 'CLOSED';
  assert.throws(() => validateClauseRows(clauseRows(), { ...clauseOptions, executions: [closed] }), /actual PR open state/);
  const missing = structuredClone(command); delete missing.receiptSha256;
  assert.throws(() => validateClauseRows(clauseRows(), { ...clauseOptions, executions: [missing] }));
});

test('required visual cells cannot shrink to the completed HUD tracer', () => {
  const ids = requiredVisualIds(); assert.equal(new Set(ids).size, ids.length);
  for (const variant of ['survive-arcade', 'survive-flow', 'relay', 'race']) {
    for (const size of ['200x160', '240x240', '320x560', '900x600', '1000x280', '2400x1200']) {
      for (const theme of ['dark', 'light']) assert.ok(ids.some(id => id.startsWith(variant + '-') && id.includes(`${size}-${theme}-`)));
    }
  }
  for (const state of ['recovery', 'owner-target', 'handoff', 'disconnect', 'market', 'fog', 'results-tie', 'results-dnf']) assert.ok(ids.some(id => id.includes(`-${state}-`)));
  assert.ok(ids.some(id => id.includes('-full-')));
  assert.ok(ids.some(id => id.startsWith('survive-flow-recovery-1000x280-')));
});

test('durable acquisition receipts reject nonterminal,failing,tampered or unmatched output', () => {
  const outputText = 'Captured actual fixture\n';
  const receipt = { commandId: 'capture-fixture', terminalExit: 0, signal: null, pid: 123,
    argv: ['evidence.mjs', '--capture-worker', 'tracer'], startedAt: '2026-10-18T00:00:00Z',
    finishedAt: '2026-10-18T00:00:01Z', outputText, logSha256: sha(outputText) };
  const accept = row => { const bytes = Buffer.from(JSON.stringify(row)); return validateCaptureReceipt(bytes, { commandId: receipt.commandId, receiptSha256: sha(bytes) }); };
  assert.equal(accept(receipt).terminalExit, 0);
  for (const alter of [row => { row.terminalExit = null; }, row => { row.terminalExit = 1; },
    row => { row.signal = 'SIGTERM'; }, row => { row.pid = 0; }, row => { row.argv = []; },
    row => { row.outputText = ''; }, row => { row.outputText += 'invented'; }, row => { row.commandId = 'another-run'; }]) {
    const changed = structuredClone(receipt); alter(changed); assert.throws(() => accept(changed));
  }
  assert.throws(() => validateCaptureReceipt(Buffer.from('{}'), { commandId: receipt.commandId, receiptSha256: sha(JSON.stringify(receipt)) }));
});

test('contact sheets require every current mode/base/theme image exactly once and reject stale bytes', async () => {
  const value = { captures: [], sheets: [] };
  for (const variant of ['survive-arcade', 'survive-flow', 'relay', 'race']) for (const theme of ['dark', 'light']) {
    const row = { ...capture(theme), id: `${variant}-${theme}`, mode: variant.startsWith('survive') ? 'survive' : variant,
      base: variant === 'survive-arcade' ? 'arcade' : 'stroll' }; value.captures.push(row);
    value.sheets.push({ id: `${variant}-${theme}`, image: `docs/release-evidence/images/sheet-${variant}-${theme}.png`,
      imageSha256: sha(png), frame: { width: 1, height: 1 }, captureIds: [row.id] });
  }
  assert.equal((await validateSheets(value, async () => png)).everyCaptureRepresented, true);
  for (const alter of [row => { row.sheets.pop(); }, row => { row.sheets[0].captureIds = []; },
    row => { row.sheets[0].captureIds = [row.captures[1].id]; }, row => { row.sheets[0].imageSha256 = 'c'.repeat(64); },
    row => { row.sheets[0].frame.height = 2; }, row => { row.sheets[0].image = '../outside.png'; },
    row => { row.sheets[0].id = row.sheets[1].id; }]) {
    const changed = structuredClone(value); alter(changed); await assert.rejects(validateSheets(changed, async () => png));
  }
});

test('measured clause assertions must match the exact successful receipt fields', async () => {
  const bytes = Buffer.from(JSON.stringify({ command: { exit: 0 }, observed: { branch: 'feature' } }));
  const execution = { kind: 'measured-command', terminalExit: 0, receiptPath: 'receipt.json', receiptSha256: sha(bytes),
    terminalPath: ['command', 'exit'], assertions: [{ name: 'actual branch', actual: 'feature', expected: 'feature', receiptPath: ['observed', 'branch'] }] };
  assert.equal(await verifyMeasuredExecution(execution, async () => bytes), true);
  for (const alter of [row => { row.receiptSha256 = 'c'.repeat(64); }, row => { row.terminalPath = ['missing']; },
    row => { row.terminalPath = ['observed', 'branch']; }, row => { row.assertions[0].actual = row.assertions[0].expected = 'invented'; },
    row => { row.assertions[0].receiptPath = ['missing']; }]) {
    const changed = structuredClone(execution); alter(changed); await assert.rejects(verifyMeasuredExecution(changed, async () => bytes));
  }
  await assert.rejects(verifyMeasuredExecution(execution, async () => { throw Error('Missing receipt'); }));
});

test('clause obligations retain named positive assertions rather than an arbitrary suite label', () => {
  const document = clauseRows(); document.caseReferencesRequired = true;
  const obligation = document.originalClauses[0].obligations[0];
  assert.throws(() => validateClauseRows(document, clauseOptions), /named executed assertions/);
  obligation.caseRefs = { [execution.id]: ['invented passing case'] };
  assert.throws(() => validateClauseRows(document, clauseOptions), /Unexecuted case reference/);
  obligation.caseRefs[execution.id] = execution.cases;
  assert.equal(validateClauseRows(document, clauseOptions).pendingShip, true);
});
