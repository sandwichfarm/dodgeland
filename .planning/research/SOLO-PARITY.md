# Solo parity evidence and strategy

## Baseline and evidence actually collected

Inspected 2026-10-14 on `feat/local-multiplayer`.

Baseline commit:

```text
a310a81ed6c76df4b265c9012c23b8c83f4802e5
chore: initialize Down to Duck repository
```

`git diff --exit-code a310a81 -- src tests` returned exit 0 before the rules
extraction. Thus the source and tests exercised below match that commit.

Executed:

```bash
node --test tests/game.test.mjs tests/seed.test.mjs tests/health.test.mjs tests/character-powers.test.mjs tests/market-engine.test.mjs tests/mobs.test.mjs tests/actors.test.mjs tests/actor-integration.test.mjs tests/magnet.test.mjs tests/log-coin-gravity.test.mjs tests/death-spill-integration.test.mjs
```

Observed result: **134 tests passed, 0 failed, 0 skipped**, duration
2998.740417 ms. These are Node model tests and did not play audio. This is
baseline evidence, not proof that a future extraction has parity.

## Executable differential harness

`tests/source-loader.mjs:9–60` already supports an alternate source directory:
`loadSources(entries, sourceDirectory)`. It recursively follows local imports,
transpiles TypeScript and expands the actual market catalog's eager discovery
glob. Each load has an independent temporary module tree.

Before changes, capture the baseline source from the exact commit in a
test-only immutable fixture or extract it from Git into a temporary directory
when running the parity suite. Pin the commit and fail clearly if it is
unavailable; never silently compare current source against itself. A committed
fixture avoids shallow-checkout dependencies but should be provenance-marked
and excluded from production discovery/builds.

Load baseline and current `game`, `run-seed`, `levels/index`, `mobs` and
`market/catalog` independently. Feed equivalent commands and fixed `1/120`
steps to each implementation. Compare after every command/step so a transient
collision, payment or timing mismatch cannot disappear in a final summary.

Use an explicit semantic snapshot rather than serializing the entire class:
the class layout is expected to change. Keep Map iteration order where it
affects simulation, and record callback order with callback-time state.

Snapshot fields:

- State; x/y/from positions; ground interpolation; hop; maxY; world time and
  idle; health and recovery.
- Wave position/contact/countdown, reason and death cause.
- Character identity; power readiness, cooldown, rescue and landing state.
- Ordered lane state with stable world ID; actual actor samples; coin
  denomination/position/pull; retained attracted rewards.
- Mob IDs, kinds, physical positions, targets, phases and timing.
- Wallet and run coins; cards, powers, cosmetics, effects and capacities;
  market offers/window; pending pack; inventory revision where observable.
- Death-spill snapshot and animation clock.
- Move/transaction results plus ordered coin, hurt, heal, power, mob and end
  callbacks. Verify inventory is already cleared in terminal callbacks.

Run both sides in one process. Gameplay floating-point state should match
exactly under the same operations; do not hide drift with a broad tolerance.
The existing actor snapshot intentionally rounds only cross-engine samples to
1e−9, which does not justify relaxing same-process model parity.

## Required scenario matrix

Cover Arcade and Flow (`stroll`), every supported terrain schema, all homes,
gentle settings, uint32 boundary seeds and all traveler powers. Use deterministic
input tapes plus focused arena fixtures; random wandering alone usually dies
before reaching late-game systems.

1. Ready → first hop; accepted/rejected cardinal movement; fractional personal
   grid after drifting; side/back movement and unique furthest-row scoring.
2. Real swept rear/side/front car contacts in both directions; trains, water,
   drift edge, wave, trail and mob deaths; exact-touching safe cases.
3. Innate powers, shield priority, hurt recovery, landing grace and repeated
   hazards; 100-new-block cooldown and regeneration boundaries.
4. Real-time versus world-time behavior, especially Flow's `.58` factor and
   unchanged hop/rescue/temporary-power durations.
5. Pause/resume, open/close market, expired invitation, pending paid pack,
   replacement, skip, sales, card capacity and seeded offer continuity.
