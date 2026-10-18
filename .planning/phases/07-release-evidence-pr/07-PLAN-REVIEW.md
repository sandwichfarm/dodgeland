---
phase: 07-release-evidence-pr
reviewed: 2026-10-16
status: passed
reviewer_execution: generic-agent-fallback
plans_checked: 12
tasks_checked: 33
blockers: 0
warnings: 0
---

# Phase07 independent plan review

**CURRENT RECHECK: VERIFICATION PASSED — twelve plans,33 tasks, waves1–12; no concrete blocking findings.** The package-wide amendment at `44f3765` preserves all27 discovered additional entries, genuine development/browser variants and exclusive mode attribution.07-12 now owns the complete initial report;07-03 depends on12. Prior reviews remain historical; approval does not establish complete execution coverage.

The original review and first recheck below are retained as historical findings, not the current unresolved count.

Applied the full local gsd-plan-checker role and required references as a generic fallback, not typed-agent execution. Read all six plans, decisions, validation, API/edge probes and coverage declaration. Reused the already-read context/research/patterns, original request/requirements, prior verification and exact phase6 runner. Independently ran all six structural validators: all valid, no structural warnings; this does not resolve the substantive findings below. No application tests, installs or source edits were run.

## Blockers

### PC07-01 — The supported SDK wire tracer lacks an executable operation/transport contract

**Severity: BLOCKER — task completeness / key links.**

**Location:**07-04 Task1 `<read_first>`, `<behavior>` and `<action>`.

The task promises a real user-triggered supported SDK request and matching reply, but only says “Reuse existing shell fixture” and “record ... from the real receiver.” It does not name the supported SDK operation, visible user action, fixture path, injected transport binding or request/reply schema. This distinction is material: `tests/market-game-fixture.mjs:32–44` directly implements injected storage/theme/keys methods; those method calls do not emit a supported wire envelope. `tests/gamepad-runtime.mjs:40–55` records actual controller messages, but the installed engine rejects that separately authorized draft as unknown-domain, as the plan itself correctly acknowledges.

Reusing either analog without an additional supported transport adapter cannot supply the promised engine-supported wire proof. The plan must tell the executor which actual bridge is to be built/reused, rather than allowing fixture-generated envelopes to become apparent product traffic.

**Minimal fix:** In07-04 Task1, name one real supported SDK operation and the actual visible action that invokes it; cite the installed authoritative transport implementation/schema and exact fixture path. Specify the test-host binding/receiver that transports the real SDK invocation, preserves request/reply correlation and direction/source, and records the resulting envelopes. Add negative assertions for absent invocation, missing/mismatched reply and synthetic-only evidence. Include any new helper in file ownership. Keep gamepad draft and manifest limitations separate. No product protocol change or new dependency is required merely by this finding.

### PC07-02 — The exact autonomous PR command omits its required title input

**Severity: BLOCKER — verify/command executability.**

**Location:**07-06 Task2 `<action>`, the specified `gh pr create --base main --head feat/local-multiplayer --body-file ...` command.

The installed `gh pr create --help` explicitly says it prompts for title/body unless they are provided or filled. Supplying `--body-file` supplies only the body. The plan does not supply a title, `--fill` or an interactive execution step, so its stated noninteractive delivery command can stop at the title prompt rather than open the required PR.

**Minimal fix:** Write a concrete final-product title and add safely quoted `--title` to the creation command; keep `--body-file`. Specify the matching title/body update on an existing intended PR. Retain the already-planned base/head/OID/open-state readback. This needs no new user permission.

## Warnings

### PW07-01 — Plan02 is above the file-count scope target

**Severity: WARNING — scope sanity.**07-02 declares12 paths across3 tasks, plus potentially additional raw browser harness adapters. This exceeds the role's10-file warning threshold, though it is below the15-file blocker threshold. The optional loader, browser build and policy form one understandable sequence; no mandatory split is justified yet. Keep the suite/realm audit bounded and make exact adapter ownership explicit before changes, as Task2 already requires. If that audit raises the actual file count to15 or more, split the adapter work into a dependency-ordered continuation rather than silently expanding this plan.

