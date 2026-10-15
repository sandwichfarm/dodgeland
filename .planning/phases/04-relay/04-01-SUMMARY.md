---
phase: 04-relay
plan: 01
status: executing
tasks_completed: 0
tasks_total: 2
checkpoint: dependency-repaired-resume-pending
---

# Phase 04 Plan 01: Relay setup and first handoff

## Pre-edit dependency reconciliation

Recorded before production edits. Generic executor fallback uses the inherited default model after typed GSD verifier dispatch remained pending_init and was cancelled; this is not a typed-agent execution claim.

The exact canonical `pnpm test:phase3` (including `pnpm test:phase2`) passed on source `6017f9f`, session73933, durable log `/tmp/down-to-duck-ghost-duration-final-gate.log`. Inspection on entry found no diff from that commit in `src`, `tests`, `package.json`, or `pnpm-lock.yaml`. All Phase01 (4), Phase02 (6), and Phase03 (8) summaries exist. Phase03 independent verification is42/42. Oracle stays `a310a81ed6c76df4b265c9012c23b8c83f4802e5`. Conformance remains5passed/0failed/5unmeasured (manifest3, wire1, lifecycle1); physical controllers are unmeasured.

| Responsibility | Actual delivered symbols and reconciliation |
|---|---|
| Definitions | `ModeDefinition`, `composeModeDefinition`, `SOLO_ARCADE_MODE`, `SOLO_STROLL_MODE`; session definition retains the exact live base definition. |
| Handler composition | `SessionModeDefinition`, `SessionModeHandlers`; `createSurviveTogetherDefinition` demonstrates attach/progress/tick/lifecycle composition. |
| Single world | `Game.world`, `Game.player`, `SharedWorld`, `LocalSession.stage`, `LocalSessionStage.commit/cancel`; no second Game required. |
| Seats/admission | `SessionPlayer`, `SeatId`, `DeviceId`, `SessionSeatSpec`, `SessionSetupSeat`, `prepareAdmission`, `admit`; capacity4, unique characters and bindings. |
| Fixed completion | `LocalSession.settleForwardHop` invokes handlers.progress only after landing and hazards; handlers.tick follows pickup/mob/death/progress resolution. |
| Safe placement | `isRecoverySafePosition`, `recoverySafeCells`, `cancelForwardHop`; add only generic non-crediting transfer and activity/admission hooks to the session. |
| Personal progress | `completedForwardTiles`, `personalFrontierY`, `SessionRecoveryProvenance`, `recordPersonalProgress`, `updateRecovery`; placement must baseline spatial frontier without credit. |
| Recovery | `planRecovery`, `commitRecoveryPlan`, `SessionRecoveryRequest`, `LocalSession.recover`; existing recovery authority remains in delivered mode handlers. |
| Input freshness | `GamepadRouter.seedAll`, context tokens, assigned-seat action callbacks; `createKeyboardInput.resume/suspend` and `observedNativeKeys` seed held keys. |
| Lifecycle identity | `SessionLifecycleRecord`, `deviceLost`, `offerReclaim`, `reclaim`, `depart`, participantId and immutable recovery aliases. |
| Owner surface | `selectedSessionOwner`, `selectHudOwner`, `ownerMutationsAvailable`, `CoOpMarketAdapter`; market/hand invalidateOwner clears stale UI before switching. |
| Eligibility | `planConsumableCredit`, `planConsumableDebit` require survive-together capability; Relay installs no consumable world. |
| Render | `LocalSession.views`, `SessionPlayer.render`, `Renderer.drawSession`; one scene, stable seat labels. |
| Result | `SessionResult`, `completeResult`, immutable `SessionContribution`, `createSurviveTogetherResult`; Relay-specific results remain later-plan scope. |

## Dependency repair accepted — plan not complete

Root repaired the shared scoring dependency in`fdad9f0`; complete inherited gate plus expanded Relay tracer4/4 passed as session78662, `/tmp/down-to-duck-personal-score-full-gate.log`. See`04-DEPENDENCY-REPAIR.md`. Resume Task1 remaining acceptance and Task2; historical checkpoint below explains the defect and is superseded by this repair evidence.

## Historical execution checkpoint — not complete

Task1 has a committed working setup/first-handoff tracer, but is **not complete** because the second return to P1 exposes a missing dependency contract. Task2 validation expansion has not started. No Relay requirement, phase, or milestone is marked complete.

### Committed work

