# Built-in rule composition and authoring-only failures

Read-only next-step finding; no new disposition or coverage acceptance. The
current-source compiler audit covers159 src files and resolves function aliases
and every identifier reference/call for six mode-rules functions. Evidence:
RULE-AUTHORING-REFERENCE-AUDIT.json. Current mode-rules hash is cadda595a.

composeModeDefinition has exactly two production references, both direct module
initialization calls: the fixed Arcade input at170 and fixed Stroll input at171.
There are no imports, captured callbacks, aliases or dynamically supplied composer
inputs elsewhere in src. numberAt has29 calls, checkUnknown two and mergeGroup
one, all within that composer/merge flow. All17 fail calls are validation failures
inside mode-rules. The composer remains exported for code authors/direct API tests;
that does not put invalid authoring inside an actual canonical built-in lifetime.

The mode recorder already requires same-module exported canonical definitions,
complete frozen rule snapshots and stable rules/owners. Fresh acquisition imports
both built-in definitions; do not discard module initialization or validation of
those definitions. Source-pinned valid constants suggest error-only fail bodies,
fail helper and exact invalid-guard outcomes as candidates. Retain all successful
composition/merge/number/unknown-key checks, clone/freeze recursion, registration,
module allocation and both built-in definitions. Arbitrary helper-only invalid
input tests must remain globally accountable, never relabelled as Arcade/Flow or
Relay/Race evidence merely to gain mode hits.

Before implementation: prove all authoring inputs/defaults against full current
source and canonical snapshots; reconcile escaped exports/runtime entry points;
map precise statements/functions/branch arms, conservatively retaining unknown
or crossing locations. Existing whole-call inventory/source guards and positive-hit
contradiction controls are mandatory. Do not exclude generic validation merely
because it is difficult, or change any floor. New user-mode authoring callers
must invalidate the reviewed closure before it is used. Reproject source-identical
raw data separately without changing numerators; fresh enforcement still required.

isModeDefinition is deliberately outside this candidate. Its two callers are
Game's optional-definition validation and composeSessionModeDefinition; successful
registered objects remain real API behavior. Do not infer that an exported helper
is unavailable solely because the current default path omits an option.
