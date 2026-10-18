---
phase: 05-race
plan: 06
status: complete
subsystem: race-runtime
requires: [05-05]
provides: [Race presentation, owned gear UI, production input acceptance]
affects: [05-07]
requirements-addressed: [ARCH-02, ITEM-06, RACE-01, RACE-02, RACE-03, RACE-04, RACE-05, RACE-06, UI-06]
tech-stack:
  added: []
  patterns: [optional presentation projections, shared owner tree, captured item plans]
key-files:
  created: [tests/race-runtime.mjs]
  modified: [src/main.ts, src/race-ui.ts, src/race-ui.css, src/render.ts, src/audio.ts, src/market-ui.ts, src/run-hand.ts, tests/market-game-fixture.mjs, tests/race-tracer.mjs]
completed: 2026-10-16
---

# Phase 05 Plan 06: Race runtime and owned gear

All three tasks are complete on production `2a2bf9a`, with the final tracer expectation reconciled in the subsequent test-only commit. Execution used the authorized generic executor fallback applying the GSD executor workflow; it does not claim typed-agent guarantees. Phase completion remains pending 05-07 and independent verification.

## Entry and actual API reconciliation

Accepted unchanged-source entry evidence was 39500 plus 32571 on production 8d0c595 (tracking HEAD 6928c6c). No redundant baseline ran before edits. Graph-first discovery and actual API reads established:

| Responsibility | Actual integration |
| --- | --- |
| Camera and pressure | `RaceCoordinator.leaderFrontier`, `fogBoundary`, `fogState`, `status` and elapsed time feed an optional generic `SessionPresentation`. Renderer retains legacy defaults and has no Race identifier policy. |
| Item authority | Existing `RaceItems.plan/commit` and common consumable inventory revalidate owner, target, lifecycle, inventory and context. The UI captures plans; it never debits or applies effects itself. |
| Economy and appearance | Existing `CoOpMarketAdapter` remains authoritative. Optional gear descriptors project its typed item IDs into the existing one market/hand tree and appearance-only wardrobe. No new inventory or recovery service. |
| Lifecycle/input | Existing session router, reserved-seat reclaim, personal recovery, lifecycle modal and new-run callback remain authoritative. Modals clear held input and capture owner/context; background owner controls are inert during selection. |
| Feedback | Named generic audio events reuse the existing mute-aware graph. Static fog/leader/effect marks and text accompany sound. System and app reduced motion use the existing renderer preference. |

The market UI previously derived consumable IDs from display names and only knew the legacy catalogue; typed optional descriptors fix both without mode-name branches. Necessary scoped CSS and test-fixture additions support actual runtime layout and read-only renderer observations. Public seed intent delivery after retry remains an injected shell capability, not a product test hook.

## Implementation and retained evidence

- `7067d6f`: retained initial camera/HUD and owner-surface RED.
- `2a2bf9a`: coupled presentation, owner gear, feedback and actual-input runtime integration.
- `3b971e9`: final test-only commit updates the exact old tracer HUD expectation to include `Lead 0 · fog -12`; finish/time, roster, gameplay and fresh-input assertions remain intact.

Race now has a monotonic leader camera, fog band, leader/effect marks, signed edge cues, named participant HUD, separate 100-tile innate and 250-tile personal-revival indicators, contextual lifecycle/pressure/result feedback, and one unmistakably owned gear tree. Mud target selection and Lantern confirmation use captured authoritative plans. Closed-market copy, target contrast, compact seat accessibility and short-market clipping were corrected after inspecting built captures.

The impossible single-run finish-plus-timeout wording is reconciled as successive real runs through **Race again in one uninterrupted app**: same-tick mixed-input tie, fresh replacement reclaim, waiting freeze, timeout, actual traffic death/personal revival, grace forfeiture and deliberate-leave DNF. Separate actual-input scenarios prove acquisitions, transactions, rejection branches, audio/motion and keyboard-only fallback. Browser tests perform no private world/position/wallet writes. Deterministic public seeds and read-only hazard observations guide legitimate input: the purchase run earns market 100 with insufficient funds, then market 200 with 41 coins and buys Mud for exactly 30. A two-drop public seed proves already-lit Lantern rejection by using the first drop before collecting the second.

## Terminal verification

- **38749 exit 0**, `/tmp/down-to-duck-05-06-exact-tasks.log`: all three exact PLAN task commands. Task 1 selected browser **3/3**, ordering/results **35/35**, type/build. Task 2 selected browser **8/8**, items **18/18**, market **62/62**. Task 3 full Race runtime **12/12**, gamepad integration, runtime smoke **10 scenarios / 12 frame-theme / 8 wave checks**, immutable solo **21/21**, type/build.
- **35065 exit 1**, `/tmp/down-to-duck-05-06-final-gate.log`, script `/tmp/down-to-duck-05-06-final-gate.sh`: full nested Phase 3/2/1 passed, including Survive browser **34/34**. The strict Relay/Race group passed **97/100**; its only three failures were the 2/3/4-seat Race tracer's obsolete exact HUD string. This command is **not** reported as a full pass.
- **48236 exit 0**, `/tmp/down-to-duck-05-06-final-tracer-suffix.log`: full affected Race tracer **6/6**, type-check, guidance, conformance and immutable-oracle lockfile diff after the test-only expectation correction. Production did not change after 35065, so its passing prefix remains applicable.

Focused actual-input evidence includes waiting/fresh reclaim/recovery journey 76534, audio/motion/fallback 82689, already-lit Lantern 91187, protected target plus captures 84652, and out-of-range/departed target plus owner isolation 7366 (all exit 0). Their assertions also run in the exact task gate. Earlier route calibration and capture attempts are superseded, not final acceptance evidence. Initial purchase attempts correctly rejected insufficient funds; reaching the next legitimate market supplied the successful transaction.

## Inspected built evidence and limits

Inspected 24 final HUD/gear/target captures at 320×560, 900×600, 1000×280 and 2400×1200 in both themes: `/tmp/race-05-06-contact.png`, file list `/tmp/race-05-06-captures.txt`, individual `/tmp/race-05-06-{dark,light}-*-{hud,gear,target}.png`. Actual item effect captures are `/tmp/race-05-06-{mud-splash,fog-lantern}-effect.png`. Full minimum-size/lifecycle matrix belongs to 05-07. Existing frozen result paging/resize proof is retained by the 35-test ordering/results gate; prior results remain unchanged across retry in the new journey.

Conformance is **5 pass / 0 fail / 5 unmeasured**, not ten passes. Physical controllers remain unmeasured; real injected SDK snapshots provide automated controller evidence. All browsers were device-muted while audio graph observations verified calls, cooldowns and mute. Boundary audits saw no page errors, external requests, native controller polling or direct browser storage/network calls. The existing >500 kB chunk warning remains. No installs, dependencies, lockfile edits, oracle repin or preview 5175 changes. No active executor process remains.

## Remaining scope / self-check

Self-check passed: source/test commits, terminal logs and capture artifacts exist; all executor commands are terminal. 05-07, independent Race verification, final cross-mode UI/audit and PR remain required. Requirement completion is not claimed beyond this plan's evidence; actual progress is four completed phases and 30/31 plans.
