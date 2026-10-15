---
phase: 02-shared-local-session
status: planned
baseline: "a310a81ed6c76df4b265c9012c23b8c83f4802e5 — immutable original pre-refactor model/render oracle throughout Phase 2"
phase_start_checkpoint: "Record the separate Phase 1 completion SHA in 02-01-SUMMARY.md after reconciling shipped APIs; never repin the immutable oracle"
requirements:
  - ARCH-03
  - INPUT-01
  - INPUT-02
  - INPUT-03
  - INPUT-04
  - INPUT-05
  - INPUT-06
  - UI-01
  - UI-02
---

# Phase 02 Validation Contract

Phase 2 is complete only when the final production bundle runs two to four local players through one shared world/scene with authorized per-device input, usable setup/HUD, and unchanged solo behavior. Source shape alone is insufficient. Model checks must observe real state transitions, and shell/input/UI checks must run in a muted opaque `allow-scripts` iframe.

## Locked Decisions

These stable IDs normalize the locked decisions in `02-CONTEXT.md` and `02-UI-SPEC.md`; every plan action cites the applicable IDs.

| ID | Locked decision |
|----|-----------------|
| D-01 | Default solo remains one action. Local Play is explicit and a second eligible controller may enter the same setup flow. Back to solo restores the prior solo state/focus. |
| D-02 | Setup/HUD uses the reviewed game-like board, compact tokens, runtime themes, reduced motion, 240×240 floor, and no document scroll/masthead/footer. |
| D-03 | Session capacity comes from the definition and defaults to four seats; Start requires at least two valid ready seats. |
| D-04 | Active seats use unique eligible characters plus persistent P-number, marker, character, and device identity across setup/world/HUD/lifecycle. Session selection never overwrites the saved solo traveler. |
| D-05 | Keyboard defaults are W/A/S/D/Q and arrows/Period, editable through a complete conflict-safe SDK-persisted map. Native iframe keys are used; controllers use only the authorized shell snapshot transport. |
| D-06 | Each device/profile owns independent held/action-edge latches. A join/claim edge is consumed and held input must return neutral before gameplay delivery. |
| D-07 | Per-device loss is mode-owned and affects one seat. Blur, hidden document, undersize, and teardown are global safety suspension. Death, disconnect, deliberate leave, and reclaim remain distinct. |
| D-08 | The one shared hand/market DOM has an explicit selected owner. Phase 2 presents the current real economy truthfully and defers real per-player/shared ownership rules to Phase 3. |
| D-09 | Recovery/items, Relay/Survive/Race policies, results, podiums, and later mode-specific economy are reserved for later phases and must not be claimed here. |
| D-10 | Runtime/visual evidence covers 200×160, 240×240, 320×560, 900×600, 1000×280, and 2400×1200; dark/light and reduced motion are included, and every browser run is muted. |
| D-11 | A live solo run can stage shared-session adoption using the same course, clocks, progress, inventory, actors/phases, MobDirector/RNG future state, and primary player. Cancel resumes the unchanged solo owner; commit transfers loop ownership once. Fresh construction remains available for later Relay/Race starts. |

## Evidence Order

### Gate 0 — Phase 1 completion and API reconciliation

Before any Phase 2 production edit:

1. Require non-empty `01-01-SUMMARY.md` through `01-04-SUMMARY.md`.
2. Read those summaries and the actual Phase 1 exports. Record the shipped mode-definition/options/step metadata names and the Phase 1 completion SHA as a separate phase-start checkpoint in `02-01-SUMMARY.md`; plan prose is provisional. The immutable oracle remains original pre-refactor commit `a310a81ed6c76df4b265c9012c23b8c83f4802e5` and must never be repinned to the Phase 1 completion SHA.
3. Run `pnpm test:phase1` and `pnpm test:solo-parity` on the untouched Phase 2 starting point.
4. Stop if a promised Phase 1 contract or exact archived-source/private-state/render comparison is missing. Do not recreate or weaken it in Phase 2.

### Gate 1 — End-to-end tracer and owner extraction

Plan 02-01 proves one explicit Local Play path with two keyboard seats, distinct characters, one SharedWorld tick, two SessionPlayer updates, one scene/camera, and exact solo return. It also stages a progressed solo Game for LocalSession adoption using identical world/player/inventory/actor/RNG objects: cancel is byte/semantic equal, commit transfers loop ownership once, and the next deterministic outputs match an unpromoted control. The first slice establishes aliases without moving private fields. Each later ownership slice must:

- map every moved Game/RunInventory/MobDirector private field in `tests/solo-parity-snapshot.mjs` from archived owner to current semantic owner;
- retain private future-state, RNG, inventory, director, callback-order, and render comparisons;
- add no production parity getter, flag, global, URL path, debug hook, or alternate bundle;
- run the full immutable parity gate before the next slice;
- after renderer extraction, run the same-browser archived-baseline/current exact pixel comparison rather than a current-vs-current or tolerance screenshot.

