# Relay/Race owner and ledger residual review

This reviews33 original current-full zero arms in race.ts,relay.ts,race-items.ts,
race-results.ts andrelay-results.ts. Four have the separately measured reclaim
witnesses already linked in RECLAIM-SEMANTIC-PROOF. The other29 remain counted
guards/fallbacks. No source,coverage profile,denominator,floor or raw hit changes.
This is a consequence/value-flow review,not a new numeric applicability rule.

The source-path arguments below apply to the shipped frozen Relay/Race factory
compositions and their owned callbacks. They do not assert that arbitrary future
authoring code cannot directly call exported helpers with invalid inputs. Such
component/API execution remains globally accountable. A zero redundant rejection
behind an exercised public rejection is not relabeled as an executed arm.

## Actual caller and ownership boundary

The fresh159-source TypeScript audit resolves11 relevant methods with no resolved
escaped or computed target reference. safeReturn has one call at race114,after
allowsLifecycle finds the existing player. protectFog has one call at race-items52,
with literal duration3 after RaceItems.valid and common debit. Race.capture has
five calls:attach,normal/final tick,and fixed beforeDeath/beforeDepart handlers.
Relay.capture has six calls;refreshAvailability four;closeLeg five;rotate four;
reclaimed/departed/death each one fixed handler call. Exact locations/text and
all source SHA are retained. This supplements,not replaces,the prior full pinned
source/reflection/value closure in TURN-STAGING-CLOSURE and RACE-TARGET-POLICY-
CLOSURE. Graph in-degree alone was not used to infer absence.

Factories validate distinct characters/devices/seats before stage,commit before
returning their coordinator,and install closed-roster handlers. Stage may fail
on real terrain;that failure and rollback stay tested/applicable. Successful
turn rosters retain departed participants for history;they are not removed or
replaced by live admission. No asynchronous observation intervenes inside the
private ledger transaction methods described below.

## Relay conditions and consequences

| relay.ts arm | Condition/consequence and bounded source argument | Required behavior proof |
|---|---|---|
|7/0 at60|Reading session before attach throws. The factory's attach occurs during successful stage commit before exposing the coordinator. Direct unstarted API use remains a counted defensive path.|RELAY-01,ARCH-02;turn setup/retry tests check validation and failed/successful staging without corrupting the prior Game.|
|19/0 at89|Rejected ledger.credit cannot update observed credits. capture snapshots the current token,uses a monotonic event ID or one pre-death identity,and clamps deltas nonnegative. The owned synchronous ledger has no intervening hook;Game marks terminal before its one pre-death observation. Invalid direct ledger requests reject at the ledger layer.|RELAY-05,TEST-02;relay-results actual death-before-clear,partial credits,duplicate/stale/wrong-owner/invalid/terminal rejection and immutable result tests.|
|20/1 at93;77/0 at215|Nonrunner/nonrunning beforeDeath is ignored;death of a nonrunner returns. Only the active runner is simulated by the frozen handler;current world damage/pursuer loops use that active set. Inactive disconnect/departure is a lifecycle event,not a simulated fatal contact.|RELAY-02/04;relay boundary/lifecycle tests freeze the inactive seat,retain assets and adapt active/inactive loss independently. Direct handler invocation is not inferred as a gameplay contact.|
|31/0 at124|Rejected reclaimed lifecycle cannot reconnect a seat. LocalSession checks the same mode lifecycle policy before synchronous dispatch;the fixed reclaim handler receives an accepted owned transition.|INPUT-05,RELAY-04;original-device/stale epoch/changed slot/stranger rejection,reentrant lease and fresh reclaim tests.|
|37/0 at134|A non-device-lost/nondead retained player cannot take the dead-reclaim path. Normal owned loss yields device-lost,or retained dead state;connections/closed-roster policy reject other entry contexts first.|RELAY-04;active partial-hop reclaim,dead offer reclaim and reserved-seat tests distinguish these states.|
|38/0 at138;63/0 at177|Availability refresh and departed handler refuse an ended relay. Source callers are guarded lifecycle methods;LocalSession rejects terminal departure/lifecycle before dispatch. Normal finish stores a frozen result and cannot reopen a leg.|RELAY-04/05;last-runner decline,terminal lifecycle rejection,late ledger writes and frozen result identity tests.|
|48/1 at148|Unknown action actor gets an empty participant identity. UI/router tickets originate in the validated retained roster;unknown direct helpers cannot pass command's lifecycleActor/current-identity checks.|INPUT-02/04,RELAY-04;cross-seat/stale confirmation and exclusive device tests. Empty-ID fallback remains counted,not exercised by a valid control event.|
|62/0 at172|A duplicate outcome for the same leg returns. Only closeLeg appends this private array;it then closes the private ledger token synchronously. Reentry has no callback opportunity;later close sees no token. New leg opens only after incremented fresh confirmation.|RELAY-02/05;handoff/death/skip close-once assertions and duplicate ledger rejection.|
|72/1 at201|Missing previous outcome defaults readyReason to skipped. First rotation follows closing the initial opened leg;later unopened-seat rotations retain an earlier outcome. No app caller rotates before attach/openLeg.|RELAY-02/04/05;skip of an unconfirmed runner records lifecycle without inventing an unopened leg;actual skip/reclaim outcome tests preserve existing credit. Generic fallback stays visible.|
|90/1 at246|Missing runner would skip progress. The index names a validated captured setup seat;the successful closed roster retains all those players even after departure. No live join/remove changes that mapping.|RELAY-03/04;closed-roster/new entrant rejection and retained disconnected/departed participant history tests.|

## Race conditions and consequences

