# Current collection visual spot-check

Root inspected the actual PNG bytes below during full collection93747, collector PID46458, run `59b261c8-5604-4c26-8b26-5d97f40d8e4a`, on2026-10-16. The cross-mode job was still running; this is a limited visual observation, not a completed job, full matrix or release acceptance.

Source/tests/tooling are frozen at `cb0e569` (latest test implementation3920d11). Root verified no diff in `src`, `tests`, `tools` or the root lockfile against that commit. The run's `inventory.json` SHA256 is `cd2869fae16b79b0068a3f60ca23eed8055bf54901d7c035f4717d59c5f93d47`. Observed files were freshly written by the current job, rather than historical copies. Acquisition provenance remains governed by the actual test and its report; visual inspection alone does not establish public-input provenance or numerical clearance.

All three files were opened through the image viewer at their actual dimensions. The inspected files were under `artifacts/cross-mode-presentation/` while the job ran. Once archived, matching bytes are expected under the run's `suite-artifacts/cross-mode-presentation/artifacts/cross-mode-presentation/`; a future evidence step must verify these digests before reusing this observation.

| Image | SHA256 | Root observation |
| --- | --- | --- |
| relay-1000x280-light.png | 6f4f95e9bd7de1193a892fa5168941202b0a1aee072e91b30c0996087525eddd | Short layout keeps four player identifiers, the selected runner and distance readable. Movement controls and Notice fit below the visible runner. No visible text clipping or control overlap in this image. |
| race-compact-control-gap.png | 0cf7010b38b946a66c3aaf99444111eb0a72dbfbf088e5fc4f953742687242c4 | Compact frame shows four distinct traveler markers and labels between the top HUD and bottom controls. Finish/clock/fog information wraps within the HUD; all five bottom controls remain visible. No observed actor/control overlap. |
| relay-900x600-light.png | 263134313cdeb3bea363620080a567580dd3b34da5b83253e2bb0438ff100c0e | Regular frame shows all four player tiles with active/next/waiting status, the selected owner, hand slots and bottom controls. The invitation and runner are both legible, with no visible clipped labels or overlapping controls. |

This does not replace07-05's complete required-cell manifest, committed image bytes, source/build validation, all-sheet inspection or critical-state review. Exact8px clearance remains an automated geometry obligation and is not inferred from these images. The previously received user play-feel acceptance remains a separate factual record.

Subsequent job result: the same full run logged `PASS cross-mode-presentation` at 2026-10-16T19:51:02.198Z, with 33 passed, zero failed/cancelled/skipped, and duration 390126ms. Root then verified all three archived PNG digests against the inspected bytes; all match. Source/tests/tooling/root lock still have no diff against `cb0e569`. This establishes the cross-mode job's terminal pass and archived-image identity, while the full collection remains active and release acceptance remains pending.

## Race observations during the same collection

Root opened these three actual PNGs while `race-layout` was live on2026-10-16. Their modification times are after the job's20:05:31.901Z start. They are observations of the current job, pending its terminal result and archived-byte validation; no final matrix acceptance is implied.

| Image under `artifacts/race-layout/` | Written UTC | SHA256 | Root observation |
| --- | --- | --- | --- |
| four-racers-240x240-dark.png |20:06:09.449001|76d9393705d5e13623ca0fff301d92b4b659841d2e141e1a957e16593cc83453|All four HUD selectors, selected traveler health and five bottom controls fit. World labels are clustered around the Mud Splash pickup text; specifically inspect this crowding in07-05 before claiming all labels are clear. The image alone does not establish whether label footprints intersect.|
| fog-line-1000x280-light.png |20:07:30.661687|6bf9c31d6361d9d8a461bdac82bd923a1b768982e00944ef5708be01ef2f0ea5|Short layout exposes the leader, finish/clock/fog numbers, a trailing-player status banner and movement controls. The selected duck remains visible. Numeric geometry and actual fog-damage behavior still require their assertions.|
| mud-target-320x560-dark.png |20:06:19.759073|d800a9052ba3d64825dfba39809d97e57611911a2e4e362a7fc7c8c58b492008|Compact target view identifies P1 Butter as owner, P2 as selected recipient and the other eligible players. Back and Use on P2 are large and readable; all target rows fit without visible clipping.|

