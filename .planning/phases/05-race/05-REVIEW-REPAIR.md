# Phase 05 review repair — CR-01

CR-01 is repaired on source `2da5dd9`, pending independent re-review. Execution used the authorized generic GSD executor fallback. The independent review report is unchanged; no phase-completion claim is made.

## Diagnosis and narrow change

The controller direction and action callbacks checked gameplay `canAct` before the visible terminal result board. Race correctly closes gameplay authority at settlement, making its existing result branches unreachable. `src/main.ts` now routes the visible common result board first; all terminal actions return without reaching movement, inventory, departure or other gameplay handlers. The Relay-specific result path remains its existing handler.

No router, lease, participant, economy, world, result, CSS or layout policy changed. `GamepadRouter` still validates assigned device leases and observes context transitions before dispatch. Its existing edge seeding suppresses confirm held through settlement. Unknown controllers cannot operate the board. The fix distinguishes terminal UI access from gameplay eligibility without reopening the latter.

## Retained RED and production proof

- `15c1c72` committed the failing actual-input regressions before source edits.
- **95428 exit 1**, `/tmp/down-to-duck-05-review-repair-retained-red.log`: both finish and timeout/DNF fail at fresh assigned-controller direction paging. Prior held-settlement and unknown-controller checks pass. Initial22808 also exposed a test expectation capitalization error, corrected before the retained RED.
- **29948 exit 0**, `/tmp/down-to-duck-05-review-repair-green.log`: build plus both repaired Race cases **2/2**.
- **50415 exit 0**, `/tmp/down-to-duck-05-review-repair-all-controller-green.log`: all four assigned-controller cases **4/4**.

The built opaque iframe reaches finish through real keyboard/controller movement and timeout/DNF through visible departure plus elapsed active time. It checks held confirm cannot dismiss, unknown controller cannot act, fresh direction focuses paging, fresh confirm opens participant details, navigation reaches Race again, and only fresh confirmation retries. Position, earned distance, health, wallet/cards, world time and the frozen result remain unchanged while browsing and sending non-result actions. The old result remains unchanged after retry.

Shared-mode checks reach actual traffic death and personal-offer resolution through real input. Relay controller paging/retry and Survive Seed/Back/retry pass. Survive has one remaining participant after P1 departure, so its Next control is correctly disabled; the test exercises the available result controls instead. Earlier shared fixture runs34497/50535/49006/14615/47085 are superseded: they were corrected to use live-solo adoption, stable seat lookup after departure, deliberate resume, the actual Relay result root, and available Survive controls. No production changes followed the routing reorder.

## Final terminal verification

**86987 exit 0** on frozen `2da5dd9`, complete log `/tmp/down-to-duck-05-review-repair-final.log`; exact command script `/tmp/down-to-duck-05-review-repair-final.sh`:

- `pnpm type-check` and `pnpm build`.
- Strict shared group **73/73**: session input, gamepad, local-session controller runtime, Survive HUD controller/results UI/seed, Relay results and Race results.
- Full `node tests/race-runtime.mjs` **16/16**, including the four new controller cases and existing item/owner/lifecycle/mute/motion journeys.
- Guidance **6/6**, conformance **5 pass / 0 fail / 5 unmeasured**, immutable-oracle lockfile diff passed.

Accepted unchanged-source entry19289 remains the complete prior exact Relay/Race gate evidence on62f9958. This repair changes routing only; no simulation or layout change justified repeating the inherited full gates or420-capture matrix. The affected shared input/result and full Race runtime paths were rerun above.

All automated browsers used `--mute-audio`. Boundary assertions report no page errors or external requests; physical controllers remain unmeasured. No installs/dependencies, lockfile edits, oracle repin, preview5175 changes or product test hooks/private simulation writes. Original oracle: `a310a81ed6c76df4b265c9012c23b8c83f4802e5`. Existing large-chunk warning remains. No executor process is active; independent re-review/verification is next.
