# Coverage Calibration for Phase 7

**Researched:** 2026-10-14  
**Scope:** temporary Node v26.7.0 fixtures only. No application, test, package, lockfile, build, or browser artifact was changed.  
**Confidence:** HIGH for the isolated Node AST-instrumentation calibration; MEDIUM for Phase 7 integration, which has not been added to this repository.

## User Constraints (from 07-CONTEXT.md)

### Locked Decisions

**Mode:** Complete the authorized multiplayer milestone and open its review PR.  
**Dependencies:** Verified Phases 1-6; all mechanics and interfaces implemented.

Measure production coverage for rules, shared simulation, ownership, controller and keyboard state machines, all three modes, personal revival, consumables, lifecycle and results. Set and enforce explicit high thresholds, review every meaningful uncovered branch, and include adversarial boundary/ordering cases. Do not raise percentages with tests that merely repeat implementation details. Preserve correct source maps through glob expansion, inventory expected production modules, calibrate the executable-line denominator, and fail on missing source coverage.

### Implementation discretion

Select the collector, report format, converter, source-map transform, module inventory, and calibration fixture that meet the locked evidence rules.

### Deferred Ideas (OUT OF SCOPE)

None stated in 07-CONTEXT.md.

## Project Constraints (from AGENTS.md)

- Graph-first code discovery was used for the source loader. [VERIFIED: codebase-memory-mcp]
- Preserve the napplet boundary and complete the documented verification commands when implementation begins. [VERIFIED: AGENTS.md]
- This is documentation-only research. Phase 7 still must run type-check, build, guidance, and conformance before completion. [VERIFIED: AGENTS.md]

## Recommendation

Use standard Istanbul **AST instrumentation** as the Phase 7 coverage denominator: instrument the emitted JavaScript with its incoming TypeScript source map, collect `globalThis.__coverage__` from every Node test process, merge the Istanbul maps, then remap them to canonical original TypeScript paths. Do **not** use Node native mapped LCOV line/branch/function percentages or its threshold flags as the Phase 7 acceptance denominator. [VERIFIED: isolated local fixture]

This is a different pipeline from generic V8-to-Istanbul conversion. `istanbul-lib-instrument` creates statement, function, and branch counters from the JavaScript AST; `istanbul-lib-source-maps` remaps those counter locations to TypeScript. The isolated fixture below produced the required `choose(1)` total of 1/4 unique executable lines, 1/4 branch outcomes, and 1/3 functions while retaining an unimported production module as all-zero coverage. [VERIFIED: isolated local fixture; CITED: https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-lib-instrument]

## Calibrated Fixture

Fixture production modules:

~~~
 // exercised.ts
 // comment and declarations below are erased
 export interface ErasedContract { value: number }
 export type ErasedLabel = 'yes' | 'no';
 export function choose(value: number): string {
   if (value > 0) return 'positive';
   return 'nonpositive';
 }
 export function neverCalled(): string { return 'never'; }

 // unexecuted.ts (never imported)
 export function untouched(flag: boolean): string {
   return flag ? 'true-branch' : 'false-branch';
 }
~~~

The first run called only `choose(1)`. The required semantic denominator is exact:

| Metric | Covered | Total | Included sites |
|---|---:|---:|---|
| Executable line-sites | 1 | 4 | positive return; nonpositive return; neverCalled return; untouched ternary return |
| Branch outcomes | 1 | 4 | if true/false plus ternary true/false |
| Functions | 1 | 3 | choose; neverCalled; untouched |

Comments, interfaces, type aliases, blank lines, braces, and execution of a function declaration are excluded.

| Candidate | Measured result | Calibration verdict |
|---|---|---|
| Native LCOV with original TS include only | functions 0/0; branches 0/0; all source lines zero | Reject: filtering temporary JS removes the loaded script before remapping. |
| Native LCOV with temporary JS and original TS includes | exercised: lines 8/12, branches 2/3, functions 1/2; unexecuted: lines 0/4, branches 0/0, functions 0/0 | Reject: denominator includes erased/comment/non-executing lines and omits unexecuted function/branch denominators. |
| Native 100% threshold flags | exits 1 | Detects a shortfall but evaluates the invalid denominator. |
| Istanbul AST instrumentation plus source-map remap | unique lines 1/4; branches 1/4; functions 1/3; statements 2/5 | Accept: exact line/branch/function contract and the never-imported module contributes zero denominators. |

