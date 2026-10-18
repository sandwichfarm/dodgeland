---
phase: 04-relay
plan: 04
subsystem: gameplay
tags: [relay, immutable-results, ledger, competition-ranking, browser-tests]
status: complete
tasks_completed: 2
tasks_total: 2
requires:
  - phase: 04-03
    provides: Closed-roster lifecycle, original reclaim and shared personal recovery
provides:
  - Append-only contribution and lifecycle history captured before destructive transitions
  - One deeply frozen common Relay result with competition ties
  - Responsive podium, participant breakdown and ordered leg pages
requirements-completed: [RELAY-05]
affects: [04-05, 04-06, race, presentation]
tech-stack:
  added: []
  patterns: [immutable observation hooks, generation-bound ledger writes, frozen result views]
key-files:
  created: [src/relay-results.ts, tests/relay-results.test.mjs]
  modified: [src/game.ts, src/session.ts, src/relay.ts, src/relay-ui.ts, src/main.ts, src/session-ui.css, tests/relay-lifecycle.test.mjs]
key-decisions:
  - Record death credit before inventory clear; keep the leg open while its personal revival remains unresolved.
  - Select the next runner immediately after dropout, but open their leg only after fresh incoming confirmation.
  - Record an unconfirmed incoming seat's skip as a participant event without inventing an unopened leg.
  - Project results only from immutable history and frozen roster state, with competition ranking by earned distance.
duration: 31 min
completed: 2026-10-15
coverage:
  - id: D1
    description: Authoritative contribution history survives death, skip, departure and recovery
    requirement: RELAY-05
    verification:
      - kind: integration
        ref: tests/relay-results.test.mjs
        status: pass
    human_judgment: false
  - id: D2
    description: Frozen result navigation, tied podium and responsive participant/leg views
    requirement: RELAY-05
    verification:
      - kind: automated_ui
        ref: tests/relay-results.test.mjs
        status: pass
    human_judgment: true
    rationale: Actual captures were visually inspected in addition to automated bounds, hit-target and contrast checks.
  - id: D3
    description: Solo and existing multiplayer behavior remain preserved
    verification:
      - kind: integration
        ref: pnpm test:phase3
        status: pass
    human_judgment: false
---

# Phase 04 Plan 04: Immutable Relay contributions and results Summary

Relay records authoritative contribution before mutable state is cleared, retains one leg through personal revival, and presents one frozen shared result with fair tied ranks and inspectable participant/leg history.

## Execution and API reconciliation

Generic executor fallback applied the local GSD executor role and execute-plan workflow using the inherited default model. Typed dispatch had remained pending_init and was canceled; no typed-agent guarantee is claimed. Existing napplet skills and repository boundaries were followed. The session's no-install instruction overrides the template's install step.

Accepted unchanged entry evidence was source `f673e4f`, summary/tracking `184c6c9`, and canonical session37049 exit0, `/tmp/down-to-duck-04-03-final-complete-gate.log`. No gratuitous entry rerun was performed. Graph-first queries for `Users-sandwich-Develop-crossy-road-clone` supplied available results; incomplete symbol matches were reconciled against actual source before production changes.

