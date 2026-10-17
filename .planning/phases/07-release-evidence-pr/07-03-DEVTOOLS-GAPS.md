# Development control and diagnostics gaps

Root extended the existing `tests/devtools.test.mjs` and
`tests/devtools-runtime.mjs`. Production code and build boundaries are unchanged.

Nine component cases now include actual duck water rescue plus explicitly
placed valid pursuer state, open market information, and an unregistered world.
Diagnostics report those states without advancing rescue, cooldown or mobs.
The browser suite exercises close button, toggle, Escape, blur and visibility
routes, restoring the underlying inert/input state without changing simulation.
Fresh Enter performs a jump; a repeated held Enter cannot reset the sandbox
again. Existing typed jumps, copied schemas, record isolation, hydration,12
frame/theme combinations, teardown and production stripping assertions remain.

Blur/visibility deliveries are explicit host fixtures, not claims about native
operating-system focus changes. Initial chain25574 passed9/9 component cases but
failed the inherited market shortcut assertion: the new synthetic blur omitted
its matching focus restoration, leaving main.localFocus false. This was fixture
setup, not a product defect. Retained failed log:
`/tmp/down-to-duck-07-03-devtools-runtime-ordinary.log`.
The fixture now restores focus and visible-state delivery symmetrically.

Corrected chain20650 exited0. Ordinary browser strict1/1 passed in15837.111ms;
canonical strict browser1/1 plus component9/9 passed. Logs:

- `/tmp/down-to-duck-07-03-devtools-state-ordinary.log`
- `/tmp/down-to-duck-07-03-devtools-build.log`
- `/tmp/down-to-duck-07-03-devtools-runtime-ordinary-green.log`
- `/tmp/down-to-duck-07-03-devtools-canonical.log`

The ordinary wrapper used the existing production job's artifact preservation
helper and verified the original artifact set/bytes and normal dist digest
before/after. Its archived outputs are under the exact temporary path in the
ordinary log. Canonical collection uses the exact two full jobs and both genuine
production/development build scopes. Run
`236dbb72-7791-4771-9201-cc2e8b54aaae` collected five payloads: four browser realms
and one Node parent. Thresholds remain explicitly unevaluated.

Both source hashes and all three mapped schemas match initial-full evidence:

| Source | SHA256 | Focused functions | Focused branch arms |
| --- | --- | ---: | ---: |
|devtools.ts|717ad3568ee1cd1139f3650e1785f7aa4867cb4113b5417053b8677dd83f9e87|31/32|30/33|
|devtools-state.ts|8ffff220d26c0a984f8159a18701b20d421a8d86708ee828f3d17634195c0e60|6/6|20/20|

New devtools arms:0/0(line42)=8,3/0(44)=8,8/1(61)=1,9/0(70)=2,
10/1(71)=1,12/0(92)=1,13/0(93)=1,13/1(93)=2.
New diagnostics arms:3/0(line53),5/1(58),6/1(61),9/0(63), count1 each.
The three remaining devtools arms are missing #app guards and a non-Error
seed-loading failure; they remain visible for semantic disposition. The missing
function is the native form-submit suppression callback in the opaque frame.
No counters were fabricated to reach these paths.

Per-file functions/branches exceed their90/85 floors in this focused proof.
The full development stratum, all-source aggregate and final enforcing coverage
remain separate open gates. No full release pass is claimed.
