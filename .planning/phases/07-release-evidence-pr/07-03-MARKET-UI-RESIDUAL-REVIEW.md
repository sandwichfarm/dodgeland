# Market UI residual review

This reviews72 original current-full market-ui zero arms. All remain counted;
no new execution,coverage credit,exclusion,threshold or production change occurs.
The view reads the selected RunInventory and captured co-op context;the owner's
transaction adapter remains authoritative for purchase,sale,claim,skip and equip.

**UI-03/04/05,COOP-04/05,ITEM-05,INPUT-02/04/05,RELAY-03,RACE-03,SOLO-01,
TEST-02/03/04/05.** Market/wardrobe/draft controls must remain reachable and
owner-labelled,retain paid choices across valid menu/owner transitions,prevent
unauthorized mutations,and keep the persistent hand usable without leaving the
current page. The proof binds exact source/map/sites and inspected sources.

## Options,entries and presentation alternatives

| Arms | Consequence and bounded evidence |
|---|---|
|3/1 at77;214/1 at488|An omitted owner-key callback uses solo. Main always supplies selectedOwnerKey,which distinguishes the current participant. Real owner-switch/fresh-context tests own stale request refusal. These optional component defaults remain counted.|
|11/1 at104;12/1 at108|Empty inspection text omits a final line and displays empty copy. Authored descriptions/notes are nonempty;the wrapping function retains a safe empty outcome for generic data. Actual compact/readability tests verify bounded descriptions and controls,not empty-text execution.|
|25/1 at164;26/1 at165|Without mutation/reason callbacks,the reusable component permits ordinary solo actions and uses generic unavailable copy. Main supplies both callbacks in every mode. Actual ghost/inactive-runner tests prove read-only authority and copy through those callbacks. The generic defaults stay counted.|
|27/1 at168;29/0 at171|Absent getOwners yields an empty strip;absent owner-label callback synthesizes full shared identity. Main supplies roster and label callbacks. Existing four-owner layout tests assert full identity and colliding card-ID isolation;they do not supply hits to omitted-option alternatives.|
|38/0 at207|During animated close,controls returns no actionable elements. Normal close makes the overlay inert and public navigation also rejects a nonvisible/closing run. This later duplicate list guard stays counted;transition tests own the actual close lifetime rather than a forced private enumeration.|
|50/0 at238|An omitted decorative deal index defaults0. The tile call supplies its enumeration index. This unused initializer affects animation delay only;existing offer layout tests are not claimed its execution.|
|58/0 at262;64/0 at269|Unknown offer/catalogue or consumable/gear metadata is omitted from display. Actual inventory offers reference captured definitions and co-op offers use the owned catalogue. Common planner tests reject malformed item identities without spending. These display-layer guards stay counted and cannot create a purchasable unknown item.|
|60/1;61/0;61/1 at264|An offer missing explicit section derives cards/extras/rare from kind. Current inventory stock assigns section. The fixed3-card/1-rare/2-look shelf and rare-consumable paging tests own actual placement;generic unsectioned cosmetic/rare alternatives remain counted.|
|73/1 at277;74/1 at280|Unknown held power or stale/noncosmetic owned look is omitted. Purchases/equip/expiry keep normal inventory valid. Effects tests own those transactions;the invalid display-record alternatives remain counted.|
|77/0 at286|currentEntries can compute its own full entries list if omitted. Its current caller supplies the already captured all list explicitly. This private default stays counted;no duplicate view read is manufactured.|
|87/0 at295|A sold/capacity-limited Race item in a short frame gets Full rather than the longer item-capacity text. Actual Race gear tests verify earned-market access,held limits and owner identity. This particular short copy remains a counted label alternative.|
|99/0 at303;114/0 at314;115/1 at314|Legacy owned-power/card tile metadata or default Owned copy is retained. currentEntries shows offers/consumables for shop,looks for wardrobe,and choices/discards for drafts. Owned cards now live in the persistent hand;owned powers are not a separate shop page. Their generic tile alternatives are unused in the shipped view tree. Actual persistent-hand tests provide card access and sale;no exclusion or synthetic legacy tile render is introduced.|
|140/0 at347;142/0 at349;145/1 at357|Inspection can show Sell for legacy owned-card entries,Wearing for an already equipped look,or no action for an owned power. Owned cards/powers are filtered out by currentEntries. Equipped looks disable their Wear action. Wardrobe/persistent-hand tests own current routes;these alternative inspection branches remain counted.|
|150/1 at367|A focused element without a market or hand key has no restoration key. Render still selects a valid screen/control. Actual modal/resize tests prove reachable retained focus;this particular generic focus alternative is not claimed executed.|
|171/0 at406|A page anchor with no matching shelf section falls back page0. Shipped shop entries use the current cards/rare/extras sections,or Race's rare gear section. Existing shelf and consumable paging assertions prove actual offers remain reachable. The generic invalid-section fallback stays counted.|
|173/1 at412|A disappeared page anchor leaves current paging unchanged instead of applying an obsolete index. Owner reset,offers sold and removed looks can invalidate anchors;this behavior is valid rather than universally unreachable. Actual resize/purchase/owner tests verify retained reachable pages,but this precise missing-anchor arm remains zero.|
|192/0 at463|An empty draft replacement view explains that choices can be kept or skipped. Normal replacement is requested only when the prospective hand does not fit,so there are old cards to replace;the generic empty view remains safe. Actual pack/capacity tests check replacement,impossible selections and skip without refund,not this empty-copy branch.|

