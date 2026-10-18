---
phase: 6
slug: cross-mode-presentation
status: approved
shadcn_initialized: false
preset: none
created: 2026-10-16
execution: generic-agent-fallback
---

# Phase 6 — Cross-Mode Presentation UI Design Contract

This contract closes UI-04/UI-05 through two bounded changes: **G1**, shared HUD/canvas composition, and **G2**, removal of duplicate solo personal status during shared play. It preserves delivered lifecycle, recovery, owner, result and input policies. It applies the full UI-researcher role through the documented generic-agent fallback; it does not claim typed-agent execution or implementation acceptance.

Sources: `06-CONTEXT.md`, `06-RESEARCH.md`, `06-VALIDATION.md`, ROADMAP/REQUIREMENTS, approved Phase02–05 design decisions and current `main.ts`, `session-ui.css`, `relay-ui.css`, `race-ui.css`, `render.ts`, `market-ui.ts`, `run-hand.ts`. Phase05 human visual/feel acceptance remains pending. No design question already answered upstream is reopened.

## Design System

| Property | Value |
|---|---|
| Tool | none — existing TypeScript, DOM/CSS and canvas |
| Preset | not applicable |
| Component library | none |
| Icon library | existing inline game glyphs, geometric seat markers and voxel models |
| Font | bundled Lilita One; `ui-rounded, system-ui, sans-serif` fallback |
| Material system | existing runtime-derived paper, wood, ink, green and gold tokens in `game-ui.css` |
| Composition | one scene/camera, one selected-owner hand/shelf/market tree, existing lifecycle and result boards |

The design system is already established. The generic shadcn initialization prompt is superseded by the explicit existing-system/no-library/no-install constraints; no initialization or registry action is authorized. The game's intentional large typography and 44px controls remain the written exception to napplet boilerplate compact defaults. No title, masthead, footer, website column or dashboard surrounds the scene.

**Solo is unchanged:** this contract's CSS and visibility logic apply only while a committed shared session owns presentation or an existing multiplayer board is open. Do not restyle solo ready/play/pause/death, add a confirmation, alter solo camera projection, or remove solo health/power/wallet information. Cancel and retry restore the original solo presentation and input behavior.

## Spacing Scale

| Token | Value | Usage |
|---|---:|---|
| xs | 4px | marker/text gaps, compact status rows |
| sm | 8px | scene-edge clearance, compact controls and band gaps |
| md | 16px | detail-board padding and grouped facts |
| lg | 24px | regular board sections |
| xl | 32px | wide board columns |
| 2xl | 48px | major wide-scene separation |
| 3xl | 64px | broad-scene grouping only |

Exceptions: existing 3px outlines/focus rings, 5–8px material radii, 8px wood frames and minimum44×44px targets are material/accessibility dimensions. Geometry budgets below are container bounds, not additional spacing tokens. No negative gap, text scale transform or clipped scrollbar may disguise overflow.

## Typography

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Compact status / identity metadata | 16px | 400 | 1.2 |
| Body / controls / complete detail | 20px | 400 | 1.5 |
| Board heading / selected traveler | 28px | 600 | 1.2 |
| Result distance / rank / critical numeric cue | 44px | 600 | 1.1 |

Exactly four sizes and two weights for touched multiplayer material. Compact controls may use the16px role; never go below it. Keep tabular numerical values. Marker and P-number never truncate; a long character/device tail may ellipsize in a live summary, with its complete text in the accessible name and detail view. Detailed data and action labels wrap or page, never disappear behind an ellipsis. Inherited solo type remains untouched.

## Color

| Role | Value / existing token | Usage |
|---|---|---|
| Dominant60% | runtime `--bg`, game paper `#fff0c5` | scene surround and material surfaces |
| Secondary30% | wood `#77512f`, edge `#3e3423`, ink `#233e32`, green `#365d48` | frames, text, inactive identity/status |
| Accent10% | gold `#f2cb73`, runtime `--primary` mix | selected inspection marker, active Relay runner, Race lead/rank cue, enabled primary confirmation |
| Destructive | brick `#c56a36` | final Leave/Skip confirmation and fatal/error emphasis |
| Focus / informational | teal `#4b8b7a` | visible focus and protected/informational outline |

