# Phase 04 Relay — Validation Strategy

**Phase goal:** Deliver locked-roster, turn-based continuity with mode-owned handoffs and results.
**Requirements:** RELAY-01, RELAY-02, RELAY-03, RELAY-04, RELAY-05
**Immutable solo oracle:** `a310a81ed6c76df4b265c9012c23b8c83f4802e5` — never repin.

## Locked Decision Catalog

The Phase 4 context predates numbered decision headings. These stable IDs map its
locked bullets and approved research/UI resolutions so plans and evidence remain
traceable.

| ID | Binding decision |
|----|------------------|
| D-01 | Setup reuses delivered seats/bindings, accepts two through capacity four unique characters in configurable stable-seat order, and validates whole `segmentTiles` 1-999 with default 50. Start freezes roster/order/characters/length; unknown later devices cannot join, while original seats may reclaim. |
| D-02 | Relay is a validated composed definition plus lifecycle coordinator over completed Phase 2/3 services. Core world/input/renderer code receives generic handlers/policies and gains no Relay identifier branch. |
| D-03 | Exactly one connected living active runner owns movement and transactions. Every controller remains observable for its own menu/reclaim/lifecycle actions. Inactive or stale actions cannot move, transact, consume, pause, or confirm for another seat. |
| D-04 | One existing shared world survives every handoff with identical course/schema/seed, rows, time, actor phases, pickup claims, future RNG, common effects, and world metadata. Relay never reconstructs or replays a Game. |
| D-05 | Genuine active-runner new frontier latches one pending boundary. The current hop/platform/hazard/rescue/recovery settles first; fatal death wins. A fresh incoming-seat confirmation is consumed before safe placement. Backtracking/repeat crossings/placement/exceptional jumps cannot create duplicate or empty legs. |
| D-06 | Seats retain separate identity, character, health, inventory/economy, statistics, innate 100 progress, and personal-revival 250 progress. Baton placement grants no progress, heal, pickup, purchase, or recharge. Actual death alone runs delivered spill/clear/recovery; disconnect, skip, and leave do not. |
| D-07 | Inactive disconnect leaves play live and marks the original seat reclaimable; normal rotation bypasses unavailable seats. Active disconnect freezes for original-seat fresh reclaim or connected-player explicit skip. All-controller loss waits. Leave archives contribution and ends only when no eligible/reclaimable seat remains. Terminal state is immutable. |
| D-08 | Initial Relay permits only the active runner's delivered personal revival. Relay installs no world consumable spawns and rejects teammate Revival/Flare or other mode-ineligible actions without spending. Future compatible items appear only through the authoritative Phase 3 eligibility service. |
| D-09 | One physical shelf and one hand/market DOM tree always identify the viewed owner. Only the active runner can transact. Every owner/turn/lifecycle change clears offer/card/draft/target/confirmation/focus/input context before another owner renders. |
| D-10 | Legs and credited outcomes append before mutable clear/disable. One immutable terminal result contains shared outcome/distance/time, participant lifecycle and aggregate fields, ordered legs, and a descending earned-distance contribution podium with competition ties. |
| D-11 | The approved UI contract is binding: existing game materials, exact copy, 16/20/28/44 type roles, 4/8/16/24/32/48/64 spacing, 44px targets, marker+P-number+character identity, bounded paging without scrollbars, full theme/reduced-motion/focus/live-region behavior, and the exact 240x240 floor notice. |
| D-12 | Evidence uses production objects and the real built opaque iframe. Browsers launch with device audio muted while retaining the application audio graph. Exact Phase 1-3 gates, optional-domain fallback, forbidden-authority audit, visual inspection, and honest conformance skip reporting remain mandatory. |

## Evidence Order

### Gate 0 — Completed dependencies and actual API reconciliation

Before any Phase 4 test or production edit:

1. Require non-empty Phase 1 summaries `01-01` through `01-04`, Phase 2 summaries
   `02-01` through `02-06`, and Phase 3 summaries `03-01` through `03-07`.
2. Read every summary and the live exports it names. Record actual APIs for:
   definition/handler composition; world identity/snapshot/fixed step; stable
   seats and lifecycle generations; action/fresh-edge routing; safe placement;
   per-seat statistics, 100/250 progress, death/recovery/protection; mode/item
   eligibility; owner/context invalidation; immutable common results; scene/HUD.
3. Run the complete Phase 2 and Phase 3 final gates from their canonical
   `02-VALIDATION.md` and `03-VALIDATION.md` files on the untouched starting point.
4. Stop on a missing dependency responsibility. Return the smallest completion
   to its owning phase; do not fabricate a Relay-local session, recovery, input,
   eligibility, owner, result, shell, or NAP substitute.
5. Record the dependency completion SHAs separately. The exact model/render
   oracle remains the original `a310a81` object.

