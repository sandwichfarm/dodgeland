# Multiplayer Mode Design

**Project:** Down to Duck multiplayer milestone
**Researched:** 2026-10-14  
**Scope:** Rules, state transitions, balance defaults, and validation for local multiplayer modes.  
**Confidence:** MEDIUM — requested mechanics and established project contracts are authoritative; the numeric defaults below are explicitly marked as proposed tuning, pending playtests and the user's open choices.

## Decisions That Must Stay Provisional

The following are explicit planning defaults, not settled product decisions. They allow the architecture and test plan to be shaped now without hiding the choices that need confirmation.

| Decision | Proposed default | Why this is the best starting point | User decision still needed |
|---|---|---|---|
| Entry flow | In every relevant active Arcade and Stroll state, listen to all exposed controller input. Input from a second unassigned gamepad opens multiplayer setup; it never silently changes a live solo run. | Covers local-play entry for both base modes while making join intent visible. `Flow` remains the provisional Stroll alias used for co-op rules. | Confirm only the final UI label for `Flow` / `Stroll`; entry coverage is not mode-restricted. |
| Simultaneous roster | Four players maximum. | Four distinct characters, readable shared-screen action, and one keyboard profile are practical baseline constraints. The mode registry must make this a mode setting so seven can be evaluated later. | Choose four or seven as the shipped cap. |
| Race objective | Reach 500 forward tiles; 180 seconds is a hard end condition. | A distance finish creates an actual race; the timer prevents an indefinitely stalled run. | Confirm `500 tiles + 180 s` versus a purely 180-second distance contest. |
| Race fog buffer | Fog begins 12 tiles behind the advancing race frontier; it removes one feather every 1.0 s of continuous exposure. | Gives the leader a meaningful advantage without a one-row instant kill. **Inferred tuning.** | Tune from playtest telemetry. |
| Rejoin affordance | A lost player retains their player and character identity for the full mode-specific rejoin window; pressing a newly attached controller explicitly claims that slot. | Avoids duplicate characters and accidental reassignment after device churn. | No product choice needed unless anonymous hot-seat identity is desired. |

## Shared Rule Language

### Separate player, controller, and character identities

A **player slot** is the durable local participant record. A **controller binding** is replaceable input hardware. A **character** is the selected unique visual/gameplay identity. Never use a controller ID as a player identity or as the source of a character choice.

At multiplayer setup, the first input from a free device creates or claims a slot and proposes the next unused character. The player confirms that character or chooses another unused one. A duplicate selection is rejected before a run starts. If every character or player seat is occupied, the input gets a concise “game full” response. Keyboard bindings form one explicitly configured device profile; they do not impersonate several gamepads.

Each slot has an explicit lifecycle:

```text
unclaimed → selecting → ready → active ⇄ device-lost
                                      ├→ ghost (Survive Together only)
                                      ├→ eliminated
                                      └→ finished (Race)
```

`device-lost` is an input condition, not a death. The mode decides whether to pause, ghost, skip, or eliminate the slot. The slot retains its character, run statistics, owned consumables, and revival state until its mode's result is final.

### Resources and saves are deliberately separate

| Resource | Owner | Trigger | Default rule | Must not become |
|---|---|---|---|---|
| Innate character hazard save | Existing character system | Its existing 100-tile cadence | Preserve exactly as it works today. It remains independent of multiplayer rules. | A multiplayer life or item charge. |
| Self-revive charge | Individual player | Player death | Each player holds at most one charge. A used charge becomes available again only after the shared run frontier advances 250 tiles; it never transfers to another slot. **Clarified requested behavior.** | A shared life pool or automatic teammate revival. |
| Revival consumable | Individual inventory | Deliberate target selection | Revives one eliminated teammate at a valid return point; it does not affect the owner's self-revive cooldown. | A renamed character power. |
| Flare consumable | Individual inventory | Deliberate activation | Revives every currently eliminated teammate and relocates every active/returned teammate to the user's current safe position. | A reusable teleport or a fog immunity item. |

When a player dies with a self-revive charge, show a brief non-pausing “revive yourself” prompt. If they accept, consume the charge and return them at the nearest safe position at or behind the live group frontier. If they decline or do nothing, the charge remains; a teammate can later use a consumable Revival or Flare. This prevents the player resource from silently acting as a shared automatic life.

### Collectible generation and attraction

Consumables are a single post-terrain, deterministic collectible sampling step. The sampler runs once per eligible spawn location, never per simulation frame and never by consuming the level/coin RNG stream. Its default mutually exclusive outcome table is:

| Outcome | Exact probability | Eligibility |
|---|---:|---|
| Flare | 1 / 1,250 | Mode allows Flares and this location allows a consumable. |
| Revival | 1 / 2,500 | Mode allows Revivals and this location allows a consumable. |
| No consumable | Remaining probability | All other eligible locations. |

The two rare outcomes are sampled from one roll (Flare first, Revival second); they cannot overlap on one location. The existing coin denomination roll remains separate. A released or shareable course must capture any new sampler/version so replaying a seed cannot quietly change pickup locations or rates.

Every consumable uses the current baseline pickup attraction (“default gravity”) so it can be reached from a drifting platform or grid offset. Coin gravity/magnet cards extend attraction **only for coin-class pickups** and never alter consumable attraction, movement, collection order, rarity, or eligibility. This is a hard type boundary, not a balance coefficient.

### Mode-contextual item eligibility

| Item or rule | Survive Together | Relay | Race | Reason |
|---|---|---|---|---|
| Existing cards | Existing Stroll/Arcade eligibility | Use the captured run's existing eligibility | Race-safe cards only after a dedicated audit | Do not accidentally import a solo or pursuit advantage into competition. |
| Innate 100-tile hazard save | Yes, unchanged | Yes, unchanged | Yes, unchanged | Existing character contract remains separate. |
| Personal self-revive | Yes | Yes, for the active runner only | Yes | Individual recovery remains legible in every mode. |
| Revival consumable | Yes: revive one teammate | No | Yes: revive one eliminated racer | A relay handoff must not be rewritten by teammate intervention. |
| Flare consumable | Yes | No | No for initial release | Global repositioning conflicts with fair relay continuity and leader-relative race pressure. |
| Consumable world spawns | Both types | None | Revival only | Prevents Relay's prebuilt continuity from gaining a new inventory economy; Race begins with one comprehensible comeback item. |

The Race and Relay restrictions are **inferred launch defaults**, not a claim that the requested items can never work there. Any later expansion needs a mode-specific fairness decision and tests.

## Mode Contracts

### Survive Together

Survive Together is co-op on either Stroll (currently referred to as Flow) or Arcade course rules. The team result ends when no slot is active and no eliminated player has a self-revive confirmation pending. Ghosted slots do not keep a run alive: they need a returning controller before they can participate again. A new player may join a running game only in this mode.

**Dropout and rejoin:** On controller loss, the avatar immediately becomes a visible, non-colliding ghost at its last safe location. It blocks neither lanes nor pickups, takes no hazard/fog damage, and cannot advance or collect. The run continues for everyone else. When the original slot is explicitly reclaimed, it returns at the first safe location no farther ahead than the current group frontier. A disconnected player can also be revived only after the returning controller is present; items are not spent on an unavailable slot. A newly discovered controller may create a new slot only while the team has a free seat and an unused character.

**Revival:** Death moves an active player to `eliminated`; it does not destroy their slot, character, earned statistics, or unspent inventory. Self-revive, a teammate's Revival, and a Flare are three distinct paths back to `active`. All returns must find a safe tile; if none exists this update, defer to the next safe-tile evaluation instead of spawning inside a hazard.

**Outcome:** The end screen centers the shared team distance/time and gives every character a contribution card (furthest distance, deaths, self-revives used, teammates revived, consumables collected/used, and time ghosted). The podium is a team podium: survivors share the result; it does not invent first through fourth places inside a co-op result.

### Relay

Relay has a locked roster once the run begins. It carries one continuous run state through a sequence of turns: exact course descriptor/seed/schema, world and lane clocks, position/progress, health, cards, wallet, purchases, pickups, history, and cumulative results. A handoff never reconstructs a fresh game from the seed, because that would lose time-dependent terrain state and current run continuity.

**Turn rule:** The active player runs until crossing the next forward boundary, initially 50 tiles from the run start and then 50 tiles from the prior handoff boundary. Crossing the boundary starts a dedicated handoff intermission and freezes simulation. The next still-active roster member claims the turn with their bound controller; the exact game state resumes only after that claim. Default `handoffTiles = 50` is configuration, not a magic number.

**Dropout:** No one may join after Relay starts. If a non-active participant loses their controller, mark that slot unavailable and skip it in later rotations. If the active participant loses their controller, immediately freeze into the handoff intermission. They may reclaim the slot with a replacement controller; otherwise a remaining active participant can select “skip this runner,” transferring the same live run to the next eligible participant. If none remains, finalize the relay at its exact current progress. This controlled pause is intentional: silently ghost-running or killing a player would corrupt a turn-based mode.

