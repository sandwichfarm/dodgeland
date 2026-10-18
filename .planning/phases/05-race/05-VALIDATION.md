---
phase: 05
slug: race
status: validated
nyquist_compliant: true
wave_0_complete: true
audited: 2026-10-16
---
# Phase 05 Race — Validation Strategy

**Phase goal:** Players race one timed shared course under readable leader-relative fog, contextual tactics, and deterministic competitive outcomes.
**Requirements:** ARCH-02, ITEM-06, RACE-01, RACE-02, RACE-03, RACE-04, RACE-05, RACE-06, UI-06
**Immutable solo oracle:** `a310a81ed6c76df4b265c9012c23b8c83f4802e5` — never repin.

## Locked Decision Catalog

The Phase 5 context predates numbered decision headings. These IDs map its locked
requirements and the approved research/UI resolutions so plans and evidence remain
traceable.

| ID | Binding decision |
|----|------------------|
| D-01 | Race setup locks two through capacity-four bound seats with unique characters. Finish/time are validated settings with defaults 500 tiles and 180 active seconds; the UI accepts whole finish values 1–9999 and whole seconds 30–3600. |
| D-02 | Race is one validated composable definition plus explicit lifecycle, presentation, item, and result handlers over delivered shared services. Core input, renderer, world, and health code gain generic policy seams rather than scattered Race-ID branches. |
| D-03 | One session owns one shared course, world/actor clock, terrain/schema/seed, mutable RNG streams, pickup arbitration, mobs, retention, and camera observation. Every racer owns independent movement, health, inventory, innate power, recovery, lifecycle, and statistics. |
| D-04 | Every completed tick captures all genuine movement-earned frontiers before death/disconnect exclusion. The maximum leader frontier and fog boundary never retreat. Fog exposure and Mud Splash range use actual settled visible-ground position, not earned high-water. The exact line is safe. |
| D-05 | Fatal hazards settle before finish. Living finishers on the same simulation tick truly tie; finish beats timeout on that tick. All-down personal offers use the ordinary active session/Race clock, and Race timeout closes them before the immutable result freezes. |
| D-06 | One disconnected racer becomes a non-colliding/non-claiming ghost while others continue. Reclaim grace is 12 active seconds. Replacement-device reclaim binds only the reserved original seat at a safe no-ahead position, preserves state and existing deadlines exactly, clears held input, and grants no protection/resource/progress. All-controller waiting freezes world and active clocks. |
| D-07 | Personal recovery starts with one charge, recharges only from that player's 250 genuinely earned new tiles, and stays separate from each character's innate 100-tile power. Actual death spills/clears that owner; disconnect/leave do not. Forced placement cannot recharge, finish, move fog, or earn economy. |
| D-08 | Race offers only personal recovery plus Mud Splash and Fog Lantern. Mud Splash costs 30, targets an active unprotected opponent within 16 actual-ground tiles, and applies a 1.35 hop-cooldown multiplier for two active seconds. Fog Lantern costs 30 and blocks fog only for three active seconds. Both use plan/revalidate/atomic-commit transactions. |
| D-09 | Mud Splash and Fog Lantern each occupy one distinct bucket in 1,250 in isolated captured `race-item-schema-1` sampling. The stream consumes no released terrain, coin, market, mob, spill, audio, or solo RNG draw. Default pickup gravity applies; magnet effects do not extend it. |
| D-10 | Existing cards, temporary powers, packs, common Revival, and common Flare are explicitly Race-ineligible at catalogue, spawn, shop, capacity, target, UI, and activation boundaries. Race starts without those assets. Cosmetics remain appearance-only. |
| D-11 | One owner-labelled shelf and one hand/market DOM tree serve Race. `Race gear` contains only Mud Splash/Fog Lantern beside appearance-only `Wardrobe`; every owner/lifecycle/page change clears stale selection, target, confirmation, focus, and held input before rendering. |
| D-12 | One immutable terminal result includes captured settings/schema, reason, ticks/time, final frontier/boundary, and every locked participant's rank or DNF, distance, time, lifecycle, death/recovery/power/fog/item/pickup/coin/market statistics. Same-tick/equal-distance competitors share competition rank; DNF groups are unranked. |
| D-13 | One leader-biased shared camera, monotonic fog ribbon, leader marker, per-racer HUD, and edge cues keep every racer readable. Identity always combines marker, P-number, and character; statuses never depend on color, motion, or sound alone. |
| D-14 | The approved material UI, exact copy, 16/20/28/44 typography, 4/8/16/24/32/48/64 spacing, 44px controls, focus/live-region behavior, exact 240x240 floor notice, no-scroll paging, both themes, and reduced-motion substitutions are binding. |
| D-15 | Every automated browser uses muted device output while exercising the real audio graph. Production-object tests, real built opaque-iframe flows, immutable solo evidence, all completed dependency gates, lockfile identity, and honest conformance skip reporting are mandatory. |