The smallest-frame pickup/label crowding is a concrete visual-review follow-up, not a product defect confirmed by this inspection and not a waived clearance requirement. Preserve this exact capture in the07-05 selection or reacquire equivalent current evidence if source changes. This documentation-only observation does not authorize changing the running collection's source or assertions.

Read-only source follow-up at production3920d11/b82c0a5: graph-resolved `Renderer.packSessionLabels` (`src/render.ts:387`) reserves previously placed traveler nameplates and protection text. Consumable text is separately projected and drawn in the pickup loop (`src/render.ts:318`, label draw339); its bounds are not included in that nameplate packing list. This identifies a concrete measurement gap for07-05: observe pickup-text and traveler-nameplate envelopes together at the preserved240px state, including stroke widths. Existing actor-versus-opaque-DOM clearance and label-versus-label tests alone cannot prove pickup-text separation. The source fact does not by itself prove that the rendered rectangles intersect, so retain the pending visual status until actual geometry is measured.

Subsequent Race job result: the same full run logged `PASS race-layout` at2026-10-16T20:12:14.822Z. All10 tests passed, with zero failures/cancellations/skips, in402321ms. Root independently read the archived report under `suite-artifacts/race-layout/artifacts/race-layout/report.json`: complete=true, eight stages,420 unique cells covering the exact35-state × six-frame × two-theme Cartesian product, zero recorded geometry failures/runtime errors/external requests. All three inspected Race PNG digests match their archived bytes. The source/tests/tooling/root lock remain unchanged fromcb0e569. This clears the prior full-run Race cancellation frontier; the complete collection, label-crowding follow-up and release acceptance remain pending.

## Hand-verified collection: fresh Race presentation captures

During full collection14319 on2026-10-16, root confirmed collector PID19286 and parent19025 live, with `cross-mode-presentation` started at21:55:20.406Z. Run `085c8764-1a31-41c9-9db9-d8aabfc7bde4` freezes source/tests/tooling at9e09aad (last implementation65ca494). A direct diff of `src`, `tests`, `tools` and `pnpm-lock.yaml` against9e09aad was empty. The inventory digest remains `cd2869fae16b79b0068a3f60ca23eed8055bf54901d7c035f4717d59c5f93d47`.

Root opened the following fresh PNGs through the image viewer. Their timestamps are after this job's start; the older Relay and compact-gap files were explicitly not treated as current-run evidence. At inspection the job was still live, so the table records observations pending terminal execution and archived-byte validation.

| Image under `artifacts/cross-mode-presentation/` | Written UTC | SHA256 | Root observation |
| --- | --- | --- | --- |
| race-240x240-light.png |21:57:42.208654|24081f0d3522fce57e23512b708c36b8ae41ff48cb7602d8acd9c7725ef52de6|The two-line race status, four player selectors, selected-player health and five bottom controls fit. All four travelers and their name labels are visible in the remaining world strip; labels are compact. No visible control clipping. This image alone does not prove exact nameplate separation.|
| race-1000x280-light.png |21:57:46.701009|9314b3e21c2eed92ddbbb3eecadb202da727cab69357758878cd1dd701b0bf7c|Four selectors occupy the top row; health and race status fit beneath. All travelers remain visible between the HUD and bottom movement/Notice controls. No observed text truncation or actor/control overlap.|
| race-900x600-light.png |21:57:45.247416|0b2b9a7699ea617af48f4723a68995763b548465c2733eaacbe43daae94a3f44|All four named HUD tiles, the paused invitation, owner selector, item slots and bottom action controls are readable. The travelers and labels remain visible in the world. No observed clipping or overlapping controls.|

These observations do not close the separate pickup-text/nameplate measurement gap above: the fresh images are the initial Race presentation, not that preserved pickup-crowding state. They also do not establish complete visual-matrix, coverage-floor or release acceptance.07-05 must retain acquisition provenance, verify matching archived bytes and carry only current source-bound evidence into its durable manifest.
