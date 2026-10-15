import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url);
const pad = (index, pressed = []) => ({ index, id: `Ghost sale ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })) });

test('a disconnected owner cannot sell a retained card until explicitly reclaiming their controller', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] };
  const app = await createMarketGameFixture(evidence, { gamepads: true });
  const { page, frame, iframe, advance, onSession, sendPads } = app;
  const settle = () => advance(250);
  const press = async (index, button) => {
    await sendPads([pad(0), pad(1)]);
    await sendPads([pad(0, index === 0 ? [button] : []), pad(1, index === 1 ? [button] : [])]);
    await sendPads([pad(0), pad(1)]);
  };
  const inventory = () => onSession(function () {
    return this.players.map(player => ({ seat: player.seat, participantId: player.participantId, cards: player.run.cards,
      wallet: player.run.wallet, pending: player.run.pendingPack, cosmetics: player.run.cosmetics }));
  });
  try {
    await mkdir(output, { recursive: true });
    await sendPads([pad(0), pad(1)]); await press(0, 0); await press(1, 0);
    await frame.getByRole('button', { name: /start together/i }).click(); await settle();
    assert.deepEqual(await onSession(function () { return this.players.map(player => player.device); }), ['gamepad-0', 'gamepad-1']);
    // Seed already-earned inventories. Disconnect/reclaim, inspection and the
    // eventual sale below use real shell snapshots and visible app controls.
    await onSession(function () {
      for (const player of this.players) {
        const run = player.run, item = run.catalog.get(player.seat === 'p1' ? 'magnet' : 'traffic-speed');
        run.advanceScore(100); run.creditCoins(50); run.open();
        run.market.offers = [{ id: `earned-${player.seat}`, itemId: item.id, price: item.price, sold: false, section: 'cards' }];
        const bought = run.buy(run.market.offers[0].id);
        if (!bought.ok) throw new Error(bought.message);
        run.close();
      }
    });
    await settle();
    await frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click(); await settle();
    const before = await inventory(), owned = before.find(player => player.seat === 'p2'), card = owned.cards[0];
    assert.equal(card.id, before.find(player => player.seat === 'p1').cards[0].id, 'the same card ID exists in both personal inventories');
    await frame.locator(`[data-hand-card="${card.id}"]`).click(); await settle();
    assert.match(await frame.locator('#run-hand-detail-owner').innerText(), /Viewing P2 /);
    await frame.locator('#run-hand-sell').focus();
    await sendPads([pad(0)]); await settle();
    assert.equal(await onSession(function () { return this.players.find(player => player.seat === 'p2').participation; }), 'device-lost');
    await page.keyboard.press('Enter'); await settle();
    assert.deepEqual(await inventory(), before, 'disconnect invalidates the old focused sale before native Enter can commit it');
    if (!await frame.locator('#run-hand-detail').isVisible()) {
      await frame.locator(`[data-hand-card="${card.id}"]`).click(); await settle();
    }
    assert.equal(await frame.locator('#run-hand-name').innerText(), card.name, 'ghost inspection retains its own same-ID card');
    assert.equal(await frame.locator('#run-hand-sell').isDisabled(), true);
    assert.match(await frame.locator('#run-hand-sell').getAttribute('title'), /P2 must reclaim their controller first\./);
    assert.deepEqual(await inventory(), before);
    await iframe.screenshot({ path: new URL('survive-market-ghost-sale.png', output).pathname });
    await frame.locator('#run-hand-close').click(); await settle();
    await sendPads([pad(0), pad(1)]); await press(1, 0);
    await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).waitFor();
    await press(1, 0); await settle();
    assert.equal(await onSession(function () { return this.players.find(player => player.seat === 'p2').participation; }), 'active');
    assert.deepEqual(await inventory(), before, 'explicit reclaim preserves the original participant and all inventory');
    await frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click(); await settle();
    await frame.locator(`[data-hand-card="${card.id}"]`).click(); await settle();
    assert.match(await frame.locator('#run-hand-detail-owner').innerText(), /Viewing P2 /);
    assert.equal(await frame.locator('#run-hand-sell').isEnabled(), true, 'a fresh reclaimed interaction can sell outside the market');
    await frame.locator('#run-hand-sell').click(); await settle();
    const after = await inventory();
    assert.deepEqual(after.find(player => player.seat === 'p1'), before.find(player => player.seat === 'p1'), 'P1 same-ID card and wallet remain untouched');
    assert.deepEqual(after.find(player => player.seat === 'p2'), { ...owned, cards: [], wallet: owned.wallet + card.saleValue });
    evidence.before = before; evidence.after = after;
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } catch (error) {
    evidence.failure = String(error);
    await iframe.screenshot({ path: new URL('survive-market-ghost-sale-failure.png', output).pathname }).catch(() => {});
    throw error;
  } finally {
    await writeFile(new URL('survive-market-ghost-sale-runtime.json', output), JSON.stringify(evidence, null, 2));
    await app.close();
  }
});
