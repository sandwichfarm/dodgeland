---
phase: 02-shared-local-session
plan: 05
subsystem: local-session-ui
tags: [local-multiplayer, gamepad, responsive-ui, renderer, napplet]
requires:
  - 02-02
  - 02-03
  - 02-04
provides:
  - mixed-device staged Local Play setup and live shared-session HUD
  - production transport, adoption, audio, responsive-layout, and label-render evidence
affects: [phase-02, phase-06]
tech-stack:
  added: []
  patterns: [single authorized snapshot consumer, staged live-solo adoption, stable HUD nodes, compact inspect modal]
key-files:
  created: [tests/local-session-gamepad-runtime.mjs]
  modified: [src/main.ts, src/session-ui.ts, src/session-ui.css, src/render.ts, src/styles.css, tests/gamepad-runtime.mjs]
decisions:
  - First actual controller activity claims solo P1; a later eligible controller edge opens the same staged Local Play board.
  - A short-frame HUD retains four identity chips and exposes full details through a bounded, pausing inspection sheet with Close.
  - Session actor labels use deterministic screen-space rectangle packing so coincident travelers retain distinct glyph, P-number, and character identities.
  - The injected controller transport starts only after safety-pause state is initialized, so a synchronous initially-unfocused binding cannot close itself during boot.
metrics:
  completed: 2026-10-14
  tasks: 2
  validation: 16 shared-UI tests; 24 visual frames; 19 renderer tests; 71 session-model tests; 271 solo regressions
status: complete
---

# Phase 02 Plan 05: Shared Session Setup and HUD Summary

Implemented the reviewed Local Play flow: solo staging/adoption, mixed keyboard and controller roster setup, production snapshot routing, one shared world, and an identity-matched responsive session HUD.

## Delivered

- Local Play now stages the live solo `Game`, lets two to four uniquely assigned players join, and either cancels without mutation or commits the original world/player/RNG owners exactly once.
- Main owns one authorized Gamepad transport consumer and routes its full snapshots through `GamepadRouter`; first actual activity claims solo P1, later joins/reclaims consume their edge, and teardown closes once.
- Keyboard profiles resolve their current assigned seat, controller and keyboard calls use seat-owned characters and cooldowns, and per-seat disconnect/reclaim remains isolated from global suspension.
- The setup board preserves focus through seat, traveler, leave, controls, and compact-page changes; it shows actionable readiness and disconnected-seat reasons.
- The stable in-run HUD uses real player health, distance, power, wallet, cards, device/reclaim state, and noninteractive `Revive —` / `Item —` fields. It keeps four compact identity chips, has a bounded short-frame detail inspection/Close path, and preserves global controls outside that sheet.
- Session canvas labels use marker, P-number, and assigned character name with deterministic rectangle packing for co-located players. Solo rendering remains byte-for-byte covered by the immutable pixel oracle.

## Validation

- `pnpm test:local-session-model` — 71/71 passed.
- `pnpm test:phase1` — immutable solo parity 21/21 and solo regression 271/271 passed.
- `node tests/strict-node-tests.mjs tests/render.test.mjs` — 19/19 passed, including immutable Arcade/Stroll pixels and shared-label rendering.
- `pnpm test:local-session-ui` — 9 files, 16 tests passed with no skips: setup controls, exact canvas labels, tracer, native keyboard, mixed runtime, controller transport, audio, adoption, and layout. Evidence: `/tmp/down-to-duck-02-05-local-session-ui-green.log`.
- Responsive matrix — 24 frames across required themes, sizes, and reduced motion; zero deficiencies, zero page errors. Fresh 240×240 normal/inspect and 1000×280 screenshots were inspected. Evidence: `artifacts/local-session-layout.json` and `artifacts/local-session-layout-hud-240x240{,-inspect}-dark.png`.
- `pnpm test:runtime` — 10 scenarios, 12 frame/theme checks, and 8 active-wave frame/theme checks passed.
- `node tests/gamepad-runtime.mjs` — wire, injected binding, reconnect/reclaim, absent domain, and one-shot teardown passed. The reconnect assertion proves the reclaim edge resumes paused solo play without changing x/y/score. Evidence: `/tmp/down-to-duck-02-05-legacy-gamepad-final.log`.
- `pnpm type-check`, `pnpm build`, `pnpm test:guidance` (6/6), and `pnpm test:conformance` (5 passed, 0 failed, 5 evidence-dependent skips) passed. The conformance skips are its three missing-manifest checks plus wire-envelope and lifecycle evidence not supplied by this napplet. Evidence: `/tmp/down-to-duck-02-05-final-runtime-docs.log`.
- `git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml` passed.

## Commits

- `0ce5cf0` — integrated setup and routing.
- `7d786e4` — claimed solo controller on first activity.
- `6f2a36b` — preserved controller edges and setup focus.
- `5ee2075` — stabilized HUD and controller transport.
- `afc18cb` — made compact HUD inspection usable.
- `2f9e83e` — refined responsive HUD and packed session labels.
- `600bc39` — kept setup action focus within the dialog.
- `26f57e1` — initialized controller transport after UI safety state.
- `b371c36` — proved reclaim consumes its resume edge.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] Synchronous binding bootstrap could close before app initialization completed.**
   - The initial unfocused binding snapshot invoked the safety pause before all top-level UI state existed.
   - Transport construction now follows all safety-state initialization; the real binding fixture asserts it stays subscribed until teardown.

2. **[Rule 1 - Bug] Compact details were hidden or covered by the generic modal veil and utility controls.**
   - The inspection sheet now owns its modal visibility, hides the underlying pause board and utility row, and restores focus/play state through Close.

3. **[Rule 1 - Bug] Session traveler labels overlapped when players shared a spawn or tile.**
   - Renderer packs session-only label rectangles in stable seat order without changing the solo render path.

4. **[Rule 1 - Bug] Legacy solo controller reclaim restored a lease but not the safety-paused run.**
   - A fresh reclaim edge resumes solo play while remaining consumed for movement.

5. **[Rule 1 - Bug] Legacy gamepad fixture could observe its previous iframe during a remount.**
   - The fixture now waits for its expected fixture mode, advances one deterministic task frame, and reports transport/UI diagnostics on bootstrap failure.

The early source-regex tracer guard from `abc4812` was superseded by the built production iframe runtime, transport, audio, adoption, and layout suites; it is not counted as behavioral acceptance evidence.

## Deferred Follow-up

At regular 900px composition, the persistent left HUD can cover nearby P2/P4 world actors in some arrangements. The actor labels themselves are complete and non-overlapping, but Phase 06 owns the broader HUD/camera composition refinement. This is recorded in the Phase 06 context; this plan does not claim every actor is unobscured in every regular-frame composition.

Physical-controller hardware and target-shell compatibility were not manually exercised. Both authorized transport implementations were tested with deterministic shell snapshots in the actual built opaque iframe; this is not physical hardware evidence.

## Known Stubs

None.

## Self-Check: PASSED

- Summary exists at `.planning/phases/02-shared-local-session/02-05-SUMMARY.md`.
- All implementation and validation commits listed above exist in history.

## Handoff

Plan 05 releases its product-source and browser-test reservation. Root retains planning-state ownership and may proceed with the Phase 02 Plan06 handoff.
