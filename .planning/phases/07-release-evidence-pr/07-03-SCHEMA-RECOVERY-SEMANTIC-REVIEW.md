# Current schema and recovery boundary review

Original requirements: ARCH-01/04 composable validated configuration;
SOLO-02 pinned seeded schemas; ITEM-02/05 deterministic rare item identity;
COOP-04 safe revival; ITEM-06 rejected transactions never spend;
TEST-02/05 meaningful authority coverage.

## Evidence and boundaries

Canonical run `166980f0-9159-45e0-9324-69a47c0ebd92` executes both whole existing
component suites:18 cases,18 passed,0 skipped,2 independent Node parents,
0 browser realms and0 mode-attributed intervals. Ordinary execution also18/18;
collection controls6/6. Five new cases exercise current production exports.
They passed on first execution;this is added behavioral proof,not a product
RED or gameplay repair. Normal build,all158 executable source records,root lock,
182 production jobs and20 required control paths are unchanged. The new named
group reuses the same two existing jobs and preserves all previous groups.
Static command audit:165 entries,173 closure members.

Inputs, raw parents, reports, verifier and logs are SHA256-bound in
`07-03-SCHEMA-RECOVERY-SEMANTIC-PROOF.json`. Full artifacts live under
`artifacts/release-coverage/semantic-boundaries-03` and
`artifacts/release-coverage/semantic-boundaries-runtime-03`. The verifier compares
complete statement/function/branch schemas with the retained current full report
and verifies all eight newly hit arms also have identical initial source/map/site
identities. Source pins are in the proof;no changed-source arm is relabeled.

## Conditions, consequences and actual assertions

| Source and arm | Condition / consequence | Requirement and evidence |
|---|---|---|
| consumable-drops.ts10/0;11/1,11/2 at43 | Invalid legacy pickup kind must not create a valid-looking identity. | SOLO-02,ITEM-02/05. `unknown legacy pickup identities reject without changing seeded drop identity`:five unsupported kinds throw;sampler remains byte-equivalent after every rejection;null retains the canonical no-drop identity. Actual hits5/5/5. |
| consumable-drops.ts13/0 at51 | Re-registering an existing version could silently change seeded item meaning. | ARCH-01/04,SOLO-02,ITEM-05. `duplicate schema registration cannot replace a pinned drop definition`:changed salt under the registered version throws;registry object identity and actual sampled result remain unchanged. Actual hit1. |
| consumable-drops.ts18/1 at58;19/0 at63 | Missing/unknown item name or out-of-range bucket must reject before producing an item. | ARCH-01/04,ITEM-05. `general item schema rejects invalid buckets and missing item names without changing its definition`:undefined/null/unknown names and five invalid buckets throw;original schema remains unchanged;corrected boundary buckets produce Revival/null. Actual hits2/5. |
| recovery.ts1/0 at51 | Invalid time/tick/protection cannot authorize a revival transaction. | COOP-04,ITEM-06. `invalid recovery clocks reject before validation, spending or relocation`:seven malformed clock variants reject with invalid-clock;valid/debit/apply receive zero calls,input unchanged;subsequent valid request succeeds. Actual hit7. |
| recovery.ts22/0 at67 | Duplicate or nonfinite placement would overlap or lose a Flare participant. | COOP-04,ITEM-06. `a Flare rejects duplicate or nonfinite placement before spending and preserves fractional cells`:duplicate,NaN andInfinity cells reject with duplicate-placement;zero commit hooks,input unchanged;corrected distinct fractional cells plan both p1/p2 without normalization. Actual hit3. |
| consumable-drops.ts4/0 at30 | Private draw's omitted-salt initializer. | ARCH-01,SOLO-02. Source review:unexported function has exactly declaration plus one direct call;the call supplies all three arguments,including schema.salt. Verifier checks AST shape and pinned source. Remains raw zero;no fabricated execution or global exclusion. |

Recovery tests supply immutable owner/target snapshots and explicit cells;hooks
are observation counters for the transaction planner contract. They do not
prove terrain discovery,personal250 recharge,actual resource acquisition,or a
full UI flow. Existing world/recovery/runtime evidence remains responsible for
those clauses. Drop tests use the real registered production definition;they
neither register a replacement nor alter terrain/market/mob RNG streams.

## Current raw candidate extraction

`semantic-current-03/raw-zero-review.json` preserves830 exact zero arms from the
retained complete current full report,384 syntactic owners and131 matching
bounded per-stratum scope candidates. Scope links are candidates,not global
unreachability claims. It verifies source bytes and complete-report SHA before
extracting source contexts. Attempt01 mistakenly required Survive applicability
projections;both Survive strata intentionally have none. The corrected reader
reads the six existing projected profiles only. Both attempts/logs are retained.
This is evidence-reader correction,not a production defect.

This addendum reviews nine of those830 arms,eight with fresh positive evidence
and one private default with source proof. It does not classify the other821,
replace earlier reviewed groups,change floors or establish a fresh complete
release pass. Full semantic review,fresh enforcing collection,07-04/05/06 and
opening the PR remain required. Original enforced-fail report stays unchanged.
