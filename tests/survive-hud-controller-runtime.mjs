import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const pad = (index, pressed = []) => ({ index, id: `HUD controller ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })) });

test('only the inspected seat controls compact HUD detail pages', { timeout: 60000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, advance, resize, sendPads } = app;
  const press = async (index, button) => { await sendPads([pad(0), pad(1)]); await sendPads([pad(0, index === 0 ? [button] : []), pad(1, index === 1 ? [button] : [])]); await sendPads([pad(0), pad(1)]); };
  try {
    await sendPads([pad(0), pad(1)]); await press(0, 0); await press(1, 0);
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(80); await resize(240, 240);
    const p2 = frame.locator('#session-seats [data-seat="p2"]');
    await p2.locator('[data-session-hud="identity"]').click(); await p2.locator('[data-session-hud="identity"]').click();
    assert.equal(await frame.locator('#session-seats').getAttribute('data-session-hud-inspect'), 'true');
    const page = () => p2.getAttribute('data-session-hud-page');
    const before = await page(); await press(0, 15); assert.equal(await page(), before, 'P1 cannot page P2 details');
    await press(1, 15); await press(1, 0); assert.notEqual(await page(), before, 'P2 navigates then confirms its visible page control');
    const after = await page(); await press(0, 1); assert.equal(await page(), after, 'P1 Back cannot dismiss P2 details');
    await press(1, 1); assert.equal(await frame.locator('#session-seats').getAttribute('data-session-hud-inspect'), 'false', 'P2 Back closes its inspection');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});
