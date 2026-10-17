# Persistent hand and run-menu navigation

The existing hand suite now verifies all four SDK directions, forward/reverse
Tab, native Escape and selecting the same card again. Inspection navigation
retains the exact inventory and simulation state, stays within the hand, and
closing preserves the surrounding pause. Existing sale, pack replacement,
44-frame hand layout and death/retry assertions remain intact.

The existing run-menu suite now verifies backward reader paging, reverse Tab,
all four menu directions, and confirm after pointer inspection removes button
focus. The inherited36 frame/theme/state cases and material/layout assertions
remain unchanged. The completed run stays frozen while its menu is navigated.

The menu extension initially made three fixture assumptions: direction keys
would leave seed text, every button had an id, and the debugger helper's cached
Game would follow retry. The application correctly retains text-input ownership,
topic buttons use data-run-topic, and retry replaces Game. Assertions now use
button contexts and actual control identity, and verify retry through the live
UI. No product repair or fabricated RED is claimed. Retained failed logs:
`/tmp/down-to-duck-07-03-menu-ui-ordinary.log`,
`/tmp/down-to-duck-07-03-menu-ui-ordinary-green.log`,
`/tmp/down-to-duck-07-03-menu-ui-ordinary-final.log`.

Ordinary hand strict1/1 passed in29884.132ms in chain35524; its menu continuation
failed as above. Corrected chain73832 exited0: ordinary menu strict1/1 passed
in29104.654ms, then canonical hand1/1 and menu1/1 passed in88176.824ms and
115184.303ms respectively.
Logs:

- `/tmp/down-to-duck-07-03-hand-ui-ordinary.log`
- `/tmp/down-to-duck-07-03-menu-ui-ordinary-verified.log`
- `/tmp/down-to-duck-07-03-hand-menu-canonical.log`

Ordinary wrappers restored artifact sets and bytes and checked normal dist.
Canonical group `hand-menu-gaps-03` uses the exact two full jobs, run
`22c5771c-f306-4d06-8bd0-c870da8380a9`, two actual browser payloads. Audio stayed
muted. No product source changed. Both mapped schemas match the initial report.

| Source | Source SHA256 | Focused lines | Functions | Branch arms |
| --- | --- | ---: | ---: | ---: |
|run-hand.ts|3617c567e5c486d8c1351adb03f99c559fa3eddbf1e1bbfc3cd99b3c9e27ed8a|218/249|33/40|192/288|
|run-menu.ts|1d02c36c6d47645e86795810c5b5eb0d20ee85601bec3d4746de42b21920f676|105/106|23/24|117/140|

New hand arms:79/0=1,107/1=9,109/0=1,109/1=8,110/0=8,111/0=4,111/1=4,
137/1=2. New menu arms:42/0=1,43/1=1,49/0=4,63/1=2,64/1=3,66/1=1.
The focused hand suite omits multiplayer gear/ownership cases. Source-identical
diagnostic unions with initial-full are249/288 hand arms and120/140 menu arms;
neither is a fresh full pass. Full aggregate enforcement remains pending.
