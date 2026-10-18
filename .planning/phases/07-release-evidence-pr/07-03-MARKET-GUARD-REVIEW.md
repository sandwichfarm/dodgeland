# Market guard review: pending evidence, no exclusions

This is source/contract review of fourteen still-unmeasured initial candidate
arms. It is not new execution evidence, a coverage adjustment or a release pass.
This opening review was prepared while full51a4bea2 was live. That collection
subsequently terminated; the execution section below records the separate
ordinary and canonical market proof. No source exclusion follows.

Source `src/co-op-market.ts` SHA256:
`037a96c9f9436346f06306cac74808aab5e92e205ce2c42bebb1dbd16ca24c22`.
This matches the initial pinned run6802.../initial-report. Its mapped branch
schema remains the initial ledger authority
`5c0c995062abdef97214ca2e033dd9f8cb77f58ff6ef34ec4c5151de18e36d0a`.
Root inspected the actual initial `report/coverage-final.json` branch types,
locations and zero arms; neither those counts nor their schemas are replaced.
The rows below identify the exact candidate arm, rather than an entire line.

Requirements: UI-03 owner-labelled market/menu continuity, ITEM-01/ITEM-03
validated consumable acquisition, COOP-01 independent inventories, ARCH-02
composable lifecycle, and TEST-02 real production logic. Optional exported-host
compatibility is distinct from a real LocalSession gameplay journey.

## Reviewed conditions

Rows require a passing named job and exact source/map/schema match before
classification as covered. Eight rows now have that proof in the execution
section; the six exported-host/defensive candidates remain evidence pending.

| Branch/arm, line | Condition and consequence | Scope and smallest genuine proof opportunity |
| --- | --- | --- |
| 3/1,81 | Omitted catalogue hook selects built-in CONSUMABLES. | Exported adapter compatibility. A host using real owner inventory should show built-in offers and debit/credit exactly once for a valid purchase. Installed LocalSession always supplies the hook. |
| 9/0,100 | Missing consumable owner state prevents a snapshot. | Exported host boundary. With no authoritative inventory state, context/action must remain unavailable and both owners unchanged. Installed eligible owners normally have state. |
| 20/1,131 | An unknown offer yields no commit assets before dispatch rejects it. | Actual-session malformed request with current context: no debit, card, sold offer or interaction, and rejected action identity remains reusable. |
| 23/1,132 | Missing equip/consumable item ID yields no pre-dispatch commit assets. | Actual-session malformed request: no appearance, charge, wallet or contribution mutation. This is distinct from an unknown but present ID. |
| 25/1,133 | Unknown sale card yields an empty component list. | Actual-session stale/malformed sale: no wallet credit, card deletion or contribution; a later corrected sale can reuse the rejected action ID with current context. |
| 31/0,141 | Disabled host refuses owner resolution. | Disabled/settled session lifecycle or adapter host contract. Check whether the actual route reaches this guard rather than only an earlier missing-adapter guard; retained adapter references are component evidence. |
| 33/1,145 | Omitted canAct callback defaults its policy predicate to true. | Exported adapter compatibility; the remaining active/not-dead/run-alive checks must still reject unavailable owners. Installed LocalSession always supplies canAct. |
| 35/0,149 | Missing state during a later item-eligibility read prevents credit planning. | Defensive exported-host contract. State must be unavailable at this read after earlier snapshot validation; do not claim a normal app lifecycle or manufacture one. |
| 43/1,164 | Missing sale ID returns the choose-card failure. | Actual-session malformed request: full owned inventory, fractional income, wallet and interactions stay exact. |
| 46/1,166 | Omitted pack selection IDs become an empty claim selection. | Actual paid draft, current owner context: reject incomplete claim without losing draft, wallet, RNG or teammate state; complete the same draft afterward. |
| 49/0,168 | Outstanding paid draft prevents ordinary purchases/equip. | Actual supported state: try buy/equip/consumable with current contexts while keeping the paid draft, resources and RNG unchanged; original draft can still complete or skip. |
| 51/1,169 | Missing offer ID returns choose-offer failure. | Actual-session malformed request. Distinct from20/1's unknown present ID; reject without side effects or consuming action identity. |
| 53/1,170 | Missing cosmetic ID returns choose-look failure. | Actual-session malformed request: retain equipped appearance, owned cosmetics, wallet and teammate. |
| 56/0,173 | A second pending-pack check protects consumable purchase. | The narrow synchronous installed-host path appears redundant, but general adapter redundancy is unproven. No forced-state coverage test or exclusion is proposed. |

