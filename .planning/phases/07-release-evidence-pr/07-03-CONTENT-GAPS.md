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