### Gate 1 — Built setup-to-handoff tracer

Plan 04-01 proves one vertical production path before expansion:

- configure two stable bound seats with unique characters and default 50 or a
  valid custom 1-999 segment;
- reorder seats without changing identity/binding;
- reject invalid/duplicate/unavailable setup atomically;
- freeze the roster and reject a late unknown device;
- let only P1 move in one shared world;
- settle one short test segment, freeze the board, and require a fresh P2 edge;
- consume the boundary/confirm edges so neither becomes a hop or transaction;
- retain exact world object/future state and continue as P2;
- rerun exact solo and completed earlier-mode gates.

The browser tracer loads the built single-file artifact in a real
`sandbox="allow-scripts"` iframe with `--mute-audio`. It uses visible production
controls and the already-authorized injected gamepad snapshot transport. Source
models, fabricated callbacks, URL state injectors, debug globals, or alternate
test bundles cannot substitute for this path.

### Gate 2 — Segment settlement and continuity

Plan 04-02 tests production state at 49/50/51 and lengths 1, 7, 50, and 999:

- monotonic newly earned frontier only;
- backward/repeated crossing adds zero and cannot relatch;
- one pending boundary remains inert until hop/platform/hazard/recovery settles;
- fatal traffic/water/wave/mob death wins before transfer;
- successful innate rescue is not death and can settle later;
- no board-time world/actor advancement;
- exceptional frontier jump shows one settled transfer, chooses the smallest
  future boundary above retained frontier, and requires new authored progress.

At ground and moving-platform fractional positions, deep-compare before/after
handoff: world object, course descriptor/schema/seed, generated rows, lane actor
phase and next positions, simulation time, RNG state and next outputs, shared
frontier, pickup claim IDs/objects, common effects, and world metadata. Compare
each seat separately: only incoming safe position/credit floor may change;
health, wallet/fractional coins, cards, powers, cosmetics/equipment, consumables,
statistics, innate readiness/progress, and personal charge/progress remain exact.

### Gate 3 — Closed-roster lifecycle matrix

Plan 04-03 exercises authoritative transitions and state invariants:

| Case | Required outcome |
|------|------------------|
| Inactive disconnect | Current runner/world continues; original seat is labelled reclaimable and skipped on later normal rotation. |
| Active disconnect | World/actor time freezes; no timeout/death/auto-skip; original fresh reclaim or another connected eligible seat's explicit skip only. |
| Original reclaim | Same seat/character/inventory/progress/contribution/pending turn; stale held input cleared; no join grant. |
| Wrong/new reclaim | Typed rejection; no participant allocation, character release, or state mutation. |
| Skip cancel/confirm | Cancel is inert; confirm closes partial/zero Skipped leg, preserves reclaimable slot, rotates frozen order. |
| Leave cancel/confirm | Cancel is inert; confirm closes Left leg, archives contribution, creates no death spill/clear/refund/transfer, and permanently disables that seat. |
| Only reclaimable seats | Frozen `waiting-for-reclaim`; no automatic action. |
| No eligible/reclaimable seat | One immutable no-runner terminal transition; late input rejected. |
| Actual death | Delivered player-only spill/clear and personal offer resolve before resume/rotation/settlement; no handoff from a dead runner. |

Every case asserts world time, actor phases, player health/inventory, death counts,
roster membership, active owner, and event identity. Disconnect, skip, and leave
never emit death feedback or economy.

### Gate 4 — Append-only ledger and immutable results

Plan 04-04 opens a leg only on confirmed turn start and records stable runner,
character, leg, settled start frontier/time/position. Authoritative completed
events append earned distance, duration, coins, pickups, self revives, and close
outcomes (`Handed off`, `Dead`, `Skipped`, `Left`, `Ended`) exactly once before
mutable clear/disable.

Finalization freezes shared course/outcome/distance/time, roster lifecycles,
participant aggregates, ordered legs, and podium. Death/leave/disconnect cannot
erase prior contribution. Late input/callbacks/device attach/resize/page changes/
board reopen cannot mutate it. Competition ranking vectors include:

- `20, 20, 10` -> `=1, =1, 3`
- `30, 20, 20, 5` -> `1, =2, =2, 4`
- all equal -> every participant shares `=1`

No seat order, input time, coins, character, or display order breaks a tie.

### Gate 5 — Built runtime, owner tree, and mode eligibility

Plan 04-05 runs one mixed keyboard/controller built flow from setup through
handoffs and results. It proves:

- active-only movement and per-seat character calls/cooldowns;
- settled transfer and fresh confirmation;
- every disconnect/reclaim/skip/leave/wait/death/terminal action via visible UI;
- keyboard-only fallback when optional gamepad support is absent;
- one owner-labelled shelf/market tree with active-only transactions;
- owner/context invalidation on handoff, reclaim, skip, leave, death, waiting,
  result, retry, and teardown;
