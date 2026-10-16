---
phase: 04-relay
plan: 06
subsystem: ui
tags: [relay, responsive-ui, accessibility, production-browser-proof]
status: complete
tasks_completed: 2
tasks_total: 2
requires:
  - phase: 04-05
    provides: Complete Relay lifecycle, owner economy and immutable results
provides:
  - Dedicated responsive Relay material and accessible state feedback
  - Actual-input fractional-platform boundary proof
  - Inspected 252-capture frame/theme/motion matrix and exact inherited gate
requirements-completed: []
affects: [relay-verification, race, presentation]
tech-stack:
  added: []
  patterns: [authoritative view decoration, frozen-board suspension, changed-content announcements]
key-files:
  created: [src/relay-ui.css, tests/relay-layout.mjs]
  modified: [src/main.ts, src/relay-ui.ts, src/session-ui.css, tests/relay-runtime.mjs, tests/relay-tracer.mjs]
key-decisions:
  - Already-frozen Relay boards retain participant authority during minimum-size suspension.
  - Public seed intent and actual keys prove earned platform handoff without private state arrangement.
  - Browser RNG identity and production-object semantic future proof remain separately labelled.
duration: 100 min
completed: 2026-10-15
coverage:
  - id: D1
    description: Responsive Relay surfaces across all required frames and themes
    verification:
      - kind: automated_ui
        ref: tests/relay-layout.mjs
        status: pass
    human_judgment: true
    rationale: Both contact sheets and representative full-size captures were inspected for material hierarchy and legibility.
  - id: D2
    description: Actual-input earned fractional-platform continuity and runtime lifecycle
    verification:
      - kind: integration
        ref: tests/relay-runtime.mjs
        status: pass
    human_judgment: false
  - id: D3
    description: Complete inherited and Relay regression gate
    verification:
      - kind: integration
        ref: /tmp/down-to-duck-04-06-final-verified-gate.log
        status: pass
    human_judgment: false
---

# Phase 04 Plan 06: Relay responsive proof Summary

Relay now uses one dedicated material stylesheet, readable responsive boards and ownership HUD, deduplicated announcements, and frozen-board focus/input handling. The built opaque artifact covers the complete frame/theme matrix and an actual earned 49/50/51 platform handoff.

## Execution and API reconciliation

Generic executor fallback applied the full local GSD executor role and execute-plan workflow with the inherited default model. Typed dispatch had remained pending_init and was canceled; no typed-agent guarantee is claimed. Existing napplet make/build/UI/test skills and repository boundaries were followed. The session's no-install instruction overrides the template's install step. Sole delegated source/test/build/browser ownership remained sequential.

Accepted unchanged entry evidence: source `eb0e72a`, docs `12c3e79`, canonical5643 exit0, `/tmp/down-to-duck-04-05-final-verified-gate.log`. No gratuitous entry rerun. Graph-first discovery used project `Users-sandwich-Develop-crossy-road-clone`, with source fallback for insufficient matches.

| Responsibility | Actual API and reconciliation |
|---|---|
| View authority | Existing `RelayCoordinator.snapshot/confirm/actionToken` and frozen result records remain authoritative. Presentation reads these objects; no new mode state or recovery/economy service. |
| Responsive material | `relay-ui.ts` imports `relay-ui.css`; existing Relay selectors moved out of shared `session-ui.css`. Shared session controls, shelf and theme adapter remain single instances. |
| Minimum-size suspension | `suspendPlay` formerly paused the primary participant even while Relay's handoff already froze the world. That revoked subsequent transfer/skip authority. Already-frozen non-recovery boards now retain participant state while clearing held input/audio; actual running/recovery and other-mode suspension keep their defaults. |
| Confirmation/focus | Existing frame availability and coordinator confirmation run before clearing UI pause or inert state. Undersized confirmation rejects; resize alone neither confirms nor moves. Returning above the floor restores a visible board control, and successful fresh confirmation restores scene focus without a hop. |
| Accessible feedback | One polite Relay region announces changed lifecycle/owner/result content; unchanged frames do not rewrite it. Setup validation retains its assertive region with deduplicated content. Modal foreground owns input; the background game surface is inert. |
| HUD | `renderRelayHud` decorates delivered seat controls from actual participant/recovery state: marker, P-number, character, running/next/lifecycle label, team distance, distinct innate100 and personal250 progress. |
| Earned boundary fixture | Existing public game/open seed intent selects the course. Actual keyboard hops and read-only hazard/platform observations reach river49/50 and row51; no private world/position/progress writes or alternate controller. |
| RNG evidence boundary | Browser asserts retained world/row/RNG closure identity and frozen clocks/rows/mobs/claims. Opaque RNG closure state is not JSON-serializable; semantic future-draw continuity remains separately proven by production-object boundary tests. |

