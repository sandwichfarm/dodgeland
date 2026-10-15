---
phase: 03-survive-together-consumables
verified: 2026-10-15T22:52:23Z
status: gaps_found
score: 39/40 must-haves verified
behavior_unverified: 0
overrides_applied: 0
verifier_execution: generic-agent fallback applying gsd-verifier instructions; not typed-agent execution
source_revision: 67b282b
reviewed_head: 21166f5
gaps:
  - truth: "Survive settlement creates one immutable shared result with per-character contributions and an unranked team podium record (D-16)."
    status: failed
    reason: "An unreclaimed disconnect interval is omitted from ghostSeconds both when the team settles and when a ghost deliberately departs. Only reclaim adds elapsed disconnected time to the counter."
    artifacts:
      - path: src/session.ts
        issue: "deviceLost records deviceLostAt; reclaim alone accumulates deviceLostDuration; depart archives the unfinalized counter."
      - path: src/survive-results.ts
        issue: "Both live and archived contributions copy deviceLostDuration without accounting for an open disconnect interval."
      - path: tests/survive-recovery-terminal.test.mjs
        issue: "The archived ghost-counter test reclaims before departure, so it misses both unreclaimed terminal paths."
    missing:
      - "Finalize or project open ghost intervals at the correct departure/settlement simulation time, without double counting reclaimed intervals or advancing paused time."
      - "Production-path regression assertions for unreclaimed ghost settlement and ghost departure, including prior reclaimed intervals and immutable repeated result reads."
---

# Phase 03: Survive Together & Consumables Verification

**Goal:** Friends can join a live Arcade or Flow run, recover from setbacks, and use deterministic cooperative consumables without disrupting the shared course.

**Verdict: gaps_found.** One reproducible contribution-accounting defect prevents complete D-16 fulfillment. All five roadmap success criteria have substantive wired implementation and passing behavioral evidence; the additional detailed result contract fails. Do not mark Phase 03 complete until the gap below is closed.

This is the explicitly requested **generic-agent fallback**, applying the full `gsd-verifier.toml` methodology and references. It is **not** a successful typed `gsd-verifier` launch. Initial verification; no prior Phase 03 verification or overrides existed. No source edits, installs, browser launches, preview changes, or commits were made by this verifier.

## Evidence provenance

- Inspected the actual canonical output `/tmp/down-to-duck-root-phase3-resize-gate.log`, not just SUMMARY pass claims. The root recorded exit 0 for session 45733. Its final browser group is 34/34, with no failures, cancellation, skips, or TODOs.
- `git diff 67b282b HEAD -- src tests package.json` is empty at reviewed HEAD `21166f5`; the canonical source/test evidence is still current. The original solo oracle remains `a310a81ed6c76df4b265c9012c23b8c83f4802e5`. Independent lockfile comparison to that SHA passed.
- The canonical prefix contains 21 parity, 271 retained solo regression, 19 renderer, and 72 session/input model cases, then the session browser/runtime gates. Phase 03 includes 30 admission/tracer/boundary, 19 economy, 36 recovery, 18 consumable, 25 world, 3 world-render cases, market/magnet/mob/death-spill regressions, and the 34-case final browser/results group. Type-check, build and guidance passed. No broad gate was rerun gratuitously.
- Both conformance reports say **5 passed, 0 failed, 5 unmeasured**: three manifest checks, one wire-envelope check and one lifecycle check. Those five are not proven behavior.
- Read the roadmap, requirements, phase context, seven plans/summaries, validation/UI contract and UI review, earlier phase verification, project AGENTS and boundary documents. Graph-first discovery located session/recovery/main symbols; graph snippets supplied implementation, with direct file reads for surrounding code and literal/config searches. No project-local agent skills or configured verifier skills were returned.

## Observable truths

IDs preserve roadmap order and each plan's frontmatter truth order. Wording below is shortened for readability without dropping assertions. Every transition claim is supported by exercised production behavior, not file existence alone.

