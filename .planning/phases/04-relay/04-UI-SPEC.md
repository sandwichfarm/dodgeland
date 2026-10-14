---
phase: 4
slug: relay
status: approved
shadcn_initialized: false
preset: none
created: 2026-10-14
---

# Phase 4 — Relay UI Design Contract

> Canonical visual and interaction contract for Relay. This extends the approved
> Phase 2/3 napplet surface; it does not create a second session, market, hand,
> recovery, or result system.

## Design System

| Property | Value |
|---|---|
| Tool | none — existing TypeScript/CSS napplet surface |
| Preset | not applicable; no `components.json`, React, or shadcn dependency |
| Component library | none |
| Icon library | existing inline game glyphs and voxel previews only |
| Font | `Lilita One`, with `ui-rounded, system-ui, sans-serif` fallback |
| Source | `src/styles.css`, `src/game-ui.css`, approved Phase 2/3 UI contracts |

Use the one canvas scene, one camera, established paper-and-wood boards, voxel
traveler models, bottom shelf, and owner-labelled hand/market tree. Do not add a
page shell, app title, masthead, footer, dashboard, centered max-width column,
or any scrollbar. Runtime theme tokens repaint `html`, `body`, `#app`, canvas
surround, modal tint, material tokens, disabled state, focus ring, and result
board together.

## Spacing Scale

| Token | Value | Usage |
|---|---:|---|
| xs | 4px | glyph and meter gaps |
| sm | 8px | compact controls and board internals |
| md | 16px | default board padding and grouped rows |
| lg | 24px | board sections and HUD separation |
| xl | 32px | wide board columns and scene-edge groups |
| 2xl | 48px | large board separation |
| 3xl | 64px | broad-scene grouping only |

Exceptions: existing 3px focus/border outlines, 5–8px material radii, 8px wood
frame, and 44px minimum interactive hit targets are deliberate material/accessibility
dimensions, not spacing tokens.

## Typography

Use exactly these four sizes and two weights. All Relay material uses the game
font; numeric meters use tabular figures.

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Compact label / status | 16px | 400 | 1.2 |
| Body / controls / ledger rows | 20px | 400 | 1.5 |
| Board heading / active runner | 28px | 600 | 1.2 |
| Result distance / relay rank | 44px | 600 | 1.1 |

At compact and short frames, retain the four semantic roles but hide lower-priority
copy before reducing a label below 16px. A marker and `P{n}` never truncate;
character/device names ellipsize after that identity. Board prose wraps to two
lines before a 44px action may clip.

## Color

The current runtime-derived material palette is mandatory. Hex values below are
the fixed palette inputs; final colors remain derived with `color-mix()` from
the runtime `--bg`, `--fg`, and `--primary` tokens.

| Role | Value | Usage |
|---|---|---|
| Dominant (60%) | runtime `--bg` / game paper `#fff0c5` | scene surround, paper boards, HUD surfaces, result base |
| Secondary (30%) | wood `#77512f`, edge `#3e3423`, ink `#233e32`, green `#365d48` | frames, outlines, inactive tiles, status surfaces, text |
| Accent (10%) | gold `#f2cb73` | enabled primary actions, active-runner marker, configured-order position, current boundary/leg cue, ready confirmation, rank badge |
| Destructive | `#c56a36` | final leave action and fatal/error emphasis only |
| Focus / informational | teal `#4b8b7a` | 3px focus ring and protected/informational state only |

Accent is reserved for `Start Relay`, `Start P{n}'s leg`, `Reclaim P{n}` when
fresh input is accepted, the active runner, the next boundary, and earned-rank
badges. It never distinguishes lifecycle state by itself; every state also has
a label and disabled/action policy.

## Visual Hierarchy and Shared Surfaces

The live course remains the visual focal point. Place Relay HUD material at scene
edges and keep the persistent shelf shallow at the bottom. The active runner is
the only full-strength HUD tile: marker, `P{n}`, character, `RUNNING`, current
leg distance, health, and two independent progress rows. Other roster members
are compact scene-edge marker tiles showing `NEXT`, `waiting`, `disconnected`,
`departed`, or `down`; they never imply control.

