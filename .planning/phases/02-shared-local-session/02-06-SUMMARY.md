---
phase: 02-shared-local-session
plan: 06
subsystem: shared-local-session-owner-surfaces
tags: [local-play, market, hand, stale-state, iframe-runtime]
requires: [02-05]
provides: [selected-owner-market-hand, stale-owner-generation-guards, read-only-empty-owner-inspection]
affects: [src/main.ts, src/market-ui.ts, src/run-hand.ts, src/hand-layout.css, tests/local-session-runtime.mjs]
tech-stack:
  added: []
  patterns: [one-shared-surface-with-owner-generation, virtual-read-only-empty-run-presentation, opaque-iframe-owner-regression]
key-files:
  modified:
    - src/main.ts
    - src/market-ui.ts
    - src/run-hand.ts
    - src/hand-layout.css
    - tests/local-session-runtime.mjs
decisions:
  - Resolve presentation and input from market.isOpen(), which includes a selected empty Local Play owner only while its read-only shared surface is presented.
  - Keep market and hand mutations unavailable during Local Play while allowing inspection of each actual personal RunInventory.
  - Clear owner-scoped selection, draft, replacement, focus, preview, pagination, and pending close state before the selected seat changes.
metrics:
  owner-layout-frames: 53
  setup-hud-layout-frames: 24
  solo-hand-frames: 44
status: complete
---

# Phase 02 Plan 06: Shared Owner Market and Hand Summary

The one existing market and hand now display the selected Local Play owner’s real inventory, retain solo behavior, and reject stale owner callbacks and controls.

## Delivered

- Added owner marker, P-number, and character controls to the shared market and hand detail surfaces.
- Routed panel visibility, controller navigation, close, pause, loop, and audio guards through the selected owner presentation state.
- Invalidated hand/market ephemeral state before changing owner and generation-guarded the 160ms market close callback.
- Kept Local Play inspection read-only; a newly joined owner with no market window gets a truthful empty-inventory view without a fabricated market.
- Added built opaque-iframe evidence for colliding per-owner card IDs, stale close callbacks, owner focus, empty-owner close/death cleanup, and neutral input reseeding after context restoration.

## Validation

- `pnpm type-check` — passed.
- Fresh owner-layout matrix — passed: 53 frames, zero deficiencies/errors (`/tmp/down-to-duck-02-06-owner-layout.log`, `artifacts/local-session-owner-layout.json`). Its fixture binds the verified source mtimes to the tested production artifact.
- Setup/HUD matrix — passed: 24 frames, zero deficiencies/errors (`artifacts/local-session-layout.json`).
- `tests/local-session-tracer.mjs` — passed 3/3 after the root-owned resize-settle correction (`/tmp/down-to-duck-02-06-tracer.log`).
- Local runtime, gamepad transport, audio, adoption, owner layout, and `tests/run-hand-runtime.mjs` all passed in the corrected tail (tool session `75329`); the solo hand suite reported 44 frames and zero errors in `artifacts/run-hand-runtime.json`.
- Runtime smoke passed 10 scenarios, including 12 frame/theme and 8 active-wave checks; controller runtime, guidance, and immutable lockfile check passed (tool session `79125`; `artifacts/runtime-evidence.json`).
- `pnpm test:conformance` — conformant: 5 passed, 0 failed; skipped manifest/event-kind, manifest/index-html, manifest/requires, wire/envelope-well-formed, and lifecycle/clean-teardown because no manifest event, envelope, or lifecycle measurement was supplied.

The first `pnpm test:phase2` attempt passed its unchanged prefix (phase parity, solo, render, 71 shared model, six board controls, and labels) before the tracer captured immediately after a resize. Root commit `99f1b1b` preserved the exact assertion while waiting for compact HUD paint. The corrected tracer and all remaining unchanged-artifact tail gates passed. A manual tail command briefly used a nonexistent `test:controller-runtime` script after the green solo-hand suite; rerunning the package’s actual runtime/gamepad/guidance/conformance/lock segment passed.

## Commits

- `795b6af` — failing owner-runtime tracer (RED).
- `a1bef98` — compact shared-owner hand layout support.
- `7bb1d72` — selected-owner routing, invalidation, virtual empty-owner presentation, and runtime proof (GREEN).

## Limitations

- Automated evidence uses authorized injected shell controller snapshots in muted opaque iframes. Physical controller hardware remains untested.
- Conformance lifecycle and manifest/wire evidence remain unmeasured as listed above.
- Regular HUD actor occlusion remains tracked for the broader Phase 06 presentation work; this plan does not claim global unobscured actors.

## Self-Check: PASSED

- Product/runtime commit `7bb1d72` exists.
- CSS support commit `a1bef98` exists.
- All listed modified source and test files exist.