| ID | Truth | Status | Evidence |
| --- | --- | --- | --- |
| R1 | Two to four distinct independent players share Arcade/Flow world and statistics. | VERIFIED | `SharedWorld`, `SessionPlayer`, `LocalSession.update`; Arcade/Flow tracer, admission, economy and complete-run tests. One world advance precedes per-player work. |
| R2 | Safe live join/leave preserves course/time/score/inventory and distinct lifecycle/identity. | VERIFIED | Atomic `prepareAdmission`/`admitPlan`, `deviceLost`/`reclaim`/`depart`; admission and primary-departure tests plus visible join/reclaim/leave paths. |
| R3 | Max-one personal recovery, 250 new tiles, explicit safe teammate recovery, terminal liveness. | VERIFIED | Completed-hop accounting and alias provenance; `planRecovery`/`commitRecoveryPlan`; boundary, paused, terminal and all-down offer-clock tests. |
| R4 | Shop/world Revival and Flare use exact exclusive odds, deterministic once-only awards and default gravity. | VERIFIED | Catalog, keyed sampler, `ConsumableWorld.tick/use`; 18 catalog/drop and 25 world cases, fractional-grid/magnet matrix and built purchase/use. |
| R5 | Hand/market/items/prices/targeting identify selected owner and preserve menu state. | VERIFIED | One main-owned market/hand, versioned adapter, owner/pack/fresh-context/keyboard/controller browser suites. |
| 01.1 | Prior phase evidence and live API reconciliation precede Phase 03 changes. | VERIFIED | Prior verification records plus 03-01 API map and pre-edit gate provenance; `157e59c` to `0c3f50c` source/test/package/lockfile diff is empty. Historical documentary evidence, not a new historical execution claim. |
| 01.2 | Cancel restores exact solo; commit adopts identical live owners in Arcade/Flow. | VERIFIED | `LocalSessionStage`; both tracer modes, immutable solo parity, built complete-run retained-object assertions. |
| 01.3 | Fresh join edge consumed; unique safe four-seat admission is atomic. | VERIFIED | Main/router staging, admission plan validation; fourth-seat/failure/capacity and opaque iframe tests. |
| 01.4 | Survive composes shipped definitions without new core mode-name policy branches. | VERIFIED | `createSurviveTogetherDefinition`, generic handler/extension/effect dispatch; parameterized Arcade/Flow and custom extension tests. |
| 01.5 | Ghost/reclaim/depart/death/new join remain disjoint with specified ownership. | VERIFIED | Separate lifecycle dispatch, archive/release, provenance; ghost exclusion and replacement-seat tests. Result-time accounting defect is separately captured in 02.5. |
| 02.1 | Innate 100-tile save stays exact; only actual death clears/spills and opens personal offer. | VERIFIED | Immutable parity, character-power/death-spill regression, production death/protection/offer cases. |
| 02.2 | Personal grant/recharge cannot be farmed through backtracking or aliases/relocation. | VERIFIED | `settleForwardHop`, `recordPersonalProgress`, `recoveryFor`/`bindRecovery`; 249/250/251, unfinished fatal hop, relocation and alias tests; independent named recharge test passed. |
| 02.3 | All recovery targets/placements/protection validate before mutation or debit. | VERIFIED | Frozen planner and same-tick revalidation; unsafe/stale/debit-refusal and distinct-placement production tests. |
| 02.4 | Only an unexpired 8-active-second offer delays all-dead settlement; pause freezes it. | VERIFIED | Controller `pending/tick`, session pause guard; both base-mode terminal tests and built offer-clock/complete-run assertions. |
| 02.5 | Immutable shared result contains full per-character contributions and team podium. | **FAILED — BLOCKER** | Results are frozen/team-shaped, but an open ghost interval is missing from `ghostSeconds`. Exact reproduction below. |
| 03.1 | Separate eligible max-one consumables, target contracts and 24/36 prices. | VERIFIED | `CONSUMABLES`, credit/debit planners, shop adapter; catalog and economy tests. |
| 03.2 | Bucket 0 Revival, 1–2 Flare, 3–2499 none, mutually exclusive. | VERIFIED | `classifyConsumableBucket`; exhaustive bucket count and invalid-boundary assertions. |
| 03.3 | Seed/anchor/schema-local sampler preserves every non-item RNG stream and call order. | VERIFIED | Pure mixer/rejection loop, golden vectors, interleaved terrain/denomination/market/mob next-output comparisons and solo parity. |
| 03.4 | Charge plans validate capacity/mode/owner/target/generation without mutation on failure. | VERIFIED | Frozen plans; malformed/stale/self/duplicate/full/wrong-mode tests. |
| 04.1 | Only committed handler installs item pipeline; ordinary solo has no item work/residue. | VERIFIED | Generic non-emitting Game extension, session install/stop; absent/cancelled/torn-down/custom capability tests and original oracle. |
| 04.2 | Initial/later rows use isolated sampler without changing released world generation. | VERIFIED | `ConsumableWorld.row`; row replay/pruning/claims and parity/RNG comparisons. |
| 04.3 | Item pull uses baseline gravity and fractional platforms, never coin magnet modifiers. | VERIFIED | Imported `DEFAULT_COIN_GRAVITY`, `advanceCoinPull`, platform anchoring; independent named magnet-motion test passed. |
| 04.4 | One deterministic eligible contested winner; inactive/full players cannot consume. | VERIFIED | Swept fraction, squared distance, stable-seat sorting and one claims ledger; reversed roster and excluded-player tests. |
| 04.5 | Same-tick debit plus effect is atomic; invalid use retains item. | VERIFIED | Versioned `ConsumableWorld.use/debit` → session recovery; replay/target replacement/unsafe paths and built kept-charge outcomes. |
| 04.6 | Actual death clears only the dead owner's economy/items. | VERIFIED | Per-player Game operation and controller clear; both-seat death, ghost retention, spill tests and complete-run browser assertions. |
| 05.1 | Buy/sell/pack mutates only one named active owner. | VERIFIED | `CoOpMarketAdapter.owner/matches/dispatch`; owner isolation model and pointer/keyboard/controller browser evidence. |
| 05.2 | Eligible Revival/Flare cost 24/36 with atomic independent capacity. | VERIFIED | Catalog plus `spendCoins` guarded credit; fractional wallet, competing same-version and full-capacity cases. |
| 05.3 | Owner/lifecycle/stale/mode exit invalidate prior transaction context. | VERIFIED | Context generation/revisions, lifecycle invalidation/dispose; stale action, ghost inspection/sale and fresh-context tests. |
| 05.4 | Explicit shared/local descriptor table selects single best active value with stable ties. | VERIFIED | Exhaustive typed `SHARED_WORLD_EFFECTS`, resolver and per-tick projection; every descriptor/direction/permutation plus real traffic/rows/mobs. |
| 05.5 | One-player modifiers remain exact and owner-local benefits do not leak. | VERIFIED | Resolver single-owner tests, private river payout/damage/wallet/card-capacity checks, original solo parity. |
| 06.1 | Built prompt/lifecycle/HUD distinguishes four players, innate/personal recovery in one scene. | VERIFIED | State-derived main HUD and one `drawSession`; tracer/runtime/lifecycle/HUD matrices. |
| 06.2 | Bounded personal/Revival/Flare UI reports success only after commit and retains invalid charges. | VERIFIED | Owner/target generation checks in `openRecoveryBoard`; owner/outcomes/runtime and recovery layout cases. |
| 06.3 | All-dead offer automatically settles; ghosts/unoffered charges cannot stall forever. | VERIFIED | `pending/tick` and complete-run/offer-clock tests. |
| 06.4 | Result board uses immutable team snapshot, equal-height presentation, labels and no ranks. | VERIFIED | `createSurviveResultsBoard`, built terminal integration and component paging matrix; directly inspected result capture. Metric defect remains 02.5, not a claim that every metric is correct. |
| 06.5 | Required compact/short/large/theme/mute/motion UI avoids clipping, hidden focus and scrollbars. | VERIFIED | Current HUD 12, recovery-board 127, lifecycle 32 and result 12 frame observations; errors/external requests empty. Sampled tiny/compact/short/result captures directly. Native resize barrier waits without supplying focus. |
| 07.1 | One physical cards-first hand/market tree has a distinct Items row. | VERIFIED | Single main `createRunHand`/`createMarketUI`, `getItems`, hand Items runtime and owner market matrix. |
| 07.2 | Owner switching clears ephemeral selection/draft/target/confirmation/focus/input. | VERIFIED | `selectHudOwner`, `invalidateOwner`, `resetOwnerState`, router reseeding; paid underlying draft retained in owner's inventory, transient selection cleared; pack/focus/held-input tests. |
| 07.3 | Pointer follows visible owner; controller/keyboard confirmations follow invoking owner. | VERIFIED | Main owner context/adapter dispatch and dedicated native-keyboard/controller/hand-owner/recovery-owner browser tests. |
| 07.4 | Inactive inspection cannot mutate; ineligible actions absent; failures preserve balances. | VERIFIED | `ownerMutationsAvailable`, adapter eligibility/version checks; ghost paid-pack read-only dismissal, stale sale and rejected item purchase/use tests. Departed contributions remain inspectable in results. |
| 07.5 | Muted built acceptance reaches adoption/4 players/items/recovery/economy/result/retry/solo. | VERIFIED | `survive-complete-run-runtime.mjs` inspected directly, current log pass and artifact checkpoints; complementary Flow tracer and immutable solo parity. Fixture limitations stated below. |

