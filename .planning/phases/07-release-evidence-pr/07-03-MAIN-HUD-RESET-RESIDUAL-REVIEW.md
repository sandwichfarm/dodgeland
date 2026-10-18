# Main feedback,handoff,reset and HUD residual review

This reviews76 original current-full main.ts zero arms at source lines651–1200.
All remain counted. No new execution,hits,source exclusion,threshold or product
change occurs. This supplements the earlier97-site owner/modal review;149 main
sites after1200 still require review. The fresh enforcing run remains separate.

**SOLO-01,ARCH-02/03,INPUT-02/03/04/05,COOP-03/04/05,ITEM-03/04/05,
RELAY-02/03/04/05,RACE-04/05,UI-02/03/04/05/06,TEST-01/02/03/04/05.**
Feedback must retain the assigned receiver,turn controls must preserve captured
tickets,reset must release old ownership,and HUD rendering must not grant a
charge,change a result or resume an invalid state.

## Calls,movement and keyboard bridge

| Arms | Consequence and bounded behavior evidence |
|---|---|
|296/1 at664|Ready preview does not replace Game's traveler while a session/stage owns assignment. Actual four-character setup/audio and selected-owner tests distinguish saved solo preference from assigned travelers. The exact preview-while-owned alternative remains zero in this retained snapshot,not falsely covered by rendering a character image.|
|303/0 at680;312/0 at688|Open development controls suppress solo/session calls. These are DEV-only guards;production omits those tools. Actual development artifact tests prove tool absence in production and sandbox safety. Per-seat audio tests prove ordinary pause/mute/cooldowns. This specific DEV-call combination remains counted globally,without new build-scope exclusion.|
|306/2 at681;308/0 at687;316/0 at691|Paused shared session,failed seat authority,or a missing/nonplaying assigned player cannot call. Existing native/controller audio tests assert independent assigned calls,450ms cooldown,held-edge suppression and pause/mute silence. These particular early wrapper operands remain distinct from the actual tested authority/cooldown paths.|
|325/0;326/0;326/1 at699;327/0;328/0;328/1 at700|Native per-seat movement routes recovery/lifecycle directions only to the displayed modal owner and then returns. Router callbacks have their own earlier modal path. Actual owner-specific controller/modal and keyboard tests prove no peer input reaches the duck/transaction. The redundant native-route combinations stay counted rather than borrowing router hits.|
|329/0 at701;333/0;334/0;334/1 at703;335/0 at704|Terminal results and market route to their controls;otherwise frame/session/setup/menu/state conditions reject movement before dispatch. Main/router often routes these surfaces earlier. Actual built keyboard/market/terminal journeys prove visible actions and no hop-through. The later missing/closed/paused wrapper paths remain counted.|
|338/0 at712;341/1 at721|No visible modal controls prevents navigation;Confirm outside an actionable modal button focuses the first control instead of clicking something else. Supported boards have visible Back/Confirm controls and normally seed focus. Existing focus/44px/owner tests own actual navigation;generic empty/unfocused alternatives stay counted.|
|345/0 at742|Replacing bindings while native input is active resumes with observed held keys;otherwise the new router stays suspended. Native remap/focus-loss tests prove real movement,conflict/reset and stale-hold suppression. This specific active-replacement branch remains a raw zero,not a reset validation hit.|
|347/1 at747;348/0;348/1 at748|Without live session or stage,keyboard profiles fall back to P1/P2;stage mapping can return undefined for an unassigned profile. Current editor is in setup and committed routing uses actual devices. Generic pre-setup/default mapping remains counted;assigned profile tests do not imply these fallback branches executed.|
|349/1 at751|Before a keyboard store exists,a commit can succeed in memory. Main creates the store during boot before normal editor use;optional storage failure is already an in-memory success inside the store. Existing missing-domain/native control tests own usability,not this pre-store alternative.|

## Relay wrappers and shortcut lifetime

