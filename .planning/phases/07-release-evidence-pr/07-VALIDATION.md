---
phase: 07
slug: release-evidence-pr
status: planned
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-16
---
# Phase07 validation contract

Planning-only commands below are creation obligations, not existing passing evidence. Generic planner fallback. Existing entry21972 plus92241/52826 is accepted; do not repeat baseline. Node26.11.1/node:test and Playwright1.61.0 are existing infrastructure. 07-01 audited and installed the standalone tree and own lock, then passed exact Node/browser calibration10/10 (32469exit0). Root lock and oracle remain unchanged.07-02 Task1 passed93470exit0:9 calibration/collection,22 instrumented shared and28 ordinary shared/strict checks. These are accepted entry evidence, not full production coverage.

## Per-task verification and creation dependencies

| Task | Exact command | Creation dependency | Result |
|---|---|---|---|
| 07-01-1 | `pnpm --dir tools/release-coverage install --ignore-workspace --ignore-scripts --frozen-lockfile && node --test tools/release-coverage/calibration.test.mjs && git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Complete;07-01-SUMMARY, final32469exit0 |
| 07-01-2 | `node --test tools/release-coverage/calibration.test.mjs` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Complete;07-01-SUMMARY, final32469exit0 |
| 07-01-3 | `node --test tools/release-coverage/calibration.test.mjs tools/release-coverage/browser-calibration.test.mjs` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Complete;07-01-SUMMARY, final32469exit0 |
| 07-02-1 | `node --test tools/release-coverage/calibration.test.mjs tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite shared-tracer --report-only && node tests/strict-node-tests.mjs tests/local-session.test.mjs tests/session-world.test.mjs` | 07-01 calibration APIs | Complete;93470exit0; preserve4fffa33 |
| 07-02-2 | `node --test tools/release-coverage/browser-calibration.test.mjs tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite browser-tracer --report-only` | 07-01 calibration APIs | Complete;30060exit0, full cross-mode31/31 |
| 07-02-3 | `node --test tools/release-coverage/policy.test.mjs tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --check-policy && node tools/release-coverage/run.mjs --suite legacy-foundation --report-only && git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml` | 07-01 calibration APIs | Complete;31732exit0, exact foundation checks |
| 07-07-1 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-07-tracer --report-only` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Complete;58316exit0 |
| 07-07-2 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-07-middle --report-only` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Complete;25111exit0 |
| 07-07-3 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-07 --report-only` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Complete;82673exit0 |
| 07-08-1 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-08-tracer --report-only` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Complete;10619exit0 |
| 07-08-2 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-08-middle --report-only` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Complete;78577exit0 |
| 07-08-3 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-08 --report-only` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Complete;86113exit0 |
| 07-09-1 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-09-tracer --report-only` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Proven52873exit0; amended plan approval pending |
| 07-09-2 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-09-middle --report-only` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Proven24492exit0; amended plan approval pending |
| 07-09-3 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-09 --report-only && git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Amended seven-owner scope proven65803exit0; approval pending; full report moves12 |
| 07-03-1 | `node tests/strict-node-tests.mjs tests/release-coverage-gaps.test.mjs && node tools/release-coverage/run.mjs --suite release-gaps --report-only` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Planned; not executed |
| 07-03-2 | `node tests/strict-node-tests.mjs tests/release-coverage-gaps.test.mjs tests/release-coverage-runtime.mjs && node tools/release-coverage/run.mjs && pnpm type-check` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Planned; not executed |
| 07-04-1 | `pnpm build && node --test tests/release-conformance.test.mjs && node tests/release-conformance.mjs` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Planned; not executed |
| 07-04-2 | `node --test tests/release-conformance.test.mjs && node tests/release-conformance.mjs && pnpm test:conformance` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Planned; not executed |
| 07-05-1 | `node --test tests/release-evidence.test.mjs && node tools/release-coverage/evidence.mjs --capture-tracer && node tools/release-coverage/evidence.mjs --check-tracer` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Planned; not executed |
| 07-05-2 | `node tools/release-coverage/evidence.mjs --capture-required && node --test tests/release-evidence.test.mjs && node tools/release-coverage/evidence.mjs --check` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Planned; not executed |
| 07-05-3 | `node --test tests/release-evidence.test.mjs && node tools/release-coverage/evidence.mjs --check-clauses` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Planned; not executed |
| 07-06-1 | `node --test tests/release-gate.test.mjs && node tests/release-gate.mjs --calibration-only` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Planned; not executed |
| 07-06-2 | `node tests/release-gate.mjs && git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml && git diff --check` | Prior task and declared predecessor SUMMARY; task creates listed adapters/validators | Planned; not executed |

| 07-10-1 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-10-tracer --report-only` | Declared predecessor plus prior task; task creates named adapters/validators before use | Planned; not executed |
| 07-10-2 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-10-middle --report-only` | Declared predecessor plus prior task; task creates named adapters/validators before use | Planned; not executed |
| 07-10-3 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-10 --report-only && git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml` | Declared predecessor plus prior task; task creates named adapters/validators before use | Planned; not executed |
| 07-11-1 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-11-tracer --report-only` | Declared predecessor plus prior task; task creates named adapters/validators before use | Planned; not executed |
| 07-11-2 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-11-middle --report-only` | Declared predecessor plus prior task; task creates named adapters/validators before use | Planned; not executed |
| 07-11-3 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-11 --report-only && git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml` | Declared predecessor plus prior task; task creates named adapters/validators before use | Planned; not executed |
| 07-12-1 | `node --test tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite adapters-12-tracer --report-only && node tools/release-coverage/run.mjs --suite adapters-12-audio --report-only` | Declared predecessor plus prior task; task creates named adapters/validators before use | Planned; not executed |
| 07-12-2 | `node --test tools/release-coverage/attribution.test.mjs tools/release-coverage/collection.test.mjs && node tools/release-coverage/run.mjs --suite modes-12 --report-only` | Declared predecessor plus prior task; task creates named adapters/validators before use | Planned; not executed |
| 07-12-3 | `node --test tools/release-coverage/collection.test.mjs tools/release-coverage/attribution.test.mjs tools/release-coverage/policy.test.mjs && node tools/release-coverage/run.mjs --report-only && git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml && git diff --check` | Declared predecessor plus prior task; task creates named adapters/validators before use | Planned; not executed |

Dependency order:01 →02 →07 →08 →09 seven canonical adapters →10 eight package component owners →11 seven package built owners/variants →12 audio jobs, exclusive mode attribution and complete initial report →03 gaps →04 conformance →05 evidence →06 final runner/PR. Named groups execute entire owner files/jobs, never substitute for12 full collection.09 has proven its amended scope but awaits independent approval. Full invocation remains fail-closed until12 reconciles the mechanically resolved package/canonical/import graph, including variables/globs, and every required realm.133 entries/138 closure paths are checkpoint discovery counts, not executed-suite claims.

## Wave0 and feedback

- [x] Audited exact normal standalone dependency tree and its own reproducible lock.
- [x] Known semantic counts and declaration-only/unimported/glob fixtures.
- [x] Real opaque browser calibration and Node worker/realm completeness.
- [x] Hash/schema/path identity, duplicate/missing/mismatch negative controls.
- [ ] New conformance/evidence/runner validators implemented before their results are relied on.

Measured calibration final tier:07-01 exact10/10 took approximately1.3seconds. Shared-tracer collection checks are focused feedback; complete browser owner groups and full reports are acceptance tiers, timed separately. Fast tier: `node --test tools/release-coverage/calibration.test.mjs tools/release-coverage/policy.test.mjs` after their creation; measure elapsed time in execution and report actual seconds. Target under30seconds is not a measured fact. Browser calibration and full coverage are separately timed; no hidden arbitrary timeouts. After each meaningful change run the exact affected task check; no watch mode, no simultaneous build/browser commands. Poll actual handles to terminal with durable logs.

## Final exact frozen-source chain

`node tests/release-gate.mjs` must invoke in order:

1. `node tests/phase6-gate.mjs` **unchanged**: exact RelayGate6 then exact RaceGate7, each with declared nested Phase3/2/1 blocks; additional health-runtime once; strict cross-mode; diff check. Preserve the file digest and both canonical blocks, not a rewritten narrower command.
2. `node --test tools/release-coverage/calibration.test.mjs tools/release-coverage/browser-calibration.test.mjs tools/release-coverage/collection.test.mjs tools/release-coverage/policy.test.mjs tools/release-coverage/attribution.test.mjs`
3. `node tools/release-coverage/run.mjs` enforcing all committed global/per-file/mode floors.
4. `node --test tests/release-conformance.test.mjs` then `node tests/release-conformance.mjs`.
5. `node --test tests/release-evidence.test.mjs` then `node tools/release-coverage/evidence.mjs --check` and `node tools/release-coverage/evidence.mjs --check-clauses`.
6. `git diff --exit-code a310a81ed6c76df4b265c9012c23b8c83f4802e5 -- pnpm-lock.yaml` and `git diff --check`.

Runner records source/test/tool/standalone-lock/normal-build hashes and terminal exits for every stage. Instrumented build has its own output; additive stages cannot mutate normal dist unnoticed. Captures must agree with frozen source/build. No skipped/incomplete stage yields release-pass. Required normal type/build/guidance/conformance/solo/legacy/model/browser checks are already in the unchanged inherited runner; do not add gratuitous repetitions. A failed/superseded run remains labelled and cannot supply a full-pass claim.

## Floors, edges and threats

Use07-DECISIONS explicit policy: global/per-noncritical-file/mode90/90/85; each enumerated critical file95/95/90; exact ratios, zero-siteN/A, wholly empty fails. TEST02 boundary/empty/order map to01/02 tests. TEST04 inclusive8px/missing/stable-manifest order map to05. Unclassified A07-E3/E5/ES remain explicit assumptions with full contract coverage, not dismissed. Threat bindings:01 T07-01/02/03 (dependency audit, calibration and credential boundary),02 T07-04/05/06/07 (inventory, identity, isolated browser and strict terminal outcomes),03 T07-08/09/10,04 T07-11/12,05 T07-13/14,06 T07-15..17; every plan has ASVS1 high-block mitigation and task verification. No database/schema or AI integration is introduced.

## Human evidence and completion

Inspect current committed representative full-size images and regenerated sheets across all six frames/two themes, including motion, four participants, owners/recovery/market/results. Preserve acquisition provenance. User appearance/play-feel acceptance was received2026-10-16: presentation feels clear and usable for Survive/Relay/Race HUD, Controls, recovery and results. Root recorded formal05/06 closure with security and Nyquist evidence (cd1a05c); remaining release evidence and open PR obligations still apply. Physical controllers remain unmeasured; CLI conformance5pass/5unmeasured stays distinct from measured supplement. No publishing/merge/deploy.

## Sign-off

Task bindings are planned; implementation and independent verification remain pending. Set wave_0_complete and nyquist_compliant only from actual execution evidence. No tests, installs or commits were performed during planning.


## Review revision1: concrete transport and feedback boundaries

PC07-01 is bound in07-04 Task1 to actual visible #sound-toggle → persist → SDK storage.setItem, the installed official @napplet/nap storage shim and @napplet/core sendEnvelope, with new test-only release-conformance-host.mjs. Parent source/origin and literal request/result IDs are observed; a transparent forwarding binding calls the actual official setItem, observes and returns its unchanged promise, with per-invocation fulfillment0 before/missing/wrong-ID/wrong-source reply and exactly1 after the matching response; hidden or hydration-prepopulated #storage-status is not settlement evidence; absent invocation, fabricated-only transcript, missing/wrong reply and wrong source fail. No product import/protocol changes or direct-method fixture traffic count.

PC07-02 supplies an explicit quoted final three-mode PR title on create and update. PW07-03 adds clauses.json ownership to07-06; after recording delivery status rerun `node tools/release-coverage/evidence.mjs --check-clauses`, then push documentation and verify final PR/remote OID without repeating unchanged technical gates.

PW07-01 is reconciled by02 foundation at13 paths and07/08/09 at11 paths each. Each continuation owns exactly seven audited browser owners; no plan crosses the15-path split threshold.02 Task1 remains complete;12 alone owns full initial-report completion after the measured09 checkpoint. Additional discovered ownership beyond these budgets requires another checked continuation before edits, never omitted realms. PW07-02: per-edit feedback uses the existing task-created calibration/collection/policy tests (and conformance/evidence/runner negative tests in later plans). Whole coverage, capture matrices and inherited release gates are long task/final acceptance tiers, not rapid feedback loops. Measure both tiers separately; run the long command after focused checks pass and source is stable, without a baseline repeat or relaxed acceptance.

Adapter threats T07-A7/A8/A9 bind missing/duplicate/schema/source-scope negatives and unchanged original behavioral assertions in every continuation task. The106-path audit is a discovery candidate inventory, not106 executed tests or a complete allowlist;12 verifies every mechanically resolved entry and role before full report.

## Package-wide continuation amendment
10/11/12 own10/11/9 paths respectively; every task is bounded to at most5 paths. Fast tests are existing collection/policy negatives plus12 attribution tests after creation; actual complete browser groups/full report are long gates.11 must run genuine development and both sound-browser jobs.12 must prove exact mode-exclusive deltas, reject cross-mode/overlapping/mismatched intervals and never copy mixed worker totals into every mode. The final additive validation chain must include attribution.test.mjs alongside the existing calibration/collection/policy tests once created. Original inherited phase6 gate is unchanged. No full report is claimed by the amended09 proof.
