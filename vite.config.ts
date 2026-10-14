import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  // Paja's opaque iframe requests local artifacts with Origin: null.
  server: { cors: { origin: 'null' } },
  preview: { cors: { origin: 'null' } },
  build: {
    // Vite's module-preload polyfill calls `fetch`; one inlined entry needs no
    // preload graph, and NIP-5D napplet code has no ambient network authority.
    modulePreload: { polyfill: false },
  },
  plugins: [
    // Produce one self-contained `/index.html` for NIP-5D `srcdoc` loading,
    // then content-address it with the NIP-5A tag/hash schema.
    nip5aManifest({
      // Stable deployment identity; branding changes must not create a new app.
      nappletType: 'puddlehop',
      title: 'Down to Duck',
      description: 'An endless voxel crossing adventure with collectible travelers and changing worlds',
      artifactMode: 'single-file',
      optional: ['intent'],
      archetypes: [{ slug: 'game', convention: 'napplet:game/open', params: ['seed', 'mode'] }],
    }),
  ],
});
