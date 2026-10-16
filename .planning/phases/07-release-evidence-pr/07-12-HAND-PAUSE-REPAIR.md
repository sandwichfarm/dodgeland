# 07-12 owned-hand pause investigation and repair scope

## Observed failure

Full collection30406 exited1 after82 production PASS records. Run `f8000273-69e8-4ab1-a47e-d4d9b4c29907`, frozen source/tests/toolingf492377 (last implementation6528a82, manifest7b731ed), log `/tmp/down-to-duck-07-12-full-collection-results-verified.log`. Race layout10/10 with420 cells, Race results44/44 with46 cells/78 images, Relay layout5/5 with252 cells, Relay results15/15, actual mode attribution and render jobs passed. The collection is incomplete; no coverage-floor claim follows.

`tests/run-hand-runtime.mjs:150` fails the original visible Travelers click: Local Play intercepts the pointer. The archived report identifies dark240×240 pause with six owned cards. Both preceding hand-geometry checks passed. Root inspected the failure image: Travelers is obscured beside Hop on, underneath Local Play. Archived evidence lives under `artifacts/release-coverage/full/f8000273-69e8-4ab1-a47e-d4d9b4c29907/suite-artifacts/run-hand-runtime/artifacts/`; failure PNG SHA256 `e85c773d54fe75902c08d4a2023d06abbef1e3daf94802cc99e6d56a4d12f506`.

Credible mechanism: the owned-hand short-frame rule in `src/hand-layout.css:127` creates a two-column pause board. Its bottom action container occupies one half; the newer home-page grid in `src/pause.css:46` allocates two controls inside that narrow container. The prior empty-hand pause matrix did not cover this arrangement.

## Authorized next step: ordinary reproduction only

The existing executor owns the diagnostic, this document's evidence appendices, and terminal STATE updates. Build the unchanged production source and run the whole original `tests/run-hand-runtime.mjs` through the strict runner, with a durable log and muted browser. Preserve every existing `artifacts/run-hand-*` output, including files absent from the current manifest patterns, and archive the generated diagnostic before restoring the exact original set/hashes. Record source/build identities and actual exit. Do not change test actions, assertions, deadlines, game state arrangements, source, or coverage tooling during this diagnostic. An observation-only geometry probe may follow if needed, labelled separately and without altering original interaction semantics.

After the ordinary result, return the measured cause and a narrow responsive-layout proposal before production edits. Source repair ownership and final verification scope will be added here against that evidence. No user approval is required for this authorized bug repair; the boundary is between diagnosis and justified implementation.

## Artifact obligation to resolve

The full manifest currently lists three run-hand outputs but the test also writes `run-hand-pause-240x240.png`, `run-hand-market-900x600.png`, and `run-hand-market-2400x1200.png`. The first was reached before failure. Audit this omission explicitly; restoration of the three listed files does not establish preservation of all outputs. Preserve the current files before further runs. Do not claim recovery of an earlier unbacked image. The eventual narrow manifest repair must cover every emitted output in the full job and focused group without dropping existing obligations.

## Invariants

Keep Travelers, Local Play, resume, rules, power and the persistent hand accessible at the existing240×240 floor; preserve44px targets, readable labels, no scrollbars, themes, focus and stable hand position. Do not force clicks, hide controls to pass, weaken original assertions, change gameplay/protocol, alter dependencies/oracle, or restart the full collection before focused proof and independent review. All test/build/browser commands remain sequential. Preview5175 and Paja5197 remain untouched.
