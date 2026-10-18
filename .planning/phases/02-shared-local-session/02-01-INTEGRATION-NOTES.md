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

## Shared model checkpoint accepted

`96f3cc5` fixes the shared mob policy, terminal-primary retention, per-player
callback consistency, four-seat markers, occupied-device reclaim, and settled
terminal lifecycle delivery. Its actor differential passes **5/5**, preserving
the original unconditional solo return after a mob hit, including rescues.

`6a76cd5` moves new gravity pulls into post-player arbitration. The prior
counterexample (P1 at x=-0.55 starts pulling before P2 at x=0 can touch the coin)
now awards P2 exactly once. Existing pulls retain continuity; new contact and
pull candidates resolve by time, distance, and stable seat. The model also
filters participants eliminated earlier in the same frame.

Final source gates, completed with recorded exit code zero:

- Focused model/session/world/lifecycle/mob suite: **44/44** (executor).
- Immutable original-versus-current solo suite: **21/21**, no skips or failures,
  59.6 seconds; `/tmp/down-to-duck-phase2-model-final-parity.log`.
- Full solo regression: **271/271**, no skips or failures, 24.1 seconds;
  `/tmp/down-to-duck-phase2-model-final-regression.log`.
- The real spawn/RNG regression compares two eligible spawns, their complete
  mob snapshots/IDs, and shared tick/time for one, two, and four seats.

`2e2e342` only adds temporary test-module disposal, with local session tests
14/14; production source is unchanged after the final model gate. Plan 02-02
can close. Phase acceptance still requires the final 02-04 editor visual
proofs, 02-05 setup/HUD/controller main integration, and 02-06 owner hand/market
integration and phase-wide verification.

## Controller departure integration accepted

`2bce3f6` adds `GamepadRouter.release(seat)` after the regression tests in
`75a7703`. It clears active and remembered reclaim associations, seeds held
input, and preserves other controllers' repeat schedules. Root independently
reran the transport/router suites at `9ff17a3`: **31/31**, exit zero, with no
skips or cancellations (`/tmp/down-to-duck-release-review.log`).

Plan 02-05 must call this router operation when a seat leaves or returns to
solo, alongside the caller-owned session departure policy. An unassigned
controller's fresh edge is not inherently a second-player edge: main must
preserve the first solo controller path before offering Local Play for a
genuine additional controller. The actual main-loop/iframe integration is
still pending; the unit evidence does not establish that user-facing flow.

## Setup transaction handoff for 02-05

The current `LocalSession.stage(game, { roster: [] })` accepts a one-seat
stage and preserves the existing primary/world aliases. Use this to freeze
entry while keeping character/device/seat choices in a separate UI draft.
Do not reconstruct a `Game` or repeatedly recreate secondary players while
editing the roster.

On Start, validate the complete draft, preserve P1's current character/device,
apply the intended values, and create one candidate stage for the final roster.
If safe placement or validation fails, restore those two primary values and
retain the original stage. After success, cancel the empty stage and commit
the candidate once. `setCharacter` only changes the character ID; it must not
refill powers or replace inventory. Before Start, Back to solo simply cancels
the empty stage, leaving gameplay state and RNG unchanged. Plan 02-05 must
prove both the cancel path and successful identity-preserving adoption using
actual production objects and built runtime evidence.

## Plan 02-05 integration review cases

The first implementation draft exposed the following concrete cases to cover
before accepting the combined setup/router/HUD:

- Leaving P2 from a three-seat roster must allocate the next entrant to the
  first free seat, without duplicating P3.
- Keyboard profiles resolve to the seat assigned that device; two controller
  seats followed by a keyboard seat must not send keyboard movement to P2.
- Back to solo/reset restore the valid sole controller lease. A disconnected
  solo controller must reclaim without requiring an existing LocalSession.
- Controller confirm activates the current menu while paused, and the first
  solo controller retains the original one-action start behavior.
- Candidate-stage uniqueness validation sees P1's intended device, with both
  character and device restored if placement/validation fails.
- Scene and HUD identities use the same geometric marker and P-number, rather
  than repeating the model's current `P1` marker string twice.

`abc4812` initially added source-regex checks for helper names. These do not
prove any behavior and are **not accepted integration or coverage evidence**.
The executor must supersede them with production-object/built-iframe assertions
that fail on the actual ownership, lease, or navigation counterexample and pass
only after its behavior is repaired. These cases remain unverified at this
review checkpoint; source edits alone do not close Plan 02-05.

## First behavioral controller flow

The working-tree fixture supersedes the source-regex guard with a real built
opaque iframe. Its latest recorded run passed **1/1** in 1.76 seconds, including
an actual visible Start click, two-seat forward progress, disconnect, held and
neutral input remaining unreclaimed, a later fresh reclaim, and one transport
unsubscribe (`/tmp/down-to-duck-02-05-runtime.log`, 2026-10-14 17:52 local).
The setup-to-session commit now explicitly seeds controller leases; waiting
for a later context observation had swallowed the first movement edge.

This is only the first wire-path scenario. Per-seat exclusive movement,
mixed four-seat input, the injected binding path, calls, cancel/adoption,
and the full responsive matrix remain required. Root inspected the saved
900px artifact and found it was taken after pagehide, with both players
marked disconnected; it is not accepted as live-HUD visual proof. Capture
live state before teardown, and separately verify teardown ignores late
callbacks. The world label currently overlaps a HUD identity, and world
labels still need the same geometric markers as the HUD. Plan 02-05 remains
in progress.


### First-activity review at 7d786e4

Neutral controller connections no longer claim P1. The first fresh controller edge
claims solo P1 and remains available for the initial action; the initial built wire
flow remains passing. This is a checkpoint, not Plan05 acceptance.

