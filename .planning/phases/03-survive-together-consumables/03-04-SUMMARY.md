---
phase: 03-survive-together-consumables
plan: "04"
subsystem: cooperative-consumable-world
tags: [deterministic-simulation, consumables, local-multiplayer, rendering]
requires:
  - phase: 03-01
    provides: session adoption and lifecycle ownership
  - phase: 03-02
    provides: recovery plan and commit boundary
  - phase: 03-03
    provides: consumable planners and keyed sampler
provides:
  - handler-installed deterministic pickup capability with immutable observations
  - participant-bound consumable charges and replay-safe atomic recovery actions
  - authoritative item and recovery-protection render projection
affects: [03-05-economy, 03-06-ui, 03-07-integration]
tech-stack:
  added: []
  patterns: [definition-owned-world-extension, keyed-pickup-ledger, participant-versioned-actions]
key-files:
  created: [tests/consumable-world.test.mjs]
  modified: [src/game.ts, src/session.ts, src/survive-together.ts, src/render.ts]
key-decisions:
  - "Game dispatches an optional definition-owned extension without retaining item state on ordinary solo instances."
  - "Consumable revisions are participant-bound and globally non-reused so delayed seat actions cannot affect a replacement player."
requirements-completed: []
coverage:
  - id: D1
    description: "Committed Survive installs deterministic pickups while solo instances retain their released shape and RNG behavior."
    requirement: ITEM-01
    verification:
      - kind: integration
        ref: "tests/consumable-world.test.mjs and pnpm test:solo-parity"
        status: pass
    human_judgment: false
  - id: D2
    description: "Pickup claims, owner charges, recovery use, actual-death clearing, and replay rejection use authoritative session state."
    requirement: ITEM-04
    verification:
      - kind: integration
        ref: "tests/consumable-world-boundaries.test.mjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Projected item silhouettes, literal labels, platform elevation, teardown disappearance, and protected-return halos derive from authoritative world/session observations."
    requirement: ITEM-05
    verification:
      - kind: integration
        ref: "tests/consumable-world-render.test.mjs (native-canvas Playwright, muted)"
        status: pass
    human_judgment: false
duration: 1h 24m
completed: 2026-10-15
status: complete
---

# Phase 03 Plan 04: Deterministic Consumable World Summary

**Survive Together now installs a handler-owned deterministic pickup ledger that credits participant-bound charges and commits Revival or Flare through the existing atomic recovery boundary.**

## Accomplishments

- Added a non-emitting generic `GameWorldExtension` seam. Ordinary Arcade and Flow retain their exact own-state shape until a committed session handler explicitly installs an extension.
- Sampled initial and later rows through `item-drop-schema-1`, retained active pickups by their actual position and the lagging live-seat retention floor, chose deterministic accessible land anchors, followed river actors on fractional coordinates, and resolved one swept-contact winner in stable order.
- Bound charges to participant identity with globally non-reused versions; stale, replayed, wrong-owner, and replacement-seat actions cannot debit or recover another player.
- Cleared the actual dead player's consumables before recovery, while preserving ghost and surviving-player ownership, and projected distinct Revival cross and Flare canister silhouettes, literal labels, elevated platform positions, and protected-return halos.

## Task Commits

1. **Task 1: Carry one deterministic pickup from row generation through a real player claim** — `3ff1bdc`
2. **Task 2: Commit owned Revival and Flare effects atomically and clear consumables on actual death** — `3ff1bdc` (shared transaction implementation)
3. **Expanded world, ownership, retention, and renderer matrices** — `581b7bb`, `9a2c74b`, `4e1461b`, `3ea61e7`, `a3874ad`, `4f3ef37`

## Validation

- Passed `pnpm test:consumable-world` (14 independent boundary cases plus 10 owned world cases) and `tests/consumable-world-render.test.mjs` (3 muted native-canvas browser cases across four frame sizes and three river variants).
- Passed `pnpm test:survive-recovery` (36), `pnpm test:solo-parity` (21/21 against immutable `a310a81ed6c76df4b265c9012c23b8c83f4802e5`), and `pnpm test:mobs` (18) in `/tmp/down-to-duck-03-04-final-combined.log`.
- Passed `pnpm type-check`, `pnpm build`, `pnpm test:guidance` (6), and `pnpm test:conformance` (5 passed, 0 failed, 5 unmeasured skips). The renderer proof is a compiled render-unit fixture, not a built-main UI workflow.
- Repeated focused final-source checks after the equivalent `HALF_WIDTH === 5` anchor-expression cleanup: type-check, combined world matrix, and renderer matrix passed in `/tmp/down-to-duck-03-04-final-halwidth-focused.log`. The duplicate broad rerun was intentionally stopped at redundant solo parity (exit 130), after world/render/recovery passed; the prior complete broad gate remains authoritative.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Correctness] Removed emitted solo extension state and strengthened action ownership.**
   The first extension field would have emitted an undefined own property on every `Game`; it is now a non-emitting declaration. Contact uses real swept segment-circle resolution, and action versions are participant-bound and globally non-reused.

2. **[Rule 1 - Correctness] Aligned item retention and land anchoring with live course semantics.**
   Pickup pruning now follows the same lagging `activeFloor` horizon as retained terrain, and land drops take the nearest deterministic unblocked column rather than becoming inaccessible at blocked center cells.

## Known Stubs

None.

## Next Phase Readiness

The item world exposes immutable pickup/charge/protection observations for the economy and UI plans. This plan leaves phase-wide requirement closure and final integration verification to later work.

## Self-Check: PASSED

- Confirmed production commits `3ff1bdc`, `581b7bb`, `9a2c74b`, `4e1461b`, and `3ea61e7` exist.
- Confirmed all owned production files and the world tracer exist.
