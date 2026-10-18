# Phase 06: Cross-Mode Presentation — Pattern Map

**Mapped:** 2026-10-16. **Execution:** generic-agent fallback applying the full `gsd-pattern-mapper.toml` instructions. **Baseline:** production `2da5dd9`, documentation HEAD `f52025d` supplied by orchestrator. Only this document is written; no source edits, commits, browser launches or tests.

Scope comes from `06-CONTEXT.md`, `06-RESEARCH.md`, approved `06-UI-SPEC.md` and `06-VALIDATION.md`: G1 actual traveler/body/nameplate visibility versus DOM HUD, and G2 duplicate solo personal status. The approved contract now explicitly distinguishes compact nonselected marker chips from selected summaries. Reuse existing lifecycle/results evidence; Phase05 human acceptance remains pending.

## File Classification

These are candidate ownership boundaries for the planner, not a mandate to modify every listed file. New test names are proposals and need explicit creation tasks before becoming required commands.

| New/modified file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `src/main.ts` | controller/component integration | event-driven → DOM projection | existing `updateHud`, `selectHudOwner`, `closeHudInspection` in same file | exact |
| `src/session-ui.css` | component styling | viewport/state → layout | existing selected-detail/pager rules in same file | exact |
| `src/relay-ui.css` | component styling | authoritative mode attributes → layout | existing active/inactive HUD selectors in same file | exact |
| `src/race-ui.css` | component styling | authoritative mode attributes → layout | existing regular HUD grid/short overrides in same file | exact |
| `src/relay-ui.ts` (only if projection markup needs adjustment) | component | mode snapshot → DOM | existing `renderRelayHud` | exact |
| `src/race-ui.ts` (only if projection markup needs adjustment) | component | mode snapshot → DOM | existing `renderRaceHud` | exact |
| `src/render.ts` (conditional, evidence required) | presentation service | world/player views → canvas | `project`, `drawSession`, `SessionPresentation` | exact integration seam; new occlusion responsibility has no complete analog |
| proposed `tests/cross-mode-presentation.mjs` | integration test | actual input → observation → artifact | `tests/race-layout.mjs` | role/data-flow match |
| proposed `tests/session-scene-geometry.mjs` (only if helper extraction warranted) | test utility | read-only observations → rectangles | renderer math + `session-labels-render.test.mjs` + fixture observation | partial; no complete cross-layer helper exists |
| existing `tests/local-session-layout.mjs` | integration test | setup/input → layout/artifact | same file; source-freshness pattern | exact |
| existing `tests/relay-layout.mjs` | integration test | real lifecycle → frame matrix | same file; retain252-state/frame observations | exact |
| existing `tests/race-layout.mjs` | integration test | real lifecycle → frame matrix | same file; retain420 captures rather than duplicate suite | exact |

**12 candidate files:** 10 exact existing seams, 1 role/data-flow match, 1 partial helper analog. Five strong pattern groups below are sufficient. `market-ui.ts`, `run-hand.ts`, session/recovery/result modules are preservation references, not presumed repair targets. No new library, gameplay model, result ledger or router is needed.

## Pattern Assignments

### 1. `src/main.ts`: reuse current owner and detail lifecycle

**Analog:** same file, lines128–149 and1006–1039. The committed session owns HUD visibility; roster changes rebuild seat-derived DOM, preserving focused seat. Existing short-frame inspection has stored play/pause state, bounded pages and a Close action. Generalize its layout eligibility without inventing another owner or pause variable.

```ts
// src/main.ts:128–138
function selectHudOwner(seat: SeatId): void {
  if (hudSelected === seat) return;
  if(raceItemContext)closeLifecycleBoard();
  // Existing order matters: resolve/invalidate old inventory before switching.
  const marketWasOpen = market.invalidateOwner(); hand.invalidateOwner();
  coOpMarketContext = undefined; router.seedAll(); hudSelected = seat;
  hudDetailsPage = 0;
  if (marketWasOpen && localSession?.running) market.openForSelected();
  market.update(); market.focusSelectedOwner(); updateHud();
}
```

The excerpt preserves production statements; explanatory comment is shortened. Do not replace these calls with CSS-only ownership. G2 should use one shared-presentation visibility condition, not separate mode-name branches or an anonymous global wallet relabel.

```ts
// src/main.ts:146–149
const shouldResume = resume && hudInspectWasPlaying && frameAvailable();
hudDetailsOpen = false; hudInspectWasPlaying = false; hudDetailsPage = 0;
if (shouldResume) { sessionPaused = false; game.resume(); activateNativeKeyboard(); }
```

