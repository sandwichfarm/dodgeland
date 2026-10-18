---
phase: 03-survive-together-consumables
plan: 01
subsystem: local multiplayer admission
tags: [survive-together, local-session, iframe, gamepad]
status: complete
requires: [02-06]
provides: [composed-survive-mode, atomic-live-admission, provenance-lifecycle]
affects: [03-02, 03-03, 03-06]
tech-stack:
  added: []
  patterns: [mode-handler-composition, staged-live-owner-transaction, immutable-contribution-record]
key-files:
  created: [src/survive-together.ts, tests/survive-together-tracer.mjs]
  modified: [src/session.ts, src/main.ts]
decisions:
  - "Survive Together composes ModeDefinition handlers instead of adding mode-name branches."
  - "Admission validates an immutable plan before mutating roster, provenance, or the live owner."
  - "A staged primary device is reapplied at commit because replacing an empty stage shares the live P1 object."
metrics:
  tasks_completed: 2
---

# Phase 03 Plan 01: Survive Together tracer Summary

Survive Together now adopts an active Arcade or Flow run, preserves its live owner objects on cancel or commit, and admits unique safe local seats through the existing session lifecycle.

## Reconciled API Map

- `Game.world` and `Game.player` remain the adopted P1 `SharedWorld` and `SessionPlayer`; no replacement world, run inventory, seed, actor stream, or clock is constructed.
- `LocalSession.stage(game, options)` creates the reversible owner transaction; `LocalSessionStage.cancel()` restores staged P1 identity and `commit()` starts the same records.
- `SessionModeDefinition` supplies typed `join`, `deviceLost`, `reclaim`, `depart`, `death`, `progress`, and `result` seams. `createSurviveTogetherDefinition()` composes these over the shipped Arcade or Flow `ModeDefinition`.
- `LocalSession.prepareAdmission()` creates a validated `SessionAdmissionPlan`; `admit()` commits only a safe, capacity-valid, unique seat/device/character plan.
- `GamepadRouter.requestLocalPlay` drives the existing `main.ts` setup tree. A fresh controller edge opens the explicit promotion/join dialog and is consumed before confirmation.
- `GamepadRouter`, `keyboardSeatForProfile`, `moveSessionCharacter`, and `Renderer.drawSession` retain Phase 2’s single input/router/scene path; `selectedOwnerRun()` continues to route the one market/hand surface to the selected stable seat.
- `SessionPlayer.statistics`, `LocalSession.lifecycle`, and `LocalSession.views()` are the shipped stat, lifecycle, and renderer projections used by this tracer.

## Reserved Recovery Seams

`SessionRecoveryProvenance` and immutable `SessionContribution` record grant, aliases, charge/high-water fields, and departure facts. The generic `progress` and `result` handler hooks are intentionally reserved for Plan 03-02 recovery/tick/settlement wiring: current session update does not dispatch those hooks, and returns when every active player is gone. This tracer does not implement revival, items, shared economy, or results.

## Validation

- `pnpm test:survive-tracer`: strict 22/22 including Arcade and progressed Flow muted `allow-scripts` iframe traces, four-seat atomic admission, ghost/reclaim/departure/provenance cases, and primary binding replacement.
- `pnpm test:phase1`: solo parity 21/21 and solo regression 271/271.
- Focused runtime checks passed: four-seat keyboard/controller movement, audio calls, live adoption, layout, owner routing, hand runtime, runtime smoke, and gamepad runtime.
- Final canonical `pnpm test:phase2` passed exit 0 with durable output at `/tmp/down-to-duck-03-01-final-phase2-hydration.log`. It includes type-check, production build, immutable Phase 1 parity, 71 shared-session model tests, built iframe/UI/runtime checks, guidance, conformance, and immutable lockfile validation. Conformance reported 5 passed, 0 failed, and 5 pre-existing unmeasured skips.

Pre-edit Phase 2 prerequisite evidence remained valid through the Phase 2 close: the independent verifier ran the full canonical `pnpm test:phase2` on `157e59c`, Phase 2 completed at `0c3f50c`, and the product/source diff between them was empty. That gate included immutable parity 21/21, solo regression 271/271, shared-session model 71/71, and built iframe/runtime checks. Its conformance report recorded 5 passed, 0 failed, 5 unmeasured skips (three manifest, one wire, one lifecycle), plus the documented physical-controller limitation. The immutable solo oracle remains `a310a81ed6c76df4b265c9012c23b8c83f4802e5`.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] Primary controller binding was lost when an empty setup stage cancelled before its replacement committed.**
   `LocalSessionStage` now remembers the selected P1 device and reapplies it at commit, while cancel restores the original solo device.

2. **[Rule 1 - Bug] Live promotion rendered a selected P1 traveler without applying it to the adopted player.**
   `main.ts` changes P1's character transactionally before batch validation and restores it if validation fails.

3. **[Rule 2 - Correctness] Batch promotion uses the same validated safe admission plans as live joining.**
   It rejects capacity, duplicate identities, blocked terrain, traffic, unsupported rivers, mobs, and active Arcade wave placement without partial roster/provenance mutation.

4. **[Rule 1 - Verification] Reload persistence smoke test had a hydration race.**
   Root commit `0f064b5` makes the existing test wait for both persisted preferences, child-frame navigation, and bounded checked state. No product source changed for this fix.

## Commits

- `e6eb7c3` — failing tracer tests.
- `c0a1189` — initial composed admission implementation.
- `a31412f` — completed staged live join, batch identity, focus, and iframe tracer work.
- Root regression coverage: `40352a8`, `201104d`, `0bbd0e0`, and `abcf4f7`; hydration fixture synchronization: `0f064b5`.

## Self-Check: PASSED

Verified the owned production and tracer files exist, the feature commit `a31412f` exists, and the final canonical Phase 2 gate completed successfully.
