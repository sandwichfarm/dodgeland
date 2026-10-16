---
phase: 05-race
plan: 07
status: complete
subsystem: race-presentation-validation
requires: [05-06]
provides: [responsive Race matrix, exact inherited and Race gates]
affects: [independent Race verification]
requirements-addressed: [ARCH-02, ITEM-06, RACE-01, RACE-02, RACE-03, RACE-04, RACE-05, RACE-06, UI-06]
key-files:
  created: [tests/race-layout.mjs, tests/race-browser-fixture.mjs]
  modified: [src/race-ui.ts, src/race-ui.css, src/main.ts, src/run-hand.ts, src/market-ui.ts, tests/race-runtime.mjs]
completed: 2026-10-16
---

# Phase 05 Plan 07: Responsive Race and final gates

Both tasks are complete on frozen source `62f9958`. Execution used the authorized generic executor fallback applying the GSD workflow, without claiming typed-agent guarantees. Phase completion remains for independent review/verification.

## Entry and API reconciliation

Accepted unchanged-source entry was 38749 plus 35065's passing prefix and 48236, production `2a2bf9a`, tracer `3b971e9`, tracking `4b76688`. No redundant baseline ran.

| Responsibility | Actual retained contract |
| --- | --- |
| Setup/HUD/results | `createRaceSetup`, `renderRaceHud`, `createRaceResultsBoard` project existing authority; results use the same frozen snapshot. |
| Target/owner | `openRaceItem` retains captured `RaceItems.plan/commit`; new paging invokes the existing choice callbacks. No new item authority. |
| Shared shelf/market | Existing optional gear descriptors retain one owner tree. Necessary narrow seams shorten compact labels and re-render them on resize; market availability text is bounded. |
| Lifecycle/motion | Existing inspection modal, recovery buttons, focus manager, minimum-size suspension, theme adapter and system/app reduced-motion preferences remain authoritative. |
| Built evidence | Reusable real-input helpers extracted from Race runtime into `race-browser-fixture.mjs`; opaque iframe, public seed intent, authorized SDK snapshots and read-only observations only. |

## Changes and evidence

Commits: `84cf021` initial retained layout RED; `214c419` initial bounded setup/HUD; `801519a` expanded actual-state matrix and repeated-announcement RED; `42d4764` lifecycle/owner/target/four-role typography fixes; `62f9958` four-distinct podium spacing repair.

Race now has bounded Rules/roster/settings, short-frame target paging with radio semantics, readable owner gear/wardrobe, compact recovery actions, and four allowed type roles. Unchanged lifecycle text no longer repeatedly mutates its live region. A DOM Range check catches clipped availability text inside item tiles, alongside control/content bounds, hit testing, focus trapping including explicitly owned shelf controls, dialog semantics, exact minimum notice and authoritative resize-state preservation.

The matrix reaches **35 real states × six frames × two themes = 420 captures**. It includes real fog health loss, four same-tick finishers and four distinct participant identities, collection/use/stale/no-target/active-Lantern states, owner switching, disconnect/reclaim/waiting, actual death/personal revival, grace/leave DNF and system/app reduced motion. Existing runtime covers the successive uninterrupted Race-again journey and additional protected/out-of-range target branches. Existing result tests retain three/four-way ties and four distinct finishers across frames. No private world, wallet, position or lifecycle injection is used.

Inspected both `artifacts/race-layout/contact-dark.png` and `contact-light.png`, report `report.json`, and full-size regular four-racer HUD, compact target/gear/reclaim/recovery, short wardrobe/tied podium, wide participant detail and DNF captures. Final recovery/availability captures show complete reachable controls/text. Inspected corrected four-distinct podium images at `/tmp/race-05-05-tiers-4-distinct-{900x600-dark,320x560-light,1000x280-light}-*.png`. Visual verdict: bounded controls/content, readable identities and tiers, one retained course/owner tree; no matrix findings.

## Terminal gates

- **45358 exit 0**, `/tmp/down-to-duck-05-07-task1-closed.log`: exact Task 1 build → layout **2/2**, 420 captures/zero findings → type-check.
- **28472 exit 0**, `/tmp/down-to-duck-05-07-podium-repair.log`: build and retained podium cases **3/3**, including four distinct finishers.
- **19289 exit 0**: exact conditional Relay Gate 6 followed by exact Race Gate 7, on final `62f9958`. Scripts `/tmp/down-to-duck-05-07-final-{relay,race}.sh`; complete logs `/tmp/down-to-duck-05-07-verified-{relay,race}.log`.
  - Each required inherited `pnpm test:phase3` passed its complete Phase 2/1 prefix, immutable solo **21/21**, solo regression **272/272**, session groups and Survive browser **34/34**.
  - Relay models **65/65**, runtime **12/12**, layout **1/1 / 252 captures**.
  - Race models/browser **76/76**, runtime **12/12**, layout **2/2 / 420 captures**.
  - Type/build/guidance, conformance and immutable-oracle lockfile diff passed in both exact gates.

Earlier matrix runs are superseded, not acceptance passes: 83123/17031 typography/bounds; 52085/26887/78479 target/owner/result defects; 35427 lifecycle heading; 56731/87652 fixture focus/selector corrections; 36656/92244/52462 compact recovery overflow. The retained live-announcement RED failed before its conditional update. **8659 exit 1** fully passed Relay but Race passed **75/76**: required typography exposed 4px overflow in the existing four-distinct podium test. The scoped 16→8px regular podium gap fixed it; 19289 reran both exact gates successfully. Logs retain all failures honestly.

## Requirement audit and limits

| Requirements | Current production evidence |
| --- | --- |
| ARCH-02, RACE-01 | Executable authoring/handler example, tracer setup/world-once/configuration/closed-roster tests; built start/retry and setup matrix. |
| RACE-02 | Ordering and balance suites, real fog-line/exposure/landed-loss captures; `artifacts/race/balance.json` deterministic default 500/180, buffer12, one feather/second. |
| RACE-03, UI-06 | Runtime camera/edge/fog/audio/mute and motion assertions, 420-capture layout, delivered Relay feedback gates. |
| RACE-04 | Production ordering/lifecycle/recovery suites and actual-input mixed journey through reclaim, waiting, timeout, death, revival, grace and departure. |
| ITEM-06, RACE-05 | Common item/sampler/atomic transaction suites plus real collection, market200 purchase, use and protected/stale/out-of-range/no-waste runtime proof. |
| RACE-06 | Immutable ledger/ranking/results suite, actual terminal journeys, tie/distinct podiums and every participant's bounded details. |

Captured versions remain `race-pressure-1`, `race-item-schema-1`, course schema3 and existing validated settings. Original oracle remains `a310a81ed6c76df4b265c9012c23b8c83f4802e5`; lockfile unchanged. Conformance is **5 pass / 0 fail / 5 unmeasured**; physical controllers remain unmeasured, with authorized injected SDK evidence distinguished. Every browser used `--mute-audio`; audio graph checks remain real. Boundary reports show no page errors/external requests/native polling/direct browser storage/network. Existing >500kB build warning remains. No installs, dependencies, oracle repin or preview5175 changes.

Self-check: source/test commits, terminal logs and artifacts exist; no executor process remains. Actual plan progress is **31/31**, with **four independently completed phases**. Independent Race review/verification, cross-mode audit and PR work remain; this summary does not mark the phase or milestone complete.
