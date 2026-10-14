---
phase: 3
slug: survive-together-consumables
status: draft
shadcn_initialized: false
preset: none
created: 2026-10-14
---

# Phase 3 — Survive Together & Consumables UI Design Contract

> Visual and interaction contract for the Survive Together lifecycle and consumables phase. This is a design contract: the screens and states below are required of the Phase 3 implementation; it does not claim they already exist.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — existing DOM, TypeScript, canvas renderer, and CSS |
| Preset | not applicable |
| Component library | none |
| Icon library | none — existing inline feather SVG, voxel models, and text/shape glyphs only |
| Font | bundled `Lilita One` (400) with `ui-rounded, system-ui, sans-serif` fallback |
| Existing material system | `src/game-ui.css`: timber/edge frame, paper board, green field, gold controls, hard 3px outlines, 3–4px offset shadows, and voxel character art |

Extend the approved Phase 2 material system; do not add a design framework, registry block, font download, generated art, web-page header, masthead, footer, or centered max-width application column. The runtime frames the napplet, so the game scene or the required size notice owns the first pixel. The intentional game exception to the 13px napplet default remains appropriate: shared local play uses large, readable Lilita One controls while preserving a compact full-frame surface.

## Requirement and Scope Traceability

| Requirement | Contracted visual / interaction evidence |
|-------------|------------------------------------------|
| COOP-01 | One world stays visible behind all co-op boards; each occupied seat has a persistent marker, character model/name, independent health, innate power, personal-revive status, consumable status, and lifecycle state. |
| COOP-02 | A fresh join is explicit, safe, consumes its trigger, uses a unique traveler, and never resets the live course, timer, score, wallets, or shelves. |
| COOP-03 | Each seat shows personal `Revive` readiness/progress separately from the character's innate 100-tile power; actual death can expose one short manual self-revive offer. |
| COOP-04 | Revival uses an eligible-dead-teammate target picker; Flare confirms the affected dead teammates, returns the team safely, and gives clear protected-return feedback. |
| COOP-05 | Active, ghost, reclaimable, dead, recovery-pending, and departed states use distinct copy and visuals. Ghost inventory is preserved; death spill and revival economy are visible as distinct states. |
| ITEM-01–05 | A dedicated consumable row exists in the owned hand/market, visible world pickup models label `Revival` or `Flare`, outcomes are owner-attributed, and invalid use leaves charges unchanged. |
| UI-03 | One persistent owner-labelled hand/market tree switches seats safely, keeps Sell available in the current tree, and clears stale detail, draft, target, focus, and input-latch state. |
| UI-05 / TEST-04 | Purpose-built compact and short-frame pages, 44px targets, no scrollbars, dark/light runtime themes, reduced motion, and muted browser proofs at every required frame. |

## Spacing Scale

Use this existing game rhythm. All declared values are multiples of four; do not introduce arbitrary margins to fit a view.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | icon/marker gap, meter segments, adjacent compact badges |
| sm | 8px | compact gutters, target-picker rows, shelf internals |
| md | 16px | board gaps, HUD-tile padding, compact page gutter |
| lg | 24px | regular-board padding and section separation |
| xl | 32px | wide-board column gap only |
| 2xl | 48px | wide team-result group separation only |
| 3xl | 64px | not used inside Phase 3 boards |

Exceptions: existing 3px material outlines/shadows, 5–8px board radii, the 8px board frame, and the 44px minimum interactive target are material rules rather than spacing tokens. No board, picker, hand, market, HUD, or result view may create a document, board, or panel scrollbar.

## Typography

Use only these four sizes and two weights for added Phase 3 UI. Existing inherited labels may remain until touched, then conform to this scale. Numbers for charge progress, timers, distance, coins, and contribution stats use tabular numerals.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body / status / pickup label | 16px | 400 | 1.35 |
| HUD metadata / target label | 20px | 400 | 1.2 |
| Section heading / player name | 28px | 600 | 1.15 |
| Board heading / urgent recovery state | 44px | 600 | 1.05 |

