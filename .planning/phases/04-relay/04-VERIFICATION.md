---
phase: 04-relay
verified: 2026-10-16T04:15:18Z
status: passed
score: 34/34 must-haves verified
behavior_unverified: 0
overrides_applied: 0
verifier_execution: generic-agent-fallback
verified_head: 4ee9869
verified_source: 52f8e0d
review_status: clean
---

# Phase 04: Relay Verification Report

**Phase goal:** A local group can play one continuous, turn-based Relay run with deliberate transfers, closed roster rules, and leg-by-leg results.

**Status:** passed. Initial phase verification, following independent code review and CR-01 repair. Generic-agent fallback applied the full local verifier role/references; this is not typed-agent execution. No source edits or commits were made. The original USER-REQUEST remains broader than this phase: Race, cross-mode presentation, final coverage/release evidence and a PR remain outstanding milestone work.

## Observable truths

Five roadmap criteria and all 29 plan truths are traced below. Roadmap rows are retained separately for explicit contract visibility; they summarize the more detailed plan rows rather than adding new scope. IDs `Pnn.n` follow each PLAN frontmatter's original truth order. Every row was checked against substantive production code and behavioral evidence, not SUMMARY assertions alone.

Evidence abbreviations: **T** `tests/relay-tracer.mjs`; **B** `tests/relay-boundary.test.mjs`; **L** `tests/relay-lifecycle.test.mjs`; **R** `tests/relay-results.test.mjs`; **U** `tests/relay-runtime.mjs`; **V** `tests/relay-layout.mjs`. Their actual assertions were inspected during review/verification. Current-source passing output is in `/tmp/down-to-duck-04-review-repair-final-gate.log` (**89260 exit 0**). Independent targeted executions are detailed below.

