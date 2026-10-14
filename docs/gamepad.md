# Controller input

Down to Duck accepts a standard controller through the shell's optional NAP-GAMEPAD
domain. Keyboard, pointer, swipe, and on-screen controls remain available.

| Control | Action |
| --- | --- |
| D-pad or left stick | Hop; navigate the collection while it is open |
| Bottom face button (A / Cross) | Start, hop forward, resume, retry, or select the focused control |
| Left face button (X / Square) | Make the traveler's call |
| Start / Menu | Pause or resume; close the collection |
| Top face button (Y / Triangle) | Open or close the collection |
| Right face button (B / Circle) | Close the collection, or pause the run |

The shell transport delivers the complete bounded snapshot, including every
standard controller slot. It does not choose an active controller. `GamepadRouter`
owns one latch, stick hysteresis, repeat timer, context baseline, and short-lived
lease for each standard pad. A lease is `{ index, sanitized id, epoch }`: the index
is only the current shell slot, never the durable player identity. Unknown mappings
are inactive rather than guessed. The left stick activates at 0.5 and releases at
0.3; each device repeats after 280 ms and then every 160 ms, at most once per update.
Face buttons and Start are edge-triggered per device.

A fresh button, D-pad, or stick edge from an unassigned controller requests Local
Play once and is consumed before it can hop, confirm, pause, call, buy, or select a
character. An idle extra controller does nothing. The roster decides whether it has
capacity and may reject that edge while still consuming it. Assigned pads route
through a stable seat-aware dispatch sink; controller calls and menu actions retain
their seat identity for the session UI.

When a pad vanishes, the router clears only that pad's held/repeat state and emits a
mode-facing device lifecycle record. Modes decide whether the player is a ghost,
may reclaim, skips a turn, or is eliminated; controller loss never chooses a global
pause. Reusing an index with a different sanitized ID disconnects the old lease
before the new one is seen. A same-index/same-ID return is a seeded explicit reclaim
offer, never an automatic seat swap; held controls must be released and pressed
again before reclaim or play. Browser/shell focus loss, hidden frames, an undersize
surface, modal ownership changes, seat assignment, and teardown seed or clear all
relevant latches. Global focus and size safety remains the separate pause policy.

The original one-controller callback adapter remains for solo callers. Plan 02-05
will construct the router and connect it to the frame loop; the transport-only
browser regression does not claim that integration. Audio still follows the
browser's user-activation policy: a shell that cannot transfer activation may
require one click/tap/key in the napplet before sound.

## Temporary package bridge

The implementation follows the **draft** [NAP-GAMEPAD proposal #108](https://github.com/napplet/naps/pull/108),
pinned to [0b28f77e3dfa0f07dd7c0f9d61a7090ee99f3a5e](https://github.com/napplet/naps/blob/0b28f77e3dfa0f07dd7c0f9d61a7090ee99f3a5e/naps/NAP-GAMEPAD.md),
and the current [NIP-5D transport](https://github.com/nostr-protocol/nips/pull/2303).
The installed `@napplet/sdk` 0.29.0 does not export this domain. The user requested
a temporary implementation for that package gap; it lives entirely in
`src/gamepad.ts` and is not a new private protocol or runtime implementation.

The adapter first uses an injected gamepad binding's `getGamepads`, `available`,
`focused`, and `onChange` surface. That shape is present in the proposal's
[napplet.soy implementation](https://github.com/hzrd149/napplet-soy/blob/feat/gamepad-isolation/packages/runtime/src/prelude.ts).
If the runtime explicitly exposes a gamepad domain object without the binding,
the temporary transport sends `gamepad.subscribe` and receives `gamepad.state`.
It sends `gamepad.unsubscribe` on teardown. These three messages have no request
ID. Incoming wire snapshots must originate from the iframe's actual parent;
malformed or oversized data cannot keep a direction held.

An absent injected domain means no subscription, probe, or gamepad input. The
adapter never installs or modifies `window.napplet`, reads native controller
APIs, accesses host DOM, polls the shell, or adds `gamepad` to required domains.
Device access, focus routing, and permissions remain shell responsibilities.
No dependency on `shell`, storage, identity, or key registration gates input.

When the SDK implements this draft, replace only the transport portion of
`createGamepadControls` with its typed helper. Preserve `GamepadInput`, action
callbacks, focus safety, and regression tests. Remove the marker-only wire path
once supported runtimes inject a complete binding.

## Verification

- `node --test tests/gamepad.test.mjs tests/session-input.test.mjs`: parser and
  authorized bridge behavior, full-snapshot delivery, two independent device
  leases/repeats, join consumption, replacement, reclaim, capacity, focus safety,
  malformed input, and teardown. The session-input test composes real transport,
  router, and `LocalSession` objects; it is not a `main.ts` integration claim.
- `pnpm build && node tests/gamepad-runtime.mjs`: muted, transport-only production
  regression in a real opaque `allow-scripts` iframe. It proves the injected binding
  and draft wire paths, subscription teardown, parsing, and absent-domain fallback;
  it does not prove shared-session routing through `main.ts`.
- Evidence: `artifacts/gamepad-runtime.json`.

The inspected local Kehto/Paja checkout does not implement NAP-GAMEPAD, so it
continues to use fallback controls. The automated shell fixture verifies the
transport contract; it is not evidence of physical controller hardware, shared
session wiring, or gamepad support in that Kehto version.
