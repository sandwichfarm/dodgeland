# Current collection visual spot-check

Root inspected the actual PNG bytes below during full collection93747, collector PID46458, run `59b261c8-5604-4c26-8b26-5d97f40d8e4a`, on2026-10-16. The cross-mode job was still running; this is a limited visual observation, not a completed job, full matrix or release acceptance.

Source/tests/tooling are frozen at `cb0e569` (latest test implementation3920d11). Root verified no diff in `src`, `tests`, `tools` or the root lockfile against that commit. The run's `inventory.json` SHA256 is `cd2869fae16b79b0068a3f60ca23eed8055bf54901d7c035f4717d59c5f93d47`. Observed files were freshly written by the current job, rather than historical copies. Acquisition provenance remains governed by the actual test and its report; visual inspection alone does not establish public-input provenance or numerical clearance.

All three files were opened through the image viewer at their actual dimensions. The inspected files were under `artifacts/cross-mode-presentation/` while the job ran. Once archived, matching bytes are expected under the run's `suite-artifacts/cross-mode-presentation/artifacts/cross-mode-presentation/`; a future evidence step must verify these digests before reusing this observation.

| Image | SHA256 | Root observation |
| --- | --- | --- |
| relay-1000x280-light.png | 6f4f95e9bd7de1193a892fa5168941202b0a1aee072e91b30c0996087525eddd | Short layout keeps four player identifiers, the selected runner and distance readable. Movement controls and Notice fit below the visible runner. No visible text clipping or control overlap in this image. |
| race-compact-control-gap.png | 0cf7010b38b946a66c3aaf99444111eb0a72dbfbf088e5fc4f953742687242c4 | Compact frame shows four distinct traveler markers and labels between the top HUD and bottom controls. Finish/clock/fog information wraps within the HUD; all five bottom controls remain visible. No observed actor/control overlap. |
| relay-900x600-light.png | 263134313cdeb3bea363620080a567580dd3b34da5b83253e2bb0438ff100c0e | Regular frame shows all four player tiles with active/next/waiting status, the selected owner, hand slots and bottom controls. The invitation and runner are both legible, with no visible clipped labels or overlapping controls. |

This does not replace07-05's complete required-cell manifest, committed image bytes, source/build validation, all-sheet inspection or critical-state review. Exact8px clearance remains an automated geometry obligation and is not inferred from these images. The previously received user play-feel acceptance remains a separate factual record.

Subsequent job result: the same full run logged `PASS cross-mode-presentation` at 2026-10-16T19:51:02.198Z, with 33 passed, zero failed/cancelled/skipped, and duration 390126ms. Root then verified all three archived PNG digests against the inspected bytes; all match. Source/tests/tooling/root lock still have no diff against `cb0e569`. This establishes the cross-mode job's terminal pass and archived-image identity, while the full collection remains active and release acceptance remains pending.

## Race observations during the same collection

Root opened these three actual PNGs while `race-layout` was live on2026-10-16. Their modification times are after the job's20:05:31.901Z start. They are observations of the current job, pending its terminal result and archived-byte validation; no final matrix acceptance is implied.

| Image under `artifacts/race-layout/` | Written UTC | SHA256 | Root observation |
| --- | --- | --- | --- |
| four-racers-240x240-dark.png |20:06:09.449001|76d9393705d5e13623ca0fff301d92b4b659841d2e141e1a957e16593cc83453|All four HUD selectors, selected traveler health and five bottom controls fit. World labels are clustered around the Mud Splash pickup text; specifically inspect this crowding in07-05 before claiming all labels are clear. The image alone does not establish whether label footprints intersect.|
| fog-line-1000x280-light.png |20:07:30.661687|6bf9c31d6361d9d8a461bdac82bd923a1b768982e00944ef5708be01ef2f0ea5|Short layout exposes the leader, finish/clock/fog numbers, a trailing-player status banner and movement controls. The selected duck remains visible. Numeric geometry and actual fog-damage behavior still require their assertions.|
| mud-target-320x560-dark.png |20:06:19.759073|d800a9052ba3d64825dfba39809d97e57611911a2e4e362a7fc7c8c58b492008|Compact target view identifies P1 Butter as owner, P2 as selected recipient and the other eligible players. Back and Use on P2 are large and readable; all target rows fit without visible clipping.|

