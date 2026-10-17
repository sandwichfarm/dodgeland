# Strict-solo dispatch-arm review

Reviewed proposal implemented and verified on 2026-10-17 UTC, as recorded below. Existing SOLO-PROJECTION/CALL-CLOSURE/FLOW-MOB scope remains authoritative. Graph identified finishPlayerUpdate's two callers and collectCoins/scoringPlayer/sessionProtected; current source resolves property/data-flow edges. No candidate depends on zero counts.

## Positive state and call proof

Game.operationPlayer initializes null (game.ts196). Only operationFor248 installs a nonnull operation-context descriptor and inPlayerOperation256–259 temporarily assigns/restores it. Those methods are exclusively the previously reviewed session adapter closure. Game constructs its owned world/player220; SharedWorld.sessionActive initializes false220 and LocalSession.start714 is its only true assignment. Strict-solo recorder boundary checks owned game/world/player, absent player.session, sessionActive false, no LocalSession.stage calls. Thus ordinary untouched Game has null operationPlayer and scoringPlayer345 returns null; its conditional session primary arm cannot execute. Retain constructors, descriptors, null initialization, entire guard evaluation and all ordinary fallback values.

## Exact candidate expressions / arms

- pursuitEnabled266: right operand `this.player.session?.mode?.handlers.suppressPursuit` of sessionActive && is unavailable. Keep world/sessionActive lookup, negation and returned true.
- scoringPlayer345: sessionActive conditional's `this.player` consequent unavailable; null fallback remains. The operationPlayer nullish left operand is evaluated and remains. currentScore346: nonnull personalScore access unavailable, maxY fallback live; map optional-chain sites only if exact AST/schema representation is understood, otherwise retain.
- ensureRows376/377/379: conditional consequents world.frontier, Math.min(frontier,world.activeFloor), sharedWorldEffects??defaultModifiers unavailable; maxY/frontier/run.effects alternatives and predicates live. ensureRows406: syncSharedWorldEffects consequent unavailable, syncEffects else live. Do not exclude whole if statement whose predicate executes.
- move451: only `!this.scoringPlayer.canHop` operand after scoringPlayer && unavailable; rest of invalid-move guard live. noteHop456 optional-call invocation unavailable; forward-progress459 earnedDistance increment consequent unavailable. Ordinary movement, world.noteProgress, score, rows, regeneration/lifecycle remain.
- sessionProtected352: left `!!this.operationPlayer` evaluated false, entire right protection comparison unavailable. Keep method and false result. Its callers end466/applyDamage487/collideVehicles560/finish655 still evaluate it. At collideVehicles560 exact `if(this.sessionProtected()) return` true return is unavailable; at compound guards never remove the whole true arm because other causes can reject.
- end477–479: participant is scoringPlayer=null; exact `if(participant)` observeDeath consequent unavailable. Keep participant assignment, try/finally, inventory clear, callbacks and terminal lifecycle. tryCharacterPower534 optional recordInteraction call unavailable, while actual innate power remains live.
- finishPlayerUpdate636: operationPlayer&&hop predicate cannot enter assignment; keep predicate/false path. lifecycle772: operationPlayer&& !operationPlayer.primary cannot early-return; keep the predicate and all actual lifecycle callback selection/delivery.

## collectCoins: constant local proof stronger than mode label

collectCoins721 takes undefined alternative because sessionActive false; consequent resolvingPlayer lookup unavailable. if(sessionPlayer)722 cannot dispatch collectSessionCoins/return. Local `sessionSeat = undefined`723 is never reassigned, so pickupOwner725 is undefined. Consequently candidate true branches/operands: pickupOwners.get in725, pickupOwner!==sessionSeat RHS and continue in726, deletes732/766, set752, and !pickupOwner RHS/set756. Keep local declarations, guard evaluation/false arms, ordinary coin safety/capture/retirement/payment, attractedCoins and all RNG/world work. This proof does not remove the shared implementation itself globally or its direct API tests.

## drivesWorld

Only Game.update627 and updateSessionPlayer295 call finishPlayerUpdate. Strict solo excludes the latter session entry; Game.update always passes literal true. Therefore standalone `if(drivesWorld)` at645,650,659 has unavailable false/implicit-else outcome, but body remains applicable. Compound `drivesWorld && pursuitEnabled && strategy==='wave'`640 may be false due strategy; do not remove the whole false outcome. `state==='playing' && drivesWorld`670 may be false due state; keep guard false outcome and body, although the drivesWorld operand itself is always true when evaluated. Candidate rules must distinguish condition value from operand evaluation, never remove an evaluated operand solely because its value is constant.

## Wave/trail: defer new definition-dependent exclusions

