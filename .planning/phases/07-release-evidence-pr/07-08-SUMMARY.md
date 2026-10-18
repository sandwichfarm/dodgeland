---
phase: 07-release-evidence-pr
plan: "08"
status: complete
subsystem: release-tooling
requires: [07-07]
provides: [seven-local-input-lifecycle-browser-adapters]
affects: [07-09, 07-03]
key-files:
  modified: [tests/local-session-tracer.mjs, tests/local-session-keyboard-runtime.mjs, tests/local-session-gamepad-runtime.mjs, tests/local-session-audio-runtime.mjs, tests/local-session-adoption-runtime.mjs, tests/local-session-runtime.mjs, tests/local-session-layout.mjs, tools/release-coverage/suites.json]
completed: 2026-10-16
tasks: 3
---
# Phase07 Plan08: local input and lifecycle realm collection

All seven original owners now collect actual built-app generations, including navigation, controller remounts and separate audio calibration pages. **3/3 tasks complete**, generic executor fallback/full local workflow. No product change or full production coverage claim.

## API reconciliation and provenance

- Existing artifact reads/stat freshness checks now explicitly select the isolated canonical build only under coverage config. Normal dist defaults and source timestamp checks remain exact.
- Local-session tracer is mixed Node/browser: its real production model runs in Node and its original built keyboard/hydration/disposal journey creates4 browser generations. Keyboard creates3, controller transport creates3 (initial boot plus wire/binding remounts), audio creates6, and adoption/runtime/layout each create1. All are registered before navigation and collected before replacement/teardown.
- Controller's originally immediate initial mount now waits for actual hydration before collecting its otherwise discarded boot realm; all original transport/held-edge/reclaim/pagehide assertions remain unchanged. No initial app realm is silently omitted.
- Existing `artifactDirectoryForCoverage` isolates input/audio/adoption/runtime/layout evidence by run; tracer's exact two screenshot paths use runner backup/archive/restore on success and failure. All browsers muted. Normal outputs remain normal when config is absent.
- Adoption retains its explicitly arranged progressed-run fixture and actual UI transitions. Four-seat runtime retains existing inventory arrangements/CDP observations. Their manifests do not recast those arrangements as wholly public gameplay. Layout and original input actions remain actual controls/authorized shell snapshots. No new product hooks or intercepted authority.

## Retained RED and terminal GREEN

| Task | RED → GREEN | Exact evidence |
|---|---|---|
|1 local tracer |5ad15a5 →47e17bc |37500 exit1:all3 originals pass, missing browser owner rejects.10619 exit0, `/tmp/down-to-duck-07-08-task1-gate.log`:collection5/5, original3/3,4 app generations plus Node. |
|2 keyboard/controller/audio |daf29d9 →b296aff |64318 exit1:all3 originals pass, missing owner rejects.78577 exit0, `/tmp/down-to-duck-07-08-task2-gate.log`:collection5/5, original3/3,12 browser generations. |
|3 adoption/runtime/layout and whole group |a21ea4d →3fd7c11 |4339 exit1:all9 originals pass, missing adoption owner rejects.86113 exit0, `/tmp/down-to-duck-07-08-task3-gate.log`:collection5/5, instrumented9/9 (~63s), ordinary9/9 (~17s), lockfile/diff checks. |

2280 exit0, `/tmp/down-to-duck-07-08-final-checks.log`:policy4/4, type-check/build, guidance6/6, conformance5 passed/0 failed/5 unmeasured, immutable root-lock comparison and diffcheck. No original assertion/filter changes. Both instrumented and normal layout report24 frame-state observations, no deficiencies/errors; original additional captures and focus/motion checks remain intact.

## Inspectable collection evidence

`artifacts/release-coverage/adapters-08/manifest.json` and `report/` contain final runb464c494-7abf-4d07-a38e-cf514453e9ab:20 payloads (19 browser generations+1 Node worker), all176 source classifications and complete source/map/schema identity records in run inventory/payloads. The actual normal HTML hash was11b5747e3dd004a2525c503d0d890bfcf68216ddfddf1ad2d71235338c983a91; isolated instrumented HTML5e31c4200545c8f21c797e7e5354f5e5845799db184262651cd720c8f2d59ea8. The collector asserts normal bytes unchanged during its command. Reports remain explicit report-only, thresholds not evaluated.

## Scope and remaining work

Eight declared files changed; shared helper/runner/collection changes were unnecessary. Seven independent owners remain in07-09. Historical21-owner ledger preserves actual completion run IDs, with `completedAdapters` and `remainingAdapterCount:7`; full default still fails closed.07-09 must reconcile106 candidates plus transitive helpers, complete all modes/realms and generate the complete initial report;07-03 must enforce every floor and repair meaningful uncovered behavior. No root lock, dependencies, oraclea310a81ed6c76df4b265c9012c23b8c83f4802e5, game source or preview5175 changes. No phase/requirement completion claim. Physical controller and normal conformance limitations remain explicit.

## Self-Check: PASSED

Owned files/commits/logs exist; all exact task commands and final checks are terminal green, ordinary defaults pass, no active process or blocking stub. Next approved plan07-09 owns remaining collection/full report.