Use existing `color-mix()` derivatives; the proportions describe material hierarchy, not a recoloring of terrain. Accent is reserved for the listed states, never every button or every player. Identity and lifecycle always include marker, P-number and text, not hue alone. Disabled/read-only text remains readable on both themes. Theme changes repaint html/body/root, notice, scene surround, all boards, focus and disabled states together. Preserve existing no-theme fallback.

## G1: Scene and HUD Composition

### Live hierarchy

1. The course, actual travelers and their nameplates are the primary live surface.
2. A bounded top identity/status band identifies every current roster seat. A shared course cue belongs to that band, not another floating panel.
3. The lower edge contains the existing shallow owner shelf and global controls, with distinct hit areas. There is one visible owner label for the shelf and no anonymous second wallet.
4. Full inspection uses the existing HUD detail surface/pages. It may intentionally obscure a tinted, paused scene; it is not a permanently expanded second dashboard. Pointer inspection retains existing deliberate shared-modal pause semantics. Inactive controller/gameplay inputs acquire no new pause authority.

Regular900×600 currently cannot accommodate four tall full-detail cards without covering nearby actors. Therefore this phase explicitly replaces those tall cards with **2×2 summary tiles** at that tier, using the already approved bounded inspection pattern for complete facts. This changes density, not required information, lifecycle or control authority. Wide expanded details remain specified below.

### Required information

At compact/short tiers, nonselected44px seat chips show marker/P-number, expose current health/lifecycle in their accessible descriptions, and announce an actionable recovery indication. The selected visible summary shows the concise facts below. Regular/wide tiles show each seat’s health/lifecycle visibly.

Every live summary shows marker + P-number + character, numerical feather health and an explicit lifecycle/mode cue. Race also shows concise rank/leader and fog state; Relay distinguishes active/next/unavailable and shared boundary/leg cue. Summary activation opens that seat's existing details. Selection changes inspection only.

Details retain identity/device, health, earned distance, wallet/card count where eligible, innate name/readiness and100-tile progress, personal revival and250-tile progress/offer, eligible items/effects, lifecycle and mode facts. Use the existing Status / Run / Recovery / Items pages at constrained sizes. A pending personal offer must remain discoverable through a visibly labelled44px action or affected-seat summary; it may not be hidden behind an unannounced decorative badge. Existing direct recovery actions remain direct after opening their page. Race's live shared clock and Relay's incoming confirmation stay visible in their relevant board.

### Frame contract and live-world budgets

Height rules take precedence over width. Budgets are maximum occupied bands and minimum clear live rectangles; content that cannot fit uses existing pages, not smaller text. All measurements are iframe CSS pixels.

| Frame / breakpoint | Live HUD and controls | Clear live-world region |
|---|---|---|
| Width<240 or height<240 | Exact existing size notice only; no interactive game surface | Not applicable: global safety suspension |
| Width240–479 and height240–419 | One44px seat-marker strip, one compact selected/mode status line; full details on explicit inspection. Bottom controls/shelf use existing bounded compact pages | At240×240, reserve at least80px vertical scene between top/bottom bands; side clearance8px |
| Width240–479 and height≥420 | Marker strip plus concise selected identity/health/mode summary; complete details in existing bounded view | At320×560, top band≤144px and bottom band≤112px; clear region at least304px high, width minus16px |
| Width≥480 and height240–419, including1000×280 | Short layout: one horizontal marker strip and selected status; details open as short pages. Keep clock/incoming identity and one primary action on relevant modal pages | Top band≤80px, bottom band≤112px; at1000×280 clear region≥88px high, width minus16px |
| Width480–1599 and height≥420, including900×600 | 2×2 summary tiles, not full-height player cards. Shared cue and two summary rows fit within160px top band. Tools/shelf occupy≤112px bottom band | At900×600 clear central rectangle x8..892, y160..488 (328px high). No permanent side rail intrudes into it |
| Width≥1600 and height≥900, including2400×1200 | Expanded2×2 player detail group within the upper416px, with shared course cue; full per-seat rows readable. Use the broad scene/board, not a narrow centered panel. Shelf/tools≤128px bottom band | At2400×1200 clear rectangle x8..2392, y416..1072 (656px high) |
| Width≥1600 with height420–899 | Use regular summary-band treatment; width alone cannot justify tall cards | Same160px/112px band limits as regular |

The canvas still fills the frame under these surfaces. Budgets are not permission to leave unused opaque panels: use the minimum necessary content height. Keep at least8px between live body/nameplate geometry and any opaque panel or actionable footprint. At compact/short tiers, naturally offscreen travelers retain the existing mode identity treatment; do not manufacture extra live actors or new gameplay rules.