| Responsibility | Actual contract and decision |
|---|---|
| Common result | `SessionResult` supplies mode/outcome; `LocalSession.completeResult` freezes terminal session authority. `RelayResult` extends that contract with copied course metadata, contributions, events, ordered legs and podium. `host.seedCode` is nullable. No second session result owner was introduced. |
| Coins and pickups | `Game.awardCoins` credits the actual integer amount and increments cumulative coins; fractional wallet remainder is separate. `SharedWorld.resolvePickups` resolves the actual claim and increments pickup statistics. The ledger observes these production counters, not guessed pickup values or final wallet contents. |
| Destructive death | Existing `Game.end` reaches dead state before clearing inventory. Optional immutable `beforeDeath` observation runs there; `finally` preserves clear/onEnd/terminal delivery if an observer throws. Reentrant death is already inert. The payload copies identity, counters, wallet, time/frontier and position. Solo/default handlers remain optional. |
| Departure | Optional `beforeDepart` receives the immutable observation before participation changes. A same-seat guard rejects reentrant departure. Relay captures and closes the leg before the existing archive/disable transaction. |
| Personal recovery | Delivered `SessionRecoveryController` remains the sole recovery implementation. Pre-clear death credit is permanent, but the current leg remains open until decline/expiry/departure. Accepted personal revival adds a revive credit to that same leg, never another leg. |
| Clock | Leg duration uses the delivered scaled active world clock. Handoff, waiting, pause and unresolved recovery time do not accrue leg time. The eight-active-second offer uses the existing world-time scale, rather than assuming eight raw world seconds. |
| Fresh turn start | Existing handoff state and generation/lifecycle tickets are reused after resolved death, skip and leave. Selection and safe placement happen immediately; simulation and the incoming leg open only after fresh confirmation. Reclaim and accepted revival resume the existing turn. |
| Ledger authority | Stable seat/participant/character identity, event ID, leg and lifecycle generation gate append-only writes. Duplicate, stale, wrong-owner, closed, invalid and terminal writes return typed rejection. An accepted skip before confirmation records a participant event with leg0; it creates no leg or distance/time credit. |
| Presentation | `createRelayResults` accepts only `RelayResult` and the existing reset callback. It cannot read mutable players. View state pages podium tiers, participant fields and legs; wide frames place podium beside details. Dispose restores inert siblings and removes resize handling, including pagehide cleanup. |

## Delivered behavior

- Each opened leg closes once as Handed off, Dead, Skipped, Left or Ended, retaining settled frontier/position, earned distance, active duration, coins, pickups, self revives and deaths.
- Immutable pre-clear death events retain wallet/cause and contribution. Actual accepted revival remains in the same leg; decline/expiry closes Dead; explicit departure remains Left without a second death or asset transaction.
- Participant totals survive mutable clear and departure. Final lifecycle is retained separately, including unreclaimed Disconnected. Skips derive from accepted participant events, including skips before a leg opens.
- Terminal completion/no-runner settlement produces one cached, deeply frozen common result. Late actions, controller activity, navigation, resize and Hop again cannot change the old result or regenerate its world.
- Actual production hop matrices20/20/10,30/20/20/5 and7/7/7 produce =1/=1/3,1/=2/=2/4 and =1/=1/=1. Roster order only arranges members within a shared rank tier.
- Built opaque iframe controls expose `Relay results`, shared distance/time/outcome, marker/P-number/character, lifecycle and all participant/leg metrics. Original controller fresh input navigates results; held input does not repeat. Hop again uses the existing new-run path.

## Commits and RED/GREEN evidence

1. `bbcc7d4` — Retained initial RED for missing immutable leg history and pre-clear contribution capture.
2. `981dd8d` — Production result/tie/browser matrices and retained RED for a selected-but-unconfirmed skip losing participant credit.
3. `d527c95` — Task1 ledger, immutable shared observations, recovery/confirmation reconciliation and roster skip events.
4. `2ce6edf` — Task2 frozen result renderer, input/reset/dispose integration, responsive tiers and updated visible lifecycle expectations; final source.

Initial RED: `/tmp/down-to-duck-04-04-ledger-red.log`. Unopened-skip RED: `/tmp/down-to-duck-04-04-unopened-skip-red.log`. The initial death assertion was reconciled to capture the immutable death event before clear while deferring leg closure until recovery resolves, as explicitly authorized by the orchestrator.

Intermediate fixture corrections used the actual rounded wallet amount, Game's existing secondary operation adapter and host pause/resume API, and the authored world-time scale. They are not claimed as product defects. The four-distinct-rank UI test found the lowest tier overlapping navigation at900×600; horizontal tiers with compact spacing fixed it. Earlier target logs are superseded by final validation. A temporary duplicate local identifier failed build and was corrected before the final source was committed.

## Verification

Canonical session **93254 reached exit0** on committed source `2ce6edf`. Whole-command durable log: `/tmp/down-to-duck-04-04-final-gate.log`.

