---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 03
current_phase_name: survive-together-consumables
status: executing
stopped_at: "Phase03 Plan01 complete; Plan02 recovery executor started."
last_updated: "2026-10-15T07:48:43Z"
last_activity_desc: Recovery integration and lifecycle fixes implemented; focused tests green, solo parity running, final placement proofs pending.
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 30
  completed_plans: 11
---

# Project State

## Current Position

Phase03 — Survive Together & Consumables, Plan02 of7, wave2, executing.
All seven Phase03 plans and UI contract are reviewed. Phase01 and02 are independently verified; Phase03 remains incomplete. No complete multiplayer mode or PR yet.

Full unchanged goal: `.planning/USER-REQUEST.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`. Branch `feat/local-multiplayer`; immutable solo oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5`, never repin.

## Completed Admission Plan

Plan03-01 source `a31412f`, summary `ba4166d`: live Arcade/Flow adoption, batch and late admission, unique characters/devices, safe placement, ghost/reclaim/departure, contribution and recovery provenance. Root reviewed the summary and independently ran final canonical `pnpm test:phase2` to exit0 (session17613, `/tmp/down-to-duck-03-01-final-phase2-hydration.log`). Exact solo21, regressions271, render19, shared model71, all built input/audio/adoption/owner flows, layout matrices, hand44frames, real Paja10scenarios/12frame-theme/8wavechecks, guidance, conformance, and immutable lockfile check passed. Focused co-op tracer/admission22/22.

Regression history is preserved in03-01SUMMARY. Root tests `201104d`, `0bbd0e0`, `abcf4f7` cover wave safety, atomic four-seat promotion, and primary binding restoration across replacement stages. Mixed controller/keyboard and selected-character audio bugs were fixed. Root `0f064b5` fixes runtime smoke synchronization: wait for both persisted preferences, actual frame reload, and hydrated checked state instead of a fixed400ms assumption. Product code unchanged for that test fix.

Phase02 verification remains `.planning/phases/02-shared-local-session/02-VERIFICATION.md` (passed5/5), completion `0c3f50c`.

## Active Ownership and Next Work

`/root/multiplayer_recovery` is the typed gsd-executor for03-02. Owns recovery.ts, session.ts, survive-together.ts, survive-results.ts, survive-together.test.mjs,03-02SUMMARY and build/browser. Necessary narrow generic Game protection integration may be required; preserve exact solo behavior. Root owns tracking/package and supplementary tests. Prior tracer executor completed; no test process remained when recovery started.

Root `dcfa0c7` reconciles03-02 with actual APIs: progress/result callbacks currently lack dispatch; all-dead update returns immediately. Recovery must integrate real production context, progress, fixed-time offers and settlement, not isolated helpers. Plan02 then03 in wave2, followed by03-04..07 in dependency order. Independently verify the complete phase before Relay/Race. Root stops related work while a phase verifier runs.

Plan02 executor remains live with Task1 RED commit `9652a1a`; recovery/session/result implementation is in progress, not accepted. Root commits `fe340c8` and `ca3d8d6` add ten supplementary P1/P2 production-hazard and completed-hop cases in `tests/survive-recovery-boundaries.test.mjs`. Initial eight-case run failed at the missing recovery offer after actual river death (`/tmp/down-to-duck-03-02-root-boundaries-red.log`); two fatal-250th-hop cases were subsequently added and await implementation validation. The checks cover traffic health mutation before death, water/train protection and expiry, backtracking, airborne progress, exact249/250/251, and fatal qualifying landings. Root owns this file. `cea53b6` adds strict `pnpm test:survive-recovery` and includes these tests in the final phase gate. No green recovery claim yet.

Root `f2e7087` adds six immutable planner/debit boundary tests in `tests/recovery-plan-boundaries.test.mjs`, also in the strict recovery/final gates. Initial run3pass/3fail (`/tmp/down-to-duck-03-02-plan-boundaries-red.log`) exposed multi-target Revival, empty-target Flare, and self-target via copied identity; executor is fixing these. Root review also found early staging attachment, repeat-forward-hop credit, and unbounded terminal clock risks. Executor reports staging attachment moved to commit/start and all-dead time gated by a valid pending-offer predicate. Root independently verified staging/cancel2/2 in Arcade/Flow (`/tmp/down-to-duck-03-02-live-adoption-check.log`); this is a narrow proof, not full recovery acceptance. Executor has no active command handle as of its latest report and is resolving controller/type integration before its first focused run. Root waits for settled APIs/results; no overlapping builds.

Latest03-02 state supersedes that early integration report: executor reports strict recovery31/31 exit0 in `/tmp/down-to-duck-03-02-survive-recovery-eighth.log`, before the additional live-adoption regression. Root owns three supplemental files now: recovery-plan-boundaries(6), survive-recovery-boundaries(13), and survive-recovery-terminal(10). Commits `34ac15c`, `fd9db04`, `c917bb5`, `d23a663` cover backward/forward frontier distinctions, living Flare health/counters/economy, exact fractional non-primary owner anchor, pause/decline/expiry, alias partial recharge, ghosts/departure, supported last-safe positions, immutable archived counters and late-action rejection. Initial failures are preserved in regroup/terminal logs. Root independently observed nine terminal cases passing before the added adoption-after-backtracking case failed; executor has since patched initialization to include retained solo maxY. Full final strict run remains required.

Production fixes include generic session result/tick/progress seams, immutable provenance with spatial frontier, session-only hazard protection and hop normalization, retained airborne rows, exact owner-anchored regroup, and an authorized narrow `RunInventory.resumeAfterDeath()` extension so returned empty players can earn/trade without restoring purchases. Executor owns src/market/run.ts in addition to original files. Its own wave/mob, character-power and death-spill suites report exit0. **Live process: solo parity handle29547**, log `/tmp/down-to-duck-03-02-solo-parity.log`; executor owns polling, never restart on observation timeout. Remaining before source-ready: explicit unsafe-placement all-or-nothing and forced-forward Flare/next-hop credit proofs, final strict/type/prerequisite checks and03-02SUMMARY. Root does not run overlapping gates or mark plan complete yet.

Root `fcb2fd0` explicitly includes narrow Game damage/death protection in03-02 ownership. `746c31e` makes03-03's already-required debit contract concrete: immutable one-charge plans, owner/generation/target validation, empty/stale/invalid rejection, and full focused tests. Generated local skill-install artifacts were removed from the worktree by their executor owner. Previous git-init status-only turn made no multiplayer progress; this goal turn adds executable regression evidence and closes a plan coverage gap.

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