## Evidence Order

### Gate 0 — Completed dependencies and actual API reconciliation

Before any Race test or production edit:

1. Require non-empty Phase 1 summaries `01-01` through `01-04`, Phase 2 summaries
   `02-01` through `02-06`, and Phase 3 summaries `03-01` through `03-07`.
2. Read every summary and each named live export. Record actual APIs for definition
   composition and lifecycle dispatch; shared world/seat fixed steps; movement
   provenance; health; recovery/protection; item eligibility/sampling/activation;
   owner/context invalidation; input/reclaim generations; immutable results;
   camera/render views; audio events; and active-clock suspension.
3. Run the complete Phase 2 and Phase 3 final gates from `02-VALIDATION.md` and
   `03-VALIDATION.md` on the untouched Race starting point. Keep the original
   `a310a81` archive as the solo oracle.
4. If `src/relay.ts`, any `04-*-SUMMARY.md`, or other delivered Relay integration is
   present, require all six Phase 4 summaries and run the exact Gate 6 command from
   `04-VALIDATION.md` before editing. Preserve the delivered generic handler, owner,
   renderer, input, and result seams; do not replace them with Race-local variants.
   A partial Relay implementation returns to Phase 4 for completion.
5. Stop on a missing Phase 1–3 responsibility. Return the smallest repair to its
   owning phase; never fabricate a Race-local world, seat router, recovery model,
   item inventory, owner tree, result service, shell adapter, or NAP.

### Gate 1 — Built setup-to-Race tracer and authoring proof

Plan 05-01 proves one production vertical path:

- configure two bound unique-character seats with default or valid custom finish/time;
- freeze the roster and captured settings;
- start one shared course and move both racers through seat-tagged input;
- advance world/actors/RNG exactly once per fixed tick;
- settle a short configured finish and freeze one immutable Race result;
- reject malformed settings, duplicate characters, late entrants, and stale start;
- compile and execute the exact documented custom-mode example with real join, leave,
  disconnect, reconnect, death, progress, and results handlers;
- rerun immutable solo and completed dependency gates.

The browser tracer uses visible production controls in the built single-file artifact,
an opaque `allow-scripts` iframe, shared keyboard plus authorized injected controller
snapshots, and `--mute-audio`. A test-only route, debug hook, direct model injection,
source scan, or alternate UI bundle is not user-path evidence.

### Gate 2 — Fixed-step fog and terminal ordering

Plan 05-02 exercises real settled session ticks and reversed roster permutations:

- capture every accepted movement frontier before same-tick death/disconnect exclusion;
- never count rejected input, backtracking, replayed edges, safe placement, recovery,
  reclaim, drift, or teleport as earned progress;
- maintain a monotonic leader frontier/fog boundary across retreat, death, disconnect,
  finish, reclaim, and roster permutation;
- use actual settled ground for strict-line exposure while using earned high-water only
  for boundary and accounting;
- accumulate continuous exposure, apply one named health-pipeline fog attempt per full
  configured interval, record attempted versus landed feather loss, and reset/freeze
  exposure on line exit, personal protection, or Fog Lantern;
