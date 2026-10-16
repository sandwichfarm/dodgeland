# Roadmap: Down to Duck local multiplayer

## Overview

This milestone first turns the exact solo game into validated, composable rules while proving it remains bit-for-bit equivalent to the `a310a81` baseline. It then adds one shared local session with player-aware input and rendering, delivers Survive Together, Relay, and Race as complete vertical modes with their own interfaces, and closes with responsive cross-mode presentation plus release evidence and an open PR. The initial configuration keeps the planning defaults provisional: four seats, Flow as existing Stroll behavior, and Race at 500 tiles or 180 seconds; each is an explicit validated mode setting rather than a hard-coded assumption.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Composable Solo Baseline** - Route Arcade and Flow through typed mode rules while proving exact baseline parity. (completed 2026-10-14)
- [x] **Phase 2: Shared Local Session** - Let distinct locally controlled characters share one world, input system, renderer, and setup flow. (completed 2026-10-14)
- [x] **Phase 3: Survive Together & Consumables** - Deliver drop-in co-op, distinct recovery mechanics, and deterministic cooperative items. (completed 2026-10-15)
- [x] **Phase 4: Relay** - Deliver locked-roster, turn-based continuity with mode-owned handoffs and results. (completed 2026-10-15)
- [ ] **Phase 5: Race** - Deliver a timed competitive race with leader-relative fog, contextual items, and deterministic standings.
- [ ] **Phase 6: Cross-Mode Presentation** - Complete resilient mode-specific overlays, results, podiums, and responsive multiplayer views.
- [ ] **Phase 7: Release Evidence & PR** - Prove the complete milestone in production artifacts, preserve GSD evidence, and open the review PR.

## Phase Details

### Phase 1: Composable Solo Baseline

**Goal**: Solo players retain the exact familiar Arcade and Flow experience while the game exposes reusable, validated mode rules and lifecycle seams for future modes.
**Depends on**: Nothing (first phase)
**Requirements**: ARCH-01, ARCH-04, SOLO-01, SOLO-02, SOLO-03, TEST-01
**Success Criteria** (what must be TRUE):

  1. A player can start Arcade or Flow exactly as before, and the composed mode produces identical fixed-step state, callbacks, hazards, economy, pauses, deaths, seed behavior, and visible gameplay to the immutable `a310a81` baseline.
  2. Existing seed links, saved data, intent contracts, market/cards, sound packs, shortcuts, and terrain schemas continue to load and behave compatibly after migration.
  3. A developer can define a mode by combining validated rule groups and lifecycle handlers, with a documented example, without adding mode-name branches across input or rendering.
  4. A solo player still reaches play in one step; multiplayer setup is not shown unless they deliberately select it or another device requests local play.

**Plans**: 4 plans

Plans:

- [x] 01-01-PLAN.md — Establish the immutable a310a81 differential harness and complete solo scenario matrix.
- [x] 01-02-PLAN.md — Introduce validated immutable rule composition and route core Game/render behavior through it.
- [x] 01-03-PLAN.md — Route economy, collection, pursuers, and timing consumers through active rules.
- [x] 01-04-PLAN.md — Preserve one-step app entry, document real authoring, and run the strict phase gate.

### Phase 2: Shared Local Session

**Goal**: Local players can form a readable, uniquely identified roster and control simultaneous characters in one advancing world.
**Depends on**: Phase 1
**Requirements**: ARCH-03, INPUT-01, INPUT-02, INPUT-03, INPUT-04, INPUT-05, INPUT-06, UI-01, UI-02
**Success Criteria** (what must be TRUE):

  1. Multiple characters can move simultaneously in one shared course while terrain, actors, RNG, pickups, camera policy, and simulation time advance once per fixed tick.
  2. A second deliberately active standard controller opens Local Play setup, where a default four-seat roster can select only unique characters and receives clear ready/join guidance without interrupting a solo run silently.
  3. Players can mix controllers with default shared-keyboard seats; the in-game binding editor validates conflicts, remaps and resets bindings, and independent held/repeated input remains safe through focus changes, stale snapshots, index reuse, and teardown.
  4. Controller loss, replacement, and missing shell gamepad support leave actionable player state and working keyboard/pointer controls; modes receive the lifecycle event rather than a blanket device-disconnect pause.
  5. Each on-screen character remains visibly distinct with a persistent player mark and individual health, power, revival, item, turn, and leader cues as those mechanics become available.

