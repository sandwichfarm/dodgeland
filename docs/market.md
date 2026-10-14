# Run market and powers

Every new 100-point milestone opens a 15-second invitation, measured in active
play time. M, controller LB, or the market button opens it. Shopping freezes the
run, including the pursuing wave, hazards, power timers and invitation. Closing
resumes only when focus, visibility and frame size allow it. Reopening retains
the same stock and purchase history; backtracking cannot repeat a milestone.

Coins earned during the current run form the market wallet. Purchases, unspent
wallet, cards, powers and cosmetics disappear on death. Lifetime coin records,
traveler unlocks, best scores and preferences remain. No run inventory is saved.

Stock is seeded: three random cards across the top, two random cosmetics at
bottom right, and a 35% chance of one rare-or-better item or card pack at bottom
left. Each offer is unique within a stop; owned cosmetics stay out of later
stock, including the special find. If fewer than two unowned cosmetics remain,
their reserved displays stay empty instead of substituting cards or packs.
A catalog containing only special finds can still offer one item. Market stock
uses the supplied current item catalog; this layout change does not alter the
versioned course generators. Offers are bought once. Prices are four times
the original economy. A Small Pack costs
16 coins: reveal three different cards and choose one. A Large Pack costs 24
coins: reveal five different cards and normally choose one. Each Large Pack has
a seeded 20% chance to be a bonus pack that lets the player choose two.

Buying a pack pays once and reveals a hand of choices; it does not equip every
revealed card. A full hand does not prevent opening either pack. Select exactly
the displayed quota; if those cards do not fit, **Make room** shows the owned
cards that can be discarded. Mark cards to leave behind, check the projected
count and capacity, and confirm **Swap cards**. Slot-changing cards affect that
projection immediately, but neither the old hand nor its effects change until
a valid confirmation. Returning to the choices retains discard marks. Unselected
cards are discarded without applying their effects. The cards sit in a voxel
market scene, with hover, focus and selection feedback. Claimed cards auto-apply
and appear in the persistent bottom hand; powers show remaining active time, and cosmetics decorate the traveler without changing
collision geometry. Duplicate cards stack within documented effect bounds.

A pending pack must be resolved before returning to play or buying another item.
Selling from the persistent hand remains available without leaving the draft.
Focus loss, a hidden or undersized frame, or another forced
closure preserves the same cards, bonus result, chosen cards and discard marks.
The game, invitation and power clocks stay paused; reopening restores the paid pack.
Confirming the choices or explicitly skipping the pack releases this pause.
**Skip pack** is available during selection and replacement: it keeps no new
cards, preserves every old card, and refunds no coins. Death clears the pending
pack with the rest of the run inventory, before notifying result observers.

The Market has six fixed display slots: three cards above, one special find
below left, and two cosmetics below right. Purchased offers remain marked as
owned in their original positions; missing stock has an empty display instead
of shifting other items. Market and Wardrobe are the two main tabs.
Owned cards stay in the shared bottom hand, and timed powers retain their HUD
countdown. Owned cosmetics go into Wardrobe beside the current traveler.
Selecting an item opens Inspect with its full description
and a large context action: buy, sell, wear or select. The overview shows the
item's name, artwork and price or ownership state; detailed reading has its own
screen. Pack choices use a dedicated Draft screen and retain their selections
while paging or inspecting. Returning from Inspect restores the previous view.
Buying or equipping a cosmetic opens and focuses its Wardrobe entry; card
purchases and claims return to the Market with the acquired cards in the hand.
Empty clothing slots remain labeled,
and cosmetic ownership cannot fill or suppress the empty-hand state.
Hats, shirts and visual effects equip independently;
buying a look equips its slot, and Wear switches back to an owned look for free.
Cosmetics use standalone shaded voxel displays on small stands, without card
faces or ranks. Hovering or focusing a display turns its actual model in three
dimensions; leaving returns it to a front view. Hats use their authored geometry,
and shirts use a garment form with their real stripes and pockets. A
traveler preview in Wardrobe shows the selected character and all equipped
looks, updating immediately after purchase or switching. It rotates on hover or
focus too. Reduced motion keeps previews still; closed, hidden or offscreen
previews stop rendering, and replaced previews release their observers and
animation frames. Inspect and Draft give that space to the selected item or cards.
Cards can be sold individually anywhere during a live run; removal recomputes
effects without leaving the current menu, offer inspection or pack draft.
The hand and HUD show the current count and capacity. The default maximum is
three cards; cosmetics and timed powers do not consume those slots. Extra Pocket
adds two slots while occupying one, and Travel Light trades one slot for +25%
coin earnings. Card effects can change capacity between one and six. Direct card
purchases, pack claims and sales evaluate the resulting hand before changing coins or cards;
a sale cannot silently discard cards when capacity shrinks.
There is no card fusion or permanent potency upgrade.

