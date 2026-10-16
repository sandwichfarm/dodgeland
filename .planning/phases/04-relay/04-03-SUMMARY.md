---
phase: 04-relay
plan: 03
subsystem: gameplay
tags: [relay, lifecycle, device-leases, recovery, browser-tests]
status: complete
tasks_completed: 2
tasks_total: 2
requires:
  - phase: 04-02
    provides: Settled Relay boundaries and shared personal recovery transactions
provides:
  - Mode-owned disconnect, original reclaim, confirmed skip and departure transitions
  - Personal recovery priority, explicit waiting and idempotent terminal settlement
  - Built lifecycle boards with fresh input, responsive and contrast evidence
requirements-completed: []
requirements-partial: [RELAY-03, RELAY-04]
affects: [04-04, 04-05, 04-06, race]
tech-stack:
  added: []
  patterns: [generation-bound commands, opt-in lifecycle guards, separate attachment and life state]
key-files:
  created: [tests/relay-lifecycle.test.mjs]
  modified: [src/relay.ts, src/relay-ui.ts, src/session.ts, src/session-input.ts, src/main.ts, src/session-ui.css, tests/relay-boundary.test.mjs]
key-decisions:
  - Preserve generic lease checks and original Relay devices before lifecycle mutation.
  - Freeze active loss; inactive loss only changes availability for later rotation.
  - Resolve personal death offers before skip; explicit owner departure remains a separate confirmed action.
  - Cancel stale skip prompts on reclaim and preserve underlying handoff/recovery when a modal actor disconnects.
duration: 31 min
completed: 2026-10-15
coverage:
  - deliverable: Relay lifecycle and recovery transition matrix
    verification:
      - kind: test
        ref: tests/relay-lifecycle.test.mjs
        status: pass
    human_judgment: false
  - deliverable: Responsive lifecycle actions and original input ownership
    verification:
      - kind: test
        ref: tests/relay-lifecycle.test.mjs
        status: pass
    human_judgment: true
  - deliverable: Preservation of solo and shared cooperative behavior
    verification:
      - kind: command
        ref: pnpm test:phase3
        status: pass
    human_judgment: false
---

# Phase 04 Plan 03: Relay lifecycle and recovery Summary

Relay now distinguishes controller attachment, permanent departure and actual death, with fresh original-seat reclaim, confirmed skip/leave, recovery-first rotation, explicit waiting and one terminal settlement.

## Execution and API reconciliation

Generic executor fallback applied the full local GSD executor instructions and execute-plan workflow using the inherited default model. Typed dispatch had remained pending_init and was canceled; no typed-agent guarantee is claimed. Existing napplet skill/boundary instructions were retained. No installation was performed because the session explicitly forbids installs.

Accepted entry source `31d992c`, summary `e3c6cf4` and tracking `e009e5a` were unchanged from canonical session37530, exit0, `/tmp/down-to-duck-04-02-final-gate.log`. That evidence was reused without a pre-edit rerun. Graph-first discovery was attempted for `Users-sandwich-Develop-crossy-road-clone`; the MCP project was unavailable/not indexed, so actual source inspection supplied the documented fallback.

| Responsibility | Actual contract and implementation decision |
|---|---|
| Device authority | `GamepadRouter` retains index, sanitized controller ID and epoch leases. New read-only `canReclaim` preflights those existing checks before session mutation; `reclaim` still performs the existing assignment. Changed-index same-ID and strangers cannot claim an original slot. |
| Participant lifecycle | Optional `SessionModeHandlers.canLifecycle` runs before mutation while existing generic participation/duplicate-device checks remain. Undefined hooks preserve prior defaults. Relay validates frozen seat/device identity and rejects terminal events. |
| Reclaim position | Opt-in `preserveReclaimPosition` keeps Relay's exact frozen hop or pending handoff. Existing Survive reclaim relocation remains the default. No participant, inventory grant or personal-progress credit is created. |
| Departure archive | Optional `archiveContribution` snapshots contribution without releasing the closed roster. Existing `releaseSeat` consumers retain their behavior. Relay closes its current outcome as Left without another death or asset transaction. |
| Rotation placement | `transferPosition` delegates to generic `placeTurnPosition`; the latter reuses the safe-cell predicate and non-crediting spatial/provenance floors. Death/departure rotation can use a validated retained anchor or safe retained terrain without generating a new world. |
| Personal recovery | `SessionRecoveryController` remains the sole offer/expiry/return implementation. Relay gates ownership and rotation; no recovery/economy duplicate was added. Disconnected dead owners freeze their existing offer until original reclaim. |
| Confirmation authority | Immutable participant/revision/lifecycle tokens bind skip, leave and rendered actions. Reclaim cancels an obsolete skip prompt; actor loss cancels its prompt and preserves the underlying running/handoff/recovery state. |
| Presentation and routing | One authoritative Relay phase selects the board. Native keyboard, shell controller and pointer actions call the same coordinator; context changes seed held-input latches. Recovery keyboard confirmation belongs to the dead active owner. |