The two progress rows must remain separate in every tier:

- `Power · {earned}/100 tiles` is the innate character power.
- `Personal revive · {earned}/250 tiles` is the personal-revival charge.

Both rows draw only per-seat earned forward progress. Baton placement, common
frontier, and handoff position never advance either meter. The shared course
distance is a separate HUD value labelled `Relay distance {distance}`.

Use a stable marker/nameplate in the scene for the active traveler and a muted,
labelled mark for inactive, disconnected, departed, dead, and protected seats.
Reduced motion changes board entrance, handoff, marker change, pickup feedback,
and protection to immediate static states. Sound is supplementary, follows the
existing mute setting, and every browser proof launches muted without bypassing
the audio graph.

## Relay Setup Contract

Relay setup is entered only through the explicit mode/setup flow. The solo start
remains its existing single-gesture path and has no Relay roster controls.

1. Show `Relay setup` as a material board over the ready scene. Offer two to
   four seats, each with a unique character picker and its existing controller/
   keyboard binding status. A selected character is unavailable to every other
   seat and is visibly disabled with `Already chosen by P{n}.`
2. Show the configured order as numbered, draggable-or-button-reordered 44px
   seat rows. Each row contains marker, `P{n}`, character, bound controller
   label, and `Move earlier` / `Move later` controls. Reordering changes only
   runner order; it never changes seat identity or binding.
3. Show `Tiles per leg` as a labelled whole-number field. Default: `50`.
   **Bounded implementation default:** accept integers from `1` through `999`;
   reject empty, fractional, signed, or out-of-range values inline as
   `Choose 1–999 whole tiles per leg.` This is a UI validation bound; the Relay
   definition remains the authoritative validator.
4. Enable `Start Relay` only when 2–4 bound seats have unique characters, a
   complete order, and an accepted segment length. Its accessible description
   states `Roster locks when the relay starts.`
5. On success freeze and display the ordered seat IDs/characters and length.
   A later controller cannot add a traveler. A new-input attempt receives
   `Relay roster is locked for this run.` A recognized original slot proceeds
   only through reclaim; it is never presented as join.

Loading setup data retains the last valid rows and disables only its dependent
action (`Checking P{n}'s controller…`). A rejected binding or stale selection
keeps the user's order and field value, marks the row, and says
`P{n}'s controller is unavailable. Reconnect it or remove this seat.`

## Turn, Boundary, and Handoff Contract

Only the active connected, alive runner may issue movement, open the hand or
market, buy, sell, target, or use an allowed action. All inactive direction and
market/item input does nothing and must produce neither a hop nor a transaction.
All controllers remain eligible for their own menu/reclaim/lifecycle action.

At the configured boundary, show the one current leg as `Leg {n}: P{n} ·
{character}` and `Next boundary {distance}`. A crossing latches `handoff pending`
but does not immediately show the transfer board. First complete the accepted
hop, landing/platform resolution, hazard checks, and any validated recovery. A
fatal hazard wins: show its established death/recovery flow and never transfer
the baton from a dead runner. A nonfatal power/rescue can settle, then allow the
handoff.

After safe settlement, freeze simulation and show the transfer board:

| Board element | Contract |
|---|---|
| Heading | `Leg {n} complete` |
| Status | `P{outgoing} carried the baton {segmentTiles} tiles.` |
| Incoming identity | marker, `P{incoming}`, character, `Up next` |
| Primary CTA | `Start P{incoming}'s leg` |
| Required interaction | a fresh input from the incoming seat confirms the CTA; the boundary-triggering input is consumed and cannot make the first hop |
| Secondary | `View relay` opens a read-only roster/leg summary; it never changes owner or moves the world |
| On confirmation | close the board, place the incoming traveler through the authoritative safe-placement service, clear held input, retain world state, then focus the scene |

The transfer board never claims that rows, actor phases, clock, seed/RNG future,
pickup claims, market/run state, health, inventory, coins, innate charge, or
personal revival charge were reset. It must never award a free pickup, heal,
or meter progress. If an exceptional position lies beyond further boundaries,
show only the one settled transfer; another handoff requires later runner-authored
forward progress.