## Update,transition and focus lifetime

| Arms | Consequence and bounded evidence |
|---|---|
|213/0 at487|Disposed update returns before touching previews/DOM. Main ends its frame loop on teardown and disposal disconnects observers/listeners. Generic late component calls remain defended and counted.|
|216/0;218/0;218/1;219/0;219/1 at492–494|A changed/dead/closed owner or lost restoration permission cancels the pending close animation. If it is still the same open run,force its actual close without resuming. Owner invalidation normally closes/cancels before changing the selected run. Actual ghost,loss,tiny-frame and owner-switch journeys own those higher-level flows. These cancellation interleavings remain counted;no late timer is deliberately forced for hits.|
|244/0 at531|A card sold from the persistent hand is removed from replacement-discard marks. Picks,draft payment and other marks remain intact. Actual hand/paid-pack tests sell through real UI and preserve draft choices. Their successful broader sale is not automatically credited as a sale of an already-marked discard.|
|254/1 at550|A cosmetic acquisition anchor uses target.id if definition metadata is absent. Shipped look/offer entries carry their definition;this generic fallback remains counted. Wardrobe previews/current traveler/equip tests own normal acquired-look focus.|
|258/1;259/1 at562|An inspection entry that disappeared after a failed transaction has empty name/description in its error reader. The transaction message remains visible. Actual fresh/stale-context tests prove failure preserves funds/draft and a new valid context works;this exact missing-entry text combination remains counted.|
|267/1 at573;268/0 at576|Forced nonresuming close skips the owner close callback if already nonvisible;ordinary close returns when not visible. These prevent duplicate lifecycle work. Actual paid-draft forced-close tests preserve exact choices and clocks. The duplicate hidden-close paths remain distinct counted no-ops.|
|274/0 at586;275/1 at588|A stale close-generation timer or changed/disposed/dead owner cannot close/resume a replacement owner. invalidateOwner increments the generation and normal modal close clears the timer. Current selected-run/liveness checks remain a second boundary. Actual owner/reclaim/tiny-frame journeys own state retention;these exact late callbacks are not claimed executed.|
|284/0 at609;287/0 at618|Toggle/click during close does nothing. The overlay is inert through its160ms closing animation;shortcut callers also retain the guard. Actual transition/menu tests verify pause and normal return. A synthetic click on an inert subtree is not used as gameplay proof.|
|286/1 at615|Back with no prior inspection restores a default valid control rather than a specific inspected item. Normal Back buttons originate in inspection;generic repeated calls remain bounded. Current page/focus tests own the displayed route,not this missing-previous default.|
|288/1 at619;289/0 at620|Non-Element/background/disabled click targets do nothing. Native user clicks select actual enabled buttons;programmatic callbacks can retain stricter guards. Actual wrong-owner/ghost mutations are refused at authority,not claimed an executed generic background-click rejection.|
|292/1 at622|Owner button with no ID does not select a new owner. Shipped buttons are generated with their seat ID. Actual owner-strip tests verify full selected identity and stale selections;this malformed-control defense stays counted.|
|337/0 at670|Navigation refuses a nonvisible/closing run. Main routes market input only when it owns the modal;public helper remains defensive. Actual controller/keyboard tests verify owner-authorized navigation and no gameplay input leak.|
|343/0 at678|The later keydown closing guard is redundant:the preceding runIsVisible test already rejects closingRun. The inert close lifetime is still real and tested. The unused duplicate is retained/countable rather than removed for coverage.|
|348/1 at683|Confirm without a current enabled market/hand control does not click. Main seeds focus and modal navigation only exposes current controls. Existing controller/keyboard ownership tests prove intended confirmation and wrong-owner refusal;the generic no-focus case remains counted.|
|358/1 at692|Resize with no keyed focused element derives its anchor from inspection or visibleKeys. Actual tiny/compact/short/wide journeys retain selected owner/page/focus. This missing-key alternate stays counted,not a separate promise that hidden focus is restored.|
|361/0 at702|Repeated dispose is a no-op. First disposal removes observers,preview handlers,scene,timers and input listeners. Normal teardown tests own that lifetime;an extra direct component dispose is not invented.|

