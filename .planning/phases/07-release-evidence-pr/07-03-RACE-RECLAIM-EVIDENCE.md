# Race disconnect and reclaim transactions

Requirement: a disconnected racer's ghost retains resources and recovery charge;
another player keeps playing; returning control needs current exclusive device
ownership and a safe position without progress credit. Lifecycle changes must
clear pending leave confirmation and reject stale confirmation/reclaim actions.

Four actual coordinator/session scenarios (Arcade/Flow × safe/blocked return)
exercise these consequences. Each completes five connected-racer hops, loses
P2's controller while a leave confirmation is pending, rejects cross-seat cancel
and stale confirmation, rejects motion while disconnected, and keeps the other
racer's world clock moving. Reclaim rejects unauthorized replacement offers,
stale lifecycle tokens and a peer's owned device. An actual same-device offer
changes lifecycle generation. With every candidate return cell blocked by an
explicit terrain fixture, replacement waits without moving or charging P2.
Clearing a candidate then permits replacement. A new leave/cancel is required;
the obsolete confirmation cannot depart the restored racer. P2 completes a
real hop after reclaim. Wallets,health,revival charge/recharge/protection and
progress stay unchanged during replacement;only the new device alias joins
recovery provenance. No state setters or replacement method hooks are used.

Ordinary4/4 and canonical4/4 pass. Run13bcb243-ec98-49ba-8404-eab75cee1a87
has one independent Node parent, four lifetimes,12 verified Race intervals,
no browser realms. Full inventory audit164 entries/172 closure/180 jobs passes;
all179 prior jobs are preserved. Application,normal build,lock and floors stay
unchanged. No new gameplay bug or source repair was required.

Initial fixture expected all recovery aliases unchanged after successful
replacement. Correct expectation explicitly permits only the new device alias.
Retained ordinary01 also shows subsequent incomplete-recorder failures caused
by that first assertion. This is a test expectation correction, not product RED.

Exact source/schema diagnostic union gains five applicable statements and five
branches; Race2502/2994 still needs43 at85%. Relay2291/2695 remains above85%.
DEV still needs52; no Node evidence is borrowed by browser/DEV. The frozen full
run remains failed, and complete semantic review,fresh enforcing collection,
07-04/05/06 and PR remain. RACE-RECLAIM-PROOF.json binds raw parent/sidecar,
logs, source/build/lock hashes and ten exact newly positive sites. This proves
coordinator/session APIs; injected transport and physical hardware are separate.
