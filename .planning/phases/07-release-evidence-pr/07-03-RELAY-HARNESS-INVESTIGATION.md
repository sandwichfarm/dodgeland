# Relay browser timeout investigation

The first two failed collections and their power-log correlations remain in
07-03-RELAY-LIFECYCLE-REUSE.md/json. They were not accepted mode evidence.
The normal game build and root lock remain unchanged throughout this work.

## Observed harness defect

The original raw browser helper did not observe the Node test AbortSignal.
When a test timed out, its awaited UI body continued, with screenshots emitted
after the next recovery case began. This allowed overlap and obscured the cause
of the keyboard timeout. This is a test-host lifecycle issue, not a gameplay RED.

The helper now receives the test context, guards stages, closes its browser/server
once on abort, and waits for outstanding raw jobs in afterEach. A cancelled realm
is not collected as positive coverage. The keyboard journey writes begin/end/
abort records with wall timestamps and monotonic elapsed time. Original action
order, semantic assertions, frame cells and45/90s limits remain.

## Staged observation:3b71ed03

Whole ordinary22/22 passed. Canonical run
`3b71ed03-4f28-4f4f-b2ef-ae9a6c3794bc`, exec30486, terminated1 with21pass/1cancel.
The first visual journey completed49 of50 original captures, then exhausted90s
on the final2400x1200 light result image. Its last completed image was08:54:50.744Z;
its abort journal records08:54:51.849Z. No later first-journey image was produced.
The next journey then completed every keyboard stage, including fresh confirmation,
last-connected departure and reserved-owner reclaim, in33.54s; whole case39.66s.
It was not stuck on an input transition in this execution. Other recovery cases
passed. The cancelled first realm correctly caused a missing-payload failure;
no counters from this failed whole job were accepted.

This preserves concrete evidence for cancellation cleanup and narrows remaining
cost to repeated large frame capture.74 original PNGs, normal artifact and lock
were restored. Logs/state remain under /tmp/down-to-duck-07-03-relay-lifecycle-staged.

## Clock candidate

The two raw fixtures now use the same Playwright controlled-clock approach as
existing market-game fixtures: install before navigation, pause after bootstrap,
and run the real application timers and fixed-step loop for deliberate inputs.
The original forward key is followed by400ms of real fixed ticks; pad snapshots
advance40ms and the original30/40/60ms waits remain. Input events, all50/12 frame
cells, contrast/hit-area checks and45/90s limits remain. Production sources,
renderer implementation and mode rules do not change. The clock must not supply
fabricated game state. [Playwright documents manual timer/frame advancement](https://playwright.dev/docs/clock#tick-through-time-manually-firing-all-the-timers-consistently).

Whole normal22/22 and canonical22/22 now pass. Canonical935ee706/exec95046
terminated0; all seven parent payloads and74 images validate. First raw visual
journey completed all50 frames in76.78s, keyboard journey all stages in27.08s.
The normal artifact/root lock and74 original artifacts are restored. See
07-03-RELAY-LIFECYCLE-PROOF.md/json for exact attribution and diagnostic limits.
Mode-floor and enforcing release acceptance remain pending.