**Score: 39/40.** No truth is classified UNCERTAIN. One detailed must-have is FAILED. No override or silent deferral is applied.

## Artifacts, wiring and data flow

| Artifacts (all plan-listed artifacts covered) | Exists/substantive/wired/data flow | Evidence |
| --- | --- | --- |
| `src/survive-together.ts`, `src/session.ts` | VERIFIED except result accounting gap | Main stages the composed definition; commit attaches market/effects/item capability. Fixed loop updates shared world then real personal records; handler events run after completed transitions. |
| `src/recovery.ts`, `src/game.ts` | VERIFIED | Controller converts actual session subjects/safe cells into frozen plans, revalidates and debits before apply; Game checks active player's protection before damage/death. |
| `src/survive-results.ts` | **FAILED metric, otherwise substantive/wired** | Controller terminal tick calls factory, session retains frozen record, main passes it to result UI. Input `deviceLostDuration` omits still-open intervals. |
| `src/consumables.ts`, `src/consumable-drops.ts` | VERIFIED | Session and market consume shared catalog/planners; initial/future row extension invokes keyed sampler; real claim changes owned charge/statistics. |
| `src/co-op-market.ts`, `src/market/run.ts`, `src/shared-world-effects.ts` | VERIFIED | Main request → session adapter → owner RunInventory or atomic charge credit. Per-tick active-owner effects feed actual Game course consumers. |
| `src/render.ts` | VERIFIED | One scene reads current session views and installed extension snapshot; item position/protection derives from world state, disappears on stop. |
| `src/main.ts`, `src/session-ui.ts`, `src/session-ui.css` | VERIFIED | Main projects authoritative lifecycle/recovery/charge/stats into HUD/boards, binds owner-specific actions and installs styles; no fabricated dynamic data. |
| `src/survive-results-ui.ts` and CSS | VERIFIED presentation | Actual immutable terminal record drives participant pages/stats/labels; main shows once terminal mode matches. |
| `src/market-ui.ts`, `src/run-hand.ts`, `src/hand-layout.css` | VERIFIED | One selected RunInventory plus item snapshot drives labels, offers and held counts. UI dispatches to versioned authority; owner changes reset transient view before rendering. |
| `tests/survive-together-tracer.mjs`, `tests/survive-together.test.mjs`, `tests/consumables.test.mjs`, `tests/consumable-drops.test.mjs`, `tests/consumable-world.test.mjs`, `tests/survive-economy.test.mjs` | VERIFIED behavioral test wiring | Canonical strict commands execute real loaded production modules and reject empty/skip/TODO/failure evidence. |
| `tests/solo-parity-snapshot.mjs` | VERIFIED independent oracle | Compares independently loaded original archive and current simulation/private future state, not a repinned oracle. |
| `tests/survive-results-ui.test.mjs`, `tests/survive-together-runtime.mjs`, `tests/survive-together-layout.mjs` | VERIFIED scoped browser wiring | Component result coverage is explicitly component-scoped; built-main terminal/UI integration is separately exercised in complete-run and seed/offer/runtime cases. |

