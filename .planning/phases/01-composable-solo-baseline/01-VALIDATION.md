---
phase: 01-composable-solo-baseline
status: planned
baseline: a310a81ed6c76df4b265c9012c23b8c83f4802e5
requirements:
  - ARCH-01
  - ARCH-04
  - SOLO-01
  - SOLO-02
  - SOLO-03
  - TEST-01
---

# Phase 1 Validation Contract

## Evidence order

1. `01-01` establishes the immutable baseline differential harness before any product edit.
2. Every later product task runs its focused behavioral tests and `pnpm test:solo-parity` before completion.
   Plan 01-02 also compares real default Arcade/Stroll canvas pixels with the archived baseline in the same browser; nonblank scene assertions prevent empty-frame false passes.
3. `01-04` runs the complete model gate, muted browser evidence, type/build/guidance/conformance checks, and records the exact results in its SUMMARY.

No AST, source-text search, type-check, or snapshot-file presence is sufficient evidence for a gameplay requirement. Those checks may support a behavioral test but cannot replace execution of production Game, RunInventory, MobDirector, development reconstruction, Renderer, Soundscape, or the built opaque iframe. Parity-only visibility stays in test adapters; production getters/debug hooks created solely for the harness are forbidden.

## Requirement-to-evidence matrix

| Requirement | Required observable evidence | Owning plan/task | Gate |
|-------------|------------------------------|------------------|------|
| ARCH-01 | Validated deep-frozen groups reject invalid policy; non-default values change real Game/economy/mob behavior and survive development jump reconstruction | 01-02 T1/T3; 01-03 T1/T2 | `node --test tests/mode-rules.test.mjs tests/devtools.test.mjs` |
| ARCH-04 | Documented custom definition plus lifecycle observers runs without definition-ID branches in Game input/Renderer and its active rules survive a devtools jump | 01-02 T1/T2/T3; 01-04 T2 | mode-rules/devtools tests + `docs/mode-rules.md` review |
| SOLO-01 | Exact baseline/current visible state, all future-affecting private state, and ordered callback equality after every operation/step for both modes and the full scenario matrix | 01-01 T1/T2/T3; all later tasks | `pnpm test:solo-parity` |
| SOLO-02 | Pinned schemas/hashes, seed round trips, market/card behavior, intents, saves, sound/shortcut IDs, and optional-domain fallbacks pass | 01-01 T2; 01-04 T1/T2 | `pnpm test:phase1`, `pnpm test:intents`, `pnpm test:runtime` |
| SOLO-03 | Built default solo reaches active play through the existing first gesture with no setup surface | 01-04 T1 | `pnpm test:runtime` |
| TEST-01 | Pinned Git provenance, independent modules, one-sided real-runner sensitivity with precise diagnostics, complete private future state, full differential matrix, and legacy regressions all pass with no ignored failures | 01-01; 01-04 T2 | `pnpm test:phase1` |

## Differential snapshot minimum

The semantic adapter records exact values and callback order after each operation/fixed step. It uses test-only JavaScript access to TypeScript-private runtime fields and an RNG draw-position wrapper installed before the first MobDirector draw; it does not add any product getter, debug export, or harness hook:

- run state; x/y/from and ground interpolation; hop; maxY; world/idle clocks;
- health, hurt recovery, regeneration, wave/trail state, warning, reason, and death cause;
- character/power readiness, rescue, landing grace, and existing 100-row charge behavior;
- Game private `powerReadyAt`, `powerNotice`, `powerLandingGrace`, `healedMilestone`, ordered `touchingCars`, and exact `laneSpeeds` weak-map entries (`base`, `applied`) for every retained lane, serialized deterministically by stable lane index/identity; collision-latch and live actor-speed-rebase arenas must explicitly exercise these fields;
- ordered retained lanes with stable identity, actor samples, coins/pulls/denominations, and generated-row boundaries;
- mobs with IDs, kinds, positions, targets, phases, durations, and every future-affecting MobDirector value: deterministic RNG seed/draw position, `nextId`, `nextSpawn`, `lastSpawnScore`, `retryAt`, `spawnDelay`, `modifierRetryAt`, and ordered `introduced` kinds;
- wallet/run coins, cards/powers/cosmetics/effects/capacities, market invitation/offers, pending packs, and every future-affecting RunInventory value: RNG `state`, `fraction`, `maxScore`, `sequence`, and `equipped`;
- death-spill contents/clock and evidence that terminal observers see cleared inventory;
- move/transaction results plus ordered coin, hurt, heal, power, mob, and end callbacks.

