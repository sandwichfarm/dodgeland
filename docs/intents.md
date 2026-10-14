# Game intents

Down to Duck advertises the `game` role and accepts the exact convention
`napplet:game/open`. This uses the existing NAP-INTENT delivery interface; it
does not add a NAP, message domain, or wire format. `intent` is optional, so a
runtime without intent delivery still supports normal play.

The payload below is Down to Duck's local convention contract, not an upstream
standardized game payload. The upstream NAAT registry is deprecated and role
names need no registration. Protocol references are pinned to the revision
checked for this integration: [NAP-INTENT](https://github.com/napplet/naps/blob/3fdba1accd508ab54939b277d426127c5af8faf8/naps/NAP-INTENT.md)
and [archetype registry deprecation](https://github.com/napplet/naps/blob/3fdba1accd508ab54939b277d426127c5af8faf8/ARCHETYPES.md).

## Accepted payload

| Field | Type | Meaning |
| --- | --- | --- |
| `seed` | Optional string | A complete, valid `ph1-…`, `ph2-…`, or `ph3-…` course code. |
| `mode` | Optional string | Exactly `arcade` or `stroll`. |

No payload or an empty object opens the existing surface without replacing a
run, changing a menu, or starting play. A seed prepares that exact course: its
schema, starting world, game mode, and gentle-start choice remain authoritative.
When both fields are present, `mode` must agree with the mode encoded in the
seed. A mode-only request prepares a new course using that mode, the current
preferred starting world, and the existing gentle-start choice.

Invalid payloads are rejected before game state or saved preferences change.
Seed and mode are launch options, not preference updates. Seed validation uses
the existing course decoder described in [seeds.md](seeds.md).

## Delivery and lifecycle

The app subscribes through `intent.onDelivery` from `@napplet/sdk`. It checks
the exact `archetype: 'game'`, `action: 'open'`, and
`convention: 'napplet:game/open'` fields and validates the untrusted payload.
The runtime supplies sender provenance and retains cold-start deliveries until
the listener registers. The subscription closes during app teardown.

A request with launch options prepares a course only when the game is ready or
the previous run has ended and its death-spill presentation has finished. The
new course stays ready for the player's first move; receiving an intent never
autoplays or resumes the game. A playing or paused run, open market, pending
pack choice, and ongoing death-spill presentation are preserved. Requests that
cannot replace the current run are not queued for later replacement.

An empty open remains harmless in every state. NAP-INTENT's successful invoke
result means the runtime accepted delivery responsibility; it is not an
acknowledgement that Down to Duck started a run. There is no invented game result
message, delivery acknowledgement, or INC fallback.

## Calling from another napplet

```ts
import { intent } from '@napplet/sdk';

await intent.open('napplet:game/open');
await intent.open('napplet:game/open', {
  payload: { seed: 'ph3-1234abcd-orchard-a-n', mode: 'arcade' },
  behavior: { focus: true, reuse: true },
});
await intent.open('napplet:game/open?mode=stroll');
```

Callers check the optional intent domain before invoking it. Query parameters
are text payload shorthand supplied by the runtime binding. Do not combine a
query with an explicit payload. Advertised convention identities are queryless.

The runtime resolves the user's game handler; this example does not force
Down to Duck to become the default or address another running instance.

## Metadata and verification

`vite.config.ts` and `.napplet/config.json` advertise the same role, convention,
parameter names, and optional domain. With `@napplet/vite-plugin` 0.16.0 the
generated manifest tags are:

```json
["z", "game"]
["i", "napplet:game/open", "seed", "mode"]
["O", "intent"]
```

`seed` and `mode` are parameter names, not types or required fields. `intent`
must not appear in a required-domain tag.

Build with signing disabled to verify metadata without accessing a signer:

```sh
env -u VITE_DEV_PRIVKEY_HEX pnpm build
```

Inspect the generated unsigned `dist/.nip5a-manifest.json` and the metadata embedded
in `dist/index.html`, checking the tags above and the absence of a required
intent domain. This builds local artifacts and does not publish them. Runtime
tests should cover optional-domain absence, cold and warm delivery, malformed
payloads, seeded replay, mode-only launches, active-run preservation, and
subscription cleanup. Browser tests remain muted.