At compact/short tiers, substitute the 28px heading for a 44px heading. Never shrink body/status below 16px or a target below 44px. HUD character/device text ellipsizes to one line after its marker and P-number; board labels can wrap to two lines; all status/error text wraps before a target is clipped.

## Color

All values are fallback pigments mixed with the runtime `--bg`, `--fg`, and `--primary` tokens already painted on `html`, `body`, `#app`, and the canvas surround. Theme repainting includes every new board, world pickup, HUD state, empty/loading/error state, and size notice; a dark runtime must never expose a browser-white surface.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | runtime `--bg` (fallback woodland `#173b31`) | live scene surround, HUD field, dimmed world, large empty areas |
| Secondary (30%) | paper `#fff0c5`, wood `#77512f`, edge `#3e3423`, green `#365d48` | boards, HUD tiles, owner strip, hand shelf, status chips, material outlines |
| Accent (10%) | gold `#f2cb73` mixed with runtime `--primary` | only the current owner, focused/selected target, `Use Revival`, `Use Flare`, `Reclaim P{n}`, ready personal revive, and result primary action |
| Destructive | brick `#b84939` | deliberate `Leave run` confirmation, expired recovery, and invalid/unrecoverable action text only |
| Focus / informational | teal `#4b8b7a` | the existing 3px focus ring and neutral system status only |

Accent reserved for: the selected target; the current owner strip chip; a charged personal-revive indicator; a currently actionable consumable; the explicit reclaim action; and the result primary action. Seat identity never relies on accent or hue: every actor/tile retains a stable geometric marker plus `P1`–`P4`.

## Live Co-op Presentation

### Actor and HUD contract

During active play, the shared scene and players' next safe landing tiles are the visual focal point. HUD tiles and the hand stay at the scene edges with subdued material contrast, leaving nearby hazards and player markers clear. Only actionable recovery or an explicitly opened menu takes primary emphasis. Compact inspection pages return to the scene with one Back action.

Each occupied seat keeps the Phase 2 above-actor nameplate: geometric marker + `P{n}` + character name. Marker and P-number remain after the name truncates at collision distance. The renderer owns depth and occlusion so nameplates never cover hazards or make a second camera.

At regular/wide sizes, show up to four wood/paper player tiles in a 2×2 scene-edge grid that never overlaps the bottom hand shelf. At compact/short sizes, render the selected/current seat's complete tile plus four 44px marker chips. Selecting a chip changes inspection only; it never transfers character control or market ownership.

Every complete player tile uses this exact reading order:

1. marker, `P{n}`, character name, and device line;
2. feather meter with numeric text, for example `3 / 3 feathers`;
3. `Power: {name} · {progress or Ready}` for the existing innate character hazard power;
4. `Personal revive: Ready` or `Personal revive: {n} / 250 tiles`;
5. `Items: Revival ×{n} · Flare ×{n}`; show `Items: —` when empty;
6. lifecycle cue line, only when needed: `Waiting to reclaim`, `Down`, `Revive offer`, or `Left run`.

The innate power and personal revive must always use separate rows and labels. The former retains the established character-power rules, including its 100-tile behavior; it never becomes or looks like a personal revival charge. The latter advances only for that player's newly reached frontier and shows the literal `250 tiles` target.

### Required lifecycle state treatments

