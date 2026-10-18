---
phase: 05-race
verified: 2026-10-16
status: passed
score: 40/40 must-haves behaviorally verified
behavior_unverified: 0
overrides_applied: 0
verifier_execution: generic-agent-fallback
verified_head: 27ec0255ab7e1da19435749d4bca20d2aaef79fb
verified_source: 2da5dd9
review_status: clean
human_verification:
  - test: Accept Race visual hierarchy and live play feel across the specified frame/theme/motion matrix.
    expected: Course and fog remain readable; effects and controls are understandable without sound or motion; ties and DNF are unambiguous.
    why_human: The verifier role explicitly reserves appearance and performance feel for human judgment; automated and agent screenshot evidence is complete but is not human acceptance.
---

# Phase 05: Race verification

> **Acceptance addendum — 2026-10-16:** The user explicitly reported: "I tested it; the presentation feels clear and usable" in response to the combined Survive/Relay/Race HUD, compact Controls, recovery and results question. The human presentation item is now passed; see this phase’s UAT record. The original independent report below is retained as dated evidence, so its pending-human statements describe the pre-response checkpoint. This adds no hardware, exhaustive frame/theme, coverage or conformance claim. Formal phase closure also requires the configured security gate.


**Goal:** Players race one timed shared course under readable leader-relative fog, contextual tactics, and deterministic competitive outcomes.

**Code review is clean; all 40 enumerated roadmap/plan truths have behavioral evidence. Overall status is human_needed solely for the role-mandated human visual/feel acceptance below.** No new implementation gap was found. This is an independent generic-agent fallback applying the full local verifier role and references, not typed-agent execution. The preceding code-review stage independently closed CR-01 and preserved its history in `05-REVIEW.md`. No source edit or commit was made.

The original USER-REQUEST is broader: Phase06 cross-mode presentation and Phase07 coverage/release/PR work remain. This report does not declare the milestone or requested PR complete.

## Observable truths

Five roadmap rows and all 35 PLAN truths are explicitly retained, following original frontmatter order. The roadmap rows summarize plan details and do not add scope. Evidence abbreviations: **T** `tests/race-tracer.mjs`, **O** `race-ordering.test.mjs`, **B** `race-balance.test.mjs`, **L** `race-lifecycle.test.mjs`, **I** `race-items.test.mjs` plus `race-items-runtime.mjs`, **R** `race-results.test.mjs`, **U** `race-runtime.mjs`, **V** `race-layout.mjs`. These files' assertions and production implementations were inspected; SUMMARY counts alone were not accepted.

