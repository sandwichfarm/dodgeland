---
phase: 06-cross-mode-presentation
reviewed: 2026-10-16T12:46:25+00:00
depth: standard
files_reviewed: 32
files_reviewed_list:
  - src/hand-layout.css
  - src/main.ts
  - src/race-ui.css
  - src/race-ui.ts
  - src/relay-ui.css
  - src/relay-ui.ts
  - src/render.ts
  - src/run-hand.css
  - src/run-hand.ts
  - src/session-ui.css
  - tests/cross-mode-presentation.mjs
  - tests/local-session-gamepad-runtime.mjs
  - tests/local-session-layout.mjs
  - tests/local-session-runtime.mjs
  - tests/market-game-fixture.mjs
  - tests/phase6-gate.mjs
  - tests/race-layout.mjs
  - tests/race-lifecycle.test.mjs
  - tests/race-results.test.mjs
  - tests/race-runtime.mjs
  - tests/relay-layout.mjs
  - tests/relay-lifecycle.test.mjs
  - tests/relay-results.test.mjs
  - tests/relay-runtime.mjs
  - tests/survive-complete-run-runtime.mjs
  - tests/survive-lifecycle-layout.mjs
  - tests/survive-market-ghost-sale-runtime.mjs
  - tests/survive-offer-clock-runtime.mjs
  - tests/survive-recovery-board-layout.mjs
  - tests/survive-recovery-outcomes-runtime.mjs
  - tests/survive-recovery-owner-runtime.mjs
  - tests/survive-together-runtime.mjs
findings:
  critical: 1
  warning: 1
  info: 0
  total: 2
status: issues_found
---

# Phase 06 Code Review

Generic-agent fallback applying the full local `gsd-code-reviewer.toml` role and code-review workflow; this was not execution by the typed reviewer runtime. Explicit scope: all 32 source/test paths above, diff base `af12564`, reviewed HEAD `f22ae40` (production `7a7c128`, test corrections `26c9622`). Standard-depth contextual review, with graph-first discovery. No structural findings were supplied; fallow was disabled. No source edits or commits were made.

## Narrative Findings (AI reviewer)

### CR-01 — BLOCKER: Parent details trap prevents forward Tab inside a child lifecycle dialog

**File:** `/Users/sandwich/Develop/crossy-road-clone/src/main.ts:1489` (capture handler; related `inspectionRoot` at line 146, child trap at line 216).

**Issue:** `localSetupKeydown` intercepts Tab whenever participant inspection remains open. `inspectionRoot()` returns the underlying selected participant tile rather than the active lifecycle/recovery dialog. Its visible buttons still have rectangles even though their containing application sibling is inert. The parent prevents native Tab and attempts to focus an inert button. The child lifecycle handler only wraps at its first/last boundaries, so ordinary forward traversal from its first action cannot occur.

**Independent settled reproduction:** Real Race setup through `tests/race-browser-fixture.mjs`, resize to 240×240, public `sessionHudAction(app, 'p1', 'item')` to open the Leave Race confirmation, then advance the production fixture 100 ms before pressing native Tab. Four successive Tabs leave focus on **Keep racing**; **Leave Race** is not reached. The dialog remains open and there are no browser or boundary errors. This uses actual controls and no private world writes. Terminal session **76665**, exit 0, `/tmp/down-to-duck-06-review-details-tab-settled.log`; exit 0 describes the diagnostic script completing, not acceptance passing.

**Fix:** Give the topmost existing modal exclusive keyboard focus ownership. At minimum, bypass the parent HUD Tab handler while a lifecycle/recovery/handoff child owns focus, leaving that child's existing native trap active. Preserve original owner/context validation, pause history and fresh-input policy. Do not solve this by forcing focus from tests or exposing underlying inert controls.

**Focused regression:** Open the real participant-details Leave Race confirmation and use native Tab/Shift+Tab to reach and wrap both actions after at least one rendered frame; exercise Enter/Space cancel and accepted action with the existing authoritative checks. Cover the same parent-details → recovery child path and ensure focus stays inside the child, then returns correctly after closing. Existing pointer-click acceptance does not exercise this failure.

**Discarded preliminary evidence:** `/tmp/down-to-duck-06-review-modal-tab.log` initially suggested the compact Controls/Gear → Mud Splash dialog was persistently trapped. It froze RAF immediately after opening. A settled follow-up (`/tmp/down-to-duck-06-review-modal-tab-settled.log`, session 95839 exit 0) traverses target → Back → Use correctly after 100 ms. That preliminary journey is **not** the blocker; the participant-details reproduction above remains broken after settling.

### WR-01 — WARNING: Controls page live region is rewritten every render

**File:** `/Users/sandwich/Develop/crossy-road-clone/src/run-hand.ts:30` (live-region creation at line 16; caller `/Users/sandwich/Develop/crossy-road-clone/src/main.ts:1119`).

**Issue:** `createSharedControlPages.update()` assigns the page label's `textContent` before checking `mounted === page`. `updateHud()` invokes it repeatedly while the disclosure is open, including paused time. The label has `aria-live="polite"`, so unchanged rendering continually replaces its live text. This violates the contract's change-only announcement semantics and risks repeated assistive-technology notifications. It is not merely a performance concern.

**Independent evidence:** Real Race setup, 240×240, open Controls, attach a MutationObserver to `#session-control-pages nav span`, advance 1000 ms without changing page. Observed **62 mutations**, before/after text both **Play**, `aria-live=polite`. Terminal session **50604**, exit 0, `/tmp/down-to-duck-06-review-live-label.log`. Actual screen-reader speech was not measured; the repeated live-region mutations are proven.

**Fix:** Compute the next page label and update `textContent` only when its value changes. Keep the existing live-region semantics for real page changes. Add a focused observer assertion for zero mutations on unchanged frames and one meaningful update when changing pages; no redesign is required.

## Review coverage and evidence limits

Reviewed production reparenting and restoration of the original controls/hand, owner/context and mode authority, pause/minimum-frame restoration, market/inventory continuity, shared-only renderer viewport, exact solo default, and geometry-observer reliability. The read-only observer uses actual production traveler render calls and the actual projection; it does not introduce a replacement renderer. New mode/base assertions distinguish real Survive Arcade/Flow from generic local play. Existing component-arranged histories and public-input journeys remain separately identified in `06-EVIDENCE.md`; this review does not relabel arranged acquisitions as actual-input proof.

The retained final gate `/tmp/down-to-duck-06-02-final-frozen-gate.log` (session 21972, exit 0) covers exact Relay Gate 6 then Race Gate 7, health runtime once, cross-mode 27/27 and diff check. It was inspected as supporting evidence and was not gratuitously rerun. It does not cover CR-01's settled native forward-Tab sequence or WR-01's new live label. No other concrete blocking finding was established in the scoped changes. Prior repaired controller terminal routing and shared authority checks remain in the retained tests.

Both independent browser probes used the existing muted fixture. No installation, dependency/lockfile change, oracle repin, or preview 5175 change occurred. Immutable solo oracle remains `a310a81ed6c76df4b265c9012c23b8c83f4802e5`. Conformance remains 5 pass / 0 fail / 5 unmeasured; manifest/wire/lifecycle evidence and physical-controller behavior remain unmeasured. Human visual/feel acceptance is pending. This is a code-review handoff, not phase verification or phase completion.
