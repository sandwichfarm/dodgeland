// Final release runner; execution requires completed07-05 evidence.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { openSync, closeSync, writeSync, readFileSync } from 'node:fs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const INHERITED_SHA = '7bdba2abaf0346075ffe9a037eb02332c7cfc5a837a99387a4bb650f09e059e9';
const LOCK_SHA = '5ac3c476e3049e2e9c3261b7a34b3b709d88fad3382277d4b38e0546f06ab58d';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function assertInheritedGate(bytes) { assert.equal(sha(bytes), INHERITED_SHA, 'Inherited gate changed'); return true; }
export const acceptanceStatus = calibrationOnly => calibrationOnly
  ? { status: 'partial-calibration-pass', technicalAccepted: false, releaseAccepted: false }
  : { status: 'technical-gates-pass', technicalAccepted: true, releaseAccepted: false };

export function verifyArtifactCoupling(coverage, conformance, { normalBytes, sourceHashes }) {
  assert.equal(coverage.status, 'enforced-pass'); assert.equal(coverage.thresholdsEvaluated, true);
  assert.equal(coverage.policyResult.pass, true); assert.deepEqual(coverage.policyResult.failures, []);
  // The collector hashes JSON(Buffer);capture/protocol artifacts use raw bytes.
  // Keep both representations explicit instead of silently comparing unlike hashes.
  assert.equal(coverage.normalArtifactHash, sha(JSON.stringify(normalBytes)));
  assert.equal(conformance.artifactHash, sha(normalBytes));
  for (const path of ['src/main.ts', 'src/sound-settings.ts', 'src/gamepad.ts']) {
    assert.match(sourceHashes[path], /^[a-f0-9]{64}$/);
    assert.equal(conformance.sourceHashes[path], sourceHashes[path]);
  }
  assert.equal(conformance.currentManifest.byteDigestMatches, true);
  assert.equal(conformance.engine.supplemental.ok, true);
  const expected = ['no-invocation', 'matching-reply', 'wrong-id', 'wrong-window', 'missing-reply'];
  assert.deepEqual(conformance.journeys.map(journey => journey.scenario).sort(), [...expected].sort());
  for (const journey of conformance.journeys) assert.equal(journey.acceptance,
    ['no-invocation', 'missing-reply'].includes(journey.scenario) ? 'rejected-as-required' : 'observed-completion');
  return true; // Coupling only;the real producer checks remain required.
}

