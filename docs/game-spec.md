# Down to Duck build spec

Name first: Down to Duck. Butter, a little yellow duck, journeys from Apricot Grove through a playful voxel world. Butter is the free default traveler. Legacy saves selecting the original default Pip migrate to Butter with scores, coins and preferences retained; other unlocked travelers remain selected. Updated saves carry `travelerVersion: 2`, so choosing Pip afterward persists. Original characters and artwork are made from declarative voxel parts.

title: Down to Duck
nappletType: puddlehop (stable deployment identity)
purpose: Endless, one-step crossing arcade game with a growing collection of travelers.
NAPs used: storage (optional progress), theme (optional host palette), keys (optional shortcuts), gamepad (optional controller input through a temporary draft adapter), outbox/resource (optional shared sound packs), common (optional naddr decoder)
requires: none
fallbacks: session-only progress; local cream/ink/moss palette; touch gestures and on-screen direction controls
SDK helpers: storage.getItem/setItem, themeGet/themeOnChanged, keys.register, outbox.query, resource.bytes, common.decodeNip19
relay escape hatches: none
config schema: none
interop: none
density: game-sized controls and bundled Lilita One lettering; full-frame canvas with centered wood-and-paper menu boards. This deliberately overrides the starter’s compact tool defaults at the user’s request.
minimum size: 240 × 240; smaller frames cannot show enough incoming lanes plus reachable controls. Notice: Needs 240×240 to play — enlarge this pane.
tiers: tiny=minimum notice; compact=canvas, reachable HUD and paged menu screens; regular=larger previews and menu content; wide=expanded scenic canvas and centered boards with more information together; short=separate information/settings pages, same game state, minimum notice below 240 high
theme: optional; whole chrome and canvas backdrop use background/text/primary; biome art retains its gameplay contrast; fallback #f4f2df / #263c38 / #477953
states: ready=centered traveler board with play, help, powers and options; playing=score + coins + pause; paused=centered rules/power board; dead=brief death spill then centered results, statistics, seed and retry; storage error=readable session-only note in Camp

## Game interface contract

Ready, results, pause and collection menus share one centered wood-and-paper
board style, a tinted game backdrop, large Lilita One lettering and beveled
controls. The world stays visible around each board; gameplay HUD elements
recede while a menu is open. The live HUD and market controls use the same
lettering and material colors. Controls remain at least 44×44 pixels; desktop
boards use larger targets. Both runtime themes update the full interface.

Results show distance, coins found, active time, the mode-specific best,
chapter, world, traveler and the cause of death. These are completed-run values,
so choosing another traveler afterward does not rewrite the result. A visible
seed can be clicked or tapped to copy, with a separate Copy seed action and a
selectable-text fallback when the browser denies clipboard access. Smaller
frames put Stats, Seed, help, powers and options on separate pages. The full
content remains reachable without scrollbars or shrinking it into tiny text.

Travelers and worlds are browsable game pieces with large voxel previews.
Traveler stories include their complete power, automatic activation, cooldown,
call and unlock requirements. Home, shuffle and every starting world remain
selectable. Sounds pages preserve built-in pack selection, mute, three mixer
sliders, cue previews, shared-pack loading and status, and full audio credits.
Camp contains Less motion and the current save status. Small frames have a
section chooser, page controls and paginated descriptions instead of a sidebar.
Native text/select/range controls retain their browser interaction; keyboard
and controller navigation stay inside the active menu. Back leaves a detail
page before closing the menu, and closing a paused collection restores resume
focus. Resize and minimum-size transitions preserve the run and menu content.

The market remains an opaque voxel clearing with distinct Shop, Hand, Looks,
Inspect and Draft screens. Stock and owned items page to fit the frame, keeping
full descriptions and purchase actions reachable. Its scene, clothing previews,
fonts and large controls belong to the same game aesthetic.

Verify all menu and HUD states in both themes at the minimum, phone, landscape,
desktop and 2400×1200 frames, plus the 200×160 minimum-size notice. Verify every
traveler’s text, settings persistence, clipboard success and fallback, native
range keys, focus restoration, and missing optional-domain behavior in a built
opaque iframe. No direct host or network access is introduced by presentation.