- settle fatal traffic/water/wave/mob hazards before finish, mark all living same-tick
  finishers together, then apply finish-before-timeout precedence;
- continue ordinary active ticks for all-down valid recovery offers and close them at
  timeout before finalization.

The focused balance run uses production fixed steps at default 500/180, fog buffer 12,
one-feather-per-second cadence, baseline hop timing, two-to-four racers, and deterministic
courses. It reports observed pressure/finish feasibility. Any tuning change creates a new
captured Race configuration/sampler version and matching boundary evidence.

### Gate 3 — Closed-roster lifecycle and recovery

Plan 05-03 covers every authoritative transition:

| Case | Required outcome |
|------|------------------|
| One device lost, another active | The lost racer ghosts; others and active clock continue; no spill/death. |
| Original replacement reclaim | Fresh neutral input rebinds the reserved original seat at safe no-ahead position; exact health/items/charge/progress/exposure/cooldowns/protection deadline survive; no new protection. |
| Unknown/late device | Typed rejection; no participant, character, resource, progress, or target allocation. |
| Grace expiry / deliberate leave | Racer becomes forfeited/departed DNF; no death spill or refill; later input cannot join. |
| All controllers unavailable | Named waiting state freezes world, fog, race, grace, recovery, effects, and cooldown clocks; no timeout or auto-result while reclaim/recovery remains eligible. |
| Actual death | Delivered owner-only spill/clear and personal offer; another racer continues. |
| Personal recovery | Delivered one-charge/250-earned rule and eight-active-second offer return the same seat safely with delivered two-second protection and no inventory restoration. |
| Last survivor / all down | Last survivor continues; all-down valid offers use ordinary active ticks; no co-op terminal shortcut. |

Every case compares one shared world clock/object/future output and every per-seat economy,
health, 100/250 progress, lifecycle, statistics, exposure, and deadline before/after.

### Gate 4 — Race-only items and owner economy

Plan 05-04 proves both descriptors through the delivered common item system:

- exact isolated sampler buckets and version capture with no released RNG drift;
- default pickup gravity only and no magnet extension;
- typed eligibility at catalogue, world, claim, shop, capacity, target, UI, and commit;
- `Mud Splash` exact owner/target/generation/protection/actual-ground-range validation,
  two-active-second 1.35 cooldown effect, and no movement/health/score/fog/progress change;
- `Fog Lantern` self-only three-active-second fog protection/exposure reset, with
  ordinary hazards unchanged;
- price 30, owner wallet/capacity, atomic revalidation/debit/effect/stat event;
- zero debit, target mutation, success sound, or statistic on stale/invalid commits;
- negative matrices for solo, Survive Together, Relay, common Revival/Flare,
  cards/powers/packs, dead/ghost/departed/protected/out-of-range targets;
- cosmetics remain appearance-only and all earlier mode inventories stay unchanged.

### Gate 5 — Immutable results and ranks

Plan 05-05 builds results only from frozen participant records and the append-only
event ledger. Required ranking vectors include same-tick `=1, =1, 3`, timeout-distance
`1, =2, =2, 4`, all-equal shared first, mixed finishers before timeout racers, and
explicit unranked DNF groups. Reversing roster/device/character order cannot change
ranks. Death-cleared inventories retain pre-death statistics. Late input, callbacks,
reclaim, item targets, resize, page changes, retry, and board reopen cannot mutate the
snapshot.

### Gate 6 — Built runtime, one camera, owner tree, and feedback

Plan 05-06 completes mixed keyboard/controller production flows through setup, race,
fog, items, market, disconnect/reclaim, personal recovery, finish/timeout, result,
retry, and teardown. It proves:

- one shared camera, monotonic fog ribbon, leader cue, actual-ground edge markers, and
  every racer's identity/health/100/250/item/lifecycle/fog state;
- one owner-labelled shelf/hand/market tree; `Race gear` plus appearance-only wardrobe;
- owner/context invalidation before another owner can render or transact;
- no Race card/power/pack/common-consumable surface or hidden activation path;
- contextual fog, Mud Splash, Fog Lantern, recovery, disconnect, finish, and rank cues;
- mute suppresses application output, reduced motion replaces travel/pulse/shake with
  static marks, and automated device output remains muted while graph events execute;
