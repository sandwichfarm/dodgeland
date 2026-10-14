---
phase: 2
slug: shared-local-session
status: draft
shadcn_initialized: false
preset: none
created: 2026-10-14
---

# Phase 2 — Shared Local Session UI Design Contract

> Visual and interaction contract for the shared-world, local-roster foundation. This phase makes a readable roster, input setup, distinct player presentation, and mode-owned device lifecycle possible. It does not implement Survive Together recovery, Relay handoffs, Race fog/results, consumable targeting, or their rules.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — existing DOM, TypeScript, and CSS |
| Preset | not applicable |
| Component library | none |
| Icon library | none — existing inline feather SVG and text/shape glyphs only |
| Font | bundled `Lilita One` (400) with `ui-rounded, system-ui, sans-serif` fallback |
| Existing material system | `src/game-ui.css`: wood frame/edge, paper panel, green field, gold controls, voxel thumbnails, hard 3px outlines and 3–4px offset shadows |

No third-party registry, component package, font download, generated art, or UI framework enters this phase. The intentional game UI exception to the napplet compact defaults is retained: large Lilita One controls and labels serve a shared local screen. The napplet still fills its runtime frame and renders no app title, masthead, footer, or marketing surface.

## Requirement and Scope Traceability

| Requirement | Contracted evidence |
|-------------|--------------------|
| ARCH-03 | One shared scene remains visible behind one session UI; every player card describes an independently controlled character in that one world. |
| INPUT-01, INPUT-06 | Explicit `Local Play` entry plus a consumed second-controller join event; clear fallback when the shell exposes no controller service. |
| INPUT-02 | Number, marker, character preview/name, and device label are always shown together; character choices already taken are unavailable. |
| INPUT-03 | Two named keyboard defaults and a full capture/conflict/cancel/reset binding editor. |
| INPUT-04 | Capture and all menu/context changes visibly consume/release held input; focused controls do not leak a join or bound key into game movement. |
| INPUT-05 | Device-lost/reclaim presentation preserves the slot; the mode, not this UI, supplies pause, ghost, skip, or elimination policy. |
| UI-01 | Game-board setup, selection, readiness, controller and keyboard guidance preserve the one-action solo start. |
| UI-02 | Persistent in-world labels and per-seat HUD tiles reserve legible health, power, revive, item, turn, and leader information. |

## Spacing Scale

Declared values are multiples of four; these extend the existing 4/8/12/16 game spacing instead of introducing a second rhythm.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Marker-to-number gap, meter segments, focus-safe inline gaps |
| sm | 8px | Card internals, compact page gutters, adjacent controls |
| md | 16px | Default board gap and HUD tile padding |
| lg | 24px | Regular-board padding and row separation |
| xl | 32px | Wide two-column board gutter |
| 2xl | 48px | Wide board section break only |
| 3xl | 64px | not used inside Phase 2 game boards |

Exceptions: 3px material outlines/shadows and 44px minimum interactive hit areas are existing game material rules, not layout spacing tokens. Board frame remains 8px. No setup, binding, or HUD region may create a document, board, or panel scrollbar.

## Typography

Use only the following four sizes and two weights in newly added Phase 2 UI. Existing inherited labels may remain until touched, then conform to this scale.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body / status | 16px | 400 | 1.35 |
| Label / binding / HUD metadata | 20px | 400 | 1.2 |
| Section heading / player name | 28px | 600 | 1.15 |
| Board heading / critical state | 44px | 600 | 1.05 |

Use tabular numerals for seat numbers, tile counts, timers, and meter values. A compact tier may replace a 44px heading with the 28px section heading; it may never shrink body/status below 16px or a target below 44px. Long character/device names use a one-line ellipsis in HUD cards and wrap to two lines in setup cards before paging takes over.

## Color

