# Phase 06: Cross-Mode Presentation — Research

## User Constraints

<user_constraints>
<!-- BEGIN SOURCE 06CTX7A91: verbatim 06-CONTEXT.md -->
# Phase 6: Cross-Mode Presentation — Context

**Mode:** Autonomous delivery through the requested multiplayer modes, evidence, and open PR.
**Dependencies:** Verified Survive Together, Relay, and Race vertical slices.

## Required outcome

Complete the shared presentation contract across all playable modes. Each mode
must already have a working vertical interface from its owning phase; this phase
audits cross-mode consistency and closes responsive or lifecycle gaps. It must
not become a place to defer a missing mechanic, item, controller flow, or result.

## Locked requirements

- Own UI-04 and UI-05 while preserving all earlier requirement evidence.
- Mode-specific pause, controller loss/reclaim, temporary ghost, death, personal
  recovery, teammate recovery, terminal, and restart flows explain the actual
  model policy. Render authoritative state and immutable results; do not create
  a parallel UI-only lifecycle or fabricated totals.
- Co-op presents a shared outcome and non-ranked contributions. Relay shows the
  shared course, individual leg ledger and contribution podium with true ties.
  Race shows competitive ranks, finish/time/status, fog and interaction statistics
  with true ties. Every participant remains represented after death or departure.
- Keep one owned hand/market tree. The selected seat, character, wallet, hand,
  innate power, personal revival, and consumables remain unambiguous across
  gameplay and menus. Selling must preserve the current market/pack page.
- Keep all existing solo entry and presentation behavior. Multiplayer setup is
  deliberate; routine solo play gains no extra confirmation or visual clutter.
- Use the existing voxel/material game aesthetic, readable distinctive type,
  large controls, clear depth and game transitions. No website-like panels,
  tiny action text, accidental scrollbars, or second dashboard around the scene.
- Purpose-built compact and short views use pages/tabs when necessary, retaining
  state, focus and return position through resize. Do not solve overflow by
  shrinking all content or hiding required controls.
- Validate 200x160 (size notice), 240x240, 320x560, 900x600, 1000x280, and
  2400x1200 in both runtime themes. Use the approved 4/8/16/24/32/48/64 spacing
  scale and at least 44px interactive targets.
- Keep keyboard and controller focus readable and independent. Shared menus
  display ownership; incoming controllers and stale held inputs cannot activate
  another participant's action or leak through a closing overlay.
- Mute, reduced motion, optional-domain absence, focus loss, no-controller states,
  and teardown remain functional. Device output stays muted in automated tests.

## Evidence and scope

### Observed HUD footprint to resolve

Phase 2's four-player 900x600 capture shows the left 2x2 HUD covering part of
nearby P2/P4 actors and their world labels. The label renderer now separates
overlapping labels, and the setup layout matrix checks reachable controls and
an exposed world area, but neither proves that DOM panels leave every nearby
traveler readable. Resolve this regular-frame HUD/camera composition in the
cross-mode presentation work (including removal of redundant solo personal
status in shared sessions). Test the initial four-seat group and left/right
course positions against the actual HUD footprint, then inspect built-iframe
screenshots. This remains an explicit final-presentation gap; a green label
rectangle or DOM layout test must not be cited as proof that it is resolved.

Read all verified Phase 2-5 contracts, actual runtime interfaces and result
records before planning. Build a state-by-mode-by-frame matrix from those facts;
name every missing or inconsistent cell and close it with a real user flow.
Do not duplicate already passing tests without a newly identified concern.

Exercise the built opaque iframe with normal keyboard and injected controller
events. Assert live state transitions and ownership, not source strings or
fabricated display records. Capture and inspect representative screenshots,
including interruption/recovery/result states and responsive transitions. Keep
original solo numerical and pixel parity plus all preceding mode gates green.

No new network, persistence, input authority, package, protocol or downloaded
mode path is implied by this phase. Preserve the current napplet boundary and
document any necessary implementation change before introducing it.
<!-- END SOURCE 06CTX7A91 -->
</user_constraints>