The smallest-frame pickup/label crowding is a concrete visual-review follow-up, not a product defect confirmed by this inspection and not a waived clearance requirement. Preserve this exact capture in the07-05 selection or reacquire equivalent current evidence if source changes. This documentation-only observation does not authorize changing the running collection's source or assertions.

Read-only source follow-up at production3920d11/b82c0a5: graph-resolved `Renderer.packSessionLabels` (`src/render.ts:387`) reserves previously placed traveler nameplates and protection text. Consumable text is separately projected and drawn in the pickup loop (`src/render.ts:318`, label draw339); its bounds are not included in that nameplate packing list. This identifies a concrete measurement gap for07-05: observe pickup-text and traveler-nameplate envelopes together at the preserved240px state, including stroke widths. Existing actor-versus-opaque-DOM clearance and label-versus-label tests alone cannot prove pickup-text separation. The source fact does not by itself prove that the rendered rectangles intersect, so retain the pending visual status until actual geometry is measured.

Subsequent Race job result: the same full run logged `PASS race-layout` at2026-10-16T20:12:14.822Z. All10 tests passed, with zero failures/cancellations/skips, in402321ms. Root independently read the archived report under `suite-artifacts/race-layout/artifacts/race-layout/report.json`: complete=true, eight stages,420 unique cells covering the exact35-state × six-frame × two-theme Cartesian product, zero recorded geometry failures/runtime errors/external requests. All three inspected Race PNG digests match their archived bytes. The source/tests/tooling/root lock remain unchanged fromcb0e569. This clears the prior full-run Race cancellation frontier; the complete collection, label-crowding follow-up and release acceptance remain pending.

## Hand-verified collection: fresh Race presentation captures

During full collection14319 on2026-10-16, root confirmed collector PID19286 and parent19025 live, with `cross-mode-presentation` started at21:55:20.406Z. Run `085c8764-1a31-41c9-9db9-d8aabfc7bde4` freezes source/tests/tooling at9e09aad (last implementation65ca494). A direct diff of `src`, `tests`, `tools` and `pnpm-lock.yaml` against9e09aad was empty. The inventory digest remains `cd2869fae16b79b0068a3f60ca23eed8055bf54901d7c035f4717d59c5f93d47`.

Root opened the following fresh PNGs through the image viewer. Their timestamps are after this job's start; the older Relay and compact-gap files were explicitly not treated as current-run evidence. At inspection the job was still live, so the table records observations pending terminal execution and archived-byte validation.

| Image under `artifacts/cross-mode-presentation/` | Written UTC | SHA256 | Root observation |
| --- | --- | --- | --- |
| race-240x240-light.png |21:57:42.208654|24081f0d3522fce57e23512b708c36b8ae41ff48cb7602d8acd9c7725ef52de6|The two-line race status, four player selectors, selected-player health and five bottom controls fit. All four travelers and their name labels are visible in the remaining world strip; labels are compact. No visible control clipping. This image alone does not prove exact nameplate separation.|
| race-1000x280-light.png |21:57:46.701009|9314b3e21c2eed92ddbbb3eecadb202da727cab69357758878cd1dd701b0bf7c|Four selectors occupy the top row; health and race status fit beneath. All travelers remain visible between the HUD and bottom movement/Notice controls. No observed text truncation or actor/control overlap.|
| race-900x600-light.png |21:57:45.247416|0b2b9a7699ea617af48f4723a68995763b548465c2733eaacbe43daae94a3f44|All four named HUD tiles, the paused invitation, owner selector, item slots and bottom action controls are readable. The travelers and labels remain visible in the world. No observed clipping or overlapping controls.|

These observations do not close the separate pickup-text/nameplate measurement gap above: the fresh images are the initial Race presentation, not that preserved pickup-crowding state. They also do not establish complete visual-matrix, coverage-floor or release acceptance.07-05 must retain acquisition provenance, verify matching archived bytes and carry only current source-bound evidence into its durable manifest.

Subsequent current-run result: `cross-mode-presentation` passed at22:01:52.919Z, with33 tests passed and no failures, cancellations or skips, duration392057ms. Root independently read the job ledger's exitCode0 and the four archived `arcade-frames.json`, `flow-frames.json`, `race-frames.json` and `relay-frames.json` reports, each with22 captures and empty errors, external requests and failures. All three inspected Race image hashes match their bytes under this run's `suite-artifacts/cross-mode-presentation/artifacts/cross-mode-presentation/` archive. The complete132-job collection remains live and incomplete.

