---
phase: 07-release-evidence-pr
plan: "04"
subsystem: testing
status: complete
completed: 2026-10-18
requirements-completed: [TEST-03, TEST-05]
provides: [actual opaque-frame storage wire, measured scoped teardown, current public manifest subset validation]
affects: [07-05, 07-06]
---

# Supplemental conformance measured

Normal artifact SHA256 `e9800fc8f06e848c933243def3783d23f630042543fe523a3e7fd25fd4925542` matches the enforcing
coverage build. Durable report: `docs/release-evidence/conformance.json`, SHA256
`80f9de96de40d4acdc49ea1738384f9eea05303c1a21023497bc5b9cb5afcf69`. It retains exact public unsigned candidate text, reference
revision/digest, installed dependency/bundled-shim source hashes, real receiver
transcripts, per-invocation promise settlements, scoped teardown and command logs.

Executed sequentially: normal `pnpm build` exit0; conformance units exit0 (3/3,
zero skips); actual supplement exit0; `pnpm test:conformance` exit0. The supplement
measures all five scenarios: no invocation and missing reply reject acceptance;
matching reply, wrong-ID followed by correct reply, and wrong-window followed by
correct reply complete. Neither mismatched response settles the invocation;
duplicate correct responses settle it only once. Actual official shim emits
UUID-correlated storage requests from an opaque allow-scripts iframe. The host
commits the literal received key/value before acknowledgment. No gamepad domain,
native device polling, external request or page error occurred. Repeated pagehide
closes the measured product subscriptions once and leaves no measured RAF or
ResizeObserver; host-owned shim/message cleanup is separately observed.

The current candidate field subset and direct artifact hash pass independently.
Primary reference was retrieved 2026-10-18T02:33:45Z from NIP-5D PR2303, still an
open proposal, pinned head5560820fa4f37f45b8ab742a11aeb3001b17dc67. Installed
conformance0.13 rejects the current direct-x candidate's legacy shape and draft
controller calibration. Its actual outbound storage envelopes pass; inbound
result messages are not relabeled outbound. Supplemental engine:6 pass/4 skip;
existing CLI:5 pass/5 skip. Missing evidence remains unmeasured in both reports.

Plan deviation: the ready board intentionally conceals the HUD. Attempts01–03
retained the resulting visibility timeout; diagnostics found no product error.
The collector now clicks visible Play, then visible sound, rather than forcing
a hidden ready-screen button. The same production sound-settings → persist →
SDK → official storage shim path is measured. No product source changed.

Limits: no signature, signing, publishing, physical controller, external-shell
persistence or all-DOM-listener measurement. Only storage uses official wire;
other injected domains are subscription fixtures. Pending shim timeouts are not
claimed cancelled. These are this plan's TEST03/05 contributions; remaining
visual/clause/final release/PR obligations remain open. Prior human UX acceptance
is already received and is not requested again.