### Gate 2 — Deterministic model and independent input transports

Plans 02-02, 02-03, and 02-04 may execute in parallel after 02-01 because their files do not overlap except for read-only contracts.

- Model: one world update for one/two/four players; stable seat order; contested reward tie-break; one MobDirector/RNG advance; stable target under roster reorder; per-player death spill/clear; other inventories untouched; disconnect ghost retains inventory; lifecycle/stat records occur after completed state.
- Gamepad: direct production transport→GamepadRouter→LocalSession object composition proves full snapshots, distinct controller indexes, stable leases, disconnect/reconnect, index reuse/new ID, stale generation rejection, join-request consumption, neutral-before-play, and no native Gamepad API. Existing `tests/gamepad-runtime.mjs` remains a transport-only opaque-iframe regression and does not claim `main.ts` integration.
- Keyboard: both default profiles simultaneously; independent held/edge state; app-owned overlapping shortcut suspension/restoration; real native iframe delivery; complete editor validation; duplicate rejection; SDK storage/fallback; exact reset confirmation; focus/latch cleanup.
- Character calls: Q/Period and controller calls resolve stable seat IDs to assigned SessionPlayer cues with independent edges/cooldowns. Model and muted built-iframe evidence uses a different saved solo traveler, simultaneous calls, and held/join/reclaim cases through real production audio invocations.

Each plan reruns `pnpm test:solo-parity`; any owner move also updates the test-side semantic adapter before that run.

### Gate 3 — Integrated setup, HUD, and visual matrix

Plan 02-05 owns the first production `main.ts` GamepadRouter integration and creates `tests/local-session-gamepad-runtime.mjs`. Its muted built-iframe proof must drive both authorized snapshot paths through main's subscription/frame update, consume second-controller entry, move two visible controller-owned SessionPlayers independently, disconnect/reclaim one without pausing the other, and dispose one subscription. The broader runtime scenario also covers explicit entry, progressed-solo adoption (unchanged cancel and identity-preserving commit), capacity-derived four-seat board, unique characters, mixed devices, readiness, Start, one shared run, global suspension, binding edit/reset, cancel/end, and default solo return.

The layout report must record muted screenshots and assertions for:

| Frame | Required evidence |
|-------|-------------------|
| 200×160 | Existing concise below-minimum notice only; no clipped interactive setup. |
| 240×240 | Minimum usable setup/run surface; primary actions reachable; no horizontal document overflow. |
| 320×560 | Compact selected full HUD tile plus persistent identity chips; editor/reset usable. |
| 900×600 | Regular 2×2 seat/HUD hierarchy, one visible shared canvas, complete identity. |
| 1000×280 | Short-wide canvas and primary setup/run actions remain visible without a scroll trap. |
| 2400×1200 | Full-screen surface scales without a max-width web-page column or detached HUD. |

Run dark and light runtime themes and reduced motion. Verify marker + P-number + character identity, non-color disconnect/status cues, focus visibility, 44px primary touch targets, real health/power/stat values, and visibly unavailable non-interactive `Revive —` / `Item —` fields.

`tests/session-labels-render.test.mjs` adds a browser render-unit check using native Canvas text metrics: two/four initial and co-located travelers at five supported sizes must retain separate complete labels, stay in frame, and keep placement stable when roster order reverses. This source-render check complements the built-iframe screenshots; it does not replace main/router integration or the immutable solo pixel oracle.

### Gate 4 — Shared owner and final phase proof

Plan 02-06 proves that `Viewing P{n} · {character}` controls one market/hand DOM tree and switching owner invalidates selected card/offer, pack draft, purchase target, pending confirmation, and stale focus before rendering the next view. The display must state the actual Phase 2 economy source and claim no Phase 3 mechanic.

`tests/local-session-owner-layout.mjs` separately exercises four distinct real inventories with colliding local card IDs through the existing market and hand trees. It checks owner switching inside an open market, actual card inspection, read-only mutation guards, six required sizes in both themes, reduced motion, complete owner labels, 44px owner targets, hit testing and absence of scrolling. Its JSON and muted screenshots are written to `artifacts/local-session-owner-*`. Failures remain failures until the production layout and continuity are corrected.

Then run the complete final bundle gate:

```bash
pnpm test:phase2
```