| State | World / HUD treatment | Exact copy and permitted interaction |
|-------|-----------------------|--------------------------------------|
| Active | Full voxel actor/nameplate, complete tile, normal marker chip. | `P{n} · {character}` plus the current device. That seat alone controls its character. |
| Joining | Safe spawn marker is visible only after the join transaction succeeds; no fake actor. | Board: `P{n} is joining this run.` Then `Choose a free traveler for P{n}.` The triggering controller/key input is consumed and cannot hop, confirm a purchase, or activate an item. |
| Ghost / disconnected | Desaturated, translucent voxel silhouette with marker/nameplate; no health or pickup animation; tile has a dashed paper edge. | Tile: `Waiting to reclaim`. Notice: `P{n} controller disconnected.` Reclaim affordance: `Press a controller button to reclaim P{n}.` Ghost inventory and shelf counts remain visible but unavailable for use. |
| Reclaim-ready | Same ghost treatment plus gold reclaim ring, not a new-character preview. | `Controller ready to reclaim P{n}.` A fresh reclaim action restores this seat; it must never allocate a new seat, change character, or consume a join path. |
| Dead | Character is absent from play but its marker/name remains as a muted `Down` tile; a short spill visual belongs to that character only. | Immediate notice: `P{n} is down — their run wallet and items spilled.` The tile must not imply that any teammate lost items. |
| Recovery-pending | Dead tile gains a visible, textual countdown bar; do not use color alone. | `P{n} can revive themself · {s}s` and a 44px `Use personal revive` action. **Default tuning:** offer lasts 8 active-play seconds; pausing freezes it. |
| Departed | No live actor or claim/pickup indicator. Keep a muted contribution tile until team results snapshot. | Confirmation uses the separate deliberate-leave flow below. After confirming: `P{n} left the run.` It is neither a death nor reclaimable ghost. |

Actual death clears only the dead character's current-run wallet, purchases, cards/powers, cosmetics, and consumables before recovery is offered. A successful self-revive, Revival, or Flare restores the same character and contribution record at a safe protected position but shows `Items: —` and the emptied wallet; it never claims to restore lost purchases. Ghost/disconnect retains inventory and does not spill it. These distinctions are mandatory in both visible copy and rendered owner state.

### Join, reclaim, and deliberate departure

1. A fresh second input opens the established Phase 2 local-seat chooser rather than moving the actor. In a live solo Arcade or Flow run, its compact heading is `Play together?` and its supporting line is `Choose a free traveler. This run will keep its course and progress.` The actions are `Start together` and `Keep playing solo`, with `Keep playing solo` focused first. Confirming `Start together` promotes that exact world into Survive Together: course, seed, progress, elapsed time, host character, host wallet, host purchases, and host shelf remain intact. Cancelling leaves the solo run unchanged and returns focus/input to it.
2. In an already shared Survive Together run, the compact heading is `Join this run` and its supporting line is `Choose a free traveler. The flock keeps moving from here.` The chooser uses the existing unique-character rule. Taken travelers remain visible, disabled, and read `Playing as P{n}`. Preselect the first unused eligible traveler to keep drop-in quick, but require the explicit primary action `Join as P{n}`. If all provisional four seats are occupied, show `Game full — four players are already in this run.`
3. The opening controller/key input and the `Start together` / `Join as P{n}` confirmation are consumed. Neither may hop, pause, confirm a purchase, activate an item, or cause a second join. While the join request is validated, keep the new seat tile as `Joining…`; do not show a second world, reset score/timer, clear a hand, or invent an actor before safe placement succeeds. Failure uses `Couldn’t place P{n} safely. Try again.` and preserves the active run.
4. A controller loss transitions only the affected seat to ghost. Other active players keep playing. The newest actionable notice is the only live notice shown at compact/short sizes.
5. A fresh controller input offered for a ghost opens `Reclaim P{n}` with `Continue as {character}. Your items are still here.` The two actions are `Reclaim P{n}` and `Not now`; focus starts on `Reclaim P{n}`. It must not expose character selection.
6. An active player can open a 44px `Leave run` action from the paused owner board. It opens `Leave as P{n}?` with body `Your run ends, but this is not a death.` `Keep playing` is focused first; `Leave run` is brick-styled. Confirming removes the live actor and releases the seat under the mode policy without spill, refund, transfer, or impact on teammates. **Default policy:** a voluntary departure's contribution remains in this run's final record; returning later is a new join, not a reclaim.
7. Relay and Race are not inferred from a second-controller event and never promote/reset an active solo run. Their mode selection remains an explicit new-run setup flow in their own phases.

## Consumables and Recovery Interaction

### World collectible contract

World consumables are a separate collectable silhouette from coin models: a paper badge with wood rim, a clear voxel glyph, and a small label. Revival uses a plus/feather glyph and label `Revival`; Flare uses a four-point burst glyph and label `Flare`. Both float/pull with the game's baseline collectible motion, including river/log positions; neither adopts magnet enlargement or a coin denomination visual. Do not surface probability figures in play.

