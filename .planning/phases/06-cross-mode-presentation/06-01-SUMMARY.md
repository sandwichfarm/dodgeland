---
phase: 06-cross-mode-presentation
plan: "01"
status: checkpoint
subsystem: ui
tags: [presentation, opaque-iframe, geometry, generic-agent-fallback]
requires: [05-race]
provides: [regular-frame shared summary and retained compact-control dependency proof]
affects: [06-02]
key-files:
  created: [tests/cross-mode-presentation.mjs]
  modified: [src/main.ts, src/session-ui.css, src/race-ui.css, src/relay-ui.css, tests/market-game-fixture.mjs]
---

# Phase06 Plan01 — Compact control dependency checkpoint

**Plan incomplete: Task1 regular tracer passed; Task2 exposes a shared compact-control/shelf responsibility.** Generic executor fallback applied the local executor workflow and installed napplet-ui/test skills. Phase05 human acceptance remains pending; no phase, requirement or plan completion is claimed. Counts remain4 completed phases,31/33 plans.

## Entry and actual API reconciliation

EntryHEAD `af12564`; production `src/`, package and lockfile were unchanged from reviewed `2da5dd9`. Accepted19289 full prior gates and86987 narrow shared-input/runtime repair therefore supplied unchanged entry evidence; no baseline rerun.

| Responsibility | Delivered API / reconciliation |
|---|---|
| World and player presentation | `LocalSession.views()` → `Renderer.drawSession()` → `appendTraveler`; actual calls contain interpolated ground position, hop lift and character model |
| Full body measurement | CDP breakpoints on production `model`/`turnedModel`, actual argument voxels/lift/yaw/pitch and `Renderer.project`; all corners measured without replacing renderer or mutating state |
| Identity measurement | Actual `appendTraveler` packed label argument and measured native text/status envelope; no center-only proxy |
| Owner selection | Existing `selectHudOwner` invalidates market, hand and router before updating selected owner; retained |
| Inspection | Existing `hudDetailsOpen`, `hudInspectWasPlaying`, four detail pages and controller routing; previously limited to height≤319 and closed by resize |
| Shared pause | `displayedRunState()` includes `sessionPaused`; host `game.state` alone does not represent a shared pause. Regression corrected to visible shared state plus unchanged clock/positions |
| Compact owner shelf | Existing `run-hand.ts`/`run-hand.css` owns physical owner, card/item and gear controls. Main/CSS controls occupy independent additional rows; no shared bounded action pagination exists |

## Commits and terminal evidence

| Commit / session | Evidence |
|---|---|
| `e426acc`;23437 exit1 | Retained two real REDs: voxel/nameplate occlusion and duplicate solo score/wallet/health/power. `/tmp/down-to-duck-06-01-red.log` |
| 24119 exit1 | CSS-only geometry passed; test incorrectly inspected host state for shared pause. Corrected to shared UI and authoritative unchanged state. `/tmp/down-to-duck-06-01-css.log` |
| 13677 exit0 | Type/build, tracer2/2, immutable solo21/21. Inspection image exposed dark-on-dark controls; corrected after terminal. `/tmp/down-to-duck-06-01-tracer-green.log` |
| `b5d5149`;65023 exit0 | Corrected exact tracer feedback: type/build, actual Arcade tracer2/2 and immutable solo21/21. `/tmp/down-to-duck-06-01-tracer-feedback.log` |
| `b499925`;5665 exit1 | Retained Task2 expansion RED: all four mode geometry tests passed, all four frame tests failed top-band limits. `/tmp/down-to-duck-06-01-expansion-red.log` |
| 48871 exit1 | Compact strip follow-up: Survive Arcade/Flow band tests pass; Race/Relay remain failing. Full-size inspection revealed additional actual controls obstructing travelers. `/tmp/down-to-duck-06-01-compact.log` |
| `38bdd9d`;5649 exit1 | Coherent WIP plus retained actual compact-control collision regression. `/tmp/down-to-duck-06-01-compact-controls-red.log` |