No separate discretion or deferred-ideas section is present. Preparation is authorized; Phase 05 human visual/feel acceptance remains pending and is not supplied by this research. [VERIFIED: 06-CONTEXT.md; ../05-race/05-UAT.md; ../05-race/05-VERIFICATION.md]

## Summary

**Plan a focused presentation repair, not another multiplayer implementation.** UI-04/UI-05 remain Phase 06 requirements. Shared lifecycle, recovery, owner transactions and immutable mode results already exist. The concrete unresolved defect is the relationship between DOM HUD footprints and canvas travelers, compounded by redundant solo personal status in shared play. Existing control-bound and canvas-label tests measure different things and cannot close that gap. [VERIFIED: ../../REQUIREMENTS.md; ../02-shared-local-session/02-VERIFICATION.md; src/main.ts:updateHud; src/render.ts:packSessionLabels; tests/local-session-layout.mjs; tests/session-labels-render.test.mjs]

Research used the generic-agent fallback applying the local `gsd-phase-researcher.toml` instructions, graph-first symbol discovery, direct source/document reads and two existing full-size captures. It made no source changes, launched no browser or test process, and did not commit. Inspected HEAD was `9478e29`; current reviewed production input repair is `2da5dd9`. [VERIFIED: research tool transcript; ../05-race/05-REVIEW-REPAIR.md]

## Project Constraints (from AGENTS.md)

