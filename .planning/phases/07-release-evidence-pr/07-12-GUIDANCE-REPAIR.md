# 07-12 guidance scanner ownership addendum

Approved by the root orchestrator under the existing autonomous release task on 2026-10-16. This is a narrowly scoped test-tool repair, not a change to gameplay or coverage policy.

## Observed failure

The first full collection on `a56b882` terminated with exit 1 (session 10259), before production jobs, at `CONTROL tests/guidance.test.mjs`. The durable failed log is `/tmp/down-to-duck-07-12-full-collection.log`.

The guidance scanner recursively includes generated release-coverage artifacts, then reads all selected files concurrently into a retained source map. The executor measured 1,023 generated artifact text files totaling 2,800,193,412 bytes; the eligible tree totaled 2,806,076,981 bytes. The process exhausted its approximately 4 GB V8 heap. Root inspected the scanner and the terminal failure independently.

## Authorized scope

Add `tests/guidance.test.mjs` to the 07-12 executor's owned files. Exclude only the generated repository-relative `artifacts/release-coverage` subtree from guidance source discovery. Keep all existing source, documentation, test, configuration and ordinary-artifact scanning, and every existing guidance assertion.

Retain a focused traversal regression that proves the exact generated subtree is excluded while similarly named source/documentation paths and ordinary artifacts remain included. Do not increase heap limits, remove the guidance control, exclude application source from coverage, lower floors, alter the solo oracle, or change the root lockfile.

## Verification and continuation

Use the existing terminal OOM as failure evidence; do not repeat it merely to manufacture another RED. Run the focused guidance checks and the 07-12 fast policy/collection/attribution checks before a new full collection. Preserve the failed log and record a new distinct log/session for the corrected run. Continue the exact required complete job inventory; no full-report or floor-pass claim is justified yet.
