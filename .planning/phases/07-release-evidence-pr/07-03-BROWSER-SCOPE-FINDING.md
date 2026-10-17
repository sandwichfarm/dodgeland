# Browser-only legacy input scope finding

Read-only finding, not an implemented exclusion or accepted coverage result.
Graph discovery was attempted but this checkout is no longer in the available
graph index; targeted source/literal discovery supplied the evidence below.

The only production createGamepadControls call is main.ts1758. It always passes
the snapshot callback `(state, now) => router.receive(state, now)`. The factory
therefore sets its legacy input to null at gamepad.ts164. The shipped browser
application never constructs GamepadInput. Its instance fields/methods and the
private pressed/directionOf helper closure are structurally outside that
application path. The transport, validation, focus/lifecycle behavior, callback
delivery, and the actual session router remain reachable and applicable.

The legacy class is an exported compatibility surface, with real standalone
Node tests in gamepad.test.mjs. Those tests and their global/per-file counters
must remain; this finding authorizes no source deletion or global exclusion.
session-input.test.mjs also explicitly supplies the snapshot callback. Searches
across src/tests/tools found no browser caller constructing the legacy class or
calling the factory without that callback. A future exact browser disposition
must still reject positive excluded hits and stale source/map/schema identities.

Reviewed source pins:

- main.ts: c27c8693453514eddf3b56a29e4ef49e02d2bc5134ac59dcb739d0ae58d6b8c9
- gamepad.ts: be02cdecae3683f9f0b8a5698d90eec393759ce91ea40b24bc18128e7da479e5
- session-input.ts: e42c0af885310c699a275aa819c7d66d6902e20164db08cacacf5aee7017da9f

Keep module initialization, exported constants, factory guards and any source
span crossing the proved instance/helper boundaries. Do not infer scope from
zero counts. No policy change, generated disposition, tests, or denominator
change has been performed for this finding.
