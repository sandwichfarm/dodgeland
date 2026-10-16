---
phase: 06
slug: cross-mode-presentation
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-16
---

# Phase 06 — Validation Strategy

## Test Infrastructure

Use the installed Node test runner, strict-node-tests wrapper and Playwright opaque-iframe fixtures. No dependency or lockfile changes. Every browser launches with `--mute-audio`; preview5175 remains untouched.

Fast feedback: `pnpm type-check`, plus focused existing/new assertions matching each changed surface. Target less than30seconds for pure checks; measure actual duration. Browser journeys and final gates are slower, separate tiers and must be polled to terminal without restarting on an observation timeout.

## Acceptance Scope

- Retain failing built regressions for real canvas traveler/body/nameplate intersection with visible DOM HUDs at900×600; Survive Arcade/Flow and Race initial/left/right groups, Relay active runner. A clear center point or label-only check is insufficient.
- Retain shared-session visibility/ownership proof for duplicate solo personal status, owner changes, menus, resize and return to solo.
- Validate changed surfaces at200×160 notice,240×240,320×560,900×600,1000×280,2400×1200 in both themes with reduced-motion representatives. Preserve large controls, bounded pages, focus and authoritative state.
- Reuse real lifecycle/owner/results journeys rather than fabricate a second UI or result records. Cover all participant identities including departed/replaced seats.
- Preserve immutable solo numerical/pixel parity and existing shared input authority.

## Sampling Rate

Run focused RED/GREEN checks during each implementation task. After source freeze, run the bounded new cross-mode regression and exact delivered Relay Gate6 and Race Gate7 from04-VALIDATION.md/05-VALIDATION.md, preserving their inherited Phase1–3 checks and final type/build/guidance/conformance/oracle-lockfile checks. Do not separately repeat commands already nested and green on that same source. One build/browser process at a time; record exact commands, source revision, durable log and terminal exit.

## Per-Task Verification Map

| Task | Requirements | Executable verification | Creation dependency / evidence |
|---|---|---|---|
| 06-01-01 | UI-04, UI-05 | `pnpm type-check && pnpm build && node --test --test-name-pattern="P6 tracer" tests/cross-mode-presentation.mjs && pnpm test:solo-parity` | Task creates cross-mode suite and read-only geometry observation; retained real four-seat RED precedes behavior changes |
| 06-01-02 | UI-04, UI-05 | `pnpm type-check && pnpm build && node tests/strict-node-tests.mjs tests/cross-mode-presentation.mjs tests/render.test.mjs tests/solo-ui.test.mjs tests/solo-ui-browser.test.mjs` | Depends on 06-01-01; named P6 scene and P6 frames checks plus inspected source-fresh captures |
| 06-02-01 | UI-04, UI-05 | `pnpm type-check && pnpm build && node tests/strict-node-tests.mjs tests/cross-mode-presentation.mjs tests/survive-market-pack-owner-runtime.mjs tests/survive-complete-run-runtime.mjs && node tests/relay-layout.mjs && node tests/race-layout.mjs` | Depends on completed 06-01; extends named P6 lifecycle tracer, P6 lifecycle and P6 owner-results |
| 06-02-02 | UI-04, UI-05 | `node tests/phase6-gate.mjs` | Task creates sequential runner for exact blocks below, one additional health-runtime, cross-mode suite and diff check; no command required before its task creates it |

## Wave 0 Requirements

Existing test infrastructure is installed. Add only missing retained acceptance assertions; no package installation. Proposed new test paths must be created by an explicit task before they become required commands.

## Manual-Only Verification

Human aesthetic/play-feel acceptance remains separate from measured geometry and agent image inspection. Actual user acceptance was received2026-10-16 (5eb3c46), covering all three modes and Controls/recovery/results. Formal verification/security closure is root-owned; no hardware or spoken screen-reader evidence is inferred.

## Validation Sign-Off

- [x] All planned tasks have executable automated checks or explicit test-creation dependencies.
- [x] No three consecutive tasks without automated verification.
- [x] No watch-mode commands; measured fast-feedback latency recorded.
- [x] Source-fresh captures inspected and linked to requirements/state/mode/frame/theme.
- [x] Conformance5pass/5unmeasured and physical-controller limitations distinguished honestly.
- [x] Final gates terminal and green; no oracle repin.

