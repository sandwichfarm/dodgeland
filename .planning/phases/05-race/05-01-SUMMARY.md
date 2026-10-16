---
phase: 05-race
plan: 01
status: in-progress
---

# Phase 05 Plan 01: Race execution record

This is the pre-edit API reconciliation, not a completion claim. Execution uses the authorized generic-agent fallback while applying the GSD executor workflow.

## Gate 0: accepted unchanged-source evidence

Entry HEAD is `7f78ac7`; source baseline is `52f8e0d`. `git diff 52f8e0d HEAD -- src tests package.json pnpm-lock.yaml` is empty. The immediately preceding exact Relay Gate 6 completed in session `89260`, exit 0, with durable log `/tmp/down-to-duck-04-review-repair-final-gate.log`. It includes the nested Phase 2 and Phase 3 gates, immutable solo parity, all delivered Relay tests, type checking, build, guidance, conformance, and lockfile identity. Root explicitly authorized adoption of this fresh unchanged-source evidence instead of rerunning it. All completed Phase 1–4 summaries are present, including Phase 3 plan 08. Conformance remains 5 pass, 0 fail, 5 unmeasured; physical controllers remain unmeasured. The solo oracle remains `a310a81ed6c76df4b265c9012c23b8c83f4802e5`.

## Delivered API reconciliation before RED/product edits

| Responsibility | Delivered API and intended reuse |
| --- | --- |
| Validated solo definitions | `composeModeDefinition`, `isModeDefinition`; branded, frozen definitions and strict unknown-key validation. |
| Multiplayer composition | `SessionModeDefinition` and `SessionModeHandlers`; add a narrow validated handler composer for authored bundles, without mode-ID policy in shared services. |
| Shared simulation | `LocalSession.stage/start/update`, `SharedWorld`, `SessionPlayer`; one world update followed by all players, hazards, settled progress, and handler tick. |
| Earned finish provenance | `SessionPlayer.completedForwardTiles`, settled by the session after hazard resolution; spatial placement is not finish credit. |
| Lifecycle | Handlers `attach/join/deviceLost/reclaim/depart/death/progress/tick/result`; records include stable seat, session/player identity and simulation tick. |
| Recovery | Delivered `SessionRecoveryController`; personal charge, offers, expiry and accepted recovery remain shared services. |
| Input | Existing `SessionInput`/gamepad router, binding leases, context generations and fresh-edge barriers; no new controller or native polling. |
| Ownership/items | Existing owner projections and `CoOpMarketAdapter` capability policy; no copied economy or recovery. Race item expansion belongs to later plans. |
| Results | `SessionResult` envelope and idempotent `LocalSession.completeResult`; Race supplies a frozen mode-specific record. |
| Rendering | Existing `drawSession(world, session.views(), dt)`; one shared world and independent player views. |
| Clock | Shared fixed-step world advancement; coordinator observes settled ticks and freezes its captured active duration on result. |
| Relay coexistence | Existing setup, handoff, lifecycle, owner and results consumers remain intact; verified Phase 04 source is the entry baseline. |

## Execution status

Preflight recorded before the first Race test or production edit. Tasks 1–3 and their post-edit gates are pending. Phase completion remains reserved for independent verification.
