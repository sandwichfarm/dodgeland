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
