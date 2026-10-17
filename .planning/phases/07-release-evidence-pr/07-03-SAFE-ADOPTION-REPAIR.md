# Valid admission plan rejected by secondary construction

Pre-edit ownership review. Session source bf1d7699 at802ecfb. The intended
repair owns only SessionPlayer's optional initial placement and admitPlan's
constructor argument. No mode-ID branch, RNG draw, grid normalization, recovery
change or new game object is needed.

## Actual failure

Whole ordinary matrix /tmp/down-to-duck-safe-adoption-ordinary.log exits1:
19 gameplay cases pass, both added river cases throw, and the aggregate route
hook consequently observes19 worlds instead of21. Road/rail cases pass.
The actual Relay/Race factory adopts a live river with supported primary at0;
nearby integer cells±1/±2 are unsupported, while -3 is a safe distinct platform.
LocalSession.prepareAdmission finds that safe plan through safePlacement.
admitPlan then constructs SessionPlayer before assigning the plan's position.
That constructor independently searches only±1/±2 around the host and throws.
The valid plan is never used. No fabricated claim, direct placement planner or
mock coordinator supplies the failing behavior.

## Smallest generic repair

Pass the already validated private admission plan position into the secondary
constructor. Initialize its coordinates from that position, retaining the old
fallback search when no plan is supplied. The primary facade and existing direct
constructor call signatures keep their defaults. Preserve the final admitPlan
assignments, all lifecycle/economy/character initialization and every existing
assertion. Planner authority already owns hazard/occupancy/geometry selection;
construction must not run a conflicting search before accepting it.

Require unchanged road/rail tests, supported fractional drift, first real hops,
bench resource isolation and immutable results in both modes. Keep the failing
log. New current-source identities require explicit source/caller/DEV review,
not automatic hash regeneration or changed-source counter merging. Full release
coverage and remaining conformance/visual/final gates remain open.


## Post-edit source review

The retained RED is2b64cdd. The repair adds only an optional constructor
placement, initializes anchorY/spawn from it, and supplies the already validated
private plan in admitPlan. Ordinary55/55 passes, including all21 matrix cases.
The original15 case bodies are unchanged; only total counts and an optional
pre-acquisition fixture hook advance. The six new lifetimes use real factories,
initial plan selection, paused/live clocks, supported carry, first hops and
terminal results. Arranged obstacles and resting mobs are component fixtures,
not claimed director spawns or public-input journeys.

The18-target current compiler audit confirms three SessionPlayer constructor
sites: Game220 and stage685 construct primary facades and return before optional
placement logic; admitPlan936 supplies the validated placement. Both admitPlan
callers use prepareAdmission's frozen safe plan. No extra RNG draw, planner call,
handler invocation, gameplay tuning, state reset or placement normalization is
introduced. Existing primary aliasing and direct constructor fallback remain.
All158 other source files (including the declaration) retain their old hashes.

The changed optional position does not affect the default personal-only recovery
controller, transferPosition's sole Relay caller, Game frame/receiver closure,
or the ten unused DEV APIs. The full disk/canonical source guard advances only
after this review. Personal Flare/Race-transfer dispositions remain the precise
bounded review in PERSONAL-CALL-CLOSURE; no constructor fallback exclusion is
added. The stale old source pin was observed rejecting the changed source before
advancement. Historical session schemas/counters remain distinct.

Reviewed transition:

- sourceBefore: `bf1d769947cd7e251d47957abdc4238f36ab4583fd5f5d32d3900e7f4c39f16c`
- sourceAfter: `399fb31a96ca12befaae95b992951a348f53259071f18f0c59967d39f8c3e3e9`
- inventoryBefore: `153de8d17a4715b118bdcbf5d813406b35dd44133a0572dc73a37a5e6e9fe7a1`
- inventoryAfter: `b550759a82d954b9d3572690179ebb0071a182843381dc23a84e697e6bc62583`
- developmentBefore: `f6a5623fb9db48fc1449b8b30400b6ad875a0e422f7ce6e94dcbf41c316276ba`
- developmentAfter: `52f2d4b828986b2cf0ae731b5a3d904040fdfea319f0a3a4685985f502a6ecec`

## Completed verification

Seven project gates and all nine whole current-source cohorts pass. Exact IDs,
manifest hashes, commands, snapshots and preservation checks are embedded in
SAFE-ADOPTION-PROOF.json. The matrix1d4cdd05 has21 actual coordinator lifetimes/
85 intervals (Relay10/36, Race11/49); its observer records17,166 shared updates,
21 worlds, zero standalone calls/violations. Normal artifactc66d9f9b and root
lock5ac are preserved, along with all56 prior Race/Relay temporary outputs and
ordinary artifacts. No test/browser process remains active.

Source-identical current data reprojects separately from older session schemas:
Relay1941/2103L641/711F2053/2812B; Race2020/2162L681/759F2287/3051B.
Relay's line/function floors pass, but338 branch arms remain; Race needs3
functions/307 arms. The precise personal/transfer scope reduces denominators by
11L17S5F22B and15L24S8F31B respectively on the same current raw payload, with
zero numerator change. Raw/global/per-file counters and every floor remain.
The full enforcing report, semantic ledger, conformance manifest/wire/lifecycle,
normal visuals/clause evidence and final gate/PR remain required. CLI conformance
still5 pass/0 fail/5 unmeasured. No release acceptance is claimed.
