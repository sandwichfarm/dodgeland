---
phase: 04-relay
plan: 01
subsystem: gameplay
tags: [relay, local-session, input, opaque-iframe]
status: complete
tasks_completed: 2
tasks_total: 2
requires:
  - phase: 03-survive-together-consumables
    provides: Shared session, lifecycle, recovery, earned participant score and owner routing
provides:
  - Validated immutable ordered Relay setup for two through four seats
  - One active runner and safe fresh-confirmed transfer on the retained world
  - Production-model and muted built-iframe tracer
requirements-completed: [RELAY-01]
requirements-partial: [RELAY-02, RELAY-03]
affects: [04-02, 04-03, 04-04, 04-05, 04-06, race]
tech-stack:
  added: []
  patterns: [composed session handlers, lifecycle-bound confirmation, complete-proposal validation]
key-files:
  created: [src/relay.ts, src/relay-ui.ts, tests/relay-tracer.mjs]
  modified: [src/session.ts, src/session-ui.ts, src/session-ui.css, src/main.ts]
key-decisions:
  - Retain the live base mode definition and extend the generic session handler seam.
  - Keep personal scoring in the shared dependency; never compensate inside Relay.
  - Preserve the shipped roster and binding editors through an optional rendered callback.
completed: 2026-10-15
---

# Phase 04 Plan 01: Relay setup and first handoff

Two through four stable seats can configure an ordered closed Relay, complete a real segment, and fresh-confirm the next runner on the same settled course.

## Pre-edit dependency reconciliation

Recorded before production edits. Generic executor fallback uses the inherited default model after typed GSD dispatch remained pending_init and was cancelled; this is not a typed-agent execution claim.

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

## Implementation and scope

`validateRelaySetup` validates the complete proposal before mutation: two through four unique seat/device/character records including P1, connected bindings, and a canonical whole-tile value 1–999 (default 50). It freezes copied records and runner order. `createRelaySession` stages and commits one LocalSession over the existing ready Game/world. Invalid proposals preserve the exact ready game snapshot and owner identities.

`createRelayDefinition` retains the base Arcade/Flow definition and composes `SessionModeHandlers`. Generic `canAct`, `canAdmit`, `simulates`, `canAdvance` hooks keep Relay policy out of input/session/render cores. Settled forward progress latches a pending boundary; the post-resolution tick opens the handoff only at a safe position. `transferPosition` changes avatar placement and spatial baselines without crediting personal progress or replacing world ownership. `RelayConfirmation` binds transfer generation, stable seat/device, participant identity and lifecycle generation. Router seeding and keyboard suspension consume held/boundary inputs.

The existing roster, traveler catalog and binding editor remain authoritative. An optional `LocalSessionBoardOptions.onRendered` reapplies Relay validation after internal roster edits. Length/order/roster pages preserve drafts; reorder controls retain stable seats. Handoff offers the incoming identity, primary confirmation, and read-only paged `View relay`. Theme contrast and clipping are verified explicitly, including the tiny size notice.

This completes Plan 04-01 only. RELAY-01 setup is complete. RELAY-02/03 retain partial status because later plans own boundary adversaries, reconnect/leave policy and full lifecycle UI. No Relay phase, milestone, full visual matrix or physical-controller validation is claimed complete.

## Task commits

- `61560f9`: initial RED production and opaque-iframe tracer.
- `8bb8faf`: initial setup/coordinator/session seam implementation, explicitly checkpointed pending shared scoring repair.
- `d9288f8`: RED primary cooldown/economy dependency regressions.
- `fdad9f0` (root-owned): generic participant scoring dependency repair; `639443e` accepts its gate.
- `641e3cc`: world future-state and stale-lifecycle RED expansion.
- `7a70822`: Task 1 lifecycle-bound confirmation and controller freshness.
- `cc161b5`: Task 2 atomicity/frozen roster matrix and invalid editor-rerender RED regression.
- `8da82b9`: Task 2 paged setup, validation persistence, three/four-seat browser paths and initial responsive matrix.
- `2d52953`: inspected contrast/clip repair with regression assertions.
- `e16211f`: cross-mode cleanup and visible Relay cancellation→Survive regression.

## Deviations and repaired dependency

