---
phase: 01-composable-solo-baseline
plan: 02
subsystem: game-engine
tags: [typescript, immutable-rules, deterministic-simulation, playwright, solo-parity]
requires:
  - phase: 01-01
    provides: immutable a310a81 differential solo baseline and archive loader
provides:
  - validated, deeply immutable Arcade and Stroll mode definitions
  - rule-driven Game, renderer, and development-run reconstruction seams
  - exact archived/default renderer and simulation parity evidence
affects: [02-shared-local-session, 03-survive-together-consumables, 04-relay, 05-race]
tech-stack:
  added: []
  patterns: [branded immutable rule composition, per-run resolved rules, same-browser archived pixel parity]
key-files:
  created: [src/mode-rules.ts, tests/mode-rules.test.mjs]
  modified: [src/game.ts, src/render.ts, src/devtools-state.ts, tests/render.test.mjs, tests/devtools.test.mjs]
key-decisions:
  - "Game accepts only composer-branded immutable definitions through a trailing options object."
  - "Wave teleport distance and Stroll trailing cutoff remain separate policies (6 and 7 respectively)."
  - "Default renderer comparisons use independent archived/current modules in the same muted Chromium browser."
patterns-established:
  - "Resolve a validated definition after seed decoding and expose it read-only from Game."
  - "Read configurable presentation and movement policy through game.rules rather than a definition ID branch."
requirements-completed: [ARCH-01, ARCH-04, SOLO-01]
coverage:
  - id: D1
    description: Immutable validated solo definitions drive real Game simulation while legacy Arcade/Stroll identities stay compatible.
    requirement: ARCH-01
    verification:
      - kind: unit
        ref: tests/mode-rules.test.mjs
        status: pass
      - kind: integration
        ref: pnpm test:solo-parity
        status: pass
    human_judgment: false
  - id: D2
    description: Renderer uses active rule timing and pursuit visibility while default Arcade/Stroll pixels match the archived baseline.
    requirement: ARCH-04
    verification:
      - kind: automated_ui
        ref: tests/render.test.mjs
        status: pass
    human_judgment: false
  - id: D3
    description: Development jumps preserve a custom active definition and replay loading resolves the decoded default definition.
    requirement: SOLO-01
    verification:
      - kind: unit
        ref: tests/devtools.test.mjs
        status: pass
    human_judgment: false
duration: 1h 5m
completed: 2026-10-14
status: complete
---

# Phase 01 Plan 02: Composable Solo Baseline Summary

**Validated immutable solo rules now drive Game timing, health, pursuit, rendering, and development reconstruction while released Arcade/Stroll behavior remains exact.**

## Performance

- **Duration:** 1h 5m
- **Completed:** 2026-10-14
- **Tasks:** 3/3
- **Files modified:** 8

## Accomplishments

- Added bounded, deep-frozen, composer-branded rule definitions with exact Arcade and Stroll presets, lifecycle hooks, and retained engine invariants.
- Routed Game simulation and renderer movement/pursuit presentation through the active definition without changing seed or progress identities.
- Preserved active definitions, characters, catalogs, and rule-derived wave placement through both development jump construction paths.

## Task Commits

1. **Task 1: Compose and execute core solo rules through Game** — `225ecdf`
2. **Task 2: Make rendering consume active movement and pursuit rules** — `64d2dc9`
3. **Task 3: Preserve active rules through development-run reconstruction** — `67eb09b`

## Files Created/Modified

- `src/mode-rules.ts` — immutable composition API and released presets.
- `src/game.ts` — compatible trailing options API and active rule consumption.
- `src/render.ts` — active hop duration and pursuit-visibility rendering.
- `src/devtools-state.ts` — definition-preserving reconstruction.
- `tests/mode-rules.test.mjs`, `tests/render.test.mjs`, `tests/devtools.test.mjs` — composition, exact pixel, and reconstruction evidence.

## Decisions Made

- Definitions must be composed in-process and branded, preventing shallow-frozen forged objects from becoming engine policy.
- `waveTrail` remains the six-row baseline teleport/wave-floor distance; Stroll's seven-row `trailingLimit` preserves its released lethal cutoff.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Compatibility] Corrected a parity fixture that mutated mode after construction.**
- **Found during:** Task 1
- **Issue:** Once-resolved rule definitions exposed that the fixture paired an Arcade definition with a later Stroll identity mutation.
- **Fix:** Constructed the Stroll scenario as Stroll and added six/seven/eight-row boundary coverage.
- **Files modified:** `tests/solo-parity.test.mjs`
- **Verification:** `pnpm test:solo-parity` (21 passing tests)
- **Committed in:** `225ecdf`

**Total deviations:** 1 auto-fixed compatibility correction.

## Verification

- `node --test tests/mode-rules.test.mjs tests/render.test.mjs tests/devtools.test.mjs` — 29 passed.
- `pnpm test:solo-parity` — 21 passed against pinned `a310a81`.
- `pnpm type-check`, `pnpm build`, `pnpm test:guidance`, and `pnpm test:conformance` — passed; conformance reported 5 passed, 0 failed, and 5 evidence skips (unresolved manifest checks, no emitted wire envelopes, and unmeasured teardown). These skips do not prove the skipped behavior.
- `git diff --exit-code -- pnpm-lock.yaml` — passed.

## Known Stubs

None.

## Self-Check: PASSED

- Summary file and all three task commits (`225ecdf`, `64d2dc9`, `67eb09b`) exist in the repository.

## User Setup Required

None.

## Next Phase Readiness

Future mode/session work can compose rules through the validated boundary. Economy and pursuer group settings are intentionally only policy data until their dedicated extraction plan consumes them.

---
*Phase: 01-composable-solo-baseline*
*Completed: 2026-10-14*
