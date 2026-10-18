---
phase: 07-release-evidence-pr
reviewed: 2026-10-16
reviewed_commit: 65ca494
regression_commit: 65ca494
depth: standard
reviewer_execution: generic-agent-fallback
files_reviewed: 3
files_reviewed_list:
  - src/hand-layout.css
  - tests/run-hand-runtime.mjs
  - tools/release-coverage/suites.json
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Plan12 owned-hand pause repair review

Generic-agent fallback applying the full local GSD code-reviewer role; not typed-agent execution. Reviewed candidate a7ef5f8 and regression7a1293e against root2e8064c scope, including adjacent pause CSS and actual markup. No structural findings supplied. No tests, builds, browsers, process actions or implementation edits performed.

## Narrative Findings (AI reviewer)

No concrete scoped implementation defect found. Static review is clean; ordinary/canonical execution and visual/geometry acceptance remain pending.

### HP-01 — RESOLVED (original WARNING): decorative rivet overlaps the first heading letter at the floor

**File:** `/Users/sandwich/Develop/crossy-road-clone/src/hand-layout.css:134`, interacting with `src/game-ui.css:23–24`.

Subsequent visual inspection of both ordinary240×240 PNGs shows the top-left decorative square touching/covering the upper-left portion of the initial P in `Paused.`. The heading remains readable, so this is a bounded visual quality issue rather than loss of an action or unreadable label. The new first-cell heading placement brings it into the absolutely positioned board rivet's region (top10px/left10px plus border/shadow). The panel/text-range containment assertion cannot detect this painted overlap.

**Fix:** within the existing owned-hand/home/short-frame scope, move the nonsemantic decoration clear of the heading or adjust its painting order/placement so it cannot cover glyphs. Preserve heading size/content, button geometry, hand clearance and other board states. Do not globally alter decoration or reduce type to fix this small overlap. Reinspect the two floor captures after the bounded change.

## CSS scope and layout

- Every new flattening/placement selector requires `data-hand-visible="true"`, pause open and pause page home inside the existing max-height399px breakpoint. Empty-hand states, taller states and Rules/Power reader states do not match. Existing reader hide/display rules retain authority because the new rules cease matching outside home.
- The new selectors include the relevant app state and run-panel ancestry, outranking the earlier home `.panel-bottom` grid in pause.css. `display:contents` removes only nonsemantic div wrappers (`pause-content`, `pause-home`, topics and bottom row). Heading and native buttons remain real nodes with their original semantics, handlers and DOM/tab order. The overview/feather remain hidden by existing short-height rules; the reader's existing hidden state is not changed.
- Explicit cells place heading/resume, Rules/Power, Travelers/Local Play in three two-column rows. This removes the measured nested91px container and its zero-width track rather than concealing the blocked action. Hand reservation, shelf position, font sizes,44px minimums, full text, focus styles and original resume pseudo-label remain unchanged. No clipping, ellipsis, scrolling or new minimum-size rule is introduced. Visual grid order differs from existing DOM focus order for resume versus topics, but all native controls remain accessible; no tabindex or input behavior changes.
- Available space and exact glyph fit require the authorized runtime measurements. Static CSS inspection does not establish that three rows, heading and all labels fit every affected frame; the candidate is not credited with unrun geometry proof.
- Focused containment follow-up: at240×240 the three44px rows, two6px gaps,12px vertical padding and8px border require at least164px. The apparent152px hand-reservation max-height is not the winning declaration: `#app[data-hand-visible] #run-panel` has specificity(2,1,0), while pause.css's compact `#app[data-run-state="paused"][data-pause-open="true"] #run-panel` has(2,2,0) and supplies `max-height:calc(100% - 24px)` (216px). The hand-aware top remains88px, so a164px centered panel can span6–170px, below the observed hand top186px. Therefore the proposed152px overflow is not established by the actual cascade. Runtime should record the computed panel limit and all child bounds; the new regression checks viewport/hand clearance, not containment within the timber panel.

## Regression reliability and retained journeys

