---
phase: 5
slug: race
status: approved
reviewed: 2026-10-14
shadcn_initialized: false
preset: none
created: 2026-10-14
---

# Phase 5 — Race UI Design Contract

> Canonical visual and interaction contract for Race. It extends the approved
> shared-session, consumable, and Relay surfaces; it does not create a second
> world, session, market, hand, recovery, item, or result tree.

## Design System

| Property | Value |
|---|---|
| Tool | none — existing TypeScript/CSS napplet surface |
| Preset | not applicable; no `components.json`, React, or shadcn dependency |
| Component library | none |
| Icon library | existing inline game glyphs, voxel previews, and canvas marks only |
| Font | `Lilita One`, with `ui-rounded, system-ui, sans-serif` fallback |
| Source | `src/styles.css`, `src/game-ui.css`, approved Phase 2–4 UI contracts |

Keep the voxel/material game as the focal surface. Use the existing canvas,
paper/wood/ink/gold boards, shallow persistent shelf, material frames, and
runtime-derived theme tokens. Do not add a website shell, title/masthead/footer,
dashboard, centered max-width column, nested card stack, or scrollbar. Runtime
theme repaint covers `html`, `body`, `#app`, canvas surround, modal tint, fog,
material tokens, focus ring, disabled state, and result board together.

The implementation begins with an actual Phase 1–3 API reconciliation. All
names in this contract describe required views and observations, not permission
to invent planned session, recovery, router, item, renderer, or result APIs.

## Spacing Scale

| Token | Value | Usage |
|---|---:|---|
| xs | 4px | glyph, meter, and status gaps |
| sm | 8px | compact controls and board internals |
| md | 16px | default board padding and grouped rows |
| lg | 24px | board sections and HUD separation |
| xl | 32px | wide board columns and scene-edge groups |
| 2xl | 48px | major board separation |
| 3xl | 64px | broad-scene grouping only |

Exceptions: existing 3px focus/border outlines, 5–8px material radii, 8px wood
frame, and 44px minimum interactive hit targets are deliberate material and
accessibility dimensions, not spacing tokens.

## Typography

Use exactly these four sizes and two weights. Numeric timers, distances, ranks,
and meter values use tabular figures. At compact and short sizes hide secondary
copy before reducing text below 16px.

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Compact label / status | 16px | 400 | 1.2 |
| Body / controls / result rows | 20px | 400 | 1.5 |
| Board heading / racer identity | 28px | 600 | 1.2 |
| Race timer / rank / terminal distance | 44px | 600 | 1.1 |

`P{n}` and its marker never truncate. Character and device names ellipsize only
after that identity; board prose wraps to two lines before a 44px action clips.

## Color

Use the runtime-derived material palette. Fixed palette inputs below must be
mixed with runtime `--bg`, `--fg`, and `--primary` tokens, so both runtime
themes repaint every state.

| Role | Value | Usage |
|---|---|---|
| Dominant (60%) | runtime `--bg` / game paper `#fff0c5` | scene surround, paper boards, HUD base, result base |
| Secondary (30%) | wood `#77512f`, edge `#3e3423`, ink `#233e32`, green `#365d48` | frames, outlines, inactive HUD, status surfaces, text |
| Accent (10%) | gold `#f2cb73` | committed primary actions, leader/finish/rank cue, ready item control |
| Destructive | `#c56a36` | leave/forfeit confirmation and fatal/error emphasis only |
| Focus / informational | teal `#4b8b7a` | 3px focus ring, protected state, and non-fatal information only |

Accent is reserved for `Start Race`, the active lead/finish marker, validated
target confirmation, `Use Mud Splash`, `Use Fog Lantern`, ready recovery, and
rank badges. It never independently communicates health, fog exposure,
disconnect, protection, or cooldown: each also has plain text, marker/icon
shape, meter, or numeric duration.

## Race Setup and Roster Contract

Race setup is entered only through the explicit mode/setup flow; the solo start
remains its existing single-gesture route. Show `Race setup` on the ready scene
as one material board.