| ID | Required truth | Status | Production and behavioral evidence |
|---|---|---|---|
| SC1 | Configure order and segment length, default 50, before shared start. | VERIFIED | `validateRelaySetup`, setup draft/reorder controls and atomic `createRelaySession`; T valid/invalid 2–4-seat matrix and U visible default-50 start. |
| SC2 | Safe visible baton transfer retains identical world/course/progress/clocks/pickups/inventory without backward duplication. | VERIFIED | Coordinator pending latch and `LocalSession.transferPosition`; B ground/platform deep continuity and 49/50/49/50; U public-seed 49/50/51 actual-input path. |
| SC3 | Started roster rejects new entrants and original reconnect reclaims the same slot. | VERIFIED | `canAdmit: () => false`, frozen original device identity, router leases; T late join rejection and L changed-slot/stranger/stale-epoch tests. |
| SC4 | Active/inactive loss has explicit reclaim/skip/wait/final outcomes. | VERIFIED | `disconnect`, `refreshAvailability`, `command`, `rotate`, `finish`; L loss/skip/cancel/reclaim/final matrix and built lifecycle boards. |
| SC5 | Dedicated shared/per-character results and podium contain contributions/outcomes. | VERIFIED | Frozen ledger aggregates and `createRelayResults`; R pre-clear credits, tied ranks, terminal navigation, immutable resize and scene retention. |
| P01.1 | Dependencies/summaries/live API map and exact Phase2/3 gates precede production changes. | VERIFIED | Entry source `6017f9f` and retained `/tmp/down-to-duck-ghost-duration-final-gate.log`; previously independently verified Phase03 42/42. Git history from that source to initial Relay RED `61560f9` contains documentation only. The completed summary set and live API mapping precede the first Relay implementation `8bb8faf`; shared scoring dependency repair is separately recorded, not concealed as Relay logic. |
| P01.2 | Two–four unique bound stable seats, order/default50/validated1–999, locked roster. | VERIFIED | Validation copies/freezes the full proposal before mutation; T exhaustive lengths/duplicates/bindings/roster sizes plus built three/four-seat order and invalid-editor persistence. |
| P01.3 | Production two-player settled boundary freezes the living world and fresh-confirms next runner. | VERIFIED | `progress`→`tick`→`confirmation`→`confirm`; T real hop/world retention, held incoming rejection and built tracer. CR-01 adds working focused keyboard/controller controls. |
| P01.4 | Compose delivered Arcade/Flow definition/handlers without core Relay-name branches. | VERIFIED | `createRelayDefinition` retains `base`, using generic session handler policies; session/input/render have no Relay identifier branch. Inherited solo and Survive behavioral gates pass. |
| P01.5 | Unknown post-start devices rejected while original reclaim identity retained. | VERIFIED | Main join rejection plus coordinator original binding policy and router epoch leases; T/U/L unknown-device and original-reclaim cases. |
| P02.1 | 49/50/51 and multiple lengths latch once; repeated/backward/placement/recovery/jumps cannot duplicate legs. | VERIFIED | Authored earnings plus monotonic frontier, `futureBoundary`, one pending record; B lengths1/7/50/999, repeated crossings, exceptional jump and rescue; U real49/50/51. |
| P02.2 | Pending crossing waits for full hop/platform/hazard/rescue settlement; fatal death wins. | VERIFIED | Session fixed-step ordering and safe-position gate, death clears pending and opens personal recovery; B unsupported water, traffic/wave/mob and innate rescue tests. |
| P02.3 | Ground/fractional handoff retains world identity, rows/time/actors/claims/seed/RNG future/effects/metadata. | VERIFIED | Transfer only writes incoming spatial fields; B semantic snapshots and twin future RNG/actor/pickup/generation comparisons, independently re-run platform case. U checks closure identity, not opaque RNG state. |
| P02.4 | Placement grants no distance/economy/inventory/heal/100-power/250-revival credit. | VERIFIED | `placeTurnPosition` sets spatial floors and cancels pending hop without reward calls; B per-player asset snapshots and actual100/250 recharge tests; returning-primary regressions in T. |
| P03.1 | Inactive loss does not pause current runner and is bypassed in rotation. | VERIFIED | Connection map distinct from active authority; L inactive-loss retained-assets/live-time/next-P3 test; U mixed controller path. |
| P03.2 | Active loss freezes until original fresh reclaim or another actor's confirmed skip; no auto action. | VERIFIED | `canAdvance` excludes disconnected/waiting; two-step generation-bound `command`; L frozen partial-hop and long-wait/cancel tests, independently re-run. |
| P03.3 | Original reclaim preserves identity/assets/progress/contribution/pending turn with no join grant or held action. | VERIFIED | `preserveReclaimPosition`, participant/device/epoch checks, pending lifecycle refresh and router seeding; L partial-hop, changed-slot and held-reclaim tests; T stale ticket rejection. |
| P03.4 | Leave archives without death/economy transfer; reserved seats wait; finalization once. | VERIFIED | `beforeDepart` closes contribution then `departed` rotates/archives; L inactive leave, last connected departure with reserved member, eventual terminal and late-event rejection; R immutable lifecycle records. |
| P03.5 | Actual death alone uses delivered personal death/revival flow before rotation. | VERIFIED | `beforeDeath` captures before clear, common recovery service; L actual accept/decline/expiry and disconnected dead offer; R death wallet/credit capture; no synthetic death in skip/leave. |
| P04.1 | Each opened leg closes once with identity/frontiers/distance/duration/coins/pickups/revives/outcome. | VERIFIED | Ledger tokens, append-only close, monotonic leg/generation guards; R immutable close and production outcomes; unopened selected turns do not fabricate legs. |
| P04.2 | Participant totals survive clear/death/disconnect/skip/departure. | VERIFIED | Coordinator credits immutable events before destructive clear; result reduces closed legs, not current inventory. R intercepts real clear and checks prior death credit; independently re-run. |
| P04.3 | One terminal freeze retains outcome/distance/time/roster/ledger/aggregates/podium against late interaction. | VERIFIED | Ledger terminal guard, cached final result and `completeResult`; R late owner mutation/device activity and built page/resize/retry tests. |
| P04.4 | Descending distance uses competition ties with no hidden winner. | VERIFIED | Rank is one plus count of strictly larger distances; equal-distance tier grouping; R20/20/10,30/20/20/5,all-equal plus actual earned visual tie. |
| P04.5 | Result/paged ledger displays approved fields and lifecycle labels over final scene. | VERIFIED | `createRelayResults` reads only frozen result; R participant/leg navigation and scene snapshots; V and independently inspected tied-podium/leg/participant captures. |
| P05.1 | Built opaque runtime covers setup, active-only play, transfer, all lifecycle/recovery/result paths. | VERIFIED | U mixed keyboard/controller scenario plus L built accept/decline/expiry/leave and V visible lifecycle paths. Coverage is composed across named scenarios, not falsely described as one giant uninterrupted playthrough. |
| P05.2 | One owner-labelled shelf/market tree; only active runner transacts; inactive inspection read-only. | VERIFIED | Existing `createMarketUI`/`createRunHand`, `ownerMutationsAvailable` and coordinator policy; U exact owner labels, one-tree counts and inactive no-mutation assertions. |
| P05.3 | Owner/turn/lifecycle changes invalidate selections/draft/target/confirmation/focus/held input. | VERIFIED | `syncRelayHandoff`, `selectHudOwner`, market/hand invalidation, context generations and `clearRelayInput`; U paid-pack switch, captured stale actions after death/leave/reclaim/handoff; T/L held-edge and stale ticket tests. |
| P05.4 | Active personal revival only; no world consumables; invalid team items spend nothing. | VERIFIED | `SessionRecoveryController` default personal allowlist, `installCoOpMarket({consumables:false,capabilities:[]})`; U rejects Revival/Flare before debit and asserts absent world/item offers; extraction parity tests exercise both bases. |
| P05.5 | Existing keyboard/controller routers, per-seat calls/cooldowns and no forbidden authority/test hooks. | VERIFIED | Main uses assigned seat actions and authorized injected gamepad adapter; U actual audio fingerprints and cooldowns, forbidden API instrumentation; no native polling or product debugger hook introduced. |
| P06.1 | Approved material/copy/type/targets and usable accessible focus/live regions. | VERIFIED | `relay-ui.ts`/CSS and shared owner surfaces; V bounds/type/weight/focus/live-region tests, contrast checks in T/L/R; independent visual inspection; CR-01 independently repaired with actual Enter/Space/controller activation. |
| P06.2 | All six required sizes, dark/light and motion preferences work without scrollbars. | VERIFIED | V252 captures, zero failures/errors/external calls; tests assert document and named panel extents, target bounds/hit-testing and reduced-motion styles. Contact sheets inspected. |
| P06.3 | 200×160 exact notice/state retention; compact/short named pages and broad scene at wide sizes. | VERIFIED | V no controls below floor, identity/position/result retention and stable headings; full compact order and short recovery captures inspected; wide sheets retain scene beside boards. |
| P06.4 | Screenshots/assertions cover lifecycle/results and produce inspectable muted report/contact sheets. | VERIFIED | `artifacts/relay-layout/report.json`, index and dark/light sheets:21states×6frames×2themes=252; all observed directly and representative full captures inspected. |
| P06.5 | Exact inherited/Relay/build/guidance/conformance/lockfile gates pass together with skips honest. | VERIFIED | Actual repaired-source Gate6 log inspected: inherited Phase2/3, Relay65, runtime12, layout1/252captures, guidance6/type/build. Conformance5/0/5unmeasured. Independent lockfile comparison exit0. |

