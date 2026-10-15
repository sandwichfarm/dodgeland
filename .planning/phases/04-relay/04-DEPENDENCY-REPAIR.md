# Shared participant-score repair

Relay01 exposed a dependency defect in the primary Game compatibility facade: secondary seats used earned movement, but P1 used spatial maxY for power cooldown, run score and healing. After a P2→P1 baton transfer, P1's cooldown fell99→98 without earning a tile; its next hop fed inventory score3 despite only2 earned tiles. The checkpoint intentionally retained both failing regressions.

Root repair `fdad9f0` remains in the generic shared engine:

- `SessionPlayer.scoreBaseline` captures primary solo progress at session start, separately from session-earned distance. Repeated start does not rebase it.
- `personalScore` uses retained baseline plus earned movement for active participants; ordinary solo retains maxY behavior.
- `Game.scoringPlayer/currentScore` uses the same personal score for player operations and primary-facade power presentation outside an operation. Real accepted new-frontier movement increments the scoring participant once.
- Contribution distance uses personal score. Spatial maxY stays responsible for course generation, safe placement and preventing repeated spatial credit.
- No Relay-local offset, duplicate clock, inventory or recovery authority was introduced.

## Evidence

- Existing Relay dependency RED:2pass/2fail, `/tmp/down-to-duck-04-01-dependency-red.log`.
- New generic regression performs98 real solo hops, consumes Butter's actual water power, cancels then commits adoption, transfers to a distant safe bank through `transferPosition`, and verifies actual99/100 progression without skipped healing/invitations/power credit. Before repair it failed201vs99: `/tmp/down-to-duck-personal-score-red.log`.
- Focused player/lifecycle/recovery suites,3 Relay model cases and type-check passed: `/tmp/down-to-duck-personal-score-focused.log`. Strengthened repeated-start/adoption check passed in `/tmp/down-to-duck-personal-score-adoption.log`.
- Final complete command `pnpm test:phase3 && node tests/strict-node-tests.mjs tests/relay-tracer.mjs`, root session78662 exit0, `/tmp/down-to-duck-personal-score-full-gate.log`. Includes immutable solo parity21, solo regressions271, shared model73, all inherited runtime/layout/smoke/conformance checks, recovery44, final Phase03 browser34 and Relay4/4. Type-check/build/guidance/immutable lockfile passed.
- Conformance remains5pass/0fail/5unmeasured; physical controller behavior remains unmeasured. Browsers muted, no package/protocol/preview/publishing changes.

This resolves the shared dependency checkpoint only. Relay01 Task1's remaining acceptance and all Task2 work still belong to the executor; no Relay completion is implied.
