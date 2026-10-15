---
phase: 03-survive-together-consumables
status: planned
baseline: "a310a81ed6c76df4b265c9012c23b8c83f4802e5 — immutable solo model/render oracle"
requirements:
  - COOP-01
  - COOP-02
  - COOP-03
  - COOP-04
  - COOP-05
  - ITEM-01
  - ITEM-02
  - ITEM-03
  - ITEM-04
  - ITEM-05
  - UI-03
---

# Phase 03 Validation Contract

Phase 3 is complete only when the final production bundle lets two to four players adopt or join a live Arcade/Flow run, survive and recover through the approved mechanics, and acquire/use deterministic cooperative consumables without resetting the shared course or weakening exact solo parity. Model evidence must exercise real production objects. Runtime and visual evidence must use the built napplet in an opaque `allow-scripts` iframe with browser audio muted.

## Locked Decisions

These IDs normalize the locked requirements in `03-CONTEXT.md`, the approved `03-UI-SPEC.md`, and the concrete policies resolved for the research assumptions. Every implementation task cites the IDs it carries.

| ID | Locked decision |
|----|-----------------|
| D-01 | Survive Together composes either released Arcade or stored `stroll`/Flow rules through the shipped mode definition/handler seam. One shared world advances terrain, actors, clocks, RNG, claims, mobs, retention, and camera once; each seat owns movement, health, innate power, inventory, revival state, and statistics. Core input/render/update code receives definitions and handlers rather than branching on a mode ID. |
| D-02 | A live second-player request is explicit and consumes both its opening and confirmation edges. A unique character and safe placement are required before the new actor exists. Capacity is the inherited validated session setting with a working default of four. |
| D-03 | Entering co-op from active solo stages the identical world/player/inventory/actor/RNG objects. `Keep playing solo` resumes byte/semantic-identical solo state; `Start together` transfers loop ownership once. Live joins/leaves never reset course, clocks, score, seed, purchases, or another player. |
| D-04 | Active, joining, ghost, reclaim-ready, dead, recovery-pending, and departed are disjoint. A ghost cannot move, collide, take damage, progress, or claim items but retains slot, character, wallet, cards, powers, cosmetics, consumables, and statistics. Reclaim restores that record. Deliberate departure archives its contribution without spill/refund/transfer and later participation is a new join, while a minimal run-local recovery-provenance ledger preserves grant state/high-water/threshold across the same participant's seat, device, or character aliases so departure cannot reset a spent charge. Explicit participant identity wins; known device/reacquired character is the fallback when no stronger identity exists; a demonstrably different participant receives independent provenance. |
| D-05 | The existing automatic 100-tile character hazard save remains exact and separate. Personal revival starts with at most one charge per run-local recovery provenance; after use, only that same player's newly reached personal furthest tiles can recharge it at +250. Backtracking, ghost reclaim/rejoin, deliberate leave/new join, seat/device/character reassignment, safe placement, Revival, and Flare relocation grant no recharge progress or replacement charge. The same provenance retains partial progress and its next threshold, and never transfers to a different participant. |
| D-06 | Actual death snapshots only the dead player's wallet and owned cosmetics into the existing coin/cosmetic spill, then clears that player's wallet, fractional balance, cards, powers, cosmetics/equipment, pending market/pack state, and consumables before any recovery offer. The character and contribution ledger remain; recovery restores the empty player. Disconnect/departure do not execute the death economy. |
| D-07 | A charged player gets one manual self-revive offer for that death generation lasting 8 active-play seconds; pause freezes it. Decline/expiry closes the offer without spending the charge. A team continues only while at least one active player or one unexpired valid offer exists. Ghosts, stored unoffered charges, unused teammate items without an active owner, and late input after settlement cannot hold the run open. |
| D-08 | Personal revival, Revival, and Flare use one plan-then-commit recovery path. Revival targets one eligible dead teammate. Flare requires at least one eligible dead teammate, returns every eligible dead teammate, and moves every active/returned teammate to deterministic distinct safe cells around the user's safe anchor. Every placement and target is validated before mutation or charge spend. |
| D-09 | Return cells are supported, hazard/actor/boundary safe at current world time, distinct, and no farther forward than the living-group frontier. An all-dead personal revive uses that player's retained last-safe position at or behind their personal frontier. Returned players receive 2 active simulation seconds of protection; pauses freeze it. |
| D-10 | Consumables are a separate extensible item class, not cards, cosmetics, temporary powers, or innate powers. Revival and Flare are Survive Together eligible, each has a maximum held charge of one, invalid/ineligible uses spend nothing, and authoritative outcomes identify owner and affected targets. |
| D-11 | The isolated `item-drop-schema-1` sampler maps bucket `0` of 2,500 to Revival, buckets `1` and `2` to Flare, and `3..2499` to none. One anchor has one mutually exclusive outcome. The pure keyed stream uses course seed plus stable row/anchor identity and rejection only inside that stream; terrain, coin denomination, market, mob, and audio RNG streams and released schemas 1–3 remain byte-for-byte unchanged. |
| D-12 | The composed Survive handler installs one session-owned item capability/ledger only after adoption commits. Without it, ordinary Arcade/Flow has no item state/serialization/render nodes or sampler/update/pull/claim/prune work and remains exact to `a310a81`; the definition-driven seam lets later modes opt in without core mode-ID branches. With it, initial rows, future generation, out-of-order inspection, retention, attraction, pruning, replay, and claimed ledgers produce deterministic item identity. Same-tick contacts award once by contact fraction, distance squared, then stable seat ID; dead/ghost/departed/full-inventory seats are ineligible. |
| D-13 | World consumables reuse the existing pull/contact/platform path with imported baseline `DEFAULT_COIN_GRAVITY` (`0.1` in the current API), including fractional log positions. A player's `coinRadius`, magnet cards, and coin powers can change coin attraction only; they never change item range, velocity, claim order, odds, or eligibility. |
| D-14 | The owner-aware shop exposes Revival at 24 coins and Flare at 36 coins only in eligible Survive Together runs. Purchase, sell, pack draft, target selection, and use resolve the visible stable owner and input context atomically. The one persistent hand/market tree clears old card/offer/draft/target/confirmation/focus/latch state before showing another owner. |
| D-15 | Shared-world card effects resolve once at the mode boundary from active seats through an explicit descriptor table. World fields choose the single best benefit (minimum for harmful speeds/damage cadence, maximum for spacing/length/warnings/trails/delays/chance/clearance), ties choose lower seat ID, and benefits never stack. Player-local wallet, coin pull/award, health, recovery, shield, and hand-capacity fields remain owner-local. Solo uses its exact existing `RunInventory.effects`; later modes declare their own policy. |
| D-16 | Survive results are an immutable mode-owned snapshot with shared distance/time/outcome and each participant's character, final lifecycle state, furthest progress, coins, deaths, self-revives, teammate revives, items found/used, and ghost time. The visual is one equal-height team perch and per-character contributions; it has no competitive rank or first/last placement. |
| D-17 | The approved Phase 3 UI contract is binding: separate Power and Personal revive rows, explicit owner/target copy, 44px actions, exact 240×240 floor notice, purpose-built compact/short pages without scrollbars, full-surface dark/light themes, reduced-motion static states, and contextual muted feedback. No app title/tagline/masthead/footer or parallel hand/market tree is added. |

