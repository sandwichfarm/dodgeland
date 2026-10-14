# Phase 2: Shared Local Session — Context

**Mode:** Autonomous; user requested planned implementation through all modes and PR.
**Status:** UI contract may be designed in parallel; execution depends on phase 1.

## Boundary

One shared world and independently controlled, uniquely identifiable player
characters. Per-device input/roster lifecycle, automatic controller activity
detection, shared-keyboard defaults/remapping, setup and live player HUD. Mode
mechanics and results arrive in subsequent phases using this foundation.

## User design decisions

- Preserve solo's one-action start and current game aesthetic. No forced lobby
  for a single player. Local setup appears through explicit selection or a
  deliberate second-controller input, in either Arcade or Stroll.
- User requires game-like interfaces: large readable typography/controls,
  voxel character previews, tinted/obscured paused background, no website feel,
  no scrollbars. Small frames use multiple views rather than shrinking controls.
- Reuse bundled Lilita One and current wood/paper/green/gold materials; preserve
  the existing 240x240 minimum notice, theme integration and reduced motion.
- Four player seats are the working default; configuration is validated and
  representation should not depend on exactly four hard-coded elements.
- Every seat has a different character, a persistent number/name/marker and a
  separate device identity. Never rely on color alone.
- Defaults must support two players on one keyboard plus controllers. Include
  a real binding editor with visible current binding, capture, conflict/error,
  cancel and reset states. Native iframe keyboard input is allowed; no private
  shell rebinding protocol or native controller polling.
- Input should have independent latches and safe focus/context reset; the join
  press must not also trigger a hop, start, purchase or character action.
- Controller disconnect is delegated to the mode. Browser focus/visibility or
  too-small-frame remains a global safety pause.
- Existing market and persistent hand are reused with an explicit owner. Plan
  the affordance now, implement co-op inventory/market ownership in phase 3.
- Mode result/podium designs must eventually expose per-character outcomes,
  including equal team podium for co-op and true ties for Race, not invented
  competition. Full result behavior belongs to modes/phases 3–6.

## Available evidence

Read .planning/research/INPUT-UI.md for source seams and runtime constraints,
codebase/STACK.md, PROJECT.md and USER-REQUEST.md. Existing src/game-ui.css,
src/hand-layout.css, src/run-menu.css, src/pause.css and src/collection.css define
the actual visual system. No new UI framework or design dependency is planned.

## Required UI evidence

Design and verify at 200x160 notice, 240x240, 320x560, 900x600, 1000x280 short,
and 2400x1200 wide in both themes, including four-seat content. Keep primary
actions reachable, labels legible, targets at least the current 44px standard
where the view is interactive, no overlap/scrollbars. Separate compact pages
must preserve selected seat and focus. All browser rendering is muted.
