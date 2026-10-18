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


## Post-edit source review

Retained RED commit e146fb5. Game now captures its existing scoringPlayer once,
calls that participant's existing session.cancelForwardHop when present, and
records the same innate interaction/callback. It does not change score, health,
innate readiness, rescue animation/landing or world state. cancelForwardHop only
deletes the actual player's pending-map entry. The SessionPlayer/world/operation
receiver was already selected by SharedWorld.resolvePlayer; no other participant
or detached session is touched. Standalone solo scoringPlayer is null, so its
released formulas, callbacks and terrain/RNG remain unchanged. All58 affected
whole tests pass, including every original Relay boundary assertion.

Only Game changes among159 src files. The20-target current reference audit adds
tryCharacterPower and cancelForwardHop to the existing ownership/policy audit.
No call to standalone Game.update/updateMobs, compatibility wrappers, the rule
composer or broader recovery is introduced. Source-bound Solo/turn/DEV and new
built-in-rule caller pins advance only after this review. Prior schemas retain
their identities; no changed-Game counters may merge into current measurements.

Reviewed transition:

- gameBefore: `fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6`
- gameAfter: `f783839e0a6bfc98eb2a0a4e35e381e9002daafb0ced9832dcbfe1b4a2794396`
- inventoryBefore: `b550759a82d954b9d3572690179ebb0071a182843381dc23a84e697e6bc62583`
- inventoryAfter: `9ef7fa9ebc20c98c6d807c10529ddd36365a47d533614c41d46470d2463a7eef`
- developmentBefore: `52f2d4b828986b2cf0ae731b5a3d904040fdfea319f0a3a4685985f502a6ecec`
- developmentAfter: `935c3e5b6a253c0f1e0cf1ff3aef44d54de0bfc2ae9c98a9a8bcd766ec02d5e7`

## Final focused verification

All nine current-source cohorts completed successfully at2026-10-17T15:01:03Z;
seven project gates,58 affected and24 nearby cases, and102 tooling controls pass.
The22-lifetime matrix binds89 intervals and observes22,512 shared Game updates,
zero standalone updates and no world-ownership violations. The101-hop rescue case
adds actual secondary onPower/onHeal execution without test-injected callbacks.
Every original21 case body remains byte-identical. Normal artifact a05e47ef,
root lock and all56 previous temporary outputs/ordinary artifacts are preserved.
No test/build/browser chain or temporary caffeinate remains from this refresh.

The fresh six-cohort diagnostic union binds90 component lifetimes,266 component
intervals and seven public intervals (including four Solo/Survive public paths).
Relay applicable counts are1943/2104L641/710F2053/2791B; Race counts are
2022/2163L684/758F2290/3030B. Both line/function floors pass diagnostically;
Relay still needs320 branch arms and Race286. Both independent full inventories
are revalidated and no changed-Game historical counters are merged. This is not
a fresh full enforcing release report or a completed semantic ledger.

The built-in rule scope comparison on actual current-source data removes only
one line,18 statements,one function and21 arms per selected mode; every numerator
and all raw counters remain identical. Exact evidence is retained in
07-03-INNATE-HOP-PROOF.json, including each cohort identity and scope delta.
