---
phase: 03-survive-together-consumables
plan: 08
subsystem: results
gap_closure: true
requirements-completed: [COOP-05]
key-files:
  modified: [src/session.ts, src/survive-results.ts, tests/survive-recovery-terminal.test.mjs]
---

# Phase03 Plan08 — complete ghost-duration contributions

Closed the independent verifier's D-16 accounting defect in source6017f9f. Departing players now finalize any open disconnect interval before their statistics are archived. Team results project a still-disconnected player's interval through the authoritative settlement simulation time. Previously reclaimed intervals remain accumulated exactly once. Result creation remains a frozen projection and changes no gameplay clock or player state.

Eight new production-path cases cover Arcade/Flow × departure/settlement × with/without an earlier reclaim. They also exercise a20-second pause, later team time after departure, actual water death and offer expiry, repeated departure rejection, and immutable results after further ticks/live-stat mutation.

## Evidence

- RED: all8 new cases failed on missing ghostSeconds before the fix; `/tmp/down-to-duck-ghost-duration-red.log`, exit1.
- Focused: terminal recovery, primary departure, session lifecycle and result UI25/25; type-check passed; `/tmp/down-to-duck-ghost-duration-green.log`, session92175 exit0.
- Complete canonical `pnpm test:phase3`: session73933 exit0, `/tmp/down-to-duck-ghost-duration-final-gate.log`, source6017f9f/tracking e612d49. Entire unchanged Phase02 prefix, solo parity21, retained solo regressions271, all inherited model/runtime/layout/smoke gates, all Phase03 groups, and final browser34/34 passed. Recovery group is now44/44 (previous36 plus8). Guidance/type/build and immutable-oracle lockfile comparison passed.
- Both conformance reports remain5passed/0failed/5unmeasured: manifest3, wire1, lifecycle1. No new hardware claim; physical controllers remain unmeasured.

No dependencies, protocol, UI layout or solo engine changes. Independent re-verification of the recorded gap remains the phase-completion gate.
