---
phase: 05-race
reviewed: 2026-10-16T09:28:27Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - docs/mode-rules.md
  - src/audio.ts
  - src/co-op-market.ts
  - src/consumable-drops.ts
  - src/consumables.ts
  - src/game.ts
  - src/main.ts
  - src/market-ui.ts
  - src/market/run.ts
  - src/market/types.ts
  - src/race-items.ts
  - src/race-results.ts
  - src/race-ui.css
  - src/race-ui.ts
  - src/race.ts
  - src/render.ts
  - src/run-hand.ts
  - src/session-input.ts
  - src/session.ts
  - tests/market-game-fixture.mjs
  - tests/mode-authoring.test.mjs
  - tests/race-balance.test.mjs
  - tests/race-browser-fixture.mjs
  - tests/race-items-runtime.mjs
  - tests/race-items.test.mjs
  - tests/race-layout.mjs
  - tests/race-lifecycle.test.mjs
  - tests/race-ordering.test.mjs
  - tests/race-results.test.mjs
  - tests/race-runtime.mjs
  - tests/race-tracer.mjs
  - tests/session-damage.test.mjs
  - tests/session-device-lifecycle.test.mjs
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
review_execution: generic-agent-fallback
diff_base: 7f78ac7
source_commit: 62f9958
reviewed_head: e65a31e47f2baf589fbda6f8b8f77d90767e3ce8
---

# Phase 05 Race code review

## Narrative Findings (AI reviewer)

Independent standard-depth source review using the generic-agent workaround and the full `gsd-code-reviewer.toml` role instructions. This is not typed-agent execution or Phase 05 goal verification. The explicit 33-file scope comes from `/tmp/down-to-duck-05-review-files.json`. No structural pre-pass was supplied. The UI heuristic's `hasUiFiles: false` does not describe this scope: the actual Race UI, CSS, shared controls, and browser tests were reviewed.

### CR-01 — BLOCKER: completed Race blocks controller-operated results and retry

**File:** `/Users/sandwich/Develop/crossy-road-clone/src/main.ts:528` and `:560`; unreachable results branches at `:543` and `:581–584`. The Race policy closing gameplay is `/Users/sandwich/Develop/crossy-road-clone/src/race.ts:234`.

**Issue:** Both controller direction and action callbacks enforce `localSession.canAct(seat)` before routing to the visible results board. Race correctly returns false for every seat once `race.result` exists. Consequently an assigned, connected controller cannot navigate the frozen participant breakdown, activate paging buttons, or activate **Race again**, even with a fresh neutral-to-confirm edge and the correct button focused. Gameplay eligibility is being applied to read-only terminal UI. Pointer/keyboard operation hides the failure in the retained acceptance paths.

**Independent proof:** On unchanged built source `62f9958`, a muted opaque-iframe fixture used public seed `ph3-00000071-pond-s-n`, visible setup controls, a keyboard seat and an injected SDK controller seat. Finish was set to one tile. Real keyboard/controller forward inputs completed the Race, then the visible **Race again** button was focused. A neutral controller snapshot followed by a fresh confirm left the results open. Keyboard Enter immediately activated the same focused button and returned to ready setup. No private simulation writes or page errors occurred.

Durable output: `/tmp/down-to-duck-05-review-controller-results.log`, session **59701**, exit **0** (observational reproduction, not a passing product regression):

```text
before { focus: 'Race again', result: true }
after fresh controller confirm { focus: 'Race again', result: true }
after keyboard Enter { result: false, localPlayVisible: true }
errors []
```

**Fix:** Route the active terminal result surface before gameplay/transaction authority checks in both direction and action dispatch. Keep lease validation, fresh-edge consumption, terminal world immutability, and gameplay denial intact. Terminal UI must not call movement or inventory mutations. Add retained built-iframe regressions using assigned SDK controller snapshots for result navigation, participant paging, and **Race again** after finish and timeout/DNF; include a held confirm at settlement to prove the result cannot immediately dismiss itself. Assert the frozen old result and world clock remain unchanged during browsing and that retry occurs only on the fresh result action.

**Coverage explanation:** `tests/race-tracer.mjs` and `tests/race-runtime.mjs` finish with mixed inputs but retry through pointer clicks; `tests/race-results.test.mjs` exercises keyboard/pointer paging and retry. These assertions establish those interaction paths but do not establish controller operation after `canAct` closes. The layout test's focus containment check likewise cannot detect a controller callback returning before modal routing.

## Review evidence and boundaries

- Reviewed the coordinator's settled movement/fatal/finish/timeout ordering, monotonic frontier, actual-ground fog cadence, personal recovery, retained-device grace, generation-bound replacement reclaim, and immutable result ranking/history against their production call sites and retained tests. The tests distinguish arranged hazard/economy model arenas from generated-course and actual-input browser flows.
- Reviewed optional shared damage/pursuit/device/item seams, item catalogue/schema validation, own-wallet purchases, protected/stale target rejection, synchronous debit/effect ordering, accepted-asset transaction metadata, frozen interaction records, and renderer/audio observations. No additional concrete correctness or boundary finding was established within this review.
- Checked the documented multiplayer authoring example and its extraction/type/runtime test, and the exact existing gate logs rather than treating summary counts as proof of every interaction. The completed gate evidence remains valid for the assertions it runs: `/tmp/down-to-duck-05-07-verified-relay.log` and `/tmp/down-to-duck-05-07-verified-race.log` (parent-recorded session **19289**, exit **0**), including Race **76/76**, runtime **12/12**, layout **2/2 / 420 captures**, inherited Relay and Phase 1–3 checks. The controller-results defect is absent from those assertions. No broad gate was rerun.
- Source/tests have no diff from `62f9958`; `git diff --check` passes, and the lockfile diff against immutable oracle `a310a81ed6c76df4b265c9012c23b8c83f4802e5` is empty. No source, dependency, oracle, or preview-server changes were made. The only review-owned repository output is this report.
- Conformance remains **5 passed / 0 failed / 5 unmeasured**: three manifest checks, one wire check, and one lifecycle check lack evidence. Physical controllers remain unmeasured; the focused reproduction uses authorized SDK snapshots. This review does not substitute for the subsequent independent goal verification or visual acceptance.

**Disposition:** `issues_found`; fix CR-01 before shipping and independently re-review the repair.
