# Plan 02-01 integration checkpoints

Recorded during the in-progress tracer, 2026-10-14. These are unfinished-work
checkpoints, not a completed phase review. Keep the requested shared simulation
and independent players as the target; passing movement alone is insufficient.

## Reproduced with the real source loader and model

| Case | Observed | Required behavior |
| --- | --- | --- |
| Primary terminal, secondary alive | `new Game(113, 'pond', 'arcade', false, [], 'butter')`; stage/commit with Pip; invoke the existing traffic terminal operation. P1 is dead and P2 playing. `session.update(1 / 120)` increments `simulationTick` from 0 to 1 but leaves world time at 0. | World time and actors advance once while the session policy permits surviving players to continue. A diagnostic counter cannot substitute for actual advancement. |
| Adoption after retention pruning | Place the real Game at row 200 and run its row maintenance. Row 0 is absent. P2 now spawns on row 200 with wallet 0, fixing the earlier nonexistent-row spawn, but inherits `maxY = 200`. | World placement/frontier must be distinct from earned personal progress. First newly earned tile must not grant past coins, markets, regeneration, or future revival credit. |
| River adoption | Seed 1, pond, Stroll; river row 4; primary X = -4 has `platformSupports(...) === true`. Staging Pip chooses X = -5, where the same production support predicate is false. | Reserve a safe distinct supported/land position, or defer/reject setup if none exists. An unblocked cell is insufficient on a river. |

The audit compiled the real `game` and `session` modules with
`tests/source-loader.mjs`, then disposed its temporary directory. No product
hooks or source edits were used for these observations.

## Architecture and proof checkpoints

- The current `alias(owner, host, keys)` does transfer values to the new owner
  and forward the original Game fields through accessors. This is genuine
  field ownership; retain exact private-state parity during further extraction.
- The initial secondary movement/timer implementation duplicates a subset of
  Game behavior. Replace it with shared production operations for movement,
  hazards, powers, progress, and terminal handling. Do not leave a simplified
  second-player engine behind the interface.
- Each player needs its own RunInventory. This was corrected from the first
  tracer draft; retain the original primary inventory identity during adoption.
- A cancelled stage must never become a committed session later. This guard
  was added; retain it and cover repeat/invalid transaction calls.
- Browser evidence must drive the built application's visible Local Play
  controls in an opaque iframe. A separate fixture UI importing the model does
  not prove app integration. The test worker has replaced that initial fixture.

Close these checkpoints through production-model/browser assertions before
claiming the corresponding Plan 02-01 acceptance criteria.

## Follow-up source audit

The current implementation is still a work in progress. The following concrete
paths need correction and behavioral evidence before Plan 02-01 is complete:

- `Renderer.drawSession` calls the full solo draw, then paints additional seats.
  Consequently additional actors bypass world depth sorting and river surface
  height; the camera still follows primary `maxY`, and only secondary actors get
  world identity labels. Submit every traveler to the common actor ordering and
  use the multiplayer camera policy while preserving the exact solo adapter.
- `openLocalPlay` rejects every state except `ready`. The model adoption API
  alone cannot prove the required progressed-run adoption through the app.
- The `localSession.running` frame branch advances independently of pause,
  focus, and minimum-frame safety. `moveLocal` also bypasses existing hand/menu
  navigation guards. Session suspension must cover all players and the world.
- The current tracer has one model test and one built-runtime movement test,
  plus a source-string check. It does not yet prove invalid stage transitions,
  supported joins, independent hazards/inventories, personal earned progress,
  primary-terminal world continuation, or lifecycle cleanup. The built test
  invokes real registered shell action handlers; native keyboard delivery is
  a separate later-plan requirement and must not be claimed by that test.
- Artifact freshness currently checks only `main.ts` and `session.ts`; changes
  to the game, renderer, styles, and markup can otherwise leave browser evidence
  stale. Model tests should remain runnable without a built-artifact dependency.

On resumption, retained test handle `46838` returned `Unknown process id`.
This is not a passing test result; recover its log/process result or run the
appropriate gate after source changes settle.

## Resolved checkpoints and remaining work

- `ecf28d6` moves all traveler bodies, spills, trails, and rescue effects into
  the common world draw layers. Both travelers have identity labels. The shared
  camera follows the leading active interpolated position and retains its last
  position when every traveler is terminal. `node --test tests/render.test.mjs`
  passed 19/19, including the 24 exact archived/current solo pixel cases.
  New browser assertions prove secondary foreground occlusion, raised platform
  support, roster-order invariance, and camera behavior. Root inspected
  `artifacts/local-session-render-foreground.png` and
  `artifacts/local-session-render-river.png`.
- The unsafe temporary reactivation of a terminal primary was removed in
  `27f1add`. A bounded actual-source audit confirmed that the primary's wallet,
  idle time, coin callbacks, and death callbacks remain unchanged while the
  world clock advances with a living companion. Clock-only continuation is
  still an intermediate implementation: common hazards, wave, and director
  work must continue through the shared engine.
- The retained replacement immutable model gate `74766` completed successfully:
  21 tests, no failures, original baseline `a310a81`. This proves the checkpoint
  tested; common-operation extraction still needs its own parity result.
