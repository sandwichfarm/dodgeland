# Conformance evidence calibration

Measured 2026-10-14 against the installed `@napplet/conformance-cli` 0.2.15 and its `@napplet/conformance` 0.13.0 dependency. This is release preparation, not Phase 7 completion. No application, dependency, lockfile, build or browser artifact was changed.

## What the current command proves

The latest actual built-iframe report is `/tmp/down-to-duck-02-05-final-runtime-docs.log`: five passing checks, zero failures, five skips. Its passing boot and absent-domain checks came from a real browser. The skips are three missing-manifest checks, no collected wire envelopes, and unmeasured teardown. They are not five additional passes.

The installed CLI's `main` calls `buildContext({ manifestHtml, boot, forbiddenGlobals })`. Its option parser has no manifest-event or lifecycle-evidence input. Repeating this HTML-only command with a longer settle window cannot supply those missing facts. `buildContext` in the pure engine does accept `manifestEvent` and `lifecycle`, but a caller must measure or resolve them honestly.

## Measured limitations

An isolated Node probe imported the installed engine directly and exercised these public APIs; it did not run or modify the application.

| Probe | Observed result | Consequence |
| --- | --- | --- |
| `validateManifestEvent` with kind5129, a 64-zero `/index.html` path hash, and deliberately invalid `id`, `pubkey` and `sig` strings | `ok: true` | This validator checks the manifest's structural fields. It does not prove cryptographic identity, signature, or equality of the declared hash to built HTML bytes. |
| Same event with path hash `bad` | `ok: false`, `invalid-index-html-hash` | Hash syntax is checked. This is a useful negative control, not byte-integrity verification. |
| `validateEnvelope({ type: 'gamepad.subscribe' })` | `ok: false`, `unknown-domain` | This released engine predates the separately authorized NAP-GAMEPAD draft. Do not silently feed the draft through an allowlist bypass or claim this engine validated it. |
| `runConformance(makeContext({ manifestHtml: '<!doctype html><p>fixture</p>' }))` | Four boot fields pass using context defaults; other unavailable facts skip | `makeContext` is a test convenience. Its default passing booleans are not browser observations. A custom release runner must use actual collected evidence, not default these fields into passing results. |

The fake manifest above is solely a negative calibration fixture. It is not a deployment event, was never signed or published, and must not be supplied as evidence about this napplet.

## Manifest version boundary

The installed engine probe above uses legacy `path` tags. The locally installed `napplet-test/SKILL.md` instead describes a direct artifact `x` hash and `R`/`O` domain tags, and explicitly identifies path/aggregate events as legacy. These are different validation contracts. Before constructing Phase 7 candidate evidence, resolve the required format against the living NIP-5D authority and identify which validator version implements it. Do not change a production manifest to satisfy this older engine, treat a legacy structural pass as current-protocol validation, or silently migrate/publish a manifest as part of coverage work. This note records an observed local tooling mismatch; it does not establish the current protocol from the skill alone.

## Implementation guidance for the release phase

1. Retain the current CLI report unchanged and explicitly list its measured and skipped checks.
2. For a supplemental engine run, assemble `buildContext` from real muted opaque-iframe boot/degraded observations. Preserve collected message origins/direction, payloads, and validator verdicts. Do not substitute manually constructed successful envelopes for traffic emitted by the production artifact.
3. Measure teardown: record actual listeners/subscriptions before installation and after double `pagehide`, check exact unsubscribe counts and ignored late events, then derive the engine's `listenerLeak` boolean from that record. The existing built controller/tracer fixtures already exercise parts of this, but their assertions need to be carried into durable release evidence rather than asserting a literal `false`.
4. If validating a local candidate manifest, generate it from the actual public deployment configuration and exact built-file digest without reading or printing ignored credentials. Label it a local candidate. Verify signature/event ID and built-byte digests independently if those claims are made; the engine alone does not check them. Do not publish an event or imply the current artifact has been published.
5. Keep the authorized controller draft's exact transport validation separate and explicit. `docs/gamepad.md` pins its authority; both built runtime transport fixtures prove the implemented snapshots and lifecycle. Either a later compatible standard validator or a clearly scoped supplemental draft validator may report that evidence. Never relabel an unknown-domain failure as an engine pass.
6. A protocol-neutral SDK method fixture is useful for application behavior but is not proof of a wire envelope that it never emitted. Distinguish those scopes in the final PR.

No new dependency or automatic approval requirement is introduced here. Phase 2 retains its immutable-baseline lockfile gate. Physical controllers and an external target shell remain distinct from deterministic injected transport coverage.

## Reproducing the engine probes

Resolve the engine relative to the installed CLI dependency (it is ESM-only; CJS `require.resolve` with require conditions fails). In the current install its import entry is:

`node_modules/.pnpm/@napplet+conformance-cli@0.2.15/node_modules/@napplet/conformance/dist/index.js`

