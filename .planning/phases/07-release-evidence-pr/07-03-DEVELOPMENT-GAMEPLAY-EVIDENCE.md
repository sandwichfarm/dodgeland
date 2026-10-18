# Shared-pickup journey and retained disconnect failure

Current status: the authored journey has reproduced a production disconnect
failure in ordinary run33247; root confirmed the source cause. Canonical
collection and a repair remain pending. The preparation and fixture corrections
below are retained as history. The earlier49-DEV-realm diagnostic remains
2020/2122L,628/694F,2214/2821B; no new coverage or floor claim is made here.

## Existing whole-suite review

Graph search for magnet/pickup/recovery browser tests returned no results; known-file and literal fallback reads were required. Findings are limited to the inspected suites, not an assertion that no other repository journey exists.

| Priority gap | Existing evidence | Reuse decision |
| --- | --- | --- |
| Shared coin/magnet arbitration and retained ownership | `survive-complete-run-runtime.mjs:95–104` already runs in DEV, but contests a consumable, not ordinary coin pull claims. `session-world.test.mjs:176` proves an actual-contact player beats another's pull, but is Node. `magnet-render.test.mjs:21–70` uses compileSources and a component page, not the real Vite DEV app. | Do not relabel either Node or module-render work as genuine DEV. Propose actual-app browser journey below. |
| Recovery terrain and fractional anchor | `survive-recovery-outcomes-runtime.mjs:82–115` already proves P2 Flare placement; `:117+` blocks all cells and preserves charges. Recovery-board layout repeats meadow/blocked-cell cases (`:42,137–148`) while checking127UI cells. `survive-recovery-boundaries.test.mjs:205` has fractional P2 anchor and actual water death, but Node-only. | Re-running the large layout suite would add UI breadth, not the missing river/traffic/mob placement behavior. Future targeted browser case should stage a fractional supported anchor and hazardous candidate cells, commit through actual item UI, then assert exact anchor, distinct safe positions, unchanged living health and protection. |
| Progressive river reward | `devtools-runtime.mjs:189` retains generated traffic/rivers after jump but does not follow coinActor movement/collection. Adoption runtime retains generated lane identities but does not collect a moving reward. `magnet-pruning.test.mjs:44` follows retained coins through pruning in Node/mocked renderer. | No inspected existing genuine app journey establishes moving platform reward-to-wallet continuity. Future browser case should select an actual generated schema3 river reward, stage only initial traveler placement, then advance real app clock and observe anchored motion→pull→single payout, without substituting actors/coinPosition. |
| Real owned-card world effects | Market/pack DEV suites assert purchases/inventory and modifier results; hand runtime asserts sale resets coinRadius. `local-session-adoption-runtime.mjs:116–152` buys a personal magnet and cosmetic via actual inventory API, then verifies owner/world/RNG adoption; no contested coin or new-row scenery effect assertion. `session-world.test.mjs:95` covers personal structural cards versus shared policy in Node. | Adoption is distinct integration evidence but not a proxy for pickup/scenery effects. Do not add a full DEV variant solely to imply these missing behaviors. Future solo browser witness can visibly purchase scenery-clear/traffic cards, generate new rows through real movement and compare retained existing-row invariance versus changed new-row effects. |

No new whole-suite registration is justified by these prioritized gaps. The prior three whole DEV jobs added only4arms, so further generic layout/owner variants should not be used as placeholder progress.

## One precise proposed browser journey before editing tests

Proposed new whole suite: `tests/development-shared-pickup-runtime.mjs`, two real controllers, one genuine DEV Survive Flow lifetime, three sequential behavioral phases, bounded90s. Use existing `createMarketGameFixture` with gamepads and exact artifact proof; start through shell snapshots and the real Local Play/start controls. Require observed actual composed mode/base/session identity. Instrumented current app and normal production counterpart may both run it; never treat a fabricated isolated module page as DEV.

