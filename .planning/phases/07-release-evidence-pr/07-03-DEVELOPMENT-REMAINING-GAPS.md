# Development gaps: three-run diagnostic and bounded next jobs

Initially a read-only scheduling review; the recommended bounded tranche has
since passed as recorded below. Development branch coverage remains below its
floor. No denominator or numerical threshold was changed.

## Exact union

`/tmp/down-to-duck-development-three-union.mjs` reads verified runs `fd368afa-33be-4988-84e3-576eef3713d3`, `6e9dc057-f050-442f-b419-b64aeb05745b`, and `dc650cee-3b95-4b7f-9b31-48ac234e5926`. It selects only collected current development-browser rows (12+22+5=39), validates payloads, requires identical source/map/schema identities for every exact26-file `policy.strata.development` entry, seeds all source zeros, merges counters, and applies Istanbul source-map remapping before computing lines. Output `/tmp/down-to-duck-development-three-union.json`; detailed missed function/arm locations included. This diagnostic does not create fresh enforcing evidence.

| Metric | Covered/total | Percent | Required count |
| --- | --- | --- | --- |
| Lines | 2020/2122 | 95.19 | 1910 |
| Functions | 626/694 | 90.20 | 625 |
| Branch arms | 2210/2821 | 78.34 | 2398 |

Branches need188 additional distinct arms. Functions have only one covered-function margin. Devtools' five older rows lack the later generic `artifactProof` field; their original fixture explicitly loads the development artifact, tests development markers and live controls and separates production mounts (`tests/devtools-runtime.mjs:8–32,47–59`). Do not describe those five as having the newer per-realm proof. The second run's CSS was provisional; final geometry proof is separate in DEVELOPMENT-LIFECYCLE.

Largest missed-arm groups: session201, Game151, market/run54, consumable-drops34, mobs31, co-op-market27. Some missing functions are public compatibility exports, default callback bodies or rejection guards; no zero-hit-based reachability conclusion is justified.

## Smallest defensible next tranche — not a forecast of floor closure

Graph lookup for matching tests returned no results; known-file source reads and literal test names were used. Recommend the following three whole existing jobs first, rather than claiming the originally suggested owner/recovery/pack trio closes188arms:

| Whole browser job | Existing observable behavior and current gap relation | Prior canonical duration |
| --- | --- | --- |
| `survive-together-runtime` | Eight cases (`:10,50,72,95,121,161,190,253`): personal revival, released P1/P2 admission, explicit cancel/reclaim preserving identity/wallet, visible P2 Revival/Flare purchase and use, cosmetic wearing, insufficient/max-charge atomic rejection. Targets actual session admission/recovery/owner branches and co-op transaction guards. | 50.32s |
| `survive-market-pack-owner-runtime` | `:8–112`: paid P2 pack with full hand; switch owner and restore exact draft; sell while selected pack page survives; claim without stale discard or extra debit; P1 and paused world unchanged. Covers actual co-op claim/sale routes and missing market discard callbacks at `src/market/run.ts:258`. | 12.30s |
| `market-pack-replacement` | `:94+`: visible full-hand purchase rejection, paid draft/skip/replace, capacity-changing picks and actual discard/claim across frames. Targets missing `previewPack` discard callbacks and pack validation arms; fixture explicitly stages stock/wallet/RNG, including a seed-search temporary inventory, so never label it entirely public acquisition. | 66.24s |

Budget roughly2–3minutes for this tranche (historical total129s plus DEV build/collection overhead); runtime estimate is not a timeout change. Preserve all original cases, assertions and output paths. All use `createMarketGameFixture`, so exact script/hash/DEV-tools proof already applies when registered with `verifyArtifactScope:true`. Add unique `-development` browser job IDs, buildScopes development, unchanged required realms/artifactPatterns and production registrations. `market-pack-replacement` currently labels its artifact “Production build” at line6; change only that evidence wording to built application for reuse.

`survive-recovery-owner-runtime` (5.58s, actual controller-owned Flare modal) and `survive-market-controller-owner-runtime` (5.35s, owner-only hand sale/held-input rejection) are useful authority witnesses but are not high-confidence branch-floor movers: most relevant planner/transaction paths are already covered by actual DEV recovery-outcomes and complete-run. Add them only for the specific remaining authority clauses/counters, not based on filenames.

## Why no honest claim that these jobs close the floor

A separate scheduling-only comparison, `/tmp/down-to-duck-development-candidate-diagnostic.mjs` / `...-candidates.json`, inspects the historical full run's **production** browser counters. These are never merged into the DEV result. It compares only exact source/map/schema matches to predict useful existing assertions. Historical `session.ts` mismatches and therefore cannot predict current session arms. Across every historical browser job, matching-source counters add only38 distinct arms (2210→2248); that leaves150arms still unproven even in this optimistic non-DEV scheduling comparison. The candidate trio's matching non-session deltas are small (together2arms, owner-pack1, pack-replacement2, overlapping possible). Current session coverage must be measured on real DEV execution before asserting their benefit.

Consequently there is no source-bound evidence that a small existing-job set alone reaches85% branches. The recommended three-job tranche is a bounded way to obtain missing session/market evidence, not a guaranteed closure set. After that fresh measurement, review exact remaining reachable behavior and guards before selecting further whole jobs. Node-only hazard/recovery boundary suites are not DEV browser evidence; no relabeling, synthetic private calls, weaker floors or source exclusions are proposed.

## Executed bounded tranche

Registered the three complete jobs in `development-market-03` and full execution with unique `-development` IDs, exact original artifactPatterns and unchanged browser-only requirements. Original production jobs remain unchanged. The only test-source change is market-pack evidence wording “Production build”→“Built application”; all fixture proof comes from the existing shared acquisition helper.

Units94992 exited0:12/12 full-manifest policy/inventory plus development artifact identity controls, `/tmp/down-to-duck-development-market-units.log`. Canonical10623 exited0, run `28183dab-144e-458d-8fd1-f754efc4534d`, `/tmp/down-to-duck-development-market-canonical.log`: Survive8/8, owner pack1/1, pack replacement1/1. All10payloads are genuine DEV browser realms; all10have persisted artifact proofs. Standalone development counts are1486/2122L,474/694F,1477/2821B; all26source zeros retained. All6preexisting ordinary artifacts backed up by these jobs compare byte-identically after restoration; normal production artifact preservation gate passed. No Node evidence contributes to the DEV stratum.

Source/map/schema-identical four-run diagnostic `/tmp/down-to-duck-development-four-union.json` now has49DEV realms:2020/2122L95.19%,628/694F90.48%,2214/2821B78.48%. Actual incremental gain is2functions and4branch arms; branch floor still needs184arms. This confirms the earlier warning that these whole journeys do not close the branch floor. No floor relaxation, scope change or further runtime expansion is inferred. Shared runner and other agents' source work were not edited; no commit made pending root coordination.