**Score: 34/34**, no failed or behavior-unverified truth, no override. No declared must-have prohibitions/backstop truth block or standalone probe script was found; negative authority checks are covered by the named runtime/guidance evidence.

## Artifacts, wiring, and data flow

The GSD `verify.artifacts` queries pass all19 plan artifact occurrences. `verify.key-links` passes14/15 literal checks; the remaining literal check is a transitive fixture link, independently resolved below. Pattern queries alone were not treated as behavioral proof.

| Artifact group | Existence/substance/wiring/data status | Actual responsibility and flow |
|---|---|---|
| `src/relay.ts` | VERIFIED | Full coordinator validation/state machine/ledger integration; main setup calls `createRelaySession`; definition handlers attach to the existing LocalSession, not a second world. |
| `src/session.ts`, `src/session-input.ts`, `src/session-recovery.ts` | VERIFIED | Generic policy hooks execute in dispatch/update/lifecycle; shared safe placement, original device leases and delivered recovery planner/commit remain authoritative. |
| `src/relay-results.ts` | VERIFIED | Real contribution observations→validated ledger credits/closes→frozen participant totals/rank tiers→session result. No static or final-avatar substitute. |
| `src/relay-ui.ts`, `src/relay-ui.css` | VERIFIED | Setup reads retained draft and validates actual proposal; HUD reads session players/coordinator snapshot; lifecycle/handoff boards render current state and captured tokens; results read frozen records. CSS imported by UI and selected through actual phase/page attributes. |
| `src/main.ts`, `src/market-ui.ts`, `src/run-hand.ts`, `src/co-op-market.ts` | VERIFIED | Existing frame/input loop drives session; one physical owner tree reads selected personal inventory; request context and active-runner policy gate mutation. UI invalidation and coordinator checks work together. |
| T/B/L/R | VERIFIED | Source-loader imports actual production modules; muted built tracer/lifecycle/results load real artifact; assertions inspect transitions, future behavior and immutable records. |
| U/V and `tests/market-game-fixture.mjs` | VERIFIED | U/V import `createMarketGameFixture`; fixture reads `dist/index.html`, creates `sandbox="allow-scripts"` iframe and launches Chromium with `--mute-audio`. This resolves P05's literal `allow-scripts|--mute-audio` query miss: these are in the imported fixture, not the caller. Independently executed U confirms the link. |

