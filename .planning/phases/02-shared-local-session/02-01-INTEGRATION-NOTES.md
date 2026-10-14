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