## Delivered behavior

- Inactive loss keeps the active runner and world live, retains the original participant's assets and contribution, and bypasses that seat on later rotation. Active loss freezes world/actor time with no timeout, death or automatic skip.
- Original fresh reclaim preserves identity, character, assets and pending movement. Unknown devices, changed slots and stale epochs fail; held reconnect/confirmation input cannot hop. Roster admission remains closed.
- Connected eligible runners can request and explicitly confirm a skip; cancel changes no assets. The skipped original remains reserved. All disconnected originals wait without advancing time, and reclaim resumes or selects the next frozen-order runner.
- Confirmed departure retains immutable contribution and permanently disables the original seat. It rotates to an eligible runner, waits when originals remain reclaimable, or records `no-eligible-runner` once. Late device/lifecycle/input events cannot change the terminal result.
- Actual production death invokes the delivered spill/clear transaction once, affects only the dead owner and offers personal recovery before rotation. Accept resumes the same owner with delivered protection; decline or eight active seconds closes Dead and rotates/settles. Pause and disconnected recovery freeze the offer clock.
- Another player cannot skip an unsettled dead owner's offer. The connected dead owner can instead deliberately choose Leave Relay, cancel with Keep playing, or confirm permanent departure; this cancels only the pending offer and does not create another death/clear/refund/transfer.

## Commits and RED/GREEN evidence

1. `520738e` — Initial eight production lifecycle regressions retained RED before implementation.
2. `30f5514` — Cohesive lifecycle coordinator, optional shared seams, original lease preflight and visible board/input wiring.
3. `f05165c` — Built recovery tests and shared pause/resume guard repair; the paused death-spill animation must not prevent session resume.
4. `ef2ec8e` — Retained RED showing another player could skip a disconnected dead owner's still-valid offer.
5. `5f29991` — Retained RED for reclaim during skip confirmation, disconnect during a leave prompt over handoff, and explicit dead-owner departure.
6. `f673e4f` — Recovery priority, nested prompt invalidation, explicit recovery departure and owner-correct keyboard confirmation; final source.

The initial fixture used an invalid character and was corrected before the retained initial RED. One early expiry fixture paused only the dead primary game, not the session; its corrected actual SDK pause path exposed the real resume guard defect. The first contrast helper misparsed modern computed CSS colors; using the existing canvas color-conversion approach fixed that test defect without a visual product change. These are not claimed as product failures.

## Verification

Final canonical session **37049 reached exit0** on committed source `f673e4f`, with the whole-command log at `/tmp/down-to-duck-04-03-final-complete-gate.log`:

```sh
node --test tests/relay-tracer.mjs tests/relay-boundary.test.mjs tests/relay-lifecycle.test.mjs && pnpm type-check && node --test tests/relay-lifecycle.test.mjs && node --test tests/survive-together.test.mjs && pnpm type-check && pnpm test:phase3 && node tests/strict-node-tests.mjs tests/relay-tracer.mjs tests/relay-boundary.test.mjs tests/relay-lifecycle.test.mjs tests/session-recovery.test.mjs
```

- Exact Task1: **50/50** plus type-check. Exact Task2: lifecycle **22/22**, Survive model **7/7**, type-check.
- Complete inherited Phase2/Phase3 chain: pinned solo parity **21**, solo regressions **271**, shared model **73**, recovery **44**, final Survive browser group **34**, plus all other configured runtime/layout/economy/item/death checks and build/type/guidance/lockfile gates.
- Final strict Relay/recovery group: **56/56**, zero failures/skips/todos (tracer12, boundary16, lifecycle22, shared recovery6).
- Conformance remains **5 passed / 0 failed / 5 unmeasured**, not ten passes. Physical controllers remain unmeasured; shell snapshot/browser routing is measured.

