# Phase 5: Race — Context

**Mode:** Autonomous delivery through all requested modes, verification, and PR.
**Dependencies:** Verified Phase 3 and the completed shared-session foundation.

## Requested outcome

Distinct characters race a common course against one another and the clock.
The leader determines an advancing fog boundary. Trailers can stay in the fog
but it plucks feathers; fog is readable pressure rather than an instant kill.
Contextual offensive/defensive consumables and a dedicated ranked result/podium
make this mode distinct while preserving the common composable architecture.

## Locked requirements

- Configure and lock a unique-character roster before starting. Reuse existing
  controller/shared-keyboard setup and binding surfaces, with unchanged solo entry.
- Represent Race as validated settings plus lifecycle/result handlers, not mode-ID
  branches scattered through input, renderer, or the shared world engine.
- One shared course, actor clock, seed/RNG stream ownership, and deterministic
  pickup arbitration; every racer retains independent movement, health, inventory,
  powers, revival state, and stats.
- The advancing leader determines the fog boundary. It must not retreat when the
  leader backs up, dies, disconnects, or finishes. Exposure drains feathers at a
  configured cadence; the character does not instantly die on entering fog.
- Camera, world fog, edge cues, warnings, health feedback, and HUD keep leaders and
  trailers understandable in one scene without split-screen.
- Race clock and progress survive interruption/reclaim without resets or duplicate
  progress. Distinguish per-player disconnect/dropout/death from global safety
  suspension and explicit shared menus.
- Resolve ties, same-step finishes, timeout, deaths, last-survivor cases, no-controller
  cases, and terminal recovery deterministically from fixed simulation state.
- Supply at least one usable offensive and one defensive contextual consumable.
  Eligibility, targets, charges, timing, effects, and stats use the common item
  system. Invalid use, departed/ineligible targets, and changed world state spend
  nothing and cannot partially mutate the race. No effect leaks into unrelated modes.
- Keep personal revival (250 earned forward tiles) separate from innate character
  powers (100). Death retains the established spill/clear economy; disconnect does
  not. Forced repositioning cannot grant recharge or trigger fake finishes.
- Results use immutable records for every participant: podium rank including true
  ties, distance, elapsed/finish time, finish/death/departure status, fog damage,
  and relevant item/interaction statistics.
- Contextual fog, item, revival, flare, and transfer feedback honors mute and
  reduced motion. Automated browser execution must mute device output.
- Earlier solo/co-op/Relay behavior remains covered; all mode handlers and a tested
  authoring example must satisfy ARCH-02 without editing core input or renderer
  for each new definition.

## Working defaults to validate

These defaults were communicated as assumptions and are not additional user
answers: four seats; a 500-tile finish; a 180-second active-play limit. Keep them
editable through validated settings rather than hiding them as engine constants.
Initial fog tuning from research is a 12-tile buffer and one feather per second of
continuous exposure. Playtest against baseline hop speed and revise if necessary,
with boundary tests and an explicit rationale.

Research must choose concrete fair policies for finish versus timeout ordering,
true ties, disconnected grace/reclaim, last-survivor continuation, personal-revive
windows, fog damage/protection interaction, and the initial offensive/defensive
items. Keep choices simple, visible, configurable, and tested. Default shared
card effects to baseline unless a declared Race mechanic deliberately changes a
specific player; no implicit global card stacking.

## Evidence required

Read ARCH-02, ITEM-06, RACE-01 through RACE-06, UI-06, and the verbatim request.
Reconcile actual Phase 1–3 APIs before implementation. Test real fixed-step
finish/timeout/fog/health/item/lifecycle transitions and stable ordering across
roster permutations; test world/RNG/clock ownership once per tick, malformed
settings, safe return, no cooldown farming, true ties, and immutable results.

Use the existing voxel/material aesthetic, large controls, no scrollbars, and
purposeful compact/short pages. Muted built opaque-iframe flows and inspected
visual proofs must include setup, simultaneous racers, fog exposure/damage,
offense/defense, disconnect/reclaim, personal recovery, markets, timeout, and
ranked podiums in both themes. Retain exact original solo parity and all earlier
mode gates; test names or source scans alone do not prove behavior.