6. Structural cards on newly generated rows; live speed rebasing, timed freeze
   and release; no actor teleport or collision/render disagreement.
7. All denominations, default gravity, card gravity, captured-coin retention,
   safe river landing before award and exact-once income callbacks.
8. Checkpoints past rows 50/100/150/400 for actor variety and 160/320/480 for
   mob progression; deterministic spawn pacing and attack phases.
9. Terrain pruning, extreme-distance generation and schema round trips.
10. Death snapshots/cleanup and separate spill animation; subsequent updates
    cannot change dead gameplay, cause, wallet or callbacks.

## Highest-value existing regression evidence

| Suite | What it proves |
| --- | --- |
| `tests/seed.test.mjs` | Pinned terrain/content hashes, RNG vectors, schema-specific actor trajectories and denomination metadata, immutable published content and canonical codes. |
| `tests/game.test.mjs` | Movement, boundaries, world streaming, wave behavior, baseline hazards and fractional-grid pickup behavior. Supports `DOWN_TO_DUCK_GAME_SOURCE_DIR` for alternate-source runs. |
| `tests/health.test.mjs` | Actual damage by vehicle face, interpolated/swept contact, chassis alignment, contact latching, recoil, immunity and regeneration. |
| `tests/actors.test.mjs` | Progressive actor recipes, safe headways, sports acceleration, platform variety and deterministic arbitrary-time queries. |
| `tests/actor-integration.test.mjs` | Real Game collisions/support with trucks, sports cars and variable platforms, plus live effect rebasing. |
| `tests/character-powers.test.mjs` | Every traveler matching hazard, cooldown, priority, safe rescue, progress invariants and grace. |
| `tests/market-engine.test.mjs` | Real engine/economy boundaries, pack freezing, card effects, shield paths, coin income and catalog mode filtering. |
| `tests/magnet.test.mjs` | Visible attraction, manual contact, safe pickup, expiration/sale continuity and deterministic trajectories. |
| `tests/log-coin-gravity.test.mjs` | 1,161 actual ride/hop collection scenarios across offsets, modes, directions, platform models, schemas and denominations. |
| `tests/mobs.test.mjs` | Progress/time gated arrivals, pacing, target motion/easing, terrain routing, collision, pause and bounded population. |
| `tests/death-spill-integration.test.mjs` | Snapshot-before-cleanup ordering, real fatal contacts, exact-once spill and visual-clock isolation. |

Pinned expectations already present in `tests/seed.test.mjs`:

- Schema 1 terrain sample: `c0a8ccde3e2b061823b2ff58fb5e44db300936e2a8e5ddae25467543de5cd7bc`.
- Published world models: `4df65c0df76fd12c84ae10e53e23c9fb5c0bbfa984a5821e00c686736a43027d`.
- Initial schema 1 games: `cf9786d3d8900f3e38167a7ff6129bb10ff5879162727bbbdd7cbb40d0e6d6d9`.
- Schema 2 actor recipes/trajectories: `b5bb938f21445539b1891965028fcc844d87b639528691af672d54eea38cc732`.
- Schema 3 denomination locations/rolls: `d8343cf683a490c97fa6ec497ad85270e03b80f0bacb493a85bbe1cf4dc08a84`.

## Extraction cautions

The exact update order is documented in `../codebase/ARCHITECTURE.md`.
Reordering inventory expiration, hazard resolution, collection or callbacks is
a behavior change even when most tests pass.

Preserve serialized `stroll`, old seed codes and terrain schema constants.
Existing innate powers recharge at 100 new blocks; add multiplayer revival's
250-block charge separately. Baseline pickup gravity is `.1` on top of the
half-tile capture reach; new non-coin consumables should use that base reach
without inheriting coin-card modifiers.

Do not count the old regression suite alone as a 1:1 proof. The phase gate is
the combination of immutable-baseline differential execution, pinned terrain
fixtures and existing focused suites. Later multiplayer phases must continue
running this solo parity gate.
