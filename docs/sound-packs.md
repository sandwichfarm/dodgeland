# Sound packs

Down to Duck plays semantic cues through interchangeable packs. **Pond** (`pond`)
and **Pocket Arcade** (`arcade`) are bundled defaults and work without a
network or account. Selecting a pack applies it immediately and stops voices
from the previous pack. Mute and the selected pack address are saved when the
runtime supplies optional storage.

Music, ambience and effects have separate saved levels, alongside master mute.
The Sounds panel previews individual cues. The original eight-bar music loop
runs quietly under wind, occasional birds and nearby water. Cars and trains
grow louder and pan across the scene as their visible bodies approach and pass;
horns respond to approaching conflicts within three tiles of the duck. Built-in
horns vary pitch, rhythm and vehicle timbre within scales shared with the music.
Crossing bells repeat with the flashing lights and continue through passage.
Calls and warnings lower background beds briefly. Butter's quack uses a
[credited field recording](audio-credits.md).

The built-in packs use compact, sedan, truck and electric engine voices, plus
six world-specific wind, water and bird profiles. These are local orchestration
variants of the same semantic cues, not additional list mappings. A shared
`traffic.pass` or ambience clip remains authoritative across worlds and keeps
playing through variant changes. The scene still controls its distance, pan
and level. No pack migration is needed. See [soundscape design](soundscape.md)
for the foreground mix and world profiles.

## Nostr profile, version 1

