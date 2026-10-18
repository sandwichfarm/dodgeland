# Phase 07: Release Evidence & PR — Pattern Map

**Mapped:** 2026-10-16  
**Execution:** Generic-agent fallback applying the full local pattern-mapper role; not typed execution.  
**Scope:** 18 proposed file/responsibility groups; 13 have useful existing analogs, five require new implementation. Names below are planner candidates, not files already implemented. Read07-CONTEXT,07-RESEARCH and07-VALIDATION; reused previously read AGENTS/boundary context. No tests or installs run.

## File Classification

| Proposed new/modified path or group | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `tools/release-coverage/package.json` | config | dependency resolution | No standalone tooling package | None |
| `tools/release-coverage/pnpm-lock.yaml` | config | reproducible dependency resolution | Root lock is an invariant, not a modification template | None |
| `tools/release-coverage/emission.mjs` | utility | TS → mapped/instrumented JS | `tests/source-loader.mjs` | Role; transform must change |
| `tools/release-coverage/inventory.mjs` | utility | source files → manifest/zero schemas | `tests/cross-mode-presentation.mjs:8–12` | Partial |
| `tools/release-coverage/collector.mjs` | utility | process/realm events → payload files | No existing coverage collector | None |
| `tools/release-coverage/merge.mjs` | utility | payloads/maps → semantic report | No existing semantic merge | None |
| `tools/release-coverage/vite.config.mjs` | config | instrumented modules → isolated artifact | `vite.config.ts` | Role |
| `tools/release-coverage/calibration.test.mjs` | test | fixtures → exact/negative assertions | `tests/strict-node-tests.test.mjs` | Role |
| `tools/release-coverage/run.mjs` | controller | sequential child processes → terminal status | `tests/phase6-gate.mjs` | Strong |
| `tools/release-coverage/policy.json` | config | canonical source groups → floors | No existing coverage policy | None |
| `tests/source-loader.mjs` | utility | source discovery/emission/temp imports | Existing same file | Exact seam |
| `tests/strict-node-tests.mjs` | controller | worker process → strict TAP verdict | Existing same file and its negative tests | Exact seam |
| `tests/market-game-fixture.mjs` | test utility | artifact → opaque frame/input/cleanup | Existing same file | Exact seam |
| Legacy loaders: `tests/gamepad.test.mjs`, `tests/sound.test.mjs`; variant audit in `tests/consumable-drops.test.mjs`, `tests/mode-authoring.test.mjs` | tests | emitted production or variants → assertions | `loadSources` callers | Role; preserve variant distinction |
| `tests/release-conformance.mjs` | integration test | actual frame/wire/lifecycle → scoped verdicts | `tests/gamepad-runtime.mjs` | Role; engine wrapper new |
| `tests/release-evidence.test.mjs` | test | manifests/clauses/files → integrity verdict | Current provenance writer + strict runner negative tests | Partial |
| `tools/release-coverage/evidence.mjs` | utility | selected files/hashes → manifest/sheets | `tests/cross-mode-presentation.mjs:8–12` | Partial; image index new |
| `docs/release-evidence/index.md`, `manifest.json`, selected images; final traceability/PR body | documentation/assets | evidence → remote review | `06-EVIDENCE.md`, `06-VERIFICATION.md`, existing `docs/images/` | Role |

The existing `tests/phase6-gate.mjs` is an unchanged input to the final release sequence, not a proposed rewrite. Existing root package scripts may invoke the standalone tool, but neither root dependencies nor the oracle lockfile comparison should change. Implementation may consolidate helper files above where it keeps responsibilities explicit.

## Pattern Assignments

### 1. Source discovery, mapped emission and legacy adapters

**Primary analog:** `tests/source-loader.mjs:3–53` (already read during research). Keep Node built-ins, relative `.mjs` fixture imports and TypeScript's installed API:

```js
import { readFile, readdir, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, dirname, relative, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
```

`compileSources(entries = 'game', options = {})` accepts `options.sourceDirectory`, recursively follows relative `.js` imports and returns a Map keyed by emitted module path. `loadSources(entries = 'game', sourceDirectory)` writes a temporary ES-module tree and returns `{directory, modules, import, dispose}`. Preserve those defaults/callers; add a deliberate test-only coverage option rather than changing ordinary production-parity loading.

Current validation to preserve (`source-loader.mjs:22–35`):

```js
if (!/eager\s*:\s*true/.test(match[3]) || !/import\s*:\s*['"]default['"]/.test(match[3])) throw new Error('Test glob requires eager default imports');
// ...
if (output.includes('import.meta.glob')) throw new Error(`Unsupported discovery expression in ${name}`);
```

**Do not copy the post-emission prepend/rewrite for coverage.** Its maps would be stale. The TypeScript before-transformer is a new mechanism grounded in `research/COVERAGE-CALIBRATION.md`, not an existing source implementation. Preserve sorted eager-default discovery and fail unsupported syntax. Emit source maps with original identity before instrumentation.

