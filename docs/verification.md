# Verification — 2026-10-13

## Objective audit

| Requirement | Current evidence |
| --- | --- |
| Start with a name that sets the theme and character | Build spec names **Down to Duck**, duck **Butter**, home world **Apricot Grove**. CLI metadata and artifact title use Down to Duck; fresh, invalid and legacy default-frog selections show Butter. Other unlocked selections remain intact; choosing Pip in the updated save format persists. |
| Crossy-style crossing flow | Engine and opaque-iframe runtime exercise single-tile movement, cardinal dodges, moving traffic, log/raft rides, train warnings/collisions, forward distance, coins, pursuing wave, loss reason and immediate retry. |
| Infinite levels and extensive difficulty variety | Stateless seeded generation streams and prunes rows; no ending/win level exists. Tests inspect 51,200 rows over 80 seeds, six worlds and all four lane types; every seed has a different fingerprint. High-distance generation is tested at 10,000, 1,000,000 and 1,000,000,000 rows. Streaming over 10,000 frontiers retains 39 rows. Difficulty remains distance-dependent, with readable speed/gap bounds. |
| Techniques to combat fatigue | Immediate retry and rotating goals in run UI; cosmetic unlock milestones tested in the runtime; six changing asset catalogs; relief rows and alternating-intensity segments tested in generation; gentler opening verified; Stroll without pursuit and paused simulation verified; reduced-motion preference and automatic minimum-size pause exercised in the runtime. A simulated browser background visibility event pauses the current run; normal signed-out gameplay requires no identity. |
| Easily add characters, levels and diverse assets | `content.ts` catalogs own all six travelers and six worlds. An extension test appends a new traveler/world/model/pattern and generates it without engine changes. The content guide includes copyable traveler and world definitions and segment-pattern rules. |
| Napplet artifact and boundaries | Only `dist/index.html` is shipped. Runtime test rejects external code/styles and forbidden browser authority references. Optional storage/theme/keys use SDK helpers; shared sound packs use optional outbox/resource/common. No hard requirements, signing, publishing, direct network or relay escape hatches. |
| Interchangeable sound packs | Pond and Pocket Arcade each supply all 31 cues: classic effects, character calls, music/environment/vehicle layers, mob alerts and seven contextual deaths. The Sounds tab selects packs, previews individual cues and saves separate music/ambience/effects levels plus master mute. A documented project-specific cue profile extends NIP-51 release-artifact sets referencing NIP-94 audio files. Loading validates metadata, SHA-256, per-cue duration and decoded-memory limits; missing clips retain defaults and legacy crash/splash overrides remain compatible. |
| Scene soundscape and contextual deaths | Original eight-bar music, world-shaped wind/birds, nearby water, persistent passing engines, approaching-conflict horns and moving train rumble use actual game positions. Crossing lamps and metallic bells share the same clock. Every engine loss branch supplies an explicit cause before its callback. Butter uses a credited, embedded field recording. Pause, backgrounding, the collection and teardown stop audio. |
| Pluck and directional traffic damage | Three-feather meter; rear costs 1, side 2, front 3; half-feather recovery at each new 100-hop milestone, capped and not farmable. Engine/render/browser evidence is recorded below. |
| NAP-GAMEPAD input | Canonical draft adapter accepts injected bindings or exposed-domain wire snapshots; tested controls, focus, disconnect, context changes and fallback without browser-device access. |
| Score-based pursuing mobs | Arcade unlocks Moss Slime at 160, Snap Crab at 320 and Bramble Wasp at 480, with at least 45 seconds before the first arrival. Walking is the normal pursuit action; slimes never lunge. Crab/wasp strikes commit after warnings and use distinct easing followed by full recovery. Spawns require 14–18 seconds and 24 new points between arrivals, with one mob before 480 and at most two later. Markets and urgent wave warnings delay new arrivals. Stroll remains free of mobs. |

## Checks

- `pnpm verify`: 6 scaffold guidance checks, TypeScript and single-file production build pass.
- `pnpm test:game`: 21 gameplay/content tests pass, including the free default duck, per-character call metadata and invalid/locked saved-selection fallback. Legacy default-frog saves migrate to Butter with all counters/settings preserved; versioned Pip selections and other unlocked travelers remain intact. Wave tests cover initial grace, continuous advance, interpolated hop collision, last-moment escape, forward clearance without resetting pursuit, lateral/backward movement, pause, trailing bounds and Stroll. Coin regressions reproduce fractional river drift in both directions, both modes and meadow/road destinations; pickup uses the occupied tile, handles exact half-tile boundaries, waits for a safe landing and awards each coin once. Both new coin tests fail against the previous pickup rule. Mix migration preserves explicit silence, clamps invalid ranges and defaults old saves. All six real death branches set their cause before `onEnd`, and repeated end calls cannot change it.
- `pnpm test:render`: 14 pixel regression tests pass. The saved pre-fix renderer reproduces the lily clipping; the fixed renderer leaves all opaque character pixels visible in six left/right lily/log/ice cases, ten land/water hop stages and reduced-motion rendering. A foreground scenery fixture still occludes the character. Four wave cases verify the actual front across biomes, reduced motion, ready/Stroll absence, safe character visibility, frozen pause and capture splash. Butter checks cover the oversized bill, side-eye visibility, whole-body turning, return to neutral, continuous painting at the turn boundaries, frozen pause, reduced motion and unchanged frog rendering. Before/after platform images and pixel measurements are in `artifacts/render-before.png`, `artifacts/render-after.png` and the matching JSON files; wave images are `artifacts/wave-approaching.png` and `artifacts/wave-caught.png`.
- `pnpm test:sound`: 17 tests pass, including all 62 built-in cue/pack combinations rendered through real OfflineAudioContext. PCM checks cover finite/bounded/distinct signals, cue endings, the full eight-bar phrase, loop seams, stereo movement, playback rate and mix headroom. Real AudioContext tests cover activation, mute, imported loops, legacy death aliases, fallback, pack changes, voice limits, category volumes and disposal. Duration limits differ for effects, ambience and music. Cold preparation yields to input; late preparation cannot restart a stopped scene. Explicit cold music previews coalesce and cancel on stop, mute, pack/clip change or teardown. Schema tests retain malformed/ambiguous mappings, address and metadata coverage. Environmental regression checks measure 44 built-in variants, bounded cache keys, deferred crossfades, independent car phases and preserved imported voices.
- `pnpm test:soundscape`: 15 tests pass against actual engine actor positions, covering proximity, persistent vehicle identity, pan/Doppler, approaching-conflict horns and cooldowns, train passage, synchronized crossing lamps/bells in both modes, lifecycle, sparse birds and bounded voices. New coverage checks road/stream foreground priority, passing gaps, stable engine profiles, six world profiles, interpolated zone transitions and dense-scene power limits.
- `node tests/sound-runtime.mjs`: built-artifact sound integration passes in an opaque `allow-scripts` fixture. Covers actual WAV decoding/hash verification, custom playback, missing-cue fallback, rejected files, naddr SDK decoding, stale load cancellation, saved mute/pack hydration races, native button/Enter loading, pause/background/teardown, absent domains and the 240×240 sound controls. Fixtures supply public Nostr events and resource bytes; this is not a live-relay test. No external requests or browser errors occurred. New built-artifact checks cover music/ambience startup, mix persistence, every layer stopping on mute/pause/background/drawer/teardown, all 31 cue previews, distinct death PCM, real wave/water/traffic `onEnd` dispatch, and contextual horns with passing engines. A hash-verified 4.1-second file mapped to both music and hop loads once: its music loop plays while hop uses the short built-in fallback. Character-call cases cover Q and button parity, first-interaction audio, all six distinct voices, custom call overrides, mute, cooldown, ready/paused/hidden/minimum-size state guards, saved-selection fallback, and a call button without shell keys. A legacy Pip save with 202 coins and Stroll best 42 migrates to Butter/Quack, writes the version marker and survives reload with all progress/settings retained; subsequently choosing Pip persists, including when that choice happens before delayed save hydration.
- `pnpm test:conformance`: conformant — 5 checks pass, 0 fail. 5 checks skip: signed-manifest checks have no signed event, wire collection uses an unconfigured reference shell with no calls, and that runner does not measure lifecycle. These skips are not counted as passes.
- `DOWN_TO_DUCK_PAJA_CLI=/Users/sandwich/Develop/kehto/packages/paja/dist/cli.js pnpm test:runtime`: 9 runtime scenarios, 12 general frame/theme checks and 8 active-wave frame/theme checks pass against the actual artifact in Paja, with `sandbox="allow-scripts"` and no page exceptions. This independently exercises storage/theme/keys traffic, saved milestones, key cleanup, and missing optional domains. The wave case verifies actionable instructions, an accessible time meter, indicated escape control, paused countdown, forward escape, later capture and retry with Less motion enabled.
- CLI deployment dry run resolves kind 35129, d tag `puddlehop`, one `/index.html` artifact and its direct SHA-256 `x` tag, nonempty description, and no required-domain tags. Deployment metadata remains CLI-owned. No event was signed or published.

