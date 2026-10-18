---
phase: 04-relay
reviewed: 2026-10-16T04:12:37Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - src/co-op-market.ts
  - src/game.ts
  - src/hand-layout.css
  - src/main.ts
  - src/market-ui.ts
  - src/relay-results.ts
  - src/relay-ui.css
  - src/relay-ui.ts
  - src/relay.ts
  - src/run-hand.ts
  - src/session-input.ts
  - src/session-recovery.ts
  - src/session-ui.css
  - src/session-ui.ts
  - src/session.ts
  - src/survive-together.ts
  - tests/market-game-fixture.mjs
  - tests/relay-boundary.test.mjs
  - tests/relay-layout.mjs
  - tests/relay-lifecycle.test.mjs
  - tests/relay-results.test.mjs
  - tests/relay-runtime.mjs
  - tests/relay-tracer.mjs
  - tests/session-recovery.test.mjs
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
reviewer_execution: generic-agent-fallback
reviewed_head: 4ee9869
reviewed_source: 52f8e0d
resolved_findings: [CR-01]
diff_base: 6ba2d5d
---

# Phase 04: Code Review Report

## Narrative Findings (AI reviewer)

Independent standard-depth review using the generic-agent workaround, applying the full local `gsd-code-reviewer` role and code-review workflow. This is not a typed-agent execution. Reviewed the explicit 24-file scope against `6ba2d5d`, with called session/recovery/input behavior and relevant planning/boundary context. Graph discovery preceded source fallback. No structural pre-pass was supplied. No source, dependency, lockfile or oracle changes were made.

### CR-01: Handoff intercepts keyboard button activation without an actor

**Historical classification: BLOCKER — incorrect supported keyboard behavior. Resolved by 52f8e0d; independently re-reviewed.**

The original finding below is retained as history against source `2506ee6`. On `52f8e0d`, the board identifies the incoming actor and Start action; focused-control activation distinguishes read-only navigation from Start, retains the captured Start callback/ticket, checks connection/frame availability, and preserves incoming-seat authority. Non-forward controller directions navigate the board. Native Enter/Space consume one fresh edge; terminal navigation permits departed keyboard owners without granting gameplay authority.

Independently read the full source/test diff and executed `node --test --test-name-pattern='handoff (Enter|Space|controller focus)' tests/relay-runtime.mjs`. Session **92751 exited 0**; `/tmp/down-to-duck-04-independent-repair.log` records **3 passed, 0 failed, 0 skipped**. Actual input covers Tab/Enter/Space on Start, View, Next, Previous and Back; read-only navigation preserves positions; held confirmation creates no incoming hop; wrong keyboard seat cannot Start a controller runner; controller focus/confirmation works; terminal navigation/retry remains usable. The fixture uses the built opaque artifact and muted audio, with no private world arrangement in these cases. No unresolved review findings remain. Canonical repaired-source Gate6 is `/tmp/down-to-duck-04-review-repair-final-gate.log` (89260 exit 0), with runtime **12/12**; the earlier 9/9 evidence below is historical.

**File:** `/Users/sandwich/Develop/crossy-road-clone/src/main.ts:1371` (handler lines 1366–1376); related `/Users/sandwich/Develop/crossy-road-clone/src/relay-ui.ts:102` and `/Users/sandwich/Develop/crossy-road-clone/src/main.ts:720`.

**Issue:** The native keyboard handler takes Enter/Space away from every button while a Relay board is open. It resolves the actor from `relayHandoff.dataset.actor`, but `createRelayHandoff` never sets that attribute. Consequently, focusing either **Start P2's leg** or **View relay** and pressing Enter or Space does nothing. The normal button click is canceled, and the replacement path never runs. Forward movement bindings still confirm a handoff and pointer clicks work, so existing flow tests miss this failure. The roster's Previous/Next/Back buttons suffer the same interception.

There is a related trap in the proposed repair: adding only `data-actor` is insufficient. `relayConfirmControl` immediately calls `confirmRelay` for every handoff, regardless of which button has focus. That would turn Enter on **View relay** into a baton transfer. Likewise, `relayDirection` at line 731 discards non-forward controller directions during handoff, so it cannot navigate those visible secondary controls.