## Transaction and draft controls

| Arms | Consequence and bounded evidence |
|---|---|
|293/0 at623|Every mutating click rechecks current permission before changing UI picks or dispatching a transaction. Normal read-only rendering disables the same controls first. Ghost and inactive-runner tests prove no unauthorized debit,claim,sale or equip through actual app controls/adapter. This later stale-availability guard remains a distinct zero.|
|304/0 at634|Short inspection's Next rotates through wrapped text pages. It only changes detailPage,not the inspected asset or ownership context. Actual tiny/short layout tests verify readable bounded inspection;the particular long-description reader event remains counted.|
|310/0 at640;311/0 at641|A removed discard ID cannot be toggled;an already-marked old card can be unmarked. Replacement uses a separate Set until final claim. Actual pack-replacement tests verify marks do not mutate the hand and survive Back/resize;the missing-ID and specific unmark alternatives remain raw zeros.|
|314/1 at644;315/1 at645|Without injected transaction,skip delegates directly to RunInventory;a failed skip does not switch to shop. Main always supplies transaction. Actual paid skip keeps the offer sold,no refund and no reroll;generic fallback/failure alternatives stay counted.|
|317/0 at649;319/0 at650|A missing/stale draft choice is rejected;an already picked card can be unselected. Exact picks/bonus quotas are revalidated by the inventory before claim. Actual paid-choice/replacement tests use visible controls and assert no premature hand mutation. These particular stale/unselect events remain counted rather than borrowing claim validation hits.|
|326/1;328/0;328/1 at658|Without transaction,claim uses RunInventory with the current selected picks and optional discards. Main's transaction always returns MarketResult,so these fallback arguments are unused in the app. Actual shared/solo transaction callbacks still run the same inventory preview/claim validation;no callback omission is manufactured.|
|330/1 at661;332/1 at663|Absent transaction falls back to run.buy for ordinary offers,or rejects unavailable consumable purchase. Main supplies it for every mode. Actual purchases flow through that callback;these generic component fallbacks are not alternate multiplayer authority.|
|333/0;334/0;334/1 at664|Legacy owned-card inspection can sell through injected transaction or direct inventory. The current market views do not expose owned-card entries;the persistent hand owns visible sales and preserves the open page/draft. Its real sale evidence is not relabeled as a legacy market-click hit.|
|335/1 at665;336/1 at666|An unrecognized action does nothing;without transaction,equip delegates directly to the inventory. Generated controls use the closed action set and Main supplies transaction. Actual cosmetic purchase/equip/current-character preview tests own normal wardrobe behavior. Both fallback alternatives remain counted.|

Behavior authorities include market-runtime/market-layout,market-pack-replacement,
market-tiny-focus,run-hand-runtime,the owner keyboard/controller/ghost/paid-pack/
fresh-context journeys,and both-mode turn-market boundary suites. The dedicated
replacement fixture explicitly stages coins,named stock and seeded draft RNG;
purchases,picks,marks,skips and confirmation use visible controls. It verifies
opening a full-hand pack charges once and leaves the original hand unchanged,
marks apply only on final valid swap,Back/resize keep picks,forced close retains
the paid draft,and skipping preserves payment/stock. These are honest arranged
economy journeys,not claims of natural world income or random pack odds.

The normal3×2 shelf,separate wardrobe,current traveler preview,persistent hand,
44px controls,no scrolling and both-theme/frame geometry have existing actual
browser assertions. Final current-build visual inspection remains separate.
Every72 raw site now has a consequence and behavior disposition;all still count.
Main's remaining orchestration review,the fresh full gate,official conformance,
visual/clause audit,final exact gates and opening the PR remain required.