This profile is specific to **Down to Duck**; it is not an accepted Nostr sound-pack NIP.
It interprets a [NIP-51 release artifact set, kind 30063](https://github.com/nostr-protocol/nips/blob/master/51.md)
as a released collection of game assets. Standard `e` tags reference
[NIP-94 file metadata, kind 1063](https://github.com/nostr-protocol/nips/blob/master/94.md).
Two project-specific tags add the profile version and cue mapping. No new event
kind or napplet message domain is introduced.

The `puddlehop:sound-pack` and `puddlehop:cue` tags retain their original namespace
so existing released packs continue to load after the game's rename.

The pack event has these tags:

| Tag | Meaning |
| --- | --- |
| `["d", "my-pack-v1"]` | Required addressable identifier, unique within the author's kind 30063 events. |
| `["title", "My pack"]` | Display name. |
| `["description", "Short description"]` | Optional description and attribution. |
| `["puddlehop:sound-pack", "1"]` | Required profile version. |
| `["e", "<file-event-id>"]` | Standard membership reference to a kind 1063 audio-file event. |
| `["puddlehop:cue", "hop", "<file-event-id>"]` | Binds a known game cue to an `e` member. |

Keep public list `content` empty. This loader reads public tags; it does not
decrypt private list contents. Use separate cue tags rather than assigning
new positional meanings to standard `e` tags.

| Cue | Trigger |
| --- | --- |
| `hop` | Accepted movement. |
| `coin` | Collecting a coin. |
| `crash` | Legacy fallback for imported traffic, train, trail and mob death sounds. |
| `splash` | Legacy fallback for imported water, wave and river-edge death sounds. |
| `train` | A single metallic crossing-bell strike, repeated every half-second while a nearby crossing is active. |
| `idle` | The approaching Arcade wave warning; beats quicken near contact. The cue name remains compatible with existing packs. |
| `call.duck` | Butter’s quack. |
| `call.chicken` | Sunny’s cluck. |
| `call.frog` | Pip’s croak. |
| `call.axolotl` | Petal’s playful bubble chirp (an invented character voice). |
| `call.robot` | Beep’s electronic call. |
| `call.fox` | Rust’s yip. |
| `call.penguin` | Pebble’s peep. |
| `music` | A continuously looping musical bed during play. |
| `ambience.wind` | Looping wind, shaped by the current world. |
| `ambience.water` | Looping river ambience, louder near water. |
| `ambience.birds` | An occasional bird phrase in outdoor worlds. |
| `traffic.pass` | A persistent moving engine/tire loop for nearby vehicles. |
| `traffic.honk` | A warning horn within three tiles, with scale-based notes, vehicle articulations and per-vehicle/global cooldowns. |
| `train.pass` | Rolling wheels, rumble and rail joints following a visible train. |
| `death.traffic` | Road impact and short debris tail. |
| `death.train` | Heavier metallic train impact. |
| `death.water` | Falling into open water. |
| `death.wave` | The pursuing wave catching the traveler. |
| `death.swept` | A platform carrying the traveler beyond the river edge. |
| `death.trail` | Losing the rear trail in Stroll. |
| `death.mob` | A pursuing mob catches the traveler. |
| `mob.spawn` | A new mob appears with a harmless warning period. |
| `mob.attack` | A mob winds up and locks its marked attack direction. |
| `hurt.rear` | A survivable rear-bumper collision costs one Pluck. |
| `hurt.side` | A survivable collision with a car's side costs two Pluck. |
| `health.restore` | Crossing a new 100-point milestone restores half a Pluck, up to the full bar. |
| `spill.coin` | Metallic floor contact when wallet coins land or bounce after death. |
| `spill.fabric` | Soft floor contact for dropped hats and shirts. |
| `spill.trinket` | Hollow, lightly ringing contact for dropped cosmetic effects/accessories. |

Press Q or the character-call button to play the selected traveler’s call. These seven optional call cues extend the existing v1 profile; old six-effect packs remain valid and use built-in calls. To override a quack, include a file with `["puddlehop:cue", "call.duck", "<file-event-id>"]` and its matching `e` membership.

A pack may override any subset of these thirty-five cues. Missing or unusable audio
falls back to **Pond for that cue**. Unknown cue names are ignored, allowing
future versions of the game to add cues. Duplicate bindings for a known cue,
a binding without matching `e` membership, or an invalid profile envelope
reject the pack rather than installing an ambiguous mapping. Several cues may
reference the same file. At least one supported cue is required. If every mapped
clip fails to load, a new selection is rejected and the current pack remains
active. A saved shared pack that is temporarily unavailable uses Pond and keeps
its saved address for a future retry.

The soundscape and contextual deaths also extend the existing v1 profile.
Old packs remain usable. A supplied legacy `crash` clip fills missing
`death.traffic`, `death.train`, `death.trail` and `death.mob`; a supplied `splash` clip fills
missing `death.water`, `death.wave` and `death.swept`. Explicit death bindings
take precedence. Without those imported legacy clips, the built-in fallback
provides a distinct sound for every death cause.

Pluck adds three optional cues to the same v1 profile. Nonfatal `hurt.rear` and
`hurt.side` keep their brief built-in sounds when an older pack supplies only
`crash`; they never borrow a death sound. `health.restore` plays only when a
milestone actually restores Pluck. Fatal traffic impacts still use `death.traffic`.

Death spills add three optional cues to the same v1 profile. Old packs keep the
built-in material impacts; the `coin` reward cue is never used for a dropped coin.
The spill director follows visible landings and damped bounces, clusters nearby
contacts by material, and uses the exact wallet amount even when visible coins
represent stacks. Larger drops make a denser, heavier clatter with bounded gain.
The built-in `light`, `mid` and `heavy` variations are local orchestration, not
additional list mappings. An imported clip overrides every variation of its cue.
At most three spill voices overlap, preserving the contextual death sound.
All three cues use the effects level and master mute. Hidden, unfocused and
menu contacts cannot queue a catch-up burst; reduced motion gives one brief
contact per material as the belongings settle immediately.

## Audio files

Each referenced kind 1063 event must provide:

- `url`: an HTTPS URL or `blossom:sha256:<64-hex-digest>` resource address.
- `m`: an `audio/*` MIME type supported by the browser's audio decoder.
- `x`: the SHA-256 hex digest of the encoded audio bytes.

The loader verifies the received bytes against `x` before decoding. Each file
is limited to **1 MiB encoded and one or two channels**. Effects and calls may
be at most **three seconds**, `ambience.*` clips **twelve seconds**, and `music`
**64 seconds**. At most thirty-one unique files are loaded sequentially, with
a **32 MiB total decoded PCM budget**. A file shared by multiple cues is decoded
once; bindings whose duration limit it exceeds use their fallback.
A missing event, denied resource
request, hash mismatch, excessive size or duration, unsupported format, or
invalid channel count makes the affected cue use Pond. The shell controls
external-byte access; a public URL alone does not guarantee permission.

Author music, wind, water, traffic and train pass clips as loops. The mixer
smooths loop boundaries without mutating the loaded clip, and changes distance,
stereo pan and playback rate continuously without restarting a moving source.
Keep long samples sparse enough that calls and warnings remain clear. Each cue
is normalized to its intended role in the mix, with bounded voice counts and a
master compressor controlling peaks.

For musical horn replacements, tune the clip's fundamental to C4 (261.626 Hz)
with Pond fallback, or D4 (293.665 Hz) with Pocket Arcade fallback. The scene
transposes it to notes in the current scale. Built-in music uses the matching
C-major/D-major pitch collection, traversing its related modes. Custom music
and horn files have no automatic key detection; authors control their tuning.

Use NIP-94's optional `size` and descriptive `content` to make files useful to
other clients. Include the creator and license or permission terms in the pack
description or file description, and choose audio you can redistribute.

## Authoring example

Publish the audio bytes first, then a signed kind 1063 event describing each
file. Finally, publish the signed kind 30063 pack containing those file-event
IDs. Signing and publishing happen in your Nostr authoring tool; Down to Duck's
pack selector does not publish or edit events.

These are unsigned event templates. Replace bracketed placeholders with real
values, set `created_at` to the publication time, and let your signer supply
the final `pubkey`, `id`, and `sig`. An event ID identifies the signed metadata
event; `x` identifies the audio bytes. They are different hashes.

```json
{
  "kind": 1063,
  "created_at": 0,
  "content": "Soft hop by <creator>; <license and attribution URL>.",
  "tags": [
    ["url", "https://assets.example.org/mosswater/hop.wav"],
    ["m", "audio/wav"],
    ["x", "<64-hex-sha256-of-hop-wav>"],
    ["size", "<encoded-byte-count>"]
  ]
}
```

Create equivalent metadata for a coin clip, then use both signed event IDs:

```json
{
  "kind": 30063,
  "created_at": 0,
  "content": "",
  "tags": [
    ["d", "mosswater-sounds-v1"],
    ["title", "Mosswater sounds"],
    ["description", "Soft woodland sounds by <creator>; <license>"],
    ["puddlehop:sound-pack", "1"],
    ["e", "<64-hex-hop-file-event-id>"],
    ["e", "<64-hex-coin-file-event-id>"],
    ["puddlehop:cue", "hop", "<64-hex-hop-file-event-id>"],
    ["puddlehop:cue", "coin", "<64-hex-coin-file-event-id>"]
  ]
}
```

For a minimal one-sound pack, retain just one member and mapping:

```json
[
  ["d", "my-hop"],
  ["title", "My hop"],
  ["puddlehop:sound-pack", "1"],
  ["e", "<64-hex-file-event-id>"],
  ["puddlehop:cue", "hop", "<64-hex-file-event-id>"]
]
```

This smaller example is the `tags` array inside the same kind 30063 envelope;
the remaining gameplay sounds and character calls come from Pond. To add sounds to an existing pack,
publish another kind 30063 event with the same author and `d` value. A new
`d` value gives the pack a separate address.

## Loading a pack

Enter its address in the sound-pack controls:

```text
30063:<64-hex-author-pubkey>:mosswater-sounds-v1
```

[NIP-19 `naddr` addresses](https://github.com/nostr-protocol/nips/blob/master/19.md)
and `nostr:naddr…` also work when the runtime provides its optional common
decoder. The explicit address above does not need that decoder.

The runtime's optional OUTBOX capability reads the pack and batches reads of
its referenced file events. Its optional RESOURCE capability retrieves the
audio bytes. Unavailable capabilities leave the built-in packs usable. The
stored address is resolved again when needed; audio files are not copied into
durable game progress. Sounds begin after user interaction, obey mute, and
stop when play is paused or the napplet is hidden or closed.

This version loads a supplied public pack address. It does not include a pack
directory, discovery feed, editor, or publishing flow.
