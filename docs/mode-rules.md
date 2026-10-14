# Authoring a solo mode

`composeModeDefinition` creates a validated, immutable policy for `Game`.
The released Arcade and Stroll presets use this same path. A mode is local
TypeScript compiled with the application; it is not downloaded executable code
or a user-facing editor.

## Complete example

Place this module in `src/`. Each factory call gets its own lifecycle history.
The example changes the clock, hop duration, health, market cadence, hand size,
coin gravity, and pursuer pacing without adding a mode-name branch to the engine.

<!-- executable-mode-example:start -->
```ts
import { Game } from './game.js';
import { ITEM_CATALOG } from './market/catalog.js';
import { composeModeDefinition, SOLO_ARCADE_MODE } from './mode-rules.js';
import type { SoloLifecycleEventName, SoloLifecycleObserver } from './mode-rules.js';

export function createEveningRun(seed: number) {
  const events: SoloLifecycleEventName[] = [];
  const observe: SoloLifecycleObserver = event => { events.push(event.type); };
  const definition = composeModeDefinition({
    ...SOLO_ARCADE_MODE.rules,
    id: 'evening-waddle',
    simulation: { worldTimeScale: .75, fixedStep: 1 / 60 },
    movement: { hopDuration: .2 },
    health: { maxHealth: 4 },
    economy: {
      marketInterval: 20, marketWindowSeconds: 10,
      inventoryCapacity: 4, inventoryLimit: 5, baseCoinGravity: .2,
    },
    pursuers: {
      enabled: true, introductionThresholds: [50, 100, 150],
      firstSpawnTime: 12, minimumSpawnProgress: 12,
      spawnInterval: 12, minimumSpawnInterval: 8,
      intervalProgress: 100, populationCap: 2,
    },
    lifecycle: {
      onStart: observe, onProgress: observe, onPause: observe,
      onResume: observe, onTerminal: observe,
    },
  });
  const game = new Game(seed, 'pond', 'arcade', false, ITEM_CATALOG, 'butter', { definition });
  return { game, definition, events };
}
```
<!-- executable-mode-example:end -->

Construct the game once for a run. Existing input calls `game.move(direction)`;
the first accepted movement starts play. The application accumulator calls
`game.update(game.rules.simulation.fixedStep)` for each simulation step. Rendering
and audio read the same active policy. The factory does not start its own loop.

`tests/mode-authoring.test.mjs` extracts this exact code block, type-checks it with
the project's compiler options, and executes it against the real Game,
RunInventory, and MobDirector. Run `node --test tests/mode-authoring.test.mjs`.

## Composition and validation

Omitted groups and fields inherit the Arcade defaults. To inherit another
preset, spread its `rules`; when replacing one of its groups, also spread that
group if its remaining values must survive. For example, a Stroll-derived
`simulation` override should preserve Stroll's `.58` scale explicitly.

The composer clones nested data and freezes the resulting definition and rule
groups. Editing the input after composition cannot change an active run.
Invalid numbers, unknown keys, unsupported policies, and inconsistent bounds
throw a `RangeError` naming the field. IDs use lowercase letters, digits, and
hyphens. Construct definitions at the application boundary so an error is found
before a run starts. `Game` accepts only a definition returned by the composer,
not a raw object or a deserialized imitation.

| Group | Controls and constraints |
| --- | --- |
| `simulation` | World scale `.1–2`; fixed step `1/1000–1/10` seconds. |
| `movement` | Hop duration `.05–1` seconds; half-width remains `5`. |
| `health` | Maximum feathers, directional damage, recovery, and score regeneration. Each damage amount must fit maximum health. |
| `pursuit` | Wave or trailing policy, grace, speed, rear distances, warning time. Trailing distance must fit retained rows. |
| `retention` | Bounded rows and pickup reach; pickup binding cannot exceed rows ahead. |
| `economy` | Invitation interval/window, base hand capacity/hard limit, baseline coin gravity. Capacity cannot exceed its hard limit. |
| `pursuers` | Enabled state, three increasing introduction scores, first encounter time, progress/time spacing, and population cap. |
| `presentation` | Wave visibility; a trailing policy cannot display the wave. |
| `lifecycle` | Optional synchronous observers for start, progress, pause, resume, and terminal events. |

The full field bounds are enforced in `src/mode-rules.ts`. Lifecycle observers
receive `{ type, game }`; `game` is intentionally typed `unknown`. These are
trusted local callbacks, so keep them short and avoid mutating the simulation
or throwing. They observe existing transitions; they do not replace collision,
input, or simulation handlers. A new accepted maximum row emits progress;
pausing freezes world advancement. Terminal follows the existing death cleanup.

## Compatibility boundaries

The constructor's existing `arcade` / `stroll` argument remains the stored base
identity. The custom definition ID is a local authoring identifier. **Legacy
seed codes do not serialize custom rules.** A seed pins the versioned course and
base identity; loading it through `Game.fromSeed` resolves the corresponding
released preset. A development jump preserves the current custom definition,
while loading a replay code deliberately selects its encoded baseline preset.

Terrain width, generator schemas, RNG streams, numerical collision tolerances,
and the existing character power's 100-block recharge are outside this rule
surface. Changing those requires their own versioned compatibility work. No
storage keys, sound identifiers, shortcut identifiers, or intent formats change
when a local definition is composed.

## Multiplayer extension seams

This solo contract is the first stage of the multiplayer work. Shared
world/player state, input ownership, and join/leave/disconnect/reconnect handlers
belong to Phase 2. Survive Together adds recovery, consumables, and cooperative
settlement in Phase 3. Relay adds baton handoff and a closed roster in Phase 4;
Race adds the clock, competitive fog, item eligibility, and ranked results in
Phase 5. Those session handlers must be composed with the mode; the solo
observers above do not implement them.

`pnpm test:phase1` runs the immutable original-solo comparison before the
focused regression suites. Its behavioral tests must have no failures,
cancellations, or skips. Browser, type, build, guidance, and conformance evidence
is also required by the phase validation plan; conformance evidence skips are
reported separately rather than treated as coverage.
