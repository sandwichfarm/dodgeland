---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 03
current_phase_name: survive-together-consumables
status: executing
stopped_at: "Phase03 Plans01-03 complete; Plan04 world pickup executor started."
last_updated: "2026-10-15T08:41:10Z"
last_activity_desc: World integration source underway; five root pickup/gravity/death boundary cases committed pending API implementation.
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 30
  completed_plans: 13
---

# Project State

## Current Position

Phase03 — Survive Together & Consumables, Plan04 of7, wave3, executing.
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

## Completed Consumable Contracts and Next Work

Plan03-03 complete: tests `94adfac`, source `999f3a5`, initial isolation `5dd46dd`, root tracer `bae4b1f`, corrected isolation `0003f84`, summary `4f78b97`. Immutable snapshot-only CONSUMABLES/credit/debit catalog (Revival24,Flare36,max1each), item-drop-schema-1 sampler (uint32seed,int32row,uint32slot), exact exclusive buckets1/2/2497, positive and rejection-retry goldens. No production RNG/seed schema or dependency changes.

Final strict18/18 (`/tmp/down-to-duck-03-03-final-consumables.log`); sequential seed12/12,market62/62,mob18/18,solo-parity21/21 (`/tmp/down-to-duck-03-03-task2-regressions.log`), handle3223 terminal exit0. Executor platform10714 reported exit0 but its log was empty; root independently reran type-check/build/guidance/conformance/immutable-lockfile gate to exit0 (handle72960, `/tmp/down-to-duck-03-03-root-platform.log`). Conformance5pass/0fail/5unmeasured, not10passes. Source/summary self-checks passed and prior executor released all reservations. ITEM requirements stay pending until world/economy/UI integration and phase verification.

Root supplement tests/consumable-boundaries.test.mjs (5cases), strict script and final phase gate are committed. Review corrected two-seat Flare semantics, sparse-vector ordering, and a test that overrestricted omitted optional charges; no product workaround. Rejection vector seed0x87405b12,row0,slot0 forces draw4294967295→retry2472345421→bucket421. Initial isolation fixtures reset generators or exhausted the sample queue before markets/mobs; corrected tests now sample at every named boundary, assert real nonempty markets/mobs, compare whole lane actors plus actual next raw RNG outputs, and vary the item schema only in an isolated compiled test copy. Initial RED chronology/failed checks are recorded in03-03SUMMARY.

Active: `/root/multiplayer_consumable_world`, sequential typed gsd-executor03-04. Owns src/session.ts,src/game.ts,src/survive-together.ts,src/render.ts,tests/solo-parity-snapshot.mjs,tests/consumable-world.test.mjs and03-04SUMMARY. Root owns tracking/package and supplemental tests; no overlapping executors/builds. Integrate optional handler-installed world item capability after committed adoption, absent solo path, keyed initial/future drops, baseline-gravity fractional/swept pickup claims, owned atomic/replay-safe activation, death clearing, projection/teardown and oracle proof. Then03-05 economy,03-06 lifecycle/recovery/resultsUI,03-07 hand/market/final gates. Independent phase verification precedes Relay/Race. Root stops related work during verifier.

Plan03-04 executor is editing Game/Session and its owned world test after running prerequisites (`/tmp/down-to-duck-03-04-precondition.log` reaches conformance tail; explicit terminal handle/exit report requested). Proposed stable observation API: session.consumableSnapshot() is undefined absent/after teardown, otherwise frozen {generation,pickups:[id,itemId,row,slot,x,y],charges:[seat,ownerGeneration,inventoryGeneration,revival,flare],claims:[pickupId,seat],protected:[seat,until]}. Action API session.useConsumable({actionId,ownerSeat,itemId,targetSeat?,expectedInventoryGeneration}) returns boolean. Generic Game.setWorldExtension seam; sample each row at slot0, initial x=lane.coin??0, river binding follows existing actor-position policy. Final exported types remain executor-owned.

Root owns tests/consumable-world-boundaries.test.mjs, commits `df261c2`/`8d3123c`, plus strict pnpm test:consumable-world and final phase gate wiring. Five cases: real moving-log ride/bank hop across19 offsets×both items×both modes×P1/P2×both directions, exact fractional-grid preservation/single claim, real purchased magnet movement/range isolation, actual P1/P2 death clearing only its item and wallet with empty personal return, and ghost retention through primary death/reclaim. Pure sampler fixtures row1/slot0 Revival seed0xc7045dbd, Flare0x4905bf13; seed0xb4184ed2 gives row1Revival+row2Flare for real dual-owner collection. Initial first2 cases RED on missing session.consumableSnapshot (`/tmp/down-to-duck-03-04-root-boundaries-red.log`, handle84671 terminal exit1); later3 cases syntax-checked only, await source-ready. No production hacks or sampler overrides. Root has no live process; executor owns all builds. Do not treat these as passing yet.

Root also reconciled03-04 with the actual Survive attach/debit seam, explicitly included src/survive-together.ts ownership, and corrected its parity commands: the snapshot helper alone has no assertion suite; pnpm test:solo-parity is required. MCP graph lookup is available again for this project.

Plan03-04 root boundary coverage is now11 cases (initial action/reuse addition `dfc6fcb`, subsequent intent-generation additions pending commit). Actual collected-item activation, same-tick debit/return, full-state invalid/replay/no-placement rejection, distinct participant seat reuse, delayed prior-owner intents after the newcomer collects a future-row Flare, and stale Revival selection after another actual death now supplement the fractional-grid/death/ghost tests. Ghost reclaim fixture restores a safe anchor before checking inventory retention; its initial rejection on unsupported water was valid placement behavior, not a product failure.

Independent strict root run15943 completed exit0,11/11 with no skips (`/tmp/down-to-duck-03-04-root-intent-generations.log`). Earlier checkpoint21845 passed9/9. Intermediate93561 failed after the production action contract changed; tests now supply required expectedOwnerGeneration and Revival expectedTargetDeathGeneration. Initial delayed-seat review found per-owner revision increments could collide despite distinct starting revisions; executor now assigns every mutation from one non-reused counter. Current APIs include required owner generation and Revival target death generation; do not keep older test callers as an excuse to weaken intent validation.

Prerequisite handle92442 has confirmed terminal exit0 (`/tmp/down-to-duck-03-04-precondition.log`). Executor reported focused gate8904 live (`/tmp/down-to-duck-03-04-task1-world-gates.log`), owns build/browser reservation. Root has no live command. Agent owns remaining plan matrices and final gates; root11 tests plus its initial2 tracers do not prove the whole plan. Pending evidence includes absence/teardown/custom opt-in, initial/future generation and replay, swept stable winners and ineligible/full owners, actor binding, actual-position pruning, rendering and full owner death/spill cases. No03-04SUMMARY yet; no acceptance or completion claim.

Previous Git status-only turn made no multiplayer progress. Subsequent continuations added executable regressions, diagnosed ownership/version flaws, and verified corrections. The user briefly paused and then explicitly resumed; goal is active. No blocker.

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
