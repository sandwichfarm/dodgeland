# Strict solo definition evidence

Scope: test attribution tooling only. No production changes, applicability exclusions, threshold changes, or oracle changes. The model/bootstrap observers, their callers, public observer, attribution validator, and independently exposed `projectSoloApplicability` entrypoint now require complete canonical-definition evidence. Root owns applicability rules and STATE separately.

## Authority and observation

The reviewed `src/mode-rules.ts` SHA-256 is `cadda595a1cfa02769eee70e3f925b125b14c7fdf6faf93b9a83f45bb79c89f2`. `solo-definition-evidence.mjs` records the complete normalized Arcade and Flow definitions, including all nested rule fields and empty lifecycle object. Validation rereads the authority source hash; changed source requires explicit snapshot review. A matching id or asserted boolean alone is insufficient.

Node observers compare the actual Game definition against exported `SOLO_ARCADE_MODE` / `SOLO_STROLL_MODE` objects from the same loaded graph. Game rules, SharedWorld definition/rules, recursive frozen state, existing primary-player/world ownership and no-session/staging checks must agree at acquisition and runtime observation boundaries. Bootstrap obtains these exported data objects from its actual fresh module graph. Observation does not invoke a production resolver or constructor.

The opaque-browser observer reads actual objects without changing the game. It captures the complete normalized definition, recursive frozen state and within-realm Game/SharedWorld rule identity. Outside the iframe, the source-pinned complete snapshot is validated. This establishes equality of complete snapshots across realms; it does not claim cross-realm reference equality. Constructors/resolvers are not called by observation.

`deriveInterval` validates both endpoints. Public intervals deliberately store one observation after exact equality validation; component intervals retain both endpoints. The direct applicability projection follows that distinction and independently rejects absent definition proof before mapping. Raw counters and parent/schema bindings remain unchanged.

## Negative controls

Controls reject custom same-id definitions, runtime rule replacement, missing or boolean-only evidence, forged source hash, wrong base snapshot, changed rule values, false frozen/identity evidence, and missing proof at direct projection. Existing fresh-import/cache/oracle and ownership controls remain.

## Superseded attempts

The initial model/bootstrap implementation called `soloModeDefinition` during observation; its collected metrics are not accepted final evidence because observation added production resolver counters. The correction uses exported constants only. The first public chain (session 23773) ran all six cases successfully but exited 1 during projection: the new projection incorrectly demanded an absent public endObservation. This was a tooling representation error, corrected to the established single-observation public contract. A prior control failed because its test-local projection import was missing; this was a test error, not product RED.

## Corrected execution

Session 98003 terminated exit 0 after bounded controls, canonical solo-model, canonical bootstrap, and canonical public modes sequentially. Logs share `/tmp/down-to-duck-07-03-solo-definition-constant-` with suffixes `controls.log`, `model.log`, `bootstrap.log`, and `public.log`.

- Controls before the canonical chain: 18/18 passed.
- Solo model: run `c57ad62e-0066-44dc-b64f-c20f9d5c2b37`, 1/1, 24 scenarios / 48 intervals. Raw Arcade 926/2039 lines, 218/656 functions, 963/2768 branches; applicable 926/1207, 218/296, 963/1427. Raw Flow 790/2039, 195/656, 823/2768; applicable 790/1067, 195/276, 823/1252.
- Bootstrap: run `55f04122-f079-4f21-941b-591ccffb58c3`, 1/1, two fresh lifetimes / four intervals. Raw Arcade 842/2039, 192/656, 723/2768; applicable 842/1207, 192/296, 723/1427. Raw Flow 817/2039, 188/656, 706/2768; applicable 817/1067, 188/276, 706/1252.
- Public modes: run `3d0f9db0-b00f-4e5e-8be4-1010b3caab95`, 6/6 and six exclusive intervals, complete report-only projection. Raw solo Arcade 168/2039 lines, 65/656 functions, 182/2768 branches; applicable 168/1207, 65/296, 182/1427. Raw solo Flow 145/2039, 61/656, 167/2768; applicable 145/1067, 61/276, 167/1252. Other mode observations retain their original provenance and binding.

These focused reports are report-only, not full coverage enforcement or release acceptance. They preserve component-model versus public-input provenance. No new exclusion is justified merely by these counts.

After the canonical chain terminated, exported expected snapshot objects/arrays were recursively frozen. Final bounded controls passed 20/20 (exit 0), log `/tmp/down-to-duck-07-03-solo-definition-frozen-controls.log`. Added controls prove importing callers cannot mutate nested expected data and observers succeed with a throwing resolver export (they consume constants only). This tooling expectation immutability correction changes neither acquisition/observation logic nor production counters; no redundant canonical replay was performed. `git diff --check` passed. No process remains active; runtime slot returned to root. Changes intentionally remain uncommitted for root review.

## Existing caller audit follow-up

Root review found the existing duplicate/overlap negative in `solo-model-attribution.test.mjs` still supplied only LocalSession and a label-only fake definition. Updated that fixture to load actual canonical constants and share their exact rules through fake Game/SharedWorld ownership; retained duplicate end calls, duplicate/overlap rejection and absent output assertions. Graph search of both recorder definitions and a full tools/tests literal caller audit confirm parity factory, standalone bootstrap and tool-control callers now supply current-graph constants. The missing existing test was an audit omission; canonical gameplay does not require replay for this fixture-only correction. Combined recorder/attribution controls are queued behind root's serial audio chain.

Follow-up controls: session `58496` terminal exit 0, all 24/24 across `solo-model-attribution.test.mjs`, `solo-bootstrap-attribution.test.mjs` and `attribution.test.mjs` (1.217 seconds), log `/tmp/down-to-duck-07-03-solo-definition-all-controls.log`. Original duplicate/overlap negative passes. `git diff --check` passes. No gameplay replay was needed; slot transferred to the shared-pickup agent, changes remain uncommitted for root coordination.
