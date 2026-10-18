# Sound settings restoration and cancellation evidence

Root extended the existing complete `tests/sound-runtime.mjs` browser suite.
Production code is unchanged. This is added behavioral proof, not a bug repair
or fabricated RED. The host supplies storage/outbox/resource fixtures through
actual SDK calls in an opaque iframe; real public sound controls drive selection.
No live relay behavior is claimed. Chromium output stays muted.

The added scenarios prove:

- A completed user-selected custom pack wins over delayed saved preferences and
  is reused after hydration and after selecting a built-in pack and returning.
- A saved custom selection displays Pond fallback while loading; repeated Enter
  does not start another request. An explicitly advanced host deadline triggers
  the real AbortController path; retrying the saved option succeeds.
- Blank addresses do not load. A host rejection without an Error object displays
  a usable failure message while preserving the current pack.
- Missing optional sharing domains preserve the saved selection with built-in
  fallback, and built-in selection remains usable.

The timeout is controlled host timing evidence, not an elapsed30-second trial.
Original playback, migration, mixer, contextual death, teardown and compact UI
assertions remain in place. A fresh final custom-pack realm restores the original
context before the inherited playback/lifecycle assertions.

Serial chain89647 exited0. Logs:
`/tmp/down-to-duck-07-03-sound-settings-ordinary.log` and
`/tmp/down-to-duck-07-03-sound-settings-canonical.log`.
The ordinary complete browser suite passed. Canonical focused group
`sound-settings-03` uses the exact existing full Chromium sound job; its strict
worker passed1/1 in168449.923ms with no failure, cancellation or skip.
Run `8d6f387f-34c7-4985-995a-6036a9483f90` collected22 real browser payloads.
`thresholdsEvaluated:false` remains explicit.

Source `src/sound-settings.ts` SHA256:
`82e413739bfe7bdc4f29dd555eddaa5849dbebed10d296a5a439041accddb352`.
All three mapped site schemas match the immutable initial-full report.
Nineteen previously zero branch arms now execute:

| Branch/arm | Source line | Focused count |
| --- | ---: | ---: |
|7/1|78|2|
|10/0|81|1|
|11/1|81|1|
|14/0|89|2|
|15/0,15/1|90|1 each|
|16/0|91|1|
|17/0,17/1|91|1 each|
|20/0|101|1|
|22/0|102|1|
|23/1|108|1|
|26/0|116|4|
|27/1|116|4|
|28/0,28/1|117|1,3|
|29/0|120|3|
|30/0,30/1|122|2,1|

This focused suite covers56/67 arms. Six native range-key arms already have
initial-full evidence from other browser suites; a source-identical diagnostic
union is62/67. That union is not a fresh full report and is not release
acceptance. The full enforcing collection still owns aggregate current-source
metrics, remaining branch dispositions and all unchanged floors.
