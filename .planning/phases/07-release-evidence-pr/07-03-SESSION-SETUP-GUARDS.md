# Session setup preserves solo authority on rejection

Whole `tests/local-session.test.mjs` passes16/16 ordinarily and16/16 in
canonical `session-setup-03`, run `c93f8228-ba50-46a6-a3a9-695dae86684e`.
One independently captured Node parent; no mode or public-input credit.
Requirements: ARCH-01/ARCH-02 composable authority, INPUT-03 identity ownership,
SOLO-01 preserved solo behavior and TEST-02 actual production logic.

Two appended component cases use actual Game/SessionPlayer/LocalSession and
validated mode definitions. Both Arcade and Flow refuse invalid capacity,
empty/duplicate/over-capacity rosters, duplicate devices/characters and a mode
composed for a different live world. Failed staged replacement restores the
original primary device. Snapshots retain the course rows/mobs, seed/clocks,
position/progress, character, health, wallet/fraction/RNG, recovery, statistics
and interaction records; the original session reference is checked separately.

A valid one-player stage still commits afterward, retaining wallet/fractional
earnings and dispatching an actual forward hop. Committed cancellation rejects,
and repeated commit returns the same session. Invalid mode definitions and
handler containers never invoke callbacks; a valid composition captures the
original callback despite later caller mutation and invokes attach exactly once.

Source/map/all three site schemas match current full51a4bea2. Exact raw witness
pins and counts are in `07-03-SESSION-SETUP-PROOF.json`. Eight current formerly
zero arms gain execution:0/0,1/0,43/0,132/0,134/0,136/0,341/0,345/1. This is
more than the two session branch witnesses needed by the previous full report,
but a fresh enforcing aggregate is still required. Changed session source is
deliberately not relabelled as the immutable initial branch ledger.

No product, dependency, applicability or floor change. Normal build and root
lock raw hashes are unchanged. Retained logs:
`/tmp/down-to-duck-07-03-session-setup-ordinary.log` and
`/tmp/down-to-duck-07-03-session-setup-canonical.log`.