| ID | Truth | Verdict | Production and behavioral evidence |
|---|---|---|---|
| SC1 | Validated locked roster races a shared course, default500/180. | VERIFIED | `validateRaceSetup` and `createRaceSession` validate/copy the proposal before committing LocalSession; T covers2–4 bound unique seats, invalid settings and visible defaults. |
| SC2 | Monotonic leader fog damages trailers on cadence with readable shared view. | VERIFIED | Coordinator captures earned frontier, computes boundary, evaluates actual ground and calls named health damage; O strict-line/cadence/immunity and U/V camera, HUD and edge cues. |
| SC3 | Lifecycle, simultaneous finishes, ties and timeout preserve deterministic state. | VERIFIED | Coordinator fixed-step ordering and shared recovery/router leases; O/L permutations, death-before-finish, finish-before-timeout, grace/wait/reclaim and all-down matrices. |
| SC4 | Eligible tactics have feedback; invalid use spends nothing. | VERIFIED | `race-items.ts` common planner/revalidate/commit and typed catalogue; I invalid target/owner/context/stock/wallet matrices, U real owner input and muted audio graph. |
| SC5 | Frozen podium and complete per-character competitive statistics. | VERIFIED | `race-results.ts` validated ledger and immutable terminal projection; R true competition ties, explicit DNF, pre-clear credit, all participant fields and actual-input paging. |
| P01.1 | Completed dependencies/live APIs and Relay evidence precede Race. | VERIFIED | Phase01–04 verification reports, all dependency summaries, 05-01 API/preflight record and retained exact inherited gates; source starts from delivered Relay boundary rather than a substitute. |
| P01.2 | Closed2–4 unique characters, validated shared finish/time defaults. | VERIFIED | Atomic setup validation and frozen descriptor; T invalid/duplicate/unbound proposals, roster sizes, default500/180 and late-device rejection. |
| P01.3 | One production world with independent players. | VERIFIED | One LocalSession owns GameWorld; T shared identity/clock/claims, B real generated runs and inherited shared-session tests. No per-racer terrain/RNG copy. |
| P01.4 | Composable validated definition and handler bundle, generic core seams. | VERIFIED | `composeRaceDefinition` installs optional health/pursuit/device/lifecycle/presentation policies; session/render/input consume generic contracts. Inherited parity and shared policy tests pass. |
| P01.5 | Exact documented mode example compiles and executes lifecycle. | VERIFIED | `tests/mode-authoring.test.mjs` extracts the actual fenced example in `docs/mode-rules.md`, type-checks and drives actual LocalSession lifecycle callbacks. |
| P02.1 | Settled movement earnings survive death/exclusion; fog never retreats. | VERIFIED | Coordinator captures sorted earned frontiers before lifecycle exclusion; O movement/death/permutation and monotonic boundary assertions. |
| P02.2 | Actual-ground strict-line fog uses normal health/cadence. | VERIFIED | Boundary comparison is strict; continuous exposure accumulator calls `session.damage`; O exact-line, backward position, immunity/protection and attempted-versus-landed damage. |
| P02.3 | Fatal before finish, true living ties, finish before timeout, offers close. | VERIFIED | Session settles hazards before coordinator finish evaluation; O real unsupported water/traffic and delivered hazards, simultaneous tick, timeout/all-down offer closure. Independent tie test passes. |
| P02.4 | Forced/rejected/recovery movement grants no progress and ordering is stable. | VERIFIED | Earned frontier separated from position; O placement/rejected/backtracking and reversed roster assertions; L no-ahead reclaim and independent100/250 progression. |
| P02.5 | Default500/180,12-tile buffer,1-feather/sec checked on production runs. | VERIFIED | B generated legal-input runs across2/3/4 racers, repeat/reverse and two seeds; `artifacts/race/balance.json` retains outcomes. Model scenarios are distinguished from this real-course balance evidence. |
| P03.1 | A ghost neither pauses others nor performs economic death. | VERIFIED | Generic simulation/retention guards plus coordinator status; L retains assets/rows and advances connected racers, I ghost cannot claim/spend. |
| P03.2 |12 active seconds and fresh replacement preserve original seat/state. | VERIFIED | Original participant/device identity, lifecycle token and router neutral seeding; L changed-slot/stale/held rejection, exact deadlines/resources/protection and no-ahead placement. |
| P03.3 | All-controller waiting freezes clocks; departure/grace creates DNF, no admission. | VERIFIED | `canAdvance` waiting policy, explicit terminal statuses and closed roster; L frozen partial movement/clocks, grace expiration, leave/cancel/confirm and stranger rejection. |
| P03.4 | Death alone clears/spills; personal250 differs from innate100. | VERIFIED | Shared recovery service and pre-clear observations; L actual traffic accept/decline/expiry,249/250/251 earned tiles and per-seat ownership; O last survivor/all-down timeout. |
| P03.5 | Stable identity/generation transitions clear held input. | VERIFIED | SessionInputRouter/GamepadRouter leases and main context invalidation; L/U replacement, held-edge, lifecycle and retry tests. |
| P04.1 | Mud/Lantern exact policy and atomic common-system activation. | VERIFIED | Registry installs price30/max1; Mud range16 and1.35 cooldown for2 seconds, Lantern fog-only3 seconds; I real movement/damage and owner debit assertions. |
| P04.2 | Each drop has isolated1:1250 bucket in captured schema. | VERIFIED | Captured `race-item-schema-1`, distinct bucket selection and independent salt; I exact bucket counts, malformed versions and unchanged released RNG future outputs. |
| P04.3 | Default gravity without magnet extension. | VERIFIED | Common world collection eligibility/default radius; I contested claim, magnet rejection and actual generated fractional river landing. |
| P04.4 | Race excludes legacy cards/powers/packs/common items; cosmetics appearance-only. | VERIFIED | Catalogue, run inventory and activation policies close all paths; I forged requests/no grants/legacy denial and Survive control. Fresh Race inventory is restricted before play. |
| P04.5 | Invalid/stale/protected/departed/range failures mutate nothing. | VERIFIED | Generation/context/owner/target revalidation precedes synchronous charge/effect commit; I snapshots inventory/wallet/effect/audio/stat observations. Independent rejection case passes. |
| P05.1 | Authoritative events retain identity/tick/time before destructive clear. | VERIFIED | Session pre-clear/pre-depart and committed market/item observations feed ledger; R real transaction/death and stable receiver tests, no reconstruction from depleted inventory. |
| P05.2 | Finish ticks then timeout distance yield true ranks; DNF unranked. | VERIFIED | Rank counts strictly better eligible records, equal records share rank; R mixed vectors, all-DNF and24 participant permutations. |
| P05.3 | Frozen result contains settings/schema/reason/time/frontier and all statistics. | VERIFIED | Deep plain-data snapshot/cache and terminal ledger seal; R field completeness, participant records and original world/result freeze. |
| P05.4 | Late callbacks/input/reclaim/resize/retry cannot mutate result or choose tie winner. | VERIFIED | Ledger rejects postterminal/stale ownership events and UI consumes frozen data; R immutable/permutation tests and U actual controller/keyboard retry. Independent ledger case passes. |
| P05.5 | UI projects frozen result instead of rebuilding history. | VERIFIED | `createRaceResults` receives captured result and pages participant fields; R all20 metrics, tie/DNF tiers, resize and exact frozen serialization. |
| P06.1 | Built mixed-input flow covers setup through lifecycle/results/retry. | VERIFIED | U16 actual built-iframe cases plus L/R/T visible flows collectively cover the contract. Coverage is multiple scenarios, not one fictional uninterrupted run. CR-01 finish/timeout controller cases independently rerun. |
| P06.2 | Shared camera/fog/leader/HUD/edge cues use actual observations. | VERIFIED | Generic SessionPresentation consumed by `render.ts`; coordinator supplies leader frontier/boundary and per-seat status; U/V actual position/health cues, inspected wide/fog captures. |
| P06.3 | One owner hand/market with Race gear/wardrobe invalidates stale context. | VERIFIED | Main selected owner, existing RunHand/MarketUI, typed shop policy and context generations; U one-tree counts, captured stale target/action rejection and owner changes. |
| P06.4 | Contextual visual/audio feedback respects mute and reduced motion. | VERIFIED | Session events use existing mute-aware audio graph; renderer/UI retain static identity/effect/status cues; U voice/mute observations and V motion states. Speaker output was muted throughout. |
| P06.5 | Optional gamepad absence leaves keyboard/pointer functional. | VERIFIED | Optional injected domain guarded; U absent-domain controls, actual keyboard/pointer navigation and real graph checks; no native polling or product debug hook. |
| P07.1 | Approved copy/material/type/targets/focus/live/theme/motion. | VERIFIED | UI/CSS substantive and imported; V exact copy, font roles,44px targets, focus/live/geometry checks; independent screenshot inspection below. Human aesthetic acceptance remains separate. |
| P07.2 | Six frames/two themes preserve state without scrollbars. | VERIFIED | V420 captures and bounded document/surfaces/hit tests, below-floor notice and retained state; compact/short/full screenshots inspected. |
| P07.3 | Muted inspectable evidence covers fog/items/owner/recovery/reclaim/ties/DNF. | VERIFIED | V report contains35 states ×6 frames ×2 themes, zero failures/errors/external calls; both contact sheets and representative full captures viewed. |
| P07.4 | Exact dependency/Race gates plus required checks and lockfile pass. | VERIFIED | Exact prior final Relay/Race gate logs on62f9958; repaired main/runtime source reran73 shared and16 runtime plus type/build/guidance/conformance. Narrow production diff inspected; unchanged model/layout evidence remains applicable. |
| P07.5 | Unmeasured conformance/hardware coverage stays explicit. | VERIFIED | Actual report5 pass/0 fail/5 skipped:3 manifest,1 wire,1 lifecycle unmeasured. Injected controller snapshots do not constitute physical controller coverage. |

