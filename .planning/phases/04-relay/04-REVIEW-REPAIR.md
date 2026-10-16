# Phase 04 review repair: CR-01

Generic executor fallback applied the previously loaded GSD executor role/workflow and napplet skills. This is not typed-agent execution. Review `d6d9e9e` independently reproduced CR-01 in `/tmp/down-to-duck-04-review-handoff-controls.log`; its exit0 meant successful defect reproduction, not acceptance.

## Repair

`createRelayHandoff` explicitly identifies its incoming actor and Start control. `relayConfirmControl` activates the focused control: read-only View/roster/Back controls cannot accidentally start a leg. Start requires the incoming seat and invokes the rendered callback with its original confirmation ticket. Coordinator frame, identity and lifecycle checks remain authoritative. Connected seats can navigate the handoff's visible controls with controller directions; forward retains the existing direct-start shortcut. Enter/Space consume one fresh edge, select a keyboard actor, and never leak into a gameplay action. Controller-owned Start cannot be activated by the other keyboard seat. Terminal result navigation still works after keyboard participants have departed.

Owned production changes are limited to `src/main.ts` and `src/relay-ui.ts`; retained browser evidence is in `tests/relay-runtime.mjs`. No geometry, economy, recovery or session authority service changed.

## RED/GREEN and commits

- `77097b9`: retained three actual-input RED regressions. Session95702 exit1, `/tmp/down-to-duck-04-review-controls-red.log`: Enter/Space failed to open View; controller direction failed to move focus from Start.
- Session48222 exit0, `/tmp/down-to-duck-04-review-controls-focused.log`: three new focused cases plus build/type passed.
- `52f8e0d`: coherent focused-control repair and terminal keyboard navigation regression. Session58029 exit0, `/tmp/down-to-duck-04-review-controls-complete.log`: full runtime12/12 + tracer12/12, build/type passed.

New actual keyboard tests use Tab, Enter and Space to activate View, Next, Previous, Back and Start, verify unchanged positions during read-only navigation, consume held confirmation without an incoming hop, then navigate terminal results and retry using keyboard. The controller test uses shell snapshots to navigate/confirm the read-only roster, rejects held confirm across the boundary and the wrong keyboard seat's Enter/Space/forward, then permits fresh incoming Start without a hop. Existing tracer tests for stale lifecycle tickets, held inactive controller input, forward confirmation and fresh return remain unchanged and passed. All browsers use the existing muted opaque-iframe fixture. No private world arrangement was added to these new cases.

## Historical WINDOWS1

Closed as fixed, not waived, using the independent review's evidence. `Game.operationFor` (`src/game.ts:228`) caches a stable secondary receiver whose personal accessors target that participant; shared accessors target the host. `inPlayerOperation` (`src/game.ts:251`) does not temporarily rebind host properties and restores the primary operation marker in `finally`.

The historical scenario is retained in `tests/local-session.test.mjs:40`, `reentrant P2 reward callback dispatches P1 through its explicit operation context`: P2's callback observes P1, dispatches P1 forward and pauses the host, while P2 remains unmoved/unpaused. Review command `node --test --test-name-pattern='reentrant P2 reward callback' tests/local-session.test.mjs` passed1/1 with no skips; `/tmp/down-to-duck-04-review-windows1.log`. The final inherited shared-session gate also includes this unchanged test. No new source repair was necessary for WINDOWS1.

## Limits

No dependency/install/lockfile change, oracle repin, native polling, direct network/storage, product test control, publication or merge. Preview5175 untouched. Conformance remains5 passed/0 failed/5 unmeasured (manifest3, wire1, lifecycle1); physical controller hardware is unmeasured. This repair does not mark Phase04 or the milestone independently verified; Race, presentation, audits and PR remain required.

## Final verification

Exact Gate6 **89260 exited0** on frozen source `52f8e0d`; whole-command durable log `/tmp/down-to-duck-04-review-repair-final-gate.log`. Command matches04-VALIDATION Gate6: full `pnpm test:phase3` (including exact Phase2/Phase1), the four Relay suites, type-check/build, runtime, layout, guidance, conformance and immutable-oracle lockfile comparison.

Passed: solo21/21, regression271/271, shared models73/73, recovery44/44, Survive browser34/34, Relay65/65, runtime12/12, layout1/1 with252 captures and zero layout failures, guidance6/6, type/build and unchanged lockfile. All behavioral groups report zero failures/cancellations/skips/todos. Conformance remains5/0/5 as documented above.

No build/browser/test process remains active. Worktree source is committed; this note and WINDOWS ledger closure are documentation only. CR-01 is repaired with retained production regression evidence; independent review/phase verification remains the orchestrator's next step.