Each 100-point stop has a visible market district, from four rows before its
milestone through eleven rows after. Some meadow obstacles and roadside props
become market stands: small cloth-covered produce counters, medium carts, and
tall striped canopy stalls. Size comes from the replaced asset's dimensions;
colors and goods vary deterministically with the course seed and position.
The stands keep the original scenery bounds and blocked cells. They remain
part of the landscape as the player approaches and leaves, while the normal
market invitation controls when shopping is available.

Opening moves into an opaque market clearing that completely obscures play.
The scene shares the game's voxel renderer: striped awning overhead, wooden
trading counter below, quiet paving, and stalls and crates along the sides.
Small frames omit the side props to leave room for the merchandise. Theme colors
paint the entire scene; it repaints on size and palette changes without an idle
animation loop. Closing keeps the game paused until the exit finishes; forced
lifecycle closure is immediate and never resumes play. Both motion preferences
disable transitions.
Selected pack cards enlarge to 120% over 220ms. A gold starburst rotates slowly
behind each selected card at 14% opacity; the card face stays opaque for clear
text. Choice spacing accommodates two bonus picks. Reduced motion preserves
the enlarged selection and a static starburst without the transition or spin.

The market fits the available frame with no scrollbars. Controls have a minimum
44px touch target. Every supported frame shows the whole 3×2 Market board;
there are no shop category buttons or stock pages. Smaller displays condense
the artwork while keeping item names and prices accessible. Inspection gives
each item room for its full description and purchase action, with text pages
at the shortest sizes. Wardrobe and pack choices can page their larger
collections independently. Resize preserves inspection and draft choices.
Below the existing 240×240 minimum the size notice replaces
the interface while preserving the run and pending purchases.

Every traveler starts with a small coin attraction field: 0.1 gravity adds to
its half-tile reach, giving a 0.6-tile capture radius without cards. River drift
keeps the traveler's fractional horizontal position, and later hops retain that
personal grid. On a coin's row, the closest position on any such grid is at most
half a tile from the coin, so the default pull covers every offset without
snapping the traveler to the world's grid. An adjacent row or column at a full
tile remains outside the default field.

Pocket Magnet adds 0.75 tiles to that field. Attracted coins visibly accelerate
toward the traveler and pay only on safe arrival; entering the field alone does
not award coins. Hopping can carry an already attracted coin along, but cannot
pay it in midair or after a lethal landing. Pause freezes coin motion. Selling
the last magnet or expiring a gravity power restores the small default field;
already captured coins keep moving. Explicit zero-gravity effects still require
physical contact, and stop captured coins at their current positions for manual
collection. Manual contact counts during land hops; river pickups require a
supported body or safe landing.
Captured coins stay alive independently of their original map row. Rewards that
the duck outruns are retired only after their actual position leaves the trail,
keeping long Stroll runs bounded without making visible coins disappear.

## Death spill

A fatal encounter snapshots the remaining run wallet and **all owned cosmetics**,
including unequipped looks, before clearing the live inventory. Coins and voxel
items scatter around the traveler, bounce twice with diminishing height, then
roll or slide to rest. The spill is visual only: it cannot be collected or sold,
and does not change lifetime records or the seeded course. A successful
character rescue or active shield prevents death and produces no spill.

Up to 192 coins render individually. Larger wallets use at most 192 grouped
coin drops whose values sum to the exact lost wallet; no coins are truncated.
Each owned cosmetic gets its own drop. A private deterministic random stream
keeps these trajectories independent of level, market and audio randomness.

For a nonempty spill, results, Copy seed and retry wait 1.1 seconds while the
belongings fall. Gameplay remains dead and frozen during this reveal. Either
Less motion setting skips that wait and shows the settled belongings immediately;
an empty wallet with no cosmetics also skips the delay. Retrying creates an
empty run with no leftover spill or inventory.

## Pause board

