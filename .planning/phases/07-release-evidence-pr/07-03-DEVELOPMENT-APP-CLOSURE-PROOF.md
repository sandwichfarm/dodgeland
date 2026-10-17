# Genuine DEV app: ten API-only callable bodies

Source-only review, generic-agent fallback. Root accepted this proof for the ten exact bodies below; implementation remains separately gated. No coverage evaluator, product, test, manifest or runtime change is made here. The accompanying `07-03-DEVELOPMENT-APP-CLOSURE-PROOF.json` contains the sorted current158 `{path,sha256}` authority inventory. This is application reachability evidence, not coverage acceptance or a floor forecast.

## Mechanism and authority boundary

1. Graph-first `search_graph` for the candidate names under src returned0results. That response was insufficient, not evidence of unreachability. Fallback inspected source imports, literal/member references and actual caller bodies.
2. Used installed TypeScript's `readConfigFile`, `parseJsonConfigFileContent`, `createProgram` and `getTypeChecker` with current tsconfig. Identified each named function/method declaration in game/session/consumable-drops; walked all source ASTs, resolved identifier/string-literal symbols with `getSymbolAtLocation`, following `SymbolFlags.Alias` via `getAliasedSymbol`. For each of the ten symbols, the complete source reference result was its declaration only. No call, member extraction, imported alias or callback reference was found. This includes type-only consumers in the reference analysis; it does not mistakenly treat same-spelled `levels/v1.worldForRow` as the game wrapper.
3. Independently walked all local runtime `.ts/.tsx/.js/.mjs` imports/exports, excluding declaration files and type-only imports/specifiers, resolving local `.js` specifiers to their `.ts` source. Included literal dynamic imports. Traversed from `src/main.ts`, the sole module script named by index.html. Explicitly expanded the inspected single eager `import.meta.glob('./items/*.ts', {eager:true,import:'default'})` in market/catalog into its current item files. The traversal reaches158modules, exactly the complete158-file runtime source inventory; no source module is outside the closure. The dynamic DEV import is main1763→devtools→devtools-state→Game. This source graph intentionally overapproximates conditionals; it does not assume the common UI path is the only possible path.
4. Inspected all source reflection/prototype/eval/Function sites and computed callable accesses. Type-aware element-access inspection found no computed callable access on Game, SharedWorld or LocalSession. The only computed callable dispatch found was gamepad `this.actions[action]`, an explicit GamepadActions callback table supplied by main, not a Game/session method table. Reviewed potentially type-erased Record proxies separately below.
5. Read actual DEV mutation and diagnostics, construction/alias paths, generation, render, soundscape, session frame, shared-effect refresh and schema bootstrap. No candidate is invoked by a constructor, initializer, callback registration or module evaluation. Merely allocating a declaration or inheriting a prototype method is not invocation.

Inventory digest is SHA256 of UTF-8 `JSON.stringify(entries)`, with entries sorted lexicographically by path and property order `{path,sha256}`. Each sha256 hashes the file's raw bytes. Pretty-printing/newline of the persisted JSON is not part of that digest:

`10e47f7622ef7f755e41eff71ff68ee0bf488b0c8e8d62ea8232a11e2e01e034`

Implementation must validate the complete inventory and exact config pins, not only candidate files: a caller added to a previously unrelated module must fail stale. Added/removed runtime source files also invalidate this inventory. Map/schema/counter-site identities must be derived and bound from the current canonical source map separately; these source coordinates are not permission to reuse historical counter IDs. Positive excluded hits must fail closed.

| Additional authority | SHA256 |
| --- | --- |
| index.html | cb9773abc32939bdf61664b7e850eb044aa3f37aef79f61d50e9b69346ce7c0b |
| vite.config.ts | cc82c2ed6058718e3fe09ff1e6b55f8504b14bd60ebf59ef3a4488da510b5e30 |
| tsconfig.json | b58c33dad9bf85858576fa3cf6fd491a57f472d712813ee6211f59856eb0acc4 |

The existing immutable dependency/root-lock and canonical artifact/script/DEV-tools checks remain independent obligations. This review does not replace them or assert arbitrary build plugins are harmless.

## Exact candidates and positive replacement routes

Coordinates:1-based lines,0-based columns,end-exclusive; parsed from current TypeScript AST. Only the body and lexically nested callable bodies qualify. Declaration/value allocation, surrounding initialization and underlying implementation remain applicable.