### PW07-02 — Several verification commands are intentionally slow integration gates

**Severity: WARNING — Nyquist feedback latency.**07-02 Tasks2–3,07-03 Task2,07-05 Task2 and07-06 Task2 collect complete browser/coverage or inherited matrices. They cannot serve as the only rapid edit-feedback loop. VALIDATION already supplies a separate fast calibration/policy tier and requires measured execution times, which is the appropriate mitigation. Retain that distinction; no extra full baseline run or weaker acceptance gate is recommended.

### PW07-03 — Final clause update is outside Plan06's declared file ownership

**Severity: WARNING — file ownership / task completeness.**07-06 Task2 says “Update release/clauses with actual terminal evidence,” but neither its `<files>` nor frontmatter includes `docs/release-evidence/clauses.json`, owned earlier by07-05. Sequential waves prevent a concurrent conflict, but the executor's concrete ownership should match the task. Add that path to07-06 Task2/frontmatter and specify rerunning the clause-integrity check after the final delivery-status update, without repeating the unchanged full technical chain for documentation-only changes.

## Goal-backward coverage

| Requirement | Plans/tasks | Assessment |
|---|---|---|
| TEST-02 |01 all;02 all;03 all;06 final | Exact calibration precedes production measurement, all-source zero inventory, identity/schema checks, explicit floors and meaningful uncovered-branch ledger are planned |
| TEST-03 |01 browser;02 collection;03 gaps;04 wire;05 provenance;06 final | Actual mode/base, opaque realms and input provenance are covered; PC07-01 blocks the supplemental supported-wire seam |
| TEST-04 |05 all;06 final | Current image bytes, complete required cells, stable manifest/sheets, direct full-size inspection and8px boundaries are explicit |
| TEST-05 |01–04;06 | Unchanged exact inherited runner plus calibrated additive commands, real terminal outcomes and honest conformance scope are planned |
| SHIP-01 |05 clauses/assets;06 delivery | Existing branch, explicit commits, durable remote evidence and readback are planned; PC07-02 blocks the exact creation command |

Original request and PROJECT release obligations are represented: every user clause must map to authority/assertions/evidence, immutable solo parity remains mandatory, all three modes and both Survive bases remain in coverage, and an actual open PR is required. PROJECT's older progress prose is not treated as current phase verification. No requested gameplay was silently reduced or postponed to obtain percentages.

## Plan and dependency summary

| Plan | Tasks | Declared paths | Wave | Depends on | Assessment |
|---|---:|---:|---:|---|---|
|07-01 |3 |8 |1 |— | Correct hard-constraint-first calibration |
|07-02 |3 |12 |2 |07-01 | Valid dependency; scope warning |
|07-03 |2 |4 |3 |07-02 | Measurement-driven gaps, not invented REDs |
|07-04 |2 |3 |4 |07-03 | Supported-wire binding needs revision |
|07-05 |3 |6, including bounded image directory |5 |07-04 | Complete visual/clause pipeline |
|07-06 |2 |4 |6 |07-05 | PR command and clause ownership need revision |

All dependencies exist, form an acyclic sequential chain, and have consistent waves. No same-wave shared-file conflict. Later edits to suites/instrumentation/collectors have declared dependency ordering. Adaptive source repairs are constrained to proven defects, retained RED and explicit ownership addenda; they do not authorize a speculative gameplay rewrite.

## Dimension findings

