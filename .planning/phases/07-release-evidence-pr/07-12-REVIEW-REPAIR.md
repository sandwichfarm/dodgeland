# 07-12 independent review disposition

Root accepted the two concrete findings in `07-12-REVIEW.md` (review commit `8eb5b6a`) on 2026-10-16. Both require repair before plan closure. The active full collection remains useful initial measurement: its actual manifest contains both audio browser jobs, and its source/test/tooling must remain frozen until terminal.

## CR-01: required browser variants

After the active run terminates, the executor may repair the command-to-job completeness check in its already-owned `tools/release-coverage/run.mjs` and retain focused negatives in `tools/release-coverage/policy.test.mjs`. Both the effective default Chromium invocation and explicit Firefox invocation must be required independently. Prove each omission fails and the actual two-job manifest passes. Do not remove either real execution obligation or infer runtime evidence from these control tests.

## CR-02: ordinary renderer artifacts

Root verified the active run was still in `cross-mode-presentation`, before the later `render-test` job, and preserved both existing ordinary images with byte/hash verification. The backup manifest is `/var/folders/g8/w4qrj6k57hx_3lg6ltc1k70w0000gn/T/down-to-duck-07-12-render-preservation-2j6phtwb/manifest.json`, bound to run `e3fb8807-2389-4138-80a7-2977eb53fc80`.

- `artifacts/local-session-render-foreground.png`: 59,857 bytes, SHA-256 `bea344d1d279748abcf801e3eb608e4f9fc777e7631fee582df6843ddfb2ebcf`.
- `artifacts/local-session-render-river.png`: 67,859 bytes, SHA-256 `eb54df727da81624cb556d6cd587e4cba3909a7e252aece4ebcf9aed723c4715`.

After terminal, archive any generated images under the current run's evidence directory, restore the originals from this backup and verify both hashes. Record this manual preservation supplement honestly. Add both exact paths to the full job's owned `suites.json` patterns, and retain success/failure and initially-present/absent cleanup regressions using the real preservation function. Existing owned runner/policy test paths suffice; no gameplay edits are authorized by this disposition.

## Closure

Run the focused controls after repair; obtain independent re-review. Preserve the original full-run source identity and actual job/payload ledger. Do not relabel the initial report as executing future repaired tooling; distinguish its factual measurements from the later guard proofs. If current-run evidence is incomplete or invalid, repair and collect it rather than claiming success. The subsequent final release gate still requires the corrected enforcing collector and every actual job. No coverage floor or behavioral requirement is waived.
