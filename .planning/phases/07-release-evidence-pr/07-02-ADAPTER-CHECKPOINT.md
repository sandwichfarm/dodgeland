# 07-02 adapter ownership checkpoint

Task1 is complete on4fffa33; tasks2/3 remain unexecuted. The exact frontmatter contains12 source/test/tool paths. The approved hard15-path split threshold is reached by the already-known independent browser owners; no extra adapter source was edited. Root requested this concrete checkpoint before checking continuation plans.

## Evidence and mandatory responsibility

07-02-REALM-AUDIT.json preserves static recursive discovery from unchanged tests/phase6-gate.mjs and referenced package scripts (106 named mjs paths including control-plane helpers, not106 executed tests). It is a discovery inventory, not a filter or complete runtime realm manifest. Test helper imports must also be reconciled. The common market fixture covers many journeys, but independent browser owners remain:

| Owner group | Existing paths requiring explicit collection lifecycle review |
|---|---|
| Canvas/component | tests/render.test.mjs; tests/session-board-controls.test.mjs; tests/session-labels-render.test.mjs; tests/consumable-world-render.test.mjs; tests/death-spill-render.test.mjs; tests/survive-results-ui.test.mjs; tests/solo-ui-browser.test.mjs |
| Local input/lifecycle | tests/local-session-tracer.mjs; tests/local-session-keyboard-runtime.mjs; tests/local-session-gamepad-runtime.mjs; tests/local-session-audio-runtime.mjs; tests/local-session-adoption-runtime.mjs; tests/local-session-runtime.mjs; tests/local-session-layout.mjs |
| Other built owners | tests/runtime-smoke.mjs; tests/gamepad-runtime.mjs; tests/health-runtime.mjs; tests/survive-together-tracer.mjs; tests/relay-tracer.mjs; tests/relay-lifecycle.test.mjs; tests/race-tracer.mjs |
| Already owned legacy | tests/sound.test.mjs owns raw Node compilation and browser page; tests/gamepad.test.mjs owns data-URL compilation |

Concrete reads establish this is not speculative: render.test compiles current and independently extracted oracle modules, creates its own server/browser/page and imports renderer inside that page. session-board-controls creates its own opaque child frame per test and closes via t.after. local-session-tracer independently reads/stats normal dist, runs Node models and creates its own browser. Survive tracer similarly has Node and built-browser paths. Merely importing source-loader or setting a market-fixture path cannot collect these browser counters.

## Smallest shared APIs required before adapters

A test-only browser collection helper (proposed tools/release-coverage/browser.mjs) should expose explicit operations, not monkeypatch Playwright or product runtime:

- `artifactForCoverage(defaultArtifact)` selects coverage-only build when an explicit run config exists; otherwise preserves exact normal dist/default freshness behavior. Return artifact identity/hash and validate expected build/schema.
- `registerRealm(pageOrFrame, identity)` records required run/suite/scenario/frame/generation plus source scope/current-vs-oracle before execution, and preserves actual null-origin or component-page provenance.
- `collectRealm(pageOrFrame, identity)` reads actual coverage before page/frame navigation/teardown, validates against calibrated inventory, writes one final payload and marks completion. Duplicate cumulative snapshots reject. Empty app-executing realms fail; helper/control-only and oracle realms must be explicitly classified, never silently counted as current hits.
- `finishRealms()` fails when a registered realm is missing. Actual required-realms registration must occur before navigation and cleanup cannot erase failure. Tests call these in their existing lifecycle finally/after blocks. Default mode remains no-op only when coverage is not requested.

Node preload also needs explicit per-suite roles: current Task1 correctly requires Node production counters from each of its two named workers. Browser-only workers may have no Node counters but still must complete registered browser realms; mixed Node/browser workers must supply both. Strict-runner negative fixtures are control-plane subprocesses, not production worker payloads; classify and preserve their original failure semantics rather than recursively instrument their fixture commands. Oracle/altered examples/samplers remain separate identities. Source-loader already excludes non-current sourceDirectory; broader exclusions need explicit manifest evidence.

## Suggested bounded placement for root/checker reconciliation

1. Finish the remaining07-02 foundation (canonical coverage Vite build, shared market fixture + explicit helper, one actual browser tracer, threshold policy). New helper would be13th path; no unrelated adapter fits implicitly.
2. Dependency continuation A: seven Canvas/component owners above plus shared helper if needed (8 paths).
3. Dependency continuation B: seven Local input/lifecycle owners above plus shared helper (8 paths).
4. Dependency continuation C: seven other built owners above plus shared helper (8 paths).
5. After every adapter continuation, complete the full production suite/realm manifest and07-02 Task3 initial report-only collection. No omission, filter or lowered threshold.07-03 must depend on this final complete initial report, not merely the foundation/tracer.

Root/checker should choose exact plan numbering and amend dependencies before extra edits. Avoid a cycle: if foundation becomes a sealed plan, move the current full-report obligation into an explicit final continuation and make07-03 depend on it. Until that amendment,07-02 remains1/3 tasks complete and cannot seal. Do not mislabel the shared-only report as full production coverage.

## Task1 validation

Retained RED5ff63b6. GREEN4fffa33. Exact gate93470exit0, /tmp/down-to-duck-07-02-task1-gate-fixed.log: calibration/collection9/9, instrumented shared suites22/22, ordinary shared plus strict negative-gate checks28/28. Previous9939 failed solely because new test requested nonexistent seed.ts; corrected to actual gamepad.ts. No original semantics were removed.

176 tracked src entries classified:144 executable,14 no-executable-sites,14CSS,1declaration,3assets. Actual report has two required worker payloads and retains all-source zeros; thresholds explicitly not evaluated. Reports are artifacts/release-coverage/shared-tracer/report and manifest.json. No full initial report, browser collection or threshold success is claimed. No active process or extra-path source edit.