- `61560f9` — RED production-object/built-iframe tracer before Relay existed.
- `8bb8faf` — working initial Relay tracer and UI, explicitly pending shared-progress repair. Adds `src/relay.ts`, `src/relay-ui.ts`; integrates `src/main.ts`, generic activity/admission/transfer hooks in `src/session.ts`, and narrowly scoped `src/session-ui.css` rules. Existing setup/binding/character and hand/market trees are reused.
- `test(04-01): expose primary scoring dependency gap` — two intentionally failing regression assertions retained in `tests/relay-tracer.mjs` for the dependency repair.

### Confirmed shared-engine blocker

`Game.currentScore` (`src/game.ts`) uses `maxY` for P1 and `earnedDistance` only for secondary operation receivers. `SessionPlayer.powerRemaining` repeats that distinction. Spatial `maxY` must advance at non-crediting baton placement so a subsequent forward hop does not count every skipped row as movement. The current primary compatibility facade consequently mistakes that placement for personal progress.

Production reproduction, seed113/Pond/Arcade, two unique keyboard seats and one-tile legs:

1. Actual `Game.end(..., 'water')` invokes Butter's shipped `water-bounce`, setting cooldown100. Fixed updates finish the real rescue.
2. P1 moves/settles one real hop: earnedDistance1, maxY1, cooldown99.
3. P2 receives the baton and moves/settles one real hop.
4. Confirming the real P2→P1 transfer changes P1 maxY1→2 and cooldown99→98, while earnedDistance stays1 and wallet is unchanged.
5. In the independent economy reproduction, the next real P1 hop leaves earnedDistance2 but `RunInventory.maxScore`3. `Game.currentScore` also feeds regeneration and score-based income/invitation milestones. Immediate transfer grants no wallet amount, but the next hop receives skipped-row score.

Required dependency-owned repair: a generic participant-earned scoring seam for primary and secondary active-session operations, power readiness/presentation and economy/health progress, preserving adopted-solo score baselines and exact ordinary-solo behavior. Do not patch Relay with cooldown offsets, duplicate recovery policy, or another score authority. Phase04 research's mandatory reconciliation instruction explicitly requires returning missing per-seat innate progress to the dependency phase. Root confirmed this checkpoint and will handle that repair within the authorized milestone scope.

### Validation evidence

- Before expanded dependency regressions, canonical whole command `pnpm test:phase3 && node --test tests/relay-tracer.mjs` completed **exit0**, session74107, `/tmp/down-to-duck-04-01-full-gate.log`. It includes the exact Phase02 prefix, immutable solo21, retained solo regressions271, renderer19, shared model72, all Phase03 groups and final browser34/34, type/build/guidance/conformance, lockfile integrity, and Relay tracer2/2.
- Current tracer after adding the two blocker assertions: **2passed/2failed**, exit1, session14906, `/tmp/down-to-duck-04-01-dependency-red.log`. Failing assertions are cooldown98 versus99 and inventory score3 versus2. These are not skipped or weakened.
- Additional exact reproductions: `/tmp/down-to-duck-04-01-primary-progress-repro.log`, `/tmp/down-to-duck-04-01-primary-economy-repro.log`.
- All browser launches muted; the production opaque iframe used visible Local Play→Relay configuration, a valid short leg, inactive keyboard rejection, fresh incoming confirmation, second leg, and locked roster. No test-only production switch/global/bundle was added.
- No package, protocol, manifest, storage, network, native polling, preview5175, publishing, or merge changes. Immutable oracle and lockfile unchanged. Conformance5passed/0failed/5unmeasured; physical controllers unmeasured.

### Resume frontier

1. Repair the shared primary personal-score dependency with its own production tests and original solo/Survive compatibility evidence.
2. Rerun current Relay tracer; both new primary-progress regressions must pass.
3. Finish Task1 acceptance, including stronger controller-held/lifecycle-token coverage, semantic private-future RNG identity, and inspect the real setup/transfer presentation.
4. Execute Task2 RED/GREEN matrix for2/3/4 seats, stable reordering, complete invalid-proposal atomicity, deeply frozen snapshots and original-seat identity; ensure internal setup-board rerenders retain invalid-length disabled state and all supported frames remain usable. No Task2 completion evidence exists yet.
5. Run the exact final validation, commit final SUMMARY, then advance state. Full Relay and milestone remain later-plan work.

## Self-Check: checkpoint recorded

Owned source/test files and committed WIP exist. The full inherited gate reached a terminal exit0 before the two explicit new dependency failures were added. No complete-plan self-check or requirement completion is claimed.
