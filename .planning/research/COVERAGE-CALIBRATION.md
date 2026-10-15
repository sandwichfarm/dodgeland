# Coverage Calibration for Phase 7

**Researched:** 2026-10-14  
**Scope:** temporary Node v26.7.0 fixtures only. No application, test, package, lockfile, build, or browser artifact was changed.  
**Confidence:** MEDIUM — Node behavior and the source transform were measured locally; no standard converter is installed or calibrated in this repository.

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

Use raw V8 coverage only to collect execution evidence. Do **not** use Node native mapped LCOV line/branch/function percentages or its threshold flags as the Phase 7 acceptance denominator. [VERIFIED: local fixture]

In coverage mode, compile the real TypeScript sources with a source-map-preserving eager-glob transformer, collect all child-process V8 JSON through NODE_V8_COVERAGE, and merge it by canonical original TypeScript path. Select a reporting approach only after it passes the fixture below. A generic V8-to-Istanbul format conversion alone does not establish executable statements or semantic branch denominators. The AST inventory must validate those denominators before thresholds are enabled.

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

The only test call was choose(1). The semantic acceptance denominator is exact:

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

Raw V8 recorded choose as an outer function range count 1 plus a nested range for the nonpositive return count 0. When both outcomes ran, V8 changed its nested range rather than reporting stable semantic if-outcome records. Native 2/3 must never be promoted as semantic 1/2 branch coverage. [VERIFIED: local fixture]

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

1. Add an explicit coverage mode to tests/source-loader.mjs. Preserve the ordinary existing path. In coverage mode, use the transform above and emit a manifest of realpath(originalTs), temporary JS path, source-map status, and generated byte length. [VERIFIED: current loader and local fixture]
2. Run tests through tests/strict-node-tests.mjs with NODE_V8_COVERAGE set before the command. Do not pass coverage flags to that strict script: it deliberately rejects dash-prefixed inputs. Its child Node process inherits the coverage environment. [VERIFIED: tests/strict-node-tests.mjs]
3. Archive raw V8 JSON with coverage artifacts. It proves process execution but is not the denominator. [ASSUMED]
4. Evaluate an AST-aware standard converter or an independently calibrated projection of execution ranges onto the production AST. Do not assume the default `v8-to-istanbul` conversion passes this contract: its `_statementsToIstanbul` emits every source line and its branch map records V8 ranges. Its official implementation supports rejecting conversion alone as a denominator fix. [Source](https://raw.githubusercontent.com/istanbuljs/v8-to-istanbul/master/lib/v8-to-istanbul.js)
5. Convert every manifest script, merge output by canonical realpath(originalTs), and emit one JSON, LCOV, and text report. Reject final reports containing temp module paths, emitted JS, data URLs, harnesses, or tests. [ASSUMED]
6. Compile every expected production TS module (excluding d.ts plus a reviewed generated/harness list). For an absent V8 script, submit a synthetic zero-count top-level range for its emitted module to the same converter, then require its converted record to expose nonzero expected function/branch denominator. This is required to count unexecuted modules. It is unproven until the fixture passes with the chosen converter. [ASSUMED]
7. Use the TypeScript compiler API only to inventory functions and semantic branch outcomes: if, conditional expression, switch alternatives, logical short circuit, loop and catch decisions. Compare this inventory against the converter statement/function/branch maps. Do not add counters to application logic. [ASSUMED]

## Required Failures

| Condition | Gate response |
|---|---|
| Empty raw V8 directory or no production scripts | Fail before conversion; empty 100% is invalid. |
| Manifest source absent from final merged map | Fail with sorted missing identities. |
| Temp/generated/test identity in final map | Fail, never silently merge. |
| Unexecuted source lacks a zero-coverage function/branch denominator | Fail calibration. |
| Fixture differs from 1/4 line-sites, 1/4 outcomes, 1/3 functions | Fail; do not update expectation without review. |
| Test run is failing, skipped, cancelled, TODO, or empty | Keep the strict runner. |
| Calibrated threshold or critical-scope shortfall | Fail after conversion with per-source uncovered map. |

After the calibration passes, set explicit high per-file thresholds for shared session/simulation, input/lifecycle, co-op, relay, race, revival/items, and results, plus a global production threshold. No percentage is selected here because no calibrated converter report exists yet. Phase 7 must record the numbers and a meaningful uncovered-branch review; source regexes and mock-only UI transitions are not behavioral evidence. [ASSUMED]

## Dependency status

No dependency was installed, no version pinned, and no lockfile changed.
Registry metadata requests timed out; that is missing metadata, not evidence
that a package is malicious. Neither `v8-to-istanbul` nor `c8` was calibrated
locally. Their presence or installation would not by itself fix the measured
coverage errors.

Routine tool selection and validation fall within the authorized implementation
work. This research introduces no new user approval or human-verification
checkpoint. If Phase 7 needs a development dependency, inspect its source and
metadata, document the choice, and retain the product/runtime boundary.
Current Phase 2 retains its unchanged-lockfile requirement.

## Exact Next Actions

1. Implement the loader coverage mode and source transformer.
2. Commit the fixture and require its exact denominator plus an unexecuted-module assertion; rerun it with choose(-1) to prove the if changes to 2/2 without denominator drift.
3. Validate the selected reporting approach against the fixture and its original source identities. Default V8-to-Istanbul conversion remains insufficient without a calibrated AST-aware denominator.
4. Implement conversion, canonical merge, inventory comparison, identity filtering, empty/missing failures, reports, and calibrated thresholds.
5. Run every actual multiplayer model/state-machine/browser flow under the gate and review uncovered branches against TEST-02 through TEST-05.

This research does not claim release coverage, threshold compliance, or completion of Phase 7.

## Sources

- Node v26.7 test-runner coverage behavior: https://nodejs.org/download/release/v26.7.0/docs/api/test.html [CITED]
- Node CLI coverage include-all and threshold behavior: https://nodejs.org/api/cli.html [CITED]
- IstanbulJS V8 converter: https://github.com/istanbuljs/v8-to-istanbul [CITED]
- Local fixture: measured in an isolated temporary directory, then removed after documentation. [VERIFIED: local fixture]

## Assumptions Log

| ID | Assumption | Risk if wrong |
|---|---|---|
| A1 | An AST-aware reporting approach can meet the fixture after correct maps and explicit unexecuted-source inventory. | Select a different standard collector before production gates. |
| A2 | Strict-runner children retain NODE_V8_COVERAGE. | Fixture must prove child coverage before adoption. |
| A3 | The AST inventory categories cover project branch forms. | Expand the contract before thresholds. |

