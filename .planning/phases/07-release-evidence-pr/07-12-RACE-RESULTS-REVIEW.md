---
phase: 07-release-evidence-pr
reviewed: 2026-10-16
reviewed_commit: db0a596
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

No concrete scoped defects found. Static review is clean; focused execution and forced-cancellation evidence remain pending.

## Preserved behavior and evidence

- All13 model cases and their helpers/assertions remain unchanged, including the four parameterized departure outcomes and authoritative market metadata case. Their arranged model state remains model evidence, not public-input browser proof.
- Six browser acquisitions remain in their original registration order: ordered finish, time, left, three tied, four tied, four distinct. `open()` enforces one acquisition per scenario. Original fixture options, explicit seeds and implicit defaults remain. No stage performs a replacement acquisition or per-frame reload.
- The main case retains90 seconds per stage; time/left retain30 seconds; each podium case retains60 seconds. Cleanup is a separate explicitly bounded stage using the same scenario limit. No blanket deadline increase was introduced. The timeout case retains `advance(31000)` and both departure scenarios retain their actual public actions and simulated-clock sequence.
- Actual ordered/tied/distinct finish inputs, immutable result snapshots, rank labels, complete accessible page text, contrast, bounds/overflow/target/hit checks, paging selection logic, native Enter/Space/Tab, selected-participant resize continuity, retry and old-heading absence remain. The original screenshot selection conditions and every basename are retained; only the parent directory moves from/tmp to `artifacts/race-results/`.
- Exact per-scenario cell-array equality requires12 main cells,2 time,2 left and10 for each of three podium cases:46 original frame/theme cells. Duplicate, missing or extra cells reject. Original per-page assertions remain; screenshot count is not substituted for paging proof. In time/left, a cell can be recorded before its final frozen-result assertion, but failure still prevents stage/scenario completion; partial cell recording is not success credit.

## Lifecycle and failure review

- The file-local helper scopes each app, signal, first failure and WeakMap close promise to its original scenario. Child abort starts cleanup immediately. The parent awaits both body settlement and abort cleanup before returning, so the next top-level browser scenario cannot overlap an unfinished canceled body through this helper.
- Acquisition checks surround the dynamic fixture import and opening. An opening already in progress at cancellation is closed when it returns before abort propagates. `closeOnce()` reuses the same promise across abort, explicit cleanup stage and outer finally, avoiding duplicate canonical realm completion. A failure to open before returning a fixture is still subject to the existing shared factory's lifecycle; this repair does not change that factory.
- Every stage checks abort before/after its body and errors/external observations before credit. Screenshot checks surround capture, file write and evidence append; frame loops also check at entry. Closing the browser interrupts in-flight browser actions, while later stage entry is gated. An already-issued filesystem write may complete after cancellation but is awaited and cannot be followed by successful capture credit after the abort check.
- Original body errors are retained through first-error assignment; cleanup errors are separately recorded and cannot replace an existing primary failure. Expected stage names/order and exact cells are asserted; cleanup must finish successfully before `passed` is set. Finally reuses closure, sets `complete` only with no retained error/parent abort/cleanup failure, writes partial evidence on failure and rethrows. An aborted cleanup stage cannot produce completion even when its close eventually resolves.
- Reports are individual scenario reports. Later original scenarios may still run after a failed scenario, as Node's runner normally permits, but only after its settled cleanup. The strict whole-file result remains authoritative; a later passing report cannot turn an earlier failure into suite success.

## Artifact and collector scope

The test creates `artifacts/race-results/` and writes all six reports and original screenshot basenames beneath it. Historical/tmp images are untouched. Both full and focused `race-results-12` job definitions receive the identical directory preservation pattern; their existing mixed Node/browser roles, production scope and whole-file ownership remain. No generic collector, source inventory, floor, dependency, lockfile or oracle change appears. Expected runtime provenance is the13 unchanged model cases plus six original browser realms; actual counts must be verified from focused artifacts.

Runtime success, cancellation during an active fixture, late-opening cancellation and artifact restoration have not been dynamically measured by this review. Prior Race/Relay evidence is an implementation analogy, not proof of this helper. Focused and negative execution remain required before full collection. No visual acceptance, complete coverage or phase completion is claimed.

Only this report was written and committed under the explicit handoff authorization; other workers' files were preserved.