- keyboard-only fallback when the optional gamepad domain is absent;
- no page errors, external requests, native controller polling, direct storage/network,
  host DOM access, shell implementation, invented protocol, or production test hook.

### Gate 7 — Responsive visual proof and final phase gate

Plan 05-07 generates and inspects screenshots/report data from the real built napplet:

| Frame | Required Race evidence |
|-------|------------------------|
| 200x160 | Exact `Needs 240×240 to play — enlarge this pane.` only; state survives resize. |
| 240x240 | Named Setup/Race/Gear/Target/Recovery/Reclaim/Waiting/Results pages, marker strip, one primary action, 44px navigation, no clipping/scrollbar. |
| 320x560 | Unique setup/defaults, fog states, separate 100/250 rows, owner gear/wardrobe, target failure/success, recovery, grace/reclaim, and paged result details. |
| 900x600 | One scene, 2x2 HUD, fog ribbon/leader/edge cues, shelf/owner tree, item effect, and podium without overlap. |
| 1000x280 | Clock, inspected/affected racer, one status/action, and navigation remain reachable; secondary decoration yields first. |
| 2400x1200 | Broad scene uses four HUD tiles, edge cues, podium, and participant breakdown without a narrow centered board. |

Every frame runs in dark/light themes with reduced-motion representatives. Assert no
document/board/panel/HUD/market/hand/result scrollbar, 44px controls, exact copy,
focus/ARIA/live-region behavior, full theme coverage, owner/state retention, and no
meaning dependent on sound, color, or motion. Inspect the generated contact sheet/report.

Then run this exact combined gate and read every report:

```bash
pnpm test:phase3
node --test tests/race-tracer.mjs tests/race-ordering.test.mjs tests/race-balance.test.mjs tests/race-lifecycle.test.mjs tests/race-items.test.mjs tests/race-results.test.mjs
pnpm type-check
pnpm build
node tests/race-runtime.mjs
node tests/race-layout.mjs
pnpm test:guidance
pnpm test:conformance
git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml
```

If Phase 4 is delivered, insert its exact canonical Relay model/runtime/layout command
from `04-VALIDATION.md` before the Race model command; do not weaken or duplicate it.
If the Phase 1 summary records an additional completion command, run it too. A
conformance skip remains a skip, and injected deterministic controller evidence remains
distinct from any unavailable physical-controller observation.

## Requirement Evidence Matrix

| Requirement | Planned evidence | Owning plans |
|-------------|------------------|--------------|
| ARCH-02 | Validated Race handler bundle; exact executable authoring example; no core mode-ID branches; every lifecycle handler dispatches through delivered services. | 05-01, 05-06, 05-07 |
| ITEM-06 | Mud Splash/Fog Lantern eligibility, isolated sampling, atomic validation/commit, invalid/stale/no-spend matrices, feedback. | 05-04, 05-06, 05-07 |
| RACE-01 | Locked unique roster, captured configurable finish/time, one shared course/clock, setup-to-result tracer. | 05-01, 05-06, 05-07 |
| RACE-02 | Pre-exclusion earned frontier, monotonic fog, actual-ground strict-line exposure, configured cadence and health-pipeline damage. | 05-02, 05-06, 05-07 |
| RACE-03 | Leader camera, fog ribbon, edge markers, warnings, individual health/HUD, themes/motion/mute. | 05-06, 05-07 |
| RACE-04 | Fixed-step hazard/finish/timeout order, true ties, disconnect/reclaim/leave/waiting/death/recovery/last-survivor policy. | 05-02, 05-03, 05-05, 05-06 |
| RACE-05 | Race-only item descriptors/effects and explicit negative eligibility across every unrelated mode/surface. | 05-04, 05-06 |
| RACE-06 | Immutable participant ledger, competition ranks, DNF groups, complete production podium/breakdown. | 05-05, 05-06, 05-07 |
| UI-06 | Contextual fog/item/recovery feedback; mute/reduced-motion controls; muted real built visual proof. | 05-06, 05-07 |

