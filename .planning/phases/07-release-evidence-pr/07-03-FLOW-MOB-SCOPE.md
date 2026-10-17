# Strict Flow mob execution scope

Generic executor fallback; narrowly authorized source-bound applicability work. No product behavior, numeric floor, raw/global/per-file accounting or fixture breadth changes.

## Positive call and state proof

`SOLO_STROLL_MODE` sets `pursuers.enabled:false` in mode-rules.ts. Game.updateMobs deliberately calls the director when `this.mode==='stroll'`, so that Game method remains applicable. MobDirector.update begins with `if (!game.rules.pursuers.enabled) { this.mobs.length = 0; return; }`. Its entry, predicate, clear and return remain applicable. Only statements strictly after that guard, private clearPath/plan/walkTarget/spawn and their exclusive callable closure mobPacing/mobMotionProgress/mobTuning/runTuning/sweptMobContact are selected for strict solo-flow. Arcade receives no mob dispositions.

The source call audit found these helper invocations only within that post-guard director closure. Crucially, mobDefinition and its find callback remain applicable: render imports mob-models, whose module-level MODELS construction calls buildModel for all three species, each invoking mobDefinition. Constructor/instance initialization, module constants and their allocations remain applicable. Game.mobBlocked and mobHazard are retained because innate rescue/recoil call them independently of mob AI. All SessionPlayer and SharedWorld projection decisions remain exactly as before this step.

The actual strict-solo acquisition/ownership witness remains required by the runner. The generator requires reviewed current Game, mobs and mode-rules identities, not only an unchecked string label. Every selected statement/function declaration-and-body/branch arm requires full AST-span containment; any crossing span remains applicable. Positive attributed hits in any excluded site fail projection; zero counts never justify a selection.

| Reviewed source | SHA256 |
| --- | --- |
| src/mobs.ts | 6077ac4fd884ef16f9fe8ab3f3db77a431b2d2853adbeddc1d0d843b595018d1 |
| src/mode-rules.ts | cadda595a1cfa02769eee70e3f925b125b14c7fdf6faf93b9a83f45bb79c89f2 |
| src/game.ts | fb5d9224e46c19b3745099429f06bd141d9b738bb2d8786ed3266e1b6a7d95f6 |

Read-only supporting bootstrap paths inspected at mob-models.ts fce5e37b1e834b31296ae66cdd4a7ba177d0b11c1c09de977de92083675b7008 and render.ts b6b5ae2ff1a4af8e3f6a0bf2c96bfcc3e83b11e95e38892ccaa6f33f3c2122c2. No exclusion is emitted for either renderer source.

## Prepared verification

Added negative controls retain update/clear/return, constructor, mobDefinition/find, ordinary Game helpers and all Arcade mob sites; test missing/stale pins, positive excluded statement/function/branch hits, bootstrap positive hits and guard-crossing branch spans. Tests are pending the root-owned execution slot. No passing canonical result or coverage-floor claim is made by this preparation record.

## Terminal verification

The focused command `node --test tools/release-coverage/solo-applicability.test.mjs tools/release-coverage/applicability.test.mjs` passed13/13, zero failed/canceled/skipped,1,815.790916ms; handle84540 exit0, `/tmp/down-to-duck-07-03-flow-mob-units.log`. It proves retained bootstrap/guard/Arcade sites, source-bound missing/stale rejection, excluded-positive rejection across all counter kinds and crossing-span retention.

One canonical `node tools/release-coverage/run.mjs --suite solo-model-03 --report-only` passed on handle35534 exit0; `/tmp/down-to-duck-07-03-flow-mob-canonical.log`, run `b67390f4-35c5-4b68-a092-baacdd06c6e7`. The existing fixture was not edited in this task:24 scenarios/48 intervals and one immutable-oracle parity test passed,26,332.301417ms. No excluded-positive contradiction occurred.

| Stratum | Raw lines/functions/branches | Applicable lines/functions/branches |
| --- | --- | --- |
| solo-arcade | 926/2039;218/656;963/2768 | 926/1239;218/320;963/1730 |
| solo-flow | 790/2039;195/656;823/2768 | 790/1099;195/300;823/1590 |

Arcade dispositions remain2707; Flow adds373 exact sites for3080 total, reducing only Flow's applicable denominator by140 lines/20 functions/140 branch arms. Both raw numerators and denominators are retained in attribution; exclusions never create hits. Changes in observed numerators versus earlier focused runs reflect the separately maintained current fixture, not applicability-generated credit. No floor pass is claimed; manifest remains report-only/thresholdsEvaluatedfalse. The slot was explicitly released to root after35534 terminal success; no active process remains from this proof.