1. Offer two through four seats with a unique character picker and existing
   controller/shared-keyboard binding status. A character selected by `P{n}` is
   visibly unavailable for every other seat: `Already chosen by P{n}.`
2. Race has no order editor. Seat marker, `P{n}`, character preview/name, and
   bound device form the stable locked-roster identity. A later controller is
   reclaim-only; it is never shown as a join/new-character flow.
3. Configure labelled whole-number fields `Finish tiles` and `Race time`.
   Defaults are `500` and `180 seconds`. Bounded UI defaults accept finish
   integers `1–9999` and race seconds `30–3600`; show respectively `Choose
   1–9999 whole finish tiles.` and `Choose 30–3600 whole seconds.` The validated
   Race definition remains authoritative and captures accepted settings.
4. The advanced rules summary is visible before start: `Fog begins 12 tiles
   behind the lead and plucks 1 feather each second.` It is status copy, not a
   separate user-controllable rule in this phase.
5. Enable `Start Race` only when 2–4 bound seats have unique characters and
   accepted fields. Its accessible description says `Roster locks when the race
   starts.` On start, preserve the selected seats and show the captured finish
   and time in the live HUD. `Race roster is locked for this run.` explains any
   attempted late join.

Loading/rejected validation retains the last valid row and setting. Disable only
the dependent action and show `Checking P{n}'s controller…` or `P{n}'s
controller is unavailable. Reconnect it or remove this seat.` A valid existing
seat is never silently reassigned.

## One-Camera Race Scene and Live HUD

Use one leader-biased shared camera, never split screen. The scene carries a
visible fog ribbon at the actual monotonic boundary and a leader marker. The
camera may smooth its anchor but must not make fog look tied to the leader's
current position; the boundary never retreats when a racer backs up, dies,
disconnects, or finishes.

Every in-viewport racer keeps a marker + `P{n}` + character nameplate. A racer
outside the viewport has a persistent, scene-edge marker with arrow direction,
marker/P-number, character, signed distance to the leader/fog boundary, feather
health, and lifecycle. Edge markers sit inside the safe scene edge and do not
cover the persistent shelf or 44px controls. Ghosted/departed/eliminated racers
remain identifiable but visually subdued; their marker states the reason.

At regular/wide sizes, a 2×2 scene-edge HUD exposes every roster seat in this
reading order:

1. marker, `P{n}`, character, device/state (`RACING`, `FINISHED`, `DOWN`,
   `RECLAIM 12`, `DNF`, or `WAITING`);
2. feather meter plus numeric `3 / 3 feathers` form;
3. rank or `Leader` cue plus earned distance;
4. distinct `Power · {earned}/100 tiles` innate row;
5. distinct `Personal revive · {earned}/250 tiles` row;
6. item/cooldown state (`Mud Splash`, `Fog Lantern`, `No item`, or the exact
   active duration); and
7. fog state text (`Safe`, `Fog line`, or `Fog — {next damage}s`).

The shared top cue reads `Finish {distance} · {clock}` and, when useful,
`Lead {leader} · fog {boundary}`. `Power` and `Personal revive` always use each
seat's genuine earned forward movement. Forced safe placement, recovery,
reclaim, visible ground position, and shared leader frontier cannot advance
either row. Fog is based on actual settled position, while the leader cue uses
the monotonic earned frontier; the labels make that distinction comprehensible.

At compact/short sizes, the inspected/current racer keeps the complete tile;
every other seat is a 44px marker chip whose accessible label includes health,
lifecycle, rank, and whether it is in fog. Selecting a chip only changes
inspection; it never changes ownership, controller routing, target, or camera.

### Fog, health, recovery, and clock feedback

- A racer exactly on the fog line reads `Fog line · safe`. Behind it, show a
  brown-gray scene tint/ribbon plus `Fog — feather in {seconds}s`; an actual
  landed damage event flashes that racer’s feather meter and says `Fog plucked
  1 feather from P{n}.` Do not show instant-death language.
- `Fog Lantern · {seconds}s` adds a warm static halo at the owner and changes
  the fog row to `Lantern · fog safe`. It blocks fog only, never traffic/water/
  mobs. Its cue ends without a fake health or position change.
