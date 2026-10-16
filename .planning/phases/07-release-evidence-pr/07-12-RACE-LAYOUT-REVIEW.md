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
