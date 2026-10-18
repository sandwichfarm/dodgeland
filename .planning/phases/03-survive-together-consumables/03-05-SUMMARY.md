---
phase: 03-survive-together-consumables
plan: "05"
subsystem: cooperative-economy-and-world-effects
tags: [local-multiplayer, market, consumables, deterministic-simulation]
requires:
  - phase: 03-04
    provides: participant-bound consumable ledger and lifecycle ownership
  - phase: 03-02
    provides: session adoption and participant attribution
provides:
  - owner/version-attributed market adapter with atomic consumable purchases
  - exhaustive local/shared modifier policy with stable active-seat resolution
  - live shared row, pursuit, traffic, platform, and mob effect projection
affects: [03-06-ui, 03-07-integration]
tech-stack:
  added: []
  patterns: [versioned-owner-context, atomic-wallet-credit, descriptor-based-world-projection]
key-files:
  created: [src/co-op-market.ts, src/shared-world-effects.ts]
  modified: [src/market/run.ts, src/session.ts, src/survive-together.ts, src/game.ts, tests/survive-economy.test.mjs]
key-decisions:
  - "openCoOpMarket creates or selects a versioned owner context without opening the market; the read-only coOpMarketSnapshot is pure, so an alive owner may sell during a pending pack while pack actions still require an open window."
  - "River coin generation uses the selected shared value while payout reads the collecting owner's unchanged modifier."
  - "Shared effects are definition-owned session policy; Game consumes only the resolved values and does not branch on a Survive mode identity."
requirements-completed: [COOP-01, ITEM-01, ITEM-03]
coverage:
  - id: D1
    description: "Versioned owner-attributed market transactions preserve independent wallets, cards, packs, wearables, powers, and consumable charges."
    requirement: COOP-01
    verification:
      - kind: integration
        ref: "tests/survive-economy.test.mjs and tests/survive-economy-boundaries.test.mjs via strict-node-tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "Revival and Flare purchases use the existing 24/36 ledger and reject stale, replayed, ineligible, insufficient-funds, or cross-owner actions without partial debit."
    requirement: ITEM-01
    verification:
      - kind: integration
        ref: "tests/survive-economy-boundaries.test.mjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "All RunModifiers have an auditable scope and direction, and live shared rows, pursuit, traffic, platforms, mobs, damage, and river payouts preserve the selected/shared versus private split."
    requirement: ITEM-03
    verification:
      - kind: integration
        ref: "tests/survive-economy.test.mjs"
        status: pass
    human_judgment: false
duration: 20min
completed: 2026-10-15
status: complete
---

# Phase 03 Plan 05: Cooperative Economy and Shared Effects Summary

**Survive Together now provides versioned owner-attributed market transactions and one deterministic shared-course projection while retaining each seat's private inventory, damage, and payout semantics.**

## Accomplishments

- Added the backend `CoOpMarketAdapter`, installed only by the committed Survive definition, to validate live seat/device/participant ownership, owner and inventory generations, run/context revisions, lifecycle, market window, replay IDs, and eligible mode before it mutates an inventory. Plan 03-07 owns wiring co-op owner selection and actions into the main market UI.
- Added `RunInventory.spendCoins()` as the narrow wallet primitive. Revival (24) and Flare (36) credit the existing consumable ledger inside the same spend transaction; fractions remain intact on success and rejection.
- Kept sale legal for a living owner outside an open window, including a pending pack, while buy/equip and pack choice/skip retain their window-specific validation. Owner switches invalidate controller context without destroying the paid pack in its owner's inventory.
- Added the exhaustive `RunModifiers` descriptor table and active-seat resolver. One best contribution with lower-seat tie-breaking drives actual generation, lane motion, pursuit, and mobs; player-local cards, collision damage, and pickup payouts remain private.
- Added production-path coverage for a P2 Revival buy, every descriptor direction/tie/permutation, future generated terrain, real river collection with a private fractional payout, exact mob rebasing, real per-seat collision damage, lifecycle removal/reclaim, and no-state teardown.

## Task Commits

1. **Task 1: Buy one Revival through a real owner-attributed market transaction** — `b80b9a3` (RED tracer), `a3cd8e1` (adapter and atomic transaction)
2. **Task 2: Resolve card modifiers through an explicit non-stacking shared-world policy** — `15a974e` (resolver and live projection), `af428e0` and `7f4492f` (expanded production matrices)

## Validation

- `node tests/strict-node-tests.mjs tests/survive-economy.test.mjs tests/survive-economy-boundaries.test.mjs` passed **19/19** in `/tmp/down-to-duck-03-05-economy-river-damage-mob-rerun.log`.
- `pnpm test:market` passed **62/62** in `/tmp/down-to-duck-03-05-final-market.log`.
- Root's independent market/wearable boundary expansion passed **10/10** in `/tmp/down-to-duck-03-05-root-wallet-wearables.log` (`a217abe`).
- The earlier broad source gate passed solo parity **21/21**, mobs **18/18**, type-check, and build in `/tmp/down-to-duck-03-05-remaining-verification.log`; the immutable solo baseline remains `a310a81ed6c76df4b265c9012c23b8c83f4802e5`.
- The compact market-pack correction in `18a7169` passed the browser pack gate in `/tmp/down-to-duck-03-05-pack-preview-fix.log` and muted production visual proof in `/tmp/down-to-duck-03-05-pack-visual-proof-supported-first.log`; it supports the later UI work but does not close UI-03.
- Final platform checks passed: guidance **6/6**, conformance **5 passed, 0 failed, 5 unmeasured skips** in `/tmp/down-to-duck-03-05-guidance-conformance.log`. `pnpm-lock.yaml` is byte-identical to the immutable baseline.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Test fixture] Generated a normal future row horizon before the river-payout assertion.**
   The initial retained rows for the deterministic test seed did not contain a river. The test now calls the real row generator at the normal future frontier before selecting a platform-bound coin; no production behavior changed.

## Known Stubs

None.

## Next Phase Readiness

Plan 06 owns the intentionally deferred reconciliation of paused recovery/action predicates, paused shared-effect contributor retention, and tiny-frame focus behavior. Plan 07 owns co-op owner selection and action wiring in the main market UI. UI-03 remains pending full phase verification. This summary records Plan 05 only and does not mark the overall phase complete.

## Self-Check: PASSED

- Confirmed owned commits `b80b9a3`, `a3cd8e1`, `15a974e`, `af428e0`, and `7f4492f` exist.
- Confirmed `src/co-op-market.ts`, `src/shared-world-effects.ts`, and `tests/survive-economy.test.mjs` exist.
