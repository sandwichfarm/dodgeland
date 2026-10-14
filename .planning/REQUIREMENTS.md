# Requirements: Down to Duck local multiplayer

**Defined:** 2026-10-14
**Baseline:** a310a81
**Authority:** USER-REQUEST.md; no feature below may be dropped to obtain green tests.

## Architecture and solo parity

- [x] **ARCH-01**: Gameplay tuning is represented by typed, validated, composable rule configuration rather than mode-dependent magic numbers embedded in update logic.
- [ ] **ARCH-02**: Each solo/multiplayer mode composes reusable mechanics and explicit lifecycle handlers for join, leave, disconnect, reconnect, death, progress and results.
- [ ] **ARCH-03**: Shared terrain, actor time, RNG, pickup ownership and camera policy are separated from each player's movement, health, powers, inventory and statistics; world updates occur once per tick.
- [x] **ARCH-04**: A new mode can be defined from rule configuration and handlers without editing core input, renderer or adding another hard-coded mode branch throughout the engine; document an example.
- [x] **SOLO-01**: Existing Arcade and Stroll/Flow modes migrate with 1:1 gameplay and numerical parity against the committed pre-refactor engine, including hazards, health, wave, mobs, economy, powers, pauses and deaths.
- [x] **SOLO-02**: Existing seed schemas, generation snapshots, intent contracts, saves, market/card behavior and sound/shortcut IDs remain compatible.
- [x] **SOLO-03**: Default solo play remains one-step and visually uncluttered; extra setup appears only for multiplayer or explicit mode selection.

## Players and input

- [ ] **INPUT-01**: Listen to every exposed standard controller in all relevant game/menu states; a second controller's actual input initiates multiplayer flow without requiring a hidden menu.
- [ ] **INPUT-02**: Every local player has a stable device/seat identity and a unique playable character; automatic choices avoid conflicts and character selection prevents duplicates.
- [ ] **INPUT-03**: Provide working default shared-keyboard presets and an in-game keybinding editor with conflict validation, remapping and reset.
- [ ] **INPUT-04**: Simultaneous keyboard/controller movement is independent; held repeats, focus loss, stale input, device-index reuse and teardown are safe.
- [ ] **INPUT-05**: Mode-specific handlers decide disconnect/dropout/reconnect behavior; display actionable player state without applying an awkward blanket pause policy.
- [ ] **INPUT-06**: Controllers and keyboard can be mixed; absence of shell gamepad support leaves keyboard/pointer functionality available without prohibited native polling.

## Survive Together

- [ ] **COOP-01**: Multiple characters survive the same world with Arcade or Flow rules and independent collisions, health, character powers and inventories.
- [ ] **COOP-02**: Players can join and leave an active run; joins place the newcomer safely without resetting course, score, elapsed time or existing player inventory.
- [ ] **COOP-03**: Each player has one revival charge, recharging after 250 new tiles; cooldown, eligibility and usage have observable UI and cannot be farmed by backtracking/rejoin.
- [ ] **COOP-04**: Living players can revive dead teammates, with explicit targeting/activation, safe placement and temporary protection; game-over behavior accounts for surviving/recoverable players.
- [ ] **COOP-05**: Disconnect/rejoin preserves player continuity; death, temporary absence and deliberate departure are distinct states.

## Consumables

- [ ] **ITEM-01**: Introduce an extensible consumable item class separate from persistent cards and cosmetics, with mode eligibility, charges, targeting and activation validation.
- [ ] **ITEM-02**: Revival items revive another player and occur with 1:2500 world-drop probability; flares revive dead teammates and bring everyone to the user's safe position with 1:1250 probability.
- [ ] **ITEM-03**: Consumables can be acquired from world pickups and purchased in the shop; inventory, prices and availability are visible and mode-appropriate.
- [ ] **ITEM-04**: World consumables use the default collection gravity so fractional log-hop grids remain viable; coin-magnet cards/powers never increase their capture range.
- [ ] **ITEM-05**: Rare spawning is seeded, bounded and verifiable at exact probability boundaries; contested pickups award once to a deterministic eligible player.
- [ ] **ITEM-06**: Supply usable offensive/defensive Race consumables with clear effects and feedback; invalid use, departed targets and ineligible modes never waste charges or corrupt state.

## Relay

- [ ] **RELAY-01**: Relay has a setup flow with player order and configurable segment length (default 50 tiles).
- [ ] **RELAY-02**: Control transfers exactly at each segment boundary, safely and visibly, preserving shared course/run continuity without counting backward travel twice.
- [ ] **RELAY-03**: The started Relay roster is closed to new entrants until the race ends; reconnecting an existing seat does not count as a new entrant.
- [ ] **RELAY-04**: Players may drop out; inactive/active seat disconnection, skip/rejoin, final-player departure and no-controller cases have explicit mode-owned behavior.
- [ ] **RELAY-05**: Each participant's segments, distance, time, coins and outcomes contribute to dedicated Relay results and podium/breakdown.

## Race

