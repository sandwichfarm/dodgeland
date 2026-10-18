# Remaining turn-mode ownership closure: findings, no exclusion

Status: read-only investigation after successful spawn-safety4277edaf. This
changes no denominator, applicability rule, counter, source or floor. Global and
per-file compatibility behavior remains accountable. The existing call-closure
review's retained standalone methods remain retained.

## Graph limitation and compiler evidence

Graph-first discovery was followed by inbound traces. The graph reported no
Game.update caller despite main.ts1723's real call. It also reported no
LocalSession.transferPosition caller. A current TypeScript resolved-symbol audit
of159 src source files instead finds the real Relay.confirm call atrelay.ts263.
**Keep transferPosition in Relay.** The graph's negative result cannot establish
unreachability. Four targets' exact resolved references, calls, source hashes and
root lock/script hashes are retained in07-03-TURN-REFERENCE-AUDIT.json. The audit
is not a full dynamic/value-flow closure and does not authorize an exclusion.

| Target | Current resolved caller evidence |
| --- | --- |
| Game.update | main.frame1723, in fallback after localSession.running branch |
| Game.collectCoins | finishPlayerUpdate659 and669 |
| Game.updateMobs | finishPlayerUpdate645,659 and670, guarded by drivesWorld |
| LocalSession.transferPosition | Relay.confirm263 |

No direct dynamic Game-typed element access for these members was found by this
particular audit; casts/any, reflection, callback value flow and future callers
still require review. The script is retained at
/tmp/down-to-duck-turn-reference-audit.mjs; this is a diagnostic, not a release
entry or replacement for actual behavior evidence.

## Proof required before changing retained scope

Main.frame1713–1723 selects LocalSession.update while its session is running,
and standalone Game.update only with no active session/stage. That observation
alone does not prove setup, failed adoption, reset, pagehide, terminal and callback
re-entry ownership. LocalSession.stop changes active but leaves other world fields;
its relation to main's synchronous owner replacement/RAF cancellation must be
proved rather than assumed. main.closeMarket callers include unconditional
pause/pagehide paths and therefore must not be swept into a blanket Game exclusion.

The shared update calls each player inside world.resolvePlayer and passes
false for drivesWorld. collectCoins has a session-player early return before its
solo remainder. Their closure depends on exact active-world/resolving-player
ownership at every actual caller, including acquisition and terminal intervals.
The turn recorder currently checks actual coordinator/host/definition identity,
captured settings and base ID; a base ID is not a complete canonical-rule/callback
snapshot. Any proposed canonical-only closure needs explicit actual-definition
provenance and fail-closed controls for alternate bases, callbacks, detached owners,
changed callers and new receivers. Keep general authored-mode examples globally
accountable; never restrict production composability to make coverage easier.

A potential Race-only compatibility closure for transferPosition also requires
proof that no live Relay controller can own a Race session through setup/reset,
not merely absence of a direct Race call. No such exclusion is made here.

Next action: finish the ownership/caller proof, then choose genuine missing
behavior tests or narrowly justified dispositions with positive-hit contradiction
checks. Do not exercise an incorrect standalone update path merely to manufacture
mode credit, and do not exclude an unproven path to obtain a percentage.