Only an existing public actor snapshot that already rounds cross-engine samples may retain its documented 1e-9 rounding. Same-process Game values use exact equality.

The sensitivity test calls the ordinary `runDifferentialScenario`/trace capture/comparison entry point. At one named Arcade command and fixed step it injects a callback perturbation on the current side only, and asserts the thrown diagnostic names the scenario, command, step, and callback/field path. It then runs the identical tape without the hook and passes. Changing a detached or copied snapshot and merely proving `assert.deepEqual` throws is not valid evidence.

## Scenario coverage

The differential runner covers both `arcade` and stored identity `stroll`, schemas 1/2/3, every `HOME_IDS_V1` home, gentle on/off, uint32 seed boundaries, and every released traveler. Plan 01-01 Task 2 owns bounded groups 1-4; Task 3 owns bounded groups 5-10. Both use the same aggregate command, full semantic adapter, and per-operation/step comparison. Deterministic command tapes plus focused paired fixtures must reach:

1. accepted/rejected movement, side/back travel, fractional drift, and unique furthest progress;
2. rear/side/front vehicle sweeps in both directions, trains, exact-touch safety, water/drift, wave, trail, and mob deaths;
3. shield/innate-power priority, landing grace, recovery, repeated hazards, 100-row cooldown, and regeneration boundaries;
4. real time versus world time, including Stroll .58 and unchanged hop/rescue/temporary-power durations;
5. pause/resume, invitation expiry, market/pack freezes, replacement/skip/sales/capacity, and offer continuity;
6. structural row effects and live actor-speed rebase/freeze/release without teleport;
7. all denominations, base/card gravity, retained pulls, safe river landing, and exact-once income callbacks;
8. actor progression past 50/100/150/400 and mob progression at 160/320/480 with deterministic pacing;
9. pruning, extreme-distance generation, and all schema round trips;
10. spill snapshot/cleanup and isolation of the later visual clock from dead gameplay.

## Active-definition reconstruction

- `jumpDevelopmentRun` passes the current validated definition through both seed-backed and unregistered-world Game reconstruction paths.
- Teleport wave placement reads the reconstructed Game's active pursuit trail rule; `src/devtools-state.ts` no longer imports the baseline `WAVE_TRAIL` value.
- A non-default definition is asserted both on the returned Game and through real movement/update behavior after the jump.
- Default Arcade and Stroll jumps preserve prior score, row, pause, catalog, character, callback, and wave-offset behavior.
- Loading a different replay code intentionally resolves that code's decoded solo preset and does not leak the previous custom definition.

## Final commands

Each command is a separate fail-closed gate. Browser-owning tests must launch Chromium with `--mute-audio`; conformance output must be read and any manifest/wire/lifecycle skip reported as a skip.

| Command | Evidence |
|---------|----------|
| `pnpm test:phase1` | Immutable differential gate followed by focused model regressions; no failed/cancelled/skipped tests |
| `node --test tests/devtools.test.mjs` | Active custom definition survives real jump reconstruction; default and replay-load behavior stays compatible |
| `node --test tests/render.test.mjs` | Muted baseline and non-default render/model behavior |
| `pnpm test:intents` | Muted built schema 1/2/3 and mode intent compatibility |
| `pnpm test:runtime` | Muted opaque-iframe one-step solo, input, save, IDs, and optional-domain behavior |
| `pnpm type-check` | Public and internal TypeScript contracts compile |
| `pnpm build` | Production single-file artifact builds |
| `pnpm test:guidance` | No forbidden native/shell authority or applet-contract regression |
| `pnpm test:conformance` | Built artifact conformance; inspect and report skips |
| `git diff --exit-code -- pnpm-lock.yaml` | No dependency or supply-chain change |

