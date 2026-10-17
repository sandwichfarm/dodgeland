# Component gap evidence

Root owns `tests/release-content-gaps.test.mjs`; executor registered its Node
job and focused group in96e4f99. Five new behavioral tests passed without a
production change. These are added proof of existing behavior, not a fabricated
RED or a release coverage pass.

Ordinary strict run exited0: `/tmp/down-to-duck-07-03-content-gaps-ordinary.log`,
5/5 tests, zero failures/cancellations/skips. Canonical run73164 exited0:
`node tools/release-coverage/run.mjs --suite release-content-gaps --report-only`,
log `/tmp/down-to-duck-07-03-content-gaps-canonical.log`,
run `28ea102b-44c1-4400-8532-45be52051a75`, one actual Node payload,5/5 tests.
`thresholdsEvaluated:false` is retained. No browser or audible output ran.

The tests cover legacy/unknown pickup appearance fallback, nonfinite and
backward musical clocks, clothing fitted to an authored character without
mutating its body/face, sparse/empty character geometry, and schema3's omitted
gentle argument reproducing the normal seeded course. They use production
modules through the existing canonical-capable loader. Model inputs are
component fixtures, not public gameplay journeys.

Compared with the pinned07-12 complete report, source hashes, map hashes and
all three source-mapped site schemas are identical for these four files. Newly
executed sites were previously zero:

| File | Source-mapped branch ID/arm (line) | Current focused count |
| --- | --- | ---: |
| coin-models.ts |0/0 (27),1/1 (27)|1 each|
| harmony.ts |0/1 (27)|3|
| wearables.ts |0/1 (20),1/0 (21),1/1 (21),2/0 (21),2/1 (21)|4,4,2,3,2|
| levels/v3.ts |0/0 (6)|54|

The two previously unexecuted wearables functions1 and2 (lines21/22) now have
counts3 and5. Nine branch arms and two functions gained actual evidence. Full
source hashes are respectively
`9c79f7c09255d5b18bf48c0679a37c18b38c7cbda70b06931e84306614d75c1d`,
`3571b5700c43dbb32a1ebbc7b3698d0e70081061d22ab91aea6b479978178a6b`,
`6ff040ceaed6a1fd4ff1dcf7e8b8bc9a773bcc4a3598fa6a83529a05d28b72e6`,
and `e2e87f0afb51b59b4fda24ee6a3a523fe29e3af22bcf5b00494c8a90382f061c`.

This comparison does not merge entire runs across changed source identities.
In particular, session lifetime code changed after the initial report. A fresh
enforcing full report still owns current global/per-file/per-mode acceptance;
the remaining wearable defensive guard is not dismissed merely because the
other branches now execute.07-UNCOVERED should bind these outcomes to the
retained baseline entries while continuing the full semantic review.

## Keyboard fallback and latch gaps

Root also added three behavioral cases to existing `tests/keyboard-input.test.mjs`:
rejected storage reads/writes retain usable local controls; malformed persisted
profiles fail atomically before router construction/persistence; unsupported or
unbound keys cannot release a held action across focus/capture. No production
change or RED is claimed. Executor registered the focused group in7e1e546;
the existing full keyboard job already runs this file.

Combined chain84817 exited0:9/9 ordinary and9/9 canonical tests, no skips or
cancellations. Logs `/tmp/down-to-duck-07-03-keyboard-ordinary.log` and
`/tmp/down-to-duck-07-03-keyboard-canonical.log`; canonical run
`f4da84e1-5715-42c7-b075-9a363f51849a`, one actual Node payload. The focused
keyboard file executes82/82 branch arms. Seventeen previously zero mapped arms
now execute:0/0,6/0,10/0,12/0,15/0,17/1,20/0,21/0,21/1,26/0,27/0,27/1,30/1,
33/0,39/0,40/0,41/0. Source hash
`8e0d6a152777a497ea35f0f9cb09428945909e9ff08573833178eeea6da7c5f8`, map and
mapped schemas match the pinned full baseline. This source-bound focused
improvement is not a full release pass; `thresholdsEvaluated:false` remains.

## Sound-pack loading boundaries

Root added `tests/release-sound-loader-gaps.test.mjs`, registered in focused and
full Node inventories by62c3c20. Seven component tests exercise the actual SDK
forwarding with injected host fixtures, real Blob bytes and SHA-256, and a
controlled decoder dependency. They never open an audio device or network.
Missing optional domains, invalid addresses, host failure versus absent lists,
deterministic list selection, invalid bytes and metadata, shared-file cue
durations, the decoded-memory budget and cancellation at asynchronous boundaries
are checked. No production change or RED is claimed.

Combined chain79288 exited0:7/7 ordinary and7/7 canonical tests. Logs are
`/tmp/down-to-duck-07-03-sound-loader-ordinary.log` and
`/tmp/down-to-duck-07-03-sound-loader-canonical.log`. Canonical run
`9ababc7e-ebc3-437c-9480-6d678f10da83` collected one Node payload and retained
`thresholdsEvaluated:false`. The focused file executes40/41 branch arms; its
remaining relay-options arm7/0 already has initial-full evidence.

Source hash `9f9b114ae820a3a5f59d172c907593fae8455aef0358eabfb020dfc062f6d921`,
map and mapped schemas match the pinned initial-full report. Twelve previously
zero mapped arms gained evidence:1/0(line13)=1,2/0(15)=3,4/1(17)=1,5/0(22)=2,
9/0(27)=3,9/1(27)=1,10/0(28)=2,11/0(28)=1,11/1(28)=1,12/0(39)=3,15/1(45)=1,
16/0(48)=1. This is focused source-bound improvement, not aggregate release
acceptance or real-browser audio playback proof.