Execution:21972exit0 on26c9622; both exact canonical gates, health-runtime once, cross-mode27/27 and diff-check. See06-EVIDENCE.md. Type-check latency1.308s/1.260s measured from runner timestamps; browser tier115.930s. This retrospective audit completes the Nyquist record; actual human acceptance is received. Formal phase/security closure is root-owned.

## Exact final frozen-source gate

The new runner executes these two complete blocks in order, failing immediately on any nonzero exit. The first block supplies the conditional delivered-Relay prerequisite of Race Gate7; do not insert a third Relay run. Preserve overlapping nested checks required by these exact accepted gates, but add no separate repetitions. One durable outer log and terminal status must cover the complete run.

Relay Gate6 (04-VALIDATION):

```bash
pnpm test:phase3
node --test tests/relay-tracer.mjs tests/relay-boundary.test.mjs tests/relay-lifecycle.test.mjs tests/relay-results.test.mjs
pnpm type-check
pnpm build
node tests/relay-runtime.mjs
node tests/relay-layout.mjs
pnpm test:guidance
pnpm test:conformance
git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml
```

Race Gate7 (05-VALIDATION):

```bash
pnpm test:phase3
node --test tests/race-tracer.mjs tests/race-ordering.test.mjs tests/race-balance.test.mjs tests/race-lifecycle.test.mjs tests/race-items.test.mjs tests/race-results.test.mjs
pnpm type-check
pnpm build
node tests/race-runtime.mjs
node tests/race-layout.mjs
pnpm test:guidance
pnpm test:conformance
git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml
```

After both unchanged canonical blocks, execute this completion suffix on the same frozen source, sequentially and exactly once:

```bash
pnpm test:health-runtime
node tests/strict-node-tests.mjs tests/cross-mode-presentation.mjs
git diff --check
```

`pnpm test:health-runtime` expands to `pnpm build && node tests/health-runtime.mjs`; its browser must remain muted. This is the missing additional completion command required by Race Gate7's Phase01-summary clause, not an optional focused check. Reconcile01-04-SUMMARY's frozen-source completion list as follows:

| Phase01 completion evidence | Final runner coverage |
|---|---|
| `pnpm test:phase1` | Both canonical blocks nest phase3→phase2→phase1; no extra invocation |
| mode-authoring, solo-ui and solo-ui-browser Node files | All three run in nested test:solo-regression under phase1; no redundant separate command |
| `pnpm test:health-runtime` | Completion suffix once; absent from nested phase commands |
| `pnpm test:runtime` | Nested phase2 invokes the exact command |
| type-check, build, guidance | Already explicit and nested in canonical blocks |
| `pnpm exec napplet-conformance ./dist` | Canonical test:conformance invokes the same built-dist conformance binary after build |
| `git diff --check` | Completion suffix once |
| lockfile diff | Both canonical blocks enforce immutable-oracle lockfile diff; source freeze plus no lockfile edits preserves the summary's working-tree condition |

The summary separately labels devtools/render/intents as retained01-03 compatibility evidence, not additional frozen-source completion commands; do not introduce a new intents run from that paragraph. Devtools/render are also already nested. Nested phase gates preserve numerical and original solo rendering checks; record actual commands and pixel comparisons, not just a parent exit. No tests were executed during planning. Fast tier is a target, not a claimed measurement: record real `pnpm type-check` and focused assertion durations during execution, separating build/browser acquisition from pure checks.

## UI consideration and backstop bindings

All entries below are lifted into plan frontmatter, with their exact E/category identifiers. The seven reasoned dismissals remain in approved 06-UI-PROBE.json and are not converted into invented features. Explicit truths total28; original structured backstops total8.

| Probe group | Explicit categories | Backstop categories | Plan/task and named proof |
|---|---|---|---|
| E1 shared HUD | empty,error,populated,partial,zero-one-many | overflow | 06-01-01/02 P6 tracer, P6 scene, P6 frames; full body/nameplate versus actual band |
| E2 inspection | error,long-text | overflow | 06-01-01/02 P6 tracer/P6 frames, then 06-02-01 P6 lifecycle tracer; same owner/page |
| E3 live course | empty | populated | 06-01-01/02 P6 scene; no substitute/hidden actors |
| E4 hand/market | empty,error,populated,partial,zero-one-many,long-text | overflow | 06-02-01 P6 owner-results and existing survive-market-pack-owner-runtime; sale page/owner retained |
| E5 lifecycle boards | long-text | overflow | 06-02-01 P6 lifecycle; minimum notice restores target/offer/focus/pause |
| E6 frozen results | empty,populated,partial,zero-one-many,long-text | overflow | 06-02-01 P6 owner-results; immutable archived records and logical page |
| E7 setup | empty,loading,error,partial,long-text | none | 06-02-01 changed-surface setup assertions plus inherited setup/browser journeys |
| E8 global actions | long-text | none | 06-01-02 P6 frames and 06-02-01 actual native/SDK activation |
| E9 minimum notice | long-text | overflow | 06-01-02 P6 frames and 06-02-01 P6 lifecycle tracer |
| E10 solo/shared chrome | long-text | overflow | 06-01-01/02 P6 tracer/P6 frames plus solo parity/pixel suite |