All values are fallback pigments blended with the runtime `--bg`, `--fg`, and `--primary` tokens already applied to `html`, `body`, `#app`, and the canvas. Both themes must derive every new board, label, empty state, and notice from those tokens; no browser-white surface is permitted.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | runtime `--bg` (fallback woodland `#173b31`) | scene surround, tinted/obscured world, HUD field, large empty areas |
| Secondary (30%) | paper `#fff0c5`, wood `#77512f`, edge `#3e3423` | game boards, seat cards, binding rows, persistent shelves and material outlines |
| Accent (10%) | gold `#f2cb73` plus runtime `--primary` mix | only the current page/selection, `Start Local Play`, ready confirmation, active-seat marker, and current turn/leader cue once a later mode supplies it |
| Destructive | brick `#b84939` | reset-binding confirmation and unrecoverable/invalid action text only |
| Focus / informational | teal `#4b8b7a` | keyboard focus ring and non-destructive system status only |

Accent reserved for: the primary start/confirm action; selected seat/character; each ready seat’s checked state; and later mode-provided active-turn/leader status. Player identity never relies on this accent or on hue alone: every rendering includes a stable seat number and geometric marker.

## Layout and Responsive Contract

The game surface remains full-frame with the playable world under boards. `#app` is the frame container; no centered max-width page column is introduced. An open board sets the existing modal tint/blur and keeps the correct world state visible beneath it. Modal UI owns pointer/keyboard focus while it is open.

| Frame tier | Session setup | Live HUD / overlays |
|------------|---------------|---------------------|
| Below 240px wide **or** below 240px high | Hide the game surface and show the existing short notice: `Needs 240×240 to play — enlarge this pane.` Preserve session state and release gameplay input. | Same global safety notice; no slot state is discarded. |
| 240×240 to 479px | One named page at a time: `Roster`, `Character`, or `Controls`; page counter and 44px previous/next controls. Show one seat in detail and a 1–4 compact roster strip. | Show the selected/current player’s full HUD tile plus compact numbered marker chips for other seats. Tap/click a chip to inspect; no horizontal scrolling. |
| 480px to 899px | One-column board with a two-column seat grid when height permits; character or controls opens as a bounded subpage with Back. | Two-column HUD tiles, four max; owner/market/hand selector is a compact strip. |
| 900px and wider | Two board columns: roster/character previews at left; selected-seat controls and readiness at right. Four seats remain visible without a scroll region. | Four HUD tiles form a 2×2 edge grid. Reserve the lower shelf for the one owned hand. |
| Short: height 240–319px (including 1000×280) | Use pages only; show board heading, selected seat summary, primary action, and page controls. Hide decorative previews before labels or controls. | Keep a one-line selected-seat status and compact numbered marker chips; do not overlap the scene controls/hand shelf. |
| 2400×1200 | Use a broad two-column setup board and larger voxel previews; retain 44px targets and material density rather than making a narrow centered lobby. | Keep four readable HUD tiles and use unused scene area for the world, never a second dashboard card layer. |

At 320×560 and 240×240, every setup page has one primary action within the initial frame. Setup page changes preserve selected seat, selected character candidate, validation message, and return focus. All controls wrap or switch to a page; no horizontal scrollbar is an acceptable fallback.

## Local Play Setup

### Entry and state ownership

1. The existing solo ready board keeps its current one-action `Let’s hop` start unchanged. Add `Local Play` as a secondary explicit action alongside current mode/traveler choices; it never appears as a mandatory lobby for a solo player.
2. In ready or relevant active Arcade/Flow states, deliberate activity from a second exposed standard controller opens `Local Play` setup. Consume that activity before routing further input: it cannot hop, pause, buy, choose a character, or activate a focused control.
3. Opening setup captures the current session/solo state for a cancel path. `Back to solo` closes setup and restores the prior focus without silently creating, changing, or starting a multiplayer run.
4. The board heading is `Local Play`. The regular/wide subtitle is `Pick a traveler and a controller for every player.` Compact/short views omit this line.
5. The session renderer accepts a configurable seat capacity; Phase 2 displays the validated default of four seats. Never encode four literal player IDs into labels, DOM IDs, or layout logic.

### Seat card contract