- A successful personal recovery shows `P{n} returned · protected {seconds}s`.
  Protection has a clear shield marker, freezes fog countdown, and locks pickup
  claims/Mud Splash with `Protected — items return when the shield clears.` It
  does not refill items or restore spilled cards, coins, powers, or cosmetics.
- Death uses the established per-seat spill/clear presentation. One racer’s
  death never dims or pauses a live competitor. If all racers have a valid
  pending recovery, show `Everyone is down — choose before the clock ends.`
  with the normal recovery actions and a live race clock. The world and active
  clock continue unless an explicit shared menu/focus/all-controller safety
  suspension freezes them; timeout closes those offers as `Race time ended.`
- `Last racer standing` is a status, not a shortcut: that racer may continue to
  finish or reach timeout normally. No all-dead/last-survivor view invents a
  shared co-op loss.

## Race Items, Owner Hand, and Market Contract

There is exactly one physical bottom shelf and one hand/market DOM tree. Every
open surface begins `Viewing P{n} · {character}` and has the same accessible
name. Its 44px owner marker strip permits only a valid current Race owner;
switching owner clears selected stock, item target, confirmation, return focus,
and held input before rendering the new owner. No duplicate wallet, item tree,
or invisible stale target is permitted.

Race begins with an empty card/power/pack hand. Do not render card offers,
packs, card slots, card sales, common `Revival`, common `Flare`, their pickup
art, targeter, success copy, or unavailable purchase buttons. Existing cards,
powers, packs, and the common consumables are Race-ineligible. Cosmetics remain
appearance-only: the wardrobe tab may show owned/worn voxel appearance previews
but never promises a gameplay effect. This policy is Race-only and must not
alter other modes' market content.

The Race market is its own purposeful `Race gear` page inside the existing
owner-labelled market board, beside an appearance-only `Wardrobe` tab. It shows
at most the two allowed stock rows and no empty fake card grid:

| Stock | Label / action | Required state |
|---|---|---|
| Offensive | `Mud Splash · 30` / `Buy Mud Splash` | Brown voxel splash, quantity, and `Target a racer within 16 tiles` once owned. |
| Defensive | `Fog Lantern · 30` / `Buy Fog Lantern` | Warm lantern voxel preview, quantity, and `Fog safe for 3 seconds` once owned. |
| Appearance | `Wardrobe` | Existing appearance-only cosmetics preview; worn status only. |

Purchases use the established owner wallet and authoritative eligibility service.
An unavailable owner, protected owner, insufficient wallet, full relevant item
capacity, stale selection, or changed world state leaves wallet, charge, target,
world, sound success event, and statistics unchanged. State the actionable
reason: `Mud Splash needs an active racer within 16 tiles.`, `P{n} is protected.`,
`Fog Lantern is already lit.`, or `Not enough coins.`

`Use Mud Splash` opens a material target page with only active, unprotected
opponents in the authoritative 16-visible-ground-tile range. Each target row
shows marker/P-number, character, direction/distance, health, and fog status.
`Use on P{n}` is a 44px confirmation action; commit revalidates then consumes one
charge. Success shows a short brown voxel splash at the target, its nameplate
`Mudded · 2s`, and owner text `Mud Splash hit P{n}.` It multiplies hop cooldown
only; it never depicts a shove, score loss, health hit, position move, boundary
change, or forced progress. If no valid target exists, the page reads `No racer
is in range.` and preserves the charge.

`Use Fog Lantern` is self-only. Its 44px `Light lantern` confirmation creates
the warm halo and `Fog Lantern · 3s` HUD state after authoritative commit. If
it cannot commit, it preserves the charge and uses the exact reason above. The
target-selection and effect status are independent from the per-seat 100/250
meters and innate power UI.

## Disconnect, Reclaim, Pause, and Terminal Contract

