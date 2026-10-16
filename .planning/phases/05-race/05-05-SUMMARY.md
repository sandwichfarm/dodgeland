---
phase: 05-race
plan: 05
status: complete
subsystem: race-results
tags: [immutable-results, contribution-history, competition-ranks, podium]
requires: [05-03, 05-04]
provides: [authoritative interaction history, frozen Race results, paged participant breakdown]
affects: [05-06, 05-07]
requirements-addressed: [RACE-04, RACE-06]
tech-stack:
  added: []
  patterns: [successful-transaction observations, copied append-only ledger, pure competition ranking]
key-files:
  created: [src/race-results.ts, tests/race-results.test.mjs]
  modified: [src/session.ts, src/game.ts, src/co-op-market.ts, src/race.ts, src/race-ui.ts, src/race-ui.css]
completed: 2026-10-16
---

# Phase05 Plan05: Frozen Race results

Both tasks are complete on final source `8d0c595`. Every locked participant retains copied lifecycle, economy, recovery, fog and per-item contributions; terminal results freeze once, rank true ties together and keep DNF reasons unranked. The built results board reads frozen records, groups tied racers in one visual tier and exposes all20 metrics through bounded pages. Execution used the authorized generic executor fallback, not a typed GSD agent. Full Race and phase completion remain pending05-06/07 and independent verification.

## Entry and API reconciliation

Accepted51478 on unchanged production69efa16 supplied entry evidence. Graph-first discovery and actual source reads preceded the retained missing-statistics RED; parent authorized the narrow shared repair. See05-05-DEPENDENCY-CHECKPOINT.md and05-05-DEPENDENCY-REPAIR.md.

| Responsibility | Actual API / reconciliation |
| --- | --- |
| Successful economy | `CoOpMarketHost.coOpMarketCommitted` observes only accepted adapter commits after existing authority/replay checks. Immutable typed assets come from the validated offer/card/draft/equip action, never extraneous request IDs. Failed/replayed actions append nothing. |
| Persistent contributions | `SessionPlayer.recordInteraction` owns copied stable participant/action/generation/tick/active-time records and counters. Successful innate, collection and common item-use transactions record at their authoritative commit sites; purchases remain distinct from world pickups. |
| Destructive transitions | Race captures existing participant statistics and immutable interactions in pre-death/pre-departure hooks before inventory clearing, then snapshots resolved lifecycle transitions. Personal recovery preserves prior death credit. |
| Ledger/result | `createRaceLedger` rejects duplicate, stale, invalid, wrong-owner and postterminal events. `rankRaceParticipants` projects finish ticks, timeout distance and DNF groups without identity bias. `freezeRaceResult` copies/deep-freezes once over the common result descriptor. |
| Presentation | `createRaceResultsBoard` consumes only frozen records. True rank/DNF groups, participant pages, semantic resize selection and existing new-run callback retain prior results unchanged. Scoped race-ui.css is a necessary layout seam. |

Captured fields include settings/course/item schema, terminal tick/time/reason/frontier/fog boundary; participant identity/generation/lifecycle, distance/finish time, deaths/revives/innate uses, fog attempted/landed/exposure, Mud collected/used/received, Lantern collected/used, pickups/coins/wallet, market purchases/interactions/spend and ghost duration. Stable target generations are copied with item uses.

## Commits and reconciliations

- `364ec1d`, `ff84973`: retained shared statistics RED and dependency checkpoint.
- `a3b5b14`, `9bd0e88`: authorized successful-transaction history repair and API evidence.
- `b9f3d95`, `78cbba3`: real-run ledger/rank RED and coupled Task1/result-model implementation.
- `4df275b`, `3ffe83f`, `c816c44`: built paging/resize regressions and complete initial results UI.
- `49644df`, `bdb1a36`: adversarial actual-market metadata regression and accepted-asset repair, including buy/sale/equip/pack/open/close.
- `daf39f1`, `8d0c595`: actual-input3/4-way ties and four-distinct podium RED, grouped bounded tiers and final layout.

