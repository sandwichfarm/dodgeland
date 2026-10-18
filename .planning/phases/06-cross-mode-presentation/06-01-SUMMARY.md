---
phase: 06-cross-mode-presentation
plan: "01"
status: complete
subsystem: ui
tags: [presentation, opaque-iframe, geometry, generic-agent-fallback]
requires: [05-race]
provides: [clear shared live composition, bounded controls and owner inspection]
affects: [06-02]
key-files:
  created: [tests/cross-mode-presentation.mjs]
  modified: [src/main.ts, src/render.ts, src/session-ui.css, src/race-ui.ts, src/race-ui.css, src/relay-ui.ts, src/relay-ui.css, src/run-hand.ts, src/run-hand.css, src/hand-layout.css, tests/market-game-fixture.mjs]
---

# Phase06 Plan01 — Clear shared live composition

Both tasks complete on `5ab22ab`; final command19150 exited0. Generic executor fallback applied the full local executor workflow and installed napplet skills. This is plan completion only: Phase05 human acceptance remains pending, Phase06-02 and independent verification remain required. Tracking:4 completed phases,32/33 plans.

## Entry and API reconciliation

Entry `af12564` had unchanged production from reviewed `2da5dd9`; accepted19289 full gates and86987 narrow repair supplied entry proof without a baseline rerun.

| Responsibility | Actual integration |
|---|---|
| Actor geometry | `LocalSession.views()` → `Renderer.drawSession()` → actual `appendTraveler`/`model`/`turnedModel` arguments; read-only CDP observes voxel corners, interpolation/lift/yaw/pitch and packed native label bounds |
| Inspection authority | Existing `hudDetailsOpen`, prior-pause state, `selectHudOwner`, router seeding and detail pages; regular pointer/keyboard inspection now uses the same authority |
| Compact actions | `createSharedControlPages` reparents original controls and one hand tree using DOM-home placeholders; Play/Tools/Hand/Items or Gear pages; four44px movement buttons remain live |
| Hand layout | Authorized `hand-layout.css` seam excludes only embedded controls using zero-specificity `:where(:not(...))`; legacy solo shelf defaults remain unchanged |
| Renderer | Optional generic `PresentationViewport` affects shared screen-space projection only; all scene layers/labels use the same transform, gameplay camera/world/earned progress unchanged, solo default exact |
| Notifications | Existing toast/live region and expiry reused; compact Notice opens full text on paused Play, preserves lifetime while shared time is paused; actual pursuit countdown uses the existing forward control |
| Actual mode setup | Survive requires solo Play→Pause→Local Play; the ready-screen Local Play path is a legacy generic session. Final fixtures assert actual base/composed mode, shared item/market policy and actor authority before every mode case |

## Implementation and bounded deviations

Shared-only composition removes duplicate solo personal widgets, keeps concise owner/health/lifecycle and mode facts, and exposes full details through existing pages. Minimum240×240 notice, both themes, system/app reduced motion, owner/page/focus restoration and fresh assigned controller edges are retained. Actual earned Survive card purchase/detail and Race item target/use prove the reused physical hand, beyond empty labels.

The root authorized the compact control/shelf extension after `b440c3e`; plan/UI addenda record it. After controls were bounded, CSS-only run11800 still measured Race's top band ending104px while P4's label occupied77.8–93.8px. This justified the optional compact-short presentation viewport. It retains the original actor scale, moves every scene layer consistently, and packs actual labels horizontally when needed; no actor/world injection or hidden-nearby-actor workaround.

Final visual review found the seeded-launch toast over actual compact actors. Retained RED98ac9a4 includes toast/warning footprints. Authorized Notice disclosure adds no permanent row, retains full accessible text and a single live announcement, and preserves paused lifetime. Regular/wide toast sits below the HUD. Actual advancing pursuit warning is visible as “↑ 5s” inside its44px action, with the full existing accessible description. Selected identity outlines stay inside controls, clear of health text.

## Commits and evidence

| Commit / command | Result |
|---|---|
| `e426acc`,23437 | Original G1/G2 RED; `/tmp/down-to-duck-06-01-red.log` |
| `b5d5149`,65023 | Historical generic shared tracer and solo21/21; not Survive acceptance |
| `b499925`,5665; `38bdd9d`,5649; `b440c3e` | Retained expanded frame/control REDs and explicit incomplete checkpoint |
| `74b8f15`,87689 | Corrected actual-mode suite21/21, render/solo UI23/23, solo21/21 and required suffix passed; superseded for final acceptance by missing toast-footprint coverage |
| `98ac9a4`,68407 exit1 | Actual visible toast/body/nameplate RED; `/tmp/down-to-duck-06-01-toast-red.log` |
| 70692 exit1 | New notice paragraph leaked at its DOM home; fixed visibility to the actual Play page only |
| 52538 exit0;75222 exit0;47591 exit0 | Frame/disclosure7/7, actual warning/disclosure2/2, final readable warning1/1; inspected full-size captures |
| `5ab22ab`,19150 exit0 | Final frozen-source exact Task2 plus required suffix; `/tmp/down-to-duck-06-01-final-complete.log` |

Final command:

```sh
pnpm type-check && pnpm build &&
node tests/strict-node-tests.mjs tests/cross-mode-presentation.mjs &&
node tests/strict-node-tests.mjs tests/render.test.mjs tests/solo-ui.test.mjs tests/solo-ui-browser.test.mjs &&
pnpm test:solo-parity && pnpm test:guidance && pnpm test:conformance &&
git diff --check &&
git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml
```

Results: cross-mode22/22; render/solo UI23/23; immutable solo21/21; type/build/guidance pass; conformance5pass/0fail/5unmeasured; lockfile and diff checks pass. Task1 tracer is included in the complete strict suite. No active process remains.

## Evidence corrections and artifacts

All earlier “Survive” traces before corrected setup in33989 were **generic-only**, even when named Arcade/Flow. Their geometry RED/GREEN remains useful generic evidence, but none supplies Survive acceptance.33989 proved actual Survive geometry and purchase, then failed a redundant already-closed market action.31511 passed13/21 with eight optional-intent fixture declaration failures; these were corrected together.82897 failed an artifact-path assumption. Final19150 asserts actual mode/base and supersedes these runs. Earlier PNG byte comparison differed despite identical decoded pixels; final solo preservation compares rawRGBA and actual baseline widget visibility (ready score is originally hidden).

`artifacts/cross-mode-presentation/final-artifact-report.json` lists214 final-run PNG captures and built asset hashes; `source-provenance.json` hashes changed sources and the built entry. Both `final-frames-{dark,light}.jpg` sheets and all four `final-details-{arcade,flow,race,relay}.jpg` sheets were inspected, with representative full-size regular/compact/short/wide images, earned card detail, actual item target, Notice/Play and pursuit warning. Geometry JSONs retain exact rectangles and8px separation evidence. The final runs use real opaque production iframes, public seed intent, real controls and authorized SDK snapshots; observations never write model/world state.

## Remaining limits

Full lifecycle/result/market regression and exact inherited Relay6/Race7 gates belong06-02 and are not claimed here. Physical controllers and subjective human visual/feel acceptance remain unmeasured/pending. No installs, dependencies, lockfile change, oracle repin, direct networking/native polling, publication or preview5175 change. All browsers were muted. No phase or milestone completion claim.