### Cross-layer acceptance, not just a layout rectangle

For each visible traveler, measure the **entire rendered voxel-body envelope and packed nameplate/status envelope**, including interpolation/hop height, in the same CSS coordinate system as visible DOM panels. Compare against actual visible HUD tiles, course/status strips, toast/warnings, owner label, hand/shelf and action/control rectangles. Include material borders/shadows where they conceal the actor. A passing center-point, canvas bounding box, percentage of exposed world or label-versus-label test is insufficient.

Prove Survive Arcade, Survive Flow and Race with four real seats at initial grouping and real-input left/right course positions at900×600 in both themes. Relay proves its one actual active runner at initial/left/right positions while all original roster identities remain represented; never spawn simultaneous Relay runners to satisfy the test. Capture full-size images and inspect actual bodies/nameplates as well as automated rectangles. Reuse existing safe public-seed journeys, authorized controller snapshots and read-only production observations; no private position/world injection or alternate render bundle.

Start with this CSS/DOM band composition. If measured bodies/nameplates still intersect an occupied band, introduce only a documented **generic optional presentation-safe viewport** at the current renderer integration seam. Its default is the exact existing solo projection. It may change shared screen-space projection/framing, but must preserve the authoritative world camera policy/anchor semantics, fog boundary, actual coordinates, movement, clocks and earned progress. All scene layers and edge cues must use the same transform. It must not hide an otherwise visible nearby traveler merely to pass. Record before/after geometry demonstrating why CSS alone was insufficient. No world actor relocation, artificial zoomed screenshot, detached labels, new mode-ID branch or gameplay-camera mechanic is permitted.

## G2: One Personal Status Source

During shared play, hide the solo personal score/best, wallet, feather meter, innate-power panel and temporary-personal-power list from visual and accessibility presentation. Their authoritative shared equivalents are per-seat summaries/details and the owned hand. Do not relabel `game.run.wallet` as the selected owner's wallet.

Retain global mute, pause/resume, menu and movement controls with correct accessible names. Retain shared world/chapter information only once where it remains useful within the bounded course cue; do not layer it over the travelers. Race retains Finish/time/Lead/fog; Relay retains shared distance/current leg/next boundary. Survive distinguishes team course distance from personal earned distance. No new numerical accounting is introduced.

On owner switch, show the new marker/name and real wallet/hand, invalidate the same existing transient offer/card/target/focus/input contexts, and retain paid inventory state according to delivered policy. On session cancellation or retry to solo, remove shared presentation attributes and restore solo chrome immediately. Hidden solo content is not focusable or announced behind multiplayer boards.

## Existing Surfaces and State Preservation

| Surface/state | Contract retained through changed composition |
|---|---|
| Setup | Existing unique characters, bindings, defaults/validation and one-action solo cancel/start; no new setup step |
| Inspection/pause | Existing selected seat, page and prior pause reason; Close returns safely without a leaked hop. Resize alone cannot transfer control |
| Survive ghost/reclaim | Distinct retained inventory/seat versus death; shared recovery and active-time behavior unchanged |
| Relay handoff/loss/skip | Same incoming seat and fresh correct-seat confirmation; read-only View relay works without starting a leg; inactive inputs retain restrictions |
| Race fog/reclaim/last racer | Same monotonic boundary, active clock, grace and no-ahead reclaim; one disconnect does not pretend to pause competitors |
| Personal/teammate recovery | Preserve owner, target, charge, deadline, generation and actual failure reason. No cosmetic reset or free protection |
| Hand/market | Exactly one physical tree; visible owner and correct authority. Selling retains current market/pack page; owner changes clear transient selections rather than transfer them |
| Results | Frozen record only. Survive equal-height team; Relay shared-distance contribution ties plus leg ledger; Race competitive ties and unranked DNF. Every departed/replaced participant remains pageable |
| Retry/teardown | Existing retry action, input cleanup and optional-domain fallback; previous result remains immutable |

Resize preserves selected participant and logical detail/metric/page wherever still valid; reflow may change how many records fit but must retain that participant and restore a visible equivalent action. If the initiating element no longer exists, focus its seat summary or the safe scene, never a hidden node. Below minimum size preserve data/subscriptions and clear held input; resizing back does not confirm a handoff, buy, revive or resume a distinct user pause.

## Copywriting Contract

