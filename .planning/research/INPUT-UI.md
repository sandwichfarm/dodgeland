# Multiplayer input and presentation research

Inspected 2026-10-14 on `feat/local-multiplayer`. Read-only discovery used the codebase graph first, followed by current source and installed package declarations. This document records evidence and recommendations; no product or test changes were made during research.

## Current seams

| Surface | Current evidence | Extension point |
| --- | --- | --- |
| Controller transport | `src/gamepad.ts:47–69` validates complete snapshots with up to 16 pads; `:160–205` owns subscription, focus and teardown. | Keep transport/validation separate from a new per-device policy. |
| Controller policy | `src/gamepad.ts:85–152` selects one stable lowest-index standard pad; action callbacks omit device identity. | Maintain a latch, context and repeat schedule per controller index. Report activity, disconnect and reconnect separately. |
| Action routing | `src/main.ts:105–125` binds controllers to one set of callbacks; `:343–381` routes every input through the active modal or single game. | Player-aware action dispatch, with an explicit modal owner. Preserve existing solo wrappers. |
| Simulation loop | `src/main.ts:398–410` updates one game at 120 Hz, then renders once. | One session clock, one world draw, multiple participant actor submissions. |
| Camera and boundary | `src/render.ts:217–235` follows `game.maxY` and draws one arcade wave. | Mode presentation supplies camera target and hazard boundary. Race needs leader-relative fog, visually distinct from the lethal wave. |
| Actor rendering | `src/render.ts:313+` reads one position, hop, rescue, inventory, health flash and death state. | Extract the actor submission without altering solo calculations; submit every actor before the common depth sort. |
| HUD | `src/main.ts:251–315` draws one score, wallet, health and power; `:46` creates three feather SVGs. | Permanent seat/character identification and per-player health, revival and item status; one clearly owned detailed hand. |
| Market and hand | `src/market-ui.ts:11` and `src/run-hand.ts:16` use `getRun` callbacks. | Reuse one board for a selected owner. Owner changes must clear stale selection/draft references. |
| End menus | `src/run-menu.ts:5` has a single-traveler result snapshot. | Mode-specific result/podium presentation and per-player breakdown, with bounded detail pages on small screens. |
| Character choice | `src/collection-ui.ts:10,27` uses profile selection and lifetime unlocks. | Session roster with unique character assignments; guest changes should not overwrite the host preference. |
| Design system | `src/game-ui.css` supplies Lilita One, wood/paper colors, modal tint and 44px targets; `src/hand-layout.css` reserves the persistent hand shelf. | Reuse these materials and layout rules for setup, controls, disconnect and results. |

## Input behavior worth preserving exactly

- Context changes release carried-over input. Start+A cannot pause and then hop in the same snapshot.
- Stick activation/release thresholds are 0.5/0.3. Direction repeat starts after 280ms and then repeats every 160ms, at most once per frame.
- Standard mapping is required; unknown mappings are not guessed.
- Focus regain, reconnect and context changes seed current held input rather than treating it as a fresh press.
- New multi-controller detection should observe deliberate activity on all pads without turning the join press into an unintended gameplay or confirmation action.

## Main-loop and UI integration risks

`suspendPlay()` closes market/hand and pauses the game. Today any controller disconnect invokes it, as do browser blur, hidden document and an undersized frame. Split **device disconnect** from whole-frame loss: the mode handles the former, while frame loss keeps a global safety policy.

Market, hand and collection callbacks currently pause or resume actual simulation. Race needs an explicit menu policy and modal owner; blindly reusing these hooks could stop opponents or the race clock unexpectedly. The session must decide this centrally rather than through conditionals distributed among controls.

`readyPreview()` calls `game.setCharacter(progress.selected)`, including after storage hydration. Session participants must not be overwritten by profile hydration or collection changes. `renderer.draw(game, progress.selected, dt)` also takes the profile selection rather than the actor's actual character; multiplayer must render participant identities.

The current menu factories use global DOM IDs and one focus cursor. Reusing them for a selected player is smaller and safer than mounting duplicate copies with colliding IDs. Multiple players still need clear ownership and an explicit way to switch the inspected hand or purchaser.

## Installed SDK and runtime facts

