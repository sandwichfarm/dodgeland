# Phase 1 research

**Source:** Live source exploration and 134 passing baseline model tests.
**Baseline:** a310a81ed6c76df4b265c9012c23b8c83f4802e5.

## Implementation guidance

Use the complete .planning/research/SOLO-PARITY.md and
.planning/codebase/ARCHITECTURE.md maps as primary phase research. Source is
authoritative; the MCP graph is stale and misses many modern modules.

Game update sequencing is sensitive: inventory real-time tick, effect rebase,
prior position sample, world time, hop/hurt/rescue clocks, wave/trail, swept
vehicles, river carry/safety, coin capture, then mobs. An immutable config
extraction must not reorder this sequence or change arithmetic grouping.

The rules should be grouped by mechanics, with Arcade/Stroll composition at one
boundary. Keep progression generator constants in their pinned schema modules.
Course width is fixed by the existing generated content; pretending it is an
arbitrary configurable number would create unsafe geometry. Renderer-only
decoration constants and numeric tolerances are likewise not mode policy.

Existing constructors that require values before Game exists (RunInventory,
MobDirector) can accept optional configuration defaulting to the exact baseline.
Do not thread a new global mutable settings object through the application.
Prefer immutable per-run rules. Existing public APIs and standalone tests remain
valid with omitted options.

## Validation architecture

1. Baseline-vs-current model differential harness: independent compiled modules,
   fixed dt commands, exact semantic snapshots and ordered callback payloads.
2. Configuration tests: normalization/composition, immutability, invalid bounds,
   actual behavior under non-default settings, stable legacy aliases.
3. Relevant baseline tests from SOLO-PARITY.md (134), plus market capacity,
   item catalog, soundscape/collision consumers where imports change.
4. Type-check, guidance, production build and conformance. Add existing muted
   render/SDK smoke evidence where imports or public Game access changes.

The differential suite must be adversarial: prove it fails on an intentionally
perturbed rule/snapshot, then remove the perturbation. Snapshot structural
adapters may omit new configuration objects but not gameplay state. Retain exact
numerical values rather than masking drift with a wide epsilon.

## Pitfalls

- Loading the same ESM module twice through a cached path falsely proves parity.
- Creating the baseline after changes or depending on mutable main invalidates it.
- New market/card defaults must preserve object ownership and card-stacking order.
- Freezing shallow outer objects leaves nested rule groups mutable.
- Changing world-clock scale and hop duration together changes Stroll controls.
- Introducing callbacks into the existing update order can mutate behavior;
  phase 1 handlers must be explicit, tested and absent by default.
- Do not run audible runtime fixtures unchanged; use muted Chromium.
