# Traffic and river progression

New schema-2 runs introduce variation by **row distance**, independent of coins
and market income. Generation stays deterministic from the copied run seed.

| Distance | Traffic | Rivers |
| --- | --- | --- |
| 0–49 | Original uniform rows for warmup | Original uniform lengths and spacing |
| 50–99 | Mixed ordinary vehicle models, lengths and cruising speeds | Small length and gap differences within a row |
| 100–149 | Slow, long cargo trucks join the mix | Wider variation |
| 150+ | Rare sports cars enter at ordinary speed and accelerate | Variation continues increasing every 50 rows |

Trucks start at a 14% recipe share, growing to at most 24%; sports cars start at
3%, reaching at most 6%. A rare car is not guaranteed on every road. Trucks are
2.5–3.2 tiles long and cruise at roughly 54–66% of the lane's ordinary pace.
Sports cars have a low body, racing stripes and a spoiler. Acceleration begins
one third across the eleven-tile playable width, measured from the entry side:
about x=-1.83 rightward and x=+1.83 leftward. It is continuous, with a top-speed
cap of seven tiles per simulation second. Stroll slows the simulation normally.
Short road streaks accompany actual acceleration and obey Less motion.

River variation grows through 400 rows and then holds. Each row repeats eight
seeded platform lengths and clear gaps, moving together with the current. Length
variation grows to ±50% of the original row length; gap variation grows to
±0.9 tiles, with a 0.75-tile minimum. A row retains its platform model and
standing height so mixed sizes cannot hide a height change. Safe meadow
spacing, world rotation and the early gentle-start rules remain unchanged.

## Shared motion

`src/levels/v2.ts` generates a small actor recipe from a separate row RNG.
`src/actors.ts` samples it analytically at any simulation time. Road recipes
include distinct entry times, lengths, models and speeds. Each following car
waits long enough to maintain clear space behind the preceding vehicle along
the entire crossing, including acceleration. Faster cars cannot drive through
slower trucks. Offscreen entries and stable IDs replace the old assumption that
every car occupies an equally spaced lattice.

`laneActors` in `src/game.ts` is the common interface for drawing, collisions,
river support and traffic audio. Samples include each actor's current and
previous position, instantaneous speed and length. Swept collisions therefore
use actual acceleration, rather than back-projecting the lane's average speed.
`src/vehicle-models.ts` supplies the same geometry to rendering and hitboxes.
Trains and schema-1 rows retain their original motion and models.

River coins attach to a physical sequence slot and remain on its slab. Riders
are carried before support is checked, including at either visible edge.
School Zone, Gentle Current and Stoplight rebase the shared motion clock, so
speed changes, freezing and resuming do not teleport actors. Wide Gaps changes
new traffic headways; Longboats extends new platform lengths while preserving
the empty gaps. Existing rows keep their geometry.

## Replay and verification

New codes begin `ph2`; saved `ph1` codes continue through the frozen version-1
generator. Developer jumps preserve the captured version and can inspect 50,
100, 150 and 250 directly. Only the jump's safe landing tile is replaced.

`pnpm test:actors` covers progression/rarity, deterministic random access,
separation, acceleration, geometric contacts, river rewards, speed/card
continuity and real voxel rendering. `pnpm test:seeds` retains the old generator
hashes and tests both code versions. Soundscape tests check the new vehicles'
actual engine voices and acceleration while retaining the three-tile horn gate.
