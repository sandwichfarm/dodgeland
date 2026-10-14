# Phase 1 plan review

**Reviewer:** independent gsd-plan-checker
**Round 1:** ISSUES FOUND — 3 blockers, 2 warnings. Execution has not begun.

## Required revisions

1. **Parity future state:** snapshot all future-affecting RunInventory state
   (RNG/fraction/max-score/sequence) and MobDirector state (RNG/spawn timers,
   retry/introduced kinds/IDs), not only visible samples. Compare after every
   operation/step. Prefer a test-only semantic adapter to existing TS-private
   runtime fields; do not add production test hooks solely for parity.
2. **Real drift sensitivity:** inject a deliberate one-sided semantic or callback
   perturbation at a named command/step through the actual trace/capture/compare
   entry point. Assert scenario/step/field or callback mismatch. Mutating a copied
   snapshot merely to prove assert.deepEqual throws is insufficient.
3. **Devtools active rules:** include src/devtools-state.ts and tests/devtools.test.mjs.
   Teleport/reconstruction currently imports WAVE_TRAIL; use the active definition
   and prove a custom definition survives a jump, while defaults preserve parity.
4. **Task size:** split the full differential matrix into bounded test slices
   (e.g. seeded movement/hazards vs economy/actors/mobs/terminal). Retain one
   aggregate parity command and full requested coverage.
5. **Pre-edit context:** all code-editing plans must read AGENTS.md,
   docs/context-map.md and applicable boundary/design/package-surface documents,
   and follow the relevant napplet workflow requirements.

Requirement IDs, acyclic dependencies and wave ordering passed the first review.
Re-review must prove the revisions are represented in executable task actions,
acceptance criteria and validation contracts before execution starts.

## Round 2

The independent checker accepted all five revisions and identified one remaining
blocker: private Game state also affects future behavior. Plan 01-01 and the
validation contract now explicitly require exact `powerReadyAt`, `powerNotice`,
`powerLandingGrace`, `healedMilestone`, ordered `touchingCars`, and retained-lane
`laneSpeeds` base/applied snapshots after every operation and step. Collision-latch
and live actor-speed-rebase arenas must exercise that state. Final independent re-review passed: all identified blockers are closed and the
four dependency-ordered plans are ready for execution.