**Score40/40;0 failed,0 behavior-unverified;0 overrides.** There is no declared standalone probe script, must-have prohibition block or backstop block requiring a separate execution. Negative authority assertions are exercised in runtime/guidance/item tests. No unreferenced TBD/FIXME/XXX blocker was found in reviewed production or Race tests.

## Artifacts, wiring and real data flow

All declared artifact groups exist, contain substantive implementation, are reached by the actual application/tests, and carry live state rather than placeholders.

| Artifact / link | Verified responsibility |
|---|---|
| `src/race.ts` → session | Main startup validates real UI draft, builds one descriptor/LocalSession, installs explicit handlers and common recovery/market/item services. Fixed-step settlement drives coordinator observations. |
| `src/session.ts`, `session-input.ts`, `game.ts` | Optional policy defaults retain legacy behavior; health, device reservation, simulation, stable player receivers and authoritative dispatch remain shared. WINDOWS1 is closed by permanent receiver routing and retained reentrant tests; WINDOWS ledger has0 open. |
| `src/race-items.ts` → consumables/drops/co-op-market/run inventory | Captured schema produces common world offers; personal inventory and typed catalogue plan/revalidate/commit the actual owner debit and effect. No separate Race pickup/market authority. |
| `src/race-results.ts` ← coordinator/session events → UI | Pre-clear immutable event metadata accumulates validated participant ledger, seals once and deep-freezes full result. Result pages consume this object, not live avatar state. |
| `src/race-ui.ts`, `race-ui.css`, `main.ts` | Setup/HUD/lifecycle/item/result controls call production authority and observe current snapshots. CSS is imported and actual state/page attributes select layouts. Visible terminal controller route now precedes gameplay guards. |
| `src/render.ts`, `audio.ts` | Shared presentation data produces camera/fog/player effects and existing audio events; no alternate world, host DOM, native controller or direct-network path. |
| `market-ui.ts`, `run-hand.ts` | Single owner-labelled DOM tree receives live owner inventory/capabilities and invalidates selections on context changes. Appearance-only wardrobe policy enforced below rendering. |
| T/O/B/L/I/R/U/V | Production source-loader model tests and built-artifact tests are connected to their actual modules. Browser callers reuse `market-game-fixture.mjs`: `dist/index.html`, opaque `allow-scripts` iframe, Chromium `--mute-audio`. Transitive fixture wiring is real. |
| `docs/mode-rules.md` → `mode-authoring.test.mjs` | Exact authored example extracted, compiled and executed; test does not mirror a separately maintained implementation. |

