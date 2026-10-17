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

## Bounded member-level extension (current review)

The preceding conservative static-stage/shared-owner retention describes the initial generator. Under renewed explicit source review, strict solo now also omits the following exact AST-contained execution spans. Source pins are unchanged and every disposition retains source/map/schema hashes plus its positive call/state reason. This does not classify whole SharedWorld or SessionPlayer classes.

| Span selection | Positive call/state proof |
|---|---|
| LocalSession.stage and LocalSessionStage members | Staging allocates LocalSession; current strict solo evidence rejects even stage followed by cancellation. Stage positive counter hits are also rejected by applicability. |
| Private ConsumableWorld members and captureConsumablePolicy | Sole allocation/capture is LocalSession.installConsumableWorld:642, installed by Survive/Race handlers. No solo Game installer exists. |
| SharedWorld beginFrame/update/resolvingPlayer/resolvePlayer/claimPickup/claimPickupPull/resolvePickups/releaseInactivePickupClaims | LocalSession.update:1032–1049 owns this frame/update/arbitration sequence. Game.collectCoins:721–722 enters shared claims only through sessionActive/resolvingPlayer; solo Game.update uses its own path. |
| SessionPlayer setHopCooldown/hopCooldown/canHop/noteHop/interactions/recordInteraction/start/move/update | Race/LocalSession callers; Game.scoringPlayer:345 is null for untouched primary solo, gating hop cooldown and interaction calls. |
| SessionPlayer constructor statements after `if(primary)` returns | Secondary placement/inventory branch cannot execute for Game's primary construction. The constructor function, primary branch and field initialization stay applicable. |
| Five SessionPlayer default callback function entries | Primary alias adoption replaces these placeholder functions before invocation. Their allocation statements remain applicable. |
| composeSessionModeDefinition and isDeviceId callable bodies | Race composition and LocalSession admission/reclaim respectively; module-level arrow initialization is retained. |

Retained explicitly: alias and its accessor closures, SharedWorld constructor/noteProgress, primary SessionPlayer constructor; uncertain `mobs`, `selectMobTarget`, `view`, label/ground/power/score/display getters and render remain applicable. No item/drop/recovery module-wide exclusion is introduced by this patch.

Initialization is a separate accounting concern: consumable catalogue freeze and other boot validation can execute before any measured interval. Their absence from mode hits does not justify removing them. This patch keeps module initialization and primary object initialization, even when that leaves zeroes. Global all-source evidence and numeric floors remain unchanged.

New synthetic checks use the actual instrumented/remapped schemas to assert named retained/excluded members, positive stage hits reject, callback allocation remains, and retained alias hits still count. Existing source/map/schema drift and all site-kind contradiction tests remain. Testing waits for the serialized execution slot; no runtime result is claimed in this paragraph.

### Measured extension result

Serial command82510 exited0. `/tmp/down-to-duck-solo-applicability-expanded-unit.log` records11/11 tooling/ownership checks; `/tmp/down-to-duck-solo-applicability-expanded-canonical.log` records the canonical bounded solo witness (16 paired scenarios,32 validated intervals, one independent parent). Run `987ca2e0-51ab-4fc7-9716-1338e93b8d14` under `artifacts/release-coverage/solo-model-03/` retains exact source/schema-bound ledgers. No excluded site had positive attributed hits. Raw metrics are unchanged from the prior run.

| Mode | Raw lines/functions/arms | Applicable lines/functions/arms |
|---|---|---|
| Solo Arcade |658/2039;145/656;633/2768|658/1465;145/391;633/2011|
| Solo Flow |594/2039;134/656;560/2768|594/1465;134/391;560/2011|

Each ledger now has2019 omitted sites. Session's applicable functions are6/22 (raw6/250); prior applicable denominator123 became22 through101 specifically selected function dispositions. Unknown/unproven methods remain. This still falls well below unchanged floors. `git diff --check` passed; slot released to root at terminal confirmation.

### Next bounded runtime proposal (not implemented)

Reuse actual paired parity scenarios with behavioral assertions: schema1/2/3 extreme generation and seed roundtrip (`solo-parity.test.mjs:311–329`); denomination/magnet/retained pickup exact-once cleanup (`266–309`); catalogue purchase/shield and100-row regeneration/innate cooldown (`190–227`); seven actual Game.end innate-power callbacks (`247–255`). Parameterize actual base only where its contract applies, retaining Flow's absent-pursuer behavior. Reconcile current missed reachable symbols before selecting cases. The current canonical16-scenario execution takes about52s, so blindly expanding per-scenario full-schema payloads is inappropriate; any bounded grouping/aggregation optimization must preserve disjoint exact deltas and individual behavioral assertions. No additional cases or omissions are claimed here.

## Narrow Game collector closure (verified focused evidence)

`src/game.ts` source SHA256 `fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6` adds exactly two callable bodies: private `collectSessionCoins` and its private `sessionPickupContact`. The actual dispatch at `collectCoins` obtains `sessionPlayer` only through `world.sessionActive ? world.resolvingPlayer : undefined`, then calls the session collector only when that player exists. `sessionPickupContact` is called only within that collector. Strict solo ownership requires sessionActive false, independently checked at interval boundaries, and prohibits staging. This is positive state/call proof, not an inference from zero hits. The earlier informal scoringPlayer shorthand is not the collector's actual guard.

The original solo `collectCoins`, Game construction, all other Game methods and initialization remain applicable. Global/per-file coverage remains complete. Exact source/map/schema-bound IDs retain raw numbers and reject any positive excluded statement/function/arm. Retained tests require exactly the two mapped function exclusions, preserve a positive solo collector hit, and reject changed Game source. Unit session1605 passed9/9 (combined recorder and applicability checks), `/tmp/down-to-duck-solo-economy-unit.log`. Canonical session65265 exited0, run `9bcee5de-7e84-4a89-aa8f-4ddc4f222eae`, `/tmp/down-to-duck-solo-economy-canonical.log`:24 paired scenarios,48 intervals, one independent parent. Exactly two Game function exclusions reduce each applicable denominator by38 lines/2 functions/51 arms; no positive excluded hit occurred. Raw denominators stay2039/656/2768. Applicable denominators1427/389/1960. No floor acceptance.