No active command/browser/server remains. No installs, lockfile change, oracle repin, external network, native polling or preview5175 activity. Every automated browser used `--mute-audio`. Historical conformance5pass/5unmeasured and physical controllers unmeasured remain unchanged; no new conformance run is claimed.

## Current production changes

- Main: regular selected-seat inspection now opens the existing modal, uses dialog semantics and Tab containment, retains prior pause and page through resize, and adds authoritative concise health/lifecycle summaries/team distance. Existing owner invalidation remains unchanged.
- Session CSS: shared-only duplicate solo widgets hidden; regular top2×2 summary band fits160px; explicit details expose existing facts/pages with44px controls; compact marker strip and wide expanded details are WIP.
- Race/Relay CSS: replace tall live cards with bounded cue treatment; Race extra ordinary live text is clipped as a live region, with mode facts still in existing detail projection. Mode-specific summary copy and complete constrained-page behavior are not yet finished.
- Renderer remains untouched. CSS-only regular geometry passed; no viewport workaround was introduced.

## Concrete dependency evidence

Read `artifacts/cross-mode-presentation/compact-control-gap.json` and full-size `*-compact-control-gap.png`. All measurements below are CSS pixels from the real240×240 opaque iframe, actual controls and production draw arguments.

| Mode | Top HUD | Additional real footprints | Actual collision |
|---|---|---|---|
| Survive Arcade | y4..76 | Mute/pause/menu y100..144; movement/call y188..232 | P1 label x86.61..153.39,y139.37..155.37 intersects mute/pause; body x113.33..128.44,y153.04..173.56 lacks8px clearance |
| Race | y4..120 | Movement/call y92..136; tools y100..144; owner y144..188; item/gear y183.41..236.59 | P1 label/body intersects tools/owner; live course is not a clear80px region |
| Relay | y4..100 | Movement/call y92..136; tools y100..144; owner y144..188 | Actual single runner label/body intersects tools/owner |

At1000×280 Race/Relay top band remains100px versus80px budget. At2400×1200 Race is424px versus416px; these are ordinary remaining owned CSS fixes. The240×240 issue is different: moving all existing44px controls and the physical shelf into another permanently visible row cannot preserve80px of clear world. Moving/hiding actors or changing authoritative camera cannot fix missing UI space.

## Proposed bounded repair / minimum additional ownership

Authorize a **generic shared compact action/shelf disclosure** in existing `src/run-hand.ts` and `src/run-hand.css`, composed with currently owned main/session CSS. Reuse/move the existing actual controls and one hand tree; do not duplicate buttons, inventory or authority. A small bounded action strip/pager can expose movement/call, global tools and owned hand/items in reachable44px pages while maintaining a visible owner label. The full details/gear controls must remain actual operable elements, with native keyboard/assigned-controller focus, page preservation, fresh seeding and prior pause restoration. Pointer inspection retains deliberate shared modal pause; inactive gameplay/controller input gains no pause authority. Exact compact grouping/copy should be reconciled with the approved UI contract before implementation.

Keep the scene as the same actual canvas with no actor relocation. Only after this structural occupied-space repair, measure again; a generic presentation viewport remains conditional on residual CSS-only failure and cannot substitute for missing control space. No new service, gameplay, storage or protocol responsibility is proposed.

## Remaining acceptance

Task2 is incomplete: constrained complete facts and mode labels, truly left AND right travel (current right sample returns toward initial; extend to the positive-side position), required frame focus/motion/solo restore, no clipping, all required inspected captures and exact Task2 command. Current geometry observer is retained and source-backed; compact test intentionally fails. Final06-02 exact inherited gates are not run or claimed. Do not mark06-01 complete or advance plan count until repair and all declared checks pass.

## Self-check

All cited commits and logs exist; artifacts are inspectable. This is a checkpoint summary, not a completion summary. Source/test WIP is explicitly committed and no unrelated edits were reverted.
