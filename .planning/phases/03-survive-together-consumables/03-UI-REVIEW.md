# Phase 3 — Survive Together & Consumables UI Review

**Reviewed:** 2026-10-14  
**Scope:** `.planning/phases/03-survive-together-consumables/03-UI-SPEC.md` against the Phase 3 context, requirements, research, and Phase 2 UI contract.

## Verdict

| Dimension | Verdict | Evidence |
|---|---|---|
| 1. Copywriting | PASS | CTAs and all empty, error, recovery, lifecycle, target, and result states use concrete action/outcome copy. Market actions explicitly say `Buy Revival` or `Buy Flare`. |
| 2. Visuals | PASS | The contract explicitly makes the shared scene and each player’s next safe landing tile the active-play focal point, while HUD/hand material stays subdued at the scene edge. It also specifies reading order, responsive layouts, marker fallback, and lifecycle treatment. |
| 3. Color | PASS | The 60/30/10 distribution is explicit; accent use is restricted to a finite list of stateful primary elements; destructive and focus/informational colors are declared. |
| 4. Typography | PASS | The contract declares exactly four sizes (16/20/28/44px), two weights (400/600), line heights, responsive substitution, and overflow treatment. |
| 5. Spacing | PASS | The declared scale is exclusively the required standard set: 4, 8, 16, 24, 32, 48, and 64px. Material outlines, radii, frame, and minimum target are stated as non-token exceptions. |
| 6. Registry Safety | PASS | No third-party registry or blocks are used, and the registry table explicitly disallows third-party blocks. The UI safety gate is enabled in `.planning/config.json` but has no registry work to vet. |

**Status:** APPROVED

## Recommendations

No recommendations.

## Contract consistency findings

The Phase 3 contract is otherwise consistent with the locked product decisions:

- Live solo adoption is explicit: `Start together` preserves the existing course, seed, progress, timer, host character, wallet, purchases, and shelf, while `Keep playing solo` leaves the run unchanged.
- Default solo simplicity remains protected; co-op controls appear only after an explicit local-play/join flow.
- Death spills and clears only the dead player’s wallet, purchases, cards/powers, cosmetics, and consumables; ghost/disconnect retains its inventory and uses reclaim rather than a death path.
- The HUD keeps the established innate power separate from `Personal revive`, with the literal 100-tile and 250-tile contexts specified.
- Revival has a bounded eligible-dead teammate picker and `Revive P{n}` confirmation; Flare presents all affected teammates and its own confirm/back flow. Invalid activation preserves charges.
- One owner-labelled persistent hand/market tree is required, with stale target, focus, confirmation, and input state cleared on owner changes.
- The shared run clock/world remains one world, board opening pauses only bounded ownership/recovery interactions, and results provide a team perch with contextual per-character contributions rather than competitive placements.
- Four seats are treated as the current working capacity (`P1`–`P4` and the full-roster copy). Race’s 500-hop / 180-second defaults are outside Phase 3 scope and are not contradicted or reset by this contract; they must remain labelled assumptions in the dedicated Race-phase contract.

Browser verification is explicitly muted throughout the visual verification matrix.