Use existing delivered copy unless the bounded summary needs the compact forms below. Braced values come only from authoritative projections. These are specified UI strings, not new mechanics.

| Element | Copy / behavior |
|---|---|
| Seat summary accessible action | `Show P{n} · {character} details` plus current health/lifecycle description |
| Detail heading | `P{n} · {character}` |
| Detail navigation | `Previous details`, `Next details`, `Close details`; retain Status / Run / Recovery / Items labels |
| Owner heading | `Viewing P{n} · {character}` |
| Health | `{health}/{max} feathers` |
| Separate meters | `Power · {earned}/100 tiles`; `Personal revive · {earned}/250 tiles`; existing Ready/offer wording takes precedence when applicable |
| Empty items | `Items: —` |
| Survive live lifecycle | `Active`, `Down`, `Protected`, `Waiting to reclaim`; do not call disconnect death |
| Relay cue | `Relay distance {distance}`; `Leg {n} · P{runner}`; `Next boundary {distance}` |
| Relay transfer CTA | `Start P{incoming}'s leg`; secondary `View relay` |
| Race shared cue | `Finish {distance} · {clock}` and `Lead {leader} · fog {boundary}` |
| Race status | `Racing`, `Finished`, `Fog line · safe`, `Fog — feather in {seconds}s`, `Reclaim {seconds}s`, `DNF · Left/Down/Forfeited` as applicable |
| Pending personal offer CTA | `Use personal revive · {seconds}s` |
| Waiting heading/body | `Waiting for a player to reclaim.` / existing mode-specific reserved-seat explanation |
| Missing optional controllers | `Controllers aren’t available in this shell. Keyboard players can still join.` |
| No eligible teammate | `No teammate can be revived right now.`; retain charge and Back |
| Race no target | `No racer is in range.`; retain charge and Back |
| Invalid/stale owner action | Existing authoritative reason, e.g. `P{n} must reclaim their controller first.` or `Only the active runner can use the relay hand.` |
| Survive leave confirmation | `Leave as P{n}?` / `Your run ends, but this is not a death.` / `Keep playing`, `Leave run` |
| Relay leave/skip | Existing `Leave Relay as P{n}?` or `Skip P{n} this turn?`; safe Back/Keep playing first; explicit final action |
| Race leave | `Leave Race as P{n}?` / `Your race record stays in the results. This is not a death.` / `Keep racing`, `Leave Race` |
| Team result / CTA | `The flock's run` / `Hop again` |
| Relay result / CTA | `Relay results` / `Hop again` |
| Race result / CTA | `Race results` / `Race again` |
| Minimum notice | `Needs 240×240 to play — enlarge this pane.` |

Loading dependent setup/reclaim state keeps the last valid identity and the existing Checking… message; never add a full-screen loading illustration. Failure text states the real failed condition and available Back/reclaim action. No successful feedback appears before an authoritative commit. There are no new destructive actions in Phase06.

## Focus, Accessibility, Motion and Audio

- Every summary, owner chip, page control, field and action has a minimum44×44px hit target. Distinct targets never overlap. Preserve a visible3px teal focus ring and3px offset; include it in layout clearance.
- Inspection and existing modal boards use dialog semantics, accessible heading and trapped keyboard/controller order. Keep input-source authority separate from DOM focus: a visually selected seat is not a controller lease. Focused Enter/Space activates the focused allowed control; direction/confirm on read-only result/roster controls must remain usable after gameplay ends.
- Opening/closing, owner changes and minimum-size transitions preserve existing fresh-edge seeding. Held confirm cannot dismiss results/start the next leg; a wrong-seat controller cannot operate another participant's transaction. No first-hop leak.
- One concise live announcement per meaningful lifecycle/ownership change, not each render or timer tick. Label an actionable offer/expiry once; keep countdown available as ordinary text. Retain exact existing mode semantics.
- App reduced-motion and system reduced-motion both replace board/inspection animation, camera shake, HUD flash, fog/effect pulse and podium motion with static state. No new animation is needed for the band reflow; resize is immediate and does not animate controls across the scene.
- Mute remains global and accessible. Sound supplements text/shape only. Automated browsers mute device output while leaving the production audio graph intact. Missing optional domains and focus loss retain existing safe behavior.

## UI Considerations

