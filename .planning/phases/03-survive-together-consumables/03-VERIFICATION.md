---
phase: 03-survive-together-consumables
verified: 2026-10-15T23:01:52Z
status: passed
score: 42/42 must-haves verified
behavior_unverified: 0
overrides_applied: 0
verifier_execution: generic-agent fallback applying gsd-verifier instructions; not typed-agent execution
source_revision: 6017f9f
reviewed_head: 5ce1067
re_verification:
  previous_status: gaps_found
  previous_score: 39/40
  gaps_closed:
    - "G1: unreclaimed ghost time is now included through departure or team settlement without double counting."
  gaps_remaining: []
  regressions: []
---

# Phase 03: Survive Together & Consumables Verification

**Goal:** Friends can join a live Arcade or Flow run, recover from setbacks, and use deterministic cooperative consumables without disrupting the shared course.

**Verdict: passed.** All five roadmap criteria, all 35 original plan truths, and both Plan 03-08 closure truths are verified. The previously reproduced D-16 contribution defect is closed by substantive code and new production-path assertions. No remaining Phase 03 blocker or uncertain truth was found.

This is the explicitly requested **generic-agent fallback**, applying the full `gsd-verifier.toml` methodology and references. It is **not** a successful typed `gsd-verifier` launch. Re-verification fully inspected the prior failed path and both new Plan 03-08 truths; prior passing truths received regression checks. No overrides were applied. No source edits, installs, browser launches, preview changes, or commits were made by this verifier.

## Evidence provenance