## Lifecycle, Reclaim, Skip, and Leave Contract

| Event | Visible state and action policy |
|---|---|
| Inactive disconnect | Keep the current runner/world live. Change that compact tile to `P{n} disconnected · reclaimable`; show one polite `P{n} disconnected — their slot is saved.` notice. The seat is skipped on a later rotation. |
| Active disconnect | Freeze on a named transfer board: `P{n} controller disconnected.` and `Reclaim P{n} or choose the next runner.` Show `Reclaim P{n}` only after a fresh input identifies the original slot. A connected eligible player may open `Skip P{n}`. No timer, automatic death, or automatic skip occurs. |
| Reclaim | Heading `Continue as {character}`; body `Your relay seat and items are still here.` Primary `Reclaim P{n}`. After authoritative fresh-input acceptance, clear stale held input and return to the existing pending handoff/turn. Do not show a character picker, join flow, or purchase grant. |
| Skip | Confirmation `Skip P{n} this turn?` / `Their seat stays reserved for reclaim.` Actions `Back` and `Skip P{n}`. Record the zero/partial leg as `Skipped`, rotate in configured order, and preserve the slot as reclaimable. |
| Deliberate leave | Confirmation `Leave Relay as P{n}?` / `Your leg record stays in the results. This is not a death.` Actions `Keep playing` and destructive `Leave Relay`. Disable the seat permanently, preserve immutable contribution, and do not spill, refund, or transfer its assets. |
| Only reclaimable seats remain | Freeze the world and show `Waiting for a player to reclaim.` / `No runner is ready. Reserved seats can return.` The `waiting-for-reclaim` board has no auto-advance action. |
| Last available runner leaves | If a reclaimable original seat remains, show the waiting state. If none remains, freeze the immutable result with `No runner remains.` Late input cannot change it. |
| Actual death | Use the delivered Phase 3 death/recovery presentation before any rotation. The actual runner alone visibly loses their run wallet/items; disconnection, skip, and leave never show this death treatment. |

## Owner Hand, Market, and Mode Eligibility

There is one physical bottom shelf and one hand/market DOM tree. Its heading is
always `Viewing P{n} · {character}` and repeats that owner in its accessible
name. During Relay only the active runner may operate it. An inactive tile may
be inspected, but its hand controls are disabled and read `Only the active runner
can use the relay hand.`

On every turn/owner change, clear selected offer, draft, consumable target,
confirmation, return focus, and held input before rendering the next owner.
Focus lands on the new owner heading. No stale selection can purchase, sell,
use, or confirm for the next runner.

Initial Relay permits only the active runner's own personal revival when it is
authoritatively eligible. It has no Relay consumable world spawns. Do not render
teammate `Revival`/`Flare` offers, pickup art, target controls, or success copy
in Relay. If a future completed Phase 3 eligibility service marks another item
compatible, render it only after that authoritative mode check; otherwise show
`{item} is not available in Relay.` without a spend. `Items: —` is the empty
hand copy.

## Relay Result and Podium Contract

At the single terminal transition, render an immutable `Relay results` board
over the retained final scene. It is a snapshot: late input, old targets, a
new device, viewport resize, or reopening the board cannot change the outcome.

| Element | Contract |
|---|---|
| Shared result | `Relay distance {distance} hops.` plus the terminal outcome (`Relay complete.`, `No runner remains.`, or authoritative terminal reason). |
| Primary CTA | `Hop again` |
| Podium metric | descending earned Relay distance only |
| Ties | use competition ranking: equal distance receives the same displayed `=1`, `=2`, etc.; the following rank skips positions (for example `=1`, `=1`, `3`). Never break a tie by roster order, input time, coins, character, or name. |
| Podium form | contributors sharing a rank stand on the same rank tier. Do not invent a winner from visual ordering; each retains marker, P-number, and character name. |
| Participant aggregate | marker, `P{n}`, character, final lifecycle, Legs, Distance, Time, Coins, Pickups, Self revives, Deaths, Skips, and departure state. |
| Leg ledger | append-only records ordered by leg number: leg, runner, settled start/end frontier, earned distance, duration, coins, pickups, self revives, and outcome (`Handed off`, `Dead`, `Skipped`, `Left`, or `Ended`). |

