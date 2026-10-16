---
phase: 05-race
plan: 02
status: complete
subsystem: race
tags: [fog, fixed-step, health, balance]
requires: [05-01]
provides: [monotonic earned fog, named health damage, deterministic terminal ordering, default balance evidence]
affects: [05-03, 05-04, 05-05, 05-06, 05-07]
tech-stack:
  added: []
  patterns: [optional pursuit policy, shared damage transaction, immutable movement observations]
key-files:
  created: [tests/race-ordering.test.mjs, tests/race-balance.test.mjs, tests/session-damage.test.mjs]
  modified: [src/race.ts, src/game.ts, src/session.ts, src/render.ts, src/main.ts]
completed: 2026-10-16
duration: 52 min
---

# Phase 05 Plan 02: Deterministic fog, terminal ordering and measured defaults

Race now retains genuine earned movement across lifecycle exclusion, damages actual-ground trailers at fixed cadence, settles finish/recovery/timeout deterministically, and completes default generated courses under reproducible legal-input profiles. All three tasks are complete. Execution used the authorized generic executor fallback and safe-refactor workflow; this is not full Race or milestone completion.

## Entry and dependency reconciliation

Entry production source was `67eb0d3`. The accepted unchanged-source gates `70346` and test-only `23683` supplied the fresh baseline; no gratuitous entry rerun occurred. Graph-first inspection and actual production reproduction found two missing shared responsibilities. The retained checkpoint is `05-02-DEPENDENCY-CHECKPOINT.md`; the authorized repair and its initial evidence are in `05-02-DEPENDENCY-REPAIR.md`.

| Responsibility | Actual delivered/repaired API |
| --- | --- |
| Genuine movement | `SessionPlayer.earnedDistance` retains accepted new movement through death; `completedForwardTiles` remains the surviving settled-hop finish/250-credit source. Forced spatial placement is neither. |
| Pursuit replacement | Validated optional `SessionModeHandlers.suppressPursuit` and `Game.pursuitEnabled`; same world, unchanged legacy defaults, consistent advancement/collision/safety/recovery/presentation gates. |
| Health | `LocalSession.damage(seat, request)` validates identity/lifecycle/authority and invokes the stable player receiver. Shared `Game.applyDamage` preserves traffic recoil/callback ordering, immunity, fatal innate rescue and death; returns actual landed loss. Fog is an explicit cause. |
| Recovery/clock | Existing `SessionRecoveryController` and shared world time; no copied recovery algorithm, personal economy, router or RNG. Timeout clears offers before finalization and appends immutable `race-timeout` closure records. |
| Race policy | `movementLedger`, `leaderFrontier`, `fogBoundary`, `fogState`, `finishTick`, `recoveryClosures`; immutable observations and state snapshots. `protectFog` is the defensive-effect policy seam for the later item transaction. |

## Tasks and commits

| Task | Implementation and retained evidence |
| --- | --- |
| 1. Earned frontier, strict actual-ground fog and health cadence | RED `e34188e`, `4ffccb7`, `fa66f85`, `948eb23`; shared repair `5bfebbb`, fixed-step immunity correction `8847ada`, coordinator `8f59d42`. Exiting fog/protection resets exposure; ghost exposure freezes until reclaim. |
| 2. Fatal/finish/recovery/timeout precedence | RED `b543e91`; coordinator `8f59d42` atomically contains the coupled post-settlement ordering. Living same-tick finishers tie; first finish leaves other racers running; offers keep all-down ticks alive and resolve before terminal freeze. |
| 3. Default production-object balance | `6d36f39`; generated schema-3 courses, legal seat dispatch, actual health/death/recovery, no terrain/position/progress injection. Model hazard arenas are separately labelled in ordering tests. |

The two coupled coordinator tasks share one production commit; their exact declared verification commands ran separately. Additional checkpoint/tracking commit: `41ff15e`.

## Final verification

Frozen HEAD `6d36f39` (production `8f59d42`), command **96373**, terminal **exit 0**. Whole-command durable log: `/tmp/down-to-duck-05-02-final-gate.log`. No source/test edits occurred during this command.

Executed in order:

1. Exact Task 1 selected ordering command, **11/11**, then `pnpm test:solo-parity`, **21/21** against immutable `a310a81ed6c76df4b265c9012c23b8c83f4802e5`.
2. Exact Task 2 selected ordering command, **8/8**.
3. `node --test tests/race-ordering.test.mjs tests/race-balance.test.mjs && pnpm type-check`, **17/17**.
4. Full `pnpm test:phase3`, including nested Phase 2/1, solo parity **21/21**, solo regressions **272/272**, renderer **19/19**, shared models **73/73**, recovery **44/44**, built Survive checks **34/34**, and all intervening model/browser gates.
5. `node --test tests/session-damage.test.mjs tests/relay-tracer.mjs tests/relay-boundary.test.mjs tests/relay-lifecycle.test.mjs tests/relay-results.test.mjs`, **69/69**.
6. `node --test tests/race-tracer.mjs`, **6/6**, including muted built opaque-iframe mixed-input 2/3/4-seat flows and retry.
7. Final type-check/build/guidance/conformance and immutable-oracle lockfile diff. Guidance **6/6**; conformance **5 pass, 0 fail, 5 unmeasured**, not ten passes.

Final captures were refreshed by the built tracer; inspected `/tmp/down-to-duck-05-01-setup-240x240-dark.png`, `...setup-900x600-light.png`, and `...race-result.png`. Setup controls remain visible and the terminal scene remains behind the result board. Full fog/item/camera presentation is assigned to later Race plans.

## Measured default balance

Report: `artifacts/race/balance.json` (ignored generated evidence), `race-balance-1`, captured `race-pressure-1`: finish **500**, limit **180 active seconds**, buffer **12**, damage **1 feather per 1 continuous second**. Every scenario is repeated and rerun with reversed actual roster iteration; all per-profile measurements match exactly.

| Seed | Seats | Completion seconds | Actual backtracker backward inputs |
| --- | --- | --- | --- |
| 113 | 2 | 97.47 | n/a |
| 121 | 2 | 102.00 | n/a |
| 113 | 3 | 101.23 | 10 |
| 121 | 3 | 102.00 | 6 |
| 113 | 4 | 101.74 | 9 |
| 121 | 4 | 102.00 | 4 |

Every leader finishes, every scenario exercises personal recovery, and delayed/backtracking profiles receive real fog pressure. The four-seat seed-113 recovery profile also finishes. Attempts and actual landed loss are independently retained; focused tests exercise immunity-blocked attempts. Defaults remain unchanged: measured completion leaves roughly 78–83 seconds of the active limit. This is deterministic simulation evidence, not a human usability study or physical-controller measurement.

## Deviations and evidence history

- Authorized narrow shared repair widened scope to game/session/render and the existing main death-audio dispatch. No Race-ID branch was added to shared engines. Fog death reuses the existing trail sound cue; later Race feedback remains planned.
- `948eb23` proved that a sub-nanosecond hurt-timer residue suppressed an exact-interval hit and that ghosting erased accumulated exposure. `8847ada` gives the shared named transaction a fixed-step tolerance while legacy traffic retains its original earlier exact gate; inactive Race exposure now freezes.
- Initial command `6901` passed focused80/80, solo21/21 and type-check, but only its last type-check was redirected. The repair document records that logging limitation. Final96373 supplies durable full parity evidence.
- Intermediate49711 was explicitly terminated **143**, with partial selected9/9 evidence, before the reviewed fixes. Its `/tmp/down-to-duck-05-02-tasks12.log` is superseded. Retained cadence RED7947 exited1 with two expected failures; expanded green64813 exited0 with21/21 and type-check; final-review83059 exited0 with3/3 and type-check.
- WINDOWS5 records the verified shared repair as fixed; historical WINDOWS1 remains visibly fixed by its prior independent evidence.

## Remaining scope

No blocking stub or unrun declared verification remains for this plan. RACE-02 and RACE-04 stay partial pending their later integration/independent evidence. Replacement-device grace/reclaim and complete lifecycle UI, Race item acquisition/transactions, full immutable ranked results, camera/HUD/feedback/owner integration, and the responsive matrix remain in 05-03 through 05-07. Physical controllers and the five conformance evidence categories remain unmeasured. No install, lockfile/oracle change, direct network/storage/native polling, product test hook, publication or preview5175 operation occurred.

## Self-Check: PASSED

Owned source/tests and referenced commits exist; final96373 is terminal success; the balance report and inspected captures exist. No owned build/browser/test process remains active. Phase completion is reserved for independent verification.