- **Task structure:**15/15 tasks have files/actions/verification/done, read-first and concrete acceptance. Structural checks pass. PC07-01 is a substantive missing API/transport binding despite valid XML structure.
- **Calibration and contracts:**01 owns normal isolated dependency audit/install/reinstall and exact independent denominators before02 measures production. Canonical maps/hash/schema precede merging; declarations, unimported sources, workers, frames/reloads, duplicate cumulative snapshots and permutations are explicit. Instrumented output stays separate from normal dist. Baseline copies, examples and altered sampler variants cannot inflate current coverage.
- **Coverage policy:**02/03 use exact unrounded90/90/85 global/noncritical-file/mode floors and95/95/90 enumerated critical-file floors; zero-site metrics are N/A and wholly empty reports fail. Main/render/UI and development scope have explicit strata. Every meaningful uncovered branch must link a requirement and real behavior or proven disposition. No floor reduction, ignore directive or catalog-import-only substitute is authorized.
- **Architecture/patterns:**Tooling owns collectors/reporting, host fixtures own realm/wire measurement, product mechanics remain authoritative, and documents own remote review evidence. Existing loader/strict runner/opaque fixture/hash/gate analogs are referenced. New instrumenter/merge semantics require calibration rather than assumed analogy.
- **Root constraints:**Standalone own-lock normal package resolution is distinct from the immutable root lockfile. No root dependency edit, oracle repin, hidden tarball/Babel shim or global-package reliance is permitted. EBADF/null metadata is not a fabricated safety finding or automatic user approval gate.
- **Gates:**07-VALIDATION specifies the exact unchanged phase6 runner, all additive calibration/coverage/conformance/evidence stages and root checks. Both canonical nested Relay/Race blocks and health-runtime once survive. Negative runner fixtures cannot count as production acceptance. Final frozen-source gate is distinct from earlier accepted entry evidence.
- **Conformance:**Current authority, legacy structural engine, draft controller transport and unmeasured signature/publication/hardware remain distinct. No default boot booleans or synthetic traffic may supply a passing production claim. PC07-01 must make the supported operation executable.
- **Human completion:**05/06 human_needed remains pending until a real response, with no inferred acceptance. Technical preparation and the already-authorized review PR may proceed. Final milestone completion remains blocked by actual outstanding acceptance, not by an invented new dependency/PR permission question.
- **Security:**Each plan has task-bound ASVS1/high-block threats for supply chain, false coverage, identity, boundaries, stale visuals, omitted clauses, secrets and wrong remote/head. No database/schema/AI integration is introduced. COVERAGE.md correctly resolves the API detector's heading-only signal without dropping real wire validation.

## Edge and prohibition audit

All9 original probe candidates are retained in07-DECISIONS. Six have explicit executable criteria: TEST-02 threshold adjacency/empty/order in01/02; TEST-04 clearance adjacency/missing evidence/stable order in05. The three unclassified candidates A07-E3/E5/ES stay explicitly unresolved as taxonomy classifications while their actual flow/gate/PR contracts are assigned to02/05/06. They were not silently dismissed.

Two-stage prohibition recall is recorded per requirement, then narrowed to existing constraints/security canon. Empty `prohibitions: []` is justified by that precision pass; no invented ethics/value rule or dropped retained prohibition was found.

## Nyquist compliance

VALIDATION exists and binds all15 task commands to creation order. No MISSING test command, watch mode or comparison-feeding swallowed failure was found. Proposed files are created in the invoking task or an earlier dependency. Counts in the semantic fixture are explicit calibration contracts, not fabricated current-suite measurements.

| Plan | Automated task checks | Creation prerequisite | Sampling |
|---|---|---|---|
|01 |3/3 | Each task creates its calibration/collector test before use | PASS |
|02 |3/3 |01 plus task-created collection/policy tests | PASS |
|03 |2/2 |02 plus retained production gap tests | PASS |
|04 |2/2 | Task-created conformance tests; concrete wire seam needs PC07-01 | Conditional |
|05 |3/3 | Task-created evidence schema/negative tests, prior production reports | PASS |
|06 |2/2 |01–05 plus runner negatives | Conditional on delivery fix |

