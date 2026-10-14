# Pluck

Pluck is a traveler's resilience for surviving glancing traffic collisions. Every run starts with **three feathers** in a compact meter beneath the top-right controls. Each feather can be full, half-full or empty, with a numeric value and accessible meter text. Every traveler follows the same rules.

| Contact | Pluck cost |
| --- | --- |
| Rear bumper, relative to the car's travel direction | 1 feather |
| Either long side | 2 feathers |
| Front bumper / head-on | 3 feathers |

A depleted meter ends the run with the contextual traffic death cue. Trains,
open water, getting swept away, the chasing wave, falling behind the trail and
mob catches are fatal regardless of Pluck. A ready, matching
[traveler power](character-powers.md) can avert one of those deaths; its
100-block cooldown is separate from health regeneration.

Crossing each new **100-hop distance milestone** restores **half a feather**, up to three. Milestones use this run's highest score, so walking back and forth never farms recovery. Crossing a milestone at full Pluck consumes it without banking a future heal. New runs refill the meter; Pluck is not stored in progress saves.

A surviving impact plays a rear thunk or side scrape, shows the loss, and gives **one second of protection against further car damage**. A short recoil selects nearby clear ground when available; it never deliberately chooses open water, scenery or the wave. If boxed in, the duck keeps its controls while the vehicle clears. Continuous overlap with one car is one contact, not damage every simulation tick. The recovery window and recoil freeze on pause. A steady pale halo and meter outline communicate recovery without flashing; Less motion retains these signals.

The collision sweep follows the duck's interpolated ground position against the moving vehicle's visible chassis in both axes. The duck's small core excludes its bill and wings; wheels and headlights do not enlarge the chassis. Left-moving vehicles are mirrored so their headlights and actual front agree. Hops are grounded travel, not invulnerability against cars or trains.

`hurt.rear`, `hurt.side` and `health.restore` join the interchangeable sound-pack cue registry; existing packs fall back to bundled sounds. Fatal collisions retain `death.traffic` without a second nonfatal sound. This feature needs no new NAP, storage field, or external asset.

Implementation: `src/game.ts`, `src/render.ts`, `src/main.ts`, the Pluck meter in `index.html` / `src/styles.css`, and semantic audio cues. Behavioral and built-artifact checks live in `tests/health.test.mjs` and `tests/health-runtime.mjs`; car rendering alignment is also checked in `tests/render.test.mjs`.
