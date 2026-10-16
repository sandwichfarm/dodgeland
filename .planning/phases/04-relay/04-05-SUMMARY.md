---
phase: 04-relay
plan: 05
subsystem: gameplay
tags: [relay, owner-economy, mixed-input, browser-tests, responsive-ui]
status: complete
tasks_completed: 2
tasks_total: 2
requires:
  - phase: 04-04
    provides: Closed-roster lifecycle, shared recovery and immutable Relay results
provides:
  - Active-owner Relay market and hand with authoritative stale-action rejection
  - Complete mixed-input built runtime and optional-gamepad fallback evidence
  - Responsive paid owner drafts and empty personal hand surfaces
requirements-completed: []
affects: [04-06, race, presentation]
tech-stack:
  added: []
  patterns: [optional capability policy, paused owner transaction authority, generation invalidation]
key-files:
  created: [tests/relay-runtime.mjs]
  modified: [src/co-op-market.ts, src/session.ts, src/relay.ts, src/main.ts, src/market-ui.ts, src/run-hand.ts, src/hand-layout.css, tests/market-game-fixture.mjs]
key-decisions:
  - Reuse the existing owner adapter with optional capabilities; Relay installs no consumable world.
  - Separate paused owner transactions from movement authority while retaining generic identity and generation checks.
  - Pointer inspection deliberately pauses shared play; inactive controller actions cannot gain pause authority.
  - Prospective next-seat changes during modal pause are not handoff transitions.
duration: 32 min
completed: 2026-10-15
coverage:
  - id: D1
    description: Built mixed-input lifecycle, audio, recovery, results and retry
    requirement: RELAY-04
    verification:
      - kind: automated_ui
        ref: tests/relay-runtime.mjs
        status: pass
    human_judgment: false
  - id: D2
    description: Active-owner economy, paid drafts and stale-action rejection
    verification:
      - kind: automated_ui
        ref: tests/relay-runtime.mjs
        status: pass
    human_judgment: true
    rationale: Actual responsive captures were inspected in addition to bounds and transaction assertions.
  - id: D3
    description: Existing solo and Survive behavior preserved
    verification:
      - kind: integration
        ref: pnpm test:phase3
        status: pass
    human_judgment: false
---

# Phase 04 Plan 05: Relay runtime and active-owner hand Summary

Relay's one physical market and hand now authorize only the current runner, preserve paid personal inventory through inspection, and reject stale or mode-ineligible actions before debit. The built opaque iframe exercises keyboard/controller gameplay, per-seat audio, lifecycle, recovery and frozen results through the delivered UI.

## Execution and API reconciliation

Generic executor fallback applied the full local GSD executor role and execute-plan workflow using the inherited default model. Typed dispatch had remained pending_init and was canceled; no typed-agent guarantee is claimed. Existing napplet skills, safe-refactor guidance and repository boundaries were followed. The session's no-install instruction overrides the template's install step. Root delegated sole source/test/build/browser ownership throughout execution.

Accepted unchanged entry evidence: source `2ce6edf`, summary/tracking `9e56d9d`, canonical93254 exit0, `/tmp/down-to-duck-04-04-final-gate.log` (strict Relay/recovery71/71). No entry rerun. Graph queries used project `Users-sandwich-Develop-crossy-road-clone`; insufficient matches were reconciled with actual source.

| Responsibility | Actual API and decision |
|---|---|
| Owner transactions | `CoOpMarketAdapter.select/snapshot/act` already verifies seat/device/participant identity, owner/inventory/run/context generations and duplicate action IDs before dispatching to the actual `RunInventory`. Reused this adapter rather than another economy. |
| Optional capability | `LocalSession.installCoOpMarket()` previously unconditionally installed a consumable world. Added an optional capability/owner policy; omitted policy preserves Survive behavior. Relay installs the owner adapter with no consumable world and no item capabilities. |
| Mode authority | Optional `SessionModeHandlers.canTransact` defaults to existing `canAct`. Relay accepts its connected living active owner while playing or deliberately paused for inspection; movement retains the stricter `canAct` gate. Generic identity/generation validation still runs before mutation. |
| Item eligibility | Adapter invokes the delivered `planConsumableCredit` mode-eligibility service before offering or debiting Revival/Flare. Direct attempts return the authored unavailable-in-Relay reason with zero wallet, item or world effect. Personal revival remains in the shared recovery service. |
| Lifecycle invalidation | Session lifecycle already invalidates the adapter. Relay phase transitions now do so too, with opt-in close-on-invalidation. UI invalidates market, hand, focus and input references before another owner view renders. |
| Prospective incoming seat | Pausing the primary facade can change `nextEligible` without a turn transition. The board render key includes incoming identity only in an actual handoff; phase/revision/lifecycle changes still invalidate every real transition. |
| Paid pack | `RunInventory.close()` preserves an already-paid draft. Owner switching clears only UI picks/replacement/inspection, preserving exact choices and wallet. Returning requires fresh UI selection, and sale/claim still use the original owner's adapter context. |
| Browser fixture | Extended existing `createMarketGameFixture` with optional test-side forbidden-API observation and actual AudioContext buffer fingerprinting. Defaults remain unchanged; no product global, alternate bundle/controller or native polling was added. |

