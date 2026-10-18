# Remaining Game branch consequence review

This reviews28 original current-full Game zero arms. All remain counted;no new
execution,counter credit,exclusion,floor or production change occurs. Exact
source/map/site identities are retained in GAME-RESIDUAL-PROOF. It separately
binds a159-source/seven-method reference audit and source-preservation checks
for three geometry helpers against the immutable a310a81 oracle. Source equality
does not substitute for the actual collision and solo differential tests.

## Geometry and actor support

**SOLO-01,ARCH-03,TEST-01/02.** Collision cores must match rendered chassis,
retain forgiving exact-edge misses,and preserve platform-supported personal grids.

| Arms | Reviewed consequence and behavioral authority |
|---|---|
|21/0 at112|vehicleBounds chooses a later voxel if it has a larger footprint than the current chassis. Normal shipped models have the broad chassis first;the reducer remains generic for authored model ordering. Health tests56/69 compare all world chassis in both directions/lengths and authored offsets,including real movement into the offset chassis. The later-larger-voxel alternative itself remains zero.|
|33/0 at134|The final swept-contact guard rejects an entry outside the open time interval. enter starts0,leave1;each nonparallel slab iteration rejects enter>=leave−epsilon before this guard. Successful iterations preserve0<=enter<leave<=1;parallel iterations leave that invariant unchanged. Thus the final rejection is redundant for finite supported geometry. Health test44 checks fast crossings,exact touching edges,corner misses and gaps through the real helper;this final duplicate is not assigned a hit.|
|43/1 at145|A river model with no slab returns undefined. Shipped platform models have nonempty broad support;health/log-coin tests use those real models and exact support edges. Generic empty authored platforms retain a safe unsupported result rather than invisible land. This compatibility path remains globally counted.|
|137/1 at411|Binding a progressive river coin to no currently rendered actor keeps coinActor null for a later approach. This is an intentional deferred-binding result,not an immediate reward or fabricated support. Seed/actor/log-grid tests own deterministic moving slots and collection;the empty-field fallback remains counted without claiming every missed coin stays available forever.|

vehicleBounds,sweptVehicleContact and platformBounds function text is exactly
the oracle version. That narrow preservation proof neither covers the whole
Game class nor claims current tests executed an unused helper arm.

## Receiver,world-extension and terminal ownership

**ARCH-02/03,COOP-01/02/05,INPUT-04,RELAY-02,RACE-04.** Secondary operations
must retain their receiver across callbacks;the world advances once;death
observation precedes inventory clear and cannot repeat the terminal transaction.

| Arms | Reviewed consequence and behavioral authority |
|---|---|
|69/1 at243|A missing own-field descriptor uses enumerable=true while building the fixed secondary receiver. Reflect.ownKeys enumerates existing ordinary Game fields;descriptor reads have no intervening callback/mutation. Reentrant actual P2 reward→P1 dispatch tests assert stable host reads and separate player state. The descriptor default remains counted for generic host behavior.|
|71/1 at245|Writes to a nonpersonal delegated field target the host. Shared time/director/effect operations are normally invoked on the host;secondary operation formulas write declared personal fields or mutate shared object contents without replacing the delegated host field. This fallback remains available to generic future operations and is not declared universally unreachable. Actual receiver tests cover nested movement/pause,health callbacks and stable primary descriptors.|
|78/0 at290|An already-dead participant skips updateSessionPlayer. LocalSession filters active playing participants before invoking the updater. Late/malformed direct adapter calls remain guarded. Shared world and lifecycle tests verify dead primary exclusion and living secondary continuation;the earlier filter is not a hit on this inner guard.|
|89/0 at323|Shared-effect synchronization ignores a world without session ownership. The shipped shared-effect installation is opt-in after committed adoption;stop tears down the effect while the shared world still owns the session. Ordinary solo never selects a session policy. Existing shared-effects/cancel/teardown tests prove those boundaries;generic premature calls remain counted.|
|106/1 at352|Missing recovery protection uses0. A player operation is bound to its adopted SessionPlayer,whose recovery is initialized before attach/exposure. Actual recovery tests exercise protection through hazard contact and active-time expiry. The missing-record fallback remains counted,not claimed a normal unprotected-solo path.|
|108/0 at360|Installing a second simultaneous world extension throws before replacement. LocalSession's capability installation is idempotent and owns one release handle. Generic extension tests verify attach,row,tick,snapshot and release;stop releases the actual Survive extension and restores the absent own-property shape. A double-install call is not claimed executed.|
|109/0 at365|An obsolete release handle cannot remove a different extension. Shipped stop clears its stored handle after releasing once. The identity guard also supports generic retained/reused release handles. Existing actual teardown evidence does not falsely label this stale-handle case executed.|
|173/1 at474|An owned ID absent from the cosmetic catalogue or no longer cosmetic is omitted from death-spill visuals. Run purchases/equip validate real catalogue assets;ordinary death reads those owned cosmetics before clearing. Death-spill/terminal tests own actual wallet/cosmetic loss and pre-clear observation. The malformed/stale visual ID fallback remains counted and never spends or restores an asset.|
|189/0 at519|An innate rescue rejects a meadow candidate whose future landing interval crosses a mob hazard. Other checks independently reject blocked ground and nearby mobs. Actual character-power tests verify safe matching-hazard rescue,no-safe-cell refusal without spending,crowded landing separation and mid-rescue protection. Mob geometry tests own swept hazard contact. This specific future-crossing candidate rejection remains zero;related safety tests do not supply its hit.|