Archive provenance caveat found by root: `final-artifact-report.json` in that same archived directory is inherited Phase06 evidence, with `sourceCommit:5ab22ab`, `run:19150`, `log:/tmp/down-to-duck-06-01-final-complete.log` and214 capture rows. Its presence in a newly archived directory does not make those rows current-run acquisition evidence; neither does the directory's total PNG count. Do not credit that historical report as the current source/build manifest.07-05 must check each chosen report/capture's actual acquisition and hash identity and replace stale manifest claims. This finding does not invalidate the observed current strict33-test pass or the independently matched fresh PNGs, and does not authorize modifying the live collector.

### Current Race layout terminal and archived identity

The same collection passed `race-layout` at22:21:10.635Z:10 tests passed, no failures/cancellations/skips, duration314673ms. Root independently parsed `suite-artifacts/race-layout/artifacts/race-layout/report.json` (SHA256 `0ae0cc804d415d054e57c0987a430de5955affcd900d4b0b24fb87749d464ab5`). It records complete=true, eight stages and420 unique cells:35 states × six expected frames × two themes, with no missing/unexpected Cartesian cells, errors, external requests or failures.

The archived `four-racers-240x240-dark.png`, `fog-line-1000x280-light.png` and `mud-target-320x560-dark.png` exactly match all three previously inspected Race digests in this document. During the live job, root also observed newly written floor and Mud-target captures at22:16:27.861633Z and22:16:35.943708Z; the prior fog capture was excluded until terminal archive validation. These byte matches retain the original visual observations, including the still-open pickup-text/nameplate measurement follow-up. They do not imply that this separate gap, the complete132-job collection, coverage floors or final release audit is complete.

## Menu-verified collection: Flow and embedded item-target inspection

Full collection11460, run `ed12cf45-d4d2-4fb1-a77a-89ede7a9ea78`, freezes implementation/tests/tooling at `f625b98`. Root confirmed collector58476 and shell58171 live during inspection. The current cross-mode job began22:55:38.765Z on2026-10-16 and passed at23:02:16.118Z:33 tests, zero failures/cancellations/skips,396838ms. Root independently read those terminal totals and the four archived mode frame reports, each with22 captures and empty errors/external/failures.

Root opened these actual PNGs during the job, then verified all three archived SHA256 values after its terminal pass. Archive root: `artifacts/release-coverage/full/ed12cf45-d4d2-4fb1-a77a-89ede7a9ea78/suite-artifacts/cross-mode-presentation/artifacts/cross-mode-presentation/`.

| Image | Fresh write UTC | SHA256 | Visual observation |
| --- | --- | --- | --- |
| flow-240x240-dark.png |22:57:32.699122|0797d2c73592d98ba429b6e38ce2a0ba2ee8dfb77bde49ec9b098e150f02c131|Four player selectors, selected-player health and five bottom controls remain visible. All four travelers and their name labels fit in the intervening world strip. Secondary HUD status is visibly ellipsized at this tier; no claim of complete inline status text.|
| flow-1000x280-dark.png |22:57:37.429296|259872b3fd501e997f2fd104f0dbbd0f39888d055b7b19670fd121edf65d4a7e|Short-frame player selectors, health/paused status, traveler labels and movement/Notice controls are readable. No observed actor/control overlap; exact numeric clearance still belongs to geometry evidence.|
| embedded-fog-lantern-target.png |23:01:10.378423|53a97e2913cf4169621ebe62b679782c8d3ac2d46dc2c838597a46143189924c|Target view identifies P1 Butter and the three-second fog protection. Back and the two-line Light lantern action remain visible and legible. Acquisition provenance remains that of the actual fixture; image inspection does not establish public-input-only acquisition.|

The inherited `final-artifact-report.json` remains historical Phase06 evidence, not a fresh acquisition manifest. This scoped inspection does not close the separate pickup-text/nameplate gap, complete07-05's required matrix, or establish full collection/coverage-floor/release acceptance. The complete collection remained live after this job passed.

### Current owner and market captures

The same run passed `local-session-owner-layout` at23:08:37.841Z in79408ms, one complete strict test with no failure/cancellation/skip. Root independently verified its archived report SHA256 `55d7717d5691d789bc72502f10b7db42915b44fb6b611971addba6dfa57a1e69`, empty deficiencies/errors/external, and exact53 unique cells: market plus four owner-hand states × five supported frames × two themes, two200×160 market notices, and one900×600 light reduced-motion case.