- Initial evidence was `/tmp/down-to-duck-root-phase3-resize-gate.log` on `67b282b`. Re-verification inspected actual current canonical output `/tmp/down-to-duck-ghost-duration-final-gate.log`, not just SUMMARY claims. Root recorded exit 0 for session 73933. Final browser group is again 34/34, with no failures, cancellation, skips or TODOs.
- `git diff 6017f9f HEAD -- src tests package.json` is empty at reviewed HEAD `5ce1067`. Since the initial review, production changes are limited to departure accounting and result projection, plus the eight-case regression matrix. Previously verified UI/input/item/recovery behavior and wiring remain intact. The original solo oracle remains `a310a81ed6c76df4b265c9012c23b8c83f4802e5`; an independent lockfile comparison passed again.
- Current canonical prefix contains 21 parity, 271 retained solo regression, 19 renderer, and 72 session/input model cases, then the session browser/runtime gates. Phase 03 includes 30 admission/tracer/boundary, 19 economy, **44 recovery** (36 original plus 8 closure), 18 consumable, 25 world, 3 world-render cases, market/magnet/mob/death-spill regressions, and the 34-case final browser/results group. Type-check, build and guidance passed. No broad gate was rerun gratuitously by the verifier.
- Inspected `/tmp/down-to-duck-ghost-duration-red.log`: all eight new cases failed on the missing duration before the fix, including prior reclaimed totals. Inspected `/tmp/down-to-duck-ghost-duration-green.log`: focused production lifecycle/terminal/result UI checks passed 25/25 and type-check passed. Independently reran two exact named cases and the original reproduction, as recorded below.
- Both conformance reports say **5 passed, 0 failed, 5 unmeasured**: three manifest checks, one wire-envelope check and one lifecycle check. Those five are not proven behavior.
- Read the roadmap, requirements, phase context, original seven plans/summaries plus closure Plan/Summary 03-08, validation/UI contract and UI review, earlier phase verification, project AGENTS and boundary documents. Graph-first discovery located session/recovery/main symbols; graph snippets supplied implementation, with direct file reads for surrounding code and literal/config searches. No project-local agent skills or configured verifier skills were returned.

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
| 01.5 | Ghost/reclaim/depart/death/new join remain disjoint with specified ownership. | VERIFIED | Separate lifecycle dispatch, archive/release, provenance; ghost exclusion and replacement-seat tests. Result-time accounting is now covered by 02.5 and 08.1–08.2. |
| 02.1 | Innate 100-tile save stays exact; only actual death clears/spills and opens personal offer. | VERIFIED | Immutable parity, character-power/death-spill regression, production death/protection/offer cases. |
| 02.2 | Personal grant/recharge cannot be farmed through backtracking or aliases/relocation. | VERIFIED | `settleForwardHop`, `recordPersonalProgress`, `recoveryFor`/`bindRecovery`; 249/250/251, unfinished fatal hop, relocation and alias tests; independent named recharge test passed. |
| 02.3 | All recovery targets/placements/protection validate before mutation or debit. | VERIFIED | Frozen planner and same-tick revalidation; unsafe/stale/debit-refusal and distinct-placement production tests. |
| 02.4 | Only an unexpired 8-active-second offer delays all-dead settlement; pause freezes it. | VERIFIED | Controller `pending/tick`, session pause guard; both base-mode terminal tests and built offer-clock/complete-run assertions. |
| 02.5 | Immutable shared result contains full per-character contributions and team podium. | VERIFIED | Departure finalizes open interval before archive; live contribution projects remaining interval at settlement. Eight real lifecycle tests plus independent original-probe rerun close G1. |
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
| 06.4 | Result board uses immutable team snapshot, equal-height presentation, labels and no ranks. | VERIFIED | `createSurviveResultsBoard`, built terminal integration and component paging matrix; directly inspected result capture. Corrected metric accounting is separately proven in 02.5. |
| 06.5 | Required compact/short/large/theme/mute/motion UI avoids clipping, hidden focus and scrollbars. | VERIFIED | Current HUD 12, recovery-board 127, lifecycle 32 and result 12 frame observations; errors/external requests empty. Sampled tiny/compact/short/result captures directly. Native resize barrier waits without supplying focus. |
| 07.1 | One physical cards-first hand/market tree has a distinct Items row. | VERIFIED | Single main `createRunHand`/`createMarketUI`, `getItems`, hand Items runtime and owner market matrix. |
| 07.2 | Owner switching clears ephemeral selection/draft/target/confirmation/focus/input. | VERIFIED | `selectHudOwner`, `invalidateOwner`, `resetOwnerState`, router reseeding; paid underlying draft retained in owner's inventory, transient selection cleared; pack/focus/held-input tests. |
| 07.3 | Pointer follows visible owner; controller/keyboard confirmations follow invoking owner. | VERIFIED | Main owner context/adapter dispatch and dedicated native-keyboard/controller/hand-owner/recovery-owner browser tests. |
| 07.4 | Inactive inspection cannot mutate; ineligible actions absent; failures preserve balances. | VERIFIED | `ownerMutationsAvailable`, adapter eligibility/version checks; ghost paid-pack read-only dismissal, stale sale and rejected item purchase/use tests. Departed contributions remain inspectable in results. |
| 07.5 | Muted built acceptance reaches adoption/4 players/items/recovery/economy/result/retry/solo. | VERIFIED | `survive-complete-run-runtime.mjs` inspected directly, current log pass and artifact checkpoints; complementary Flow tracer and immutable solo parity. Fixture limitations stated below. |
| 08.1 | Results include the full open ghost interval through departure or settlement, without double counting earlier reclaims. | VERIFIED | Eight cases cover Arcade/Flow × terminal path × prior reclaim; assert expected completed total plus exact boundary delta. Two independent named reruns and original probe passed. |
| 08.2 | Pause and post-departure time do not accrue; repeated result reads stay immutable. | VERIFIED | Every new case pauses for 20 seconds and asserts frozen world time; departure cases add later team time; all mutate live counters/timestamps and advance after settlement while asserting identical frozen results. |

**Score: 42/42.** No FAILED or UNCERTAIN truth remains. No override or silent deferral is applied.

## Artifacts, wiring and data flow

