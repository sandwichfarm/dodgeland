---
phase: 05-race
plan: 03
status: complete
subsystem: race
tags: [lifecycle, device-authority, recovery, browser-input]
requires: [05-02]
provides: [reserved-seat replacement, active-time grace, waiting suspension, immutable lifecycle events, personal recovery UI]
affects: [05-04, 05-05, 05-06, 05-07]
tech-stack:
  added: []
  patterns: [opt-in dead-device rebind, bounded position retention, neutral lease confirmation]
key-files:
  created: [tests/race-lifecycle.test.mjs, tests/session-device-lifecycle.test.mjs]
  modified: [src/race.ts, src/session.ts, src/session-input.ts, src/main.ts, src/race-ui.ts, src/race-ui.css, tests/race-tracer.mjs]
completed: 2026-10-16
duration: 33 min
---

# Phase05 Plan03: Reserved devices, grace and personal recovery

Race now distinguishes disconnected grace, waiting, forfeiture, confirmed departure, actual death and personal recovery while preserving the closed roster and existing economy. Both tasks are complete. Execution used the authorized generic executor fallback; this is not Phase05 or full Race completion.

## Entry and actual API reconciliation

Entry HEAD15e5c1e retained production8f59d42. Accepted final96373 supplied the unchanged-source baseline; no baseline gate was repeated. Graph-first discovery fell back to known source reads where the main-module graph returned no matches.

| Responsibility | Delivered/repaired contract |
| --- | --- |
| Death versus device absence | Opt-in `SessionModeHandlers.retainDeadDevice` preserves dead participation and existing offer while emitting device absence. Legacy defaults remain unchanged. |
| Generic rebind | `deviceReclaimToken` captures session/participant/seat/prior device/lifecycle generation. Shared `reclaim` validates it, occupancy and device format, updates the existing provenance alias, and accounts absence once without recovery, healing or protection. |
| Safe return and retention | Race starts its safe-cell search at `min(floor(actual groundY), floor(earnedDistance))` and searches only that row and the two rows behind, using `isSafeCell` and non-crediting `placeTurnPosition`. Actual ground remains frozen during ghosting, so backtracking or an interrupted hop cannot be undone by reclaim. Optional `retainsPosition` feeds the existing shared retention floor during living grace; expiry/leave releases it. No terrain/world/RNG reconstruction. Paused living placement preserves deliberate modal suspension. |
| Input authority | Existing index/id/epoch leases gain optional reserved-seat selection. Full neutral input precedes replacement confirmation; assignment clears former remembered aliases. Main proactively seeds existing input state on Race lifecycle generation changes, preserving the next genuinely fresh edge. |
| Mode policy | `RaceCoordinator.status`, `events`, `graceRemaining`, `waiting`, `actionToken`, `command`, `reclaimToken`, and `reclaim` own Race policy. Events are append-only frozen seat/state/reason/tick/active-time records. Terminal participant records now include frozen lifecycle status. |
| Recovery | Existing `SessionRecoveryController`, delivered death spill/clear, completed-hop250 charge and innate100 remain authoritative. Rebind never calls recovery; disconnected owners cannot accept a personal offer before reclaim. |

The concrete dead-seat checkpoint was retained before product edits and repaired with root authorization. The later existing fog-reclaim regression proved that excluded ghost rows were being pruned; the separately authorized retention predicate resolves that dependency. Full reconciliation and initial parity evidence are in05-03-DEPENDENCY-REPAIR.md.

## Tasks and commits

1. Ghost/grace/replacement: retained REDdca48e0, ae5cff4 and1fc2992; shared fixesda43154 and33c4ed2; coupled lifecycle/router policyba727d9.
2. Leave/death/recovery/waiting/terminal projection: ba727d9 andbf07bd0. Both coupled coordinator tasks share the policy commit; the visible integration is separately committed. Actual generated-course traffic death reaches the personal offer through keyboard input, then visible accept/decline/expiry controls.
3. Final integration repair: retained RED497acf5; cfe358f separates lifecycle/unique-distance HUD identity, cleans retry projection, and consumes current input on lifecycle transition without swallowing the next fresh remaining-racer edge.

Checkpoint documentation commit78388af is historical. No installs, lockfile updates, oracle repin, native controller polling, product test hooks or preview5175 changes occurred.

## Exact task verification

