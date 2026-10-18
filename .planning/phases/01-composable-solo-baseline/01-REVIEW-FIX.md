---
phase: 01-composable-solo-baseline
fixed_at: 2026-10-14T22:15:00-07:00
review_path: .planning/phases/01-composable-solo-baseline/01-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-10-14T22:32:00-07:00  
**Source review:** `.planning/phases/01-composable-solo-baseline/01-REVIEW.md`  
**Iteration:** 1

**Summary:**

- Findings in scope: 3
- Fixed: 3
- Skipped: 0
- Commits: none — parent-directed shared-worktree handoff; executor04 will make the integration commit.

## Fixed Issues

### CR-01: The ordinary Play control never emits the authored `start` lifecycle event

**Files modified:** `src/game.ts`, `src/main.ts`, `tests/mode-authoring.test.mjs`, `tests/health-runtime.mjs`

**Applied fix:** Added `Game.start()` as the sole ready-to-playing transition. Both game movement and the real Play path use it; the transition does not move the traveler and only emits `start` once.

**Evidence:** The source-backed integration test passes for stationary start, one lifecycle emission, and a subsequent real move. The muted production-browser test now wraps the live game only through its debugger scope, clicks `#play`, and asserts one stationary `Game.start()` transition. Executor04 owns its fresh-build execution.

### CR-02: Valid custom maximum health is rendered as a three-feather meter with an invalid ARIA maximum

**Files modified:** `src/main.ts`, `src/solo-ui.ts`, `src/styles.css`, `tests/solo-ui.test.mjs`

**Applied fix:** The Pluck meter is rebuilt whenever a game is installed. Its clip count uses `ceil(maxHealth)`, ARIA maximum uses the exact rule value, and its title reflects active health rules. The default three-feather composition and wording remain unchanged. Capacities above five use a five-column compact grid, so the supported maximum ten is visible in two rows.

**Evidence:** `tests/solo-ui-browser.test.mjs` creates real `Game` instances from composed rules, passes their active rules through the same production DOM installer used by `main.ts`, and runs the installed meter in muted Chromium at 240×240. It verifies default 3, full 4, fractional 2.5 (including the half final clip), and maximum 10 (five computed grid columns, ten clips, and no overflow).

### WR-01: Ready-screen rules copy advertises pursuers when the active policy disables them

**Files modified:** `src/main.ts`, `src/solo-ui.ts`, `tests/solo-ui.test.mjs`

**Applied fix:** Extracted policy-derived ready copy that combines wave visibility and pursuer enablement independently. Arcade and Stroll retain their existing strings; wave-only and pursuer-only configurations now describe only what is enabled.

**Evidence:** Focused source-backed UI-policy coverage passes all four combinations.

### Follow-up: Chase meter timing is policy-derived

**Files modified:** `src/main.ts`, `src/solo-ui.ts`, `tests/solo-ui-browser.test.mjs`

**Applied fix:** The chase meter now derives its ARIA maximum and fill fraction from `rules.pursuit.warningSeconds`, preserving the default five-second behavior and avoiding division by zero for a zero-second threshold.

**Evidence:** The muted browser DOM installer coverage verifies a custom eight-second threshold and the zero-second boundary.

## Validation

- `node --test tests/mode-authoring.test.mjs tests/solo-ui.test.mjs` — 8 passed, 0 failed.
- `node --test tests/solo-ui-browser.test.mjs` — 1 passed, 0 failed; hardware-muted Chromium, ephemeral production-module installer bundle, real composed `Game` rules, and installed DOM assertions.
- `pnpm type-check` — passed.
- `node --check tests/health-runtime.mjs` — passed.
- `pnpm test:solo-parity` — passed before final handoff; immutable baseline comparison remained clean.
- `git diff --check` — passed.

Fresh `dist` build and the broader `tests/health-runtime.mjs` execution remain with executor04, which held build ownership during this fix.

---

_Fixed: 2026-10-14T22:32:00-07:00_  
_Fixer: the agent (gsd-code-fixer)_  
_Iteration: 1_
