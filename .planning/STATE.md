---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 02
current_phase_name: shared-local-session
status: executing
stopped_at: "Phase 02 wave 2: controller router complete; shared mob policy regressions and keyboard runtime proof remain."
last_updated: "2026-10-14T23:53:00Z"
last_activity: 2026-10-14
last_activity_desc: Controller router complete with 28 focused tests. New world tests prove pursuit/card isolation and expose two shared mob policy defects. Model and keyboard executors remain active.
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 30
  completed_plans: 6
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-10-14)

**Core value:** Friends can join and play distinct, readable local modes without making solo play harder to start or changing its established mechanics.
**Current focus:** Phase 02 — shared-local-session

## Current Position

Phase: 02 — Shared Local Session
Plan: 2–4 of 6 (wave 2)
Status: Plan01 tracer checkpoint handed off; executing wave2, phase acceptance pending
Last activity: 2026-10-14 — Plan03 router complete at a315918/006ea02 with 28 focused tests and transport-only iframe proof. Model d7863f7 fixes callbacks/world frames; root regression 4dc82fc proves pursuit/card isolation but exposes mob freeze and terminal-primary retention defects. Current parity and keyboard runtime evidence are pending.

Progress: [██░░░░░░░░] 20% of currently planned plans (phase acceptance remains pending)

## Performance Metrics

**Velocity:**

- Total plans completed: 6 (Plan01 tracer checkpoint retains explicit model gaps for02-02)
- Average duration: 57.7 min for Plans 01-01 through 01-03 (Plan 01-04 duration not recorded)
- Recorded execution time: 173 min for Plans 01-01 through 01-03

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4/4 | 173 min for first 3 plans | 57.7 min for first 3 plans |

**Recent Trend:**

- Last 5 plans: 01-01, 01-02, 01-03, 01-04, 02-01
- Trend: Not established

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- [Phase 1]: Preserve exact fixed-step solo behavior against immutable baseline `a310a81`; route only policy constants through typed rules.
- [Phase 2]: One session owns terrain, simulation time, RNG, pickup claims, and camera policy; player slots own movement, health, inventory, powers, and stats.
- [Phase 3]: Keep existing 100-block innate powers separate from personal 250-tile revival and Revival/Flare consumables.
- [Phase 3]: Actual death clears only that player's run inventory; revival restores the character, while disconnect ghosts retain inventory.
- [Phase 3]: Joining Survive Together from solo adopts the existing world/player state; setup cancel resumes unchanged solo.
- [Phase 5]: Keep four seats, Flow as existing Stroll, and a 500-tile/180-second Race as validated provisional settings pending product confirmation/playtest.

### Pending Todos

- Finish Phase2 wave2: shared director policy and arbitration verification; native keyboard profiles/editor runtime proof. Controller router is complete.
- Phase 2 plans independently pass; reconcile live Phase 1 APIs and preserve per-seat call cues/cooldowns.
- Phase 3 UI contract and seven plans independently approved; execute only after verified Phase 2 with current API reconciliation.
- Relay UI/six plans and Race UI/seven plans independently approved; execution awaits their prior-phase gates.

### Blockers/Concerns

- Phase 1 is verified. The original `a310a81` model/render oracle remains immutable throughout multiplayer extraction.
- Phase2 ARCH-03 remains incomplete. Callback defects are fixed, but root tests prove P1 freeze leaks into shared mobs and dead P1 culls mobs beside living P2. Model executor owns fixes and actual nearest-target/contact arbitration tests. Broad solo gates must be rerun after final source fixes. See `tests/session-world.test.mjs` and the integration notes.
- NAP-GAMEPAD remains an authorized draft adapter; no native controller polling. Missing gamepad support must leave keyboard/pointer play available.
- Race fog tuning and the provisional seat/race defaults require later product confirmation, but no requested capability is deferred.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-10-14
Stopped at: Phase02 wave2 model and keyboard executors active; controller router complete. Root owns session-world regressions and parity session 2204 (/tmp/down-to-duck-phase2-world-parity.log). Keyboard retains shared build/browser reservation. No multiplayer mode is complete yet.
Resume file: None
