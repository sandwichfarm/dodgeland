# Persistent hand and inventory residual review

This reviews49 original current-full zero arms:10 market/run and39 run-hand.
All remain counted. No new execution,coverage hit,exclusion,floor or production
change occurs. Source/map/site identities and inspected behavior sources are
bound in the accompanying proof. The current full gate is still independent.

## Inventory policy and atomic economy:10 arms

**ARCH-03,SOLO-01,COOP-04,ITEM-05,RELAY-03,RACE-03,TEST-02.** Purchases,
income,capacity and loss/recovery must retain per-owner state and immutable mode
access rather than using UI availability as transaction authority.

| Arms | Consequence and evidence boundary |
|---|---|
|5/1 at49;7/1 at57|A missing/wrong-kind card,potency violation,or inactive/wrong-kind power does not apply a modifier. Real purchases create valid components/powers;expired powers are removed by tick. Generic malformed component arrays remain defended. Catalog/capacity/card-expansion tests own real module application,extreme potency,expiry and reversal;they do not supply a hit to every rejected component alternative.|
|9/1 at61|Nonfinite modifier output falls back to its base value before use. Shipped module arithmetic with validated potency produces bounded finite outputs;the reducer also clamps every field. Extreme-stack/safety tests assert those actual limits. A malicious/custom modifier returning NaN is a generic guarded authoring case,not claimed executed.|
|10/0;11/2 at89|Unknown item access or widening an already restricted inventory throws before changing access. Race captures appearance-only inventory access before play. Turn-market and Race balance tests prove disallowed purchases cannot debit or alter state. The direct invalid/widening API call remains counted without borrowing the purchase rejection's hit.|
|41/0 at154|A refused companion commit leaves wallet/revision unchanged. Shipped co-op market validates current owner,charge capacity and funds before synchronously calling the same owned credit plan. Common plan/adapter tests prove no-waste refusals at their actual public boundaries. An arbitrary false companion callback remains supported;it is not falsely claimed the same inner primitive executed.|
|45/0 at168;50/0 at174|Stale/wrong-kind/ineligible held definitions or expired powers produce no score income. Current buy/claim/access/tick paths keep those collections valid. Generic mutable/injected inventories remain defended. Both-base turn/Survive economy tests prove real earned income,owner isolation and no backtracking farm;these malformed collection alternatives stay counted.|
|53/0 at176|A valid active power's positive finite scoreCoins output contributes raw income. Shipped income modules are cards;current powers have modifiers rather than score-income callbacks. The generic module surface supports future timed income without engine IDs. Existing card income and power duration tests remain separate;no timed-income execution is invented.|
|107/0 at307|Resuming an already-live run is a no-op. Actual personal/teammate return calls resume only for planned dead participants,after the death transaction emptied their economy. Recovery/identity tests prove no death assets return or charge reminting occurs. This duplicate live resume guard remains counted.|

Inventory/capacity tests check full-hand small/large packs open before selection,
one debit,exact picks/bonus quotas,complete replacement validation,slot-card
tradeoffs,sale outside markets,skip without refund/reroll and death reset.
Card-expansion tests purchase every new card and reverse it through actual sale.
The engine tests check real scoring/coin hooks,paused clocks,physical card
effects and terminal clear. These are arranged model/engine transactions,
separate from actual built UI journeys and exact solo differential suites.

## Persistent hand:39 arms

**UI-02/03/04/05,INPUT-02/04/05,COOP-04/05,ITEM-05,RELAY-03,RACE-03.**
The same physical hand persists through menus,identifies the selected owner,
and never authorizes a stale/nonowner sale or leaves a paid draft behind.