When visible, the item has an accessible label `World item: Revival` or `World item: Flare`. When collected, show the winner's marker and concise feedback: `P{n} found Revival.` or `P{n} found Flare.` A contested claim reports only the awarded owner, for example `Revival went to P2.` Ghost, dead, and departed tiles never receive collection animation or credit.

### Owned shelf, target picker, and market

Keep the existing one physical bottom shelf and one market/menu DOM tree. The owner toolbar is always first and reads `Viewing P{n} · {character}`. Its accessible name repeats the owner. Owner markers are 44px chips and display marker + P-number; unavailable/dead/departed owners are visibly disabled for action. A ghost may be inspected as `P{n} · {character} · waiting to reclaim`, but all purchase, sell, and use controls are disabled with `P{n} must reclaim their controller first.`

The owner switch is a view change only. It never changes a device/seat binding, changes a character, moves an actor, or permits P2 to approve a P1 action. Opening a hand, market, detail, use picker, or leave confirmation assigns the input context to the invoking/current owner. Controller and keyboard menu confirmation must remain attributed to that owner; pointer confirmation uses the board's visible owner. Before rendering another owner, clear selected card, pack draft, market choice, consumable target, confirmation, focus reference, and input latch. Focus then lands on the new owner heading.

The current owner shelf lists cards first as it does today and a distinct `Items` row beneath them. Do not display Revival or Flare as cards, cosmetics, automatic powers, or permanent modifiers. Market stock may list an eligible consumable in the same existing shop board; each offer says `Revival` or `Flare`, exact current price, current owner's wallet, and either `Buy Revival` / `Buy Flare` or `Not enough coins`. Selling remains available from the existing card detail without leaving this one owner-labelled tree. No Phase 3 control may promise a purchase or use in an ineligible mode.

### Exact use flows and feedback

| Action | Target / confirmation flow | Success feedback | Invalid / unavailable feedback |
|--------|----------------------------|------------------|--------------------------------|
| Personal revive | Only the dead owner with a pending offer sees `Use personal revive`. It is a direct 44px action; the board displays the active-time countdown. | `P{n} is back — protected for a moment.` HUD becomes `Personal revive: 0 / 250 tiles`; wallet/items remain empty. | After expiry: `P{n}'s revive offer ended.` The action disappears. No stored charge alone keeps the run open. |
| Revival | Select `Revival ×{n}` then open `Choose a teammate`. Show only eligible dead teammates as 44px marker/name cards. Focus the first eligible card. Confirm button is `Revive P{n}`; `Back` returns to the same owner shelf. | `P{owner} revived P{target}.` Target tile shows `Protected` until protection ends. | With none: `No teammate can be revived right now.` If a target becomes invalid or safe return fails: `{target} can’t return safely yet. Revival kept.` |
| Flare | Select `Flare ×{n}`. The confirmation board lists every eligible dead teammate by marker/name under `Bring the flock together?`; it does not use a per-target picker. Actions are `Use Flare` and `Back`, with `Back` focused first. | `P{owner} used Flare — the flock regrouped.` Every returned tile shows `Protected`; living teammates also move to the owner's safe position. | With none: `No teammate needs a flare right now.` If any return placement fails: `The flock can’t regroup safely yet. Flare kept.` |
| Market purchase | Current owner selects an eligible consumable offer and presses `Buy Revival` or `Buy Flare`. | `P{n} bought {item}.` The owner's item count updates in the same tree. | `P{n} needs more coins.` or `{item} is not available in this run.` No wallet or item count changes. |

All feedback is an inline status plus a concise polite live announcement. A failed activation never plays a success animation, decrements a visible count, moves a player, or changes a target tile. Success is rendered only after the authoritative action commits. World/return protection uses a stable shield/halo plus the literal word `Protected`; reduced-motion mode makes this a static badge rather than a flash.

### Shared-run end and team result

The live HUD must not claim a team run is still recoverable because of a ghost or an unused-but-unoffered charge. When no active seat and no valid pending recovery offer remains, present one immutable material board headed `The flock's run`.

