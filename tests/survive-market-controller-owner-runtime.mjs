import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const pad = (index, pressed = []) => ({ index, id: `Market owner ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })) });

test('only the displayed hand owner can navigate, dismiss or confirm a card sale with a controller', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, advance, onSession, sendPads } = app;
  const press = async (index, button) => {
    await sendPads([pad(0), pad(1)]);
    await sendPads([pad(0, index === 0 ? [button] : []), pad(1, index === 1 ? [button] : [])]);
    await sendPads([pad(0), pad(1)]);
  };
  const read = () => onSession(function () {
    return { time: this.world.time, players: this.players.map(player => ({
      seat: player.seat, participantId: player.participantId, wallet: player.run.wallet,
      cards: player.run.cards, x: player.groundX, y: player.groundY,
    })) };
  });
  const focus = () => frame.evaluate(() => document.activeElement?.getAttribute('data-hand-key'));
  try {
    await sendPads([pad(0), pad(1)]); await press(0, 0); await press(1, 0);
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(100);
    await onSession(function () {
      for (const player of this.players) {
        const run = player.run, item = run.catalog.get(player.seat === 'p1' ? 'magnet' : 'traffic-speed');
        run.advanceScore(100); run.creditCoins(50); run.open();
        run.market.offers = [{ id: `earned-${player.seat}`, itemId: item.id, price: item.price, sold: false, section: 'cards' }];
        const bought = run.buy(run.market.offers[0].id); if (!bought.ok) throw new Error(bought.message);
        run.close();
      }
    });
    await advance(100);
    await frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click(); await advance(80);
    const card = (await read()).players.find(player => player.seat === 'p2').cards[0];
    await frame.locator(`[data-hand-card="${card.id}"]`).click(); await advance(80);
    assert.match(await frame.locator('#run-hand-detail-owner').innerText(), /Viewing P2 /);
    assert.equal(await frame.locator('#run-hand-sell').isEnabled(), true);
    await frame.locator('#run-hand-sell').focus();
    const frozen = await read();
    for (const button of [0, 15, 1, 9, 3]) {
      await press(0, button);
      assert.deepEqual(await read(), frozen, `P1 button ${button} cannot sell, move or resume P2's transaction`);
      assert.equal(await frame.locator('#run-hand-detail').isVisible(), true, 'other player cannot dismiss the inspector');
      assert.equal(await focus(), 'sell', 'other player cannot move owner focus');
    }
    await frame.locator('#run-hand-close').focus();
    for (let index = 0; index < 12 && await focus() !== 'sell'; index++) {
      const previous = await focus(); await press(1, 15);
      assert.notEqual(await focus(), previous, 'P2 D-pad navigates its active hand controls');
    }
    assert.equal(await focus(), 'sell');
    await press(1, 0);
    const sold = await read(), before = frozen.players.find(player => player.seat === 'p2');
    assert.deepEqual(sold.players.find(player => player.seat === 'p1'), frozen.players.find(player => player.seat === 'p1'));
    assert.deepEqual(sold.players.find(player => player.seat === 'p2'), { ...before, cards: [], wallet: before.wallet + card.saleValue });
    assert.equal(await frame.locator('#run-hand-detail').isVisible(), false);
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});