The long full-coverage/final acceptance commands are intentional, with a separate fast tier; latency warning PW07-02 is not a demand for more baseline repetitions. Wave0 remains correctly incomplete until actual calibration execution. No execution evidence is inferred from this plan check.

## Structured issues

```yaml
issues:
  - id: PC07-01
    plan: "07-04"
    task: 1
    dimension: task_completeness
    severity: BLOCKER
    description: "Supported SDK wire proof has no named operation, visible trigger, fixture or transport binding; current analogs provide direct injected methods or unsupported controller-draft traffic."
    fix_hint: "Specify the supported SDK operation and authoritative request/reply adapter, actual trigger, ownership and correlation/missing-evidence negatives."
  - id: PC07-02
    plan: "07-06"
    task: 2
    dimension: command_executability
    severity: BLOCKER
    description: "The exact gh pr create command supplies body-file but no title, leaving an interactive prompt in autonomous delivery."
    fix_hint: "Provide a concrete safely quoted --title and the matching existing-PR update while retaining base/head/OID/open readback."
  - id: PW07-01
    plan: "07-02"
    dimension: scope_sanity
    severity: WARNING
    description: "Twelve declared paths plus possible harness adapters exceed the file-count warning target."
    fix_hint: "Keep adapter audit bounded; split a continuation if explicit ownership reaches fifteen paths."
  - id: PW07-02
    plan: "07-02/03/05/06"
    dimension: nyquist_latency
    severity: WARNING
    description: "Full production coverage/browser/final gates exceed rapid edit-feedback scope."
    fix_hint: "Retain the already-declared fast calibration/policy tier and measure actual durations separately."
  - id: PW07-03
    plan: "07-06"
    task: 2
    dimension: file_ownership
    severity: WARNING
    description: "Final clauses update is instructed but clauses.json is absent from Task2 and frontmatter ownership."
    fix_hint: "Declare clauses.json and recheck it after final delivery-status updates without a redundant full technical rerun."
```

Only this review report was written. Existing planner edits were preserved. Return for the bounded revisions above; no phase completion or implementation acceptance is asserted.

## Bounded revision recheck — 2026-10-16

**Current verdict: BLOCKING ISSUES, one residual PC07-01 assertion correction.** Inspected revised07-02/04/06 and VALIDATION; traced the actual application functions through the installed SDK/nap/core source. No application execution or tests were run.

| Finding | Recheck disposition |
|---|---|
| PC07-01 supported wire binding | Binding portion resolved; completion-observation assertion remains BLOCKER as detailed below |
| PC07-02 autonomous title | RESOLVED: explicit quoted final-product title on create and matching PR update |
| PW07-01 scope | RESOLVED with explicit12 paths plus at most2 audited adapters;15 triggers a dependency-ordered continuation |
| PW07-02 latency | RESOLVED with distinct focused calibration/collection/policy/negative tests and long acceptance tiers; actual durations remain to be measured |
| PW07-03 ownership | RESOLVED: clauses.json added to07-06 frontmatter/Task2; post-update clause check, documentation commit/push and final OID readback specified |

### Concrete transport proof from installed source

- `src/sound-settings.ts:96–98`: visible `#sound-toggle` click calls `setMute`, updates the preference and invokes the supplied change callback.
- `src/main.ts:391`: that callback calls `persist()`; `main.ts:650–655` queues the save after hydration and awaits SDK `storage.setItem('puddlehop.progress.v1', JSON.stringify(progress))`.
- Installed `@napplet/sdk`0.29.0 `dist/index.js:109–110` forwards to `requireDomain('storage').setItem(key,value)`.
- SDK dependencies declare `@napplet/nap`0.33.0 and core0.33.0. Nap's public `./storage/shim` export exists and reexports `nappletStorage` and `installStorageShim`.
- Installed nap `dist/chunk-Q2OL6E2V.js` builds the real `storage.set` envelope with UUID/key/value, registers the pending request, and sends through `postToShell`. `handleStateResponse` rejects non-parent sources, finds a matching pending ID and resolves/rejects it. Missing replies reject after5000ms. `installStorageShim` returns listener/pending-map cleanup.