| Event | Visible state and action policy |
|---|---|
| One controller disconnects while others race | Its racer becomes a labelled non-colliding, non-claiming ghost: `P{n} disconnected · reclaim 12s`. The scene and active race clock continue. It is not death and creates no spill. |
| Original-seat replacement device | After fresh neutral input, show `Reclaim P{n}` / `Continue as {character}` / `Your race state is still here.` Reclaim only binds the reserved original seat, clears held input, and returns at the authoritative no-ahead safe position. It preserves health, item charges, earned distance, fog counter, clock, cooldowns, and any protection deadline exactly; no new shield, healing, charge, item, or progress animation appears. |
| Grace countdown | The compact HUD and reclaim board show `Reclaim {seconds}s`; it counts active race seconds only. Explicit shared menu and all-controller suspension visibly freeze it. At expiry show `P{n} forfeited.` and preserve their read-only result record. |
| All controllers unavailable | Freeze world, fog, active race clock, grace, recovery, and cooldown countdowns. Show `Waiting for a player to reclaim.` / `A reserved seat can resume this race.` No timeout or automatic result occurs while reclaim/recovery remains eligible. |
| Deliberate leave | Confirmation: `Leave Race as P{n}?` / `Your race record stays in the results. This is not a death.` Actions `Keep racing` then destructive `Leave Race`. The result receives DNF; no spill/refund/asset transfer presentation runs. |
| Finish/timeout | At terminal freeze, close item targets and recovery offers as prescribed, consume all stale input, retain the final scene, and open one immutable results board. Same-tick valid finishers display together before timeout; a fatal same-tick hazard is presented before any finish. |

An explicit pause/menu uses the established tinted in-game board, not a browser
overlay. It tells players whether the active race clock is frozen. The input that
opens setup, reclaim, menu, target, recovery, or result navigation is consumed
and cannot also move, buy, use an item, start a race, or change a target.

## Race Results and Podium Contract

At exactly one terminal transition, show `Race results` over the retained final
scene. The board is an immutable snapshot. Late input, old item targets,
reconnects, resize, owner changes, or reopening pages cannot mutate it.

| Element | Contract |
|---|---|
| Shared outcome | `Finish {tiles} · {elapsed}` plus `Race complete.`, `Race time ended.`, or the authoritative terminal reason. |
| Podium | Competition ranks; same-tick/equal-value ranks display as `=1`, `=1`, `3`. Equal racers occupy the same visual tier; roster/device/name never breaks a tie. |
| Finisher status | `Finished {time}` and earned distance. |
| Timeout status | earned distance and terminal active time; after finishers, equal distances share a rank. |
| DNF status | `DNF · Down`, `DNF · Forfeited`, or `DNF · Left`; DNF groups are not falsely numbered placements. |
| Participant breakdown | marker, P-number, character, lifecycle, rank/DNF, earned distance, finish/terminal time, deaths, personal revives, innate powers, fog attempted/landed feathers, Mud Splash collected/used/received, Fog Lantern collected/used, pickups, coins, and market interactions. |
| Primary CTA | `Race again` |

Use the frozen append-only ledger/result projection, never mutable avatars or
inventories after death/departure. Death-cleared live inventory still leaves its
pre-death pickup, coin, and item interactions in the breakdown. At small/short
frames page podium tiers and per-player breakdowns; do not scroll or omit
participants.

## Responsive Layout Contract

The game fills the iframe. Boards use the established tint and paper/wood frame.
No document, board, panel, HUD, market, hand, targeter, or results page may
scroll. Resize preserves selected setup page/values, locked roster, live owner,
target selection, recovery/reclaim state, result page, and safe return focus.