```js
const synthetic = {
  kind: 5129, id: 'invalid', pubkey: 'invalid', sig: 'invalid',
  created_at: 0, content: '',
  tags: [['path', '/index.html', '0'.repeat(64)]],
};
validateManifestEvent(synthetic); // structural verdict only: ok true
validateManifestEvent({ ...synthetic, tags: [['path', '/index.html', 'bad']] }); // fails
validateEnvelope({ type: 'gamepad.subscribe' }); // unknown-domain in 0.13.0
runConformance(makeContext({ manifestHtml: '<!doctype html><p>fixture</p>' }));
```

Source grounding: installed package READMEs and `dist/index.d.ts`; engine `validateManifestEvent`, `makeContext`, `buildContext`, and `CHECKS`; CLI option parser and `main`. These findings describe the pinned installed versions, not an assumption about newer releases.

## Read-only preparation for 07-04, 2026-10-16

Independent reviewer `/root/survive_verifier_fallback` inspected the installed packages and primary protocol sources during full collection11460. No tests, builds, browser journeys, dependency changes or implementation ran for this preparation. It does not complete07-04 or bypass07-03's dependency on the complete07-12 report.

- Resolve the SDK0.29 real package directory and its dependency context for nap/core0.33. The public `@napplet/nap/storage/shim` export provides `nappletStorage` and `installStorageShim`; the separate nap0.28 install and hardcoded pnpm paths are not appropriate substitutes.
- SDK `storage.setItem` directly returns the injected domain promise. Official `nappletStorage.setItem` returns `setItemScoped`, which awaits the wire request. A non-async host-only forwarding wrapper can observe settlement and return that same promise. Actual requests are `{type:"storage.set",id:UUID,key,value}` and replies `{type:"storage.set.result",id}`. Hydration uses `storage.get` and `{type:"storage.get.result",id,value:null}`. Official `postToShell` delegates to core `sendEnvelope` with default target `"*"`.
- The shim verifies `event.source === window.parent`, the storage-result type pattern and pending ID. It does not additionally check that the result action matches the original request action. Wrong-source, wrong-ID and duplicate-reply checks remain meaningful; do not claim stronger matching than the code implements.
- Its timeout is5000ms. Cleanup removes the listener and clears the pending map, but does not cancel pending timeout handles or reject pending promises. Observe the missing-response timeout before cleanup. Keep product subscription disposal distinct from host-installed shim cleanup.
- Conformance0.13 exposes `buildContext`, `runConformance`, `validateEnvelope`, `validateManifestEvent`, `CHECKS` and reporters. `validateEnvelope` is outbound-only: a `storage.set.result` input yields `inbound-type-emitted`. Validate actual response correlation separately, not as an inbound engine pass. The engine's lifecycle input is only `{listenerLeak:boolean}` and cannot independently establish complete teardown.

The primary NIP-5D revision observed today is `5560820fa4f37f45b8ab742a11aeb3001b17dc67`: [pinned text](https://raw.githubusercontent.com/dskvr/nips/5560820fa4f37f45b8ab742a11aeb3001b17dc67/5D.md). Its candidate manifest contract uses one artifact `x`, `R`/`O`, nonempty description content and constrained optional `source`, including SSH/Git forms. The installed legacy `path`/`requires` validator cannot prove that contract. Storage remains a [draft proposal](https://github.com/napplet/naps/pull/3) with correlated requests/results and omitted scope meaning shared. Differing cached branch snapshots were observed: resolve and pin fresh primary reference bytes/revision during07-04 execution instead of relying on a PR description or this preparatory note.

The planned host proof remains implementable with these limits. It must not imply signed-manifest identity, external-shell persistence, physical hardware coverage, inbound engine validation or complete shim timer cleanup.


## Read-only reference and public-candidate recheck,2026-10-17

During the live current-full-03 collection,read-only preparation resolved the
actual NIP-5D PR2303 head through GitHub's public API. It is still5560820fa4f37f45b8ab742a11aeb3001b17dc67
on dskvr/nips nip/5d. Exact primary text SHA256 is
7d716e8ec9f1737b070f4716b998f52fd6e189d5bb1bc4c2efe6c1dae35b9f37;
retrieved bytes and JSON metadata are retained under artifacts/release-conformance-prep.
The repository's master branch does not contain5D.md;the PR head is the authority,
not that404 or the PR description. No protocol/dependency/source change follows.

The normal public dist/.nip5a-manifest.json candidate was inspected without
reading ignored deployment/signing configuration. It has kind35129,a single
stable d=puddlehop,a single x matching actual normal index.html SHA e9800fc8,
nonempty plain description,title Down to Duck,optional intent,z=game and the
seed/mode intent parameters. No legacy path/requires/description tags occur.
No source tag is present. id/pubkey/sig are absent:signature and publication
remain unmeasured,not an identity verification failure of this unsigned candidate.
Exact candidate bytes and inspection metadata are retained in the prep artifacts.

This is preparatory inspection only. It does not execute07-04,bypass07-03,prove a
wire request/response or teardown,replace positive/negative validator controls,
or change the installed legacy engine's limitations. The full169-job coverage
run remains the only active test/build/browser chain. Reconfirm exact artifact
and reference identities during final07-04 execution.