## Evidence Order

### Gate 0 — Verified dependencies and live API reconciliation

Before any Phase 3 production edit:

1. Require non-empty Phase 1 summaries `01-01` through `01-04` and Phase 2 summaries `02-01` through `02-06`.
2. Read those summaries and the live exports they name. Record the actual mode-definition, rule-group, lifecycle-handler, `SharedWorld`, `SessionPlayer`, `LocalSession`, input-consumption, adoption, owner-router, render-view, and statistics APIs in `03-01-SUMMARY.md`. Plan prose is not authority for shipped symbol names.
3. Run the final Phase 1 and Phase 2 validation commands against the untouched Phase 3 starting point, including exact `a310a81` model/private-future-state and same-browser render parity.
4. Stop if any promised ownership/adoption/handler/owner-tree contract is absent. Do not create a parallel session, compatibility fork, alternate mode registry, or new shell/NAP surface to hide the mismatch.

### Gate 1 — Live co-op tracer and lifecycle

Plan 03-01 proves one complete path first: active solo Arcade stages `Play together?`, cancel resumes unchanged, commit adopts the exact owners, a second unique character spawns safely after consumed input, and both players continue in one course. The same handler composition is parameterized over Arcade and Flow. Expansion scenarios cover seats 2–4, full capacity, safe-join failure, deliberate leave, controller ghost, reclaim, and new join after departure.

The tracer reruns the immutable solo oracle immediately after mode/session integration. Any new product-facing observability used only by tests is forbidden; test adapters may inspect production state using the established source-loader/parity patterns.

