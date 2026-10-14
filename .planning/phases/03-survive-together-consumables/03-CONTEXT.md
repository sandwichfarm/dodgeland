# Phase 3: Survive Together & Consumables — Context

**Mode:** Autonomous implementation authorized through all modes, verification, and PR.
**Dependency:** Phase 2 shared session and Phase 1 exact solo parity must be verified first.

## Requested outcome

Friends can drop into or leave a running shared Arcade or Flow course, retain
distinct characters, and recover through personal revival or rare cooperative
items. Flow uses the current stored `stroll` rules as the working interpretation.
Solo remains a one-gesture experience and keeps its established behavior.

## Locked requirements

- A shared session advances terrain, actors, clocks, and pickup claims once per
  tick. Each player owns movement, health, inventory, powers, and statistics.
- Each roster slot has a unique character. A new join consumes its triggering
  input and cannot also move, confirm a purchase, or activate an item.
- Survive Together allows live drop-in and dropout on either base ruleset.
  Existing players, course, clocks, scores, seed, and purchases cannot reset.
- Controller loss is a mode-owned event. A disconnected ghost cannot collide,
  take damage, advance progress, or claim items. It retains its slot and inventory.
  Reclaim and deliberate departure are distinct from death and new-player join.
- The existing automatic character hazard power remains separate from the new
  personal revival charge. Each player holds at most one personal revival;
  recharge requires 250 new tiles and cannot be farmed by backtracking or rejoin.
- Revival is a consumable that restores another eligible player. Its world
  probability is 1:2500. Flare restores dead teammates and brings everybody to
  the user's safe position. Its world probability is 1:1250.
- Consumables form their own item class with validated eligibility, targeting,
  charges, activation, deterministic world drops, and market purchases.
- World consumables use baseline collection gravity, including fractional
  positions after log hops. Coin magnet cards and powers must not increase it.
- Seeded drop generation must not perturb released terrain or coin RNG streams;
  its schema/version identity must make repeated generation reproducible.
- Contested pickups resolve exactly once deterministically. Failed or invalid
  item activation spends nothing and does not partially mutate players.
- Returns use safe placement and temporary protection; no return inside a
  hazard or immediate death loop. Preserve current player identity and statistics.
- Keep the prior user-authorized death economy: death spills that player's coins
  and cosmetics and clears their run inventory. Reviving does not restore lost
  purchases; teammates' inventories are untouched. A disconnect is not a death.
- Show the inventory/market owner clearly and keep one persistent hand/menu tree.
  Selling works without leaving the current menu, as in the existing solo UI.
- A team run ends when no active player or pending valid recovery remains. A
  disconnected ghost or unused charge without a pending offer cannot hold it open.
- Co-op results report a shared outcome and per-character contributions. Use a
  team podium rather than inventing competitive first/last places.

## Implementation choices to validate

Research proposes monotonic shared-frontier measurement for revival recharge,
a bounded manual self-revive offer, and safe return no farther ahead than the
living group. These are implementation assumptions, not additional user answers.
Represent durations, protection, capacity, prices, and target policy as validated
rules; choose readable defaults during the phase and test boundary transitions.

## Evidence

Read the verbatim `.planning/USER-REQUEST.md`, requirement IDs COOP-01 through
COOP-05, ITEM-01 through ITEM-05 and UI-03, the completed Phase 1/2 summaries,
`.planning/research/MODE-DESIGN.md`, and the Phase 2 UI contract.

Required tests exercise real production state, including all-dead offer expiry,
revival thresholds, no rejoin farming, safe placement, mode eligibility, exact
drop thresholds, RNG isolation, contested claims, log-hop pickup offsets, owner
routing, and one player's death clearing only their own inventory. Browser and
visual proof must use muted playback, large game-styled controls, no scrollbars,
and compact views across both themes.
