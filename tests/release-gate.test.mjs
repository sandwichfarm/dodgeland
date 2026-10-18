// Real subprocess negative controls for the final release runner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { runStageChain, assertInheritedGate, acceptanceStatus, verifyArtifactCoupling } from './release-gate.mjs';

const passing = "console.log('# tests 1\\n# pass 1\\n# fail 0\\n# cancelled 0\\n# skipped 0\\n# todo 0')";
const stage = (id, code = passing) => ({ id, executable: process.execPath, args: ['-e', code], requiresTap: true });
async function withLogs(action) {
  const directory = await mkdtemp(join(tmpdir(), 'release-gate-control-'));
  try { return await action(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('actual controlled child processes run sequentially without claiming game acceptance', async () => withLogs(async directory => {
  const result = await runStageChain([stage('one'), stage('two')], { directory, mirror: false });
  assert.deepEqual(result.ledger.map(row => row.id), ['one', 'two']);
  assert.ok(result.ledger.every(row => Number.isInteger(row.pid) && row.exitCode === 0));
  assert.ok(result.ledger[1].startedMs >= result.ledger[0].finishedMs);
  assert.equal(result.applicationAcceptance, false);
}));

test('failure,signal,missing executable,empty TAP and skipped TAP stop before later stages', async () => withLogs(async directory => {
  for (const [name, first] of [
    ['nonzero', stage('first', 'process.exit(7)')],
    ['signal', stage('first', "process.kill(process.pid,'SIGTERM')")],
    ['missing', { ...stage('first'), executable: join(directory, 'missing-executable') }],
    ['empty', stage('first', '')],
    ['incomplete', stage('first', "console.log('# tests 1')")],
    ['skip', stage('first', "console.log('# tests 1\\n# pass 0\\n# fail 0\\n# cancelled 0\\n# skipped 1\\n# todo 0')")],
  ]) {
    await assert.rejects(runStageChain([first, stage('later')], { directory: join(directory, name), mirror: false }), error => {
      assert.equal(error.ledger.length, 1); assert.equal(error.ledger[0].id, 'first'); return true;
    });
  }
}));

test('a child changing the guarded artifact stops the next stage despite exit0', async () => withLogs(async directory => {
  const artifact = join(directory, 'normal-artifact'); await writeFile(artifact, 'original');
  const mutate = { id: 'mutate', executable: process.execPath,
    args: ['-e', "require('node:fs').writeFileSync(process.argv[1],'changed')", artifact], requiresTap: false };
  await assert.rejects(runStageChain([mutate, stage('later')], { directory, mirror: false,
    checkStable: async () => assert.equal(await readFile(artifact, 'utf8'), 'original', 'Artifact changed') }), error => {
    assert.equal(error.ledger.length, 1); assert.equal(error.ledger[0].exitCode, 0);
    assert.equal(error.ledger[0].pass, false); return true;
  });
}));

test('empty and duplicate stage lists cannot establish a gate', async () => withLogs(async directory => {
  await assert.rejects(runStageChain([], { directory, mirror: false }));
  await assert.rejects(runStageChain([stage('one'), stage('one')], { directory, mirror: false }));
}));

test('calibration-only result stays explicitly partial', () => {
  assert.deepEqual(acceptanceStatus(true), { status: 'partial-calibration-pass', technicalAccepted: false, releaseAccepted: false });
  assert.deepEqual(acceptanceStatus(false), { status: 'technical-gates-pass', technicalAccepted: true, releaseAccepted: false });
});

test('inherited gate is byte-pinned,including its exact existing nested command order', async () => {
  const text = await readFile('tests/phase6-gate.mjs');
  assert.equal(assertInheritedGate(text), true);
  assert.throws(() => assertInheritedGate(Buffer.concat([text, Buffer.from('\n')])));
});

test('current report coupling distinguishes raw artifact SHA from collector JSON(Buffer) hash', () => {
  const hash = value => createHash('sha256').update(value).digest('hex');
  const normalBytes = Buffer.from('normal artifact fixture'), sourceHashes = Object.fromEntries(
    ['src/main.ts', 'src/sound-settings.ts', 'src/gamepad.ts'].map(path => [path, 'a'.repeat(64)]));
  const coverage = { status: 'enforced-pass', thresholdsEvaluated: true, policyResult: { pass: true, failures: [] },
    normalArtifactHash: hash(JSON.stringify(normalBytes)) };
  const conformance = { artifactHash: hash(normalBytes), sourceHashes, currentManifest: { byteDigestMatches: true },
    engine: { supplemental: { ok: true } }, journeys: ['no-invocation', 'matching-reply', 'wrong-id', 'wrong-window', 'missing-reply'].map(scenario => ({ scenario,
      acceptance: ['no-invocation', 'missing-reply'].includes(scenario) ? 'rejected-as-required' : 'observed-completion' })) };
  assert.equal(verifyArtifactCoupling(coverage, conformance, { normalBytes, sourceHashes }), true);
  assert.throws(() => verifyArtifactCoupling({ ...coverage, normalArtifactHash: hash(normalBytes) }, conformance, { normalBytes, sourceHashes }));
  assert.throws(() => verifyArtifactCoupling(coverage, { ...conformance, artifactHash: 'b'.repeat(64) }, { normalBytes, sourceHashes }));
  assert.throws(() => verifyArtifactCoupling(coverage, { ...conformance, journeys: conformance.journeys.slice(1) }, { normalBytes, sourceHashes }));
});
