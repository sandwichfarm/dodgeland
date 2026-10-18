# 07-12 Race results cancellation diagnosis

Root inspected the terminal full collection93747, run`59b261c8-5604-4c26-8b26-5d97f40d8e4a`, source/tests/toolingcb0e569 (last implementation3920d11), log`/tmp/down-to-duck-07-12-full-collection-layouts-verified.log`. The collector PID46458 is absent and its owning execution returned exit1. There are69 timestamped production-job PASS records, including Race layout10/10 with420 complete unique cells. Race-results is the next failed gate; no complete initial coverage report exists.

The original19-case `tests/race-results.test.mjs` reports14 passes, zero assertion failures and five deadline cancellations in329474ms:

| Case | Existing deadline |
| --- | --- |
| Built frozen results, complete paged participants and retry |90000ms|
| Built time results and frozen history |30000ms|
| Built left results and frozen history |30000ms|
| Four tied racers' podium tiers |60000ms|
| Four distinct racers' podium tiers |60000ms|

The three-tied-racer podium case passed. All13 production model cases passed. Root read the original browser acquisition/actions/matrices/cleanup and complete terminal TAP; canceled tests remain failures even though final screenshots and six browser realm payloads exist. The executor preserved78 current-run result PNGs and raw hashes at`/tmp/down-to-duck-07-12-race-results-failure-evidence/manifest.json`. That preserved set supplements the failed run, not passing evidence.

## Authorized diagnostic scope

The executor owns the already-authorized `tools/release-coverage/suites.json` solely to add a focused group containing the **entire unchanged** `race-results-test` job and its original Node/browser realm contract. Preserve the full132-job inventory and all original test cases. No production or test-body repair is authorized yet.

Run that complete focused canonical job once with durable Playwright API/browser timing logs (`DEBUG=pw:api,pw:browser`) and the existing muted fixture. Measure the actual acquisition, assertion/action body, coverage capture and browser close spans. Inspect the existing fixture/collector call sequence graph-first and correlate API timestamps, payload writes and process exits. Do not infer timeout cause solely from final image availability, lower assertions, filter out cases, increase deadlines, change the viewport/mode/clock behavior, or edit production state. If API logs leave a timing boundary unresolved, report the precise missing span before adding diagnostic instrumentation. No simultaneous build/test/browser job.

Before the focused job, preserve the exact existing `/tmp/race-05-05-*.png` outputs with hashes and restore them afterward; the job's current `artifactPatterns` is empty, so default repository artifact preservation does not cover those temporary outputs. Record this artifact-contract limitation explicitly and propose the narrow correction after diagnosis rather than treating unarchived images as automatically durable evidence. Existing normal build, original oracle and root lockfile remain unchanged.

Return the actual command/run identity and terminal exit, per-case timing attribution, any observed assertion failures, browser cleanup overlap and exact source diff. Preserve this failed full run and every diagnostic result. Root will authorize a specific repair only after the timing evidence identifies its boundary. No full rerun or07-12 completion claim follows from this diagnostic alone.

## Diagnostic outcome (generic executor fallback)

Manifest-only d1ce21f adds the unchanged whole job. Session74790 exited1, run`423a3c5f-b707-47df-bc76-f7287d552e7a`, log`/tmp/down-to-duck-07-12-race-results-timing.log`:17pass/2cancel/0assertion failures. Main90s and time30s canceled; left24.414s,3-tied27.635s,4-tied25.541s,4-distinct44.807s passed. No test-body/source/deadline change was made.

The exact outer preservation/command wrapper is`/tmp/down-to-duck-07-12-race-results-diagnostic.mjs`. Evidence directory`/tmp/down-to-duck-07-12-race-results-timing-evidence/` contains before/generated PNG sets with hash manifests and`restoration.json`:89 original temporary images and exact file set restored, normal dist byte-identical SHA256`c67e3b6fee36829ebec67029d2a7053624a7c1ac9f895458d030fd5cc216e698`. The current empty artifactPatterns contract still does not archive these temporary screenshots during normal collection; diagnostic wrapper explicitly covers them.

Graph discovery resolved `createMarketGameFixture` and `collectRealm`. Actual close order is coverage frame.evaluate, capturePayload validation and JSON persistence, browser.close, then HTTP-server close. The API trace establishes:

| Case/browser PID | Launch UTC | First Local Play request | Final body / coverage evaluation start | Coverage evaluation end | Browser close start → complete |
|---|---|---|---|---|---|
| Main26468 |20:22:47.887|20:22:51.307|20:24:51.722|20:24:53.821|20:24:54.034→54.079|
| Time29143 |20:24:16.488|20:24:18.735|20:24:41.858|20:24:46.394|20:24:46.719→46.958|
| Left30120 |20:24:46.816|20:24:49.333|20:25:04.674|20:25:10.296|20:25:10.978→11.134|
| Three tied30865 |20:25:11.388|20:25:13.262|20:25:27.981|20:25:37.665|20:25:38.701→38.894|
| Four tied31757 |20:25:38.999|20:25:40.866|20:25:56.520|20:26:02.845|20:26:04.377→04.434|
| Four distinct32643 |20:26:04.685|20:26:07.047|20:26:41.488|20:26:48.147|20:26:48.974→49.243|

Main cancellation occurs while a real Previous-results click is active at20:24:16.194, before retry/cleanup. Its body continues through real retry and final forbidden-global check at20:24:51.722. Main browser remains open until20:24:54.070, overlapping time's launch by37.582s and left's launch by7.254s. Time's final screenshot/body ends20:24:41.858; coverage evaluation adds4.536s, processing/persistence0.325s and browser close0.239s, crossing its30s deadline. The next left browser launches before time exits (20:24:46.816 vs46.897). No causal host-load claim is made.

The processing column is a bounded interval between evaluation completion and browser.close; logs do not separately resolve capturePayload versus JSON write within it. This distinction does not change the observed deadline boundary. Main's approximately124s launch-to-body span exceeds90s independently of its2.357s coverage/close tail. Time has approximately25.37s launch-to-body plus5.10s tail. Remaining passing cases still spend5.62–9.68s transferring coverage before close.

Recommended minimal repair, pending root authorization: test-local sequential bounded stages retaining the original90/30/60-second per-stage limits, same six actual acquisitions, unchanged model tests and every original assertion. Main should retain one frozen result through dark matrix, light matrix and selected-participant/resize/retry; outcomes should separate actual terminal acquisition from compact/regular inspection and explicit cleanup; podiums retain same result through theme matrices. Abort must prevent later actions and await exactly-once collection/browser cleanup before the next test. No blanket deadline increase, per-frame reload or gameplay change. Move these test screenshots to an explicit repository artifact directory with additive manifest preservation (or extend a narrowly validated test-output mapping) so canonical runs archive/restore them, rather than treating `/tmp` output as durable. An unchanged Relay-results focused diagnostic is warranted by the same90s multi-frame and45s result/controller structure before the next full retry; it has not been run. No process remains active, and no full collection/report or floor pass is claimed.