## Delivered behavior

- One hand and market DOM tree, exact `Viewing Pn · Character` headings/accessibility names, accurate inactive inspection and the read-only reason. Empty personal items show `Items: —` in both themes.
- Active keyboard/controller/pointer actions route to the current owner. Fresh controller confirmation is consumed after modal context changes; inactive calls/movement cannot pause or act.
- Deliberate pointer inspection retains existing shared modal pause semantics, including inactive read-only inspection. Closing resumes the previous authoritative run without a hop or turn change.
- Actual purchases, a paid full-hand pack, replacement selection reset, hand sale and final claim preserve other participants' wallets/cards/choices. Every captured action kind is rejected after actual death/departure; captured requests also fail after handoff and original reclaim.
- Mixed keyboard/controller setup starts the frozen unique roster, exercises active-only input, actual character PCM/cooldowns, frozen boundary, original reclaim, wrong/new-device rejection, two-step skip/cancel, personal revival, leave/cancel, waiting, no-runner results and ordinary Hop again teardown. Missing optional gamepad support retains keyboard/pointer operation.
- No consumable world is installed, no teammate Revival/Flare offer is exposed, and direct ineligible requests reject before debit. Existing inherited tests retain distinct innate100/personal250 earned-credit and placement semantics.

## Commits and RED/GREEN evidence

1. `51e00ce` — Initial retained RED: active Relay market lacked the owner adapter, and owner copy/empty items were incorrect.
2. `7ec82fe` — Expanded production runtime, stale-action, paid-pack and visual regression proofs. Retains failing controller-owned market and short owner-toolbar evidence before repair.
3. `b34fb5d` — Active-owner adapter/capability integration, authoritative context invalidation, exact owner UI and responsive owner draft/empty hand fixes.
4. `9c5df8a` — Final mixed-input/lifecycle coverage and visual assertions; removes temporary diagnostic observations and uses the actual neutral input/death transaction prerequisites.
5. `eb0e72a` — Preserve read-only paid-draft dismissal and prove inactive Relay Close/reopen retains exact paid choices.

Initial RED: `/tmp/down-to-duck-04-05-owner-red.log`. Focused adapter parity GREEN:52373 exit0, `/tmp/down-to-duck-04-05-owner-green2.log` (runtime2/2, economy/boundary/consumable25/25, build/type). Expanded six-scenario GREEN:78319 exit0, `/tmp/down-to-duck-04-05-runtime-expanded.log`.

Stronger checks then exposed the running-board key falsely treating a primary pause as a turn change, and clipped paid-draft owner toolbars at240px and320px. Actual stack observation identified `syncRelayHandoff` as the close source; temporary diagnostics are removed from final tests. Visual review also caught an overlaid paid-pack status message, light-theme empty-item contrast, and an oversized empty shelf covering tiny controls. All were repaired before source freeze. Fixture corrections (actual default Sunny assignment, visible solo calibration control, neutral controller context edge, and closing/resuming the real inventory before fatal death) are not product defects.

Focused final79322 exit0, `/tmp/down-to-duck-04-05-visual-complete.log`: runtime8/8, build/type. Final empty-shelf visual76417 exit0, `/tmp/down-to-duck-04-05-empty-fixed.log`. Initial canonical59647 was intentionally terminated and polled exit143 after noticing a wrong recovery test filename; its log is superseded and is not passing evidence.

Canonical92119 reached exit1 in Survive's final browser group (33/34): the newly bounded paid-draft toolbar put disabled Skip over read-only Close. Existing `survive-market-ghost-inspection-runtime` retained the failure; the Relay fixture now also seeds an inactive paid draft and clicks Close/reopen. Disabled Skip is hidden in this read-only owner toolbar, leaving the existing Close action reachable. Focused9478 exit0 (`/tmp/down-to-duck-04-05-readonly-draft-repair.log`) passed Relay8/8 and Survive owner/ghost/controller/keyboard5/5 with build/type;95557 exit0 (`/tmp/down-to-duck-04-05-readonly-close-proof.log`) passed the exact Relay dismissal proof. Only the final canonical gate below is completion evidence.

