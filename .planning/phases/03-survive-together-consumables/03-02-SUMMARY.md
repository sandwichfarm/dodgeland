---
phase: 03-survive-together-consumables
plan: 02
subsystem: multiplayer-recovery
tags: [local-multiplayer, recovery, deterministic-simulation, results, tdd]
requires:
  - phase: 03-01
    provides: committed local-session lifecycle, shared-world, and admission APIs
provides:
  - immutable personal, Revival, and Flare validation and commit plans
  - bounded recovery offers, nonfarmable participant provenance, and protected returns
  - immutable unranked Survive Together team result contributions
affects: [03-03-consumables, local-multiplayer, results]
tech-stack:
  added: []
  patterns: [mode-owned recovery controller, immutable plan-before-debit transaction, alias-shared provenance ledger]
key-files:
  created: [src/recovery.ts, src/survive-results.ts]
  modified: [src/session.ts, src/game.ts, src/survive-together.ts, src/market/run.ts, tests/survive-together.test.mjs]
key-decisions:
  - "Recovery protection is evaluated through the active session player before health or terminal hazard mutation, leaving solo operation unchanged."
  - "Personal recharge stores separate completed-tile and spatial high-water values so forced returns and aliases cannot create credit."
  - "All recovery intents use the same frozen plan and same-tick revalidation before any optional debit."
patterns-established:
  - "Mode definitions own recovery policy; LocalSession exposes lifecycle, fixed-time, and safe-cell primitives without mode-ID branches."
  - "Terminal results copy and freeze participant and archived ledgers exactly once."
requirements-completed: [COOP-03, COOP-05]
coverage:
  - id: D1
    description: Bounded, protected personal recovery with provenance-safe 250-tile recharge
    requirement: COOP-03
    verification:
      - kind: integration
        ref: pnpm test:survive-recovery
        status: pass
      - kind: integration
        ref: pnpm test:solo-parity
        status: pass
    human_judgment: false
  - id: D2
    description: Atomic Revival and Flare planner semantics with deterministic safe placements and debit ordering
    verification:
      - kind: integration
        ref: tests/survive-together.test.mjs#Flare and unsafe-plan tests
        status: pass
      - kind: integration
        ref: tests/recovery-plan-boundaries.test.mjs
        status: pass
    human_judgment: false
  - id: D3
    description: Frozen unranked team settlement with contribution snapshots
    requirement: COOP-05
    verification:
      - kind: integration
        ref: tests/survive-recovery-terminal.test.mjs#archived team results
        status: pass
      - kind: integration
        ref: tests/survive-recovery-terminal.test.mjs#archived team results
        status: pass
    human_judgment: false
duration: 56m 30s
completed: 2026-10-15
status: complete
---

# Phase 03 Plan 02: Deterministic Recovery and Team Results Summary

**Immutable personal and teammate recovery transactions now protect real session players, preserve nonfarmable participant provenance, and settle one frozen unranked team result.**

## Performance

- **Duration:** 56m 30s
- **Started:** 2026-10-15T06:56:35Z
- **Completed:** 2026-10-15T07:53:05Z
- **Tasks:** 2/2
- **Files modified:** 7 implementation/test files

## Accomplishments

- Added immutable personal, Revival, and Flare plans that validate stable seats, death generations, safe distinct cells, fixed-time offers, and optional debit order before mutation.
- Wired completed-hop provenance through real sessions: a spent personal save recharges only after 250 newly landed forward tiles, across aliases, recovery returns, and group relocation.
- Suppressed vehicle health loss and terminal water, wave, train, and mob paths during active recovery protection without changing solo operation.
- Added immutable all-dead team settlement with archived contributions, counters, ghost time, and no competitive ranking.

## Task Commits

1. **Task 1: Recover one actually dead player through a bounded personal offer** — `9652a1a` (RED test), `55ba925` (implementation)
2. **Task 2: Plan teammate recovery, settle all-dead teams, and snapshot results** — `55ba925` (implementation coupled to the shared transaction boundary)

## Files Created/Modified

- `src/recovery.ts` — frozen recovery planner and validate/debit/apply commit boundary.
- `src/session.ts` — session recovery context, alias provenance ledger, completed-hop accounting, safe cells, terminal timing, and result dispatch.
- `src/game.ts` — session-only protection guards before damage/death and shared retention for active in-flight seats.
- `src/survive-together.ts` — mode controller for offers, recovery application, safe history, and all-dead settlement.
- `src/survive-results.ts` — immutable unranked team contribution snapshot.
- `src/market/run.ts` — resume an empty inventory after a recovery without restoring lost assets.
- `tests/survive-together.test.mjs` — production recovery, protection, Flare, relocation-baseline, and atomicity tests.

## Decisions Made

- Stored completed-tile progress separately from spatial high-water so a Flare can establish a forward movement baseline without crediting skipped distance.
- Kept recovery policy in the Survive controller and exposed generic session lifecycle/time/safe-cell hooks, avoiding core mode-name branches.
- Preserved exact live owner coordinates for Flare anchors, then placed other participants in stable-seat order.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guarded mutation before protected hazard damage**
- **Found during:** Task 1
- **Issue:** Guarding only terminal `end()` could leave a protected player alive after vehicle damage reduced health to zero.
- **Fix:** Added session-scoped guards before vehicle health mutation and wave terminal state, including primary-player operation context.
- **Files modified:** `src/game.ts`
- **Verification:** `pnpm test:survive-recovery`, `pnpm test:character-powers`, `pnpm test:solo-parity`
- **Committed in:** `55ba925`

**2. [Rule 2 - Missing critical functionality] Retained in-flight active-seat terrain rows**
- **Found during:** Task 1
- **Issue:** Shared row pruning could remove an active player's departure row while they remained airborne behind the frontier.
- **Fix:** Added one shared active floor spanning current, origin, and destination positions before course retention.
- **Files modified:** `src/session.ts`, `src/game.ts`
- **Verification:** `pnpm test:survive-recovery`
- **Committed in:** `55ba925`

**3. [Rule 2 - Missing critical functionality] Resumed cleared run inventory after valid recovery**
- **Found during:** Task 2
- **Issue:** `RunInventory.clear()` leaves a returned player unable to receive subsequent coin credit.
- **Fix:** Added `resumeAfterDeath()` that re-enables only the empty economy and never restores cleared assets.
- **Files modified:** `src/market/run.ts`, `src/survive-together.ts`
- **Verification:** `pnpm test:survive-recovery`
- **Committed in:** `55ba925`

**Total deviations:** 3 auto-fixed (1 Rule 1, 2 Rule 2).

## Validation

- Passed `pnpm test:survive-recovery` (`/tmp/down-to-duck-03-02-final-survive-recovery.log`).
- Passed `pnpm type-check` (`/tmp/down-to-duck-03-02-final-typecheck.log`).
- Passed `pnpm test:character-powers`, `pnpm test:death-spill`, and `pnpm test:solo-parity`.
- Passed `pnpm test:survive-tracer` including production build (`/tmp/down-to-duck-03-02-final-survive-tracer.log`).
- Passed `pnpm test:guidance` and `pnpm test:conformance`; lockfile remained unchanged.

## Known Stubs

None.

## Next Phase Readiness

Phase 04 can supply consumable catalog, ownership, and debit capabilities through `SessionRecoveryRequest.debit`; recovery target, placement, protection, and settlement contracts are complete. COOP-04 remains open until that owned item flow exists.

---
*Phase: 03-survive-together-consumables*
*Completed: 2026-10-15*