Raw V8 recorded choose as an outer function range count 1 plus a nested range for the nonpositive return count 0. When both outcomes ran, V8 changed its nested range rather than reporting stable semantic if-outcome records. Native 2/3 must never be promoted as semantic 1/2 branch coverage. [VERIFIED: local fixture]

### Istanbul metric convention

Use Istanbul's `lines`, `branches`, and `functions` metrics as the thresholded metrics, and publish `statements` alongside them without forcing its numerator or denominator to equal `lines`. For `choose(1)`, the fixture reports 1/4 unique executable lines, 1/4 branch outcomes, 1/3 functions, and 2/5 statements: both the `if` statement and its inline positive return execute on the same source line. `choose(-1)` reports 2/4 unique lines, 1/4 branches, 1/3 functions, and 2/5 statements; executing both calls reports 2/4 lines, 2/4 branches, 1/3 functions, and 3/5 statements. [VERIFIED: isolated local fixture]

This convention excludes the comment, interface, and type alias from all four denominators. It intentionally does not redefine a standard statement counter as a unique line solely to make percentages match. [VERIFIED: isolated local fixture]

## Eager-Glob Mapping Result

### Rejected approach

The current loader transpiles first, then prepends imports and rewrites import.meta.glob in emitted JavaScript. The fixture replicated that behavior with items/a.ts and items/b.ts. LCOV mapped them to src/a.ts and src/b.ts instead of src/items/a.ts and src/items/b.ts, while catalog coverage shifted onto type/comment/blank lines. This fails source identity. [VERIFIED: local fixture]

### Measured source-level transform

Use a TypeScript before transformer. Replace the glob call with an object literal carrying the original node/range, then append synthetic static imports **after** original statements. For every original module, set sourceRoot to that original file's absolute directory, not one shared src root.

~~~
const transform = context => sourceFile => {
  const f = context.factory;
  const statements = ts.visitNodes(sourceFile.statements, visitGlobCall);
  const imports = discoveredFiles.map(file => f.createImportDeclaration(
    undefined,
    f.createImportClause(false, f.createIdentifier(symbolFor(file)), undefined),
    f.createStringLiteral(runtimeSpecifier(file)),
    undefined,
  ));
  return f.updateSourceFile(sourceFile, f.createNodeArray([...statements, ...imports]));
};

// in visitGlobCall:
return ts.setOriginalNode(
  ts.setTextRange(f.createObjectLiteralExpression(entries, false), node),
  node,
);

const output = ts.transpileModule(source, {
  fileName: originalPath,
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    inlineSourceMap: true,
    inlineSources: true,
    sourceRoot: dirname(originalPath) + sep,
  },
  transformers: { before: [transform] },
}).outputText;
~~~

The fixture compiled and imported the transformed catalog using real default exports. Its mapped LCOV identities were src/items/a.ts and src/items/b.ts, proving that this placement/API preserves original module identity. It does **not** repair Node native denominators. [VERIFIED: local fixture]

## Concrete Phase 7 Gate Design