Two additional structured backstops in06-02 bind both themes/system+app reduced motion to P6 frames/lifecycle, and actual Tab/Enter/Space/assigned-controller direction+confirm to P6 lifecycle/owner-results. These preserve the original six subjects: actor geometry, live band, sale pagination, minimum restoration, themes/motion, actual focused actions. Backstop means a required executable test binding, not a waived criterion.

## Specless edges and prohibition recall

No plain SPEC or helper-confirmed edge/prohibition source exists. The default-on fallback ran; actual output is `/tmp/down-to-duck-06-edge-probe.json` (five candidates). Its unresolved raw output is preserved; this table records planner disposition without rewriting history.

| Candidate | Disposition and binding |
|---|---|
| UI-04 adjacency | Explicit: approved8CSS-pixel separation; touching or less fails. Plan01 truth and P6 tracer/scene boundary assertions. |
| UI-04 empty | Explicit: retain actual course for zero live actors and existing waiting/recovery/terminal policy; archived participants remain. Plan02 truth and P6 lifecycle/owner-results. |
| UI-04 encoding | Explicit: rendered CSS-pixel text extents and complete authoritative accessible labels, not byte-count approximation. Plan01 truth and P6 scene/frames. |
| UI-04 ordering | Explicit: existing true tie tiers and stable participant identity/page; no new tie-break. Plan02 truth and P6 owner-results. |
| UI-05 unclassified | **A06-01 flagged assumption:** fallback taxonomy cannot classify responsive presentation. Manually bind to approved frame/band/disclosure/focus contract and all listed tests; classification remains unclassified, not auto-dismissed or falsely resolved. No new user preference inferred. |

Two-stage prohibition recall was performed per prohibition-probe reference. Recall UI-04 candidates: competitive co-op podium, omitted departed participant, disconnect treated as death, fabricated healing, false paused clock, wrong-owner action, stale confirmation, duplicate ledger, unwanted unmute, misleading lifecycle label. Precision: these are already locked delivered policy or normal correctness invariants, not newly discovered domain prohibitions; bind to existing suites and06-02 changed-surface tests rather than mint new values scope. Recall UI-05 candidates: reduced hit targets, clipped text, accidental scrolling, unreachable controls, center-only geometry, moving actors for proof, changed solo rendering, lost focus, unreadable theme, added external font dependency. Precision: already explicit UI/architecture constraints or routine engineering acceptance; retain tests and task restrictions. No novel domain prohibition survives precision; both plans correctly declare `prohibitions: []`. Security/authority canon is handled by the ASVS1 STRIDE models and regressions, not fabricated product rules.

## Source coverage and hooks

Roadmap criterion1 maps06-02 lifecycle; criterion2 maps06-02 immutable participant/results evidence; criterion3 maps06-01 composition plus06-02 owner/setup/state matrix. UI-04/UI-05 map both plans. All locked context themes remain covered: scene-centered presentation, distinct mode summaries, every participant, exact solo, compact tiers, lifecycle continuity, one owner tree, actual input, theme/motion/accessibility and honest evidence. Research G1/G2 map06-01; existing-authority and source-fresh changed-state proof map06-02. Candidate files are not mandatory edits: renderer changes require actual CSS-failure evidence.

Active plan:pre contributions were read from `/tmp/down-to-duck-06-plan-hooks.json`. Security requires ASVS1 with unresolved high findings blocking; each plan has concrete STRIDE mitigations. No ORM/database schema or AI integration is introduced. API and assumption detectors are run against written plans before handoff, with actual outputs recorded in the planning return. No new external API is expected: existing SDK controller fixture usage preserves the delivered boundary. Human Phase05/06 acceptance is received and separate from technical checks; neither phase is formally completed by this document.