**Important reconciliation:** identity-click inspection currently opens only when `innerHeight <= 319` and the selected seat is clicked (`main.ts:1017–1020`). Approved regular summaries therefore require a narrow extension of this existing interaction, not just hiding detail DOM with CSS. Retain previous pause reason, accessible dialog/focus behavior and inactive-controller restrictions. Pager and Close buttons already exist at1031–1036. `updateHud` later fills personal100/250 values from actual players and calls mode HUD projections; keep that source of truth.

**Guard/error pattern:** recovery context validity is checked before presentation at1000–1003; changed identity/generation discards the old board with truthful copy. Keep these checks, rather than carrying a stale target into a newly composed view.

### 2. Shared and mode CSS: state-scoped overrides, not global solo edits

**Analogs:** `session-ui.css:99`, `relay-ui.css:132–158`, `race-ui.css:102–111,153–168`; material tokens in `game-ui.css:1–13`.

```css
/* Existing selector pattern: src/relay-ui.css:134 */
#app:has(#session-seats[data-relay-hud="true"]) .score-block { display: none; }
/* Existing selected-detail state: src/relay-ui.css:154–158 */
#session-seats[data-relay-hud="true"]:not([data-session-hud-inspect="true"])
  .session-hud-selected .session-hud-details [data-session-hud="power"],
#session-seats[data-relay-hud="true"]:not([data-session-hud-inspect="true"])
  .session-hud-selected .session-hud-details [data-session-hud="revive"] {
  display: block; min-height: 20px; height: auto; padding: 0; border: 0;
  font: 400 16px/1.2 var(--relay-font); opacity: 1;
}
```

Copy state scoping/material token usage, **not old dimensions**. The new approved bands supersede the tall900px Race edge columns and regular shared four-column full cards. Consolidate conflicting media rules instead of appending increasingly specific overrides. Keep short-height precedence, wide expanded2×2 details, exact floor,44px actions and16/20/28/44 type roles. G2 suppression must work at every shared tier while all solo selectors/defaults remain effective after cleanup.

Mode UI projection files need modification only if the current field structure cannot represent concise summaries; retain existing data attributes and lifecycle facts. Do not add mode-policy decisions to shared CSS/main.

### 3. Conditional renderer seam and geometry: preserve one transform

**Analog:** `src/render.ts:50–69,383–406,528–529`.

```ts
// src/render.ts:61
project(x: number, row: number, z = 0): Point {
  return [this.width * .5 + (x + (row - this.camera) * .3) * this.scale,
    this.height * .71 + (x * .18 - (row - this.camera) * .62 - z) * this.scale];
}
// src/render.ts:528–529
drawSession(world: SharedWorld, players: readonly PlayerRender[], dt: number,
            presentation?: SessionPresentation): void {
  this.drawScene(world.host, world.host.characterId, dt, players, presentation);
}
```

Existing `SessionPresentation` requires `cameraAnchor`, `boundary`, and mode markers. It is **not already a generic safe viewport**. Do not fabricate Race fog fields for Survive/Relay merely to pass a viewport. If CSS fails measured geometry, add the smallest independently optional presentation input with exact unchanged solo defaults, document it, and keep all scene layers on one transform.

`cube` at63–67 projects actual voxel corners; `turnedModel` starting71 rotates every corner with yaw/pitch. `appendTraveler` starting410 supplies real pose/lift/model details. These are the geometry sources, not a guessed fixed radius around `project(player.x,player.y)`. The existing label packing at397–403 starts from ground coordinates and accounts for Protected text but compares only other labels:

```ts
// src/render.ts:397–398
let [x, y] = this.project(player.groundX, player.groundY, 1.1);
let rect = { left: x - width / 2, right: x + width / 2,
  top: y - lineHeight - statusHeight, bottom: y };
```

**Missing analog:** there is no current complete read-only body+packed-label versus opaque DOM intersection oracle. Derive envelopes from the same pose/corner geometry and actual canvas CSS transform; validate against full-size capture. Do not call rendering methods to synthesize another frame, alter the world, monkeypatch production rendering, or add a product debug export. If a tiny pure geometry extraction is needed, retain solo parity and use the exact production math instead of duplicating a second approximate renderer.

### 4. New bounded browser acceptance: existing fixture plus Race matrix pattern

**Analogs:** `tests/race-layout.mjs:1–41` and `tests/market-game-fixture.mjs:85–124,165`. Imports are local explicit `.mjs` modules:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createMarketGameFixture} from './market-game-fixture.mjs';
import {earnTogether,mixedSetup,freshReclaim} from './race-browser-fixture.mjs';
```

Reuse `mixedSetup` only for Race; reuse corresponding existing actual-input Survive/Relay journeys for their setup. No common helper should silently select Race for other modes. Public seed intent and `sendPads` are authorized stimuli. `onSession`/`onRenderer` observe real production objects through debugger scope, without application test hooks:

```js
// tests/market-game-fixture.mjs:106–108
const result = await cdp.send('Runtime.callFunctionOn', {
  objectId: objectIds.get(kind), functionDeclaration: fn.toString(),
  returnByValue: true, arguments: args.map(value => ({ value }))
});
if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
return result.result.value;
```

The fixture **permits mutations technically**; read-only behavior is the caller's obligation, not an enforcement guarantee. Do not copy its `stageMarket`/`stageOffers` arrangements into real-built G1 acceptance. New observation callbacks return copies of positions/views/projection parameters/frozen results only; reach positions through real input.

```js
// Existing DOM geometry pattern: tests/race-layout.mjs:25,30
const visible = n => n.getClientRects().length &&
  getComputedStyle(n).visibility !== 'hidden' && !n.closest('[hidden]');
