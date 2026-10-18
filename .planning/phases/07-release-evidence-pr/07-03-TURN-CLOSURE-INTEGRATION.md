# Relay/Race call-closure integration

Status: focused checks passed; mode floors remain open. Implements the bounded
source/state findings in `07-03-TURN-CALL-CLOSURE-REVIEW.md` (76f818f).
No production source, gameplay scenario, numerical floor or global/per-file
counter was changed by this accounting correction.

## Scope

Both modes exclude exact application-unused compatibility wrapper bodies and
the uninstalled shared-effect policy closure. Relay additionally excludes item
world installation/runtime sampling and companion debit bodies that its
`consumables:false` composition cannot reach. Schema registration, validation
and module initialization remain counted.

Race excludes successful card/pack/power bodies after its actual inventory
eligibility guards, and the Survive item-use fallback after its installed
tactical policy's unconditional return. Entry points and rejection guards stay
counted, including legacy buy, preview, claim, skip and sell requests. Cosmetic
transactions, personal recovery, common debit and tactical policy execution
remain applicable. No whole inventory, Game or market module is removed.

The kept controls explicitly cover `Game.update/openMarket/closeMarket`,
`resetSharedWorldEffects`, `syncSharedWorldEffects`, the absent-extension
snapshot/update guards, and all schema bootstrap. Caller authority pins cover
main/render, Survive/Race-items, co-op market, eligibility and level generation;
missing, duplicate or changed authority fails before counter evaluation.

Istanbul's empty absent-else location receives parent proof only for arm one
of a two-arm `if` whose exact source AST has no else and lies wholly inside an
already reviewed unavailable range. Unknown kinds, partial/extra location keys,
shifted or crossing parents, explicit else, arm zero and reachable guards stay
counted. Positive execution in any excluded kind rejects the projection.

## Verification

Session90026 exited0:21 accounting/attribution controls, then all nine unchanged
turn-mode cases and29 intervals. Logs:

- `/tmp/down-to-duck-turn-closure-controls.log`
- `/tmp/down-to-duck-turn-closure-canonical.log`

Canonical run `28985d3f-faff-429f-b879-f6a85532b101` has one independent Node
parent. No excluded positive counter contradicted the reviewed closures.

| Mode | Raw L / F / B | Applicable L / F / B |
| --- | --- | --- |
| Relay | 1630/2350 · 551/817 · 1663/3196 | 1630/2159 · 551/718 · 1663/2891 |
| Race | 1675/2303 · 584/818 · 1819/3253 | 1675/2222 · 584/769 · 1819/3139 |

Covered counts are identical to the preceding nine-case canonical run. The
applicable reductions are67L/34F/119B for Relay and59L/34F/68B for Race.
Initial control attempts contained a test syntax typo and exact-fragment lookup
mistakes; these were corrected without changing product behavior or assertions.
They are tooling failures, not product RED evidence.

## Remaining behavior

`/tmp/down-to-duck-mode-union-current.json` is a scheduling diagnostic from
separately validated runs, with exact source/map/schema checks per file. It
rejects changed source from the union (the initial session source differs).
It is not a fresh enforcing report. Current mode witnesses lack later shared
traffic/platform and mob encounters; existing Arcade fixtures clear the early
course. Those actual world interactions are the next behavior to verify.