The initial ledger recovery fixture placed revival after unsafe fog pressure; it was corrected to exercise accepted recovery before pressure rather than weaken production safety. Source review found extraneous request IDs could contaminate accepted market observations; the retained real-transaction test fixed that metadata responsibility. Visual review exposed resize changing inspected participant and flat/four-row podium layouts; semantic page preservation and grouped two-column tiers fix those concrete gaps. No new dependencies, lockfile changes, oracle repin, native polling, direct networking/storage, product hooks or preview5175 changes.

## Terminal verification

Evidence intentionally combines a complete shared-code gate and the affected final UI gate:

- **39500 exit0**, `/tmp/down-to-duck-05-05-final-complete-gate.log`, script `/tmp/down-to-duck-05-05-final-gate.sh`, source bdb1a36: exact Task1 selected11/11 plus lifecycle/items34/34; exact Task2 result/order/lifecycle48/48; full `pnpm test:phase3` including immutable solo21, solo regressions272, shared73, recovery44, Survive browser34 and nested Phase2/1; strict Relay/Race84/84 plus balance6; type/build/guidance/conformance/lockfile.
- **32571 exit0**, `/tmp/down-to-duck-05-05-final-ui-gate.log`, script of the same stem, final8d0c595: final result/order/lifecycle **51/51**, Race tracer **6/6**, type/build/guidance/conformance and immutable-oracle lockfile diff. Only Race UI/CSS and its tests changed after39500; shared code evidence remains unchanged.
- Shared focused parity55767 passed solo21 plus Relay31; successful-transaction focused59 and metadata parity52 passed. Metadata51748 passed selected assertions/type; `/tmp/down-to-duck-05-05-metadata-{red,green,parity}.log` records the adversarial repair.
- Tier RED91087 exited1 at missing visual groups after correct actual rank vectors. Final focused10327 exited0 (3/3), `/tmp/down-to-duck-05-05-tiers-green3.log`.

Superseded21295 was deliberately canceled (terminal143) for the shared metadata defect; `/tmp/down-to-duck-05-05-final-gate.log` is not a full-pass claim. Earlier layout attempts71298/2985 failed bounded-body assertions; geometry diagnostic81484 identified a four-pixel compact overflow, fixed before final acceptance. No processes remain active.

Conformance reports **5 pass / 0 fail / 5 unmeasured**, not10 passes. Hardware controllers remain unmeasured; controller evidence uses actual injected SDK snapshots. The build retains its existing >500kB chunk warning.

## Inspected built evidence

Real production controls create finish, timeout and explicit-left results in the muted built opaque iframe. Keyboard/controller inputs produce3/4-player same-tick ties and four distinct finish ticks without private browser state injection. Model fixtures separately prove remaining terminal reasons, actual death/recovery, exact item/fog history, prescribed competition ranks and24 presentation-order permutations.

Inspected all36 base and42 tier representative captures: `/tmp/race-05-05-final-contact.png` (list `/tmp/race-05-05-captures.txt`) and `/tmp/race-05-05-tiers-contact.png`. Individual captures use `/tmp/race-05-05-results-*`, `tiny-*`, `{time,left}-*`, and `tiers-*`. Frames include200×160 minimum notice,240×240,320×560,900×600,1000×280 and2400×1200, both runtime themes. Tests check bounded content,44px controls, hit-testing on grouped podiums, contrast, keyboard paging, focus containment, selected-participant preservation and frozen prior results across resize/pages/retry. Page errors, external requests and forbidden browser APIs remain absent.

## Remaining scope

RACE-04/RACE-06 receive results evidence here but remain open until the later integration/presentation plans and independent verification establish their complete contracts. Owner gear UI, broader Race runtime/layout, final cross-mode audit and PR remain mandatory.

## Self-Check: PASSED

Created result/test files, all listed commits, terminal logs and contact sheets exist. Final tracked source is committed; only summary/tracking closeout follows.