| Arms | Consequence and evidence boundary |
|---|---|
|16/1 at111;119/1 at320|Without getOwnerKey,use an empty UI owner key. Main always supplies selectedOwnerKey,which distinguishes stable participant ownership. The generic solo/component option default remains counted;actual owner-switch tests deliberately use colliding per-inventory card IDs and reject stale controls.|
|22/1 at129|Without canUseItems,allow the optional item's display control. Main supplies the callback;it gates lifecycle,focus,visibility and disposal. Actual item/ghost/controller tests own those transaction boundaries. This compatibility default is not an omitted app authorization check.|
|42/1;43/1 at176|Missing individual charge values display0. The function returns earlier if the whole charges object is absent;the typed object otherwise contains revival/flare. Generic incomplete data remains safe and counted. Actual world/hand item tests check independent real charge counts.|
|47/1;48/0;48/1 at181|An unavailable item gets the owner-specific reason or a generic tooltip. Main supplies ownerMutationReason. Normal display may omit unavailable zero-quantity controls entirely;actual ghost/item tests prove refusal and owner copy at supported boundaries. These exact tooltip alternatives stay counted.|
|51/1 at191|A missing detail page displays empty text. paginate clamps the selected page to its generated page list and inserts a fallback page when empty. Actual short/card detail tests verify readable content and reachable controls;this inner out-of-range fallback is not their hit.|
|52/0 at194|If a rebuilt pager disables the focused button,focus Close. Existing reading/resize tests keep reachable focus across frame changes;this precise disabled-after-render combination stays counted. It affects focus only,not card selection or sale authority.|
|57/1 at206|A CSS line-height that cannot parse uses1.25×font size for wrapping. Shipped stylesheet supplies numeric line heights. Actual fit tests enforce readable text/44px targets and no scroll regions. Generic CSS fallback remains counted.|
|62/1 at216;63/0 at219|An empty text flow has no final line;an empty pages list gets Active for this run. Shipped card descriptions are nonempty. Generic empty descriptions get a bounded readable fallback rather than broken navigation;the built description matrix is not claimed to execute emptiness.|
|64/0 at227|Missing selected card stops detail update. open validates the card;update closes missing selection first;owner invalidation clears it. Actual sale/owner replacement tests prove disappearance does not transfer a transaction. Direct stale private detail calls are not invented.|
|67/1 at232|Absent unavailableReason uses generic action copy. Main supplies the owner reason. Actual read-only hand/ghost tests assert refusal and selected-owner identity;the omitted-option text stays counted.|
|77/0 at257|Inactive hand or missing requested card refuses open. App routes only an active visible hand;open rechecks the actual run. Existing stale/dead sale and owner-switch tests own supported refusal,without claiming a direct invalid private open request.|
|80/1;83/1 at260/265|Switching between two card inspections preserves the original return-focus/pause lifetime instead of opening a second one. Clicking the same card closes it earlier. Actual persistent-hand journeys inspect/sell/close through visible controls;the already-open different-card alternative stays counted.|
|81/1;82/0;82/1 at260|If no pointer focus was captured,open uses the current HTMLElement or null. Ordinary pointerdown captures prior focus;keyboard/controller opens can supply the other path. Existing assigned keyboard/controller tests verify actual focused actions and no gameplay hop. Those assertions are not relabeled hits on every focus fallback.|
|84/0 at271|An event with no button or an inactive hand does nothing. Normal DOM clicks target real hand controls. Generic stale/background events cannot authorize an inventory mutation;this guard remains counted.|
|96/0;98/0;98/1 at279–280|Previous/Next card-description actions change only detailPage and repaint. Pagination clamps generated pages;disabled endpoint controls are excluded from normal navigation. Current built tests prove responsive descriptions/controls and all hand cards reachable,not every reverse/forward long-description endpoint. All three alternatives stay counted.|
|101/0;102/0;102/1 at282|A sale rechecks canSell at click time and reports the current owner reason without calling sale. Normal unavailable state also disables the button during rendering. Actual ghost/wrong-controller/stale-owner tests verify no mutation at public authority;this inner late-availability rejection stays distinct.|
|103/1 at283|Without an injected sale transaction,use the selected run's sell. Main always provides sell,which dispatches to the co-op adapter for a session and RunInventory for solo. The optional direct fallback remains counted and is not a multiplayer authorization route.|
|105/1 at291|Pointerdown with no HTMLElement active element records null. Ordinary browser focus is an HTMLElement in the tested app. This generic focus-state fallback cannot change inventory and remains counted.|
|110/1 at305|A detail Tab event with no visible controls does not focus anything. A supported shown detail has Close and other controls;below minimum the safety flow hides/pauses the surface. Existing modal focus and tiny-frame tests own supported behavior,not a forced hidden-page key event.|
|117/1 at314|A fonts-ready completion after disposal skips resize. The component removes its observer/font listener during disposal. The late promise defense stays counted without claiming a forced font race.|
|118/0 at318|An update after disposal is ignored. Main ends its frame loop on teardown;generic callers retain a no-op. Ordinary pagehide/owner UI teardown tests do not manufacture a later direct component update.|
|123/0 at324;131/0 at339|Hiding the hand or removing its selected card closes inspection before displaying stale details. Actual death/owner-switch invalidation often clears earlier;successful sale closes immediately. Existing public workflows prove the selected card cannot survive as another owner's sale. These later duplicate guards remain counted.|
|135/0;136/0 at347/349;139/0 at354|Inactive navigation/confirm and an empty control list do nothing. Main routes only when the hand owns visible focus;runHandControls filters disabled/hidden controls. Keyboard/controller tests prove the assigned owner can navigate/confirm and another cannot. These helper-level defensive no-ops remain zero.|
|140/1 at357|Confirm with no current actionable focused button focuses the first hand control instead of activating an arbitrary element. App normally seeds focus before confirm;actual control tests verify that sequence. The initial-focus alternative stays counted and never directly calls sale.|

run-hand-runtime checks the stable hand position across gameplay,pause,collection,
market and offer inspection,six-card paging,both themes/size tiers,no scrolling,
sale preserving the inspected offer/affordability,and sale preserving paid draft
choices. Its arranged cards/offers/funds are explicit fixtures,not natural drop
claims. Separate Survive keyboard/controller/ghost/pack/fresh-context journeys
exercise real owner routing,wrong-owner refusal,reclaim and stale sale rejection.
Turn-market boundaries exercise both bases/modes through actual inventories.
These broader proofs do not turn the table's individual zero counters positive.

All49 raw sites now have condition/consequence and behavior dispositions. The
proof verifies410 unchanged frozen inputs;remaining market UI/main review,the
fresh full result,conformance,final visual/clause evidence and PR remain required.