**Plans**: 6 reviewed plans (execution depends on verified Phase 1)
**UI hint**: yes

Plans:

- [x] 02-01-PLAN.md — Commit live two-player tracer, solo adoption, renderer, and immutable parity checkpoint; known callback defects remain mandatory02-02 fixes.
- [x] 02-02-PLAN.md — Prove deterministic shared simulation, pickup ownership, lifecycle, and per-player state.
- [x] 02-03-PLAN.md — Route independent controllers through the existing authorized snapshot transport; main-loop integration remains in 02-05.
- [x] 02-04-PLAN.md — Implement shared-keyboard routing, binding capture, conflicts, reset, and persistence.
- [x] 02-05-PLAN.md — Integrate setup, controller/keyboard input, multi-character scene, HUD, and responsive proofs.
- [x] 02-06-PLAN.md — Establish selected-owner hand/market routing and run the shared-session evidence gate.

### Phase 3: Survive Together & Consumables

**Goal**: Friends can join a live Arcade or Flow run, recover safely from setbacks, and use deterministic cooperative consumables without disrupting the shared course.
**Depends on**: Phase 2
**Requirements**: COOP-01, COOP-02, COOP-03, COOP-04, COOP-05, ITEM-01, ITEM-02, ITEM-03, ITEM-04, ITEM-05, UI-03
**Success Criteria** (what must be TRUE):

  1. Two to four distinct characters can survive Arcade or Flow together, each with independent movement, collisions, health, innate power, inventory, and statistics in the same world.
  2. A player can safely join or deliberately leave a live co-op run without resetting its course, elapsed time, score, or other players' inventories; lost, ghosted, eliminated, returned, and departed states remain visibly distinct and preserve the original slot/character when applicable.
  3. Each player has at most one separate self-revival charge that recharges only after 250 new forward tiles, while living teammates can explicitly restore eligible dead teammates at safe protected positions and the run ends only when no recovery path remains.
  4. Players can acquire and deliberately use mode-eligible Revival and Flare consumables from shop or world pickups: a mutually exclusive seeded sampler yields Revival at 1:2500 and Flare at 1:1250, awards contested pickups once deterministically, and preserves default pickup gravity regardless of coin-magnet cards.
  5. The multiplayer hand, market, inventory, pricing, and consumable targeting always identify the selected owner and retain every player/run state across menus.

**Plans**: 7 reviewed plans plus 1 independent-verification gap closure (execution depends on verified Phase 2)
**UI hint**: yes

Plans:

- [x] 03-01-PLAN.md — Verify prior gates and integrate live solo adoption, joins and participant lifecycle.
- [x] 03-02-PLAN.md — Add personal recovery, earned progress, safe return and team results.
- [x] 03-03-PLAN.md — Define validated consumable contracts, inventory and isolated seeded probability rolls.
- [x] 03-04-PLAN.md — Integrate mode-owned world pickups, atomic use and death clearing/spill.
- [x] 03-05-PLAN.md — Add owner-aware item economy and deterministic shared card effects.
- [x] 03-06-PLAN.md — Connect lifecycle, recovery and team results to the runtime interface.
- [x] 03-07-PLAN.md — Complete the single hand/market tree and run the complete browser/model gate.
- [x] 03-08-PLAN.md — Include unreclaimed ghost intervals in departure and settlement contributions.

### Phase 4: Relay

