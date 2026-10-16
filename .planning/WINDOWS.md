---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 3
total_count: 4
last_updated: 2026-10-16T01:59:22.467Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | deviation | src/game.ts |  | Scoped withSessionPlayer callback reentrancy can route nested P1 dispatch through temporary P2 binding; Plan 02-02 must replace it with permanent player/world context. | open |  | 2026-10-14T23:23:28.349Z |  |
| 2 | 04 | deviation | src/session.ts |  | 04-03 added opt-in lifecycle guards, preserved-position reclaim and archive/placement seams; full inherited gate passed. | fixed |  | 2026-10-16T00:50:26.162Z | 2026-10-16T00:51:16.235Z |
| 3 | 04 | deviation | src/session.ts |  | 04-04 added optional immutable pre-clear and pre-depart contribution observations; canonical inherited parity and reentrancy checks passed. | fixed |  | 2026-10-16T01:23:52.104Z | 2026-10-16T01:24:03.504Z |
| 4 | 04 | deviation | src/session.ts |  | 04-05 adds optional owner/capability and paused-transaction policy to the existing market adapter; legacy Survive defaults and full inherited parity are preserved. | fixed |  | 2026-10-16T01:59:01.928Z | 2026-10-16T01:59:22.467Z |

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
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "04",
    "file": "src/session.ts",
    "line": null,
    "description": "04-03 added opt-in lifecycle guards, preserved-position reclaim and archive/placement seams; full inherited gate passed.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-16T00:50:26.162Z",
    "resolved_at": "2026-10-16T00:51:16.235Z"
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "04",
    "file": "src/session.ts",
    "line": null,
    "description": "04-04 added optional immutable pre-clear and pre-depart contribution observations; canonical inherited parity and reentrancy checks passed.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-16T01:23:52.104Z",
    "resolved_at": "2026-10-16T01:24:03.504Z"
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "04",
    "file": "src/session.ts",
    "line": null,
    "description": "04-05 adds optional owner/capability and paused-transaction policy to the existing market adapter; legacy Survive defaults and full inherited parity are preserved.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-16T01:59:01.928Z",
    "resolved_at": "2026-10-16T01:59:22.467Z"
  }
]
````