## Architectural Invariants

- One shared world advances exactly once per fixed step, independent of roster size.
- Genuine earned movement is distinct from actual ground position and every forced
  placement. Boundary/accounting use the former; fog/range use the latter.
- Authoritative state settles before UI, audio, camera, rank, or result projection.
- Every command validates seat, lifecycle/context generation, ownership, mode
  eligibility, target state, active clock, and terminal state before mutation.
- Actual death, recovery, disconnect, reclaim, leave, protection, finish, timeout,
  and waiting are disjoint transitions with disjoint economy and feedback.
- Released solo/seed/economy/input/audio contracts and the `a310a81` oracle stay exact.
- Race composes through delivered handlers; it does not replace shared Relay/co-op
  infrastructure or add browser/shell authority.

## Boundary and Security Gates

- Add no dependency, manifest capability, shell code, native controller polling,
  direct network, browser storage, host DOM, signer/relay access, `@napplet/shim`, or
  invented NAP/domain/envelope.
- Validate settings, roster uniqueness/bindings, stable seat/device generations,
  earned provenance, target range/protection, owner context, item charge, result event,
  and terminal state before commit.
- Device output is muted for every automated browser; application audio logic remains
  real and observable.
- Production-object behavior and visible opaque-iframe actions are required. Source
  presence, AST assertions, fabricated callbacks, and test-only product hooks are not
  acceptance evidence.
- No package install occurs; lockfile identity is a blocking exit gate.

## Multi-Source Coverage Audit

### GOAL

| Source item | Status | Coverage |
|-------------|--------|----------|
| Common timed race with fair fog pressure, contextual tactics, and deterministic outcomes | COVERED | 05-01 setup/tracer; 05-02 fog/order; 05-03 lifecycle; 05-04 items; 05-05 results; 05-06/07 runtime/UI/evidence. |

### REQ

| Source item | Status | Coverage |
|-------------|--------|----------|
| ARCH-02 | COVERED | 05-01, 05-06, 05-07 |
| ITEM-06 | COVERED | 05-04, 05-06, 05-07 |
| RACE-01 | COVERED | 05-01, 05-06, 05-07 |
| RACE-02 | COVERED | 05-02, 05-06, 05-07 |
| RACE-03 | COVERED | 05-06, 05-07 |
| RACE-04 | COVERED | 05-02, 05-03, 05-05, 05-06 |
| RACE-05 | COVERED | 05-04, 05-06 |
| RACE-06 | COVERED | 05-05, 05-06, 05-07 |
| UI-06 | COVERED | 05-06, 05-07 |

### RESEARCH

| Source item | Status | Coverage |
|-------------|--------|----------|
| Actual Phase 1–3 API/gate preflight; preserve delivered Relay integration if present | COVERED | Gate 0, 05-01 |
| Validated defaults/settings and no core Race branches | COVERED | 05-01 |
| One post-settlement ordering; pre-exclusion frontier; actual-ground fog/range | COVERED | 05-02 |
| Fatal-before-finish, true same-tick ties, finish-before-timeout, all-down ordinary clock | COVERED | 05-02, 05-05 |
| Monotonic fog, strict line, continuous cadence, normal health/protection semantics | COVERED | 05-02 |
| Explicit lifecycle/reclaim/grace/waiting/last-survivor/personal recovery | COVERED | 05-03 |
| Mud Splash/Fog Lantern policy, isolated versioned sampler, atomic activation | COVERED | 05-04 |
| Explicit Race card/power/pack/common-item deny policy; appearance-only cosmetics | COVERED | 05-04, 05-06 |
| Owner-labelled single hand/market tree and stale-context invalidation | COVERED | 05-06 |
| Append-only stats, immutable competition ranks, unranked DNF | COVERED | 05-05 |
| One camera/edge cues, game material UI, responsive/theme/motion/mute proof | COVERED | 05-06, 05-07 |
| Focused 500/180/fog/item balance playtest with versioned tuning discipline | COVERED | 05-02, 05-07 |

