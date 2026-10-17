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

## Independent implementation review

Graph `search_graph` returned no matching nodes; the independent executor therefore repeated source/literal discovery. `src/main.ts` contains the sole production `createGamepadControls` call, with an unconditional fifth arrow argument forwarding to `router.receive`. The factory's `onSnapshot ? null : new GamepadInput(actions)` makes the legacy instance impossible on that shipped caller path. `pressed` is referenced only from `directionOf` and `GamepadInput`; `directionOf` only from the class. Standalone Node compatibility tests construct that class and omit the callback deliberately, so those scopes remain applicable. All three recorded source SHA256 values independently matched.

The new `browser-applicability.mjs` pins all three source identities and additionally checks the exact single main call/fifth callback AST. It emits only wholly contained `GamepadInput` instance execution and private `pressed`/`directionOf` body/callable sites. Module initialization and exported constants, factory/transport/parser functions and guards, main callbacks and session router are retained. Crossing spans remain applicable. The API accepts only `browser-presentation-owner-lifecycle`; it does not accept a game mode, development or shared-input alias. No threshold changes or raw/global/per-file mutation is introduced.

The focused test proposal uses a synthetic zero schema realm solely to exercise mapping/validation. It checks retained factory/parser/transport/constants, other-stratum compatibility accounting, exact source/stratum pins, missing/duplicate sources, excluded-positive rejection for all counter kinds, stale map/schema rejection and crossing spans. Runtime proof and integration are pending; shared evaluator acceptance of the exact browser stratum belongs to the single shared-integration writer. No test or coverage success is claimed in this implementation note.

### Focused negative verification

After the shared integration owner added only the exact browser stratum and production-collected-payload guard, the bounded command `node --test tools/release-coverage/browser-applicability.test.mjs tools/release-coverage/applicability.test.mjs tools/release-coverage/attribution.test.mjs` passed22/22 (zero failed/canceled/skipped), 1,301.835375ms; handle15390 exit0, `/tmp/down-to-duck-07-03-browser-applicability.log`. This includes all four new source-mapped browser tests plus existing applicability/attribution checks and the integration owner's exact-stratum/nonproduction negatives. Raw input immutability and positive-hit contradictions remain enforced. These synthetic schema/validation tests are not a browser gameplay or floor claim. The serial slot was explicitly returned to the integration owner for the one canonical browser proof; no active process remains from this unit command.