- Discover symbols with codebase-memory graph tools before textual fallback; use literal/config/document searches where appropriate. Read the context map, boundaries, design patterns and package surfaces before editing. [VERIFIED: AGENTS.md]
- Keep napplet-only implementation: SDK capability calls, optional-domain fallback, no shell implementation, host DOM access, signer keys, relay pools, direct network, native controller polling or browser persistence. No protocol/domain/package change is implied here. [VERIFIED: AGENTS.md; docs/boundaries.md; 06-CONTEXT.md]
- Keep full-frame game composition, runtime theme propagation and responsive tiers. Existing mode UI contracts explicitly justify the game typography and 44px controls instead of boilerplate compact defaults. Use existing bundled Lilita One/material tokens, not downloaded assets. [VERIFIED: AGENTS.md; ../02-shared-local-session/02-UI-SPEC.md; ../04-relay/04-UI-SPEC.md; ../05-race/05-UI-SPEC.md]
- Required completion checks include type-check, build, guidance and conformance. Preserve the solo oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5`, lockfile and existing mode evidence. This assignment prohibits installs despite the template's generic skill-install instruction; relevant skills are already present. [VERIFIED: AGENTS.md; package.json; orchestrator research assignment]

## Standard Stack

Use the installed TypeScript, DOM/CSS, canvas and Playwright stack. Manifest ranges are TypeScript `^5.9.3`, Vite `^6.4.2`, Playwright `^1.61.0`, SDK `^0.29.0`; package manager is pnpm `10.8.0`. These are local manifest facts, not a claim about registry latest versions or independently audited package legitimacy. No new library is needed. [VERIFIED: package.json]

Use `tests/market-game-fixture.mjs` for built opaque-iframe work and existing public-seed/input journeys, including `tests/race-browser-fixture.mjs`. Keep read-only production observations distinct from arranged model/component fixtures. All browser launches remain `--mute-audio`. [VERIFIED: tests/market-game-fixture.mjs; tests/race-browser-fixture.mjs; ../04-relay/04-VERIFICATION.md]

## Architectural Responsibility Map

| Responsibility | Existing owner / integration seam | Planning instruction |
|---|---|---|
| Authoritative world, player and lifecycle | `LocalSession`, `SessionPlayer`, mode handlers; `src/session.ts` | Do not change mechanics to fit layout. [VERIFIED: src/session.ts] |
| Live personal HUD and inspected owner | `updateHud`, `selectHudOwner`; `src/main.ts` | Keep seat data authoritative; separate shared visibility from solo personal chrome. [VERIFIED: src/main.ts] |
| Shared responsive composition | `src/session-ui.css`, mode overrides `relay-ui.css`/`race-ui.css` | Centralize shared presentation decisions while retaining active-runner and competitive semantics. [VERIFIED: these files] |
| Canvas projection and labels | `Renderer.project`, `drawSession`, `packSessionLabels`; `src/render.ts` | Existing projection has no DOM occluder input; label packing only avoids other labels. Use a generic optional presentation seam only if CSS composition cannot satisfy actor visibility. [VERIFIED: src/render.ts] |
| Race scene policy | `SessionPresentation` passed to `drawSession` | Preserve leader-biased camera, monotonic fog, edge cues; no Race-ID branches in renderer. [VERIFIED: src/render.ts; src/race.ts] |
| One hand/market | `selectHudOwner`, market `invalidateOwner/resetOwnerState`, hand `invalidateOwner` | Retain generations and resets; do not recreate trees or derive mutation authority from selected CSS state. [VERIFIED: src/main.ts; src/market-ui.ts; src/run-hand.ts] |
| Recovery/decision boards | existing shared recovery and mode UI projections | Retain clock/offer semantics and fresh input; no UI-only lifecycle machine. [VERIFIED: src/session-recovery.ts; src/relay-ui.ts; src/race-ui.ts] |
| Terminal presentation | `survive-results-ui.ts`, Relay/Race result boards and immutable result modules | Render frozen participant records, never final mutable avatar inventory. [VERIFIED: src/survive-results.ts; src/survive-results-ui.ts; src/relay-results.ts; src/race-results.ts] |
| Device authority | `GamepadRouter`, shared input/main routing | Preserve assigned lease/fresh edge validation; terminal controls precede gameplay-only `canAct`. [VERIFIED: src/gamepad.ts; src/session-input.ts; src/main.ts; ../05-race/05-REVIEW-REPAIR.md] |

## Concrete Findings and Missing Cells

### G1 — HUD versus canvas actor visibility: confirmed, not solved

Direct inspection of `artifacts/local-session-layout-hud-900x600-light.png` shows large shared HUD cards over the nearby group/nameplate area plus a separate solo score, wallet, health and power region. The current artifact has four horizontal cards, so do not assume the historical wording “left 2×2” describes every current CSS branch. `artifacts/race-layout/four-racers-900x600-dark.png` shows two tall edge columns intersecting the initial group's outer actors/nameplates; an exposed center strip is insufficient. These are inspected existing artifacts, not new captures or a claim of every lateral position being tested. [VERIFIED: those two image artifacts; src/session-ui.css; src/race-ui.css]

Missing proof cells: **Survive Arcade/Flow and Race × four-seat initial/left/right group × 900×600 × both themes**, testing actor body AND identity against actual visible DOM occluders. Relay has only one active actor, so cover active runner at those lateral positions plus inactive identity, not a fabricated simultaneous four-runner state. Changed composition also needs the six required frames in both themes, with recovery and menu overlays treated as deliberate paused occlusion rather than live-play failure. [VERIFIED: 06-CONTEXT.md; tests/local-session-layout.mjs; tests/race-layout.mjs; src/relay.ts]

### G2 — redundant solo personal status: confirmed partial suppression

`updateHud` still updates the solo `game.run.wallet`, health and character-power surfaces while it renders per-seat values. Shared CSS suppresses those surfaces only at width ≤479 or height ≤419. Relay hides the solo score generally; Race has additional regular-frame suppression, but its global wallet/control strip remains. This produces inconsistent ownership/composition across modes and tiers. Suppress redundant personal presentation under a shared-session presentation condition; retain mute/pause/menu controls and any genuinely shared course cue. Restore ordinary solo chrome immediately on cancel/retry. Do not suppress the authoritative per-seat 100/250 rows. [VERIFIED: src/main.ts:updateHud; src/session-ui.css:99; src/relay-ui.css:134; src/race-ui.css:109; inspected captures]

Missing proof cells: **shared live HUD → selected owner change → pause/inspection → resize → retry to solo**, asserting exactly one visible personal status source for the intended owner and unchanged solo entry. This is a focused cross-mode visibility invariant, not a reason to repeat all economy tests. [VERIFIED: 06-CONTEXT.md; existing CSS branch differences above]

### Already satisfied — departed participants and sale continuity

`LocalSession.depart` archives the participant before releasing a reusable seat. `createSurviveTogetherResult` combines live and archived contributions; `createSurviveResultsBoard` pages `result.contributions`, keyed by participant identity. The real complete-run test explicitly asserts **five** records after P4 departure/replacement and the departed participant's original ID. Do not plan a new contribution service or a missing-history repair. [VERIFIED: src/session.ts:depart; src/survive-results.ts:createSurviveTogetherResult; src/survive-results-ui.ts:createSurviveResultsBoard; tests/survive-complete-run-runtime.mjs]

Documentation correction for root: `05-REVIEW-REPAIR.md:20` says Survive has one remaining participant after P1 departure, explaining disabled Next. The UI uses **two records per page at 900px with height ≥420**; a live avatar count is not result participant count. Replace that explanation with the page-capacity explanation, retaining the passing controller evidence. This research does not modify that separately owned report. [VERIFIED: ../05-race/05-REVIEW-REPAIR.md:20; src/survive-results-ui.ts:render]

Sale continuity already has a concrete assertion that selling keeps the current paid-pack page open. Preserve and rerun it if shared shelf/market styling or integration changes; do not add speculative sale mechanics. [VERIFIED: tests/survive-market-pack-owner-runtime.mjs:99]

## Existing State × Mode × Frame Evidence Map

**F** means the required frame set: 200×160 notice, 240×240, 320×560, 900×600, 1000×280, 2400×1200, in both themes. Evidence is state-specific; a count does not establish every theoretical Cartesian combination. The only newly confirmed product gaps here are G1/G2. Other rows are preserved evidence, with changed surfaces requiring regression. [VERIFIED: phase UI contracts; test files below]

| Mode/state | Existing coverage | Phase 06 delta |
|---|---|---|
| Solo start, pause, market, death/retry | Immutable solo numerical/render parity; existing runtime, hand, market, pause and menu suites | Assert shared UI cleanup; no redesign. [VERIFIED: package.json; tests/solo-ui-browser.test.mjs] |
| Shared setup/bindings/four-seat HUD | 24 setup/HUD frame observations; 53 owner observations; keyboard/controller/adoption/optional-domain suites | G1 actor intersection and G2 visibility invariant, not duplicate setup matrix. [VERIFIED: ../02-shared-local-session/02-VERIFICATION.md] |
| Survive HUD, death/offer, Revival/Flare, ghost/reclaim/leave | HUD12, recovery127, lifecycle32 observations; real owner/input/recovery suites | Reuse reached states to check changed HUD footprint/focus after resize. Keep Arcade/Flow policy. [VERIFIED: ../03-survive-together-consumables/03-VERIFICATION.md] |
| Survive results, departure/replacement, retry | Result12 component observations plus built complete-run integration with five contributors | Preserve all participant pages and equal-height team presentation; do not call component captures built-main proof. [VERIFIED: tests/survive-results-ui.test.mjs; tests/survive-complete-run-runtime.mjs] |
| Relay setup/live/transfer/loss/reclaim/skip/leave/wait/recovery/market/results | 21 states × F =252 captures; actual earned49/50/51 platform handoff; focused Enter/Space/controller repair | G1 active actor/lateral positions; changed HUD and return-focus regression. [VERIFIED: ../04-relay/04-VERIFICATION.md; tests/relay-layout.mjs; tests/relay-runtime.mjs] |
| Race setup/roster/live/fog/damage/items/gear/target/reclaim/wait/recovery/terminal | 35 states × F =420 captures, including system/app reduced-motion representatives | G1 initial/lateral actor intersections and G2 wallet duplication; preserve existing item/clock/target state checks. [VERIFIED: tests/race-layout.mjs; artifacts/race-layout/report.json; ../05-race/05-07-SUMMARY.md] |
| Race ties/DNF/participant pages/controller retry | Real terminal journeys, tier captures and repaired assigned-controller navigation | Reuse existing controller repair regression after any shared routing change; do not rebuild results. [VERIFIED: tests/race-results.test.mjs; tests/race-runtime.mjs; ../05-race/05-REVIEW-REPAIR.md] |

## Architecture Patterns and Runtime State Inventory

Preserve this flow: **authorized input → existing router/context → mode/session transaction → live projection or frozen result → one DOM/canvas presentation**. Resize may alter page/composition and safety suspension, but must not change participant identity, target ownership, result data, earned progress or active-time deadlines. [VERIFIED: src/main.ts; src/session-input.ts; src/session.ts; phase02–05 UI contracts]

| State | Preserve through presentation work |
|---|---|
| HUD | `hudSelected`, detail open/page, valid return focus; inspecting is not device reassignment. [VERIFIED: src/main.ts] |
| Menu | owner/context generation, market page anchor, paid underlying pack, hand detail page; clear transient selection on actual owner change. [VERIFIED: src/market-ui.ts; src/run-hand.ts] |
| Lifecycle | authoritative offer/deadline, Relay incoming confirmation, Race reclaim reservation/grace, shared pause reason. [VERIFIED: src/session-recovery.ts; src/relay.ts; src/race.ts] |
| Results | frozen record reference and participant/page/metric selection; no live totals reconstruction. [VERIFIED: src/survive-results-ui.ts; src/relay-ui.ts; src/race-ui.ts] |
| Input | assigned device lease, context generation, independent held latches and safe focus; visual owner is not authority. [VERIFIED: src/gamepad.ts; src/session-input.ts] |

**Recommended implementation:** keep the required regular 2×2 identity presentation, reduce duplicated/unused footprint and coordinate its location with the actual playable scene. Use existing bounded details pages for lower-priority facts without dropping required status. First implement CSS/DOM composition; if actor geometry still cannot fit, add a narrowly optional generic presentation viewport/occlusion input to the existing renderer, defaulting exactly to today's solo projection. Document that seam before implementation. Never move world actors or change earned distance to make a screenshot fit. [RECOMMENDATION based on VERIFIED: 06-CONTEXT.md; src/render.ts; existing responsive detail pages]

## Don't Hand-Roll

- No second result/stat ledger, recovery controller, inventory, market, input router or lifecycle state machine. These responsibilities are delivered. [VERIFIED: responsibility map above]
- No alternate test renderer, fake result records, hidden route or private world mutation for built acceptance. Use real controls/public seed intent and authorized snapshots; read-only observations may measure state. [VERIFIED: 06-CONTEXT.md; tests/race-browser-fixture.mjs]
- No new package, network, storage or protocol surface; no native gamepad fallback. [VERIFIED: AGENTS.md; docs/boundaries.md]

## Common Pitfalls

1. **DOM passes while actors disappear:** button hit tests and an exposed canvas region say nothing about bodies/nameplates behind panels. Assert cross-layer intersections and inspect screenshots. [VERIFIED: tests/race-layout.mjs; inspected900×600 images]
2. **Label-only oracle:** `session-labels-render` arranges model positions and measures native text; it does not include production DOM panels. Keep it as component evidence. [VERIFIED: tests/session-labels-render.test.mjs]
3. **Visible focus without activation:** both Relay and Race had independent review findings after layout tests passed. Keep actual Tab/Enter/Space and assigned-controller direction/confirm tests. [VERIFIED: ../04-relay/04-REVIEW.md; ../05-race/05-REVIEW.md]
4. **Live avatar count used as result count:** released seats can have multiple archived participant identities. [VERIFIED: tests/survive-complete-run-runtime.mjs]
5. **Global CSS alters solo:** scope shared visibility/composition and retain immutable solo oracle. [VERIFIED: 06-CONTEXT.md; package.json]
6. **Overclaiming old artifacts:** accepted historical captures establish prior state coverage, not changed-source visual acceptance; recapture changed surfaces with source/artifact provenance. [VERIFIED: existing source-freshness checks in tests/local-session-layout.mjs]

## Code Examples

Existing renderer integration to preserve (not a proposed new API): [VERIFIED: src/render.ts]

```ts
drawSession(world: SharedWorld, players: readonly PlayerRender[], dt: number,
            presentation?: SessionPresentation): void