### CONTEXT

| Source item | Status | Coverage |
|-------------|--------|----------|
| D-01 through D-03 | COVERED | 05-01 |
| D-04 and D-05 | COVERED | 05-02 |
| D-06 and D-07 | COVERED | 05-03 |
| D-08 through D-10 | COVERED | 05-04 |
| D-11 | COVERED | 05-06 |
| D-12 | COVERED | 05-05, 05-06, 05-07 |
| D-13 and D-14 | COVERED | 05-06, 05-07 |
| D-15 | COVERED | Every plan gate; 05-07 final evidence |

No source item is missing. Cross-mode presentation consolidation and milestone-wide
coverage/PR work remain assigned to Phases 6–7; they are not used to reduce Race.

## Completion Record

Each summary records the reconciled shipped API names, dependency completion SHAs,
preflight commands, focused test counts, immutable-oracle identity, settings/sampler
versions, muted runtime/visual artifact paths, balance report, conformance skips,
lockfile identity, and external physical-hardware limits. Phase 5 advances only after
every matrix row above has current production evidence.

## Validation Audit 2026-10-16 — completed Nyquist record

Generic-agent workaround applying the full local Nyquist auditor role and validate-phase workflow. The active verify:post hook has nyquist_validation enabled. This is a retrospective evidence audit, not a fresh test execution or phase-completion declaration. Existing plans, summaries, requirement truth mappings, review repairs and terminal logs establish the results below. No source/test edit or mirrored test was necessary.

### Test infrastructure and feedback

Installed Node test runner plus strict-node-tests and muted Playwright opaque frames. Every planned task has an automated behavior command; no three-task verification gap, watch command or missing test-creation obligation remains. Fast model evidence includes independent three-invariant check in0.55s; the browser/layout and inherited gates are deliberately separate slow tiers. Full frozen gates were already executed and are not rerun for this documentation repair.

### Per-task executable map