## Independent checks and retained evidence

| Evidence | Result and interpretation |
|---|---|
| `node --test --test-name-pattern='assigned controller operates frozen Race results' tests/race-runtime.mjs` | Independent session80996 exit0;2/2, no skips. `/tmp/down-to-duck-05-independent-repair-check.log`. Finish and timeout/DNF fresh controller paging/retry work; held/unknown input rejected, world/result frozen. |
| `node --test --test-name-pattern='same-tick tie and finish before timeout\|stale wrong protected ghost departed dead out-of-range\|ledger rejects duplicate wrong-owner' tests/race-ordering.test.mjs tests/race-items.test.mjs tests/race-results.test.mjs` | Independent exit0;3/3 no skips in0.55s. `/tmp/down-to-duck-05-independent-invariants.log`. Exercises real coordinator, transaction and ledger mutations; these are arranged model scenarios, not claims of organic browser travel. |
| Current repair gate `/tmp/down-to-duck-05-review-repair-final.log` | Orchestrator session86987 exit0, actual output inspected:73 shared input/results,16 Race runtime, type-check/build, guidance6, conformance5/0/5unmeasured, immutable lockfile. Source2da5dd9. |
| Exact prior Relay/Race gates `/tmp/down-to-duck-05-07-verified-relay.log`, `...-race.log` | Session19289 exit0 on62f9958. Includes full Phase2/3, Relay65/runtime12/layout252; Race76/runtime12/layout420. Subsequent production change is the inspected13-line terminal routing reorder; additional4 runtime cases pass in current gate. No claim that all420 screenshots were regenerated for that routing-only repair. |
| `git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml` | Independent exit0. Oracle unchanged. |

