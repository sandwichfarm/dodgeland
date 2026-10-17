# Strict-solo projection and API scope review

Read-only proposal, 2026-10-17 UTC. No generator, policy, counters, production code or tests changed/run. Generic executor fallback. Graph discovery found the named symbols, but reported restrictItems inbound0 despite the actual Race caller; therefore current source caller/state audit supersedes incomplete graph edges. This is positive call/state evidence, not zero-counter selection.

## Application boundary and candidate scopes

Strict solo means no staged/running LocalSession and no session-owned operation. Game construction still creates SharedWorld and a primary SessionPlayer (game.ts214–220): keep constructors, field initialization, facade property descriptors and their callbacks. Main1740–1745 chooses drawSession(world, session.views()) only for running localSession; otherwise Renderer.draw receives Game directly. Solo mob update likewise receives Game, whereas shared mob participants are created in advanceSessionMobs. Identically named Game getters remain applicable.

1. **SessionPlayer projections:** candidate exact accessors label, rescueFraction, groundX, groundY, power, personalScore, powerRemaining, powerReady, powerFlash and render (session.ts409–427). render is called by LocalSession.views1062; its label/interpolation/power chain is used by session rendering. Other callers are LocalSession simulation/economy/recovery, Relay/Race coordinators/items/UI and the local-session HUD. Game.currentScore345–346 only calls SessionPlayer.personalScore when scoringPlayer is nonnull; scoringPlayer is operationPlayer or sessionActive primary, both absent in strict solo. The explicit primary&&!sessionActive personalScore fallback is a compatibility facade branch, not evidence that the application invokes it during solo. The primary constructor returns without reading these projections. Candidate exclusion must be these exact callable spans, not all SessionPlayer, and preserve any crossing span. Public tests directly reading the facade remain global/per-file evidence.

2. **Unused application compatibility wrappers:** SharedWorld.selectMobTarget295–301 and view306; Game.syncSharedEffects268; exported game.worldForRow61–63 and actorPositions73–75. Full src symbol audit finds declarations only for these exact wrappers (worldForRowV1 is a different function and is called by actual generation). No imports, method aliases or production calls of the wrappers occur. This is the same application-reachability distinction as previously accepted pure wrapper exclusions: global/per-file/API tests remain mandatory, but direct compatibility invocation is not manufactured solo application credit. Keep underlying laneActors, levels/v1.worldForRow and syncEffects, plus all bootstrap and shared world initialization. selectMobTarget's internal sorting/callback closure is contained in its unavailable wrapper. No blanket SharedWorld exclusion.

3. **RunInventory session-only entries:** restrictItems88–91 has exactly one production caller, RaceCoordinator.attach154. spendCoins152–158 is called only by CoOpMarketAdapter's successful consumable purchase175. resumeAfterDeath306–309 is called only by SessionRecoveryController.apply65. All are unavailable in strict solo, whose Game.run is constructed normally and whose death/retry constructs a new game rather than session recovery. Candidate exact method bodies and contained callbacks only. Do not exclude ordinary buy/sell/pack/equip/economy or clear/constructor/changed.

4. **Item access state:** RunInventory.access initializes to standard; the only assignment is restrictItems90, whose only production caller is Race attach. itemAllowed(types.ts20) is called by itemEligible and must remain: its standard guard is active in solo. Only its right-hand itemEligibility(item).appearance operand is inaccessible under this invariant. itemEligibility(types.ts19) has no other production caller; its exact callable body is a candidate. Retain itemAllowed function/standard operand and all crossing branch spans; never remove the line if another applicable statement shares it. Keep access initialization and all module constants/freezes.

## Conservative limits / review decision required

These candidates are application scope, not TypeScript public-API impossibility. Direct calls in component/API tests can exercise them and must retain raw/global/per-file credit. A future public app call, staging interval, callback injection or source drift invalidates the argument; exact reviewed pins and excluded-positive contradictions must fail closed. Tests outside attributed intervals are unchanged. Do not exclude additional Game methods, SessionPlayer state/primary forwarding descriptors, SharedWorld methods or any initialization from this review. No numeric floor changes. Implement only after root review, with positive-hit/stale-pin/missing-authority negatives and explicit kept bootstrap/guard controls.

## Exact reviewed source SHA-256

- `src/main.ts`: `33be7291c0e3c14910039fdb8a1d44e895273f79e132f9a0c9873b3d3166add4`
- `src/game.ts`: `fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6`
- `src/session.ts`: `5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed`
- `src/render.ts`: `b6b5ae2ff1a4af8e3f6a0bf2c96bfcc3e83b11e95e38892ccaa6f33f3c2122c2`
- `src/mobs.ts`: `6077ac4fd884ef16f9fe8ab3f3db77a431b2d2853adbeddc1d0d843b595018d1`
- `src/market/run.ts`: `ba755b3573ca4acaf2a11ce7b77c277df526a16b2801cca612ee55feee36de6f`
- `src/market/types.ts`: `d1e216d95749be95069851fe36b38009e9b86e86931fd4590330f794b2b4bb4c`
- `src/race.ts`: `d2ecf7bbc185520fdad9b441c52775297b4929f455e665e38caabebebacb62da`
- `src/co-op-market.ts`: `037a96c9f9436346f06306cac74808aab5e92e205ce2c42bebb1dbd16ca24c22`
- `src/session-recovery.ts`: `35119abd8ac6551d253ec0ada320c934fd5a9cf20c142444e3afdb4094093b9c`
- `src/levels/v1.ts`: `2528a12bdc80d8da5579dccf04cd64509a2ceeb7f3ff229b9cb970207c4f5c56`