Display four ordered slots with a compact `1 / 2 / 3 / 4` roster strip in every tier. Each populated card contains all of the following in this order:

1. a geometric marker (`▲`, `●`, `◆`, `■`) and the persistent label `P1`–`P4`;
2. a voxel character preview with its accessible character name;
3. device identity (`Keyboard A`, `Keyboard B`, or the supplied controller label/index);
4. state chip: `Choose traveler`, `Ready`, `Playing`, or `Controller disconnected`;
5. a 44px `Choose traveler` or `Edit controls` action when the slot is selectable.

The marker and number appear both above the world actor and in every HUD/card state. Hues may reinforce the cards but cannot substitute for this information. Empty cards use `Open seat` and `Press a controller button or choose Keyboard A/B.` They do not manufacture a controller identity. If capacity is reached, announce `Game full — four players are ready.` and leave the existing run and roster unchanged.

### Unique character chooser

Selecting a seat opens a character page/side panel headed `P{n} traveler`. It displays one large voxel preview and a bounded previous/next character control, or a regular/wide selectable grid. A candidate’s name, existing power name, and the exact device label remain visible. The proposed candidate is the next unused eligible character.

- An available candidate exposes `Choose {character name}`.
- A selected candidate reads `Chosen for P{n}` and has a check indicator.
- A character held by another seat stays visible but disabled, labelled `Playing as P{other}`. Its tooltip/accessible description names the owning seat; it cannot be selected or claimed by a second player.
- `Back to roster` preserves the candidate without committing it. A seat becomes `Ready` only after a unique character and valid device profile are present.
- Character changes in setup are session-only. They must not overwrite the host’s saved solo traveler selection or be overwritten by profile hydration.

### Setup actions and copy

| Element | Copy / behavior |
|---------|------------------|
| Primary CTA | `Start Local Play` — enabled only with at least two ready, uniquely assigned seats and valid bindings. |
| Secondary action | `Back to solo` — cancel/return; no confirmation because no run has started. |
| Ready feedback | `P{n} ready — {character} on {device}.` |
| Empty seat heading | `Waiting for players` |
| Empty seat body | `Press a controller button or choose Keyboard A/B.` |
| Duplicate error | `{character} is already P{n}’s traveler. Choose another.` |
| Capacity error | `Game full — four players are ready.` |
| Missing controller fallback | `Controllers aren’t available in this shell. Keyboard players can still join.` |
| Binding conflict error | `{key} already controls P{n} {action}. Choose another key.` |
| Capture prompt | `Press a key for {action}. Esc cancels.` |

## Shared Keyboard and Binding Editor

The keyboard is one explicit multi-seat profile, never a disguised set of gamepads. It must work when the shell exposes no controller service.

| Seat profile | Up / forward | Left | Down / back | Right | Call |
|--------------|--------------|------|-------------|-------|------|
| Keyboard A (P1 default) | `W` | `A` | `S` | `D` | `Q` |
| Keyboard B (P2 default) | `ArrowUp` | `ArrowLeft` | `ArrowDown` | `ArrowRight` | `.` |

`P` remains the global pause key; `Escape` backs out of a board/capture. The menu confirm key is only accepted by the focused modal control and is never treated as a player movement binding. If runtime key registration supplies a different binding, render the actual assigned key rather than claiming the suggested key is guaranteed.

The `Edit controls` page has one selected-seat heading (`P{n} controls · Keyboard A/B`) and five rows in the order above. Each row exposes a visible 44px button containing the current key. It follows this exact flow:

1. Activating a binding button moves focus to the capture button, sets `Capturing {action}` visually and in a polite live region, and blocks player/menu dispatch from that key context.
2. The first supported non-modifier keydown is previewed as the new value. `Escape` cancels and restores the prior value. Unsupported keys state `Use a letter, arrow, or punctuation key.`
3. A collision is rejected before persistence; retain the old value and put the conflict text immediately below the row. Do not auto-swap, silently unbind, or move another player’s key.
4. A valid capture saves through the napplet storage surface, announces `{action} is now {key}.`, releases every input latch, and seeds current held state before returning dispatch. The captured key is consumed and cannot trigger hop, start, call, purchase, or character selection.
5. `Reset Keyboard A` / `Reset Keyboard B` is a 44px destructive-styled action. It opens the same board confirmation: `Reset P{n} to the shared-keyboard defaults?` with `Keep current controls` focused first and `Reset controls` as the explicit destructive confirmation. Reset reports any default conflict rather than overwriting another active profile.

