# Actual turn-mode coin arbitration

Requirements: ARCH-03, RELAY-05, RACE-01/04, TEST-02/03/05.
No production, threshold or applicability change. The complete canonical source
inventory and every mapped site schema match the prior bf1d7699 cohort.

The existing whole turn matrix grows13→15 cases/lifetimes and49→67 intervals:
Relay7 lifetimes/27 intervals, Race8/40. All original13 case bodies are byte
identical; only the two aggregate witness-count checks advance. Four suite
metadata copies retain the whole file and exact expected phases.

## Behavior and ownership

The added Race lifetime runs both roster orders through five arranged scenes:
closer contact, exact contact tie, closer pull, exact pull tie, and ordinary
contact competing with a pull. Outcomes are independent of iteration order:
closer/earlier arrival wins; exact ties elect p1. Each real frame supplies two
observed candidates. There is exactly one payout, no second payout on later
ticks, no residual pull/owner entry, and no unrelated health/death/progress change.
Real forward hops separately prove p2's earlier geometric contact beats p1 in
the same frame. The repeated pass revisits row1 without earning it again.
Pausing freezes in-flight attraction and world time, then collection resumes.

The added Relay lifetime pays for Pocket Magnet through the owner adapter,
then actual updates attract and settle a bar, huge sack and ordinary coin.
All28 coins and three pickups belong to p1. The benched p2 stands on one reward
but retains its seven coins, health, deaths and earned distance. Final immutable
contributions retain3/0 pickups. No claim or payout is supplied by a test call.

Poses, meadow geometry, stock and starting funds are explicit component fixtures
outside measured actions. Transparent candidate observers delegate each actual
production call once with unchanged arguments. They never call a resolver or
inject claims, pulls, ownership maps, private queues or random state. This is
component gameplay proof, not a new public-input browser journey.

## Verification

Ordinary15/15, coverage-tool controls94/94 and canonical15/15 pass. Canonical
run `7ca61138-479a-47c0-bf16-ed494036e75e` binds one independent Node parent,
15 worlds and67 intervals. Its route observer records16,968 shared updates,
zero standalone updates and no ownership violations. Type/build/guidance pass;
CLI conformance remains5 pass/0 fail/5 unmeasured. Normal ff8ed443 and root
lock5ac3c476 are unchanged. No test/browser process remains active.

The first ordinary run passed14/15: the new test incorrectly expected another
earned tile on a repeated row. Correcting that expected progress preserves the
actual game rule; no product defect or RED is claimed. Its failed log is retained.
Exact logs, wrapper statuses, hashes and raw/applicable counts are embedded in
`07-03-TURN-PICKUP-PROOF.json`.

Compared with the complete prior source-identical mode diagnostic, both modes
newly execute session.ts functions16/17 (contact/pull sort callbacks) and all
six operand arms of branches9/11 at275/284. Race also newly executes
Game275/0 at705 (another owner retains a pull), Session10/0 at277 (duplicate
contact is discarded) and12/0 at287 (a contact consumed the pulled coin).
These are mode gains; no new global-zero claim or changed-source merge follows.

The updated diagnostic selects83 component lifetimes/244 intervals plus seven
public intervals, omitting the repeated supplementary Race model. Applicable:
Relay1941/2114L641/716F2047/2830B; Race2022/2177L681/767F2283/3078B.
Relay still needs4 functions/359 arms; Race10 functions/334 arms. Full enforcing
coverage and semantic ledger,07-04 conformance,07-05 normal visuals/clauses and
07-06 final gate/PR remain required. This tranche is not release acceptance.