1. **Public owned magnets, explicit setup provenance.** Stage only wallet, bounded named stock, safe initial meadow geometry and later coin/player starting positions through existing debugger fixture. Use real owner selection and market buttons to buy each player's magnet. Assert exact owner debit/card identity and unchanged other owner; close market/resume via public controls. No direct `collectSessionCoins`, `claimPickup`, `resolvePickups`, `Game.update` or `session.update` calls.
2. **Contact beats pull and equal-distance arbitration.** First reproduce the meaningful Node behavior in the real app: P1at−.55/P2at0 with an ordinary coin at0; advance the real controlled RAF and assert only P2receives one coin, coin cleared, no residual pickup owner/pull. Then arrange a second ordinary coin within both paid magnet ranges but outside contact, symmetric positions; advance app frames, assert one elected pull owner under the stable seat tie, no immediate payout, one tracked/drawn reward. Continue until arrival; assert one owner's wallet/coin/statistic increment exactly once and registry cleanup. Observe actual maps and rendered state; do not replace renderer or calculate expected motion by calling the same production helper.
3. **Inactive owner releases claim.** Start a third actual pull, then use a real controller disconnect snapshot before arrival. Assert retained device-lost participation, former owner cannot receive a phantom payout, inactive claim is released by the real frame loop, and the remaining active player's eventual contact/arrival yields one payout with no duplicate reward. Keep all registered players/world identities stable and distinguish disconnected retained ownership from new admission.

This targets concrete current source paths: `SharedWorld.resolvePickups:270–292` contact/pull sorting and election, `releaseInactivePickupClaims:303–305`, `Game.collectSessionCoins`/`sessionPickupContact` actual frame routes, and owned RunInventory modifier consumption. The two-controller competition can exercise comparator closures that single-target fixtures cannot. Missing hits are not used as proof of reachability; production frame callers and existing actual Node assertions establish these operations.

Capture a concise JSON record per phase (actual identity, wallets/cards, coin/pull/owner state, simulation tick) and one before/after screenshot. All observations must be read-only except the explicitly named setup. Public input plus controlled clock drives subsequent execution. Cleanup in finally collects exactly one live app realm and closes once; no product hooks or new dependencies. Estimate20–45s execution plus DEV build/collection, but this is not a floor forecast or permission to weaken90s.

## Integration and slot request

Before implementation, root must assign the new test-file responsibility; current ownership only permits suites.json and this document. Once assigned and authored, register the whole browser job with unique DEV job ID/default development/verifyArtifactScope true, exact outputs, and preserve an original production registration. No mixed Node parent is needed. Keep all26DEV source zeros and raw/global ledgers unchanged. Use one sequential ordinary/current-app check then focused genuine DEV collection; do not launch until the solo agent releases its chain and root explicitly hands off. No runtime slot is requested for a suite that has not yet been authored/reviewed.

## Authorized implementation

Root assigned the new test and registration ownership. `tests/development-shared-pickup-runtime.mjs` now authors the single90s journey above. The initial eligibility arrangement explicitly calls advanceScore(100) to make market stock available; it is not attributed as public traversal. No collection/update/lifecycle helper is called by the test. Real controlled RAF and shell disconnect snapshots perform the competition and ownership release. Actual mode classification, base, session ID and Game/world/player links are observed independently. Expected equal-time/equal-distance P1 election follows the seat.localeCompare final comparator in SharedWorld.resolvePickups, not a sampled winning seat. Purchases inspect the held card's actual components and exact wallet debit; each collection checks wallet/coin/pickup deltas, other resources, empty pull registry and delayed duplicate-payout rejection.

`shared-pickup-03` registers the same whole test twice with independent production/development artifact identity proofs; both exact job definitions also appear in full execution. The three output paths are preserved by each job's normal artifact archive/restore mechanism. No original registration changed, no Node realm added, no coverage exclusions or floors changed.

**Status: authored, not executed or committed.** Root owns the slot after the solo chain; await explicit slot grant before tooling checks, ordinary browser or canonical collection. Runtime may expose fixture assumptions; retain failures and correct only the test or an independently proven product defect within authorized scope. No evidence gain or coverage percentage is claimed from this draft.

Draft review corrections: resource invariants now include health, maxHealth, hurtRemaining, deaths and damage; an actual in-flight screenshot is registered alongside before/after/JSON (four outputs per job). The screenshot is a single observed pull state, not a claim of visually proven continuous motion. Runtime remains pending serial handoff.

## Retained ordinary diagnosis and product finding (canonical not run)

Ordinary sessions46974/24388/52069/95352/39241/95664/70303/96024/33247 all exited1; logs `/tmp/down-to-duck-shared-pickup-ordinary.log` then `-2.log` through `-9.log`. Early failures were fixture errors: selecting compact HUD inspection before market hid the opener; paused clock needed an explicit frame after eligibility setup; changing stock/revision after opening correctly invalidated the transaction token; reopening during the existing modal context was unnecessary; close animation requires350ms before playing; recovery.lastSafe naturally follows the arranged positions and must not be treated as an immutable resource. Current invariants retain every recovery field except lastSafe, plus health/maxHealth/hurt/deaths/damage. No force clicks or product mutation were used.

