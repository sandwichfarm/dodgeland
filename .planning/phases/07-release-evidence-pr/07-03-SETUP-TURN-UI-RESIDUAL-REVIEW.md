# Setup and turn-mode UI residual review

This reviews57 original current-full raw-zero arms:18 session-ui,20 relay-ui,
19 race-ui. They remain counted. No execution, coverage credit, exclusion,
threshold change, gameplay repair or final visual signoff is introduced.

The reference audit records the shipped main calls for eight factories/adapters
over159 source files. Manual source/data ordering below supplements that audit;
resolved calls alone do not establish arbitrary dynamic unreachability. The
proof binds exact source/map/site identities and current source/test hashes.

## Shared setup and keyboard editor:18 arms

**INPUT-02/03/04,UI-01/02/05,ARCH-03.** Setup edits a draft, reserves unique
characters, and commits controls without changing another seat or starting play.

| Arms | Reviewed consequence and bounded evidence |
|---|---|
|0/0 at31|Missing Start/Back markup throws at editor construction. Main builds the shared roster board before constructing its editor,creating both exact controls. Browser setup/editor tests use that real markup. The generic malformed-root guard remains counted.|
|2/1 at49|A keyboard profile with no assigned seat displays Unassigned. The callback can return undefined when that profile is absent from a staged/live roster;this is valid display behavior,not claimed globally unreachable. Native keyboard tests prove separate assigned profiles and storage/conflict behavior;the unused label remains counted.|
|3/0 at59|errorFor returns empty text for success. Every actual call is under failed validation/commit or the false arm of committed.ok. Success uses its own explicit message. Thus this helper's success guard is a retained duplicate under the current callers,not a tested failure presentation.|
|4/1;5/0;5/1 at61|Without conflicts,error copy uses reason or a final generic message. Current valid editor proposals fail validation through conflicts;malformed keyboard inputs have explicit reason strings in the shared validator. Conflict UX is tested against the actual duplicate key,with no storage write. Generic commit-result reasons/default text remain counted and are not asserted executed.|
|7/0 at69|Rendering after disposal is ignored. dispose removes controls/key listener;an already awaited commit may later request render. The guard protects that async lifetime without reviving the panel. Existing keyboard teardown/paging tests own ordinary cleanup;no direct late private-render invocation is claimed.|
|17/1 at116|Back skips focusing a binding if the decremented page is not an action page. Pages range0–5,Back is disabled at0,and decrement from5 yields4;all enabled Back routes land on an action page. More reaches reset page5 through a different handler. Tests page both directions and verify live binding/reset focus;this false alternative remains zero.|
|27/1 at139|A rejected awaited commit shows errorFor instead of success. The editor already validates the same immutable proposal before commit;the shipped store revalidates it synchronously before optional persistence and treats storage failure as an in-memory success. Reset conflict is independently tested before storage. Arbitrary external commit implementations may reject;this API defense remains counted.|
|35/1;37/1 at244/246|Unchosen character displays Choose traveler instead of a model/name. The shipped add/join flow supplies an available character before rendering;generic incomplete drafts remain visibly incomplete and cannot start. Shared validation tests own missing/duplicate characters;these particular display defaults are not relabeled executed.|
|38/0;39/1 at249|Selecting an occupied roster card in a compact frame opens its character page. Empty cards retain roster page. The separate seat-chip route also opens character view. Actual layout tests use compact roster/character/control pages and retain selected seat/focus across resizing;they do not supply hits to every card-versus-chip handler operand. The local conditional has no gameplay authority.|
|41/0 at256|A selected disconnected draft shows reconnection instructions. Start also rejects any disconnected draft. Mode/device tests own disconnection and reclaim;this exact setup-detail copy remains counted rather than claimed an executed live ghost banner.|
|43/1;44/1 at259/266|Candidate selection falls back to the first character,or renders no preview if none exists. Seven shipped characters and at most four roster seats leave available candidates. Math.max(0,findIndex) selects an in-range first/current candidate;at most three peers are excluded. Generic exhausted/custom catalogue behavior remains counted. Actual unique-character/preview paging tests own the normal route.|
|45/1 at277|Leaving a seat falls back to p1 if no other draft remains. The primary seat cannot be left,and normal extra-seat leave retains it. The generic fallback stays counted;browser tests remove/rejoin an extra controller seat through real controls.|
|56/4 at299|Focus restoration falls back to Start after ID/seat/action/selected-chip searches. Main uses capacity4,and its selected seat is one of the four rendered chips,so a selected chip remains available. Layout tests verify retained P3 selection,editor focus and compact/wide transitions. No direct malformed-capacity call is invented.|