Pause uses a wooden board with large resume and traveler controls over a dimmed
world. At least 900×600 shows the road rules and current character power together.
Smaller frames offer **Rules** and **Power** as separate reading screens, with
explicit page controls when the text does not fit. Pages recalculate after resize
or font loading; the minimum 240×240 frame stays usable without scrollbars or
controls smaller than 44px. The bundled Lilita One font and its license ship
inside the artifact.

Tab and direction controls navigate the visible buttons; Enter or controller
confirm activates the focused one. Back leaves a reading screen before resuming
from the pause home screen. A paused, unresolved pack returns to its saved
choices or replacement marks through **Choose cards**, so the world cannot
resume while the draft remains unresolved. Reduced motion removes the board's
entrance animation.

## Module contract

Item modules live under `src/market/items/` and export one definition containing
identity, label, description, rarity, price, appearance and behavior. Vite eagerly
discovers them at build time into the single file. Pure runtime code accepts a
catalog argument, so tests can supply one module without a registry edit, browser,
configuration file or network. New cards use a small typed modifier reducer or
score hook; powers use the same reducer with a duration. Packs define draw rules;
cosmetics define visual tokens or voxel models. Their market previews reuse the
world renderer and the same outfit composition, with no external models or
additional graphics dependencies. The engine consumes shared modifier hooks at
generation, pickup, movement, damage, healing, wave and mob boundaries. There
are no item-ID switches in the engine or UI.

Structural lane changes affect newly generated rows. Active speed changes rebase
lane phases so the rendered vehicles/platforms, collision and sound remain at
the same positions. Effect reductions are rebuilt from owned modules, rather
than repeatedly multiplying mutable world state.

### Add a card

Create one file, for example `src/market/items/spare-change.ts`:

```ts
import type { CardDefinition } from '../types';

export default {
  id: 'spare-change', kind: 'card', name: 'Spare Change',
  description: 'Earn one coin for every new 40 points.',
  rarity: 'common', price: 12, icon: '¢', color: '#e4c36d',
  scoreCoins({ previous, score }, potency) {
    return (Math.floor(score / 40) - Math.floor(previous / 40)) * potency;
  },
} satisfies CardDefinition;
```

Run `pnpm test:market` and `pnpm type-check`, then rebuild. The sorted file glob
discovers the definition; stock, pack pools, rarity labels, HUD and sales
use its metadata automatically. Generic catalog tests exercise every discovered
module without an expected-count registration list. A regression copies the
catalog into a temporary directory, adds a new file, discovers it, and tests its
behavior both alone and alongside the existing catalog.

Use `modify(modifiers, potency)` to compose existing hooks. Additive bonuses use
`m.coinRadius += amount * potency`; proportional reductions use
`m.trafficSpeed *= Math.pow(factor, potency)`. Hooks must be pure, deterministic,
and synchronous. They must not mutate the game or award coins directly. Score
hooks return raw income for newly crossed thresholds; the engine applies the
multiplier once and carries fractional credit until a whole coin is earned.
Set `modes: ['arcade']` on features that need waves or mobs; their cards then
stay out of Stroll stock and packs.

For an isolated test, import the default definition and pass `[definition]` to
`new RunInventory(seed, definitions)`. `reduceItems(new Map([[item.id, item]]),
[{ itemId: item.id, potency: 1 }])` tests a modifier directly without a browser.
The shared test loader in `tests/source-loader.mjs` transpiles these TypeScript
modules for Node; it also models eager catalog discovery.

Powers use the same `modify`/`scoreCoins` hooks with `kind: 'power'` and a positive
`duration` in active seconds. Buying an existing power refreshes its duration.
Packs use `kind: 'pack'`, `draws` (cards revealed), `picks` (cards kept), optional
`bonus: { chance, picks }`, and optional `minimumRarity`. For example:

```ts
import type { PackDefinition } from '../types';

export default {
  id: 'pack-satchel', kind: 'pack', name: 'Large Pack',
  description: 'Reveal 5 different cards. Choose 1; a 20% bonus chance lets you choose 2.',
  rarity: 'uncommon', price: 24, icon: '▣', color: '#93cedd',
  draws: 5, picks: 1, bonus: { chance: .2, picks: 2 },
} satisfies PackDefinition;
```

