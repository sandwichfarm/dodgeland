---
phase: 07-release-evidence-pr
plan: "01"
status: complete
subsystem: release-tooling
tags: [coverage, calibration, source-maps, opaque-iframe]
requires: [07-PLAN-REVIEW]
provides: [audited-isolated-toolchain, exact-node-browser-calibration, validated-worker-realm-collector]
affects: [07-02, 07-03, 07-06]
tech-stack:
  added: [istanbul-lib-instrument6.0.3, istanbul-lib-coverage3.2.2, istanbul-lib-source-maps5.0.6, istanbul-lib-report3.0.1, istanbul-reports3.2.0]
  patterns: [canonical-source-maps, zero-inventory, identity-before-merge]
key-files:
  created: [tools/release-coverage/package.json, tools/release-coverage/pnpm-lock.yaml, tools/release-coverage/DEPENDENCIES.md, tools/release-coverage/instrument.mjs, tools/release-coverage/calibration.test.mjs, tools/release-coverage/fixtures.mjs, tools/release-coverage/collector.mjs, tools/release-coverage/browser-calibration.test.mjs]
  modified: []
key-decisions:
  - Standard isolated pnpm tree and root TypeScript resolution; root lock unchanged.
  - Real worker and opaque-realm payload identity checked before standard Istanbul merge/remap.
  - Calibration only; production coverage and thresholds remain07-02/03 work.
---
# Phase07 Plan01: portable semantic calibration

A normal isolated Istanbul tree reproduces the exact Node and opaque-browser semantic denominator, with mapped eager imports, untouched-source zeros and fail-closed worker/realm collection. **3/3 tasks complete; no production coverage claim.** Generic executor fallback applies the local role/workflow; no typed-runtime claim.

## Task commits

| Task | RED | GREEN | Result |
|---|---|---|---|
|1 Normal tree and Node reporter |6ff2d0f |f7bb90b |3 exact Node totals; JSON/text/LCOV; original source identities |
|2 Maps/globs/workers/failure controls |eede2af |722994c |6/6 tests,12 subprocess validity/negative cases |
|3 Actual opaque browser realms |27812ac |f04d332 |10/10 combined tests; actual visible controls, two frames and reload, matching Node schemas |

Supporting historical commits fd4bc38/9a46ddc/2d4cc99 recorded the genuine install blocker and partial checkpoint. They are superseded by the completed normal installation, not erased or counted as GREEN.

## Exact calibration

| Calls | Lines | Functions | Branches | Statements |
|---|---|---|---|---|
|choose(1) |1/4 |1/3 |1/4 |2/5 |
|choose(-1) |2/4 |1/3 |1/4 |2/5 |
|both |2/4 |1/3 |2/4 |3/5 |

All three are independently asserted in Node and Chromium allow-scripts opaque frames (origin null); every browser uses --mute-audio. Fixture controls are test-only, not product hooks. Unimported unexecuted.ts contributes zero counters. Comments/types/braces do not inflate executable sites. Declaration-only source has zero sites in the inventory. Source-level eager default imports preserve items/a.ts and items/b.ts, with catalog lines3/5. Catalog item fixture uses a real initialized binding followed by default export: Istanbul correctly gives a bare export-default object no statement sites, so that original fixture could not prove executable item mapping.

Two actual worker threads execute separate temporary emitted module instances, capture final payloads through an explicit preload, and survive deletion before reporting. Two frames plus a real srcdoc reload capture distinct final payloads; actual Node execution uses identical source/map/schema identities. Merge permutations match. Missing/duplicate/unknown realm, run mismatch, missing source, source/hash/schema/map mismatch, invalid counters, unknown source and empty payload are rejected. Browser missing/malformed/mismatched-schema cases are independently rejected.

## Actual API reconciliation

| Responsibility | Actual API / decision |
|---|---|
|Canonical TypeScript emission |Existing root TypeScript5.9.3 via createRequire rooted at package.json; before-transformer appends synthetic imports and preserves original glob node/ranges/sourceRoot |
|AST counters |Declared instrument6.0.3 createInstrumenter, instrumentSync(input, canonicalPath, incomingMap), lastFileCoverage |
|Zero inventory and merge |coverage3.2.2 createCoverageMap; validate source/hash/map/schema and counts before merging; serialize FileCoverage objects through their public JSON representation |
|Remapping |source-maps5.0.6 createSourceMapStore().transformCoverage returns CoverageMap directly; dispose after report |
|Reports |report3.0.1 createContext and reports3.2.0 create(json/text/lcovonly).execute |
|Worker collection |Node --import preload, process exit, unique run/realm identity with pid/threadId; required realms explicit |
|Browser collection |Existing Playwright1.61.0 Chromium, allow-scripts srcdoc, visible clicks, read-only counter capture before teardown |

## Dependency audit and resolved environment checkpoint

Direct versions are exact and private pnpm10.8.0 manifest/own lock committed. DEPENDENCIES.md records official HTTPS registry metadata, repository/script/dependency/integrity details and hashes for all five direct packages, plus inspected scripts/repositories for50 installed packages and50 sha512 lock entries. Lifecycle scripts were disabled. Standard Babel dependencies are unmodified; no export shim, hidden extraction or global installation.

Initial npm/Node HTTPS failed EBADF across Node25.2.1/26.7.0/26.11.1, including safe stdin/PTY/family checks. Root resolved transport by executing the same exact pnpm10.8.0 CLI under already-installed Bun1.3.14: session86029exit0, /tmp/down-to-duck-07-bun-pnpm-install.log. Ordinary pnpm frozen reinstall then passed; default documented command remains normal pnpm, not an absolute machine cache path. Original failure logs remain valid historical evidence. Root pnpm-lock is unchanged against immutable a310a81ed6c76df4b265c9012c23b8c83f4802e5.

## Verification and durable evidence

| Command / log | Actual result |
|---|---|
|Exact Task1 frozen install + Node calibration + immutable lock diff; /tmp/down-to-duck-07-01-task1-gate.log |exit0,3/3;331.70ms test duration |
|Task2 node --test tools/release-coverage/calibration.test.mjs; /tmp/down-to-duck-07-01-worker-green2.log |exit0,6/6;970.24ms |
|Task3 combined Node/browser command; handle35065; /tmp/down-to-duck-07-01-browser-green.log |exit0,10/10 |
|Final combined command + root-lock/diff checks; handle32469; /tmp/down-to-duck-07-01-final-calibration.log |exit0,10/10,0skips;1297.59ms |

Persistent artifacts/release-coverage/calibration contains browser-positive/browser-negative/browser-both and combined-realms JSON/text/LCOV, actual payloads, original fixture bytes, and provenance.json with dependency-lock/tool/source/map hashes. These are calibration fixture artifacts, not final product visual evidence or production coverage. Source/read-only review found no product modifications or required acceptance stub. Full inherited application gate was deliberately not repeated; final release gate remains07-06.

## Deviations and limits

Necessary bounded runtime diagnosis and the existing-Bun pnpm invocation resolved the real environment prerequisite without changing dependency strategy. First expansion run exposed fixture semantics (bare default literal has no Istanbul statements) and CoverageMap's public FileCoverage JSON objects; corrected while retaining exact required semantic totals. No gameplay, shell protocol, preview5175 or root dependency changes. Physical controllers and05/06 human acceptance remain unmeasured/pending. TEST02/03/05 span later plans and are not marked complete here.

## Self-Check: PASSED

All8 owned files and listed commits exist. Final command terminal exit0 and artifact paths checked. Root lock/oracle preserved; no live executor process. Plan completion is not phase or milestone completion.