## Commits and retained RED/GREEN evidence

- `79cb241` — Initial RED resize-confirmation and type-role proof.
- `2d6ef23` — Responsive Relay material, owner HUD, accessible announcements and frozen-board resize authority.
- `b845660` — Actual-input seeded 49/50/51 fractional-platform continuity.
- `2506ee6` — Wide setup-Roster correction and expanded retained matrix/order assertions.

Initial layout runs exposed the primary participant pause/transfer defect and typography violations. Expanded coverage found a live-region document extent, selected HUD overlap at320px, and compact Order actions clipped after enlarging type. Each was corrected with a retained assertion. `/tmp/relay-layout-red-contact.png` records inspected earlier material; current artifact captures supersede it.

Canonical candidate72707 exited1 with a timeout after179/240 captures. A prior complete matrix took55.7s; the suite's180s limit was retained, per-state timestamps and15s screenshot deadlines added, and actual report failures (compact Order clipping, owner weight700) fixed. The next complete matrix passed in55.4s. No timeout was relabelled as success and no required state was removed.

Focused actual-input continuity87858 exited0; its initial88260 failure was an overbroad assertion that placement must preserve spatial recovery anchors. The corrected assertion compares actual personal assets/earned-credit fields, while exact incoming fractional placement is asserted separately. Task-gate44175 exited0: `pnpm build && node tests/relay-layout.mjs && pnpm type-check && node tests/relay-runtime.mjs`, durable `/tmp/down-to-duck-04-06-task-gates-final.log`, layout1/1 and runtime9/9.

## Visual and behavioral evidence

`artifacts/relay-layout/report.json`, `index.html`, `contact-dark.png`, and `contact-light.png` accompany252 captures:21 states × six required frames × two themes. States include setup, setup roster, invalid length, reordered order, live HUD, inactive disconnect, owner restriction, handoff, system-motion handoff, roster, active disconnect, skip, reclaim, leave, waiting, results, players, legs, tied podium, system-motion result and app-motion recovery.

Frames are200×160,240×240,320×560,900×600,1000×280,2400×1200. Assertions cover exact floor notice/no controls, retained roster/position/result, document and named-surface overflow,44px targets, hit-test occlusion,16/20/28/44px roles and400/600 weights, modal semantics/focus trap, unchanged-frame announcement silence, reduced-motion styling, page errors, external requests and forbidden APIs. Contact sheets for both themes were inspected across every state; full-size compact Order/recovery,320HUD, wide setup and equal-rank podium were also inspected. Result pages preserve a true shared `=1` tier rather than inventing an ordered winner. Actual natural hazard/revival and earned tied contributions are reached through visible controls.

`/tmp/relay-runtime-earned-continuity.json` and `/tmp/relay-runtime-earned-51.png` record real public-seed keyboard travel: no handoff at49; fractional platform x at50; unchanged world during waiting and confirmation; zero incoming personal credit on placement; one earned incoming tile at51. All browsers use `--mute-audio`; actual application audio remains alive. Existing runtime tests retain their clearly separate production-service fixture arrangements for economy/lifecycle cases; only the new layout and earned-boundary paths are claimed private-state-write-free.

| Requirement | Named current production evidence |
|---|---|
| RELAY-01 | Tracer `setup validates every roster size and length atomically and freezes copied stable order`; built setup/configuration tests; layout setup/invalid/order; runtime default50 start. |
| RELAY-02 | Boundary `49/50/49/50 crossings cannot duplicate credit or reopen boundary 50`, fatal priority, fractional platform, exceptional jump, actual100/250 recharge tests; runtime `visible seeded 49/50/51 hops carry a fractional platform baton through the unchanged built world`. |
| RELAY-03 | Tracer stale incoming confirmation and held inactive input; lifecycle `real device leases reject changed slots, strangers and stale epochs`; built original reclaim and mixed-input runtime. |
| RELAY-04 | Lifecycle active/inactive loss, fresh skip/cancel, leave, waiting, actual accept/decline/expiry and terminal tests; runtime `mixed keyboard/controller Relay preserves per-seat calls, fresh boards, recovery, waiting, immutable results and retry`; layout lifecycle/recovery matrix. |
| RELAY-05 | Results production pre-clear death credit, immutable closure and shared ranking tests; built frozen navigation/retry; layout real equal-contribution podium, participant and ledger pages. |

