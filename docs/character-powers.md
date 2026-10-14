# Traveler powers

Every traveler starts a run with one automatic survival charge. A matching fatal
hazard triggers an escape animation onto nearby open meadow; a small hit that
leaves feathers does not spend it. The HUD names the power and shows **Ready**
or how many new forward blocks remain before it recharges.

| Traveler | Power | Fatal hazard it averts |
| --- | --- | --- |
| Butter, duck | Water Bounce | Open water or drifting beyond the river edge |
| Sunny, chicken | Chicken Out | Road traffic; flutters onto safe ground |
| Pip, frog | Spring Escape | A pursuer's strike; jumps clear |
| Petal, axolotl | Regrow | A rear/side traffic hit or pursuer's strike; returns with one feather |
| Beep, robot | Emergency Reboot | Traffic or train impact; ejects clear |
| Rust, fox | Fox Feint | A pursuer's strike; favors a sideways escape |
| Pebble, penguin | Belly Slide | The catching wave; slides ahead of it |

All powers recharge **100 new blocks after use**, measured from the run's
furthest distance when the rescue starts. Using one at 99 makes it ready at
199, not 100. Waiting, pausing, visiting a market and retracing steps do not
recharge it. There is at most one charge. Changing travelers keeps the shared
cooldown; a new run starts ready. Sunny is free alongside Butter and Pip.

Rescues preserve health and inventory, except Regrow deliberately leaves one
feather. They grant no coins, market purchases or immediate distance score.
Market shields protect first without spending a traveler charge. Powers do not
occupy hand slots, and inventory powers remain separate from traveler powers.
An unrelated hazard remains fatal. If there is no valid nearby landing, the
rescue cannot fire and the run ends normally.

The landing search is deterministic and uses existing meadow rows within six
tiles. It rejects scenery, nearby mobs and ground the wave will have reached.
It never changes generated terrain or creates invisible platforms. During the
brief rescue arc world time continues and pickups are suspended. A 0.45-second
mob-only landing grace gives the player a chance to move if a pursuer reaches
the landing during flight. Normal hazards resume once the arc ends.

## Implementation and boundaries

`src/character-powers.ts` defines the small traveler catalog; `Game.end` owns the
fatal-hazard gate. Traffic supplies its impact face before subtracting fatal
damage. Separate rescue interpolation leaves ordinary hop timing unchanged.
Rendering uses the same ground position, with a colored takeoff ring and arc;
Less motion reduces the lift. The UI uses existing calls and rescue cues.

This is local gameplay and UI state. It adds no NAP, permission, network call,
storage key or dependency. Existing optional theme, storage and keys behavior
continues. The layout keeps the 240×240 minimum; smaller frames show the existing
notice. The power meter sits beneath Pluck, with full descriptions in the
traveler collection and ready/pause panel. Both host themes and reduced motion
apply. Seeds continue to pin level generation; powers do not consume its RNG or
change either schema's course hashes.

Developer jumps and seed loads carry the selected traveler and activation
callback into a fresh sandbox run. Their state text includes ability readiness
and the active rescue timer. These diagnostics remain development-only.
