---
phase: 07-release-evidence-pr
reviewed: 2026-10-16
reviewed_commit: 3920d110dfb69cb176e9f98ee31818fe8897bc14
depth: standard
reviewer_execution: generic-agent-fallback
files_reviewed: 2
files_reviewed_list:
  - tests/relay-layout.mjs
  - tools/release-coverage/suites.json
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Plan12 Relay layout repair review

Generic-agent fallback applying the full local GSD code-reviewer role; not typed-agent execution. Compared3920d11 against its parent and the root71725d4 repair authorization. No structural findings supplied. No tests, builds, browsers, process actions or implementation edits were performed. Focused86745 was left untouched.

## Narrative Findings (AI reviewer)

No concrete scoped defects found. Static review is clean; focused runtime and forced-cancellation acceptance remain pending.

## Preserved journey and assertions

- Four sequential child stages each retain180000ms. Only three acquisitions remain: first-stage setup, second-run acquisition in stage3, and third-run acquisition in stage4. Fixture options and original implicit seed/default behavior are unchanged. Stage2 contains no fresh/open/reload; it continues the exact first board after stage1's original final pause action. The stage boundary adds observations/abort checks, not game state changes.
- The original first result is assigned to outer `prior` at the end of stage2. Stage3 retains the public Hop again action and80ms advance before its original replacement acquisition, earns both real contributions and asserts the tied podium plus `prior.distance === 1`. Stage4 likewise retains the second Hop again/advance and third acquisition, actual app-motion selection, generated-hazard inputs, revival offer and spent-charge assertion.
- All original public actions remain in order: roster editing, invalid length, runner ordering, inactive disconnect, owner restriction, first-hop handoff, incoming controller confirmation, skip cancellation, reclaim, leave cancellation with scene focus, actual skip, waiting, final departure and result pages. No world writes, invulnerability, substituted mode, extra per-frame acquisition or input-policy change was introduced.
- All21 states, six frame sizes and two themes remain, with unchanged PNG names and same-acquisition resize/theme continuity. The new sorted identity-array comparison verifies the exact252-cell Cartesian product, rejecting missing, duplicated or unexpected cells. It additionally requires four completed stages.
- Original heading/identity/position/result retention, target size, no-scroll, type roles/weights, hit testing, dialog semantics, native Tab/Shift+Tab, motion preferences, unchanged-announcement observations and below-minimum held keyboard/controller input remain. Original geometry/error/external/forbidden assertions are preserved and additionally checked at each stage before credit. Screenshot buffering adds abort checks while preserving the original15000ms screenshot timeout and image path.

## Cancellation, cleanup and collection

- The local orchestration follows the reviewed Race pattern. Child abort initiates active-fixture closure; parent orchestration awaits the body and abort cleanup before proceeding. A failed or cancelled stage cannot earn success or admit a dependent stage.
- `fresh()` checks parent/child signals before closing, before opening and after a late acquisition resolves. A late-returning fixture is closed before propagating abort. The WeakMap retains one close promise per fixture, avoiding duplicate canonical realm collection when abort cleanup, later fresh and final cleanup converge. The existing shared fixture closes browser/server in its own finally even if realm collection rejects.
- Capture checks precede each cell, screenshot write and capture-array credit. Already-issued filesystem writes can finish after an abort, but are awaited; the subsequent check prevents credit and further work. This is not a claim that cancellation reverses I/O already in flight.
- Original errors are retained through first-error assignment, and cleanup/contact-sheet errors cannot replace them. Stage completion follows all original assertions plus a live abort check, including after the asynchronous forbidden-access observation. A cancelled child remains a failing/cancelled test independently of the partial JSON.
- Index/contact sheets are generated only after all stages, exact cell inventory and assertions pass. Generation failures clear journey success; final fixture cleanup still runs. `complete` requires successful journey/cleanup, no retained error, no active/parent abort and no cleanup failure. Partial reports stay incomplete, original failures are rethrown, and final completion is asserted.
- The focused `relay-layout-12` job exactly matches the full job's browser role, required realm, production build scope and ordinary artifact patterns. It runs the complete file and does not remove any full execution obligation. The directory pattern covers all252 captures, contacts, index and report; redundant nested matches are deduplicated by the existing preservation helper. Three actual fixture realms are expected from source; collected count and identities require runtime evidence.

