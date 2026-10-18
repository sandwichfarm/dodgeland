# Fresh Relay and Race acquisition evidence

Status: focused validation passed. This is not a floor pass.

## Missing behavior and attribution

The seven existing component lifetimes import a shared module graph before
their recorded acquisition intervals. Their runtime deltas correctly omit that
earlier work. Actual fresh launches also initialize the character, actor, item,
mode and consumable definitions before constructing a Game and its coordinator.
That initialization needs its own real lifetime witness, not copied counters.

`tests/release-turn-mode-coverage.test.mjs` adds one fresh Arcade lifetime for
Relay and one for Race. Each `loadSources` directory is distinct from the shared
graph; the test imports that directory's actual modules, parses saved progress,
constructs that Game and attaches that graph's actual coordinator. The original
seven lifetimes and assertions remain. Verified total: nine lifetimes and 29
nonoverlapping intervals.

The two added cases assert the original two unique characters, empty run
wallets despite saved lifetime coins, renderable traveler positions, first-hop
authority (Relay's waiting traveler cannot hop; Race's second traveler can),
frozen world/positions while paused, the same world on resume, and immutable
terminal results with rejected late movement. No terrain or inventory is
altered in these two cases. These are component launches, not public browser
journeys or physical-controller measurements. Requirements: ARCH-01, ARCH-03,
SOLO-02, RELAY-01, RACE-01 and TEST-02. Browser proof for TEST-03 remains in
the existing runtime suites.

## Recorder boundary

The existing turn recorder's `acquireFresh` snapshots before loading modules.
It reuses the calibrated pre-import snapshot normalization, which fills only
an absent Game record in a snapshot copy. It never initializes or resets global
counters. After importing, it checks the actual base, coordinator instance,
world host, session identity, definition and composition before recording the
acquisition delta. Import/construction failures cannot produce a completed
recorder; concurrent and repeated acquisitions reject.

The existing independent parent payload, monotonic interval ordering,
source/schema validation and summed-delta upper bounds remain mandatory.
`attribution.test.mjs` adds synthetic-only calibration for separate import
deltas, failed imports, absent factories, wrong bases/coordinators, replaced
world owners and concurrent acquisition. Synthetic counters never enter
production evidence. Existing solo cache/import calibration still applies.

## Verification

Bounded attribution/bootstrap controls passed 15/15, and the ordinary solo
bootstrap plus nine-case turn suite passed 10/10 (session84376 exit0).
Logs: `/tmp/down-to-duck-fresh-turn-attribution-units.log` and
`/tmp/down-to-duck-fresh-launch-ordinary.log`.

The first canonical turn execution passed all nine behavioral cases, then
correctly rejected the stale manifest's seven-lifetime contract. That retained
tooling failure is `/tmp/down-to-duck-turn-fresh-bootstrap-canonical.log`;
it is not a product RED. Both the focused and full manifest entries now require
exactly four Relay lifetimes/13 intervals and five Race lifetimes/16 intervals,
including the two new acquisition-to-play and play-to-terminal pairs. No
existing interval expectation was removed or relaxed.

Canonical70225 exited0, run `63285d8e-4f41-4e85-a94b-78f6e7bf92ba`, nine cases,
29 intervals and one independently bound Node parent. Log:
`/tmp/down-to-duck-turn-fresh-bootstrap-canonical-verified.log`.
Applicable Relay coverage is 1630/2226 lines,551/752 functions,1663/3010 arms;
Race is 1675/2281 lines,584/803 functions,1819/3207 arms. Compared with the
unchanged preceding seven-lifetime witness, this adds 230L/62F/176B for Relay
and 226L/53F/131B for Race. Mode targets remain open. Source inventory,
applicability policy and numeric floors are unchanged by this test expansion.
