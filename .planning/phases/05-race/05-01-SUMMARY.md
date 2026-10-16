---
phase: 05-race
plan: 01
status: complete
subsystem: race
tags: [multiplayer, composition, setup, authoring]
requires: [01-04, 02-06, 03-08, 04-06]
provides: [Race setup-to-finish tracer, strict frozen settings, executable multiplayer authoring]
affects: [05-02, 05-03, 05-04, 05-05, 05-06, 05-07]
tech-stack:
  added: []
  patterns: [validated handler composition, settled per-seat finish observations]
key-files:
  created: [src/race.ts, src/race-ui.ts, src/race-ui.css, tests/race-tracer.mjs]
  modified: [src/session.ts, src/main.ts, docs/mode-rules.md, tests/mode-authoring.test.mjs]
completed: 2026-10-16
duration: 35 min
---

# Phase 05 Plan 01: Validated Race tracer and executable authoring

Two to four unique bound racers configure and finish one shared course through production controls; exact authored callbacks execute the complete session lifecycle. Execution used the authorized generic-agent fallback while applying the GSD executor workflow.

## Gate 0: accepted unchanged-source evidence

Entry HEAD is `7f78ac7`; source baseline is `52f8e0d`. `git diff 52f8e0d HEAD -- src tests package.json pnpm-lock.yaml` is empty. The immediately preceding exact Relay Gate 6 completed in session `89260`, exit 0, with durable log `/tmp/down-to-duck-04-review-repair-final-gate.log`. It includes the nested Phase 2 and Phase 3 gates, immutable solo parity, all delivered Relay tests, type checking, build, guidance, conformance, and lockfile identity. Root explicitly authorized adoption of this fresh unchanged-source evidence instead of rerunning it. All completed Phase 1–4 summaries are present, including Phase 3 plan 08. Conformance remains 5 pass, 0 fail, 5 unmeasured; physical controllers remain unmeasured. The solo oracle remains `a310a81ed6c76df4b265c9012c23b8c83f4802e5`.

## Delivered API reconciliation before RED/product edits

| Responsibility | Delivered API and intended reuse |
| --- | --- |
| Validated solo definitions | `composeModeDefinition`, `isModeDefinition`; branded, frozen definitions and strict unknown-key validation. |
| Multiplayer composition | `SessionModeDefinition` and `SessionModeHandlers`; add a narrow validated handler composer for authored bundles, without mode-ID policy in shared services. |
| Shared simulation | `LocalSession.stage/start/update`, `SharedWorld`, `SessionPlayer`; one world update followed by all players, hazards, settled progress, and handler tick. |
| Earned finish provenance | `SessionPlayer.completedForwardTiles`, settled by the session after hazard resolution; spatial placement is not finish credit. |
| Lifecycle | Handlers `attach/join/deviceLost/reclaim/depart/death/progress/tick/result`; records include stable seat, session/player identity and simulation tick. |
| Recovery | Delivered `SessionRecoveryController`; personal charge, offers, expiry and accepted recovery remain shared services. |
| Input | Existing `SessionInput`/gamepad router, binding leases, context generations and fresh-edge barriers; no new controller or native polling. |
| Ownership/items | Existing owner projections and `CoOpMarketAdapter` capability policy; no copied economy or recovery. Race item expansion belongs to later plans. |
| Results | `SessionResult` envelope and idempotent `LocalSession.completeResult`; Race supplies a frozen mode-specific record. |
| Rendering | Existing `drawSession(world, session.views(), dt)`; one shared world and independent player views. |
| Clock | Shared fixed-step world advancement; coordinator observes settled ticks and freezes its captured active duration on result. |
| Relay coexistence | Existing setup, handoff, lifecycle, owner and results consumers remain intact; verified Phase 04 source is the entry baseline. |

## Execution status

Preflight was recorded before the first Race test or production edit. All three tasks are complete. Final command `70346` exited 0 on production source `67eb0d3`, with whole-command log `/tmp/down-to-duck-05-01-final-gate.log`. It ran full `pnpm test:phase3`, the remaining exact Relay Gate 6 commands, then `node --test tests/mode-authoring.test.mjs tests/race-tracer.mjs && pnpm type-check && pnpm build`. Counts include solo 21, solo regressions 272, shared models 73, recovery 44, Survive browser 34, Relay 65, Relay runtime 12, Relay layout 1 with 252 captures, and authoring/Race 12; all passed. Guidance 6/6, conformance 5 pass/0 fail/5 unmeasured and immutable-oracle lockfile check passed. Phase completion remains reserved for independent verification.

After that gate, test-only commit `3fc13d1` explicitly checked every racer's zero earned tiles after keyboard Start and held controller-confirm Start. Production source stayed unchanged. Full Race tracer command `23683` exited 0, 6/6, log `/tmp/down-to-duck-05-01-start-edge-final.log`. No build/browser/test process remains active.

