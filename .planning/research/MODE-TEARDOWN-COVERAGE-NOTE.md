# Teardown attribution preparation during current full collection

Read-only inspection,2026-10-17. No source,test,tool,scope or floor change.
This is not a completion or unreachable-code disposition. The terminal full
report is still required before choosing a measured gap.

The current turn-model recorder's observe() requires both world.sessionActive
and the actual LocalSession.active field to be true for every post-acquisition
observation,including settled. Its emitted ownership repeats both true flags.
The attribution validator accepts only acquiring/playing/paused/pending/settled
and requires those same true ownership fields for non-acquiring turn endpoints.
A finished mode can remain active while its result is immutable;stop() changes
the session's active field to false,so an interval ending after a real stop will
be rejected by this recorder. That measurement boundary is not itself evidence
that stop is unreachable or irrelevant to a mode's lifecycle.

Current LocalSession.stop sets active=false,disposes/removes the co-op market,
clears shared-effect policy/resolution,releases the world extension and removes
the consumable world. It does not reset world.sessionActive to false. Do not
fabricate that reset or an active-owner flag to force attribution. The existing
159-source/371-target resolved audit still matches every current source hash;
it resolves stop calls from LocalSessionStage.cancel,main.dispose/reset and
main.pagehide. Those real application cleanup paths remain globally/browser
accountable. No blanket dynamic/value-flow closure is inferred from this audit.

After the full report,inspect the real teardown assertions and exact counters
before deciding whether additional behavioral proof or a narrowly justified
lifecycle-boundary measurement is needed. If extending measurement,retain real
factory/module/world/roster/result identity and the actual stop call;preserve
negative checks rejecting forged inactive owners. Never label arbitrary post-
stop solo construction or getters as former-mode gameplay. A new lifecycle
phase/contract needs explicit controls and honest scope;it is not permission
to relabel the frozen full run or omit cleanup branches simply to hit a floor.

Source basis:tools/release-coverage/turn-model-attribution.mjs observe,
tools/release-coverage/attribution.mjs observation validation,
src/session.ts LocalSession.stop and LocalSessionStage.cancel,
src/main.ts reset/disposal and pagehide; current source Game8836,Sessione90,
main33be. Existing resolved audit is in relay-generation-effects/reference-audit.json.
