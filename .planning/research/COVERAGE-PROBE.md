# Production coverage probe

Date: 2026-10-14. Read-only exploratory probe by `multiplayer_coverage_probe`
using Node v26.7.0. No repository edits or dependencies were needed. Temporary
probe directories were removed; these observations guide Phase 7 and do not
constitute release coverage evidence.

| Probe | Tests | Raw V8 evidence | Native report |
|---|---|---|---|
| Existing `seed.test.mjs` | 12/12 | 106 temporary production modules, no maps | Only source-loader; 100% lines |
| Existing `gamepad.test.mjs` | 17/17 | One `data:` production module, no map | Empty report; 100% |
| Temporary mapped gamepad fixture | 17/17 | Original `src/gamepad.ts` identity | Production TypeScript appears |

The mapped fixture used TypeScript `inlineSourceMap`, `inlineSources`, original
`fileName`/`sourceRoot`, and Node `--enable-source-maps`. Mapping survived removal
of the temporary emitted JS during teardown.

Two measured hazards:

- Filtering only `src/**/*.ts` yielded an empty 100% report. Including both the
  temporary emitted JavaScript and original TypeScript patterns retained the
  relevant script before remapping.
- Identical gamepad execution reported 99.19% generated-JS lines versus 81.46%
  mapped-TS lines. The latter counted comments and erased declarations at lines
  1–38 as uncovered. Native mapped percentages require denominator calibration.

## Required follow-through in Phase 7

1. Preserve original source identity/maps in `tests/source-loader.mjs` and route
   legacy `data:` loaders through a consistent coverage-capable path.
2. Make eager-glob expansion mapping-aware. The loader currently adds imports
   and rewrites the glob after TypeScript emission; enabling maps alone would
   therefore produce incorrect locations. Use an emission transform or compose
   the mappings when applying those edits.
3. Collect raw V8 and mapped reports, merging temporary instances by original
   source identity. Keep strict no-failure/no-skip tests; add a deliberate
   coverage option instead of bypassing the strict runner's flag rejection.
4. Inventory expected production modules, include unexecuted sources, exclude
   only harness/dependency/generated scaffolding, and fail on empty reports or
   missing expected sources. Catalog import alone is not behavioral coverage.
5. Review uncovered branches against the full multiplayer specification, with
   real browser/runtime evidence reported separately. Do not promote the
   exploratory percentages above into acceptance thresholds.

Node can collect raw V8 data and native LCOV without a new runtime dependency.
See the [Node v26.7 coverage documentation](https://nodejs.org/download/release/v26.7.0/docs/api/test.html#collecting-code-coverage).