**Goal**: A local group can play one continuous, turn-based Relay run with deliberate transfers, closed roster rules, and leg-by-leg results.
**Depends on**: Phase 3
**Requirements**: RELAY-01, RELAY-02, RELAY-03, RELAY-04, RELAY-05
**Success Criteria** (what must be TRUE):

  1. Players can configure a Relay order and segment length, defaulting to 50 tiles, before starting a shared course.
  2. Crossing a segment boundary visibly starts a safe baton handoff; the next eligible runner continues the identical live world, course, progress, clocks, pickups, and inventory without duplicated backward progress or a reset.
  3. Once Relay starts, new entrants cannot join, while an existing player can reclaim their same roster slot after reconnecting.
  4. Active and inactive controller losses follow clear Relay-owned outcomes: reclaim, skip to the next eligible runner, or finish the run if no runner remains, with no ambiguous no-controller state.
  5. The Relay result presents the shared outcome and each character's legs, distance, time, coins, pickups, revives, skips, and other outcomes in a dedicated breakdown and podium.

**Plans**: 6/6 plans executed
**UI hint**: yes

Plans:

- [x] 04-01-PLAN.md — Reconcile completed APIs and build Relay setup with a real continuity tracer.
- [x] 04-02-PLAN.md — Settle exact boundaries and transfer the single live world safely.
- [x] 04-03-PLAN.md — Implement Relay disconnect, reclaim, skip, leave, recovery, and waiting policy.
- [x] 04-04-PLAN.md — Record immutable leg contributions and tied podium results.
- [x] 04-05-PLAN.md — Integrate mixed inputs and the active owner's hand/market.
- [x] 04-06-PLAN.md — Inspect responsive proofs and run the complete inherited gate.

### Phase 5: Race

**Goal**: Players can race a common timed course with fair pressure, contextual tactics, and deterministic competitive outcomes.
**Depends on**: Phase 3
**Requirements**: ARCH-02, ITEM-06, RACE-01, RACE-02, RACE-03, RACE-04, RACE-05, RACE-06, UI-06
**Success Criteria** (what must be TRUE):

  1. A locked local roster can configure and start a shared Race, initially using a provisional 500-tile finish and 180-second limit held in validated mode settings.
  2. The furthest racer advances a monotonic fog boundary; trailing racers can remain inside it but lose feathers at the configured cadence, with readable camera, boundary, health, and warning feedback for both leaders and trailers.
  3. Race disconnects, dropouts, reclaims, deaths, last-survivor cases, simultaneous finishes, ties, and timeout resolve from fixed simulation state without resetting the course or race clock.
  4. Players can use Race-eligible offensive and defensive consumables with visible, muted/reduced-motion-aware feedback; invalid targets, departed players, and ineligible modes cannot spend a charge or corrupt state.
  5. Race results show podium rank including true ties, distance, elapsed/finish time, finish or death status, fog damage, and relevant item/interaction statistics for every character.

**Plans**: 7/7 plans executed; technical verification40/40, human accepted; formal closure/security audit pending
**UI hint**: yes

Plans:

- [x] 05-01-PLAN.md — Reconcile prior APIs and implement validated Race setup, tracer, and authoring.
- [x] 05-02-PLAN.md — Resolve deterministic fog, finish/timeout precedence, and balance evidence.
- [x] 05-03-PLAN.md — Implement recovery, disconnect grace, original-seat reclaim, and waiting.
- [x] 05-04-PLAN.md — Add Race-only items, authoritative eligibility, and isolated probability rolls.
- [x] 05-05-PLAN.md — Freeze complete results with true competition ranks and unranked DNF groups.
- [x] 05-06-PLAN.md — Integrate input, camera, HUD, feedback, and the owner-labelled market.
- [x] 05-07-PLAN.md — Inspect the responsive visual matrix and run the complete canonical gates.

### Phase 6: Cross-Mode Presentation

