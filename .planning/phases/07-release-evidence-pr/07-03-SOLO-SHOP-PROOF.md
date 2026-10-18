# Pinned solo shop rejection and continuity

Whole `tests/release-solo-mode-coverage.test.mjs` passes1/1 with26 independently
compared scenarios ordinarily and canonically, run
`a37b874f-fc3b-418e-9290-2dc050ea1a7b`. The current-owner side provides26 actual
lifetimes/52 intervals, one independent parent. The immutable baseline remains
`a310a81ed6c76df4b265c9012c23b8c83f4802e5`; no product or oracle changes.

One new compound scenario per real base covers closed/unowned/missing trades,
insufficient funds, sold-out replay, full-hand refusal, safe sale of a capacity
card, a paid pack with explicit replacement, unknown selection/discard IDs,
duplicate two-pick bonus selection, skip without refund, shirt/effect ownership,
duplicate cosmetics, temporary shield/freeze expiry and terminal clearing.
Actual authored items and run transactions are used. Rejected operations check
mutable inventory/RNG/revision plus player position/state/resources before and
after on each engine. A paid choice remains usable after rejection.

The unchanged harness independently loads baseline/current and compares state,
callbacks and future random progression at each tape boundary. These two new
scenarios each use one compound fixture: oracle comparison is at that boundary,
with explicit local assertions on intermediate operations. The zero-income
assertion applies to shield/freeze with an empty hand. It does not claim a
held-income-card interaction. Original24 scenarios and their assertions remain.
Independent read-only review found no blocker and confirmed those limits.

The first fixture seed607 produced no bonus within eight paid packs; ordinary
50829 failed that fixture assertion, not a product parity check. Fixed seed113
passes with an explicit genuine bonus assertion in both bases. Both logs remain:
`/tmp/down-to-duck-07-03-solo-shop-ordinary.log` and
`/tmp/down-to-duck-07-03-solo-shop-ordinary-seed113.log`. Canonical14181 terminated0;
log `/tmp/down-to-duck-07-03-solo-shop-canonical.log`.

Source/map/all-site-schema-checked diagnostic union with full51a4bea2:

| Base | Lines | Functions | Branches | Additional branches from this work |
| --- | --- | --- | --- | --- |
| Arcade |1150/1207|275/296|1161/1427|36|
| Flow |1016/1067|253/276|1019/1252|36|

These are diagnostic totals, not a fresh enforcing aggregate. The branch floors
still require52 Arcade arms and46 Flow arms. Normal build/root lock raw hashes
are unchanged. Exact standalone/diagnostic counters and job metadata are in
`07-03-SOLO-SHOP-PROOF.json`. No applicability, source pin or floor change.