Root executed the production GamepadRouter through the source loader with two
neutral pads followed by simultaneous fresh confirm buttons. The first pad claimed
P1 and its confirm changed context from `solo:ready` to `solo:playing`. The second
pad was seeded by reconcile's context mismatch and never requested setup. Observed
events: `claim:0`, `p1:confirm`; expected additional `setup:1`. The executor owns
the correction and focused/browser regressions. Pre-existing held controls and
join/reclaim consumption must remain protected.

### Setup control review at e6e28d3

Current `move` setup branch rotates focus only between Start and Back;
`confirmMenu` starts for every focused control other than Back. Full setup
acceptance therefore needs controller navigation/activation of actual seat,
traveler, leave, and binding-editor controls, plus retained focus after render.
This includes protecting a focused editor action from accidentally starting play.

`addKeyboardSeat` currently offers only Keyboard B. When P1 belongs to a
controller, Keyboard A remains unused and unavailable to join, preventing a
four-seat combination of two controllers and both keyboard profiles. Offer the
remaining available keyboard profile by actual assignment; retain correct
profile-to-seat routing and labels. Executor owns both corrections and browser
regressions. These are pending findings, not passing proof.

### Same-snapshot context guard counterexample

Root exercised the proposed snapshot-wide context preservation with two already
assigned controllers. P1's Start button changed `session:playing` to
`session:paused`; P2's simultaneous fresh confirm then activated the newly opened
menu and resumed play. Observed actions: `p1:pause`, `p2:confirm`; final context
was `session:playing`. This is not the intended join exception. The correction
must retain fresh unassigned joining activity while seeding assigned-seat input
across a new modal/context boundary. Executor notified; regression pending.

### Executable setup component regression guards

Root added `tests/session-board-controls.test.mjs` in 2eb3d12, with the
open-seat visibility assertion strengthened in 822774c. It compiles the actual
production UI dependency graph through the existing source loader and runs it
in a muted opaque iframe. Fixture callbacks supply only the roster/editor owner
contract; it is component evidence, not built-main/controller/adoption evidence.

The initial run exited 1 with 1/4 passing: both keyboard profiles and actual
P3/P4 editor labels passed; selected chip focus, focus after leaving a seat, and
compact open-seat selection failed. Log:
`/tmp/down-to-duck-session-board-controls.log`. Browser and server were closed.
The setup executor owns the corresponding product fixes and broader integration.

### Root regression rerun after pending setup corrections

On the executor's current working source, the component suite now passes 4/4
(exit 0, no skips/cancellations), including the visible compact open-seat
instructions assertion. Root also ran `tests/session-input.test.mjs`: 16/16
passed (exit 0), including simultaneous first join and assigned-seat pause/confirm
isolation. Logs: `/tmp/down-to-duck-session-board-controls.log` and
`/tmp/down-to-duck-router-context-review.log`. Product source remains executor
owned and pending commit; these narrow checks do not accept the full Plan05
built-main/call/adoption/HUD requirements.

### Readiness and integrated-layout follow-up

66c26aa adds a fifth production component case: with three drafted seats and
P2 disconnected, Start remains enabled even though main rejects that unresolved
roster. Initial result 4/5 pass, exit1;
`/tmp/down-to-duck-session-board-readiness.log`. The executor is aligning Start
enablement/reasons with whole-roster readiness.

The built four-seat flow also found Add Keyboard outside the 900x600 frame.
This is a distinct integrated-layout failure despite passing component focus
checks. Source correction remains with multiplayer_phase2_setup.

To advance Plan05 without source conflicts, multiplayer_phase2_owner is now
assigned only new `tests/local-session-layout.mjs` and its artifacts as Plan05
support. It must coordinate the shared browser slot and inspect real matrix
screenshots. Product source/build/Plan05 SUMMARY stay setup-owned. Plan06 is
still prepared but not released.

### Four-seat checkpoint and actual assigned-call proof

Executor committed 6f2a36b after the built four-seat flow passed. The earlier
900x600 Add Keyboard failure is corrected in that slice. The independent layout
matrix (1b59894, corrected contract c98d13d) remains RED at240x240. Root inspected
`artifacts/local-session-layout-setup-240x240-dark.png`: tall single-letter control
columns cover the view. Real16px labels,44px targets and persistent seat identity
remain required; pseudo-label/font shrinking is not an acceptable substitute for
compact pages.

Root added `tests/local-session-audio-runtime.mjs` (bd8b3c3). It records actual
AudioContext PCM buffer fingerprints with Chromium muted, calibrates five solo
traveler calls through visible controls, then starts four real mixed-device seats
(Sunny/Butter/Pip/Petal) while the saved host traveler remains Rust. No product
debug hook or fabricated audio callback is used.

Its first run caught a real solo-ready regression: setup `:has()` CSS matched a
board under hidden `#local-session-setup`, hiding both ready content and Start.
Root inspected the blank paper screenshot
`artifacts/local-session-audio-failure-sunny.png`; the accompanying JSON confirms
ready state, hidden setup, matched selector and display:none controls. Executor
scoped selectors to the visible setup root and rebuilt. Root then obtained exit0,
1/1 passing for visible solo calibration, setup call guard, actual four assigned
calls, simultaneous independent cooldowns, held suppression and cooldown expiry.
Evidence: `artifacts/local-session-audio-runtime.json`,
`/tmp/down-to-duck-local-session-audio.log`.

Follow-up de43faa adds pause-after-cooldown and actual mute/unmute assertions;
these new assertions await the next built-artifact run and are not yet claimed
passing. Product source/build slot remains setup-owned, layout test/artifacts
remain support-executor-owned, and audio/component tests remain root-owned.
