# 05-03 dependency checkpoint

Status: incomplete; neither task is accepted. Generic executor fallback applies the GSD executor workflow. No production files changed. Entry proof remains final session96373, exit0, `/tmp/down-to-duck-05-02-final-gate.log`, on unchanged production8f59d42; HEAD15e5c1e additionally contained the accepted test-only balance and documentation commits.

## Retained production RED

Commit `dca48e0`, `tests/race-lifecycle.test.mjs`. Exact command: `node --test tests/race-lifecycle.test.mjs > /tmp/down-to-duck-05-03-dependency-red.log 2>&1`. Immediate terminal result exit1, tool chunk `6aebfb`; no continuing process. Two tests: living-device control passes, dead-device regression fails.

On the generated seed113 course, the delivered `Game.end(..., 'train')` and ordinary session tick execute one actual owner death, empty its17-coin wallet and open recovery offer generation1/deadline8. Calling `session.deviceLost('p1')` returns false, leaves no device-loss event, and retains device `gamepad-0`. No terrain/health/participation/recovery/clock injection is involved. The required dead-seat device reservation must preserve dead participation and the existing offer rather than perform recovery or lose device authority.

## Actual API reconciliation

| Responsibility | Current API | Consequence / smallest repair |
| --- | --- | --- |
| Device loss | `LocalSession.deviceLost` accepts only participation `active`, changes it to `device-lost`, then emits a mode event. | A dead racer with a pending offer cannot publish absence through this shared lifecycle. Add opt-in generic disconnected-device tracking for retained dead participants, preserving legacy defaults and dead participation. |
| Device rebind | `LocalSession.reclaim` requires participation `device-lost` and unconditionally sets `active`; it owns device uniqueness, private `addRecoveryDeviceAlias`, lost-duration accounting and event emission. | Provide a validated generic rebind transaction that can retain a dead participant's state and offer, update the same recovery alias, and emit once. Race must not copy these mutations or fake `device-lost` participation to enter the existing branch. |
| Delivered Relay workaround | `RelayCoordinator.disconnect/reclaim` tracks connection in a private map; its dead reclaim only flips that map, because it permits exactly the original device. | Preserve existing Relay behavior. This original-device workaround does not deliver replacement-device rebind/provenance for Race. |
| Living safe placement | Public `isSafeCell`, `placeTurnPosition`, `cancelForwardHop`; legacy private `safePlacement` anchors near the leader. | Public safety/placement primitives can support Race's bounded no-ahead policy. Do not invent an additional dependency for this: validate a bounded safe cell before the reclaim transaction; preserve earned counters and timers. |
| Recovery | `SessionRecoveryController` supplies actual death offers, expiry, personal transaction and protection. | Reuse unchanged. A device rebind must not call `recover` or refresh its eight-second offer/two-second protection. |
| Router | Current leases validate index/id/epoch and remembered same-device reclaim only. | The planned generic router extension belongs to05-03, with explicit reserved-seat selection, fresh neutral/context validation, and consumed input; not a separate unexpected dependency. |

Root's dispatch requires a concrete RED checkpoint for missing shared responsibility. The smallest repair is an optional generic device-lifecycle/rebind seam in `session.ts` and its validated handler contract as necessary, with existing active-device behavior default unchanged. Prove active/dead receiver isolation, wrong/stale identity rejection, no recovery/health/economy mutation, exactly-once lost-duration/event handling, and delivered Relay/input/recovery parity. Then resume both05-03 tasks, including grace/waiting/leave, all personal recovery thresholds and built visible input evidence.

All05-03 exact task/final gates remain outstanding because implementation has not begun. No completion SUMMARY, plan advancement or requirement completion is claimed. No install, lockfile/oracle change, browser, preview, or live command remains.
