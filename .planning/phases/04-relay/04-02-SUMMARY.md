---
phase: 04-relay
plan: 02
subsystem: gameplay
tags: [relay, boundaries, recovery, continuity, production-tests]
status: complete
tasks_completed: 2
tasks_total: 2
requires:
  - phase: 04-01
    provides: Closed Relay setup, composed session handlers, safe transfer and personal score
provides:
  - One-shot authored boundaries with complete hazard and rescue settlement
  - Shared opt-in personal recovery transactions preserving Survive behavior
  - Ground/platform future-state and zero-credit 100/250 continuity proof
requirements-completed: []
requirements-partial: [RELAY-02]
affects: [04-03, 04-04, 04-05, 04-06, race]
tech-stack:
  added: []
  patterns: [post-tick authored observation, immutable boundary latch, opt-in recovery composition]
key-files:
  created: [src/session-recovery.ts, tests/session-recovery.test.mjs, tests/relay-boundary.test.mjs]
  modified: [src/relay.ts, src/session.ts, src/survive-together.ts]
key-decisions:
  - Extract delivered recovery transactions once; modes retain cooperative policy and results.
  - Require new authored earnings before latching the next future boundary.
  - Reuse non-crediting placement unchanged; prove both personal meters with real movement.
duration: 28 min from accepted entry commit through final gate
completed: 2026-10-15
coverage:
  - deliverable: Exact settled boundaries and fatal/rescue priority
    verification:
      - kind: test
        ref: tests/relay-boundary.test.mjs
        status: pass
    human_judgment: false
  - deliverable: Shared recovery composition with Survive preservation
    verification:
      - kind: test
        ref: tests/session-recovery.test.mjs
        status: pass
      - kind: command
        ref: pnpm test:phase3
        status: pass
    human_judgment: false
  - deliverable: Ground/platform world futures and zero personal placement credit
    verification:
      - kind: test
        ref: tests/relay-boundary.test.mjs
        status: pass
    human_judgment: false
---

# Phase 04 Plan 02: Exact boundaries and world continuity Summary

Relay now latches one authored segment boundary, settles hazards and innate rescue before transfer, and preserves shared futures and personal assets across ground and fractional-platform handoffs.

## Execution and reconciliation

Generic executor fallback applied the local GSD executor role and execute-plan workflow using the inherited default model. Typed dispatch had remained pending_init and was canceled; no typed-agent guarantee is claimed. The safe-refactor skill governed the shared recovery extraction. No installations were performed, following the explicit session constraint over the template's install instruction.

Entry source `e16211f` and summary `b04b11c` were unchanged from canonical session90748, exit0, `/tmp/down-to-duck-04-01-final-gate.log`. That accepted gate was reused without an entry rerun. Graph-first discovery and actual source reconciliation preceded edits. The immutable solo oracle remains `a310a81ed6c76df4b265c9012c23b8c83f4802e5`.

| Responsibility | Actual owner and implementation decision |
|---|---|
| Complete fixed-step order | `LocalSession.update` resolves players, pickups, mobs, deaths and settled hops before `handlers.tick`. Relay observes earned movement there and at the delivered progress callback. |
| Authored progress | `SessionPlayer.earnedDistance`, `personalScore`, `completedForwardTiles`, and shared `world.frontier` remain distinct. Position alone cannot latch. |
| Boundary identity | `RelayBoundary` freezes target, outgoing seat, participant and seat lifecycle generation; `RelayCoordinator` retains it through the board and consumes it once on confirmation. |
| Next target | `futureBoundary` chooses the smallest configured boundary above retained frontier after transfer or death; another opportunity requires later authored new frontier. |
| Settlement and placement | Existing `isRecoverySafePosition` and `transferPosition` remain authoritative. Placement changes position and spatial credit/provenance floors without income, healing or meter calls. |
| Recovery validation | Existing `planRecovery` and `commitRecoveryPlan` are unchanged. Offer lifecycle/application were private to Survive and required the shared extraction below. |
| Recovery composition | New `SessionRecoveryController` defaults to personal recovery. Survive opts into personal/revival/flare and retains item clearing, cooperative setup and terminal results. Relay delegates active-owner death/pending/tick/recover only. |
| Safe return anchors | `recoverySafeCells` now considers simulated living players, preventing an inactive Relay roster avatar from anchoring or blocking the active runner's return. Survive's active roster behavior is unchanged. |

## Accomplishments

- Exact one-shot behavior at 49/50/51 and lengths 1, 7, 50 and 999; backwards/repeated crossings and exceptional frontier jumps cannot create duplicate or empty handoffs. The pending record survives settlement, and world time freezes only after the authoritative board opens.
- Actual traffic, water, wave and mob death precede transfer and create one personal offer. Successful innate water rescue remains alive and finishes before the retained pending boundary opens. A real moving platform supplies a fractional launch/landing position that survives confirmation exactly.
- Ground and platform tests compare complete shared owner state, row/descriptor/RNG identity, clock, actor phases, lane-speed caches, retained pickup ownership, metadata and personal state before/after actual confirmation. An unconfirmed twin supplies eight next RNG outputs and future actor/pickup/course outputs. Real market purchases populate cards, timed powers, cosmetics/equipment and fractional wallets; nearby coins remain unclaimed by placement.
- Real rescue followed by 99 authored tiles, another runner's leg, and returning placement leaves the innate meter at 99/100. Real fatal death/personal recovery followed by 249 settled tiles and returning placement leaves personal revival at 249/250. Backstep/return earns zero; the next new authored step completes each meter.