## Locked decision map

The Phase CONTEXT bullets are referenced in plan tasks with these stable IDs:

| ID | Locked decision | Covered by |
|----|-----------------|------------|
| D-01 | No solo gameplay/timing/RNG/persistence/input/visible change; keep stored `stroll` | 01-01, 01-02, 01-03, 01-04 |
| D-02 | Preserve exact update, hazard, effect, and death ordering | 01-01, 01-02, 01-03, 01-04 |
| D-03 | Keep 100-row innate powers distinct; no 250-row revival here | 01-01, 01-02, 01-04 |
| D-04 | Baseline is exact immutable a310a81, never current-vs-current | 01-01 |
| D-05 | Freeze schemas/generator/geometry/epsilon contracts | 01-01, 01-02, 01-03, 01-04 |
| D-06 | Small typed immutable validated groups; no ECS/interpreter/dependency/editor | 01-02, 01-04 |
| D-07 | Extract named policy numbers and make each drive behavior | 01-02, 01-03 |
| D-08 | Preserve public APIs/constants; active consumers use active rules | 01-02, 01-03, 01-04 |
| D-09 | Prove strict defaults and real non-default composition; document example | all plans |

## Multi-source coverage audit

| SOURCE | ID | Feature / constraint | Plan | Status | Notes |
|--------|----|----------------------|------|--------|-------|
| GOAL | — | Exact familiar Arcade/Flow plus reusable validated rules/lifecycle seams | 01-01..04 | COVERED | Baseline first, extraction under gate, app/docs closure |
| REQ | ARCH-01 | Typed validated composable gameplay tuning | 01-02, 01-03 | COVERED | All extracted fields have production consumers and non-default tests |
| REQ | ARCH-04 | Definition from rules/handlers without core branches; document example | 01-02, 01-04 | COVERED | Compile-time example executes against production Game |
| REQ | SOLO-01 | Exact Arcade/Stroll gameplay and numerical parity | 01-01, 01-04 | COVERED | Per-step exact semantic differential plus legacy suite |
| REQ | SOLO-02 | Seed/save/intent/market/card/sound/shortcut compatibility | 01-01, 01-04 | COVERED | Model plus built muted runtime/intent evidence |
| REQ | SOLO-03 | One-step uncluttered solo entry | 01-04 | COVERED | Opaque-iframe user gesture assertion |
| REQ | TEST-01 | Baseline-vs-composed differential plus retained regressions | 01-01, 01-04 | COVERED | Pinned provenance, real-runner one-sided sensitivity, complete private future state, bounded matrix slices, aggregate gate |
| RESEARCH | — | Preserve exact Game update/arithmetic/RNG order | 01-01..03 | COVERED | Snapshot/order assertions guard each extraction slice |
| RESEARCH | — | Per-run rules; no mutable global; default-compatible constructors | 01-02, 01-03 | COVERED | Definition resolved once and passed to instance consumers |
| RESEARCH | — | Adversarial harness and import-sensitive legacy suites | 01-01, 01-04 | COVERED | One-sided perturbation through ordinary trace comparison plus focused regression command |
| RESEARCH | — | Preserve future-affecting state through parity and reconstruction | 01-01, 01-02, 01-03 | COVERED | Test-only private-state adapters and active-definition devtools jump tests |
| RESEARCH | — | Muted browser execution | 01-02, 01-04 | COVERED | Repository-owned launchers used by phase gain mute flag |
| CONTEXT | D-01..D-09 | All locked decisions | 01-01..04 | COVERED | Traceability listed above |

## Explicit exclusions

Shared session/player state, multiplayer UI/input, revival/consumables, Relay, Race, cross-mode presentation, and PR/release evidence remain mandatory in Phases 2-7. Phase 1 neither implements nor removes them. No native network, browser storage, host DOM, native gamepad polling, new NAP/domain, package dependency, or downloadable executable mode is introduced.