### Gate 2 — Recovery, terminal state, and results

Plan 03-02 uses production death, progress, safe-placement, and fixed-tick state for:

- existing 100-tile innate save versus actual death versus personal 250-tile charge;
- initial charged state, spend, threshold `249/250/251`, repeated backtracking, ghost reclaim, deliberate new join, same/different seat, participant/character/device reassignment, traveler reacquisition, Revival, and Flare relocation;
- 8 active-second offer accept/decline/expiry, pause freeze, repeated input, result finalization, and late activation rejection;
- safe-cell failure with no partial mutation, all-dead personal return, 2-second protection, and hazard-loop prevention;
- team liveness with active/recovery-pending/ghost/dead/departed combinations;
- one immutable team result and contribution ledger that late input cannot mutate.

### Gate 3 — Consumable definitions and isolated sampler

Plan 03-03 tests the production catalog, charge/eligibility/target contracts, and exact sampler. Boundary inputs `-1`, `0`, `1`, `2`, `3`, and `2499` prove validation and exclusive classification. Golden keyed vectors pin `item-drop-schema-1`. Creating item rolls before, during, after, and out of order with terrain/coin/market/mob operations must leave every non-item snapshot and next RNG output identical.

### Gate 4 — World pickup integration and economy

Plans 03-04 and 03-05 use real rows, pull geometry, shared claims, player inventories, death, markets, and effects:

- ordinary Arcade and stored `stroll`/Flow construction plus cancelled promotion have no item capability/ledger/state/serialization/render nodes or sampler/update/pull/claim/prune work, and their rows, state keys, snapshots, next outputs, and RNG remain exact to `a310a81`;
- committed Survive adoption installs exactly one session-owned capability through the composed handler seam, emits deterministic drops on the identical live Game, and removes all item state/render residue on teardown; a definition-driven test capability proves later modes can opt in without a Game mode-ID branch;
- initial/future rows and row-pruning order produce the same pickup IDs and outcomes; claimed pickups never duplicate;
- a fractional log rider collects at baseline pull while coin magnets alter only coins;
- two simultaneous contacts award once under reversed roster iteration; ineligible/full seats cannot win;
- P1 actual death clears P1 wallet/cards/powers/cosmetics/items/pending contexts and spills from the pre-clear snapshot; P2 and ghost inventories remain equal;
- current-owner Revival/Flare purchases at 24/36 coins are atomic and mode/capacity validated; sell and pack draft stay in the same tree and context;
- each shared-effect descriptor is tested with two conflicting owner effects, reversed seat order, one inactive contributor, a tie, and the exact solo one-owner path.

### Gate 5 — Built runtime and visual proof

Plans 03-06 and 03-07 build the unchanged production artifact and run it inside a muted opaque iframe. The integrated scenario covers live-solo cancel/commit, join edge consumption, unique safe join, four-seat capacity, simultaneous play, ghost/reclaim, deliberate leave/new join, actual death clear, personal offer, Revival targeting, Flare confirmation, world pickup claim, market buy/sell/pack continuity, owner switch invalidation, invalid-use retention, all-dead expiry/settlement, team result, retry, teardown, and exact solo return.

The layout report records inspected screenshots and assertions for:

| Frame | Required evidence |
|-------|-------------------|
| 200×160 | Exact `Needs 240×240 to play — enlarge this pane.` notice; game/actions hidden; session and offer state survive resize; no scrollbar. |
| 240×240 | Bounded Players/Items/target/reclaim/leave/result pages, 44px controls, owner/target retention, and no clipping/scrolling. |
| 320×560 | Join, ghost/reclaim, death/offer, Revival picker, Flare confirmation, owner switch, sale, and team contributions complete by paging. |
| 900×600 | Four identity tiles, one scene, one bottom shelf, one owner-labelled tree, visible world item, and protected-return state remain non-overlapping. |
| 1000×280 | Short-page heading/owner or target, one status line, primary action, and navigation stay reachable; decoration yields first. |
| 2400×1200 | Scene, four HUD tiles, two-column owner/detail board, and team result use the full frame without a centered narrow column. |

Every frame runs in dark and light runtime themes; representative recovery/pickup/ghost/protection transitions also run with reduced motion. Browser audio is muted. Visual states use marker + P-number + character and text/icons rather than color or sound alone.

### Gate 6 — Final phase proof

Run the complete final bundle gate and read every report:

```bash
pnpm test:phase2
node --test tests/survive-together-tracer.mjs tests/survive-together.test.mjs tests/consumable-drops.test.mjs tests/consumables.test.mjs tests/consumable-world.test.mjs tests/survive-economy.test.mjs
pnpm test:market
pnpm test:magnet
pnpm test:mobs
pnpm test:death-spill
pnpm type-check
pnpm build
node --test tests/survive-together-runtime.mjs tests/survive-together-layout.mjs
pnpm test:guidance
pnpm test:conformance
git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml
```

The initial `pnpm test:phase2` is the maintained complete prerequisite gate from `02-VALIDATION.md`; it includes Phase 1, exact archived/current renderer pixels, all current shared-session evidence, and original-baseline lockfile integrity. Do not replace it with a copied subset or repeat solo parity separately without an intervening relevant change. A conformance skip remains a skip and is named in `03-07-SUMMARY.md`; it is never reported as passed evidence.

## Requirement Evidence Matrix

| Requirement | Planned evidence | Owning plans |
|-------------|------------------|--------------|
| COOP-01 | One Arcade/Flow definition plus Survive handlers, 2–4 independent players, one world tick, per-player collisions/health/powers/inventory/stats, non-stacking shared effects, exact solo. | 03-01, 03-05, 03-06 |
| COOP-02 | Live solo adoption/cancel, consumed explicit join, safe unique placement, capacity, leave/new join, unchanged course/time/score/inventories. | 03-01, 03-06 |
| COOP-03 | Separate 100/250 systems, initial/max-one charge, personal-new-furthest recharge, no backtrack/reclaim/teleport credit, visible offer/progress. | 03-02, 03-06 |
| COOP-04 | Atomic personal/Revival/Flare plans, safe distinct placements, protection, offer-aware settlement. | 03-02, 03-04, 03-06 |
| COOP-05 | Ghost/reclaim/death/departure/new join remain disjoint and preserve/clear the correct identity/inventory state. | 03-01, 03-02, 03-06 |
| ITEM-01 | Separate definitions/charges/eligibility/targets, max charge, validation, owner purchase and activation. | 03-03, 03-05, 03-07 |
| ITEM-02 | Exact Revival/Flare odds and full production recovery effects. | 03-03, 03-04, 03-06 |
| ITEM-03 | Deterministic world acquisition plus 24/36-coin owner-aware market offers and visible inventory. | 03-04, 03-05, 03-07 |
| ITEM-04 | Existing baseline pull/contact/platform geometry, fractional log collection, and magnet isolation. | 03-04 |
| ITEM-05 | Versioned isolated stream, exact boundaries, deterministic initial/pruned rows, and once-only stable claims. | 03-03, 03-04 |
| UI-03 | One owner-labelled hand/market tree, wallet/item ownership, use targeting, sell/pack continuity, stale-context clearing, menu persistence. | 03-05, 03-06, 03-07 |

## Architectural Invariants

- There is one mutable world authority per session and one mutable player/inventory/recovery record per occupied seat.
- Released terrain schemas, course identity, coin denomination stream, market stream, mob stream, audio stream, fixed update order, and solo UI/render behavior remain pinned to the `a310a81` oracle.
- Survive Together is a definition plus lifecycle handlers. Core engine/input/render modules dispatch policy interfaces and contain no Survive-specific mode-name branch.
- Join, claim, purchase, recovery, Flare relocation, and result settlement validate complete immutable plans before committing in stable seat order.
- Presentation never mutates authoritative charges, owners, targets, placement, claims, or results speculatively.
- No active player means no owner capable of using a stored teammate item. Only a valid pending personal offer can delay all-dead settlement, and only until its active-time deadline.
- Item sampling and pickup motion are separate from coin sampling and owner magnet effects even when they reuse pure geometry helpers.

## Boundary and Security Gates

- Add no dependency, shell implementation, host DOM access, direct network, browser storage, native controller polling, signer/relay authority, `@napplet/shim`, manifest requirement, or invented NAP/domain/envelope.
- All local actions resolve stable session/seat/device generations and the visible owner; stale/ghost/dead/departed identities cannot spend, buy, sell, target, claim, or reclaim another record.
- Numeric inputs, sampler buckets, charges, prices, seat/target IDs, fixed-time deadlines, and placements validate before mutation.
- No package install occurs; package legitimacy checkpoints are not applicable and the lockfile stays unchanged.

## Multi-Source Coverage Audit

### GOAL