All15 declared key links are substantively wired: main→Relay startup/actions; Relay→session completed tick/placement; UI→Relay snapshot/commands; tracer→built artifact; boundary→production coordinator; input leases→main reclaim→Relay; Relay discriminant→UI; coordinator→ledger; result snapshot→UI; main→one owner market; runtime/layout→shared opaque fixture→artifact; UI→material CSS. The intermediary main/fixture edges are intentional reuse, not orphaned imports.

## Independent behavioral checks and accepted gate evidence

| Check | Command/evidence | Result |
|---|---|---|
| CR-01 focused controls | `node --test --test-name-pattern='handoff (Enter\|Space\|controller focus)' tests/relay-runtime.mjs`; `/tmp/down-to-duck-04-independent-repair.log` | 3/3, zero failures/skips; session92751 exit0. Actual keyboard/controller input, no private world arrangement. |
| Shared future, reclaim and death ordering | `node --test --test-name-pattern='fractional platform: confirmation preserves\|active loss freezes a partial hop\|actual fatal transaction appends before' tests/relay-boundary.test.mjs tests/relay-lifecycle.test.mjs tests/relay-results.test.mjs`; `/tmp/down-to-duck-04-independent-invariants.log` | 3/3, zero failures/skips, exit0. Tests assert real production mutations and ownership. |
| Public-seed earned boundary | `node --test --test-name-pattern='visible seeded 49/50/51 hops' tests/relay-runtime.mjs`; `/tmp/down-to-duck-04-independent-earned-boundary.log` | 1/1, zero failures/skips; session60350 exit0. Real public-seed keyboard travel reaches49/50, carries fractional platform position through handoff, then earns exactly one incoming tile at51. |
| Immutable lockfile | `git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml` | Exit0. |
| Canonical current-source Gate6 | `/tmp/down-to-duck-04-review-repair-final-gate.log`, source52f8e0d | Terminal89260 exit0 supplied by orchestrator; actual detailed log inspected. Relay65/65, runtime12/12, layout1/1 with252captures, and inherited solo21/regression271/shared73/recovery44/Survive-browser34 plus nested runtime/layout gates. No broad rerun performed. |

No phase-declared standalone probe scripts exist. These targeted production tests supply independent behavioral spot checks; prior complete passing output supplies the remaining named tests without rerunning whole gates for each truth.

## Visual inspection

