# Audio,scene and mob residual review

This reviews30 original current-full zero arms:audio19,soundscape5,mobs6.
All remain counted. No new playback,test execution,coverage credit,exclusion,
threshold or production change is introduced. The current full verification
continues independently. Audio browser fixtures launch with mute-audio;offline
PCM measurements are separate from subjective listening or physical hardware.

The typed audit does not resolve Soundscape's structural AudioSink.syncLoops
call to the concrete GameAudio method. Main constructs Soundscape(audio),and
Soundscape calls this.audio.syncLoops with the current scene. That source link
and actual mixer tests establish use;zero resolved concrete calls must not be
interpreted as an unused method or authorize excluding its loop bodies.

## Audio synthesis and voice lifetime:19 arms

**UI-06,INPUT-03,SOLO-01,COOP-01,ITEM-03/04,RACE-03,TEST-02/03.** Sounds
must remain contextual/per-seat,obey mute,avoid stale playback after teardown,
and never block gameplay if browser audio or an optional asset fails.

| Arms | Reviewed consequence and behavioral authority |
|---|---|
|28/0 at239|Normalizing an entirely silent buffer returns without dividing by0. Shipped synthesis tests render every cue in both packs and require finite/nonzero bounded PCM. Silent generic buffers remain safe;the explicit zero-buffer branch is not claimed executed.|
|30/1 at263|A note without harmonics uses the default reed partials. Shipped score/event builders normally specify harmonics or spread an explicit voice profile. The generic synthesis default stays counted. Actual cue/voice tests check distinct timbres,finite PCM,range and musical pitch rather than every omitted note field.|
|35/0 at270|An unwrapped note reaching the buffer end stops writing;wrapped score tails use modulo. Current authored note lengths fit their event buffers. This guard preserves generic clipping without changing a score or using a silent out-of-bounds sample. Cue tests own bounded/seamless rendered results;this exact truncation remains zero.|
|106/0 at552|The event helper's omitted extra options default to an empty object. Current calls provide authored options. The wrapper passes the actual note into the same synthesis function;its unused parameter default stays counted.|
|159/0 at789|Omitted playBuffer options default empty. Its three shipped call sites supply options/request explicitly,including renderBuiltinCue. Normal live/offline envelope,panner and gain tests exercise those actual calls. The private default remains counted.|
|165/0 at811|Repeated cleanup returns before disconnecting/resolving twice. cleanup marks finished and removes onended;stop checks finished before calling it again. Actual tests stop a scheduled voice twice and assert silence/resource release. They exercise public idempotence without giving this later duplicate guard a false hit.|
|166/0 at822|Update of a finished,fading or one-shot voice is ignored. GameAudio updates only active persistent loop records;retirement removes the record first. renderBuiltinCue exposes a voice to generic callers,so this defense is not universally unreachable. Existing loop tests prove updates preserve a source and teardown releases it;direct invalid voice updates are not claimed executed.|
|171/0 at839|Repeated fadeOut after finish/fading does nothing. retireLoop removes an active map entry before fading and records the retiring voice. Existing rapid transition/mute/unmute tests verify bounded slots and eventual disconnection;the duplicate private fade request stays counted.|
|190/0;193/0;195/0 at950/957/964|Disposal/context replacement cancels long PCM preparation at task boundaries. prepare only builds/cache PCM;it does not start sources. Missing capability,offline decode after disposal and full stop/dispose tests own supported failure/lifetime behavior. The three precise between-task cancellation checkpoints are retained counted guards,not claimed executed by an unrelated decode cancellation.|
|199/1 at982|A stale variant-preparation task skips synthesis after context replacement/disposal. The task removes its preparation entry in finally;it queues no playback. Actual variant tests verify bounded cache aliases,crossfade when ready and imported voice preservation. This disposed-before-task alternative remains distinct.|
|215/0 at1033|Omitted GameAudio.source loop defaults false. The private calls pass false for play and true for syncLoops. Imported loop seam treatment never mutates caller PCM. Tests verify imported loop copy,original PCM retention and built-in fallback;the unused initializer stays counted.|
|238/1 at1070|Prepared music preview plays only if its captured context,pack and ready buffer still match. An earlier pending-request identity check also rejects replaced/stopped requests. setBuiltin/setClips call stop,which clears the pending preview. These ordered guards prevent stale audible work;existing unlock/pack/mute/dispose tests own the public lifecycle,not every completion interleaving.|
|241/0;242/0 at1082/1087|A positive-sized private Set with no oldest voice breaks instead of looping. Both voice caps are positive and only actual voices are inserted;size cannot be at the cap with an empty iterator absent intervening custom behavior. Actual long spill tests prove the separate spill budget retains room for fatal cues;live tests prove bounded one-shot count. These duplicate collection-consistency guards remain zero.|
|256/0;257/0 at1133/1136|Loop allocation evicts retiring voices under the total budget and refuses allocation if active capacity is still full. wanted is capped at8;reconciliation removes unwanted active entries before adding new ones. An absent new wanted entry leaves at most7 matching active entries,so hitting the combined cap implies a retiring entry exists. The second active-full guard is consequently redundant in the owned synchronous map flow. Generic browser/custom context behavior is outside that bounded argument. Actual12-request/rapid-unmute tests verify8 active sources,retiring-slot release and no duplicated starts.|
|265/0 at1150|An ended loop removes its map slot only if it still owns that exact voice. Normal retire/stop already removes or clears it;this prevents a late old end from deleting a replacement with the same ID. Existing crossfade/teardown tests prove replacement/source cleanup,but the naturally ended still-current loop case remains raw zero.|

