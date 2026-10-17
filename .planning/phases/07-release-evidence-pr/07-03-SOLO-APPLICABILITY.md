# Reviewed stable-solo applicability

Generic executor fallback. This is a bounded measurement correction under root authorization, not a coverage-floor pass. Existing raw global/per-file evidence, source denominator and numeric floors remain unchanged. No runner integration is performed by this change.

`tools/release-coverage/solo-applicability.mjs` exports `soloApplicabilityDispositions({mode,sources})`, accepting only solo-arcade/solo-flow and the existing applicability source records. It emits separately inspectable statement/function/branch-arm dispositions bound by `applicabilityIdentity` to source, source map and mapped schema. The generator never reads counter values. Unknown sites remain applicable; full-span containment is required. A branch arm crossing a boundary stays applicable. Existing evaluator retains any line with an applicable statement and rejects observed excluded hits, stale identities and malformed sites.

## Positive call/state evidence

Authority: `07-03-MODE-SCOPE-FINDING.md`. Stable solo must independently establish no session ownership **and no staging/transition**, not merely a constant solo label. Game creates SharedWorld and a primary SessionPlayer in solo; both remain applicable. LocalSession instance constructors, field initializers, methods and enclosed callbacks require session construction. Static stage remains applicable conservatively, as do module initialization and other classes/functions. These residual zeroes are not silently reclassified.

CoOpMarketAdapter is installed by LocalSession mode attachment. Its three nonexported helpers have the following complete call closure, verified against source and MCP inbound tracing:

| Helper | Direct callers | Why unavailable in stable solo |
| --- | --- | --- |
| actionId | CoOpMarketAdapter.act | Requires the installed adapter and owner request |
| isMarketWindowOpen | canBuyOrEquip; CoOpMarketAdapter.dispatch | Both transitively originate in adapter calls |
| canBuyOrEquip | CoOpMarketAdapter.snapshot; CoOpMarketAdapter.dispatch | Both require the adapter instance |

Only helper execution bodies/functions are excluded; module-level arrow-value initialization remains applicable. No same-file inference extends this closure to other modules.

Reviewed source pins: session `5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed`; co-op-market `037a96c9f9436346f06306cac74808aab5e92e205ce2c42bebb1dbd16ca24c22`. Any changed source rejects generation and requires renewed review, not automatic pin refresh. The root-pinned TypeScript parser computes exact member/body spans; source-mapped Istanbul sites must lie completely inside these spans. No dependency installation or source changes are involved.

## Validation and integration boundary

`solo-applicability.test.mjs` instruments/remaps the actual two production files, checks shared owners/static transition retention and deterministic production dispositions, and retains source/map/schema drift, missing/duplicate owner and observed-hit contradiction negatives. This is tooling/applicability proof, not gameplay execution or public-input journey evidence. Existing applicability tests cover partial-line retention.

Required focused command: `node --test tools/release-coverage/applicability.test.mjs tools/release-coverage/solo-applicability.test.mjs`.

Actual terminal result: exit0,8/8, zero failures/cancellations/skips,581.435417ms. Durable log `/tmp/down-to-duck-07-03-solo-applicability-final.log`. The first command exited1 because the new test incorrectly requested a report with zero required realms; the existing collector correctly rejected it (`Invalid required realms`). Retained log `/tmp/down-to-duck-07-03-solo-applicability.log`. The fixture now supplies one explicitly synthetic zero-counter realm solely to obtain the actual mapped schema; it grants no gameplay hits. No product defect or product RED is claimed. Execution slot released to the mode integration agent after terminal success.

Runner integration belongs to the separate mode-attribution owner. It must retain raw mode metrics and the full omitted-site ledger, validate genuine solo interval provenance, and apply unchanged floors only to the explicitly reviewed applicable projection. This generator does not independently establish that an interval is solo. Current historical observer inference limitations remain open until that owner supplies direct session/staging absence observations.