function invalidTap(stdout, required) {
  const counts = [...stdout.matchAll(/^#\s+(tests|pass|fail|cancelled|skipped|todo)\s+(\d+)\s*$/gm)];
  if (required && !counts.some(match => match[1] === 'tests' && Number(match[2]) > 0)) return 'Missing nonempty TAP';
  const summaries = []; let current;
  for (const match of counts) {
    if (match[1] === 'tests') { current = {}; summaries.push(current); }
    if (!current) return 'TAP summary missing its test count';
    current[match[1]] = Number(match[2]);
  }
  for (const summary of summaries) {
    if (!['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].every(key => Object.hasOwn(summary, key))) return 'Incomplete TAP summary';
    if (summary.tests <= 0 || summary.pass !== summary.tests || ['fail', 'cancelled', 'skipped', 'todo'].some(key => summary[key] !== 0)) return 'Empty,failed,cancelled,skipped or todo TAP';
  }
  if (/^\s*(?:not )?ok\s+\d+.*#\s*(?:SKIP|TODO)\b/im.test(stdout)) return 'Skipped/todo test';
  return null;
}

async function child(stage, directory, mirror) {
  const stdoutPath = join(directory, `${stage.id}.stdout.log`), stderrPath = join(directory, `${stage.id}.stderr.log`);
  const stdoutFd = openSync(stdoutPath, 'wx'), stderrFd = openSync(stderrPath, 'wx');
  const env = { ...process.env }; delete env.DOWN_TO_DUCK_COVERAGE_CONFIG; delete env.NODE_TEST_CONTEXT;
  const startedMs = Date.now(), stdout = [], stderr = [];
  return await new Promise(resolveResult => {
    let processError;
    const processChild = spawn(stage.executable, stage.args, { stdio: ['ignore', 'pipe', 'pipe'], env });
    processChild.on('error', error => { processError = { code: error.code, message: error.message }; });
    processChild.stdout.on('data', bytes => { stdout.push(bytes); writeSync(stdoutFd, bytes); if (mirror) process.stdout.write(bytes); });
    processChild.stderr.on('data', bytes => { stderr.push(bytes); writeSync(stderrFd, bytes); if (mirror) process.stderr.write(bytes); });
    processChild.on('close', (exitCode, signal) => {
      closeSync(stdoutFd); closeSync(stderrFd);
      const finishedMs = Date.now(), stdoutBytes = Buffer.concat(stdout), stderrBytes = Buffer.concat(stderr);
      let durabilityError = null;
      try {
        assert.equal(sha(readFileSync(stdoutPath)), sha(stdoutBytes), 'Recorded stdout bytes differ');
        assert.equal(sha(readFileSync(stderrPath)), sha(stderrBytes), 'Recorded stderr bytes differ');
      } catch (error) { durabilityError = error.message; }
      resolveResult({ id: stage.id, executable: stage.executable, args: stage.args, pid: processChild.pid ?? null,
        startedMs, finishedMs, durationMs: finishedMs - startedMs, exitCode, signal,
        processError: processError ?? null, durabilityError, stdoutPath, stderrPath,
        stdoutSha256: sha(stdoutBytes), stderrSha256: sha(stderrBytes), stdout: stdoutBytes.toString() });
    });
  });
}

export async function runStageChain(stages, { directory, mirror = true, checkStable }) {
  assert.ok(Array.isArray(stages) && stages.length > 0);
  assert.equal(new Set(stages.map(stage => stage.id)).size, stages.length);
  for (const stage of stages) { assert.match(stage.id, /^[a-z0-9-]+$/); assert.ok(stage.executable && Array.isArray(stage.args)); }
  await mkdir(directory, { recursive: true });
  const ledger = [];
  for (const stage of stages) {
    if (checkStable) {
      try { await checkStable('before', stage); }
      catch (error) { error.ledger = ledger; throw error; }
    }
    if (mirror) console.log(`${new Date().toISOString()} BEGIN ${stage.id}`);
    const result = await child(stage, directory, mirror);
    let stableError;
    if (checkStable) { try { await checkStable('after', stage); } catch (error) { stableError = error.message; } }
    const failure = result.processError?.message ?? result.durabilityError ?? result.signal ?? (result.exitCode !== 0 ? `Exit ${result.exitCode}` : invalidTap(result.stdout, stage.requiresTap)) ?? stableError;
    const { stdout, ...record } = result; ledger.push({ ...record, pass: !failure, failure });
    await writeFile(join(directory, 'stages.json'), JSON.stringify(ledger, null, 2) + '\n');
    if (failure) { const error = Error(`FAIL ${stage.id}: ${failure}`); error.ledger = ledger; throw error; }
    if (mirror) console.log(`${new Date().toISOString()} PASS ${stage.id}`);
  }
  return { ledger, applicationAcceptance: false, scope: 'Child terminal ledger;full CLI/source/report checks remain necessary' };
}

const calibrationFiles = ['calibration', 'browser-calibration', 'collection', 'policy', 'attribution'].map(name => `tools/release-coverage/${name}.test.mjs`);
const sourcePaths = ['src', 'tests', 'tools', 'examples', 'docs/mode-rules.md', 'index.html', 'package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'tsconfig.json'];
async function snapshot() {
  const dirty = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', ...sourcePaths], { encoding: 'utf8' });
  assert.equal(dirty.trim(), '', 'Commit technical inputs before final freeze');
  assert.equal(execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...sourcePaths], { encoding: 'utf8' }).trim(), '', 'Untracked technical input');
  const paths = execFileSync('git', ['ls-files', '-z', '--', ...sourcePaths], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
  assert.ok(paths.length > 0);
  const hashes = {}; for (const path of paths) hashes[path] = sha(await readFile(path));
  return hashes;
}

async function main() {
  const flags = process.argv.slice(2), calibrationOnly = flags.includes('--calibration-only');
  const values = { '--reference': resolve('docs/release-evidence/reference/nip-5d.md'), '--reference-metadata': resolve('docs/release-evidence/reference/reference.json') };
  for (let index = 0; index < flags.length; index++) {
    if (flags[index] === '--calibration-only') continue;
    assert.ok(['--reference', '--reference-metadata', '--output'].includes(flags[index]));
    assert.ok(flags[index + 1]); values[flags[index]] = resolve(flags[++index]);
  }
  assertInheritedGate(await readFile('tests/phase6-gate.mjs'));
  assert.equal(sha(await readFile('pnpm-lock.yaml')), LOCK_SHA, 'Immutable root dependency lock changed');
  const root = resolve('.'), runId = randomUUID(), directory = values['--output'] ?? join(root, 'artifacts/release-final', runId);
  const before = await snapshot(), normalHash = sha(await readFile('dist/index.html'));
  const calibration = { id: 'calibration', executable: process.execPath,
    args: ['tests/strict-node-tests.mjs', ...calibrationFiles], requiresTap: true };
  const stages = calibrationOnly ? [calibration] : [
    { id: 'inherited-phase6', executable: process.execPath, args: ['tests/phase6-gate.mjs'], requiresTap: true },
    calibration,
    { id: 'enforcing-coverage', executable: process.execPath,
      args: ['--max-old-space-size=24576', 'tools/release-coverage/run.mjs', '--output', join(directory, 'coverage')], requiresTap: true },
    { id: 'conformance-controls', executable: process.execPath, args: ['tests/strict-node-tests.mjs', 'tests/release-conformance.test.mjs'], requiresTap: true },
    { id: 'supplemental-conformance', executable: process.execPath, args: ['tests/release-conformance.mjs',
      '--reference', values['--reference'], '--reference-metadata', values['--reference-metadata'], '--output', join(directory, 'conformance.json')], requiresTap: false },
    { id: 'evidence-controls', executable: process.execPath, args: ['tests/strict-node-tests.mjs', 'tests/release-evidence.test.mjs'], requiresTap: true },
    { id: 'evidence-integrity', executable: process.execPath, args: ['tools/release-coverage/evidence.mjs', '--check'], requiresTap: false },
    { id: 'original-clauses', executable: process.execPath, args: ['tools/release-coverage/evidence.mjs', '--check-clauses'], requiresTap: false },
  ];
  if (!calibrationOnly) assert.ok(values['--reference'] && values['--reference-metadata'], 'Fresh pinned reference inputs required');
  await mkdir(dirname(directory), { recursive: true });
  await mkdir(directory); // A final invocation cannot overwrite a prior run.
  let completedLedger = [];
  try {
    const result = await runStageChain(stages, { directory, checkStable: async () => {
      assert.deepEqual(await snapshot(), before, 'Technical inputs changed during final run');
      assert.equal(sha(await readFile('dist/index.html')), normalHash, 'Normal artifact changed');
    } });
    completedLedger = result.ledger;
    assert.deepEqual(completedLedger.map(stage => stage.id), stages.map(stage => stage.id), 'Missing final stage');
    assert.deepEqual(await snapshot(), before, 'Technical inputs changed during final run');
    assert.equal(sha(await readFile('dist/index.html')), normalHash, 'Normal artifact changed');
    if (!calibrationOnly) {
      const coverage = JSON.parse(await readFile(join(directory, 'coverage/manifest.json')));
      const conformance = JSON.parse(await readFile(join(directory, 'conformance.json')));
      verifyArtifactCoupling(coverage, conformance, { normalBytes: await readFile('dist/index.html'), sourceHashes: before });
    }
    const report = { ...acceptanceStatus(calibrationOnly), runId, createdAt: new Date().toISOString(),
      sourceHashes: before, normalArtifactHash: normalHash, inheritedGateHash: INHERITED_SHA, rootLockHash: LOCK_SHA,
      stages: result.ledger, prOpened: false, limit: 'Technical command proof only;actual PR delivery and final clause update remain separate' };
    await writeFile(join(directory, 'release.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(calibrationOnly ? 'PARTIAL CALIBRATION PASS; release acceptance not evaluated' : 'RELEASE TECHNICAL GATES PASS; PR delivery still required');
  } catch (error) {
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'failure.json'), JSON.stringify({ status: 'failed', releaseAccepted: false,
      runId, message: error.message, ledger: error.ledger ?? completedLedger }, null, 2) + '\n');
    throw error;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