Provenance is explicit in the report: authorized shell pad snapshots enter four-seat play; CDP stages distinct real `RunInventory` contents; inspection and owner selection then use production controls. This is proof of the owner interface with arranged inventory, not of earning those contents through public gameplay or of rare-item drop probabilities.

Root opened these three archived full-size images under `suite-artifacts/local-session-owner-layout/artifacts/` and calculated their digests:

| Image | SHA256 | Visual observation |
| --- | --- | --- |
| local-session-owner-market-320x560-light.png |764c81ed3142a2937f178f330e1707f257d9a9f06e04dbe6b2f7206d3bffc15b|Viewing P1 Butter, all four owner selectors, market/wardrobe tabs, six offer tiles, paging, the hand and two recovery-item controls are visible. The compact page retains clear owner context.|
| local-session-owner-hand-p3-240x240-dark.png |677350ffe5cbd6d42fdc10093e03aadcc1467d58fbf5254f04f287470bbe083c|The Longboats inspector identifies P3 Pip, displays its complete description, and keeps Close/Sell visible at the frame floor.|
| local-session-owner-market-1000x280-dark.png |293cef87dd128c5215be8be29505890e957d8608bd637680723037e633f33ddf|The short frame preserves owner selection, three visible offers with paging, the current hand and both recovery-item controls. No observed text/control clipping in the selected image.|

These limited visual observations retain the exact matrix's automated evidence without substituting image inspection for numerical geometry or transaction authority. Full collection and07-05 release evidence remain pending.

### Current Race matrix validated after terminal pass

Collection11460 passed `race-layout` at23:21:55.594Z:10 tests, zero failures/cancellations/skips,318193ms. Root independently read the current archived report under run `ed12cf45-d4d2-4fb1-a77a-89ede7a9ea78`: complete=true, eight stages, exact420 unique cells across the unchanged35 states × six required frames × two themes, with empty errors/external/failures. The report SHA256 is `0ae0cc804d415d054e57c0987a430de5955affcd900d4b0b24fb87749d464ab5`, byte-identical to the previously validated deterministic report. The current strict terminal result and collection archive establish the new execution; matching bytes alone would not do so.

Current archived `four-racers-240x240-dark.png`, `fog-line-1000x280-light.png` and `mud-target-320x560-dark.png` match all three already inspected Race digests above exactly. Their existing visual observations therefore apply to these bytes. The pickup-text/nameplate measurement gap remains open; this matrix does not close it. The full collection continued into Race lifecycle tests and remains incomplete.

### Current Race results: exact reports and inspected podiums

The same collection passed `race-results-test` at23:24:25.442Z:44 tests, no failures/cancellations/skips,111741ms. Root read all six archived reports and independently checked their complete flags, empty errors/external arrays, and exact46 unique scenario/frame/theme cells: ordered finish has12, three podium scenarios have10 each, and timeout/departure have two each. All78 named PNGs exist, with no duplicate capture names or unlisted PNGs in this job's results directory. This is a current terminal run, not a directory-count inference from historical artifacts.

Root inspected the following full-size bytes under `suite-artifacts/race-results-test/artifacts/race-results/`:

| Image | SHA256 | Visual observation |
| --- | --- | --- |
| race-05-05-tiers-4-tie-900x600-light-0.png |3f0cce8b3da4a69a5f301c0e881b515a2952bd0b5e7f2b94b6d466c5d8815b88|The shared first-place tier shows all four distinct character models and names, a winner line naming all four, page navigation and Race again. No visible clipping.|
| race-05-05-tiers-4-distinct-240x240-dark-3.png |249090f4437e2249bf1ed0cdeedac4b82b63b8d284e8e151d97f29da0444f1d0|The fourth-place page identifies P4 Petal, the finish/time line and both navigation buttons with Race again. The floor layout pages the results; the image shows page4/44 and does not imply all statistics are visible at once.|
| race-05-05-time-240.png |d667cf4e8f32e587ac6aca97cc4065423fe3beaec8eccd8686c65addd03ca8ae|The timeout page explicitly says Race time ended, displays the30.00s clock and both tied participants, with bounded navigation and retry.|

