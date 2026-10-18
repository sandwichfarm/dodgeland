---
phase: 03-survive-together-consumables
plan: 07
subsystem: ui
tags: [local-multiplayer, market, inventory, recovery, playwright]
requires:
  - phase: 03-06
    provides: authoritative recovery and lifecycle UI
provides:
  - One owner-labelled market and persistent card/consumable shelf
  - Owner-safe keyboard, controller and pointer transactions
  - Complete built-artifact Survive Together acceptance journey
  - Passing canonical inherited and Phase03 gates
affects: [relay, race, multiplayer-ui]
tech-stack:
  added: []
  patterns: [versioned owner transaction context, read-only ghost inspection, native layout delivery barrier]
key-files:
  modified: [src/main.ts, src/market-ui.ts, src/run-hand.ts, src/hand-layout.css, src/session-ui.css, tests/market-game-fixture.mjs, tests/runtime-smoke.mjs, package.json]
  created: [tests/survive-complete-run-runtime.mjs, tests/survive-market-pack-owner-runtime.mjs, tests/survive-market-controller-owner-runtime.mjs, tests/survive-market-keyboard-owner-runtime.mjs, tests/survive-market-fresh-context-runtime.mjs]
key-decisions:
  - Owner inspection is separate from transaction eligibility; ghosts may inspect and dismiss a paid pack without losing it.
  - Consumables occupy a distinct Items row and remain reachable at the minimum supported size.
  - Native browser resize delivery must complete before layout assertions; the fixture never supplies application focus.
  - Paja keyboard/pointer smoke isolates real hardware; dedicated controller tests provide deterministic shell snapshots.
requirements-completed: [ITEM-01, ITEM-03, UI-03]
---

# Phase03 Plan07 — owner-safe market and complete acceptance

One physical market and hand tree now displays and dispatches the selected owner's cards, wallet, paid packs and consumables. Pointer actions belong to the visible owner; keyboard/controller actions require that owner's binding. New interactions refresh authoritative context, while stale already-open actions are rejected.

## Delivered behavior

- Revival/Flare purchases cost24/36, have capacity1 per class, expose insufficient-wallet/capacity outcomes, and appear in a separate Items row. Pagination keeps both offers reachable alongside rare stock.
- Full-hand packs open normally. Owner switches preserve the owner's paid draft, clear stale selection/confirmation/input, and permit sale, claim or skip without charging again. Ghost inspection is read-only and can close without destroying its paid draft.
- Held input cannot become a fresh confirmation after owner changes. Native focused keyboard controls and controller pause/reclaim flows retain correct seat ownership.
- Compact market tracks, paged wardrobe/equip controls, charged shelf and frame-anchored HUD toolbar remain usable without scrollbars. Tests verify complete offer text and prices, clipping ancestors, actual hit targets and owner labels, rather than only DOM presence.
- The integrated production-build journey covers live solo cancellation/adoption, four unique players, contested pickup, simultaneous input, ghost/reclaim, departure/new participation provenance, owner death clearing, two-owner trading, personal/item recoveries, retained-charge failures, exact protection/recharge/offer timing, pause-aware settlement, immutable equal-height team results, retry and solo return.

## Verification