1. Add an explicit coverage mode to `tests/source-loader.mjs`. Preserve the ordinary loader path. In coverage mode, first apply the TypeScript `before` eager-glob transform shown above, then pass each emitted module and its inline TypeScript map to `createInstrumenter({ esModules: true, compact: false, produceSourceMap: true }).instrumentSync(code, emittedPath, inputMap)`. Store one manifest row per source: `realpath(originalTs)`, emitted path, post-instrumentation path, source-map status, and whether Istanbul reports an executable site. [VERIFIED: current loader and isolated local fixture; CITED: https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-lib-instrument]
2. Instrument every expected production module eagerly, including modules no test imports. Retain `instrumenter.lastFileCoverage()` immediately after instrumenting each module; merge a copy with zero counters for any module absent from all worker payloads. This makes `unexecuted.ts` contribute 0/1 unique lines, 0/1 functions, and 0/2 branch outcomes in the measured fixture. [VERIFIED: isolated local fixture]
3. Add a small collector preload, for example `tests/coverage-collector.mjs`, which on `process.on('exit')` writes that process's nonempty `globalThis.__coverage__` JSON to a uniquely named file in a per-run temporary directory. Spawn the strict Node test child with `--import tests/coverage-collector.mjs`; it must inherit `COVERAGE_OUT`. The isolated `node --import … --test` worker wrote its own payload on exit, proving preload inheritance in the Node test worker. [VERIFIED: isolated local fixture]
4. Merge all payload files with `istanbul-lib-coverage.createCoverageMap()` and `coverageMap.merge()`, then add the zero-count inventory entries from step 2. Pass the merged map through `istanbul-lib-source-maps.createSourceMapStore().transformCoverage(coverageMap)` and require the result's keys to equal the canonical original TypeScript identities in the manifest. [VERIFIED: isolated local fixture; CITED: https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-lib-source-maps]
5. Fail before reporting when the worker-payload directory is empty; any executable expected source is missing after remap; a final map contains an emitted/temp/test/harness path; or no expected production source has executable counters. A source with zero executable AST sites may remain in the manifest but cannot be required to create a coverage-map record. [VERIFIED: isolated local fixture]
6. Write the merged JSON and render text plus LCOV from the remapped map using `istanbul-lib-report` and `istanbul-reports`. The reporter packages were registry-inspected but not executed in this isolated experiment; validate their exact API during Phase 7 before making them the release command. [CITED: https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-lib-report; CITED: https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports]
7. Set high per-file and global thresholds only after the committed fixture passes at the exact line/branch/function totals above, reports each expected production identity, and exercises actual multiplayer behavior. Threshold selection is a later Phase 7 decision; this research sets no release percentage. [VERIFIED: isolated local fixture]

### Exact Phase 7 command shape

The implementation should expose one script whose coverage mode is explicit rather than overloading positional strict-runner arguments:

~~~bash
DOWN_TO_DUCK_COVERAGE=1 \\
COVERAGE_OUT="$(mktemp -d)" \\
node tests/coverage-runner.mjs tests/local-session.test.mjs tests/session-world.test.mjs
~~~

`coverage-runner.mjs` owns temporary cleanup and invokes the existing strict runner's child Node process with `--import` before `--test`; it must not pass a dash-prefixed flag to `tests/strict-node-tests.mjs`. `local-session.test.mjs` and `session-world.test.mjs` are Node model tests that load TypeScript through `source-loader.mjs`; the command deliberately does **not** name a `*-runtime.mjs` or browser-only test. The actual runner command and test list must be committed with Phase 7, because this report does not alter the present test suite. [VERIFIED: current strict runner, current Node model tests, and isolated local fixture]

The preload collector cannot observe `globalThis.__coverage__` inside an iframe or another browser realm. Browser-only/runtime suites require a separately calibrated browser instrumentation and collection path, and must be rejected from this Node-only command rather than counted as absent Node coverage. [VERIFIED: isolated Node fixture; ASSUMED]

### Required dependencies

Install these as Phase 7 development dependencies, using the project's package manager and its normal lockfile update:

~~~text
istanbul-lib-instrument@6.0.3
istanbul-lib-coverage@3.2.2
istanbul-lib-source-maps@5.0.6
istanbul-lib-report@3.0.1
istanbul-reports@3.2.0
~~~

The first three package versions were extracted from npm registry tarballs into an isolated temporary directory and their instrumentation/remapping path was executed there. The temporary harness adapted Babel's module entry point because package-manager installation was unavailable; Phase 7 must rerun the committed fixture against the normal resolved dependency tree. The report packages were registry-inspected only. [VERIFIED: isolated local fixture; CITED: https://registry.npmjs.org/istanbul-lib-instrument/6.0.3; CITED: https://registry.npmjs.org/istanbul-lib-coverage/3.2.2; CITED: https://registry.npmjs.org/istanbul-lib-source-maps/5.0.6]

### Reproduction status and isolated probe

The measurements in this report are one-off exploratory observations from an erased temporary fixture, not a durable executable proof in this repository. The compatibility harness used `@babel/standalone` to satisfy `istanbul-lib-instrument`'s Babel entry point after ordinary package-manager installation failed; therefore its results establish the AST counter behavior but do **not** validate the normal installed dependency tree. Phase 7 must commit and run an equivalent fixture before treating these values as a release gate. [VERIFIED: isolated local fixture]