The complete gates were not gratuitously repeated. Retained tests inspect authoritative state changes and actual assertions rather than only test names/pass counts. Arranged model terrain/clock scenarios prove ordering and rejection precisely; generated balance tests prove real course progression. Built runtime uses actual injected controller/keyboard/pointer actions and read-only observations. Opaque browser RNG closure identity is not treated as proof of future RNG equivalence; I's semantic future-output comparisons supply that separate evidence.

## Visual inspection and remaining human item

Independently viewed `artifacts/race-layout/contact-dark.png` and `contact-light.png`, then full captures: `four-racers-900x600-dark.png`, `mud-target-240x240-light.png`, `recovery-actions-240x240-dark.png`, `fog-landed-320x560-light.png`, `reclaim-320x560-dark.png`, `four-tie-1000x280-light.png`, `gear-240x240-light.png`, `wardrobe-1000x280-light.png`, `lantern-effect-900x600-light.png`, `timeout-dnf-900x600-light.png`. Actual report contains420 captures, empty failures/errors/external arrays.

Compact target/recovery controls remain distinct and readable. The fog capture shows actual trailer health and distance cues; wide Lantern shows static effect and personal fog-safe state. Short equal-finish podium groups all four under one shared rank; timeout explicitly separates ranked survivor from DNF-left. Owner gear/wardrobe pages remain labelled and bounded in compact/short frames. Contact sheets show theme and state continuity. These observations complement automated geometry, contrast, semantics, focus and live-region assertions; they are agent visual inspection, not human acceptance or physical hardware testing.

**Human acceptance remaining:** inspect the two contact sheets and representative live Race in the specified sizes/themes/motion settings; confirm course/fog remain focal, item/recovery cues are understandable without motion/audio, controls/copy are legible, and tie/DNF tiers imply no false winner. Also judge live input/camera/fog performance feel. This merges the explicit05-07 `<human-check>` with verifier Step8's mandatory appearance/feel item. No new code defect is asserted. Full verifier Step9 requires `human_needed` while that item remains; the earlier Phase04 report's agent-only acceptance does not constitute a human acceptance of Race.

## Requirements and milestone boundaries

| Requirement | Status | Evidence |
|---|---|---|
| ARCH-02 | SATISFIED | P01.4–5 and executable authoring contract; explicit composable lifecycle handlers over shared services. |
| ITEM-06 | SATISFIED | P04.*, P06.3–4; owner/target-safe atomic offense/defense with visible feedback. |
| RACE-01 | SATISFIED | SC1, P01.2–3; validated locked shared timed race. |
| RACE-02 | SATISFIED | SC2, P02.*; monotonic actual-ground fog and cadence. |
| RACE-03 | SATISFIED | P06.2, P07.1–3; shared camera/HUD/edge cues and inspected responsive captures; human feel acceptance remains above. |
| RACE-04 | SATISFIED | SC3, P02.3–4, P03.*, P05.2; deterministic lifecycle/finish/ties/timeout. |
| RACE-05 | SATISFIED | P01.4, P04.*; composable isolated item/schema/catalogue policies with inherited controls. |
| RACE-06 | SATISFIED | SC5, P05.* and CR-01 closure; complete immutable result and usable terminal input. |
| UI-06 | SATISFIED | P06.4, P07.*, prior03/04 verified revival/flare/transfer cues and retained inherited gates; Race adds fog/items without replacing those services. |

All nine Phase05 requirement IDs are covered; no orphan assigned requirement was found. Phase01–04 prior verified boundaries remain applicable, with new generic health/device/catalogue/stat seams exercised by shared and inherited checks. No open WINDOWS item remains. Phase06 and07 are future scoped work, not invented deferrals of a discovered Race defect.

## Limits and disposition

Review: **clean**, historical CR-01 resolved with independent evidence. Implementation truths: **40/40 verified**, no new source gap. Overall role status: **human_needed** for the explicit visual/feel acceptance only. Physical controllers remain unmeasured; SDK snapshot tests prove browser routing, not USB/Bluetooth hardware behavior. Conformance remains5 pass/0 fail/5 unmeasured, not10 passes. No installed dependency, lockfile, oracle, preview5175, source file or commit was changed by this verification.