- **67761 exit0**, `/tmp/down-to-duck-05-03-task1-gate.log`: type/build; exact Task1 selected lifecycle command **9/9**, delivered input **17/17**, dedicated shared device **4/4**.
- **5878 exit0**, `/tmp/down-to-duck-05-03-task2-gate.log`: exact Task2 Race lifecycle+ordering **31/31**, Survive **7/7**, death-spill **16/16**, type-check.
- Model proof includes original row-object retention and bounded release, exact12-second expiry, shared pause, no-ahead placement, frozen exposure/resources/protection deadlines, dead-device waiting, actual249/250/251 own-earned hops, backtracking without credit, fresh two-step leave/cancel, terminal rejection and roster permutation equivalence. Existing ordering coverage supplies innate100 separation, all-down accept/decline/expiry, timeout closure, fatal/finish priority and last-survivor continuation.

## Final combined verification — not a single passing command

**93033 exited1** on bf07bd0. Its passing prefix is authoritative: full `pnpm test:phase3` including nested Phase2/1, immutable solo parity **21/21**, solo regression **272/272**, renderer **19/19**, shared models **73/73**, recovery **44/44**, built Survive **34/34**, build/guidance/conformance; then delivered Relay lifecycle **22/22**, shared-device/Race-ordering/balance **21/21**, and complete Race lifecycle **15/15**. Durable log: `/tmp/down-to-duck-05-03-final-gate.log`.

Its final legacy Race tracer found a duplicated `.race-distance` selector, **3/6 passed**, so93033 is explicitly **not** a fully passing final gate. Notice-only cleanup uncovered the previously masked fresh-input issue: **37807 exit1**, `/tmp/down-to-duck-05-03-final-ui-gate.log`. Focused **8491 exit1**, `/tmp/down-to-duck-05-03-finish-context-red.log`, proves P2 remained at0 after its fresh input following P1's finish. No deadline was increased or assertion weakened.

Root authorized retaining the unchanged shared/default-path passing prefix and rerunning affected Race integration plus the suffix. **51701 exited0** on final source subsequently committed as **cfe358f**, `/tmp/down-to-duck-05-03-final-ui-complete-gate.log`: type-check/build, complete Race tracer **6/6**, complete Race lifecycle **15/15**, guidance **6/6**, conformance **5 pass / 0 fail / 5 unmeasured**, and lockfile diff against immutable oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5`. Browser groups ran sequentially and muted. Source/tests were frozen for each command; no process remains.

## Built UI and inspected captures

Actual shell-delivered pads and keyboard/pointer controls prove a lost racer leaves the clock running, held replacement input does nothing, neutral/fresh confirmation binds the original seat without a hop, confirmed departure is distinct from death,13 seconds of waiting advances no world time, a replacement resumes, and the final departure freezes one result. The tracer explicitly checks one distance readout, one lifecycle notice, fresh remaining-racer input, and cleanup on retry.

All new reclaim captures were inspected: `/tmp/race-05-03-reclaim-{240x240,320x560,900x600,1000x280}-{dark,light}.png`; automated44px/viewport/occlusion assertions pass. Inspected `/tmp/race-05-03-waiting.png`, `/tmp/race-05-03-departed-result.png`, and `/tmp/race-05-03-recovery-{accept,decline,expiry}.png`. The latter use real generated-course traffic death through visible movement, with debugger access limited to read-only observations. A dark-on-dark decline button and misleading all-departed timeout title were corrected and recaptured before final success. SDK boundary audits report no page errors, external requests or forbidden browser authority.

## Deviations and remaining scope

Closeout clarification: research215 requires a safe position no farther ahead than preserved earned distance; implementation additionally bounds it by actual pre-loss ground. A focused real-input model regression earns5 tiles, backtracks to3, starts a partial forward hop, disconnects and reclaims at row3 rather than earned row5. Earned/completed counters remain unchanged. `/tmp/down-to-duck-05-03-no-ahead-clarification.log`, immediate terminal exit0 (chunk `a53cf6`),1/1. This adds evidence only; production remainscfe358f, so no broad rerun was needed.

- Authorized generic dead-device and bounded retention seams were necessary shared dependency repairs; they preserve existing policies by default.
- Main wiring and a small Race CSS rule were necessary for actual controller/menu ownership and readable recovery controls. Existing generic modal primitives are reused.
- Early built setup failure was a fixture missing its optional gamepad domain; corrected fixture options. Strict ambiguous Leave selectors were scoped to the visible dialog. These superseded exploratory logs are not passing evidence.
- No goal-blocking stubs remain for05-03. Physical controllers remain unmeasured. Manifest/wire/teardown conformance measurements remain unavailable, not passed. Full Race item/camera/HUD/results/layout work and independent verification belong to05-04..07; RACE-04 stays partial pending final results/integration proof. Historical WINDOWS1 remains independently proven fixed; this plan does not waive any audit.

## Self-Check: PASSED

All listed source/tests and logs exist; implementation/RED commits resolve; final affected gate is terminal exit0. Working source equals the validated source, and no active process remains. Phase tracking advances only this plan.
