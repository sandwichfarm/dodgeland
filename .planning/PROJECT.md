# Down to Duck — local multiplayer

## What This Is

Down to Duck is an existing TypeScript voxel crossing game shipped as a sandboxed
napplet. This milestone adds composable rules and local Survive Together, Relay,
and Race modes while preserving the exact existing solo Arcade/Stroll behavior.

## Core Value

Friends can join and play distinct, readable local modes without making solo play
harder to start or changing its established mechanics.

## Requirements

### Validated baseline

- Existing seeded crossing engine, schema versions 1–3, seven character powers,
  health, mobs, traffic and river platforms at commit `a310a81`.
- Existing market, three-card hand, run wallet/cosmetics, visible coin attraction,
  death spill, sound packs and SDK-backed persistence/input.
- Existing responsive game-styled UI and optional single-controller integration.
- Validated immutable solo mode rules, an executable authoring example, and
  exact solo state/render parity against `a310a81` — verified in Phase 1.

### Active

- [x] Extend composed rules with shared-session and multiplayer lifecycle handlers.
- [x] Shared local session, distinct characters, multiple devices and keyboard bindings.
- [x] Survive Together in Arcade and Flow, dynamic joining/leaving, revival and consumables.
- [x] Configurable Relay with closed roster, turn handoffs and dropout continuity.
- [x] Timed Race with leader-relative feather-damaging fog and contextual items.
- [x] In-game setup, player HUD, inventory, disconnect/reconnect and result/podium screens.
- [ ] Requirement-linked tests, real rendered visual proofs, clean checks and an open PR.

### Out of Scope

- Online multiplayer/network authority: this request is local multiplayer.
- A public user-authored-mode editor: the architecture must support future authoring;
  executable third-party mode downloads are not requested.
- Publishing a napplet event or merging the PR: the requested stop condition is an open PR.

## Context

- Authoritative request: [USER-REQUEST.md](USER-REQUEST.md). Nothing in that request is deferred.
- Brownfield baseline: `a310a81ed6c76df4b265c9012c23b8c83f4802e5` on `main`.
- Work branch: `feat/local-multiplayer`.
- Remote: `git@github.com:sandwichfarm/down-to-duck.git`; GitHub auth and main ref verified.
- Existing Game owns both world and player state; sharing independently-updated
  Game instances would multiply world advancement and cause divergent pickups.
- Existing controller adapter receives multiple pads but chooses one. SDK 0.29.0
  has no gamepad domain export; preserve the existing authorized draft adapter.
- User values tactile game-like menus, large text/buttons, responsive views without
  scrollbars, consistent hand placement, and visual/audio feedback.

## Current State

Phases01–06 are complete. Composable solo parity, shared local sessions, Survive Together, Relay and Race have independent behavioral verification. The user explicitly tested and accepted the multiplayer presentation on2026-10-16; Race and presentation security/validation audits are complete with no open threats or uncovered assigned requirements. Phase07 release evidence is active: calibrated coverage tooling and a real Node tracer pass; browser collection, full coverage floors, durable visual/clause/conformance evidence and an open PR remain outstanding. Existing conformance has5 passing and5 unmeasured checks; physical-controller behavior remains unmeasured.

## Constraints

- **Parity:** no solo tuning, timing, RNG, seed/schema, collision or economy changes.
- **Sandbox:** SDK optional domains; no native controller polling, direct network,
  browser storage or host DOM access in the napplet.
- **Runtime:** one shared world clock; deterministic mode/item streams; no production test hooks.
- **Identity:** preserve published app/storage/shortcut/sound-pack IDs and seed formats.
- **Audio verification:** mute browser output; do not play audio through speakers.
- **Git:** atomic phase commits on the new branch; no secrets, generated builds or local signing config.
- **Completion:** all requested modes and mechanics, tests, inspected visual proofs and PR URL are mandatory.

## Key Decisions

| Decision | Rationale | Status |
|---|---|---|
| Preserve a differential baseline at a310a81 | Existing assertions alone cannot prove 1:1 migration | Required |
| Mode definitions configure reusable mechanics and own lifecycle policy | New modes must compose without spreading branches through UI/input | Required |
| Separate shared world simulation from player state | Traffic/time/pickups must advance once | Required |
| Default 4 players; two keyboard presets plus controllers | Readable local play; capacity remains validated configuration | Provisional, optional user question pending |
| Flow uses current Stroll rules/seed identity | User wording appears to name the existing gentler mode | Provisional, optional user question pending |
| Race default 500 tiles and 180 seconds | Provides both a finish line and clock, configurable | Provisional, optional user question pending |

## Evolution

After every phase, update verified requirements, evidence, decisions and current
state. Preserve the original request and record any unresolved gap explicitly.
Do not mark the milestone complete until the full requirement audit and PR check pass.

---
*Last updated: 2026-10-16 after Phase05/06 user acceptance and audit closure.*