The following is the minimal normal-install reproduction candidate. It was reconstructed from the measured fixture after temporary cleanup and is supplied so Phase 7 can persist and execute it; it has not been rerun under this normal installation command. [VERIFIED: isolated local fixture; ASSUMED]

~~~bash
PROBE_DIR="$(mktemp -d)"
cd "$PROBE_DIR"
npm init -y
npm install --ignore-scripts --save-exact \\
  typescript@5.9.3 \\
  istanbul-lib-instrument@6.0.3 \\
  istanbul-lib-coverage@3.2.2 \\
  istanbul-lib-source-maps@5.0.6
node probe.mjs
~~~

Create `probe.mjs` in that isolated directory before the last command:

~~~js
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createInstrumenter } from 'istanbul-lib-instrument';
import { createCoverageMap } from 'istanbul-lib-coverage';
import { createSourceMapStore } from 'istanbul-lib-source-maps';

const root = await mkdtemp(join(tmpdir(), 'istanbul-calibration-'));
const exercised = join(root, 'exercised.ts');
const unexecuted = join(root, 'unexecuted.ts');
await writeFile(exercised, `// ignored comment
export interface ErasedContract { value: number }
export type ErasedLabel = 'yes' | 'no';
export function choose(value: number): string {
  if (value > 0) return 'positive';
  return 'nonpositive';
}
export function neverCalled(): string { return 'never'; }
`);
await writeFile(unexecuted, `export function untouched(flag: boolean): string {
  return flag ? 'true-branch' : 'false-branch';
}
`);

function emit(source, sourcePath) {
  const output = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: {
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
      inlineSourceMap: true, inlineSources: true, sourceRoot: dirname(sourcePath) + '/',
    },
  }).outputText;
  const encoded = output.match(/sourceMappingURL=data:application\/json;base64,([^\n]+)/)?.[1];
  if (!encoded) throw new Error('missing inline TypeScript source map');
  return { output, inputMap: JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) };
}
function instrument(tsPath) {
  const { output, inputMap } = emit(ts.sys.readFile(tsPath), tsPath);
  const generatedPath = tsPath.replace(/\.ts$/, '.mjs');
  const instrumenter = createInstrumenter({ esModules: true, compact: false, produceSourceMap: true });
  return { generatedPath, code: instrumenter.instrumentSync(output, generatedPath, inputMap), zero: instrumenter.lastFileCoverage() };
}
const used = instrument(exercised);
const unused = instrument(unexecuted);
await writeFile(used.generatedPath, used.code);
globalThis.__coverage__ = {};
const { choose } = await import(pathToFileURL(used.generatedPath).href);
choose(1);
const map = createCoverageMap(globalThis.__coverage__);
map.merge({ [unused.generatedPath]: unused.zero });
const remapped = await createSourceMapStore().transformCoverage(map);
console.log(JSON.stringify({
  total: remapped.getCoverageSummary().toJSON(),
  files: remapped.files().sort(),
}, null, 2));
~~~

Expected output for `choose(1)` is total `lines: 1/4`, `branches: 1/4`, `functions: 1/3`, and `statements: 2/5`, with original `exercised.ts` and `unexecuted.ts` identities. Add a second `choose(-1)` run and a both-calls run when committing the fixture to lock the measured 2/4 lines, 1/4 branches, 1/3 functions and 2/4 lines, 2/4 branches, 1/3 functions cases respectively. These expected values remain exploratory until the normal-install fixture passes. [VERIFIED: isolated local fixture; ASSUMED]

## Required Failures

| Condition | Gate response |
|---|---|
| Empty worker payload directory or no production scripts | Fail before merge; empty 100% is invalid. |
| Manifest source absent from final merged map | Fail with sorted missing identities. |
| Temp/generated/test identity in final map | Fail, never silently merge. |
| Unexecuted source lacks its zero-coverage executable line/function/branch denominator | Fail calibration. |
| Fixture differs from 1/4 unique lines, 1/4 branch outcomes, 1/3 functions | Fail; do not update expectation without review. |
| Test run is failing, skipped, cancelled, TODO, or empty | Keep the strict runner. |
| Calibrated threshold or critical-scope shortfall | Fail after conversion with per-source uncovered map. |