## Coin contact,arbitration and retained solo compatibility

**SOLO-01/02,COOP-01,ITEM-02/06,RELAY-02,TEST-01/02.** Coin movement must
remain physical,default pull must preserve fractional log grids,and shared
collection must award exactly one owner without allowing magnet strength to
change consumable capture.

| Arms | Reviewed consequence and behavioral authority |
|---|---|
|258/1;260/1;261/1 at679/681|Missing WorldFrame time/previous ground uses current time/x/y. The private contact helper has two calls inside collectSessionCoins. LocalSession captures every active participant's ground before updates and arbitration;normal actual session collection has that frame. WorldFrame tests prove old samples stay immutable after a fractional hop. The generic no-frame defaults remain counted.|
|259/1 at680|A missing prior coin position uses the current coin for the sweep's starting observation. Actor entry/exit can make this a legitimate boundary;it does not by itself claim a reward. SharedWorld still arbitrates contact and distance before awarding. Moving actor/coin and fractional-grid tests own normal motion;this exact fallback is not declared impossible or executed.|
|268/0 at696|A pulled coin already behind retained trail is skipped during session collection. Shared arbitration/retention owns retiring rewards;this check prevents a stale reward from being awarded. Default-gravity log and both-turn-mode capture tests exercise actual visible collection across offset grids. This abandoned-trail continuation remains a counted guard,without promising every moving reward forever collectible.|
|276/0 at708|No gravity means only direct ordinary contact can claim;the attraction path is skipped. Shipped default gravity is.1 and shipped cards add to it. The generic reducer permits0 for authored rules/modifiers,so the branch is not declared globally unreachable. Existing real drift/default-pull tests prove the required nonzero shipped baseline and unique owner capture;they do not claim this zero-gravity session path executed.|
|287/0;288/0;289/1;292/0;303/0;304/0;305/1;310/0 at730–771|These eight remnants in the solo collector consult/change pickupOwners only behind sessionSeat. That local is literally const undefined. Actual sessions return through collectSessionCoins before this loop;solo takes the original collector. The earlier application-construction source/value proof binds that exact constant and keeps real session arbitration applicable. No method is excluded globally and these eight arms remain raw zeros.|
|294/0 at744|A solo pulled coin with gravity disabled stops accelerating but keeps its actual position for manual collection. Shipped baseline is positive,while authored zero remains allowed. The preserved compatibility behavior avoids snapping a released reward back to its source lane. Actual log-coin tests prove cardless collection and all denominations without grid normalization;this authored zero-gravity continuation is not assigned their hits.|

Actual session-world tests verify one shared clock/director,immutable fractional
samples,dead primary versus living secondary,nonstacked personal terrain/traffic/
river/mob policies,and real contact winning over an earlier gravity pull. The
log-coin and turn-log-coin suites use actual platform carry then landing/hops to
capture boundary coins with both bases/turn modes,without replacing positions
with a normalized grid. Consumable world-boundary tests separately prove coin
magnet independence for items. Pure planner tests alone are not substituted for
those actual Game collection transactions.

The geometry helpers remain preserved and all28 branches have consequence/
behavior dispositions with limits. The fresh complete enforcing result,remaining
main/market/audio/input/render review,conformance,current-frame visual/clause
audit and PR are still required.
