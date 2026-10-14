# Chasing mobs

Arcade introduces occasional pursuers after the opening crossings and first
market. Stroll remains free of pursuers. No account, new shell capability,
saved setting or external asset is required.

| First score | Mob | Readable behavior |
| --- | --- | --- |
| 160 | Moss Slime | Steady, grounded walking toward the duck; no lunge. |
| 320 | Snap Crab | Walks closer, warns, lunges a short distance, then rests. |
| 480 | Bramble Wasp | Approaches slowly over terrain, warns, then makes an accelerating and decelerating strike. |

The first arrival also waits for 45 seconds of active play. Arrivals are spaced
18 seconds apart initially, gradually reaching a 14-second minimum, and require
24 new points since the previous arrival. A new species cannot bypass that
spacing. Only one mob may be present before 480 points; at most two afterward.
Spawns wait for a safe meadow landing, an inactive market invitation and no
urgent wave warning. Missing or defeated mobs do not instantly get replaced.
New species get priority in slime → crab → wasp order at eligible arrivals,
so fast progress cannot skip the gentle first encounter. Timing and selection are
deterministic for a run seed and input sequence.

Walking is the ordinary pursuit action: short steps follow the duck's recent
position, with ground mobs checking scenery and water before moving. Slime
speed rises from 0.65 to 0.95 tiles/second, crab from 0.85 to 1.15, and wasp from
0.75 to 1.05 over 320 points after each species' debut. Walking has no attack
marker, warning sound or repeated windup. Slimes remain grounded and never
lunge. Movement and all speed changes use the same physical coordinates for
drawing and collision.

Crabs strike only within 1.3 tiles and wasps within 1.8. Each stops and commits
to the duck's position before its warning: a sidestep cannot be tracked during
the strike. Crab lunges use a quick start and easing stop, followed by a planted
recovery; wasp strikes ease in and out, followed by a longer hover rest. Crab
warnings last 1.2–0.95 seconds and recovery 2.2–1.7; wasp warnings last
1.35–1.1 seconds and recovery 2.6–2.0. These durations ramp over 320 points and
then stop becoming more aggressive. Market cards can slow pursuit, lengthen
crab/wasp warnings and recovery, or increase the interval between arrivals.

Spawns wait for a safe landing, appear on visible rear/side ground at least
2.5 tiles from the duck and above the wave, and have a harmless 1.8-second warning.
Land mobs respect scenery and avoid open water; traffic/trains can remove them.
The wasp flies over those hazards. All mobs disappear when left far behind or
caught by the wave. A blocked spawn waits rather than crowding the player.

Simulation uses the run clock and the duck's actual interpolated ground position.
Pursuers continue moving during hops, freeze on pause, and reset on a new run.
Swept contact checks use small body cores, excluding wings, antennae and bill.
Rendering uses exactly those world positions and depth sorting. Reduced motion
keeps physical movement and attack markers while removing decorative motion.

Existing compact toast/status space explains each new species. Visible spawn
rings announce an arrival; attack-direction markers are reserved for crab and
wasp strikes. A static overhead warning during strike preparation remains
visible when the duck covers a nearby ground marker, including with sound muted
or reduced motion enabled. Grounded slime movement, crab footfalls and hovering wasps make
their ordinary approach recognizable. Cosmetic duck bounce lowers smoothly
near active mobs so contact remains visible; its physical path stays unchanged.
Dedicated spawn, attack and mob-catch sounds extend the interchangeable sound
pack profile with built-in defaults. No new controls, mode, level editor,
combat system or protocol surface is part of this change.

Acceptance covers score and time gates, sparse arrivals without debut bypass,
quiet continuous pursuit, distinct easing and full attack recovery,
spawn grace/clearance, committed dodges, terrain/hazard rules,
interpolated contact and near misses, pause/reset/Stroll, bounded populations,
distinct rendered models, readable warnings and contextual audio. Verify the
built opaque-iframe game and the existing frame/theme matrix before completion.
