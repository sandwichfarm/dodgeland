# Keyboard editor validation and reset coverage

The existing built opaque-iframe keyboard suite now exercises an unsupported
key during capture, a default reset that conflicts with another traveler's
remapped key, and a successful reset after releasing that key. Unsupported
input retains capture without a storage write. The rejected reset preserves
both profiles and all storage writes. A successful reset restores Q, writes
once, and focuses the live reset control. Native input and actual production
binding validation drive all these paths; no editor callbacks are invoked by
the fixture. Inherited movement, stale-hold, remount, focus and layout assertions
are unchanged.

Chain60843 exited0. Ordinary strict1/1 passed in6240.170ms; canonical strict1/1
passed in29895.838ms. Logs:

- `/tmp/down-to-duck-07-03-keyboard-ui-ordinary.log`
- `/tmp/down-to-duck-07-03-keyboard-ui-canonical.log`

The ordinary wrapper restored original artifacts byte-for-byte and verified
normal dist was unchanged. Audio remained muted. Canonical group
`keyboard-ui-gaps-03` aliases the exact existing full execution job; run
`ee255c8a-ee08-4897-85df-a99aec5a0f99` collected three browser lifetimes.

Unchanged session-ui.ts source SHA256:
`3f7144ef7840f9f6fe64829f37b0dd043367bb3c85875289a19604e2946dd280`.
All three mapped schemas match the immutable initial-full report. Newly hit
arms are10/0 and10/1 at line92, and25/0 at line132, one hit each. The focused
suite covers201/211 lines,36/51 functions,72/122 arms; it does not cover all
roster UI. The initial-full101/122 arms plus these three source-identical new
arms gives a diagnostic union104/122, not a freshly collected full pass.

No production change, fabricated RED, skipped inherited assertions, or floor
change. Full aggregate enforcement remains pending.