const r = node.getBoundingClientRect();
const hit = document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
```

Extend this with the approved8px separation and actor/label rectangles versus **actual visible** HUD/tools/shelf/warning footprints. DOM hit-testing alone proves only controls, not canvas bodies. Include text `Range.getClientRects()` pattern at `race-layout.mjs:33` where an apparently in-bounds button can still clip text. Coordinate conversion must account for canvas CSS rect/DPR; iframe viewport dimensions differ from the outer Playwright page.

Reuse the fixture's native resize-observer barrier at116–124 rather than fixed sleeps or supplying focus to fake restoration. Snapshot before/after only under the real paused/decision state appropriate to that mode; do not expect a deliberately live Race clock to freeze merely for measurement. Catch/report failures, write evidence in finally, and close the fixture as in existing matrix suites.

### 5. Source-fresh artifacts and retained evidence

**Analog:** `tests/local-session-owner-layout.mjs:20–33` (artifact provenance only) and `tests/local-session-layout.mjs:11–17`.

```js
// tests/local-session-owner-layout.mjs:21–26
const artifact = await stat(new URL('../dist/index.html', import.meta.url));
const digest = async file => createHash('sha256')
  .update(await readFile(new URL(`../${file}`, import.meta.url))).digest('hex');
const sourceDigests = {};
for (const file of ['src/main.ts', 'src/market-ui.ts', 'src/run-hand.ts', 'src/hand-layout.css']) {
  assert.ok((await stat(new URL(`../${file}`, import.meta.url))).mtimeMs <= artifact.mtimeMs,
    `${file} requires a new production build`);
  sourceDigests[file] = await digest(file);
}
```

Adapt the file list to **all actually changed presentation sources/CSS**, including renderer if used. Record artifact hash, source hashes/revision, mode/state/frame/theme, geometry details and capture path. This analog's later inventory staging is arranged evidence and must not be copied into G1 real-input proof. Hashes identify artifacts; they do not replace screenshots or measured behavior.

Reuse the existing252 Relay and420 Race capture suites for changed-surface regression, not a duplicate matrix. New cross-mode test scope is G1 initial/lateral actor intersections and G2 visibility/owner/menu/resize/solo restoration. Preserve existing sale-on-pack-page and five-participant Survive result assertions; no new result service or data-loss repair is indicated.

## Shared Patterns

- **Authority:** preserve `selectHudOwner` invalidation order, context generations, assigned-device leases and input reseeding. UI selection does not confer mutation rights. Terminal result routing precedes gameplay-only `canAct`; retain recent actual-controller regression.
- **State:** model/session remains authoritative; result UI reads frozen records, not mutable live players. Inspection stores previous playing state and restores only if frame available; resizing cannot confirm/revive/buy.
- **Styling:** derive tokens from existing game material; scope shared attributes, use height-first compact treatment and existing bounded pages. Keep solo defaults exact.
- **Errors:** fixture throws CDP exceptions; browser reports retain error/external/failure arrays and screenshots. Product failures keep authoritative reason and avoid speculative success state.
- **Verification:** real built opaque iframe, muted output, public input/seed, read-only observations; no private state writes, installs, dependencies, oracle repin or preview5175 changes. Run one process at a time; exact final gates belong to execution, not this mapping.

## No Complete Analog Found

| Responsibility | Existing partial sources | Required planner treatment |
|---|---|---|
| Full canvas body+nameplate versus DOM occluder geometry | renderer corner/pose math; label render-component test; fixture read-only scope observation; DOM matrix | Explicit test-creation task; no claim that current label-only test closes G1 |
| Generic optional shared safe viewport | `project` and `drawSession`; current mode presentation parameter | Conditional only after CSS RED evidence; default solo unchanged; do not manufacture fog data |

## Metadata

Graph-first discovery used project `Users-sandwich-Develop-crossy-road-clone`; direct snippets/file ranges supplied excerpts. Five strong analog groups cover12 candidate files. Already loaded AGENTS, boundary, skills and Phase06 research context remain binding; no broad research or runtime execution was repeated. Approved contract and validation strategy take precedence over legacy analog dimensions or fixture shortcuts.
