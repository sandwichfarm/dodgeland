# 07-12 compact pause layout ownership addendum

Root authorizes a narrow production CSS repair in `src/pause.css` under the existing autonomous multiplayer/release goal. The executor additionally owns that exact file. The already-owned coverage manifest may add a focused pause collection group. No input, game rules, simulation, HTML copy, protocol or test assertion changes are authorized by this addendum.

## Confirmed defect

Full collection51274 exited1 after63 production jobs passed. Run `1d412486-f52d-4ef1-a2c9-6d8da5bdf813`, frozen source/test/toolingef3d1c6, log `/tmp/down-to-duck-07-12-full-collection-final.log`. Cross-mode33/33 and the repaired same-board layout6/6 with24 rows passed in this run. `tests/pause-game-layout.mjs` then failed its original no-overflow assertion at dark240×240: pause-content188×70, scrollHeight81, overflow visible.

Root inspected the actual failure capture: the216×216 centered panel has a two-line Local Play button beside Travelers. The bottom row grows to57.8px, leaving70px for81px of pause content. The test awaits document.fonts.ready, verifies Lilita One loaded, advances the fixture and finishes finite animations before measuring. The existing compact CSS gives Travelers width100% inside a flex bottom row; the additional Local Play action is crowded.

Ordinary fresh-build reproduction99263 also exited1 with the identical11px overflow and loaded font. Log `/tmp/down-to-duck-07-12-pause-ordinary.log`; generated evidence `/tmp/down-to-duck-07-12-pause-ordinary-evidence/`. All27 prior ordinary artifacts were byte-verified restored by the real preservation helper. The older complete ordinary report lacks source identity and cannot override this current RED. No collection or diagnostic process remains active at this checkpoint.

## Repair limits

Rebalance the compact pause bottom-row allocation/padding so Travelers and Local Play remain fully readable on one line at the declared240×240 floor. Preserve the game's explicit large-type aesthetic, existing font sizes,44px minimum hit targets, both actions, centering, tint, themes, focus visibility and all larger layouts. A compact-scoped grid or equivalent bounded flex allocation is appropriate; choose from actual browser geometry.

Do not hide or truncate a label, remove an action, shrink typography, add scrolling, clip overflow, increase the minimum frame, reduce the test matrix or weaken its existing assertions. Do not edit `tests/pause-game-layout.mjs`: its unchanged complete behavior is the regression proof. No oracle repinning, root lock change, source-counter suppression or production test hook.

Apply the installed napplet-ui layout guidance with this game's explicit user-approved large controls/type overriding the generic13px starter defaults. The existing240×240 minimum remains authoritative; below it the existing notice must remain correct.

## Verification

Retain both instrumented and ordinary RED evidence. After the CSS repair, run the unchanged complete pause suite against a fresh ordinary build with exact artifact preservation, and the complete suite under canonical production instrumentation using the focused group. Preserve all24 frame/theme cases, every character power/rules page, frozen clocks, focus/Tab/SDK controls, resize persistence, reduced motion and return from the collection. Inspect the corrected240×240 captures in both themes and representative200×160,320×560,900×600 and2400×1200 evidence; retain exact source/build identity and distinguish minimum notices from working frames.

Run required type-check, build, guidance and conformance checks; report conformance's measured versus unmeasured scopes honestly. Obtain independent review of the CSS scope, original assertion preservation and ordinary/instrumented results. Tests/builds/browser commands remain sequential, muted, and preserve ordinary artifacts and preview5175. Once focused proof and review are clean, freeze the final source/test/tooling commit and run the complete collection under a new durable log/run identity. Prior partial collections remain failure evidence, never complete coverage or release success.07-03 still requires07-12's complete initial report.
