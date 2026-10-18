# Actual solo ownership observation

Root strengthened the existing public six-mode witness without changing product
code. `market-game-fixture.mjs` now shares its existing production debugger-scope
discovery and exposes a read-only `sessionOwnership()` observation. It rereads
the actual pause-handler scope, confirms that the Game is present, and counts
actual LocalSession and LocalSessionStage object shapes. It also reads exact
Game/world/primary-player ownership links, `sessionActive` and primary session
absence. No application hook, state replacement or synthetic owner is used.

`release-mode-coverage.mjs` requires the solo endpoints to have the actual Game
and primary world links, no active/player session, zero session bindings and
zero staging bindings. Multiplayer endpoints positively detect the committed
session. After each solo measured interval, a public Local Play action creates
a real stage; the observer detects it while the world's solo ownership flags
still hold. Public cancellation removes the stage and restores the prior
ownership observation. These staging actions occur **outside** the attributed
solo interval, contributing only to the complete global parent snapshot.

The strict attribution validator was updated by c286940 to require these
ownership fields for public solo. Historical intervals without those fields
remain preserved but cannot pass the new validator or support an applicable
mode projection. Existing stable-mode endpoint checks and sequence/parent
counter guards remain in effect.

Root serial chain52878 exited0: composer ordinary8/canonical8, then public mode
ordinary6/canonical6, then `git diff --check`. Browser logs are
`/tmp/down-to-duck-07-03-mode-observer-ordinary.log` (6/6,8927ms) and
`/tmp/down-to-duck-07-03-mode-observer-canonical.log` (6/6,42723ms).
Canonical `modes-12` run `bec9e5e4-883e-4350-b20a-74d0ecc7aa32` supplies six
fresh actual browser parents and six verified intervals. Every fixture is
audio-muted, in an opaque sandbox, with original error/network/boundary checks.
Normal dist was preserved by the canonical runner.

This verifies a precise observer and the existing short public journeys. It
does not claim long-run mode coverage, completed applicability integration,
hardware controller acceptance or release-floor acceptance. Component Survive
evidence remains separately labeled. Full release collection remains pending.