This script type-checks/builds first, runs `test:phase1` (which includes immutable solo parity), then `test:local-session-model` and `test:local-session-ui`, the legacy controller runtime, guidance, conformance and the lockfile check. The model script includes `local-session`, `session-world`, `session-player`, `session-lifecycle`, `gamepad`, `session-input` and `keyboard-input`. The UI script runs each browser file sequentially: setup component, tracer, keyboard runtime, mixed-session runtime, both controller transports, assigned audio, progressed adoption and the full layout matrix. Both groups use the existing strict runner, rejecting empty evidence, skips, TODOs, failures and cancellations. The UI subgroup expects a fresh build; the full phase script supplies it. A green subgroup does not establish phase completion.

The full script also runs `tests/render.test.mjs` through the strict runner immediately after Phase 1. Its independently archived/current exact pixel comparison is mandatory: the Phase 1 model/regression package scripts alone do not include that renderer oracle. The UI subgroup additionally includes the session-label render-unit test described above.

The complete phase script also includes `pnpm test:runtime`, the actual Paja opaque-iframe solo smoke gate required by Plan06 Task1. Its default solo entry, menu, input, theme and wave checks must remain present alongside the session-specific fixtures.

Lockfile integrity compares the working tree against immutable baseline `a310a81ed6c76df4b265c9012c23b8c83f4802e5`, so a committed lockfile change cannot disappear from this check merely because the worktree is clean.

Read every report. A skipped conformance evidence row remains skipped and must be named in `02-06-SUMMARY.md`. Deterministic injected shell snapshots prove transport logic; a physical-controller check may remain an explicitly recorded external limitation, but it cannot replace the automated transport proof.

## Requirement Evidence Matrix

| Requirement | Planned evidence | Owning plans |
|-------------|------------------|--------------|
| ARCH-03 | SharedWorld owns course/time/RNG/rewards/mobs/camera; SessionPlayer owns character/movement/health/power/inventory/stats; one fixed tick advances world once and players in stable order; Game solo facade remains exact and can transfer the same live owners into LocalSession. | 02-01, 02-02, 02-05 |
| INPUT-01 | Full authorized shell gamepad snapshots preserve per-index identity and stable seat lease across reconnect/index reuse. | 02-03, 02-05 |
| INPUT-02 | A second eligible controller edge enters/claims setup and is consumed before gameplay. | 02-01, 02-03, 02-05 |
| INPUT-03 | Two native keyboard profiles work simultaneously and can be inspected/edited/reset. | 02-04, 02-05 |
| INPUT-04 | Independent per-device/profile held/action-edge latches and neutral-before-input prevent cross-player release/repeat. | 02-03, 02-04, 02-05 |
| INPUT-05 | Setup reports device identity/status, rejects duplicate leases, supports disconnect/reclaim/leave, and exposes explicit shared UI owner identity. | 02-02, 02-03, 02-05, 02-06 |
| INPUT-06 | Global focus/visibility/undersize/teardown clear all latches; per-device disconnect remains a separate mode lifecycle event. | 02-03, 02-04, 02-05 |
| UI-01 | Explicit/second-controller Local Play, capacity-derived seat cards, unique characters/devices, readiness, editor/reset, Start, Back to solo, and owner toolbar work through the iframe. | 02-01, 02-04, 02-05, 02-06 |
| UI-02 | One scene draws all characters with identity labels and responsive identity-matched HUD/market presentation across the exact visual matrix. | 02-01, 02-02, 02-05, 02-06 |

## Architectural Invariants

- There is exactly one world clock/course/row set/world RNG/reward set/MobDirector/retention/camera authority per LocalSession.
- One fixed step captures a common world frame, advances world state once, advances participating players in stable seat order, arbitrates claims/impacts, then publishes completed lifecycle/render state.
- Player-array order cannot decide contested pickup or target ties; collision time, distance, then stable seat ID does.
- `Game` is the one-player facade over the same production path. Existing constructors, seeds, callbacks, storage, sound, renderer, and main caller behavior remain exact.
- Test-side parity adapters follow moved owners without dropping any archived private field. Production has no parity-only observability surface.
- Live solo promotion is staged over identical world/player objects: cancel resumes the untouched Game, commit transfers loop ownership once, and no course/RNG/actor/inventory reconstruction occurs. Fresh LocalSession construction remains a separate path for later configured starts.
- A fatal player uses existing spill-before-clear behavior on that player's wallet/cards/cosmetics. Other players retain inventories. A disconnect retains inventory because it is not death.
- Device loss, reclaim, deliberate departure, player death, and global safety suspension are distinct state transitions. Phase 2 reports mode-owned events without choosing a later mode result.
- One canvas/scene/camera renders all actual character models. HUD and shared UI repeat stable identity; no split-screen/per-player market clone is introduced.

## Boundary and Security Gates