| race.ts arm | Condition/consequence and bounded source argument | Required behavior proof |
|---|---|---|
|22/1 at84|Unknown action seat falls back to empty identity;command separately rejects a missing participant. Current UI controls and router leases select the retained roster rather than accepting a message-provided seat.|INPUT-02/04,RACE-04;closed-roster,stale/cross-seat commands and result identity tests. Direct arbitrary-seat helper call is not claimed executed.|
|26/0,28/1,39/0,49/0 at89/94/113/127|Wrong pending owner rejects;reclaimed seat has no grace token;unauthorized replacement rejects;loss clears pending leave. These four have actual source/schema-identical positive witnesses12/4/8/4 in run13bcb243.|INPUT-04/05,RACE-04;race-reclaim-transactions real leave/loss/stale token/blocked-safe-return/authorized replacement followed by a real hop. No new coverage credit here.|
|31/0 at101|safeReturn refuses a missing player. Its sole owned call is after allowsLifecycle's existing-player check;no callback/await can remove that player,whose roster is closed and retained.|INPUT-05,RACE-04;actual unsafe cell search waits unchanged then reclaims only after terrain clears. The helper's missing-player guard remains counted.|
|54/0 at145|Invalid duration,terminal/inactive/missing/finished owner cannot gain Fog protection. The sole shipped call supplies3 after eligibility/context validation and atomic common debit;no observation intervenes before effect assignment.|ITEM-06,RACE-05;real Fog Lantern collection/use/expiry/no-waste cases and source-bound one-target policy proof. Direct invalid protectFog API calls remain globally accountable.|
|56/0 at151|Reading unstarted session throws. Successful factory commit attaches before exposing the coordinator;failed stage restores original character and returns no usable owner.|RACE-01,ARCH-02;turn-setup-retry source/behavior evidence.|
|60/0 at156|Post-result capture returns. Owned tick returns on session.result;observeDeath and depart guard result before invoking fixed observers. Attach is pre-result. Explicit helper calls after terminal remain a counted defense.|RACE-04/06;late movement,damage,recovery,ledger writes and repeated result finalization preserve the same frozen object.|
|62/1 at161;92/1 at202|Absent recovery falls back to generation/protection0. LocalSession binds recovery before start;Race's recovery service is attached before capture or fog tick. Reclaim preserves that record rather than deleting it.|COOP-03,RACE-02/04;personal progress/recovery,device continuity and fog protection tests. The nullish RHS is not claimed executed.|
|67/1;69/1 at163|Missing terminal transition time/reason uses elapsed/status. Before-death capture still sees active participation;after death/departure/grace/offer expiry,owned lifecycle/tick records the new status before terminal capture. Shipped causes/status strings are nonempty. Private transition history is not externally mutable.|RACE-04/06;death-before-clear,offer expiry,leave/forfeit/DNF,ghost duration and terminal reason/time results assertions. Generic fallback remains counted.|
|80/0 at174|Rejected internally generated ledger append throws rather than quietly losing result data. Sequence IDs are monotonic;closed participant identity/recovery generation is retained;fixed active time and stats do not regress;record data is finite/nonnegative under shipped tuning. Captured plain events are copied/frozen before storage.|RACE-06,TEST-02;direct ledger invalid/duplicate/stale/wrong-owner tests prove rejection;actual pre-clear death,item/market contribution and frozen history tests prove accepted records. Arbitrary authored callers are not covered by this shipped-path value argument.|
|109/1 at249|Unregistered custom world has descriptor.runSeed=null. Normal UI/intent replay uses registered captured worlds;public custom-world fallback deliberately avoids a misleading seed identity.|SOLO-02,ARCH-04,RACE-01;seed/turn compatibility and captured settings tests. The generic null fallback is reviewed and counted,not claimed as a current UI feature or positive witness.|

## Item policy and immutable ledger invariants

- race-items1/1 at24 is the same absent-recovery protection fallback;all owned
  players are bound before eligibility. ITEM-06/fog immunity tests own behavior.
- race-items12/0 at40 returns unavailable-owner before constructing an action.
  Owned UI resolves the selected active player and installed consumable snapshot
  first. Generic missing-seat API use remains a counted negative fallback;
  world/common planner and wrong-owner tests prove no-waste behavior at public
  transaction layers,not execution of this exact guard.
- race-items17/0 at50 returns false if the common debit refuses. The previously
  reviewed synchronous captured-catalogue/one-living-target/owned-charge proof
  establishes the shipped prevalidated path. All actual earlier rejection and
  debit guard evaluation stays counted. No new source exclusion follows.
- race-results10/1 and11/1 at40 are previous.tick/time fallback0 when latest
  already exists. Only successful append sets latest,after appending its copied
  immutable event;no method deletes events or latest entries. Therefore a prior
  record implies a matching previous event in the owned plain-event ledger.
  RACE-06 direct stale/wrong-owner/terminal tests and frozen-history assertions
  preserve this invariant;these two fallback counters remain zero/countable.
- relay-results15/1 at49 is missing lifecycle.generation fallback0 after roster
  identity validation. Lifecycle initializes every captured identity and has no
  delete/clear path. A matching identity therefore has a generation record.
  RELAY-05 direct invalid/stale/late ledger tests remain the behavioral evidence.

## Provenance and status

TURN-RESIDUAL-PROOF binds all33 current locations/schema/source hashes,the159-
source/11-target audit,current test bytes and previous reclaim proof. Every
referenced executable suite is in the current full registry. The exact-source
call audit is not by itself temporal/value-flow proof;the condition arguments
above and earlier pinned closure documents supply that review. All current
source/test bytes still match the full05 freeze.

This adds reviewed consequences and four existing witness links,not new
execution,raw counts or exclusions. Fresh full05 is still active during review;
no complete-run result is inferred from individual prior passes. Other changed
files still need their semantic audit. Separate pending market-scene cases,
07-04/05/06 and opening the PR also remain required.
