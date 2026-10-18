# Pickup claim repair: source and applicability review

Follow-up correction: [Relay unpaid pull repair](07-03-RELAY-PULL-REPAIR.md)
supersedes this historical review's bench-claim retention assumption. Immediate
confirmation continuity remains; the next advancing tick releases unpaid claims
owned by non-simulating travelers. The older hashes and measurements below remain
historical evidence and are not relabelled.

2026-10-17 UTC. This addendum advances only the reviewed session source pin for
the disconnect repair retained in `07-03-DEVELOPMENT-GAMEPLAY-EVIDENCE.md`.
Root and an independent read-only reviewer inspected the exact source change
and its caller. No new coverage exclusion is authorized.

## Repair and lifecycle boundary

`SharedWorld.releaseInactivePickupClaims` now requires both `state === 'playing'`
and `participation === 'active'`. `LocalSession.deviceLost` preserves a living
player's playing state while changing participation; the old predicate therefore
kept a claim the absent player could not finish. The real-app RED in0638b42
reaches this state through a shell controller disconnect while P2 continues.
The unchanged journey passes after the repair: P2 can take the claim and receive
exactly one payout, and P1 receives none.

The caller still passes `this.players`, not the subset that simulates this turn.
Connected, playing Relay bench owners retain future pickup continuity. The
method removes dead, departed and device-lost ownership before the next advancing
shared frame. It does not promise immediate cleanup while paused, frozen, or
with no active player. No reset, mode-ID branch, RNG consumption, generation
change or standalone solo operation is introduced.

## Reviewed identities

| Source | Previous SHA256 | Current SHA256 |
| --- | --- | --- |
| `src/session.ts` | `5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed` | `f8ce62cdc5c87557636cce62f0b15005bfa5f9cde42c708d67915b4c1ebcec39` |

Only one predicate expression changed. All caller authorities, definitions,
constructors, import-time allocations, staging constraints and other members
are byte-identical. The two executable pins advance deliberately in
`solo-applicability.mjs` and `turn-applicability.mjs`; historical documents and
reports retain their original identities.

## Applicability disposition

- Strict solo: the whole shared-frame cleanup member was already unavailable
  under the reviewed session-free caller closure. That proof remains valid;
  no additional site or member is excluded.
- Relay and Race: this member and its new participation predicate remain fully
  applicable, including both outcomes. It is not added to any exclusion range.
- Global and per-file reports retain all raw sites. New canonical source maps
  and counter schemas must be collected; session counters from the old and new
  source identities cannot be merged, even where source line numbers match.
- Existing negative controls for stale sources, crossing/unknown mappings,
  reachable guards and excluded positive hits remain required. Advancing a hash
  alone does not constitute a passing coverage gate.

## Validation

Solo and turn applicability controls59297 passed19/19 with zero skipped or
cancelled tests, log `/tmp/down-to-duck-pickup-source-controls.log`. Turn controls
explicitly retain the cleanup entry and every mapped statement, function and
branch on the changed predicate line for Relay and Race. Existing stale-source,
unknown/crossing-map and excluded-positive-hit controls remain intact.

The ordinary GREEN,44/44 boundary tests, and the retained unrelated Race lifetime
assertion failure/correction are documented in the gameplay evidence file.
Current-source canonical refresh8318 exited0. Each report has one independently
bound Node parent; no excluded positive hit or identity mismatch occurred.

| Collection / run | Actual intervals | Applicable Arcade / Relay L,F,B | Applicable Flow / Race L,F,B |
| --- | --- | --- | --- |
| solo-model `ea5d9d3d-1fa5-4d4d-8726-d6f55dc800ec` |48|926/1207,218/296,963/1427|790/1067,195/276,823/1252|
| solo-bootstrap `3ba09d62-1abf-4451-9c64-c0060657cac8` |4|842/1207,192/296,723/1427|817/1067,188/276,706/1252|
| turn-model `3e5abf72-d174-4c30-b2af-a25a111506e7` |29|1881/2159,608/718,1926/2893|1911/2222,634/769,2069/3141|

Logs: `/tmp/down-to-duck-pickup-refresh-{solo-model,solo-bootstrap,turn-model}.log`.
Solo counts are unchanged. The two new participation-conjunction arms remain
counted and execute in Relay/Race. All reports explicitly remain report-only;
the controls and focused collections do not satisfy all release floors.