| Arms | Consequence and bounded behavior evidence |
|---|---|
|351/0 at769|Invalid reorder index/offset refuses before changing the draft. The setup buttons disable endpoints;the coordinator validates the committed order. Actual order/unique-roster tests own valid reorder and setup refusal. This direct invalid callback remains counted.|
|356/0 at781;361/0 at788;363/0 at790|Missing handoff/coordinator/frame or stale captured participant/turn/lifecycle token rejects before Relay action. Actual held/wrong-owner/stale confirmation and disconnect/reclaim tests own coordinator/ticket behavior. These exact app wrapper checks stay distinct from authority method hits.|
|365/0 at791;370/1 at795|The generic lifecycle restart callback resets;unknown non-revive/decline command strings do nothing. Main normally renders ended results with their own reset callback rather than lifecycle fallback. Existing real retry/result tests own reset through that screen;the unused lifecycle restart/unknown action alternatives remain counted.|
|375/1 at801;377/0 at802;379/0 at805|If no focused handoff button exists,choose the first;if no button or no connected invoking seat exists,do nothing. Actual fresh incoming-controller Start and read-only View/roster tests use real focus and retain the rendered ticket. The fallback/missing control/disconnected alternatives remain counted.|
|385/1 at814|A lifecycle control whose actor/kind does not match invokes no command. Reserved-seat/leave/reclaim tests assert stale/wrong-owner authority;this particular last UI condition stays zero.|
|387/0 at817;390/0 at819;392/1 at821;394/1;395/2 at825|Relay direction routing refuses missing/inaccessible boards and restricts navigation to connected/active/board owners,except frozen result navigation. Existing Enter/Space/controller handoff and terminal navigation tests own supported routes. Exact disconnected/missing/third-conjunction alternatives remain counted.|
|400/0 at835|A real turn-board change invalidates any old open market/hand,clears its pause ownership,and restores the shared game before applying the new board phase. Normal shopping freezes progression,so this overlap is uncommon. Actual market/handoff/draft tests prove those lifetimes separately;the combined open-surface branch remains counted.|
|408/0 at866;413/1 at875;415/0 at879|Pause shortcut can close the drawer;non-Play shortcuts in the selected end seed do not copy/restart;editable text/select in an open drawer suppresses other shortcuts. Actual seed-copy and native editor tests own focused actions and no unintended restart/storage conflict. These exact close/suppression alternatives remain counted.|
|420/0;421/2 at887|A shortcut lease that resolves after disposal or after native keyboard takes over is immediately closed instead of installed. Native takeover also closes existing overlapping leases. Built keyboard tests assert independent native movement with global safety shortcuts retained. The exact late-await close remains a counted async guard.|
|423/1 at889;425/1 at890|Missing runtime call/market binding text uses the requested default key. Supplied binding tests own actual registration;the empty-binding label fallback stays counted. No hardcoded shortcut overrides the runtime's returned binding.|

## Reset and context feedback

| Arms | Consequence and bounded behavior evidence |
|---|---|
|429/0;429/1 at912|Reset releases controller-owned setup seats while leaving keyboard entries alone,before stopping/cancelling/clearing old owners. Actual retry/setup-cancel/turn release tests assert old held actions and paid contexts lose authority. These two setup-loop alternatives remain raw zeros;an empty setup draft does not execute their condition.|
|435/1 at937|A previously introduced mob species does not repeat its introduction notification. Each actual arrival still has its spawn cue. Mob cadence and contextual audio tests own actual arrivals;this repeated-copy alternative stays counted.|
|439/0 at948;440/1 at951|A one-feather heal omits plural s;nonwater innate rescue uses health.restore in addition to its character call. Actual health/power tests own real rescue and numeric effects;per-seat feedback tests own contextual cues. These exact copy/cue alternatives are not assigned another event's hit.|
|441/0 at956|DEV sandbox coin collection returns before changing lifetime records/persistence. Production has no sandbox symbol. Actual devtools artifact tests assert record isolation and production exclusion;this exact sandbox-collected-coin callback remains counted globally.|
|444/0;445/1 at963;454/0 at977|Fog uses the trail fatal cue,unknown cause defaults traffic,and a successful optional small run goal adds its copy. Actual contextual death/terminal ordering tests own fatal state and audio cue mapping. These primary legacy result-copy/cue alternatives remain counted,not substitutes for per-mode frozen result tests.|
|458/0 at987;466/0 at1000|An intent delivered after disposal does nothing;mode-only Arcade launch has corresponding ready copy. The parser validates seed/mode before navigation,and active/staged/multiplayer runs refuse replacement. Actual game-intent runtime tests prove supported seeded navigation/invalid links and state preservation;these teardown/Arcade-label alternatives remain zero.|

