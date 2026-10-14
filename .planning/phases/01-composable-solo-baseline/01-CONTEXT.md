# Phase 1: Composable Solo Baseline — Context

**Gathered:** 2026-10-14
**Status:** Ready for planning
**Mode:** Autonomous from the user's explicit plan-and-execute goal.

## Phase boundary

Make existing Arcade and Stroll/Flow behavior a composition of validated rule
groups. Establish exact differential evidence against a310a81 before altering
the engine. Preserve public Game compatibility, default solo entry and every
released seed/schema. Multiplayer state splitting belongs to phase 2; real mode
lifecycle implementations are validated across phases 3–5 (ARCH-02 owns phase 5).

## Locked decisions

- No gameplay, timing, RNG draw order, persistence, input or visible behavior
  changes in this phase. 'stroll' remains the stored Mode/seed identifier.
- Preserve exact update sequencing from research/SOLO-PARITY.md, including
  inventory real time vs Stroll world time, hazard-before-coin ordering,
  actor speed rebasing, shield/innate-save precedence and death-spill snapshot.
- Existing 100-tile character hazard powers are independent of the future
  250-tile personal revival; do not implement or rebalance revival here.
- Freeze a test-only baseline from exact commit
  a310a81ed6c76df4b265c9012c23b8c83f4802e5. Never compare current code with itself.
- Keep seed schemas 1/2/3 frozen. Render geometry, epsilon tolerances and
  versioned generator constants are not arbitrarily tunable mode settings.
- Start with small, typed immutable groups and a composition function. Validate
  finite values/ranges and reject incompatible policies. No generic ECS,
  scripting interpreter, dependency or user-mode editor is needed.
- Capture policy numbers such as health/damage/regen, hop/recovery timing,
  pursuit/trailing, simulation pacing, market cadence/capacity, mob pacing and
  baseline collection reach. Each extracted setting must actually drive behavior.
- Game's existing exported constants/API may alias default configuration for
  compatibility; rendering and timing consumers must use the active rules where
  a setting changes behavior, without changing the baseline defaults.
- Tests must prove non-default compositions take effect as well as strict
  baseline equivalence. Document an executable custom composition example.

## Existing evidence and patterns

- .planning/codebase/ARCHITECTURE.md: shared-vs-player state and exact method map.
- .planning/research/SOLO-PARITY.md: actual 134-test baseline run, source loader,
  immutable fixture strategy, complete stepwise snapshot and scenario matrix.
- tests/source-loader.mjs already accepts a separate source directory and expands
  actual market discovery globs; use independent module instances.
- tests/seed.test.mjs has pinned terrain, content, actor and denomination hashes.
- .planning/research/INPUT-UI.md: future seams; preserve solo wrappers now.

## Discretion and acceptance

Executor may choose module names/precise rule group layout from live source,
keeping changes cohesive. Pin and verify test baseline provenance. Either a
minimal tracked baseline fixture or reproducible git extraction is acceptable;
the latter must work on CI with documented history requirements and fail clearly
when the pinned commit is missing. Avoid copying the entire production tree as
maintained parallel code.

Differential snapshots compare exact values and ordered callbacks after each
command/step across both base modes, all schema versions and representative
seeds/worlds/gentle flags. Real scenarios must reach river drift, vehicle contact,
health regeneration, innate saves, mobs, card/power changes, pack/market freezes
and death. Do not settle for stationary runs or final-score comparisons.

No UI change is authorized by this phase plan; visual parity can reuse existing
render/runtime coverage. All browser checks run with --mute-audio; some old
runtime launchers need this test-only adjustment before being used.

## Deferred to later planned phases

Shared session/player state and multiplayer UI: phase 2. Co-op revival/items:
phase 3. Relay: phase 4. Race: phase 5. Complete visual evidence and PR: phases
6–7. These remain mandatory milestone requirements.
