---
phase: 07-release-evidence-pr
reviewed: 2026-10-16
reviewed_commit: 99fc863
depth: standard
reviewer_execution: generic-agent-fallback
files_reviewed: 10
files_reviewed_list:
  - tools/release-coverage/run.mjs
  - tools/release-coverage/attribution.mjs
  - tools/release-coverage/browser.mjs
  - tools/release-coverage/suites.json
  - tools/release-coverage/attribution.test.mjs
  - tools/release-coverage/policy.test.mjs
  - tests/release-mode-coverage.mjs
  - tests/audio-demo.mjs
  - tests/audio-zones.mjs
  - tests/guidance.test.mjs
findings:
  critical: 2
  warning: 0
  info: 0
  total: 2
status: issues_found
---

# Phase07 Plan12 code review

Generic-agent fallback applying the full local gsd-code-reviewer instructions; not typed-agent execution. Standard review of the ten explicitly assigned files, with adjacent collector/inventory/source-loader and artifact-writer tracing. No structural pre-pass was supplied. The running full collection was left untouched: no test/build/browser launches, source edits, process actions, installs or commits occurred. Findings below are established by direct code/data flow; suggested regressions were not executed.

## Narrative Findings (AI reviewer)

### CR-01 — BLOCKER: default Chromium obligation can be satisfied by Firefox alone

**File:** `/Users/sandwich/Develop/crossy-road-clone/tools/release-coverage/run.mjs:47` (also line48).

The independent command inventory records both `test:sound-runtime` (no browser environment override) and `test:sound-firefox` (explicit Firefox). Actual `tests/sound-runtime.mjs:156` selects Chromium for the default invocation. But `validateFullManifest` checks an entry only by filename, then validates only commands with a truthy `DOWN_TO_DUCK_AUDIO_BROWSER`. There is no corresponding check for the default Chromium job.

**Concrete failing condition:** remove only the `sound-chromium` job from a copy of the current execution manifest, retaining `sound-firefox`. The filename check at47 succeeds because Firefox has the same file. Every explicit variant check at48 succeeds because Firefox remains. The function returns true. The full runner subsequently executes only declared jobs (line154), and the browser job/payload checks at165 likewise iterate that reduced declaration. Thus the completeness gate can report complete execution without the required default-browser run. The current committed manifest does contain both jobs; this finding does **not** claim the active run has omitted Chromium. It is a reproducible missing-variant rejection defect in the release gate itself. The existing policy test's Firefox-only fixture also treats this shape as complete, so it does not protect the default obligation.

**Fix:** normalize each discovered source-executing command into its required job identity, including effective browser default and explicit overrides, and require every distinct identity in the manifest. For the present sound seam, default means Chromium. Preserve command provenance rather than checking only filename. Add focused negative cases removing Chromium and removing Firefox separately from the real two-variant manifest; each must reject before any browser launch. Keep the valid two-job case passing.

### CR-02 — BLOCKER: full collection overwrites two ordinary renderer captures without restoration

**File:** `/Users/sandwich/Develop/crossy-road-clone/tools/release-coverage/suites.json:2842` (`execution.jobs` render-test artifactPatterns, lines2850–2860).

The full render job's preservation patterns omit `artifacts/local-session-render-foreground.png` and `artifacts/local-session-render-river.png`. Both are unconditionally written directly to the ordinary artifacts directory by the retained render test (`tests/render.test.mjs:740`, with the two scenarios selected above). They are not redirected by `artifactDirectoryForCoverage`.

Full execution uses only this job's `artifactPatterns` through `preserveJobArtifacts` (`run.mjs:73–78,154`). None of the declared render patterns matches either path, so existing images are not backed up, instrumented-run images overwrite them, and cleanup neither copies those generated images into the run archive nor restores the originals. If the images were originally absent, they leak into the ordinary artifact directory. The older `adapters-07` group's artifactDirectories includes both names, but that list is not used for full execution. This violates the explicit ordinary-artifact preservation requirement and can destroy previous capture provenance even when the full job passes.

**Fix:** add these exact two paths (or a narrowly bounded equivalent pattern) to the full render job, or route both writes through the coverage artifact directory while preserving ordinary defaults. Retain a focused preservation regression with preexisting distinguishable bytes and with initially absent files, covering both successful and failed job cleanup. Preserve generated instrumented captures under the run directory and restore original bytes/existence. Reconcile any active-run overwrite from known provenance rather than presenting overwritten images as prior ordinary evidence.

## Checked boundaries and limits

- Mode intervals are derived from same-run/same-realm validated canonical snapshots, with monotonic statement/function/branch subtraction and explicit actual mode/base observations. The six-mode fixture uses visible setup/movement/pause inputs, and distinguishes the configured Survive base. No reset of global counters was found.
- Global/per-file reporting merges complete final payloads at run.mjs:167; mode reporting selects interval payloads separately at174. Interval deltas are not added back into global counts. Parent identity/counter ceilings and duplicate/overlap checks are present. This review does not infer high coverage from the short tracer: measured shortfalls and later behavioral gap closure remain necessary.
- Collector/inventory/source-loader tracing retains canonical source/map/schema validation, all-source zero records, explicit worker roles and separate alternate-source/oracle compilation. Exact policy floors and integer ratio comparisons remain intact. Dynamic-import resolutions are explicitly declared; their prose is not itself execution proof. Actual payload and full-run completion remain required.
- Audio adapters retain actual production mixer/soundscape PCM assertions and isolate coverage outputs; their arrangements remain component evidence, not public gameplay. The guidance repair excludes only the repository-relative generated release-coverage subtree, with a traversal regression retaining similarly named source/docs/ordinary-artifact paths.
- The full collection outcome is pending and was not polled by this reviewer. No new terminal proof is claimed. Physical controllers, assistive speech and protocol checks previously reported unmeasured remain outside this review's proof.

Only this review document was written. Root lockfile, immutable solo oracle and preview5175 were untouched. The two findings require bounded repair and independent re-review; this report does not complete07-12 or the release phase.
