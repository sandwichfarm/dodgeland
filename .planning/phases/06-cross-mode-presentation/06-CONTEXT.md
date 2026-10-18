# Phase 6: Cross-Mode Presentation — Context

**Mode:** Autonomous delivery through the requested multiplayer modes, evidence, and open PR.
**Dependencies:** Verified Survive Together, Relay, and Race vertical slices.

## Required outcome

Complete the shared presentation contract across all playable modes. Each mode
must already have a working vertical interface from its owning phase; this phase
audits cross-mode consistency and closes responsive or lifecycle gaps. It must
not become a place to defer a missing mechanic, item, controller flow, or result.

## Locked requirements

- Own UI-04 and UI-05 while preserving all earlier requirement evidence.
- Mode-specific pause, controller loss/reclaim, temporary ghost, death, personal
  recovery, teammate recovery, terminal, and restart flows explain the actual
  model policy. Render authoritative state and immutable results; do not create
  a parallel UI-only lifecycle or fabricated totals.
- Co-op presents a shared outcome and non-ranked contributions. Relay shows the
  shared course, individual leg ledger and contribution podium with true ties.
  Race shows competitive ranks, finish/time/status, fog and interaction statistics
  with true ties. Every participant remains represented after death or departure.
- Keep one owned hand/market tree. The selected seat, character, wallet, hand,
  innate power, personal revival, and consumables remain unambiguous across
  gameplay and menus. Selling must preserve the current market/pack page.
- Keep all existing solo entry and presentation behavior. Multiplayer setup is
  deliberate; routine solo play gains no extra confirmation or visual clutter.
- Use the existing voxel/material game aesthetic, readable distinctive type,
  large controls, clear depth and game transitions. No website-like panels,
  tiny action text, accidental scrollbars, or second dashboard around the scene.
- Purpose-built compact and short views use pages/tabs when necessary, retaining
  state, focus and return position through resize. Do not solve overflow by
  shrinking all content or hiding required controls.
- Validate 200x160 (size notice), 240x240, 320x560, 900x600, 1000x280, and
  2400x1200 in both runtime themes. Use the approved 4/8/16/24/32/48/64 spacing
  scale and at least 44px interactive targets.
- Keep keyboard and controller focus readable and independent. Shared menus
  display ownership; incoming controllers and stale held inputs cannot activate
  another participant's action or leak through a closing overlay.
- Mute, reduced motion, optional-domain absence, focus loss, no-controller states,
  and teardown remain functional. Device output stays muted in automated tests.

## Evidence and scope

### Observed HUD footprint to resolve

Phase 2's four-player 900x600 capture shows the left 2x2 HUD covering part of
nearby P2/P4 actors and their world labels. The label renderer now separates
overlapping labels, and the setup layout matrix checks reachable controls and
an exposed world area, but neither proves that DOM panels leave every nearby
traveler readable. Resolve this regular-frame HUD/camera composition in the
cross-mode presentation work (including removal of redundant solo personal
status in shared sessions). Test the initial four-seat group and left/right
course positions against the actual HUD footprint, then inspect built-iframe
screenshots. This remains an explicit final-presentation gap; a green label
rectangle or DOM layout test must not be cited as proof that it is resolved.

Read all verified Phase 2-5 contracts, actual runtime interfaces and result
records before planning. Build a state-by-mode-by-frame matrix from those facts;
name every missing or inconsistent cell and close it with a real user flow.
Do not duplicate already passing tests without a newly identified concern.

Exercise the built opaque iframe with normal keyboard and injected controller
events. Assert live state transitions and ownership, not source strings or
fabricated display records. Capture and inspect representative screenshots,
including interruption/recovery/result states and responsive transitions. Keep
original solo numerical and pixel parity plus all preceding mode gates green.

No new network, persistence, input authority, package, protocol or downloaded
mode path is implied by this phase. Preserve the current napplet boundary and
document any necessary implementation change before introducing it.
