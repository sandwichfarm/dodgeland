# Adding travelers, worlds and levels

All shipped visual content is in `src/content.ts`. The engine consumes the catalogs; it never switches on a character or world name. Changes bundle into the single HTML artifact.

Audio is a separate catalog. See [Sound packs](sound-packs.md) to replace any of the six gameplay effects or six character calls using a public NIP-51 list and NIP-94 audio files. Built-in synthesized scores live in `src/audio.ts`; gameplay calls semantic cue names, so it does not change when a pack changes.

## A traveler

Add an entry to `CHARACTERS`. Models are lists of boxes, in tile units. `x` is horizontal, `y` is local depth, `z` is height; `w`, `d`, and `h` are box dimensions. Use six-digit hex colors. Keep a traveler near 0.7×0.7 tiles with height below 1.1. The collision footprint is shared, independent of the artwork.

The game camera sees the positive-x and positive-local-y faces. Butter's head and oversized bill face straight ahead. A periodic whole-body turn reveals the side of the face; the head stays upright and aligned with the body. The renderer rotates the box corners together around the vertical axis, preserving the model's proportions. The run clock drives this cosmetic motion, so pause freezes it and Less motion disables it. Wings, webbed feet and a raised tail distinguish the silhouette at small sizes; details on both sides also work in the reversed collection thumbnail. Check the gameplay view as well as the thumbnail when authoring a traveler.

```ts
{
  id: 'sprout',
  name: 'Sprout',
  note: 'A leafy little explorer.',
  home: 'bloom',
  call: 'call.frog',
  callLabel: 'croak',
  coins: 15,
  distance: 0,
  model: [
    box(0, 0, .1, .5, .5, .4, '#9cb36e'),
    box(0, -.16, .5, .45, .35, .25, '#bdce87'),
    box(-.14, -.35, .6, .08, .05, .08, '#263c38'),
    box(.14, -.35, .6, .08, .05, .08, '#263c38'),
  ],
}
```

IDs must be unique and stable because the shell saves them. `home` must match a world ID. `coins` is the lifetime collected-coin threshold; `distance` is an Arcade best-distance threshold. If both are positive, both are required. Zero/zero makes the traveler available immediately. Unlocks do not spend coins. Stroll coins count; Stroll distance has a separate best and does not unlock distance-based travelers.

`call` selects a semantic character voice from `CHARACTER_CALL_CUES`; `callLabel` supplies the verb on the call button. Q and the on-screen button always use the currently selected traveler. Reuse an existing voice or add a new cue and scores to both built-in sound packs in `audio.ts`. Packs can replace those voices through the same NIP-51 mapping as other effects.

The collection, thumbnails, selection and save loading pick up the entry automatically. Selecting a traveler before a run starts sets its home-world theme when the world option is “Traveler’s home.” A selection during a paused run changes the cosmetic traveler; its home world starts on the next run.

## A world and its level assets

Add a `World` entry to `WORLDS`. For example:

```ts
{
  id: 'coral', name: 'Coral Causeway', note: 'Warm tides & coral-colored taxis',
  colors: {
    ground: '#c9bea0', alternate: '#bfb494', edge: '#958d6c',
    road: '#797f78', water: '#73adb7', foam: '#c2e3df', rail: '#a1aaa0',
  },
  scenery: [
    [box(0, 0, 0, .4, .4, .6, '#b88379')],
    [box(0, 0, 0, .5, .4, .25, '#9faeaa')],
  ],
  vehicles: [
    [box(0, 0, .1, 1.1, .65, .35, '#d89188'),
     box(0, 0, .45, .5, .5, .24, '#d4e2df')],
  ],
  platforms: [
    [box(0, 0, .01, 1, .72, .16, '#bda886')],
  ],
  patterns: [
    ['road', 'road', 'meadow'],
    ['river', 'meadow', 'rail', 'meadow'],
    ['river', 'river', 'meadow'],
  ],
}
```

Each asset collection and pattern collection must have at least one entry. Patterns must be nonempty and use `meadow`, `road`, `river`, or `rail`. Road vehicle bodies should be centered and around 0.65 tiles deep; rendering scales their width to the actual collision length. Train collision bounds come from the shared train model's visible ends. The shared traveler collision core stays inside the body; oversized bills and cosmetic turns do not enlarge it. Platform models use a one-tile width, scaled to the generated platform length. Scenery blocks the same tile on which it is drawn.

The platform voxel with the largest horizontal footprint (`w × d`) defines its standing surface at `z + h` and its horizontal support bounds. Keep that voxel as the main slab; smaller flowers, ridges and ice details can extend above it. A traveler's center on the visible slab counts as supported. Riders move with the slab before support is checked again, preserving their relative position near either edge. Travelers and their shadows stand on that surface and interpolate its height when hopping on or off. Ground movement and surface transitions remain synchronized with collision checks even with Less motion enabled; Less motion removes the decorative hop lift and body turn. Platforms draw below riders; foreground scenery retains normal depth ordering.

The new world automatically appears in the world selector and joins the endless chapter rotation. Characters may reference it as their home. No renderer or engine changes are needed for new scenery, vehicle silhouettes, platform art, or palettes. Trains and crossing signals have a shared visual model.

## Level patterns and difficulty

A level is a streamed eight-row segment, built from one randomly chosen world pattern. Rows 0 and 7 are safe meadows; the six interior rows repeat the chosen pattern. Patterns of one to six rows are easiest to reason about. Longer patterns work, but only their first six entries are used. Keep interior patterns mixed so players can recover between hazards. Two center columns always remain clear of stationary scenery. Chapter boundaries at every 32 rows coincide with safe rows.

Change the `patterns` list to introduce a different sequence vocabulary. Duplicating a pattern increases its probability. Add a pattern such as `['road', 'meadow', 'road', 'rail', 'meadow']` to vary the crossing rhythm. Seeded phases, directions, speeds, spacing, vehicle/platform variants, coins and scenery make each generated segment different. Every third segment eases speed; three short failed runs ease the next opening. Difficulty follows `1 + log1p(distance / 32)` with human-readable speed/gap bounds, so distance has no terminal level and patterns keep varying without closing every gap.

Existing gameplay types are intentionally shared. A new hazard rule (for example sinking platforms) requires an explicit engine/render change and collision tests. Visual variety and new levels using existing crossing rules require only catalog edits.

## Check the pack

```sh
pnpm verify
pnpm test:game
pnpm test:runtime
```

The engine test adds a temporary character and world at runtime to verify catalog-driven extension, then removes them. Preview the chosen traveler/world in Paja to check its silhouettes against both shell themes and the smallest playable frame.