The base quota must be an integer from 1 through `draws`; the bonus quota must
be larger than the base quota and no larger than `draws`. Bonus chance must be
finite and between 0 and 1. The candidate pool must contain at least `draws`
different eligible definitions. Either pack opens even with a full hand. The
candidate pool and seeded bonus do not depend on current hand capacity, so
slot-reducing cards remain eligible. Failed affordability, stock, or pool
validation consumes no coins, stock, instance IDs or random outcomes.
Capacity is resolved after choosing which cards to keep; the player may leave
owned cards behind or skip the paid pack entirely.

`run.pendingPack` holds `{ id, packId, name, choices, picks, bonus }`. Candidates
are ordinary `HeldCard` values but are not owned and cannot affect the run.
`run.previewPack(ids, discardIds = [])` reports the projected hand count,
capacity and validity without changing state. `run.claimPack(ids, discardIds = [])`
validates exactly `picks` distinct current choices and distinct owned discard
IDs, then computes capacity from the retained and new cards together. A valid
claim removes the marked cards without a sale payment, equips the choices
atomically and clears the draft. Repeated, stale or overflowing claims leave
all state unchanged. Buying a pack equips no cards; `run.skipPack()` clears its
paid draft without refunding coins, changing the hand, or rerolling the draw.
Tests can inject a pack and its candidate definitions independently.

Cosmetics use `kind: 'cosmetic'`. Visual effects use
`appearance: { color, style }` with `halo`, `sparkles`, or `trail`. Wearables use
`style: 'hat' | 'shirt'` plus a normalized voxel `model`. `src/wearables.ts` fits
these models to each traveler and the renderer composes them with the body before
depth sorting, turning and hopping. `run.equippedCosmetics` exposes one look per
head, shirt and effect slot; `run.equipCosmetic(id)` switches an owned look for
free during an active market. Wardrobe changes affect no collision geometry or
modifiers. These supported behaviors need only one file. A completely new capability or visual style needs
one explicit shared adapter hook in the types/engine/renderer, rather than an
item-specific conditional. The contract does not execute downloaded modules.

### Initial card catalog

| Card | Effect at base potency | Rarity | Buy coins |
| --- | --- | --- | ---: |
| Pocket Magnet | +0.75 tile pickup radius | Common | 12 |
| Compound Interest | +12.5% earned coins, fractional carry | Uncommon | 16 |
| Mile Money | 1 coin per new 25 points | Rare | 24 |
| Road Toll | +1 coin for pickups while on roads | Common | 12 |
| River Gold | +1 stream pickup; coins on new platforms | Uncommon | 16 |
| School Zone | 12% slower traffic | Common | 12 |
| Wide Gaps | 12% larger gaps on new roads | Uncommon | 16 |
| Gentle Current | 15% slower platforms | Common | 12 |
| Longboats | 20% longer new platforms | Uncommon | 16 |
| Late Train | 15% longer periods on new rails | Rare | 24 |
| Early Bell | 0.4-second earlier warnings on new rails | Common | 12 |
| Tail Cushion | 25% less rear-impact damage | Uncommon | 16 |
| Side Padding | 20% less side-impact damage | Rare | 24 |
| Second Wind | 30% longer protection after damage | Uncommon | 16 |
| Fresh Feathers | Extra quarter feather per new 100 points | Epic | 36 |
| Low Tide | 12% slower pursuing wave | Legendary | 48 |
| Breathing Room | Wave can trail one extra row | Epic | 36 |
| Heavy Paws | 14% slower mobs | Uncommon | 16 |
| Read the Pounce | 25% longer crab/wasp strike preparation | Rare | 24 |
| Sleepy Hunters | 30% longer crab/wasp strike recovery | Common | 12 |
| Quiet Footsteps | 1.5 seconds more between mob arrivals | Rare | 24 |
| Lucky Lanes | +8 percentage points coin chance on new lanes | Epic | 36 |
| Garden Path | Remove 15% of blockers on new meadows | Common | 12 |
| Extra Pocket | +2 hand slots; occupies one | Rare | 24 |
| Travel Light | −1 hand slot; +25% earned coins | Rare | 24 |