## Limits and handoff

No current focused terminal result or forced-cancellation evidence was inspected in this static review. The previously failed diagnostic's252 captures do not establish success. Runtime follow-up must confirm all four stages,252 exact cells/21 states, three collected realms, empty failures and the authorized shortened-first-stage cancellation/cleanup proof. The source trace supports late-open cleanup; it is not a dynamically exercised result here.

Only this report was written and committed under explicit authorization. No visual acceptance, full collection completion, coverage floor or phase completion is claimed. Other workers' files were preserved.

## Runtime evidence follow-up

Independent read-only inspection now closes the focused execution and active-fixture cancellation checks identified above. No new findings; scoped status remains clean. The earlier pending statements describe the initial static-review handoff.

**Focused normal run:** `/tmp/down-to-duck-07-12-relay-layout-focused.log` records5/5 passed (four stages plus parent), zero failures/cancellations, `PASS relay-layout` and the report-only disclaimer. Independently parsed run `185e890b-c6f1-4825-8f81-4f780019cac6`: the archived report has `complete:true`, all four expected stages,252 captures/252 unique cells/21 states and empty geometry failures, runtime errors and external requests. Three unique browser realm records are collected; the browser-role job ledger records exitCode0. Guidance7/7 and conformance5 passed/0 failed/5 skipped appear in the same terminal log. Overall command86745 exit0 is orchestrator-reported; the suite ledger and terminal log were independently read. Conformance skips remain unmeasured.

**Forced first-stage cancellation:** inspected `/tmp/down-to-duck-07-12-relay-cancel-loader.mjs`, `-probe.mjs`, `-transform.json`, `-probe.log`, and `/tmp/down-to-duck-07-12-relay-cancel-evidence/{child.log,probe-result.json}` plus its archived partial report. The loader requires exactly one matching deadline expression and conditionally changes only the first stage to5000ms, retaining180000ms for every other stage. Recorded source SHA256 is `572602213e6fa1739b521d839124e5a87675f737fa7fd5429320784b588f2b4a`; transformed SHA256 is `502a5483ed226fb16f2c4f9bf1e3a04f906b0dd773232af08a09900f83015541`.

The actual child log records the5000ms stage timeout, cancelled child and failed parent. Its report remains `complete:false`, stages empty, with24 cells belonging only to setup/setup-roster. The parent preserves the target-closed error from the body interrupted during resize; the child log separately retains the original deadline failure. No subsequent stage or acquisition appears. There is one muted browser launch, PID43324, and its normal process exit at19:40:08.394Z before test termination. This directly proves active-fixture teardown and dependent-stage suppression for the observed cancellation, not cancellation during fixture opening. Late-opening cleanup remains statically traced but dynamically unexercised.

The probe uses the corrected reporter-aware timeout matcher and browser exit delimiter. Its retained result records expectedChildExit1,256 restored ordinary files, and unchanged normal artifact SHA256 `c67e3b6fee36829ebec67029d2a7053624a7c1ac9f895458d030fd5cc216e698`. Source inspection confirms exact exit1, before/after normal-build byte equality and per-file original/restore byte comparisons execute before that result is written. Those assertions/results were inspected, not rerun against the shared workspace. Unlike the earlier Race wrapper, this probe has no retained reporter-format mismatch.

The negative earns cancellation/cleanup evidence only, never gameplay or coverage credit. Passing focused execution does not establish a complete132-job collection or coverage floors. No tests, builds, browsers, source changes or process actions were performed during this follow-up; only this report was updated and committed.