- Relay has no world Revival/Flare spawn/offer/target/art/success path;
- invalid teammate/ineligible item use spends nothing;
- active personal revival uses the delivered 250 mechanic, separate from innate
  100, with zero baton-placement credit;
- one immutable result and clean retry/teardown.

Every browser launches with `--mute-audio`; the real audio graph stays present.
Assert no page errors, external requests, native controller polling, direct
network/browser storage/host DOM access, or production-only test hooks.

### Gate 6 — Responsive visual proof and final phase gate

Plan 04-06 generates and inspects screenshots/report data from the real built
napplet in dark/light themes and reduced-motion representatives:

| Frame | Required Relay evidence |
|-------|-------------------------|
| 200x160 | Exact `Needs 240×240 to play — enlarge this pane.` only; scene/actions hidden; setup/handoff/waiting/result state retained across resize. |
| 240x240 | Named Setup/Roster/Handoff/Reclaim/Skip/Leave/Waiting/Results pages; marker strip, one primary action, 44px navigation; no clipping/scrollbar. |
| 320x560 | Complete selected setup row/order/validation, fresh handoff, both disconnect types, reclaim, skip, leave, waiting, owner restriction, separate 100/250 rows, participant and leg pages. |
| 900x600 | One scene, 2x2 edge HUD, active/next identities, one shelf/owner tree, transfer board, podium/ledger; no overlap. |
| 1000x280 | Active/incoming identity, one status, primary action, and navigation remain reachable; decoration/secondary totals yield first. |
| 2400x1200 | Expanded shared scene plus roster/ledger or podium/breakdown; no narrow centered column or second dashboard. |

At each frame assert no document/board/panel/ledger scrollbar, no horizontal
overflow, primary action visibility, 44px targets, focus/ARIA semantics, exact
copy, state retention across resize/pages, theme coverage, and marker+P-number+
character identity. Inspect a generated contact sheet/report before completion.

Then run the complete final bundle gate and read every report:

```bash
pnpm test:phase1
pnpm test:solo-parity
node --test tests/local-session-tracer.mjs tests/local-session.test.mjs tests/gamepad.test.mjs tests/session-input.test.mjs tests/keyboard-input.test.mjs tests/local-session-gamepad-runtime.mjs tests/local-session-keyboard-runtime.mjs tests/local-session-runtime.mjs tests/local-session-layout.mjs
node tests/gamepad-runtime.mjs
node --test tests/survive-together-tracer.mjs tests/survive-together.test.mjs tests/consumable-drops.test.mjs tests/consumables.test.mjs tests/consumable-world.test.mjs tests/survive-economy.test.mjs
pnpm test:market
pnpm test:magnet
pnpm test:mobs
pnpm test:death-spill
node --test tests/relay-tracer.mjs tests/relay-boundary.test.mjs tests/relay-lifecycle.test.mjs tests/relay-results.test.mjs
pnpm type-check
pnpm build
node tests/relay-runtime.mjs
node tests/relay-layout.mjs
pnpm test:guidance
pnpm test:conformance
git diff --exit-code -- pnpm-lock.yaml
```

If the Phase 1 summary records a different canonical completion command, use it
in addition to the immutable oracle commands above. The Phase 2 and Phase 3
command blocks remain exact subsets of this combined gate. A conformance skip is
recorded as a skip, never as passing evidence. Injected deterministic controller
proof is distinguished from any unavailable physical-controller observation.

## Requirement Evidence Matrix

| Requirement | Planned evidence | Owning plans |
|-------------|------------------|--------------|
| RELAY-01 | Two-to-four stable bound unique-character setup, order controls, 1-999 validation/default 50, consumed start, immutable locked roster. | 04-01, 04-05, 04-06 |
| RELAY-02 | Monotonic one-shot boundaries, full hazard settlement, fatal priority, fresh transfer, exact ground/platform world continuity, no-free personal credit. | 04-01, 04-02, 04-05, 04-06 |
| RELAY-03 | Frozen post-start roster, unknown-device rejection, original-seat reclaim without join/grant. | 04-01, 04-03, 04-05, 04-06 |
| RELAY-04 | Active/inactive loss, reclaim, skip, leave, waiting, actual death/recovery, final departure, no-controller, immutable terminal policy. | 04-03, 04-05, 04-06 |
| RELAY-05 | Append-only legs, participant aggregates, immutable shared result, true contribution ties, production podium/ledger. | 04-04, 04-05, 04-06 |

## Architectural Invariants

- One session owns one mutable shared world and advances it once per fixed step.
- Relay changes active authority and safe avatar placement; it never constructs,
  serializes/replays, or regenerates the world for a handoff.
- Every command validates stable seat plus lifecycle/context generation and current
  Relay state before mutation.