| Artifacts (all plan-listed artifacts covered) | Exists/substantive/wired/data flow | Evidence |
| --- | --- | --- |
| `src/survive-together.ts`, `src/session.ts` | VERIFIED | Main stages the composed definition; commit attaches market/effects/item capability. Fixed loop updates shared world then real personal records; handler events run after completed transitions. Departure closes its open ghost interval before frozen archival. |
| `src/recovery.ts`, `src/game.ts` | VERIFIED | Controller converts actual session subjects/safe cells into frozen plans, revalidates and debits before apply; Game checks active player's protection before damage/death. |
| `src/survive-results.ts` | VERIFIED | Controller terminal tick passes authoritative settlement time to factory; live contribution adds any still-open interval without mutating player state. Archived contribution uses departure-finalized statistics. Session retains the frozen record, main passes it to result UI. |
| `src/consumables.ts`, `src/consumable-drops.ts` | VERIFIED | Session and market consume shared catalog/planners; initial/future row extension invokes keyed sampler; real claim changes owned charge/statistics. |
| `src/co-op-market.ts`, `src/market/run.ts`, `src/shared-world-effects.ts` | VERIFIED | Main request → session adapter → owner RunInventory or atomic charge credit. Per-tick active-owner effects feed actual Game course consumers. |
| `src/render.ts` | VERIFIED | One scene reads current session views and installed extension snapshot; item position/protection derives from world state, disappears on stop. |
| `src/main.ts`, `src/session-ui.ts`, `src/session-ui.css` | VERIFIED | Main projects authoritative lifecycle/recovery/charge/stats into HUD/boards, binds owner-specific actions and installs styles; no fabricated dynamic data. |
| `src/survive-results-ui.ts` and CSS | VERIFIED presentation | Actual immutable terminal record drives participant pages/stats/labels; main shows once terminal mode matches. |
| `src/market-ui.ts`, `src/run-hand.ts`, `src/hand-layout.css` | VERIFIED | One selected RunInventory plus item snapshot drives labels, offers and held counts. UI dispatches to versioned authority; owner changes reset transient view before rendering. |
| `tests/survive-together-tracer.mjs`, `tests/survive-together.test.mjs`, `tests/consumables.test.mjs`, `tests/consumable-drops.test.mjs`, `tests/consumable-world.test.mjs`, `tests/survive-economy.test.mjs` | VERIFIED behavioral test wiring | Canonical strict commands execute real loaded production modules and reject empty/skip/TODO/failure evidence. |
| `tests/solo-parity-snapshot.mjs` | VERIFIED independent oracle | Compares independently loaded original archive and current simulation/private future state, not a repinned oracle. |
| `tests/survive-results-ui.test.mjs`, `tests/survive-together-runtime.mjs`, `tests/survive-together-layout.mjs` | VERIFIED scoped browser wiring | Component result coverage is explicitly component-scoped; built-main terminal/UI integration is separately exercised in complete-run and seed/offer/runtime cases. |
| `tests/survive-recovery-terminal.test.mjs` (03-08) | VERIFIED | Eight added production lifecycle cases use real world ticks, pause/reclaim/departure/water death/offer expiry. They assert computed boundary durations and frozen result identity, rather than merely mirroring the fix's expression. Canonical recovery runner executes them. |

All plan key links are substantively connected through these paths. In particular, UI-to-market and UI-to-recovery are indirect callbacks through main/session, not orphan imports. Level-4 data originates in live player/run/world records; no constant placeholder array substitutes for player inventories, pickups or results.

## Independent behavioral checks and closed-gap reproduction

These focused checks ran during verification, each completing in under one second:

| Command | Result |
| --- | --- |
| `node --test --test-name-pattern='partial recharge survives device reclaim' tests/survive-recovery-terminal.test.mjs` | 1 pass, 0 fail/cancel/skip/TODO |
| `node --test --test-name-pattern='coin magnet cards alter neither' tests/consumable-world-boundaries.test.mjs` | 1 pass, 0 fail/cancel/skip/TODO |
| `node --test --test-name-pattern='a full-hand paid pack stays with its owner' tests/survive-economy-boundaries.test.mjs` | 1 pass, 0 fail/cancel/skip/TODO |

**G1 — CLOSED: unreclaimed ghost contribution time.** At initial source `67b282b`, only reclaim accumulated the open interval; departure and result projection omitted it. At `6017f9f`, `src/session.ts:817` adds the current simulation-time delta and clears `deviceLostAt` before archival. `src/survive-results.ts:33` adds the open delta using the factory's settlement time; archived records remain simple frozen copies. No gameplay clock advances and live result projection does not mutate counters. Null timestamps add zero, preserving reclaimed totals exactly once.

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

Initial observed failure at `67b282b` (historical, now fixed):

```json
{"scenario":"terminal-ghost","time":0.5848333333333348,"lostAt":0,"ghostSeconds":0,"lifecycle":"device-lost"}
{"scenario":"departed-ghost","time":0.5848333333333348,"lostAt":0,"ghostSeconds":0,"lifecycle":"departed"}
```

Expected: positive accumulated ghost time through settlement for the first case, and through departure for the second (not through later team settlement). Durations must use the existing simulation-clock convention and freeze during pause. Repeated result reads cannot accumulate twice.

Re-verification reran that exact original probe independently on `6017f9f` and observed:

```json
{"scenario":"terminal-ghost","time":0.5848333333333348,"lostAt":0,"ghostSeconds":0.5848333333333348,"lifecycle":"device-lost"}
{"scenario":"departed-ghost","time":0.5848333333333348,"lostAt":null,"ghostSeconds":0.5800000000000014,"lifecycle":"departed"}
```

