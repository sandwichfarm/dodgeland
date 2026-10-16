---
phase: 07
slug: release-evidence-pr
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-16
---

# Phase 07 — Validation Strategy

Seeded from 07-RESEARCH.md Validation Architecture. Planner must bind these
contracts to exact task IDs; proposed commands are not existing passing tests.

## Test Infrastructure

Node 26.11.1 node:test and Playwright 1.61.0 are installed. Keep the existing
strict runner and muted opaque frames. Semantic instrumentation dependencies
are not installed or validated; a declared standalone tooling package must
preserve the immutable root lockfile and oracle.

| Layer | Command | Availability |
|---|---|---|
| Focused model smoke | `node tests/strict-node-tests.mjs tests/consumables.test.mjs tests/session-input.test.mjs` | Existing |
| Node/browser calibration | `node --test tools/release-coverage/calibration.test.mjs` | Proposed Wave 0 |
| Production coverage | `node tools/release-coverage/run.mjs` | Proposed |
| Supplemental conformance | `node tests/release-conformance.mjs` | Proposed |
| Evidence integrity | `node tests/release-evidence.test.mjs` | Proposed |
| Exact inherited acceptance | `node tests/phase6-gate.mjs` | Existing |

## Sampling and Verification Map

| Responsibility | Requirements | Verification |
|---|---|---|
| Portable instrumentation | TEST-02/05 | Exact known semantic denominators, unimported sources, declaration-only sources, eager glob identity, malformed/empty/missing payload rejection |
| Browser collection | TEST-03/05 | Actual opaque executing realm, compatible canonical counters and hashes, preserved runtime behavior, isolated instrumented output |
| High coverage policy | TEST-02/05 | Global and critical-file thresholds; meaningful uncovered-branch review; no averaging away weak modes |
| Supplemental protocol facts | TEST-03/05 | Measured boot/wire/teardown with negative controls; preserve validator-version/draft limitations |
| Release evidence | TEST-04/SHIP-01 | Exact selected file hashes, regenerated sheets and direct image inspection, all requirement/user clauses mapped |
| Final acceptance | TEST-05/SHIP-01 | Unmodified phase6 runner plus additive calibrated coverage/conformance/evidence gates, verified open PR base/head/URL |

After each tooling task run its exact calibration/negative checks; after each
behavioral repair retain RED and focused GREEN plus affected integration.
After source/test freeze run the full exact inherited runner once plus the new
additive gates. Preserve both nested Relay/Race canonical blocks and health
runtime exactly once. Do not add redundant baseline runs. Use one process at
a time, durable logs, exact handles and terminal status. Fast calibration aims
for under 30 seconds; duration is unmeasured until implemented. Long browser
and inherited gates are intentionally outside that feedback target.

## Wave 0 Requirements

- [ ] Standalone declared tool dependencies resolved, audited and locked; root lock unchanged.
- [ ] Committed Node and opaque-browser semantic calibration with known outcomes.
- [ ] Canonical source inventory, worker/realm collectors and negative controls.
- [ ] Supplemental conformance and evidence-integrity tests before relying on their commands.

## Manual Evidence

Inspect current selected full-size images and regenerated sheets for every
mode, lifecycle, owner/market/pack, recovery and result surface in the existing
six-frame/two-theme matrix. Human visual/play-feel acceptance remains pending
in 05/06 UAT; automation or agent inspection cannot supply it. Physical
controllers remain unmeasured. Current CLI conformance is 5 pass/5 unmeasured;
supplemental evidence must state its actual scope rather than fabricate passes.

## Validation Sign-Off

- [ ] Exact task bindings and threat references populated by planner.
- [ ] Every task has automated verification or an explicit implemented prerequisite.
- [ ] No missing-source or empty-coverage false pass.
- [ ] No watch mode; no production instrumentation/test hooks.
- [ ] Final source/build/coverage/visual provenance agrees.
- [ ] `nyquist_compliant: true` set only after validation.

Approval pending; this is a planning seed, not execution evidence.
