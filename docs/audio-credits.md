# Audio credits

Butter's built-in quack uses **Duck Quack** by **qubodup**, adapted from
**20130403_duck.04.wav** by **dobroide**.

- Edited recording: https://freesound.org/people/qubodup/sounds/442820/
- Original field recording: https://freesound.org/people/dobroide/sounds/185134/
- License: Creative Commons Attribution 3.0 or later, as stated by qubodup:
  https://creativecommons.org/licenses/by/3.0/
- Attribution guidance: https://freesound.org/people/qubodup/

The bundled adaptation selects the first quack (0.024–0.390 seconds), applies
short fades, and resamples it to 24 kHz mono, signed 16-bit PCM. Runtime mixing
sets playback loudness; Pocket Arcade lightly processes the same recording.
The PCM is embedded in `src/duck-sample.ts`, so playing the game needs no asset
download. Attribution also appears in the Sounds panel of the shipped artifact.

Source preview: https://cdn.freesound.org/previews/442/442820_71257-hq.mp3

Adapted PCM SHA-256:
`812e40b294505b837747347b9f98d989b213255a76fb2dcea0bc3d03b2ecdfe1`

The musical arrangement and other synthesized cues are authored for Down to Duck
in `src/audio.ts` and distributed under the project's MIT license.