- The original run-hand actions and assertions are preserved; only two helper functions and the bounded home/reader checks are added. Original40 theme/frame/state records (two themes × four frames × five surfaces) plus four pack-selection records remain44. Original arranged card/market/pack/death state remains explicitly arranged fixture evidence, not public acquisition proof.
- Visible Travelers click remains unforced after the added reader round trips. Stable shelf positions, collection/market/offer continuity, all six card accessibility, sale-affordability/page retention, pack draft/selection preservation, SDK/native keyboard behavior, paused clocks, power-only HUD, minimum notice and death/retry cleanup assertions remain.
- New control checks measure actual button rectangles,44px targets, viewport/hand clearance, center hit ownership, text-node ranges and pairwise overlap. They assert presence of resume, Travelers and Local Play on home. At the floor, actual Rules/Power clicks additionally establish those two actions are present/reachable. Reader navigation traverses to disabled Next with a finite bound, checks each page's controls and nonempty text, asserts Travelers hidden, returns through Back and verifies paused state/time before the original journey continues.
- Independently read `/tmp/down-to-duck-07-12-hand-pause-red.log`: the strengthened original suite fails its new geometry assertion before CSS repair (strict runner exit1, no cancellation), with a failing text-fit observation. This is meaningful negative coverage of actual controls, not a mirrored CSS-value assertion. Root's ordinary59175 and observation33376 are separately documented diagnostic evidence; they are not claimed as this reviewer's executions.
- Limits: the text-range check intentionally bypasses the preexisting font-size0 resume button, whose visible `Hop on` label is generated by a pseudo-element. It also does not measure the heading or reader-copy geometry. Reader tests prove nonempty reachable pages and control usability, not independently complete reader text/contrast. These limitations do not demonstrate a candidate defect, but final rendered evidence must support full-label/heading fit and reader usability; this report does not overstate the regression's coverage.

## Artifact and execution contracts

Read-only manifest parsing confirms132 full execution jobs, unchanged inventory count. The new two-job `hand-pause-12` group exactly equals the full run-hand and pause-layout job objects, including roles, required browser realms, production scope and artifact patterns. Both run-hand job copies preserve exactly the six emitted outputs: runtime JSON, failure PNG, offer320×560 PNG, pause240×240 PNG and market900×600/2400×1200 PNGs. The unchanged pause suite retains its existing complete artifact patterns. No generic collector, source inventory, floors, dependency, root lock or immutable oracle change appears.

The prior omitted image cannot be retroactively recovered by adding its path. Root's scope honestly preserves the current failed-run image and does not claim older unbacked provenance. New ordinary/canonical runs must prove restoration against their own source/build identities and retain all44 hand records plus24 unchanged pause cases.

Only this review report was written and committed under explicit authorization. No runtime pass, screenshot acceptance, full collection success, coverage floor or phase completion is claimed.

## Ordinary evidence and refinement follow-up

Reviewed39e9ffe: button `fits` now includes actual panel bounds as well as viewport/hand clearance. The helper records panel rectangle/computed max-height and checks visible heading text ranges against that panel. It does not weaken original journeys or geometry checks. The added light240×240 PNG is the seventh declared output in both full/focused copies; all original basenames remain. The change measures containment, not painted occlusion, hence HP-01 above.

Independently parsed `/tmp/down-to-duck-07-12-hand-pause-final-ordinary-evidence/generated/run-hand-runtime.json`:44 frames,6 scenarios,38 pauseChecks, empty runtime errors/external requests. Both floor home rows record panel x12/y6/width216/height164, computed max-height `calc(100% - 24px)`, five91×44 controls, no pairwise overlap, true hit ownership/text fit/panel containment, and headingFits true. This confirms the earlier cascade calculation; the proposed152px limit was not active.

Directly viewed `run-hand-pause-240x240.png` and `run-hand-pause-240x240-light.png` from that directory. Rules, Power, Travelers, Local Play and the existing pseudo-element Hop on label are visibly readable and separated; the hand shelf remains below the board. The pseudo-label is visually inspected rather than credited to the text-range assertion that bypasses font-size0. The decorative heading overlap is retained as HP-01. These screenshots precede the final `pauseLayout` measurements in the test sequence, so their animated board offset should not be equated pixel-for-pixel with the later recorded settled rectangle; the relative rivet/heading placement is visible in both.

Canonical group `1186a7d2-cbe4-41a1-9c82-8a8e310c094c` and final chain32044 were still active at this follow-up. No canonical pass or complete final verification is inferred. No tests/builds/browsers or source changes were performed by the reviewer.

## Canonical terminal follow-up

Chain32044 subsequently terminated exit0 (executor-reported). Independently read `/tmp/down-to-duck-07-12-hand-pause-final-gate.log`: ordinary hand suite passes; canonical hand and unchanged pause suites each pass with zero failures/cancellations and explicit job PASS records, followed by the report-only disclaimer. Guidance7/7 and conformance5 passed/0 failed/5 skipped are recorded; skipped protocol scopes remain unmeasured.

