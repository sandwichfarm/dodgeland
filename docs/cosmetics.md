# Cosmetic inventory

Cosmetics are run inventory. Hats and shirts can be worn together, with one
effect in the third slot. Buying a look equips it; changing to an owned look
costs nothing. Every purchase is lost on death. Clothing changes the visible
model only and does not affect collision bounds or card capacity.

The wardrobe expansion adds 20 modeled items to the original eight looks.
Their authored voxel geometry is shared by the rotating market preview, the
equipped traveler, market scenery, and the items dropped after death.

| Item | Slot | Rarity | Coins |
| --- | --- | --- | ---: |
| Midnight Topper | Hat | Rare | 24 |
| Pond Crown | Hat | Epic | 36 |
| Ranger Brim | Hat | Uncommon | 16 |
| Rescue Helmet | Hat | Rare | 24 |
| Soufflé Toque | Hat | Uncommon | 16 |
| Twilight Wizard | Hat | Epic | 36 |
| Toadstool Cap | Hat | Rare | 24 |
| Creek Corsair | Hat | Rare | 24 |
| Pinwheel Cap | Hat | Uncommon | 16 |
| Cloud Pilot | Hat | Rare | 24 |
| Pebble Raider | Hat | Rare | 24 |
| Daisy Bucket | Hat | Common | 12 |
| Pond Dungarees | Shirt | Common | 12 |
| Drizzle Coat | Shirt | Uncommon | 16 |
| Evening Waddle | Shirt | Rare | 24 |
| Puddle Club Jersey | Shirt | Common | 12 |
| Sunset Poncho | Shirt | Rare | 24 |
| Shore Patrol | Shirt | Uncommon | 16 |
| Moonwalker Suit | Shirt | Epic | 36 |
| Patchwork Jumper | Shirt | Uncommon | 16 |

Each item lives in its own `src/market/items/look-*.ts` module. Unit models
are fitted to each traveler's head or torso by `src/wearables.ts`; no item
needs a renderer switch or custom collision behavior.
