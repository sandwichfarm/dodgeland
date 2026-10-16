# Phase06 review repair — child focus and change-only announcements

Generic executor fallback applying the full local executor workflow. Independent review `f72c346` identified CR-01 and WR-01 on the completed presentation implementation. This repair leaves the review report unchanged and awaits independent re-review; it does not supply human acceptance or mark a phase complete.

## Reproduction and repair

**CR-01:** Retained actual-input tests open participant details → Leave Race at240×240, advance100ms to settle rendering, then use native Tab/Shift+Tab through both actions and both wrap boundaries. Enter and Space each cancel, restore the original owner action, reopen, and accept departure. Read-only observations preserve world time, other participants/economy, prior pause and held-movement suppression. A real Survive Flow details → recovery child proves traversal and original P2 action/focus return without changing inventory or time.

`localSetupKeydown` now returns for Tab while an existing lifecycle, recovery or Relay handoff board owns the modal. Each child retains its original native traversal/boundary trap. The parent remains mounted and inert; no duplicate trap, new authority, model mutation or focus-forcing test workaround was added. Existing owner/context validation and parent focus-return code are unchanged.

**WR-01:** A MutationObserver attached to the real Controls page label records zero changes across1000ms of unchanged paused rendering, then exactly one `Tools` change after actual Next controls. `createSharedControlPages.update` writes page label and owner heading text only when their values differ. The existing polite live region remains.

The withdrawn preliminary Controls/Gear probe is not used as evidence. The retained CR-01 journey is the settled participant-details case. Compact recovery already hides its redundant Resume action (`session-ui.css`); its actual visible focus order is Back → Leave → Back, with reverse wrapping. No layout change was made to invent an additional action.

## Commits and terminal evidence

| Commit / command | Outcome |
|---|---|
| `be71b19`,46381exit1 | Retained four REDs: both Race Tabs stuck on Keep racing, recovery Tab stuck on Back, live label rewritten62times. `/tmp/down-to-duck-06-review-repair-red.log` |
| 72714exit1 | First focused build/green3/4; remaining assertion incorrectly expected compact-hidden Resume. `/tmp/down-to-duck-06-review-repair-green.log`; not acceptance |
| 76264exit0 | Correct visible compact order; focused4/4. `/tmp/down-to-duck-06-review-repair-focused.log` |
| `b9bc44f`,92241exit0 | Frozen final bounded gate: cross-mode31/31, affected runtime/input104/104, guidance6/6, type/build/conformance/lockfile/diff checks. `/tmp/down-to-duck-06-review-repair-final.log` |

Final command:

```sh
pnpm type-check && pnpm build &&
node tests/strict-node-tests.mjs tests/cross-mode-presentation.mjs &&
node tests/strict-node-tests.mjs tests/session-input.test.mjs tests/keyboard-input.test.mjs tests/session-board-controls.test.mjs tests/local-session-keyboard-runtime.mjs tests/local-session-runtime.mjs tests/local-session-gamepad-runtime.mjs tests/survive-recovery-board-layout.mjs tests/survive-recovery-owner-runtime.mjs tests/survive-hud-controller-runtime.mjs tests/relay-lifecycle.test.mjs tests/relay-runtime.mjs tests/race-lifecycle.test.mjs tests/race-runtime.mjs tests/run-hand-runtime.mjs tests/solo-ui-browser.test.mjs tests/gamepad-runtime.mjs &&
pnpm test:guidance && pnpm test:conformance &&
git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml && git diff --check
```

Accepted entry21972 supplies the full prior exact Relay/Race gates; no gratuitous baseline repeat. The bounded current run covers the changed parent keyboard handler across shared keyboard/controller, recovery, hand, solo, Relay and Race paths, plus the complete cross-mode suite. No test filters or skips were used in final verification.

Conformance5pass/0fail/5unmeasured; physical controllers and actual screen-reader speech remain unmeasured. The observer proves DOM announcement changes, not spoken output. Browsers muted, preview5175 untouched, no install/dependency/lockfile/oracle changes. No active process or unresolved implementation finding in this repair; independent re-review and human visual/feel acceptance remain pending.

## Self-Check: PASSED

Both implementation commits and durable logs exist; final92241 reached exit0. Only the two authorized production files and retained cross-mode tests changed. No new stubs or trust-boundary surfaces.
