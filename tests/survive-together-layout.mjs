import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const frames = [[200, 160], [240, 240], [320, 560], [900, 600], [1000, 280], [2400, 1200]];
const themes = {
  dark: { colors: { background: '#18232a', text: '#f4f2df', primary: '#a6c97d' } },
  light: { colors: { background: '#f4f2df', text: '#263c38', primary: '#477953' } },
};

test('the built co-op HUD stays bounded across its muted theme and size matrix', { timeout: 120_000 }, async () => {
  const evidence = { errors: [], external: [], frames: [] };
  const app = await createMarketGameFixture(evidence, { gamepads: true });
  const { page, frame, iframe, advance, resize } = app;
  try {
    await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await frame.locator('#play').click(); await frame.locator('#pause').click();
    await frame.locator('#local-play').click(); await frame.getByRole('button', { name: /start together/i }).click();
    await frame.locator('#session-seats').waitFor(); await advance(120);
    assert.equal(await frame.locator('#session-seats').isVisible(), true, 'visible Start together commits the live local session before resize evidence');
    for (const [name, theme] of Object.entries(themes)) for (const [width, height] of frames) {
      await frame.evaluate(value => window.marketGameFixture.setTheme(value), theme);
      await resize(width, height);
      const metrics = await frame.evaluate(({ width, height }) => {
        const visible = node => !!node?.getClientRects().length && !node.closest('[hidden]') && getComputedStyle(node).display !== 'none';
        const controls = [...document.querySelectorAll('#session-seats button, #survive-recovery-board button')].filter(visible).map(node => {
          const rect = node.getBoundingClientRect(); return { text: node.textContent?.trim(), width: rect.width, height: rect.height, fits: rect.left >= -.5 && rect.top >= -.5 && rect.right <= width + .5 && rect.bottom <= height + .5 };
        });
        return { notice: visible(document.querySelector('.too-small')), scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, controls, background: getComputedStyle(document.documentElement).backgroundColor };
      }, { width, height });
      await iframe.screenshot({ path: new URL(`survive-together-${name}-${width}x${height}.png`, new URL('../artifacts/', import.meta.url)).pathname });
      evidence.frames.push({ name, width, height, metrics });
      if (width < 240 || height < 240) {
        assert.equal(metrics.notice, true, `${width}×${height} shows the exact minimum-size notice`);
        assert.equal(metrics.controls.length, 0, 'tiny notice exposes no controls');
      } else {
        assert.equal(metrics.notice, false, `${width}×${height} restores the shared scene`);
        assert.ok(metrics.scroll.width <= width && metrics.scroll.height <= height, `${width}×${height} has no document overflow`);
        assert.ok(metrics.controls.every(control => control.width >= 43.5 && control.height >= 43.5 && control.fits), `${width}×${height} keeps visible co-op controls reachable`);
        assert.notEqual(metrics.background, 'rgba(0, 0, 0, 0)', `${name} theme paints the complete iframe`);
      }
    }
    assert.deepEqual(evidence.errors, []);
    await writeFile(new URL('../artifacts/survive-together-layout.json', import.meta.url), JSON.stringify(evidence, null, 2));
  } finally { await app.close(); }
});
