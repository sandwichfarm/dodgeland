import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarketGameFixture, sessionHudAction } from './market-game-fixture.mjs';

const pad = (index, pressed = []) => ({ index, id: `Recovery outcomes ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })) });

async function fourPlayers(app) {
  const { frame, sendPads, onGame, advance } = app;
  await sendPads([0, 1, 2, 3].map(index => pad(index)));
  for (let index = 0; index < 4; index++) {
    await sendPads([0, 1, 2, 3].map(seat => pad(seat, seat === index ? [0] : [])));
    await sendPads([0, 1, 2, 3].map(seat => pad(seat)));
  }
  // Arrange a safe course through the existing debugger seam. Recovery and
  // admission authority remain the shipped code, with no added app test API.
  await onGame(function () {
    for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined });
  });
  await frame.getByRole('button', { name: /start together/i }).click(); await advance(80);
  assert.deepEqual(await app.onSession(function () { return this.players.map(player => player.seat); }), ['p1', 'p2', 'p3', 'p4']);
}

async function purchase(app, seat, itemId) {
  assert.equal(await app.onSession(function (seat, itemId) {
    const owner = this.players.find(player => player.seat === seat);
    owner.run.advanceScore(100); owner.run.creditCoins(itemId === 'revival' ? 24 : 36); owner.run.open();
    const context = this.openCoOpMarket({ seat, device: owner.device, participantId: owner.participantId });
    const result = this.actCoOpMarket({ actionId: `outcome-buy-${seat}-${itemId}`, seat, device: owner.device, participantId: owner.participantId,
      expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration,
      expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration, kind: 'buy-consumable', itemId });
    owner.run.close(); return result.ok;
  }, seat, itemId), true, 'the real owner transaction purchases the charge');
}

async function die(app, seats) {
  assert.equal(await app.onSession(function (seats) {
    for (const seat of seats) this.world.host.inPlayerOperation(this.players.find(player => player.seat === seat), player => player.end('Recovery outcome train', 'train'));
    this.update(1 / 120);
    return seats.every(seat => this.players.find(player => player.seat === seat).participation === 'dead');
  }, seats), true, 'production terminal events produce authoritative dead targets');
  await app.advance(50);
}

function observe(app) {
  return app.onSession(function () { return { time: this.world.time, charges: this.consumableSnapshot().charges,
    players: this.players.map(player => ({ seat: player.seat, participantId: player.participantId, participation: player.participation,
      x: player.groundX, y: player.groundY, health: player.health, wallet: player.run.wallet,
      cards: player.run.cards, protection: player.recovery.protectionUntil })) }; });
}

async function openItem(app, seat, item) {
  await sessionHudAction(app, seat, 'item');
  await app.frame.getByRole('button', { name: `Use ${item} ×1`, exact: true }).click();
  return app.frame.locator('#survive-recovery-board');
}

for (const [owner, target] of [['p1', 'p3'], ['p2', 'p1']]) test(`${owner}: four-player Revival commits only the selected target and retains the menu pause`, { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  try {
    await fourPlayers(app); await purchase(app, owner, 'revival'); await die(app, [target, 'p4']);
    const board = await openItem(app, owner, 'Revival');
    assert.equal(await board.getByRole('heading', { name: 'Choose a teammate', exact: true }).isVisible(), true);
    assert.deepEqual(await board.locator('[data-target]').evaluateAll(nodes => nodes.map(node => node.dataset.target)), [target, 'p4']);
    assert.equal(await app.frame.evaluate(() => document.activeElement?.getAttribute('data-target')), target, 'the first eligible target owns initial focus');
    const before = await observe(app);
    await board.getByRole('button', { name: `Revive ${target.toUpperCase()}`, exact: true }).click();
    await board.getByRole('button', { name: 'Use Revival', exact: true }).click();
    assert.equal(await board.count(), 0);
    const after = await observe(app), returned = after.players.find(player => player.seat === target);
    assert.equal(returned.participation, 'active'); assert.ok(returned.protection > after.time);
    assert.equal(returned.wallet, 0); assert.equal(returned.cards.length, 0);
    assert.equal(after.charges.find(charge => charge.seat === owner).revival, 0);
    assert.deepEqual(after.players.filter(player => player.seat !== target), before.players.filter(player => player.seat !== target), 'teammate positions and economies do not change');
    assert.equal(new Set(after.players.filter(player => player.participation === 'active').map(player => `${player.x}:${player.y}`)).size, 3);
    await app.advance(3000);
    assert.deepEqual(await observe(app), after, 'wall time cannot advance the paused world, offers, or protection');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});

test('P2 Flare returns two teammates and regroups paused living P1 without healing or resuming', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  try {
    await fourPlayers(app); await purchase(app, 'p2', 'flare');
    await app.onSession(function () {
      const positions = [[-4, 6], [2, 2], [0, 3], [4, 1]];
      this.players.forEach((player, index) => {
        [player.x, player.y] = positions[index]; player.fromX = player.x; player.fromY = player.y; player.maxY = player.y;
        player.run.creditCoins(index + 7);
      });
    });
    await die(app, ['p3', 'p4']);
    const board = await openItem(app, 'p2', 'Flare');
    assert.equal(await board.getByText('Return P3, P4 and regroup the flock safely.', { exact: true }).isVisible(), true);
    const before = await observe(app), anchor = before.players.find(player => player.seat === 'p2');
    await board.getByRole('button', { name: 'Use Flare', exact: true }).click();
    assert.equal(await board.count(), 0);
    const after = await observe(app);
    assert.equal(after.charges.find(charge => charge.seat === 'p2').flare, 0);
    assert.equal(new Set(after.players.map(player => `${player.x}:${player.y}`)).size, 4, 'all regrouped players occupy distinct cells');
    for (const player of after.players) {
      assert.equal(player.participation, 'active'); assert.ok(player.protection > after.time);
      assert.ok(Math.abs(player.y - anchor.y) <= 2, 'every participant joins the owner’s safe neighborhood');
      const previous = before.players.find(value => value.seat === player.seat);
      assert.equal(player.participantId, previous.participantId);
      assert.equal(player.wallet, previous.wallet); assert.deepEqual(player.cards, previous.cards);
      if (previous.participation === 'active') assert.equal(player.health, previous.health, 'a regroup does not heal a living player');
    }
    const owner = after.players.find(player => player.seat === 'p2');
    assert.deepEqual([owner.x, owner.y], [anchor.x, anchor.y]);
    assert.notDeepEqual([after.players[0].x, after.players[0].y], [before.players[0].x, before.players[0].y], 'paused P1 is included in the regroup');
    await app.advance(3000); assert.deepEqual(await observe(app), after, 'the successful Flare preserves the menu pause');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});

test('zero-target, stale-target, and unsafe Flare UI outcomes retain charges and positions', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  try {
    await fourPlayers(app); await purchase(app, 'p1', 'revival'); await purchase(app, 'p1', 'flare');
    for (const item of ['Revival', 'Flare']) {
      const board = await openItem(app, 'p1', item), before = await observe(app);
      assert.equal(await board.getByText(item === 'Revival' ? 'No teammate can be revived right now.' : 'No teammate needs a flare right now.', { exact: true }).isVisible(), true);
      assert.equal(await board.getByRole('button', { name: `Use ${item}`, exact: true }).count(), 0);
      await board.getByRole('button', { name: 'Back to paused run', exact: true }).click();
      assert.deepEqual(await observe(app), before);
    }
    await app.frame.getByRole('button', { name: 'Resume game', exact: true }).click();
    await die(app, ['p3']);
    let board = await openItem(app, 'p1', 'Revival');
    assert.equal(await app.onSession(function () { return this.recover({ kind: 'personal', ownerSeat: 'p3' }); }), true);
    const changed = await observe(app);
    await board.getByRole('button', { name: 'Use Revival', exact: true }).click();
    assert.equal(await board.getByText('P3 can’t return safely yet. Revival kept.', { exact: true }).isVisible(), true);
    assert.deepEqual(await observe(app), changed, 'a target recovered elsewhere cannot consume the old selection');
    await board.getByRole('button', { name: 'Back to paused run', exact: true }).click();
    await app.frame.getByRole('button', { name: 'Resume game', exact: true }).click();
    await die(app, ['p4']);
    board = await openItem(app, 'p1', 'Flare');
    assert.equal(await app.frame.evaluate(() => document.activeElement?.textContent), 'Back to paused run');
    await app.onSession(function () { for (const lane of this.world.rows.values()) lane.blocked = Array.from({ length: 11 }, (_, index) => index - 5); });
    const unsafe = await observe(app);
    await board.getByRole('button', { name: 'Use Flare', exact: true }).click();
    assert.equal(await board.getByText('The flock can’t regroup safely yet. Flare kept.', { exact: true }).isVisible(), true);
    assert.deepEqual(await observe(app), unsafe, 'failed placement neither spends a charge nor partially relocates the flock');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});