**Revival and items:** The active runner may use their own self-revive under the shared rule. No consumable world spawns or teammate-targeted Revival/Flare use in the initial Relay design. This keeps turns, inventory, and the failure of a leg intelligible. End results show the shared run plus a leg ledger: character, leg number, start/end distance, duration, death/skip/revive events, and coins/pickups collected.

### Race

Race has a locked roster at start. Its proposed finish condition is 500 forward tiles or a 180-second timer. A player receives an immutable finish record the first time they cross the target: `{ finishSimulationTick, elapsedMs, distance }`; they stop affecting collision, collectible, and fog calculations after finishing.

**Leader-relative damaging fog:** Let `frontier` be the greatest forward distance any active or finished racer has reached so far. It is monotonic. The fog boundary advances to `max(previousBoundary, frontier - 12)` and never retreats. A living racer behind that boundary loses one feather after each full second of continuous exposure. Leaving the fog resets the exposure timer. Standard damage/invulnerability behavior applies after each feather loss; fog never deletes a racer in a single update. The fog only advances when the race frontier advances, so a leader cannot pull it backward by retreating or dying. Numeric values are inferred balance defaults.

**Finish, timeout, and ties:** A racer who crosses 500 tiles in a simulation update finishes in that update. Players crossing on the same fixed simulation tick share a rank and receive the same podium placement; ordering in an array, input timing inside that tick, or render-frame order may never break a tie. The race ends when every roster slot has finished or been eliminated, or at 180 seconds. At timeout, unfinished active players rank by greatest forward distance, then share rank when their distance is equal at the terminating simulation tick; eliminated players are DNF and ranked after finishers/active timeout results. The results screen exposes finish time, distance, rank/tie, fog feathers lost, deaths, self-revives, and consumables.

## Required Result and Podium Data

Build a mode-neutral immutable `RunResult` with the common fields `modeId`, captured course descriptor, configured player cap, final reason, elapsed time, and each player's selected character/slot outcome. Give it a mode-specific detail record rather than trying to force co-op, relay, and race into one scoring number.

| Mode | Podium | Per-character breakdown |
|---|---|---|
| Survive Together | Shared team placement and final team distance/time | Furthest distance, survival state, deaths, self-revives, teammate revivals, consumables, ghost time. |
| Relay | Shared team placement and final team distance/time | Leg ledger, distance contributed, leg duration, skips, deaths, revives, pickups/coins. |
| Race | Ranked finishers, including shared ranks for true ties; then timeout and DNF entries | Finish time or timeout distance, rank/tie, fog damage, deaths, self-revives, consumables. |

Keep all events that feed the result in a structured ledger as they occur. The podium must render those records, not reconstruct statistics from mutable game state after it has ended.

## Requirement-Level Validation Matrix

| ID | Requirement | Evidence / automated validation | Manual or visual evidence |
|---|---|---|---|
| MD-01 | Player, controller, and character are separate; active players cannot share a character. | Unit tests for claiming, replacement controller binding, duplicate selection rejection, full roster rejection, and keyboard profile handling. | Setup shows each controller's slot and unique character before start. |
| MD-02 | In relevant active Arcade and Stroll states, multiplayer entry is explicit and does not mutate a solo run merely because a second device emits input. | Flow-state tests for both base modes: second input opens setup; cancel returns to unchanged solo state. | Repeat with two gamepads and configured keyboard in both modes in a live runtime. |
| MD-03 | Survive Together supports drop-in, dropout, ghosting, and explicit reclaim without stopping the surviving team. | Scenario test creates a ghost, verifies no collision/pickup/damage/advance, then reclaims at a safe no-ahead position. | Disconnect/reconnect each controller in a 4-player run. |
| MD-04 | Self-revive, existing 100-tile hazard saves, Revival, and Flare cannot substitute for each other. | Unit table tests cover ownership, max-one charge, 250-tile recharge, target rules, and no shared-pool transfer. | Results cards label each resource separately. |
| MD-05 | Consumable rates are exactly Flare 1:1,250 and Revival 1:2,500 from one mutually exclusive deterministic sampler. | Seeded statistical/threshold tests, golden deterministic vectors, and a test that terrain/coin RNG outputs are unchanged by sampling. | Inspect representative courses for readable pickups. |
| MD-06 | Consumables retain baseline attraction but never receive coin-magnet/card range. | Movement tests compare base gravity for a consumable with coin-card runs; assert the card changes coin range only. | Collect a consumable from platform/grid offsets with and without a magnet card. |
| MD-07 | Relay advances only at configured 50-tile boundaries and hands the identical live run to the next player. | Integration test snapshots state before/after boundary and checks seed/schema, lane clock, inventory, pickups, position, and ledger continuity. | Observe a 2–4 player handoff without world reset or duplicated pickup. |
| MD-08 | Relay roster closes at start; non-active dropout is skipped and active dropout enters recoverable handoff pause. | State-machine scenarios for each dropout position, replacement claim, skip, and no-eligible-player completion. | Disconnect the active and an inactive controller during separate legs. |
| MD-09 | Race fog is monotonic, leader-relative, damages at the configured cadence, and does not damage finishers. | Fixed-tick tests for leader advance/retreat/death, exposure reset, feather cadence, and finished-player exclusion. | Run a visible two-player chase that crosses the fog threshold. |
| MD-10 | Race finish, timeout, DNF, and simultaneous finish ties are deterministic. | Fixed-update tests generate same-tick finishes in reversed player-array order and assert shared rank; timeout-distance and DNF cases are pinned. | Verify ties display shared podium placement without arbitrary ordering. |
| MD-11 | Each mode grants only its listed contextual items and rules. | Parameterized eligibility test enumerates every item/rule by mode, including negative cases. | Pickup presentation never offers a forbidden item. |
| MD-12 | Every end screen uses immutable result records and exposes required per-character information. | Renderer/model tests for Survive Together, Relay, Race, ties, ghosted slots, and DNF. | Screenshot each mode at 320×560, 900×600, dark, and light runtime themes. |
| MD-13 | Existing single-player Stroll and Arcade retain 1:1 behavior when expressed through the new composable mode architecture. | Existing golden seed, deterministic simulation, and UI-flow suites run before and after migration; differences fail the build. | One representative solo Stroll and Arcade smoke run. |

