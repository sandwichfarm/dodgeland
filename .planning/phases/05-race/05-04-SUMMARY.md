---
phase: 05-race
plan: 04
status: complete
subsystem: race-items
tags: [consumables, isolated-sampling, atomic-transactions, eligibility]
requires: [05-01, 05-02, 05-03]
provides: [Race common-world pickups, atomic tactical items, captured item schema, appearance-only legacy economy]
affects: [05-05, 05-06, 05-07]
requirements-addressed: [ITEM-06, RACE-05]
tech-stack:
  added: []
  patterns: [validated optional consumable policy, immutable use events, active-clock hop readiness]
key-files:
  created: [src/race-items.ts, tests/race-items.test.mjs, tests/race-items-runtime.mjs]
  modified: [src/consumables.ts, src/consumable-drops.ts, src/session.ts, src/co-op-market.ts, src/game.ts, src/market/types.ts, src/market/run.ts, src/race.ts, src/main.ts, src/render.ts]
completed: 2026-10-16
duration: 30 min
---

# Phase05 Plan04: Common-system Race tactics

Both tasks are complete on source `69efa16`. Mud Splash and Fog Lantern now share the delivered pickup physics, owner inventory, shop wallet transaction and claim/debit ledger. Execution used the authorized generic executor fallback, not a typed GSD agent. Full Race, its owner gear interface and final presentation remain later plans.

## Entry and actual API reconciliation

Entry `575d1d4` retained unchanged production `cfe358f`; accepted51701 plus93033's explicitly passing inherited prefix supplied baseline evidence without a gratuitous rerun. Graph-first discovery fell back to source reads where the graph returned insufficient matches. The concrete missing common item policy was retained RED before extending it with parent authorization.

| Responsibility | Actual delivered/repaired API |
| --- | --- |
| Catalogue/capacity | `validateConsumableCatalogue`, optional catalogue on existing pure credit/debit plans; default Revival/Flare contract preserved. |
| Sampling | Released one-argument `sampleConsumableDrop` remains compatible, including Array.map use. `registerConsumableSchema`, `consumableSchema`, `sampleItemDrop` capture and validate an isolated schema; unknown/changed versions fail closed. Race captures `race-item-schema-1` in its run/result descriptor, bucket0 Mud and bucket1 Lantern out of1250. |
| Pickup world | Optional validated `ConsumableWorldPolicy` composes catalogue/schema/capabilities/eligibility/activation with the existing default gravity, swept contacts, stable-seat arbitration, charge generations and claims. Survive keeps its default recovery adapter; Relay still installs no item world. |
| Activation | `RaceItems.plan` is side-effect-free. `commit` re-enters common `useConsumable`, rechecks participant/device, inventory/owner/lifecycle/Race-context generations, actual ground range, status and protection, then debits and applies the effect synchronously. Immutable common use events carry owner, targets, item, tick/time and sound cue; only success increments itemsUsed. |
| Timing | Generic SessionPlayer hop readiness delays the next hop without changing hop duration/interpolation. Mud applies1.35 for2 active seconds; expiration cannot leave an extra delay after its deadline. Lantern uses existing fog protection for3 active seconds, resets exposure, and does not block ordinary damage. |
| Economy/eligibility | Existing CoOpMarketAdapter reads the installed catalogue and uses RunInventory.spendCoins. Both items cost30 and hold one charge each. Typed ItemAccess/ItemEligibility restrict Race legacy inventory to appearance-only; stock, buy, pack, sale, capacity, modifiers and score-income paths reject denied assets. |
| Feedback | Common pickup metadata supplies the correct name/color/shape. Main consumes each immutable success event once through the existing muted-aware audio path. Full tactical effect visuals and owner interaction pages remain05-05/06. |

## Commits and deviations

