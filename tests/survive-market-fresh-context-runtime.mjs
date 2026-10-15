import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

async function start(app) {
  const { frame, onSession, advance } = app;
  await frame.locator('#play').click(); await frame.locator('#pause').click(); await frame.locator('#local-play').click();
  await frame.getByRole('button', { name: /start together/i }).click(); await advance(100);
  await onSession(function () {
    const run = this.players.find(player => player.seat === 'p2').run;
    run.advanceScore(100); run.creditCoins(200); run.open();
    for (const itemId of ['traffic-speed', 'platform-length']) {
      const item = run.catalog.get(itemId);
      run.market.offers = [{ id: `earned-${itemId}`, itemId, price: item.price, sold: false, section: 'cards' }];
      const result = run.buy(run.market.offers[0].id); if (!result.ok) throw new Error(result.message);
    }
    const item = run.catalog.get('magnet');
    run.market.offers = [{ id: 'next-offer', itemId: item.id, price: item.price, sold: false, section: 'cards' }];
    run.revision++; run.close();
  });
  await advance(100);
  await frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click(); await advance(100);
}

const read = app => app.onSession(function () {
  return this.players.map(player => ({ seat: player.seat, wallet: player.run.wallet, cards: player.run.cards, open: player.run.isOpen }));
});
const p2 = players => players.find(player => player.seat === 'p2');
const earnCoin = app => app.onSession(function () { this.players.find(player => player.seat === 'p2').run.creditCoins(1); });

test('reopening the same owner market after earning coins creates a fresh valid interaction', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence);
  const { frame, advance } = app;
  try {
    await start(app);
    await frame.locator('#market-open').click(); await advance(300);
    assert.equal(p2(await read(app)).open, true);
    await frame.locator('#market-close').click(); await advance(300);
    assert.equal(p2(await read(app)).open, false);
    // A normal earned coin changes RunInventory.revision while no interaction
    // is open. Opening again must capture it without asking the user to retry.
    await earnCoin(app); await advance(80);
    const before = await read(app);
    await frame.locator('#market-open').click(); await advance(300);
    assert.equal(p2(await read(app)).open, true, 'the first reopen opens the real inventory, not an unusable virtual view');
    await frame.locator('[data-market-action="inspect"][data-id="offer:next-offer"]').click(); await advance(100);
    await frame.locator('#market-inspect-action').click(); await advance(100);
    const after = await read(app);
    assert.equal(p2(after).cards.length, 3, 'one confirmation buys the inspected offer');
    const price = await app.onSession(function () { return this.players.find(player => player.seat === 'p2').run.catalog.get('magnet').price; });
    assert.equal(p2(after).wallet, p2(before).wallet - price);
    assert.deepEqual(after.find(player => player.seat === 'p1'), before.find(player => player.seat === 'p1'));
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});

test('a new hand inspection after earning coins can sell on its first confirmation', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence);
  const { frame, advance } = app;
  try {
    await start(app);
    const initial = await read(app), cards = p2(initial).cards;
    for (const card of cards) {
      await earnCoin(app); await advance(80);
      const before = await read(app);
      await frame.locator(`[data-hand-card="${card.id}"]`).click(); await advance(100);
      assert.match(await frame.locator('#run-hand-detail-owner').innerText(), /Viewing P2 /);
      await frame.locator('#run-hand-sell').click(); await advance(100);
      const after = await read(app);
      assert.equal(p2(after).cards.some(held => held.id === card.id), false, 'fresh inspection does not reuse a stale previous sale context');
      assert.equal(p2(after).wallet, p2(before).wallet + card.saleValue);
      assert.equal(await frame.locator('#run-hand-detail').isVisible(), false);
      assert.deepEqual(after.find(player => player.seat === 'p1'), before.find(player => player.seat === 'p1'));
    }
    assert.equal(p2(await read(app)).cards.length, 0);
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});