The frame matrix is **200×160**, **320×560**, **900×600**, **2400×1200**, **240×240**, and **1000×240**, each in actual light and dark shell palettes. Checks cover overflow, matching html/body/root backgrounds, minimum notice, and each visible primary control fitting and receiving hits. The 200×160 frame correctly shows the declared 240×240 minimum notice. Screenshots and the structured scenario report are in `artifacts/`.

Active wave warnings are also checked at **240×240**, **320×560**, **900×600**, and **2400×1200** in light and dark palettes delivered through the theme event. The prompt fits, the forward control receives hits, and the canvas retains the visible flood. Evidence is in `artifacts/wave-{width}x{height}-{theme}.png` and `artifacts/runtime-evidence.json`.

Collision regressions reproduce invisible train ends, premature splash at visible platform edges, and riders losing support when platforms move. The saved pre-fix source fails all three engine regression groups; the updated engine passes across both modes, both directions and both edges, while actual train contacts, open water and world boundaries still end the run. Train clearance scenes independently rasterize the drawn carriage and duck body footprints: both ends have zero overlap and remain safe. Eighteen forward/back/side hop cases verify the displayed ground position against wave contact in normal and reduced motion. The old renderer fails three checks; the current renderer passes all twelve. Visual evidence is in `artifacts/collision-scenes-after.png`, with train/hop measurements in `artifacts/collision-train-after.json` and `artifacts/collision-hop-after.json`.

Butter's head now faces straight ahead with an oversized bill. A smooth 60° whole-body turn occasionally reveals the side of the face, then returns to neutral; the head stays upright throughout. Pause freezes the pose and Less motion disables the turn. The revised art was visually checked through the production renderer at 20, 45, 85 and 180 pixels per tile, in the reversed collection view and against Apricot Grove. Before/current comparisons are in `artifacts/duck-design.png`; the world view is `artifacts/duck-scene.png`; the animated poses and pixel measurements are in `artifacts/duck-turns.png` and `artifacts/duck-turns.json`. The rebuilt opaque-iframe preview was also checked at 900×600: `artifacts/duck-built-forward.png` and `artifacts/duck-built-turn.png`. Existing platform/wave silhouette checks pass with the revised model.

Runtime scenarios cover tap/buttons, Arrow/WASD movement, Enter resume, P pause, and the actual shell Q action plus on-screen Quack control without movement; size-triggered pause; both initial theme palettes plus a live `theme.changed` event; collection/world selection and saved preferences; wave warning/pause/escape/capture/retry; saved coin/distance unlocks and native character home-world selection; pagehide key unregistration; and gameplay with storage, theme and keys absent.


The audio scene demo (`pnpm audio:demo`) uses the production mixer to render
`artifacts/soundscape-scene.wav` (32 seconds) and
`artifacts/soundscape-montage.wav` (54 seconds). The matching
`soundscape-audition.json` gives cue timestamps and measured levels; all cue
measurements are in `sound-quality.json`. The scene has measured peak magnitude
0.214 and no clipping. These measurements establish signal integrity, distinct
cues and mixing behavior; they are not a subjective listening review.

A cold-start regression initially missed the second hop at a 180 ms input
interval: synchronous music generation produced a 242 ms long task and a
316.6 ms frame gap. The same production/Paja sequence after chunked preparation
advances scores 1 then 2, with no observed long tasks and a maximum 16.8 ms
frame gap on this machine. `artifacts/soundscape-startup.json` records the check.
Preparation caches PCM only; stopped scenes never restart when it finishes.

`node tests/sound-layout.mjs` checks the Sounds drawer in the actual Paja shell
at all six documented sizes in both palettes: 12 frame combinations and 90
controls fit, scroll into view and receive pointer hits without horizontal
overflow. The 200×160 notice remains correct. All 30 native range-keyboard
checks pass. A narrowly scoped capture handler keeps the shell's gameplay
shortcuts from consuming volume-slider arrows; it is removed on teardown.
Native select navigation remains unclaimed, and selection handlers work.
This platform's headless native popup does not commit ArrowDown/Enter even on a
blank page, so dropdown verification checks uncancelled key defaults and
explicit selection rather than claiming that popup automation works.
Evidence and screenshots are in `artifacts/soundscape-layout*`.


## Mob progression verification

- `pnpm test:mobs`: 18 behavioral tests pass after the pacing revision. Covers
  160/320/480 thresholds and independent 45-second gate, guaranteed slime-first
  introductions, 14–18-second/24-point arrival spacing with no debut bypass,
  one/two population caps, full spawn grace, escape-space checks and deferred
  arrivals around markets or urgent waves. Walking slimes have no attack events
  or recovery gaps. Tests exercise real crab/wasp approach, close-range committed
  dodges, ease-out versus ease-in-out movement, scenery pathfinding, river banks,
  vehicle/train removal, swept eased contacts, river carry, pause/reset/Stroll,
  pruning and deterministic long-run cadence across 30 seeds.
- `pnpm test:mob-render`: nine tests pass. Distinct voxel bodies use the same
  core dimensions as physics. Walking and recovery leave the ground free of
  attack markers; arrival rings and committed crab/wasp strikes retain warnings.
  Slime stays grounded, crab legs walk and plant during recovery, and wasp hover
  preparation differs from its strike. Depth ordering, pause and reduced motion
  preserve the same physical positions.
  A static overhead warning remains visible when the duck covers a close-range
  crab/wasp ground marker. Pixel checks at widths 240, 320, 900 and 2400 confirm
  full visibility, no overlap with the duck silhouette, and unchanged warnings
  while paused or using reduced motion. Other phases show no overhead warning.
  Evidence: `artifacts/mob-close-warning.json` and its screenshots.
  Cosmetic duck bounce smoothly lowers near active mobs so a low pursuer does
  not appear to collide through empty space. Physical movement is unchanged.
  `artifacts/mob-scenes.png` and `mob-hop-contact.png` show all species, phases,
  actual contacts and forgiving near misses.
- `node tests/mob-runtime.mjs`: built-artifact integration passes for all three
  milestones. The unmodified production module runs in an opaque allow-scripts
  iframe. Explicit Chrome debugger fixtures establish score-minus-one, elapsed
  play time and clear meadow terrain; isolated crab/wasp cases mark the earlier
  species as already encountered. Real direction buttons cross 160/320/480 and
  the production simulation performs the encounters. Independent gates keep
  score 159/time 60 and score 160/time 10 free of mobs; a first-ever encounter at
  320 is still a slime; a real score-200 market invitation suppresses arrivals.
  All species approach quietly, with no attack cue during walking. Actual hops
  bring the duck near crab/wasp windups, then dodge their committed eased strikes;
  recovery stays still. Tests observe spawn/attack/catch PCM, the species hint,
  full mob-state freeze during 1.8-second pauses, one contextual death, retry
  cleanup and SDK result saving. No page exceptions or external requests occur.
  These fixtures do not claim natural survival to 480 points. Evidence:
  `artifacts/mob-runtime.json` and encounter screenshots.
- `node tests/mob-layout.mjs`: actual Paja checks active mobs in light/dark
  themes at 200×160, 240×240, 320×560, 900×600, 2400×1200 and 1000×240.
  Spawn hints fit without obscuring controls or score/world labels, and urgent
  wave guidance takes priority. Visible canvas contributions are measured for
  all three species. This explicitly staged renderer scene displays three
  species together to check each presentation; natural gameplay caps at two.
  The minimum notice remains correct. Evidence is in `artifacts/mob-layout.json`
  and its frame screenshots. Compact light, regular dark and minimum-supported
  dark scenes were visually inspected.

The revised mob build also passes 21 base game, 12 health, 13 market module and
16 market-engine tests; the latter verifies walking speed cards, crab/wasp
warning/recovery cards, extra interarrival delay, freeze and shield expiry.
Together with the 18 mob, nine mob-render and 14 base render checks, 103
behavioral/render tests passed. Guidance, TypeScript, production build and
conformance pass (5 passes, 0 failures, 5 existing skips). The final HTML is
self-contained. The refreshed Paja preview shows the 160-point onboarding,
accepts two hops and pauses normally. No publication was performed.

## Tooling observations

The installed compiled `napplet create` lacks a Deno system permission. The maintained local CLI source completed `create` and `init`. The `napplet paja` wrapper omits Kehto's required target URL; explicit Paja invocation works. Raw Vite development modules are blocked by opaque-origin CORS, so all final previews/tests use the built inline artifact.

