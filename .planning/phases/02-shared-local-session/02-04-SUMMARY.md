---
phase: 02-shared-local-session
plan: 04
subsystem: input-ui
tags: [keyboard, iframe, sdk-storage, accessibility, playwright]
requires:
  - phase: 02-shared-local-session
    provides: LocalSession seats, stable character assignments, and shell shortcut leases
provides:
  - Two isolated native keyboard profiles with SDK-backed complete-map persistence
  - A compact, conflict-safe keyboard editor with real opaque-iframe coverage
affects: [02-05, local-session, setup-ui]
tech-stack:
  added: []
  patterns:
    - Complete binding proposals validate before runtime/storage replacement
    - Editor page changes cancel capture before replacing its DOM
key-files:
  created: [src/keyboard-input.ts, src/session-ui.ts, src/session-ui.css, tests/local-session-keyboard-runtime.mjs]
  modified: [src/main.ts, tests/keyboard-input.test.mjs]
key-decisions:
  - "Reset is per keyboard profile, preserving the other profile after whole-map validation as required by the UI contract."
  - "The editor uses a stable one-action page sequence so resizing never remaps the selected action."
requirements-completed: [INPUT-03, INPUT-04, INPUT-06, UI-01]
coverage:
  - id: D1
    description: Native opaque-iframe Keyboard A/B movement and shell shortcut suspension
    requirement: INPUT-03
    verification:
      - kind: automated_ui
        ref: tests/local-session-keyboard-runtime.mjs
        status: pass
    human_judgment: false
  - id: D2
    description: Atomic keyboard binding capture, conflict rejection, SDK persistence fallback, and reset focus
    requirement: INPUT-04
    verification:
      - kind: unit
        ref: tests/keyboard-input.test.mjs
        status: pass
      - kind: automated_ui
        ref: tests/local-session-keyboard-runtime.mjs
        status: pass
    human_judgment: false
  - id: D3
    description: Compact accessible control editor in dark/light reduced-motion iframe themes
    requirement: UI-01
    verification:
      - kind: automated_ui
        ref: artifacts/local-session-keyboard-{capture,conflict,reset,back}-240-reduced-dark.png
        status: pass
      - kind: automated_ui
        ref: artifacts/local-session-keyboard-capture-900-reduced-light.png
        status: pass
    human_judgment: false
metrics:
  duration: 1h 34m
  completed: 2026-10-14
  status: complete
---

# Phase 02 Plan 04: Native Keyboard and Binding Editor Summary

Two players now share a physical keyboard through native opaque-iframe events, with independently safe bindings that can be edited, persisted, and reset without corrupting the live session map.

## Accomplishments

- Delivered Keyboard A (`WASD`/`Q`) and Keyboard B (arrows/`.`) routers with independent held/action latches, native lifecycle safety, and seat-assigned call routing.
- Suspended only app-owned overlapping shortcut leases during local play while retaining pause, confirm, Escape, and menu safety behavior.
- Added accessible, paged profile editing with complete-map validation, duplicate feedback, per-profile confirmation/reset, SDK storage fallback, live focus repair, and 44px targets.
- Proved actual native key delivery in a muted `allow-scripts` iframe, including focus loss, capture, conflicts, compact pages, theme contrast, and reduced motion.

## Task Commits

1. **Task 1: Native keyboard router and shell transport** — `6e56c37`, `043df67`, `0e86303`, `0affb8f`, `ccab89d`, `4f54028`
2. **Task 2: Compact editor evidence and capture lifecycle repair** — `47a72b7`

## Verification

- `pnpm type-check` — passed.
- `pnpm build` — passed.
- `node --test tests/keyboard-input.test.mjs tests/local-session-keyboard-runtime.mjs` — 6/6 passed.
- `pnpm test:runtime` — passed: 10 scenarios, 12 frame/theme checks, 8 active-wave frame/theme checks.
- `pnpm test:guidance` — 6/6 passed.
- `pnpm test:conformance` — conformant; 5 passed and 5 expected evidence skips.
- `git diff --check` and `git diff -- pnpm-lock.yaml` — clean.

Visual artifacts were captured under `artifacts/`: `local-session-keyboard-{capture,conflict,reset,back}-240-reduced-dark.png`, `local-session-keyboard-{capture,conflict,reset,back}-900-reduced-dark.png`, and `local-session-keyboard-capture-900-reduced-light.png`.

## Decisions Made

- Applied the UI contract's per-profile reset behavior instead of the plan prose's earlier reset-both wording: default conflicts are rejected and the other profile is unchanged.
- Used a fixed one-action page sequence at every size. This keeps capture identity stable through live resize and leaves the 240×240 view room for profile tabs, navigation, and live feedback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored native router handling after focus loss.**
- **Found during:** Task 1 runtime proof.
- **Fix:** Resumed the router when local play resumes even when native capture had already been activated.
- **Committed in:** `ccab89d`.

**2. [Rule 1 - UI correctness] Reworked the editor into bounded compact pages.**
- **Found during:** Task 2 visual review at 240×240.
- **Fix:** Used board ink/paper tokens, compact profile labels, one-action pages, safe reset page, bounded controls, and focus repair after DOM replacement.
- **Committed in:** `47a72b7`.

**3. [Rule 1 - Bug] Cleared capture on page changes.**
- **Found during:** Task 2 final review.
- **Fix:** Page navigation now cancels capture/releases latches, with an iframe regression assertion that a later key cannot mutate the hidden row.
- **Committed in:** `47a72b7`.

## Known Stubs

None.

## Next Phase Readiness

Plan 05 can consume the stable keyboard/session action contract and the local setup editor. This plan intentionally leaves final cross-plan HUD/setup integration to Plan 05.

## Self-Check: PASSED

All plan-owned source files, tests, commits, and visual artifacts exist. Planning state files remain owned by the phase coordinator.