Ordinary cards sell for half their price, rounded down. Packs draw with rarity
weights Common 50, Uncommon 28, Rare 14, Epic 6, Legendary 2, sampling without
replacement inside each pack. Thus every revealed choice is different, while
cards from separate packs or direct purchases can still stack. The built-in
catalog has Small Pack (3 choose 1, 16 coins) and Large Pack (5 choose 1,
20% chance of choose 2, 24 coins); their stable module IDs remain `pack-pocket`
and `pack-satchel`. Hands normally hold three cards. Both packs open at full
capacity. After selecting cards, Make room lets the player mark owned cards to
leave behind, with projected count and capacity including all slot modifiers.
The player can return to the original choices or skip without keeping cards.

Bubble Wrap grants eight seconds of hazard protection for 20 coins; Stoplight
freezes traffic and mobs for ten seconds for 20; Gold Rush adds 1.25 tiles of attraction
and 50% earnings for eight seconds for 16. All three powers are rare finds.
Golden Halo, Stardust and Rainbow Wake each cost 8. Straw Boater and Pond Cap
cost 12, Berry Beanie costs 16; Sailor Shirt costs 12 and Trail Vest costs 16. Owned cosmetics are omitted from later offers. Shields do not
retain car-contact immunity after expiry. River rewards stay attached to visible
platform geometry and reappear only from outside the rendered field if missed;
each lane's reward can still be collected only once.

### Shared bounds

The reducer clamps final effects: attraction radius +1.25 tiles, total coin
multiplier 2×, terrain bonuses +1, traffic spacing 1.6×, platform length 1.5×,
train period 3× and warning +3 seconds. Damage multipliers bottom out at .5;
recovery after a hit caps at 1.75×, additional regeneration at half a feather,
wave speed at .75× and extra wave trail at two rows. Card-only traffic and mob
speed stay at least .65×; the temporary freeze power can still stop them.
Mob preparation/recovery cap at 3×, current speed at .25×, extra spawn spacing at
12 seconds, coin probability bonus at 60 percentage points and scenery removal
at 85%. Ordinary single-card values are unchanged; these limits constrain stacks.
Existing generated lane geometry remains in place after selling structural
cards; the lookahead is 28 rows, so their changes appear as new rows are generated.

## Napplet design contract

title: Down to Duck
nappletType: puddlehop (stable deployment identity)
purpose: Add run-scoped market choices to the existing crossing game.
NAPs used: existing optional keys, gamepad adapter, theme and storage for records.
requires: none
fallbacks: on-screen market and inventory controls; existing palette; session records.
data flow: local seeded offers and run inventory; lifetime progress uses existing storage.
relay escape hatches: none
config schema: none
interop: none
density: game-scale merchandise and controls, minimum 44px targets; deliberate
override of the applet's compact tool defaults. Full descriptions use Inspect.
screens: Shop, Hand, Looks, Inspect and Draft/Make room; no scrolling regions.
tiers: tiny=existing minimum notice; smaller frames=one item per page;
at least 760×500=three items per page; at least 1100×780=full grouped Shop;
short-height below 330px=all stock paged together without category controls.
minimum size: existing 240×240; preserve state below it.
theme: existing whole-surface background/text/primary tokens; dark and light.
states: invitation, closed, open, insufficient funds, sold out, pack reveal/selection/replacement/claim/skip,
empty inventory, opening/closing, expired, death/reset.

## Acceptance evidence required

- 100/200 cadence, expiry, frozen clocks, no backtracking reroll.
- Atomic purchases, affordability, randomized reproducible stock and packs.
- Either pack size may be offered; Small reveals 3/keeps 1; Large reveals 5/keeps 1,
  with a seeded 20% bonus that keeps exactly 2.
- Unique weighted candidates, exact-quota selection, no unselected effects,
  no duplicate/stale claims, no reroll on forced closure, full-hand opening,
  atomic card replacement including slot modifiers, and skipping without refunds.
- Pending packs freeze movement and clocks until selection is confirmed or skipped;
  death clears pending choices before result observers.
- 25 functioning card modules; powers, three effect looks, three hats and two shirts.
- Fractional coin credit and score income without repeat farming.
- Automatic hand/HUD transfer, bounded stacking and reversible selling; no fusion.
- Death clears all run assets; retry begins empty and lifetime records remain.
- Independent single-module test and drop-in discovery without central edits.
- Actual built-artifact M/LB/button flows, pause/focus/lifecycle guards.
- Four required frames plus minimum/short frames in light and dark.
- No market scrollbars; reachable controls of at least 44px, complete descriptions
  in Inspect, and selection retained across pages, inspection and live resizing.
- Existing gameplay, audio, controller and napplet verification remains green.