The installed Paja build does not push a theme-picker change into its existing provider and accumulates startup request counts across reloads, blocking later storage operations even with cooldowns. The current local Paja build passes the complete suite using the documented Node-CLI override; no shell sources were changed for this game. Separate shell instances prove both palettes, and a protocol-valid theme event proves live application repainting.

The development preview is served through Paja at http://127.0.0.1:5195/ and includes the Dev controls. The production preview at http://127.0.0.1:5197/ excludes them. Publishing/hosting is outside this build objective.


## Pluck and directional damage

- `pnpm test:health`: 12 behavioral tests cover rear/side/front damage in both traffic directions, both modes and both car lengths; actual interpolated hop contact; fast relative sweeps and near misses; authored chassis offsets; contact latching through a lane phase wrap; safe recoil; pause/reset; half-feather thresholds, caps, consumed full-health milestones and no backtrack farming. Other hazards remain fatal during car recovery.
- `pnpm test:render`: 14 checks, including new car-headlight mirroring / chassis-bounds agreement across all worlds and lowered cosmetic bounce near cars while physical positions stay fixed.
- `node tests/health-runtime.mjs`: real built-artifact contacts drive the meter 3→2 (rear), 3→1 (side), 1→1½ at score 100, and 3→0 on a front hit. Exact PCM confirms nonfatal and death cues are separate. Pause preserves health and recovery; retry refills the meter. Twelve frame/theme combinations plus ten active-wave combinations keep the meter clear of controls and warnings. The 200×160 minimum notice remains intact.
- These browser scenarios use CDP to stage road layouts and score 99, then exercise actual controls, engine, HUD and audio. They do not claim an uninterrupted natural 100-hop run. Evidence: `artifacts/health-runtime.json`, `health-runtime-*.png`, `health-layout-*.png`.

## NAP-GAMEPAD

- `pnpm test:gamepad`: 15 tests cover bounded snapshot validation, deadzones/hysteresis, D-pad priority, paced held repeats, face-button mappings, stable controller selection, neutral rearming across context/focus/visibility changes, optional-domain absence, parent-source validation, both transport paths and teardown.
- `node tests/gamepad-runtime.mjs`: built-artifact integration through both a complete injected binding and the canonical draft wire path. Covers actual start/movement/stick-repeat/call audio, pause/resume, collection navigation and selection, focus loss, disconnect/reconnect, held-input suppression, retry, small frames, storage and cleanup. An absent domain keeps fallback controls working without emitting a probe.
- Evidence: `artifacts/gamepad-runtime.json`. The fixture implements the pinned NAP-GAMEPAD draft from [gamepad.md](gamepad.md), with explicitly staged terrain. Local Kehto/Paja has no gamepad forwarding; no physical-controller validation is claimed. The temporary adapter is isolated for SDK replacement and adds no hard domain requirement or direct device access.

## Firefox first-hop crash

The reported exception came from calling `AudioParam.cancelAndHoldAtTime`, which is absent in the tested Firefox 151. The audio mixer now checks for that method. Its fallback reads the parameter's current value, cancels future scheduled changes and anchors that value with `setValueAtTime` before scheduling the next ramp. All six call sites use this helper: loop gain/pan/rate, fading out, category faders and ducking. Holds always use the current audio time.

- `pnpm test:sound`: all 15 tests pass. A real-AudioParam regression removes the method and checks intermediate ramp continuity, gain/pan/rate retargeting, faders, repeated ducking, fade-out, bounded PCM and completion without exceptions.
- `DOWN_TO_DUCK_AUDIO_BROWSER=firefox node tests/sound-runtime.mjs`: the full built-artifact suite passes in genuine Firefox 151 with the method absent, including a first hop followed by another hop after scene updates (proving the animation loop survives). All 31 cue previews, imports/fallbacks, sound mix, persistence, contextual death dispatch, pause/background and teardown pass with no page errors or external requests.
- `node tests/sound-runtime.mjs`: the same complete suite also passes in Chromium with native holding available. Firefox fixtures hold a real pointer press until the observed AudioContext is running before releasing it, reflecting its asynchronous resume behavior. The previous fixed 80 ms hold could release while the context was still suspended; this test change does not add queued playback to the product.
- The local Vite development and preview servers now explicitly allow the opaque iframe's `Origin: null`. A live request to port 5174 returned `Access-Control-Allow-Origin: null`, and the refreshed Paja preview loads without that warning. Browser-extension EventEmitter/ObjectMultiplex warnings are outside the napplet; no listener limit was changed.

The refreshed preview at `http://127.0.0.1:5197/` shows Butter, full Pluck and 31 sound previews. The local shell does not expose gamepad, so controller testing remains the explicitly documented canonical shell fixture. No publication was performed.

## Traffic and stream contrast

The built-in audio now gives compact cars, sedans, trucks and electric vehicles
different harmonic engines. Independent loop phases, actual vehicle motion and
a narrow passing envelope create swells and gaps. Water uses resonant droplets,
bubbles and laps. The occupied surface leads the mix; wind, music and neighboring
roads/streams stay underneath it. All six worlds have distinct environmental
profiles, with deferred buffer preparation and crossfades. Imported cue overrides
remain authoritative and do not restart when the built-in variant changes.

`pnpm audio:zones` passes through the production `Soundscape` and `GameAudio`
using explicit terrain and moving-actor fixtures. The complete mix uses the
app's default music/ambience/effects levels; isolated ambience renders measure
the underlying texture. The [before/after report](../artifacts/audio-zone-comparison.md)
records source hashes and the fixtures:

- Road quiet windows increase from 21.1% to 52.6%; its 90th/10th percentile RMS
  spread increases from 9.5 dB to 23.2 dB. Quiet windows are 250 ms intervals
  below 45% of that segment's 90th percentile level.
- Road ambience has 94.8% of measured spectral energy at 40–350 Hz; stream
  ambience has 93.6% at 350–1800 Hz. Four engine classes have distinct dominant
  pitches and measured left-to-right stereo passages.
- The full terrain montage peaks at 0.184, with finite, unclipped PCM. Ten WAVs
  compare old/new terrain, worlds and vehicles. These are reproducible audition
  fixtures, not natural gameplay recordings or subjective listening scores.

The 17 audio tests and 15 scene tests pass. Guidance, TypeScript, production
build and conformance also pass (5 conformance passes, 5 documented skips).
The complete built-artifact sound runtime passes in Chromium and Firefox,
including both initial hops, pack imports, all cue previews, contextual deaths,
mix persistence and lifecycle cleanup. Firefox still lacks the native hold
method and exercises the compatibility fallback throughout.
The refreshed Paja preview accepts the first and second hop and pauses with full
Pluck and no page exception; the host's missing favicon returns an unrelated 404.

## Run market, cards and powers

The confirmed economy lasts one run: wallet, cards, powers and market cosmetics
clear before death observers run. Lifetime earned coins, scores and traveler
unlocks remain. Spending and card resale never inflate the lifetime earned-coin
record. No inventory or shop state is persisted.

- `tests/market.test.mjs`: 13 tests pass. Covers seeded stock, availability,
  atomic purchases and capacity failures, weighted pack draws, fractional
  carry, score thresholds, reversible effects, powers, fusion, sales and death.
  Every discovered module receives generic contract and apply/remove checks;
  adding a temporary card file proves discovery and independent injection with
  no registry or configuration edit. Counts are minimums, so valid added modules
  do not break the suite merely by existing.
- `tests/market-engine.test.mjs`: 16 tests pass through actual engine hooks.
  Covers 100/200 cadence and frozen clocks; safe coin pickup and income;
  continuous vehicle/platform positions across speed changes; future lane
  geometry; damage/healing; wave/mob timing; and actual collision paths for all
  seven shielded hazards followed by expiry. Specific regressions prove that a
  shield cannot retain a car-contact latch after expiry, river rewards remain
  reachable on their moving supports, and Lucky Lanes adds eight percentage
  points both on land and on rivers (with and without River Gold).
- Existing gameplay, health, mobs, rendering, soundscape and controller suites
  pass: 102 tests. Alongside the final market suites, 131 behavioral/renderer
  checks passed. Controller coverage now includes LB priority, modal neutral
  rearming and the optional callback without changing other mappings.
- `node tests/market-runtime.mjs`: the final built artifact passes in an opaque
  iframe. A real hop opens the score-100 invitation; M opens the market and
  simulation/power/window clocks freeze. Actual UI controls buy and reveal a
  pack, direct cards, a timed power and a visibly rendered cosmetic, combine
  four cards, and sell the result. Tests verify immediate effect/HUD/wallet
  changes, sold stock, score-200 reopening and gamepad purchase, keyboard/Tab
  focus, LB/B behavior, expiry, no backtracking reroll, focus/visibility/minimum
  guards, death cleanup, empty retry, preserved lifetime records and teardown.
  No page exceptions or external requests occurred. Evidence:
  `artifacts/market-runtime.json`.