After the calibration passes, set explicit high per-file thresholds for shared session/simulation, input/lifecycle, co-op, relay, race, revival/items, and results, plus a global production threshold. No percentage is selected here because this research did not run the production suite or review its uncovered branches. Phase 7 must record the numbers and a meaningful uncovered-branch review; source regexes and mock-only UI transitions are not behavioral evidence. [ASSUMED]

## Measured Source Identity and Process Results

The glob fixture transformed `catalog.ts` plus eagerly imported `items/a.ts` and `items/b.ts`. Istanbul's raw entries were temporary generated `.mjs` files, while `transformCoverage` returned exactly the three original `.ts` paths, with all 4/4 unique lines, 5/5 statements, and 1/1 function covered. This validates the combination of source-level glob expansion, inline source maps, AST instrumentation, and source-map remapping; it does not validate browser coverage. [VERIFIED: isolated local fixture]

The preload fixture ran `node --import preload-collector.mjs --test preload-worker.test.mjs`. Its test worker wrote a process-ID-named JSON payload containing the synthetic worker coverage object when it exited. A separate child process importing the instrumented `choose` module wrote the expected Istanbul counters to its inherited output path. The production collector must merge every such payload and reject an empty directory. [VERIFIED: isolated local fixture]

The fixture proves that interfaces and type aliases are erased and do not add coverage counters. Phase 7 should keep an all-declaration module in the source manifest as `hasExecutableSite: false`, then require every expected module with one or more executable counters to appear in the remapped coverage map. That all-declaration-only case was not separately executed in this research. [VERIFIED: isolated local fixture; ASSUMED]

## Dependency status

No repository dependency was installed, no repository version was pinned, and no lockfile changed. The isolated calibration used extracted registry tarballs only; its temporary directory will be removed after this report is committed. [VERIFIED: isolated local fixture]

Neither `v8-to-istanbul` nor `c8` was calibrated in this research. Their presence or installation alone would not establish the measured semantic denominator, so neither is the recommended Phase 7 gate. [VERIFIED: isolated local fixture]

Routine tool selection and validation fall within the authorized implementation
work. This research introduces no new user approval or human-verification
checkpoint. If Phase 7 needs a development dependency, inspect its source and
metadata, document the choice, and retain the product/runtime boundary.
Current Phase 2 retains its unchanged-lockfile requirement.

## Exact Next Actions

1. Add the five Istanbul development dependencies and commit the normal lockfile update after the package resolution is inspected.
2. Implement coverage-mode source loading: TypeScript AST eager-glob transform, inline maps, Istanbul instrumentation, canonical manifest, and zero-count entries for every unexecuted executable source.
3. Commit the fixture into the test tooling. Require its `choose(1)` totals of 1/4 unique lines, 1/4 branches, and 1/3 functions; also require `choose(-1)` and both-call results listed above, the unexecuted module, and all three eager-glob original paths.
4. Implement the preload collector, strict-child `--import` propagation, payload merge, source-map remap, identity/empty/missing checks, and JSON/text/LCOV writers.
5. Separately calibrate the browser/Vite path before including browser-only production modules in the same gate; this Node-only study did not launch a browser or build the napplet. [VERIFIED: isolated local fixture]
6. Run actual multiplayer model, state-machine, and user-flow tests under the completed gate. Review every meaningful uncovered branch against TEST-02 through TEST-05 before choosing and enforcing high thresholds.

This research does not claim release coverage, threshold compliance, or completion of Phase 7.

## Sources

- Node v26.7 test-runner coverage behavior: https://nodejs.org/download/release/v26.7.0/docs/api/test.html [CITED]
- Node CLI coverage include-all and threshold behavior: https://nodejs.org/api/cli.html [CITED]
- IstanbulJS V8 converter: https://github.com/istanbuljs/v8-to-istanbul [CITED]
- Local fixture: measured in an isolated temporary directory, then removed after documentation. [VERIFIED: local fixture]

## Assumptions Log

| ID | Assumption | Risk if wrong |
|---|---|---|
| A1 | A declaration-only source should be retained in the module manifest without requiring a zero-counter Istanbul record. | The missing-source rule could falsely fail on a no-runtime module. |
| A2 | The calibrated Node pipeline can be applied to browser/Vite-only modules. | Browser-only production code may lack coverage until its separate calibration passes. |
| A3 | The selected high threshold values will be appropriate for the real multiplayer suite. | The gate could be too weak or impractically strict without an uncovered-branch review. |