Show `Keyboard profile ready` only when its five bindings are unique across the active keyboard seats and the profile is valid. Controls that are not editable through the iframe must be labelled as shell-provided actual bindings, never as an in-app rebind promise.

## Live Shared-World Presentation

### Actor identification

Every session actor keeps the selected voxel model and renders a high-contrast nameplate above it: marker + `P{n}` + character name. At collision distance, marker and P-number stay readable after the name truncates. The world renderer owns depth/occlusion so labels do not create a second camera or obscure hazards; labels follow actors and hide only when their actor is offscreen.

### HUD contract

The phase owns the structure and default display; later modes fill only the states their rules enable. Each player tile has this fixed reading order:

1. marker, `P{n}`, character name, and device label;
2. feather health meter with numeric text (`3 / 3 feathers`); 
3. existing innate power name/status/progress;
4. personal revive slot, initially `Revive —` until Phase 3 provides a charge/state;
5. item slot, initially `Item —` until a mode grants an item;
6. reserved mode cue line, hidden when no handler supplies `Your turn`, `Leader`, rank, or mode-state text.

No future mechanic is simulated merely to populate a tile. Phase 2 must not show a fake revive count, fog warning, Relay baton, result rank, or inventory target. Later mode cues use the reserved line and maintain the number/marker label.

At regular/wide widths the session HUD is a 2×2 set of wood/paper tiles anchored at the scene edge and does not cover the persistent hand shelf. At compact/short widths the selected/current player has the complete tile; the other seats remain as 44px marker chips with health state text in their accessible label. Selecting a chip changes only inspection, never the controlling player or session ownership.

## Explicit Owner for Hand, Market, and Menus

One shared board is reused; duplicate market/hand DOM trees are prohibited. Whenever a multiplayer-visible hand, market, inventory, or future consumable target picker opens, its toolbar begins with `Viewing P{n} · {character}` and its accessible name includes the same owner. The owner switcher is a 44px seat-marker strip, disabled for seats that the current mode does not permit.

Changing owner must clear stale selected cards, pack drafts, purchase targets, and focus references before rendering the new owner. It never changes device binding, player identity, or character. Phase 2 adds the owner affordance and HUD shelf reservation; Phase 3 decides co-op inventory/market policy, and later modes decide whether their clock pauses. Do not imply that a purchase, consumable, or pause rule already exists.

## Disconnect, Focus, and Global Safety States

Device loss is an actionable per-seat condition. It is not a death, a character reset, or a global automatic pause.

| Situation | Visible treatment | Interaction |
|-----------|-------------------|-------------|
| Controller disconnect in setup | Seat retains marker, character, and `Controller disconnected` state; show `Reconnect or press a controller button to reclaim P{n}.` | Other seats remain editable; the same slot is reclaimed explicitly by a new controller action. |
| Controller disconnect in a running session | Compact live notice: `P{n} controller disconnected.` HUD tile changes device line to `Waiting to reclaim`. | Forward the lifecycle event to the mode. This phase does not choose ghost, pause, skip, elimination, or results behavior. |
| Controller reconnect/replacement | `Controller ready to reclaim P{n}.` appears next to the preserved seat. | Only an explicit controller action claims the displayed P-number; never auto-assign it to a new character. |
| Browser blur, page hidden, or global focus lost | Existing safety pause/tinted board state; release all latches. | On return, seed held inputs; no held key/button becomes a fresh move. |
| Frame under 240×240 | Existing too-small notice replaces the game surface. | Preserve session data; pause globally and require resize before interaction resumes. |
| Missing gamepad domain | Keyboard setup and pointer UI stay usable; show the documented fallback status. | Never call native gamepad APIs or probe host state. |

