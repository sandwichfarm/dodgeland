// Supplemental release conformance;only actual execution can establish proof.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectJourney, isObservedJourney, dependencyPackage } from './release-conformance-host.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const root = resolve('.');

export function assertWireJourney(receipt) {
  assert.ok(isObservedJourney(receipt), 'Only an observed receiver/official-promise journey can establish wire proof');
  const { request, baseline, checkpoints, transcript } = receipt;
  assert.ok(request, 'A visible action must produce a new invocation/request');
  assert.equal(request.type, 'storage.set');
  assert.match(request.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(request.key, 'puddlehop.progress.v1');
  assert.equal(typeof request.value, 'string');
  const newRequests = transcript.slice(baseline.receiver).filter(row => row.direction === 'out');
  assert.equal(newRequests.length, 1, 'Startup requests cannot supply user-action proof');
  assert.deepEqual(newRequests[0].data, request);
  assert.equal(newRequests[0].origin, 'null'); assert.equal(newRequests[0].matchedFrameSource, true);
  assert.equal(receipt.beforeDispose.invocations.length, baseline.snapshot.invocations.length + 1);
  const before = checkpoints.find(point => point.stage === 'before-reply')?.invocation;
  assert.ok(before); assert.equal(before.fulfilled, 0); assert.equal(before.rejected, 0);
  const after = receipt.beforeDispose.invocations.at(-1);
  assert.equal(after.key, request.key); assert.equal(after.value, request.value);
  assert.deepEqual(receipt.hostStorage.commits, [{ id: request.id, key: request.key, value: request.value }]);
  assert.deepEqual(receipt.hostStorage.entries.find(([key]) => key === request.key), [request.key, request.value]);
  assert.equal(after.fulfilled, 1, 'Missing/mismatched replies cannot establish completion');
  assert.equal(after.rejected, 0);
  const replies = receipt.beforeDispose.inbound.filter(row => row.parentSource && row.data.id === request.id);
  assert.ok(replies.length >= 2, 'Matching and duplicate replies must both be observed');
  assert.ok(replies.every(row => row.data.type === 'storage.set.result'));
  assert.equal(receipt.sandbox.allowScripts, true); assert.equal(receipt.sandbox.allowSameOrigin, false);
  if (receipt.scenario === 'wrong-id' || receipt.scenario === 'wrong-window') {
    const mismatch = checkpoints.find(point => point.stage === 'mismatched-reply')?.invocation;
    assert.ok(mismatch); assert.equal(mismatch.fulfilled, 0); assert.equal(mismatch.rejected, 0);
  }
  assert.deepEqual(receipt.errors, []); assert.deepEqual(receipt.external, []);
  return { requestId: request.id, perInvocationFulfillment: 1, duplicateSettlement: false };
}

// Deliberately scoped to fields in this generated public candidate. This is not
// a signature verifier or a replacement for every NIP-5D/NAP validator.
export function validateCurrentManifest(event, artifactHash) {
  assert.ok(event && typeof event === 'object' && !Array.isArray(event));
  assert.ok([5129, 15129, 35129].includes(event.kind), 'Current manifest kind');
  assert.equal(typeof event.content, 'string'); assert.ok(event.content.trim(), 'Nonempty plain description');
  assert.ok(Array.isArray(event.tags));
  for (const tag of event.tags) assert.ok(Array.isArray(tag) && tag.length >= 2 && tag.every(value => typeof value === 'string'));
  const tags = name => event.tags.filter(tag => tag[0] === name);
  assert.equal(tags('x').length, 1); assert.equal(tags('x')[0].length, 2);
  assert.match(tags('x')[0][1], /^[a-f0-9]{64}$/);
  assert.equal(tags('x')[0][1], artifactHash, 'Manifest must identify these exact artifact bytes');
  assert.equal(tags('d').length, event.kind === 35129 ? 1 : 0);
  if (event.kind === 35129) assert.ok(tags('d')[0][1].trim());
  for (const legacy of ['path', 'requires', 'description']) assert.equal(tags(legacy).length, 0, `Legacy ${legacy} is not current evidence`);
  const supported = new Set(['d', 'x', 'title', 'z', 'i', 'R', 'O']);
  assert.ok(event.tags.every(tag => supported.has(tag[0])), 'An unreviewed candidate field requires extending the explicit validation scope');
  assert.ok(tags('title').length <= 1);
  for (const tag of [...tags('R'), ...tags('O')]) assert.ok(tag.length === 2 && /^[a-z][a-z0-9-]*$/.test(tag[1]));
  for (const tag of tags('i')) assert.match(tag[1], /^napplet:[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/);
  for (const tag of tags('z')) assert.ok(tag[1].trim());
  return { contract: 'Current NIP-5D generated-candidate field subset', kind: event.kind,
    byteDigestMatches: true, artifactHash, checkedFields: [...supported],
    unsignedCandidate: !event.id && !event.pubkey && !event.sig,
    signatureMeasured: false, publicationMeasured: false,
    limit: 'No cryptographic identity/publication claim; optional fields absent from this candidate are not generically validated' };
}

async function installedEngine() {
  const cli = await dependencyPackage('@napplet/conformance-cli', import.meta.url);
  const owner = resolve(dirname(cli.path), 'dist/cli.js');
  const engine = await dependencyPackage('@napplet/conformance', owner);
  const entry = engine.metadata.exports['.'].import;
  return { module: await import(pathToFileURL(resolve(dirname(engine.path), entry))),
    provenance: { cliVersion: cli.metadata.version, engineVersion: engine.metadata.version,
      cliPackageHash: cli.sha256, enginePackageHash: engine.sha256,
      engineEntryHash: sha(await readFile(resolve(dirname(engine.path), entry))) } };
}

export async function runSupplement({ artifactPath, candidatePath, referencePath, referenceMetadataPath, outputPath }) {
  const artifact = await readFile(artifactPath), candidateBytes = await readFile(candidatePath);
  const candidate = JSON.parse(candidateBytes), artifactHash = sha(artifact);
  const candidateVerdict = validateCurrentManifest(candidate, artifactHash);
  const referenceBytes = await readFile(referencePath), metadataBytes = await readFile(referenceMetadataPath);
  const reference = JSON.parse(metadataBytes);
  assert.equal(sha(referenceBytes), reference.sha256);
  assert.match(reference.head, /^[0-9a-f]{40}$/);
  assert.equal(reference.source, `https://raw.githubusercontent.com/${reference.repository}/${reference.head}/5D.md`);
  assert.ok(reference.retrievedAt);
  const journeys = [];
  for (const scenario of ['no-invocation', 'matching-reply', 'wrong-id', 'wrong-window', 'missing-reply']) {
    const journey = await collectJourney(scenario, artifactPath);
    let acceptance;
    if (scenario === 'no-invocation' || scenario === 'missing-reply') {
      assert.throws(() => assertWireJourney(journey)); acceptance = 'rejected-as-required';
    } else { assertWireJourney(journey); acceptance = 'observed-completion'; }
    journeys.push({ ...journey, acceptance });
  }
  const observed = journeys.find(journey => journey.scenario === 'matching-reply');
  const { module: engine, provenance: engineProvenance } = await installedEngine();
  const emitted = observed.transcript.filter(row => row.direction === 'out').map(row => ({
    envelope: row.data, verdict: engine.validateEnvelope(row.data), timestamp: row.timestamp,
  }));
  assert.ok(emitted.length > 0 && emitted.every(row => row.verdict.ok));
  const actualReply = observed.transcript.find(row => row.direction === 'in' && row.data.type === 'storage.set.result');
  const inboundAsOutbound = engine.validateEnvelope(actualReply.data);
  assert.equal(inboundAsOutbound.ok, false);
  assert.ok(inboundAsOutbound.errors.some(error => error.code === 'inbound-type-emitted'));
  const draftControllerVerdict = engine.validateEnvelope({ type: 'gamepad.subscribe' });
  assert.equal(draftControllerVerdict.ok, false);
  const after = observed.afterSecondDispose;
  const listenerLeak = after.activeKeyHandlers !== 0 || after.activeFrames !== 0 || after.activeObservers !== 0 ||
    after.subscriptions.duplicateClose !== 0 || Object.keys(after.subscriptions.opened).some(kind =>
      after.subscriptions.opened[kind] !== after.subscriptions.closed[kind]);
  assert.equal(listenerLeak, false);
  const supplemental = engine.runConformance(engine.buildContext({
    manifestHtml: artifact.toString(), manifestEvent: null,
    sandbox: observed.sandbox,
    boot: { installedGlobal: observed.beforeDispose.installedGlobal, bootError: observed.errors[0] ?? null,
      emitted, degraded: null },
    forbiddenGlobals: observed.beforeDispose.forbidden,
    lifecycle: { listenerLeak },
  }));
  assert.equal(supplemental.ok, true);
  const legacyCandidateVerdict = engine.validateManifestEvent(candidate);
  assert.equal(legacyCandidateVerdict.ok, false, 'Legacy validator must not silently pass a direct-x candidate');
  const sourcePaths = ['src/main.ts', 'src/sound-settings.ts', 'src/gamepad.ts',
    relative(root, fileURLToPath(import.meta.url)), relative(root, fileURLToPath(new URL('./release-conformance-host.mjs', import.meta.url)))];
  const sourceHashes = {};
  for (const path of sourcePaths) sourceHashes[path] = sha(await readFile(path));
  const report = { purpose: 'Measured supplemental opaque-frame SDK wire and scoped teardown evidence',
    createdAt: new Date().toISOString(), artifactHash, candidateSha256: sha(candidateBytes),
    currentManifest: candidateVerdict, publicCandidateText: candidateBytes.toString(),
    primaryReference: { ...reference, metadataSha256: sha(metadataBytes) },
    engine: { ...engineProvenance, supplemental, legacyCandidateVerdict,
      inboundAsOutbound, draftControllerVerdict,
      distinction: 'Outbound engine validation only; actual reply correlation independently measured; no draft-controller or current-manifest engine pass' },
    journeys,
    sourceHashes,
    limits: ['No signature,publication,physical controller or external target-shell persistence measurement',
      'Only storage uses the official shim/wire;theme,intent,keys subscriptions are injected host fixtures',
      'No zero-domain degraded boot in this supplement;engine degraded/manifest checks remain unmeasured',
      'Lifecycle means measured subscriptions,animation frames and ResizeObserver;not every DOM listener',
      'Host-owned shim cleanup is separate;pending timeout handles are not claimed cancelled',
      'Existing CLI report remains separate and is not overwritten'] };
  assert.equal(sha(await readFile(artifactPath)), artifactHash, 'Artifact changed during collection');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
  return report;
}

async function main() {
  const args = process.argv.slice(2), options = {};
  for (let index = 0; index < args.length; index += 2) {
    assert.ok(['--artifact', '--candidate', '--reference', '--reference-metadata', '--output'].includes(args[index]));
    assert.ok(args[index + 1]); options[args[index]] = resolve(args[index + 1]);
  }
  assert.ok(options['--reference'] && options['--reference-metadata'], 'Supply freshly rechecked pinned primary reference bytes and metadata');
  const report = await runSupplement({ artifactPath: options['--artifact'] ?? resolve('dist/index.html'),
    candidatePath: options['--candidate'] ?? resolve('dist/.nip5a-manifest.json'),
    referencePath: options['--reference'], referenceMetadataPath: options['--reference-metadata'],
    outputPath: options['--output'] ?? resolve('docs/release-evidence/conformance.json') });
  console.log(JSON.stringify({ artifactHash: report.artifactHash, engine: report.engine.supplemental.summary,
    journeys: report.journeys.map(journey => ({ scenario: journey.scenario, acceptance: journey.acceptance })),
    signatureMeasured: false, publicationMeasured: false }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
