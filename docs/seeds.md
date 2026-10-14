# Reproducible courses

Every built-in run captures a seed identity when it is created. The end-of-run
seed code includes the unsigned 32-bit random seed, the resolved starting
world (or Shuffle), Arcade/Stroll, the existing gentle-start setting, and an
internal level schema version. Changing a traveler or preference later cannot
change the identity of a finished run.

New runs use schema 3. For example, `ph3-1234abcd-orchard-a-n` identifies schema 3, seed `0x1234abcd`,
Apricot Grove, Arcade, and a normal start. `s` selects Stroll and `g` selects a
gentle start. These fields are encoded automatically; players only need to
copy the complete code. Existing `ph1-…` and `ph2-…` codes still select their captured schemas exactly;
loading, validating, or copying an old code never upgrades its course.

```ts
const original = new Game(0x1234abcd, 'orchard', 'arcade', false, ITEM_CATALOG);
const code = original.seedCode;
const replay = Game.fromSeed(code!, ITEM_CATALOG);
```

`Game.fromSeed` is the replay entry point for UI or tooling. It strictly decodes
the complete code rather than using current preferences. `new Game(descriptor,
undefined, undefined, undefined, definitions)` also accepts an immutable
`RunSeed`. Numeric construction remains supported; integer seeds are normalized
to unsigned 32-bit values as in the original RNG.

The same identity produces the same baseline rows, chapter order, traffic and
platform parameters, scenery, and coins, even when rows are generated out of
order or old rows have been discarded. Schema 1 preserves the original formulas,
random draw order, difficulty, relief, and gentle-start behavior.
Timing, movement, purchases, and powers continue to affect a live run: a seed
identifies a course, not an input recording. River rewards introduced by cards
still bind to their platforms when approached; no timing-dependent behavior was
replaced with a fixed outcome.

## Schema 2 progression

The first 50 blocks retain the original warmup. Starting at block 50, road rows
mix car models, lengths, and individual speeds; block 100 introduces slow
trucks, and block 150 introduces rare sports cars. Sports cars accelerate after
crossing one third of the playable road, measured from their entry side. Their
entry timing keeps traffic from overlapping even when a fast car follows a
truck. Further 50-block steps widen the variation gradually, with capped
probabilities and size ranges.

River rows also gain a little length and gap variation at block 50, increasing
every 50 blocks through block 400. This keeps the early streams regular and
later crossings varied. Each row has a small repeatable recipe, derived from
its seed and row index. Traffic trajectories and platform positions are
computed from that recipe and the lane clock rather than fresh random draws
each frame, so loading a distant row directly produces the same sequence.

## Schema 3 coin denominations

Schema 3 preserves schema 2 terrain, traffic, platform recipes, spacing, and
pickup positions. Each spawned pickup gets a separate deterministic roll based
only on the captured seed and row. This roll does not consume the terrain RNG.
The same roll also applies when a card adds a pickup to a row.

| Pickup | Wallet value | Probability per spawned pickup |
| --- | ---: | ---: |
| Bigger bar | 2 coins | 1 in 35 |
| Small sack | 5 coins | 1 in 100 |
| Big sack | 10 coins | 1 in 500 |
| Huge sack | 25 coins | 1 in 1,234 |
| Coin | 1 coin | Remaining probability (about 95.86%) |

These are mutually exclusive outcomes from one pool, not independent rolls
that overwrite each other. Ordinary pickups keep their previous lane shape;
only upgraded pickups carry denomination metadata. Schema 1 and schema 2
continue to generate their original one-coin pickups. The denomination roll
and its thresholds are part of schema 3's released contract.

The larger gold bar and three tied sacks use shared pickup geometry in
`src/coin-models.ts`, with a value label above each upgraded pickup. Wider
pickups have corresponding body-contact bounds. A small default attraction
field lets every traveler reach pickups from a grid shifted by river drift;
gravity cards extend its range. Attracted pickups move visibly before paying
on safe arrival. This live pickup rule applies to all supported seed versions
and does not alter their generated courses or pickup positions. Platform
support and pause behavior remain the same. Collection adds the denomination
and terrain bonus, then applies the run's multiplier once. Wallet, run earnings,
lifetime earnings and the value scattered on death all use that credited total.

## Maintaining a released schema

`src/levels/v1.ts` contains the released generation algorithm and RNG.
`src/levels/v1-content.ts` contains its deeply frozen world order, patterns,
colors, and scenery/vehicle/platform models. These are snapshots, independent
of the live content catalog. `src/levels/v2.ts` extends that frozen baseline with
progressive actor recipes. `src/levels/v3.ts` adds denomination metadata using
`src/coin-denominations.ts`. `src/levels/index.ts` dispatches to the version in the
captured descriptor. An unknown version throws; it never quietly runs the
current generator.

Treat these schema files as immutable. Changes to the seed algorithm, RNG draw
order, generation constants, world rotation, patterns, or model data require a
new schema implementation and snapshot. Register that implementation in the
dispatcher and codec, then change the default schema for new runs. Keep older
implementations available while their codes are supported; if support must be
removed, reject those codes explicitly. A game release number is separate from
the level schema number.

`createRunSeed(seed, home, mode, gentle)` selects the current schema. Its optional
fifth argument pins a supported schema explicitly, for example
`createRunSeed(123, 'pond', 'arcade', false, 1)` for a legacy fixture. Decoding and
runtime validation always pass the captured schema explicitly. The actor recipe
and trajectory helpers used by schema 2 are part of that schema's course
contract too; future changes must preserve them for existing `ph2-…` codes.

Train rendering and collision currently share `TRAIN_MODEL` and `TRAIN_BOUNDS`
from the live content module. Before changing that geometry, route both through
the captured schema too; keeping only the generation snapshot would not preserve
an older course's train footprint.

Pure `generateLane` / `worldForRow` exports still support the live `WORLDS`
extension surface. A numeric `Game` starting in an unregistered extension world
also remains playable, but has `runSeed === null` and `seedCode === null`.
Register and pin new content in a new schema before offering shareable codes
for it. Adding or reordering live worlds cannot rewrite an existing built-in
schema 1, schema 2, or schema 3 course.

The catalog of market items is supplied separately to `Game` and `fromSeed` as
before. Seed identities do not serialize run inventory, current effects,
unlocks, sound packs, or preferences. The current catalog and the same purchases
retain deterministic market behavior; item-definition versioning is separate
from this level-generation contract.

## Evidence

`tests/seed.test.mjs` checks the pre-refactor golden digest of 22,680 rows across
six seeds, all six starting worlds plus Shuffle, normal/gentle starts, negative
opening rows, chapter boundaries, and extreme distances. Separate fixtures pin
initial games in both modes, world/model data, and RNG vectors at unsigned
boundaries. Those fixtures explicitly pin schema 1 instead of replacing the
golden values when the default changes. All three schemas are tested for strict
parsing, unsupported versions, immutable settings, out-of-order generation,
discarded rows, live-catalog mutations, custom-content compatibility, and market
catalog forwarding. Schema 3 also checks that removing denomination metadata
reproduces schema 2 exactly, with a golden digest pinning the new pickup rolls.
Runtime checks cover current-schema seed copying and
loading/jumping with both old and current seed codes through the developer UI.
