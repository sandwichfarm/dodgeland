---
phase: 07-release-evidence-pr
reviewed: 2026-10-16
reviewed_commit: 6528a82
original_reviewed_commit: db0a596
diff_base: b82c0a5
depth: standard
reviewer_execution: generic-agent-fallback
files_reviewed: 2
files_reviewed_list:
  - tests/race-results.test.mjs
  - tools/release-coverage/suites.json
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Plan12 Race results repair review

Generic-agent fallback applying the full local GSD code-reviewer role, not typed-agent execution. Compared db0a596 with b82c0a5 and root1b854af authorization. No structural findings supplied. No tests, builds, browsers, process actions or implementation edits performed.

## Narrative Findings (AI reviewer)

The initial static verdict in4dad194 missed the asynchronous coverage-before-close window. A focused follow-up trace establishes the blocker below. Focused execution and forced-cancellation evidence remain pending.

### RR-01 — RESOLVED (original BLOCKER): paging can continue after abort while coverage collection keeps the browser open

**Re-review at6528a82:** the file-local `operation(action)` checks parent/active-stage signals immediately before invoking the callback and after its awaited result. All original awaited browser/UI/query/assertion-helper calls in the six scenario bodies are wrapped, including Previous-loop conditions and clicks, forward-page enablement/focus/key boundaries, participant selection/retry navigation, podium paging and original setup/finish inputs. If an awaited query returns while canonical collection is still in progress after abort, the post-check throws before its value can enable the next action; the next operation also independently checks before dispatch. Screenshot/open/stage paths retain their existing guards.

The reviewed diff preserves callback arguments, short-circuit conditions, action order, awaited return values, original assertions, clock advances and screenshot selection. No omitted direct awaited browser action was found in the scenario bodies; the only remaining direct screenshot call is in the already-guarded screenshot helper. Model tests, manifest, original deadlines and cleanup/first-error paths are unchanged. The wrapper does not cancel a previously dispatched Playwright operation or preempt the internals of an already-started fixture helper; it prevents subsequent scenario operation dispatch after cancellation. RR-01's identified paging continuation is closed statically. No unresolved scoped findings remain. The root-authorized negative must still exercise ordered dark-matrix paging, not merely acquisition; runtime evidence is pending.

**Original finding follows:**

**File:** `/Users/sandwich/Develop/crossy-road-clone/tests/race-results.test.mjs:247–256`; related repeated navigation at266–267 and360.

The abort listener at200 starts `closeOnce()`, but the real shared fixture's `close()` (`tests/market-game-fixture.mjs:253`) first awaits canonical `collectRealm(frame, identity)` and only then closes the browser. Thus initiating close does not immediately make locators unusable. If a stage aborts while an `isEnabled()`, text/geometry query or focus operation is awaiting its response, that response can still arrive during collection and the body can issue another Previous/Next click or keyboard activation. The main Previous loop has no abort check, and the main forward loop deliberately skips screenshots for intermediate pages, so screenshot-boundary checks do not cover those iterations. The selected-participant navigation and podium Previous loops have the same gap.

This is a reachable continuation during the explicitly asynchronous coverage transfer, not a finding based solely on absent checks. It violates the addendum's requirement that cancellation prevent later actions. Final completeness still fails closed and subsequent scenarios still await settlement; the defect is continued input on the canceled scenario during teardown, not false suite success.

**Minimal fix:** add cooperative checks at every paging-loop iteration and after awaited queries/before subsequent focus, click or keyboard operations; audit the remaining scenario action sequences for the same await-to-next-input boundary. A narrow file-local checked-operation wrapper is acceptable if it retains every original action/assertion and checks before dispatch and after settlement. Do not replace canonical coverage cleanup or force-close before capture. Keep screenshots, frame cells, timeouts and primary-error behavior unchanged. Cancellation proof should include an abort while paging/coverage cleanup overlap, or an equivalent controlled observation proving no new page/input operation is dispatched after the signal, rather than only a first-acquisition timeout.

