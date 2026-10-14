# Card expansion

Thirty additional run cards use the existing modifier and score-event contracts.
Each is discovered from its own default-export module in `src/market/items/`.
Existing cards, their prices, the three-card starting capacity, and global effect
limits are unchanged. Prices remain 12 common, 16 uncommon, 24 rare, 36 epic and
48 legendary. Percentage effects combine under the existing reducer's caps.

| Card / module ID | Rarity | Effect at normal potency |
| --- | --- | --- |
| Pocket Change / `pocket-change` | Common | +0.2 coin pull tiles; +4% coin income |
| Toll Pouch / `toll-pouch` | Uncommon | +0.5 coin per road pickup; 1 coin per new 50 points |
| River Dividend / `river-dividend` | Uncommon | +0.5 coin per stream pickup; platform coins; +2 percentage points of new-lane coin chance |
| Stepping Stones / `stepping-stones` | Common | 1 coin per new 40 points; clear 5% of new meadow scenery |
| Long Haul / `long-haul` | Rare | 3 coins per new 100 points; new trains arrive 5% farther apart |
| Treasure Map / `treasure-map` | Rare | +5 percentage points of new-lane coin chance; clear 10% of new meadow scenery |
| Crossing Guard / `crossing-guard` | Uncommon | Traffic 6% slower; new vehicle spacing +6% |
| Padded Tail / `padded-tail` | Common | Rear damage −12%; post-hit invulnerability +10% |
| Shoulder Check / `shoulder-check` | Uncommon | Side damage −10%; new rail warning +0.2 seconds |
| Service Road / `service-road` | Uncommon | New vehicle spacing +8%; clear 10% of new meadow scenery |
| Railway Pass / `railway-pass` | Rare | New rail warning +0.3 seconds; train interval +10% |
| Signal Box / `signal-box` | Uncommon | Traffic 4% slower; new rail warning +0.3 seconds |
| Broad Deck / `broad-deck` | Uncommon | New platforms 12% longer; platform drift 6% slower |
| River Toll / `river-toll` | Rare | +0.5 coin per stream pickup; platform coins; new platforms 10% longer |
| Tow Rope / `tow-rope` | Common | Platform drift 7% slower; +0.2 coin pull tiles |
| Dry Route / `dry-route` | Common | Clear 8% of new meadow scenery; new train interval +5% |
| Ferry Ticket / `ferry-ticket` | Rare | Platform drift 6% slower; 2 coins per new 75 points |
| Soft Landing / `soft-landing` | Rare | Rear damage −12%; side damage −10% |
| First Aid / `first-aid` | Rare | +⅛ feather per new 100 points; post-hit invulnerability +15% |
| Rest Stop / `rest-stop` | Uncommon | +⅛ feather per new 100 points; clear 5% of new meadow scenery |
| Steady Steps / `steady-steps` | Rare | Post-hit invulnerability +20%; new rail warning +0.25 seconds |
| Decoy Trail / `decoy-trail` | Uncommon | Mobs 6% slower; arrivals +0.6 seconds apart |
| Patient Paws / `patient-paws` | Common | Crab/wasp strike windup +12%; recovery +15% |
| Watchful Eye / `watchful-eye` | Rare | Crab/wasp strike windup +15%; new rail warning +0.3 seconds |
| Reed Bed / `reed-bed` | Rare | Wave 4% slower; mob arrivals +0.75 seconds apart |
| Slack Tide / `slack-tide` | Epic | Wave held 0.5 row farther behind; platform drift 8% slower |
| False Trail / `false-trail` | Epic | Mobs 8% slower; wave 5% slower; crab/wasp recovery +10% |
| Field Pack / `field-pack` | Rare | +1 hand slot, occupied by this card; clear 8% of new meadow scenery |
| Ballast / `ballast` | Rare | −1 hand slot; rear damage −20%; side damage −15%; new platforms 10% longer |
| Glass Purse / `glass-purse` | Legendary | −1 hand slot; +25% coin income; 1 coin per new 50 points; +6 percentage points of new-lane coin chance |

The six pursuit cards from Decoy Trail through False Trail are Arcade-only.
Every other new card works in Arcade and Stroll. The reduced-slot cards consume
a slot themselves; their purchase is rejected before payment if the resulting
hand would overflow. Field Pack consumes its added slot, leaving its modest
terrain effect without displacing another held ability.

Score income uses newly crossed absolute score thresholds. Buying a card never
pays retroactively, revisiting old rows never pays again, and the engine applies
the run's coin multiplier once. Fractional pickup income carries forward through
the existing wallet. All benefits disappear on sale or death.

Verify the expansion with `node --test tests/card-expansion.test.mjs`.