## Verification

Canonical session **5643 reached exit0** on final source `eb0e72a`. Whole-command durable log: `/tmp/down-to-duck-04-05-final-verified-gate.log`.

```sh
pnpm build && node tests/relay-runtime.mjs && pnpm type-check && pnpm build && node tests/relay-runtime.mjs && node --test tests/survive-economy.test.mjs tests/consumables.test.mjs && pnpm type-check && pnpm test:phase3 && node tests/strict-node-tests.mjs tests/relay-tracer.mjs tests/relay-boundary.test.mjs tests/relay-lifecycle.test.mjs tests/relay-results.test.mjs tests/session-recovery.test.mjs tests/relay-runtime.mjs
```

- Exact Task1: build, runtime **8/8**, type-check. Exact Task2: build, runtime **8/8**, economy/consumables **15/15**, type-check.
- Full inherited Phase2/Phase3: pinned solo21, solo regression271, shared models73, recovery44, Survive final browser34, and all configured runtime/layout/economy/item/death, build/type/guidance/unchanged-lockfile checks passed.
- Final strict Relay/recovery/runtime **79/79**, zero failures/skips/todos: tracer12, boundary16, lifecycle22, results15, shared recovery6, runtime8.
- Conformance **5 passed / 0 failed / 5 unmeasured**, not ten passes. Physical controller hardware remains unmeasured; authorized shell snapshots, actual keyboard/pointer and actual audio graph are measured.

New meaningful owner surfaces have36 screenshots: `/tmp/relay-runtime-{empty,paid-pack,readonly}-{width}x{height}-{dark,light}.png`, covering200×160,240×240,320×560,900×600,1000×280 and2400×1200. The200×160 frames retain the authored minimum-size notice. `/tmp/relay-runtime-controller-market.png` shows the actual P2-owned market. Actual contact sheets and targeted full-size captures were inspected before source freeze. Automated checks cover one-tree ownership, owner/action viewport bounds, stale generations, wallets/cards/choices, real PCM output, frozen time, fresh input, immutable results, errors, external requests and forbidden browser access. Before/after evidence includes `/tmp/relay-runtime-paid-pack-clip.png`; earlier captures are superseded by final generated screenshots.

## Deviations and boundaries

**Rule2, authorized shared capability seam:** Added optional owner/capability and transaction policy to the delivered adapter/session, preserving legacy defaults and generic identity/lease checks before mutation. Root explicitly authorized this narrow extension because the old adapter always installed Survive's consumable world. No duplicated recovery/economy service or mode-name branch in market core.

**Rule1, false turn invalidation:** The prospective incoming seat changes when the primary facade pauses; it cannot be an invalidation key while running. Real phase/revision/lifecycle transitions remain authoritative.

**Rule1, owner-surface geometry:** Reused the bounded owner-shop toolbar for paid drafts, made redundant short-frame status visually hidden while retaining its live announcement, provided an opaque readable empty-item label, and compressed only empty owner shelves in short frames. Ordinary solo geometry is unchanged.

Threats T-04-15/16/17/18 are covered by authoritative owner/context validation, transition invalidation, existing mode eligibility before debit, and built boundary observations. No new network/storage/protocol authority, dependency, lockfile change, native polling, product test hook, publication or merge. No blocking stub was introduced. Historical WINDOWS1 remains open for later audit; it is not waived by this plan.

GSD SDK updated the roadmap to5/6. Its advance/progress handlers could not parse the custom STATE layout, and metric/session writes inferred1 verified phase/35 plans; counters were corrected to3 independently verified phases/31 plans,23 completed, with04-06 next. Requirement completion was not widened beyond existing RELAY-01/05 because independent full-phase evidence remains pending. WINDOWS4 records the authorized shared-policy deviation and is fixed by the canonical inherited gate; historical WINDOWS1 remains open.

## Remaining scope

Plan04-05 is complete; the Relay phase and milestone are not. Relay04-06 and independent full-phase verification remain required, followed by every reviewed Race, cross-mode presentation, audit and release/PR requirement. RELAY-02/03/04 remain open pending full-phase evidence. RELAY-01/05 retain their earlier completed status. Conformance unmeasured domains and physical controller hardware are not claimed as tested. Immutable oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5` and preview5175 remain untouched.

## Self-Check: PASSED

All five test/implementation commits, created/modified paths, canonical log and representative capture artifacts exist. Required gates reached terminal success on the final source. No blocking placeholder, dependency or lockfile change is present. No executor build/browser/test process remains active.