Keyboard-runtime tests explicitly cover native W/ArrowUp moving independent
seats,held-key focus-loss suppression,remap/conflict,Escape,unsupported input,
reset conflict/no write,successful reset and44px/16px editor geometry. Storage
is an injected SDK-facing fixture;this is not actual storage wire proof.
Local-session-layout independently checks selected seat/pages/editor focus,
four-seat HUD,below-minimum safety suspension,shared Controls and reduced motion.

## Relay UI:20 arms

**RELAY-01/02/03/04/05,UI-01/02/04/05.** The active runner owns gameplay;
handoff/reclaim/leave controls capture identity tickets and results read a frozen
ledger rather than mutable player state.

| Arms | Reviewed consequence and bounded evidence |
|---|---|
|15/1;16/1 at38|Missing recovery displays nextRecharge250/personalHighWater0 defaults. Adopted players bind recovery before mode attach. Actual HUD and personal revive tests check distinct100/250 counters. Generic unbound presentation defaults remain counted.|
|17/0 at61|An input event on inactive Relay settings does not validate or change Start. Inactive configuration fields are hidden;normal events come from the active setup. Setup tests exercise invalid0 and corrected length,not a forced hidden-field event.|
|18/1 at63|Non-Error validation failures use Choose ready players. The shipped validator throws RangeError/TypeError with concrete text. Invalid setup visibly disables Start;the generic non-Error catch stays counted.|
|20/1;21/1 at68/71|Missing shared board skips clearing/setting its dataset. Main creates that board first and rerenders decorators against it. Ordinary available/inactive/remove routes keep one board. A detached/malformed generic root remains defended and counted.|
|26/0;27/0;27/1 at76|If the selected runner disappears from setup,choose the first seat or p1. p1 is retained and reset initializes selected p1;ordering moves seats without removing them. A generic changed roster may require this fallback;current tests reorder and page actual runners rather than fabricating empty setup.|
|28/1 at80|A runner lacking a character displays Choose traveler. Normal admitted drafts already have unique characters;the shared validator rejects unready drafts. The local incomplete-label fallback remains counted.|
|44/0 at155|A disconnected runner with a live personal offer is told to reclaim before resolving it;Skip is suppressed. Coordinator tests own loss during recovery and reserved-seat reclaim;ordinary layout separately checks disconnected,skip and recovery views. This combination's specific copy remains raw zero. It grants no recovery/skip authority itself.|
|47/1 at165|Unknown/ended lifecycle phase renders No runner remains plus restart. Main dispatches ended results to createRelayResults when the result exists;running and handoff also use other routes. The lifecycle fallback remains generic defensive UI,not the measured terminal result screen.|
|53/1;54/0;54/1 at196|Terminal copy distinguishes no-eligible-runner,complete,and a generic outcome. Shipped endless Relay normally settles no-eligible-runner. Explicit coordinator finish supports complete;the result type retains a string-compatible outcome. Model tests verify frozen terminal ledgers;the renderer's other copy alternatives remain counted.|
|59/0;60/1 at212|Participant result lifecycle selects Disconnected or Active after checking Left. Actual result fixtures can retain disconnected records;the model test checks connected=false/device-lost while layout journeys settle through departure. This view's unused alternatives remain distinct from model evidence. All metrics use the frozen row.|
|61/0 at217;63/1 at218|An empty page list produces No legs opened;short paging preserves rows with no fields. Normal terminal Relay has an opened leg and retained participants. The fallback prevents undefined navigation for generic snapshots;no synthetic empty-ledger UI result is claimed.|
|65/1 at232|Clicking Previous onto page0 moves focus to section when Previous becomes disabled. Next's corresponding endpoint and standard paging/focus trap are tested;this reverse endpoint remains counted. The callback changes only local page/focus,not contribution records.|

Relay layout's21 states span setup/invalid/order,HUD and inactive loss,owner
restriction,handoff/summary,disconnect/skip/reclaim/leave/waiting,results/player/
leg pages,tied podium and recovery with app/system motion preferences. The
runtime's visible49/50/51 journey proves the baton preserves a fractional log
grid. Enter/Space/controller handoff tests reject held/wrong-owner Start while
allowing read-only roster navigation. Model result tests assert earned distance,
active time,pre-clear deaths,ties,connected identity and terminal immutability.
Those broader proofs do not turn the table's individual counters positive.

