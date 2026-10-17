# DEV call-closure applicability review

Read-only generic-agent fallback review. No tests/build/browser, source/manifest changes, commits or applicability projection. Scope is the actual app plus compile-time DEV UI, not arbitrary debugger evaluation. All26raw development files, global/per-file counters and90/90/85 floors remain intact. The49-realm diagnostic still has184missing arms beyond the branch floor; missing hits did not select or justify the candidates below.

## Result: narrow API-only candidates; no absent mode/class exclusion

The DEV entry point retains Solo, Survive, Relay and Race and can start/restart their lifetimes. `main.ts:1760–1784` passes a bounded Game facade to DEV controls; replacement resets/retire sessions, transfers fresh callbacks and adopts the candidate. `devtools-state.ts:20–47` constructs/loads Games, clears/regenerates rows, stages a safe landing and moves; `devtools.ts:58–95` exposes jump/load/coins/heal/clear-mobs/resume. These operations do not invoke the compatibility methods below or reflectively enumerate module exports. They also invalidate any blanket reuse of strict-solo or Relay/Race-only exclusions.

The following **callable bodies and their nested callable bodies** are candidates for an explicit DEV applicability ledger. Retain module-level declarations/value initialization and all underlying implementation functions. Coordinates are1-based lines/0-based columns, end-exclusive, parsed from the current pinned source.

| Candidate | Callable span; body span | Positive application call/state proof |
| --- | --- | --- |
| `game.worldForRow` |61:0–63:1;61:76–63:1|Compatibility wrapper invokes `worldForRowV1(...,WORLDS)`; actual Game generation calls `generateSeedLane`/`generateLane` at game379, whose versioned implementations call their own world resolver. Main imports Game/freshProgress/parseProgress, renderer imports laneActors/coinPosition/etc., DEV imports Game only. No app import/binding invokes this wrapper.|
| `game.actorPositions` |73:0–75:1;73:67–75:1|Returns `laneActors(...).map(x)` for external callers. Actual renderer and soundscape import `laneActors` directly; collision/support likewise use laneActors. DEV diagnostics reads Game fields and mobs, never this projection.|
| `Game.syncSharedEffects` |268:2–268:118;268:49–268:118|Unused convenience dispatch into `inPlayerOperation(...syncEffects)`. Actual session world effect refresh calls `setSharedWorldEffects`, which calls `syncSharedWorldEffects`; player operations retain direct syncEffects. Those actual routes remain applicable.|
| `SharedWorld.selectMobTarget` |295:2–301:3;295:80–301:3|Unused nearest-mob convenience sorter. LocalSession.update1050 calls host.updateSessionMobs; Game301–306 constructs real participants/anchor and calls MobDirector.update directly. No DEV action invokes this sorter.|
| `SharedWorld.view` |306:2–306:38;306:22–306:38|Unused identity projection. Main1744passes `localSession.world` directly to drawSession plus `localSession.views()` (different member); no world.view call or extraction.|
| `LocalSession.sharedWorldEffectsSnapshot` |674:2–674:109;674:71–674:109|Unused diagnostic projection of resolvedSharedEffects. Actual refresh674+ directly feeds world.host.setSharedWorldEffects; HUD/render consumes session/player views, not this snapshot. DEV diagnostics uses Game fields only.|
| `classifyConsumableBucket` |37:0–40:1;37:86–40:1|Legacy public bucket classifier has no application import/call. Actual row drops use the registered schema sampler below.|
| `consumablePickupId` |41:0–45:1;41:109–45:1|Legacy public ID formatter has no app caller. Actual sampleItemDrop constructs its schema-specific ID internally at77.|
| `classifyItemBucket` |61:0–65:1;61:102–65:1|Standalone public classifier has no app caller. Actual sampleItemDrop uses `schema.items[bucket] ?? null` directly at76.|
| `sampleConsumableDrop` |66:0–66:138;66:83–66:138|Legacy default-schema wrapper has no app import/call. `session.ts:14,457,480` imports and invokes sampleItemDrop directly, explicitly selecting policy.schema or DEFAULT_ITEM_SCHEMA.|

The last four belong to `src/consumable-drops.ts`. Their validators/shared helpers are **not** excluded: actual sampleItemDrop and Race schema registration call them. No assertion is made that direct API tests cannot execute these candidates; those tests remain globally/per-file accountable. A future applicable DEV report must keep raw counts and exact omitted-site records, reject any positive excluded hit, and fail source/map/schema or caller-authority drift. This review itself changes no denominator and gives no floor forecast.

## Exact source and caller-authority pins

SHA256 of current UTF-8 source bytes:

| File | Pin |
| --- | --- |
|src/game.ts|fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6|
|src/session.ts|5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed|
|src/consumable-drops.ts|2fc4a1c55dc7f37dbcac2b7091661e3a284d3292eddf1460da423a39520dec4a|
|src/main.ts|33be7291c0e3c14910039fdb8a1d44e895273f79e132f9a0c9873b3d3166add4|
|src/devtools.ts|717ad3568ee1cd1139f3650e1785f7aa4867cb4113b5417053b8677dd83f9e87|
|src/devtools-state.ts|8ffff220d26c0a984f8159a18701b20d421a8d86708ee828f3d17634195c0e60|
|src/render.ts|b6b5ae2ff1a4af8e3f6a0bf2c96bfcc3e83b11e95e38892ccaa6f33f3c2122c2|
|src/survive-together.ts|dbc77f00e9c37ee845920c3b63da30f8f661582e37da4f30bb2d2f72c3c4b69b|
|src/relay.ts|f5c1eea5b82e6e42d7b6bbc6a95f7f0d28aa7ad7468c4464e0217ab9f89e6c02|
|src/race.ts|d2ecf7bbc185520fdad9b441c52775297b4929f455e665e38caabebebacb62da|

These pins are review anchors, not sufficient by themselves to detect a new caller in a previously unrelated file. Implementation must additionally verify the tracked application import/member-use closure (or pin that complete caller inventory), reject new candidate import/member references, and bind map/schema/site IDs from current canonical inventory. Do not silently refresh pins.

## Explicitly retain these reachable or insufficiently proven gaps

- **Versioned generation and legacy fallback:** `Game.ensureRows:379` genuinely contains a generateLane fallback; constructor198–209 supports unregistered extension worlds. DEV jump preserves current definition/runSeed or numeric/home path. Unlike worldForRow/actorPositions, generateLane has an actual product caller. Retain it, both branches and version/schema validation; no exclusion based on observed registered seeds alone.
- **All session compositions:** Survive.attach10 installs shared effects and consumables; Race attaches tactical policy; Relay/solo exercise absence paths. Therefore retain ConsumableWorld, LocalSessionStage, recovery/market adapters, policy-vs-default drop branches, shared-effect guards/bodies and item capability rejections. No whole-mode absence assumption holds for DEV.
- **Owned pickup/mob behaviors:** SharedWorld pickup claim/pull sorting271/284 and active-owner cleanup, Game.updateSessionMobs301, ConsumableWorld river anchor480–487 and contacts515+ have real frame callers. Actual two-player contested pickups, moving platform rewards, magnet ownership/retention and multi-player pursuer targets are behavioral gaps, not API-only exclusions.
- **Progressive coin position:** game.coinPosition93–100 calls actors.progressiveCoinPosition144 for a coinActor; renderer and collection consume it. A real versioned river/platform reward witness is appropriate; keep the callable and its fallback arms.
- **Economy effects:** Game.ensureRows386–388 scenery-clearing callbacks are reached by owned cards/effects; market/run238 power-refresh lookup has an actual repeat-purchase route. Retain those callbacks and add meaningful visible owned-item behavior where absent, rather than generic direct helper calls.
- **Recovery placement:** session735–843 computes safe river/road/rail/mob cells for actual recovery. Existing successful meadow cases do not prove hazardous-cell rejections, occupied cells or retained anchors. These remain applicable; use actual recovery request/outcome assertions if extending witnesses.
- **DEV diagnostics/lifecycle:** devtools-state53mob formatting and devtools73submit handler remain applicable. Diagnostics may observe live mobs after normal or sandbox play. Native form restrictions alone are insufficient to exclude a registered handler; programmatic/runtime event delivery and teardown paths need explicit contract proof before any disposition.
- **Initializers/defaults:** Game174–177 and SessionPlayer320–322 allocate default callbacks on real construction. Keep initializers and callback bodies in this review: initialization occurs, and the complete call-before-replacement/default invocation proof is not established. Keep content/catalog initialization, schema constants/map construction, Race registerConsumableSchema/validateCatalogue bootstrap, default parameters and validation guards. Generic type checks, zero counts, or common UI inputs are not impossibility proofs.

## Graph/fallback limitations

Used search_graph for the named compatibility APIs, then inbound trace_path. It reports no application callers for worldForRow/syncSharedEffects/selectMobTarget and traces actorPositions to a test caller; generateLane positively traces to Game.ensureRows. `SharedWorld.view` had an inconsistent search in-degree12 but inbound trace returned none, so graph counts were not treated as proof. Source import/member literal scans across tracked `src` and actual main/render/DEV/session call reads resolved that ambiguity. The graph cannot independently prove dynamic reflection or newly added aliases absent. This review is source-bound and must fail stale; arbitrary CDP/private-model calls in test fixtures are not application reachability evidence and must not be mislabeled as public DEV usage.