## Why branch56 is not excluded

`canBuyOrEquip` at73 requires an open live market and `!run.pendingPack`.
Dispatch at168 rejects when that predicate is false. After that check, the
consumable path calls `isConsumable`, which invokes the optional catalogue host
callback, then reads the catalogue again before the second pending-pack check.

For the installed LocalSession, `installCoOpMarket` at650 supplies a synchronous
catalogue callback that only returns the installed catalogue/default.
`RunInventory.pendingPack` in `src/market/run.ts` is a plain field; no async
boundary or installed callback in this segment mutates it. That supports only a
narrow installed-host observation. `CoOpMarketHost` at57 permits other callback
implementations, and the adapter is exported. The interface does not promise
callback purity or seal that field. A custom callback could change draft state
between guards. Therefore zero counts and the installed path do not prove
universal unreachability. Keep the guard and its full denominator.

## Reuse and ordering

The existing `tests/survive-economy-boundaries.test.mjs` full-hand paid-pack,
owner-switch, sale, selection and skip cases already establish actual session
resources. Extend those assertions if current counters still show meaningful
request/draft gaps. `tests/release-coverage-gaps.test.mjs` already proves a
rejected closed-window request does not consume its action identity; reuse that
pattern with fresh current context rather than weakening version checks.

Optional-host compatibility belongs to a small component contract using real
RunInventory/ConsumableWorld authority. It must not acquire artificial mode
credit or replace a normal game journey. Do not modify product code, remove
callbacks, weaken floors or invoke private methods just to hit a zero arm.

Independent read-only review agreed with this separation and the branch56
limitation. Root checked actual source and initial mapped sites. This review
initially changed no counters and marked none of these fourteen arms covered.
That preparation is distinct from the later execution below.

## Executed market guards

Whole ordinary `tests/survive-economy-boundaries.test.mjs` passed12/12, followed
serially by the exact registered whole job in canonical `market-guards-03`,
run `d67d7db4-06f4-40dc-95bb-64c066a13ca6`, also12/12. One independent Node
parent; no mode attribution, browser or live-device claim. Both new cases cover
Arcade and Flow and either owner using real LocalSession/RunInventory authority.
Initial funds and valid offers are component fixtures.

Malformed missing/unknown purchase, equip, consumable and sale requests leave
both runs, fractional income, RNG/revision, charges, appearance, positions,
health/immunity, progress, innate cooldown, clocks and interactions unchanged.
Rejected action IDs remain reusable for a valid sale; committed IDs reject a
different valid trade even with fresh context versions. The paid Small Pack
fixture has one pick, no bonus choice and an empty hand, avoiding capacity
confounds. During its paid draft, valid buy/equip/consumable requests and an
omitted-ID claim fail without losing the draft; the original choice then
succeeds once without a second charge or teammate mutation. The preexisting
Large Pack/full-hand case remains intact.

The following exact initial-zero arms now have positive counts and explicit
behavioral assertions. Source SHA remains037a96c9...; map SHA is
`059f2c4a97a7a2b1d22f66d5b34ebec99e624f01557f299b63f045b102788d3c`.
Initial and current statementMap/fnMap/branchMap are byte-for-byte JSON-equal;
the current disk source matches both inventories. No initial counts changed.

| Branch/arm | Line | Canonical count | Assertion |
| --- | --- | --- | --- |
|20/1|131|8|Unknown offer refuses without any owned-state mutation.|
|23/1|132|8|Omitted item leaves appearance, consumables and resources unchanged.|
|25/1|133|8|Unknown sale card cannot credit wallet or consume action identity.|
|43/1|164|4|Omitted sale ID preserves the full owned card before corrected sale.|
|46/1|166|4|Omitted paid selection preserves draft for the later valid choice.|
|49/0|168|12|Paid draft blocks three otherwise valid purchase/equip paths.|
|51/1|169|4|Omitted offer cannot debit or consume action identity.|
|53/1|170|4|Omitted look cannot change the owned appearance.|

The focused suite alone covers118/135 market arms; that is not the combined
release result. It adds eight branches absent from full51a4bea2, with no new
session branch witness. A fresh enforcing aggregate remains required. Normal
build and root lock raw hashes remained unchanged. Log:
`/tmp/down-to-duck-07-03-market-guards-canonical.log`; exact proof:
`07-03-MARKET-GUARD-PROOF.json`. No production, dependency or policy change.
