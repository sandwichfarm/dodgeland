---
phase: 07-release-evidence-pr
plan: "07"
status: complete
subsystem: release-tooling
requires: [07-02]
provides: [seven-component-browser-coverage-adapters]
affects: [07-08, 07-09, 07-03]
key-files:
  modified: [tests/render.test.mjs, tests/session-board-controls.test.mjs, tests/session-labels-render.test.mjs, tests/consumable-world-render.test.mjs, tests/death-spill-render.test.mjs, tests/survive-results-ui.test.mjs, tests/solo-ui-browser.test.mjs, tools/release-coverage/browser.mjs, tools/release-coverage/collection.test.mjs, tools/release-coverage/suites.json]
completed: 2026-10-16
tasks: 3
---
# Phase07 Plan07: seven component browser owners

All seven arranged production component owners now register before execution and capture canonical counters before teardown. **3/3 tasks complete**, using the generic executor fallback/full local role workflow. No production changes or full production coverage claim.

## Actual API reconciliation

All seven owners compile production modules through the existing source-loader but execute them in browsers, so their Node workers correctly declare browser-only roles. The renderer fixture serves independent `/baseline/` and current namespaces; archived oracle modules remain uninstrumented and cannot contribute current hits. Every original pixel/authority/focus assertion remains intact. The fixture executes current modules twice under distinct import URLs where originally required; both genuinely execute the same canonical source identity.

`registerRealm` runs before navigation/srcdoc assignment; `collectRealm` runs in existing after/finally teardown and cleanup still executes on failure. Setup/results collect the actual null-origin child frame; Canvas/solo DOM proofs remain labelled arranged components, not public built-app journeys. No Playwright/product monkeypatch was introduced. Existing component instrumentation/arrangement inside original tests was preserved, not relabelled as public input.

Added `artifactDirectoryForCoverage(defaultDirectory,owner)`: normal URL unchanged; coverage outputs go under the unique run's suite-artifacts, with owner path validation. Renderer and middle-group fixed artifacts use the existing runner's exact-path backup/archive/restore on both success and failure. Added focused negatives for empty generations, invalid oracle-as-current scope and artifact traversal/default preservation. No runner change was required.

## RED/GREEN and exact verification

| Task | Commits | Terminal evidence |
|---|---|---|
|1 renderer tracer |RED49275e5 → GREENf64f51e |23753 exit1:19 original tests pass, missing renderer realm rejects.58316 exit0, `/tmp/down-to-duck-07-07-task1-final.log`:collection5/5, renderer19/19 including original oracle RGBA parity. Earlier3043 also passed before isolated-artifact helper addition. |
|2 setup/labels/world items |REDfdf7dca → GREEN8257e0e |5303 exit1:10 original tests pass, missing setup realm rejects.25111 exit0, `/tmp/down-to-duck-07-07-task2-gate.log`:collection5/5, all10 original tests. |
|3 spill/results/solo DOM and full group |RED72a8435 → GREENd3223b1 |25260 exit1:all32 original tests pass, missing spill realm rejects.82673 exit0, `/tmp/down-to-duck-07-07-task3-gate.log`:collection5/5, full instrumented32/32 then ordinary32/32, lockfile/diff checks. |

Final81375 exit0, `/tmp/down-to-duck-07-07-final-checks.log`:policy4/4, type-check/build, guidance6/6, conformance5 passed/0 failed/5 unmeasured, immutable root-lock comparison and diffcheck. No test filtering or assertion reduction. RED commands and logs retain actual missing-owner failures, not synthetic gameplay failures.

Final group manifest/report at `artifacts/release-coverage/adapters-07/`:run8b92adbd-4927-4646-acd4-a4744f757c88 has14 actual browser payloads, seven browser-only worker identities, all176 source classifications and canonical source/map/schema hashes in inventory.json/payload records. JSON/text/LCOV reports retain all-source zeros and explicitly say report-only. Setup produces6 distinct opaque component realms; renderer1, labels1, consumable world3, spill1, results1, solo DOM1.

## Remaining scope and invariants

The original21-owner obligation ledger now records these seven as complete with actual evidence run;14 remain for07-08/09. `remainingAdapterCount` and `completedAdapters` make the status explicit; historical ledger rows are retained, not silently removed. Default full collection still rejects pending prerequisites.07-09 must reconcile all106 candidates/transitive realms and measure every mode stratum;07-03 must close meaningful gaps and enforce exact floors. No source suppression, threshold reduction or phase completion claim.

Ten declared files changed (the optional run.mjs seam was unnecessary). No additional dependency, root lock change, oracle repin, game source change or preview5175 change. Every browser muted. Physical controllers and five normal conformance checks remain unmeasured. User05/06 acceptance/formal closure remains recorded. No new blocking stub or unrun required check.

## Self-Check: PASSED

Owned paths, RED/GREEN commits and terminal logs exist; all three exact commands passed, ordinary defaults passed and root lock matchesa310a81ed6c76df4b265c9012c23b8c83f4802e5. No active process. Next approved plan is07-08.
