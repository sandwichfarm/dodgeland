# Controller and renderer residual review

This reviews36 original current-full zero arms:18 gamepad and18 renderer.
All remain counted. No new execution,coverage hit,exclusion,threshold or source
change occurs. The proof binds exact source/map/sites and the actual inspected
behavior sources;final visual inspection and protocol conformance stay separate.

## Controller transport and retained single-player adapter

**INPUT-01/03/04/05/06,SOLO-01,TEST-02/03/05.** Validated snapshots must route
by stable device identity,clear stale holds,require fresh input after context
changes,and degrade without optional controller support or native device access.

Main calls createGamepadControls with an explicit snapshot-consumer arrow that
forwards to GamepadRouter.receive. Consequently its internal GamepadInput is
null on the shipped route. The separate router has its own direction policy,
per-seat leases,context seeding and lifecycle handlers. Existing GamepadInput
tests remain useful retained API evidence;they are not multiplayer lease proof.
This bounded application route does not remove the older API from global counts.

| Arms | Reviewed consequence and evidence boundary |
|---|---|
|10/0 at60|Malformed button records,nonfinite/out-of-range values,or nonboolean pressed/touched reject the entire snapshot. The parser copies every accepted field;invalid snapshots suspend input and deliver unavailable to the router. Tests exercise bounded snapshots,mutable-copy isolation,malformed axes/shape and stale-repeat cancellation. They do not claim every malformed button-field combination executed this exact guard.|
|17/0;18/2;18/3;18/4;19/0;19/1 at75|The legacy adapter retains the prior horizontal axis on a D-pad diagonal and chooses left/right by the actual sign. Its normal cardinal/repeat and D-pad-priority tests use real GamepadInput. Router tests separately assert right-biased diagonal lease behavior. The legacy diagonal operands remain zero;equivalent router assertions are not their hits.|
|21/1 at76|The legacy D-pad vertical-positive case maps to back. Forward,left,right,opposed cancellation and action precedence are asserted;this remaining literal direction alternative stays counted. Main uses the distinct router implementation,whose device/action tests own actual multiplayer direction dispatch.|
|27/0;29/0;29/1 at82|The legacy stick selects the stronger horizontal axis,retaining it on an equal diagonal. Otherwise vertical wins. Existing deadzone/hysteresis tests assert vertical diagonal and D-pad override;router tests independently assert equal-magnitude horizontal retention. No legacy horizontal-stick execution is invented.|
|30/1 at83|Positive legacy stick y maps to back. This is a retained direction-format alternative,not an application ownership rule. The same axes/deadzone/release logic remains counted without claiming this exact sign executed.|
|46/0 at119;56/0 at152|If a movement/repeat callback changes context,the legacy adapter immediately reseeds held controls. Existing tests change context before update and during modal actions,proving no held action crosses menus;these two movement-callback-specific checks remain distinct zeros. Arbitrary generic callbacks can change context,so the guards are not globally unreachable.|
|51/1 at133|Seeding without a current pad stores null direction. Normal seeds follow accepted pads;generic callbacks may suspend/close before another seed check. The fallback safely disarms movement and stays counted. No forced private seed call is added.|
|67/1 at188|Blur before any valid snapshot delivers an available-but-unfocused empty snapshot to an external consumer. After snapshots,it retains devices with focused=false. Existing blur/hidden tests prove stale holds cannot move after focus returns;the before-first-snapshot fallback remains counted.|
|70/1 at192|Returning visibility with no latest snapshot performs no receive. This is a safe startup no-op;normal hide/show retains the last full validated snapshot. Existing focus/visibility tests own the latter path,not a fabricated pre-first-message visibility event.|
|76/1 at217|A marker-only optional domain in a top-level window installs no parent subscription. Napplets run in an iframe;the actual app either consumes a complete binding or subscribes to its parent. Generic top-level use remains inert and counted. No same-origin or native gamepad authority is added.|

tests/gamepad.test.mjs asserts canonical subscribe/unsubscribe payloads,authentic
parent source,wrong message/id rejection,binding precedence,close-once,missing
domain,throwing binding,focus and hold rules using labelled host fixtures.
tests/session-input.test.mjs asserts actual router leases,concurrent seats,
stale/wrong ownership,reclaim and diagonal behavior. Built gamepad runtime tests
exercise opaque iframe input through injected binding/draft wire transport and
verify forbidden native polling is absent. Those injected exchanges do not
substitute for the final official SDK/runtime conformance proof.

## Renderer:18 arms