| Source item | Status | Coverage |
|-------------|--------|----------|
| Friends can join a live Arcade or Flow run, recover safely, and use deterministic cooperative consumables without disrupting the shared course. | COVERED | 03-01 live tracer; 03-02 recovery/results; 03-03/04 items; 03-05 economy/effects; 03-06/07 UI and final proof. |

### REQ

| Source item | Status | Coverage |
|-------------|--------|----------|
| COOP-01 | COVERED | 03-01, 03-05, 03-06 |
| COOP-02 | COVERED | 03-01, 03-06 |
| COOP-03 | COVERED | 03-02, 03-06 |
| COOP-04 | COVERED | 03-02, 03-04, 03-06 |
| COOP-05 | COVERED | 03-01, 03-02, 03-06 |
| ITEM-01 | COVERED | 03-03, 03-05, 03-07 |
| ITEM-02 | COVERED | 03-03, 03-04, 03-06 |
| ITEM-03 | COVERED | 03-04, 03-05, 03-07 |
| ITEM-04 | COVERED | 03-04 |
| ITEM-05 | COVERED | 03-03, 03-04 |
| UI-03 | COVERED | 03-05, 03-06, 03-07 |

### RESEARCH

| Source item | Status | Coverage |
|-------------|--------|----------|
| Live Phase 1/2 API reconciliation before edits; no duplicated session/UI authority | COVERED | Gate 0, 03-01 |
| Shared world versus seat ownership and handler composition | COVERED | 03-01, 03-05 |
| Personal-new-furthest revival, bounded offer, safe return/protection, terminal recovery | COVERED | 03-02 |
| Departure archives contribution/new-join UI while recovery provenance retains grant/high-water/threshold across aliases without transfer | COVERED | 03-01, 03-02, 03-06 |
| Separate consumable model and atomic validate/plan/commit | COVERED | 03-02, 03-03, 03-05 |
| Exact isolated sampler and stable one-claim pickup ledger | COVERED | 03-03, 03-04 |
| Survive-handler/session capability gates the full item pipeline; ordinary Arcade/Flow has no state/work; later mode opt-in stays definition-driven | COVERED | 03-01, 03-04 |
| Existing pull/platform geometry at baseline gravity, magnet isolation | COVERED | 03-04 |
| Player-scoped death clear and ghost preservation | COVERED | 03-02, 03-04, 03-05 |
| One owner-labelled market/hand and stale-context invalidation | COVERED | 03-05, 03-07 |
| Descriptor-owned non-stacking shared effects | COVERED | 03-05 |
| Concrete defaults: capacity 4, offer 8 active seconds, protection 2 active seconds, held 1+1, prices 24/36 | COVERED | 03-01, 03-02, 03-03, 03-05 |
| Immutable Survive result and team podium/contributions | COVERED | 03-02, 03-06 |
| Napplet authority, no dependency install, any-size/theme/muted proof | COVERED | Every plan boundary/threat gate; 03-06/07 visual evidence |

### CONTEXT

| Source item | Status | Coverage |
|-------------|--------|----------|
| D-01 | COVERED | 03-01, 03-05 |
| D-02 | COVERED | 03-01, 03-06 |
| D-03 | COVERED | 03-01, 03-06 |
| D-04 | COVERED | 03-01, 03-02, 03-06 |
| D-05 | COVERED | 03-02, 03-06 |
| D-06 | COVERED | 03-02, 03-04, 03-05 |
| D-07 | COVERED | 03-02, 03-06 |
| D-08 | COVERED | 03-02, 03-03, 03-05, 03-06 |
| D-09 | COVERED | 03-02, 03-06 |
| D-10 | COVERED | 03-03, 03-05, 03-07 |
| D-11 | COVERED | 03-03, 03-04 |
| D-12 | COVERED | 03-04 |
| D-13 | COVERED | 03-04 |
| D-14 | COVERED | 03-05, 03-07 |
| D-15 | COVERED | 03-05 |
| D-16 | COVERED | 03-02, 03-06 |
| D-17 | COVERED | 03-06, 03-07 |

No source item is missing. Relay/Race item policies, competitive ranks, cross-mode presentation expansion, broad milestone coverage thresholds, physical-controller hardware evidence, and PR creation belong to their assigned later phases rather than being silently reduced here.

## Completion Record

Each summary records the actual reconciled API names, exact commands and results, immutable-parity coverage, sampler golden vectors, runtime/layout artifact paths, conformance skips, and any external manual limitation. Phase 3 may advance only after the final bundle satisfies every matrix row above.
