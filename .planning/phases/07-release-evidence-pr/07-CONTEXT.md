# Phase 7: Release Evidence and PR — Context

**Mode:** Complete the authorized multiplayer milestone and open its review PR.
**Dependencies:** Verified Phases 1-6; all mechanics and interfaces implemented.

## Stop condition

All requested modes and behavior are implemented, broad meaningful coverage is
green, required checks pass, visual proofs are inspected and included, requirement
traceability is current, and a reviewable PR against `main` is open. Do not mark
the goal complete while any required behavior or evidence remains missing.

## Required evidence

- Reconcile every requirement in REQUIREMENTS.md and every clause in the verbatim
  USER-REQUEST.md against current production behavior, tests and visual evidence.
  Plans, names, source scans, mocked UI transitions, and documentation alone are
  not proof of implementation.
- Preserve the immutable original solo oracle
  `a310a81ed6c76df4b265c9012c23b8c83f4802e5`. Later checkpoints may supplement it
  but must never replace or silently repin that source.
- Measure production coverage for rules, shared simulation, ownership, controller
  and keyboard state machines, all three modes, personal revival, consumables,
  lifecycle and results. Set and enforce explicit high thresholds, review every
  meaningful uncovered branch, and include adversarial boundary/ordering cases.
  Do not raise percentages with tests that merely repeat implementation details.
  Read `../../research/COVERAGE-PROBE.md`: the current temporary/data-URL loaders
  can yield empty or harness-only 100% reports. Preserve correct source maps
  through glob expansion, inventory expected production modules, calibrate the
  executable-line denominator, and fail on missing source coverage.
- Run the exact canonical gates from each verified phase. Required final gates
  include type-check, production build, guidance and conformance; model/legacy
  and deterministic course regressions; original solo differential and pixel
  comparisons; per-mode tests; and built opaque-iframe user flows.
- Record conformance evidence skips explicitly. Unresolved manifest, unmeasured
  teardown or missing wire evidence is not a passing check. Provide fixture
  evidence where feasible and distinguish any physical-controller limitations
  from injected runtime/controller proof without fabricating either.
- Inspect saved visual proofs for setup, all-character HUD, shared hand/market,
  consumable selection/use, co-op recovery, Relay transfer/loss/wait/reclaim,
  Race fog/offense/defense, and every mode's results and podium.
- Use supported compact, regular, short and wide frames, both runtime themes,
  reduced motion and optional-domain absence. All automated browser playback
  remains muted. No production-only test hooks or forbidden native APIs.

## Delivery

Work remains on the existing feature branch, `feat/local-multiplayer`; do not
reset or replace the user's repository history. Keep coherent atomic commits
and committed GSD plans, summaries, reviews, verification and final traceability.
Reconcile concurrent edits rather than discarding another agent's work.

Open the requested PR against `main` once the result is concrete and verified;
the user already authorized this action. Its title and description must explain
the final product behavior, compatibility, test evidence and any material limits
for a reviewer without conversation context. Include usable visual proofs in
the PR or durable linked artifacts: local ignored `artifacts/` paths alone are
not sufficient for a remote reviewer. Do not merge, deploy, publish a napplet,
or send external messages beyond the authorized PR as part of this task.

Repository credentials and local `.napplet/config.json` stay ignored. Do not
print their values or include them in logs, screenshots, commits or PR content.
