import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const pad = (index, pressed = []) => ({ index, id: `Ghost market ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })) });

test('a ghost market stays inspectable and can close without authorizing an inventory mutation', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, advance, onSession, sendPads } = app;
  const settle = () => advance(300);
  const press = async (index, button) => {
    await sendPads([pad(0), pad(1)]);
    await sendPads([pad(0, index === 0 ? [button] : []), pad(1, index === 1 ? [button] : [])]);
    await sendPads([pad(0), pad(1)]);
  };
  const inventory = () => onSession(function () {
    return this.players.map(player => ({ seat: player.seat, participantId: player.participantId,
      cards: player.run.cards, wallet: player.run.wallet, pending: player.run.pendingPack }));
  });
  try {
    await sendPads([pad(0), pad(1)]); await press(0, 0); await press(1, 0);
    await frame.getByRole('button', { name: /start together/i }).click(); await settle();
    await onSession(function () {
      for (const player of this.players) {
        const run = player.run, item = run.catalog.get('traffic-speed');
        run.advanceScore(100); run.creditCoins(50);
        run.market.offers = [{ id: `stock-${player.seat}`, itemId: item.id, price: item.price, sold: false, section: 'cards' }];
        run.revision++;
      }
    });
    await settle();
    await frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click(); await settle();
    await frame.locator('#market-open').click(); await settle();
    await frame.locator('[data-market-action="inspect"][data-id="offer:stock-p2"]').click(); await settle();
    assert.equal(await frame.locator('#market-inspect-action').isEnabled(), true);
    const before = await inventory();
    await sendPads([pad(0)]); await settle();
    assert.equal(await onSession(function () { return this.players.find(player => player.seat === 'p2').participation; }), 'device-lost');
    assert.equal(await frame.locator('#market').isVisible(), true, 'disconnect leaves the selected inventory inspectable');
    assert.match(await frame.locator('#market-owner').innerText(), /Viewing P2 /);
    if (!await frame.locator('#market-inspect').isVisible()) {
      await frame.locator('[data-market-action="inspect"][data-id="offer:stock-p2"]').click(); await settle();
    }
    assert.equal(await frame.locator('#market-inspect-action').isDisabled(), true);
    assert.match(await frame.locator('#market-inspect-note').innerText(), /P2 must reclaim their controller first\./);
    await frame.locator('#market-close').click(); await settle();
    assert.equal(await frame.locator('#market').isVisible(), false, 'ghost Close exits the read-only surface despite lacking an eligible action context');
    assert.deepEqual(await inventory(), before);
    await frame.locator('#session-seats [data-seat="p1"] .session-hud-identity').click(); await settle();
    await frame.locator('#market-open').click(); await settle();
    await frame.locator('#market-owner-strip [data-id="p2"]').click(); await settle();
    assert.equal(await frame.locator('#market').isVisible(), true, 'selecting a ghost from another owner retains the one market tree');
    assert.match(await frame.locator('#market-owner').innerText(), /Viewing P2 /);
    assert.match(await frame.locator('#market-window').innerText(), /P2 must reclaim their controller first\./);
    await frame.locator('#market-close').click(); await settle();
    assert.equal(await frame.locator('#market').isVisible(), false);
    assert.deepEqual(await inventory(), before, 'read-only view changes preserve both wallets, cards and paid drafts');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});


test('disconnect during a paid pack permits read-only dismissal and preserves the exact draft', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, advance, onSession, sendPads } = app;
  const settle = () => advance(350);
  const inventory = () => onSession(function () {
    return this.players.map(player => ({ seat: player.seat, participantId: player.participantId,
      cards: player.run.cards, wallet: player.run.wallet, pending: player.run.pendingPack }));
  });
  try {
    await sendPads([pad(0), pad(1)]);
    for (const index of [0, 1]) {
      await sendPads([pad(0, index === 0 ? [0] : []), pad(1, index === 1 ? [0] : [])]);
      await sendPads([pad(0), pad(1)]);
    }
    await frame.getByRole('button', { name: /start together/i }).click(); await settle();
    await onSession(function () {
      const run = this.players.find(player => player.seat === 'p2').run;
      const pack = run.catalog.get('pack-satchel');
      run.advanceScore(100); run.creditCoins(100);
      run.market.offers = [{ id: 'ghost-paid-pack', itemId: pack.id, price: pack.price, sold: false, section: 'extras' }];
      run.revision++;
    });
    await settle();
    await frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click(); await settle();
    await frame.locator('#market-open').click(); await settle();
    await frame.locator('[data-market-action="inspect"][data-id="offer:ghost-paid-pack"]').click(); await settle();
    await frame.locator('#market-inspect-action').click(); await settle();
    const paid = await inventory();
    assert.ok(paid.find(player => player.seat === 'p2').pending, 'the pack was purchased through the visible UI');
    await sendPads([pad(0)]); await settle();
    assert.equal(await frame.locator('#market').isVisible(), true);
    assert.match(await frame.locator('#market-window').innerText(), /P2 must reclaim their controller first\./);
    assert.equal(await frame.locator('#market-close').isVisible(), true, 'a ghost can dismiss a paid draft without skipping it');
    await frame.locator('#market-close').click(); await settle();
    assert.equal(await frame.locator('#market').isVisible(), false, 'read-only pack dismissal must not trap the session');
    assert.deepEqual(await inventory(), paid, 'dismissal preserves exact paid choices, wallets and cards for reclaim');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});
