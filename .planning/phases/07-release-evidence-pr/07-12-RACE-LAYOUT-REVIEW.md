---
phase: 07-release-evidence-pr
reviewed: 2026-10-16
depth: standard
reviewer_execution: generic-agent-fallback
diff_base: f84a7f9
reviewed_scope: uncommitted Race layout repair authorized by 3584568
files_reviewed: 2
files_reviewed_list:
  - tests/race-layout.mjs
  - tools/release-coverage/suites.json
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Plan12 Race layout repair review

Generic-agent fallback applying the full local GSD code-reviewer role; not typed-agent execution. Compared the assigned diff with frozenf84a7f9 and `07-12-RACE-LAYOUT-REPAIR.md`. Traced the shared fixture's close/realm behavior through graph discovery and source inspection. No structural findings supplied. No tests, builds, browsers or process actions were performed.

## Narrative Findings (AI reviewer)

No concrete defects found in the scoped repair. This is code-review clearance for focused verification, not a passing execution or coverage claim.

## Assertion and acquisition preservation

- Eight awaited stages retain180000ms each. Their boundaries match the original first acquisition and seven `fresh()` calls; no per-frame reloads were added. The first and stale-Mud acquisitions retain seed `ph3-000002dc-pond-s-n`, Lantern retains `ph3-001fe673-pond-s-n`, and the remaining acquisitions retain the original default `ph3-00000071-pond-s-n`.
- Original setup/settings/roster actions, four-player assertion, Mud and Lantern paths, owner switch, real fog damage, same-tick finish inputs and four result participant pages, disconnect/reclaim/waiting/timeout, personal recovery/protection/forfeit and reduced-motion observation are retained in order. No product state writes, new input policy or production changes appear.
- All35 named states retain six frame sizes and both themes, giving420 cells. The final sorted identity-array comparison checks the exact Cartesian product, rejecting missing, duplicate or unexpected cells. Eight completed stages are also required. Original screenshot filenames, selector metrics, authoritative-state snapshots, target/text/scroll/dialog checks and native Tab/Shift+Tab continuity remain. The screenshot now returns bytes before writing the same PNG path, allowing an intervening abort check without changing capture content.
- The separate unchanged-announcement test is byte-for-byte unchanged in the reviewed diff. Original errors/external/forbidden/geometry assertions remain; per-stage errors/external/geometry assertions additionally stop dependent acquisitions earlier.

## Cancellation and evidence integrity

- `closeOnce()` memoizes each fixture's close promise in a WeakMap. Abort, later `fresh()` and final cleanup share that promise, preventing duplicate canonical realm collection for the same fixture. The shared fixture closes its browser/server in its own finally even when collection rejects.
- The child abort listener immediately initiates active-fixture cleanup. The parent stage awaits both its asynchronous body and abort cleanup after the child result, preventing the previously observed continuation into later scenarios. Live checks before/after acquisition prevent opening another fixture after an observed abort. If an already-started acquisition returns late, it is assigned and closed before its aborted error propagates.
- Capture checks guard each cell, completed screenshot bytes and evidence-array credit. An already-issued filesystem write may finish after cancellation, but it is awaited; the next check prevents cell credit or subsequent captures. No background image write is intentionally detached, and dependent stages cannot start. This does not claim cancellation can undo I/O already in progress.
- A stage earns completion only after original actions, assertions and an abort check. Original body errors are retained through `originalFailure ??= error`; later contact-sheet or cleanup errors cannot overwrite them. Cancelled child TAP status remains authoritative even when closing the browser causes the body to surface a target-closed error.
- Contact sheets are generated only after all eight stages and exact matrix/error assertions succeed. Sheet failures clear journey success; fixture cleanup still runs. Final `complete` requires successful journey, no original failure, no parent/active abort and no cleanup failure. Partial failure JSON remains explicitly incomplete and the original error is rethrown. Successful-looking partial matrix evidence is not treated as a passing test.

## Collector and remaining proof

The additive `race-layout-12` group runs the entire unchanged file ownership, including its announcement test, with mixed Node/browser roles and canonical production scope. It preserves the existing full execution inventory. Ordinary Race artifact-directory preservation covers all matrix PNGs, report and contact sheets; nested patterns are deduplicated by the existing preservation helper. Each of the eight matrix fixture acquisitions registers its own existing canonical identity and is collected once; the separate announcement fixture remains an additional acquisition. Actual payload/realm counts must be checked after focused execution, not inferred as measured from source review.