| Frame | Required presentation |
|---|---|
| 200×160 | Hide the scene and show exactly `Needs 240×240 to play — enlarge this pane.` Preserve all state, release gameplay input, and expose no control or scrollbar. |
| 240×240–319px | One named page only: `Setup`, `Race`, `Gear`, `Target`, `Recovery`, `Reclaim`, `Waiting`, or `Results`. Show marker strip plus 44px previous/next/back controls and one visible primary action. |
| 320×560 | One complete selected setup page, target list, recovery/reclaim state, market/wardrobe page, and one result breakdown page without overlap. Lists page rather than scroll. |
| 480–899px | Scene with full inspected racer tile, compact other markers, and a single-column material board. |
| 900×600 | One scene, 2×2 race HUD, edge cues, shallow shelf, and two-column board: roster/settings or podium left, focused action/details right. |
| 1000×280 | Short-page composition only: race clock, inspected/affected racer, one status, one primary action, and back/navigation. Hide voxel decoration and secondary totals before text or a 44px control. |
| 2400×1200 | Broaden scene and boards: all four HUD tiles, expansive offscreen-edge cues, and podium beside participant breakdown. Do not leave a narrow centered board or create a second dashboard. |

## Focus, Input, Motion, and Accessibility

- Every seat, character choice, finish/time field, owner chip, item action,
  target, recovery/reclaim/leave action, and page navigation control has a
  44×44px minimum hit target.
- Boards use `role="dialog"`, `aria-modal="true"`, an accessible heading, and a
  trapped logical tab/controller order. Opening setup focuses the first editable
  seat; a target board focuses the first valid target; recovery focuses its
  current safe action; reclaim focuses `Reclaim P{n}` only after fresh input;
  leave focuses `Keep racing`; close returns to the safe initiating control.
- Roster, target, and item choices use labelled radio/list semantics with
  `aria-selected`/`aria-disabled`. Health, countdowns, timers, distance, fog
  boundary/exposure, protection, and cooldowns expose text alternatives. Names,
  markers, and status strings remain DOM text even when canvas art is present.
- One polite live region announces joins, fog entry/damage, effects, recovery,
  expiry, reclaim, terminal result, and target failure. Fatal validation/terminal
  messages announce assertively once, never repeatedly during render.
- Respect the app reduced-motion setting and `prefers-reduced-motion`. Replace
  camera shake, moving fog, splash travel, halo pulse, board entrance, HUD flash,
  and podium bounce with fixed fog band, static effect mark, outline, text, and
  meter update. Audio is supplementary through the existing mute-aware game
  audio service; all browser proof launches mute device output while preserving
  audio graph execution.

## Copywriting Contract

| Element | Copy |
|---|---|
| Setup primary CTA | `Start Race` |
| Settings | `Finish tiles` / `500`; `Race time` / `180 seconds` |
| Settings validation | `Choose 1–9999 whole finish tiles.` / `Choose 30–3600 whole seconds.` |
| Duplicate character | `Already chosen by P{n}.` |
| Locked roster | `Race roster is locked for this run.` |
| Live cue | `Finish {distance} · {clock}` / `Lead {leader} · fog {boundary}` |
| Fog safe / exposed / damage | `Fog line · safe` / `Fog — feather in {seconds}s` / `Fog plucked 1 feather from P{n}.` |
| Recovery | `P{n} returned · protected {seconds}s` / `Everyone is down — choose before the clock ends.` |
| Gear | `Race gear` / `Buy Mud Splash` / `Buy Fog Lantern` / `Wardrobe` |
| Target empty / invalid | `No racer is in range.` / `Mud Splash needs an active racer within 16 tiles.` / `P{n} is protected.` |
| Effect actions | `Use Mud Splash` / `Use on P{n}` / `Light lantern` / `Mud Splash hit P{n}.` |
| Disconnect/reclaim | `P{n} disconnected · reclaim {seconds}s` / `Continue as {character}` / `Your race state is still here.` / `Reclaim P{n}` |
| Global suspension | `Waiting for a player to reclaim.` / `A reserved seat can resume this race.` |
| Leave | `Leave Race as P{n}?` / `Your race record stays in the results. This is not a death.` / `Keep racing` / `Leave Race` |
| Results | `Race results` / `Race complete.` / `Race time ended.` / `Race again` |
| Size notice | `Needs 240×240 to play — enlarge this pane.` |

Use `player`, `seat`, `traveler`, `controller`, `keyboard`, `race`, and the
character name. Avoid `host`, `lobby`, `room`, `online`, `syncing`, and generic
website terms such as `dashboard` or `submit`.

## UI Considerations