```sh
node --test tests/relay-boundary.test.mjs tests/relay-lifecycle.test.mjs tests/relay-results.test.mjs && pnpm type-check && node --test tests/relay-results.test.mjs && pnpm type-check && pnpm test:phase3 && node tests/strict-node-tests.mjs tests/relay-tracer.mjs tests/relay-boundary.test.mjs tests/relay-lifecycle.test.mjs tests/relay-results.test.mjs tests/session-recovery.test.mjs
```

- Exact Task1 **53/53** plus type-check; exact Task2 **15/15** plus type-check.
- Full inherited Phase2/Phase3 chain: pinned solo parity21, solo regressions271, shared models73, recovery44, final Survive browser group34, all configured runtime/layout/economy/item/death checks, build/type/guidance and unchanged-lockfile gates.
- Final strict Relay/recovery **71/71**, zero failures/skips/todos: tracer12, boundary16, lifecycle22, results15, shared recovery6.
- Conformance **5 passed / 0 failed / 5 unmeasured**, not ten passes. Physical controller hardware remains unmeasured; actual shell snapshot/browser routing is measured.
- Final focused target session37540 also reached exit0: build, Task1 53/53 and type-check, `/tmp/down-to-duck-04-04-complete-target-final.log`. Earlier reviewed layout session94216 passed14/14 before the last skip regression was added.

There are34 result captures: `/tmp/relay-results-{podium,players,legs}-{width}x{height}-{dark,light}.png` for240×240,320×560,900×600,1000×280,2400×1200; two200×160 minimum notices; `/tmp/relay-results-four-way-tier.png` and `/tmp/relay-results-four-ranks.png`. Actual captures representing every view, both themes and every frame class were inspected before canonical validation. Final four-rank900×600 capture confirms the formerly crowded lowest tier stays above navigation. Automated assertions cover viewport/text bounds,44px controls, hit visibility, contrast≥4.5:1, frozen records, retained scene and fresh input. Updated lifecycle tests also regenerate their existing74 captures.

## Deviations and boundaries

**Rule2, necessary shared observation seam:** Actual death callbacks occurred after inventory clear. Added optional immutable pre-clear/pre-depart observations instead of duplicating death/economy logic or reconstructing wallet data afterward. Full inherited parity and explicit reentrancy/exception tests pass.

**Authorized D-10 reconciliation:** Plan04-03's immediate selection after resolved dropout remains, but newly selected turns now require fresh start confirmation. Original-seat reclaim and accepted revival resume the same turn. Death credit precedes clear while leg closure awaits the existing offer decision. This preserves both the recovery contract and one close per actual opened leg.

**Rule1, unopened skip credit:** A selected but unconfirmed runner can be skipped without opening a leg. The retained RED proved that participant skip credit was missing; an append-only roster event now supplies the aggregate without phantom legs.

No dependencies, lockfile changes, new protocol/network/storage authority, native polling, product test hooks, publication or merge. Threats T-04-12/13/14 are addressed by authoritative immutable observations, typed ledger rejection, one frozen snapshot and earned-distance-only competition ranks. No blocking stub or additional security surface was introduced. Historical WINDOWS entry1 remains open for the later evidence audit; it was not silently waived.

GSD SDK updated the roadmap to4/6 and marked RELAY-05 complete. Its advance/progress handlers could not parse the custom STATE layout, and metric/session writes inferred1 verified phase/35 plans; those counters were corrected to3 independently verified phases/31 plans,22 completed, with04-05 next. WINDOWS entry3 records the observation-seam deviation and is fixed by the canonical gate; entry1 remains unchanged and open.

## Remaining scope

Plan04-04 and RELAY-05 are complete; the Relay phase and milestone are not. Continue04-05 active-owner hand/market integration and04-06 full mode/visual verification. RELAY-02/03/04 remain open pending remaining integration and independent phase verification. Race, cross-mode presentation, audit and release/PR remain mandatory. Immutable oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5` and preview5175 remain untouched.

## Self-Check: PASSED

All four test/implementation commits, created/modified files, canonical log and representative capture artifacts exist. All required gates reached terminal success on the final source. No blocking placeholder or tracked deletion was found; no executor build/browser/test process remains active.
