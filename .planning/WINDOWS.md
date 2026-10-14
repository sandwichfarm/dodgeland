---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-10-14T23:23:28.349Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | deviation | src/game.ts |  | Scoped withSessionPlayer callback reentrancy can route nested P1 dispatch through temporary P2 binding; Plan 02-02 must replace it with permanent player/world context. | open |  | 2026-10-14T23:23:28.349Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "02",
    "file": "src/game.ts",
    "line": null,
    "description": "Scoped withSessionPlayer callback reentrancy can route nested P1 dispatch through temporary P2 binding; Plan 02-02 must replace it with permanent player/world context.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-14T23:23:28.349Z",
    "resolved_at": null
  }
]
````
