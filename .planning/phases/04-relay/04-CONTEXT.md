# Phase 4: Relay — Context

**Mode:** Autonomous delivery of the requested multiplayer milestone.
**Dependency:** Verified Phase 3 and the completed shared-session foundation.

## Requested outcome

Players configure an ordered roster and take turns every N forward tiles on one
continuous course. N defaults to 50. New entrants cannot join after start;
existing players may drop out and reclaim their original slot after reconnecting.
Relay needs its own interruption, handoff, result, and podium presentation.

## Locked requirements

- Configure unique characters, runner order, and validated segment length before
  starting. Reuse shared controller/keyboard binding and setup surfaces.
- Relay is a composable definition with lifecycle handlers. Input, rendering, and
  the world engine must not grow scattered checks for a Relay identifier.
- Exactly one eligible runner owns movement at a time; all controllers continue
  listening for valid menu/reclaim/lifecycle actions. Inactive directions cannot
  move the active character, buy items, or consume another player's action.
- A handoff occurs at each new segment boundary, safely and visibly. Preserve the
  same course, world clock, actor phases, pickup claims, seed/RNG future state,
  progress, and run-owned state. Never rebuild the course to hand off control.
- Backward travel and repeated boundary crossings cannot count a leg twice.
- The started roster is closed to new entrants until the run ends. Reclaiming an
  original slot after a controller reconnects is not a new join.
- Active loss, inactive loss, deliberate leave, reclaim, skip, and the last
  available runner have explicit Relay-owned outcomes. Do not leave an ambiguous
  no-controller run advancing indefinitely or apply a universal disconnect pause.
- Keep each player's identity, inventory, health, contribution record, and innate
  power separate. Death follows the established per-player spill/clear economy;
  disconnect does not become death. No handoff grants free purchases or duplicate
  pickups, healing, innate recharge, or personal-revival recharge.
- Preserve the separate personal revival mechanic (250 earned forward tiles)
  and existing character power (100); reuse validated recovery/item services when
  mode-eligible rather than implementing a second recovery system.
- Dedicated results include the shared outcome plus each character's legs,
  distance, time, coins, pickups, revives, skips, and other outcomes. Relay uses a
  contribution podium/breakdown appropriate to a shared run.
- Solo and the completed cooperative mode retain their committed behavior.

## Implementation choices to validate

These are working implementation assumptions, not additional user answers:

- Retain four seats as the provisional shared-session capacity.
- Measure segment progress with a monotonic shared frontier and credit earned
  movement only to the active runner; repositioning at handoff is not progress.
- At a boundary, latch a pending handoff, finish the current hazard/landing
  resolution, and use a short explicit transfer board with the incoming runner's
  fresh confirmation. The board freezes simulation; its trigger cannot also hop.
- Transfer the baton position while keeping each runner's personal inventory and
  health. Resolve platform carry and safe placement through existing services;
  avoid resetting actor phases or teleporting to a newly generated course.
- Skip unavailable runners in the configured order. A disconnected original
  member remains reclaimable; deliberate departure is visibly different.
- Determine bounded no-runner/recovery handling and the exact leg-death policy
  during research. Defaults must become validated settings/handlers with real
  transition tests, not unresolved prose or user-approval gates.

## Evidence required

Read RELAY-01 through RELAY-05 and the full verbatim request. Research and plans
must reconcile actual Phase 1–3 contracts before implementation. Test real
production transitions at 49/50/51 and multiple leg lengths, backward/repeated
boundaries, hopping/riding handoffs, exact object/RNG/clock continuity, inactive
input, every seat-loss/reclaim/skip outcome, terminal recovery, and immutable
per-character result records. Run the exact solo gate and earlier-mode suites.

Use the established voxel/material aesthetic, large controls, one scene and
camera, no scrollbars, and purposeful compact/short pages. Capture and inspect
muted browser proofs for setup, baton transfer, active/inactive disconnect,
reclaim, shared market/hand ownership, and results in both themes; all browser
launches must mute device audio without bypassing the audio graph.