- [ ] **RACE-01**: Race setup defines a playable common course with configurable finish distance/time limit; participants race the clock and each other.
- [ ] **RACE-02**: The leading player's progress determines the fog boundary; trailing players can remain in fog while losing feathers at a configured cadence rather than instantly dying.
- [ ] **RACE-03**: Camera, boundary/fog presentation, warning and health feedback make both leader and trailing-player states legible.
- [ ] **RACE-04**: Disconnect/dropout/reconnect, ties, simultaneous finishes, timeout, deaths and last-survivor cases produce deterministic results without resetting the race clock.
- [ ] **RACE-05**: Race items support offensive/defensive play through the composable mode/item system and do not leak into unrelated modes.
- [ ] **RACE-06**: Dedicated race results show a podium and per-character rank, distance, time, finish/death status and relevant item/interaction statistics.

## Interface and presentation

- [ ] **UI-01**: Provide game-styled mode/setup/unique-character selection screens, ready/join feedback and controller/keyboard help while preserving the simple solo start.
- [ ] **UI-02**: Render all players as actual distinct character models with persistent identifying marks, individual health/power/revival/item state and readable active-turn/leader cues.
- [ ] **UI-03**: Multiplayer market, inventory, consumable use and persistent hand clearly identify whose wallet/items are active and preserve player/run state across menus.
- [ ] **UI-04**: Each mode has appropriate custom pause/disconnect, ghost/death/revival and end-of-game screens, per-character breakdowns and podium presentation.
- [ ] **UI-05**: Small screens use purpose-built views/pages with large usable controls and no accidental scrollbars; desktop/compact/short frames and both themes remain usable.
- [ ] **UI-06**: Revive, flare, relay transfer, fog damage and race-item interactions have contextual visual/audio feedback that respects mute and reduced motion.

## Verification and delivery

- [x] **TEST-01**: Execute precise baseline-vs-composed-solo differential tests and retain all existing deterministic course and gameplay regressions.
- [ ] **TEST-02**: Add broad model/state-machine/integration coverage for each mode, shared simulation, input/lifecycle, revival cooldown, item odds/range/ownership and results; tests exercise real production logic.
- [ ] **TEST-03**: Exercise complete multiplayer user flows in built opaque-iframe browser fixtures through keyboard and injected runtime gamepad events; assert no runtime errors, native access or production-only test hooks.
- [ ] **TEST-04**: Capture and inspect visual proofs of all modes, setup, HUD, items/revival, market, disconnect states and podiums across desktop/compact/short sizes and themes.
- [ ] **TEST-05**: Run required type-check/build/guidance/conformance checks, relevant legacy suites and per-mode coverage with explicit thresholds and meaningful uncovered-branch review.
- [ ] **SHIP-01**: Work on a new branch, retain GSD plans/summaries/verifications and requirement traceability, commit coherent changes, and open a reviewable PR against main with tests and visual evidence.

## Traceability

Roadmapper assigns every requirement to exactly one owning phase. Cross-phase
tests may cover multiple requirements; no requirement is complete until its
behavior is implemented, verified and committed.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 1 | Complete |
| ARCH-02 | Phase 5 | Pending |
| ARCH-03 | Phase 2 | Pending |
| ARCH-04 | Phase 1 | Complete |
| SOLO-01 | Phase 1 | Complete |
| SOLO-02 | Phase 1 | Complete |
| SOLO-03 | Phase 1 | Complete |
| INPUT-01 | Phase 2 | Pending |
| INPUT-02 | Phase 2 | Pending |
| INPUT-03 | Phase 2 | Pending |
| INPUT-04 | Phase 2 | Pending |
| INPUT-05 | Phase 2 | Pending |
| INPUT-06 | Phase 2 | Pending |
| COOP-01 | Phase 3 | Pending |
| COOP-02 | Phase 3 | Pending |
| COOP-03 | Phase 3 | Pending |
| COOP-04 | Phase 3 | Pending |
| COOP-05 | Phase 3 | Pending |
| ITEM-01 | Phase 3 | Pending |
| ITEM-02 | Phase 3 | Pending |
| ITEM-03 | Phase 3 | Pending |
| ITEM-04 | Phase 3 | Pending |
| ITEM-05 | Phase 3 | Pending |
| ITEM-06 | Phase 5 | Pending |
| RELAY-01 | Phase 4 | Pending |
| RELAY-02 | Phase 4 | Pending |
| RELAY-03 | Phase 4 | Pending |
| RELAY-04 | Phase 4 | Pending |
| RELAY-05 | Phase 4 | Pending |
| RACE-01 | Phase 5 | Pending |
| RACE-02 | Phase 5 | Pending |
| RACE-03 | Phase 5 | Pending |
| RACE-04 | Phase 5 | Pending |
| RACE-05 | Phase 5 | Pending |
| RACE-06 | Phase 5 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 6 | Pending |
| UI-05 | Phase 6 | Pending |
| UI-06 | Phase 5 | Pending |
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 7 | Pending |
| TEST-03 | Phase 7 | Pending |
| TEST-04 | Phase 7 | Pending |
| TEST-05 | Phase 7 | Pending |
| SHIP-01 | Phase 7 | Pending |

## Release criteria

All three multiplayer modes created and playable, every checkbox supported by
current evidence, high meaningful mode coverage, required checks green, visual
proofs inspected and included, and a live open PR. Evidence skips or unavailable
physical-controller hardware must be distinguished from proven behavior.
