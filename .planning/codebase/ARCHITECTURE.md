# Gameplay architecture before local multiplayer

Inspected 2026-10-14 on `feat/local-multiplayer`. At inspection, `src/` and
`tests/` exactly matched `a310a81ed6c76df4b265c9012c23b8c83f4802e5`.
Line references below describe that baseline; later extraction may move them.

## Current model

`src/game.ts` is a 528-line module containing physical helpers, the `Game`
class, and progress parsing. `Game` combines one player's state with the
shared simulation. It is framework independent and imports no browser APIs.

| Responsibility | Baseline source | Behavior that matters |
| --- | --- | --- |
| Physical helpers | `game.ts:47–140` | One actor sample drives rendering, collisions, river support and sound. Swept contacts use the visible chassis. |
| State and construction | `game.ts:141–190` | Player position, health and inventory coexist with terrain, world time and mob director. Seeded and extension-world constructors are supported. |
| Terrain streaming | `game.ts:211–241` | Generate maxY−10 through maxY+28. Apply structural cards once when creating each row. Bind river coins near maxY+8. |
| Actor effect rebasing | `game.ts:244–257` | Speed changes preserve actor positions by rebasing lane phase against the current world clock. |
| Coin awards | `game.ts:258–262` | Inventory credits, lifetime run collection total and callback share one award path. Fractional income accumulates in inventory. |
| Market pause | `game.ts:263–271` | Opening pauses the game; closing synchronizes effects before optional resume. |
| Movement | `game.ts:272–281` | Reject occupied/out-of-bounds destinations; preserve fractional x; score furthest progress at hop initiation. |
| Death | `game.ts:283–292` | Shield/rescue checks precede spill creation, terminal state, inventory clear and callback. |
| Innate character rescue | `game.ts:297–331` | Find safe land, consume a progress-based charge, preserve normal hop timing, award no skipped progress. |
| Regeneration and vehicle impacts | `game.ts:333–384` | Three feathers, rear/side/front damage, per-car contact latch, recoil and recovery. |
| World hazard queries | `game.ts:387–415` | Pursuers and rescue placement reuse terrain and moving vehicle hazards. |
| Update | `game.ts:416–461` | Ordered world/player progression described below. |
| Coin capture | `game.ts:464–502` | Visible attraction, safe landing before reward, retained attracted coins after source terrain pruning. |
| Pause/resume | `game.ts:504–505` | A pending paid pack prevents resume. |

## Exact update ordering

The baseline `Game.update(dt)` executes these operations in order. Preserve
that order in solo until differential tests prove otherwise.

1. Return unless playing and neither market nor pending pack blocks play.
2. Tick inventory with unscaled real `dt`.
3. Rebase changed lane speeds.
4. Capture previous world time, interpolated player position, and whether the
   settled player rides a platform at the previous time.
5. Advance world time by `dt × .58` for Flow (`stroll`), otherwise `dt`.
6. Advance idle with real `dt`; decrease hurt recovery, power notice, landing
   grace and hop with real `dt`.
7. During innate rescue: advance Arcade wave, decrease rescue with real `dt`,
   update mobs with world-time delta, finish rescue with `.45` landing grace,
   then return.
8. Otherwise advance Arcade wave and check its contact. Flow instead checks
   the seven-row trailing limit.
9. Resolve swept vehicle/train contacts. Return after terminal death or rescue.
10. While hopping: process safe coin contact/ongoing pull, update mobs, return.
11. When settled on river: carry an existing rider by world-time delta, test
    visible platform support, then test drift beyond the world edge.
12. Return if river danger activated rescue.
13. If still playing, process grounded coin collection, then update mobs.

The caller in `src/main.ts:401` runs fixed `1/120` steps. `Game.update()` itself
does not own an accumulator. Death spill visuals advance through a separate
method and must never advance the dead world or inventory.

## Existing supporting modules

- `src/market/run.ts`: pure, seeded run economy. Separate market RNG; wallet,
  cards, temporary powers, cosmetics, effects, offers and pending pack. Every
  100 new score opens a 15-active-second invitation. Open market/pending pack
  freezes clocks. `clear()` marks the inventory dead and removes all assets
  before observers run. Hand defaults to three, with bounded card modifiers.
