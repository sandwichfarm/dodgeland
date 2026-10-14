---
phase: 01-composable-solo-baseline
verified: 2026-10-14T22:01:24Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 01: Composable Solo Baseline Verification Report

**Phase Goal:** Solo players retain the exact familiar Arcade and Flow experience while the game exposes reusable, validated mode rules and lifecycle seams for future modes.
**Verified:** 2026-10-14T22:01:24Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The parity runner compares the working tree to source extracted only from immutable commit `a310a81ed6c76df4b265c9012c23b8c83f4802e5`. | ✓ VERIFIED | `tests/solo-baseline.mjs` resolves that full SHA, archives only its `src`, and fails closed if it is unavailable. `tests/solo-parity-snapshot.mjs` rejects a shared compiled directory or identical `Game` constructors. The oracle object exists locally; the fresh phase log records the immutable provenance test passing. |
| 2 | Arcade and stored `stroll`/Flow remain exactly equivalent to the immutable baseline through fixed-step state, callbacks, hazards, economy, pauses, deaths, seeds, and visible gameplay. | ✓ VERIFIED | `snapshotGame()` captures public state plus Game, RunInventory, and MobDirector future state; `runLoadedScenario()` compares it after every command and step. The fresh `pnpm test:phase1` log reports 21 differential tests and 270 retained regressions, all passing with no failure, cancellation, skip, or TODO. Muted built-artifact runtime evidence covers ten scenarios, twelve frame/theme checks, and eight wave-frame checks with no page errors. |
| 3 | The differential harness detects a real one-sided divergence and reports where it happened. | ✓ VERIFIED | `compareTracePoint()` emits scenario, command, fixed step, path, baseline, and current values; `runLoadedScenario()` applies the test perturbation before that comparison. The passed differential suite includes provenance, fail-closed history, and callback/tape sensitivity coverage. |
| 4 | The parity snapshots include every Phase-1 future-affecting private Game, inventory, and mob-director value without a production test hook. | ✓ VERIFIED | The test-only adapter records power/collision/lane-speed state, inventory RNG/fraction/sequence, director RNG draw position/timers/IDs/introduced kinds, ordered maps/sets, and callback-time state. Product source exposes no test-only getter or hook. |
| 5 | Arcade and Stroll resolve once to validated, deeply immutable rule compositions while retaining `arcade`/`stroll` seed and progress identities. | ✓ VERIFIED | `src/mode-rules.ts` validates bounds and cross-field constraints, recursively freezes definitions, brands them with a private `WeakSet`, and exports fixed Arcade/Stroll presets. `Game` accepts only branded definitions and otherwise resolves `soloModeDefinition(mode)` after seed decoding. |
| 6 | A compiled custom definition changes real game simulation, health, movement, economy, pursuer pacing, and lifecycle observations without a custom definition-name branch. | ✓ VERIFIED | `tests/mode-rules.test.mjs` uses composed definitions against real `Game`, `RunInventory`, and `MobDirector`; the named active-pursuer test passed during this verification. The named documented-authoring test also passed, proving start/progress/pause/resume/terminal events and non-default clock/movement behavior. |
| 7 | Core, rendering, audio, and development reconstruction consume the active rules while baseline public constructors, constants, and replay identity remain compatible. | ✓ VERIFIED | `Game` derives simulation, movement, health, pursuit, retention, economy, and pursuer behavior from `rules`; `Renderer` reads active movement, presentation, and time-scale fields; `Soundscape` shares that scale. `jumpDevelopmentRun()` reconstructs with `current.definition` and derives wave placement from `next.rules`. Default-compatible constants remain projections of the Arcade preset. |
| 8 | Economy cadence/capacity/pickup reach and pursuer pacing alter real production behavior under non-default rules without changing baseline ordering. | ✓ VERIFIED | `Game` passes `rules.economy` to `RunInventory`; `MobDirector` reads `game.rules.pursuers`; fixed-step differential tests cover market, cards, retained pulls, actor rebasing, and 160/320/480 mob phases. The full parity result is exact. |
| 9 | The main loop and solo presentation use the active definition at the app boundary. | ✓ VERIFIED | `main.reset()` resolves `soloModeDefinition(mode)` and passes it to `Game`; the frame loop uses `game.rules.simulation.fixedStep`; HUD, chase display, readiness copy, and Pluck meter consume active presentation/health/pursuit rules. The installed-DOM browser test exercises default, fractional, and expanded health policies. |
| 10 | A developer can copy a documented, validated composition with lifecycle observers and run it through production logic without editing input or renderer code. | ✓ VERIFIED | `docs/mode-rules.md` contains one complete exported-API example. `tests/mode-authoring.test.mjs` extracts and type-checks that exact fenced source, imports it through the normal loader, then drives a real game. |
| 11 | Existing seed schemas, saves, intents, market/cards, sound/shortcut IDs, optional-domain fallbacks, terrain schemas, and the 100-row power contract remain compatible. | ✓ VERIFIED | The exact differential matrix exercises schemas 1–3, homes, gentle settings, uint32 boundaries, market/power/mob/cleanup scenarios; the recorded built intent/runtime checks exercise storage, intents, shortcut teardown, and unavailable optional domains. `mode-rules.ts` rejects geometry changes and preserves the established regeneration default. |
| 12 | A solo player still enters Arcade or Flow in one step without a multiplayer setup surface. | ✓ VERIFIED | The visible `#play` path invokes stationary `Game.start()` and normal movement uses the same transition. The muted opaque-iframe runtime fixture verifies first-gesture Arcade and Stroll entry and subsequent movement; reviewed compact, desktop, and short-frame evidence found no setup surface. |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `tests/solo-baseline.mjs`, `tests/solo-parity-snapshot.mjs`, and the three parity suites | Immutable independent baseline comparison and full semantic traces | ✓ VERIFIED | All exist, are substantive, are invoked by `test:solo-parity`, and produced 21 passing differential cases in the fresh phase log. |
| `src/mode-rules.ts` | Validated immutable composition and released presets | ✓ VERIFIED | Composer, branding, deep freeze, validation, and presets are substantive; consumed by `Game` and shell reset. |
| `src/game.ts`, `src/market/run.ts`, `src/mobs.ts`, `src/render.ts`, `src/soundscape.ts`, `src/devtools-state.ts` | Rule-driven simulation, consumers, rendering, audio, and reconstruction | ✓ VERIFIED | Imports and call paths are active production wiring, with rule values read at each owning boundary. |
| `src/main.ts`, `src/solo-ui.ts`, `src/styles.css` | One-step app entry and active policy presentation | ✓ VERIFIED | Reset injects the selected definition; frame, HUD, and installed UI read live rules. Browser coverage proves the installed policy-derived DOM. |
| `docs/mode-rules.md`, `tests/mode-authoring.test.mjs` | Executable authoring contract | ✓ VERIFIED | The test reads the documentation, compiles its exact example, and executes it against production modules. |
| `package.json`, `tests/strict-node-tests.mjs` | Stable strict phase gate | ✓ VERIFIED | `test:phase1` runs immutable parity before regression; strict runner rejects empty, failing, cancelled, skipped, and TODO test evidence. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `tests/solo-parity*.mjs` | immutable baseline source | Git archive and distinct ESM source trees | ✓ WIRED | The suites call the snapshot runner, which calls `extractPinnedBaseline()` and `loadSources()` with distinct source directories. |
| `src/game.ts` | `src/mode-rules.ts` | constructor resolves/accepts validated definition once | ✓ WIRED | `Game` imports `isModeDefinition` and `soloModeDefinition`, retains `definition`, and exposes its immutable `rules`. |
| `src/game.ts` | economy and pursuer consumers | per-run rule groups | ✓ WIRED | Constructor injects `rules.economy`; `MobDirector` reads `game.rules.pursuers`; all update paths route through the rule-aware director. |
| `src/render.ts` and `src/soundscape.ts` | `Game.rules` | movement, visibility, and time-scale reads | ✓ WIRED | Renderer reads hop/presentation/time-scale fields; Soundscape reads world-time scale for music, lamps, bells, and warnings. |
| `src/main.ts` | `Game` | selected definition, fixed-step loop, and policy-derived UI | ✓ WIRED | Reset constructs the run with its definition; frame/HUD read `game.rules` rather than a definition ID. |
| `docs/mode-rules.md` | `tests/mode-authoring.test.mjs` | extracted TypeScript example | ✓ WIRED | The test reads, compiles, imports, and behaviorally exercises the documented source. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `Game` and consumers | `definition.rules` | validated composer or released preset resolved at construction/reset | immutable per-run policy | ✓ FLOWING |
| Main HUD/UI | active health, pursuit, presentation, and simulation values | `game.rules` from the installed `Game` | real composed values, confirmed by browser DOM coverage | ✓ FLOWING |
| Differential suites | baseline/current semantic trace | separate baseline archive and working-tree module loads | real independently compiled engines, not static fixtures | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Exact documented custom composition drives production movement, clock, lifecycle, and pause | `node --test --test-name-pattern='documented factory drives real movement' tests/mode-authoring.test.mjs` | 1 pass, 0 failure/cancel/skip | ✓ PASS |
| Active pursuer policy changes real unlocks, cadence, and cap | `node --test --test-name-pattern='custom pursuer rules drive real unlocks' tests/mode-rules.test.mjs` | 1 pass, 0 failure/cancel/skip | ✓ PASS |
| Pinned immutable baseline is resolvable and extractable | `node --test --test-name-pattern='provenance: extracts the exact immutable' tests/solo-parity.test.mjs` | 1 pass, 0 failure/cancel/skip | ✓ PASS |
| Complete parity and retained regression contract | recorded `pnpm test:phase1` at current committed HEAD | 21 differential + 270 regression passes; 0 failure/cancel/skip/TODO | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| ARCH-01 | 01-02, 01-03 | Typed, validated, composable gameplay tuning | ✓ SATISFIED | Immutable composer plus active Game/economy/mob/audio/render consumers and non-default behavior tests. |
| ARCH-04 | 01-02, 01-04 | Define a mode from rules/handlers without core input/renderer branches | ✓ SATISFIED | Executable authoring guide, lifecycle seam, real custom Game test, and rule-driven input/renderer paths. |
| SOLO-01 | 01-01..01-04 | Exact Arcade/Stroll gameplay and numerical parity | ✓ SATISFIED | Immutable 21-case per-step differential gate and 270 retained regressions. |
| SOLO-02 | 01-01, 01-03, 01-04 | Compatibility for seeds, saves, intents, market, sound, and shortcuts | ✓ SATISFIED | Schema/seed parity plus recorded built intent and opaque-iframe runtime checks. |
| SOLO-03 | 01-04 | One-step, uncluttered solo entry | ✓ SATISFIED | Visible Play/start path and muted built-runtime first-gesture evidence. |
| TEST-01 | 01-01, 01-04 | Precise differential tests plus retained regressions | ✓ SATISFIED | Pinned archive, independent loaders, exhaustive semantic snapshots, sensitivity checks, and strict aggregate gate. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/game.ts` | 519 | Stored `stroll` identity remains in `updateMobs` alongside `rules.pursuers.enabled` | ℹ️ Info | This is the relocated historical Stroll cleanup call: baseline `MobDirector.update` cleared stale mobs for Stroll. The actual spawn/pacing policy is rule-driven, and this preserves strict default parity rather than requiring a branch for a custom definition. |
| `tests/strict-node-tests.mjs` | 1, 25 | Text mentions TODO/skip policy | ℹ️ Info | These are explicit strict-gate assertions, not unfinished implementation markers. |

The recorded `napplet-conformance` result has five evidence skips: three unresolved manifest items, no emitted wire envelopes, and unmeasured lifecycle evidence. They were reported honestly and do not cover a Phase 1 must-have; the applicable built runtime checks provide the Phase 1 lifecycle and entry evidence.

### Human Verification Required

None. The supplied fresh opaque-iframe artifact evidence exercised the runtime layouts, and the parent review inspected compact, desktop, and short-frame screenshots. No untested behavior-dependent Phase 1 truth remains.

---

_Verified: 2026-10-14T22:01:24Z_
_Verifier: the agent (gsd-verifier)_