**UI-02/04/05/06,SOLO-01,COOP-01,RACE-02/03,TEST-01/03/04.** Rendering must
use physical player/actor positions,retain stable identity labels and contextual
warnings,and respect reduced motion without changing simulation policy.

| Arms | Reviewed consequence and evidence boundary |
|---|---|
|2/0 at41|Omitted characterYaw reduced argument defaults false. All shipped calls supply Renderer.reduced explicitly. Render tests assert the duck's visible turn,paused pose and reduced-motion suppression;this omitted-argument default remains counted.|
|9/1 at62|Falsy devicePixelRatio falls back1,then caps at2. Actual browsers provide a positive ratio in the tested frames. The safe sizing fallback remains counted;it does not select a gameplay scale or collision radius.|
|15/0 at73|Omitted turnedModel lift defaults0. Current app calls supply lift,including cosmetic thumbnails/spills. The bound source location is lift,not yaw. Actual clothes tests verify common transforms at both yaw angles;this unused parameter default remains counted.|
|20/0 at90|An almost-zero transformed view component skips that axis in voxel ordering. Current authored turn angles do not exercise this near-axis orientation. General corner rotation/depth sorting preserves the fallback;duck/wearable/mob render tests verify attached bodies and occlusion without claiming every possible angle.|
|38/1 at149|A near-zero committed mob travel path omits intermediate chevrons but still draws its target ring/cross. Normal attacks have a nontrivial path;actual warning pixel tests verify persistent path/target/overhead cues and identical reduced-motion warning fingerprints. Degenerate-path formatting remains counted.|
|41/0 at170|An overhead windup warning wholly offscreen is culled. Visible close warnings are checked for readable pixels above the duck and no body clipping at compact/large scales. This offscreen early return changes no hazard state and is not claimed a visible-warning test hit.|
|57/0 at229|Switching from a bounded session viewport to solo draw clears viewport and restores legacy scale. Main selects drawSession only for the running session and draw for solo/staging. This transition alternative remains counted;pixel parity tests compare actual default solo scenes against the oracle. No local camera reset is treated as collision evidence.|
|71/1 at264|Missing runSeed uses game.seed for market scenery. Normal new/replayed Game runs have a captured versioned seed. Scenery/seed tests own deterministic stands and geometry;the generic legacy seed fallback remains counted.|
|84/0 at298|A nonpulled river reward uses its platform surface as drawing height. Pulled rewards retain their own z;ordinary land uses0. Existing magnet/coin/platform render tests separately verify physical pull position and platform support;this specific reward-height alternative is not relabeled executed.|
|129/0;130/0;130/1 at467–468|Trail cosmetics draw three alternating left/right tiles behind the traveler in the ground-marker layer. They neither mutate position nor add collision geometry. Actual wearable tests verify hats/shirts/common transforms;they do not prove every trail color/alternation by execution. This bounded visual adapter remains counted and available for final actual-frame inspection where relevant.|
|133/1 at476|Hurt halo on unsupported terrain uses floor0 instead of platform surface. Recovery/damage occurs through Game;the renderer only draws an outline. Existing health and render tests own actual hits and grounded/support geometry,not this unsupported hurt-halo combination.|
|140/0;141/0;141/1 at496–498|Sparkles draw four rays,with static angles under reduced motion and clock-driven angles otherwise. The styling has no authority over damage or items. Clothes/character motion proofs do not supply these effect-cosmetic hits;all three alternatives remain counted.|
|146/1 at515|Protection text with no preplanned label position falls back above the projected body. Sessions supply a planned identity label position;solo does not provide session protection. Consumable render tests assert actual protection text plus distinct identity labels and their text bounds. The generic unlabeled protection alternative remains zero.|
|150/1 at531|A nonempty identity label without a supplied position uses a direct body projection. Shipped session rendering plans positions for every label;solo passes no identity label. The20 component label cases verify complete seat/character text,frame bounds,roster-order stability and nonoverlap. That is distinct from the final inclusive8px clearance audit and this unused projection default.|

Actual renderer tests cover physical hops/platforms,foreground occlusion,train/
car silhouette clearance,full-width wave front,duck bill/turns and exact default
Arcade/Flow pixels against archived renderer modules. Mob/clothes/consumable
render tests use real Canvas paths and explicitly arranged component scenes;
built cross-mode journeys provide separate integration evidence. Source review
does not itself inspect new screenshots,prove hardware behavior or finish the
final current-build visual/clause audit.

All36 sites now have explicit consequences,behavior sources and limits. The
fresh full gate,remaining main/market/audio/mob branches,conformance,final visual
proof and release/PR checks remain unfinished.