Thus the host-only official binding is an executable seam; no synthetic request or product hook is necessary. The first CJS `require.resolve` inspection failed because these exports are import-only; package-relative inspection verified them. Execution should use ESM/bundler resolution from the SDK dependency context, as the revised plan requires, rather than assuming a CJS export or hardcoding pnpm paths.

### Residual PC07-01 — stale/hidden status is not per-request completion

**Severity: BLOCKER — verification correctness.** Revised07-04 Task1 requires “visible #storage-status success only after the matching response.”

Actual source contradicts that observation contract:

1. `index.html:127` places `#storage-status` inside hidden `#collection-camp` and a separately hidden storage page. It is not visible in the specified ready-screen regular-frame sound-toggle journey.
2. `src/main.ts:1793` writes `Progress saved by your shell` when hydration finishes, even with a null stored value. The task explicitly awaits hydration before the sound click.
3. `persist()` does not clear that text while a new save is pending. Therefore the same success text already exists while the new reply is missing or mismatched. Revealing it afterward would still not prove which request settled.

**Minimal correction:** Replace that assertion with a test-host per-invocation observation of the official storage binding's returned promise. A transparent forwarding wrapper may call the unmodified official `nappletStorage.setItem`, return its original promise and record invocation/resolution/rejection without manufacturing requests or settling it. Bind that invocation to the newly observed frame request and changed muted value. Require zero new settlement for missing/wrong-ID/wrong-source replies before timeout or the correct reply, and exactly one successful settlement after the matching parent response. Preserve the actual5s failure path. Treat status text as supplemental UI only; if visibility is asserted, navigate through the real collection/Camp/storage controls and acknowledge that hydration already supplied the success text. A read-only mutation observation of the new successful write is another possible supplemental signal, but existing text alone is not completion evidence.

No production change or new dependency is requested. Keep the actual visible sound toggle as the trigger and the no-invocation/synthetic-only negatives. All other requested revisions are accepted.

```yaml
current_issues:
  - id: PC07-01
    plan: "07-04"
    task: 1
    dimension: verification_correctness
    severity: BLOCKER
    description: "The requested visible storage success after reply is hidden in the ready flow and already set by hydration before the tested request."
    fix_hint: "Observe the new official-binding invocation's promise settlement, require no settlement for invalid/missing replies and one for the matching reply; navigate real controls for any supplemental visible status assertion."
```

## Final bounded recheck — revision2

**VERIFICATION PASSED.** Rechecked only the residual PC07-01 revision in07-04 Task1,07-VALIDATION and07-DECISIONS against the actual application/installed shim source traced above.

The task now explicitly requires a transparent test-host forwarding binding that calls the official `nappletStorage.setItem` with unchanged arguments, observes its returned promise and returns that same promise. It cannot synthesize the request or replace the promise with a resolved mock. Each invocation is associated with the literal newly observed request after the hydration baseline. Zero fulfillment before/missing/wrong-ID/wrong-source response, exactly one after the correlated response, real timeout rejection and no duplicate settlement are all explicit. The hidden/hydration-prepopulated status element is expressly forbidden as completion proof. This matches the installed shim's pending-ID, parent-source and timeout behavior and closes the residual finding.

PC07-01 and PC07-02 are resolved; PW07-01/02/03 remain resolved by the previously inspected bounded scope, fast/long verification tiers and final clause ownership/check. No remaining claim depends on stale UI text. Current issue list: `[]`.

Six plans,15 tasks, waves1–6 remain ready for execution. Calibration, package resolution, production coverage, conformance supplement, visual inspection and the PR still require actual execution evidence; Phase05/06 human acceptance remains pending. Only this report was updated, with history preserved. No source/plan edits, application tests, installs or commits.


