# 07-12 live layout journey ownership addendum

Root authorizes a narrow fixture-lifecycle and test-organization repair in `tests/local-session-layout.mjs` under the existing autonomous release goal. The executor additionally owns this file for the work below. No production, renderer, input-policy, CSS, coverage-floor or private gameplay-state change is authorized.

## Preserved failure evidence

Full collection23954 terminated with exit1 after40 production jobs passed, including all33 cross-mode presentation cases. Run: `7ab0e995-dc59-4217-a5a5-e0231178247c`; source/test/tooling: `06ce671`; durable log: `/tmp/down-to-duck-07-12-full-collection-verified.log`.

The original single local-session layout case exceeded its120-second test deadline. Its archived `suite-artifacts/local-session-layout/local-session-layout.json` contains19/24 matrix rows: all12 setup rows, all6 dark HUD rows, and only the light200×160 HUD row. Recorded errors and deficiencies are empty, but `failure` is an8-second `frame.waitForFunction` timeout. Root inspected `local-session-layout-failure.png`: the frame shows the terminal “The flock's run” results, P1 Butter Down, Hops0. Thus the subsequent light240×240 resume awaited a playing state after the run had ended. This is not evidence that the missing five layouts passed, nor solely a slow-host problem. Preserve this failed run unchanged.

## Authorized repair

Retain one real browser, opaque iframe, four-seat acquisition and live board throughout. Organize the existing sequential journey into independently bounded subtests, each retaining the existing120-second deadline:

1. Real four-seat setup, compact Roster/Traveler/Controls tabs, selected P3, and same-board keyboard editor/page/focus round trips.
2. All six setup frame sizes in both themes, retaining the live dark-to-light theme change.
3. Start and dark HUD matrix, including the original200→240 safety/resume path and short inspection/native held-key/fresh-key/resize safety journey.
4. The same-board light HUD matrix, including its200→240 safety/resume path.
5. Reduced-motion proof and aggregate24-row, error and deficiency assertions.

Use the existing visible Controls/Tools/Pause and Resume actions to suspend simulation during repeated static geometry, text, detail-page and screenshot measurements. Explicitly resume for every original assertion requiring active play, focus retention across live updates, detail opening from play, held-key suppression, fresh movement, and safety restoration. Preserve the original assertions of those active states and their subsequent outcomes. Resume for the reduced-motion live HUD check. A pause helper must reject terminal state rather than silently treating it as paused. No direct state/time/position writes, artificial invulnerability, altered seeds, removed actions or frame reloads.

Preserve all24 setup/HUD frame-theme combinations, original metric predicates, exact screenshot names, normal evidence fields and canonical realm identity/collection. Record actual run state and identify deliberately paused layout captures versus active input segments; do not label static paused captures as live-input proof. Do not weaken any target-size, contrast, clipping, scroll, identity, personal-field, noninteractive-slot, scene-area, focus or lifecycle check. No per-frame reload may replace same-board resize/theme continuity.

Parent orchestration must fail closed when any stage fails or aborts: later stages must not run against an incomplete prerequisite. Mark a stage complete only after its assertions and abort check; mark the aggregate complete only after every required stage, all24 rows, assertions and successful cleanup. Retain useful partial evidence on failure without a false completion flag. Do not increase any per-stage deadline, filter out a case, suppress an assertion or credit an aborted stage.

## Verification and closure

The preserved terminal run supplies the real failure. Review the narrow diff and its assertion/continuity mapping independently. Run the actual complete layout suite with canonical production instrumentation as focused proof before another full collection; register a narrow named collector group in the already-owned manifest if needed, preserving all full-inventory obligations. Do not manufacture a product RED for a test-lifecycle defect. After the focused case passes, run the complete collection under a new durable log/run identity, retaining every actual job and all failed-run provenance. This checkpoint does not complete07-12 or establish any coverage floor.