Final ordinary33247 reaches and passes both public paid magnet purchases, contact-before-pull, equal-distance P1 election and exactly one P1 pull payout. It then fails the meaningful disconnect assertion. Raw report `/tmp/down-to-duck-shared-pickup-ordinary-evidence/shared-pickup-runtime.json`: prior payout tick99, public disconnect checkpoint tick105; P1 participation=device-lost, P2active, both wallets89; pickupOwners remains[[0,p1]], and coinPull remains x=-0.0010033502044300888,speed0.13839671501215256. The retained ordinary wrapper restored all four original outputs and verified normal dist bytes unchanged.

Positive source explanation: `LocalSession.deviceLost` changes participation but preserves the living player's state. `SharedWorld.releaseInactivePickupClaims` filters only state===playing, so it retains the disconnected owner's claim. `collectSessionCoins` rejects the other owner when the stored seat differs. Active session ticks continue but the inaccessible reward remains attached to the disconnected seat. Root notified before any production change; no canonical collection or floor claim. This is a potential production defect rather than a reason to relax the lifecycle assertion.

## Root-authorized production repair scope

After retaining RED in0638b42 and independently confirming the caller/state cause, root assigned exactly SharedWorld.releaseInactivePickupClaims in src/session.ts: require both state===playing and participation===active. Keep the caller's complete players list, preserving active Relay future-owner continuity. No mode checks, resets, RNG changes or other product edits. Authorized serial validation: type-check/build, unchanged whole new ordinary browser journey with four outputs restored, session-world/relay-boundary/race-lifecycle/session-device-lifecycle, guidance/conformance. Canonical collection remains blocked pending root-owned applicability source-pin reconciliation. No commit before review.

## Narrow repair ordinary validation (canonical still held)

Applied only the authorized participation predicate; current src/session.ts SHA256 f8ce62cdc5c87557636cce62f0b15005bfa5f9cde42c708d67915b4c1ebcec39. Normal built dist/index.html SHA256 a34fd21258f80302593c584f5a9566f7511af49798c0b0cac6dacc1beb478bc1. Type56253 and build exit0 (`/tmp/down-to-duck-shared-pickup-repair-{type,build}.log`). Unchanged whole browser witness82694 exit0,1/1,2465ms (`...-ordinary.log`); wrapper restored four outputs and verified new normal dist unchanged. Current completed report and images are in `/tmp/down-to-duck-shared-pickup-ordinary-evidence/`; RED remains separately preserved in `/tmp/down-to-duck-shared-pickup-disconnect-red-evidence/`. Independently opened in-flight PNG shows two travelers and one reward; no continuous visual-motion claim.

Boundary39925 exited1,43/44 (`...-boundaries.log`): session-world, Relay boundary and device lifecycle checks passed; Race lifecycle permutation equality at181 differs only in independent participant lifetime IDs12 versus13. Root notified; no unauthorized alteration of that suite. Guidance7/7 exit0 and conformance84456 exit0,5pass/0fail/5unmeasured (`...-guidance.log`, `...-conformance.log`). No hardware or missing conformance lifecycle credit. No canonical collection, source-pin update or commit performed by this worker.

## Authorized Race permutation identity correction

Root assigned the single stale assertion in tests/race-lifecycle.test.mjs after reviewing the43/44 result. The test now captures authoritative session/seat→participant IDs before lifecycle actions, verifies each ID belongs to its actual session and each frozen result retains that exact ID, and asserts session and per-seat IDs differ across the two independent lifetimes. Only verified result participantId values are normalized to seat tokens at the cross-lifetime comparison boundary. Every other result field and full append-only RaceLifecycleEvent remains compared; inspected event type contains seat/state/reason/tick/time and no participant ID. No production change accompanied this correction.

Sequential strict runner82322 exit0: `node --test --test-concurrency=1 tests/session-world.test.mjs tests/relay-boundary.test.mjs tests/race-lifecycle.test.mjs tests/session-device-lifecycle.test.mjs`,44/44,19512ms; durable log `/tmp/down-to-duck-shared-pickup-repair-boundaries-2.log`. Serial slot released to root for applicability controls. Canonical remains pending explicit handoff, and no commit made by this worker.

## Current terminal canonical evidence — repair accepted technically, floors open

