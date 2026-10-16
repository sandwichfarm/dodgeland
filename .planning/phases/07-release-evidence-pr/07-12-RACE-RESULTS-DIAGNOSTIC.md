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
