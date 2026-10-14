---
phase: 01-composable-solo-baseline
reviewed: 2026-10-14T21:20:45Z
depth: deep
files_reviewed: 25
files_reviewed_list:
  - src/mode-rules.ts
  - src/game.ts
  - src/market/run.ts
  - src/mobs.ts
  - src/render.ts
  - src/soundscape.ts
  - src/devtools-state.ts
  - src/main.ts
  - tests/solo-baseline.mjs
  - tests/solo-parity-snapshot.mjs
  - tests/solo-parity.test.mjs
  - tests/solo-parity-economy.test.mjs
  - tests/solo-parity-actors.test.mjs
  - tests/mode-rules.test.mjs
  - tests/mode-authoring.test.mjs
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
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-10-14T21:20:45Z  
**Depth:** deep  
**Files Reviewed:** 25  
**Status:** issues_found

## Summary

The immutable differential harness is genuinely independent of the working tree: it extracts the pinned `a310a81` `src/` tree, compiles it into a separate module root, and compares complete per-step semantic state. The focused policy tests also pass. The authored-mode integration is incomplete in the live napplet, however: the normal start control bypasses the lifecycle contract, and a supported maximum-health override produces an invalid HUD. The ready-screen copy also reports pursuers for a configuration that disables them.

Focused evidence run: `node --test tests/mode-rules.test.mjs tests/mode-authoring.test.mjs tests/strict-node-tests.test.mjs` — 17 passed, 0 failed/skipped/todo. A real composed game with `{ health: { maxHealth: 4 }, lifecycle: { onStart } }` was transitioned by the same direct assignment used by `play()`; it remained `playing` with health 4 and recorded no lifecycle event.

## Critical Issues

### CR-01: The ordinary Play control never emits the authored `start` lifecycle event

**File:** `src/main.ts:347`

**Issue:** `play()` changes a ready game's state with `game.state = 'playing'`. The only `start` emission is in `Game.move()` when that method sees `state === 'ready'` at [src/game.ts:283](/Users/sandwich/Develop/crossy-road-clone/src/game.ts:283). Consequently, clicking “Let's hop” starts the actual run but skips `lifecycle.onStart`; the next move sees an already-playing game and cannot emit it. This breaks the documented lifecycle contract for the main production entry path while the authoring test only exercises `game.move()` directly.

**Fix:** Give `Game` one public transition method (for example `start(): boolean`) that changes `ready` to `playing` and emits `lifecycle('start')`. Use it from both `move()` and `main.ts`'s `play()` path. Add a runtime or integration test that starts through the actual UI route and verifies one, and only one, start event.

### CR-02: Valid custom maximum health is rendered as a three-feather meter with an invalid ARIA maximum

**File:** `src/main.ts:51-54,312-322`; `index.html:13`

**Issue:** The documented executable mode sets `health.maxHealth` to 4 ([docs/mode-rules.md](/Users/sandwich/Develop/crossy-road-clone/docs/mode-rules.md:29)), and the composer permits 1–10 ([src/mode-rules.ts](/Users/sandwich/Develop/crossy-road-clone/src/mode-rules.ts:127)). The UI always creates exactly three SVG feather clips, keeps `aria-valuemax="3"`, and only fills those three clips. A live four-health run therefore shows all three feathers full while its text says 4; assistive technology receives `aria-valuenow="4"` with a maximum of 3. This contradicts the authored policy and makes the extra life invisible.

**Fix:** Rebuild the feather meter when a new game is installed, using `game.maxHealth` for the clip count and `aria-valuemax`; update the title/accessible text from active health rules. Add an integration test for at least `maxHealth: 4` and a boundary value above the legacy three-feather display.

## Warnings

### WR-01: Ready-screen rules copy advertises pursuers when the active policy disables them

**File:** `src/main.ts:152-156`

**Issue:** `composeModeDefinition` accepts a visible wave with `pursuers.enabled: false`; it only rejects a visible *trail* ([src/mode-rules.ts](/Users/sandwich/Develop/crossy-road-clone/src/mode-rules.ts:139,153-163)). In that valid configuration, the first branch of `readyPreview()` is selected by `pursuitVisible` and always says “Pursuers appear from … hops,” although `MobDirector.update()` clears and never spawns them when `enabled` is false ([src/mobs.ts](/Users/sandwich/Develop/crossy-road-clone/src/mobs.ts:175-176)).

**Fix:** Compose wave and pursuer clauses independently: describe the wave whenever it is visible, add the pursuer threshold only when `game.rules.pursuers.enabled` is true, and add a policy-UI test for visible-wave/no-pursuer and hidden-wave/pursuer configurations.

---

_Reviewed: 2026-10-14T21:20:45Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
