# Relay/Race call-closure review

Current session-pin addendum: [pickup claim source review](07-03-PICKUP-CLAIM-SOURCE-REVIEW.md).
Historical identities and measurements below retain their original source.

2026-10-17 UTC. Read-only generic-executor review; no test/build/browser execution or generator change. Prior `07-03-TURN-SCOPE-FINDINGS.md` remains authority. Graph project `Users-sandwich-Develop-crossy-road-clone` found relevant symbols but omitted Race's restrictItems edge; current source audit supplies missing callers. Candidates below derive from callers and installed state, not counters. Fresh ESM/Game acquisition is part of current witness: initialization cannot be discarded merely because gameplay does not call it.

## Both modes: application-unused compatibility wrappers

`session.ts295–301 SharedWorld.selectMobTarget`, `306 view`, `game.ts268 syncSharedEffects`, `61–63 worldForRow`, `73–75 actorPositions`: current full src audit finds no callers/import aliases for these exact wrappers. Distinguish actual `levels/v1.ts13 worldForRow` called by generation22 and actual laneActors/syncEffects, which remain applicable. Candidate exact callable bodies and contained callbacks only. Global/per-file direct compatibility tests remain accountable; no blanket world/Game removal.

## Relay: no item world, but reachable absence guards

Relay.attach65–71 installs recovery and `installCoOpMarket({consumables:false,...})`, never an item world. LocalSession.installCoOpMarket652 skips installation in that state; policy cannot later mutate its captured false value. Candidate `captureConsumablePolicy` and `installConsumableWorld` bodies, Game.installWorldExtension359–369 and its disposer closure, plus previously reviewed ConsumableWorld instance closure. **Retain Game.worldExtensionSnapshot371**: render.ts318 invokes it even without an extension. **Retain Game.updateSessionWorldExtension372–373**: LocalSession.update1048 invokes the absence guard each live tick. Keep ensureRows403 optional extension guard and all module/default allocations. Absence of receiver is not absence of caller.

Drop runtime candidates: sampleItemDrop, sampleConsumableDrop, classifyItemBucket, classifyConsumableBucket, consumablePickupId and runtime-only signed/validate/mix32/draw/freeze closure in consumable-drops.ts. Actual sampleItemDrop callers are captureConsumablePolicy457 and ConsumableWorld.row480, unavailable in Relay; other listed exported helpers have no production callers. **Keep unsigned, registerConsumableSchema, validateConsumableSchema, consumableSchema, constants/maps/schema registration** conservatively. Race-items module14 registers its schema at import, including when the shared fresh import graph contains Race while acquiring Relay. Consumables catalogue validation/bootstrap similarly stays applicable; do not remove entire modules.

RunInventory.restrictItems88–91 is called only by Race.attach154, so unavailable in Relay. spendCoins152–158 is only CoOpMarketAdapter.dispatch175's consumable purchase debit. Relay's catalogue still exposes known Survive items, but dispatch159 rejects them through itemEligible (Relay capabilities empty) before debit; unknown items reject at170. Candidate spendCoins exact body; keep adapter dispatch, itemEligible, catalogue callbacks, plan/rejection guards and ordinary card/pack/cosmetic transactions. Do not equate no item-world with no common market.

## Race: appearance-only inventory, retain rejection entry points

Race.attach154 restricts every original closed-roster participant to appearance-only before installing the item world/market. No widening assignment exists: RunInventory.access initializes standard81 and only restrictItems90 writes it; constructor/acquisition starts standard and remains applicable. No roster admission adds unrestricted players. Cards/powers/pendingPack initialize empty, are cleared on death, and only successful ordinary buy/claim paths create them. Race tactical charges are separate common consumable-world state, not RunInventory cards/powers.

Precisely bounded success-body candidates after actual eligibility guards: buy209–247 card capacity body, card hold action, pack pool operand and pack draw/draft body, power extension/new-power body, and pack-only success-message operand. Keep buy entry, pendingPack/canTrade/offer/eligibility/sold/funds checks and the item-kind comparisons themselves. Cosmetic purchase/equip, wallet/revision/changed, RNG/makeOffers/id/pick remain live. `makeOffers` still iterates empty card pools and performs random rare selection; no broad exclusion.

previewPack249–261: keep invalid closure, draft read and complete initial guard/return; only statements after that guard are unavailable with no valid owned eligible draft. claimPack264–275 keeps preview invocation and invalid-preview rejection; subsequent success statements unavailable. skipPack278–282 keeps guard/rejection, candidate postguard mutation/success. sell285–297 keeps alive/index/eligibility rejection; postguard sale body unavailable for any legitimately owned Race card. Keep public rejection behavior even for requested invalid legacy actions. `hold` and `cardPool` are reachable only from excluded successful buy paths, candidate exact bodies; capacityFor is ALSO used by ordinary cardCapacity getter, so **retain**. tick's powers loop callback cannot run with empty powers, but retain tick/market expiry/filter invocation/guards and initialization; no entire method exclusion.

