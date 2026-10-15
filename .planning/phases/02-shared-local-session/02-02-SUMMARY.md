---
phase: 02-shared-local-session
plan: 02
subsystem: deterministic-local-session-model
tags: [local-multiplayer, session, world-frame, pickups, mobs, lifecycle]
requires:
  - 02-01
provides:
  - stable per-seat Game operation contexts and callbacks
  - once-per-frame shared pickup and mob arbitration
  - independent terminal/device lifecycle state
affects: [02-03, 02-04, 02-05, 02-06]
tech-stack:
  added: []
  patterns: [immutable frame proposals, stable seat tie-breaks, shared base-world policy]
key-files:
  modified:
    - src/game.ts
    - src/session.ts
    - src/mobs.ts
    - tests/local-session.test.mjs
decisions:
  - Session player operations use permanent per-seat Game receivers; the host facade always remains P1.
  - Shared terrain, pursuit, and pursuer tuning use base mode policy rather than any player's cards or powers.
  - Pickup contacts and gravity pulls are proposed per seat and elected only after the complete frame.
metrics:
  commits: 3
  focused_tests: 44
  solo_parity: 21
  regression_tests: 271
status: complete
---

# Phase 02 Plan 02: Shared Local Session Model Summary

One shared course now resolves multi-seat movement, pickups, pursuers, terminal state, and device lifecycle deterministically while preserving the solo Game facade.

## Delivered

- Replaced ambient secondary-player rebinding with stable per-player operation receivers. Nested callbacks retain the P1 host facade, while P2–P4 methods and callbacks operate on their own inventory and state.
- Added 1–4-seat roster validation, distinct safe spawns, accurate P1–P4 markers, typed lifecycle records, active lease protection, and batched terminal lifecycle delivery after every affected player has settled.
- Advanced shared clocks, wave, rows, mobs, and RNG exactly once per frame. The director uses a deterministic shared anchor, base world effects, per-mob nearest eligible targets, and swept impacts across all active seats.
- Converted pickup handling to immutable direct-contact and pull proposals. Resolution applies earliest contact, then distance, then seat; a pull candidate cannot preempt a later seat that physically contacts the coin in the same frame.
- Preserved the released solo director early-return behavior after terminal contact.

## Validation

- `pnpm type-check`
- `node --test tests/local-session.test.mjs tests/session-world.test.mjs tests/session-lifecycle.test.mjs tests/mobs.test.mjs` — 44 passing
- `pnpm test:solo-parity` — 21/21 passing
- Final regression suite — 271/271 passing

## Commits

- `96f3cc5` — shared mob and lifecycle model
- `6a76cd5` — pickup proposal arbitration and terminal target eligibility
- `2e2e342` — dispose temporary local-session test modules

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] Preserved solo terminal director ordering**
   - Restored the immediate solo return after a terminal mob contact, preventing later actors from advancing in that fixed step.

2. **[Rule 1 - Bug] Deferred pull ownership until frame arbitration**
   - Prevented the first iterated seat from mutating a coin pull before another seat's same-frame physical contact was considered.

3. **[Rule 1 - Bug] Settled all terminal players before lifecycle callbacks**
   - Simultaneous terminal events now expose completed participation and statistics to every callback.

## Known Stubs

None.

## Self-Check: PASSED

All listed source/test files and commits exist. Phase-wide requirements remain pending Plans 02-05, 02-06, and phase verification; this summary does not mark ARCH-03 complete on its own.