`loadSources`' cleanup pattern is the analog for calibration temp files; retain payloads/maps outside the disposed module tree until reporting finishes. Baseline `sourceDirectory` points at a different root: never normalize that oracle into current `src/` coverage. The altered sampler data URL and extracted authoring examples require distinct identities or exclusion as variants, not additional production hits.

### 2. Strict worker orchestration and calibration negatives

**Analogs:** `tests/strict-node-tests.mjs:1–28`, `tests/strict-node-tests.test.mjs:1–34`, `tests/phase6-gate.mjs:1–48`.

The strict runner's process and error handling is the pattern to retain:

```js
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], {
  encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
if (result.error || result.signal || result.status !== 0) {
  console.error('Strict test gate: runner failed.', result.error?.message ?? result.signal ?? result.status);
  process.exit(1);
}
```

Its final guard requires one unambiguous totals block, positive test count, all tests passed, and zero fail/cancelled/skipped/TODO. The collector preload belongs before `--test` in the actual child Node invocation through an explicit supported channel. Do not append dash-prefixed collector flags where the strict runner expects file paths, drop TAP validation, or accept an empty worker payload because the process succeeded.

Copy the **real failing subprocess** pattern from `strict-node-tests.test.mjs:9–34` for empty coverage, missing sources, invalid mappings and absent frame payloads:

```js
const environment = { ...process.env };
delete environment.NODE_TEST_CONTEXT;
// Each case invokes the actual CLI, then checks its intended outcome.
assert.equal(result.error, undefined);
assert.equal(result.signal, null);
assert.equal(result.status === 0, succeeds, result.stdout + result.stderr);
assert.match(result.stdout + result.stderr, evidence);
```

Use that structure with the exact semantic fixture totals from07-RESEARCH. Do not derive expected counters from the same instrumenter output under test.

For release orchestration copy `phase6-gate.mjs:36–48`:

```js
const result=spawnSync(executable,args,{stdio:'inherit'});
if(result.error||result.signal||result.status!==0){
  console.error(`FAIL ${name}`,result.error?.message??result.signal??result.status);
  process.exit(Number.isInteger(result.status)&&result.status>0?result.status:1);
}
```

This retains exact arguments, visible terminal output and fail-fast sequential execution. Invoke the existing full phase6 runner once at final freeze, preserving its intentional nested Relay/Race repetition and health suffix. Add new calibrated gates explicitly; do not silently replace canonical commands.

### 3. Browser artifact selection and realm collection

**Analog:** `tests/market-game-fixture.mjs:7–9,55–82,225–229`.

Current artifact input is fixed:

```js
export async function createMarketGameFixture(evidence, options = {}) {
  const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
```

An explicit test-only artifact path/bytes option is the smallest integration seam for a separate instrumented build. Keep the default normal dist and the host injection inside the fixture. Do not write global selectors or product hooks into `src/main.ts`.

Preserve the actual runtime boundary:

```js
const browser = await chromium.launch({ args: ['--mute-audio'] });
// ... actual iframe lookup ...
const frame = await (await iframe.elementHandle()).contentFrame();
assert.equal(await frame.evaluate(() => location.origin), 'null');
```

The harness uses `sandbox="allow-scripts"`; external requests are aborted/recorded, page errors collected, and authorized pad snapshots come from the host. `onGame/onSession` can arrange state, while geometry observation is read-only: coverage/public-flow provenance must distinguish the call sites rather than label every fixture use public input.

Current cleanup seam:

```js
async close() { await browser.close(); await new Promise(resolve => server.close(resolve)); }
```

Collect the executing frame's payload **before** close/remount. Add guaranteed cleanup if collection fails. Multiple frames/reloads need explicit realm identities and completeness assertions. No existing `__coverage__` browser collector was found; collection, map validation and cumulative-snapshot deduplication remain new work.

`vite.config.ts` supplies the build analog: `modulePreload: {polyfill:false}` and the existing single-file napplet plugin. Keep those boundary semantics, use isolated output and production-mode behavior, and calibrate the new instrumentation/map path. Merely copying the build config does not prove counter identity or normal-byte equivalence.

### 4. Provenance, selected capture manifest and integrity checks

**Analog:** `tests/cross-mode-presentation.mjs:4–12`.

```js
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import {createHash} from 'node:crypto';
// For each selected source path and dist/index.html:
hashes[path]=createHash('sha256').update(await readFile(new URL(`../${path}`,import.meta.url))).digest('hex');
await writeFile(new URL('source-provenance.json',output),JSON.stringify({created:new Date().toISOString(),hashes},null,2));
```

Copy hashing and explicit JSON output, but **do not copy its fixed twelve-source list as the coverage inventory**. Coverage inventory must independently enumerate/classify every expected source and zero schema. Release image selection must also enumerate actual selected bytes, then bind scenario/mode/base/frame/theme/motion/seed, source/build/test hashes and inspection finding.

Current scenarios write evidence in `finally` before `app.close()` (`cross-mode-presentation.mjs:79,96,116`). Use that for durable failure diagnostics; distinguish incomplete diagnostic evidence from successful release proof. A generated index or file existence is not image inspection.

