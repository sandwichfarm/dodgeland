# Audio lifecycle and active-category gaps

Implemented and verified. No production source change
or product RED is claimed. Existing whole `tests/sound.test.mjs` registrations
remain sufficient; no new browser realm is introduced.

**SOLO-02, UI-06, TEST-02, TEST-03.** Audio capability absence must leave gameplay
usable. A decoder finishing after disposal must not return stale data. Muting
ambience must retire already playing engines without stopping effects, and rapid
unmuting must restore a bounded scene while releasing its old fading voices.

Two Node cases exercise production `GameAudio` through its public methods:

- Missing realtime/offline browser capabilities permit prepare/unlock/play/scene
  calls to remain silent; decode reports the missing capability. After disposal,
  prepare/play remain safe and decoding rejects the closed owner.
- A controlled offline decoder receives an independent copy of caller bytes.
  Mutating the caller's array does not change the queued request. Disposal before
  decoder resolution rejects the stale completion before reading decoded data.
  Only the external decoder is deferred; production lifecycle checks are intact.

The existing browser loop test now uses the real mixer/AudioBufferSource nodes
to mute a full active road scene, confirm effect voices remain active, reject
new muted scene requests, and immediately restore eight engines while previous
voices are still fading. It asserts the old nodes disconnect and the new scene
remains bounded. This is a browser audio component witness, not a public gameplay
journey. Chromium remains muted; no sound is played through system speakers.

Initial source-bound ledger candidates selected by these behaviors are
audio.ts182/0,185/0,213/0,214/0 (capabilities/lifecycle),203/0 (active ambience
retirement), and256/1 (retiring voice budget). Exact gains must be confirmed
against the canonical mapped schema before updating the historical ledger.
Other uncovered audio paths remain pending; this does not claim a complete
audio residual review or a release floor pass.

## Execution

The first canonical chain18696 exited1 (43/44). The new decoder sentinel threw
when Promise resolution checked its `then` property, before production received
the decoded value. Allowing that ordinary thenability check corrected the test
fixture; all decoded-data property reads still throw. This was a fixture error,
not a production failure. Retained log:
`/tmp/down-to-duck-07-03-audio-lifecycle-canonical.log`.

Final canonical chain23814 exited0,44/44 with no skips or cancellations:
`/tmp/down-to-duck-07-03-audio-lifecycle-canonical-final.log`. Run
`c6e37e9d-4a3f-4473-a600-e9f5e0bb756c` contains two independently bound Node
parents and20 existing browser audio component realms. No additional ordinary
audio run was necessary: this whole calibrated suite executes real production
modules and writes its audio artifacts into the collection's isolated directory.

All three mapped site schemas, source hash and map hash exactly match the
initial full report. Six previously zero branch arms now execute:

| Branch/arm | Source line | Focused count | Verified consequence |
| --- | ---: | ---: | --- |
|182/0|916|1|No realtime audio capability leaves unlock harmless.|
|185/0|938|2|Preparation before unlock and after disposal resolves safely.|
|203/0|994|8|Zero ambience gain retires every active engine.|
|213/0|1025|1|Absent offline decoding reports its explicit error.|
|214/0|1028|1|A late decode rejects after disposal before inspecting audio data.|
|256/1|1133|8|Returning traffic releases old fading voices under the shared cap.|

Audio source SHA256 remains
`f9d23f3e4f80f1414c854b93c4665cb49d185e34d1ebea901f4f795d81782102`;
map SHA256 `0c9fbd4e1947ef15c1ac49ecb96dcc183389de0c223f41f726a2437f4c46a2dc`.
Normal dist raw SHA256 remains
`ca774030d10eabe9dc9ed9780bf17422642874f7605bfdc26db6c116a6d86168`; root lock
SHA256 remains `5ac3c476e3049e2e9c3261b7a34b3b709d88fad3382277d4b38e0546f06ab58d`.
This is source-bound added behavioral proof, not a fresh enforcing full report.
