---
phase: 02-shared-local-session
verified: 2026-10-15T05:35:55Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "At regular 900px composition, a persistent left HUD can cover a nearby P2/P4 world actor in some arrangements."
    addressed_in: "Phase 6"
    evidence: "Phase 6 goal: 'Every multiplayer mode remains understandable and usable through interruptions, recovery, results, and every supported frame size/theme.' Phase 02's current label packing and identity HUD pass; the broader HUD/camera composition refinement is explicitly tracked there."
---

# Phase 02: Shared Local Session Verification Report

**Phase Goal:** Local players can form a readable, uniquely identified roster and control simultaneous characters in one advancing world.
**Verified:** 2026-10-15T05:35:55Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Multiple characters move in one course while terrain, actors, RNG, pickups, camera policy, and simulation time advance once per fixed tick. | ✓ VERIFIED | `LocalSession.update()` advances `SharedWorld` once before stable-seat personal updates; `SharedWorld.update()` is the single clock/tick owner. The fresh `pnpm test:phase2` run passed 71 shared-model tests, including one/two/four-seat once-only world clock, RNG/director, pickup arbitration, wave, and personal-state cases. |
| 2 | A deliberate second standard-controller edge opens Local Play; a capacity-derived default four-seat roster has unique characters/devices, ready guidance, and does not silently interrupt solo. | ✓ VERIFIED | `GamepadRouter.process()` ignores neutral pads and routes an unassigned fresh edge to `requestLocalPlay`; `LocalSession.stage()` rejects duplicate seats/devices/characters. The built opaque-iframe controller flow passed, including consumed second-controller entry, four-seat setup, readiness, cancel/adoption, and default solo return. |
| 3 | Controllers and two shared-keyboard profiles can be mixed; bindings validate conflicts, remap/reset, and independent held/repeated input is safe across focus, stale snapshots, index reuse, and teardown. | ✓ VERIFIED | `validateKeyboardBindings()` rejects malformed and duplicate mappings; native keyboard routing and `GamepadRouter` retain per-profile/device latches. Fresh built-iframe tests passed native shortcut handoff, conflict/capture/reset, two controllers plus two remapped keyboards, reclaim, and teardown; model tests cover stale generations, index replacement, repeats, neutral reseeding, and release isolation. |
| 4 | Controller loss/replacement is a per-seat lifecycle event with actionable state, while keyboard/pointer controls remain available when the optional shell gamepad domain is absent. | ✓ VERIFIED | `handleControllerLifecycle()` routes a disconnected active session seat to `LocalSession.deviceLost()` rather than a global pause; `GamepadRouter` keeps reclaim state separate. The transport/runtime tests passed disconnect/reclaim and absent-domain pointer fallback; no authored native-gamepad polling or prohibited browser authority was found. |
| 5 | Players have persistent non-color identity in setup, world labels, HUD, and selected-owner surfaces; individual live health, power, wallet/cards, device status, and distance render from each player. | ✓ VERIFIED | `createLocalSessionBoard()`, renderer label packing, and `updateHud()` use marker + P-number + character identity. The fresh 24-frame HUD/setup matrix and 53-frame owner matrix had zero deficiencies/errors; direct inspection of 900×600, 240×240, and owner-market captures confirmed readable roster/HUD and owner identity. `Revive —` / `Item —` are visibly unavailable, non-interactive Phase 03 reservations; no revival, items, leader, or active-turn mechanic is claimed. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Deferred Items

The passing Phase 02 identity proof does not erase the explicitly scheduled composition follow-up.