- Napplet code adds no shell implementation, host DOM access, signer/relay/cookie/service-worker access, direct fetch/WebSocket/EventSource, `@napplet/shim`, browser local/session storage, native Gamepad API, invented NAP name/domain/number/envelope, or unnecessary manifest requirement.
- Gamepad data enters only through the already-authorized full-snapshot shell transport; native keyboard data remains inside the iframe.
- App closes only shortcut handles it owns and restores them idempotently.
- Malformed/stale snapshots, duplicate leases/bindings, stale owner targets, and repeated teardown cannot mutate the wrong seat or leave held input alive.
- No package is installed and `pnpm-lock.yaml` is unchanged. The package legitimacy checkpoint is therefore not applicable.

## Multi-Source Coverage Audit

### GOAL

| Source item | Status | Coverage |
|-------------|--------|----------|
| Two to four local players can share one world/scene with separate characters and controls while existing solo behavior remains exact. | COVERED | 02-01/02 establish the shared model and facade; 02-03/04 input; 02-05 usable session; 02-06 final gate. |

### REQ

| Source item | Status | Coverage |
|-------------|--------|----------|
| ARCH-03 | COVERED | 02-01, 02-02, 02-05 |
| INPUT-01 | COVERED | 02-03, 02-05 |
| INPUT-02 | COVERED | 02-01, 02-03, 02-05 |
| INPUT-03 | COVERED | 02-04, 02-05 |
| INPUT-04 | COVERED | 02-03, 02-04, 02-05 |
| INPUT-05 | COVERED | 02-02, 02-03, 02-05, 02-06 |
| INPUT-06 | COVERED | 02-03, 02-04, 02-05 |
| UI-01 | COVERED | 02-01, 02-04, 02-05, 02-06 |
| UI-02 | COVERED | 02-01, 02-02, 02-05, 02-06 |

### RESEARCH

| Source item | Status | Coverage |
|-------------|--------|----------|
| Final Phase 1 API/summary reconciliation, separate completion checkpoint, and immutable private/render parity pinned to `a310a81ed6c76df4b265c9012c23b8c83f4802e5` | COVERED | Gate 0, 02-01, final gate |
| SharedWorld/SessionPlayer ownership and once-only deterministic tick order | COVERED | 02-01, 02-02 |
| Stable pickup/mob/camera/retention policies | COVERED | 02-01, 02-02 |
| Live solo state adoption without replay/reset and separate fresh-run construction | COVERED | 02-01, 02-05, final gate |
| Player-specific death spill/clear; teammate and disconnect-ghost inventory preservation | COVERED | 02-02 |
| Full-snapshot shell controller leases, index reuse, generation/focus handling | COVERED | 02-03 |
| Native two-profile keyboard, shortcut arbitration, SDK persistence/conflict/reset | COVERED | 02-04 |
| One-scene multi-character render, setup/HUD visual/runtime matrix | COVERED | 02-01, 02-05 |
| Explicit shared hand/market owner with truthful current economy | COVERED | 02-06 |
| Napplet package/protocol/storage/network boundaries and no dependency install | COVERED | Every plan threat/boundary gate |

### CONTEXT

| Source item | Status | Coverage |
|-------------|--------|----------|
| D-01 | COVERED | 02-01, 02-05 |
| D-02 | COVERED | 02-04, 02-05 |
| D-03 | COVERED | 02-01, 02-05 |
| D-04 | COVERED | 02-01, 02-05, 02-06 |
| D-05 | COVERED | 02-03, 02-04, 02-05 |
| D-06 | COVERED | 02-01, 02-03, 02-04, 02-05 |
| D-07 | COVERED | 02-01, 02-02, 02-03, 02-04, 02-05 |
| D-08 | COVERED | 02-06 |
| D-09 | COVERED | Boundary checks in 02-02, 02-05, 02-06 |
| D-10 | COVERED | 02-01 muted pixel gate; 02-03/04 runtime; 02-05 matrix; 02-06 final gate |
| D-11 | COVERED | 02-01 staged adoption seam; 02-05 integrated cancel/commit; 02-06 final runtime gate |

No source item is missing. Deferred later-mode mechanics are excluded below rather than silently reduced.

## Explicit Phase Boundary

Phase 2 does not implement 250-tile self-revival, teammate recovery, revival inventory/items, per-player or shared market economy policy, Relay/Survive/Race results, podiums, track/world selection, results celebration, analytics, accessibility settings expansion, or new NAP/network/storage surfaces. The setup/HUD may reserve reviewed unavailable cues, and LocalSession may emit neutral lifecycle/stat facts, but no UI or source/test name may claim these later behaviors exist.

## Completion Record

Each plan summary records exact commands, outputs, browser artifacts, warnings/skips, actual shipped API names, and parity field coverage. `02-06-SUMMARY.md` links the final reports and states whether a physical-controller manual check was performed. The phase may advance only when every automated row above passes and any skipped external evidence remains explicitly visible.