Applicable state considerations resolved: 29 covered, 7 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|---|---|---|---|
| empty | Race setup roster | ✅ covered | Start is disabled until two through four bound seats have unique characters and valid settings; setup explains the next action. |
| partial | Setup rows and validated fields | ✅ covered | Retain valid rows/settings; only the stale/unavailable dependent action disables with exact recovery copy. |
| loading | Controller/reclaim validation | ✅ covered | Keep stable seat identity and `Checking P{n}'s controller…`; disable only the pending action. |
| error | Setup / target / purchase commit | ✅ covered | Inline exact error preserves accepted settings, wallet, target, charge, world, and focus; no speculative effect occurs. |
| populated | Four-seat race HUD | ✅ covered | Every seat has prescribed identity, health, rank/distance, distinct 100/250 rows, item state, and fog/lifecycle state. |
| partial | Race lifecycle | ✅ covered | Active, finished, down, recovery-offered, disconnected-grace, forfeited, departed, protected, and waiting are distinct labelled states. |
| zero-one-many | Valid Mud Splash targets | ✅ covered | Zero gives `No racer is in range.`; each valid target retains identity/range/status; target pages never contain inactive/protected/out-of-range racers. |
| overflow | Setup / target / results collections | 🧪 backstop | Required frames page bounded rows with no document, board, HUD, hand, or result scrollbar. |
| long-text | Character/device/error labels | ✅ covered | Preserve marker/P-number, ellipsize identity tail, wrap board prose to two lines, and retain 44px actions. |
| populated | Fog/edge cues | ✅ covered | Fog ribbon, boundary/leader cues, edge marker direction, numeric health, lifecycle, and text make offscreen racers readable in one camera. |
| partial | Fog/protection timing | ✅ covered | Exact line-safe, exposure countdown, landed damage, lantern, recovery protection, and inactive/ghost states never use color alone. |
| error | Stale/ineligible item target | ✅ covered | Failed revalidation changes no charge, world, target, sound-success event, or result statistics and reports a direct reason. |
| empty | Race cards/common consumables | ✅ covered | No card/power/pack/common Revival/common Flare stock, pickup, targeter, capacity, or unavailable purchase surface appears. |
| populated | Race gear/wardrobe | ✅ covered | One owner-labelled tree shows only Mud Splash, Fog Lantern, and appearance-only wardrobe state. |
| partial | Owner switch | ✅ covered | New owner clears stale offer/target/confirmation/focus/held input before render and never reroutes controller ownership. |
| loading | Item/recovery resolution | ✅ covered | Retain owner/state and show pending compact state; disable only the committing action, never fabricate an effect. |
| error | Recovery / terminal ordering | ✅ covered | Fatal same-tick hazard presents before finish; timeout closes recovery with `Race time ended.` and freezes one result. |
| zero-one-many | Live racers and survivors | ✅ covered | One survivor continues; all-dead valid recovery uses normal offer; all unavailable controllers use waiting-for-reclaim; no false shared-loss state. |
| overflow | Compact/short scene HUD | 🧪 backstop | Compact shows one full tile plus marker chips; short shows one status/action/navigation without covering shelf or controls. |
| long-text | Fog/reclaim/result status | ✅ covered | State wraps before timer/rank/meter and 44px action clip; result data pages rather than truncates fields. |
| populated | Podium/result breakdown | ✅ covered | Frozen result contains every locked seat’s prescribed rank/DNF, lifecycle, distance/time, fog, item, and interaction statistics. |
| zero-one-many | True rank ties | ✅ covered | Equal same-tick/equal-distance racers share one `=rank` tier; subsequent competition rank skips positions; DNF stays unranked. |
| overflow | Podium/breakdown | 🧪 backstop | Small/short frames page rank tiers and participants; wide places podium beside data with no narrow column. |
| error | Disconnect/grace/reclaim | ✅ covered | Reclaim preserves state exactly, grace is active-clock-only, expiry records DNF, and late/new input cannot join or reset state. |
| empty | Result screen actionability | ✅ covered | Terminal board always has read-only outcome plus `Race again`; no old target/item/recovery action remains usable. |
| overflow | Theme/reduced-motion proof | 🧪 backstop | Every required frame/theme/motion combination is visually inspected with muted browser playback and no clipping/scrollbar. |

