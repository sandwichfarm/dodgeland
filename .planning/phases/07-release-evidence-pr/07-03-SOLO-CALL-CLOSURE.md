# Remaining strict-solo call closures

Read-only source review after `f19d919`, before any new dispositions. This note
does not claim a coverage pass. The graph project is unavailable; source reads
and an exhaustive `src` caller search supply the findings below. Positive
call/state constraints determine the candidates, never observed zero counts.

## Session adapters in Game

The strict solo witness owns one primary Game/SharedWorld/SessionPlayer,
rejects `world.sessionActive`, rejects attached `player.session`, and rejects
even staged-then-cancelled sessions. The production caller closure is:

| Exact Game member | Production callers and constraint |
| --- | --- |
| `operationFor`, `inPlayerOperation` | Private implementation of the session adapters below; no independent solo call. |
| `startPlayer`, `movePlayer`, `updateSessionPlayer` | SessionPlayer start/move/update, already proven session-only under the current strict-solo witness. Solo uses Game.start/move/update directly. |
| `damagePlayer` | LocalSession damage arbitration (`session.ts:727`). |
| `advancePlayerDeathVisuals` | LocalSession.advanceDeathVisuals (`session.ts:1060`). Solo advances its own Game death spill. |
| `advanceSharedWorld`, `advanceSharedPursuit` | SharedWorld.update (`session.ts:257–258`), already session-only. |
| `awardSessionPickup` | SharedWorld.resolvePickups (`session.ts:280`), already session-only. |
| `updateSessionMobs` | LocalSession.update (`session.ts:1050`). The ordinary solo mob director remains applicable. |
| `setSharedWorldEffects` | LocalSession refresh/stop (`session.ts:680,1063`). |
| `resetSharedWorldEffects` | LocalSession commit (`session.ts:714`) after setting sessionActive. |
| `syncSharedWorldEffects` | setSharedWorldEffects, plus Game.ensureRows only in its sessionActive branch (`game.ts:406`). |
| `installWorldExtension` | LocalSession.installConsumableWorld (`session.ts:643`). |
| `updateSessionWorldExtension` | LocalSession.update (`session.ts:1048`). |

`syncSharedEffects` has no production caller and is documented as a session
adapter; retain it in this conservative extension until its public API scope
is separately reconciled. Keep Game constructor/fields, ordinary update,
movement, damage, powers, collection, generation, markets, projection/getters,
and every shared dispatch guard. Whole-file Game exclusion is forbidden.
Exact member spans may include enclosed adapter closures, but must not absorb
neighboring guards such as pursuitEnabled or sessionProtected.

## Pure session service closures

| Source and selected callable bodies | Complete caller evidence and retained boundary |
| --- | --- |
| recovery: `reject`, `stable`, `isLivingRecoverySubject`, `planRecovery`, `commitRecoveryPlan` | plan/commit are called only by SessionRecoveryController; it is constructed only by Survive/Relay/Race. isLivingRecoverySubject is called only by those controllers and LocalSession/ConsumableWorld. Private helpers are reachable only from these functions. No import-time invocation exists. Retain module-level arrow allocations. |
| shared-world-effects: `resolveSharedWorldEffects` | Sole caller LocalSession.refreshSharedWorldEffects; solo has no installed shared-effect policy. Retain the modifier descriptor constant and its initialization. |
| consumables: `reject`, `validGeneration`, `validId`, `definition`, `holdsCapability`, `sameOwner`, `chargesFor`, `validateBase`, `resulting`, `targetsFor`, `planConsumableCredit`, `planConsumableDebit` | Credit is called only by ConsumableWorld/CoOpMarketAdapter; debit only by ConsumableWorld. The private helper closure has no other consumer. Retain `freeze`, CONSUMABLES initialization and `validateConsumableCatalogue`: the latter also runs when race-items initializes. |
| consumable-drops: `freeze`, `signed`, `validate`, `mix32`, `draw`, `consumablePickupId`, `classifyConsumableBucket`, `classifyItemBucket`, `sampleConsumableDrop`, `sampleItemDrop` | Runtime sampler is called only by captureConsumablePolicy/ConsumableWorld. Its private anchor/mixer helpers have no other caller. Exported compatibility classification/ID/sample wrappers have no production caller; their retained global/API tests do not establish solo ownership. Retain schema/constants/map initialization, `unsigned`, `registerConsumableSchema`, `validateConsumableSchema`, and `consumableSchema` conservatively. Race schema registration invokes validation at import time. |

