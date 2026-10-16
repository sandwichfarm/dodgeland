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