| Task | Executable verification | Evidence / status |
|---|---|---|
| 05-01-01 | `test -s .planning/phases/01-composable-solo-baseline/01-04-SUMMARY.md && test -s .planning/phases/02-shared-local-session/02-06-SUMMARY.md && test -s .planning/phases/03-survive-together-consumables/03-07-SUMMARY.md && pnpm test:phase3 && node --test tests/race-tracer.mjs && pnpm type-check && pnpm build` | COVERED — 05-01-SUMMARY:55610/42063/11979 and70346exit0;23683 full tracer6/6 |
| 05-01-02 | `node --test --test-name-pattern='settings|unique roster|locked roster|start consumed|late device' tests/race-tracer.mjs && pnpm type-check` | COVERED — 05-01-SUMMARY:55610/42063/11979 and70346exit0;23683 full tracer6/6 |
| 05-01-03 | `node --test tests/mode-authoring.test.mjs tests/race-tracer.mjs && pnpm type-check && pnpm test:guidance` | COVERED — 05-01-SUMMARY:55610/42063/11979 and70346exit0;23683 full tracer6/6 |
| 05-02-01 | `node --test --test-name-pattern='frontier|fog boundary|actual ground|strict line|cadence|health pipeline|permutation' tests/race-ordering.test.mjs && pnpm test:solo-parity` | COVERED — 05-02-SUMMARY:96373exit0; exact selected11/11,8/8, full ordering/balance17/17 |
| 05-02-02 | `node --test --test-name-pattern='fatal before finish|same-tick tie|finish before timeout|all down|last survivor|suspension|terminal immutable' tests/race-ordering.test.mjs` | COVERED — 05-02-SUMMARY:96373exit0; exact selected11/11,8/8, full ordering/balance17/17 |
| 05-02-03 | `node --test tests/race-ordering.test.mjs tests/race-balance.test.mjs && pnpm type-check` | COVERED — 05-02-SUMMARY:96373exit0; exact selected11/11,8/8, full ordering/balance17/17 |
| 05-03-01 | `node --test --test-name-pattern='disconnect|ghost|grace|replacement|reclaim|unknown device|deadline|held input' tests/race-lifecycle.test.mjs && node --test tests/session-input.test.mjs` | COVERED — 05-03-SUMMARY:67761 and5878exit0;51701 affected lifecycle15/15/tracer6/6; no-ahead clarification1/1 |
| 05-03-02 | `node --test tests/race-lifecycle.test.mjs tests/race-ordering.test.mjs && node --test tests/survive-together.test.mjs && pnpm test:death-spill && pnpm type-check` | COVERED — 05-03-SUMMARY:67761 and5878exit0;51701 affected lifecycle15/15/tracer6/6; no-ahead clarification1/1 |
| 05-04-01 | `node --test --test-name-pattern='schema|1:1250|bucket|RNG isolation|default gravity|magnet|contested claim' tests/race-items.test.mjs && node --test tests/consumable-drops.test.mjs tests/consumable-world.test.mjs && pnpm test:solo-parity` | COVERED — 05-04-SUMMARY:51478exit0; exact item/legacy/parity gates |
| 05-04-02 | `node --test tests/race-items.test.mjs tests/consumables.test.mjs tests/survive-economy.test.mjs && pnpm test:market && pnpm test:magnet && pnpm type-check` | COVERED — 05-04-SUMMARY:51478exit0; exact item/legacy/parity gates |
| 05-05-01 | `node --test --test-name-pattern='ledger|statistics|death clear|leave|forfeit|item|fog attempted|captured settings' tests/race-results.test.mjs && node --test tests/race-lifecycle.test.mjs tests/race-items.test.mjs` | COVERED — 05-05-SUMMARY:39500exit0 exact tasks;32571exit0 final UI51/51 and tracer6/6 |
| 05-05-02 | `node --test tests/race-results.test.mjs tests/race-ordering.test.mjs tests/race-lifecycle.test.mjs && pnpm type-check` | COVERED — 05-05-SUMMARY:39500exit0 exact tasks;32571exit0 final UI51/51 and tracer6/6 |
| 05-06-01 | `pnpm build && node --test --test-name-pattern='camera|fog ribbon|edge marker|HUD|audio|reduced motion|mute' tests/race-runtime.mjs && node --test tests/race-ordering.test.mjs tests/race-results.test.mjs && pnpm type-check` | COVERED — 05-06-SUMMARY:38749exit0 all three exact task commands;48236exit0 affected tracer/suffix;35065 is only passing-prefix evidence |
| 05-06-02 | `pnpm build && node --test --test-name-pattern='Viewing P|Race gear|Wardrobe|Mud Splash|Fog Lantern|owner switch|stale target|no legacy' tests/race-runtime.mjs && node --test tests/race-items.test.mjs && pnpm test:market` | COVERED — 05-06-SUMMARY:38749exit0 all three exact task commands;48236exit0 affected tracer/suffix;35065 is only passing-prefix evidence |
| 05-06-03 | `pnpm build && node tests/race-runtime.mjs && node tests/gamepad-runtime.mjs && pnpm test:runtime && pnpm test:solo-parity && pnpm type-check` | COVERED — 05-06-SUMMARY:38749exit0 all three exact task commands;48236exit0 affected tracer/suffix;35065 is only passing-prefix evidence |
| 05-07-01 | `pnpm build && node tests/race-layout.mjs && pnpm type-check` | COVERED — 05-07-SUMMARY:45358exit0 layout2/2;19289exit0 exact Relay6/Race7; later21972 inherited current presentation gate |
| 05-07-02 | `pnpm test:phase3 && node --test tests/race-tracer.mjs tests/race-ordering.test.mjs tests/race-balance.test.mjs tests/race-lifecycle.test.mjs tests/race-items.test.mjs tests/race-results.test.mjs && pnpm type-check && pnpm build && node tests/race-runtime.mjs && node tests/race-layout.mjs && pnpm test:guidance && pnpm test:conformance && git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml` | COVERED — 05-07-SUMMARY:45358exit0 layout2/2;19289exit0 exact Relay6/Race7; later21972 inherited current presentation gate |