Planning checks completed: actual `detectApiIntegration` over ROADMAP plus both written plans returned `detected:false, signals:[]`; `assumption-delta scan 06 --json` returned the same. No false-positive coverage matrix or assumption migration is required. Both `frontmatter validate --schema plan` and `verify plan-structure` returned valid for both plans, with zero structure warnings/errors and two tasks each. These are planning checks, not product test evidence. All existing test paths in the verification map were checked to exist; new suite/runner paths have explicit creation tasks.

## Validation Audit 2026-10-16 — completed Nyquist record

Generic-agent workaround applying full local Nyquist auditor instructions and validate-phase. Active verify:post Nyquist hook confirmed. Existing final gates and independent evidence are accepted; no redundant test run or new mirror assertion was added. All four planned tasks have executable verification, existing test files and terminal behavior evidence. The exact gate blocks above are unchanged.

| Task | Requirement | Current executed evidence | Status |
|---|---|---|---|
|06-01-01 | UI-04/UI-05 | Actual-mode corrected P6 tracers included in19150exit0; historical generic-labelled Survive traces explicitly excluded | COVERED |
|06-01-02 | UI-04/UI-05 |19150exit0:22 cross-mode,23 render/solo UI,21 immutable solo, required checks;214 source-hashed captures; later full31 cross-mode supersedes | COVERED |
|06-02-01 | UI-04/UI-05 |76084exit0 exact Task1 strict27/27 plus Relay/Race layouts;21972 final state/inherited evidence; current92241 parent-child/owner input regression | COVERED |
|06-02-02 | UI-04/UI-05 |21972exit0 exact phase6-gate: Relay6/Race7, health-runtime once,27 cross-mode, diff; current92241 narrowed repair31 cross-mode/104 affected plus checks | COVERED |

UI-04 has actual native/SDK input proof for lifecycle, recovery and immutable archived participants; UI-05 has actual production body/nameplate rectangles, eight-pixel clearance, visible DOM footprints, complete accessible details, all six frames/themes, minimum restore and motion cases. Tests `cross-mode-presentation.mjs`, `survive-complete-run-runtime.mjs`, `survive-market-pack-owner-runtime.mjs`, `relay-layout.mjs`, `race-layout.mjs` and inherited input/results suites provide the named paths;06-EVIDENCE maps every28 explicit consideration,8 original backstops,2 additional backstops and7 justified dismissals. Arranged participant/stock fixtures remain labelled integration proof, not organic acquisition. Independent06-VERIFICATION establishes47/47,72 recomputed geometry samples and current hash agreement.

The actual missing native child-focus behavior found by independent review was already repaired with retained REDbe71b19: settled participant-details→Leave Race native Tab/ShiftTab/Enter/Space and shared recovery child traversal, original focus/owner/pause restoration, no movement leak. WR-01 has zero unchanged label mutations over1000ms and exactly one actual page-change update. Full current cross-mode31/31 and affected104/104 passed92241 onb9bc44f; independent52826 corroborates. Thus the earlier pointer-only proof is not carried as complete native-keyboard evidence.

Logs inspected: `/tmp/down-to-duck-06-01-final-complete.log`, `/tmp/down-to-duck-06-02-final-frozen-gate.log`, `/tmp/down-to-duck-06-review-repair-final.log`; scoped command/count/source mapping is in06-SUMMARY/EVIDENCE/REVIEW-REPAIR.21972 ends with explicit PASS for both canonical gates and completion suffix.92241 is a bounded repair gate, not another full inherited run. Current Phase07 instrumentation changes only opt-in test collection; these prior normal-mode evidence scopes remain valid. No product tests were executed during this audit.

| Audit metric | Count |
|---|---|
| Assigned requirements covered |2/2 |
| Planned tasks with executed automated evidence |4/4 |
| Newly uncovered behavioral gaps |0 |
| Missing compliance-record gaps resolved |1 |
| New tests / rerun tests / source edits |0/0/0 |
| Escalated implementation gaps |0 |

User visual/feel acceptance received2026-10-16 in5eb3c46; root owns remaining formal security/verification closure. Physical controllers, actual screen-reader speech and five evidence-dependent conformance checks remain explicitly unmeasured. This validation status means complete mapped phase behavioral evidence, not exhaustive trajectories, production coverage percentage, future Phase07 completion or hardware certification. No active audit process remains.