* Shared outcome line: `The flock reached {distance} hops.` For an unsuccessful end use `The flock needs another crossing.`
* Primary result action: `Hop again`.
* Team presentation: characters stand together on one equal-height paper-and-wood perch. Do not assign first through fourth places or vertically ranked podium blocks.
* Each participant keeps marker, P-number, character, and lifecycle finish state, then lists `Hops`, `Coins found`, `Rescues`, and `Items found`. A voluntarily departed participant remains in this breakdown as `Left run`; a ghost that never reclaimed retains `Disconnected`; a dead/revival outcome reads the actual final state.
* A departed/dead player's cleared wallet and items are never reintroduced by the result board. The shared result is a snapshot: late controller input, old target selection, or a new join cannot alter it.

This Phase 3 result is the Survive Together team breakdown required for co-op. It is not a template for Relay turn podiums or Race competitive ranking, which belong to their dedicated phases.

## Layout and Responsive Contract

The canvas/game scene fills the iframe. Co-op boards sit over the one shared scene with the established modal tint; no page shell, centered site column, or nested-card dashboard may appear. Any board freezes the shared run only while a focused purchase, target choice, personal recovery decision, reclaim confirmation, or departure confirmation is open; it releases gameplay input latches before opening and seeds held state before resuming. This is a Phase 3 default chosen for readable local multi-controller ownership.

| Frame | Required presentation |
|-------|-----------------------|
| 200×160 | Hide the game surface and show exactly `Needs 240×240 to play — enlarge this pane.` Preserve session/offer state and release gameplay input. No control or scrollbar is exposed. |
| 240×240–479px | Use one named page at a time: `Players`, `Items`, `Choose a teammate`, `Confirm Flare`, `Reclaim`, `Leave`, or `Results`. Show a 1–4 marker strip and 44px previous/next/back controls. One primary action fits without scrolling. |
| 320×560 | Show complete selected player tile, owner strip, item picker, target cards, confirmation, and result breakdown as bounded pages. Long lists use page controls, never a scroll region. |
| 480–899px | One-column board; target cards form a two-column grid when height permits. HUD uses selected full tile plus compact markers when all tiles would cover the scene. |
| 900×600 | Four HUD tiles use a 2×2 scene-edge grid. Owner/market board uses a two-column composition: owner/status and items at left; target/confirmation or offers at right. The bottom shelf remains clear. |
| 1000×280 | Use short pages only: title/owner or target summary, one status line, one primary action, and previous/next/back controls. Hide decorative voxel preview before text or a 44px action; shelf becomes its existing shallow horizontal form. |
| 2400×1200 | Expand the live scene and keep readable 2×2 tiles. Use a broad board with team state and target/market detail side by side; do not scale up a narrow board or add a second dashboard layer. |

At 240×240, 320×560, and 1000×280, every page change preserves owner, target candidate, validation message, offer countdown, and return focus. Labels wrap/ellipsis as specified; controls never overflow horizontally. Existing board/shelf reservation rules must ensure HUD, notices, modal, touch controls, and the persistent hand cannot overlap.

## Focus, Controller Ownership, Motion, and Accessibility

