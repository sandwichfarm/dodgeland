---
phase: 01-composable-solo-baseline
plan: 04
subsystem: solo-rule-composition
tags: [mode-rules, runtime, compatibility, testing, napplet]
dependency_graph:
  requires: [01-01, 01-03]
  provides: [active-rule-shell-wiring, tested-authoring-contract, strict-phase-one-gate]
  affects: [main-loop, hud, runtime-smoke, future-multiplayer-phases]
tech_stack:
  added: []
  patterns: [resolved-policy-at-construction, opaque-iframe-browser-evidence, strict-tap-gate]
key_files:
  created: [src/solo-ui.ts, docs/mode-rules.md, tests/mode-authoring.test.mjs, tests/solo-ui-browser.test.mjs, tests/strict-node-tests.mjs]
  modified: [src/game.ts, src/main.ts, src/styles.css, tests/runtime-smoke.mjs, tests/health-runtime.mjs, package.json]
decisions:
  - Game.start is the shared stationary ready-to-playing transition used by Play and first movement.
  - Main resolves the active definition once at reset while preserved Arcade/Stroll identities remain the seed and save boundary.
  - Phase gates reject TAP skips, TODOs, cancellations, failures, and empty runs.
metrics:
  duration: execution handoff session
  completed: 2026-10-14
status: complete
---

# Phase 01 Plan 04: Shell Wiring, Authoring, and Strict Gate Summary

The production shell now resolves each run's immutable solo policy at reset, drives timing and HUD presentation from it, and preserves the existing single-step Arcade and Stroll entry flow.

## Tasks Completed

1. **Wire active solo definitions into the app without changing entry UX** — `eb24ebc`
   - Added the single `Game.start()` transition and used it from the visible Play control and normal movement path.
   - Resolved the effective definition at reset, including the mode decoded from a supplied seed, then used active fixed-step, time-scale, pursuit, health, and presentation rules.
   - Added production HUD helpers so fractional and custom health capacities render correct clips, ARIA values, and compact layouts.
   - Updated the muted opaque Paja smoke fixture to use free test-owned ports and prove genuine Arcade and Stroll start/movement, persistence, pagehide shortcut teardown, and optional-domain fallback.

2. **Publish tested authoring guidance and run the strict phase gate** — `dd99870`
   - Added the executable public authoring guide and source-backed test of its exact TypeScript example.
   - Added a strict TAP aggregate that fails on empty, failed, cancelled, skipped, or TODO evidence.
   - Added browser DOM proof for installed custom HUD capacities and corrected legacy tests to choose immutable Arcade/Stroll policy at Game construction.

## Validation

Frozen-source gates:

- `pnpm test:phase1` — passed: immutable parity **21/21**, strict regression **270/270**; no failures, cancellations, skips, or TODOs. Immutable oracle: `a310a81ed6c76df4b265c9012c23b8c83f4802e5`.
- `node --test tests/mode-authoring.test.mjs tests/solo-ui.test.mjs tests/solo-ui-browser.test.mjs` — passed **9/9**, including the muted 240×240 installed-DOM meter proof.
- `pnpm test:health-runtime` — passed with muted Chromium: actual stationary Play lifecycle, Pluck contacts, recovery, retry, storage save, and 12 frame/theme layouts.
- `pnpm test:runtime` — passed with muted Chromium in Paja's opaque `allow-scripts` iframe: 10 scenarios, 12 frame/theme checks, 8 wave frame/theme checks, and no page errors. The final evidence includes single-gesture Arcade and Stroll play.
- `pnpm type-check` — passed.
- `pnpm build` — passed.
- `pnpm test:guidance` — passed **6/6**, no skips.
- `pnpm exec napplet-conformance ./dist` — passed **5**, failed **0**, skipped **5**.
- `git diff --check` and `git diff --exit-code -- pnpm-lock.yaml` — passed.

Accepted compatibility matrix evidence retained from the completed 01-03 validation: `node --test tests/devtools.test.mjs`, `node --test tests/render.test.mjs`, and `pnpm test:intents` passed. The final model and opaque runtime gates above cover the active-rule shell changes; later fixture-only repairs did not change production source.

### Conformance Evidence Skips

The five conformance skips are retained as evidence gaps, not passing coverage: three manifest findings remain unresolved, wire evidence has no envelopes, and lifecycle evidence is unmeasured. No manifest, authority, or dependency change was introduced to silence them.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] Repaired stale runtime fixture assumptions**
   - **Found during:** Task 1 browser verification.
   - **Issue:** The opaque smoke test assumed fixed developer ports, a named iframe, old grids and hidden ready-state controls; it also waited for an unreliable shell transcript after `pagehide`.
   - **Fix:** Reserved isolated test ports, reacquired the opaque frame after reload, followed the actual collection pages, and asserted keyboard teardown by pressing Q after `pagehide` and observing no call.
   - **Files modified:** `tests/runtime-smoke.mjs`.
   - **Commit:** `eb24ebc`.

2. **[Rule 1 - Bug] Repaired immutable-policy fixture setup**
   - **Found during:** Task 2 strict regression.
   - **Issue:** Three historical tests mutated `game.mode` after construction, which no longer changes the deliberately immutable resolved policy.
   - **Fix:** Constructed the required Stroll or Arcade policy for each hazard case while retaining the original hazard assertions.
   - **Files modified:** `tests/game.test.mjs`, `tests/health.test.mjs`, `tests/death-spill-integration.test.mjs`.
   - **Commit:** `dd99870`.

3. **[Rule 1 - Bug] Repaired health browser fixture for the current ready flow**
   - **Found during:** Task 1 final health-runtime verification.
   - **Issue:** The fixture entered hidden collection controls, assumed an old sound-tab layout, and tried to mutate the released mode identity to show a wave.
   - **Fix:** Entered through the visible chooser, paged to Sound Preview, staged real road contacts while ready then used visible Play before the controlled hop, and asserted the actual Stroll policy keeps the wave hidden.
   - **Files modified:** `tests/health-runtime.mjs`.
   - **Commit:** `eb24ebc`.

4. **[Rule 3 - Blocking] Isolated runtime test ports**
   - **Found during:** Task 1 runtime verification.
   - **Issue:** An existing developer preview occupied the historical fixed preview port.
   - **Fix:** The smoke fixture now reserves free localhost ports it owns and leaves developer processes untouched.
   - **Files modified:** `tests/runtime-smoke.mjs`.
   - **Commit:** `eb24ebc`.

## Known Stubs

None.

## Self-Check: PASSED

- Task commits `eb24ebc` and `dd99870` exist.
- Required production, documentation, strict-gate, and browser-evidence files exist.