- `src/market/types.ts`: item contracts are card, timed power, cosmetic and
  pack. Revival/flare consumables require a distinct item contract and storage;
  they are not currently present.
- `src/mobs.ts`: director owns RNG, next spawn clocks, introduced species and
  one collection of pursuers. It targets a single `Game` throughout. Thresholds
  are 160/320/480, first spawn requires 45 active world seconds, at least 24
  new rows separate spawns, cap is one until 480 then two. Flow removes mobs.
- `src/character-powers.ts`: seven automatic danger-specific powers, each
  currently recharging after 100 new blocks. This is distinct from the
  requested multiplayer revival with a 250-block cooldown.
- `src/levels/index.ts`: dispatches immutable terrain schemas 1, 2 and 3.
  Schema 1 owns base terrain/RNG, schema 2 adds progressive actors, schema 3
  adds denomination metadata without consuming the terrain RNG stream.
- `src/run-seed.ts`: `ph1/ph2/ph3` captures terrain schema, uint32 seed, home,
  Arcade/Flow and gentle start. Flow is serialized as `stroll`.

## Proposed responsibility split

Use one session/world simulation and explicit per-player state. Do not run
independent complete `Game.update()` calls over shared mutable lane objects.
That would advance the world, rebase actors, claim pickups and update mobs
multiple times per frame.

| Shared session/world | Per player |
| --- | --- |
| Seed and pinned terrain schema; generated rows | Character identity and input/device assignment |
| World clock and simulation stepping | x/y/from positions, hop and rescue interpolation |
| Physical actors and phase rebasing | Health, hurt recovery and car-contact latches |
| One pickup owner/claim operation | Wallet, hand, timed powers, cosmetics and consumables |
| Mob population/director and target selection | Innate power charge, multiplayer revival charge |
| Camera/progress retention bounds | Personal score and collected-coin statistics |
| Wave or race-fog policy | Alive/downed/ghost/disconnected status |
| Session mode, roster and match lifecycle | Personal death cause/spill and results |

Shared effects from player cards require an explicit mode policy: traffic,
river and structural geometry cannot simultaneously have contradictory values
for players in the same world. Define who owns or combines those effects;
avoid accidental last-player-wins mutation.

Compose base Arcade/Flow rules with Solo/Survive Together/Relay/Race session
behavior. Typed handlers should cover join, disconnect, reconnect, drop-out,
player death, progress/handoff and completion. A generic engine should invoke
those hooks without accumulating mode-name branches in unrelated subsystems.

## Rules extraction boundaries

Extract gameplay policy into named, immutable configuration groups:

- Simulation: world-time scale and fixed-step policy.
- Movement: hop duration and supported play-field bounds.
- Health: capacity, face damage, recovery, regeneration interval and amount.
- Pursuit: initial wave position, speed, grace, trail distance, warning, and
  trailing-limit behavior.
- Retention: rows ahead/behind and pickup-binding approach distance.
- Economy: market interval/window and supported inventory capacities.
- Pursuers: enabled state, introduction thresholds, spawn pacing and limits.
- Session: roster/drop-in policy, relay interval, revival and fog rules.

Keep other constants distinct:

- Floating-point tolerances, slab intersections and numerical iteration bounds
  are algorithm invariants, not player-authored balance knobs.
- Voxel/chassis geometry and render interpolation need one physical source of
  truth. If hop duration becomes configurable, rendering must read the same
  duration rather than retaining its imported baseline `HOP_TIME`.
- Released terrain RNG draw order, recipes and constants are seed-schema
  contracts. Retain schema implementations unchanged during extraction.
- Course width cannot safely become an arbitrary setting while pinned
  generators still author scenery at −5…5. Keep the supported width or add a
  separately versioned terrain implementation for future variable widths.

## Recommended first phase

Capture executable baseline evidence; introduce validated mode settings and
existing Solo Arcade/Flow presets; route current solo logic through those
settings without reordering it. Preserve existing public `Game` access while
separating state in later phases. Require exact differential parity before
adding multiplayer behavior. Detailed test strategy is in
`../research/SOLO-PARITY.md`.
