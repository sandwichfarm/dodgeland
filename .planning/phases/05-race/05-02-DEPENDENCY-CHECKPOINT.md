# 05-02 dependency checkpoint

Status: incomplete; zero of three tasks accepted. Generic executor fallback used. Production source remains `67eb0d3`; accepted entry gates `70346` and `23683` remain applicable to unchanged source. No baseline rerun, installation, lockfile change, browser, or preview process occurred.

## Actual retained RED

`node --test tests/race-ordering.test.mjs` exited 1 (immediate terminal tool result, chunk `3b04fd`; no continuing session). Durable log: `/tmp/down-to-duck-05-02-dependency-red.log`. Two tests: one failing policy reproduction, one passing diagnostic.

Two real default Race participants on seed 113 receive no input, placement, terrain, health, clock, or progression injection. After 1,440 ordinary 1/120 fixed steps, both remain at ground 0 with earned/completed distance 0, but both are dead from `wave`; world time is 12 and inherited wave row is 1.2. Initial Race fog must remain at -12 with no earned movement, so neither racer is exposed. This is a shared pursuit dependency, not missing Race cadence arithmetic.

## API reconciliation and smallest repair

| Responsibility | Delivered code | Required repair |
| --- | --- | --- |
| Shared pursuit | `Game.advanceSharedPursuit` advances wave; `finishPlayerUpdate` kills on wave contact or trailing distance. Validated `PursuitStrategy` only permits wave/trail. | An opt-in generic session policy to disable inherited pursuit consistently for world advancement, player collision, safe placement/recovery and presentation while retaining legacy defaults. Race consumes it on the same world; do not fake distant wave rows or switch to trail. |
| Nonfatal named damage | `Game.collideVehicles` privately owns health subtraction, hurt immunity, traffic recoil and callbacks. `Game.end` is terminal, and `DeathCause` excludes fog. A real primary Race call to `end(...,'traffic','rear')` loses all 3 health, proving it is not the requested one-feather transaction. | Extract/reuse one generic seat-bound damage transaction with named cause, amount, immunity/protection, terminal rescue/death and actual landed-loss result. Preserve traffic contact/recoil ordering and stable operation receivers; no direct Race health mutation or fake traffic collision. |
| Progress | `earnedDistance` records accepted new movement before settlement; `completedForwardTiles` is settled only for surviving active players. `beforeDeath` observes pre-clear contributions; retained earned distance survives death. | Continue reconciliation when implementing the ledger; do not yet claim a missing seam or treat spatial world frontier as genuine movement provenance. |

Root instruction explicitly requires a concrete RED checkpoint when shared responsibility is missing. No production fix or Race-local substitute was introduced. Repair must retain solo parity and existing traffic/power/recovery/reentrancy tests, add generic damage/opt-out parity proof, then resume all three 05-02 tasks and exact verification commands. Balance, fog ordering, terminal tests and final gates remain unrun because their implementation is blocked. No completion SUMMARY or requirement completion is claimed. No active process remains.
