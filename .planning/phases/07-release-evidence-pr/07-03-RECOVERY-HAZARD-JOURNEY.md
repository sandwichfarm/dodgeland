# Recovery hazard journey — ordinary and PROD/DEV verified

Owned only `tests/survive-recovery-outcomes-runtime.mjs` and this document. Appends one whole browser case; every original case remains unchanged. No production, planner, applicability or shared fixture changes.

## Actual app actions

Uses existing four-player public controller admission and existing `openItem`/`observe` helpers. Arranges P1 market eligibility and24coins, then actual visible purchase: `#market-open`, `#market-owner-strip [data-id="p1"]`, paged `[data-market-action="inspect"][data-id="consumable:consumable:revival"]`, `#market-inspect-action`. It asserts one owned charge and24coin debit. This is an arranged economy prerequisite plus public purchase, not publicly earned funding.

P3 starts at(0,7), with an explicitly spent innate cooldown and17coin fixture wallet; a public controller forward edge lands on unsupported river row8. Normal controlled RAF advances must produce exactly one water death and cleared wallet. No `end`, recovery or planner function is directly called.

The existing owner item disclosure pauses the game. While paused, initial return hazard cells are arranged; `Revive P3` followed by `Use Revival` performs the actual item transaction, target generation validation, safe-cell search and commit. No forced clicks or product test hooks.

## Deterministic placement rationale

Living P1 anchor(0,5), P2(4,3), P4(5,3). The search examines rows5,4,3:

- Row5: stationary length1.15 platform centered0. Its supported center is occupied by P1; other integer cells are unsupported water.
- Row4: blocked except0 and2. Stationary length2 car centered0 denies0; non-spawning resting slime at(2,4) denies2.
- Row3: blocked except0,2,4,5. P2/P4 occupy4/5. Rail phase `2 + 13.5/38*1.75 - world.time` puts the authentic length12.6 train at−5.5 (matching the rendered model), denying0 while leaving2 safe. Cell(2,3) is the unique safe return. The rejected length2 draft was not physical-safety proof.

Assertions require that exact fallback, four unique positions, only P3 changing, one Revival consumed, protection granted, dead wallet/cards still cleared, paused time unchanged, and stable world/player/protection state after3seconds of wall time. This tests actual recovery selection in an arranged world; it does not claim unarranged public course acquisition.

## Source-bound motivation

Prior DEV fd368afa /6e9dc057 (session SHA5b9363...) exercised safe-cell search but not hazard-reject arms809/810/811: [0,232]/[0,383]. Current-source shared-pickup f6cdf906 (session SHAf8ce62...) had [0,0] at those arms. Historical old-source counters are not merged with current source, and zero counts do not imply impossibility.

## Execution evidence

- Ordinary90331 exited0: whole suite5/5, no skips/cancellations,12643.99ms. Log `/tmp/down-to-duck-07-03-recovery-hazard-settled.log`.
- Canonical42336 exited0: PROD5/5 (41179.54ms), DEV5/5 (42212.39ms), ten collected browser realms, run `2578b66c-c6fe-4b3c-abc7-4f5b136642cc`, log `/tmp/down-to-duck-07-03-recovery-hazard-canonical.log`.
- Retained ordinary fixture failures64036/49676/17412/45030/61801: purchase auto-dismisses its inspector; market-close needs the existing controlled350ms settle before the UI context is ready for a fresh neutral→forward edge.61801 read-only observation established market still visible and run-state paused at the premature input boundary. Final fixture asserts market hidden/playing after settle; it uses no direct focus change. These are fixture sequencing failures, not established product defects. Logs `/tmp/down-to-duck-07-03-recovery-hazard-{ordinary,ordinary-2,ordinary-diagnostic,ordinary-3,input-context}.log` retain the history.

No production changes were required; no active runtime process. Focused report-only evidence does not establish release floors.

## Exact current-source mapped evidence

Output `artifacts/release-coverage/recovery-hazards-03/` binds run2578b66c. Each scope contains five opaque application realms. New hazard scenario `market-fixture-4` was independently collected in each scope.

Session source `f8ce62cdc5c87557636cce62f0b15005bfa5f9cde42c708d67915b4c1ebcec39`, map `a162249942d506d928c03a2dbb13e2be61284af301487ec7e12fbc17f334c137`, schema `96eaca2a2357c67d04c57dd1d40522a758d884c836a67f59ff7a272e3121b908`.

| line / branch | new hazard realm, each scope | whole suite, each scope |
|---|---|---|
|809 /217 if water|[20,8]|[20,240]|
|809 /218 binary|[28,20]|[260,20]|
|810 /219 if traffic/rail|[4,4]|[4,236]|
|810 /220 binary|[8,4,8]|[240,236,8]|
|811 /221 if mob|[2,2]|[2,234]|
|811 /222 binary|[4,4]|[4,4]|

PROD artifact `cdf0a928477d5d35fb3f6aef586bb97f7ccb17be7c96dfc0b63e28f0c925d2f5`; DEV `9a07f6a477d4dd2ccc4c5b2d5825a93ca63690583a4ab44baf8a6247d036be83`. DEV records include verified actual artifact proof. No screenshots are written by this suite; every original assertion and case is retained.

Normal dist raw SHA `a34fd21258f80302593c584f5a9566f7511af49798c0b0cac6dacc1beb478bc1`; Buffer-encoding hash `45e48a5c3f8ffe19ebaf6a9aa6e818392101aa9eb669b5cdd78c011b87b2aeca` equals the collector preservation identity.

Root independently checked the final manifest, both stratum reports and preserved normal-artifact digest. Independent scoped source review accepted the authentic geometry, ownership assertions and whole-suite registration with no concrete blocker. Its initial pending-canonical qualification is superseded by the terminal42336 results above.
