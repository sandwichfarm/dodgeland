# Paused world must reject every traveler movement

Pre-edit review at e7369ed (plus documentation26528f6). Game source
f783839e0a6bfc98eb2a0a4e35e381e9002daafb0ced9832dcbfe1b4a2794396;
Session399fb31a is unchanged. Requirements INPUT-04/05,ARCH-03,TEST-02/03:
a shared pause freezes all players and cannot initiate progress for a secondary.

## Retained actual failure

`/tmp/down-to-duck-paused-secondary-red.log`: two primary cases pass and both
secondary cases fail in actual composed Relay and Race sessions. Starting damage
and a stationary road are explicit component fixtures. A real forward hop causes
fatal traffic contact,then an actual personal recovery spends the charge. After
Game.pause,120 actual session ticks leave world time and all recovery counters
unchanged. The next session.dispatch nevertheless accepts P2's hop while the
shared host remains paused. Failure output includes before/after positions,hop
and earned distance. No progress/cooldown,clock,death callback or handler is
injected. The initial all-four nonfatal fixture failure is retained separately;
that was an incorrectly assumed lethal full-health rear bump,not a product RED.

## Mechanism and smallest repair

LocalSession.dispatch reaches SessionPlayer.move,which delegates to the immutable
world.host.movePlayer. Game.operationFor correctly gives secondary travelers
separate personal receivers. The released Game.move checks that receiver's state;
P1 aliases the shared host's paused state,but P2's own state remains playing.
There is no shared-world pause check before movement selects the personal receiver.
The normal UI already routes modal input; the common movement authority still
must reject a delayed/direct seat command during a shared pause.

Place the guard in Game.movePlayer,before inPlayerOperation. Read the immutable
world.host.state so every traveler shares the same pause authority,including the
existing direct SessionPlayer movement API. Do not mutate secondary run state or
add mode/seat-specific policy. Keep Game.move's released formulas,solo behavior,
callbacks,clocks,RNG,health,inventory and recharge arithmetic unchanged. This is
narrower than propagating pause into each personal receiver or changing UI input.
Graph tracing finds SessionPlayer.move as the application caller. A fresh full
compiler inventory/reference audit must verify the complete caller closure before
advancing any source-bound coverage pins. No historical changed-Game counter merge.

## Required proof

Keep the same four role/mode cases. Each must spend an actual personal revival,
reject paused movement with exact world/personal state preservation,and earn
249/250/251 through settled new forward hops. Relay's default50-tile legs must
show that baton placement and other players' legs do not recharge the target.
Retain every original matrix/boundary assertion and immutable solo parity.
Source changes require current-source canonical refresh and explicit pin review;
full enforcing/semantic/conformance/visual/PR gates remain open.

## Post-edit ownership and source review

Retained RED4beda7a. Game.movePlayer now reads the immutable world.host pause
state before selecting a player's receiver. All other movement behavior delegates
to the same unchanged inPlayerOperation callback. No Session or mode source
changes. Four new role/mode journeys and all original22 matrix cases/Relay17/
Race-items19 pass together62/62. A direct SessionPlayer.move assertion now also
checks the same authority without changing the retained dispatch reproducer.

The fresh23-target compiler audit covers159 src files. All original20 resolved
reference/call/dynamic-access records are byte-identical to the reviewed prior
audit. New targets show one Game.movePlayer caller(SessionPlayer.move),one
SessionPlayer.move caller(LocalSession.dispatch),and three application dispatch
calls in main. No standalone updater,unused wrapper,rule composer,recovery
policy or constructor path gains a caller. Only Game changes in the complete
source inventory; source/map/site schemas from the old Game cannot be merged.

The stale-pin control deliberately fails before the reviewed advancement,log
/tmp/down-to-duck-paused-movement-stale-pin.log. Existing scope rules are retained:
no new exclusions,defaults,wave/trail pruning or numeric floor changes. Game's
Solo/turn pins and complete turn/built-in/DEV caller fingerprints advance only
for this reviewed guard. Runtime isModeDefinition,valid initialization and all
raw/global/per-file counters remain intact. The exact transition is:

- gameBefore: `f783839e0a6bfc98eb2a0a4e35e381e9002daafb0ced9832dcbfe1b4a2794396`
- gameAfter: `04d7556c96b37b03539f270c2ce2c8e2b620c301d729a1fd6238be8e66d9413b`
- inventoryBefore: `9ef7fa9ebc20c98c6d807c10529ddd36365a47d533614c41d46470d2463a7eef`
- inventoryAfter: `92a4572f0d38c4bfbf79d424e30d3dfca03b984fbb6c654cfaed5e390212da96`
- developmentBefore: `935c3e5b6a253c0f1e0cf1ff3aef44d54de0bfc2ae9c98a9a8bcd766ec02d5e7`
- developmentAfter: `f2c39da5fa89906882ab4af8cad11e3181ff18c1e1a90ad6325bbf805d6c8c17`

## Terminal current-source verification

Wrapper87218 completed0 at2026-10-17T15:56:21Z: eight project gates and all twelve
fresh current-source cohorts pass. Source/test/tool/suite freeze is released.
All83 prior temporary outputs,ordinary artifacts and rootlock5ac are preserved;
normal raw artifact9036d9a1 is current. CLI conformance remains5pass/0fail/5
unmeasured,not full supplemental protocol acceptance. Exact cohort IDs and
frozen files are in PAUSED-MOVEMENT-PROOF.json.

Four new actual Flow lifetimes bind28 intervals,spending real revival then earning
249/250/251 through settled moves. Existing22-world/89-interval matrix and all
whole reused/public/DEV jobs remain. A source/schema/disposition-identical fresh
union binds Relay31 component lifetimes/88 component intervals+two public and
Race63/206+eight public. Relay1943/2104L641/710F2063/2793B still needs312B;
Race2022/2163L686/758F2316/3032B still needs262B. No old-Game counter is merged.

Both Solo diagnostic strata exceed their configured floors: Arcade1168/1208L,
276/295F,1216/1406B;Flow1030/1068L,254/275F,1069/1231B. These are diagnostic
unions independently checked against each strict cohort's metrics,complete
canonical inventory byte identity,mapped schemas and exact dispositions. Full
current enforcing release and complete semantic review remain required.
