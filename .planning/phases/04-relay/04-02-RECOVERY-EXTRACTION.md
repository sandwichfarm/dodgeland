# 04-02 shared recovery reconciliation

This is the retained dependency-repair record. Plan 04-02 is now complete; its authoritative final evidence is in `04-02-SUMMARY.md`. Generic executor fallback applies the local GSD executor instructions; typed-agent execution is not claimed.

Entry evidence is unchanged source `e16211f` / documentation `b04b11c`: canonical session 90748 exited 0, full Phase 3 gate plus Relay 12/12, `/tmp/down-to-duck-04-01-final-gate.log`. No entry gate rerun was needed.

## Confirmed dependency gap and authorization

The production regression in `5033f41` makes a charged active runner land on unsupported river at a one-tile boundary. Actual death wins, death economy runs once, the other runner retains its assets, and no revival tile or handoff is awarded. However, no personal offer exists because the offer lifecycle and commit application were private to Survive Together. RED log: `/tmp/down-to-duck-04-02-recovery-reconciliation-red.log`, exit 1.

Root authorized the smallest shared extraction as necessary to the all-mode architecture, with exact Survive preservation, no duplicated recovery semantics, no cooperative market/effect/result installation, and no premature Relay rotation policy. The safe-refactor skill brackets the ownership move with the same production recovery suite.

| Responsibility | Before | Delivered shared seam |
|---|---|---|
| Pure validation and atomic plan commit | `planRecovery`, `commitRecoveryPlan` in recovery.ts | Unchanged |
| Offer creation, eight active seconds, decline/expiry and protection | Private `SurviveTogetherController` methods, session provenance and `declineRecovery` | `SessionRecoveryController.death/pending/tick`; identical session-owned provenance and decline |
| Revalidation and actual recovery application | Private `SurviveTogetherController.recover/apply` | `SessionRecoveryController.recover/apply`, personal-only by default; Survive explicitly opts into personal/revival/flare |
| Safe supported cells | `LocalSession.recoverySafeCells` uses every living roster member | Same planner now uses simulated living participants, so inactive turn-mode seats do not anchor or occupy the active runner's safe return |
| Cooperative ownership and terminal result | Survive attach/death/tick | Remains solely in Survive; shared service installs neither market/effects/consumable world nor results |
| Relay active-seat authority | `RelayCoordinator` | Installs shared personal recovery through death/pending/tick/recover handlers, accepts only active owner; rotation remains 04-03 scope |

## Preservation proof

- Before extraction: `pnpm test:survive-recovery`, session 30415 exit 0, 44/44, `/tmp/down-to-duck-04-02-recovery-pre-extract.log`.
- After ownership extraction `d4ddf2b`: same suite 44/44 plus type-check, session 30551 exit 0, `/tmp/down-to-duck-04-02-recovery-post-extract.log`.
- Six explicit production parity cases compare the shared opt-in service with Survive in Arcade/Flow for accept/decline/expiry, pause freeze, invalid owner, repeated acceptance, personal assets/provenance, and rejection of teammate items without debit. `/tmp/down-to-duck-04-02-recovery-parity.log`, exit 0.
- Relay consumer first exposed safe placement selecting an inactive roster avatar (`x=-2` instead of retained safe `x=0`). The simulated-participant filter fixes the generic turn-mode distinction without a Relay mode-name branch.

The repair gate (session67125) and final canonical gate (session37530) both exited0. `04-02-SUMMARY.md` records the complete boundary/continuity evidence and remaining scope. RELAY-02 and the phase remain open for later plans and independent verification.