Do not infer result numbers from mutable final avatar state. A dead or departed
participant keeps the recorded coins/pickups/legs earned before clear/leave and
their accurate lifecycle label. A disconnected unreclaimed participant reads
`Disconnected`. At small tiers page the podium and ledger by participant/leg;
do not scroll or silently omit entries.

## Responsive Layout Contract

The game surface fills the iframe. Boards use the existing modal tint and paper/
wood frame. No document, board, panel, or ledger scrollbar is allowed.

| Frame | Required presentation |
|---|---|
| 200×160 | Hide the scene and show exactly `Needs 240×240 to play — enlarge this pane.` Preserve setup/session/handoff state, release gameplay input, and expose no control or scrollbar. |
| 240×240–319px | One named page only: `Setup`, `Roster`, `Handoff`, `Reclaim`, `Skip`, `Leave`, `Waiting`, or `Results`. Show marker strip plus 44px previous/next/back controls. One primary CTA is visible. |
| 320×560 | Complete the selected setup row, order controls, segment field/error, handoff, lifecycle confirmation, and one result/ledger page without overlap. Long participant or leg lists page. |
| 480–899px | Single-column board with a two-column roster or results grid where height permits. HUD has one full active tile and compact other markers. |
| 900×600 | One scene with a 2×2 edge HUD. Setup and result board use two columns: roster/leg state left; configuration, handoff, lifecycle action, podium, or ledger detail right. Keep the one bottom shelf clear. |
| 1000×280 | Short-page composition only: active/incoming runner, one status line, one primary CTA, and previous/next/back. Hide voxel decoration and secondary totals before text or a 44px control. The shelf remains shallow. |
| 2400×1200 | Expand the shared scene and use a broad board: roster/active state beside leg ledger, or podium beside participant breakdown. Do not scale a narrow board or add a second dashboard. |

At 240×240, 320×560, and 1000×280 preserve selected order row, validated length,
active/incoming IDs, lifecycle message, current owner, and return focus across
pages/resizes. At every tier use marker + P-number + character name; labels wrap
or ellipsize as defined and controls never overflow horizontally.

## Focus, Input, and Accessibility Contract

- Every setup seat, character choice, reorder button, length field, owner chip,
  transfer/reclaim/skip/leave action, and pagination control has a 44×44px
  minimum hit target.
- Opening setup focuses the first editable seat. Opening handoff focuses the
  incoming runner's primary confirmation; opening skip/leave focuses `Back` or
  `Keep playing`; reclaim focuses `Reclaim P{n}` after fresh input. Closing a
  board returns focus to the safe initiating control or active scene.
- Modal boards use `role="dialog"`, `aria-modal="true"`, an accessible heading,
  and trapped logical keyboard/controller focus. Order controls announce current
  position. Character choices and lifecycle choices use labelled radio/list
  semantics and disabled state, never color alone.
- One concise polite live region announces seat, active-runner, handoff, and
  ledger-state changes. Fatal terminal and validation errors announce assertively
  once; rendering must not repeat them.
- The input that opens setup, reclaim, skip, or transfer is consumed. It cannot
  also hop, buy, sell, consume an item, pause, start the next leg, or mutate
  selection. Board close/owner change clears held latches before dispatch resumes.
- Respect app reduced-motion preference and `prefers-reduced-motion`; changes
  become static. Runtime dark/light themes must preserve readable text and the
  teal focus ring on all material surfaces.

## Copywriting Contract

