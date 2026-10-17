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