**Primary error trace:** ordinary child assertion failures are handled correctly: `t.test()` resolves with child failure, `settled.catch` stores the actual body error before the parent's incomplete-stage assertion, and the outer catch uses `??=`. Cleanup errors remain separate. No additional primary-error defect was established.

## Preserved behavior and evidence

- All13 model cases and their helpers/assertions remain unchanged, including the four parameterized departure outcomes and authoritative market metadata case. Their arranged model state remains model evidence, not public-input browser proof.
- Six browser acquisitions remain in their original registration order: ordered finish, time, left, three tied, four tied, four distinct. `open()` enforces one acquisition per scenario. Original fixture options, explicit seeds and implicit defaults remain. No stage performs a replacement acquisition or per-frame reload.
- The main case retains90 seconds per stage; time/left retain30 seconds; each podium case retains60 seconds. Cleanup is a separate explicitly bounded stage using the same scenario limit. No blanket deadline increase was introduced. The timeout case retains `advance(31000)` and both departure scenarios retain their actual public actions and simulated-clock sequence.
- Actual ordered/tied/distinct finish inputs, immutable result snapshots, rank labels, complete accessible page text, contrast, bounds/overflow/target/hit checks, paging selection logic, native Enter/Space/Tab, selected-participant resize continuity, retry and old-heading absence remain. The original screenshot selection conditions and every basename are retained; only the parent directory moves from/tmp to `artifacts/race-results/`.
- Exact per-scenario cell-array equality requires12 main cells,2 time,2 left and10 for each of three podium cases:46 original frame/theme cells. Duplicate, missing or extra cells reject. Original per-page assertions remain; screenshot count is not substituted for paging proof. In time/left, a cell can be recorded before its final frozen-result assertion, but failure still prevents stage/scenario completion; partial cell recording is not success credit.

## Lifecycle and failure review

- The file-local helper scopes each app, signal, first failure and WeakMap close promise to its original scenario. Child abort starts cleanup immediately. The parent awaits both body settlement and abort cleanup before returning, so the next top-level browser scenario cannot overlap an unfinished canceled body through this helper.
- Acquisition checks surround the dynamic fixture import and opening. An opening already in progress at cancellation is closed when it returns before abort propagates. `closeOnce()` reuses the same promise across abort, explicit cleanup stage and outer finally, avoiding duplicate canonical realm completion. A failure to open before returning a fixture is still subject to the existing shared factory's lifecycle; this repair does not change that factory.
- Every stage checks abort before/after its body and errors/external observations before credit. Screenshot checks surround capture, file write and evidence append; frame loops also check at entry. Actual browser closure interrupts browser work, but it follows coverage transfer; RR-01 identifies actions that can continue during that interval. Later stage entry is gated. An already-issued filesystem write may complete after cancellation but is awaited and cannot be followed by successful capture credit after the abort check.
- Original body errors are retained through first-error assignment; cleanup errors are separately recorded and cannot replace an existing primary failure. Expected stage names/order and exact cells are asserted; cleanup must finish successfully before `passed` is set. Finally reuses closure, sets `complete` only with no retained error/parent abort/cleanup failure, writes partial evidence on failure and rethrows. An aborted cleanup stage cannot produce completion even when its close eventually resolves.
- Reports are individual scenario reports. Later original scenarios may still run after a failed scenario, as Node's runner normally permits, but only after its settled cleanup. The strict whole-file result remains authoritative; a later passing report cannot turn an earlier failure into suite success.

## Artifact and collector scope

The test creates `artifacts/race-results/` and writes all six reports and original screenshot basenames beneath it. Historical/tmp images are untouched. Both full and focused `race-results-12` job definitions receive the identical directory preservation pattern; their existing mixed Node/browser roles, production scope and whole-file ownership remain. No generic collector, source inventory, floor, dependency, lockfile or oracle change appears. Expected runtime provenance is the13 unchanged model cases plus six original browser realms; actual counts must be verified from focused artifacts.

