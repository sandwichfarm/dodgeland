# Relay handoff: unpaid coin claim repair

Pre-edit source ownership review,2026-10-17. Base04c30a4; current session source
`f8ce62cdc5c87557636cce62f0b15005bfa5f9cde42c708d67915b4c1ebcec39`.
The authorized repair owns only LocalSession.update's claim-cleanup argument.
It introduces no mode-ID condition, world reset, RNG draw or gameplay tuning.

## Retained RED

`node tests/strict-node-tests.mjs tests/relay-boundary.test.mjs` exits1:16 existing
tests pass, the new17th fails. Log:
`/tmp/down-to-duck-relay-pull-handoff-red.log`.
An actual forward hop starts a normal-gravity pull immediately before the
one-tile leg ends. Handoff freezes that unpaid world coin. After valid incoming
confirmation and an advancing tick, pickupOwners still says p1 instead of p2.
The old runner stays playing/active but Relay.simulates excludes it. Because a
pulled coin bypasses ordinary contact while gravity is positive, the incoming
runner cannot even capture that coin by touching it until its obsolete owner
gets another turn.

## Mechanism and planned smallest repair

LocalSession.update already computes activePlayers with playing, participation
and mode.handlers.simulates. It incorrectly passes all roster players to
releaseInactivePickupClaims, whose state/participation filter cannot identify a
connected Relay bench player. Pass the already elected activePlayers instead.
This is the generic mode eligibility boundary, equally applicable to finished
Race players or authored modes that suspend a participant.

This corrects the earlier pickup-source review's assumption that bench claims
should retain future continuity. Paid wallets/inventories remain personal.
Confirmation itself still preserves world state, coin position, ownership and
RNG. Cleanup happens on the next advancing shared frame and releases only an
unpaid reservation whose owner cannot simulate. Pause/handoff and all-dead
waiting behavior stay unchanged. Existing continuity assertions must be retained.

## Required proof and source transition

Retain the failing test before editing. Require the incoming runner to receive
exactly one payout, with zero outgoing payout and no repeat credit. Run the whole
Relay boundary suite plus nearest shared/session/mode gates and ordinary project
checks. Review and explicitly advance stale applicability/source-inventory pins;
old session maps/counters cannot be merged into the new session source. Full
release acceptance remains pending regardless of focused GREEN.

## Post-edit review and measured proof

Only the planned argument changes in production. Session SHA256 is now
`bf1d769947cd7e251d47957abdc4238f36ab4583fd5f5d32d3900e7f4c39f16c`.
All158 other source hashes (including the declaration) match the previous audit.
The executable158-source fingerprint advances explicitly from f741bb29 to
`153de8d17a4715b118bdcbf5d813406b35dd44133a0572dc73a37a5e6e9fe7a1`;
the corresponding DEV authority digest advances from10e47f76 to
`f6a5623fb9db48fc1449b8b30400b6ad875a0e422f7ce6e94dcbf41c316276ba`.
The compiler audit retains all earlier caller edges and confirms the single
cleanup caller now passes activePlayers. No new exclusion is added: the cleanup
entry and its whole predicate remain counted. Existing unused-helper closures
and standalone/shared dispatch proof are unaffected. No handler is evaluated an
extra time; selection reuses the already computed simulation set.

Final regressions use an ordinary integer coin column0 and fractional duck
column−0.55. An explicit prerepair source copy from04c30a4 fails the expected
p2 ownership in both Relay and Race. This alternate source has no current-source
counter credit. Current ordinary70/70 passes, including all original assertions
and the new Relay and finished-Race payout tests. Each observes one real pull,
no former-owner payment, exactly one eligible-owner payment, no double credit,
and unchanged non-crediting placement/finish progress. Source controls94/94 pass;
the old fingerprint was first observed rejecting the changed caller inventory.

Both regressions are now measured actual coordinator lifetimes: Relay boundary
four lifetimes/eight intervals and Race items24/seventy-three. All five existing
job metadata copies are updated and the focused pickup-eligibility group runs
both whole files. Historical reports, source hashes and the original branch
ledger retain their old identities; no old/new session counters may be merged.
Full current-source collection and all remaining release gates are still required.


## Current-source refresh after repair

Nine whole canonical cohorts complete successfully against bf1d7699. Their exact
run IDs, manifest hashes, payload/interval counts and terminal wrapper states
are retained in `07-03-PICKUP-ELIGIBILITY-PROOF.json`. They cover turn reuse,
Relay lifecycle, Race results, turn matrix, solo differential matrix/bootstrap,
six public modes, public Relay inventory and actual PROD/DEV shared pickup.
The public Relay job retains all12 tests and14 original browser realms; the
repeated Race item model remains separate and is omitted from the diagnostic
union. Actual development-artifact validation accepts the reviewed source pin;
its focused applicable counts are1157/2104 lines,360/679 functions and1054/2794
branch arms. These are focused counts, not a DEV floor pass.

The first solo collection timed out under its unchanged120s deadline, with
1059.192s elapsed. System power logs record sleep05:33:41–05:50:27 PDT (1006s),
overlapping the test05:32:51–05:50:30. It reported cancellation, no gameplay
assertion mismatch. Its partial data is never credited. A distinct retry under
temporary `caffeinate -is` passed the62-scenario test in55.124s with the same
120s deadline. No source/test/timeout change was needed. The original failed
collection and both logs remain retained. Temporary sleep assertions end with
the wrappers; no persistent power setting is changed.

All three serial wrapper chains are terminal and restore their prior captures;
normal build ff8ed443 and root lock5ac3c476 remain unchanged. Full enforcing
coverage, the semantic branch ledger,07-04 conformance,07-05 normal visuals and
07-06 final gate/PR remain open. This repair does not claim release acceptance.


The final source/map/site-checked diagnostic selects81 component lifetimes and
226 component intervals, plus seven public intervals across all modes. For the
turn modes themselves it measures Relay1941/2114L639/716F2041/2830B and
Race2022/2177L679/767F2274/3078B. The repeated supplementary Race model is omitted.
No historical changed-session data is used. Relay still needs6 functions and365
branch arms; Race12 functions and343 arms. The full enforcing report remains
required. Exact selection and raw/applicable counts are embedded in the proof.
