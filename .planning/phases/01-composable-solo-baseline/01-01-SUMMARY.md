---
phase: 01-composable-solo-baseline
plan: 01
subsystem: testing
tags: [solo-parity, differential-testing, git-archive, gameplay]
requires: []
provides: [immutable-solo-parity-gate]
affects: [gameplay-refactors, multiplayer-extraction]
tech-stack:
  added: []
  patterns: [pinned-git-archive-baseline, independent-esm-engine-loads, per-step-semantic-traces]
key-files:
  created: [tests/solo-baseline.mjs, tests/solo-parity-snapshot.mjs, tests/solo-parity.test.mjs, tests/solo-parity-economy.test.mjs, tests/solo-parity-actors.test.mjs]
  modified: [package.json]
key-decisions:
  - "Extract only src/ from the exact a310a81 Git object for parity; missing history fails closed."
  - "Snapshot private future-affecting state in tests rather than adding product hooks."
requirements-completed: [SOLO-01, SOLO-02, TEST-01]
coverage:
  - id: D1
    description: "Immutable independently loaded baseline/current engines compare semantic state and callbacks after every operation and fixed step."
    requirement: SOLO-01
    verification:
      - kind: integration
        ref: "pnpm test:solo-parity"
        status: pass
    human_judgment: false
  - id: D2
    description: "Pinned provenance, one-sided sensitivity, private future state, and the solo scenario matrix fail closed."
    requirement: TEST-01
    verification:
      - kind: integration
        ref: "pnpm test:solo-parity"
        status: pass
    human_judgment: false
metrics:
  duration: 38min
  completed: 2026-10-14
status: complete
---

# Phase 01 Plan 01: Immutable Solo Parity Gate Summary

**Pinned a310a81 archive differential harness that compares independently compiled solo engines after every command and 1/120-second step.**

## Performance

- **Duration:** 38 min
- **Started:** 2026-10-14T12:32:09-07:00
- **Completed:** 2026-10-14T13:09:51-07:00
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments

- Verifies and extracts only `src/` from immutable commit `a310a81ed6c76df4b265c9012c23b8c83f4802e5`, with a clear shallow-history remedy when absent.
- Compiles pinned and current engines into separate temporary ESM roots, captures ordered production callbacks, and emits scenario/command/step/path mismatch diagnostics.
- Covers the complete 1,176-case schema/home/mode/gentle/uint32/traveler matrix plus paired market/pack/capacity scenarios, live actor rebase/freeze/release, 50/100/150/400 progression, 160/320/480 mob pacing and phases, denominations/gravity, replay round trips, retained pulls, and terminal ordering.
- Keeps `test:solo-parity` limited to the three archived-source differential files; its final run reports 20 passing tests, zero failures/cancellations/skips, and exit 0 in 55.2 seconds.

## Task Commits

1. **Task 1: Prove one pinned Arcade path end to end** - `00b4184` (test RED), `2d428f6` (feat GREEN)
2. **Task 2: Cover seeded movement, hazards, health, and timing** - `831f86c` (test)
3. **Task 3: Cover economy, actors, mobs, retention, and terminal ordering** - `1fada37` (test), `fd7178c` (test)

## Files Created/Modified

- `tests/solo-baseline.mjs` - Full-SHA provenance verification, archive extraction, and automatic cleanup.
- `tests/solo-parity-snapshot.mjs` - Test-only semantic adapters, callback capture, private-state inspection, and diagnostic comparison.
- `tests/solo-parity.test.mjs` - Differential command tapes and explicitly asserted real production scenarios.
- `tests/solo-parity-economy.test.mjs` - Differential market, pack, capacity, offer, and transaction-timing scenarios.
- `tests/solo-parity-actors.test.mjs` - Differential actor rebase/progression and MobDirector lifecycle scenarios.
- `package.json` - `test:solo-parity` command.

## Decisions Made

- Historical source is executed only from a temporary Git archive; the harness never falls back to the current tree.
- Retained pull lanes, Game collision/power state, RunInventory RNG/economy state, and MobDirector RNG/spawn state remain observable exclusively through test adapters.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected Game-level call routing and one-sided callback sensitivity.**
- **Found during:** Task 3
- **Issue:** Game calls were routed through a nonexistent `game.game` member, and sensitivity appended a fabricated callback record.
- **Fix:** Route Game and RunInventory calls to their actual targets; invoke the current engine's real recorder callback before normal capture.
- **Files modified:** `tests/solo-parity-snapshot.mjs`
- **Verification:** Provenance/sensitivity tests pass with scenario, command, step, and callback-path diagnostics.
- **Committed in:** `1fada37`

**2. [Rule 2 - Missing Critical] Captured pre-fixture MobDirector RNG and fully retained pulled lanes.**
- **Found during:** Task 2 review
- **Issue:** A fixture could advance MobDirector before RNG wrapping, and pruned pulled lanes lost future-affecting coin state in the adapter.
- **Fix:** Install the RNG wrapper immediately after Game construction and serialize complete retained lane/coin/actor state.
- **Files modified:** `tests/solo-parity-snapshot.mjs`, `tests/solo-parity.test.mjs`
- **Verification:** Retained-pull pruning arena and aggregate parity suite pass.
- **Committed in:** `831f86c`

**3. [Rule 2 - Missing Critical] Added explicit state-reach assertions for named production hazards and timers.**
- **Found during:** Task 3 review
- **Issue:** Initial focused cases did not prove every required transition was actually reached.
- **Fix:** Added both-direction vehicle face tests, fatal hazard fixtures, latch evidence, pause/recovery, regeneration, shield, landing-grace, and cooldown-boundary assertions.
- **Files modified:** `tests/solo-parity.test.mjs`
- **Verification:** Focused suites and `pnpm test:solo-parity` pass without skips.
- **Committed in:** `1fada37`

**4. [Rule 2 - Missing Critical] Completed the paired economy, actor, pickup, replay, and mob slices.**
- **Found during:** Task 3 review
- **Issue:** The initial terminal/progression fixture proved retained rows but did not reach the required market, pack, actor-speed, species-phase, denomination, or schema round-trip transitions through the paired runner.
- **Fix:** Added independently resolved catalogs and actor modules, exact market/alive snapshots, and the two bounded differential suites. Added main-suite denomination/gravity/safe-river and extreme schema replay arenas.
- **Files modified:** `tests/solo-parity-snapshot.mjs`, `tests/solo-parity.test.mjs`, `tests/solo-parity-economy.test.mjs`, `tests/solo-parity-actors.test.mjs`, `package.json`
- **Verification:** `pnpm test:solo-parity` passes 20 tests with zero skips; `pnpm type-check` passes.
- **Committed in:** `fd7178c`

**Total deviations:** 4 auto-fixed (1 Rule 1, 3 Rule 2).
**Impact on plan:** All changes strengthen the requested test-only gate; no product source or dependency changed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The immutable per-step parity command is ready to gate all source extraction work. It requires the pinned commit to remain reachable in Git history; shallow checkouts receive an actionable failure instead of a false current-vs-current comparison.

## Self-Check: PASSED

- All six planned artifacts exist.
- Task commits `00b4184`, `2d428f6`, `831f86c`, `1fada37`, and `fd7178c` exist in Git history.
- No product source, package lockfile, or known test stub was added.
