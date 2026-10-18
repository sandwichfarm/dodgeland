# Existing Race item lifetime attribution

Verified by root-owned serial chain91193, exit0: ordinary Race18/18 and canonical Race18/18. No release-floor claim. Owned only `tests/race-items.test.mjs` and this document. Root owns all suite metadata. No production, policy, source-pin, recorder or runner changes.

The existing optional witness is passed through `raceRun`/`collected`; `acquire` replaces only the actual `createRaceSession(game,{seats})` call. It never acquires an already-created coordinator. Game construction and seed search precede acquisition. Terrain flattening, placement, roster reversal, magnet radius, protection/cooldown and invalidation fixtures are outside runtime intervals. `collected` measures its actual update and owned-charge assertion only. All original test assertions remain in place, with no copied cases.

Exactly23 real coordinator lifetimes /70 intervals: each lifetime starts with `acquisition` (acquiring→playing), followed by the IDs below (playing→playing). Pause/resume stays within the Lantern interval; other owners remain active through the selected departure/death cases.

| Lifetime order | Existing scope | Runtime IDs in order |
|---|---|---|
|1–4|Mud then Lantern × original/reversed roster|`contested-claim`|
|5–6|magnet radius0 then20|`magnet-no-pull`, `default-gravity-claim`|
|7|Mud actual use/replay/expiry|`collect-item`, `mud-use-replay-expiry`|
|8|Lantern actual use/traffic/pause/expiry|`collect-item`, `lantern-use-damage-pause-expiry`|
|9–15|seven original stale-plan changes|`collect-item`, `plan-before-invalidation`, `reject-invalidated-plan`|
|16|original forged action patch loop|`collect-item`, `reject-forged-actions`|
|17|previously attributed owner shop|`insufficient-wallet`, `exact-price`, `capacity-owner-replay-legacy`|
|18–20|protected/ghost/departed claim denial|`ineligible-claim`|
|21–23|collected item ghost/departure/actual death|`collect-item`, `item-lifecycle`|

The seven stale changes remain outside intervals, including real lifecycle callbacks, to keep the same conservative boundary for direct position/dead-state fixtures. Protected-claim setup is outside its interval, but actual ghost/departure callbacks and the ensuing claim update are included. The fatal lifecycle case sets only its innate cooldown before the interval, then measures actual damage/death and owner-isolated charge assertions.

Common-system-only tests, schema sampling125k, generic cooldown, fractional river seed discovery, RNG/audio comparisons, later item cases and any imported browser work remain uncredited by this change. They continue running in the original whole worker and remain in its final parent payload. The existing final `after` captures that complete parent, rather than the last selected lifetime. This is component-model evidence with explicit world fixtures, not a wholly public browser journey or expanded canonical-definition proof.

## Verified execution

Root chain91193 exited0. Ordinary whole Race suite18/18 (767.7ms), ordinary whole Relay suite12/12 (39996ms). Canonical `turn-item-ownership-03` run `eb412c10-945b-446c-92bc-923142857c05`: Race18/18 (36941ms), Relay12/12 (133476ms). Logs:

- `/tmp/down-to-duck-turn-item-race-ordinary.log`
- `/tmp/down-to-duck-turn-item-relay-ordinary.log`
- `/tmp/down-to-duck-turn-item-canonical.log`

Root independently checked manifest:16 complete parent payloads (2Node +14browser), exact70 Race intervals over23 actual lifetimes, plus one public Relay interval from root's separate existing runtime extension. Parent payloads include all later/unselected worker activity; only selected measured intervals receive mode credit. The14 original Relay browser realms remain present. Root owns shared manifest registration and the separate Relay change.

| Focused mode | Raw L / F / B | Applicable L / F / B |
|---|---|---|
|Race|932/2303;388/818;1066/3255|932/2222;388/769;1066/3141|
|Relay|422/2350;210/817;444/3198|422/2159;210/718;444/2893|

Root-owned diagnostic union reports additional Race38lines/13functions/52branch arms and Relay4lines/7functions/14branch arms. These are diagnostic union gains, not standalone totals or a full enforcing release result. No floors changed or claimed passed.

## Read-only next candidates — not implemented

| Existing case | Proposed boundary |
|---|---|
|Fractional river landing,2lifetimes|Keep discovery global-only; save selected seed/pickup identity, acquire a fresh actual factory lifetime, verify generated pickup equivalence outside measurement. Arrange prior meadow/positions outside; measure forward dispatch, updates and original fractional/single-claim assertions. Never acquire an already-created candidate.|
|Mud actual-ground ±16/±16.001,8lifetimes|Witnessed collection; positions/earned-distance overrides/roster reversal outside. Measure original plan purity, eligibility and commit assertions.|
|Lantern exposure,1lifetime|Witnessed collection; one interval of14 real leader hops, actual exposure, Lantern commit, protection and resumed damage cadence.|
|Repeat effects/protected shop,2lifetimes|Witnessed collection and activation; score/wallet fixtures outside. Measure opening/purchase/repeat rejection; protection fixture outside, then measure protected commit rejection and unchanged economy.|
|Expired cooldown,1lifetime|Actual factory; flatten outside; original cooldown installation/dispatch/update/next-hop assertions. Generic cooldown compatibility, not Race item activation; retaining global-only is reasonable.|

Candidates require separate authorization/metadata reconciliation and verification. They do not alter the verified23/70 implementation above.