The first tracer exposed a required shared-engine gap: returning P1 inherited spatial maxY as earned score. A real two-leg transfer reduced innate cooldown 99→98 without personal movement, and the next hop produced inventory score 3 instead of 2. Execution stopped at a truthful dependency checkpoint. Root repaired `SessionPlayer.scoreBaseline/personalScore`, `Game.scoringPlayer/currentScore`, primary facade power projection and contribution score in `fdad9f0`; ordinary solo keeps its prior maxY path. Adopted solo progress is captured once, and repeated start cannot rebase it. The independent 98-hop adoption/cancel/transfer-200 regression proves the real 99/100 milestones. See `04-DEPENDENCY-REPAIR.md` for durable RED/GREEN evidence. Both Relay regression assertions remain intact and pass.

Task 2 exposed the shipped editor resetting the Start disabled state during internal selection. The smallest generic optional rendered callback fixes that extension contract without cloning the roster editor. Visual inspection additionally caught low-contrast dark handoff buttons and clipped bottom controls in the 240px order page; explicit material button colors and a compact borderless setup board fix them. Geometry tests now check clipping ancestors and WCAG text contrast (at least 4.5), not only viewport coordinates.

Cross-mode review also exposed a removed configuration leaving its `data-relay-page` attribute on the reused board. The visible Relay→Back→solo→pause→Survive regression failed because the roster remained hidden. Clearing that attribute when removing the extension repairs the shared editor path; the regression remains.

## Validation

- Accepted dependency repair gate: root session 78662 exit 0, `/tmp/down-to-duck-personal-score-full-gate.log` (complete Phase 2/3 plus Relay 4/4).
- Task 1 feedback gate: `pnpm test:phase3 && node --test tests/relay-tracer.mjs`, session 16007 exit 0, `/tmp/down-to-duck-04-01-task1-gate.log`; Relay 6/6 and all inherited checks passed before Task 2 expansion.
- Task 2 RED: `/tmp/down-to-duck-04-01-setup-red.log` proves invalid length became enabled after an internal editor render. Model matrix already passed; the UI assertion failed as expected.
- Final focused Relay suite: `pnpm type-check && pnpm build && node --test tests/relay-tracer.mjs`, session 14986 exit 0, `/tmp/down-to-duck-04-01-cross-mode-green.log`, 12/12 passed.
- Superseded whole-gate attempts 47890 and 13770 were deliberately terminated (exit 143) before source repairs; their logs are retained under `/tmp/down-to-duck-04-01-superseded-gate.log` and `/tmp/down-to-duck-04-01-superseded-cross-mode-gate.log`. Neither is completion evidence.
- Cross-mode RED evidence: `/tmp/down-to-duck-04-01-cross-mode-red.log`.
- Final exact gate: `pnpm test:phase3 && node --test tests/relay-tracer.mjs`, session 90748 exit 0 on source `e16211f`, `/tmp/down-to-duck-04-01-final-gate.log`; exact Phase 2 prefix, solo parity 21, retained solo regressions 271, shared model 73, Phase 3 recovery 44 and final browser 34, guidance/type/build/lockfile, and Relay 12/12 passed.
- Model proof compares world identity, simulation tick/time, row identities and actor state, pickups/claims, RNG reference and private future semantics, all player inventory/health/power/personal progress before and after transfer. Tests also cover old lifecycle tickets, original-device reclaim, immutable copied order, invalid proposals and closed admission.
- Muted opaque iframe proof uses visible production configuration for two, three and four bound seats; actual keyboard/controller hops; inactive/held input rejection; fresh incoming confirmation without a free hop; read-only roster; unknown-device rejection. No production test control/global or alternate bundle exists.
- Forty captured frame/theme combinations cover length, roster, order and handoff at 240×240, 320×560, 900×600, 1000×280 and 2400×1200, both runtime themes, plus 200×160 notice/state preservation. Captures: `/tmp/relay-{length,roster,order,handoff}-{width}x{height}-{dark,light}.png`. Inspected before captures: `/tmp/relay-before-handoff-dark.png`, `/tmp/relay-before-order-clip.png`; inspected after captures include 240px order/handoff and 900px length. The broader lifecycle/results matrix remains later-plan work.
- All browser launches use `--mute-audio`. Conformance is **5 pass / 0 fail / 5 unmeasured**, not ten passes. Physical controllers remain unmeasured. Oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5` and lockfile unchanged; no dependencies, manifest/protocol domains, shell/native polling, direct network, browser storage, preview 5175, publication or merge changes.

## Self-check

All listed source/test artifacts and task commits exist. Final whole command completed exit 0, without skips in the Relay suite. Worktree was clean at source `e16211f` before documentation updates. The immutable oracle and lockfile comparison passed. No build/browser process remains owned by this executor. Plan completion does not imply phase or milestone completion.