Independently parsed run `1186a7d2-cbe4-41a1-9c82-8a8e310c094c`: both job ledger entries record exitCode0 and both browser realms are collected. Archived hand JSON retains44 frames,6 scenarios,38 pauseChecks and empty errors/external requests. Archived unchanged pause JSON retains24 frame/theme cases and empty errors/external requests. This closes the pending canonical execution item for the current candidate; it does not resolve HP-01's painted decoration overlap. HP-01 remains open pending the separately authorized bounded decoration change and new dark/light evidence. No full collection or coverage-floor success is inferred, and no reviewer tests or source edits occurred.

## HP-01 candidate static re-review

Inspected65ca494 while gate87963 was running. The two new CSS lines move only the before/after rivets to `top:-4px` under owned-hand + pause-home + max-height399px. They override the generic board decoration without changing its dimensions, colors, pointer-events, labels, controls, type sizes or layout tracks. Reader/empty-hand/taller states do not match. Existing visible overflow permits the border/shadow to paint without clipping; final viewport placement still requires the replacement captures.

The read-only regression derives pseudo bounds from the panel's actual viewport rectangle, parent border and computed inset. It accounts for content-box versus border-box dimensions and the current single zero-blur1px spread shadow; the current rgba/rgb computed shadow format is handled. Settled board translation is included in the panel rectangle. This is scoped to the actual decoration, not a general transform/multiple-shadow geometry engine, and no actor-envelope8px clearance rule is imposed.

The proposed15px painted bottom assumes an8px border box. Universal `*` border-box styling alone does not select pseudo-elements; if the computed pseudo is content-box, its8px content plus two2px borders produces12px and a painted bottom19px at panel y6. The test correctly branches on computed boxSizing, so this arithmetic difference is not an implementation defect; either calculation is above the previously observed heading top22.34375. Runtime must supply the actual computed bounds and theme captures. No new static finding; HP-01 remains open for visual/runtime closure, with gate87963 not yet credited.

## HP-01 ordinary visual closure

Independently parsed the replacement ordinary `run-hand-runtime.json` under `/tmp/down-to-duck-07-12-hand-pause-rivet-ordinary-evidence/generated/`:44 frames,38 pauseChecks, errors[] and external[]. Both floor home rows record panel(12,6,216,164), max-height `calc(100% - 24px)`, heading top22.34375/bottom52.34375 and headingFits true. The actual painted rivet extents are y5–19, x25–39 and x201–215, including their1px shadow. The resulting3.34375px vertical gap confirms nonintersection; the earlier15px estimate was not the actual content-box geometry.

Directly inspected both replacement240×240 PNGs, dark and light. The initial P and all other Paused glyphs are clear of the rivets; both rivets remain visible at the board edge. Full control labels, including the visually checked Hop on pseudo-label, remain readable, separated and above the hand. HP-01 is resolved by65ca494 on source inspection, actual ordinary geometry and both rendered themes. No scoped finding remains.

The ordinary terminal pass is executor/root-reported; the metrics and images above were independently read. Gate87963 canonical execution is still pending at this addendum, so the clean review verdict does not assert its terminal result, full collection success or coverage-floor completion. No tests, browser launches, builds or implementation edits were performed by the reviewer.

## HP-01 final canonical acceptance

Executor confirmed gate87963 terminal exit0. Independently read `/tmp/down-to-duck-07-12-hand-pause-rivet-gate.log`: ordinary and canonical hand runs pass, the unchanged canonical pause suite passes, and type-check/build/guidance7/7/conformance finish successfully. Conformance remains5 passed/0 failed/5 unmeasured; the log explicitly states thresholds were not evaluated.

Independently parsed canonical run `c3e74067-922c-412a-a263-9894d7d3b511`: both job-ledger entries have exitCode0; archived hand report contains44 frames,6 scenarios,38 pauseChecks, errors[] and external[]; archived pause report contains24 frame/theme cases, errors[] and external[]. Two browser payload files are retained. Root/executor report normal dist SHA `f7b8f2987c7a39e13b00785c455c5ff92c3f36e01a1aa3f15c9069dd52ea5163`; this reviewer did not independently recompute that hash.

Final scoped verdict: clean, HP-01 resolved on65ca494. Source scope, ordinary visual clearance and the focused canonical execution are accepted. This is not a full release collection or coverage-floor acceptance. Only this report was edited; no implementation mutation or runtime command was performed by the reviewer.
