# Paid turn-mode market and pack boundaries

UI-03,RELAY-05,RACE-01/04,TEST-02/03 and the user's full-hand pack/skip rule.
Four actual Relay/Race Arcade/Flow lifetimes pass4/4 ordinary and canonical
54bfb542-2144-429d-8e82-7a4e67ea26dd,one Node parent/sixteen intervals.

The meadow,market eligibility,starting funds and added stock are explicit
component fixtures. All purchases,equip,sales,pack claims and skips use actual
mode-owned CoOpMarketAdapter requests. No public shop UI/course traversal claim.

Wrong device/participant/owner/inventory/run/context versions and malformed
action IDs preserve both players' wallets,hands,drafts,RNG/revision,effects,
recovery and interaction histories. Rejected attempts do not consume a corrected
identity; a subsequent valid purchase pays exactly once. Exact duplicate requests,
sold stock and an unsold offer for an already-owned cosmetic reject atomically.
Missing offers/cards/looks,empty action fields,unknown actions and absent drafts
remain harmless. Equip succeeds only for the bought look.

Relay fills the normal three-card hand,opens two extra slots by actually buying
Extra Pocket,and rejects selling that card while the remaining hand would
overflow. Selling another card first permits that sale and restores three slots.
Repeated paid Gold Rush renews the same owned power rather than duplicating it.
A full hand still opens the actual Large Pack;invalid/missing/duplicate choices,
unknown/duplicate discards and overflowing claims retain payment/draft/hand.
Choosing real draft cards while discarding the held hand succeeds with no second
debit or refund. A later Small Pack skips without changing the hand,refunding
coins or reopening sold stock. Real Flow updates expire the temporary power
after closing the market. No timers or effects are injected.

Race rejects actual card,Small/Large Pack and power offers while retaining its
empty hand/no draft/no power. Bought hat/shirt cosmetics remain independent
wearable slots. The other traveler receives no wallet,item,purchase or effect
credit. Terminal results disable a saved pre-terminal market request without
changing funds or frozen results. The initial test fixture wrongly asked for a
fresh context after terminal invalidation;only the fixture changed to retain its
actual pre-terminal request. That log is retained,not a product RED.

TURN-MARKET-PROOF.json binds run,source/map/sites,logs and complete unchanged
canonical inventory/schema comparisons. Diagnostic unions gain56 Relay/43 Race
branches:Relay2154/2793B,1971/2104L,650/710F;Race2386/3032B,2040/2163L,694/758F.
Remaining branch targets221/192;line/function targets pass diagnostically.
Mechanically validated execution inventory146 entries/153 closure/158 production
jobs retains all prior jobs/controls. No source,dependency,oracle,applicability
or numeric floor changes; normal903/rootlock5ac remain exact. No full enforcing
release acceptance is claimed.

Two initial zeros newly gain semantic dispositions:co-op-market31/0 at141 has4
hits(terminal mode disables market ownership),market/run77/0 at222 has4 hits
(already-owned cosmetic rejected). Eight other initial co-op-market guard hits
were already reviewed and are not counted again. Initial review now totals180
annotated(179 covered,one private default),871 pending. All initial counts and
changed Game/Session source identities remain intact.

## Expanded actual bonus reveal

The whole four-case suite now also proves the actual Large Pack two-pick bonus
with its unchanged seed and a bounded sequence of paid offers. Every ordinary
reveal is skipped without refund or hand change. The actual bonus must occur
within32 purchased reveals;no RNG,picks or bonus fields are replaced. With a full
three-card hand,duplicate two-pick IDs and overflowing claims reject atomically,
then selecting two actual draft cards and discarding the held hand succeeds
without a second debit/refund. All original assertions remain.

Ordinary4/4 and canonical4/4 d05cb058 pass;the source-mapped actual bonus-picks
conditional82 now hascounts[2,4],so both one/two choices are observed. The initial
54bfb542 complete report is retained under its UUID/retained-completed-report
with verified original manifest hash. Current union selects d05cb058 once,not
both repeated cohorts. Three more Relay branches gain evidence;including the
completed character cohort,current diagnostics are Relay2180/2793B(needs195),
Race2404/3032B(needs174). No new initial-zero annotations or scope/floor change.
TURN-MARKET-BONUS-PROOF.json retains exact identities,counts,logs and limits.
