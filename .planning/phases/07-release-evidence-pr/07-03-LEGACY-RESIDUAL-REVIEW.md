# Unchanged legacy residual review

This review accounts for94 raw-zero arms in18 legacy files that are byte-for-
byte identical to immutable oracle a310a81. It reviews their conditions and
consequences below;byte equality by itself is not execution evidence. Exact
branch/arm/source/map IDs,source fragments,oracle/current SHA256 and behavioral
suite references are in `07-03-LEGACY-RESIDUAL-PROOF.json`. All remain counted
in global/per-file coverage. None gains a hit,ignore directive or exclusion.

The distinction is between an uncovered counter and an unproved required
multiplayer behavior. The reused contracts below have ordinary/model/built UI
assertions. A named raw-zero fallback is not relabeled covered merely because
a different entry exercises the same contract. Preserved compatibility guards,
redundant private-entry fallbacks and alternate presentation details remain
visible residuals under the existing thresholds. New owner/input/recovery/result
conditions in changed files still require their own review.

## Condition and consequence review

| File / requirements | Residual condition and consequence | Relevant actual behavior assertions and retained limit |
|---|---|---|
|actors.ts;ARCH-03,SOLO-01|Default direction on a zero-speed lane;missing actor pattern causes an early no-op;asking a nonplatform pattern for a platform coin gives null. No new player/mode authority is introduced.|`solo-parity-actors.test.mjs` compares generated species/speed/length/acceleration/live rebase and trajectories against the oracle;`seed.test.mjs` pins platform coins and every schema. Residual generic entry checks remain raw zero,not proof of malformed author-created actor inputs.|
|character-power-ui.ts;COOP-01,UI-02|Omitted reducedMotion argument defaults false;the shared app supplies the current preference/media value. This fallback affects animation styling,not a charge.|`character-power-runtime.mjs` and renderer tests inspect actual power state/control presentation;mode hazard/recharge tests own power authority. This does not infer an omitted-argument call occurred.|
|character-powers.ts;COOP-01,SOLO-01|Unknown character lookup falls back to Duck power;normal setup/admission selects validated unique characters.|`character-powers.test.mjs` checks every shipped character,matching/unrelated hazards and100-block recharge. Both turn-mode wrapper suites use real matching hazards in both bases. Unknown direct-API lookup remains a counted compatibility fallback.|
|coin-denominations.ts;SOLO-02|Unknown denomination ID uses the ordinary coin. It does not synthesize higher value or change seeded odds.|`coin-denominations.test.mjs` enumerates denominations/odds;seed tests retain schema3 metadata and schema2 geometry. Actual newer solo/river reward journeys own collection and wallet receipts. No malformed-ID counter credit is claimed.|
|collection-ui.ts;SOLO-03,UI-01/05|Empty reader pages/copy and world-detail text use presentation fallbacks. Back/menu/focus and alternate negative-step native control branches only change the current collection view or dispatch the same input/change events;they do not own player wallets,mode seats or simulation.|`collection-game-layout.mjs` checks all seven traveler stories,world selection,captured preferences,actual native/SDK slider input,focus trap,paired themes/frame sizes and no overflow. Opposite-direction/empty-node/after-dispose branches remain unhit. A working tested route does not constitute branch coverage of every equivalent key route.|
|devtools.ts;SOLO-02,TEST-03|Missing app element avoids inert-state capture;non-Error seed rejection uses generic copy. These are development-only editor defenses.|`devtools.test.mjs` checks invalid bounded inputs,seed/reconstruction preservation and no mutation;`devtools-runtime.mjs` owns actual development controls and production absence. Missing normal app root is not a supported game frame.|
|market-preview.ts;SOLO-02,UI-05|Hidden/no-motion tick stops;an almost-home angle snaps home;disposed resize does nothing;missing pixel ratio uses1. None changes inventory or authoritative collision geometry.|`market-preview.test.mjs` uses real canvas/full rotation for all cosmetics/travelers,stops on hidden/offscreen/reduced/disposed and checks return-home/current portrait updates. The exact epsilon snap/default ratio/late resize arms remain counted zeros.|
|market-scene.ts;SOLO-02,UI-05|Canvas color-normalization alternatives/fallback color,missing ratio1 and disposed update affect the scenery canvas only. Color parsing does not select gameplay rules or ownership.|The built market-board/layout journeys inspect actual visible controls,preview canvases,themes and bounded screens. Separate `market-scene.test.mjs` source contains full-alpha pixel and hide/dispose assertions,but is not a registered full-run entry. Its two cases require a separate execution after the active complete chain;they are not claimed as fresh full05 evidence.|
|market-scenery.ts;SOLO-02|An empty replacement asset returns null instead of building an invalid stand;existing lane props are preserved.|`market-scenery.test.mjs` checks meadow-only eligibility,varied stand fitting,determinism/source immutability and bounded reuse;renderer suite owns visible placement. Empty custom asset fallback remains raw zero.|
|mob-models.ts;SOLO-01,UI-02|Omitted pose animation argument defaults false. This is mesh pose only,not MobDirector timing/targeting/collision.|`mobs.test.mjs` exercises spawning/approach/attack/rest/progression;render/scene suites inspect actual models. No default-argument invocation is inferred from those tests.|
|pause-ui.ts;SOLO-03,UI-04/05|Empty reader copy,disabled-focus repair,inactive/empty-control navigation and post-dispose repagination defenses affect the legacy solo pause view. Normal app routes gate inactive UI before navigation.|`pause-game-layout.mjs` checks pause pages,actual controls/focus,sizes/themes and no scroll;multiplayer pause/owned boards are different changed-file surfaces with separate proofs. No inactive private route is labeled exercised.|
|run-menu.ts;SOLO-03,UI-04/05|Absent end snapshot/copy,empty pages,disabled-focus repair,optional focus,inactive/back/disposed-update guards affect solo ready/death view. They do not freeze or rank multiplayer results.|`run-menu-layout.mjs` and existing ready/death runtime flows check real pages,controls,seed-copy/focus behavior and frame bounds. New Survive/Relay/Race results remain separately accountable. The old fallback text is not a substitute for their custom stats.|
|run-seed.ts;SOLO-02,ARCH-01|Direct createRunSeed rejects invalid mode or nonboolean gentle. Public encoded/decoded descriptors pass validateRunSeed first,which rejects those malformed fields before these redundant inner guards.|`seed.test.mjs` rejects malformed descriptors/codes and checks all schemas/settings/uint32 limits;`turn-seed-compatibility.test.mjs` retains mode course identity. Earlier rejection proves malformed imported identity fails;it does not claim the direct helper guard counter was hit.|
|sound-packs.ts;SOLO-02,UI-06|Missing metadata field uses an empty string for parser validation/fallback. No new cue,network grant or privileged API is created.|`sound.test.mjs` and `release-sound-loader-gaps.test.mjs` exercise invalid metadata/addresses/bytes/memory,deterministic list choice,cancellation and fallback. The exact missing-field arm stays counted.|
|sound-settings.ts;SOLO-02,UI-06|Late disposed/stale import must not adopt a pack;optional stored address and saved-custom option fallbacks keep local controls usable. Main hydration/disposal gates and loader cancellation are earlier layers.|`sound-runtime.mjs`/collection journey assert actual mixer/mute controls,missing optional-domain behavior and persistence;loader component cases reject stale/cancelled loads. Actual official storage wire settlement is still07-04;SDK-method fixtures do not prove it. Disposed wrapper/default-label branches are not claimed hit.|
|vehicle-models.ts;SOLO-01,UI-02|Existing conditional voxel mapping affects model geometry only;actor dimensions/speed/contact remain with the separate lane/game authority.|Seed model snapshots and actor differential tests preserve shipped meshes and dynamics;full-body render proofs own visible envelope. The unused voxel alternative remains a counted visual residual.|
|wearables.ts;SOLO-02,UI-02|Unsupported clothing style is skipped;the current wearable pipeline supplies hats/shirts and handles effect cosmetics separately. It cannot spend a card/coin or alter collider dimensions.|`wearables.test.mjs` checks invalid equip atomicity,slot coexistence,death clearing and every traveler's preserved face/source model;renderer suite checks dressed meshes. No unsupported-style branch execution is claimed.|
|levels/v1.ts;SOLO-02|Omitted archived-world/gentle arguments and unknown-home fallback preserve original generator behavior. Captured descriptors/world catalogs provide valid explicit values on current replay routes.|`seed.test.mjs` pins22,680-row schema1 course/model observations,all schema identities/order independence and captured settings;solo differential suite compares actual gameplay. Generic omitted/unknown helper inputs remain residuals,not a new supported replay identity.|

## Evidence binding and remaining work

The read-only verifier checks all18 current source files against both git-show
oracle bytes and the current410-path full05 freeze. It checks94 extracted rows
against those source identities and binds each referenced test's current bytes.
Every behavioral suite is registered in the current full run except the explicitly
identified market-scene component file. Initial verifier attempt incorrectly
required that source-only component case to be a registered job;both attempts
and logs are preserved. The corrected reader records the missing execution
instead of adding a fabricated result or changing the complete-run inventory.

This review is not an automatic semantic verdict from hashes or percentages.
The table records the reviewed consequence and limits;source equality establishes
preservation only. It does not prove exhaustive future authoring/invalid inputs,
new multiplayer states,current final screenshots or complete teardown. Full05
execution is still pending;the separate market-scene cases,changed-file residual
review,07-04/05/06 and opening the PR remain required. The original full enforcing
failure is not relabeled,and no coverage applicability/floor changes occur.
