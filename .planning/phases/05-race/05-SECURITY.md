---
phase: 05
slug: race
status: verified
verdict: SECURED
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-10-16
execution: generic-agent-fallback
---

# Phase 05 security audit — Race

**SECURED: 30/30 declared unique threats resolved; zero blocking or non-blocking open threats.** Generic-agent fallback applying the full local gsd-security-auditor role and secure-phase workflow; not typed-agent execution. The parent explicitly delegated persistence of this report. Implementation remained read-only.

## Scope and trust boundaries

This is the configured ASVS-level-1 mitigation-presence audit of the existing plan threat register, with call-site and retained behavioral corroboration. It is not a complete ASVS certification, new vulnerability scan, or release/phase completion declaration. Boundaries checked: untrusted device/setup input → stable participant authority; owner/context → transactional mutation; active simulation → lifecycle and frozen results; presentation → authoritative model; test observations → claimed evidence. The shell remains outside napplet ownership.

All phase PLAN threat tables and SUMMARY artifacts were reconciled with prior independent REVIEW/VERIFICATION, repair records and current implementation. Graph discovery preceded targeted source reads. No dedicated SUMMARY Threat Flags added an unmapped surface; shared changes map to the owner, lifecycle, presentation or evidence threats below.

## Threat register

| ID | Category / component | Severity | Disposition | Resolution and concrete evidence |
|---|---|---|---|---|
| T-05-01 | Tampering: Race settings/roster | high | mitigate | **CLOSED.** src/race.ts:32 validates unknown keys, bounded integers, distinct seats/devices/characters and freezes setup; createRaceSession:247 calls it before staged allocation. src/main.ts:1451 additionally checks the live device lease. |
| T-05-02 | Elevation of Privilege: handler/input authority | high | mitigate | **CLOSED.** src/session.ts:96 validates composed handlers; src/session-input.ts:252 consumes fresh edges under lease/context checks; src/race.ts:232 supplies canAct/canAdmit/canLifecycle. Retained race-tracer and session-input cases cover stale/late input. |
| T-05-03 | Denial of Service: partial dependency/Relay seam | medium | mitigate | **CLOSED.** 05-01-SUMMARY.md:24 records unchanged-source Gate0 adoption from 52f8e0d through 7f78ac7, exact Relay gate session89260 exit0; /tmp/down-to-duck-04-review-repair-final-gate.log. Final 19289 exact Relay/Race gates corroborate the dependency seam. |
| T-05-04 | Spoofing: browser tracer | medium | mitigate | **CLOSED.** tests/race-tracer.mjs:60 loads the built artifact in allow-scripts opaque iframe; :63 mutes Chromium. Visible setup controls and injected authorized snapshots exercise production setup; no production test hook is used. |
| T-05-SC | Tampering: package installs | high | mitigate | **CLOSED.** Read-only git diff against immutable oracle a310a81ed6c76df4b265c9012c23b8c83f4802e5 for pnpm-lock.yaml is empty. Exact historical gates include the same identity check; this audit performed no installs. Strongest repeated high/mitigate declaration governs. |
| T-05-05 | Tampering: earned frontier | high | mitigate | **CLOSED.** src/session.ts:881 increments completed personal progress on accepted forward completion; src/race.ts:185 consumes earnedDistance before recovery/exclusion. tests/race-ordering.test.mjs:53 and tests/race-runtime.mjs:8 cover forced/rejected/backward provenance (included in canonical Race gate). |
| T-05-06 | Denial of Service: fog damage cadence | high | mitigate | **CLOSED.** src/race.ts:180 derives dt from authoritative world time; :199 restricts living active unfinished players and strict groundY; :204 consumes interval exposure through session.damage and stops on death. Normal fixed-step session advancement bounds delivered deltas. |
| T-05-07 | Repudiation: finish/tie/timeout | high | mitigate | **CLOSED.** src/race.ts:194 records finishers with shared simulationTick before timeout:212; src/race-results.ts:32 appends copied immutable events. tests/race-results.test.mjs:91 and :162 cover same-tick and ordering-independent ranks. |
| T-05-08 | Tampering: paused clocks | medium | mitigate | **CLOSED.** src/main.ts:1709 gates advancement on frame/focus/modal/pause; src/race.ts:181 derives only world-time delta; :232 canAdvance rejects terminal/waiting/leave states. Race lifecycle/runtime suspension cases exercise zero advancement. |
| T-05-09 | Spoofing: seat reclaim | high | mitigate | **CLOSED.** src/session.ts:955 deviceReclaimToken and :967 reclaim validate token; src/session-input.ts:148 verifies seat/id/epoch and :252 requires fresh input; src/main.ts:1451 rechecks pending identity and canReclaim before race.reclaim. |
| T-05-10 | Tampering: reclaim state | high | mitigate | **CLOSED.** src/race.ts:100 safeReturn caps placement at min(actual ground, earned distance), checks occupied/safe cells; :123 restores only position and retains idle. Retained race lifecycle tests compare resources, recovery deadlines and placement. |
| T-05-11 | Elevation of Privilege: stale lifecycle action | high | mitigate | **CLOSED.** src/race.ts:84 actionToken captures participant/revision/lifecycle; :87 command rejects stale/terminal/lost owner. src/main.ts:128 invalidates owner interactions and seeds input; router context transitions suppress held actions. |
| T-05-12 | Repudiation: death versus departure | medium | mitigate | **CLOSED.** src/race.ts:228 beforeDeath and beforeDepart capture separate ledger kinds before cleanup; :130 records reason/tick/time. tests/race-results.test.mjs:107 checks leave/forfeit/decline/expiry records and disjoint outcomes. |
| T-05-13 | Tampering: keyed sampler/RNG | high | mitigate | **CLOSED.** src/consumable-drops.ts:29 stateless keyed draw; :47 registers frozen schema; :65 sampleItemDrop validates registered identity and exact unbiased bucket range. src/race-items.ts:14 declares isolated Race salt/version. Retained item tests compare subsequent RNG outputs. |
| T-05-14 | Spoofing: item owner/target | high | mitigate | **CLOSED.** src/race-items.ts:26 valid checks owner participant/device/lifecycle/context/inventory plus actual target identity, protection, range and eligibility; :38 plan and :46 activate both call validation. |
| T-05-15 | Tampering: partial item commit | high | mitigate | **CLOSED.** src/race-items.ts:38 creates frozen side-effect-free plan; :46 policy revalidates then synchronously debits/applies. src/session.ts:558 rejects duplicate/stale actions and :573 appends effects/stat/audio-use records only on success. |
| T-05-16 | Elevation of Privilege: mode eligibility | high | mitigate | **CLOSED.** src/race.ts:154 installs appearance-only run policy and race-tactics catalogue; src/session.ts:455 validates world policy; :501/:535/:547 credit gates and :569 debit gate use capability-aware plans. src/co-op-market.ts:150 applies matching item-credit eligibility. |
| T-05-17 | Repudiation: participant statistics | high | mitigate | **CLOSED.** src/race.ts:228 pre-death/pre-depart capture; src/session.ts:383 appends stable participant/generation/tick/time interactions; src/race-results.ts:34 rejects duplicate, foreign, stale and invalid records. tests/race-results.test.mjs:150 covers rejection atomically. |
| T-05-18 | Tampering: rank calculation | high | mitigate | **CLOSED.** src/race-results.ts:56 pure competition ranking excludes DNF and uses finish tick or timeout distance; tests/race-results.test.mjs:101/:162 cover mixed finishers and permutation invariance. |
| T-05-19 | Tampering: frozen result | high | mitigate | **CLOSED.** src/race-results.ts:25 recursively freezes copied values; :66 caches one terminal result and freezes ledger; src/race.ts:181 rejects later ticks and session.ts:644 rejects postterminal item use. Retained late-action/frozen-result tests corroborate. |
| T-05-20 | Spoofing: podium identity | medium | mitigate | **CLOSED.** src/race-ui.ts:157 result projection reads frozen participant identity, marker, seat and character; src/race-results.ts:32 locks roster identity before append. tests/race-results.test.mjs:174 checks actual paged results. |
| T-05-21 | Spoofing: owner/target actions | high | mitigate | **CLOSED.** src/main.ts:121 captures transaction generations, :128 invalidates previous owner, :1021 invalidates stale Race item context; src/race-items.ts:26 revalidates at mutation boundary. Crossed-owner/held-input runtime cases retained. |
| T-05-22 | Tampering: render-derived authority | high | mitigate | **CLOSED.** src/render.ts:542 drawSession consumes player render views and presentation; src/main.ts:1744 passes read-only session views and optional viewport. Authoritative clocks/position/economy remain in session/race; cross-mode snapshots compare state around presentation. |
| T-05-23 | Elevation of Privilege: controller/browser APIs | high | mitigate | **CLOSED.** src/gamepad.ts:182 requires parent message source and valid gamepad.state shape; :170 parses bounded snapshots, :187 suspends focus, :198 tears down transport. Optional-domain fallback and forbidden-browser-API checks exist in retained runtime/conformance tests. This is local injected-device authority, not remote authentication. |
| T-05-24 | Information Disclosure: stale owner tree | medium | mitigate | **CLOSED.** src/main.ts:128 closes lifecycle board, invalidates market/hand context and seeds router before selecting another owner; src/run-hand.ts:11 reparents original controls rather than cloning actions. Owner-crossing browser cases check stale requests and focus. |
| T-05-25 | Denial of Service: audio/motion feedback | low | accept | **Documented accepted risk.** Pre-existing acceptance in 05-06-PLAN.md:164, persisted in Accepted Risks below. src/main.ts:1736 gates audio by mute/focus/frame; static status remains available. This acceptance does not assert hardware sound or screen-reader speech measurement. |
| T-05-26 | Tampering: responsive state retention | medium | mitigate | **CLOSED.** src/main.ts:1744 changes only rendering viewport; src/run-hand.ts:24 restores original nodes and :27 changes pages without coordinator replacement. Race layout/runtime and cross-mode lifecycle resize cases retain owner, inventory, recovery and result identity. |
| T-05-27 | Denial of Service: compact/short layout | medium | mitigate | **CLOSED.** src/session-ui.css:189/:194 bounds paged inspection and 44px navigation; src/run-hand.ts:17 supplies explicit navigation/close. Race layout retained 420 captures and full-size podium overflow repair; final cross-mode31 verifies controls/bounds. |
| T-05-28 | Spoofing: visual identity/rank | medium | mitigate | **CLOSED.** src/race-results.ts:56 separates DNF from rank; race-ui.ts:157 renders explicit frozen marker/seat/character and status. tests/race-results.test.mjs:174/:215 exercise paged frozen identity/status; layout matrices check visibility. |
| T-05-29 | Elevation of Privilege: test harness | high | mitigate | **CLOSED.** tests/race-tracer.mjs:60 opaque built-artifact harness with visible controls; tests/market-game-fixture.mjs:56/:63 uses built iframe and muted Chromium. Actual-input journeys are separately identified from explicitly arranged production-state scenarios; no product test hook or alternate renderer is accepted as public-input evidence. |