## Adapter checkpoint recheck — f9024c9

**VERIFICATION PASSED.** Applied the full local plan-checker role and required references as a generic fallback. Reviewed the amended foundation, all three new continuations, downstream dependencies, checkpoint/realm inventory, decisions and validation contracts against the previously reviewed requirement/context/pattern baseline. Independently reran all18 plan-structure/must-have extraction checks: nine structurally valid plans,24 tasks, no structural errors or warnings. No application/test execution, installation, source edit or plan edit occurred during this recheck.

| Execution order | Tasks | Declared paths | Wave | Dependency |
|---|---:|---:|---:|---|
|07-01 |3 |8 |1 |— |
|07-02 |3 |13 |2 |07-01 |
|07-07 |3 |11 |3 |07-02 |
|07-08 |3 |11 |4 |07-07 |
|07-09 |3 |11 |5 |07-08 |
|07-03 |2 |4 |6 |07-09 |
|07-04 |2 |4 |7 |07-03 |
|07-05 |3 |6 |8 |07-04 |
|07-06 |2 |5 |9 |07-05 |

### Goal, scope and ownership

- TEST-02/03/05 retain calibration → canonical all-source inventory → actual Node/browser collection → measured gaps → enforcing report. TEST-04 remains the complete current visual/clauses pipeline in05; SHIP-01 remains verified open PR delivery in06. No requirement was traded for a smaller adapter scope.
- The checkpoint's21 independent browser owners appear exactly once across07/08/09: seven component/canvas, seven local-input/lifecycle, seven remaining built owners. Legacy sound/gamepad and the common market fixture remain foundation02 responsibilities. Shared helper/runner/manifest changes are sequential, so no same-wave ownership conflict exists.
- Foundation02 is13 paths; each continuation is11. These exceed the usual file-count target, but explicitly bound repetitive adapters around one shared contract, use three tasks of at most five paths, and stop for another checked continuation before reaching15. This is the concrete resolution of historical PW07-01, not silent expansion.
- Numbering03 after09 is an explicit acyclic execution dependency, not a reference to unavailable future output: waves and context agree,03 reads09-SUMMARY and the complete report. Foundation02 no longer claims the former full-report completion.

### Executability and cross-plan contracts

02 Task2 creates artifactForCoverage/registerRealm/collectRealm/finishRealms and generic manifest dispatch before continuations use them. It creates the browser-tracer dispatch before policy/manifest files exist, and supplies evaluatePolicy/--check-policy before Task3. Task3 owns the two legacy adapters and policy/manifest; no undeclared runner edit is required there. Each continuation Task1 owns helper/negative-test/runner changes, then subsequent tasks add named owner groups through suites.json. All exact intermediate groups run complete original owner files rather than test-name filters.

Registration occurs before navigation, collection before close/reload/remount, and completion rejects missing, duplicate or empty required app realms. Node-only/browser-only/mixed/control-plane roles are explicit: browser-only workers cannot create fake Node hits, mixed owners must produce both, strict-runner negative subprocesses retain their failure semantics. Oracle/altered-source namespaces cannot merge into current identities. Component-arranged and real public-input provenance remain distinct.

09 Task3 explicitly reconciles the106 static candidates **and transitive helper imports** against the canonical runner/package graph.106 is a discovery count, not an executed-test count or selected allowlist. Additional actual owners trigger bounded planning rather than omission. Default full collection fails while any required adapter remains pending.09 then owns the complete all-source/all-realm initial report; report-only may expose real threshold shortfalls but cannot claim threshold compliance.03's enforcing run remains mandatory.

### Preserved gates and reviewed findings

All24 tasks have automated verification with concrete creation prerequisites, behavior and done criteria. Every three-task window retains automated feedback. Collection/calibration/policy negatives remain the fast tier; full owner groups and the complete report are explicitly slower acceptance tiers. No new baseline repeat or test-filter workaround is introduced.

