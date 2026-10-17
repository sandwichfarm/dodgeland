# Development replacement retires multiplayer ownership

## Retained RED

Source review found `main.ts` development `replaceGame` assigned the new Game
without retiring localSession, Relay/Race coordinators, input leases or their
callbacks. The inspector consequently described the new Game while the normal
session render/update path retained the old shared world.

The actual development opaque-frame suite now enters Local Play using its
visible controls, then uses the score-jump and seed-load controls. A replacement
is already documented in-product as starting a fresh sandbox run. It must
retire the old session, restore solo input to the inspected world, and preserve
the sandbox lifetime-record guard. No private model writes are used by this
new regression.

Fresh `pnpm build:dev` followed by the artifact-preserving ordinary strict
browser suite failed in command74835, exit1: `jump retires the previous
multiplayer world and its HUD`, actual visible=true, expected=false, at
`tests/devtools-runtime.mjs:251`. Original suite assertions passed up to this
new case. The load case has not executed yet. Logs:

- `/tmp/down-to-duck-07-03-devtools-session-red-build.log`
- `/tmp/down-to-duck-07-03-devtools-session-red.log`

The wrapper restored the original artifacts and checked normal dist unchanged;
retained new outputs are in `/tmp/down-to-duck-07-03-devtools-artifacts-1792205930214`.
This is a real product counterexample, not a fixture failure or invented RED.

## Narrow repair ownership

Root owns only the development-gated `src/main.ts` replacement callback and
this existing runtime test. Reuse the existing reset transaction to dispose
session/coordinator/input ownership and establish fresh solo callbacks, then
adopt the already-generated paused candidate with those fresh callbacks and
reinstate sandbox mode. Keep its seed, course, traveler and position intact.
This adds a short-lived reset Game only inside development replacement; it
does not alter production gameplay or introduce a second live owner. Keep
production stripping checks and verify the normal artifact is unchanged.

After the repair, rerun the full ordinary devtools suite, canonical scoped
production/development proof and required checks. A changed main source pin
requires explicit browser-call-closure review before canonical projection;
never merge its new schema with initial main counters. Release floors and
the wider development stratum remain open.
