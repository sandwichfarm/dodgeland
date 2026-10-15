---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 03
current_phase_name: survive-together-consumables
status: executing
stopped_at: "Phase03 Plans01-02 complete; Plan03 consumable contracts executor started."
last_updated: "2026-10-15T08:21:39Z"
last_activity_desc: Live RNG/schema isolation7/7 and tracer5/5 pass; executor final regressions and strict aggregate pending.
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 30
  completed_plans: 12
---

# Project State

## Current Position

Phase03 — Survive Together & Consumables, Plan03 of7, wave2, executing.
All seven Phase03 plans and UI contract are reviewed. Phase01 and02 are independently verified; Phase03 remains incomplete. No complete multiplayer mode or PR yet.

Full unchanged goal: `.planning/USER-REQUEST.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`. Branch `feat/local-multiplayer`; immutable solo oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5`, never repin.

## Completed Admission Plan

Plan03-01 source `a31412f`, summary `ba4166d`: live Arcade/Flow adoption, batch and late admission, unique characters/devices, safe placement, ghost/reclaim/departure, contribution and recovery provenance. Root reviewed the summary and independently ran final canonical `pnpm test:phase2` to exit0 (session17613, `/tmp/down-to-duck-03-01-final-phase2-hydration.log`). Exact solo21, regressions271, render19, shared model71, all built input/audio/adoption/owner flows, layout matrices, hand44frames, real Paja10scenarios/12frame-theme/8wavechecks, guidance, conformance, and immutable lockfile check passed. Focused co-op tracer/admission22/22.

Regression history is preserved in03-01SUMMARY. Root tests `201104d`, `0bbd0e0`, `abcf4f7` cover wave safety, atomic four-seat promotion, and primary binding restoration across replacement stages. Mixed controller/keyboard and selected-character audio bugs were fixed. Root `0f064b5` fixes runtime smoke synchronization: wait for both persisted preferences, actual frame reload, and hydrated checked state instead of a fixed400ms assumption. Product code unchanged for that test fix.

Phase02 verification remains `.planning/phases/02-shared-local-session/02-VERIFICATION.md` (passed5/5), completion `0c3f50c`.

## Completed Recovery Plan and Next Work

Plan03-02 source `55ba925`, summary `797b931` plus final self-check `9ab546a`. Root spot-checked production recovery/result artifacts, commit state, final logs, unchanged lockfile, and summary self-check. Final strict recovery36/36, admission/tracer22/22 with production build, exact solo parity21/21, character-power/death-spill regressions, type-check, guidance, and conformance passed. Logs `/tmp/down-to-duck-03-02-final-survive-recovery.log`, `-final-survive-tracer.log`, and `/tmp/down-to-duck-03-02-solo-parity.log`. Parity handle29547 completed exit0; do not restart it. Conformance remains5pass/0fail/5unmeasured skips. This accepts recovery mechanics; observable recovery/result UI and real consumable ownership remain later plans. Phase requirements remain pending until complete phase verification.

Implemented shared personal/Revival/Flare validation and commit, 8-active-second offers, 2-active-second protection, alias-retained 250-new-tile recharge, exact fractional owner anchors, safe all-or-nothing relocation, terminal clock freeze, and immutable archived team contributions. Necessary generic session/Game dispatch and narrow RunInventory.resumeAfterDeath() extensions preserve the solo oracle and resume an empty returned player's economy without restoring purchases. Source summary records actual APIs and deviations.

Root supplemental regressions: tests/survive-recovery-boundaries.test.mjs(13), tests/recovery-plan-boundaries.test.mjs(6), tests/survive-recovery-terminal.test.mjs(10). Historical RED evidence and fixes include early staging attachment, backtracking/forced-progress credit, stale all-dead clock, invalid target counts, living Flare health/counters, fractional owner placement, airborne row retention, unsupported last-safe anchors, alias progress reset, terminal late admission, and solo-adoption historical frontier. Commits/logs remain in history; all final36 cases pass. `pnpm test:survive-recovery` strictly rejects skipped/TODO/cancelled evidence and is included in the final phase gate.

Active: `/root/multiplayer_consumable_catalog`, sequential typed gsd-executor for03-03, owning only src/consumables.ts, src/consumable-drops.ts, tests/consumables.test.mjs, tests/consumable-drops.test.mjs and03-03SUMMARY. Root owns tracking/package. No worktree isolation is configured; do not overlap executors/builds. Plan03 defines immutable owner/generation/target-bound credit/debit and exact keyed item-drop-schema-1 sampler, with exhaustive1/2/2497 buckets and released RNG isolation. Then03-04 world integration,03-05 economy,03-06 lifecycle/recovery/resultsUI,03-07 hand/market/final gates. Independently verify the whole phase before Relay/Race; root stops related work during verifier.

Plan03 current evidence: Task1 tests `94adfac`, production `999f3a5`, initial isolation `5dd46dd`. Focused11/11 and type-check passed (`/tmp/down-to-duck-03-03-task1-final-focused.log`, `-task1-final-typecheck.log`); earlier failed handle10127 is terminal. Initial RED `/tmp/down-to-duck-03-03-red.log` records missing source before implementation; its piped shell status was masked, so summary must report actual chronology honestly. Executor reported sequential regressions handle3223 live: seed/market/mob passed, solo parity underway; executor owns polling, do not restart on observation timeout.

Root review found the first isolation fixture reset generators between calls; its subsequent callback revision exhausted the4/6-anchor queue during early terrain, leaving market/mob callbacks empty. Root temporarily took ownership of tests/consumable-drops.test.mjs and fixed this in `0003f84`, then released the file back to executor. Every boundary now samples full forward/reverse/sparse/duplicate orders and asserts nonzero sampling per named stage; observations include whole lane actor patterns, real nonempty markets and first/next mobs, live market state, and next4 raw market/mob RNG outputs. A compiled test-only item schema key/salt variation changes item IDs/buckets while preserving released ph1/ph2/ph3 observations. Strict7/7 passed `/tmp/down-to-duck-03-03-root-isolation.log`. Production unchanged. Final strict aggregate(expected18 tests), full regression/build gates and SUMMARY remain required before accepting03-03.

Root `7bdb0e3`/`cc3c521`/`bae4b1f` owns tests/consumable-boundaries.test.mjs, included in strict `pnpm test:consumables` and final phase gate. Five focused checks pass at `/tmp/down-to-duck-03-03-root-tracer.log`: known positive drops→catalog→credit tracer, two-seat Flare with only owner alive, independent class capacity/debit, invalid numeric charges, and sparse empty-charge semantics. Initial root2/3 failure was an overly strict expectation that omitted optional charges are invalid; corrected to actual Partial<Record> without product changes. Review caught draft Flare's unnecessary additional living teammate requirement and sparse-vector ordering, corrected by executor. Signed row support accommodates initial negative buffered rows. Root independently derived rejection-retry vector (seed0x87405b12,row0,slot0: draw0=4294967295 rejected, retry1=2472345421, bucket421); executor pinned it in passing golden test. Root has no live process/build reservation.

Root also reconciled03-04 with the actual Survive attach/debit seam, explicitly included src/survive-together.ts ownership, and corrected its parity commands: the snapshot helper alone has no assertion suite; pnpm test:solo-parity is required. MCP graph lookup is available again for this project.

The previous git-init status-only turn made no multiplayer progress. This continuation revalidated final evidence, accepted Plan02, corrected summary evidence scope, and advanced execution. No blocker.

## Invariants

- One session owns world/RNG/clocks/claims; players own movement, health, inventory, innate power and contributions.
- Live solo cancel preserves actual owners and future state; commit adopts them. Relay/Race start fresh.
- Existing innate100-block powers stay separate from personal250-new-tile revival. Forced movement, backtracking, reclaim/rejoin and aliases cannot farm charges.
- Death spills/clears only the dead owner's run inventory; ghosts/departure retain it. Recovery does not restore lost purchases.
- Four seats and Race500tiles/180active seconds remain validated provisional defaults; Relay default50tiles.
- SDK boundaries only, no new runtime packages; all browsers muted, preview5175 untouched. Explicit owned-path commits only.

## Remaining Evidence and Presentation Work

- Phase06 must fix regular900×600 HUD overlap with nearby P2/P4 actors. It requires actual verified03–05 lifecycle/results before final UI contract authoring; no speculative06UI-SPEC exists.
- Conformance5pass/0fail/5unmeasured skips (manifest3,wire1,lifecycle1), not10passes. Physical controllers unmeasured. See `.planning/research/CONFORMANCE-EVIDENCE.md`.
- Phase07 honest coverage calibration remains exploratory until normal-install and browser instrumentation are proven; see `.planning/research/COVERAGE-CALIBRATION.md`.
- Deliver all three modes, their interfaces and visual proofs, high honest coverage, and an open PR against main. No merge/publish/deploy. Goal remains active; no blocker or completion claim.
