import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url);

test('a paid co-op pack survives owner switching and a hand sale without transferring inventory', { timeout: 90_000 }, async () => {
  const evidence = { errors: [], external: [], checkpoints: [] };
  const app = await createMarketGameFixture(evidence);
  const { frame, iframe, advance, onSession } = app;
  const settle = () => advance(350);
  const snapshot = () => onSession(function () {
    return { time: this.world.time, players: this.players.map(player => ({
      seat: player.seat, participantId: player.participantId,
      cards: player.run.cards, wallet: player.run.wallet, pending: player.run.pendingPack,
    })) };
  });
  const owner = (state, seat) => state.players.find(player => player.seat === seat);
  async function inspect(source, id) {
    if (await frame.locator('#market-inspect').isVisible()) {
      await frame.locator('#market-inspect-back').click(); await settle();
    }
    const tile = frame.locator(`[data-market-action="inspect"][data-id="${source}:${id}"]`);
    for (let attempt = 0; attempt < 10 && !await tile.isVisible(); attempt++) {
      assert.equal(await frame.locator('#market-next').isEnabled(), true, 'the paid choice has a reachable page');
      await frame.locator('#market-next').click(); await settle();
    }
    await tile.click(); await settle();
    await frame.locator('#market-inspect-action').click(); await settle();
  }
  async function select(seat) {
    await frame.locator(`#market-owner-strip [data-id="${seat}"]`).click(); await settle();
    assert.match(await frame.locator('#market-owner').innerText(), new RegExp(`Viewing ${seat.toUpperCase()} `));
    assert.equal(await frame.locator('#run-inventory').count(), 1);
    assert.equal(await frame.locator('#market').count(), 1);
  }
  try {
    await mkdir(output, { recursive: true });
    await frame.locator('#play').click(); await frame.locator('#pause').click();
    await frame.locator('#local-play').click();
    await frame.getByRole('button', { name: /start together/i }).click();
    // Fixture setup supplies prior earned inventory and deterministic stock.
    // Opening/buying the pack, switching views, selling and claiming below
    // all use the shipped visible UI, without invoking a transaction directly.
    const stock = await onSession(function () {
      for (const player of this.players) {
        const run = player.run;
        run.advanceScore(100); run.creditCoins(player.seat === 'p1' ? 400 : 600); run.open();
        const ids = player.seat === 'p1' ? ['traffic-spacing'] : ['magnet', 'traffic-speed', 'platform-length'];
        for (const [index, itemId] of ids.entries()) {
          const item = run.catalog.get(itemId);
          const offer = { id: `earned-${player.seat}-${index}`, itemId, price: item.price, sold: false, section: 'cards' };
          run.market.offers = [offer];
          const result = run.buy(offer.id);
          if (!result.ok) throw new Error(result.message);
        }
        const pack = run.catalog.get('pack-satchel');
        run.market.offers = [{ id: `pack-${player.seat}`, itemId: pack.id, price: pack.price, sold: false, section: 'extras' }];
        run.state = 0; run.revision++; run.close();
      }
      return this.players.map(player => ({ seat: player.seat, offer: player.run.market.offers[0] }));
    });
    await settle(); await frame.locator('#market-open').click(); await settle();
    await select('p2');
    const before = await snapshot();
    assert.equal(owner(before, 'p2').cards.length, 3, 'opening a pack must work with a full hand');
    const offer = stock.find(entry => entry.seat === 'p2').offer;
    await inspect('offer', offer.id);
    const paid = await snapshot(), p2 = owner(paid, 'p2');
    assert.ok(p2.pending, 'P2 visibly opens the large pack');
    assert.equal(p2.wallet, owner(before, 'p2').wallet - offer.price, 'one P2 debit pays for the pack');
    assert.deepEqual(owner(paid, 'p1'), owner(before, 'p1'), 'P1 does not pay or receive a draft');
    const choice = await onSession(function () {
      const run = this.players.find(player => player.seat === 'p2').run;
      return run.pendingPack.choices.find(card => run.previewPack([card.id], [run.cards[0].id]).capacity === run.cardCapacity);
    });
    assert.ok(choice, 'fixture has a choice preserving the three-card capacity');
    await inspect('choice', choice.id);
    assert.match(await frame.locator('#market-pick-count').innerText(), /1\s*\/\s*1/);
    await frame.locator('#market-claim').click(); await settle();
    assert.equal(await frame.locator('#market').getAttribute('data-market-draft-phase'), 'replace');
    await inspect('discard', p2.cards[1].id);
    await select('p1');
    assert.equal(await frame.locator('#market-inspect').isVisible(), false, 'P2 inspection cannot leak into P1');
    assert.equal(await frame.locator('#run-hand-detail').isVisible(), false);
    assert.deepEqual(await snapshot(), paid, 'switching views preserves both inventories, exact paid choices, and clock');
    await select('p2');
    assert.equal(await frame.locator('#market').getAttribute('data-market-draft-phase'), 'choose');
    assert.match(await frame.locator('#market-pick-count').innerText(), /0\s*\/\s*1/, 'returning restores the paid pack with fresh UI selection');
    assert.deepEqual(await snapshot(), paid, 'returning never rerolls or recharges the pack');
    await inspect('choice', choice.id);
    const soldCard = p2.cards[0];
    await frame.locator(`[data-hand-card="${soldCard.id}"]`).click(); await settle();
    assert.match(await frame.locator('#run-hand-detail-owner').innerText(), /Viewing P2 /);
    assert.equal(await frame.locator('#run-hand-sell').isEnabled(), true);
    await frame.locator('#run-hand-sell').click(); await settle();
    const sold = await snapshot();
    assert.equal(await frame.locator('#market').isVisible(), true, 'sale keeps the current pack page open');
    assert.match(await frame.locator('#market-pick-count').innerText(), /1\s*\/\s*1/, 'sale preserves the selected pack choice');
    assert.deepEqual(owner(sold, 'p1'), owner(paid, 'p1'));
    assert.deepEqual(owner(sold, 'p2').pending, p2.pending, 'sale cannot reroll, skip or refund the paid pack');
    assert.equal(owner(sold, 'p2').wallet, p2.wallet + soldCard.saleValue);
    assert.deepEqual(owner(sold, 'p2').cards, p2.cards.slice(1));
    await iframe.screenshot({ path: new URL('survive-market-pack-owner-sale.png', output).pathname });
    await frame.locator('#market-claim').click(); await settle();
    const claimed = await snapshot();
    assert.equal(owner(claimed, 'p2').pending, null);
    assert.deepEqual(owner(claimed, 'p2').cards.map(card => card.id), [...p2.cards.slice(1).map(card => card.id), choice.id], 'old replacement selection cannot discard an additional card');
    assert.equal(owner(claimed, 'p2').wallet, owner(sold, 'p2').wallet);
    assert.deepEqual(owner(claimed, 'p1'), owner(paid, 'p1'));
    assert.equal(claimed.time, paid.time, 'pack, hand and owner views retain the paused course');
    evidence.checkpoints.push({ before, paid, sold, claimed });
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } catch (error) {
    evidence.failure = String(error);
    await iframe.screenshot({ path: new URL('survive-market-pack-owner-failure.png', output).pathname }).catch(() => {});
    throw error;
  } finally {
    await writeFile(new URL('survive-market-pack-owner-runtime.json', output), JSON.stringify(evidence, null, 2));
    await app.close();
  }
});
