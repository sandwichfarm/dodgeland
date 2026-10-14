---
phase: 01-composable-solo-baseline
reviewed: 2026-10-14T21:41:57Z
depth: deep
files_reviewed: 28
files_reviewed_list:
  - src/mode-rules.ts
  - src/game.ts
  - src/market/run.ts
  - src/mobs.ts
  - src/render.ts
  - src/soundscape.ts
  - src/devtools-state.ts
  - src/main.ts
  - src/solo-ui.ts
  - tests/solo-baseline.mjs
  - tests/solo-parity-snapshot.mjs
  - tests/solo-parity.test.mjs
  - tests/solo-parity-economy.test.mjs
  - tests/solo-parity-actors.test.mjs
  - tests/mode-rules.test.mjs
  - tests/mode-authoring.test.mjs
  - tests/solo-ui.test.mjs
  - tests/solo-ui-browser.test.mjs
  - tests/strict-node-tests.mjs
  - tests/strict-node-tests.test.mjs
  - tests/runtime-smoke.mjs
  - tests/game.test.mjs
  - tests/health.test.mjs
  - tests/death-spill-integration.test.mjs
  - docs/mode-rules.md
  - docs/context-map.md
  - package.json
  - index.html
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 01: Code Review Re-review

**Re-reviewed:** 2026-10-14T21:41:57Z
**Depth:** deep
**Files Reviewed:** 28
**Status:** clean

## Summary

The re-review now finds all three original findings resolved. `Game.start()` is the sole ready-to-playing transition and is used by movement and the visible Play route. Ready copy is derived from wave visibility and pursuer enablement separately.

For CR-02, the production DOM installation/update code was extracted into `src/solo-ui.ts`, and `main.ts` calls those exact exports for reset, replacement, health updates, and chase updates. The new muted browser test compiles the real `Game`, composer, and UI module, loads the real stylesheet into a 240×240 browser document, then installs actual composed games. It proves the installed DOM and computed grid for maximum health 4, fractional 2.5, maximum 10, and the default 3; it also exercises the now-configurable chase meter threshold. This closes the prior gap without a product test hook.

The fixer reports 9 focused tests passing. Executor04 owns the separate fresh build and final browser gates; their pending completion is release validation, not an unresolved code-review finding.

## Resolved Findings

### CR-02: Custom Pluck HUD installation is exercised in a real browser DOM

**Resolved in:** `src/solo-ui.ts:24-47`, `src/main.ts:307-333`, `tests/solo-ui-browser.test.mjs:15-69`

`installHealthMeter()` and `updateHealthMeter()` are the production operations invoked by the app. The browser test constructs immutable composed definitions through the real composer and `Game`, installs each meter, and asserts actual ARIA values, SVG clip widths, computed column tracks, and 240×240 bounds. It covers four full feathers, a 2.5-health half feather, ten clips in the five-column compact grid, and the legacy three-feather default. The same test also verifies the composed warning duration controls the real chase meter maximum and fill, including zero.

### CR-01: Ordinary Play now emits the authored `start` lifecycle event

**Resolved in:** `src/game.ts:281-296`, `src/main.ts:345-353`, `tests/mode-authoring.test.mjs:64-73`, `tests/health-runtime.mjs:156-165`

`Game.start()` rejects non-ready states, performs no movement, and emits `start` once. Both initial movement and the Play control call it, and the source-backed test verifies the single event followed by progress. The browser test uses the actual visible `#play` control and closure inspection only to observe one stationary invocation. Executor04 still owns the fresh built-artifact execution of that test, but no remaining source defect was found.

### WR-01: Ready guidance now respects disabled pursuers

**Resolved in:** `src/solo-ui.ts:31-37`, `src/main.ts:150`, `tests/solo-ui.test.mjs:30-37`

`readyPursuitCopy()` covers all four combinations of visible/hidden wave and enabled/disabled pursuers, and `readyPreview()` calls it with the active composed policy. The focused tests verify each combination, including visible-wave/no-pursuer and hidden-wave/pursuer cases.

---

_Re-reviewed: 2026-10-14T21:41:57Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