tests/sound.test.mjs covers both-pack/every-cue PCM,seam bounds,stereo/gain/rate,
horn pitches/timbres,contextual deaths,music,Firefox-compatible automation,
unlock/mute/pack/disposal,loop budgets,imported loops and decode failures.
release-sound-loader-gaps separately checks optional domains,metadata/bytes,
decode budgets and aborted stale assets. These are distinct from the per-seat
built audio test,which asserts four assigned calls have independent cooldowns,
held edges do not repeat,and pause/mute block them. No real-world listening or
SDK resource wire claim is inferred from fixture calls or PCM fingerprints.

## Soundscape:five arms

**SOLO-01,UI-06,RACE-02/03,TEST-02.** Mix choices follow visible positions,
shared clock and current biome without changing level RNG or simulation state.

| Arms | Reviewed consequence and behavioral authority |
|---|---|
|15/1 at65|If there are no nearby scale notes within seven semitones of the previous horn,pick from the permitted voice range. A voice-range change can legitimately need this fallback. Existing phrase tests verify exact scale/range,no repeated pitch,varied rhythm/voice and deterministic terrain-preserving choices;this specific wide-range transition remains zero.|
|26/1 at134|A missing rounded physical-position row uses the current lane's world. Rows normally cover the retained player course;the fallback handles an edge without moving the listener to the destination early. Proximity tests use real ground distances and surface crossfades;this missing-row alternative remains counted.|
|27/1 at135|An unknown biome uses the pond palette. Shipped worlds have explicit palettes;generic authored world IDs retain a bounded default. Existing all-world scene PCM tests prove actual palette variety,not this unknown-world fallback.|
|32/1 at150|Unknown river palette uses the current listener palette's water gain. This affects mix only and does not grant water support or change row state. Actual road/river proximity and all-world fixtures verify the known-world mix;this generic fallback remains counted.|
|68/0 at248|A passing train under wave warning is reduced to.4 gain. Horn/bell/train/wave priority tests own warnings and contextual mix;this exact overlap's gain alternative remains zero. It changes neither warning cadence nor train collision.|

tests/soundscape.test.mjs asserts3-tile visible horn radius,D-pad-independent
visible ground proximity,actor identity across phase wrap,pitch/scale and shared
music clock. audio-zones drives production Soundscape→GameAudio over explicitly
arranged terrain/trajectories and measures finite PCM/mix differences. It is not
a natural multiplayer journey or a subjective audio-quality verdict.

## Mob director:six arms

**SOLO-01,ARCH-03,COOP-01,RACE-02,UI-06,TEST-01/02.** One shared director
must use resolved world policy,walk/chase at paced aggression,keep safe escape
opportunities,and avoid mutating an inactive player's state.

| Arms | Reviewed consequence and behavioral authority |
|---|---|
|9/0;10/0 at56|Omitted runTuning effects/score use the Game's run/maxY. Current update resolves explicit shared-or-solo effects/score and passes them through plan and phase transitions. These private defaults remain globally counted;actual shared-effects tests verify per-seat cards cannot accidentally select the world's director clock/policy.|
|12/0 at79|clearPath lets wasps fly directly. Current plan selects wasp targets directly and only ground walkers enter the cardinal path search;the two clearPath call sites therefore use ground kinds. The retained early return supports generic future use. Actual mob tests verify flying versus ground behavior without forcing a private wasp path query.|
|19/1 at98|A blocked aligned crab charge leaves target unset and falls back to walking/retry. This preserves scenery safety rather than striking through it. Existing ground-routing/windup/easing/contact tests own actual obstacles and committed attacks;this exact rejected aligned charge is not claimed executed.|
|47/0 at176|A candidate that would leave no sufficiently distant exit is skipped. Earlier logic requires at least one open exit and filters candidate terrain,spacing,wave and distance;the later check retains an explicit escape safeguard. Spawning/escape tests prove supported arrivals and crowded deferral. No universal triangle-distance claim is made:ground interpolation can differ during a character rescue. This precise no-exit candidate branch remains counted.|
|55/0 at203|With no currently playing target,retain the mob without movement/contact for that iteration. Ordinary session entry filters playing participants;earlier mob contact or generic callers can still make this a defensive boundary. Shared-world tests prove dead primary cannot cull a mob near a living secondary;pause/freeze/contact tests own progression. That is not a hit on this all-ineligible alternative.|

tests/mobs.test.mjs covers delayed unlocks,45 active seconds,progress-gated spawn
cadence,harmless arrival grace,slow walking,distinct attack easing,ground routes,
terrain hazards,swept contacts,pause,retry,population bounds,escape opportunities
and warning/market arrival suppression. session-world/survive-economy/Relay
world-effect tests separately own one shared director and elected effects.
Neither source review nor generic director fixtures replace actual mode flows.

All30 residuals remain quantitatively accountable. Remaining main/market review,
the fresh complete enforcing result,official conformance,current-frame visual/
clause audit,final gates and opening the PR remain required.