## Accepted risks log

- **T-05-25 (low):** Preserve the existing plan acceptance from `05-06-PLAN.md:164`: “Existing mute/motion preferences plus static/text alternatives keep gameplay usable; device-muted automation verifies graph safely.” This records an existing disposition, not a new user override. Residual device-specific audio/motion comfort and actual assistive speech remain outside automated proof.

- **T-05-SC reconciliation:** Plans01–06 declare high/mitigate; Plan07 repeats low/accept with the same no-install/lockfile condition. This report deduplicates the ID under high/mitigate and verifies its gate; the lower duplicate does not waive protection. No transferred risks.

## Evidence and audit trail

- Existing exact full gate session21972 exit0: `/tmp/down-to-duck-06-02-final-frozen-gate.log`, exact Relay6 → Race7 → health runtime → cross-mode27, before the narrow Phase06 repair. Phase05 final19289 includes exact Relay/Race matrices; Phase05 controller repair86987 retained the terminal routing regressions. These are historical evidence at their recorded source revisions, not newly executed tests.

- Final Phase06 repair source `b9bc44f`, session92241 exit0: `/tmp/down-to-duck-06-review-repair-final.log`, cross-mode31/31 and affected runtime/input104/104, type/build/guidance, conformance and immutable root-lockfile checks. Independent52826 exit0: `/tmp/down-to-duck-06-review-independent-recheck.log`, native settled child traversal and change-only announcements. Review reports retain RED history and resolution.

- `/tmp/down-to-duck-06-verifier-artifact-audit.log` supplies prior independent artifact/hash/geometry corroboration. Arranged fixture journeys remain arranged; real-input provenance is credited only to the explicitly identified setup/travel/controller cases. Observing actual production transforms does not grant test state authority to production.

- Current read-only root lockfile comparison against `a310a81ed6c76df4b265c9012c23b8c83f4802e5` is empty. No install, dependency/source edit, test run, browser launch, preview5175 change, oracle repin, STATE edit or commit occurred in this audit. Concurrent Phase07 planning edits are outside scope.

## Limits and sign-off

Conformance remains **5 pass / 0 fail / 5 unmeasured** in the cited evidence: missing manifest/wire/lifecycle measurements are not credited as passes. Physical controllers and actual screen-reader speech remain unmeasured; injected snapshots establish software authority behavior only. Human presentation acceptance is managed separately by the parent and is not used to close these implementation threats.

No declared mitigation was found absent at the configured depth. No unregistered implementation flag was identified. This report closes only the phase threat-model audit; it does not claim Phase07 release, complete semantic coverage, or PR delivery.
