# Bounded Survive component attribution foundation

Status: implemented and focused proof passed; runner integration, production collection, applicability dispositions and floors remain pending. Generic-agent implementation, not typed-role execution. No product, browser adapter, manifest or policy changes. The runner's existing parent validator received the narrow correction documented below; component collection is not yet wired into it.

## Actual witnesses and limits

`tests/release-survive-mode-coverage.test.mjs` runs both Arcade and Flow with imported production `Game`, `LocalSession.stage(...).commit()` and `createSurviveTogetherDefinition`. Source loading/import initialization and initial Game construction occur before acquisition measurement. Acquisition includes the real composed controller construction, staging and attach. Observations check exact composed definition and world-host object identity, production session lifetime ID and actual base.

Each base records five intervals: acquisition; real unsupported-water death/pause/personal recovery/protection; device loss/reclaim/departure and all-dead pending offer; active-time expiry and immutable archived results; settled late-action rejection. The fixture arranges meadow/river terrain and positions to trigger real production collision death, advances a controlled simulation clock and invokes component APIs. This is **component-model evidence**, not public UI/controller acquisition, natural-course endurance or TEST-03 public-journey completion. No generic planner result is relabeled as a mode witness.

Counter snapshots are never reset. Sequence numbers are shared across recorder instances; IDs are namespaced by real session ID. Runtime endpoints can change participant count and lifecycle phase, but cannot change mode/base/session. Acquisition starts with no session (`sessionId:null`, zero participants) and binds its end to the actually constructed session. Supported phases are acquiring, playing, paused, pending and settled; a paused boundary is supported, while this first fixture checks pause internally within its recovery interval. No stopped phase or boot attribution is claimed.

## API and integration seam

`createSurviveModelRecorder({inventory, identity, counters?})` accepts canonical instrumentation inventory and explicit run/realm/job/artifact identities. `acquire(game, createDefinition, commit)` synchronously creates and binds the actual composition; `interval(id, action)` brackets synchronous production component work; `finish()` validates and returns `{identity,payload,intervals}`. The optional counters reader exists for synthetic adapter tests. The production tracer uses `globalThis.__coverage__` populated by the unchanged source loader.

`deriveInterval` and `validateIntervals` retain the existing strict playing/public-input contract. Component provenance uses explicit start and end lifecycle observations; payload/hash/schema/counter/order/overlap validation remains common. Unknown provenance, identity mismatch, session replacement, invalid phases/counts and counter decreases fail. This is evidence validation, not a runtime security boundary against deliberately forged fixtures.

The tracer's sidecar is **one final full parent snapshot plus all ten intervals**, even though two base-mode lifetimes execute sequentially in one worker. The ordinary worker collector must continue to contribute its full parent exactly once globally. Never add interval deltas to global totals or count intermediate parent snapshots again.

Required integration (outside this ownership):

- Register the dedicated test worker with the ordinary canonical source-loader inventory. Supply `RELEASE_MODEL_INVENTORY`, `RELEASE_MODEL_INTERVAL_OUTPUT`, `RELEASE_MODEL_JOB`, `RELEASE_MODEL_ARTIFACT_HASH`, `RELEASE_COVERAGE_RUN` and `RELEASE_COVERAGE_REALM`; bind these to real runner metadata and its actual worker realm. `DOWN_TO_DUCK_COVERAGE_CONFIG` still selects source instrumentation. No root dependency or loader changes needed.
- Archive/validate the sidecar, require both witnesses and all expected intervals, and bind its identity and counters to the independently collected final Node parent. Existing `validateModeRows` accepts this row shape and enforces summed deltas cannot exceed its parent. The current runner only supplies browser rows, so integration must explicitly include the Node row.
- Preserve provenance-separated reporting (`component-model` versus `public-input`) even when merging actual matching deltas into mode strata. Module initialization and initial solo Game creation stay global/shared. Do not use component intervals as evidence for public input behavior.
- Add this dedicated job to mechanical execution inventory, artifact obligations and focused/full equality before production measurement. No production floor claim is made here; unchanged policy and all-source zero inventory still apply.

## Focused evidence

Final serial command40770 exited0. `/tmp/down-to-duck-survive-model-final-unit.log` records7/7: existing attribution cases, new component lifecycle negative checks, synthetic recorder owner/sequence check, and both production lifecycle witnesses. Command: `node --test tools/release-coverage/attribution.test.mjs tools/release-coverage/model-attribution.test.mjs tests/release-survive-mode-coverage.test.mjs`.

`/tmp/down-to-duck-survive-model-final-instrumented.log` records2/2 actual production witnesses with current canonical `buildInventory()` instrumentation. Temporary proof driver `/tmp/down-to-duck-survive-model-proof.mjs` used the unchanged source-loader config and checked all ten deltas using `validateIntervals` plus existing `validateModeRows` against a **single** final parent. Sidecar/inventory/config are in `/tmp/down-to-duck-survive-model-proof/`. This isolated proof uses an explicitly synthetic artifact label (`source-inventory-proof`), not a production build identity or release credit; integration must supply the actual identity.

The first instrumented postcheck failed with duplicate interval IDs across the two lifetimes (retained `/tmp/down-to-duck-survive-model-instrumented.log`). Namespacing by actual session ID fixed this; final proof preserves that failure history and validates disjoint intervals. No full collection, browser/build command, coverage-floor acceptance or production applicability disposition was performed.

## Parent-counter review correction

Root review identified that the original `validateModeRows` checked each interval independently, not their sum. The preceding integration description states the required final guarantee; it was not true of the inherited implementation. The narrowly authorized correction now accumulates every statement, function and branch-arm counter across all intervals for a unique run/parent realm, validates the canonical parent once, rejects unsafe integer sums and rejects any aggregate exceeding that parent's exact site count. Two nonoverlapping intervals individually equal to their parent must fail. Component rows also now require an explicit end observation instead of silently reusing their start observation.

Retained RED `/tmp/down-to-duck-survive-attribution-parent-red.log` exited1 with precisely these two missing-rejection failures. Synthetic tests are tooling calibration, not production behavior coverage. The recorder checks actual object bindings, but does not independently infer Survive kind from an arbitrary supplied factory: this dedicated witness explicitly supplies the imported production `createSurviveTogetherDefinition`.

Final correction command5338 exited0: `/tmp/down-to-duck-survive-attribution-parent-green.log` records10/10 tests, including missing endpoint, aggregate overcredit, unsafe sum, invalid parent counters and ambiguous parent rejection. `/tmp/down-to-duck-survive-attribution-parent-instrumented.log` records2/2 production lifecycle witnesses and validates all10 intervals against one final parent under the corrected aggregate check. `git diff --check` passed. The execution slot was released to root; production integration and floors remain pending.
