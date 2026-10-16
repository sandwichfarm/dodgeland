---
phase: 07-release-evidence-pr
reviewed: 2026-10-16
depth: standard
reviewer_execution: generic-agent-fallback
reviewed_scope: layout repair ef3d1c6
files_reviewed: 2
files_reviewed_list:
  - tests/local-session-layout.mjs
  - tools/release-coverage/suites.json
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Plan12 layout repair review

Generic-agent fallback applying the full local GSD code-reviewer role; not typed-agent execution. Reviewed the uncommitted diff against the original journey and root's `07-12-LAYOUT-REPAIR.md`, with adjacent canonical collector/runner tracing. No structural findings supplied. No tests, builds, browsers, process actions or source edits were performed; focused collection51670 was left untouched.

## Narrative Findings (AI reviewer)

### LR-01 — RESOLVED (original BLOCKER): safety-resize assertion starts from an already-paused run

**Re-review disposition:** the corrected uncommitted source at lines379–383 calls the existing public `resumeForInput()` for each theme, explicitly asserts `playing` before its first200×160 resize, and explicitly asserts `paused` after that resize. The original240×240 paused-state, four-owner and visible Resume-to-playing assertions remain. No pause intervenes between the active prerequisite and the below-minimum resize. This restores the lost active-to-safety proof. Subsequent geometry measurements remain explicitly paused; the one-board identity, stage/abort guards, cleanup completion ordering and canonical realm collection are unchanged. No behavioral blocker remains in the scoped repair.

Diagnostic51670 reportedly passed before this correction; it does not prove the corrected prerequisite. Corrected focused16152 (`/tmp/down-to-duck-07-12-layout-repair-verified.log`) was still running when this static re-review was requested and was not polled or disturbed. No corrected terminal result is claimed.

**Original finding follows:**

**File:** `/Users/sandwich/Develop/crossy-road-clone/tests/local-session-layout.mjs:376` and `379–393`.

The new explicit pause before the dark HUD matrix makes the first 200×160 entry occur while paused. Every remaining static measurement is likewise paused, so the light matrix also starts from paused. The original journey entered the below-minimum frame from active play, then asserted at 240×240 that safety restoration held the run paused, retained all four owners and exposed the public Resume action. The unchanged paused-state assertion at382 can now pass without the minimum-size transition suspending active play at all. A regression that leaves a playing run active below minimum would no longer be detected by this portion of the test. The later inspection/safety segment starts from inspection pause and does not replace that active-to-safety transition.

This violates the authorized preservation of the original safety/resume path and active-state windows; it is a test reliability defect, not a production bug claim.

**Minimal fix:** before each theme's first 200×160 HUD resize, resume using the existing public controls and verify `data-run-state === 'playing'` at the current working size. Then perform the original 200→240 path unchanged, including paused-state, owner-count and actual Resume-to-playing checks. Continue the new explicit pause for static geometry/detail captures afterward. Record the safety-transition provenance accurately; do not label its below-minimum row as deliberately user-paused if it was suspended by the viewport guard. Retain all existing inputs, assertions and screenshots.

### LW-01 — RESOLVED (original WARNING): safety-suspended rows retain the user-pause description

**Final disposition at ef3d1c6:** line231 now selects `viewport-suspended static layout` only when `state === 'hud' && width === 200`. Both dark and light200×160 HUD rows receive the corrected description; the other ten HUD rows retain `deliberately paused static layout`, and all twelve setup rows retain `setup`. Actual run-state observation and remaining metadata fields are unchanged. This final label delta changes no inputs, assertions or completion logic.

The reviewer independently read the completed `/tmp/down-to-duck-07-12-layout-repair-verified.log`: all five child stages and parent passed (six tests), zero failures/cancellations/skips,24 rows, empty errors/deficiencies, and `PASS local-session-layout` followed by the report-only disclaimer. This proves the corrected behavioral journey before the final metadata-only edit; the exact one-realm count and process exit0 are executor-reported, not independently inspected from a payload manifest/process handle here. Earlier diagnostic51670 is not substituted for this corrected evidence. Full collection51274 at ef3d1c6 remains pending and was not polled.

**Original warning follows:**

**File:** `/Users/sandwich/Develop/crossy-road-clone/tests/local-session-layout.mjs:231`.

The evidence writer still assigns every HUD row `measurement: 'deliberately paused static layout'`. After the LR-01 correction, the two200×160 HUD rows are reached from asserted active play and suspended by the viewport guard, not by the explicit measurement pause. Their observed `runState` is accurate, but the provenance description incorrectly conflates the newly restored safety transition with static user-paused measurements.

**Fix:** describe HUD200×160 rows as viewport safety suspension from active play, retaining the current static-pause description for other HUD rows and `setup` for setup rows. Keep the actual run-state observation and all behavioral assertions. This is a narrow evidence-description correction; it does not reopen the resolved active-state blocker.

## Checked scope

- All six frame sizes and both themes remain for setup and HUD:24 distinct rows. The new count/uniqueness assertions strengthen completeness. Original matrix screenshot names and inspection/editor screenshots are retained. The reduced-motion screenshot now explicitly applies its named dark theme and resumes before inspecting animations.
- Metric predicates for target bounds/hit testing, contrast, clipping/readability, scrolling, identity, personal fields, noninteractive slots and scene area are unchanged. Setup/editor selection, page and focus continuity checks remain. The active HUD focus window precedes the added pause. The compact inspection, held-key suppression, fresh movement, focus return and inspection-resize sequence resumes before entry and retains its original assertions.
- One browser, page, opaque iframe and registered production realm span all five sequential stages; no reload or private gameplay-state mutation was added. Pause/resume helpers reject terminal states. The pause helper's temporary public resize to expose the toolbar restores the requested dimensions on the same board.
- Five awaited subtests each keep120 seconds. A failed/cancelled child cannot set its success flag after the abort guard; the parent's assertion stops dependent stages. Aggregate completion is assigned only after all stages and24 rows, successful realm collection and browser close. A collection/close exception bypasses the completion write; earlier evidence remains incomplete. Cancellation does not forcibly stop an in-flight browser promise, but no later stage is admitted on that failure and the strict runner remains the terminal authority.
- Static HUD rows carry observed `runState` and an accurate paused-layout description; the two viewport-suspended rows are now distinguished from explicit user-paused captures. Active-input proof remains in the retained behavioral segments.
- The new named `layout-12` group is report-only under the existing runner, invokes the actual browser owner and canonical production build, and requires its source-bound browser payload. It does not replace or remove the full execution job. Empty artifact patterns are appropriate here because this suite already redirects all its captures/JSON through `artifactDirectoryForCoverage` into the run directory. Registration/collection identity remains unchanged; stages do not duplicate realm counts.

Only this report was written. LR-01 and LW-01 are resolved; no findings remain in the scoped repair. Corrected behavioral terminal evidence was inspected, while final metadata execution belongs to the pending full collection. No coverage floor, full-run success or phase completion is claimed.
