# Browser application applicability integration

Generic fallback implementation, scoped to the reviewed browser application projection. `reportApplicability` adds only the exact `browser-presentation-owner-lifecycle` stratum. Unknown/near-match/development/shared-input names still reject. The runner selects only collected production browser application payloads, validates required realm/build identity through the existing collector/job gates, and invokes the pinned browser generator. Raw counters, full global/per-file accounting and all numeric floors remain unchanged. Positive excluded counters still fail closed; selection never uses zero hits.

Focused browser jobs now emit the browser stratum report and its visible disposition ledger even when they have no game-mode intervals. Node parents and development browser realms are not credited to this stratum. The reviewed compatibility controller API remains included in global/per-file/shared-input accounting.

- Unit15390 exited0:22/22 browser-generator/evaluator/attribution checks, `/tmp/down-to-duck-07-03-browser-applicability.log`. These include exact whitelist negatives, nonproduction/uncollected witness rejection, source/map/schema drift and excluded positive counters.
- Canonical79259 exited0: `/tmp/down-to-duck-browser-applicability-canonical.log`, run `c51ddb11-2e0b-40aa-a040-1ec9ecf2c510`, existing `keyboard-ui-gaps-03` job1/1 in30.45s,3 actual browser payloads. Original normal-dist preservation gate passed.
- Raw browser stratum:2711/7901 lines,642/2203 functions,1959/9930 arms. Applicable:2711/7842,642/2188,1959/9852.201 exact source/schema-bound dispositions; no observed excluded hit.

This proves focused integration, not complete browser coverage or hardware controller behavior. The full source inventory remains present, missing sites stay zero, and no release floor acceptance is claimed. No full collection or production source change was made.