**Independent proof:** `/tmp/down-to-duck-04-review-handoff-controls.log`, terminal session 18859 exit 0, runs the current built opaque iframe with muted Chromium. Visible setup selects two default keyboard seats and a one-tile leg; a real `w` hop reaches the handoff without private world writes. For both Start and View buttons, actual Enter and Space leave the board present, `actor: undefined`, and the summary closed. A subsequent pointer click on View opens the summary (`summary: 'true'`). No page errors or external requests occurred. The exit code confirms the diagnostic assertions reproduced the defect; it is not an acceptance pass. The earlier exploratory log `/tmp/down-to-duck-04-review-handoff-keyboard.log` corroborates View/Enter using arranged meadow terrain.

**Fix:** Route activation to the focused handoff control, preserving fresh-edge/frame/seat validation for the actual Start action and permitting read-only roster navigation without transferring authority. Give the handoff an explicit incoming actor where needed, but do not unconditionally interpret every confirm as Start. Allow controller focus navigation across the handoff/roster controls. Add built tests for Tab→Enter and Space on Start/View/Previous/Next/Back, controller navigation/confirm on read-only controls, and rejection of wrong-seat/held/stale Start input. Keep the existing forward-to-start shortcut and consumed-edge/no-first-hop assertions.

## Historical WINDOWS1 audit

**Closed by current implementation and concrete regression evidence; not waived.** The old temporary P2 binding no longer exists. `src/game.ts:228` returns the host for primary operations and caches a separate `Game.prototype` receiver for each secondary player. Its personal-property accessors resolve directly to that player; shared-property accessors resolve to the host. `inPlayerOperation` at line 251 uses that fixed receiver and restores the primary operation marker in `finally` rather than rebinding host properties.

The exact historical scenario is exercised by `tests/local-session.test.mjs:40`: P2's reward callback reads the unchanged P1 facade, dispatches P1 forward, then directly pauses the host. Assertions require P1 to move and pause while P2 neither moves nor pauses. Independently ran `node --test --test-name-pattern='reentrant P2 reward callback' tests/local-session.test.mjs`; `/tmp/down-to-duck-04-review-windows1.log` records **1 passed, 0 failed, 0 skipped**. The historical open ledger entry is stale and can be closed with these references. This review does not edit that ledger.

## Other review evidence and limits

- Reviewed coordinator setup validation, retained world/placement seams, pending-boundary settlement, death/recovery ordering, disconnect/skip/leave authority, original-device reclaim, ledger generation/idempotence, immutable results, market invalidation and extracted recovery defaults. No additional concrete defect was established within this review. Speculative no-safe-placement scenarios were not promoted to findings without a reachable production reproduction.
- Existing tests assert production objects and meaningful state: actual authored progress and fatal landing precedence, fractional platform continuity/future RNG, 100/250 personal meters, stale owner/lease rejection, real pre-clear death accounting, pending recovery and immutable tied results. Arranged model/economy fixtures are distinguishable from the actual-input browser continuity path. The layout tests prove focus containment and pointer-operated roster pages but do not cover keyboard activation of those buttons, explaining CR-01.
- Inspected canonical `/tmp/down-to-duck-04-06-final-verified-gate.log` and the recorded final-source evidence rather than gratuitously rerunning the broad gate. Recorded terminal success covers inherited Phase2/3, Relay **65/65**, runtime **9/9**, and layout **252 captures**, plus type/build/guidance and immutable-oracle lockfile comparison. Those successes do not override the independently reproduced defect.
- Conformance remains **5 passed / 0 failed / 5 unmeasured** (three manifest checks, emitted-envelope check, teardown check). Physical controller hardware remains unmeasured; injected shell snapshots are separate evidence. No full new visual audit or broad gate was performed by this reviewer.
- All review browsers were launched by the existing muted fixture and closed. Preview 5175 and immutable solo oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5` were untouched. Only this report was written; no commit was made.