Canonical `pnpm test:phase3` completed exit0 as session45733, log `/tmp/down-to-duck-root-phase3-resize-gate.log`, on source/test commit67b282b (tracking commit ea76c4c). No dependencies changed; final lockfile comparison against immutable oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5` passed.

The uninterrupted Phase02 prefix passed type-check/build;21 solo parity cases;271 solo regression cases;19 renderer cases;72 session/input model cases;6 board-controls,1 labels-render,3 tracer, and all seven subsequent single-case runtime/layout suites; persistent-hand runtime; Paja smoke (10 scenarios,12 frame/theme checks,8 active-wave frame/theme checks); dedicated gamepad runtime; guidance6/6; conformance; and lockfile gate.

Phase03 groups passed: admission/tracer/boundaries30, economy19, recovery36, consumables18, world25, world-render3, market62, magnet18, mobs18, death-spill16, final built/runtime/results group34/34, guidance6/6. Type-check and production build passed again before the final browser group. Both conformance reports were **5passed/0failed/5unmeasured**: three manifest checks had no supplied manifest event, wire had no emitted envelope, lifecycle was not measured. Physical-controller behavior remains unmeasured; shell-snapshot controller tests passed.

### Requirement evidence

| Requirement | Passing production-path evidence |
| --- | --- |
| COOP-01 | `survive-together-tracer.mjs`, `survive-economy*.test.mjs`, `survive-complete-run-runtime.mjs`: shared Arcade/Flow world with separate player state |
| COOP-02 | `survive-admission.test.mjs`, `survive-primary-departure.test.mjs`, integrated live adoption/join/leave continuity |
| COOP-03 | `survive-recovery-boundaries.test.mjs`, `survive-recovery-terminal.test.mjs`, integrated250-new-tile and pause-aware8-second checks |
| COOP-04 | `recovery-plan-boundaries.test.mjs`, `survive-paused-recovery.test.mjs`, `survive-recovery-outcomes-runtime.mjs`, integrated safe recoveries/two-second protection |
| COOP-05 | `survive-lifecycle-layout.mjs`, ghost inspection/sale suites and integrated disconnect/reclaim/new-participation provenance |
| ITEM-01 | `consumables.test.mjs`, `consumable-boundaries.test.mjs`, `survive-hand-items-runtime.mjs`: independent class/charges and visible shelf |
| ITEM-02 | `consumable-drops.test.mjs`, recovery model suites and integrated Revival/Flare effects |
| ITEM-03 | `consumable-world*.test.mjs`, `survive-together-runtime.mjs`, physical shelf and two-owner market/pack suites |
| ITEM-04 | `consumable-world-boundaries.test.mjs`, `log-coin-gravity.test.mjs`: fractional collection and coin-magnet isolation |
| ITEM-05 | `consumable-drops.test.mjs`, world boundary suites and integrated contested pickup: exact seeded odds and once-only claims |
| UI-03 | Owner layout; pointer/controller/keyboard owner suites; fresh-context, ghost, pack, tiny-focus and integrated runtime suites |

## Visual evidence

Generated artifacts under `artifacts/` include `local-session-owner-market-{240x240,1000x280}-{dark,light}.png`, the complete owner layout matrix, `survive-recovery-restored-revival-light-240x240-0.png`, lifecycle matrices, `survive-complete-regroup.png` and integrated result/retry evidence. Root inspected the charged compact market images and corrected compact lifecycle toolbar image. Browser tests cover supported small, portrait, regular, short and large frames in both themes, with reduced-motion recovery checks and actual button/text containment. The planned Phase06 aesthetic pass remains required, including regular HUD overlap with nearby actors.

## Deviations and diagnosis

The executor handed off completion to root after runtime-smoke failures. Actual message tracing found real Stadia controller events reaching the smoke browser. Restoring original assertions and isolating native hardware in that keyboard/pointer fixture fixed the smoke; production and dedicated controller tests were unchanged (`16eb691`). A zero-height HUD containing only positioned children put compact toolbar controls outside the frame; frame anchoring with hand clearance fixed it (`e13d598`).

The first full gate ended33/34 on restored tiny-dialog focus. Focused tests passed, but the concurrent batch reproduced the equivalent Reclaim failure. Instrumentation showed the virtual-clock helper returning before native ResizeObserver delivery; application focus changed from BODY during that later delivery. Fixture67b282b waits for layout callbacks and queued microtasks without focusing anything or weakening assertions. Instrumented batch34/34 and the final complete canonical gate passed. Diagnostic logging was removed.

Plan07 implementation and its gate are complete. Independent Phase03 verification is the next required step; this summary alone does not complete the phase or overall multiplayer goal.
