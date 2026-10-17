# Actual frozen mob and advancing wave parity

The whole matrix passes 62 pinned scenarios ordinarily and canonically, run
`b945cea1-ee46-4845-ae0c-2613e3e91a34`: 62 current actual lifetimes,
124 intervals, 33 Arcade / 29 Flow, one independent Node parent. Ordinary 99438
and canonical 19597 both terminated with exit 0. Original 61 scenes remain.

The new Arcade scene arranges initial progress, clock and safe terrain, then
requires the actual MobDirector to create one mob. Paid Stoplight and Quiet
Footsteps follow that spawn. Fixed-step updates must keep the same mob's pose
and phase stable during the freeze while the wave continues advancing. Later
updates wash that mob away and end the owner's run with wave death, clearing
inventory and wallet. No test-created mob, forced phase or private timer is used.
The scene does not claim public-input reachability or freeze expiry/resumption.
The immutable solo oracle remains unchanged, with differential comparisons at
the existing tape boundaries and explicit assertions inside this component scene.

Two ordinary fixture failures remain in the separate logs: 1777 arranged market
eligibility before spawn, which legitimately suppresses spawning; 18852 expected
a stationary owner and frozen mob to survive until spell expiry even though the
wave overtakes them first. Correcting those expectations changed no game rules.

Exact source/map/all-site-schema diagnostic union with full 51a4bea2:

| Base | Lines | Functions | Branches |
| --- | --- | --- | --- |
| Arcade | 1166/1207 | 276/296 | 1216/1427 |
| Flow | 1028/1067 | 254/276 | 1069/1252 |

Arcade gains five branches and four lines beyond the guard tranche. Both solo
modes meet diagnostic targets; a fresh enforcing full aggregate remains required.
This report is not release acceptance. Normal artifact and root lock hashes are
unchanged; metadata and exact test hash are in the adjacent JSON.

Logs: `/tmp/down-to-duck-07-03-solo-freeze-ordinary.log`,
`/tmp/down-to-duck-07-03-solo-freeze-canonical.log`. The initial fixture outcomes
remain in the earlier logs under that prefix.