- `node tests/market-layout.mjs`: actual Paja preview, 12 light/dark combinations
  at 200×160, 240×240, 320×560, 900×600, 2400×1200 and 1000×240. All 140 enabled
  shop controls scroll into view and receive pointer hits. The active inventory,
  market invitation, Pluck, urgent wave and movement controls do not overlap;
  document and shop panes do not overflow horizontally. The small-frame notice
  remains intact, and paused inventory cannot cover Resume. Compact, wide and
  short screenshots were visually inspected. Evidence: `artifacts/market-layout.json`
  and 22 shop/HUD screenshots.
- Existing controller runtime passes injected-binding, wire and absent-domain
  paths. The full sound runtime passes in Chromium and Firefox on the final
  artifact, including the two-hop Firefox hold-method fallback, cue imports,
  contextual deaths, storage and lifecycle. The actual Paja preview also accepts
  two hops and pauses normally with the market UI installed.
- Guidance, TypeScript and production build pass. Conformance: 5 passes,
  0 failures and the existing 5 skips (unresolved manifest, silent wire and
  unmeasured lifecycle). The HTML contains inline code and
  CSS with no external script or stylesheet references.

Browser market scenarios explicitly stage safe terrain, coins and score-minus-one
through debugger access to the unchanged production module; they do not claim
an automated natural 100-hop survival run. Controller integration uses the
documented draft fixture because local Paja does not forward physical devices.
Preview: http://127.0.0.1:5197/ . No publication was performed. The module contract,
catalog, bounds and authoring example are in [market.md](market.md).

## Selectable packs and development inspector (2026-10-13)

The card table now offers Small (three revealed, one kept, four coins) and
Large (five revealed, one kept, six coins) packs. A seeded 20% Large bonus
allows two choices. Candidates are unique, remain inactive until confirmed,
and survive forced closure without another charge or reroll. The world stays
paused until a pending choice is resolved. The market uses dark felt and
portrait playing cards with rarity borders, a restrained fan, selection glow,
and deal/hover motion that respects both motion preferences.

- 130 tests pass across market, engine, development state, game, health, mobs,
  both renderer suites and controllers. The market/engine subset has 35 tests;
  development state adds four. Guidance adds six passing checks.
- The final production market browser test passes Small, normal Large and
  seeded bonus Large choices through real controls, keyboard and controller
  confirmation; no unselected card equips. Forced close/reopen, quotas, fusion,
  sale, powers, cosmetics, death, persistence and teardown remain covered.
  Evidence: `artifacts/market-runtime.json`.
- Final Paja layout verification covers 12 frame/theme combinations and 30
  Small/Large/bonus draft scenes. All 100 enabled shop controls and 130 choice
  controls are reachable, cards stay within their tracks, and the document,
  panes and gameplay HUD retain their bounds. Both motion preferences suppress
  deal/hover movement. Compact, short, regular selected and wide screenshots
  were visually inspected for readable effects, portrait cards, rarity and
  selected-state contrast. Evidence: `artifacts/market-layout.json`.
- Development browser coverage exercises real score jumps, camera/map state,
  sandbox coin grants, healing, clearing pursuers, input capture, frozen clocks,
  record isolation, clean retry and missing optional domains. A regression
  proves delayed storage hydration cannot discard a ready-screen sandbox edit.
  Twelve frame/theme combinations include the exact minimum and short strip.
  Evidence: `artifacts/development-runtime.json`.
- Every production artifact is scanned for inspector modules, styles, UI,
  diagnostics and sandbox-result strings. The production iframe exposes no
  inspector or mutation API, including with debug URL flags. The build command
  explicitly sets `NODE_ENV=production`; the separate development artifact uses
  `NODE_ENV=development` and `dist-dev`. Both builds remain self-contained.
- Guidance, TypeScript and production/development builds pass. Final conformance
  has five passes, no failures and the same five documented skips. Existing
  controller browser integration also passes. Runtime fixtures report no page
  exceptions or external requests.

Actual Paja development preview: <http://127.0.0.1:5195/> (target 5176).
An inspector jump to 100, sandbox coin grant, market opening and Small Pack
selection were also exercised there. The production preview remains on 5197.
No publication was performed. See [development.md](development.md) for commands
and the intentional fresh-run semantics of score teleportation.

## Versioned courses, attraction and market transitions (2026-10-13)

Courses now capture a versioned identity containing the seed, starting world,
mode and gentle opening. The end screen displays that code with Copy seed;
the development inspector can load it into a fresh paused sandbox. Schema 1
preserves the original generation formulas and all 22,680 baseline fixture
rows. Timing, input and purchases still affect gameplay.

Fusion is removed from the UI and inventory API. Purchased stock leaves the
table and enters Your hand, including timed powers and owned looks. Card
stacking has explicit limits; Gold Rush grants 1.5× earnings for eight seconds.
Captured coins visibly accelerate toward the duck and pay once on safe contact.
Their lifetime and rendering survive source-row pruning; rewards physically
left behind eventually retire without retaining an unbounded map.

The market enters over 180ms and exits over 160ms, using opaque textured felt,
a wood border and a heavily blurred/dimmed world. Gameplay remains paused and
the table inert during exit. The world clears before resuming. Blur, minimum
frame size and other forced closures cancel delayed resume. Both motion
preferences remove the transition delay.

- All 190 unit, simulation, audio and renderer tests pass, including two
  captured-coin pruning regressions and actual Canvas attraction frames.
- Production market integration passes purchases, hand ownership, selling,
  pack choices, death/reset, persistence and keyboard/controller lifecycle.
  No fusion controls or API remain. Evidence: `artifacts/market-runtime.json`.
- Actual Paja market layout covers 12 frame/theme cases and 30 pack drafts.
  Eighty shop controls remain reachable. Opening/closing, pause through the
  final exit frame, forced cancellation, purchase focus and both reduced-motion
  preferences pass. Evidence: `artifacts/market-layout.json`.
- Seed copying reaches the browser clipboard in the opaque fixture and in
  actual Paja after natural death. Denied/absent clipboard paths offer selected
  text; retry and teardown invalidate delayed completion. Twelve frame/theme
  cases include fully visible copy/retry controls at 240×240.
  Evidence: `artifacts/seed-copy-runtime.json`.
- Development loading and typed score jumps work through real button clicks
  and Enter inside an `allow-scripts` iframe. Native form submission is blocked
  by this sandbox, so these local controls invoke their actions directly.
  Unknown seed versions leave the current run untouched. Production scans
  confirm that controls, debug text and mutation modules are excluded.
  Evidence: `artifacts/development-runtime.json`.
- Guidance, type-check, both builds and controller browser integration pass.
  Final conformance has five passes, no failures and the existing five skips
  for unresolved manifest, silent wire and unmeasured lifecycle. Browser
  integration fixtures report no page exceptions or external requests.

The screenshots for minimum, compact, regular and wide market frames, selected
drafts and the 240×240 result screen were visually inspected. Browser market
tests stage safe terrain and wallet through debugger access; they do not claim
natural 100-hop survival. Production preview: <http://127.0.0.1:5197/>.
Development preview: <http://127.0.0.1:5195/>. No publication was performed.

### Zero-gravity contact correction (2026-10-13)

Reproduced distant pickup with no cards at a 0.49-tile offset, plus continued
homing after selling the last magnet and expiring Gold Rush. Manual pickup now
requires the duck's body to contact the coin's actual position (0.32-tile core
contact radius). Land crossings and supported sideways log hops count, keeping
coins reachable after fractional river drift. River approaches still validate
the landing before paying. At zero gravity, an in-flight coin stops where it
is and remains available for manual contact instead of snapping to its origin.

All 55 focused game, market-engine, magnet and renderer checks pass. New
regressions cover both sides of the duck, separated platform coins, unsupported
water approaches, moving-platform crossings, selling and power expiration.
Guidance, type-check and both builds pass; final conformance has five passes,
zero failures and the same five documented skips. Both previews are rebuilt.

### Market districts in the world (2026-10-13)

The four-row approach and eleven rows after each 100-point stop now replace
some meadow props with produce counters, wheeled carts and striped canopy
stalls. The original asset's bounds determine each stand's size. Seed, row and
position determine its color/goods variation; source rows and collision cells
remain unchanged. A bounded cache reuses twelve looks per original model.

- All 50 focused scenery, Canvas renderer, game and seed tests pass. This
  includes the unchanged 22,680-row schema-1 baseline, three fitted stand sizes,
  deterministic selection, bounded caching, and no replacements outside the
  market districts or on hazard lanes.