Root read the acquisition code in `tests/race-results.test.mjs`. The viewed four-seat podiums use visible Local Play/Race setup, a one-tile finish entered through the production field, a public seeded intent, actual keyboard presses and authorized shell-controller snapshots. Ties use one controlled simulation tick; no private result/progress write creates the ranking. Timeout uses the visible30-second setting and the fixture's controlled clock. These are actual production input journeys in a controlled browser fixture, not physical-controller or long-course endurance evidence. The separate model cases in the same file explicitly arrange terrain/inventory and retain that distinction. The full collection, coverage floors and durable07-05 evidence remain pending.

### Current Relay layout: handoff, disconnect and recovery

Collection11460 passed `relay-layout` at23:31:27.488Z:5 tests, no failures/cancellations/skips,182315ms. Root independently checked all21 expected state names against the unchanged test contract and the exact six-frame/two-theme Cartesian product:252 unique cells, all named image files present, four stages, complete=true and empty errors/external/failures. Archived report SHA256: `5c20692d932de8d97e342c1850feb77df95c581f1fb87b777a38914540ec2002`.

Root opened these full-size images under `suite-artifacts/relay-layout/artifacts/relay-layout/`:

| Image | SHA256 | Visual observation |
| --- | --- | --- |
| handoff-240x240-dark.png |109d36914d15e143227df18a767b8b092b52af910ef8bdfa05fa378da436e1b0|Leg1 completion names P2 Sunny as next runner and presents Start P2's leg and View relay without clipped labels.|
| disconnected-1000x280-light.png |fe7687017ec76feb6faed326fc995ba315b6158c102218f01a3fe9b0911647b3|The short board identifies P2's disconnected controller and keeps Skip P2 and Leave as P1 distinct and visible.|
| recovery-app-motion-320x560-light.png |1cda11044a936e4b605df53ac261cd3bc5dc661180d9b4e543df8d93efb4b1c7|The recovery board identifies P1 Butter, explains the personal revive, and exposes revive, continue without revive and leave actions with full text.|

Acquisition was checked in `tests/relay-layout.mjs`: visible setup selects the one-tile handoff interval; real keyboard movement completes the leg; authorized shell pad snapshots confirm the next runner and trigger disconnect/reclaim. The recovery case enables the actual reduced-motion setting, selects a999-tile leg and reaches a generated hazard using keyboard movement and the controlled clock; read-only observation detects the offer before the real Revive P1 control spends the charge. No private death/recovery write acquires this screen. These observations retain controlled-fixture provenance and do not establish native hardware behavior or complete release acceptance.

### Compact menu repair clears the prior full-run failure

The same collection passed `run-hand-runtime` at23:38:43.832Z and then `run-menu-layout` at23:40:37.526Z. Root independently read the archived menu report:36 frames,223 observations, empty errors/external, no reported overflow, and every recorded control/text fit and control hit check true. Report SHA256: `95b87b80eb874a2963b5a101b88cafa5bd9a5f66ff993584fe9351f340d8761b`.

Root opened the current full-run `run-menu-options-ready-dark-240x240.png` (SHA256 `d733ca3ffbd86958895ab498abc450f0b7e2fe724b91da39f435feee29d97169`) and `run-menu-ready-dark-320x560.png` (`f0f798845f5fe3b0252dd1620f4bdfce9fdd9e650346262006c329823b48ecff`) under `suite-artifacts/run-menu-layout/artifacts/`. All four ready actions are visible with complete labels in both images; the320px home also retains traveler preview, help and power controls. The previously recorded decorative rivet/Back border touch remains visible at240px, with no observed arrow obstruction; this is not a claim of numerical decoration clearance. Current image bytes differ from the focused-run images, so their independent inspection is recorded explicitly.

This clears the previous full-run menu assertion on the frozen repaired source. At observation the full132-job collection remained live, beginning runtime-smoke; complete coverage and release acceptance are still pending.

### Current Survive integrated scenario: acquisition limits and actual scene

Collection11460 passed `survive-complete-run-runtime` at23:49:36.940Z: one test, no failures/cancellations/skips,52589ms. Root read the archived `survive-complete-run.json` (SHA256 `521a3a6b9335aca9e3d6d7d9038c31b560c69d975648d8230dd9766834eeed51`): seven checkpoints, empty errors/external and no failure field. Root also read the entire acquisition in `tests/survive-complete-run-runtime.mjs`.