Runtime success, cancellation during an active fixture, late-opening cancellation and artifact restoration have not been dynamically measured by this review. Prior Race/Relay evidence is an implementation analogy, not proof of this helper. Focused and negative execution remain required before full collection. No visual acceptance, complete coverage or phase completion is claimed.

Only this report was written and committed under the explicit handoff authorization; other workers' files were preserved.

## Runtime evidence follow-up

Independently inspected completed focused and targeted negative artifacts after6528a82. No new findings; RR-01 remains resolved. The preceding pending statements describe the earlier static-review handoff.

**Canonical focused run:** `/tmp/down-to-duck-07-12-race-results-focused.log` records44/44 passed, zero failures/cancellations, `PASS race-results-test` and the explicit report-only disclaimer. Independently parsed run `7d18ece1-4a54-48ee-adf2-e4ada10532aa`: all six scenario reports have `complete:true`, expected ordered stages including cleanup, empty runtime errors/external requests and exact per-scenario unique cells12/2/2/10/10/10 (46 total). The archive contains78 PNGs. Six browser payloads are collected, plus one Node payload; the mixed job ledger records exitCode0. Guidance7/7 and conformance5 passed/0 failed/5 skipped are present in the durable log. Combined76544 exit0 is orchestrator-reported; the ledger/log were independently read. Skipped conformance scopes remain unmeasured.

**Targeted cancellation:** read the actual temporary loader/probe source, transform metadata, child log, audit, six scenario reports and result beneath `/tmp/down-to-duck-07-12-results-cancel-evidence/`, plus `/tmp/down-to-duck-07-12-results-cancel-transform.json`. Unlike a first-acquisition negative, this loader shortens only ordered/dark-matrix to2000ms. Four exact-single-match transformations add that deadline, abort and checked-dispatch observations, and the explicitly authorized synthetic5000ms delay before the real close. Recorded original SHA256 is `7fe131ba53e4ed7eb1603b25d278fd249eb7a4856cc127a56e4db1f321c88a8c`, transformed SHA256 `c547dced607f197b60fe01a5505010244f7478bf52855b484f20e99a74c68270`. The real close/collection path still runs after the delay; this delay is not presented as measured production timing.

The partial ordered report retains only `ordered finish`, four dark cells and10 captures, including actual paged results at240×240 (pages0,1,21),320×560 (0,1,6) and900×600 (0,1,4). Thus the negative reached the original paging journey rather than stopping at acquisition or the tiny notice. The dark stage cancels at2000ms; ordered remains `complete:false` with AbortError, no light captures or later ordered stages. Raw audit records abort at20:43:56.820Z, the synthetic delay beginning immediately, and zero subsequent ordered checked-operation dispatches while the browser remains open. Operation names are not logged, so this does not identify the exact in-flight query at the instant of abort; it does establish no further wrapped operation dispatch during the deliberately extended teardown window.

Browser67404 exits at20:44:01.836Z before the next original scenario's67698 launch at20:44:01.847Z. All six original browser lifecycles are logged; the five later scenario reports complete successfully. The child remains nonzero: result records expectedChildExit1 and child summary39 passed/1 failed/1 cancelled (41 tests because the aborted scenario never starts its remaining stages). This is expected negative evidence, not a passing whole suite.

The probe source asserts exact child exit1, no ordered dispatch after abort, one synthetic delay, incomplete ordered evidence, later scenario completion, normal-build byte equality and ordinary/history restoration before writing its result. The retained result records restoration of the originally absent ordinary Race-results directory,89 unchanged historical/tmp PNGs and normal artifact SHA256 `c67e3b6fee36829ebec67029d2a7053624a7c1ac9f895458d030fd5cc216e698`. Assertions/results were inspected, not rerun against the shared workspace. Actual process exit is visible in the child debug log; no reviewer process action was performed.

This negative closes the observed active paging/teardown continuation concern. Cancellation during fixture opening remains dynamically unexercised and supported only by the prior source trace. No new tests/builds/browsers or implementation changes were performed by the reviewer. Focused and synthetic-negative evidence do not establish full collection completeness, coverage floors or phase completion.