## Implemented tasks and retained RED/GREEN evidence

| Task | Commits | Evidence |
| --- | --- | --- |
| Shared-world setup-to-finish tracer | RED `c69f3a9`, policy RED `3fa8346`, implementation `204024c` | Exact Task 1 command session `55610`, exit 0, `/tmp/down-to-duck-05-01-task1-corrected-gate.log`; nested Phase 2/3 plus Race 2/2, type/build. |
| Strict settings and closed unique roster | RED `560e8ce`, implementation `f804837`, live captured goal `67eb0d3` | Exact Task 2 command session `42063`, exit 0, `/tmp/down-to-duck-05-01-task2-final.log`; matching cases 4/4 and type-check. Full tracer also proves generic placement adds no personal score, settled distance, innate readiness or revival credit. |
| Exact executable multiplayer authoring | RED `1309a1d`, implementation `d19128f` | Exact Task 3 command session `11979`, exit 0, `/tmp/down-to-duck-05-01-task3-final.log`; authoring plus Race 12/12, type-check and guidance 6/6. The five existing solo authoring tests remain intact. |

`RaceCoordinator` composes the existing session/recovery services, captures settings and course schema/seed identity, and closes admission. Every racer shares the original world and retains independent player/inventory state. Settled earned movement records per-seat finish ticks; the first finisher stops acting while others continue. The initial immutable result freezes after every racer finishes or the captured clock expires. Full elimination/reclaim/fog ordering and complete ranked result records remain assigned to the following Race plans.

The authored practice factory is extracted verbatim from its fenced TypeScript block, type-checked, imported and executed. Tests drive actual admission, device loss, reclaim, departure, death and settled hops through `LocalSession`; they never invoke callbacks as substitutes for production lifecycle transitions. Unknown settings/handlers reject and a different valid finish setting changes only authored policy. Terminal records and nested distances are frozen and a second publication rejects.

## Visual and browser evidence

Built opaque `allow-scripts` iframe tests use visible controls, native keyboard events and injected authorized controller snapshots. Actual two-, three- and four-seat runs configure, start without a leaked hop, reject a late device, finish every racer, show the captured immutable outcome, retry and return to solo. Tests assert no page errors, external requests or native controller polling. Every Chromium launch uses `--mute-audio`.

Inspected setup captures: `/tmp/down-to-duck-05-01-setup-{200x160,240x240,320x560,900x600,1000x280,2400x1200}-{dark,light}.png`. Inspected roster captures: `/tmp/down-to-duck-05-01-roster-{2,3,4}.png`. Initial terminal projection: `/tmp/down-to-duck-05-01-race-result.png`. Setup preserves state through minimum-size suspension and theme/resize changes; the start control is at least 44px and inside its clipping ancestors. Full Race lifecycle/scene/results matrix belongs to plans 05-06/07.

## Reconciliations and deviations

- Added `src/race-ui.css` as the smallest presentation seam beyond the declared file list. It scopes settings/roster layout, captured goal and initial result presentation; no dependency or manifest changes.
- The first tracer simplification froze on the first finisher. Context review caught that error; retained RED now requires other racers to continue. Superseded command `47598` was explicitly terminated with exit 143; it is not passing evidence.
- Strict validation RED caught coercible non-string device acceptance and missing captured `RunSeed`. Both were repaired before the Task 2 green gate.
- Actual compact capture inspection exposed inherited roster-page CSS hiding Start/Back and later ancestor clipping. Scoped settings pages and clipping assertions fix this without changing the shared roster editor. The final settings sheet retains the game scene; retry restores the shared result root's accessible label.
- No new world, RNG, router, recovery, inventory or result service was introduced. The new validated handler composer wraps existing contracts; common session/input/render code has no Race-ID policy branch.

## Remaining scope and measurement limits

Only plan 05-01 is being executed. Plans 05-02 through 05-07 still own competitive fog, comprehensive terminal ordering, disconnect grace/replacement reclaim, Race item eligibility/effects, complete ranked participant records and final presentation/integration. ARCH-02 and RACE-01 remain open at phase level pending that evidence. This initial projection is not the full Race podium. Physical controllers and the five conformance evidence-dependent checks remain unmeasured. Race, cross-mode UI, independent verification and the PR remain required by the original request.

## Self-Check: PASSED

All declared production/test/documentation artifacts exist; all task commits exist. Exact task gates and final inherited gate reached terminal success. No packages, lockfile, solo oracle, runtime protocol or preview5175 changes. No remaining stub prevents this plan's setup/tracer/authoring objective; later Race functionality remains explicitly assigned above.
