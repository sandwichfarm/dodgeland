---
phase: 06
slug: cross-mode-presentation
status: verified
verdict: SECURED
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-10-16
execution: generic-agent-fallback
---

# Phase 06 security audit — Cross-mode presentation

**SECURED: 7/7 declared unique threats resolved; zero blocking or non-blocking open threats.** Generic-agent fallback applying the full local gsd-security-auditor role and secure-phase workflow; not typed-agent execution. The parent explicitly delegated persistence of this report. Implementation remained read-only.

## Scope and trust boundaries

This is the configured ASVS-level-1 mitigation-presence audit of the existing plan threat register, with call-site and retained behavioral corroboration. It is not a complete ASVS certification, new vulnerability scan, or release/phase completion declaration. Boundaries checked: untrusted device/setup input → stable participant authority; owner/context → transactional mutation; active simulation → lifecycle and frozen results; presentation → authoritative model; test observations → claimed evidence. The shell remains outside napplet ownership.

All phase PLAN threat tables and SUMMARY artifacts were reconciled with prior independent REVIEW/VERIFICATION, repair records and current implementation. Graph discovery preceded targeted source reads. No dedicated SUMMARY Threat Flags added an unmapped surface; shared changes map to the owner, lifecycle, presentation or evidence threats below.

## Threat register

| ID | Category / component | Severity | Disposition | Resolution and concrete evidence |
|---|---|---|---|---|
| T06-01 | Elevation: main owner/inspection | high | mitigate | **CLOSED.** src/main.ts:128 selectHudOwner invalidates market/hand/lifecycle context and seeds router before owner change; :121 captures transaction generations. src/session-input.ts:252 retains lease/context fresh-edge gate. Existing crossed-owner and held-input regressions are included in final104 affected tests. |
| T06-02 | Tampering: geometry evidence | high | mitigate | **CLOSED.** tests/market-game-fixture.mjs:167 observes actual production traveler/body projection via debugger, not an alternate renderer; tests/cross-mode-presentation.mjs:58 checks actual mode/base and :66 compares full body/nameplate envelopes to real DOM. :81 exercises real lateral travel. Retained RED counterexamples and before/after model snapshots distinguish provenance. |
| T06-03 | Denial: frame/inspection focus | medium | mitigate | **CLOSED.** src/run-hand.ts:17 explicit previous/next/close; :24 exact original-node restore; src/main.ts:475 pauses and seeds inspection input, :1492 leaves child Tab ownership intact. session-ui.css:189/:194 bounds 44px navigation. Settled native traversal/activation regressions now pass. |
| T06-04 | Elevation: owner/recovery UI | high | mitigate | **CLOSED.** src/main.ts:1021 invalidates stale Race target contexts; :1451 verifies reclaim identity/lease; race-items.ts:26 and session-recovery.ts:55 revalidate mutation plans. Final104 affected tests include recovery owner, adapter, lifecycle and keyboard/controller runtime cases. |
| T06-05 | Tampering: frozen result/retry | high | mitigate | **CLOSED.** src/race-results.ts:66 caches/freeze terminal record; main result routing occurs before gameplay eligibility without reopening gameplay (05-REVIEW-REPAIR.md). Retained assigned-controller finish/timeout, unknown/held rejection and cross-mode page/resize/retry snapshots preserve frozen results. |
| T06-06 | Repudiation: acceptance report | medium | mitigate | **CLOSED.** 06-EVIDENCE.md and 06-REVIEW-REPAIR.md retain complete command paths, source commits, REDs and terminal exits. tests/cross-mode-presentation.mjs:10 records sourcePaths hashes. Independent artifact audit matched13 hashes and72 actual envelope samples; final repair92241 and independent52826 are recorded separately from historical21972. |
| T06-07 | Denial: accessibility/focus | medium | mitigate | **CLOSED.** tests/market-game-fixture.mjs:121 waits native ResizeObserver delivery without supplying focus; cross-mode tests:15/:31 use settled native Tab and activation; :45 asserts zero unchanged live-label mutations. src/main.ts:1492 child-board precedence and run-hand.ts:28/:32 change-only labels implement reviewed fixes. Full31-case retained matrix covers frame/theme controls. |

## Accepted risks log

None declared or newly accepted. All seven threats use mitigation. No transferred risks.

## Evidence and audit trail

- Existing exact full gate session21972 exit0: `/tmp/down-to-duck-06-02-final-frozen-gate.log`, exact Relay6 → Race7 → health runtime → cross-mode27, before the narrow Phase06 repair. Phase05 final19289 includes exact Relay/Race matrices; Phase05 controller repair86987 retained the terminal routing regressions. These are historical evidence at their recorded source revisions, not newly executed tests.

- Final Phase06 repair source `b9bc44f`, session92241 exit0: `/tmp/down-to-duck-06-review-repair-final.log`, cross-mode31/31 and affected runtime/input104/104, type/build/guidance, conformance and immutable root-lockfile checks. Independent52826 exit0: `/tmp/down-to-duck-06-review-independent-recheck.log`, native settled child traversal and change-only announcements. Review reports retain RED history and resolution.

- `/tmp/down-to-duck-06-verifier-artifact-audit.log` supplies prior independent artifact/hash/geometry corroboration. Arranged fixture journeys remain arranged; real-input provenance is credited only to the explicitly identified setup/travel/controller cases. Observing actual production transforms does not grant test state authority to production.

- Current read-only root lockfile comparison against `a310a81ed6c76df4b265c9012c23b8c83f4802e5` is empty. No install, dependency/source edit, test run, browser launch, preview5175 change, oracle repin, STATE edit or commit occurred in this audit. Concurrent Phase07 planning edits are outside scope.

## Limits and sign-off

Conformance remains **5 pass / 0 fail / 5 unmeasured** in the cited evidence: missing manifest/wire/lifecycle measurements are not credited as passes. Physical controllers and actual screen-reader speech remain unmeasured; injected snapshots establish software authority behavior only. Human presentation acceptance is managed separately by the parent and is not used to close these implementation threats.

No declared mitigation was found absent at the configured depth. No unregistered implementation flag was identified. This report closes only the phase threat-model audit; it does not claim Phase07 release, complete semantic coverage, or PR delivery.