| Symbol | Callable span | Body span | Positive call/import proof |
| --- | --- | --- | --- |
| src/game.ts::worldForRow |61:0–63:1|61:76–63:1|No exported binding is imported or referenced. Game.ensureRows calls registered seed generation or generateLane; levels/v1.generateLane calls its own worldForRow. The wrapper's imported worldForRowV1 is a different symbol and remains reachable.|
| src/game.ts::actorPositions |73:0–75:1|73:67–75:1|No imported/reference binding. Renderer and soundscape use laneActors; collision/platform support uses that same actor implementation directly. No app callback receives this projection.|
| src/game.ts::Game.syncSharedEffects |268:2–268:118|268:49–268:118|No call or method extraction. LocalSession refresh→host.setSharedWorldEffects→syncSharedWorldEffects is the actual shared route; actual player operations retain syncEffects. The convenience adapter and its nested callback have no entry.|
| src/session.ts::SharedWorld.selectMobTarget |295:2–301:3|295:80–301:3|No call/extraction. LocalSession.update→host.updateSessionMobs builds actual participants and frontier anchor, then calls MobDirector.update; it never calls this nearest-target sorter.|
| src/session.ts::SharedWorld.view |306:2–306:38|306:22–306:38|No call/extraction. main1744 passes localSession.world directly to drawSession. LocalSession.views() is separately called and retained; it is not this identity projection.|
| src/session.ts::LocalSession.sharedWorldEffectsSnapshot |674:2–674:109|674:71–674:109|No call/extraction. refreshSharedWorldEffects computes and passes resolved effects directly to world.host. HUD/render uses actual player/session views; DEV diagnostics reads Game fields.|
| src/consumable-drops.ts::classifyConsumableBucket |37:0–40:1|37:86–40:1|No import/internal reference. Current drops flow through sampleItemDrop's schema lookup, not the compatibility bucket classifier.|
| src/consumable-drops.ts::consumablePickupId |41:0–45:1|41:109–45:1|No import/internal reference. sampleItemDrop constructs the schema-versioned ID directly. Shared validate remains used by the actual sampler.|
| src/consumable-drops.ts::classifyItemBucket |61:0–65:1|61:102–65:1|No import/internal reference. Actual sampler uses schema.items[bucket] directly. validateConsumableSchema remains reachable through sampling and registration.|
| src/consumable-drops.ts::sampleConsumableDrop |66:0–66:138|66:83–66:138|No import/internal reference. Session directly imports sampleItemDrop and supplies policy.schema or DEFAULT_ITEM_SCHEMA. The default-schema crossing and actual sampler remain applicable.|

Candidate source pins are included in the complete inventory: game `fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6`; session **f8ce62cdc5c87557636cce62f0b15005bfa5f9cde42c708d67915b4c1ebcec39** (includes accepted pickup participation repair); drops `2fc4a1c55dc7f37dbcac2b7091661e3a284d3292eddf1460da423a39520dec4a`. Historical session pin is not refreshed or reused as evidence.

## Complete value-import inventory for candidate modules

- Game module: main imports Game/freshProgress/parseProgress; devtools-state imports Game; render imports coinPosition/laneActors/laneDirection/platformSupports/platformSurface/random/trainPhase/vehicleBounds; session imports HALF_WIDTH/laneActors/platformSupports/platformSurface; soundscape imports laneActors/trainPhase/wrap. No namespace import or re-export exposes candidate functions.
- Session module: game imports SharedWorld/SessionPlayer; main and relay import LocalSession; race imports composeSessionModeDefinition/LocalSession. No namespace import or candidate member extraction.
- Consumable-drops module: session imports sampleItemDrop/DEFAULT_ITEM_SCHEMA/validateConsumableSchema; race-items imports registerConsumableSchema. No namespace import or re-export.
- Other importers shown by source scans are type-only and erase at runtime. All are nevertheless included in the authority inventory/reference walk.

## Construction, aliases, reflection and initialization

Game constructs real SharedWorld/SessionPlayer; LocalSession construction/admission and Relay/Race attach paths do not invoke the candidate members. `Game.operationFor`236 creates a receiver with the existing Game prototype, so syncSharedEffects is present on that receiver, but no app caller invokes it. Its Reflect.ownKeys loop enumerates own fields only, proxies their reads/writes, and does not enumerate/invoke prototype methods. The field forwarding lists and session.alias explicit key lists contain no candidate. Retain this receiver creation, field descriptors and actual operations in their entirety.

DEV main1763–1782 passes explicit getGame/getCatalog/replaceGame/suspend/resume callbacks to mountDevTools. DEV jump/load construct Games, copy only named onCoin/onEnd/onMobSpawn/onMobAttack/onHurt/onHeal/onPower callbacks, setCharacter and mutate documented fields. Diagnostics formats actual Game/market/mob fields. No module namespace is exposed to these actions and no candidate is registered as a callback. Renderer/soundscape and coordinator objects remain ordinary application code inside the same reviewed closure.

Retain all module import execution and declaration/allocation sites, catalog glob assembly, DEFAULT_ITEM_SCHEMA and schemas Map initialization, Race schema registration, validators and their guards, generateLane fallback, versioned world generation, all mode constructors, shared-effect guards, actor/coin implementations, session active-owner cleanup and actual pickup/recovery/economy routes. Function declarations and prototype method allocation at import/class evaluation do not execute their bodies. This proof does not exclude initializer zeros or default callbacks merely because an ownership interval begins later. Guards inside the ten unavailable bodies share that body's absence; no independently reachable validator/guard is excluded.

## Limits and result

All ten exact bodies pass this source/caller proof; no additional body is proposed. The analysis is not a universal dynamic-language theorem: it is conditional on the pinned complete app source/config/dependency boundary and actual genuine DEV artifact. Future reflection, namespace export, dynamic import, new caller or alias invalidates authority and requires review. Arbitrary runtime debugger calls and direct API/component tests can execute these public APIs; they are outside the real-app stratum and remain globally/per-file accountable. A fixture that does call one must trigger positive-excluded-hit rejection, not silently drop the evidence.

No hitcount or missing-counter pattern was used to prove absence. No source exclusions, floors, global denominators or reports changed; no test/build/browser was launched and no commit made by this worker.