## Race UI:19 arms

**RACE-01/02/03/04/05,ITEM-05,UI-01/02/03/04/05.** UI reads authoritative
leader/fog/status/item observations;actions retain current owner/target tickets.

| Arms | Reviewed consequence and bounded evidence |
|---|---|
|2/1;3/1 at13/15|Target radios default aria-checked false if aria-pressed is absent. Main creates every target button with a boolean aria-pressed before pagination,and click updates all choices. Actual Mud target/select/stale-target tests own the action path. Generic unannotated buttons retain the accessible default and remain counted.|
|9/1 at25|Missing recovery protection defaults0 in the fog label. Adopted players are bound before Race HUD use. Existing tests assert exact fog-line safety,real health loss,personal protection and lantern copy;the unbound default stays counted.|
|14/0;16/0 at32|Above-frame and left-of-frame racers get ↑/← instead of the other edge arrows. The production projection and outside filter are read-only. Runtime/layout verify fog/camera/edge presentation and immutable player observations;these two orientations are not claimed separately executed. No arrow determines collision,camera anchor or fog damage.|
|17/0 at33|Nonnegative player distance from the leader prints a + sign. The comparison uses physical groundY while leader uses earned frontier,so fractional or regrouped positions can differ. This is valid generic display formatting,not declared impossible;model ordering/progress and runtime forward/back tests own the underlying distinct values.|
|24/0 at45|No active racers but at least one recovery offer announces that offers and race clock continue. Status is read from the coordinator each render,not recomputed by UI. Lifecycle/ordering tests prove offer expiry and clock behavior;layout separately covers individual recovery and all-disconnected waiting. The exact all-down notice remains counted.|
|33/1;34/1 at53|Missing personal recovery counters display250/0 defaults. Bound gameplay records provide both. Real HUD/recovery tests verify recharge and two independent players;generic missing-record copy remains counted.|
|40/1;41/1 at57|Absent item charge reads as0 for Mud/Lantern. Race installs and initializes its item world before publishing active players. World/capability tests own charge initialization/collection;actual gear tests verify owned collection/payment/use. These absent-charge display defaults stay counted.|
|53/1 at66|A stale decline callback does nothing after recovery-offered ends. While offered,the visible callback delegates to Session decline;when status changes the button is hidden. Existing lifecycle tests check accept/decline/expiry and late actions;the stale captured UI callback's false arm is not claimed executed.|
|56/0 at95|Inactive Race field input does not change shared Start. The hidden inactive fields are not a normal user-input target. Tests exercise actual active setup/validation and preserved solo/default start. This no-op remains counted.|
|57/0 at98|A validation error mentioning seconds marks the time field invalid;other errors mark finish. validateRaceSetup throws an explicit whole-seconds RangeError. Model tests reject invalid clocks/settings;layout checks invalid setup. The time-field-specific styling arm is retained without claiming a browser observation.|
|59/1;61/1;64/1 at102/104/107|Missing setup board skips dataset work;inactive Race panel appends to Relay configuration or the shared board fallback. Main constructs the shared board then Relay decorator then Race decorator. Thus normal inactive nesting has its Relay parent. Generic different construction order remains supported/counted.|
|72/0 at128|Private result render does nothing without shown. show assigns first;resize checks shown and visibility;hide clears snapshot/DOM. Result tests page/resize/retry frozen results through visible controls. A direct private pre-show render is not invented.|
|99/0 at173|A participant details image is generated when the preview cache is empty. Normal initial nonshort podium already caches every participant image;short mode hides this details image. Switching short→nonshort can legitimately first render a detail page,so this is not universally unreachable. Result tests verify tiers,participants,metric pages and resize without a fake cache-clear call;this alternative remains counted.|

Race layout includes setup/roster,exact fog boundary/exposure/damage,four tied
finishers and participant pages,Mud/Lantern states,stale/no targets,loss/reclaim/
waiting/timeout,recovery/protection/forfeit/DNF and reduced motion. Results tests
check same-tick ties,timeout ranks,DNF,metric pages and3/4-player bounded podium
tiers against immutable snapshots. The normal-build journeys label arranged
terminal component states separately from public-input gameplay journeys.

All57 sites have explicit consequences and evidence limits;none gains a hit
from source review. The complete enforcing run,current-build frame inspection,
conformance,remaining branch review and final release/PR gates remain required.