## Gameplay and variety

Tap to advance one tile; swipe in any cardinal direction; directional buttons and shell-reserved arrows/WASD. Isometric camera follows the furthest row. Avoid cars and trains, ride moving logs, route around scenery. Railway warnings precede trains. In Arcade a visible flood pursues the traveler: its foam crest is the actual catch boundary. It starts four rows behind, waits four seconds, then advances at 0.65 rows per second and stays at most six rows behind the furthest progress. Forward hops create distance; sideways hops and character calls do not reset pursuit. Backtracking toward the crest is dangerous, including during a hop. At five seconds of standing clearance, an actionable warning, shrinking meter and highlighted forward control explain escape; warning sounds accelerate in the final two seconds. Pause freezes the wave; reduced motion keeps the moving boundary but removes decorative motion. Stroll has no wave and retains the rear trail limit. No ending: seeded row generation streams ahead and prunes behind.

The shell action `puddlehop.call` defaults to Q and plays the selected character’s catalog-defined call. An on-screen call button works without shell keyboard support and shows the assigned shortcut when registered. Calling never moves the traveler or delays the wave. It works in ready/playing states, respects mute and a 450 ms repeat limit, and is blocked while paused, dead, hidden, below minimum size, or browsing the collection.

Continuous distance difficulty evolves speed, spacing, lane combinations, and train timing with readable reaction windows. Each 32-row chapter changes worlds, with safe boundary rows. Six initial worlds contain different palettes, scenery, vehicles, platforms and hazard patterns. Seven travelers use one common voxel-part schema and equal hitboxes. Choose a home world or shuffle them.

Collision geometry follows the drawn hazards: trains use their visible ends, and river support uses the main slab beneath the traveler's center. An existing rider keeps the same relative position as the platform moves. Drawing and wave checks use the same interpolated ground position, including with Less motion enabled; that preference removes decorative lift and turning without showing a different position from the simulation. The oversized bill remains cosmetic.

Fatigue controls: quick retries; procedural layouts; cosmetic characters with transparent coin/distance unlocks; safe stretches; alternating intensity; personal-best targets; rotating run goals; gentler opening after three short losses; optional Stroll mode with slower hazards and no chasing wave; pause and automatic background/minimum-size pause; reduced motion. No ads or purchased advantages.

Reference for the inspiration's character/world variety: https://www.crossyroad.com/updates/enter-the-crossyverse . This project reproduces the crossing loop using original art and a duck-led identity.

## Acceptance evidence

Environmental contrast follows [soundscape.md](soundscape.md): harmonic vehicle
engines have distinct compact/sedan/truck/electric voices and passing gaps;
streams use resonant droplets and laps. Occupied roads and water take the
foreground while adjacent terrain recedes. Quiet air, six world-specific
profiles, bounded traffic power and priority for warnings keep the scene clear.
World changes follow the visible ground position and crossfade built-in voices.
Existing imported cue mappings and saved mixer levels remain compatible.

Soundscape: an original, gently varied music loop sits beneath world ambience. Wind, birds and nearby water establish the setting; the nearest vehicles pan and change loudness with their actual positions, speed and distance. Horns respond to an approaching conflict, with cooldowns. A repeating metallic crossing bell follows the crossing phase, then a moving train rumble accompanies the visible train. Warnings and character calls briefly lower background beds. Butter uses a recorded quack. Every loss has an explicit engine cause and its own cue: traffic, train, open water, wave, swept off the river edge, lost trail, or a mob catch. All layers use interchangeable semantic sound-pack cues with built-in fallbacks.

The existing optional storage boundary saves separate music, ambience and effects levels plus master mute. Playback begins only after a gesture; pause, hidden/minimum-size state, the collection board, reset and teardown stop background voices. The paged Sounds screens offer mix controls and individual cue previews without scrolling; the 240×240 minimum and frame/theme contract remain in force. Music and ambience samples have bounded longer durations while short effects retain their limits; all shared files retain hash verification and the 1 MiB encoded limit. No new NAP domain, hard requirement, direct network path, service or external playback provider is needed.