Independently viewed both current `artifacts/relay-layout/contact-dark.png` and `contact-light.png` across all21 states, then full captures: `order-240x240-dark.png`, `live-hud-320x560-light.png`, `setup-roster-900x600-dark.png`, `tied-podium-900x600-light.png`, and `recovery-app-motion-1000x280-dark.png`. Inspected the report's actual252 captures and empty failures/errors/external arrays.

Compact order controls are readable and reachable with distinct disabled states. The320px HUD retains separate100/250 meters and owner-labelled shelf without overlapping controls. Wide setup preserves scene space and working roster/character controls. The tied podium displays both equal contributors beneath one `Rank =1` heading, without inventing a winner. Short recovery retains its primary revive and distinct decline/leave actions. Both theme sheets preserve paper/wood material and readable contrast; the below-floor notice is exact and controls disappear. Motion representatives retain the same legible static layouts.

This fulfills the requested independent screenshot inspection and the plan's deferred contact-sheet inspection in this autonomous run. It is an agent visual judgment, not a claim that a physical human/hardware session occurred. Automated geometry, semantics, contrast, focus and live-region tests provide separate evidence.

## Requirements coverage

| Requirement | Owning plans | Verdict | Evidence |
|---|---|---|---|
| RELAY-01 | 01,05,06 | SATISFIED | SC1/P01.2, visible default50 and reordered2–4seat setup, authoritative atomic validation. |
| RELAY-02 | 01,02,05,06 | SATISFIED | SC2/P02.*, settled ground/platform transfers, repeated-boundary rejection, independent authored49/50/51 path. |
| RELAY-03 | 01,03,05,06 | SATISFIED | SC3/P03.3, closed admission and original-slot/device/epoch continuity. |
| RELAY-04 | 03,05,06 | SATISFIED | SC4/P03.*, active/inactive loss, fresh reclaim, skip/leave, waiting/recovery/final state matrices. |
| RELAY-05 | 04,05,06 | SATISFIED | SC5/P04.*, pre-clear append-only contributions, immutable totals/podium and complete paged fields. |

No orphan Phase04 requirement was found. Shared mechanics and owner/UI invariants are exercised by inherited gates and focused Relay tests; this does not mark broader Phase05–07 requirements complete.

## Adversarial audit and remaining limits

The disconfirmation pass challenged misleading presence-only evidence in three places. First, CR-01 had passed prior geometry/focus-containment tests while Enter/Space activation was broken; the new independent actual-input tests now close that gap. Second, browser RNG closure identity does **not** prove the next RNG value: B's independently passing twin model test compares future draws/actors/pickups, while U proves real public-seed input and closure/world/row identity. Third, existing economy/lifecycle browser fixtures sometimes arrange terrain/assets through debugger scope; these are labelled arranged service tests, unlike the public-seed49/50/51 and new focused-control tests, which do not write private world state.

A hypothetical no-safe-placement rotation error path lacks a dedicated natural-course reproduction; it was considered during review but no reachable failing state was established. This is not represented as tested exhaustion of every possible world state. Scope-specific required transition paths have actual tests. No source stub, unwired artifact, unreferenced TBD/FIXME/XXX marker, forbidden authority or unresolved code-review finding was found.

WINDOWS1 is concretely closed, not waived: fixed per-player operation receivers in `Game.operationFor/inPlayerOperation` and the exact nested P2 reward→P1 dispatch/pause regression pass. Independent prior log `/tmp/down-to-duck-04-review-windows1.log` is1/1; repaired-source inherited gate retains that regression. CR-01 resolution and original reproduction remain in `04-REVIEW.md`.

Conformance is **5 passed / 0 failed / 5 unmeasured**: three unresolved-manifest checks, emitted wire envelopes, and clean teardown. Physical controllers remain unmeasured; authorized injected snapshots do not substitute for hardware. Those explicit evidence limits are retained rather than converted into ten passes or a hardware claim. No new human decision is required for the verified Phase04 contract; subjective play feel and external-shell hardware validation remain outside these measured results.

No installs, dependency changes, lockfile changes, oracle repin, publication or commit. Preview5175 remained untouched; review/verification browsers used muted fixtures and were closed. Only review/verification reports were edited.