The departure value correctly excludes the later team tick. Additional independent commands each passed **1/1, no failures/cancellations/skips/TODOs**:

- `node --test --test-name-pattern='arcade: settlement includes an open ghost interval after a previous reclaim' tests/survive-recovery-terminal.test.mjs`
- `node --test --test-name-pattern='stroll: departure includes an open ghost interval after a previous reclaim' tests/survive-recovery-terminal.test.mjs`

Plan 03-02 explicitly requires this contribution, so G1 was not deferred to Phase 06. The old archived-result test only exercised reclaim-before-departure. New tests at `tests/survive-recovery-terminal.test.mjs:225` close both missing terminal paths, with and without prior reclaimed intervals, in both modes. Inspection confirms meaningful pause, boundary-time, lifecycle and immutable snapshot assertions; actual RED failures establish their sensitivity to the defect. No residual G1 path was found.

## Requirement coverage

| Requirement | Plans | Status | Evidence |
| --- | --- | --- | --- |
| COOP-01 | 01,05 | VERIFIED | R1; composed base rules, independent ownership, real shared-effect/damage/payout tests. |
| COOP-02 | 01,06 | VERIFIED | R2; live adoption, safe atomic joins, leave/replacement and continuity browser/model proof. |
| COOP-03 | 02,06 | VERIFIED | R3/02.2; separate personal threshold and visible offer/progress, provenance tests. |
| COOP-04 | 02,04,06 | VERIFIED | Frozen safe recovery transactions, exact protection/offer timing, invalid-use retention and terminal tests. |
| COOP-05 | 01,02,06,08 | VERIFIED | Lifecycle/identity/inventory continuity and corrected D-16 unreclaimed interval accounting; eight closure cases and original independent probe passed. |
| ITEM-01 | 03,04,05,07 | VERIFIED | Separate typed catalog, capacity/eligibility/target/version plans, live UI dispatch. |
| ITEM-02 | 03,04,06 | VERIFIED | Exclusive exact bucket odds and real Revival/Flare recovery/regroup. |
| ITEM-03 | 04,05,07 | VERIFIED | Seeded world claim and visible owner-priced market purchase/item counts. |
| ITEM-04 | 04 | VERIFIED | Fractional platform and baseline gravity/magnet isolation tests. |
| ITEM-05 | 03,04 | VERIFIED | Keyed schema/golden boundaries/replay, stable once-only contest. |
| UI-03 | 05,06,07 | VERIFIED | One owner-labelled tree, wallets/items/cards/packs retained and stale owner actions rejected. |

All eleven Phase 03 requirement IDs have plan owners and verified evidence; no orphaned requirement was found. G1 closure is independently demonstrated rather than inferred from SUMMARY frontmatter.

## Visual and external-evidence limits

Directly inspected current compact HUD, 240×240 personal-offer, 1000×280 Flare confirmation and 900×600 team-result captures. The result component screenshot is correctly labelled component evidence, not built-main evidence; `survive-complete-result.png`/complete-run report provide the separate integration path. Automated layout assertions cover the wider required frame/theme/motion matrix and report empty errors/external requests. This is not a claim to have manually inspected every screenshot or physical controller.

The complete-run browser uses the unchanged production build with injected shell capabilities and CDP access to real owners. It arranges safe lanes, wallets/offers, death calls and contested contacts, then performs UI transactions through visible controls. It proves integration and owner/state continuity; it is not unassisted end-to-end play or a probability-frequency experiment. Exact probability boundaries and normal hazard behavior are established by the complementary model/parity suites. The native resize barrier observes delivery and supplies no application focus.

Physical controllers, manifest-event validation, actual wire envelope emission and conformance lifecycle measurement remain explicitly unmeasured. The approved validation contract treats them as external/release evidence limits, not substitute passes. No uncertain Phase 03 truth or new human-verification item remains.

## Anti-patterns and completion boundary

Targeted changed production files contain no unresolved `TBD`, `FIXME`, `XXX`, `TODO`, `HACK` or placeholder markers. No forbidden direct networking/native gamepad polling/browser storage/shim import was found in the checked Phase 03 surfaces. No additional stub or disconnected data flow was found. The result accounting behavioral defect is now closed.

Relay, Race, cross-mode presentation expansion, milestone coverage thresholds and open PR remain later roadmap work; this report does not claim the overall user goal complete. **Phase 03 is verified and may advance to its dependent phases.**

_Verifier: generic-agent fallback, applying gsd-verifier methodology; no typed-agent execution claimed._