`06-EVIDENCE.md` provides the document pattern: explicit G/L/P/S/RL/RC/I provenance families,43 UI-probe dispositions, command accounting and limitations. `06-VERIFICATION.md` provides the correction pattern: historical sheets/indexes remain historical when current individual captures have changed. The new release index must regenerate sheets from its exact selected manifest and retain full-size critical states.

Existing `docs/images/` establishes tracked image delivery. `.gitignore` excludes artifacts/coverage/logs; select reviewed images into `docs/release-evidence/`, not a blanket force-add. No repository `.github` directory/PR template exists at mapping time. Use the research PR-body convention: concrete product behavior, compatibility, tests and durable image/traceability links, with unresolved evidence limits.

### 5. Measured wire and teardown evidence

**Analog:** `tests/gamepad-runtime.mjs:11–55,60–78,215–235`.

The fixture captures actual frame-origin messages, supports wire/binding/absent modes, and keeps host authorization outside app code. Its late-event assertion is concrete production behavior:

```js
const beforeClose = await page.evaluate(() => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length);
await frame.evaluate(() => dispatchEvent(new Event('pagehide')));
if (mode === 'wire') {
  await page.waitForFunction(count => window.messages.filter(message => message.type === 'gamepad.unsubscribe').length === count + 1, beforeClose);
} else assert.equal(await frame.evaluate(() => window.gamepadFixture.closed), 1, 'binding listener closed');
const done = await snapshot(); await send([0, 12]); await advance(600);
assert.deepEqual(await snapshot(), done, 'pagehide cancels input and simulation');
```

It additionally checks canonical no-ID outbound messages, absent-domain no-subscription and pointer fallback, then asserts empty errors/external requests before writing JSON. Copy those measurement patterns into supplemental conformance evidence, including direction/source and exact counts.

**Limits:** This is not a conformance engine wrapper, complete listener inventory or double-pagehide proof. Add those measurements and negative controls explicitly. Do not infer lifecycle `listenerLeak:false` from a literal/default; do not pass the controller draft through an unsupported released validator as if accepted. Follow `research/CONFORMANCE-EVIDENCE.md` for actual engine APIs and their structural-only manifest boundary. No signing/publishing or ignored credential input belongs here.

## Shared Patterns

- **Imports:** Native Node modules use `node:`; fixture imports are relative `.mjs`; files resolve with `new URL(..., import.meta.url)`. Keep standalone instrumentation dependency resolution anchored in its declared package, never global or ad hoc `.pnpm` internals.
- **Authority:** Browser tests may emulate the authorized shell surface; product code still may not access native controllers/network/storage/host DOM. Coverage instrumentation stays in isolated test output.
- **Error handling:** Fail fast on child error/signal/nonzero, preserve strict TAP outcomes, use `try/finally` for browser/server/temp cleanup, and write diagnostic evidence without labeling failures accepted.
- **Identity:** Canonical source hash/path/counter schema precedes merge. Oracle copies, alternate samplers, authored examples and generated scaffolding are separate identities. Current release bytes remain distinct from instrumented bytes.
- **Validation:** Existing tests use `node:assert/strict` on behavior and exact rejected outcomes. Copy that idiom for inventory/map/payload failure tests and unknown-source rejection.
- **Scope:** No tests/source/dependencies/lockfiles were changed during mapping. Pending05/06 human acceptance, physical controllers and conformance gaps remain explicit; no new approval requirement follows from this pattern map.

## No Analog Found

| New responsibility | Required guidance |
|---|---|
| Standalone instrumentation package and its separate lock |07-RESEARCH dependency decision; normal resolution/audit required, root lock unchanged |
| Node exit/browser realm coverage collector | Committed multi-worker/multi-realm calibration; no lost or duplicated cumulative counters |
| Semantic merge/remapping/reporting | Normal Istanbul APIs plus exact schema/identity calibration; no hand-rolled percentages |
| Explicit coverage floor policy | Proposed targets require calibrated production measurement and meaningful uncovered-branch review |

No existing image-manifest assembler or supplemental conformance wrapper is claimed; their partial analogs above cover I/O and observations only. The source-aware eager-glob transformer likewise exists only as prior experimental research, not production test tooling.

## Metadata

**Search scope:** MCP graph discovery for loader/fixture/session/provenance; graph returned no function results for several script-style gate/runtime files, so literal/config searches and known-file reads supplied those seams. Stopped after five responsibility families; no unrelated gameplay review.

**Read provenance:**07 context/research and source-loader/strict runner/phase6 runner/vite config were already read in the preceding research stage and reused without rereading their ranges. Newly inspected07-VALIDATION, strict-runner negative tests, provenance excerpts, fixture cleanup and measured gamepad teardown. Historical docs/verification is only a documentation-format analog, not current multiplayer acceptance.

**Output ownership:** Only this PATTERNS.md; no commits, tests, installs, browser launches, preview changes or source fixes.