The test starts from a public seeded intent and uses actual menu, keyboard and authorized controller events for adoption, joining, reclaim, purchases, targeting, selling, pack choices, result paging and retry. It explicitly **arranges production terrain, wave position, pickup contestant positions, wallets, score/market stock and fatal events** through the fixture. Its continuous interaction and real-owner assertions are valuable integration evidence, but the `complete-run` filename must not be interpreted as an entirely public-input course.07-03/05 must bind any full public-input journey claims to their actual separate acquisition proof; this scenario alone cannot establish them.

Root opened these current images under `suite-artifacts/survive-complete-run-runtime/artifacts/`:

| Image | SHA256 | Actual visible scope |
| --- | --- | --- |
| survive-complete-regroup.png |10ea6a9277fbe571017eab140d75e44ac7fdc29f6f4fa1024ac3e39dd14e9c8c|P3 Pip's item inspector after the charge is spent, with item paging and Close details. The opaque inspector hides the world; this image is **not** visual proof of four regrouped travelers despite its filename.|
| survive-complete-paused-market.png |7fdf051d89580265db4aa87ba0abd120f8645c6cc4965189356979e893fac381|After closing the inspector, all four distinct travelers and their Protected labels are visible, with matching four-player health HUD, paused notice, market invitation and bottom controls. Use this image for the visible regrouped/protected scene, retaining the arranged-state provenance.|
| survive-five-participant-paging.png |6aa17552e1c1e58630bfc8e51794f7b97c890fd65ddf252122e73ec653118b4b|The short result page identifies the departed P4 Petal as Left run, with Hops, page17/20, navigation, retry and seed controls. This single image shows one participant; the test's actual paging assertion covers all five stable participants including the replacement P4.|

The scene test separately measures each actual traveler/body envelope against the paused market invitation with the inclusive8px condition. The image alone is not numerical clearance evidence. Result immutability, all-participant paging and unchanged ownership come from the named assertions, not from the screenshot or the suite name. Full collection and release acceptance remain pending.
## Recovery matrix repair: ordinary-build observations

Full collection11460 stopped after119 passing production jobs when the original recovery-board layout test exceeded its120s aggregate deadline. Its127 recorded frames do not waive the cancellation. Candidate `68c3f42` retains the single app/session and all original actions, with five sequential bounded stages and cancellation cleanup. These observations concern the subsequent ordinary-build test, not a completed full coverage collection.

The ordinary strict test passed6/6 with zero failures/cancellations/skips in28190ms. Root independently compared the ordered `(state, theme, width, height, pageIndex)` tuples against the retained original archive: all127 match exactly. The report has `complete=true`, all five stages and empty errors/external arrays; SHA256 `87944c43bc59854d5825781f33439490d8e795613a72ec2dd61c93808ee08f90`. The ordinary wrapper restored its134-file `survive-recovery-*` set byte-for-byte, broader than the canonical job's128-file matrix set. Normal dist remains `bc1bcc8f07aae95e7308f3c659157ee5f2cf31dd98dce77d393d2b070373f2fb`.

Root opened these actual images under `/tmp/down-to-duck-07-12-recovery-layout-ordinary-evidence/generated/`:

| Image | SHA256 | Observation |
| --- | --- | --- |
| survive-recovery-revival-dark-240x240-0.png |71c014b38dce5498dc63dd800c0998ac054c1cbf0e9eaf5e83b3760a6092a093|The floor view identifies P1 Butter and selected P2 Sunny; Back, Revive P2 and People/page controls fit with readable labels. This page alone does not show all three possible targets.|
| survive-recovery-kept-flare-light-320x560-0.png |815260fe348be2b97bac1fdf8ccc687fe95c2ca8d04bc5e82eb69682638c5b5e|The failed-safe-destination message explicitly says the Flare was kept. Back, Use Flare and People/page controls remain visible. Charge preservation is established by the separate before/after state assertion, not by this text alone.|
| survive-recovery-empty-items-light-1000x280-0.png |e32990adfc90b7a2690950e4a26eaf8b62a7a011dc69be56e2e119b8135781fd|P2 Sunny's empty shelf shows both zero-charge actions disabled, with visible focus on Back and a separate Leave P2 run action.|

