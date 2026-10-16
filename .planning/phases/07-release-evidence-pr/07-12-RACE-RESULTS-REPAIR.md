# 07-12 Race results stage and cleanup repair

Root authorizes a narrow test-orchestration repair under the existing autonomous release goal. The executor owns `tests/race-results.test.mjs`, the already-owned `tools/release-coverage/suites.json`, and this addendum's execution evidence. No production, renderer, CSS, gameplay, input policy, dependency, oracle, lockfile or coverage-floor change is authorized.

## Observed boundary

Root revalidated the clean worktree at b82c0a5, the terminal diagnostic and absence of a running collector/results process. The unchanged whole job in run `423a3c5f-b707-47df-bc76-f7287d552e7a` exited1 with17 passes and two cancellations. The full132-job collection `59b261c8-5604-4c26-8b26-5d97f40d8e4a` previously exited1 at this job after69 production jobs passed. See `07-12-RACE-RESULTS-DIAGNOSTIC.md` for exact commands, timestamps, hashes and preserved screenshots.

The main browser case takes approximately124seconds before coverage/close against a90-second combined deadline. It continues after cancellation and overlaps two later browsers. The time-results case completes its assertions in approximately25.37seconds but crosses its30-second deadline during approximately5.10seconds of coverage/close. Remaining passing scenarios still spend5.62–9.68seconds transferring coverage. Zero emitted assertion failures does not turn these canceled suites into passing evidence.

## Preserved semantics and bounded stages

Keep all13 model cases unchanged. Keep all six original browser acquisitions, their order, seeds, public controls, original assertions, frozen-result identity, frame/theme matrix, paging rules and screenshot basenames. Do not manufacture world/results state, replace public actions, add per-frame reloads, filter tests or increase blanket deadlines.

Split each existing browser scenario into sequential stages sharing its original app and frozen result. Retain its original90/30/60-second limit per stage:

1. Main90-second case: acquisition and actual ordered finish; dark matrix; light matrix; selected-participant resize/retry/absence checks; explicit cleanup.
2. Time and left30-second cases: acquisition/setup; actual timeout or both public departures and original snapshot checks; compact/regular inspections; explicit cleanup. Preserve `advance(31000)` and the original simulated-clock sequence.
3. Three-tied, four-tied and four-distinct60-second cases: acquisition and actual finish order; dark matrix; light matrix; explicit cleanup.

Use the reviewed test-local Race/Relay layout cancellation pattern, without a general harness refactor. Parent or active-stage cancellation must prevent later actions/stages, close the current fixture exactly once, close any late-opening fixture, settle outstanding work, and await cleanup before the next top-level scenario can open its browser. Retain the primary failure and report cleanup errors. Add abort checks around actions/captures so canceled work cannot publish successful late captures. Do not mark a stage complete until its original assertions and live abort check pass. Do not mark a scenario/matrix complete until every required stage/assertion and cleanup succeeds. Retain useful partial evidence explicitly as incomplete.

All screenshots now belong under `artifacts/race-results/`, retaining their exact existing basenames and original screenshot selection logic. Create the directory in the test, and add it to both the full job and identical focused `race-results-12` job's artifact patterns so the existing canonical preservation/archive wrapper covers it. Existing historical `/tmp/race-05-05-*.png` files remain untouched. Do not change the generic collector merely to relocate these outputs. Preserve the original46 frame/theme cells and their page captures; the78-image preserved full-run set is historical evidence, not permission to replace original paging assertions with a count.

## Verification

Commit the narrow implementation for independent static comparison against b82c0a5 before running the focused browser gate. Run the whole canonical `race-results-12` job, with all original model/browser cases and required Node plus six browser realms. Run applicable type-check, normal build, guidance, conformance, immutable-oracle lockfile comparison and diff checks sequentially. Preserve normal artifacts/build bytes. One test/build/browser command at a time; all browser playback muted. Do not touch preview5175 or Paja5197.

Prove cancellation separately with an ordinary-build temporary exact-one-replacement loader shortening only the first stage's deadline. Record original/transformed hashes, expected nonzero child exit, incomplete evidence, no later stage/acquisition within the canceled scenario, and actual browser teardown before any later original scenario opens. Preserve/restore ordinary artifact directory contents and normal dist exactly. This injected failure earns no gameplay or coverage credit. Handle Node's actual reporter rather than assuming TAP. Do not modify tracked source to run the negative probe.

Independent review must compare every original action/assertion/acquisition and inspect focused plus negative runtime evidence. Root accepts the result before another complete collection. An unchanged whole Relay-results diagnostic is the next separately scoped action because its aggregate deadlines have not yet been exercised by a full collection. Do not preemptively repair Relay-results or start another full run.

This repair does not complete07-12, establish any coverage floor, or waive remaining conformance, visual, clause or PR obligations. Mixed-input exploration is separate; the user selected keeping keyboard and controller available to the same traveler, but no new assignment UX is implemented by this repair.
