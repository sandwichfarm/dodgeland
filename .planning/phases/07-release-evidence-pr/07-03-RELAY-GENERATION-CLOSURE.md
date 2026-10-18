# Source-profile transition after session generation timing repair

This is a deliberate reviewed transition from Game04d7556c to8836f978, not
permission to re-pin historical reports. RED bcd79e7 and repair b2ce1e8 bind the
actual behavior. RELAY-GENERATION-PROOF records the16-case regression,185 nearby
passing tests and required normal gates. The original numeric floors remain.

Fresh artifacts/release-coverage/relay-generation-effects/ast-delta.json compares
all110 Game callable bodies: only Game.move differs. The176 tracked src surfaces
are compared against RED; only src/game.ts differs. Of these159 are TypeScript
sources and158 are executable modules. Source-transition.json binds these exact
counts and the unchanged rootlock. Fresh resolved reference audit covers159 source
files and371 members/functions. compare-references.py verifies exactly one added
SharedWorld.sessionActive read and its identifier, at the new Game.move guard;
the other370 resolved target reference sets match ignoring coordinates. No new
method caller, extraction, dynamic Game access or import edge appears. This is
resolved-reference evidence, not a blanket dynamic/value-flow proof.

The four ensureRows callers are Game constructor, Game.move, LocalSession.update
and DEV teleport. The move call is now conditional on no active session. Shared
sessions retain LocalSession.update generation after policy refresh. The new
condition adds no staging/session construction, standalone Game.update or unused
wrapper call. Existing turn/Solo/DEV closure dispositions therefore retain their
meaning. Every body they exclude is byte-identical; source/AST coordinates are
recomputed from current text. The original complete closure review remains
required and this exact one-body delta is its narrow addendum.

All new Game.move guard, call and branch sites remain counted in both turn and
both solo profiles. Do not exclude the difficult arm or alter raw/global/per-file
maps. Positive synthetic control hits at each mapped new site must be accepted
and counted. Those controls calibrate the tool, never provide gameplay evidence.

Builtin mode-rules.ts and its two fixed valid composer calls are unchanged;
Game.move calls no composer or authoring code. Its caller inventory identity may
move only with this reviewed transition. DEV's ten unused callable candidates
remain byte-identical and gain no caller or alias; the added guard reads the
existing world flag. No config/build target/domain surface changes.

Current executable158-source sorted pair digest:
97f037fa041e738d931c54fb47f98d85632b8c0e4eaa7275f500e9c300787bd6
Current DEV sorted path/sha256 object digest:
d1b631456c6a698df30488f1a64f5fcb1c5d29346d499e40982dee3ba64b2b89

Deliberately update only Game source pins in turn/solo, the caller pair identity
in turn/builtin and the DEV authority object identity. Keep all source selection,
exclusion logic, immutable oracle, package lock and numeric floors unchanged.
Then run all profile/tool controls and the new canonical16-lifetime cohort.
Previous complete19-cohort union and74/98 gaps are historical after this repair;
never merge changed Game counters or relabel those source identities as current.
Final current full collection, semantic review, conformance, visuals and PR are
still required. This addendum does not assert any mode floor passes.

## Verified current checkpoint

All108 tool controls pass, including two new mapped-site controls. The full
command/import audit resolves155 entries,162 closure paths,167 production jobs
and ten control paths. Fresh canonical e99b8e37-a0f9-482a-9161-9cb07bc36f8c passes
16/16 with one independent Node parent and48 actual component intervals across
16 Relay lifetimes. Current complete inventory byte SHA is
f46f696b03eaea5e765d8499f6602fb4028ee7733c1b172ca4b85c6a885c89e2.
This single cohort is not a mode-floor claim. Its applicable Relay totals include
the new counted guard:2104 lines,715 functions and2763 branches. It does not
establish the uncovered gap across the full current suite. Normal e980/rootlock5ac
remain exact; all test/build/collector handles used here are terminal0. No PR is
open. PROFILES-PROOF binds current files, logs and attribution bytes.
