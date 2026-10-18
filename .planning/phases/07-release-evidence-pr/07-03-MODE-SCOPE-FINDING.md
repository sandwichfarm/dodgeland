# Measured solo denominator finding

Root read-only follow-up after accepted07-12 initial collection. This records a
measurement defect to reconcile in07-03, not a passing mode gate or permission to
discard missed reachable behavior. No production, test or policy change is made
by this document.

The pinned input is run `6802bfd4-2d88-4d8e-a091-9733e4423b91`, frozen
implementation `68c3f42`, with reports under its `initial-report/` directory.
Global source-mapped JSON SHA256 is
`e687885fbab40032d72eb85b9386255cecf32d7fd87897627e76a8c98844a99a`.
Global coverage passes98.50% lines/97.18% functions/89.47% branches;47 file or
stratum metrics still fail. Initial report acceptance remains separate from
release acceptance.

## Concrete branch example

`src/co-op-market.ts` has source hash
`037a96c9f9436346f06306cac74808aab5e92e205ce2c42bebb1dbd16ca24c22` and map hash
`059f2c4a97a7a2b1d22f66d5b34ebec99e624f01557f299b63f045b102788d3c`.
Source-mapped branch13 at line115 is the owner/context/action validation in
`CoOpMarketAdapter.act`. Its global counts are `[61,320]`; solo Arcade counts
are `[0,0]`. Branch14 is the five-part short-circuit condition on that same
line: global `[381,353,352,321,321]`, solo `[0,0,0,0,0]`.

The adapter is constructed in `LocalSession.installCoOpMarket` at
`session.ts:650`. Graph inbound tracing identifies the Survive, Relay and Race
attach handlers. Solo `Game` construction at `game.ts:219` creates a
`SharedWorld` and primary `SessionPlayer`, not a `LocalSession` or this adapter.
The app update loop at `main.ts:1713` separately dispatches session and solo
updates. This is a real, globally tested owner-validation branch; requiring its
execution while independently asserting absence of a session is not a missing
solo gameplay test.

## A bound showing the scope problem is material

`src/session.ts` source hash is
`76851be74d07cc3cfecf7ffff73a932b6f910caac0010308c4b644b7cc966af0`; map hash is
`110c89210523ffb8dff9639c51b998e09e2c3bfd1dd28a611681747dfd0db1a2`.
The source-mapped function IDs110 through241 (132 entries) have declaration
starts625 through1060, all within `LocalSession`. Every one is zero in the
solo Arcade interval. Graph/source inspection shows the constructor is reached
through `LocalSession.stage`, used for Local Play/admission and Relay/Race
creation. These instance methods and their callbacks require that session;
the static stage itself starts the transition to Local Play.

The existing solo function denominator is656. Even assuming every function
outside this class were executed, excluding only these132 unreachable functions
from possible *hits* gives an upper bound524/656 =79.8780487804878%, below the
90% floor. This is a deliberately generous bound, not a revised denominator or
claimed achieved coverage. It does not rely on the additional37 adapter
functions or other session-only modules. Do not infer that all of `session.ts`
is irrelevant: `SharedWorld` and the primary `SessionPlayer` are real solo
dependencies and must remain measured.

## Reconciliation requirements

Keep the original raw reports and their failures. Keep all production source
in global/per-file policy, all numeric floors unchanged, and shared authority
visible. Any mode applicability correction must list exact source/schema-bound
sites with call/state reasons; missing observed hits alone are never evidence
of inapplicability. Preserve a separate list of omitted-from-mode sites rather
than dropping them from reports. Validate identities and reject stale mappings,
unknown sites, blanket mixed-module exclusions and artificial mode relabeling.

The next mode observer must directly verify solo ownership/session absence
(`world.sessionActive`, primary player/session ownership and app stage where
available), alongside actual base/state. Current constant `kind='solo'` and
`participants=1` are insufficient as a future regression guard. Constructors
and module initialization outside a measured interval cannot be credited to
it; widen verified acquisition boundaries or label setup separately without
copying unrelated mixed-mode totals.

This correction concerns what a mode can execute. It does not waive real
uncovered inputs, stale-owner rejection, item transactions, recovery, final
results, optional-domain behavior or any original user clause. Component/model
proof and public-input journey proof must retain distinct provenance.07-03
still owns actual counter improvements and enforcing acceptance.
