# Further turn-mode call-scope findings

Read-only investigation after the pickup tranche. No generator, denominator or
production change is made by this finding. The TypeScript resolved-symbol audit
covers159 src files and12 targets, retains full source hashes and reports no
computed receiver access for the targets below. It supplements the graph's
previously missing edges; it does not establish complete dynamic/value flow.
See `07-03-PERSONAL-REFERENCE-AUDIT.json`.

## Candidates requiring bounded disposition review

LocalSession.transferPosition has exactly one production caller:
Relay.confirm at relay.ts263. It must remain applicable to Relay. Its exact
callable body and contained callbacks are a potential Race-only closure;
retaining the full caller inventory, ownership proof and positive-hit rejection
is mandatory before implementing any new disposition.

LocalSession.recoverySafeCells has two actual callers:
SessionRecoveryController.recover at session-recovery.ts52 forwards request.kind;
Relay.rotate at relay.ts193 passes literal personal. Both Relay58
and Race149 instantiate the default personal-only recovery controller; recover
rejects kinds outside its allowed list before planning/calling recoverySafeCells.
Only Survive installs the broader revival/flare controller. This suggests precise
flare-only conditional operands and the if-kind-flare body at session.ts816–828
as candidates in both turn modes. Keep the method entry, personal-safe-cell
search, occupancy, wave, water, vehicle and mob checks. Living-anchor sorting
remains relevant in Race. Do not remove all recovery merely because items differ.

Before mapping any candidate, finish constructor/policy assignment and escaped
receiver/value-flow review against the complete pinned source set. Prove exact
AST ranges and all counters, retain guard/crossing/unknown locations, add negative
controls and reject any actual excluded hit. Existing source pins/floors stand.

## Crucial retained path: safePlacement during acquisition

It is incorrect to infer that closed rosters make safePlacement unavailable.
LocalSession.stage calls prepareAdmission while active is false, before
mode attachment. prepareAdmission931 calls safePlacement and constructs each
secondary seat. Its road/river/mob/occupied-boundary checks can therefore execute
while adopting an existing live solo course. Reclaim978 is another caller where
the installed mode permits relocation. Keep this helper and its callbacks.
Target actual safe adoption/reclaim scenes when covering those conditions.
