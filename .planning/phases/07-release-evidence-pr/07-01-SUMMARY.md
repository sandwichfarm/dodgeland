---
phase: 07-release-evidence-pr
plan: "01"
status: blocked
subsystem: release-tooling
tags: [coverage, calibration, dependency-audit]
requires: [07-PLAN-REVIEW]
provides: [retained-exact-calibration-red, official-direct-package-audit]
affects: [07-02]
key-files:
  created: [tools/release-coverage/calibration.test.mjs, tools/release-coverage/package.json, tools/release-coverage/DEPENDENCIES.md]
  modified: []
---
# Phase07 Plan01: calibration transport checkpoint

Exact fixture RED and direct dependency audit are retained; normal package installation is blocked by Node HTTPS EBADF. **0/3 tasks complete.** No instrumenter, collector, standalone lock, GREEN calibration or production coverage exists. Generic executor fallback applies the local role/workflow; no typed-runtime claim.

## Completed preparation

- `6ff2d0f` retains independent positive/negative/both semantic totals, original locations, untouched-module zeros and JSON/text/LCOV assertions before implementation.
- `fd4bc38` records the private exact-version manifest and official registry audit: instrument6.0.3, coverage3.2.2, source-maps5.0.6, report3.0.1, reports3.2.0; pnpm10.8.0. Full dependencies/scripts/integrity and metadata digests are in DEPENDENCIES.md. No direct install/postinstall hook; reports prepare exists and scripts are disabled. Transitive installation/audit and frozen reinstall are unfulfilled.
- Root TypeScript5.9.3 would be deliberately resolved from the existing root; no root dependency edits were made.

## Actual commands and evidence

| Evidence | Terminal result |
|---|---|
| npm official metadata, handle37603; /tmp/down-to-duck-07-01-registry.log | exit1 EBADF |
| Exact official metadata with ordinary HTTPS curl for all five names | exit0; JSON digests recorded in DEPENDENCIES.md |
| Node calibration; /tmp/down-to-duck-07-01-node-red-confirmed.log | exit1, instrument.mjs absent; intended retained RED, no passing claim |
| pnpm isolated install; /tmp/down-to-duck-07-01-install.log | exit1, final EBADF fetching node-releases2.0.54; no own lock |
| npm PTY/no retries; /tmp/down-to-duck-07-01-npm-pty.log | exit1 EBADF |
| Node26.11.1 explicit IPv4; /tmp/down-to-duck-07-01-node-ipv4.log | connect EBADF104.16.7.34:443; IPv6 also failed |
| Existing Node26.7.0 and25.2.1 with matching installed dylibs; /tmp/down-to-duck-07-01-node267-restored.log and node25-restored.log | both exit1 HTTPS EBADF after printing actual versions |
| Immutable root-lock diff against a310a81ed6c76df4b265c9012c23b8c83f4802e5 | exit0 |

The first RED command printed its log afterward, so shell exit0 was not a test pass; the second dedicated command authoritatively exited1. Package install resolved cached metadata but failed network retrieval; partial ignored tools/release-coverage/node_modules is not a working audited tree. No hidden tarball extraction, global install, Babel export shim or transport replacement was attempted. No browser or baseline gate ran, and preview5175 was untouched.

## API reconciliation

| Planned interface | Actual finding |
|---|---|
| Standard isolated pnpm manifest/own lock | Private pinned manifest written; normal install attempted, no lock produced |
| Exact Istanbul instrument/map/report APIs | Cannot reconcile against a normally installed working tree yet; implementation intentionally absent |
| Node networking prerequisite | Official registry curl works; Node HTTPS fails across25.2.1/26.7.0/26.11.1, stdin/PTY/family alternatives |
| Calibration denominator | Exact independent expectations retained from approved plan; not measured GREEN |

## Resume requirement

Restore a working normal Node/package-manager network transport in this execution environment, then rerun the exact isolated install, inspect resolved transitive packages/scripts, produce and freeze the standalone lock, implement Task1 and complete all three verification commands. This is a technical environment checkpoint, not package-name doubt or a request for new permission. Do not continue07-02 before Node and opaque-browser calibration pass. The blocked SUMMARY is not plan completion.

## Deviations and limits

The necessary safe network diagnosis was bounded to official registry, existing binaries and matching already-installed libraries. No user credentials/configuration were read or changed. Package metadata is direct-package audit only; dependency integrity/reproducibility remains unproved. Tasks2/3 and their verification remain unrun due the prerequisite. Human05/06 acceptance stays pending; no requirements or phase marked complete.

## Self-Check: PASSED for checkpoint only

The three owned files and both listed commits exist; root lock unchanged. No live executor process remains. Calibration completion criteria are not met.
