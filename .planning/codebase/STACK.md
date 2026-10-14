# Down to Duck stack

Inspected at baseline `a310a81` on 2026-10-14.

- TypeScript 5.9 with strict checking; native ESM and DOM APIs; no UI framework.
- Canvas voxel rendering and CSS/HTML game boards with bundled Lilita One font.
- Vite 6.4.3 and @napplet/vite-plugin 0.16 produce one self-contained HTML artifact.
- @napplet/sdk 0.29 supplies shell storage, theme, keyboard actions, intent and sound-pack resource access.
- NAP-GAMEPAD uses the existing explicitly authorized temporary draft adapter;
  device transport remains shell-owned. No native navigator gamepad polling.
- Node test runner and tests/source-loader.mjs transpile actual TypeScript modules
  for model tests, resolving catalog globs from the real source tree.
- Playwright 1.61 runs Chromium/Firefox opaque-iframe integration and visual tests.
  Browser audio must be muted; offline PCM generation is safe.
- pnpm 10.8.0 lockfile; no new runtime dependency is planned for multiplayer.
- GitHub repository sandwichfarm/down-to-duck, main at a310a81; feature branch
  feat/local-multiplayer. PR creation is requested, deployment/merge is not.
- Local signing settings and generated artifacts are ignored; only sanitized
  napplet configuration, source assets and deliberate documentation images are tracked.

Required release commands remain pnpm type-check, pnpm build,
pnpm test:guidance and pnpm test:conformance. Conformance currently has five
evidence skips; independent manifest/SDK/lifecycle runtime evidence is required
where conformance alone cannot prove a requirement.