- Installed `@napplet/sdk` is **0.29.0** and its declarations export no gamepad helper. `docs/gamepad.md` still says 0.24.4, so that version sentence is stale.
- The existing gamepad adapter is an explicitly authorized temporary bridge to NAP-GAMEPAD draft PR #108, pinned in source/docs to `0b28f77e3dfa0f07dd7c0f9d61a7090ee99f3a5e`.
- A complete injected binding supplies `available`, `focused`, `getGamepads()` and `onChange()`. A marker-only exposed gamepad domain uses the draft's `gamepad.subscribe`, `gamepad.state`, and `gamepad.unsubscribe` messages.
- Missing gamepad domain means no probing or subscription. The app never calls native controller APIs or installs a runtime global. Device permissions and focus belong to the shell.
- “Always listen” can mean processing every shell-delivered pad while this napplet receives focused input. It cannot mean bypassing the shell's focus/permission decisions.
- `docs/gamepad.md` records that the inspected local Paja/Kehto did not implement NAP-GAMEPAD. The canonical fixture proves napplet integration, not physical hardware or support in that shell. Recheck the actual target runtime before making a broader claim.
- Installed `@napplet/nap` 0.33.0 `keys/types.d.ts` defines `defaultKey` as a suggestion the shell **MAY ignore**. `keys.register()` returns the actual optional binding. There is no force-rebind/set-binding operation or key-up action callback.

A keyboard setup GUI cannot promise to alter shell bindings by merely registering a different default. App-owned split-keyboard routing can use ordinary keyboard gestures within the iframe, with careful suppression/deduplication of existing SDK actions; alternatively a shell-backed implementation must show actual assigned bindings and their limitations. Do not invent private NAP messages or reach into the host DOM.

## Recommended input composition

1. Keep the existing transport and validated full snapshots independent of player policy.
2. Track activity, previous buttons, context and repeat timing per device.
3. Map controller indices and keyboard seats to stable session player IDs.
4. Route join, leave, reconnect and disconnect through mode handlers.
5. Let one UI router own modal focus and active player inspection/purchasing.
6. Preserve the ordinary solo start/hop path. Reveal multiplayer setup after additional deliberate device activity or an explicit local-play action.

## Existing verification assets

- `tests/gamepad.test.mjs`: snapshot parser, bridge variants, absent domain, hardware mappings, stick hysteresis, held repeat, context/focus seeding and teardown.
- `tests/gamepad-runtime.mjs`: unchanged production artifact in an opaque `allow-scripts` iframe, both draft bridge paths, gameplay actions, collection and pause navigation, focus/disconnect/reconnect and fallback controls. **It currently calls `chromium.launch()` without `--mute-audio`, returns null saved progress and deliberately plays character calls. Add silent browser launch before running it.**
- `tests/market-game-fixture.mjs`: reusable silent Chromium fixture, muted saved preferences, actual SDK registration/storage/theme shapes, deterministic browser clock, and debugger staging without production test hooks.
- `tests/hud-game-layout.mjs`, `tests/run-hand-runtime.mjs`, `tests/pause-game-layout.mjs`, `tests/run-menu-layout.mjs`, and `tests/collection-game-layout.mjs`: frame/theme matrices, actual hit targets, minimum target sizes, no scroll regions, persistent hand position and visual artifacts.

## Recommended additional test matrix

| Layer | Required scenarios |
| --- | --- |
| Device policy | Two independent active pads; idle additional pad does not join; activity across buttons/sticks; join press consumed; per-pad repeat; controller index stability; malformed snapshots clear holds; unknown mappings; capacity handling. |
| Focus/lifecycle | Reconnect held input, whole-frame blur/visibility, mode-specific drop-out, missing gamepad domain, both draft transport paths, teardown with several devices. |
| Keyboard | Default shared-keyboard seats, simultaneous independent directions, per-seat action mapping, conflicting bindings, actual rebind behavior, persistence through SDK storage, capture-field isolation, no double dispatch from shell actions. |
| Session UI | Deliberate multiplayer entry without disturbing solo, unique character assignment, clear player/device ownership, mode setup, Relay locked roster, drop-in while hopping/on a log/in a market, active-player hand selection. |
| Mode presentation | Survive health/revival/team status; Relay active baton and distance-to-handoff; Race clock/rank/leader-relative fog/feather drain; clear disconnect or ghost state. |
| Inventory UI | Correct purchaser and wallet, consumable display/activation, per-player cards/cosmetics, stale selection after owner change, pack replacement and skipping, sell without leaving current page. |
| Result UI | Each mode's podium and per-character metrics, meaningful ties/drop-outs, retry/setup actions, seed copying. |
| Visual proof | Dark/light themes, reduced motion, 200×160 notice, 240×240, 320×560, mobile portrait/landscape, 900×600, full-screen; readable player labels, no scrolling, hit-tested 44px controls, actor depth/occlusion, fog visibility and podium screenshots. |

Use real production artifacts for integration/visual evidence. Mocks establish callback contracts, not proof that actual controllers or a specific shell work. Keep every browser run silent.