- App-level staging now freezes the existing loop, supports pause → Local Play
  during a progressed run, restores the same run on cancel, and resumes its
  adopted primary on commit. Session pause/focus/size/menu guards cover both
  players independently of primary death. Late preference hydration cannot
  replace staged or active character/world identity. Setup has a labeled modal
  role and contained Tab focus, and page teardown stops the session.
- The built opaque-iframe tracer passes its expanded scenarios: progressed
  adoption/cancel, shared scene/seat pause, ignored secondary input during
  pause/blur/undersize, delayed hydration before/after commit, and setup focus
  wrap. The current suite has three test cases with multiple assertions; this
  is not a claim of completed phase coverage. The existing built solo smoke
  test also passed 10 scenarios, 12 frame/theme checks, and 8 wave checks.
- Root inspected the successful built tracer's 900×600 captures
  `artifacts/local-session-setup.png` and `artifacts/local-session-active.png`.
  The staged live course is dimmed, the setup board is centered with visible
  focus, and both actual travelers have world labels. Plan 02-05 still must fix
  overlapping seat/world HUD labels and the small, low-contrast setup legend;
  these captures do not establish final responsive UI acceptance. A later
  node-only tracer run correctly rejected a stale bundle after the ongoing
  engine refactor changed production source; retain the earlier passing
  snapshot as checkpoint evidence, not evidence for those later source edits.

Plan 02-01 remains incomplete. A dedicated executor is extracting common
player/world operations in `src/game.ts` and `src/session.ts`; the simplified
secondary movement/timer path must be replaced and independently exercised.
Plan 02-02 retains ownership of the multi-target MobDirector contract and
all-player impact arbitration. Neither the shared session plan nor a
multiplayer game mode is complete yet.

## Committed shared-operation and app checkpoint

- `3decf04` replaces the simplified companion simulation with shared production
  player operations and typed per-seat callbacks. The new
  `tests/session-player.test.mjs` passes 5/5 and type-check passes.
- `fa97764` commits app staging, safety, hydration protection, focus containment,
  and the expanded tracer. The final `pnpm build && node --test
  tests/local-session-tracer.mjs` passes 3/3 against the committed core.
- The earlier long parity process has exited and covered an earlier source
  snapshot. Executor is running one final gate against frozen source. This
  checkpoint is not yet Plan 01 completion; architecture/acceptance reconciliation
  and the final parity result remain required.

## Wave2 handoff audit

Frozen production passed immutable21/21, explicit owner-map21/21, final
solo regression270/270, render19/19 (24 exact original pixel cases), built
tracer3/3 including double-pagehide cleanup and solo return, runtime10/12/8,
and type-check. Regression's three devtools failures were test JSON cycles;
cycle-aware complete snapshots now preserve maps/sets and pass.

Two confirmed model defects remain, assigned as mandatory first fixes to02-02:

1. P2 onCoin dispatching P1 forward moves P2 because Game is temporarily rebound.
   Game71/Pond/Stroll, meadow rows, P1x2/P2x0 bothy0, coin row0, then update(0):
   dispatch returns true, P1y0, P2y1. Use permanent player contexts.
2. P2 regeneration omits its onHeal handler. Set its earnedDistance/maxY/y/fromY
   to99 and health2; advance world frontier, generate meadow rows, dispatch
   forward. It throws `this.onHeal is not a function`. Test typed per-player
   callback delivery at the actual threshold.

The checkpoint does not complete ARCH-03, INPUT-02, UI-01, or UI-02 in full.
Wave2 model, controller, and keyboard executors now own their reviewed plans;
final phase acceptance must resolve these defects and all remaining UI/input
requirements.

## Wave 2 adversarial review

The permanent player contexts now pass the nested reward callback and P2
regeneration regressions. Model commit `d7863f7` also captures pre-update ground
samples and advances pursuit from the shared frontier. Root's
`tests/session-world.test.mjs` (`4dc82fc`) proves actual post-grace wave motion
for 1/2/4 seats, composed world-clock rules, Flow behavior, fractional ground
sampling, and shared terrain/traffic independence from personal cards.

That test file also records two production failures at `d7863f7`: P1's freeze
power stops the shared mob director, and a terminal P1 at row 0 culls mobs next
to a living P2 at row 12. Both belong to the shared director policy fix.
`tests/session-lifecycle.test.mjs` (`40417e4`) independently exposes movement
after device loss, reclaiming an occupied device, and notification of the first
death before the second participant's terminal statistics/status have settled.

The immutable solo comparison at `d7863f7` completed with **20 passes and one
failure**, not a timeout: after a fatal wasp contact, the second mob advances
one extra fixed step. Trace: command 1, step 195,
`trace.game.mobs.actors[1].phaseLeft`; baseline
`0.18333333333342527`, current `0.17500000000009241`.
Restore the original solo early return; keep all-participant resolution only
on the multiplayer path. Log: `/tmp/down-to-duck-phase2-world-parity.log`.

Plan 02-03 is complete with 28 transport/router tests plus muted transport-only
iframe evidence. Its input requirements remain pending until 02-05 integrates
the router into the actual main loop and 02-06 passes the full phase gate.
Keyboard editor visual review found pale text on the pale board and truncated
profile labels; 02-04 owns correction and fresh compact/regular screenshots.
No multiplayer mode or Phase 2 completion is claimed at this checkpoint.