| # | Item | Addressed In | Evidence |
| --- | --- | --- | --- |
| 1 | Regular HUD may occlude a nearby world actor in some layouts. | Phase 6 | The directly inspected 900×600 HUD capture shows this known limitation; Phase 6 owns presentation across supported frame sizes. Phase 02 still proves readable roster/HUD identity, complete packed actor labels, and one shared scene. |

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/session.ts` | Shared world/player ownership, stable seats, lifecycle | ✓ VERIFIED | Substantive `SharedWorld`, `SessionPlayer`, and `LocalSession`; staged uniqueness/safe spawn, once-only world update, lifecycle/reclaim/departure paths. |
| `src/game.ts` and `src/render.ts` | Exact solo facade and one shared scene/camera | ✓ VERIFIED | `Game` delegates shared operations; `Renderer.drawSession()` sends one world plus ordered players into the common scene. Immutable 21/21 parity and 19/19 render tests passed in the final gate. |
| `src/main.ts` | Setup, fixed-step integration, native input, HUD | ✓ VERIFIED | The RAF loop calls `localSession.update(fixedStep)` once per accumulated step and renders `drawSession`; setup, device lifecycle, selected owner, and teardown are production-wired. |
| `src/session-input.ts`, `src/gamepad.ts`, `src/keyboard-input.ts` | Authorized controller transport and independent keyboard profiles | ✓ VERIFIED | Full snapshots route through `GamepadRouter`; keyboard map validation and profile state are substantive. No direct `navigator.getGamepads`, `fetch`, WebSocket, browser storage, or `@napplet/shim` appeared in authored source. |
| `src/session-ui.ts`, `src/session-ui.css` | Readable setup, unique character selection, controls editor | ✓ VERIFIED | Capacity-derived seats, unique candidate filtering, device/readiness copy, focus retention, compact pages, and actionable no-controller fallback are rendered and exercised. |
| `src/market-ui.ts`, `src/run-hand.ts` | One owner-selected shared inventory surface | ✓ VERIFIED | Owner generation invalidates stale card/draft/focus state before presenting another inventory; the 53-frame built owner matrix binds tested artifact/source digests and passed. |
| `tests/local-session-*.mjs`, `tests/session-*.test.mjs` | Behavioral proof against production model and built iframe | ✓ VERIFIED | Not stubs: the final command ran all listed model, controller, keyboard, layout, adoption, audio, tracer, and owner tests with no failures/skips/cancellations in the strict local-session groups. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- |
| `src/main.ts` | `LocalSession` | RAF accumulator → `localSession.update(fixedStep)` → `renderer.drawSession(...)` | ✓ WIRED | Production loop at `main.ts` fixed-step branch; fresh iframe flow moved multiple actual session players. |
| `SharedWorld` | shared simulation subsystems | `advanceSharedWorld`, pursuit, claims, mobs | ✓ WIRED | World update occurs before personal player operations; 71-model-test evidence exercises 1/2/4-seat ordering and once-only policies. |
| shell gamepad snapshots | `GamepadRouter` → main seat actions | injected gamepad callback / per-index lease | ✓ WIRED | Built wire and injected-binding test passed controller entry, movement, context reseeding, reclaim, and exactly-one close. |
| native keyboard | `keyboardInput` → seat-tagged dispatch | app shortcut lease transfer and per-profile state | ✓ WIRED | Built opaque iframe proves overlapping shell shortcut suspension, independent native profiles, editor persistence/conflict/reset. |
| setup roster/HUD | `LocalSession` / renderer / selected owner | stable seat, marker, character, device identity | ✓ WIRED | Setup/HUD matrix, canvas-label test, runtime test, and owner matrix exercise the production DOM/canvas flow. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| session loop/HUD | `localSession.players`, health, power, statistics, `run` | `SessionPlayer` state after live dispatch and shared fixed ticks | Production session state, asserted in model and iframe runtime tests | ✓ FLOWING |
| canvas renderer | `localSession.world`, `localSession.views()` | Same active `LocalSession` used by the RAF loop | One world and ordered real player render views | ✓ FLOWING |
| setup board | `setupDraft` | controller join edges, keyboard additions, character selection, lifecycle updates | Validated draft becomes `LocalSession.stage(...).commit()` | ✓ FLOWING |
| hand/market owner | selected seat's `RunInventory` | `selectedOwnerRun()` and owner generation guard | Distinct staged inventories are inspected through one production DOM tree | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Complete Phase 02 model, iframe, layout, parity, boundary, solo-regression and lockfile contract | `pnpm test:phase2` | Exit 0 on `157e59c`. Includes 21/21 immutable parity, 271 solo regressions, 19 render, 71 shared model, local-session UI/runtime/layout, 44 hand frames, runtime smoke, guidance and conformance. | ✓ PASS |
| Runtime/frame evidence | Included in `pnpm test:phase2` via `pnpm test:runtime` | 10 scenarios, 12 frame/theme checks, 8 active-wave frame/theme checks passed. | ✓ PASS |
| Built controller semantics | Included in `pnpm test:phase2` via `test:local-session-ui` | Mixed four-seat runtime, controller wire/injected binding, keyboard, tracer, adoption, audio, and layout runs passed. | ✓ PASS |

### Probe Execution

No phase-declared `probe-*.sh` files or PASS-marker probes were found. The required executable evidence is the maintained `pnpm test:phase2` gate above.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| --- | --- | --- | --- |
| ARCH-03 | 02-01, 02-02, 02-05 | Separate shared terrain/time/RNG/pickup/camera from personal state; update world once per tick. | ✓ SATISFIED | SharedWorld/SessionPlayer source ownership plus 71-model-test once-only and arbitration cases. |
| INPUT-01 | 02-03, 02-05 | All exposed standard controllers; second actual controller input starts multiplayer flow. | ✓ SATISFIED | Router snapshot leases and built main-owned second-controller flow. |
| INPUT-02 | 02-01, 02-03, 02-05 | Stable device/seat identity and unique character selection. | ✓ SATISFIED | Staging validation, setup candidate filtering, and built four-seat flow. |
| INPUT-03 | 02-04, 02-05 | Shared keyboard presets, conflict-safe editor, remap, reset. | ✓ SATISFIED | Validation source plus built keyboard capture/conflict/reset test. |
| INPUT-04 | 02-03, 02-04, 02-05 | Independent simultaneous input and safety across focus/stale/index/teardown. | ✓ SATISFIED | Router/keyboard state isolation model tests and iframe mixed-input lifecycle evidence. |
| INPUT-05 | 02-02, 02-03, 02-05, 02-06 | Mode-owned lifecycle, actionable state, no blanket disconnect pause. | ✓ SATISFIED | Per-seat lifecycle source, disconnect/reclaim/leave tests, and selected-owner UI. |
| INPUT-06 | 02-03, 02-04, 02-05 | Mixed controller/keyboard use; optional controller absence preserves keyboard/pointer with no native polling. | ✓ SATISFIED | Mixed four-seat iframe test, absent-domain runtime scenario, boundary scan. |
| UI-01 | 02-01, 02-04, 02-05, 02-06 | Game-styled Local Play setup, unique selection, ready/join and controller/keyboard help, simple solo retained. | ✓ SATISFIED | Explicit/cancelable Local Play, setup runtime, full layout matrix, direct screenshot review. |
| UI-02 | 02-01, 02-02, 02-05, 02-06 | Distinct models/marks and individual live player presentation. | ✓ SATISFIED | Shared canvas label tests, real health/power/wallet/status HUD values, and owner presentation matrix. Reserved revive/item fields are intentionally unavailable; later leader/turn/revival mechanics are outside this phase. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- |
| None | — | Targeted phase files contain no unresolved `TBD`, `FIXME`, or `XXX` marker; apparent empty-array returns are guarded UI control queries, not rendered-data stubs. | ℹ️ Info | No blocker. |

### Conformance and External-Evidence Limits

- `pnpm test:conformance` is conformant with 5 passes and 0 failures. Its three manifest checks, wire-envelope well-formedness, and lifecycle clean-teardown are **skipped/unmeasured**, not treated as passes.
- Deterministic injected shell snapshots prove the required transport behavior in a muted opaque iframe. Physical controller hardware and target-shell compatibility remain recorded external confidence checks, explicitly permitted by the Phase 02 validation contract; they are not substituted for, or needed to replace, the passing automated proof.

### Gaps Summary

No Phase 02 must-have failed. The later-mode exclusions are intentional: Phase 02 reserves unavailable revive/item display capacity and emits neutral lifecycle facts, while Phase 03–06 own recovery, consumables, Relay/Race policies, leader/turn semantics, results, and final cross-mode presentation refinement.

---

_Verified: 2026-10-15T05:35:55Z_
_Verifier: the agent (gsd-verifier)_
