# Remaining Relay/Race mode scope: read-only findings

Input: canonical turn run2275eb09-bc7d-48f1-b493-2c1bcbbd443d, five actual lifetimes/17 intervals. Analysis filters by `attribution.json.strataProof[mode].sourcePaths`:27 Relay paths and28 Race paths. The coverage JSON also preserves zero-filled unrelated files; those are **not** included in these mode denominators and are not evidence of a mode-scope defect. No exclusions, tools, source or tests are changed by this note.

## Positively constrained paths requiring exact-site review

| Constraint | Source/call evidence | Conservative boundary |
| --- | --- | --- |
| Relay has no world consumables | Relay.attach at relay.ts:65–72 calls installCoOpMarket with consumables:false; session.ts:650 only installs ConsumableWorld when that flag is not false. No other Relay attachment call installs it. | ConsumableWorld instance execution/drop generation/use-success closure is unavailable in an actual unchanged Relay composition. Keep market eligibility/denial guards applicable: the fixture already exercises rejected Revival. Keep module initialization applicable; no blanket session.ts or consumables.ts deletion. |
| Both modes have no Survive shared-effect aggregation | MCP inbound installSharedWorldEffects has only SurviveTogetherController.attach; refreshSharedWorldEffects at session.ts:675 returns while sharedEffectPolicy=false. Relay/Race attach never opts in. | Aggregation body/callbacks after that guard and resolveSharedWorldEffects call closure are candidates; guard and owner-local inventory effects remain applicable. All three shared-world-effects functions are currently zero in both intervals, but the call chain—not zeros—is the rationale. |
| Both modes allow personal recovery only | RelayCoordinator creates SessionRecoveryController() (default personal); Race does the same. SessionRecoveryController.recover line46 rejects other kinds before targets/participants. | Successful Revival/Flare target-selection/placement/debit closure is unavailable. Current zero recovery.ts functions1/2(line44 stable sort),5(line59 target predicate),7–10(line60 participant checks), session-recovery functions15–17(lines48–50) are exact candidates. Invalid-kind/owner/offer, safe placement and personal debit-free commit guards stay applicable. |
| Race restricts inventory to appearance | race.ts:154 calls every run.restrictItems('appearance-only'); market/types.ts:19–20 admits cosmetic kind; Race installs its separate common-system tactics catalogue. | Successful legacy card/power/pack mutations/effect callbacks are candidates only after exhaustive caller/guard review. Rejection guards, cosmetics, common wallet/market generation and tactics stay applicable. Zero co-op metadata callbacks are not automatically excluded: sales/equip may still involve legal cosmetics. |
| Closed roster during actual run | Relay/Race handlers canAdmit returnfalse; session.ts:925 rejects prepareAdmission while active before placement. | Successful late-admission body may be inapplicable after attachment. Initial LocalSession.stage and seat creation remain required acquisition, as do the rejection guard and original-seat reclaim. No blanket LocalSession exclusion. |
| Race suppresses inherited pursuit | composeRaceDefinition sets suppressPursuit:true; Game checks pursuitEnabled before wave/trail advancement/collision. | Only pursuit-guarded branches are candidates. Traffic, rivers, trains, mobs, innate powers, ordinary health and world generation are not suppressed. |

These are source-grounded candidates, not approved production dispositions. Exact AST/mapped spans must be hash-bound, crossing spans retained, observed contradictory hits rejected, raw/global/per-file accounting retained and omitted-from-mode ledger visible.

## Genuine missing runtime coverage

Current Flow-only component journeys do not establish that Arcade paths are inapplicable: both factories accept the stored base definition. `Game.updateMobs` also invokes the director for Flow, so mob code cannot be excluded merely because these short meadow fixtures did not spawn any. Current misses include all18 actors functions, all7 coin-denomination functions, coin pull,23/24 mob functions,69/119 Game functions in Relay and66/119 in Race. These are primarily missing course/hazard/collection/presentation behavior, not proven unreachable branches.

Relay coordinator itself misses only6/95 functions (IDs29,41,42,47,52,80); Race6/98 (IDs13,14,23,44,80,92). Ledger modules each miss one function. Their remaining callbacks concern already-supported lifecycle/read surfaces, requiring targeted scenarios or real projections rather than unrelated helper calls. Large deficits instead reside in shared session/game/market closure: Relay128/250 session functions and43/65 market-run functions; Race87/250 and41/65 respectively.

Initial Game construction precedes current acquisition intervals. Mode-rules12/12 Relay and11/12 Race function misses, legacy content initialization, run-seed constructors and modern seed generators cannot simply be called inside a mode interval for credit. Widen genuinely verified acquisition to include the actual configured Game creation, or retain separately named setup proof. Module initialization is global until ownership is established; zero bootstrap counters alone do not justify inapplicability.

## Smallest next bounded scenarios