### Requirement-to-behavior map

| Requirement | Existing behavioral tests and adversarial assertions | Status |
|---|---|---|
| ARCH-02 | mode-authoring.test.mjs executes the exact documented factory/lifecycle; race-tracer.mjs validates closed settings/roster/world-once and rejects forced finish | COVERED |
| ITEM-06 | race-items.test.mjs actual shared transaction, protected/stale/range rejection and no-waste snapshots; race-runtime.mjs actual collection/purchase/use | COVERED |
| RACE-01 | race-tracer.mjs actual2/3/4-seat setup/start/finish/retry; unknown device and fresh-start no-hop assertions | COVERED |
| RACE-02 | race-ordering.test.mjs strict actual-ground line, pre-exclusion earned frontier, cadence/landed loss and permutations; race-balance.test.mjs generated500/180 courses | COVERED |
| RACE-03 | race-runtime.mjs authoritative camera/fog/edge/HUD; race-layout.mjs six-frame/two-theme matrix; Phase06 full actor-envelope fixes supersede prior geometry | COVERED |
| RACE-04 | race-lifecycle.test.mjs original-seat replacement, actual pre-loss no-ahead,249/250/251, waiting/death/recovery; ordering fatal/tie/timeout; results DNF | COVERED |
| RACE-05 | race-items.test.mjs exact two1:1250 buckets, released RNG future outputs, fractional log collection, typed legacy denial and prior-mode controls | COVERED |
| RACE-06 | race-results.test.mjs authoritative pre-clear statistics, forged metadata rejection, immutable ledger/ranks; race-runtime.mjs actual assigned-controller result paging/retry | COVERED |
| UI-06 | race-runtime.mjs mute/real graph, motion/fallback/feedback; race-layout.mjs420 captured cells; inherited co-op/Relay effects remain in full gate | COVERED |

Current evidence chain:19289exit0 on62f9958 exact Relay/Race logs `/tmp/down-to-duck-05-07-verified-{relay,race}.log`; terminal routing repair86987exit0 on2da5dd9 `/tmp/down-to-duck-05-review-repair-final.log` (73 shared,16 runtime), independent80996 two controller cases plus three invariant checks. Later presentation21972exit0 `/tmp/down-to-duck-06-02-final-frozen-gate.log` reruns both exact canonical blocks with Race76/model-built,16runtime,420layout captures, then health-runtime and cross-mode. Current narrow main/hand repair92241exit0 onb9bc44f `/tmp/down-to-duck-06-review-repair-final.log` covers full31 cross-mode and104 affected shared/mode/solo input paths. These source scopes are combined honestly; no claim that the full canonical gate was rerun after the narrow handler repair. Independent05 verification40/40 and06 verification47/47 corroborate the mapped behaviors.

### Manual evidence and limits

User acceptance was received2026-10-16 and committed in5eb3c46: “I tested it; the presentation feels clear and usable.” It covers Survive/Relay/Race HUD,compact Controls,recovery and results. Root owns formal verification/security closure. Physical controllers and spoken screen-reader output remain unmeasured; injected SDK input and DOM announcement assertions are narrower. Conformance remains5pass/0fail/5unmeasured; Phase07 supplies the separately scoped release conformance/coverage obligations. Nyquist compliance does not claim those future metrics or hardware measurements.

| Audit metric | Count |
|---|---|
| Assigned requirements covered |9/9 |
| Planned tasks with executed automated evidence |17/17 |
| Newly uncovered behavioral gaps |0 |
| Missing compliance-record gaps resolved |1 |
| New tests / rerun tests / source edits |0/0/0 |
| Escalated implementation gaps |0 |

Sign-off: all phase requirements have behavioral verification and all task checks have terminal evidence. No acceptance is inferred from symbol existence or passing-count-only evidence; named assertions and independent truth maps were cross-checked. Historical failed/superseded commands remain in their summaries. Immutable oracle/root lock unchanged. Formal phase closure remains root-owned.