**Goal**: Every multiplayer mode remains understandable and usable through interruptions, recovery, results, and every supported frame size/theme.
**Depends on**: Phase 3, Phase 4, Phase 5
**Requirements**: UI-04, UI-05
**Success Criteria** (what must be TRUE):

  1. Each mode presents an appropriate pause, disconnect, ghost, death, revival, and end-of-game flow that explains the active mode rule without losing player or run context.
  2. Co-op, Relay, and Race results each render their required per-character contribution/breakdown and mode-appropriate podium from immutable result records.
  3. Setup, HUD, hand/market, recovery, and result views use purpose-built compact views with large controls and no accidental scrolling at tiny, compact, regular, wide, and short frames in both runtime themes.

**Plans**: 2 plans
**UI hint**: yes

Plans:
**Wave 1**

- [x] 06-01-PLAN.md — Clear the shared live scene and remove duplicate personal status with a real four-player tracer.

**Wave 2** *(Wave 1 complete)*

- [x] 06-02-PLAN.md — Prove changed lifecycle/owner/result surfaces and run exact inherited acceptance gates.

### Phase 7: Release Evidence & PR

**Goal**: The complete local multiplayer milestone is demonstrated in real built artifacts, fully checked, traceable, and available for review as an open PR.
**Depends on**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6
**Requirements**: TEST-02, TEST-03, TEST-04, TEST-05, SHIP-01
**Success Criteria** (what must be TRUE):

  1. Real production logic has broad model, state-machine, and integration coverage for shared simulation, input/lifecycle, all three modes, revival timing, item odds/range/ownership, and mode results, with explicit thresholds and reviewed uncovered branches.
  2. Built opaque-iframe browser fixtures complete keyboard and injected-gamepad multiplayer flows without runtime errors, prohibited native access, or production-only test hooks.
  3. Inspected visual evidence covers setup, HUD, co-op recovery/items/market, Relay handoff and disconnects, Race fog/items, and all podiums across required sizes and both themes with browser audio muted.
  4. Type-check, build, guidance, conformance, parity/legacy, per-mode, and browser checks are green with evidence skips explicitly distinguished from proven behavior.
  5. The feature branch contains coherent phase evidence and traceability, and an open reviewable PR against `main` links its tests and visual proofs.

**Plans**: 9 plans in 9 sequential waves; execution order01 →02 →07 →08 →09 →03 →04 →05 →06

- [x] 07-01-PLAN.md — Audit isolated tooling and calibrate exact Node/opaque-browser counters.
- [ ] 07-02-PLAN.md — Complete shared collection foundation and policy; Task1 already passed.
- [ ] 07-07-PLAN.md — Collect seven canvas/component browser owners.
- [ ] 07-08-PLAN.md — Collect seven local-input/lifecycle browser owners.
- [ ] 07-09-PLAN.md — Collect seven remaining owners and produce the complete initial report.
- [ ] 07-03-PLAN.md — Close meaningful measured coverage and behavioral gaps.
- [ ] 07-04-PLAN.md — Measure scoped wire, teardown and current-manifest conformance.
- [ ] 07-05-PLAN.md — Commit current visual proof and complete original-clause traceability.
- [ ] 07-06-PLAN.md — Run unchanged inherited plus additive gates and open the authorized PR.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Composable Solo Baseline | 4/4 | Complete    | 2026-10-14 |
| 2. Shared Local Session | 6/6 | Complete    | 2026-10-14 |
| 3. Survive Together & Consumables | 8/8 | Complete    | 2026-10-15 |
| 4. Relay | 6/6 | Complete    | 2026-10-15 |
| 5. Race | 7/7 | Technical verification passed; human accepted; formal closure/security audit pending |  |
| 6. Cross-Mode Presentation | 2/2 | Technical verification47/47; human accepted; formal closure/security audit pending | - |
| 7. Release Evidence & PR | 1/9 | In progress | - |
