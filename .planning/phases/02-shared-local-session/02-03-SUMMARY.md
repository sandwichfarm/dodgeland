---
phase: 02-shared-local-session
plan: 03
subsystem: controller-input
tags: [typescript, gamepad, local-multiplayer, napplet, input-routing]
requires:
  - phase: 02-01
    provides: LocalSession seat-tagged movement dispatch and shared-world tracer
provides:
  - complete authorized gamepad snapshot transport consumer
  - independent per-device controller leases, latches, repeats, and context baselines
  - explicit join consumption, disconnect/reclaim lifecycle adapter, and capacity guard
affects: [02-05, 02-06, controller-input, local-session]
tech-stack:
  added: []
  patterns: [transport-policy-separation, index-id-epoch-leases, neutral-before-reclaim]
key-files:
  created: [src/session-input.ts, tests/session-input.test.mjs]
  modified: [src/gamepad.ts, tests/gamepad.test.mjs, docs/gamepad.md]
key-decisions:
  - "Keep the draft shell bridge transport-only and move multi-device policy into GamepadRouter."
  - "Treat index plus sanitized ID plus epoch as a lease; never treat an index as durable player identity."
  - "Emit structural device lifecycle transitions while Plan 02-05 maps them to mode-owned LocalSession lifecycle methods."
requirements-completed: []
requirements-advanced: [INPUT-01, INPUT-02, INPUT-04, INPUT-05, INPUT-06]
coverage:
  - id: D1
    description: "Complete authorized snapshots route independently leased standard controllers through GamepadRouter into actual LocalSession players."
    requirement: INPUT-01
    verification:
      - kind: integration
        ref: "tests/session-input.test.mjs#two pads move two session players through the production transport and independent router state"
        status: pass
    human_judgment: false
  - id: D2
    description: "Fresh unassigned activity is consumed before setup or seat actions, with per-device repeat and hysteresis state."
    requirement: INPUT-04
    verification:
      - kind: unit
        ref: "tests/session-input.test.mjs#join consumed and independent repeat"
        status: pass
    human_judgment: false
  - id: D3
    description: "Replacement, disconnect, explicit reclaim, capacity, malformed input, and global focus safety have deterministic behavior."
    requirement: INPUT-05
    verification:
      - kind: unit
        ref: "tests/session-input.test.mjs#replacement/reclaim/device loss/capacity"
        status: pass
    human_judgment: false
  - id: D4
    description: "The authorized injected and draft-wire transport remains optional, bounded, muted, and teardown-safe in an opaque iframe."
    requirement: INPUT-06
    verification:
      - kind: automated_ui
        ref: "pnpm build && node tests/gamepad-runtime.mjs"
        status: pass
    human_judgment: false
metrics:
  duration: 49min
  completed: 2026-10-14
status: complete
---

# Phase 02 Plan 03: Controller Snapshot Routing Summary

**Authorized full gamepad snapshots now feed independent, seat-aware controller leases while preserving the solo adapter and optional-domain fallback.**

## Performance

- **Duration:** 49 min
- **Completed:** 2026-10-14T23:38:40Z
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

- Added `GamepadRouter`, which keeps independent latches, stick hysteresis, repeats, context baselines, and `{ index, sanitized id, epoch }` leases for every standard pad.
- Added the validated transport consumer path without changing either authorized bridge, parent-source check, no-domain behavior, or the legacy solo `GamepadInput` adapter.
- Proved real transport → router → `LocalSession` movement for two pads, plus join consumption, malformed-state clearing, index reuse, explicit neutral reclaim, capacity, and frame safety.
- Updated controller guidance for SDK 0.29.0, all-pad routing, mode-owned device lifecycle, and the transport-only boundary of the muted browser regression.

## Task Commits

1. **Task 1 RED: multi-device production-object coverage** — `5fa1219`
2. **Task 1 GREEN: complete snapshot routing** — `bd9c4d7`
3. **Task 2 RED: lease lifecycle coverage** — `b505f1b`
4. **Task 2 GREEN: safe lifecycle and documentation** — `180ea36`
5. **Post-task lease hardening: issued epoch and focus-return seeding** — `006ea02`

## Verification

- `node --test tests/gamepad.test.mjs tests/session-input.test.mjs` — 28/28 passing on the shared current source, including stale same-ID epoch and focus-return held-input regressions.
- Isolated checkout at `180ea36`: `pnpm type-check`, `pnpm test:guidance` (6/6), and `pnpm build` passed.
- Isolated checkout at `180ea36`: `node tests/gamepad-runtime.mjs` passed with muted Chromium for the injected-binding, draft-wire, and absent-domain transport paths.
- `git diff --exit-code -- pnpm-lock.yaml` and `git diff --check` passed.
- Durable logs: `/tmp/down-to-duck-02-03-{unit,typecheck,guidance,build,gamepad-runtime}.log`.

## Decisions Made

- `GamepadRouter` owns controller identity and transient input policy; `LocalSession` remains authoritative for durable seats and mode outcomes.
- A device lifecycle callback is structural at this layer. Plan 02-05 will map a disconnect/reclaim offer and approved reclaim to `LocalSession.deviceLost`, `offerReclaim`, and `reclaim` without exposing the transport lease as a durable seat identity.
- The browser fixture remains transport-only. `main.ts` GamepadRouter creation, frame updates, and shared-session iframe proof belong to Plan 02-05.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - lease safety] Rejected stale same-ID controller generations**
   - **Found during:** post-task lease review.
   - **Issue:** assignment and reclaim accepted `{ index, id }` without the issued epoch, so a stale UI callback could claim a new lease at the same index with the same sanitized ID.
   - **Fix:** require the full issued `GamepadDevice` identity, including epoch, for assignment and reclaim; added an exact same-ID generation regression.
   - **Files modified:** `src/session-input.ts`, `tests/session-input.test.mjs`.
   - **Verification:** 28/28 focused input tests and `pnpm type-check`.
   - **Committed in:** `006ea02`.

2. **[Rule 1 - focus safety] Seeded the newest unfocused snapshot before dispatch resumes**
   - **Found during:** post-task lease review.
   - **Issue:** input pressed during a focused-false snapshot could be interpreted as a fresh directional edge when focus returned under the same context.
   - **Fix:** reconcile and seed the complete unfocused snapshot without dispatching before focus can resume.
   - **Files modified:** `src/session-input.ts`, `tests/session-input.test.mjs`.
   - **Verification:** 28/28 focused input tests and `pnpm type-check`.
   - **Committed in:** `006ea02`.

**Total deviations:** 2 auto-fixed (Rule 1: 2).

**Impact on plan:** Both fixes enforce the planned lease and neutral-before-resume safety guarantees without changing the transport boundary or session mode policy.

## Known Stubs

None.

## Next Phase Readiness

Plan 02-05 can construct the router, feed its snapshot consumer from the authorized transport, update it once per frame, and bridge the documented structural lifecycle callbacks to the current `LocalSession` lifecycle methods. No physical-controller or main-loop integration claim is made by this plan.

The input requirements remain pending in REQUIREMENTS.md until the integrated
setup/runtime and phase gate prove their complete user-facing behavior. This
completed plan establishes the transport/router portion of those requirements.

## Self-Check: PASSED

- `src/gamepad.ts`, `src/session-input.ts`, `tests/gamepad.test.mjs`, `tests/session-input.test.mjs`, and `docs/gamepad.md` exist.
- Commits `5fa1219`, `bd9c4d7`, `b505f1b`, `180ea36`, and `006ea02` are present in history.