After root19/19 applicability controls, canonical51569 exited0: `node tools/release-coverage/run.mjs --suite shared-pickup-03 --report-only`, log `/tmp/down-to-duck-shared-pickup-canonical.log`; run **f6cdf906-bf4d-4980-8540-40e11f0dc4fc** under `artifacts/release-coverage/shared-pickup-03/`. Both whole jobs passed1/1 (production8185ms, DEV7987ms), ledger exit0 for both, exactly2independent browser payloads and no Node payload. Both archived reports are complete=true/errors=[]/external=[] and each archives all4declared outputs. The four ordinary paths returned to their pre-run absence; normal dist SHA remains a34fd21258f80302593c584f5a9566f7511af49798c0b0cac6dacc1beb478bc1.

Actual artifact proofs: production cdf0a928477d5d35fb3f6aef586bb97f7ccb17be7c96dfc0b63e28f0c925d2f5 / script f65288211fa0e312a27c178603f40681832071a4cc3fe817238e461be5a2dcd3 / developmentTools=false; DEV9a07f6a477d4dd2ccc4c5b2d5825a93ca63690583a4ab44baf8a6247d036be83 / script3c554331341029648d5e234186c5d9cf4d4e7322bec8767bfc9fdfa443a6a4bb / developmentTools=true. Distinct job/build/artifact identities share only the intentional scenario name market-fixture-0.

Focused DEV policy26-file raw/applicable metrics: **1157/2122lines,360/694functions,1054/2823branch arms**. The new participation conjunction adds two arms versus historical2821; no old-session union was made. Global all-source report remains3501/7988L,829/2241F,2784/9987B. Report-only explicitly does not evaluate thresholds and is not release acceptance.

Mapped DEV exact-site evidence (current `strata/development/coverage-final.json` only):

| Site | Counter evidence | Limit |
| --- | --- | --- |
| session.ts268 claimPickup /271 claimPickupPull | F13=3/F14=103 | Three actual rewards, multiple pull proposals |
| session.ts274 resolvePickups | F15=222 | Actual app frame resolution |
| session.ts284 pull ordering | F17=2; B11=[2,2,2] | Equal-time/distance seat tie exercised |
| session.ts275 contact comparator | F16=0/B9=[0,0,0] | Contact-versus-pull is proven; two simultaneous contact comparator candidates are not |
| session.ts302–304 inactive cleanup | F22=222,F23=444,F24=323; B17=[444,444],B18=[1,99] | Actual disconnect causes one deletion; binary-expression counts alone do not establish boolean outcomes, behavioral owner switch does |
| game.ts688 collectSessionCoins | F110=323 | Real frame-driven shared collection |
| game.ts698 ordinary contact | B273=[1,354] | One contact payout |
| game.ts705 existing-owner rejection | B275=[51,303] | Other owner is rejected while claim is active |
| game.ts706 retained/new pull | B277=[100,203] | Both pulled/unpulled paths |
| game.ts714 completion | B281=[2,103] | Two completed magnet pulls |

The ordinary GREEN report records P1disconnect→P2claim at tick105, P2single award at151 (wallet90/coins2/pickups2), and unchanged totals at222; P1remains device-lost wallet89/coins1/pickups1. Health, death, damage, hurt, cards, cosmetics and recovery resources remain unchanged; lastSafe is deliberately excluded from resource equality because real frames update the arranged safe position. Source/map/schema identities below bind this evidence; no historical session counters were merged.

```json
[
  {
    "path": "/Users/sandwich/Develop/crossy-road-clone/src/game.ts",
    "sourceHash": "fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6",
    "mapHash": "74685cf919be7ef0d9572cda8cc41cb2ae1c191ca2c5be3ef26bf0739f3fdf83",
    "schemaHash": "97d9b9dcee98ae322683debcc90896244c557c6874bb3977c63c3e4cedfc014c"
  },
  {
    "path": "/Users/sandwich/Develop/crossy-road-clone/src/session.ts",
    "sourceHash": "f8ce62cdc5c87557636cce62f0b15005bfa5f9cde42c708d67915b4c1ebcec39",
    "mapHash": "a162249942d506d928c03a2dbb13e2be61284af301487ec7e12fbc17f334c137",
    "schemaHash": "96eaca2a2357c67d04c57dd1d40522a758d884c836a67f59ff7a272e3121b908"
  }
]
```

No commit by this worker. Runtime slot returned to root; current work is evidence-only.
