# Existing turn-test attribution integration

Historical focused result: ordinary50/50, controls17/17 and canonical three-job collection
passed on88994. The implementation records five actual lifetimes/twelve intervals;
full release floors remain open. Preparation notes below retain their scope.

Current registration supersedes that historical five-lifetime snapshot. The
later Race-item expansion (759c9a9) records23 actual Race lifetimes/70 intervals;
its canonical proof is `eb412c10-945b-446c-92bc-923142857c05`, documented in
[turn item evidence](07-03-TURN-ITEM-OWNERSHIP.md). The exact full and turn-reuse
job definitions now expect Race-items23/70, Race-lifecycle1/2 and
Relay-boundary3/6:27 component lifetimes/78 intervals across those three jobs.
Terminal full51a4bea2 independently validates those27lifetimes/78intervals
against three distinct Node parents:70Race-item,2Race-lifecycle and6Relay-boundary
intervals. Each job has23,1and3distinct acquired session identities respectively.
The retained focused bb6517... report remains five/twelve and is not relabelled. The separately measured public Relay market interval is not added
to these component totals. No production, test or metadata edit accompanies
this documentation reconciliation.

Owned scope: `tests/relay-boundary.test.mjs`, `tests/race-items.test.mjs`, `tests/race-lifecycle.test.mjs`, new `tests/turn-reuse-attribution.mjs`, and selected job metadata in `tools/release-coverage/suites.json`. No production, policy, source pin, shared recorder API or runner change.

The adapter uses the existing `createTurnModelRecorder.acquire` exactly at each selected test's real coordinator factory expression. It consumes the existing source-loader graph's factory/class exports. Game construction, imports and terrain arrangement remain outside acquisition. It captures complete parent counters in a final suite `after`, after later nonattributed tests have run; it never substitutes the last selected test's snapshot for the parent. Existing collector validation must establish exact equality with the independently captured Node parent. Only nonoverlapping recorded intervals receive mode credit. Missing or duplicate lifetime completion fails closed.

## Historical selected scopes in bb6517

- Relay fatal traffic/wave/mob boundary cases: three lifetimes, each acquiring→playing then playing→pending. Existing health/cooldown, terrain, wave and mob arrangements remain outside action intervals. Original dispatch, fixed updates, death/offer/boundary/duplicate-generation assertions remain unchanged and inside the real action interval.
- Race owner-shop case: one lifetime, acquiring→playing and three playing→playing intervals: insufficient wallet; exact price; capacity/wrong owner/replay/legacy consumable rejection. Existing wallet additions and market score setup remain between/outside intervals. The forged gameplay-stock loop and its assertions still run unchanged but remain global-only, because it interleaves fixture offer/wallet mutations. No seed sampler or generic catalogue helper tests receive mode credit.
- Race personal recovery249/250/251 case: one lifetime, acquiring→playing then playing→playing. Meadow/wallet setup remains outside. Existing actual death, owner-only economic clear, accepted revival and real earned-hop/backtrack assertions remain intact in the action interval. No extra terminal transition is invented.

Total planned attribution: five actual lifetimes / twelve intervals across three whole existing jobs. New focused `turn-reuse-03` copies the exact full jobs and preserves required Node/browser realms and original artifact patterns; the full job inventory is unchanged. Each selected full-job copy receives exact lifetime/phase metadata. The adapter is classified as an imported control helper, not a new production job.

All other test cases continue to execute and contribute only their established global/other evidence. The mixed Race lifecycle worker still runs its original browser cases; its selected Node lifetime does not borrow browser counters. Canonical definition provenance is limited to inspected unchanged Game/coordinator factories; this patch does not claim a newly generalized canonical-definition validator for turn modes.

## Historical preparation before verification

The initial candidate was reviewed before the serial ordinary/control/canonical chain. Existing assertions were wrapped in place rather than copied or removed. Root owns STATE and uncovered ledger; those files are outside this executor's scope.

## Historical reviewed execution

Root accepted the candidate and required stale-wrapper hardening: completed lifetime acquire/interval calls now reject before dispatch, and duplicate finish still rejects. New tooling-only `tools/release-coverage/turn-reuse-attribution.test.mjs` proves missing completion, overlapping lifetimes, stale completed wrappers after another lifetime opens, and successful completion. No recorder API changes.

Serial chain `88994` terminated exit 0. Exact command sequence is preserved in `/tmp/down-to-duck-07-03-turn-reuse-chain.py`, log `/tmp/down-to-duck-07-03-turn-reuse-chain.log`:

1. Strict whole Relay boundary:16/16.
2. Strict whole Race items:18/18.
3. Strict whole Race lifecycle:16/16 (including original browser scenarios).
4. Attribution and adapter controls:17/17.
5. Canonical whole `turn-reuse-03 --report-only`:all three jobs exit0,18+16+16 cases, run `bb6517fe-4359-47ed-9d42-7f291fb8604f`.

The canonical report contains exactly twelve component-model intervals bound to three distinct Node parents, five coordinator lifetimes; four additional actual browser realms remain browser evidence, not copied into turn intervals. Independent parent equality and all interval lifetime/phase/schema checks passed. Reports: `artifacts/release-coverage/turn-reuse-03/attribution.json` and run directory under that group. Raw/applicable counts (lines/functions/branches):

| Mode | Raw | Applicable |
|---|---|---|
| Relay |749/2350;253/817;684/3198|749/2159;253/718;684/2893|
| Race |1041/2303;388/818;1131/3255|1041/2222;388/769;1131/3141|

These are focused totals, not marginal gains or full-floor acceptance. Current session source identity includes the separately approved pickup lifecycle repair; old session counters are not interchangeable.

The wrapper backed up and restored the exact13 original `/tmp/race-05-03-*.png` files/set, archived generated outputs and checked normal `dist/index.html` raw SHA-256 unchanged at `a34fd21258f80302593c584f5a9566f7511af49798c0b0cac6dacc1beb478bc1`. Preservation manifest/generated files: `/var/folders/g8/w4qrj6k57hx_3lg6ltc1k70w0000gn/T/down-to-duck-turn-reuse-b09ulylq`. Runner's encoded Buffer normal-artifact hash is separately `45e48a5c3f8ffe19ebaf6a9aa6e818392101aa9eb669b5cdd78c011b87b2aeca`; it is not the raw-file SHA.

No failures occurred in this chain. No source/policy/pin edits or commits. Runtime slot released to root and the queued development-app tooling agent; only this evidence update followed terminal success.
