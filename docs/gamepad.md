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

The lowest connected standard controller index becomes the active controller;
it stays selected until disconnected. Unknown mappings are left to the existing
controls instead of guessing hardware-specific button positions. The left stick
uses a 0.5 activation threshold and 0.3 release threshold, with one direction per
hop. Held directions repeat after 280 ms and then every 160 ms, with no burst
after a delayed frame. Face buttons and Start act only on a new press.

Taking controller focus away, hiding the frame, disconnecting the controller,
or shrinking below 240×240 pauses the run and cancels held input. Returning to
the game never treats an already-held button as a fresh press. State changes
such as death, retry, and opening a menu also suppress carried-over input.
Audio still follows the browser's user-activation policy: a shell that cannot
transfer activation may require one click/tap/key in the napplet before sound.

## Temporary package bridge

The implementation follows the **draft** [NAP-GAMEPAD proposal #108](https://github.com/napplet/naps/pull/108),
pinned to [0b28f77e3dfa0f07dd7c0f9d61a7090ee99f3a5e](https://github.com/napplet/naps/blob/0b28f77e3dfa0f07dd7c0f9d61a7090ee99f3a5e/naps/NAP-GAMEPAD.md),
and the current [NIP-5D transport](https://github.com/nostr-protocol/nips/pull/2303).
The installed `@napplet/sdk` 0.24.4 does not export this domain. The user requested
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

- `node --test tests/gamepad.test.mjs`: snapshot validation, both adapter paths,
  no-domain behavior, physical button mappings, deadzones, held repeats, stable
  controller indices, focus/visibility/context changes, and teardown.
- `pnpm build && node tests/gamepad-runtime.mjs`: unchanged production module in
  a real opaque `allow-scripts` iframe with a canonical shell fixture, testing
  start, movement, calls through actual generated audio, pause/resume,
  collection navigation, focus loss, disconnect/reconnect, retry, small frames,
  teardown, and fallback controls. Uses debugger-staged clear terrain and a
  deterministic death; it does not rewrite the bundle or add production hooks.
- Evidence: `artifacts/gamepad-runtime.json`.

The inspected local Kehto/Paja checkout does not implement NAP-GAMEPAD, so it
continues to use fallback controls. The automated shell fixture verifies the
napplet protocol and gameplay integration; it is not evidence of physical
controller hardware or gamepad support in that Kehto version.
