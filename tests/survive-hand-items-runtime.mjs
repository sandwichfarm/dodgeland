import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url);

test('the physical hand Items row updates after purchase and use while its cards stay unchanged', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence);
  const { frame, iframe, advance, onSession } = app;
  const settle = () => advance(250);
  try {
    await mkdir(output, { recursive: true });
    await frame.locator('#play').click(); await frame.locator('#pause').click(); await frame.locator('#local-play').click();
    await frame.getByRole('button', { name: /start together/i }).click(); await settle();
    const cards = await onSession(function () {
      const owner = this.players.find(player => player.seat === 'p2'), target = this.players.find(player => player.seat === 'p1');
      const run = owner.run, item = run.catalog.get('traffic-speed');
      run.advanceScore(100); run.creditCoins(item.price + 24); run.open();
      run.market.offers = [{ id: 'earned-card', itemId: item.id, price: item.price, sold: false, section: 'cards' }];
      const bought = run.buy('earned-card'); if (!bought.ok) throw new Error(bought.message);
      run.market.offers = []; run.revision++; run.close();
      this.world.host.inPlayerOperation(target, player => player.end('Shelf item fixture', 'train'));
      this.update(1 / 120);
      return run.cards;
    });
    await settle();
    await frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click(); await settle();
    await frame.locator('#market-open').click(); await settle();
    const items = frame.locator('#run-hand-items');
    assert.equal(await items.innerText(), 'Items: —');
    await frame.getByRole('button', { name: /Revival.*View details/i }).click();
    await frame.getByRole('button', { name: /Buy Revival/i }).click(); await settle();
    const quantity = () => onSession(function () { return this.consumableSnapshot().charges.find(charge => charge.seat === 'p2').revival; });
    assert.equal(await quantity(), 1, 'the actual purchase has committed');
    assert.equal(await items.getByRole('button', { name: 'Use Revival ×1', exact: true }).isVisible(), true, 'the same hand repaints its owned charge without a card change');
    assert.deepEqual(await onSession(function () { return this.players.find(player => player.seat === 'p2').run.cards; }), cards);
    await iframe.screenshot({ path: new URL('survive-hand-item-purchased.png', output).pathname });
    await frame.locator('#market-close').click(); await settle();
    await items.getByRole('button', { name: 'Use Revival ×1', exact: true }).click(); await settle();
    const board = frame.locator('#survive-recovery-board');
    await board.getByRole('button', { name: 'Revive P1', exact: true }).click();
    await board.getByRole('button', { name: 'Use Revival', exact: true }).click(); await settle();
    assert.equal(await quantity(), 0);
    assert.equal(await items.innerText(), 'Items: —', 'consumption removes the stale Use button while the cards are unchanged');
    assert.equal(await items.locator('button').count(), 0);
    assert.deepEqual(await onSession(function () { return this.players.find(player => player.seat === 'p2').run.cards; }), cards);
    assert.equal(await onSession(function () { return this.players.find(player => player.seat === 'p1').participation; }), 'active');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } catch (error) {
    evidence.failure = String(error);
    await iframe.screenshot({ path: new URL('survive-hand-items-failure.png', output).pathname }).catch(() => {});
    throw error;
  } finally {
    await writeFile(new URL('survive-hand-items-runtime.json', output), JSON.stringify(evidence, null, 2));
    await app.close();
  }
});
