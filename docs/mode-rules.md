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

`composeSessionModeDefinition` captures validated local callbacks over the same
definition used by the world's `Game`. Unknown handler names and non-functions
are rejected before session allocation. `LocalSession.update` advances the world
once, resolves player hazards and earned settled progress, then calls `tick`.
The authored mode decides admission, lifecycle policy and terminal outcome;
input and rendering continue using the common session interfaces.

This small practice mode demonstrates every lifecycle handler. Its own setting
is validated before constructing the game. Each callback records the actual
session/seat/tick context; `result` observes the frozen terminal snapshot.
The example intentionally permits live admission, unlike Race's closed roster.

<!-- executable-session-example:start -->
```ts
import { Game } from './game.js';
import { composeModeDefinition } from './mode-rules.js';
import { composeSessionModeDefinition, LocalSession } from './session.js';
import type { SessionLifecycleRecord, SeatId } from './session.js';

export function createPracticeSession(seed: number, input: { finishTiles?: number } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'finishTiles')) throw new TypeError('Unknown practice setting.');
  const finishTiles = input.finishTiles === undefined ? 1 : input.finishTiles;
  if (!Number.isInteger(finishTiles) || finishTiles < 1 || finishTiles > 9999) throw new RangeError('Choose 1–9999 whole finish tiles.');
  const settings = Object.freeze({ finishTiles });
  const events: { type: string; sessionId: string; simulationTick: number; seat?: SeatId }[] = [];
  const definition = composeModeDefinition({ id: 'practice' });
  const game = new Game(seed, 'pond', 'arcade', false, [], 'butter', { definition });
  let current: LocalSession;
  const record = (event: SessionLifecycleRecord) => { events.push(event); };
  const observe = (type: string, session: LocalSession, seat?: SeatId) => {
    events.push(Object.freeze({ type, sessionId: session.id, simulationTick: session.world.simulationTick, seat }));
  };
  const mode = composeSessionModeDefinition(definition, {
    attach: session => { current = session; observe('attach', session); },
    canAct: () => !current.result,
    canAdmit: () => !current.result,
    canAdvance: () => !current.result,
    canLifecycle: () => !current.result,
    join: record, deviceLost: record, reclaim: record,
    depart: event => { record(event); return { archiveContribution: true }; },
    death: record,
    progress: (player, session) => observe('progress', session, player.seat),
    tick: session => {
      if (session.result || !session.players.some(player => player.participation === 'active' && player.state === 'playing' && player.completedForwardTiles >= settings.finishTiles)) return;
      const distances = Object.freeze(session.players.map(player => Object.freeze({ seat: player.seat, distance: player.completedForwardTiles })));
      session.completeResult(Object.freeze({ mode: 'practice', outcome: 'finish', settings, distances }));
    },
    result: session => observe('result', session),
  });
  const session = LocalSession.stage(game, {
    primaryDevice: 'keyboard-a',
    roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'pip' }], mode,
  }).commit();
  return { game, session, definition, settings, events };
}
```
<!-- executable-session-example:end -->

The existing router calls admission, device-loss, reclaim and departure APIs;
the session dispatches the corresponding callbacks. Initial staged participants
are delivered through `attach`; `join` observes subsequent admissions. Death
is emitted after the production death transaction, and progress only after a
genuine forward hop settles. `completeResult` accepts the first result only;
the factory freezes its nested records before publishing. Keep callbacks short,
trusted and non-throwing. Never advance the shared world from a callback.

The exact block is extracted, type-checked and executed by
`tests/mode-authoring.test.mjs`, including live admission, disconnect/reclaim,
departure, actual death, earned movement and immutable terminal publication.
Changing `finishTiles` changes only this handler policy. No input or renderer
edit is required. Production Survive Together and Relay compose their own
recovery/lifecycle policies; Race uses the same interfaces for its closed roster.

`pnpm test:phase1` runs the immutable original-solo comparison before the
focused regression suites. Its behavioral tests must have no failures,
cancellations, or skips. Browser, type, build, guidance, and conformance evidence
is also required by the phase validation plan; conformance evidence skips are
reported separately rather than treated as coverage.
