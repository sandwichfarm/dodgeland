# Development inspector

`pnpm dev` includes a small **Dev** button over the game. Open it to pause the
run, inspect state, load a copied seed, jump to a score, add 25 run coins, restore health, or clear
current pursuers. Resume explicitly when ready; typing and controller actions
cannot move the duck while the inspector is open.

For an opaque Paja iframe, use the self-contained development artifact:

```sh
pnpm build:dev
pnpm preview:dev
```

The development artifact preview is served at `http://127.0.0.1:5176/`.
The current [Paja development preview](http://127.0.0.1:5195/) targets that
artifact and loads it inside the runtime's opaque iframe.

The normal `pnpm build` and
`pnpm preview` produce and serve the production game, which contains neither
these controls nor diagnostic text. `import.meta.env.DEV` gates the entire
module and its CSS at compilation. There is no query-string or storage flag
that can enable it in a production artifact. The development build explicitly
sets `NODE_ENV=development`; `--mode development` alone does not enable Vite's
`DEV` branch during a build. The production build explicitly runs
`NODE_ENV=production vite build --mode production`, so an inherited development
environment cannot accidentally ship the inspector. Do not publish `dist-dev`.

Jump accepts an integer from 0 through 100000. It replaces the current run,
including inventory, private collision contacts and pursuer scheduling, while
preserving its captured seed schema, starting world, mode and item catalog. It generates only
39 nearby rows, moves the actual duck and camera, and initializes normal
score/market/healing milestones. The landing row becomes a clear meadow;
neighboring lanes retain their seeded terrain. The clock is staged at
0.45 seconds per score and the wave starts six rows behind the duck. These are
inspection fixtures, not a replay of the skipped gameplay.

**Load copied seed** accepts a complete end-of-run code and creates a fresh,
paused sandbox at score zero. It uses that code's schema, starting world, mode,
and gentle-start setting independently of current preferences. It reloads the
full catalog for the encoded mode, including Arcade-only items when loading
from Stroll. Invalid or unsupported codes show an error without replacing the
run or marking it as a sandbox. Valid loading never changes lifetime records.
After loading, jump controls retain the same captured schema and course code.
The landing meadow used by jumps is a development fixture and is not encoded
into the copied course; a replay from score zero uses the original seeded row.

Presets cover the first market and mob thresholds: 99/100, 159/160, 319/320,
and 479/480. Market and mob rules remain active after resuming: a market
invitation can postpone a mob arrival, and spawning still requires safe
terrain, enough time and distance, and room around the traveler.

Every mutation marks the run as a sandbox. Sandbox coins, scores and deaths
do not change lifetime records or unlocks. A clean retry returns to normal
recording. Opening the inspector without using a mutation does not mark a run.

The diagnostic text shows run state/mode, score, ground position/hop, seed and full replay code,
chapter/terrain, simulation time, wave row/gap, health/recovery, wallet/items,
market milestone/time, pursuer positions/phases and retained row range. It is
selectable for copying. The panel closes on blur, document hiding or a frame
smaller than the game's 240×240 minimum. Opening or closing alone never resumes
a paused run.

```sh
node --test tests/devtools.test.mjs
pnpm build
pnpm build:dev
node tests/devtools-runtime.mjs
```

The runtime check uses both unchanged built artifacts in opaque `allow-scripts`
iframes. It exercises real inspector controls and SDK keyboard callbacks,
sandbox persistence isolation, clean retry, optional-domain absence, teardown,
delayed storage hydration, and 200×160, 240×240, 320×560, 900×600,
1000×240 and 2400×1200 frames in both themes: 12 frame/theme cases. It also checks
all production artifacts
for development code/UI markers and verifies that production exposes no
inspector or debug mutation API. Evidence is written to
`artifacts/development-runtime.json`.
