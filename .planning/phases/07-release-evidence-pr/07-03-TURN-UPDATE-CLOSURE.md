# Canonical Relay/Race shared update closure

Scope: canonical Arcade/Flow bases owned by the actual Relay/Race coordinators.
This disposition changes mode applicability only. Raw/global/per-file accounting,
numeric floors, public guards and authored-mode compatibility remain intact.
The earlier call-closure review retained these paths pending ownership proof;
this addendum supplies that proof for the precisely bounded paths below.

## Complete caller inventory

The TypeScript resolved-symbol audit covers159 src files, including env.d.ts.
All158 executable sources match the committed reference audit's source hashes.
The sorted `[src/path, SHA256(source)]` inventory has SHA256
`f741bb29520d4edb84def73c4c0e18a477903c028637675af647c81518655bfa`.
Projection enumerates disk independently, including untracked code files. The
generator requires both disk and canonical compiled inventories to match that
fingerprint, rejects duplicates, and recomputes hashes from source text. A new or
changed source outside the mode stratum also invalidates the proof. Exact
source/map/site-schema checks remain mandatory.

The graph omitted real callers, so its negative results are insufficient. The
expanded compiler audit and source review establish this concrete chain:

| Callee | All resolved production callers |
| --- | --- |
| Game.update | main.frame1723 |
| SessionPlayer.update | LocalSession.update1046 |
| Game.updateSessionPlayer | SessionPlayer.update442 |
| Game.finishPlayerUpdate | Game.update627; updateSessionPlayer295 |
| Game.collectCoins | finishPlayerUpdate659/669 |
| Game.updateMobs | finishPlayerUpdate645/659/670 |
| SharedWorld.resolvePlayer | LocalSession.update1046 |

No target method reference escapes as a callback in the reviewed source. No
dynamic Game-typed member access was found by the compiler audit. That audit is
not a general reflection/value-flow theorem: the exact complete source pin also
binds the reviewed receivers, aliases, callbacks and ownership transitions.
The additional dotted-update/reflection sweep finds only main.frame's Game.update;
other receivers are their UI/input/audio, director, shared-world or session-player
types. Game.operationFor is the sole prototype/Reflect use: it aliases own data
fields and preserves the Game prototype, without enumerating or invoking methods.
No eval or Function constructor occurs in src.

## Acquisition, transitions and terminal ownership

Game construction/ensureRows do not call Game.update. Each turn factory requires
a ready course, creates its own composition and commits LocalSession.stage
synchronously. LocalSession.start sets every player's session, world.sessionActive
and active before returning. The actual recorder now requires same-module class
identity, exact frozen canonical definition/rules, active session/world links and
stable participant/seat/character identity through action and terminal endpoints.
Custom same-name definitions/callbacks and detached or stopped owners reject.

main.startLocalPlay1323–1342 assigns the returned running session synchronously.
Before commit, localStage blocks standalone updates. Factory failure leaves that
stage gate in place (Race replaces it with a new empty stage). No RAF executes
between synchronous factory/assignment statements. During play, handoff, pause,
disconnect, recovery or terminal results, main.frame1713 chooses the running
session branch. Results do not clear active; mode policy stops advancement.

main.reset904–930 stops and clears the session/stage, clears coordinator state,
then replaces Game synchronously. Any later standalone update owns the new solo
course. pagehide1822 stops ownership and cancels RAF in one callback. Browser
tasks cannot interrupt the synchronous frame, and the reviewed callbacks do not
dispatch pagehide or invoke frame recursively. Game's onCoin/onHurt/onHeal/onPower/
onEnd callbacks update presentation/persistence; they do not invoke Game.update,
reset, or change the player's resolving stack. Future edits invalidate the full
inventory pin. Market closing has unconditional callers and stays applicable.

## Shared receiver and exact bypassed ranges

LocalSession.update1046 calls each eligible player with literal drivesWorld:false
inside SharedWorld.resolvePlayer. That method pushes the player and pops it in
finally. SessionPlayer.update forwards the same arguments to its world.host.
Game.updateSessionPlayer forwards drivesWorld unchanged through inPlayerOperation
to finishPlayerUpdate. Secondary operation receivers delegate world to the same
host; primary operation state restores in finally. Canonical lifecycle callbacks
are empty, and the pinned mode/main callbacks do not substitute another receiver.

Consequently Game.update and updateMobs have no caller in these canonical turn
lifetimes. Only then-bodies guarded by drivesWorld are bypassed in the shared tail;
the surrounding tests, ordinary shared tail, collision, hazards, death and rescue
remain counted. Both collectCoins callers run while the same active world's
resolving player is present. The collectSessionCoins dispatch returns before the
solo remainder. Only statements after that return are disposed; the method,
dispatch and complete shared coin contact/claim path remain counted.

Module initialization, constructors, Game.openMarket/closeMarket, all shared world
advancement, mob director, recovery and LocalSession.transferPosition stay counted.
In particular, Relay.confirm263 calls transferPosition; the graph omitted it.

## Adversarial checks and actual execution

Controls reject missing/changed/extra/duplicate source inventory, stale mappings,
crossing spans, missing canonical ownership, and any positive hit attributed to a
disposed statement/function/branch. A test-only transparent observer delegates
each actual update call once, recording shared-route arguments and the existing
resolving-stack data without invoking an extra production getter. It also records
standalone calls. Thirteen actual worlds must update through the shared route,
with no resolving/owner violations and no standalone updates. Ordinary and
canonical results are retained in the adjacent proof; a focused passing run is
not an enforcing release aggregate.

Public-input intervals now independently require the same complete canonical
base snapshot. The six-mode journey and Relay market observer read frozen rules
without invoking additional production getters; missing, mutable or mismatched
snapshots reject in calibration controls. This does not equate public actions
with arranged component execution. The final diagnostic preserves both origins
and omits the repeated Race item worker from the supplementary Relay-only union.
