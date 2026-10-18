# 07-09 checkpoint: owned adapters complete; package-wide collection dependency

Status: **checkpoint, not plan completion**. Generic executor fallback. Tasks1/2 and Task3's seven-owner adaptation are verified. Task3's full initial report is deliberately unrun: the package-wide discovery required by that task exposes additional executing owners outside the checked ownership. Root directed completion of the seven owned adapters followed by this checkpoint. No production source, dependency, root lock, oracle, preview5175 or phase6 runner changed. No live process.

## Retained work and terminal evidence

| Slice | RED commit / terminal | GREEN commit / terminal |
|---|---|---|
| Survive tracer |6dbc921;13626 exit1 after4 original passes, missing browser owner |a8e423b;52873 exit0, collection5 + originals4 |
| Relay tracer/lifecycle and Race tracer |2a02f88;30177 exit1 after40 original passes, missing raw browser owner |1e1e4c3;24492 exit0, collection5 + originals40 |
| Paja smoke, controller and health runtimes |1f3645f;42511 exit1 after3 original scripts passed, missing browser owner |1e6dbc8;68078 exit0, all3 original scripts |

Logs: `/tmp/down-to-duck-07-09-task1-red.log`, `task1-final.log`, `task2-red.log`, `task2-gate.log`, `task3-red.log`, `task3-tail.log` under the same `/tmp/down-to-duck-07-09-` prefix.

Final owned group **65803 exit0**, `/tmp/down-to-duck-07-09-owned-adapters-gate.log`:9 collection/policy checks, **47/47 original tests**, immutable root-lock comparison and diffcheck. Run `0651e500-fc28-4d1b-832d-f9686a657f2d` in `artifacts/release-coverage/adapters-09/manifest.json`:34 payloads =4 Node workers +30 browser generations. Browser counts: Survive2, Relay tracer7, Relay lifecycle6 (raw and shared fixture separately identified), Race3, gamepad3, health4, Paja smoke5. Reports are partial report-only; thresholds are not evaluated. All176 source classifications remain, including144 executable files and canonical zeros.

After recording the original21 adapter completions and new obligations, **80756 exit0**, `/tmp/down-to-duck-07-09-checkpoint-policy.log`:policy4/4, diffcheck and immutable root-lock comparison. Default full collection still rejects incomplete inventory. The authorized twelfth path `policy.test.mjs` has not required an edit yet; its incomplete assertion is still true. Its future replacement must preserve a meaningful incomplete-manifest negative.

Normal artifact hash `11b5747e3dd004a2525c503d0d890bfcf68216ddfddf1ad2d71235338c983a91`; isolated instrumented hash `5e31c4200545c8f21c797e7e5354f5e5845799db184262651cd720c8f2d59ea8`. Normal defaults remain unchanged. Instrumented captures use per-run directories; Paja's preview receives the selected build directory, never overwrites normal dist. Original private arrangements in health/controller fixtures remain explicitly arranged proof, not natural gameplay. Actual Paja smoke retains10 scenarios,12 frame/theme checks and8 wave checks.

### Narrow encoding repair

47077 and diagnostic38759 exited1 because the Survive test HTTP host omitted UTF-8. Actual browser `inputSourceMap.sourcesContent` decoded `C–Am` as `Câ€“Am`; the collector correctly rejected map identity. Adding `charset=utf-8` to that owned test host fixed it. Canonical identity validation was not weakened; temporary diagnostic capture code was removed. Both superseded logs remain under the task1 prefix. No product defect was found.

## Concrete discovery and roles

The existing106 entries come from the recursive **phase6 canonical runner** script graph, not every package command. Union with all literal `tests/*.mjs` package-script entries is **133 distinct entry paths**. Local `.mjs` import closure adds5 helper paths for **138 discovered paths**. These are static discovery counts, not executed-suite counts. The27 added entries are recorded explicitly in `suites.json.additionalPackageObligations`; none has been edited or represented as executed by07-09.