The app announces joins, ready states, disconnects, reclaim availability, successful captures, and errors through a concise polite `aria-live` region. A severe blocking validation error uses assertive announcement only once when it occurs; it does not repeat during rendering.

## Focus, Touch, Motion, and Accessibility

- Every interactive target — seat card action, character previous/next, key binding, page navigation, owner chip, confirmation, cancel, and reconnect/reclaim action — has a 44×44px minimum hit area. Visual compactness never reduces its target.
- The existing 3px teal focus ring with 3px offset remains visible on gold, paper, green, and wood. Opening a board focuses its first actionable control; entering capture focuses that capture control; close/cancel restores the originating `Local Play`, seat action, or controller-safe fallback. Page switches focus the new page heading/first action without scrolling the document.
- Setup/character/controls boards use `role="dialog"`, `aria-modal="true"`, a programmatic heading, and a trapped logical tab order. Roster/character choices use labelled radio/list semantics with `aria-selected`/`aria-disabled`, not color-only presentation. Meters expose text alternatives.
- Keep actor labels, device strings, errors, and character names in DOM text; previews get useful alt text such as `P2’s Clover voxel preview`. Status hue is always paired with text, number, marker, icon shape, or meter value.
- `prefers-reduced-motion` and the existing in-app reduced setting disable board entrance, HUD pulse, character selection bounce, and disconnect flash. State changes become immediate outlines/text. No audio is required for comprehension; browser visual verification remains muted.
- Decorative voxel previews are hidden before the button/label/copy at compact and short frames. Do not hide state, conflicts, owner, or the primary action. Use page transitions without animation when reduced motion is enabled.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Start Local Play` |
| Empty state heading | `Waiting for players` |
| Empty state body | `Press a controller button or choose Keyboard A/B.` |
| Error state | `{character} is already P{n}’s traveler. Choose another.` / `{key} already controls P{n} {action}. Choose another key.` |
| Device recovery | `Reconnect or press a controller button to reclaim P{n}.` |
| Missing-controller fallback | `Controllers aren’t available in this shell. Keyboard players can still join.` |
| Destructive confirmation | `Reset controls`: `Reset P{n} to the shared-keyboard defaults?` — `Keep current controls` / `Reset controls` |

Avoid “host”, “lobby”, “room”, “online”, and “syncing”: this is an immediate local game session. Use `player`, `seat`, `traveler`, `controller`, `keyboard`, and the actual character name. Use direct verbs: `Choose`, `Edit`, `Start`, `Back`, `Reset`, `Reclaim`.

## UI Considerations

Applicable state considerations resolved: 20 covered, 5 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Open seat list | ✅ covered | Zero joined seats show `Waiting for players` and the documented controller/keyboard next step; no phantom controller is created. |
| zero-one-many | Roster | ✅ covered | One selected seat is shown as a full card; 2–4 retain number/marker/device/character for every card; full capacity announces the documented game-full state. |
| populated | Roster | ✅ covered | A populated seat always shows P-number, marker, character preview/name, device, and readable state in the prescribed order. |
| partial | Roster/character setup | ✅ covered | `Choose traveler`, unavailable duplicate character, disconnected controller, and invalid keyboard profile are distinct textual states; Start is disabled until valid. |
| overflow | Setup board | 🧪 backstop | 240×240, 320×560, and 1000×280 use pages/wrapping and have no horizontal or vertical scrollbar. |
| long-text | Character/device/error labels | ✅ covered | HUD ellipsizes one line; setup wraps to two lines; error text wraps below its row without overlapping its 44px action. |
| loading | Voxel preview / saved binding profile | ✅ covered | Preserve the slot card and show `Loading traveler…` or `Loading controls…`; disable only the relevant commit action, never erase roster state. |
| error | Binding persistence/capture | ✅ covered | Keep the last valid binding, state the error inline/live, offer `Try again`, and never leave capture mode stuck. |
| empty | HUD revive/item slots | ✅ covered | Phase 2 renders `Revive —` and `Item —` as labelled empty/reserved slots without inventing charges or items. |
| populated | HUD player tile | ✅ covered | Every player has marker/P-number/name/device, health, innate power, revive slot, item slot, and optional mode-cue line. |
| overflow | HUD player collection | 🧪 backstop | At four players, regular/wide renders 2×2 tiles and compact/short exposes a selected tile plus four marker chips; none overlap the hand shelf. |
| long-text | HUD labels | ✅ covered | Name/device ellipsize after marker/P-number; accessible labels retain full values. |
| empty | Binding editor | ✅ covered | A missing keyboard profile starts from the documented default Keyboard A/B rows and marks it ready only after validation. |
| partial | Binding editor | ✅ covered | During capture the old valid key stays recoverable; conflicts never partially commit or unbind an action. |
| error | Binding editor | ✅ covered | Conflict/unsupported/persistence errors appear adjacent to the row with the prescribed recovery action. |
| long-text | Binding/action names | ✅ covered | Labels wrap before keys; current-key buttons retain 44px width and do not clip key text. |
| loading | Controller availability | ✅ covered | While adapter availability is pending, render `Checking controllers…` and keep keyboard/pointer entry usable. |
| error | Controller unavailable/disconnect | ✅ covered | The documented keyboard fallback and reclaim copy preserve the slot/character and explain the next action. |
| overflow | Live notices | 🧪 backstop | At compact/short frames only one newest actionable notice is visible; it wraps within the scene-safe width and never covers HUD actions. |
| long-text | Live notices | ✅ covered | Notice text wraps to two lines and then uses the compact wording; no ticker, marquee, or scroll is used. |
| loading | Future owner board | ✅ covered | Owner toolbar shows `Loading P{n}’s hand…` while retaining the owner label and disabled board actions. |
| partial | Owner switch | ✅ covered | Owner switch clears stale draft/card/target and focuses the new owner heading before its data renders. |
| zero-one-many | Owner selector | 🧪 backstop | One seat renders a stable owner label; 2–4 use number/marker chips; unavailable mode-restricted seats remain labelled disabled. |
| overflow | Owner/market/hand board | 🧪 backstop | Owner strip pages at compact/short tiers rather than adding a scroll region or duplicate hand boards. |

## Visual Verification Matrix

Use the real built napplet artifact with all browser playback muted. Inspect dark and light runtime themes at every listed frame. Record screenshots/artifacts for setup, binding capture/conflict, four ready seats, live four-player HUD, and a controller-disconnected seat; later phase behavior may be represented only by the reserved structure, never by simulated mode mechanics.

| Frame | Required visual assertions |
|-------|----------------------------|
| 200×160 | Exact too-small notice is readable; game surface hidden; session state survives resize; no control or scrollbar is exposed. |
| 240×240 | One purpose-built setup page, P-number/marker roster strip, 44px page/action targets, no clipped text or scrollbars. |
| 320×560 | Roster, character chooser, binding capture/conflict/reset, and full selected-player HUD can each be completed without scrolling; selected seat and focus persist through pages. |
| 900×600 | Four ready seats fit as a readable setup grid; four HUD tiles render; owner strip and hand shelf do not overlap; modal tint keeps world legible. |
| 1000×280 | Short-page treatment keeps heading, selected seat status, primary action, and page navigation reachable; previews yield before labels/controls. |
| 2400×1200 | Broad two-column board uses the frame for roster/preview plus controls; HUD 2×2 has no oversized empty dashboard or centered narrow column. |
| Dark and light themes | `html`, `body`, `#app`, canvas surround, notice, boards, errors, empty/loading states, focus ring, HUD, and modal tint all repaint coherently and retain readable contrast. |
| Reduced motion | Board/tile/selection/disconnect state changes are immediate; no animation is needed to distinguish selection, errors, or device status. |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable — no `components.json`, React, or shadcn dependency |
| third-party | none | not applicable — no registry block is allowed into this phase |

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