- Every owner chip, seat chip, item, target card, confirm/back action, `Use personal revive`, `Reclaim`, and `Leave run` action has a 44×44px minimum target. A compact card may look smaller only if its actual hit area remains 44px.
- The existing teal 3px focus ring and 3px offset remain visible on paper, gold, green, and wood. Opening a board focuses the first actionable control. Opening Revival focuses the first eligible target; opening Flare or Leave focuses `Back`/`Keep playing`; reclaim focuses `Reclaim P{n}`; close/cancel restores the initiating owner/action safely.
- A modal board uses `role="dialog"`, `aria-modal="true"`, an accessible heading, and a trapped logical tab/controller focus order. Player/target choices use labelled radio/list semantics with disabled state, not hue alone. Status/lifecycle changes use one concise polite live region; terminal/offer-expiry messages announce assertively once and never repeat on render.
- The controller/keyboard event that opens join, reclaim, or target UI is consumed. It cannot also move, buy, sell, choose a target, use an item, pause, or start play. Switching owner/closing a board clears held latches before dispatch resumes.
- Respect app reduced-motion preference and `prefers-reduced-motion`: board entrance, hand lift, pickup bob, target highlight, spill, protection, and reclaim transitions become immediate static state changes. Audio cues respect mute; all planned browser proof launches Chromium with muted audio.
- Runtime dark/light theme changes repaint `html`, `body`, `#app`, the size notice, canvas surround, material tokens, disabled states, world labels/pickups, focus ring, and modal tint together. Do not hard-code a light-only item badge or a dark-only result surface.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Use Revival`, `Use Flare`, or `Join as P{n}` according to the active bounded flow; never a vague `Continue`. |
| Owner heading | `Viewing P{n} · {character}` |
| Solo promotion / join heading | `Play together?` / `Choose a free traveler. This run will keep its course and progress.` / actions `Start together` and `Keep playing solo`; shared-run join remains `Join this run`. |
| Ghost / reclaim | `P{n} controller disconnected.` / `Press a controller button to reclaim P{n}.` / `Continue as {character}. Your items are still here.` |
| Empty items | `Items: —` |
| No Revival target | `No teammate can be revived right now.` |
| No Flare target | `No teammate needs a flare right now.` |
| Invalid recovery | `{target} can’t return safely yet. Revival kept.` / `The flock can’t regroup safely yet. Flare kept.` |
| Personal-offer expiry | `P{n}'s revive offer ended.` |
| Death economy | `P{n} is down — their run wallet and items spilled.` |
| Deliberate leave confirmation | `Leave as P{n}?` / `Your run ends, but this is not a death.` / actions `Keep playing` and `Leave run`. |
| Full roster | `Game full — four players are already in this run.` |
| Team result | `The flock's run` / `The flock reached {distance} hops.` |
| Size notice | `Needs 240×240 to play — enlarge this pane.` |

## UI Considerations

Applicable state considerations resolved: 26 covered, 6 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Owned consumable row | ✅ covered | The owner HUD/hand renders `Items: —`; market availability retains the owner label and offers a mode-appropriate item only. |
| populated | Owned consumable row | ✅ covered | Revival and Flare render as distinct item counts and use actions, never as cards/powers/cosmetics. |
| partial | Consumable target picker | ✅ covered | Only eligible dead teammates are actionable; changed target, no target, or unsafe placement preserves the charge and shows the prescribed inline status. |
| overflow | Hand / owner strip / target cards | 🧪 backstop | 240×240, 320×560, 900×600, 1000×280, and 2400×1200 use paging or reflow with no document, board, or panel scrollbar. |
| zero-one-many | Eligible teammate targets | ✅ covered | Zero uses documented no-target copy; one focuses its one target; 2–3 use bounded marker/name cards; Flare lists all affected players. |
| long-text | Character, device, lifecycle, and error text | ✅ covered | HUD ellipsizes after marker/P-number; boards wrap to two lines; compact wording replaces excess text before a 44px control clips. |
| loading | Join/reclaim/owner hand data | ✅ covered | Retain the current seat/owner identity and show `Joining…`, `Checking controller…`, or `Loading P{n}'s hand…`; disable only the dependent action. |
| error | Join/reclaim/recovery/purchase | ✅ covered | Show exact next-step copy adjacent to the action and keep the last valid target/owner state; no partial visible spend/move occurs. |
| empty | Recovery offer | ✅ covered | No charge or expired offer has no action; a stored charge alone never renders a false game-open state. |
| populated | Personal revival / innate power | ✅ covered | Separate rows show `Power` and `Personal revive`, including the literal 100 versus 250 progress contexts. |
| partial | Seat lifecycle | ✅ covered | Active, joining, ghost, reclaim-ready, dead, recovery-pending, and departed treatments have distinct label, art, and action policy. |
| overflow | Live notices / complete HUD | 🧪 backstop | Compact/short renders only the newest actionable notice, full selected tile, and marker chips without covering the shelf or scene controls. |
| long-text | Result contributions | ✅ covered | Player names truncate after marker/P-number; contribution labels wrap; values remain tabular and all four participants page rather than scroll. |
| loading | World pickup state | ✅ covered | Item appears only when authoritative pickup data exists; no speculative award animation or owner count is shown. |
| error | World pickup / contested claim | ✅ covered | Award feedback identifies only the authoritative winner; ghost/dead/departed seat cannot display a collection outcome. |
| zero-one-many | Team result participants | ✅ covered | One to four contribution tiles share an equal-height team perch; no competitive first/last order is inferred. |
| overflow | Team result | 🧪 backstop | Small/short frames page contribution tiles and retain `Hop again`; wide frames use the full scene without a narrow centered column. |
| long-text | Result state and departure label | ✅ covered | `Disconnected`, `Left run`, and death/revival labels are textual and wrap before stat rows. |
| overflow | Theme/reduced-motion proof | 🧪 backstop | Visual evidence covers all required frames in both runtime themes with reduced motion enabled, muted browser playback, no clipped control, and no scrollbar. |