Focused canonical execution, actual cancellation behavior and final420-cell evidence have not been run or inspected by this reviewer. The preserved failed full run is historical failure evidence even though its asynchronous body produced420 captures. No coverage floor, complete full collection, visual acceptance or phase completion is claimed.

Only this review document was written and committed under the explicit handoff authorization. Concurrent source/manifest/STATE edits were preserved.

## Runtime evidence follow-up

Reviewed after evidence commit `fdf586d`; the preceding static-review limitations describe the original handoff. No new findings arose from independent read-only inspection of the executed artifacts below. Status remains clean.

**Normal canonical execution:** `/tmp/down-to-duck-07-12-race-layout-focused.log` records10 passed,0 failed/cancelled, `PASS race-layout`, and the explicit report-only disclaimer. Its eight child stages, matrix parent and separate announcement test completed. Independently parsed run `c8dad76d-3979-4b35-9e34-2f32fb0d4058`: archived report has `complete:true`, all eight named stages,420 captures/420 unique cells/35 states, and empty geometry failures, runtime errors and external requests. The run directory contains nine distinct collected browser realms and one Node payload; job ledger records the mixed Race layout owner with exitCode0. This is consistent with eight matrix acquisitions plus the separate announcement fixture, without duplicated realm completion. Guidance7/7 and conformance5 passed/0 failed/5 skipped are present in the same durable log; the skipped scopes remain unmeasured.

**Forced cancellation:** independently read `/tmp/down-to-duck-07-12-race-cancel-verified-evidence/child.log`, its archived partial report, `probe-result.json`, `/tmp/down-to-duck-07-12-race-cancel-transform.json`, and `/tmp/down-to-duck-07-12-race-cancel-analysis.log`, plus the temporary loader/probe/analyzer source without executing them. The loader replaces exactly the first stage's180000ms deadline with5000ms; other deadlines and gameplay code are unchanged. Recorded original test SHA256 is `a80eac4b4e45e8aad38b3362739f47e71e634de46b0062f33514e8142c04f353`; transformed SHA256 is `1d538fe1027a74dc8e645b03941d058aa7779ae4fba0e9dec2c3ed319485ad2a`.

The child log shows the first stage timing out at5000ms, the matrix parent failing with AbortError, and the separate announcement test passing. Partial JSON has `complete:false`, no completed stages and24 cells belonging only to setup/rules. The log begins the invalid-state capture, but no invalid cell is credited after cancellation. No later matrix acquisition runs. Actual muted browser19098 exits at19:29:05.999Z, before announcement browser19242 launches at19:29:06.010Z; the latter also closes normally. This directly supports active-fixture cancellation, dependent-stage suppression, incomplete evidence and cleanup before the next test. It does not dynamically exercise cancellation during fixture opening; late-open cleanup remains supported by the prior source trace.

**Probe limitations and preservation:** the first loader invocation failed its exact-replacement guard before gameplay. The corrected direct-file invocation reached the intended cancellation, but the wrapper then failed because it expected TAP while Node emitted the spec reporter. The wrapper therefore did not itself finish green. The retained read-only analyzer checks the actual timeout/announcement text, ordered browser launch/exit events, partial report and byte comparisons against the prior-artifact backup; its recorded result reports423 restored ordinary files and normal build SHA256 `c67e3b6fee36829ebec67029d2a7053624a7c1ac9f895458d030fd5cc216e698`. The original wrapper's normal-build byte-equality assertion precedes its reporter mismatch. No browser rerun was used to repair the reporting interpretation. Child exit1 is recorded by the orchestrator; this reviewer directly observed the failure/cancellation log and the probe's nonzero-status assertion, not a raw saved process-status object. Restoration assertions were inspected in the analyzer and its retained result, not re-executed against a concurrently changing workspace.

The injected deadline supplies cancellation evidence only, never gameplay or coverage credit. The focused passing run supplies normal execution evidence only; it establishes neither full collection completeness nor coverage floors. Separate Relay timeout work is outside this review. Only this report was updated and committed; no implementation, tests, builds or browser processes were changed or launched.
