# Coverage Calibration for Phase 7

**Researched:** 2026-10-14  
**Scope:** temporary Node v26.7.0 fixtures only. No application, test, package, lockfile, build, or browser artifact was changed.  
**Confidence:** MEDIUM — Node behavior and the source transform were measured locally; no standard converter is installed or calibrated in this repository.

## User Constraints (from 07-CONTEXT.md)

### Locked Decisions

**Mode:** Complete the authorized multiplayer milestone and open its review PR.  
**Dependencies:** Verified Phases 1-6; all mechanics and interfaces implemented.

Measure production coverage for rules, shared simulation, ownership, controller and keyboard state machines, all three modes, personal revival, consumables, lifecycle and results. Set and enforce explicit high thresholds, review every meaningful uncovered branch, and include adversarial boundary/ordering cases. Do not raise percentages with tests that merely repeat implementation details. Preserve correct source maps through glob expansion, inventory expected production modules, calibrate the executable-line denominator, and fail on missing source coverage.

### the Agent's Discretion

Select the collector, report format, converter, source-map transform, module inventory, and calibration fixture that meet the locked evidence rules.

### Deferred Ideas (OUT OF SCOPE)

None stated in 07-CONTEXT.md.

## Project Constraints (from AGENTS.md)

- Graph-first code discovery was used for the source loader. [VERIFIED: codebase-memory-mcp]
- Preserve the napplet boundary and complete the documented verification commands when implementation begins. [VERIFIED: AGENTS.md]
- This is documentation-only research. Phase 7 still must run type-check, build, guidance, and conformance before completion. [VERIFIED: AGENTS.md]

## Recommendation

Use raw V8 coverage only to collect execution evidence. Do **not** use Node native mapped LCOV line/branch/function percentages or its threshold flags as the Phase 7 acceptance denominator. [VERIFIED: local fixture]

In coverage mode, compile the real TypeScript sources with a source-map-preserving eager-glob transformer, collect all child-process V8 JSON through NODE_V8_COVERAGE, and convert/merge it by canonical original TypeScript path with a vetted V8-to-Istanbul converter. Validate the converter with the exact fixture below before enabling thresholds. The AST inventory validates module/function/branch denominators; it does not instrument product code. [CITED: https://github.com/istanbuljs/v8-to-istanbul]

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
4. At a human checkpoint, approve a standard converter. The official V8-to-Istanbul project documents loading original source, applying V8 function/range coverage, and returning Istanbul coverage. [CITED: https://github.com/istanbuljs/v8-to-istanbul]
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

## Package Legitimacy Audit

| Candidate | Evidence | Seam verdict | Disposition |
|---|---|---|---|
| v8-to-istanbul | Official repository documents V8-to-Istanbul conversion. [CITED: https://github.com/istanbuljs/v8-to-istanbul] | SUS: the legitimacy seam could not retrieve registry metadata during this research. | Do not install from this document; human checkpoint must repeat registry/source/postinstall checks. |
| c8 | Conventional CLI candidate. [ASSUMED] | SUS: same unavailable metadata. | Do not automatically install; compare it with direct conversion after verification. |

No dependency was installed, no version pinned, and no lockfile changed. [VERIFIED: local repository state]

## Exact Next Actions

1. Implement the loader coverage mode and source transformer.
2. Commit the fixture and require its exact denominator plus an unexecuted-module assertion; rerun it with choose(-1) to prove the if changes to 2/2 without denominator drift.
3. At checkpoint:human-verify, validate a converter package, including registry identity, repository, dependencies, and postinstall behavior.
4. Implement conversion, canonical merge, inventory comparison, identity filtering, empty/missing failures, reports, and calibrated thresholds.
5. Run every actual multiplayer model/state-machine/browser flow under the gate and review uncovered branches against TEST-02 through TEST-05.

This research does not claim release coverage, threshold compliance, or completion of Phase 7.

## Sources

- Node v26.7 test-runner coverage behavior: https://nodejs.org/download/release/v26.7.0/docs/api/test.html [CITED]
- Node CLI coverage include-all and threshold behavior: https://nodejs.org/api/cli.html [CITED]
- IstanbulJS V8 converter: https://github.com/istanbuljs/v8-to-istanbul [CITED]
- Local fixture: /tmp/down-to-duck-coverage-calibration.xjZXL5 [VERIFIED: local fixture]

## Assumptions Log

| ID | Assumption | Risk if wrong |
|---|---|---|
| A1 | A vetted converter can meet the fixture after correct maps and zero-script synthesis. | Select a different standard collector before production gates. |
| A2 | Strict-runner children retain NODE_V8_COVERAGE. | Fixture must prove child coverage before adoption. |
| A3 | The AST inventory categories cover project branch forms. | Expand the contract before thresholds. |

