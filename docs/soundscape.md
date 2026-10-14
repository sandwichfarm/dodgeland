# Soundscape design

The nearby terrain should be recognizable by sound. Road traffic, streams and
open ground use different foreground textures, with room between events.

- **Roads:** individual engine voices follow visible vehicles. Compact cars,
  sedans, trucks and electric vehicles have different timbres. A passing car
  swells toward the listener, crosses the stereo field and recedes; distant
  traffic drops away. Larger vehicles have a lower voice. Horns remain a
  response to a nearby conflict, not a continuous decoration.
- **Streams:** resonant burbles, little laps and spaced droplets provide the
  water identity. Broad rushing noise is a supporting layer. A stream becomes
  prominent nearby, while adjacent traffic recedes into the background.
- **Open ground:** quiet, changing air and occasional local wildlife leave
  space around music, footsteps and the traveler's call.
- **Rail crossings:** the warning bell and distinct rail-joint rhythm remain
  tied to the actual crossing phase. The approaching wave and player feedback
  take priority over environmental beds.

The listener follows the traveler's interpolated ground position. Zone changes
choose the occupied terrain and world, rather than switching early to a hop's
destination. The mixer fades changes and preserves each moving actor's voice.
Only the nearest vehicles contribute strongly; secondary vehicles and dense
scenes have a shared gain budget to avoid building a wall of sound. Existing
saved music, ambience and effects sliders retain their values.

## World character

| World | Air and local details | Water |
| --- | --- | --- |
| Pond | Reed air and quiet crickets | Rounded bubble gulps and laps |
| Orchard | Leaf rustles and wood ticks | Busy, bright rills |
| Bloom | Soft insect wing flutter | Delicate high droplets |
| Dunes | Low, hollow gusts | Spaced oasis glugs |
| Frost | Sparse ice chimes | Bright melt drops |
| Neon | Electrical hum and slow scans | Synthetic plinks |

Bird phrases also vary by world; Neon omits them. The city favors electric
vehicles, and long vehicles always use the low truck voice. Other cars choose
their voice deterministically, keeping it throughout their passage. Independent
loop phases prevent nearby engines from revving in unison.

## Musical horns

Drivers only warn of approaching conflicts when their visible center is within
three tiles of the traveler's interpolated ground position. This is a circular
distance check, including during a hop; faster or longer vehicles cannot honk
from farther away. The existing global and per-vehicle cooldowns still apply.

The built-in music and horns share an eight-bar, 80 BPM score. Each C–Am–F–G
pass moves through C Ionian (major), A Aeolian (natural minor), F Lydian and
G Mixolydian. These related modes share a pitch collection, so a horn's tail
stays in key across a chord boundary. Horns favor current chord tones, add
occasional scale tones, avoid immediate repeated notes and prefer nearby notes.
The overall range is C3–C5 in Pond and D3–D5 in Pocket Arcade; trucks use the
lower octave and electric cars the upper octave. Both packs transpose the music
and horns together. World transitions no longer detune the musical bed.

Compact, sedan, truck and electric horns each have two articulations, with
short, paired and held sounds. A saturated diaphragm tone holds its bright,
nasal harmonics throughout each press; truck horns have a weightier air-horn
voice and electric cars retain a firm warning buzz. A brief contact/valve
transient adds mechanical texture without changing the tuned note. Their pitch and
rhythm choices derive from the seed, vehicle identity and warning sequence,
without consuming gameplay randomness. Stroll compensates for its slower
simulation clock. Resumed music starts at the corresponding score position;
active loops are never restarted just to update that position.

## Sound-pack compatibility

These changes use 32 semantic cues and the existing v1 sound-pack
profile. Built-in traffic and environmental cues accept a bounded local
variant hint. A custom clip for a cue still owns that cue: changing a built-in
variant does not replace or restart an imported loop. This adds no NIP tag,
network dependency, storage key or shell requirement.
Imported music wraps playback positions at its own duration. Custom horns keep
their supplied audio and receive the scene's pitch ratios; because v1 files do
not declare a root note or key, their author must tune them to the selected
fallback pack to match its built-in arrangement.

All environmental synthesis is original, bundled and available offline in both
Pond and Pocket Arcade. Butter's recorded quack retains its existing credit.

## Audition and verification

`pnpm audio:zones` renders controlled road, stream and meadow scenes
through the production `Soundscape` and `GameAudio` mixer. Terrain and listener
paths are explicit fixtures, while voice selection, gain, panning, timbre and
mixing use the game code. The harness writes WAV auditions and signal metrics
under `artifacts/`. Metrics establish headroom, temporal contrast and spectral
separation; listening remains the final judgment of the mix.