- Actual Canvas scenes at 320×560, 900×600 and 1440×900 verify that replacement
  props draw once at their original coordinates without mutating lane state.
  Compact, desktop and original/replacement model sheets were inspected.
  Evidence: `artifacts/market-scenery-render.json`,
  `artifacts/market-scenery-models.png`, and `artifacts/market-scenery-*.png`.
- The rebuilt development artifact was exercised in actual Paja: copied seed
  load, score-100 jump, resume, shell Q input and opening the market succeeded
  with no page exceptions. `artifacts/market-scenery-paja.png` shows the new
  scenery with the active market invitation. Paja's favicon request still
  returns its unrelated 404.
- Guidance, type-check and production/development builds pass. Conformance has
  five passes, no failures and the same five documented skips. Both existing
  preview URLs serve the rebuilt artifacts; no publication was performed.


### Market assortment, wardrobe and hand balance (2026-10-13)

The market groups three random cards above an optional rare find on the left
and two randomly mixed packs/cosmetics on the right. Rare availability is a
seeded 35% roll; reopening retains the exact stock. Existing prices are now
four times their original values. The ordinary hand holds three cards, with
visible count/capacity and projected-hand checks before purchases, claims and
sales. Extra Pocket adds two slots while occupying one; Travel Light removes
one slot in exchange for 25% more coin earnings. Unsafe pack candidates are
excluded before payment, and rejected staging restores random state and IDs.

Three hats and two shirts combine with the existing effect slot. Purchases equip
their own slot, and owned looks can be worn again for free during the market.
Clothes share the body model's depth sorting, turning and hop transform; they
change no collision geometry or gameplay effects and disappear on death.

- 36 market/engine checks pass, including 500 seeded stock samples, fourfold
  pricing, three-card purchase rejection, capacity-changing modules, timed
  powers, transaction atomicity and drop-in item discovery.
- Eight capacity and four wearable unit checks pass, including adversarial
  negative-capacity pack pools, slot bounds, safe selling, free switching and
  reset. Actual Canvas verification covers 36 traveler/outfit/yaw combinations,
  shared hop and reduced-motion transforms, visible clothes and readable duck
  bill pixels. `artifacts/wearables-sheet.png` was visually inspected.
- The final built-artifact market runtime passes real purchase, draft, sell,
  keyboard/controller, forced closure and death/retry flows. Hat, shirt and
  effect coexist in the HUD and canvas. Re-equipping an owned hat changes no
  coins or other slots and restores identical paused canvas pixels. No page
  exceptions or external requests. Evidence: `artifacts/market-runtime.json`.
- 65 gameplay, seed, magnet, renderer and development-tool regressions pass,
  including the unchanged 22,680-row schema-1 course baseline.
- Guidance, TypeScript and production/development builds pass. Final conformance
  reports five passes, no failures, and five existing skips for unavailable
  manifest, wire and lifecycle evidence.
- Actual development Paja was exercised with seed `ph1-00000015-orchard-s-n`,
  a score-100 jump, naturally generated rare/hat/shirt offers and real purchases.
  Screenshots: `artifacts/market-grid-paja.png`, `artifacts/market-outfit-paja.png`.
  The unrelated Paja favicon 404 is the only console error.

- The market layout sweep passes 12 frame/theme combinations, 111 reachable
  controls and 30 pack drafts. It verifies desktop card/rare/extras placement,
  no outer scroll drift, 120% animated selection and the rotating 14%-opacity
  starburst, deselection and both reduced-motion preferences. Both selected
  bonus-card labels remain reachable without overlap. CSS grid rows now size
  to the actual card height, and the game viewport cannot move when focus
  scrolls a card. The sweep uses the same CSS as the final build and explicit
  ordinary-card fixtures; final runtime separately covers the later capacity
  changes. Evidence: `artifacts/market-layout.json` and refreshed screenshots.


### Cosmetic item displays and current-traveler preview (2026-10-13)

Cosmetic offers and owned looks now use shaded item models on display stands,
without playing-card faces or corner ranks. Real voxel geometry turns on hover
or keyboard focus and returns smoothly to a front view. A persistent shopping
strip shows the selected traveler and equipped hat, shirt and effect; it updates
on each purchase or equipment change. The existing pack/card presentation and
selection feedback remain in place.

- The preview module reuses the game renderer and clothing models. Three
  dedicated browser-render tests pass across 126 sampled views covering all
  eight cosmetics and six travelers. They check shaded pixels, full-turn bounds,
  stable framing, idle/hover/return, resizing, character/equipment updates,
  both reduced-motion preferences, offscreen/hidden pause and disposal.
- Unchanged repeated state updates do not redraw idle models. Canvas observers,
  motion listeners and queued frames are released when previews are replaced;
  closing the market or opening a pack suspends retained previews.
- The contact sheet `artifacts/market-preview-sheet.png` and actual Paja market
  screenshot `artifacts/market-3d-paja.png` were visually inspected.
- Guidance, TypeScript and both builds pass. Conformance has five passes, zero
  failures and the same five documented missing-evidence skips.

- Final production market runtime passes with Pip explicitly selected, proving
  the portrait is not hardcoded to Butter. It checks shaded cosmetic models
  without card decoration, hover/focus rotation, both reduced-motion settings,
  idle/closed stability, immediate outfit changes and exact restoration after
  free re-equipping. No page errors or external network requests.
- The final Paja layout sweep passes all 12 size/theme combinations, 131
  reachable controls and 30 pack drafts. Cosmetic displays and the current
  traveler remain visible and focusable at supported sizes; the minimum-size
  notice and existing animated card selection stay intact. Evidence:
  `artifacts/market-runtime.json`, `artifacts/market-layout.json`, and refreshed
  market-layout screenshots. Actual equipped Butter was also inspected in
  `artifacts/market-3d-equipped-paja.png`.


### Separate cosmetics wardrobe (2026-10-13)

Owned cosmetics now live in a dedicated Wardrobe with Hats, Shirts and Effects
sections. Cards and powers remain in Your hand. Desktop uses separate scrolling
shop/hand and wardrobe panes, with a persistent wardrobe heading; compact
frames use Shop & hand / Wardrobe buttons. The current traveler remains visible
in both views. Cosmetic purchases and free equipment changes focus their
wardrobe entry, while card purchases and claims focus the hand. Cosmetics do
not suppress the empty-hand state or affect its count.
Compact Wardrobe hides the card-reveal strip so previous pack purchases cannot
consume the space needed to reach clothing and equipment controls.

- The final production runtime passes separation, purchase/focus, compact view
  switching, free re-equipping, portrait updates, hover/focus rotation, reduced
  motion and lifecycle checks, with no page errors or external requests.
- Guidance, TypeScript and production/development builds pass. Conformance
  reports five passes, no failures and the same five documented skips.
- Actual development Paja was checked at 1600×1000 and 320×560 with purchased
  hat and shirt. The hand has zero cosmetic items and the wardrobe has both.
  Inspected screenshots: `artifacts/market-wardrobe-paja.png` and
  `artifacts/market-wardrobe-compact-paja.png`.
- Final production layout checks pass all 12 size/theme cases, 175 reachable
  controls and 30 pack drafts, with no page errors. The compact regression also
  checks the wardrobe after a two-card pack reveal. Evidence:
  `artifacts/market-layout.json`, `artifacts/market-runtime.json`, and the
  inspected `artifacts/market-wardrobe-240x240-dark.png`.

### Musical traffic horns (2026-10-13)

Traffic horns now draw exact semitone pitches from the backing score's related
C Ionian, A Aeolian, F Lydian and G Mixolydian scales. They favor chord tones,
avoid immediate repeated pitches and use eight vehicle articulations. Pond
uses a C3–C5 range; Pocket Arcade transposes both music and horns up two
semitones. World changes preserve musical tuning. Horns require a conflict
within three tiles of the visible traveler, including during hops.

- All 18 soundscape tests pass, including both travel directions, long and fast
  cars, exact radius boundaries, diagonal/horizontal hops, note range/scale,
  deterministic choices and music resume positions in both game modes.
- All 20 sound tests pass. Actual PCM measurements cover 48 notes across all
  eight voices in both packs; maximum pitch error is 1.184 cents. Bounded
  variant caches, imported cue authority, mix headroom, Firefox-safe automation
  and loop offsets remain covered. Evidence: `artifacts/sound-horn-quality.json`.
- Guidance and type checks, production/development builds and final conformance
  pass (five conformance passes, zero failures, five existing evidence skips).
- Actual Paja at `http://127.0.0.1:5195/` was checked with two hops, character
  call, drawer pause, both packs' horn auditions and a restored Pond selection.
  No page exceptions occurred and the Dev button remains available.