## Task commits and RED/GREEN evidence

1. `5033f41` — RED production river-death regression exposed missing Relay personal recovery composition.
2. `d4ddf2b` — Extracted shared opt-in recovery transactions with explicit Arcade/Flow accept/decline/expiry parity tests.
3. `3be2733` — Relay active-owner recovery consumer and generic simulated-player safe-cell filtering; dependency map in `04-02-RECOVERY-EXTRACTION.md`.
4. `f79651c` — Boundary RED suite: 6 failed / 2 passed before the exact pending/future-target implementation.
5. `f82764a` — Task 1 GREEN: authored one-shot boundaries and hazard/rescue/platform settlement; 24/24 built tracer plus boundary tests and type-check.
6. `31d992c` — Task 2 continuity and actual 100/250-meter proof. Delivered placement already satisfied this behavior, so this task adds characterization without unnecessary production edits.

The first Task 2 adapter accidentally traversed each player's session back-reference, comparing the intentionally changed incoming position twice. Correcting the adapter's ownership boundary made the existing placement pass; this was a test defect, not a claimed product RED. Likewise, initial hazard fixtures used disabled Stroll pursuers and assumed fresh landing immediately drifted. Corrected fixtures use enabled pursuers and real pre-hop platform carry; production landing order was preserved.

## Verification

All handles below reached terminal exit0 unless explicitly labeled RED.

| Evidence | Result and durable log |
|---|---|
| Initial recovery RED | Exit1, missing offer; `/tmp/down-to-duck-04-02-recovery-reconciliation-red.log` |
| Before/after extraction | Existing recovery44/44 on both sides; `/tmp/down-to-duck-04-02-recovery-pre-extract.log` and `...-recovery-post-extract.log` |
| Explicit extraction parity | 6/6; `/tmp/down-to-duck-04-02-recovery-parity.log` |
| Full dependency repair | Session67125: full phase3 plus initial Relay/boundary/recovery19/19; `/tmp/down-to-duck-04-02-recovery-full-gate.log` |
| Boundary RED | Exit1, 6 failed / 2 passed; `/tmp/down-to-duck-04-02-boundary-red.log` |
| Task 1 exact focused gate | Session37307: build, `node --test tests/relay-tracer.mjs tests/relay-boundary.test.mjs`24/24, type-check; `/tmp/down-to-duck-04-02-task1-gate.log` |
| Task 2 focused continuity | 16/16; `/tmp/down-to-duck-04-02-continuity-green.log` |
| Final canonical gate | Session37530, exit0 on committed source `31d992c`; `/tmp/down-to-duck-04-02-final-gate.log` |

The final whole command was:

```sh
node --test tests/relay-boundary.test.mjs && pnpm test:phase1 && pnpm test:solo-parity && pnpm type-check && pnpm test:phase3 && node tests/strict-node-tests.mjs tests/relay-tracer.mjs tests/relay-boundary.test.mjs tests/session-recovery.test.mjs
```

It includes the exact Task 2 verification, the full Phase2/Phase3 regression chain, pinned solo parity21, solo regressions271, shared model73, recovery44, final Survive browser34, build/type/guidance/conformance and unchanged lockfile. Appended strict suites finish34/34: Relay tracer12, boundary/continuity16, shared recovery parity6. No skipped/todo tests in that appended group. Conformance remains5pass/0fail/5unmeasured; physical controllers remain unmeasured.

The built Relay tracer still passes fresh controller/lifecycle confirmation, setup2/3/4, cross-mode cancellation and40 responsive/theme captures with clipping/contrast assertions. Inspected compact light `/tmp/relay-handoff-240x240-light.png` and regular dark `/tmp/relay-handoff-900x600-dark.png` before the final gate. This plan adds no visual redesign.

## Deviations from Plan

**[Rule 3 - Blocking dependency, explicitly authorized] Shared recovery extraction.** Actual fatal-boundary reproduction proved that pure planning helpers did not supply a usable offer lifecycle to Relay. Root authorized extraction of the delivered transactions and the smallest shared safe-cell adjustment. Files: `src/session-recovery.ts`, `src/survive-together.ts`, `src/session.ts`, Relay consumer and parity tests. The existing44-case suite brackets extraction and both full repair/final phase3 gates pass. No cooperative market, item world, common-effect policy or results were moved into the service.

One authorized dependency deviation; no unrelated fixes, packages, lockfile changes, native controller polling, network/storage surface, protocol domains, publishing or merging. Threat mitigations T-04-04 through T-04-07 are covered by immutable latches, future-state comparisons, zero-credit meter tests and strictly future targets. No new threat surface or blocking stub was introduced.

## Remaining scope

Plan04-02 is complete, not the Relay phase or milestone. RELAY-02 remains partial until later lifecycle/rotation, full UI and phase verification. Plan04-03 owns death/disconnect/leave rotation;04-04 owns the immutable leg ledger/results;04-05 owns completed recovery/lifecycle UI. This plan records actual session death once and resolves personal recovery without inventing those later policies. Relay has no consumable/common-effect policy installed; tests preserve that absence, rather than claiming populated cooperative-item coverage. All four remaining Relay plans, Race, presentation, audit and release/PR remain required.

## Self-Check: PASSED

All six implementation/test commits and created files exist. Required verification is terminal green, no tracked file deletions or blocking placeholder patterns were found, and the lockfile/oracle remain unchanged. No executor command is active. Ready for04-03.