Additional durable evidence: initial `/tmp/down-to-duck-04-03-lifecycle-red.log`; offer-priority and nested-prompt RED logs `...-offer-priority-red.log` and `...-cross-product-red.log`; exact earlier task gates `...-task-gates.log`; final focused build/lifecycle22/type `...-cross-product-ui.log` (session32030 exit0). Earlier session29568 was deliberately canceled, terminal exit143, after source review found the offer-priority combinations. Its `/tmp/down-to-duck-04-03-final-gate.log` is **superseded**, not completion evidence.

Built opaque `allow-scripts` iframe tests use actual production objects through the existing test-side CDP fixture for controlled death/pause, and real visible controls/keyboard/controller snapshots for actions. Every browser is muted. There are **74 lifecycle captures** at `/tmp/relay-lifecycle-{disconnected,skip,reclaim,leave,ended,waiting,recovery}-{width}x{height}-{dark,light}.png`: five supported frames (240×240,320×560,900×600,1000×280,2400×1200) and the 200×160 minimum-size notice for waiting/recovery. Controls are checked for 44px targets, viewport/ancestor clipping, overlay hit-test visibility and text contrast of at least4.5:1 where applicable. Waiting has no invented action. Representative captures for every board, both themes and all frame classes were visually inspected before the final gate, including updated recovery240×240/light and1000×280/dark, waiting240×240/light, reclaim240×240/dark and2400×1200/light. An initially occluded reclaim overlay was fixed with a scoped stacking rule; final captures supersede that early rendering.

## Deviations and boundaries

**Rule2, necessary shared seams:** Added opt-in pre-mutation lifecycle policy, exact-position reclaim, contribution archive and safe non-crediting turn placement to the shared session, plus lease preflight to the router. These implement the plan's original-seat/terminal/leave contracts while preserving legacy defaults; the full inherited gate supplies parity evidence.

**Rule1, shared pause defect:** The actual built expiry test proved a paused death spill prevented session resume. The session resume path now precedes that animation guard; solo retains the guard. Both earlier-mode and Relay browser gates pass.

**Rule1, review-discovered transition races:** Recovery takes priority over skip; reclaim invalidates skip confirmation; modal actor loss preserves underlying pending state; explicit dead-owner departure remains distinct from skip. Retained RED tests and final production/browser regressions prove the fixes.

No new dependency, lockfile change, protocol domain, native controller polling, direct network/storage surface, product test hook, publication or merge. Threats T-04-08/09/10/11 are addressed by existing leases plus frozen identity, generation-bound confirmed commands, explicit frozen waiting, and distinct immutable departure/death inputs. No blocking stub or new security surface was introduced.

Tracking used the GSD SDK. Its advance/progress handlers could not parse the custom STATE layout, and metric/session writes inferred1 verified phase/35 plans; those values were corrected to the actual3 verified phases/31 plans,21 completed. The SDK updated Relay to3/6. The shared-seam deviation was recorded and marked fixed as WINDOWS entry2; pre-existing Phase02 entry1 was preserved for the orchestrator's historical-ledger audit.

## Remaining scope

Plan04-03 is complete; the Relay phase and milestone are not. RELAY-03/04 remain partial pending complete mode integration and independent phase verification. The outcome records here are lifecycle inputs, not the completed leg ledger, tied podium or dedicated results required by04-04. Active-owner hand/market completion belongs to04-05 and full responsive/phase verification to04-06. Race, cross-mode presentation, audit and release/PR remain required. The immutable solo oracle remains `a310a81ed6c76df4b265c9012c23b8c83f4802e5`; preview5175 was untouched.

## Self-Check: PASSED

All six implementation/test commits, changed source/test files, durable final log and representative capture artifacts exist. Required gates reached terminal success on final source; no tracked deletion or blocking placeholder was found. Worktree source is clean and no executor build/browser/test process remains active. Ready for04-04.
