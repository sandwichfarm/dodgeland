---
phase: 03-survive-together-consumables
plan: "03"
subsystem: cooperative consumables and deterministic generation
tags: [typescript, immutable-plans, deterministic-rng, seeded-drops]
requires:
  - phase: 03-01
    provides: stable session owner/generation conventions
  - phase: 03-02
    provides: synchronous plan-then-commit recovery seam
provides:
  - Separate Revival and Flare catalog with immutable credit/debit plans
  - Versioned isolated keyed item-drop sampler and stable pickup identities
  - Exact bucket, replay-order, and released-RNG isolation evidence
affects: [03-04-world-pickups, 03-05-economy, 03-07-owner-ui]
tech-stack:
  added: []
  patterns: [capability-gated snapshots, owner-and-generation-bound plans, stateless uint32 keyed sampling]
key-files:
  created: [src/consumables.ts, src/consumable-drops.ts, tests/consumables.test.mjs, tests/consumable-drops.test.mjs]
  modified: []
key-decisions:
  - "Catalog planners validate snapshots only; the shipped recovery controller owns same-tick placement revalidation and mutation."
  - "Drop anchors use uint32 course seed, signed int32 row, and uint32 slot so retained negative warmup rows remain canonical."
  - "Item-local rejection sampling never advances terrain, denomination, market, mob, or audio streams."
patterns-established:
  - "New item transactions return frozen complete plans or frozen typed rejections without mutating caller snapshots."
  - "Versioned item streams are keyed from stable anchor data and tested against released stream snapshots."
requirements-completed: []
coverage:
  - id: catalog
    description: "Separate Revival and Flare definitions with capability, capacity, price, owner, generation, and target validation."
    verification:
      - kind: unit
        ref: "pnpm test:consumables"
        status: pass
    human_judgment: false
  - id: sampler
    description: "Exact item-drop-schema-1 classification, golden pickup identities, local rejection, and isolated released RNG streams."
    verification:
      - kind: integration
        ref: "tests/consumable-drops.test.mjs#item calls never perturb real terrain, denomination, market, or mob snapshots and next outputs"
        status: pass
      - kind: unit
        ref: "pnpm test:seeds && pnpm test:market && pnpm test:mobs && pnpm test:solo-parity"
        status: pass
    human_judgment: false
metrics:
  duration: 20m
  completed: 2026-10-15
status: complete
---

# Phase 03 Plan 03: Consumable Catalog and Isolated Drop Sampler Summary

**Revival and Flare now use frozen capability-aware inventory plans, while a versioned keyed sampler produces exact replay-safe drops without perturbing released course streams.**

## Performance

- **Duration:** 20m
- **Started:** 2026-10-15T08:02:00Z
- **Completed:** 2026-10-15T08:22:37Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Added separate, immutable Revival (24 coins) and Flare (36 coins) definitions. Each independently holds at most one charge and requires the Survive Together capability.
- Added owner-, inventory-generation-, capacity-, and target-bound credit/debit plans with typed immutable rejections. A Flare accepts a two-seat owner-plus-dead-teammate case and binds any further living regroup targets.
- Added `item-drop-schema-1`: strict 2,500-bucket classification, canonical stable pickup IDs, uint32 local rejection sampling, golden vectors, and replay-order isolation across real terrain, denominations, markets, and mobs.

## Task Commits

1. **Task 1: Classify one keyed anchor into a validated held consumable**
   - `94adfac` — failing catalog and sampler contract coverage
   - `999f3a5` — consumable catalog, immutable plans, and keyed sampler
   - `bae4b1f` — pure sampler-to-catalog-to-credit tracer
2. **Task 2: Prove sampler call-order and released-schema isolation**
   - `5dd46dd` — initial released-stream isolation matrix
   - `0003f84` — live interleave, next-RNG, and item-schema isolation coverage

## Files Created/Modified