The final acceptance evidence is composed across the runtime's named scenarios and the layout's visible flows; it is not represented as one uninterrupted giant run. Model-only semantic future tests, older arranged built economy fixtures and new actual-input continuity are distinguished above.

Canonical candidate84045 exited1 after full inherited Phase3 passed: two older order assertions lacked the required marker, and the900×600 setup Roster clipped actions. The retained tracer exposed the real clipping; the matrix was expanded with setup-Roster in all12 frame/theme combinations. Wide Roster omits redundant copy/strip/status rows while retaining the editor and actions. Targeted77869 passed tracer12/12, expanded layout and type-check. Inspection then corrected cramped character navigation padding before the final Task1 rerun. Exact Task1 rerun65758 exited0 with252 captures in57.4s and type-check; `/tmp/down-to-duck-04-06-roster-final-layout.log`. Refreshed900px Roster was inspected with clean single-line navigation and reachable actions. Only the terminal final gate below is completion evidence.

## Deviations, threats and remaining scope

Rule1 narrow shared integration repair: minimum-size/focus suspension must not change already-frozen Relay participant authority. It preserves existing running, recovery, solo and Survive suspension behavior. No production test hooks, native polling, direct network/storage, dependency or lockfile change, installation, publication or merge. Preview5175 and immutable solo oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5` remain untouched.

T-04-19/20 are covered by retained authoritative state, bounded pages, target/overflow and fresh-input assertions. T-04-21 is covered by marker/P-number/character identities and frozen true-tie records. T-04-22 is covered by actual built opaque iframe, public seed/input paths and boundary observations. Historical WINDOWS1 remains open for independent audit; this plan does not waive it.

Plan04-06 completion is not phase or milestone completion. Independent full Relay verification, reviewed Race plans, cross-mode presentation, final audits and release/PR remain mandatory. Requirement status beyond existing RELAY-01/05 remains pending independent verification. Physical controller hardware and unavailable conformance evidence remain unmeasured.

## Final exact gate

Canonical **13852 reached exit0** on frozen source `2506ee6`. Whole-command durable log: `/tmp/down-to-duck-04-06-final-verified-gate.log`.

```sh
pnpm test:phase3 && node --test tests/relay-tracer.mjs tests/relay-boundary.test.mjs tests/relay-lifecycle.test.mjs tests/relay-results.test.mjs && pnpm type-check && pnpm build && node tests/relay-runtime.mjs && node tests/relay-layout.mjs && pnpm test:guidance && pnpm test:conformance && git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml
```

- Full exact nested Phase2/Phase3 passed: pinned solo21/21, regression271/271, shared models73/73, recovery44/44, final Survive browser34/34, and every configured runtime/layout/economy/item/death check.
- Relay tracer/boundary/lifecycle/results **65/65**, runtime **9/9**, layout **1/1** with **252 captures**, zero failures/cancellations/skips/todos in these behavioral groups.
- Type-check, production build, guidance **6/6**, and immutable-oracle lockfile comparison passed.
- Conformance **5 passed / 0 failed / 5 unmeasured**: manifest/event-kind, manifest/index-html, manifest/requires lack a resolved manifest; wire/envelope-well-formed lacks emitted envelopes; lifecycle/clean-teardown is not measured by this CLI. These are not ten passes. Physical controller hardware remains unmeasured.

GSD tracking records6/6 Relay plans,24/31 total plans and3 independently verified phases. The SDK's custom STATE parsing/count assumptions were reconciled with actual reviewed plans. Phase04 remains In Progress awaiting independent verification; RELAY-02/03/04 status is deliberately not widened by plan metadata. Historical WINDOWS1 remains open.

## Self-Check: PASSED

All four implementation/test commits, created/modified paths, final durable gate log,252-capture JSON and both contact sheets exist. Required commands reached terminal success on final source; no executor build/browser/test process remains active. No dependency, lockfile or immutable-oracle change. Source ownership returns to root for independent Relay verification and the remaining milestone.