| Role | Exact additional paths under `tests/` | Needed responsibility |
|---|---|---|
|8 independent component browser owners |actor-render.test.mjs, character-power-render.test.mjs, coin-denominations-render.test.mjs, magnet-render.test.mjs, market-preview.test.mjs, market-scenery-render.test.mjs, mob-render.test.mjs, wearables-render.test.mjs |Already use canonical-capable compileSources; register each real page before navigation, capture before page/browser close, preserve every original assertion and isolate their outputs. |
|7 independent built browser owners |character-power-runtime.mjs, devtools-runtime.mjs, game-intents-runtime.mjs, market-runtime.mjs, mob-runtime.mjs, seed-copy-runtime.mjs, sound-runtime.mjs |Select isolated artifact, register every actual frame/mount/navigation, capture before teardown, isolate output. Devtools explicitly executes production AND development artifacts; seed-copy additionally creates a Paja page; sound has Chromium/Firefox variants. These cannot silently use a single production-only page record. |
|8 existing shared-fixture consumers |collection-game-layout.mjs, death-spill-audio-runtime.mjs, death-spill-runtime.mjs, hud-game-layout.mjs, market-layout.mjs, market-pack-replacement.mjs, pause-game-layout.mjs, run-menu-layout.mjs |All import the already adapted market-game-fixture.mjs. No new browser adapter inherently needed; list each actual worker, capture its shared-fixture realms and preserve/restore its exact normal artifact paths on success/failure. |
|2 Node suites |coin-denominations.test.mjs, market-scenery.test.mjs |Existing loadSources path is canonical-capable; declare real Node workers and execute all tests. |
|2 audio generation browser owners |audio-demo.mjs, audio-zones.mjs |Package commands execute real source through private TypeScript transpilation and browser PCM generation, with assertions and outputs. Explicitly reconcile these as executable generation jobs; do not silently classify them as helpers or reuse their normal output as instrumented evidence. Canonical loader and real page lifecycle required if collected. |

Five transitive helpers are `market-game-fixture.mjs` (actual browser lifecycle collector), `race-browser-fixture.mjs` (delegates actual browser ownership), `source-loader.mjs` (canonical current compilation), `solo-baseline.mjs` (immutable oracle export), and `solo-parity-snapshot.mjs` (semantic observation only). Helpers are not standalone test workers. Shared fixture identities retain the invoking worker path.

Control-plane duties remain explicit: `strict-node-tests.mjs` is a runner, `strict-node-tests.test.mjs` intentionally launches positive/negative synthetic children, guidance reads source/config, type/build and phase6-gate orchestrate commands. Do not inject a production-worker requirement into the strict runner's synthetic children. Conformance executes its upstream browser runner against the artifact and must remain explicit evidence with its current unmeasured checks; do not label its normal output as an instrumented realm. The unchanged final phase6 gate is still required later.

Oracle, authored examples and altered sampler code remain separate from current-source counters. The original21-adapter ledger now records21 completed owners with real run IDs; its `remainingAdapterCount:0` refers **only to that historical list**. `complete:false` plus the explicit package obligations prevents a false full-report claim.

## Smallest bounded continuation proposal

1. Eight component owners + suite manifest/collection negatives: at most10 paths; tracer first, then whole component group.
2. Seven independent built owners + isolated production/development build selection/helper/manifest as actually needed: keep below15 paths; tracer first. Preserve sound browser variant and Paja navigation obligations explicitly.
3. Two audio-generation owners + runner/manifest/policy validation, shared-fixture consumer inventory and final attribution/report: likely under10 paths, subject to actual artifact isolation audit. Shared consumers should reuse their existing collector rather than gain duplicate adapters.

Move the **full initial report obligation**, not merely a claim of completeness, to the final checked continuation;07-03 depends on that report. Execute every source-executing suite/job, preserve canonical schema equality and zero denominator, and keep global/noncritical/mode90/90/85 and critical95/95/90 exactly. Per-mode attribution still needs explicit execution records: mixed-mode worker payloads cannot simply be copied into every mode stratum. Development must use a genuine development artifact; unknown/unattributed observations must remain visibly unknown. Enforcing runs must fail below any floor; report-only shortfalls are not release acceptance.

No broad baseline or incomplete full collection was run. Root must reconcile/check the bounded continuation before any extra owner edits. Plan07-09 remains partial; tracking stays6 completed phases and37/42 plans.