The original exact floors remain90/90/85 global/noncritical-file/mode and95/95/90 critical-file, without rounding concessions, suppression or denominator deletion. Exact calibration precedes production collection. Canonical content/map/schema validation, unimported zeros and source scopes remain binding. The API contracts and shared responsibility tiers match the previously approved research/pattern design.

Read `tests/phase6-gate.mjs` and final VALIDATION chain:07-06 still invokes it unchanged, preserving both nested Relay6/Race7 blocks and health-runtime once, then additive calibration, enforcing coverage, conformance and evidence integrity. Instrumented build stays separate from normal dist; source/build/lock hashes and terminal outcomes remain required. The supported wire promise-observation fix PC07-01, explicit PR title PC07-02 and final clause ownership PW07-03 remain intact.

All nine original edge-probe dispositions and prohibitions remain preserved. New T07-A7/A8/A9 threats bind required-realm/source-scope negatives and unchanged behavioral assertions to the continuation tasks; no product protocol or trust-boundary relaxation is planned.

Parent reports actual user acceptance on2026-10-16; plans correctly link root-owned UAT/verification/security records instead of asking for acceptance again. The conditional legacy wording “human_needed remains until actual acceptance” does not override that received response. Physical controllers and protocol limitations remain honestly unmeasured where applicable. Security audits05/06 were separately committed as40f42bd; this plan check does not seal phases or certify future release evidence.

```yaml
current_issues: []
```

Only07-PLAN-REVIEW.md was updated for this plan-check stage. Earlier review history and other agents' documentation were preserved. Ready to resume07-02 Task2, then follow the declared continuation order; no full coverage or PR completion is inferred.


## Package-wide inventory and attribution recheck — 44f3765

**VERIFICATION PASSED.** Generic-agent fallback applying the full local plan-checker role. Reviewed the amended twelve-plan graph with emphasis on09's scoped seal and10/11/12, checkpoint/summary, package commands, actual collection API seams, decisions and validation. Graph lookup returned no coverage-tool nodes; targeted source reads supplied the missing helper/runner/config context. Independently reran all24 structure/must-have extraction checks:12 valid plans,33 tasks. No source edits, application tests, installs or commits during this recheck.

### Coverage preserved

| Newly discovered responsibility | Exact assignment | Result |
|---|---|---|
|8 independent component owners |10: actor; power/coin/magnet; preview/scenery/mob/wearables | All8 named paths appear; complete suites and pages retained |
|7 independent built owners |11: devtools; power/intents/market; mob/seed/sound | All7 named paths appear; genuine development, separate Paja page and both sound-browser jobs explicit |
|2 audio generation owners |12 Task1: audio-demo/audio-zones | Actual canonical source execution/PCM assertions; not misclassified helpers |
|8 existing shared-fixture consumers |12 Task3, exact09 checkpoint inventory as read-first | Each worker and shared-fixture realm required, existing collector reused, output restoration on failure |
|2 Node suites |12 Task3: exact checkpoint inventory | Real Node workers through canonical-capable loader; all tests required |

All17 additional independent owner filenames match the checkpoint and new plans. The remaining ten entries have explicit inventory/execution responsibility rather than unnecessary new adapters. The original21 adapted owners remain required; their completion cannot satisfy the newly discovered obligations.

09's amendment is a legitimate scope transfer: its seven owned adapters have cited65803 exit0 and34 payloads, while the full report was not run. The new SUMMARY expressly disclaims original full-report success. This check approves the revised dependency contract, not an independent rerun or new certification of65803. Default full collection remains incomplete until12.03 reads12-SUMMARY/report, so no gap-closure task can consume09's partial report as complete.

### Mechanical inventory completeness