## Pitfalls to Put in the Roadmap

1. **Treating a disconnect as a death.** A controller replacement must preserve player/character/run identity. Define the lifecycle before binding input events.
2. **Using frame time or player-array order for race results.** Ties and fog damage need a fixed simulation-tick record, otherwise different machines and iteration order produce different podiums.
3. **Rebuilding Relay from its seed at each handoff.** A seed identifies baseline course generation, not a live simulation. Preserve the live game object/state instead.
4. **Adding collectible rolls to the terrain RNG stream.** That would invalidate existing deterministic courses and silently change seeds. Use a separate seeded sampler/version.
5. **Letting coin magnets affect every pickup.** Consumable reachability needs baseline gravity, while coin cards must retain their stated coin-only scope.
6. **Turning the four recovery systems into one life pool.** Existing innate saves, personal cooldown-based self-revive, Revival, and Flare need distinct ownership, targets, and result stats.
7. **Showing a competitive podium for co-op contribution.** Preserve a shared team result and explanatory per-character cards; do not manufacture rankings that change player incentives.
8. **Applying one disconnect policy globally.** Ghosting fits co-op; an explicit handoff pause fits Relay; a fair race needs a deterministic eliminated/finished outcome. Mode handlers own these policies.

## Sources and Confidence

- [Original milestone request](../USER-REQUEST.md) — HIGH for the requested modes, rates, flow intent, and deliverables.
- [Reproducible courses](../../docs/seeds.md) — HIGH for the seed/schema and separate-RNG constraints that collectible sampling must preserve.
- [Cards](../../docs/cards.md) — HIGH for coin gravity/pull card scope and existing Stroll/Arcade eligibility.
- [Persistent run hand](../../docs/persistent-hand.md) — HIGH for live-run continuity and current UI constraints.
- [Microsoft GDK: controller addition/removal guidance](https://learn.microsoft.com/en-us/gaming/gdk/docs/store/policies/xr/xr115?view=gdk-2604) — MEDIUM, verified primary platform guidance supporting explicit replacement/rejoin handling; it does not prescribe this game's exact policies.
- [Microsoft GDK: game flow management](https://learn.microsoft.com/en-us/windows/uwp/gaming/tutorial-game-flow-management) — MEDIUM, verified primary guidance for explicit game-state transitions.
- [Microsoft GDK: game result model](https://learn.microsoft.com/en-us/xbox/gdk/docs/reference/live/rest/json/json-gameresult?view=gdk-2604) — MEDIUM, verified primary evidence that tie is a first-class game result; same-tick tie semantics above are an inferred local rule.

### Open Questions for Product Confirmation

1. Confirm only the final UI label for `Flow` / `Stroll`; automatic local-play entry already covers both Stroll and Arcade.
2. Confirm four-player versus seven-player launch support; this document plans four while keeping the cap configurable.
3. Confirm the Race target as 500 tiles with a 180-second hard cap versus an exactly 180-second distance contest.
4. Playtest and tune the inferred Race fog buffer/cadence (`12 tiles`, `1 feather/s`) and the self-revive prompt duration/return positioning.
