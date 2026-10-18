# Canonical turn ownership evidence

The test-only Relay/Race recorder now checks actual same-module Game,
LocalSession, SharedWorld and SessionPlayer instances; exact canonical exported
definition identity; the complete source-pinned frozen base-rule snapshot; and
live world/session/player/roster ownership. Captured participant, seat, character
and primary identity must stay stable. Device changes and roster ordering remain
allowed. Failed acquisition, action or observation permanently invalidates the
recorder. Serialized intervals independently require the canonical snapshot and
all ownership checks. No production source or applicability rule changes.

The initial negative control failed against eb81095 with “Missing expected
exception”: a copied same-name definition was accepted. The corrected controls
reject copied/changed rules, custom callbacks, detached worlds/players, stopped
sessions, changed participants/characters and classes from another module load.
A session stopped during an action remains invalid even if restored afterward.
These controls use synthetic calibration counters, never release percentages.

Final tooling plus ordinary matrix: **105 passed, zero failed/skipped**.
Actual canonical matrix: **13 passed**, run
`2079dfd3-3a66-41c8-8280-ff330915f1c1`, exec63485 terminal0. Thirteen actual
coordinator lifetimes/49 intervals bind one independent Node parent: Relay6/23,
Race7/26. All85 non-acquiring endpoint observations carry valid evidence.
The recorder reads roster data directly when capturing identity so that it adds
no new production getter invocation. Existing assertion calls across six affected
suites are byte-identical. Type-check, build and guidance pass. Conformance
remains five passes, zero failures and five unmeasured checks.

The normal build, root lock, suite manifest and frozen production hashes are
unchanged. Adjacent JSON retains exact commands, identities and preservation.
Five reused suites now supply authority from their own loaded graph; their whole
mixed browser jobs still require recollection. Historical turn sidecars without
this evidence are historical measurements and cannot satisfy the new validator.

This proves boundary ownership, not all transient callback or receiver flow.
Setup/reset/pagehide/terminal and re-entry closure remains required before any
new applicability disposition. No denominator changes, new coverage gains or
release acceptance are claimed. Mixed-input aliases remain proposal-only.