The installed compiled UI probe ran successfully on10 explicitly classified surfaces and raised43 candidates. Orchestrator resolution against this contract: **28 covered,8 backstop,7 dismissed with reasons,0 unresolved**. These are design dispositions, not implementation passes. Raw output is `/tmp/down-to-duck-06-ui-probe.json`; resolved evidence is `06-UI-PROBE.json`. The six original author-proposed backstop subjects remain mandatory in plans: actor occlusion, band budgets, sale/page continuity, minimum-size restore, themes/motion, and real focus/action reachability. Themes/motion and input authority are open-domain requirements beyond the finite probe categories.

E1 roster; E2 inspection; E3 scene; E4 hand/market; E5 lifecycle decisions; E6 results; E7 setup; E8 global controls; E9 minimum notice; E10 duplicate status suppression.

| Surface | Category | Disposition | Contract resolution or dismissal reason |
|---|---|---|---|
| E1 | empty | covered | Before commitment use setup; after no available racers use existing waiting/terminal policy, never an empty live HUD. |
| E1 | loading | dismissed | Local committed roster is synchronous; setup/reclaim checking remains in its existing board. |
| E1 | error | covered | Preserve explicit disconnected/reclaim state and existing safe actions. |
| E1 | populated | covered | G1 identity, health and mode/lifecycle summaries; compact chips use clarified selected-summary disclosure. |
| E1 | partial | covered | Dead, ghosted, finished and reserved seats remain explicitly labelled; no fabricated actor. |
| E1 | overflow | backstop | G1 band budgets and full actor/nameplate-versus-DOM proof at required frames. |
| E1 | zero-one-many | covered | Relay has one active actor; simultaneous modes2–4 seats; zero available actors uses waiting/terminal policy. |
| E2 | loading | dismissed | Inspection reads current in-memory state synchronously; no asynchronous content loader. |
| E2 | error | covered | Invalid owner/context follows existing safe return and focus restoration. |
| E2 | overflow | backstop | Existing bounded detail pages retain participant and logical page through resize. |
| E2 | long-text | covered | Typography/Copywriting contracts preserve full required facts through wrapping/paging. |
| E3 | empty | covered | Render retained course during no-living-player recovery/wait/result; no fake traveler. |
| E3 | loading | dismissed | Procedural bundled scene has no external media fetch; preserve existing startup rendering. |
| E3 | error | dismissed | No new external media failure path; retain existing boot/optional-domain fallback. |
| E3 | populated | backstop | G1 full body/nameplate envelopes avoid actual opaque UI; conditional shared-only viewport preserves solo. |
| E4 | empty | covered | Copywriting empty items/targets and safe Back; inventory charge unchanged. |
| E4 | loading | dismissed | Existing owner inventory and seeded offers are synchronous, no network loader. |
| E4 | error | covered | Existing authoritative rejection reason precedes any success/debit. |
| E4 | populated | covered | One owned tree with real selected-player wallet/hand and eligible items. |
| E4 | partial | covered | Sold/unavailable/disabled offers retain real availability and ownership. |
| E4 | overflow | backstop | Bounded market/pack pages; selling preserves page and selected-owner context. |
| E4 | zero-one-many | covered | Existing inventory capacities and pages; zero items and variable eligible selections retain delivered controls. |
| E4 | long-text | covered | Complete action/error copy wraps/pages; no smaller type or clipped controls. |
| E5 | overflow | backstop | Bounded recovery/reclaim/handoff pages preserve offer,target,deadline and focus through notice/resize. |
| E5 | long-text | covered | Full authoritative copy and44px actions fit by wrapping/paging; no hidden recovery. |
| E6 | empty | covered | Valid committed run records include original participants; no synthetic empty podium. Existing ready/setup appears before terminal result. |
| E6 | loading | dismissed | Frozen results produced synchronously from authoritative settlement; no network result loader. |
| E6 | error | dismissed | No external result retrieval; preserve prior frozen result during retry/teardown. |
| E6 | populated | covered | Team equal-height, Relay contribution ties/ledger, Race true competition ties and unrankedDNF. |
| E6 | partial | covered | Explicit left/dead/forfeit statuses; all archived/replaced participants retained. |
| E6 | overflow | backstop | Bounded immutable participant/metric pages; retain selected participant after resize. |
| E6 | zero-one-many | covered | Page frozen participants rather than live roster; one remaining actor does not remove archived records. |
| E6 | long-text | covered | Full identity/stat fields accessible on bounded pages, no truncation of required outcomes. |
| E7 | empty | covered | Existing valid defaults and explicit unique-character readiness; incomplete roster cannot start. |
| E7 | loading | covered | Existing Checking status and disabled dependent action retain valid identity. |
| E7 | error | covered | Existing inline binding conflict/invalid settings copy and correction/reset controls. |
| E7 | partial | covered | Retain unfinished draft across pages/resize; unique character/device validation unchanged. |
| E7 | long-text | covered | Existing bounded setup pages and complete accessible device/character labels. |
| E8 | long-text | covered | Existing accessible global action names,44px targets and tier layouts; no label clipping. |
| E9 | overflow | backstop | Exact minimum notice at200×160; no game actions; restore state without activation. |
| E9 | long-text | covered | Exact short minimum copy wraps inside notice; no invented long dynamic content. |
| E10 | overflow | backstop | Shared-only hide duplicate personal visuals/accessibility content; restore exact solo chrome. |
| E10 | long-text | covered | Existing solo typography/copy remains unchanged; no new dynamic text surface. |