Default rules mode-rules66/170/171–175 establish Arcade wave and Flow trail. Game209–212 also accepts a validated options.definition, which may use the same id with different rules. Current solo-model-attribution boundary24 checks definition.id==base, not identity against SOLO_ARCADE_MODE/SOLO_STROLL_MODE, nor game.rules===game.definition.rules===world.rules. Bootstrap boundary26 has the same limitation. Public intervals likewise need actual definition evidence inspected independently. Current named fixture constructors use defaults, but the generic recorded proof does not yet certify that invariant for every accepted interval. Therefore **do not add Wave/Flow strategy arm exclusions in this change** until recorder/runner evidence validates exact canonical definition/rules identity throughout acquisition and runtime (or a reviewed schema-bound equivalent). Existing prior Flow-mob authority is not silently broadened here. Candidate later: Flow wave bodies640–643 and649–655; Arcade trailing else-if656. Keep strategy checks and reachable false outcomes; session-free pursuitEnabled true alone does not establish strategy.

## Safe mapped implementation requirements

Normal full-span body exclusions do not authorize removing a source if predicate or its statement counter. Istanbul if arm0 can map the whole IfStatement even though the counter means consequent execution. A future exact rule must bind source hash, exact named method, exact AST predicate text/shape, correct consequent, branch type if and arm index, and matching whole parent/arm locations; then dispose only that branch counter, not its enclosing statement or predicate counters. For a proved always-true drivesWorld guard, only the exact false arm (including source-bound absent-else representation) can be removed. Retain malformed/partial/crossing/unknown mappings. Optional chains/logical/nullish counters need separate exact schema/operand proof, otherwise retain.

Required negative controls: stale/missing caller pins; changed session assignment or new finishPlayerUpdate caller; source-identical reachable compound guard true/false arms retained; exact if predicate statement retained while only impossible arm removed; partial/unknown/shifted locations retained; explicit else not mistaken for synthetic; positive excluded hit hard failure; raw/global/per-file maps unchanged. Acquisition/bootstrap/default callbacks and all real solo lifecycle behavior remain applicable. Runtime mutation through an unobserved test fixture is not legitimate production evidence and must not be used to populate an excluded path.

## Exact source and witness pins

- `src/game.ts`: `fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6`
- `src/session.ts`: `5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed`
- `src/main.ts`: `33be7291c0e3c14910039fdb8a1d44e895273f79e132f9a0c9873b3d3166add4`
- `src/mode-rules.ts`: `cadda595a1cfa02769eee70e3f925b125b14c7fdf6faf93b9a83f45bb79c89f2`
- `tools/release-coverage/solo-model-attribution.mjs`: `66e6e9ad5808775165e312cb0c4b5fadb49771a64e66893f51d19022652d1dce`
- `tools/release-coverage/solo-bootstrap-attribution.mjs`: `e63252c26146d224125f60b16f585b52a842ec446850fde2c70be9a4c3253cdb`
- `tools/release-coverage/solo-applicability.mjs`: `707d00e2978fb35e83998a52367d29e2b30a71a55b4d18914817d91f96b668cc`

## Implementation and verification

The generator now binds the reviewed session-only dispatch outcomes and operands
to their exact named methods and AST conditions. Only the impossible branch arm
is removed when Istanbul maps it to the entire if statement; the evaluated
predicate statement and reachable opposite outcome remain counted. The three
standalone `drivesWorld` guards retain their bodies and remove only the proved
unavailable false outcome. New wave/trail rule-dependent exclusions remain
deferred. The generator hash above records the reviewed pre-change version.

Eleven controls passed (`/tmp/down-to-duck-solo-dispatch-controls.log`, process
4889, exit 0). They include malformed, shifted, crossing and unknown mappings,
guard retention, reachable compound conditions, and rejected positive hits in
excluded outcomes. Raw/global/per-file coverage is unchanged.

Canonical collection chain90156 exited0. Model run
`2fa5cd30-9d0e-485a-a4eb-6472eb08eda0` retains24 actual lifetimes and48 intervals;
bootstrap run `2ff6f172-2292-4116-8217-38902e3583d0` retains two fresh lifetimes and
four intervals. Each has one independently bound Node parent. Both preserve the
immutable solo oracle and have no excluded-positive-hit contradiction.

| Collection / mode | Applicable lines | Functions | Branch arms |
| --- | --- | --- | --- |
| Model / Arcade |926/1207|218/296|963/1427|
| Model / Flow |790/1067|195/276|823/1252|
| Bootstrap / Arcade |842/1207|192/296|723/1427|
| Bootstrap / Flow |817/1067|188/276|706/1252|

Each applicable branch denominator decreased by32 against the preceding
collection; all numerators and raw denominators are unchanged. These focused
report-only collections do not meet all release floors and are not release
acceptance. Logs are `/tmp/down-to-duck-solo-dispatch-model.log` and
`/tmp/down-to-duck-solo-dispatch-bootstrap.log`; canonical artifacts remain under
their respective `artifacts/release-coverage/solo-model-03` and
`solo-bootstrap-03` run directories.