- Final built audio integration suites pass in Chromium and Firefox, including
  real traffic encounters, exact scale-note playback, vehicle-specific horn
  PCM, imported packs, optional-domain degradation and lifecycle cleanup. No
  page errors or external requests. Firefox exercises the missing
  `cancelAndHoldAtTime` compatibility path.

### Progressive traffic, platforms and restored horn character (2026-10-13)

Schema-2 runs keep the first 50 rows uniform, introduce mixed vehicle sizes and
speeds at 50, slow cargo trucks at 100 and rare accelerating sports cars at 150.
River lengths and gaps vary increasingly every 50 rows through 400. A shared
analytic actor sampler drives rendering, collision sweeps, river support,
attached coins and traffic sound. Entry timing prevents vehicles overtaking or
overlapping; sports cars accelerate one third across the playable road.

- Actor generation/motion tests pass 10/10; actual-game integration tests pass
  6/6; browser-render tests pass 2/2. Coverage includes both travel directions,
  exact vehicle/platform boundaries, riders, coins, arbitrary-time replay,
  speed changes, freezing and geometry-changing cards. Model and gameplay
  contact sheets were inspected.
- Seed tests pass 11/11 with unchanged schema-1 golden hashes and a new pinned
  schema-2 recipe/motion hash. Developer tests pass 7/7. The final devtools
  runtime passes 12 size/theme cases, both seed versions and production
  exclusion, without page errors or external requests.
- Final seed-copy runtime passes 12 size/theme cases and real production Paja
  at 5197, including natural death and native clipboard copying. No page
  errors or external requests. Evidence: `artifacts/seed-copy-runtime.json`.
- Soundscape tests pass 19/19, including individual truck/sports engine voices,
  actual acceleration and the unchanged three-tile horn gate.
- Horns now hold a saturated, harmonically rich diaphragm tone throughout each
  press. All 20 sound tests pass; 48 rendered-note measurements stay within
  0.786 cents. Sustained level and upper-harmonic regression checks protect the
  horn character. Audition: `artifacts/sound-horns.wav`.
- Both final-built Chromium and Firefox sound runtime suites pass actual
  vehicle-specific, in-key horns, first-hop playback, contextual deaths, custom
  packs and lifecycle cleanup. No page errors or external requests. Firefox's
  isolated run passes after an initial parallel-run music-start timeout.
- Guidance, TypeScript and both builds pass. Final conformance reports five
  passes, zero failures and five existing missing-evidence skips. Production
  bundle: `index-D77TGYZD.js`; development: `index-luuxI8wW.js`.
- Actual development Paja loads schema 2 and jumps to 150 and 250 with the Dev
  controls intact. Mixed vehicles and platforms were inspected in
  `artifacts/actors-paja-150.png` and `artifacts/actors-paja-250.png`; no page
  exceptions occurred during the check.

### Automatic traveler powers and Sunny (2026-10-13)

All seven travelers now have a matching-hazard survival power with one charge
and a shared cooldown of 100 new forward blocks after use. Butter bounces out
of water; the new free chicken Sunny flutters clear of fatal road traffic.
Other travelers evade mobs, regrow, eject from vehicle impacts or escape the
wave. Powers are separate from market inventory and leave unrelated hazards
fatal. Full rules and applet boundaries: `docs/character-powers.md`.

- All 14 engine power tests pass, including real collisions for every traveler,
  safe landing selection, exact +100 recharge from use at 99, nonfatal hits,
  pause/backtracking, shared charge across swaps, shield priority, preservation
  of rewards/terrain, second-death cleanup and development cloning. The rescue
  contact guard prevents one overlapping mob from interrupting the rest of
  the director; landing grace covers mobs only.
- The power-render browser test passes all seven travelers in full and reduced
  motion. The contact sheet `artifacts/character-powers-sheet.png` and Sunny's
  four-angle model sheet were inspected. Existing renderer tests pass 14/14;
  wearable tests pass 5/5, including 42 outfit renderings.
- Game, health and market-engine tests pass 50/50. Magnet tests pass 14/14;
  mob tests pass 18/18; soundscape tests pass 19/19. Legacy fatal-water fixtures
  explicitly use Sunny so they continue checking the terminal path. Seed tests
  pass 11/11 with both course hashes unchanged; devtools tests pass 7/7.
- All 21 sound tests pass. Sunny's two-cluck voice is bundled in both packs;
  partial v1 sound packs retain fallback compatibility. The menu now has 32
  cues and seven traveler calls. Final Chromium and Firefox sound integrations
  pass, including real fatal wave/water/traffic encounters, in-key horns, custom
  packs and lifecycle behavior. The health browser suite passes unchanged.
- Final production power UI checks pass ready, paused and playing layouts at
  200×160, 240×240, 320×560, 900×600 and 2400×1200 in both runtime themes.
  Checks cover minimum-size notice, reduced motion, activation toast precedence
  at chapter boundaries, shared cooldown after selecting Sunny and the 99/100
  threshold. Evidence: `artifacts/character-power-runtime.json`; no page errors.
- Actual Paja at 5195 was checked with Sunny selection, shell-backed saving,
  first hop, pause and the new power display. Butter was restored afterward.
  The screenshot `artifacts/character-powers-paja.png` was inspected. Development
  diagnostics show traveler, power, recharge and rescue state; production omits
  the inspector, jump controls and development score surface.
- Final guidance, type checks, both builds and conformance pass. Conformance
  has five passes, zero failures and five existing missing-evidence skips.
  Production bundle: `index-0LLHw-bO.js`; development: `index-DalB4XNx.js`.
  No new permissions, dependencies, storage keys or runtime network paths.

### Market game screens (2026-10-13)

The market uses an opaque voxel clearing, striped canopy and timber counter.
Shop, Hand, Looks, item inspection and pack selection are separate game screens.
Large tables show the requested three-card / rare / two-extra arrangement;
smaller frames use explicit category and item pages. No market region scrolls.
All active controls have at least 44×44 targets, and full item descriptions
remain available in the inspection screen.

- All 53 market engine, capacity, wearable, preview and scene tests pass.
  Preview fixtures derive their subject count from the seven-traveler roster
  and select travelers by stable ID. Scene tests cover opacity, themes,
  hidden/disposed rendering and pixel-ratio limits.
- The adapted market runtime suite passes all nine scenario groups: actual
  transactions, capacity, regular/bonus drafts, free outfit changes, model
  rotation, keyboard/gamepad, focus/visibility/minimum-size recovery,
  invitation expiry, death and persistence. No page errors or external requests.
- Layout coverage uses the production artifact in an opaque allow-scripts
  iframe. CDP stages milestone/stock/wallet; navigation, inspection, purchases,
  sales, pack choices and claims use real UI actions. The former scrollbar
  acceptance fixture now delegates to this suite.
- Actual Paja at 5195 was inspected at desktop and 390×844, including full item
  inspection and large Back/Buy controls. Mute changes round-trip through shell
  storage and restore the original preference. The only console error was the
  host's missing favicon. Screenshots: `artifacts/market-paja-final.png` and
  `artifacts/market-paja-phone-inspect.png`.
- Guidance, TypeScript and development/production builds pass. Conformance
  reports five passes, zero failures and five existing missing-evidence skips.
  The artifact remains self-contained; production excludes development controls.
  No dependencies, permissions, storage keys or network paths were added.
  Production JS: `index-Zb0EJlij.js`; development JS: `index-BXTP8Z9d.js`.
- Final layout suite passes 350 normal screen assertions across 200×160,
  240×240, 320×560, 390×844, 844×390, 900×600, 1440×1000 and 2400×1200 in
  both themes. Seven draft frame sizes also pass selection, 120% enlargement,
  subtle rays, reduced motion and claim checks. Resize preserves the exact
  wardrobe item; sold-out short frames show an explicit empty state. Wheel,
  PageDown and End never scroll the market. No page errors or external requests.
  Final evidence: `artifacts/market-game-layout.json` and
  `artifacts/market-game-contact-sheet.png`; production CSS `style-H54PblhB.css`.

### Death spill, full-hand packs and centered pause (2026-10-14)

Fatal deaths snapshot the run wallet and every owned cosmetic before clearing
inventory. Their shared voxel models scatter, bounce and settle in the world;
the results appear after 1.1 seconds of visible animation. Empty inventories
and Less motion show results immediately. Packs now open with a full hand,
with an explicit replacement step after picking cards and a no-refund skip.
Pause uses a centered timber-framed board, bundled Lilita One type and a tinted
world; compact frames have separate Rules and Power pages without scrolling.

- All 86 targeted tests pass across death-spill motion/integration/rendering,
  shared cosmetic previews, renderer behavior, market transactions/capacity
  and seed replay. Both schema golden hashes remain unchanged. The spill tests
  cover all owned cosmetics, exact coin value in bounded piles, ground contact,
  rescue priority, synchronous inventory loss and reduced motion.