Reset clears the old session/stage/router seats,turn/result boards,UI pause state,
audio scene and spill state before constructing the composed solo Game. It
restores only the captured solo controller and assigns fresh run callbacks.
Turn-release and setup-retry evidence checks actual teardown/retry boundaries;
precise solo model and pixel differential tests separately own 1:1 parity.
No claim that a source reset sequence alone proves all state parity is made.

## HUD and mutable presentation observations

| Arms | Consequence and bounded behavior evidence |
|---|---|
|478/1 at1017;479/1 at1019|If the selected seat disappears,close any active inspection and choose a remaining owner;an empty roster cannot select a replacement. Current Survive archive/dropout results retain departed contributions while live release may remove a seat. Existing departure/live-admission and selected-owner tests own those identities. These precise selection fallbacks remain counted.|
|488/0 at1030;490/0;490/1;491/0;491/1;492/0;492/1 at1032|HUD invalidates a recovery board if owner/participant/charge generations no longer match,then gives Revival/Flare/generic choice-changed copy. It never refreshes the captured grant to rescue a stale action. Existing stale/replaced target/owner and no-waste UI/model tests prove refusal. This local board-removal/error-copy path remains distinct from commit-time rejection. It is the message-bearing discardRecoveryBoard call qualified in the earlier review.|
|505/0 at1048;518/0 at1077|Before rebuilding the roster HUD,capture the focused seat and restore its identity control if it survives. Real frame/owner tests verify P3/keyboard/controller focus retention across updates/resize. These exact roster-rebuild focus branches remain counted;restoration is not a new player assignment.|
|508/0 at1055;510/0 at1057|Clicking the currently inspected owner closes inspection;switching owners first closes the old one. A new inspection records whether gameplay was running so only its own valid close may resume. Existing compact HUD/Controls tests prove owner-only paging/Back and deliberate paused inspection. These specific identity-toggle alternatives stay zero.|
|565/0;566/0;566/1 at1135;569/1 at1136|Shared Controls' call button is disabled if inspection was not opened from play or current seat authority rejects;missing selected owner does not overwrite its label. The actual call function independently requires active playing state,focus and unmuted audio. Per-seat pause/mute tests own that final gate. Displayed disabled/label alternatives are not gameplay authorization and remain counted.|
|601/0 at1177|A stale timed-power ID with no catalogue definition is omitted from the HUD. Valid purchases/tick/clear keep normal powers consistent;actual power expiry/mix tests own their effects. This generic display guard stays counted.|

Behavior sources include actual local-session keyboard/gamepad/audio,HUD and
Controls layouts;Relay runtime/layout/lifecycle/results;Survive recovery outcomes
and terminal lifecycle;intent,preference and development fixtures;turn release/
setup retry;health/character-power/sound and solo differential suites. Fixtures
retain their arranged versus public-input provenance. Injected shortcut/storage
helpers are not official protocol conformance,and source review is not final
current-build visual inspection or physical hardware verification.

The proof accounts for every76 exact raw site,checks the159-source caller audit
and410 frozen inputs,and preserves all counters. Remaining149 main sites after
1200,the fresh complete enforcing result,official conformance,final visual/clause
audit,exact gates and the PR remain unfinished.