Select named callable bodies and their enclosed callbacks only. For arrow
helpers, retain the module-level allocation statement while separately
selecting the function entry. Full-span containment is mandatory; crossing
sites remain applicable. Source/map/schema drift, unknown inventory, and any
positive attributed hit in a proposed excluded site must reject projection.
All raw/global/per-file counters remain unchanged.

## Import-time accounting is a separate unresolved concern

`loadIndependentEngines` imports current Game/catalog/actors before constructing
the solo recorder. Thus current bounded intervals cannot observe those module
initializers. It is invalid to exclude an initializer just because these
intervals miss it, or copy a mixed worker's boot totals into both solo modes.
An eventual acquisition witness needs a fresh, independently bound current
module lifetime for its actual mode, with baseline modules uninstrumented and
the complete parent counted globally once. The original parity matrix and its
assertions must remain unchanged. This note authorizes no counter resets,
bootstrap relabeling or new initialization dispositions.

## Source identities

| Source | SHA256 |
| --- | --- |
| game.ts | fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6 |
| session.ts | 5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed |
| consumables.ts | 6a28f19753ce1755167869c6b087b174962ced99725d68e02b2c24f9950c9d12 |
| consumable-drops.ts | 2fc4a1c55dc7f37dbcac2b7091661e3a284d3292eddf1460da423a39520dec4a |
| recovery.ts | 835df7ab867c3421e7d295778c864ceba83f0ea10e588c4c6f4d95cdc2c1702b |
| shared-world-effects.ts | 715dce9a98a83c398aa3a3d43531568008a9cefaa9be8df766a921dd2eb43a45 |
| race-items.ts (retained bootstrap authority) | 2a43c05772c1f641595ca9bee7cc2bb486e3b2a922ebab412fc65e189708432b |

## Implemented exact closures and focused proof

The executor applied only the named Game adapter members and named service callables above in `solo-applicability.mjs`. All added service files use the reviewed source SHA256 pins. Function bodies and callable entries are selected independently, preserving arrow allocation statements; each mapped statement/function declaration+body/branch arm must fit wholly inside a reviewed range. No Game file exclusion, bootstrap exclusion, mode-floor change or raw-counter mutation is introduced. `syncSharedEffects` remains applicable. The test explicitly retains `consumables.freeze`, `validateConsumableCatalogue`, drop `unsigned`, `registerConsumableSchema`, `validateConsumableSchema`, `consumableSchema`, ordinary Game move/update/collect/generation, `pursuitEnabled` and `sessionProtected`. Race-items remains bootstrap authority in this source finding; no Race-items disposition was added.

Focused negatives passed12/12, zero failed/canceled/skipped,1,677.0575ms, handle95991 exit0: `/tmp/down-to-duck-07-03-solo-call-closure-units-final.log`. They include added missing/stale-source and excluded-positive controls for every new service path, all named kept bootstrap functions, and the existing source/map/schema, mixed-line and counter-kind guards. Initial `/tmp/down-to-duck-07-03-solo-call-closure-units.log` retained two test-fixture failures: the old collector-only exact set expected two Game exclusions despite the newly authorized adapter set; and a name lookup matched an earlier method call rather than its declaration. Tests now preserve both collector exclusions while separately checking all new/kept members, and use declaration-anchored lookup. Generator unchanged by those fixture corrections; no product RED claimed.

One unchanged `node tools/release-coverage/run.mjs --suite solo-model-03 --report-only` completed on handle80988 exit0. Log `/tmp/down-to-duck-07-03-solo-call-closure-canonical.log`, run `8ad18f88-8d2e-4b66-859b-e3a5d79e9239`: one parity test passed against immutable oracle,26,345.60925ms; existing24 scenarios/48 intervals, no new fixture breadth, no excluded-positive contradictions. The exact raw and applicable measurements are:

| Stratum | Raw lines/functions/branches | Applicable lines/functions/branches |
| --- | --- | --- |
| solo-arcade | 839/2039;204/656;868/2768 | 839/1239;204/320;868/1730 |
| solo-flow | 768/2039;189/656;792/2768 | 768/1239;189/320;792/1730 |

Each mode records2707 exact dispositions, including earlier accepted exclusions. Covered numerators are unchanged by applicability; current/raw per-file/global reports remain intact. Numeric floors are unchanged and neither mode passes from this focused evidence. Bootstrap initialization remains unresolved coverage, not excluded. The manifest remains report-only/thresholdsEvaluatedfalse. After terminal success, the executor explicitly released the serial slot to the mode integration agent for the separately authorized genuine bootstrap witness; no process remains from this proof.
