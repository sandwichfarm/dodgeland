---
phase: 07-release-evidence-pr
plan: "02"
status: blocked
subsystem: release-tooling
requires: [07-01]
provides: [actual-shared-session-coverage-tracer, tracked-source-inventory]
affects: [07-03]
key-files:
  created: [tools/release-coverage/inventory.mjs, tools/release-coverage/run.mjs, tools/release-coverage/collection.test.mjs]
  modified: [tests/source-loader.mjs, tests/strict-node-tests.mjs]
---
# Phase07 Plan02: real shared tracer and adapter-scope checkpoint

**1/3 tasks complete; plan not complete.** Generic executor fallback. Task1 produces actual mapped production coverage from two genuine shared-session suites with complete tracked-source zero inventory. Full browser/initial production collection requires the approved dependency-ordered adapter split; see07-02-ADAPTER-CHECKPOINT.md and07-02-REALM-AUDIT.json.

## Task1 evidence

- RED5ff63b6, GREEN4fffa33.
- Final handle93470exit0, /tmp/down-to-duck-07-02-task1-gate-fixed.log:9/9 calibrated collection/oracle checks;22/22 instrumented shared tests;28/28 ordinary shared+strict-runner negative checks.
- Two exact expected worker IDs capture current session/game execution through an opt-in preload, canonical source/hash/map/schema validation and standard remap/report. Default source-loader remains unchanged; actual immutable oracle extraction cannot alias current coverage. Unchanged strict TAP completeness/flag rejection retained.
- Independent git source inventory176 entries:144 executable,14 no-executable-sites,14CSS,1declaration,3assets. All executable zero records retained before imports.
- Actual shared-only JSON/text/LCOV and manifest at artifacts/release-coverage/shared-tracer; report-only is explicit, no threshold/release pass.

## API reconciliation

07-01 instrumentSources accepts all source text under canonical src root; reportCoverage consumes validated raw maps and writes standard reports. New inventory.mjs independently inventories git-tracked source and acts as the controlled strict-runner preload. run.mjs currently accepts only the named shared-tracer plus explicit report-only and fails closed for unavailable full collection. source-loader optional coverage config uses canonical records only when sourceDirectory resolves exactly to current src; oracle/variants retain original path. Strict runner injects a fixed local preload only when requested and preserves explicit file arguments/all-pass totals.

The browser audit found21 additional independent browser-owner files besides the already-owned sound/market fixtures. This exceeds approved15-path threshold. Their required lifecycle responsibilities and bounded proposed continuation groups are documented before any extra source edit. Task2 market/browser build and Task3 full policy/report remain unrun. Root will reconcile/check continuation plan placement; no collection scope is dropped.

## Failures and limits

Initial integration failed empty payload because URL src root had a trailing slash; canonical resolve comparison fixed it. Gate9939 failed new default-loader fixture's nonexistent seed.ts filename; corrected to actual gamepad.ts and reran full exact Task1 command. Both failures remain historical logs, not passing evidence. No product source, root lock, oracle or preview changes; no browser launched in this task. No full production coverage or phase completion claim. Human05/06 acceptance remains pending.

## Self-Check: PASSED for checkpoint

Owned files and commits exist; Task1 terminal evidence verified. No active process. Task2/3 acceptance remains outstanding, so this SUMMARY is blocked, not complete.
