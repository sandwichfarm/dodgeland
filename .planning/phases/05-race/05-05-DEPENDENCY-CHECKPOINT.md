# 05-05 dependency checkpoint: authoritative interaction history

Generic default-agent executor fallback; not typed-agent execution. Neither task nor plan is complete.

Entry source `69efa16` (documentation HEAD `655d373`) retains accepted terminal full gate 51478, `/tmp/down-to-duck-05-04-final-gate.log`. No production edit or redundant baseline run occurred.

## Actual API reconciliation

| Delivered API | Result responsibility / gap |
|---|---|
| `SessionPlayer.statistics` | Persistent distance, coins, pickups, deaths, recovery, total items and disconnect duration; no market purchase/interaction or innate-use history. |
| `LocalSession.contributionObservation`, `beforeDeath`, `beforeDepart` | Observer-only pre-clear snapshot; useful for appending death/departure records. Does not recover earlier market actions. |
| `CoOpMarketAdapter.act` | Validates owner, device, generations and replay, dispatches transaction; retains only private action-ID set, no typed successful-action record. |
| `RunInventory` | Mutable wallet/offers/revision. `clear()` removes offers/assets; revision is shared by credits, market opening, purchases and other changes and cannot identify interactions. |
| `CommonConsumableWorld.snapshot` | Persistent claim identities and item-use events; purchased charges count as total itemsFound, so that counter cannot distinguish purchases from world collection. |
| `createRelayLedger` / `finalizeRelayResult` | Append-only generation-checked events and once-only frozen common result pattern; does not observe market commits. Reuse this pattern for Race, not a parallel shared statistic service. |

## Retained RED

`node --test tests/race-results.test.mjs` terminated exit 1 (synchronous command, no live session handle), `/tmp/down-to-duck-05-05-statistics-red.log`: 0 passed, 1 failed.

The real production objects open a market, accept one 30-coin Mud Splash purchase, reject its replay, and then execute fatal named damage. Assertions confirm the accepted charge, dead state, cleared market and cleared charge before the expected persistent purchase count fails (`undefined !== 1`). `marketPurchases` is a proposed shared contribution field, not a falsely claimed delivered API. Funding and market-window preparation are model fixture arrangement; the transaction and death are production paths, not built-browser evidence.

## Smallest repair requested

Extend the existing common participant contribution/event ownership at successful market commit, preserving adapter validation and atomicity. Record stable participant/seat, accepted action identity/kind, owner/context generations, tick/active time and relevant item/economy delta; rejected and repeated actions produce no record. Expose copied records or persistent counters to pre-clear/result observers. Cover accepted open/buy/equip/close as appropriate and retain earlier-mode behavior. Also reconcile innate-use capture at the existing successful power transaction rather than replacing mutable presentation callbacks. The exact shared API is a repair implementation choice.

Race-local monkey-patching of market methods, polling wallet/revision differences, or wrapping presentation callbacks would lose authoritative identity/order and violate the plan's common-service boundary. Parent requested a concrete checkpoint for a missing shared responsibility; this is that checkpoint. Source scope remains unchanged until dispatched repair. Both 05-05 tasks, result ranking/UI and their gates remain outstanding; phase and requirement completion are unchanged. No active build/browser/test process, dependency install, lockfile change or oracle change.