All plan key links are substantively connected through these paths. In particular, UI-to-market and UI-to-recovery are indirect callbacks through main/session, not orphan imports. Level-4 data originates in live player/run/world records; no constant placeholder array substitutes for player inventories, pickups or results.

## Independent behavioral checks and blocker reproduction

These focused checks ran during verification, each completing in under one second:

| Command | Result |
| --- | --- |
| `node --test --test-name-pattern='partial recharge survives device reclaim' tests/survive-recovery-terminal.test.mjs` | 1 pass, 0 fail/cancel/skip/TODO |
| `node --test --test-name-pattern='coin magnet cards alter neither' tests/consumable-world-boundaries.test.mjs` | 1 pass, 0 fail/cancel/skip/TODO |
| `node --test --test-name-pattern='a full-hand paid pack stays with its owner' tests/survive-economy-boundaries.test.mjs` | 1 pass, 0 fail/cancel/skip/TODO |

**G1 — unreclaimed ghost contribution time is lost.** `src/session.ts:793` records `deviceLostAt`. The only accumulator is reclaim at `src/session.ts:809`. Departure at `src/session.ts:818` freezes the current statistics without closing the interval. `src/survive-results.ts:33` and `:41` copy that counter for live and archived participants. Consequently a player disconnected for positive simulation time and never reclaimed gets zero ghost time (or only old completed intervals).