Acquisition arranges terrain, admission, wallet/stock and deaths through production fixture APIs, then exercises the real board, selections, native Tab navigation, resize/paging and rejected recovery transactions. It is not an entirely public-input run. Canonical collection, actual cancellation-negative evidence, independent final review and durable07-05 release packaging remain separate obligations.

Subsequent canonical focused run `6c5e9bc7-3a00-4a0b-92dc-332ed130785f` passed6/6, zero failures/cancellations/skips,123497ms. Root read the completed manifest and archived report: one real payload, report-only with thresholds not evaluated, and the exact same report digest and ordered127 cells as the ordinary run. Its kept-Flare PNG matches the inspected ordinary bytes. The canonical revival-floor and empty-shelf PNGs differ in bytes, so root opened both separately: the same observations above hold for SHA256 `de9ad247def1b74ca0cb0ba98d0eb94d5bf545696ef669230b9aa9f73e48d72e` and `32b8db656c899ef965fcddfe28c0084442eb5299b3645d07458912dc60cfa6b1`, respectively. No byte equality is claimed for those two images. They are under the run's `suite-artifacts/survive-recovery-board-layout/artifacts/` directory. Focused terminal48811 also passed type-check/build/guidance and conformance5pass/5unmeasured; cancellation-negative and full-collection obligations remain.
## Recovery-verified full collection: cross-mode archive

Full collection68162, run `6802bfd4-2d88-4d8e-a091-9733e4423b91`, passed `cross-mode-presentation` at2026-10-17T00:32:37.974Z:33 passed, zero failures/cancellations/skips,382398ms. Implementation/tests/tooling remain frozen at68c3f42. Root independently read the four archived mode frame reports; each has22 captures and empty errors/external/failures. Raw report SHA256 values: Arcade `0a290bf62c245470aef22497b0b9c3c72ca6933202513c03303fa9413b31036b`, Flow `4334ee0e3fdff3c259c553798f6a753cc3b8a96d40e866c173daa4e2434aed1f`, Relay `23c67b645ff1afafee99038e8c5530e6577d017268f638a538b3544caf22c8e8`, Race `032f91bcd2c9c6287c49f3ec2974e8aa25ade53794dfb8754886af1ce643b5c7`.

Root verified exact byte matches against the already inspected images for `flow-240x240-dark.png`, `flow-1000x280-dark.png`, `embedded-fog-lantern-target.png` and `race-compact-control-gap.png`. Their existing hashes and observations in this document apply to these current archived bytes under the run's `suite-artifacts/cross-mode-presentation/artifacts/cross-mode-presentation/`. The four named image comparisons do not imply inspection of every archived image. Actual suite execution establishes the new job result; archive copy timestamps and file counts alone do not establish acquisition freshness.

The inherited `final-artifact-report.json` remains historical and is excluded from this fresh proof. The pickup-label measurement follow-up, complete collection, exact coverage floors and durable07-05 packaging remain open. This entry records a completed presentation job within the still-running full collection, not release acceptance.

## Recovery-verified full collection: Race matrix

The same full run `6802bfd4-2d88-4d8e-a091-9733e4423b91` logged `PASS race-layout` at2026-10-17T00:51:51.337Z, terminal duration313642ms. Its job-ledger entry records exit0. Root checked the archived `suite-artifacts/race-layout/artifacts/race-layout/report.json`: complete=true, eight stages, exactly420 unique cells matching35 states × six required sizes × two themes, empty failures/errors/external arrays. Report SHA256 remains `0ae0cc804d415d054e57c0987a430de5955affcd900d4b0b24fb87749d464ab5`.

The current four-racer240px dark and Mud-target320px dark PNGs exactly match the already inspected hashes above. The current `fog-line-1000x280-light.png` differs (SHA256 `016756653c0a2e0d68ac6b128f0f01f2e48c4fadb3a51dc3bc3607fc5f77ef4c`), so root opened it separately: selected P1 Butter, the P2 offscreen indicator, race clock/frontier status and all five bottom controls are visible within the short frame; no observed selected-actor/control obstruction. Exact numerical clearance remains the test's separate geometry assertion. This image is an instrumented production-build acquisition; the normal/instrumented identity distinction recorded in07-RESEARCH still applies.

The earlier pickup-text/nameplate measurement follow-up remains unresolved. Neither the420-cell matrix nor these three image checks establish that separate property. The full collection continued into Race lifecycle; no coverage-floor or release-completion claim follows from this passed job.