| Element | Copy |
|---|---|
| Setup primary CTA | `Start Relay` |
| Setup length label/default | `Tiles per leg` / `50` |
| Setup validation | `Choose 1–999 whole tiles per leg.` |
| Duplicate character | `Already chosen by P{n}.` |
| Locked roster | `Relay roster is locked for this run.` |
| Boundary/handoff | `Leg {n} complete` / `P{outgoing} carried the baton {segmentTiles} tiles.` / `Start P{incoming}'s leg` |
| Active disconnect | `P{n} controller disconnected.` / `Reclaim P{n} or choose the next runner.` |
| Reclaim | `Continue as {character}` / `Your relay seat and items are still here.` / `Reclaim P{n}` |
| Skip confirmation | `Skip P{n} this turn?` / `Their seat stays reserved for reclaim.` / `Skip P{n}` |
| Waiting state | `Waiting for a player to reclaim.` / `No runner is ready. Reserved seats can return.` |
| Leave confirmation | `Leave Relay as P{n}?` / `Your leg record stays in the results. This is not a death.` / `Keep playing` / `Leave Relay` |
| Inactive hand | `Only the active runner can use the relay hand.` |
| Empty/invalid item | `Items: —` / `{item} is not available in Relay.` |
| Results | `Relay results` / `Relay distance {distance} hops.` / `Hop again` |
| Size notice | `Needs 240×240 to play — enlarge this pane.` |

## UI Considerations

Applicable state considerations resolved: 25 covered, 6 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|---|---|---|---|
| empty | Relay setup roster | ✅ covered | Start is disabled until the bounded two-seat minimum, unique characters, bindings, order, and segment value are valid; the exact setup validation copy is shown. |
| partial | Setup roster / segment field | ✅ covered | Individual controller/binding errors retain valid rows, order, and length; only affected start/action controls disable. |
| loading | Controller/reclaim validation | ✅ covered | Retain stable seat identity and show `Checking P{n}'s controller…`; disable only reclaim or setup action awaiting the authoritative result. |
| error | Setup/reclaim/transfer action | ✅ covered | Inline exact error preserves the prior valid order, length, expected runner, and world state; no speculative handoff occurs. |
| populated | Active roster HUD | ✅ covered | One full active tile and compact explicit lifecycle tiles identify all frozen roster members without granting inactive authority. |
| partial | Lifecycle roster | ✅ covered | Active, next, disconnected-reclaimable, departed, dead, waiting, skipped, and protected are labelled with distinct action policy. |
| zero-one-many | Eligible runners | ✅ covered | Rotation names one active runner; unavailable seats are skipped only through explicit policy; no connected seat shows waiting/reclaim state and no eligible/reclaimable seat ends once. |
| overflow | Roster / leg ledger / results | 🧪 backstop | Required frames page bounded rows with no document, board, panel, or ledger scrollbar. |
| long-text | Names, device messages, errors | ✅ covered | Keep marker/P-number visible, ellipsize names, wrap board prose to two lines, and retain a 44px action. |
| loading | Handoff settlement | ✅ covered | `handoff pending` remains a compact non-action status until authoritative landing/hazard/recovery resolution permits the transfer board. |
| error | Boundary/fatal hazard | ✅ covered | Fatal loss routes to the established death/recovery flow before any baton UI; a handoff is never rendered for a dead outgoing runner. |
| populated | Personal progress meters | ✅ covered | Distinct `Power · /100` and `Personal revive · /250` rows show personal earned movement only. |
| partial | Owner hand / market | ✅ covered | Inactive or unavailable seats can be inspected but cannot transact; owner switch clears all stale action/focus state before the next render. |
| empty | Relay items | ✅ covered | Show `Items: —`; no teammate consumable pickup/offer/use surfaces appear in this mode. |
| error | Ineligible item action | ✅ covered | `{item} is not available in Relay.` leaves wallet, item count, player state, and world unchanged. |
| overflow | Live scene HUD / short frame | 🧪 backstop | Compact/short tiers show only active/incoming identity, one status, one action, and navigation without covering shelf or touch controls. |
| zero-one-many | Result contributors and ranks | ✅ covered | One to four participant aggregates are retained; equal earned-distance values receive one shared competition rank tier. |
| populated | Result ledger | ✅ covered | Closed legs present immutable runner, distance, time, coins, pickups, self revives, and terminal outcome. |
| long-text | Result lifecycle / outcome | ✅ covered | `Disconnected`, `Left`, and terminal outcomes wrap before their tabular values; entries page rather than truncate data. |
| overflow | Result podium / ledger | 🧪 backstop | Small and short frames page rank tiers, aggregates, and legs; wide frames place podium beside data without a narrow centered column. |
| error | Last-runner / no-controller terminal | ✅ covered | Waiting state freezes only while reclaim is possible; `No runner remains.` produces one immutable result and rejects late input. |
| overflow | Theme/reduced-motion evidence | 🧪 backstop | Both themes and reduced motion are inspected at every required frame with muted browser playback, no clipped controls, and no scrollbar. |