The following exact production-model probe ran through `node --input-type=module -e` (temporary loader output disposed afterward; no repository test/source mutation):

```js
import {loadSources} from './tests/source-loader.mjs';
const s=await loadSources(['game','session','survive-together']);
try {
  const {Game}=await s.import('game');
  const {LocalSession}=await s.import('session');
  const {createSurviveTogetherDefinition}=await s.import('survive-together');
  for (const scenario of ['terminal-ghost','departed-ghost']) {
    const g=new Game(121,'pond','stroll',false,[],'butter');
    for (const lane of g.rows.values()) Object.assign(lane,
      {kind:'meadow',blocked:[],decorations:[],coin:null,actors:undefined});
    const session=LocalSession.stage(g,
      {mode:createSurviveTogetherDefinition(g.definition)}).commit();
    const [p1,p2]=session.players;
    session.deviceLost(p2.seat);
    for (let i=0;i<120;i++) session.update(1/120);
    if (scenario==='departed-ghost') session.depart(p2.seat);
    g.inPlayerOperation(p1,c=>c.end('verification','train'));
    session.update(1/120);
    session.declineRecovery(p1.seat);
    session.update(1/120);
    const contribution=session.result.contributions.find(
      c=>c.participantId===p2.participantId);
    console.log(JSON.stringify({scenario,time:session.world.time,
      lostAt:p2.deviceLostAt,ghostSeconds:contribution.ghostSeconds,
      lifecycle:contribution.lifecycle}));
  }
} finally { await s.dispose(); }
```

Observed:

```json
{"scenario":"terminal-ghost","time":0.5848333333333348,"lostAt":0,"ghostSeconds":0,"lifecycle":"device-lost"}
{"scenario":"departed-ghost","time":0.5848333333333348,"lostAt":0,"ghostSeconds":0,"lifecycle":"departed"}
```

Expected: positive accumulated ghost time through settlement for the first case, and through departure for the second (not through later team settlement). Durations must use the existing simulation-clock convention and freeze during pause. Repeated result reads cannot accumulate twice.