```

Existing result pagination rule explains disabled Next without missing participants: [VERIFIED: src/survive-results-ui.ts]

```ts
short = innerHeight < 420;
perPage = short || innerWidth < 900 ? 1 : innerWidth >= 1200 ? 4 : 2;
const start = Math.floor(selected / perPage) * perPage;
const shown = result.contributions.slice(start, start + perPage);
```

Proposed test algorithm: reach a four-seat run through visible setup; observe actual interpolated actor/body and packed label rectangles in canvas CSS coordinates; collect visible HUD/shelf/tool DOM rectangles; assert no live traveler/identity intersection at initial and real-input left/right positions; capture both themes; repeat relevant states after resize. Calibrate body envelopes from production voxel geometry rather than a guessed center-point margin. This is a test design recommendation, not an existing helper or completed test. [RECOMMENDATION based on VERIFIED: src/render.ts; tests/session-labels-render.test.mjs; 06-CONTEXT.md]

## Validation Architecture

**Entry evidence:** accepted exact Relay Gate6 + Race Gate7 session19289 exit0 on62f9958 (`/tmp/down-to-duck-05-07-verified-relay.log`, `/tmp/down-to-duck-05-07-verified-race.log`), then routing repair session86987 exit0 (`/tmp/down-to-duck-05-review-repair-final.log`): strict shared73, Race runtime16, type/build/guidance/conformance/lockfile. These are inherited evidence, not research executions. Failed8659 was superseded; do not call its Race75/76 a pass. [VERIFIED: ../05-race/05-07-SUMMARY.md; ../05-race/05-REVIEW-REPAIR.md]

**Fast feedback:** target under30seconds for `pnpm type-check` and a new pure geometry test if a geometry helper is actually introduced; duration must be measured, not promised. Use `node tests/strict-node-tests.mjs tests/render.test.mjs` for renderer changes. Browser journeys are slower and should run as a separate bounded tier. [RECOMMENDATION; VERIFIED command infrastructure: package.json; tests/strict-node-tests.mjs]

**RED/GREEN:** retain a real-built regression that fails current900×600 G1 and shared G2 before source repair. Add no product test hooks. Once fixed, run changed-surface cases at F, both themes, motion representatives; include notice→restore while handoff, recovery, reclaim or target is open if that surface changed. Preserve page, focus, owner, offer and world snapshots. Existing matrix journeys provide those state acquisition paths. [RECOMMENDATION based on VERIFIED: tests/relay-layout.mjs; tests/race-layout.mjs; tests/survive-recovery-board-layout.mjs]

**Final integration:** after source freeze, run the exact prior-mode gates from `04-VALIDATION.md` Gate6 and `05-VALIDATION.md` Gate7 plus the bounded new cross-mode regression, original numerical/pixel parity and AGENTS checks. Avoid redundant standalone reruns of nested commands already passing on the same frozen source. Store full-command logs, terminal exit, source/artifact identifiers and an evidence manifest linking requirement→state→mode→frame/theme→test→capture. One build/browser process at a time; preview5175 untouched. [RECOMMENDATION based on VERIFIED: 06-CONTEXT.md; ../04-relay/04-VALIDATION.md; ../05-race/05-VALIDATION.md; package.json]

**Review:** inspect contact sheets and full-size initial/lateral four-player900×600, compact owner, short recovery, handoff and result captures. Preserve complete participant records after departure/reuse by existing model/built assertions; do not fabricate new missing-history work. Conformance remains5passed/0failed/5unmeasured; physical controllers remain unmeasured. Human Phase05 visual/feel acceptance remains pending separately. [VERIFIED: prior verification reports; ../05-race/05-UAT.md]

## Security Domain

Applicable local concerns are action authorization, input validation and lifecycle/context isolation. Reuse device/seat leases and authoritative market/recovery checks; presentation state must not grant capability. Existing source has no new server authentication, cryptographic or persistence responsibility in this phase. This is a scoped threat review, not an ASVS compliance claim or a new authentication/session implementation. [VERIFIED: docs/boundaries.md; src/session-input.ts; src/co-op-market.ts; 06-CONTEXT.md]

| Threat | Existing mitigation to preserve |
|---|---|
| Stale/other-seat action after page or owner switch | Context generations, lease validation, fresh held-input seeding. [VERIFIED: src/main.ts; src/session-input.ts; src/co-op-market.ts] |
| Result browsing mutates gameplay or restarts on held input | Terminal routing plus fresh-edge suppression; immutable results. [VERIFIED: tests/race-runtime.mjs; ../05-race/05-REVIEW-REPAIR.md] |
| Presentation bypasses napplet isolation | Existing opaque iframe, SDK boundaries and forbidden-access assertions. [VERIFIED: tests/market-game-fixture.mjs; docs/boundaries.md] |

## Suggested Bounded Plan Breakdown

1. **06-01 — Shared live-scene composition.** Retain G1/G2 RED tests, define a concrete UI contract, repair shared HUD footprint/status ownership with narrowly scoped mode styling, preserve solo and actual actor positions. Likely files: main/session UI CSS, mode CSS; renderer only if measurements prove a generic seam necessary. Deliver initial/lateral900×600 proof and all changed-frame regressions. [RECOMMENDATION]
2. **06-02 — Cross-mode state preservation and acceptance closure.** Reuse existing lifecycle/owner/result journeys, fill only changed-composition cells, verify page/focus/owner restoration, no extra solo chrome, one shelf, immutable participant completeness and actual keyboard/controller activation. Freeze source, run exact inherited gates and consolidate inspected evidence against UI-04/UI-05. Do not recreate all420 Race captures in a new suite; rerun the existing suite when changed CSS warrants it. [RECOMMENDATION]

These are proposed boundaries, not executed plans. A new mechanic or a missing shared responsibility discovered during execution requires an explicit dependency reconciliation; it must not be hidden inside a presentation task. [VERIFIED: 06-CONTEXT.md]

## Sources, Confidence and Remaining Uncertainties

- Primary local sources: current production files and tests cited above; Phase02–05 CONTEXT/UI-SPEC/VERIFICATION; Phase06 CONTEXT; ROADMAP, REQUIREMENTS, USER-REQUEST; AGENTS and boundary documents. Graph discovery used project `Users-sandwich-Develop-crossy-road-clone`. No external library/API claim required web research. [VERIFIED: research tool transcript]
- Confidence seam: `gsd-tools query classify-confidence --provider local --verified` returned **LOW**. The helper does not confer an official-documentation provider tier on local repository inspection. Retain that mechanical classification; the explicit local provenance above distinguishes inspected source/captures from recommendations. No Context7 or registry verification is claimed. [VERIFIED: research tool transcript]
- Unresolved implementation choice: exact regular-frame dimensions/optional viewport adjustment must be selected against the retained actor-occlusion RED test. No evidence supports choosing a new camera mechanic or lowering type/target sizes. [VERIFIED: G1; locked UI contracts]
- Unresolved acceptance: Phase05 human visual/feel review is still pending. Technical40/40 and repaired independent review do not substitute for it. Research preparation does not mark Phase05 or Phase06 complete. [VERIFIED: ../05-race/05-VERIFICATION.md; ../05-race/05-UAT.md]
- Research date:2026-10-16. Reconcile source and evidence after any UI/input changes; recommendations are tied to the inspected revision, not a fixed calendar validity period. [VERIFIED: inspected HEAD9478e29]