- Built death-spill runtime checks pass at 900×600 dark and 320×560 light,
  including early-retry prevention, blur/visibility/minimum-size freezing,
  unchanged world clocks, results/retry, empty inventory and Less motion.
  Evidence: `artifacts/death-spill-runtime.json`. The rendered contact sheet
  `artifacts/death-spill-720x500.png` was visually inspected.
- Final pack replacement tests pass all five scenario groups and 20 layout
  checks across seven sizes. Coverage includes full hands, positive/negative
  slot modifiers, regular and large packs, skip, back-to-picks preservation,
  forced closure and resizing. All nine existing market runtime groups pass.
  Evidence: `artifacts/market-pack-replacement.json` and
  `artifacts/market-runtime.json`; no page errors or external requests.
- Pause layout checks pass 24 size/theme combinations from the minimum-size
  notice through 2400×1200, plus all seven traveler descriptions at 240×240
  and 900×600. Checks cover centered placement, loaded font, 44px minimum
  targets, complete paged text, no scrolling, keyboard/controller navigation,
  frozen clocks, reduced motion and collection focus restoration. Evidence:
  `artifacts/pause-game-layout.json`; no page errors or external requests.
- Actual development Paja at 5195 was checked at 900×600 and 390×844. Rules,
  Power, Back, resume and pause work, and two mute changes round-trip through
  shell storage before restoring the original preference. The only console
  error is the host's missing favicon. Visually reviewed screenshots:
  `artifacts/pause-paja-desktop.png` and `artifacts/pause-paja-phone.png`.
- Guidance, TypeScript and both builds pass. Conformance reports five passes,
  zero failures and five existing evidence skips. Production has no development
  controls; both self-contained artifacts retain the full bundled font license.
  Production JS: `index-Dq_COce_.js`; CSS: `style-BnW6uomV.css`.
  Development JS: `index-Cm5rJoZB.js`. No new runtime permissions, dependencies,
  storage keys or network paths.

### Consistent game interface (2026-10-14)

Ready, results, pause and collection now share centered timber-and-paper boards,
Lilita One lettering, raised controls and a tinted game backdrop. Gameplay HUD
and market controls use the same type and materials. The collection sidebar
has become a paged traveler/world browser, Sounds book and Camp preferences.
Results show completed-run statistics and a full, clickable seed; compact
frames use explicit information pages instead of scrolling or reducing text.

- Ready/results pass 36 state/frame/theme cases, from the 200×160 notice to
  2400×1200. Tests inspect actual geometry, text overflow, 44px targets, loaded
  font, tint, and material equality with pause. Known run values verify distance,
  earned coins, active time, mode-specific best, chapter and traveler; complete
  cause/reward/help/power text remains reachable. Evidence:
  `artifacts/run-menu-layout.json` and its rendered screenshots.
- Pause retains its 24 frame/theme checks, all seven powers, frozen clocks,
  reduced-motion behavior and collection focus restoration. Collection passes
  14 frame/theme cases (196 visible-state checks), all seven travelers and
  complete stories, all eight starting-world choices, paginated settings,
  native/SDK range input, storage writes and missing optional sound domains.
  Evidence: `artifacts/pause-game-layout.json` and
  `artifacts/collection-game-layout.json`. Desktop, phone and widest collection
  screenshots were visually inspected.
- Gameplay HUD passes 12 frame/theme cases: controls are at least 44×44,
  visible and clickable without overlap. Checks include pause, minimum-size
  recovery, collection return focus and SDK mute persistence. Market retains
  all 350 screen assertions across both themes after adopting the shared font,
  plus pack, wardrobe, resizing and controller scenarios. Evidence:
  `artifacts/hud-game-layout.json` and `artifacts/market-game-layout.json`.
- Seed sharing passes 12 frame/theme cases, including full textarea visibility,
  native copying, async clipboard support, denied/absent clipboard selection,
  direct seed click and SDK Enter, Escape back to results, stale-promise cleanup,
  and actual production Paja clipboard copying. Selecting the next traveler
  preserves the completed run's traveler and seed. Evidence:
  `artifacts/seed-copy-runtime.json`.
- Controller integration passes both wire and injected-binding modes plus
  missing-domain fallback. Actual controller input navigates ready Help, pause
  Power, collection selection/settings, results Stats/Seed, Back and retry.
  Held inputs, movement repeat, sound, focus, disconnect and teardown retain
  their checks. Evidence: `artifacts/gamepad-runtime.json`.
- Adapted audio integration passes Chromium and Firefox with all original
  playback, imported-pack, failure, music/horn/death and cleanup assertions.
  Live production Paja sound layout passes 12 frame/theme cases and 90 controls;
  character-power integration passes rescue/cooldown and 10 frame/theme cases.
  Death-spill runtime still passes all four scenarios, including reduced motion
  through the new Camp page. No app page exceptions or external requests were
  reported by the isolated suites.
  The live sound-layout runner now snapshots pack, mute and mixer preferences
  and restores them through real controls in `finally`, verifying the SDK save.
  A failure-path restoration probe passes; evidence:
  `artifacts/sound-layout-preference-restore.json`.
- Actual development Paja at 5195 was checked at 900×600 and 320×560: natural
  death, displayed run time, seed click-to-copy, compact Back, collection Sounds
  pages and two restored mute changes round-tripping through shell storage.
  Screenshots `artifacts/gui-paja-ready.png`, `gui-paja-results.png`,
  `gui-paja-results-phone.png` and `gui-paja-seed-phone.png` were inspected.
  The only console error was the host's missing favicon.
- Guidance, TypeScript, production/development builds and conformance pass.
  Conformance reports five passes, zero failures and five existing evidence
  skips. Production excludes the developer controls; both single-file artifacts
  include the complete font license. Production JS: `index-Dt_O8ZPr.js`, CSS:
  `style-CTxt9cRp.css`; development JS: `index-i0-4ScHH.js`. No gameplay rules,
  runtime permissions, dependencies, storage keys or network paths were added.

### Contextual death-spill audio (2026-10-14)

Coins now make short synthesized metallic contacts, hats/shirts make soft cloth
impacts, and cosmetic effects make hollow accessory taps. Contacts follow the
visible landing/bounce clock, pan with the scattered belongings and get quieter
on successive bounces. Larger wallets increase density and weight, including
coins grouped into visual stacks. Three simultaneous spill voices preserve room
for the contextual death cue. Reduced motion gives one immediate contact per
material. The three optional cues extend existing partial v1 packs unchanged.

- All 24 audio tests and 16 spill tests pass. Actual PCM checks cover both packs,
  three weights, material spectra, headroom, imported clips, effects/mute, and
  death-voice preservation under a barrage of maximum-duration imported impacts.
- Seven production audio-runtime scenarios pass: empty/one/5,000-coin wallets,
  mixed cosmetics, blur/resume, mute, reduced motion, retry and teardown. Every
  heard animated impact follows a visual contact within 55 ms. No browser errors
  or external requests. Evidence: `artifacts/death-spill-audio-runtime.json`.
- Existing visual spill runtime and complete Chromium/Firefox audio integration
  pass. All 35 cues are available in Sounds, including the new material previews.
- Offline production-mixer auditions confirm bounded increases in landing
  energy across wallet sizes; mixed peak stays below 0.105. Evidence:
  `artifacts/death-spill-mix-audition.json` and corresponding WAV files.
- Guidance, TypeScript, production/development builds and conformance pass
  (five passes, zero failures, five existing evidence skips). Actual development
  Paja loads all three new previews; preferences were left unchanged. Production
  JS: `index-rJ9KEnIk.js`; development JS: `index-C96ncajS.js`.

### Persistent hand and sales from every view (2026-10-14)

Owned cards now occupy one bottom shelf during play, pause, collection, market
browsing, offer inspection and pack drafting. Selecting a card opens its details
and Sell action above that shelf. Sales are allowed anywhere in a live run and
preserve the underlying menu, offer and draft picks. Gameplay inspection pauses
locally and restores movement focus when closed; existing pauses remain paused.
Slot-card capacity checks remain enforced. Timed powers retain their separate
HUD countdown, including runs with powers but no held cards.

- All 53 market/model/engine/wearable tests pass, including sales outside markets,
  draft sales without rerolls or payment changes, stale/dead rejection and slot
  capacity protection.
- `node tests/run-hand-runtime.mjs` passes six scenario groups and 44 layout
  checks. Frames: 240×240, 320×560, 900×600 and 2400×1200 in light/dark themes;
  200×160 shows the minimum-size notice and recovers without losing the hand.
  Tests cover six-card pagination, sale-funded offer inspection, preserved pack
  choices, SDK/native focus navigation, pause ownership, immediate modifier
  updates, resumed duck movement, power-only HUD and death/retry cleanup.
  Evidence: `artifacts/run-hand-runtime.json` and `run-hand-*.png`.