1. Add actual Arcade composition plus explicit current versioned seed acquisition for each mode, verifying exact resulting world/base/schema. Coordinate recorder acquisition ownership before changing interval boundaries; do not copy module boot totals.
2. Reuse selected existing generated-road/river/train boundary assertions within those real owners: actual moving vehicle contact/innate rescue, fractional platform carry, coin gravity/payout and death-spill state. Preserve explicit arranged-hazard provenance where used; add a finite real mob encounter instead of invoking director helpers independently.
3. Relay owner shop: real card buy/effect, sell, paid-pack selection and cosmetic equip, with stale owner after handoff rejection. Race: actual cosmetic buy/equip and legacy transaction rejection. Both retain one authoritative inventory and real economy assertions.
4. Small coordinator follow-up: Relay dead-seat original reconnect, pending recovery decline/expiry and selected-but-unconfirmed skip; Race all-disconnected waiting, grace forfeiture, finished racer exclusion and observed movement/event history. Existing model suites already specify these behaviors; reuse their production assertions with one bound lifetime each.

No broad acquisition rerun or new test is authorized by this read-only note. Root devtools and subsequent applicability owner retain the serial execution slot.

## Reviewed source identities

| Source | SHA256 |
| --- | --- |
| relay.ts | f5c1eea5b82e6e42d7b6bbc6a95f7f0d28aa7ad7468c4464e0217ab9f89e6c02 |
| race.ts | d2ecf7bbc185520fdad9b441c52775297b4929f455e665e38caabebebacb62da |
| session.ts | 5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed |
| session-recovery.ts | 35119abd8ac6551d253ec0ada320c934fd5a9cf20c142444e3afdb4094093b9c |
| recovery.ts | 835df7ab867c3421e7d295778c864ceba83f0ea10e588c4c6f4d95cdc2c1702b |
| market/run.ts | ba755b3573ca4acaf2a11ce7b77c277df526a16b2801cca612ee55feee36de6f |
| market/types.ts | d1e216d95749be95069851fe36b38009e9b86e86931fd4590330f794b2b4bb4c |
| consumable-drops.ts | 2fc4a1c55dc7f37dbcac2b7091661e3a284d3292eddf1460da423a39520dec4a |
| shared-world-effects.ts | 715dce9a98a83c398aa3a3d43531568008a9cefaa9be8df766a921dd2eb43a45 |
| game.ts | fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6 |

## Conservative executable disposition proposal

Root authorized the exact-site implementation after the real Arcade expansion (12ae9d0, seven lifetimes/25 intervals). `tools/release-coverage/turn-applicability.mjs` now proposes only the following proved closures, with all six composition/consumer source hashes pinned above; source drift requires renewed review rather than automatic regeneration:

- Relay's private `ConsumableWorld` instance members: the only construction is `LocalSession.installConsumableWorld`; Relay's pinned attachment passes `consumables:false` and does not separately install it. Race's instance remains applicable.
- Both modes' `refreshSharedWorldEffects` statements **after** its opt-in guard, and the `resolveSharedWorldEffects` function body/callable closure. Source caller audit finds only that session refresh call; only Survive enables the policy. Shared modifier constants/module initialization and all owner-local effects remain applicable.
- Both modes' personal-only recovery: the false arm of the personal target selection and true Flare participant arms; nonpersonal debit callback/teammate statistics; planner's nonpersonal selection/validation subtrees and Flare-only participant expression. The private `stable` helper is called only from the nonpersonal selection arms, so its invocation/body is excluded while its module-level allocation remains applicable. Personal planning, placement, debit-free commit and invalid-owner/kind/offer guards stay applicable.

Every statement, function declaration/body and branch arm must be wholly inside a reviewed AST span; crossing spans remain applicable. The existing evaluator retains original raw/global/per-file maps and rejects any positive hit in an excluded site. No numeric floor changes, whole-file pruning, zero-hit inference, generic execution relabeling, or Game/world/Arcade/Flow exclusion is introduced. New focused negatives cover source/composition pins, missing/duplicate inputs, map/schema drift, contradictory statement/function/branch hits, retained denial guards, common Game/market/staging functions and a crossing branch arm.

The remaining candidate categories are deliberately **not** disposed in this first implementation: successful initial `prepareAdmission` runs during real acquisition, so it cannot be excluded wholesale; Race market success branches and pursuit branches need separate full-span guard review. All Game, market/run, coordinator and ledger code remains applicable. Runtime proof and runner integration remain pending until the serial execution slot is released; this section is implementation rationale, not a passing-test claim.

### Generator verification

The bounded command `node --test tools/release-coverage/turn-applicability.test.mjs` passed4/4, zero failures/cancellations/skips, 1,324.165709ms; handle50713 exit0, `/tmp/down-to-duck-07-03-turn-applicability-final.log`. Initial19806 exited1 (3/4) because the missing/duplicate test removed the first alphabetically sorted source (`game.ts`, deliberately not required by these dispositions) rather than a reviewed input. The fixture now explicitly removes/duplicates pinned `relay.ts`; the generator itself needed no repair. Initial log `/tmp/down-to-duck-07-03-turn-applicability.log` is retained. No production RED is claimed.

The focused proof validates exact mapped production schemas against a deliberately zero synthetic realm, not gameplay credit. It proves conservative selection, retained guards/acquisition/common-world/market functions, source and composition drift rejection, missing/duplicate inventory rejection, excluded-positive rejection for statements/functions/branch arms, stale maps/schemas, crossing-arm retention, and retained module initialization. Actual runtime counter projection and shared runner integration belong to the mode integration agent and remain a separate required check. Raw maps/floors are unchanged. The serial slot was explicitly released after50713 terminal; no active process remains from this unit proof.
