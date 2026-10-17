# Pause navigation coverage

The existing opaque-iframe `tests/pause-game-layout.mjs` now verifies backward
reader paging, both Tab directions, all four SDK navigation directions, and
confirm after pointer inspection leaves no button focused. Paging restores the
exact previous text; focus navigation leaves the simulation clock frozen.
The inherited 24 frame/theme cases, target sizes, complete reader text, theme,
resize, collection return and resume assertions remain intact.

Two failed attempts exposed test assumptions, not product defects: a 320×560
reader had only one enabled button, and a redundant Back action resumed an
already restored home panel. The corrected test uses a genuinely paged 240×240
reader and removes that redundant action. Retained logs:

- `/tmp/down-to-duck-07-03-pause-ordinary.log` (76851 exit1).
- `/tmp/down-to-duck-07-03-pause-ordinary-green.log` (74106 exit1).
- `/tmp/down-to-duck-07-03-pause-ordinary-final.log` (ordinary pass).
- `/tmp/down-to-duck-07-03-pause-canonical.log` (canonical pass).

Corrected chain44546 exited0. Ordinary strict1/1 passed in15833.305ms;
canonical strict1/1 passed in56858.729ms. Browser audio was muted. The ordinary
wrapper restored the exact original artifact set/bytes and checked normal dist
before/after. The canonical runner preserves artifacts separately.

Canonical run `8e0b59eb-b175-43ad-b4e0-5669d30899e9` uses the existing full-job
alias `pause-12` and one actual browser payload. The pause source SHA256 remains
`e0f7d449c755077a98cf411b93fd209be8f8fbacbb21d005cd8e12c333d93dc2`.
After source-map transformation, statement/function/branch schemas all match
the immutable initial-full report.

Focused pause coverage is90/95 lines,16/17 functions and75/88 branch arms
(94.73%,94.11%,85.22%). Six previously zero arms now execute:
19/0=1,20/1=1,26/0=4,37/1=2,38/1=3,40/1=1. The one previously covered arm absent
from this focused run remains visible in the original full report; no counters
were added together for this measurement. The focused file exceeds its ordinary
90/90/85 targets. Full aggregate and release enforcement remain pending.
