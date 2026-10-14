# Persistent run hand

Owned cards stay on one bottom shelf during play, pause, collection, market
browsing, offer inspection and paid pack selection. Menus reserve that space.
Cards use the game's paper, timber and Lilita lettering; selecting one lifts it
and opens a local detail sheet with a large Sell action. Closing the sheet keeps
the underlying page, offer and pack picks intact. Opening it during play pauses
the action; closing resumes only that locally paused play session. Backgrounding
or focus loss requires an explicit resume.

Selling is available anywhere while the run is alive. It credits the existing
sale value and immediately reapplies effects. Capacity protections still prevent
selling a slot-granting card when the remaining hand would not fit. Paid pack
choices and selections survive sales; sold replacement candidates are removed.
Death still clears the entire run inventory and wallet.

The shelf is paged at compact sizes so all six possible slots remain reachable
without scrolling. Menus, the hand and its detail sheet share keyboard/controller
focus navigation. The existing 240×240 minimum and light/dark theme support stay
in effect. Controls retain at least 44px targets and reduced-motion preferences.

This adds no dependencies, storage, network traffic, protocol or permissions.
Existing optional keys/gamepad and theme integration are used. Browser fixtures
remain muted and launch Chromium with `--mute-audio`.
