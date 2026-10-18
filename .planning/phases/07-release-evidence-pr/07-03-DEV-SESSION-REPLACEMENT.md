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

## Verified repair

The repair reuses `reset()` before adopting the prepared candidate and transfers
the freshly installed solo callbacks. Both actual public Local Play → score jump
and Local Play → seed load paths now retire the old HUD and restore keyboard
movement to the inspected world. The jump case additionally resumes, reaches
death through normal updates, and displays its own **DEVELOPMENT RUN**, score100
result. Neither path writes sandbox results into lifetime records.

Command96870 exited0 for type-check, production/development builds and the full
ordinary browser suite. The stronger terminal-callback assertion then passed in
command33795, strict1/1,22488.227ms, zero browser errors/external requests. The
artifact wrapper restored original output bytes and archived the new evidence at
`/tmp/down-to-duck-07-03-devtools-artifacts-1792206066429`.

Command44509 exited0: browser applicability/attribution negatives22/22,
canonical devtools browser1/1 plus component9/9, guidance7/7 and required
conformance. Canonical run `dc650cee-3b95-4b7f-9b31-48ac234e5926` contains seven
payloads: six browser realms (five genuine development, one production) and one
Node parent. Existing production stripping, hydration,12 frame/theme cases and
all previous assertions remain. Conformance reports five passes, zero failures
and five unmeasured checks; manifest, wire and lifecycle evidence is still the
separate07-04 obligation. No full release acceptance is claimed.

Logs use `/tmp/down-to-duck-07-03-devtools-session-` followed by
`type.log`, `build.log`, `dev-build.log`, `verified.log`, `negatives.log`,
`canonical.log`, `guidance.log` and `conformance.log`.

The normal production artifact remains byte-identical, raw SHA256
`ca774030d10eabe9dc9ed9780bf17422642874f7605bfdc26db6c116a6d86168`.
Root dependency lock remains
`5ac3c476e3049e2e9c3261b7a34b3b709d88fad3382277d4b38e0546f06ab58d`.
Main's new source identity is
`33be7291c0e3c14910039fdb8a1d44e895273f79e132f9a0c9873b3d3166add4`.
The independent browser-call review is recorded in
`07-03-BROWSER-SCOPE-FINDING.md`; its sole main pin was refreshed and the full
negative suite passed. Initial main counters retain their old identity and
must not be merged with this new schema.