CoOpMarketAdapter.act/commitItems/dispatch remains applicable: users/tests can request rejected sell/pack/card actions, and prevalidation metadata occurs before dispatch. Do not remove switch branches simply because their result is failure. Success-only pending-pack metadata inside commitItems may be a future subexpression candidate, but this review recommends retaining it pending separately bounded mapping. Personal recovery resumeAfterDeath remains live in Race.

## Race item use policy vs Survive fallback

Race.attach154 installs `this.items.policy()` first; RaceItems.policy45–46 supplies eligible and activate. Later installCoOpMarket's installConsumableWorld call returns on the existing instance (session641), preserving that policy. ConsumableWorld.use552–576 keeps all owner/replay/living/generation guards, `if(this.policy)`, eligibility, actual activate/debit callback, success credit/events, and return. Candidate only statements after this unconditional policy-path return: target selection/revival-generation checking/Survive debit/request/recover577–585. They cannot execute in this Race composition. Do not remove personal recovery or common debit functions, used by Race tactical effects.

## Shared effects: crucial kept methods

Only SurviveTogether.attach10 invokes LocalSession.installSharedWorldEffects673. sharedWorldEffectsSnapshot674 has no production caller. Both are candidate exact bodies in Relay/Race. refreshSharedWorldEffects675 entry/false-policy return remains live; postguard resolver body already reviewed. Game.setSharedWorldEffects309–313 is called only by refresh's postguard and stop1063 when hadSharedEffectPolicy; candidate exact body in these two modes.

**Do not exclude resetSharedWorldEffects315–321:** LocalSession.start714 calls it for every mode. **Do not exclude syncSharedWorldEffects322–334:** Game.ensureRows406 calls it whenever sessionActive, including Relay/Race, using default modifiers when no elected shared policy. All lane motion/base-speed adjustment and guards stay applicable. `syncSharedEffects` is the distinct unused compatibility wrapper, not this live method.

## Standalone Game entry points: retain in this review

Main1713–1723 selects LocalSession.update while running and Game.update only without localSession/localStage; however acquisition/transition/terminal lifetimes require separate ownership proof before excluding the whole public update entry. Game.openMarket531/closeMarket540 are bypassed by running-session owner routing522–539, but closeMarket is also unconditionally reached through pause/menu1607 and pagehide1822. **Retain all three**; no blanket standalone-method exclusion. Shared Game methods are also invoked through operation contexts; names alone do not establish inapplicability.

## Mapping requirements and kept list

Any eventual implementation needs exact source/authority pins (including main/render/Survive/Race-items), AST full-span containment, kept crossing/unknown locations and positive-hit contradiction failure. New app callers must invalidate proof before observed hits. Preserve all constructors/field initialization/default descriptors/schema/catalog registration, Game/SharedWorld ordinary geometry/world/RNG, recovery, selected-owner authority, rejected legacy actions, global/raw/per-file accounting and numeric floors. This document authorizes no generator change by itself.

## Reviewed SHA-256

- `src/main.ts`: `33be7291c0e3c14910039fdb8a1d44e895273f79e132f9a0c9873b3d3166add4`
- `src/render.ts`: `b6b5ae2ff1a4af8e3f6a0bf2c96bfcc3e83b11e95e38892ccaa6f33f3c2122c2`
- `src/game.ts`: `fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6`
- `src/session.ts`: `5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed`
- `src/relay.ts`: `f5c1eea5b82e6e42d7b6bbc6a95f7f0d28aa7ad7468c4464e0217ab9f89e6c02`
- `src/race.ts`: `d2ecf7bbc185520fdad9b441c52775297b4929f455e665e38caabebebacb62da`
- `src/race-items.ts`: `2a43c05772c1f641595ca9bee7cc2bb486e3b2a922ebab412fc65e189708432b`
- `src/survive-together.ts`: `dbc77f00e9c37ee845920c3b63da30f8f661582e37da4f30bb2d2f72c3c4b69b`
- `src/co-op-market.ts`: `037a96c9f9436346f06306cac74808aab5e92e205ce2c42bebb1dbd16ca24c22`
- `src/market/run.ts`: `ba755b3573ca4acaf2a11ce7b77c277df526a16b2801cca612ee55feee36de6f`
- `src/market/types.ts`: `d1e216d95749be95069851fe36b38009e9b86e86931fd4590330f794b2b4bb4c`
- `src/consumable-drops.ts`: `2fc4a1c55dc7f37dbcac2b7091661e3a284d3292eddf1460da423a39520dec4a`
- `src/consumables.ts`: `6a28f19753ce1755167869c6b087b174962ced99725d68e02b2c24f9950c9d12`
- `src/levels/v1.ts`: `2528a12bdc80d8da5579dccf04cd64509a2ceeb7f3ff229b9cb970207c4f5c56`