- `2fadf37` retained the common-world eligibility RED; `4b826fd` recorded the checkpoint.
- `cfba517` repaired the authorized shared dependency with focused parity proof; see05-04-DEPENDENCY-REPAIR.md.
- `ffd2ba6`, `8c7c9e4`, `b95cbee` retained integration, death-clear and cooldown-expiry regressions.
- `69efa16` delivers both coupled task implementations, including necessary shared economy, renderer and audio integration. The tasks share this product commit because the installed catalogue and activation policy compose together.

Actual death initially left Race charges behind; the mode death handler now clears only that owner's common inventory. Ghosting/departure retain it. Final source review caught a cooldown remainder outliving its effect; the retained RED and bounded readiness fix close that edge. A pickup label initially collided with participant labels in compact frames; final inspected captures have a separate label height. No new dependencies, lockfile edits, oracle repin, native polling, direct networking/storage, product test hooks or preview5175 changes.

## Terminal verification

Authoritative whole-command gate: **session51478 exit0**, `/tmp/down-to-duck-05-04-final-gate.log`; exact script `/tmp/down-to-duck-05-04-final-gate.sh`.

- Exact Task1: selected schema/world/RNG5/5; prior drop/world17/17; immutable solo parity21/21.
- Exact Task2: Race items + consumables + economy33/33 (Race18/18); market62/62; magnet18/18; type-check.
- Full `pnpm test:phase3`, including nested Phase2/1, passes: solo regression272, shared model73, recovery44, Survive browser34, required builds/type/guidance and conformance.
- Combined Relay tracer/boundary/lifecycle/results/runtime plus Race ordering/balance/lifecycle/tracer **116/116**, no skips/failures.
- `node tests/race-items-runtime.mjs` passes actual keyboard collection of both items in the built opaque iframe. Boundary audit reports no page errors, external requests or forbidden APIs. All browsers mute audio.
- Immutable-oracle lockfile diff passes. Conformance remains **5 passed / 0 failed / 5 unmeasured**, not10 passes. Physical controllers remain unmeasured.

Tests exhaust exact buckets and bounded125000-anchor distribution, reordered2/3/4-player sampling and released terrain/denomination/market/mob/spill/audio next-output isolation. Real generated river actors accept fractional log-hop landings. Production transactions cover inclusive±16 actual-ground range, capacity/price, stale identities, wrong devices, protected/ghost/departed/dead participants, repeated effects, death clearing, active-clock suspension and ordinary fog cadence after Lantern expiry.

Earlier focused failures and visual attempts are superseded, not passing gates. Dependency21280 passed41 common/world/recovery tests,62 market and21 solo parity; pre-freeze95978 passed66 plus type; focused98175 passed18 plus type. The initial visual seed search incorrectly assumed row4 could be a safe introductory meadow; the retained runtime instead uses legitimate public row1 seeds and actual input, without injecting world state.

## Inspected built evidence and remaining scope

Final visual command38165 exit0, `/tmp/down-to-duck-05-04-built-final.log`, and canonical51478 repeat: public seeds `ph3-000002dc-pond-s-n` and `ph3-00000658-pond-s-n`. All8 final captures were inspected: `/tmp/race-05-04-{mud-splash,fog-lantern}-{320,900}-{dark,light}.png` (320×560 and900×600). Correct distinct pickups/labels are visible and keyboard collection updates the real owner's charge exactly once.

The existing Race HUD and ready-tip overlap seen in these captures remains part of the planned05-06 presentation work. Owner gear/target UI and detailed result statistics follow the remaining Race plans; full effect feedback, camera/layout and independent integration evidence follow05-06/07. ITEM-06 and RACE-05 remain partial until that full evidence exists. Phase05 is not complete. No active command remains.

Self-check: all named source/test artifacts and commits exist; final gate is terminal; worktree source is clean. GSD requirement readiness returned0/2, so neither full requirement was prematurely completed. State CLI could not parse the custom plan counter and regenerated incorrect1/35 totals; tracking was reconciled to actual4 completed phases and28/31 plans.