- Personal earned movement is distinct from shared frontier and baton placement.
- Actual death, device absence, skip, deliberate leave, and terminal state remain
  disjoint transitions with disjoint economy/feedback.
- Results append before mutable state clears and freeze once at terminal state.
- Presentation renders authoritative state; it cannot decide owner, eligibility,
  placement, result, rank, or lifecycle.
- Relay is composed through delivered definition/handler services. Core engine,
  renderer, and input modules contain no Relay mode-name policy branch.
- Released solo/seed/economy/input/audio contracts and the `a310a81` oracle remain exact.

## Boundary and Security Gates

- Add no dependency, shell implementation, manifest requirement, host DOM access,
  direct network, browser storage, native controller polling, signer/relay
  authority, `@napplet/shim`, or invented NAP/domain/envelope.
- Validate segment values, roster uniqueness/order/bindings, seat/device/context
  generations, active authority, boundary IDs, safe placements, recovery/item
  eligibility, ledger events, and terminal transitions before mutation.
- Every browser is muted at the device output while the application audio graph
  remains real and testable.
- No production hook exists only for tests. Production-object model tests and
  visible opaque-iframe flows are required.
- No package install occurs; package-legitimacy checkpoints are not applicable
  and the lockfile stays unchanged.

## Multi-Source Coverage Audit

### GOAL

| Source item | Status | Coverage |
|-------------|--------|----------|
| Locked-roster turn-based continuity with mode-owned handoffs and results | COVERED | 04-01 tracer/setup; 04-02 continuity; 04-03 lifecycle; 04-04 results; 04-05/06 runtime/UI/evidence. |

### REQ

| Source item | Status | Coverage |
|-------------|--------|----------|
| RELAY-01 | COVERED | 04-01, 04-05, 04-06 |
| RELAY-02 | COVERED | 04-01, 04-02, 04-05, 04-06 |
| RELAY-03 | COVERED | 04-01, 04-03, 04-05, 04-06 |
| RELAY-04 | COVERED | 04-03, 04-05, 04-06 |
| RELAY-05 | COVERED | 04-04, 04-05, 04-06 |

### RESEARCH

| Source item | Status | Coverage |
|-------------|--------|----------|
| Mandatory completed Phase 1-3 API and gate reconciliation; dependency-owned repair on mismatch | COVERED | Gate 0, 04-01 |
| Validated Relay definition, capacity four, default 50, frozen ordered roster | COVERED | 04-01 |
| One active authority; no core Relay branches | COVERED | 04-01, 04-05 |
| Monotonic frontier, one-shot settled latch, exceptional-jump future boundary | COVERED | 04-02 |
| Fatal hazard/death/recovery priority | COVERED | 04-02, 04-03 |
| Exact world/RNG/clock/claim continuity on ground and moving platform | COVERED | 04-02 |
| Per-seat credit floor and zero handoff credit for 100/250/economy/items | COVERED | 04-02 |
| Explicit active/inactive loss, reclaim, skip, leave, waiting, death, terminal state machine | COVERED | 04-03 |
| Active personal revival only; no Relay world/team consumables; authoritative eligibility | COVERED | 04-05 |
| One owner-labelled hand/market tree and stale-context invalidation | COVERED | 04-05 |
| Append-only legs, immutable result, participant aggregates, true tied contribution ranks | COVERED | 04-04 |
| Napplet authority, no install, built opaque runtime, muted any-size/theme/motion evidence | COVERED | Every plan threat/read gate; 04-05/06 runtime and visuals |

### CONTEXT

| Source item | Status | Coverage |
|-------------|--------|----------|
| D-01 | COVERED | 04-01, 04-03, 04-05, 04-06 |
| D-02 | COVERED | 04-01 |
| D-03 | COVERED | 04-01, 04-05 |
| D-04 | COVERED | 04-01, 04-02, 04-05 |
| D-05 | COVERED | 04-01, 04-02, 04-05 |
| D-06 | COVERED | 04-02, 04-03, 04-05 |
| D-07 | COVERED | 04-03, 04-05 |
| D-08 | COVERED | 04-05 |
| D-09 | COVERED | 04-05 |
| D-10 | COVERED | 04-04, 04-05, 04-06 |
| D-11 | COVERED | 04-04, 04-06 |
| D-12 | COVERED | 04-01, 04-05, 04-06 |

No source item is missing. Race finish/fog/items/standings, broader cross-mode
presentation consolidation, milestone-wide coverage thresholds, and PR creation
remain assigned to Phases 5-7; none is used to reduce Relay behavior.

## Completion Record

Each summary records actual reconciled API names, precondition results, focused
test counts, exact inherited gate results, immutable-oracle identity, runtime and
visual artifact paths, muted-browser flags, conformance skips, lockfile identity,
and external physical-hardware limits. Phase 4 advances only after every matrix
row above has current production evidence.