## Implementation and Validation Boundaries

### Authorized compact-control reconciliation after06-01 checkpoint

Measured240×240 control/shelf stacking cannot leave the required80px live course.
Use an explicit44px Controls disclosure with selected owner in its accessible name.
Keep one shallow live movement/call row where it fits; otherwise retain touch
movement and reachable Play controls in the disclosure. Disclosure uses the
existing deliberate paused inspection with labelled Play / Tools / Hand pages,
actual mute/pause/menu controls and the single physical hand/gear/item tree moved
or reused, never cloned. All actions remain reachable at44px through bounded pages.
Keep visible owner inside the drawer, original pause history, logical page/focus
through resize, correct-seat authority and fresh close without a hop. This is an
authorized presentation repair, not a new gameplay/menu authority. Original bands,
full facts, exact solo and body/nameplate clearance remain binding.

Keep the proposed two-plan scope: (1) retained G1/G2 RED/GREEN plus narrow composition repair, (2) changed-surface lifecycle/owner/result acceptance and inherited gates. Reuse delivered fixtures/state acquisition. Do not create a second420-capture Race suite or rewrite mode mechanics to satisfy presentation. Existing Survive five-participant departure/replacement proof already establishes retained history.

New evidence must link mode/state/frame/theme to source/artifact revision, actual input path, geometry result and inspected image. Measure actual900×600 initial/lateral travel first, then changed surfaces across all six frames. Inspect contact sheets AND full-size four-seat/lateral, compact owner, short recovery, handoff and result representatives. Global modal occlusion is intentional only while its existing authoritative pause/decision policy applies; distinguish that from live HUD obstruction.

After source freeze follow `06-VALIDATION.md`: exact Relay Gate6 and Race Gate7 with inherited checks, bounded new regressions, immutable solo numerical/pixel parity, type/build/guidance/conformance and unchanged lockfile. No test execution is claimed by this design document. Conformance5pass/5unmeasured and physical-controller limitations stay explicit. Phase05 human acceptance remains pending independently.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|---|---|---|
| shadcn official | none | Not applicable: existing manual DOM/CSS game system; no initialization |
| third-party | none | Not applicable: no registry blocks, packages, fonts or downloads enter this phase |

## Checker Sign-Off

- [x] Dimension1 Copywriting: PASS
- [x] Dimension2 Visuals: FLAG — compact wording clarified per review
- [x] Dimension3 Color: PASS
- [x] Dimension4 Typography: PASS
- [x] Dimension5 Spacing: PASS
- [x] Dimension6 Registry Safety: PASS

**Approval:** Independent checker approved2026-10-16 with0 blockers; compact summary clarification applied. Actual postapproval probe executed and mapped as above. Geometry budgets and the conditional generic presentation seam are explicit implementation defaults to validate against retained RED evidence, not a claim of completed visual proof. No unresolved user preference or new gameplay decision is introduced.

### Execution reconciliation: transient notifications

The final capture review found a real seeded-launch toast over compact travelers;
retained regression98ac9a4 includes toast/warning material footprints. The root
approved a Notice indicator inside the existing44px Controls target, its accessible
notice label, and full current text on the authoritative paused Play page. The
single live announcement remains; paused shared time preserves the notification.
No extra permanent row or essential health/mode/time replacement is permitted.
Regular/wide toast placement must clear actors and interactive controls. A shared
pursuit countdown may reuse the existing forward action in the action band, with
its full accessible warning description and existing urgency treatment.
