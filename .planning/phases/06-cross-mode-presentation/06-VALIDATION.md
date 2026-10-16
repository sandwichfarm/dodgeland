---
phase: 06
slug: cross-mode-presentation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-16
---

# Phase 06 — Validation Strategy

## Test Infrastructure

Use the installed Node test runner, strict-node-tests wrapper and Playwright opaque-iframe fixtures. No dependency or lockfile changes. Every browser launches with `--mute-audio`; preview5175 remains untouched.

Fast feedback: `pnpm type-check`, plus focused existing/new assertions matching each changed surface. Target less than30seconds for pure checks; measure actual duration. Browser journeys and final gates are slower, separate tiers and must be polled to terminal without restarting on an observation timeout.

## Acceptance Scope

- Retain failing built regressions for real canvas traveler/body/nameplate intersection with visible DOM HUDs at900×600; Survive Arcade/Flow and Race initial/left/right groups, Relay active runner. A clear center point or label-only check is insufficient.
- Retain shared-session visibility/ownership proof for duplicate solo personal status, owner changes, menus, resize and return to solo.
- Validate changed surfaces at200×160 notice,240×240,320×560,900×600,1000×280,2400×1200 in both themes with reduced-motion representatives. Preserve large controls, bounded pages, focus and authoritative state.
- Reuse real lifecycle/owner/results journeys rather than fabricate a second UI or result records. Cover all participant identities including departed/replaced seats.
- Preserve immutable solo numerical/pixel parity and existing shared input authority.

## Sampling Rate

Run focused RED/GREEN checks during each implementation task. After source freeze, run the bounded new cross-mode regression and exact delivered Relay Gate6 and Race Gate7 from04-VALIDATION.md/05-VALIDATION.md, preserving their inherited Phase1–3 checks and final type/build/guidance/conformance/oracle-lockfile checks. Do not separately repeat commands already nested and green on that same source. One build/browser process at a time; record exact commands, source revision, durable log and terminal exit.

## Per-Task Verification Map

Planner must replace this provisional map with actual task IDs and executable commands before plans pass checking; no task is approved by this draft.

| Concern | Requirements | Evidence type | Status |
|---|---|---|---|
| HUD/actor occlusion and shared personal status | UI-04, UI-05 | retained real-built RED/GREEN, geometry plus inspected screenshots | Pending plan |
| Owner/lifecycle/results state through changed composition | UI-04, UI-05 | existing actual-input journeys plus missing changed-surface cells | Pending plan |
| Solo and inherited mode preservation | UI-04, UI-05 | exact gates, immutable oracle, source-fresh visual evidence | Pending plan |

## Wave 0 Requirements

Existing test infrastructure is installed. Add only missing retained acceptance assertions; no package installation. Proposed new test paths must be created by an explicit task before they become required commands.

## Manual-Only Verification

Human aesthetic/play-feel acceptance remains separate from measured geometry and agent image inspection. Phase05-UAT is pending; no approval is inferred from research or this strategy. Record reviewed source and captures and any later human response explicitly.

## Validation Sign-Off

- [ ] All planned tasks have executable automated checks or explicit test-creation dependencies.
- [ ] No three consecutive tasks without automated verification.
- [ ] No watch-mode commands; measured fast-feedback latency recorded.
- [ ] Source-fresh captures inspected and linked to requirements/state/mode/frame/theme.
- [ ] Conformance5pass/5unmeasured and physical-controller limitations distinguished honestly.
- [ ] Final gates terminal and green; no oracle repin.

Approval: pending plan/checker and execution evidence.
