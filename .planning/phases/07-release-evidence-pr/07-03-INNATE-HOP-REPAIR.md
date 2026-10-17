# Innate rescue must cancel interrupted personal revival credit

Pre-edit ownership review at85941c3. Production Game source fb5d9224; session399fb31a.
No score formula, innate100 cooldown, revival250 cooldown, mode handler or RNG
change is planned. Own only the pending-forward-hop cancellation when a successful
innate rescue interrupts movement.

## Actual failure

/tmp/down-to-duck-secondary-power-ordinary.log exits1:21 existing cases pass;
the new22nd fails after a real secondary Sunny traffic collision triggers
Chicken Out. It expects zero completed forward tiles but observes one while
powerRescue remains active. P3 started on meadow0 and has not settled on row1.
Initial damage/poses/road are explicit fixtures; actual dispatch, swept contact,
innate activation and LocalSession.update deliver the failure.

Game.tryCharacterPower sets hop0 and starts its rescue animation without clearing
the existing LocalSession pendingForwardHops entry. settleForwardHop sees hop0,
a playing active traveler and a transient groundY rounding to the target1, so
credits a completed tile before rescue landing. Personal revival must use settled
new forward hops; interrupted/forced movement must not supply revival credit.
Score earned at hop initiation and the separate innate cooldown remain unchanged.

## Planned repair and proof

Reuse LocalSession.cancelForwardHop for the actual scoring participant when a
successful character rescue commits. Keep every existing score, position,
health, callback and recovery update. Primary standalone solo has no scoring
participant; its released movement/rescue formulas must remain identical.
Require real secondary rescue/earned healing/recharge, unaffected other players,
all original Relay boundary/continuity assertions, immutable results and exact
solo parity. Retain the failed log and invalidate old Game source pins before
reviewed advancement; no changed-source Game counter merging or floor reduction.