- Adapted `node tests/market-runtime.mjs` passes all nine existing scenario groups
  with the shared hand and separate Powers view. No runtime errors or external
  requests. A focused nine-state compact review also passes, including paged
  inspection copy and a full 20% selected-card lift above the hand. Final small
  draft screenshots were visually inspected; evidence:
  `artifacts/market-hand-compact-review.json`.
- All browser checks for this feature launch Chromium with `--mute-audio`.
  Actual development Paja at 5195 loads and completes a user-triggered SDK save;
  its original mute preference was restored, with no browser errors.
- Guidance, TypeScript, production/development builds and conformance pass
  (five passes, zero failures, five existing evidence skips). Final production:
  `index-BPjdvpPW.js` / `style-DWTzAxta.css`; development:
  `index-CASeMR6W.js` / `style-B8_6yIgn.css`. No publication performed.

### Six-slot market and expanded inventory (2026-10-14)

The Market now shows a fixed 3×2 board at every supported frame size: three
random cards above, one occasional rare item or pack below left, and two
cosmetics below right. Bought or missing offers retain their slots. The only
main tabs are Market and Wardrobe; Wardrobe shows the dressed traveler beside
owned 3D cosmetics. The bottom hand stays interactive across inspection and
pack choices. Short frames condense artwork and limit long overview names to
two lines; selecting an item shows its complete name and description.

Added exactly 30 card modules and 20 cosmetic modules (12 hats, 8 shirts).
Cards combine existing bounded effects, including income, recovery, transport,
pursuit and hand-capacity tradeoffs. Cosmetics share their authored geometry
between previews, worn outfits and death drops. Lists are in `docs/cards.md`
and `docs/cosmetics.md`.

Schema 3 adds Bigger Bar (2; 1/35), Small Sack (5; 1/100), Big Sack (10; 1/500)
and Huge Sack (25; 1/1234). These are exclusive chances per spawned pickup;
the remainder are ordinary coins. A private seed/row roll preserves terrain
and actor random streams. Existing schema 1/2 codes keep their original courses
and one-coin pickups. Larger models have corresponding contact bounds and
visible values. Magnet, bonus, multiplier and death-spill amounts remain exact.

- 62 market/model tests pass, including every new card and cosmetic, capacity
  tradeoffs, reversibility, stock composition and slot-specific equipment.
- Nine denomination tests cover exact probability intervals, one million
  stratified rolls, manual contact, magnet travel, platform rewards, card-added
  coins, legacy compatibility, death value and real Canvas silhouettes. The
  actual rendered widths grow from 30 to 86 pixels in the reference scene.
  Evidence: `artifacts/coin-denominations.png` and denomination render tests.
- All 19 seed/developer model tests pass. The original schema 1/2 golden
  digests remain unchanged, and schema 3 has its own pinned denomination
  digest. Removing its added metadata exactly reproduces schema 2 rows.
- Market layout checks cover seven supported sizes in both themes, every
  offer's details, Wardrobe models, fixed sold/empty slots, long catalog names,
  minimum-size recovery and selected bonus packs. The layout command now uses
  `tests/market-board-runtime.mjs`; the previous category-based entry point
  forwards to that suite. Evidence: `artifacts/market-board-runtime.json`.
- Market runtime passes nine scenario groups; persistent-hand runtime passes
  six groups and 44 frame checks. Fixture pack choices now use public capacity
  projections so newly added slot cards exercise the same transaction rules.
- Seed copying and developer runtime pass 24 combined theme/frame checks,
  including actual Paja clipboard copying of ph3 and loading/jumping with all
  three schemas. Production excludes developer controls. Browser checks are
  muted with `--mute-audio`; no runtime errors or external requests.
- Guidance, TypeScript, production/development builds and conformance pass
  (five passes, zero failures, five existing evidence skips). Final production:
  `index-BXrpoq3V.js` / `style-BAzdcT6t.css`; development:
  `index-Dy0bqHNg.js` / `style-B4w17f4Y.css`. No publication performed.

### Game archetype and launch intents (2026-10-14)

Advertises `game` and `napplet:game/open` with optional `seed`/`mode`
parameters and optional NAP-INTENT. Updated SDK to 0.29.0 and Vite plugin to
0.16.0 for the current delivery interface and manifest tags. This is a local
game payload contract, documented in `docs/intents.md`.

- Ten built-runtime scenario groups pass in an opaque `allow-scripts` iframe:
  delayed hydration, early player input, schema 1/2/3 replay, mode-only opening,
  thirteen rejected payloads/conventions, real pickup/end bookkeeping, active
  run/market/pack/death preservation, teardown, and absent/legacy/failing domains.
  Launches never unlock audio or auto-start play. All browser fixtures use
  `--mute-audio`. Evidence: `artifacts/game-intents-runtime.json`.
- Existing game (21), seed (12), guidance (6) and TypeScript checks pass.
- Unsigned production metadata contains `z game`, `i napplet:game/open seed mode`,
  and `O intent`, without a required intent domain. Its artifact hash matches
  the self-contained HTML file.
- Production/development builds pass. Conformance: five passes, zero failures,
  five existing evidence skips (manifest, wire, lifecycle); dedicated intent
  checks above cover metadata and lifecycle separately.
- Production: `index-X5scYvdf.js` / `style-BAzdcT6t.css`; development:
  `index-BJAue36O.js` / `style-B4w17f4Y.css`. No publication performed.
- Actual Paja at `http://127.0.0.1:5197/` loads the build with the current
  `intent.onDelivery` API, working shell storage/shortcuts, and no startup errors.
  Its existing iframe-URL preview has no intent catalog, so a standard game
  invocation is rejected by the shell before delivery. Routing through a
  populated catalog remains unverified; direct SDK delivery is exercised by
  the opaque-frame suite above. Evidence: `artifacts/intents-paja-runtime.json`.

### Default gravity for river-shifted hop grids (2026-10-14)

Reproduced a cardless duck riding a moving platform to a half-tile offset,
hopping to a fixed bank coin, and remaining unable to collect it. Default
gravity is now 0.1, giving the existing attraction system a 0.6-tile capture
radius. The closest position on a translated hop grid is at most half a tile
from a coin column. The duck keeps its fractional position; coins visibly
travel to it and pay on safe arrival. Cards add range as before, with the
existing maximum unchanged. Selling/expiry restores this baseline.

- `tests/log-coin-gravity.test.mjs` failed against the previous default and now
  passes four tests spanning 1,161 actual ride/hop scenarios: a dense full
  fractional-offset sweep, half-tile boundaries, both drift directions and
  modes, every platform model, all three seed schemas, and all denominations.
  It verifies visible travel, exactly-once rewards, no required cards, and
  unchanged fractional coordinates through pickup and the next hop. Included
  in `pnpm test:magnet`.
- 103 relevant model tests pass across game, seed, market engine, card expansion,
  magnet, denomination, market, and new log-landing suites. Explicit zero-pull
  fixtures retain manual-contact coverage; baseline pull leaves full-tile
  neighbors untouched. Released course golden snapshots remain unchanged.
- Built persistent-hand tests pass six scenario groups and 44 frame/theme
  checks, including selling the last magnet back to baseline gravity. Chromium
  is muted; no browser errors. Evidence: `artifacts/run-hand-runtime.json`.
- Guidance, TypeScript and production/development builds pass. Conformance:
  five passes, zero failures, five existing evidence skips. Production bundle
  `index-CZ2hFAeq.js`; development bundle `index-BNIxpIbX.js`. No publication.

### Down to Duck rename (2026-10-14)

The HTML and Vite titles, napplet metadata title, Zapstore display name,
shortcut labels, README and documentation now use **Down to Duck**. The package
and temporary test directories use `down-to-duck`; tooling environment variables
use `DOWN_TO_DUCK_*`. Stable deployment/listing IDs, storage keys, shortcut IDs,
sound-pack tags and seed formats retain their existing compatibility identifiers.

- Verified both built HTML titles and generated manifest titles, package name,
  napplet and Zapstore display metadata, and unchanged deployment identity.
  A separate source/config/docs audit found no leftover display branding.
- `pnpm verify` and `pnpm build:dev` pass. The game, market and sound suites pass
  all 67 tests, including saved progress and existing sound-pack compatibility.
- The production SDK intent suite passes all ten scenario groups in muted
  Chromium, including storage, shell shortcuts, seed replay and teardown, with
  no browser errors or external requests.
- Conformance: five passes, zero failures, five existing evidence skips.
  Production bundle `index-BVhpJWlP.js`; development bundle `index-U1mFrkCZ.js`.
  No publication performed.
