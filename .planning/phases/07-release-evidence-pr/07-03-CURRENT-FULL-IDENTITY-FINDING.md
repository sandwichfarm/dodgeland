# Current full collection: independent identity comparison

Full refresh session68195 terminated1 after14 PASS jobs, run
`8608d4a2-db6d-49a8-bd0f-fbd2b324be26`, frozen head759c9a9.
Log `/tmp/down-to-duck-07-03-current-full.log` retains the failure.
Wrapper `/tmp/down-to-duck-07-03-current-full.py` restored125 prior temporary
outputs and verified unchanged normal dist and root lock. The initial pinned
6802... report remains intact. This partial run supplies no full-report or
floor acceptance.

`tests/consumable-world-boundaries.test.mjs` passed13/14. Its snapshot-read
purity comparison creates two actual independent sessions. The retained diff
shows only their session prefixes330/331 in recovery grant IDs, participant IDs
and participant aliases; all suffixes and other observable values match.
The earlier lifetime-isolation repair intentionally makes these prefixes
distinct, so comparing them literally is an obsolete test assumption.

Root owns the narrow test correction: retain both actual session IDs, assert
they differ, require each compared grant/participant/participant-alias identity
to belong to its own session, then normalize only the session prefix in those
three known fields. Grant sequence, anonymous/seat suffixes, alias namespaces,
character/device aliases, inventory generations, claims, recovery deadlines,
health, wallet, positions and statistics remain in exact deep comparison.
No product or numerical policy change is proposed.

Ordinary Node-only preflight27789 ran whole registered Node-role jobs. The
corrected boundary suite passed14/14. The first52/66jobs passed, including the
immutable solo parity matrix, before Survive admission passed17/18 and exposed
one more obsolete literal cross-session recovery comparison. Retained log/state:
`/tmp/down-to-duck-07-03-node-preflight.{log,json}`. Normal dist/root lock preserved.
Mixed/browser jobs remain obligations of the full collection.

The Survive case compares recovery after rejected-then-successful admission
against an independent successful-only control. Only session prefixes10/11
in grantId, participantId and participant aliases differ. Its case-local
correction verifies independent lifetimes and own-session prefixes, normalizes
only those prefixes, and retains exact grant/participant/alias suffixes, alias
ordering, character/device aliases, recovery charge/deadline, safe position,
frontier, generation and protection comparisons. Original rejected-admission
world/owner nonmutation checks and both successful admissions remain unchanged.

Continuation85096 terminated0: all14 remaining whole jobs passed, including
Survive admission18/18. Combined with the predecessor's52 unchanged successful
jobs, all66 registered Node-role jobs now pass. Log/state
`/tmp/down-to-duck-07-03-node-preflight-resume.{log,json}` links the failed
predecessor; no earlier successful job was needlessly repeated. Both runs
preserved normal dist/root lock and registered prior artifacts. The immutable
solo parity matrix remains part of those whole successful jobs.

Independent read-only review accepted both actual diffs: a rejected admission
that consumed a grant would still change its suffix and fail. Foreign identities
fail before normalization; aliases, ordering, nonidentity fields and original
atomicity assertions remain exact. No product behavior or numerical policy changed.
`git diff --check` passes. This is ordinary test evidence, not mode coverage or
release acceptance. Next evidence is a fresh complete current-source cohort;
failed8608... and the initial pinned6802... report remain intact.