## Dependency Reconciliation Before Implementation

Phase 1–3 source APIs may differ from planning names. Before product work,
reconcile completed source/summary exports and map the contract to those seams.
Stop before UI product edits if a required shared seam is absent.

| Dependency | Required reconciliation |
|---|---|
| Shared session / seat router | Confirm frozen seat IDs, unique character lock, lifecycle states, fresh-input consumption, replacement-device reclaim, capacity, and scene-focus hooks. |
| Shared world / renderer | Confirm one world tick, leader-biased camera/edge cues, scene fog boundary, character markers, and static reduced-motion hooks. |
| Recovery / personal progress | Use actual per-seat 100/250 meters, spill/clear death transaction, protection, safe placement, and timeout close semantics. Never derive them from shared frontier. |
| Race item eligibility/transaction | Confirm owner inventory, capacity, item target observation, plan/revalidate/commit, cooldown/effect events, and Race-only filtering. |
| Owner hand / market | Extend the accepted one-tree owner invalidation path; confirm target/offer/confirmation/focus/latch clearing. |
| Result service | Read immutable ranked records/ledger; never derive podium detail from mutable seats after death/departure. |
| Renderer/audio | Use existing material, modal, mute, and audio graph paths only; no host DOM, browser-native device access, network, or direct storage. |

## Visual Verification Matrix

Use the real built napplet in an opaque `allow-scripts` iframe. Every browser
launch mutes device output while exercising the application audio graph. Inspect
both runtime themes and reduced-motion state at every listed frame; verify resize
preserves the documented state and no surface gains a scrollbar.

| Frame / condition | Required assertions |
|---|---|
| 200×160 | Exact size notice only; scene hidden; locked roster, target, recovery, reclaim, and result state survive resize; no control or scrollbar. |
| 240×240 | Setup/settings, locked roster, race, gear, target, recovery, reclaim, waiting, and result each show one named page, one primary action, and 44px navigation. |
| 320×560 | Configure unique characters/default 500/180, show fog safe/exposure/damage, personal 100/250 rows, Race gear/wardrobe, target validity/error, recovery, disconnect grace/reclaim, and paged results. |
| 900×600 | One scene, 2×2 racer HUD, leader camera/fog ribbon, in/out-of-view edge cues, shelf owner label, gear, target effect, and podium remain readable/non-overlapping. |
| 1000×280 | Clock, affected/inspected racer, one status, primary action, and back/navigation remain reachable; decoration/secondary totals yield first. |
| 2400×1200 | Broad scene uses all four HUD tiles, edge cues, podium, and participant breakdown without a centered narrow board or second dashboard. |
| Fog / finish priority | Prove the monotonic fog visual survives leader retreat/death/disconnect/finish; exact-line safety, exposure cadence, protection/lantern, same-tick finish ties, fatal-before-finish, and finish-before-timeout are legible. |
| Items | Prove only Race gear appears; Mud Splash valid/invalid/stale target paths and Fog Lantern state cause the documented visual/audio cues without an unwanted move, health, boundary, or wallet/charge mutation. |
| Lifecycle | Prove one ghost does not pause others; 12 active-second grace freezes under menu/all-controller suspension; original-seat replacement reclaim preserves state without new protection; last survivor continues; all-dead recovery clock and timeout are clear. |
| Results | Verify immutable competition ranks/ties, DNF groups, and complete per-character breakdown after death, timeout, departure, forfeit, and recovery. |
| Themes / motion / mute | Full runtime theme repaint, visible teal focus, static reduced-motion fog/effects/boards, muted browser launch, and no comprehension dependent on sound. |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|---|---|---|
| shadcn official | none | not applicable — no `components.json`, React, or shadcn dependency |
| third-party | none | not applicable — no registry block is allowed into this phase |

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending independent `gsd-ui-checker` review.