## Dependency Reconciliation Before Implementation

The Phase 3 executor must reconcile this contract with completed Phase 1/2 exports before changing product code. This is an integration requirement, not permission to create parallel session/UI systems.

| Dependency | Required reconciliation |
|------------|-------------------------|
| Phase 2 seat/session API | Confirm the final exported seat IDs, lifecycle events, fresh-input consumption, ghost/reclaim signals, capacity, and owner-router hooks. Map this contract to those APIs; do not invent an alternate session state. |
| Phase 2 accepted owner tree | Extend its one hand/market tree and its focus-clear behavior. Verify the final owner switch clears card detail, draft, consumable target, confirmation, focus, and input latch before render. |
| Phase 1 solo compatibility | Retain solo's one-action start and existing game/market behavior. Co-op markup/control state must appear only for Survive Together or explicit local setup. |
| Recovery/consumable transaction seam | Obtain structured authoritative outcomes for join, claim, recovery, safe placement, protection, expiry, and invalid activation so UI never mutates charges or player state speculatively. |
| Renderer/audio seam | Add marker/nameplate, ghost, item, spill, and protection presentation through the one world renderer and mute-aware audio pathway; never add host DOM, direct network, or native-device access. |
| Departure policy | Implement the stated Phase 3 default: departure preserves final contribution only, does not spill/refund/transfer, and a later controller is a new join. If the approved mode policy changes, update this contract before implementation. |

## Visual Verification Matrix

Use the real built napplet artifact. Browser playback is muted for every proof. Inspect both dark and light runtime themes at every listed frame; record screenshots/artifacts for the concrete states below.

| Frame / condition | Required visual assertions |
|-------------------|----------------------------|
| 200×160 | Exact size notice is readable; game surface hidden; session and pending offer survive resize; no control or scrollbar appears. |
| 240×240 | Purpose-built Players/Items/target/reclaim/result pages retain owner/target, use 44px controls, and show no clipped text or scrollbar. |
| 320×560 | Join, ghost/reclaim, death/personal offer, Revival target selection, Flare confirmation, owner switch, sale, and team breakdown complete via pages without overlap. |
| 900×600 | Four player tiles, one bottom shelf, one owner-labelled hand/market tree, target board, world collectible indicator, and protected-return badge remain legible and non-overlapping. |
| 1000×280 | Short-page treatment keeps heading/owner or target, one status line, primary action, and back/navigation reachable; decorations yield before controls. |
| 2400×1200 | Broad scene and board use the available frame; four HUD tiles and team result use space without a second dashboard or centered narrow column. |
| Dark and light themes | `html`, `body`, `#app`, canvas surround, world items, boards, owner strip, ghost/dead states, errors, notice, focus ring, and modal tint repaint coherently with readable contrast. |
| Reduced motion + mute | Board/pickup/ghost/reclaim/protection state changes are readable with no animation; browser runs use muted audio and no success/error relies on sound. |
| Economy and safety | P1 death visibly clears only P1's owned wallet/items; P2 remains unchanged; revival returns P1 empty; ghost keeps inventory; invalid Revival/Flare visibly retains its charge. |

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