12's inventory_reconciliation explicitly requires independent resolution of **all package-command recursion plus canonical runner arrays, local static/dynamic imports and fixture loaders**, including actual variables and globs against tracked files. A literal regex is only candidate discovery. Every entry retains origin, resolved job and disposition; unresolved dynamic execution or an unmatched source-executing entry fails completeness. The executed job/realm ledger must match this independently resolved inventory before a full report is issued.

This closes the planning cause of the second discovery gap:106 covered only the canonical gate graph, while133/138 were still static snapshots. None of those numbers is now an allowlist or execution count. The plan cannot guarantee there are no further actual owners before execution, but it expressly prevents a third omitted owner from being silently accepted. Any genuine additional adapter requires explicit bounded ownership before edits. Helpers, source-executing audio generation, control-plane synthetic subprocesses and upstream conformance are distinguished by actual role, not by what a regex happened to find.

### Attribution and merging

12 Task2 specifies actual six-mode acquisitions in fresh realms, read-only actual mode/base assertions before and after a live interval, and counter deltas from the same realm without resetting counters. Known fixtures test statements/functions/branch arrays, zero intervals, identity mismatch, decreasing counters and overlapping/duplicate intervals. Missing mode proof and mixed-total relabeling reject. Boot/setup and cross-mode intervals remain unclassified.

The parent realm's complete final snapshot supplies global/per-file coverage. Mode intervals are a separate projection and are never added back into that global snapshot. Existing mixed Node/browser worker totals remain global-only unless independently partitioned by equally valid proof; mode-exclusive workers are allowed only under that provenance contract. Missing source counters retain canonical zero denominators. Source/map/schema/run/realm/build identity and oracle/variant separation remain mandatory. All nine policy strata retain explicit roots and real contributing jobs; genuine development comes from11's development job, not a production payload relabel.

This is an executable attribution design, not a prediction that a short six-mode tracer will reach the floors.12 must publish actual sorted shortfalls;03 still owns meaningful branch expansion and enforcing success. Missing/unknown attribution cannot supply a passing stratum, and no floor reduction is authorized.

11's declared helper/config/runner ownership covers the existing API changes needed for genuine production/development artifacts and distinct browser jobs. Original production stripping scans remain on ordinary production bytes; instrumented sourcesContent cannot replace them. Sound Chromium and Firefox are separate required jobs; actual browser failure is explicit rather than a substitution/skip. Paja receives the selected artifact and each real navigation is registered/captured.12 audio jobs preserve PCM assertions and use canonical compilation rather than a second audio implementation.

### Dependency, scope and verification

Execution is01 →02 →07 →08 →09 →10 →11 →12 →03 →04 →05 →06, waves1–12. All dependencies exist and are acyclic. The new plans own10/11/9 paths and three tasks each; tasks own at most five paths. Shared manifests/helpers are edited sequentially. All33 tasks have automated checks, with the new attribution test created before its use. Fast collection/attribution/policy negatives stay distinct from complete browser groups and the long full report.

TEST-02/03/05 retain complete calibrated inventory, actual realms, immutable zeros, semantic branch review and exact90/90/85 ordinary/global/mode and95/95/90 critical floors. TEST-04 and SHIP-01 remain unchanged downstream visual/clauses and verified open-PR delivery obligations.12 report-only and enforcing paths must share full collection and the same evaluator; negative fixtures establish below-floor failure without a gratuitous second known-failing full collection.

VALIDATION now includes attribution.test.mjs in the final additive calibration stage. The inherited phase6 runner remains byte-identical and mandatory, with both canonical nested blocks and health-runtime once. Original wire-correlation/returned-promise proof, PR title/head readback, durable images, root lock/oracle and human-acceptance record requirements remain in force. No new dependency, product hook, protocol relaxation or speculative source change is requested.

```yaml
current_issues: []
```

Only this review document was changed. No complete production report, floor pass, release acceptance or PR delivery is inferred. The bounded amendment is ready for root recording of09's revised scope and execution of10 onward.
