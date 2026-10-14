---
phase: 02-shared-local-session
plan: 01
subsystem: shared-local-session
tags: [typescript, local-multiplayer, napplet, playwright, immutable-parity]
requires:
  - phase: 01-composable-solo-baseline
    provides: immutable Game/rule-definition/render oracle
provides:
  - two-seat LocalSession tracer with one shared course and staged solo adoption
  - common renderer path and opaque-iframe Local Play proof
  - test-side semantic owner map that retains archived solo parity coverage
affects: [02-02, 02-03, 02-04, 02-05, 02-06]
tech-stack:
  added: []
  patterns: [shared-world-per-seat-views, staged-adoption, test-side-owner-mapping]
key-files:
  created: [src/session.ts, tests/session-player.test.mjs]
  modified: [src/game.ts, src/render.ts, src/main.ts, tests/local-session-tracer.mjs, tests/solo-parity-snapshot.mjs]
key-decisions:
  - "Use one SharedWorld and typed per-seat state; never construct a Game per traveler."
  - "Preserve the immutable solo facade through aliases and a test-side owner map."
  - "Keep all-player MobDirector targeting and permanent operation contexts for Plan 02-02."
requirements-completed: [INPUT-02, UI-01, UI-02]
coverage:
  - id: D1
    description: "Two distinct Local Play seats share one fixed-step world and keep independent hazards, powers, inventory, and terminal state."
    requirement: "ARCH-03"
    verification:
      - kind: integration
        ref: "tests/session-player.test.mjs"
        status: pass
    human_judgment: true
    rationale: "Nested P2 callbacks can re-enter the scoped facade binding; Plan 02-02 must replace it before ARCH-03 is complete."
  - id: D2
    description: "Built opaque iframe stages, cancels, starts, pauses, and tears down Local Play through the real app surface."
    requirement: "UI-01"
    verification:
      - kind: automated_ui
        ref: "tests/local-session-tracer.mjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Solo Game behavior and archived pixel output remain exact against the a310a81 immutable oracle."
    requirement: "ARCH-03"
    verification:
      - kind: integration
        ref: "pnpm test:solo-parity; tests/render.test.mjs"
        status: pass
    human_judgment: false
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 02 Plan 01: Shared Local Session Summary

**A staged two-traveler Local Play session now shares one live course and renderer while the original solo Game remains exact against the immutable oracle.**

## Accomplishments

- Added `SharedWorld`, `SessionPlayer`, and `LocalSession` with stable `p1`/`p2` identities, separate inventories and typed seat callbacks, one course clock, staged live-solo adoption, and cancel/commit protection.
- Reused released Game movement, river, traffic, power, reward, and terminal operations for P2; per-row pickup ownership prevents double pull advancement and a living P2 advances the shared course after P1 dies.
- Put both actual traveler models, spills, rescue motion, and labels into the existing depth-sorted renderer while preserving exact solo camera and pixel behavior.
- Added explicit Local Play setup, shared pause/focus/undersize safety, lifecycle teardown coverage, and a muted opaque-iframe production proof with refreshed 900×600 setup and active-session screenshots.
- Mapped archived solo snapshot fields through `SharedWorld` and primary `SessionPlayer`, preserving private run/director/RNG comparisons without product-only parity APIs.

## Task Commits

1. **Task 1: production two-seat tracer and rendering** — `060e1c0`, `ecf28d6`, `27f1add`, `a1198a8`, `fa97764`, `68e3ae4`
2. **Task 2: common operations and semantic owner mapping** — `3decf04`, `078fd64`

## Verification

- `node --test tests/session-player.test.mjs` — 5/5 pass.
- `pnpm test:solo-parity` — 21/21 pass against immutable `a310a81ed6c76df4b265c9012c23b8c83f4802e5` after owner-map extraction.
- `pnpm test:solo-regression` — 270/270 pass; durable log: `/tmp/down-to-duck-phase2-solo-regression-fixed.log`.
- `pnpm build && node --test tests/local-session-tracer.mjs` — 3/3 pass with muted Chromium and `allow-scripts` iframe.
- `tests/render.test.mjs` — 19/19 pass, including 24 exact immutable pixel cases.
- `pnpm test:runtime` — pass: 10 scenarios, 12 frame/theme checks, 8 active-wave checks.
- `pnpm type-check`, `pnpm test:guidance`, and `pnpm test:conformance` pass. Conformance reported 5 pass, 0 fail, 5 expected evidence skips (manifest/wire/lifecycle measurement).
- `git diff --exit-code -- pnpm-lock.yaml` passed.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - correctness] Restored cycle-safe development diagnostics**
   - **Found during:** final solo regression.
   - **Issue:** the new `Game → SharedWorld → host` ownership link made the legacy JSON diagnostic snapshots throw on a circular reference.
   - **Fix:** switched the devtools test snapshots to the existing cycle-aware, map/set-preserving `semanticValue` representation.
   - **Files modified:** `tests/devtools.test.mjs`.
   - **Verification:** `node --test tests/devtools.test.mjs` (8/8) and final solo regression (270/270).
   - **Committed in:** `078fd64`.

2. **[Rule 2 - parity coverage] Added explicit owner mapping to the immutable snapshot adapter**
   - **Found during:** Task 2 acceptance audit.
   - **Issue:** parity observed the forwarding Game facade but did not explicitly read shared and personal fields through their extracted owners.
   - **Fix:** mapped archived Game state to `game.world` and `game.player` where present, with baseline fallback and unchanged private future-state/director coverage.
   - **Files modified:** `tests/solo-parity-snapshot.mjs`.
   - **Verification:** immutable parity 21/21.
   - **Committed in:** `078fd64`.

## Deferred Architecture Hardening

- `withSessionPlayer` temporarily rebinds the Game facade while applying P2 operations. A P2 callback that re-enters through `session.dispatch({ seat: 'p1', ... })` can act against the temporary P2 binding. Reproduction: Game 71/Pond/Stroll with meadow rows, P1 at x2/y0 and P2 at x0/y0, row 0 coin, and `p2.onCoin` dispatching P1 forward; the callback returns true, P1 remains at y0, and P2 moves to y1. Plan 02-02 must replace this bridge with a permanent explicit player/world operation context before claiming final composable ownership.
- All-player/nearest-target MobDirector arbitration, deterministic contested claims, generalized 1/2/4-seat identity types, native keyboard-profile editing, and the full responsive UI matrix remain with Plans 02-02 through 02-05. The Plan 01 browser proof deliberately uses the injected shell-action runtime fixture and does not claim native-key profile coverage.

## Next Phase Readiness

Plans 02-02 onward can depend on the shared world, seat render views, staged adoption, typed P2 callbacks, and semantic parity mapping. Preserve the exact solo wrapper; remove the scoped reflective bridge before extending roster size or callback-driven lifecycle behavior.

## Self-Check: PASSED

- Summary file exists and the listed commits are present in history.
- No package or lockfile change was introduced.