- `src/consumables.ts` — standalone consumable catalog and pure immutable inventory planners.
- `src/consumable-drops.ts` — schema-keyed, unbiased item sampler and stable anchor identity.
- `tests/consumables.test.mjs` — catalog, capacity, eligibility, ownership, target, and immutable-plan coverage.
- `tests/consumable-drops.test.mjs` — bucket/golden/rejection, ordering, pruning, and released-stream isolation coverage.
- `tests/consumable-boundaries.test.mjs` — focused tracer and sparse/Flare boundary coverage.

## Decisions Made

- Mode eligibility is capability-based (`survive-together`), not a concrete session/player import or a market/card union.
- A canonical signed row preserves valid negative retained rows; only out-of-range or fractional anchors reject.
- Credit/debit return descriptions only. Plan 03-04 commits them only after recovery placement has been revalidated in the same tick.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Contract] Preserved the valid two-seat Flare case**
- **Found during:** Task 1
- **Issue:** An initial test incorrectly required a second living regroup target beyond the living owner.
- **Fix:** Flare now requires at least one dead teammate; the owner remains the living regroup anchor and additional living teammates are optional target bindings.
- **Files modified:** `tests/consumables.test.mjs`, `src/consumables.ts`
- **Verification:** `pnpm test:consumables`
- **Committed in:** `94adfac`, `999f3a5`

**2. [Rule 1 - Contract] Accepted canonical negative retained-row anchors**
- **Found during:** Task 1
- **Issue:** Initial uint32 row validation would reject released warmup/retention rows generated below zero.
- **Fix:** Row identity is bounded signed int32 while the course seed and slot remain uint32.
- **Files modified:** `tests/consumable-drops.test.mjs`, `src/consumable-drops.ts`
- **Verification:** `pnpm test:consumables`, `pnpm test:seeds`
- **Committed in:** `94adfac`, `999f3a5`

**3. [Rule 1 - Test evidence] Strengthened live interleave coverage**
- **Found during:** Task 2
- **Issue:** The first fixture exhausted its sample schedule too early to prove every observed market and mob stage was interleaved.
- **Fix:** Each stage now receives the complete forward/reverse/sparse/duplicate schedule and captures real next inventory and mob RNG outputs.
- **Files modified:** `tests/consumable-drops.test.mjs`
- **Verification:** `pnpm test:consumables`, `pnpm test:market`, `pnpm test:mobs`, `pnpm test:solo-parity`
- **Committed in:** `0003f84`

**Total deviations:** 3 auto-fixed (3 Rule 1 contract/evidence corrections).

## Verification

- `pnpm test:consumables` — 18/18 strict catalog, tracer, and isolation tests passed.
- `pnpm test:seeds` — 12/12 passed.
- `pnpm test:market` — 62/62 passed.
- `pnpm test:mobs` — 18/18 passed.
- `pnpm test:solo-parity` — 21/21 passed against immutable baseline `a310a81ed6c76df4b265c9012c23b8c83f4802e5`.
- `pnpm type-check`, `pnpm build`, and `pnpm test:guidance` passed.
- `pnpm test:conformance` reported 5 passed, 0 failed, and 5 unmeasured skips (manifest/wire/lifecycle evidence was not supplied by this catalog-only plan).
- `git diff --exit-code -- pnpm-lock.yaml` passed; no dependency or lockfile changes were made.

## Known Stubs

None.

## Issues Encountered

The original RED runner used a pipeline that obscured its nonzero test command status. The durable log retains the two expected missing-module failures; later commands redirect the complete command output and preserve its exit result.

## Next Phase Readiness

Plan 03-04 can attach this catalog to the shipped Survive handler: it should sample stable world anchors, choose deterministic contenders, invoke the frozen planners, then commit only after same-tick placement/lifecycle revalidation. This plan does not mark Phase 3 or its requirements complete; world pickup, economy, and UI integration remain pending.

Root acceptance independently reran type-check, production build, guidance, conformance, and immutable-lockfile check to exit0 (handle72960, `/tmp/down-to-duck-03-03-root-platform.log`), because the executor platform log was empty. Conformance measured5pass/0fail with5unmeasured skips.

## Self-Check: PASSED

- Confirmed `src/consumables.ts` and `src/consumable-drops.ts` exist.
- Confirmed commits `94adfac`, `999f3a5`, `5dd46dd`, and `0003f84` exist.
