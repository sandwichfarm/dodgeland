---
phase: 01-composable-solo-baseline
plan: 03
subsystem: game-engine
tags: [typescript, immutable-rules, economy, mobs, soundscape, deterministic-simulation]
requires:
  - phase: 01-02
    provides: composer-branded immutable definitions resolved once per Game
provides:
  - per-run economy, collection, and inventory policy consumers
  - bounded active-rule pursuer pacing and unlocks
  - shared active-world-time clocks for audio and crossing lamps
affects: [02-shared-local-session, 03-survive-together-consumables, 04-relay, 05-race]
tech-stack:
  added: []
  patterns: [per-instance policy injection, rule-aware compatibility wrappers, production-backed custom-policy tests]
key-files:
  created: []
  modified: [src/mode-rules.ts, src/game.ts, src/market/run.ts, src/mobs.ts, src/soundscape.ts, src/render.ts, tests/mode-rules.test.mjs, tests/soundscape.test.mjs, tests/render.test.mjs]
key-decisions:
  - "RunInventory receives a per-instance immutable economy policy while its public defaults remain released values."
  - "Pursuer pacing preserves its published helpers and derives live values from game.rules.pursuers."
  - "crossingSignal retains its Mode-compatible wrapper while Game consumers share worldTimeScale directly."
patterns-established:
  - "Custom rule tests drive transactions, spawned mobs, sound events, and actual canvas lamp rendering instead of inspecting source or private state."
requirements-completed: [ARCH-01, SOLO-01, SOLO-02]
coverage:
  - id: D1
    description: Economy cadence, invitation lifetime, hard hand cap, and baseline coin pull are per-run rule consumers.
    requirement: ARCH-01
    verification:
      - kind: integration
        ref: tests/mode-rules.test.mjs#custom economy rules drive live invitations, capacity, and baseline coin capture
        status: pass
      - kind: integration
        ref: tests/market-engine.test.mjs
        status: pass
    human_judgment: false
  - id: D2
    description: Pursuer spawning consumes configured unlocks, timing, cadence, and population limits without changing released default behavior.
    requirement: SOLO-01
    verification:
      - kind: integration
        ref: tests/mode-rules.test.mjs#custom pursuer rules drive real unlocks, cadence, and population bounds
        status: pass
      - kind: integration
        ref: tests/mobs.test.mjs
        status: pass
    human_judgment: false
  - id: D3
    description: Audio bells, music, warning cues, and rendered lamps share the active world-time scale.
    requirement: SOLO-02
    verification:
      - kind: automated_ui
        ref: tests/render.test.mjs#rendered crossing lamps and actual bell events share a custom active-world clock
        status: pass
      - kind: integration
        ref: tests/soundscape.test.mjs#custom world speed drives the real music and bell clocks independently of stored solo identity
        status: pass
    human_judgment: false
duration: 1h 10m
completed: 2026-10-14
status: complete
---

# Phase 01 Plan 03: Rule-Driven Economy, Pursuers, and Timing Summary

**Immutable active rules now control run economy, pickup reach, mob pacing, and scene clocks while archived Arcade and Stroll behavior remains byte-for-byte compatible.**

## Performance

- **Duration:** 1h 10m
- **Completed:** 2026-10-14
- **Tasks:** 2/2
- **Files modified:** 10

## Accomplishments

- Routed market cadence and lifetime, baseline coin gravity, and card capacity bounds from a validated per-run economy policy into `RunInventory`; its direct construction and helper defaults remain unchanged.
- Routed live mob availability, spawn grace, progress gating, cadence, and cap through `game.rules.pursuers`, preserving all default deterministic values and compatibility exports.
- Made music, wave warnings, bells, and rail lamps use the active simulation scale; legacy `crossingSignal(lane, time, mode)` remains a released-mode wrapper.
- Added production-backed custom-rule tests that purchase and sell cards, reach a non-default hard hand cap, create configured pursuer arrivals, and inspect browser-rendered lamps plus real audio sink events.

## Task Commits

1. **Task 1: Drive run economy and collection from active rules** — `1eadd79`
2. **Task 1 compatibility fixture correction** — `f52475f`
3. **Task 2: Drive pursuers and real-time consumers from active rules** — `e657955`
4. **Task 2 strengthened behavioral proof** — `1f462ff` (also contains concurrent planning documentation)

## Files Created/Modified

- `src/mode-rules.ts` — validates and freezes economy and pursuer pacing fields with bounded cross-field constraints.
- `src/game.ts`, `src/market/run.ts` — inject and consume per-run economy policy without changing public defaults.
- `src/mobs.ts` — consumes active pursuer policy while retaining exported baseline functions and constants.
- `src/soundscape.ts`, `src/render.ts` — share the configured active-time signal calculation.
- `tests/mode-rules.test.mjs` — verifies real market, pickup, and mob behavior under non-default definitions.
- `tests/soundscape.test.mjs`, `tests/render.test.mjs` — verify actual sink events and canvas lamps for custom world-time scales.

## Decisions Made

- `inventoryLimit` is distinct from base `inventoryCapacity`, so slot cards can increase capacity only up to a mode-defined hard bound.
- The legacy wave trail is still six rows and Stroll's trailing cutoff is still seven rows; pursuer extraction does not alter either pursuit policy.
- Mob species retain their existing physical tuning; only encounter policy is authorable through rules.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Compatibility] Constructed the trail shield fixture with the Stroll definition.**
- **Found during:** Task 1 verification.
- **Issue:** The old fixture changed `game.mode` after Arcade construction, while the composed definition is intentionally resolved once.
- **Fix:** Created the case as Stroll so serialized identity and active policy agree.
- **Files modified:** `tests/market-engine.test.mjs`
- **Verification:** Focused economy/market suites passed.
- **Committed in:** `f52475f`

**2. [Rule 1 - Build] Removed an unused pursuer filter parameter.**
- **Found during:** Task 2 aggregate type check.
- **Issue:** TypeScript's unused-local check rejected the initial rule-aware filter.
- **Fix:** Marked the intentionally unused filter value with an underscore.
- **Files modified:** `src/mobs.ts`
- **Verification:** `pnpm type-check` passed.
- **Committed in:** `e657955`

**Total deviations:** 2 auto-fixed correctness and compatibility adjustments.

## Verification

- `node --test tests/mode-rules.test.mjs tests/market-engine.test.mjs tests/market-capacity.test.mjs tests/magnet.test.mjs tests/log-coin-gravity.test.mjs tests/mobs.test.mjs tests/soundscape.test.mjs tests/render.test.mjs` — 110 passed, 0 failed, 0 skipped.
- `pnpm test:solo-parity` — 21 passed, 0 failed against pinned immutable `a310a81ed6c76df4b265c9012c23b8c83f4802e5`.
- `pnpm type-check` — passed.
- `git diff --exit-code -- pnpm-lock.yaml` — passed; no dependency or lockfile change.

## Known Stubs

None.

## Self-Check: PASSED

- The summary and task commits `1eadd79`, `f52475f`, `e657955`, and `1f462ff` exist in repository history.

## User Setup Required

None.

## Next Phase Readiness

The active definition now owns every Phase-1 economy and encounter policy consumer. The next plan can finish the fixed-step input and presentation routing before Phase 1 receives independent review.

---
*Phase: 01-composable-solo-baseline*
*Completed: 2026-10-14*
