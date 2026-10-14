# Pause board

The user requested a centered game menu with large, distinctive type and controls,
instead of the small website-like panel. That product requirement overrides the
boilerplate's compact control defaults for this screen.

The paused board uses the market's warm wood, parchment, green and gold palette.
The game remains visible beneath a theme-derived translucent tint and a soft
blur. A locally bundled Lilita One font gives the heading and controls their
game lettering. The font is unmodified, its OFL license is in `src/fonts`, and
the full notice is embedded as document metadata in the single-file artifact.
No font or other asset is requested from the network at runtime.

At 900×600 and above the centered board shows road damage/recovery rules and
the current traveler's complete power description together. The heading is
48px, information is 20–24px, and primary controls are 56–64px tall. Smaller
frames use explicit Rules and Power screens. These paginate text against the
available space using the actual bundled font metrics, without scrollbars or
discarding information. Phone copy is at least 18px, and every control is at
least 44×44. The existing 240×240 game minimum remains unchanged.

Pause UI is active only while the run is paused and no market, collection or
development screen covers it. It preserves the existing Continue and Change
traveler actions. Information pages do not advance the world or cooldowns.
Tab remains within visible pause controls; directional controls, Confirm and
Back operate the active screen. Closing the collection restores the pause
board and focuses Continue. Reduced motion removes the entrance animation.
The styles are scoped to pause state and do not alter the ready/death panels.

`createPauseUI()` exposes `update(active, reducedMotion)`, `navigate(direction)`,
`confirm()`, `back()` and `dispose()`. The existing character power UI still owns
the `#pause-power` content. `src/main.ts` owns game state and action routing.

`node tests/pause-game-layout.mjs` verifies the production artifact in an opaque
iframe at 12 frame sizes in both themes, including the minimum notice, phones,
short landscape, the layout boundary and full screen. It checks centering,
tinting, font loading, embedded license, input targets, complete information,
no overflow, all seven traveler powers, keyboard navigation, resizing,
collection return, frozen gameplay, resume and reduced motion. Screenshots and
the report are written to `artifacts/pause-*`.