This is not deferred Phase 06 presentation work: Plan 03-02 explicitly requires ghost time in the immutable contribution snapshot, and D-16 repeats it. `tests/survive-recovery-terminal.test.mjs:189` passes because it reclaims before departure; it proves a completed interval only. The separate ghost-terminal test proves liveness, but does not assert ghost duration. This is the missing error/edge path despite the green canonical gate.

## Requirement coverage

| Requirement | Plans | Status | Evidence |
| --- | --- | --- | --- |
| COOP-01 | 01,05 | VERIFIED | R1; composed base rules, independent ownership, real shared-effect/damage/payout tests. |
| COOP-02 | 01,06 | VERIFIED | R2; live adoption, safe atomic joins, leave/replacement and continuity browser/model proof. |
| COOP-03 | 02,06 | VERIFIED | R3/02.2; separate personal threshold and visible offer/progress, provenance tests. |
| COOP-04 | 02,04,06 | VERIFIED | Frozen safe recovery transactions, exact protection/offer timing, invalid-use retention and terminal tests. |
| COOP-05 | 01,02,06 | **FAILED supporting contribution obligation** | Lifecycle/identity/inventory continuity works; D-16 result contribution loses the unreclaimed disconnect interval (G1). |
| ITEM-01 | 03,04,05,07 | VERIFIED | Separate typed catalog, capacity/eligibility/target/version plans, live UI dispatch. |
| ITEM-02 | 03,04,06 | VERIFIED | Exclusive exact bucket odds and real Revival/Flare recovery/regroup. |
| ITEM-03 | 04,05,07 | VERIFIED | Seeded world claim and visible owner-priced market purchase/item counts. |
| ITEM-04 | 04 | VERIFIED | Fractional platform and baseline gravity/magnet isolation tests. |
| ITEM-05 | 03,04 | VERIFIED | Keyed schema/golden boundaries/replay, stable once-only contest. |
| UI-03 | 05,06,07 | VERIFIED | One owner-labelled tree, wallets/items/cards/packs retained and stale owner actions rejected. |

All eleven Phase 03 requirement IDs have plan owners; no orphaned requirement was found. Requirement completion should wait for G1 closure rather than infer completion from SUMMARY frontmatter.

## Visual and external-evidence limits

Directly inspected current compact HUD, 240×240 personal-offer, 1000×280 Flare confirmation and 900×600 team-result captures. The result component screenshot is correctly labelled component evidence, not built-main evidence; `survive-complete-result.png`/complete-run report provide the separate integration path. Automated layout assertions cover the wider required frame/theme/motion matrix and report empty errors/external requests. This is not a claim to have manually inspected every screenshot or physical controller.

The complete-run browser uses the unchanged production build with injected shell capabilities and CDP access to real owners. It arranges safe lanes, wallets/offers, death calls and contested contacts, then performs UI transactions through visible controls. It proves integration and owner/state continuity; it is not unassisted end-to-end play or a probability-frequency experiment. Exact probability boundaries and normal hazard behavior are established by the complementary model/parity suites. The native resize barrier observes delivery and supplies no application focus.

Physical controllers, manifest-event validation, actual wire envelope emission and conformance lifecycle measurement remain explicitly unmeasured. The approved validation contract treats them as external/release evidence limits, not substitute passes. No newly uncertain Phase 03 truth requires a human decision; the observed defect is directly actionable.

## Anti-patterns and completion boundary

Targeted changed production files contain no unresolved `TBD`, `FIXME`, `XXX`, `TODO`, `HACK` or placeholder markers. No forbidden direct networking/native gamepad polling/browser storage/shim import was found in the checked Phase 03 surfaces. No additional stub or disconnected data flow was found. The result accounting gap is a behavioral defect, not an absence of implementation.

Relay, Race, cross-mode presentation expansion, milestone coverage thresholds and open PR remain later roadmap work; this report does not claim the overall user goal complete. **Phase 03 must close G1 and reverify its focused result paths before advancing.**

_Verifier: generic-agent fallback, applying gsd-verifier methodology; no typed-agent execution claimed._
