---
phase: 03-survive-together-consumables
plan: 06
subsystem: ui
tags: [local-multiplayer, recovery, accessibility, playwright, napplet]
requires:
  - phase: 03-02
    provides: authoritative session, terminal result, and recovery state
  - phase: 03-04
    provides: consumable ownership and atomic recovery outcomes
  - phase: 03-05
    provides: recovery economics and market presentation seams
provides:
  - Built local co-op lifecycle, recovery, result, and responsive UI flows
  - Owner-bound controller interaction and compact accessibility pages
affects: [03-07, local-multiplayer, market-ui]
tech-stack:
  added: []
  patterns: [authoritative-session UI projection, bounded compact pages, muted built-artifact browser proof]
key-files:
  created: [tests/survive-lifecycle-layout.mjs, tests/survive-hud-controller-runtime.mjs]
  modified: [src/main.ts, src/session-ui.css, src/session.ts, src/recovery.ts]
key-decisions:
  - "Paused living participants remain eligible session members without advancing protected time."
  - "Compact HUD exposes Status, Run, Recovery, and Items pages instead of hiding fields."
  - "Controller actions are attributed to the selected HUD owner before UI controls execute."
requirements-completed: [COOP-02, COOP-03, COOP-04, COOP-05, ITEM-02, UI-03]
coverage:
  - id: D1
    description: "Authoritative join, death, recovery, reclaim, departure, and replacement flows"
    requirement: COOP-02
    verification:
      - kind: automated_ui
        ref: "tests/survive-together-runtime.mjs; tests/survive-lifecycle-layout.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Paused Revival and Flare actions retain ownership, protection, and charges"
    requirement: ITEM-02
    verification:
      - kind: integration
        ref: "tests/survive-paused-recovery.test.mjs; tests/survive-recovery-outcomes-runtime.mjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Responsive results, recovery boards, compact HUD pages, and focus ownership"
    requirement: UI-03
    verification:
      - kind: automated_ui
        ref: "tests/survive-together-layout.mjs; tests/survive-recovery-board-layout.mjs; tests/survive-hud-controller-runtime.mjs"
        status: pass
    human_judgment: false
---

# Phase 03 Plan 06: Survive Together lifecycle and recovery UI Summary

**Built authoritative local co-op recovery, lifecycle, result, and compact accessibility flows in the muted production napplet.**

## Accomplishments

- Rendered four-player state, personal recovery, Revival, Flare, reclaim, departure, and immutable non-ranked team results from session state.
- Preserved paused living owners, target identity, all-dead offer timing, controller ownership, and retained-charge failures through real runtime flows.
- Added bounded compact pages, tiny-frame focus restoration, accessible recovery dialogs, seed sharing, and dark/light/reduced-motion browser matrices.

## Verification

- Final gate `7110`: `pnpm type-check`, production build, all 22 named runtime/layout/result/model tests, `pnpm test:guidance`, and `pnpm test:conformance` passed. Evidence: `/tmp/down-to-duck-03-06-root-final-owner-gate.log`.
- Conformance report: **5 passed, 0 failed, 5 unmeasured skips**. Physical controllers remain unmeasured.
- Prerequisite and regression evidence retained: accepted Phase 03 summaries 01–05; paused/model 56-case gate, immutable solo 21/21 oracle gate, recovery/world/economy/identity/admission regressions, and root market tiny-focus proof.

## Task Commits

- `16cad7f` paused recovery participant correction.
- `f3b502b`, `33bce27`, `545e4d4`, `28ee0ac`, `bf6cfd4`, `12f6fba` co-op runtime, lifecycle, compact UI, and controller ownership integration.
- `26e6bb9`, `8ceae7d`, `7ff7c50`, `1010c80`, `f54a913` supporting result, compact, focus, and market evidence.

## Decisions Made

- Successful recovery UI only projects committed session results; stale owner/target contexts reject without debit.
- Compact surfaces retain every live field through named pages and keep focus inside the visible owner surface.
- Team results preserve immutable participant snapshots and seed copy availability in the active modal.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - UI correctness]** Restored compact focus and state across tiny-frame suspension, including owner-bound HUD paging and accessible dialog names.
2. **[Rule 1 - lifecycle correctness]** Added target participant identity validation and primary-seat departure/rejoin coverage to prevent stale recovery authorization and blocked admission.

These corrections were required to meet the plan's authoritative owner, compact focus, and lifecycle contracts.

## Known Limits

- Phase 03-07 retains market owner/action wiring work; Plan 03-06 does not claim it complete.
- Physical controller conformance remains one of the five unmeasured conformance categories.

## Next Phase Readiness

The co-op lifecycle and presentation layer is verified. Phase 03-07 can attach the remaining market action wiring without replacing the authoritative session/result surfaces.

## Self-Check: PASSED

- Summary exists and final gate evidence is recorded.
- Task commits listed above exist on `feat/local-multiplayer`.