## Dependency Reconciliation Before Implementation

Phase 2/3 were planning artifacts when this contract was written. Before product
work, reconcile their completed source and summaries; map this UI to actual
exports and do not fabricate names or duplicate services.

| Dependency | Required reconciliation |
|---|---|
| Shared session / seat router | Confirm frozen-seat IDs, lifecycle signals, fresh-input consumption, active-owner gate, controller bindings, capacity, and safe scene focus hooks. |
| Owner hand/market surface | Extend the accepted one-tree owner invalidation path; verify owner changes clear draft, card/offer, target, confirmation, focus, and latches. |
| Recovery / personal progress | Use actual per-seat 100/250 meters, death transaction, safe placement, and recovery outcomes. Never calculate these from shared frontier. |
| Mode eligibility | Obtain the completed Phase 3 item eligibility result before rendering any compatible item. Do not make a UI-only eligibility claim. |
| Relay result service | Feed the immutable append-only leg/contribution projection; do not derive data from mutable seats after death/leave. |
| Renderer/audio | Use existing marker, scene, modal, and mute-aware pathways only; no host DOM, direct network, or native-device access. |

## Visual Verification Matrix

Use the real built napplet. Every browser proof runs with muted audio while the
application audio graph remains intact. Inspect both runtime themes and reduced
motion at every frame.

| Frame / condition | Required assertions |
|---|---|
| 200×160 | Exact size notice only; scene hidden; setup/handoff/waiting state survives resize; no control or scrollbar. |
| 240×240 | Setup, roster reorder, invalid/default 50 field, handoff, reclaim, skip, leave, waiting, and result pages each expose one primary action and 44px navigation with no clipping. |
| 320×560 | Configure unique characters/order/length; perform fresh-confirmed baton handoff; show active and inactive disconnect, reclaim, skip, waiting, active/inactive owner restriction, personal 100/250 rows, and paged ledger. |
| 900×600 | One scene, 2×2 seat HUD, active/next treatment, shelf/market owner label, transfer board, and contribution podium remain legible and non-overlapping. |
| 1000×280 | Runner/incoming identity, one status, primary action, and back/navigation remain reachable; decoration and secondary totals yield first. |
| 2400×1200 | Broad scene, roster/leg state, and podium/breakdown use available space without a narrow center column or second dashboard. |
| Boundary priority | At 49/50/51 and multiple configured lengths, backward/repeated crossing never creates a second leg; a fatal hazard at the boundary shows death/recovery before any handoff. |
| Continuity | Ground and moving-platform transfer retain exact world/course/time/actor/RNG/pickup state; neither personal meter, health, wallet, inventory, nor pickup count gains from baton placement. |
| Lifecycle | Prove inactive disconnect keeps play live; active disconnect freezes for reclaim/explicit skip; reclaim is original-seat-only; last leave waits when reclaimable members remain and finalizes once none remain. |
| Results | Verify true equal-distance ranks, immutable participant aggregates and leg ledger across death, skip, leave, and unreclaimed disconnect. |
| Dark/light + motion + mute | Full theme repaint, readable focus, static reduced-motion handoff/result states, muted browser launch, and no status dependent on sound. |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|---|---|---|
| shadcn official | none | not applicable — no `components.json`, React, or shadcn dependency |
| third-party | none | not applicable — no registry block is allowed into this phase |

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved by independent `gsd-ui-checker` on 2026-10-14; all six dimensions PASS. See `04-UI-REVIEW.md`.