Sound packs: 32 cues cover six classic gameplay effects, seven character calls, seven music/environment/vehicle layers, seven contextual deaths, two mob cues and three Pluck cues. Pond and Pocket Arcade are bundled; mute, mix and pack preferences persist. Public NIP-51 release-artifact lists reference NIP-94 files, with the project-specific v1 cue mapping documented in [sound-packs.md](sound-packs.md). Shared assets require validated audio metadata, matching SHA-256 and at most 1 MiB encoded. Decoded limits are three seconds for effects, twelve for ambience and sixty-four for music, with a 32 MiB decoded pack budget. Missing clips use Pond; legacy crash/splash overrides remain compatible with contextual deaths. A wholly unplayable new pack leaves the current pack selected. Outbox/resource failures do not interrupt gameplay. Pack loading is cancellable and stale completions cannot override a newer choice. No list editing, signing, directory, or publishing is part of this feature.

Build + guidance + conformance, deterministic engine tests across thousands of rows/seeds and high-distance generation, collision/log/train/wave/score/progress tests, built-artifact browser smoke in an opaque sandbox, runtime keyboard/storage/theme operations, four frames × two themes, extension smoke by registering a new character and world without engine edits. Paja runtime URL and a documented content guide.

Arcade mob progression is defined in [mobs.md](mobs.md): Moss Slime at 160, Snap Crab at 320 and Bramble Wasp at 480 points, with a 45-second opening grace and 14–18 seconds plus 24 new points between arrivals. Walking pursuit is the default. Slimes stay grounded; crabs make occasional warned lunges with long rests; wasps use committed eased strikes. One pursuer is allowed initially, at most two from 480. Market invitations and urgent wave warnings defer arrivals. Stroll stays free of mobs. All mob state uses the simulation clock; existing pause, minimum-size and reset behavior applies.

Directional traffic damage and half-feather score recovery follow [health.md](health.md). Optional controller input follows [gamepad.md](gamepad.md): an isolated, user-authorized temporary adapter implements the canonical living draft until SDK support ships. No hard requirement or browser-device access is added; missing controller support leaves all existing controls usable.

Run markets follow [market.md](market.md). Each new 100-point milestone enables a 15-active-second invitation opened with M, controller LB or the on-screen button. Shopping freezes simulation and timed effects. Seeded stock includes card packs, powers, cosmetics and direct cards; all purchases use the current run wallet. Small Packs reveal three to choose one; Large Packs reveal five to choose one, with a seeded 20% bonus chance to choose two. Only confirmed choices equip. An opaque voxel market clearing presents portrait cards and separate cosmetic displays with motion-preference-aware deal/hover feedback; paged Shop, Hand, Looks, Inspect and Draft screens fit the available frame. Unfinished choices survive interruption and keep the world paused. Cards stack within shared limits, can be sold, and have no fusion mechanism. Bought cards and powers leave the shop and enter the visible hand; cosmetics enter the separate Looks screen and equip their clothing slot. Opening/closing transitions obscure the world and keep it paused through closing. Death clears every run asset; lifetime records and traveler unlocks persist. The catalog contains 25 card modules, three powers, eight looks and two packs, discovered from files without a central registry. New content uses pure typed modifier or score hooks; new engine capabilities require an explicit shared hook, never item-ID branches.

Development builds alone include a foldable inspector with score jumps and state diagnostics. Jumping stages a fresh sandbox run at that seeded map position; mutations disable lifetime rewards for the run. All inspector modules, CSS, UI and mutator hooks are excluded from production by a compile-time DEV import.

Versioned course identities follow [seeds.md](seeds.md). Completed runs expose a click-to-copy seed and a Copy seed action; versioned generation and frozen content reproduce the current baseline without changing lane formulas. Attraction effects move coin positions toward the duck over simulation time and award only on safe contact. Stacking limits and a reduced Gold Rush keep these advantages bounded.
