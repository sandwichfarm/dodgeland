# Applicability reporting foundation

Preparation/implementation foundation only. No production dispositions, policy changes, runtime acceptance or floor pass. Root3023b50's historical function bound establishes the motivation, not today's source identities after concurrent repairs.

`reportApplicability({mode,sources,attributed,dispositions})` is pure and returns raw attributed and applicable covered/total metrics, per-file identities/metrics and every disposition. `sources` contains canonical source-mapped schemas as `{path,source,map,coverage}`; `attributed` is a complete same-schema coverage map already attributed by a separately validated collector, with explicit zero entries for unobserved sources. The function cannot establish acquisition provenance, mode ownership or bootstrap attribution. It never borrows source/global counters for attributed hits and never mutates caller maps.

`applicabilityIdentity(source)` binds exact source text, source-map object and mapped statement/function/branch schema using SHA256 (strings directly, objects via JSON serialization, matching existing collector conventions). Every disposition requires mode, path, all three hashes, kind (`statement`, `function`, `branch`), exact string site ID, branch arm where applicable, nonempty callReason/stateReason and authority reference. Reasons require independent review: a nonempty string is not automated proof of unreachability. Unknown/unclassified sites stay applicable. Stale identity/schema, unknown/duplicate sites, malformed counters, missing sources and exclusions contradicted by attributed hits reject. Empty inventories and wholly empty applicable executable inventories reject; a particular wholly inapplicable file remains visible with zero totals.

Lines use Istanbul statement-start-line semantics: a line remains whenever any executable statement on it remains applicable, and its hit count is the maximum of remaining statement counts. Function exclusions do not automatically exclude nested statements or branch arms. Explicit separate dispositions avoid deleting reachable code sharing a line or function. Raw metrics and excluded-site records remain visible. No percentage rounding or numerical floors are added here; the existing90/90/85 mode and complete-source global/per-file policy remain unchanged and integration is separately owned.

Strict solo applicability requires verified absence of LocalSession ownership **and staging/transition state**, not merely `sessionActive=false`. LocalSession.stage is a transition entry point. Solo SharedWorld and primary SessionPlayer remain real owners. Bootstrap/setup constructors outside an interval receive no interval credit: separately measured and validated acquisition may be reported separately, never inferred from module imports or copied mixed-mode totals.

Synthetic evaluator tests cover metric projection, same-line partial/all exclusions, raw-map immutability, observed-hit contradictions, stale identities, invalid modes/reasons/sites/counters, duplicates/missing source and empty guards. They are tooling math/negative controls, not production coverage. Exact command when the shared process slot is available:

`node --test tools/release-coverage/applicability.test.mjs`

Root reviewed the implementation and ran this command after the shared slot
was released: exit0,5/5 tests, zero failures/cancellations/skips,59.863ms.
Log: `/tmp/down-to-duck-07-03-applicability-unit.log`. No runner/policy/attribution/
product edits or production applicability approvals are included.
