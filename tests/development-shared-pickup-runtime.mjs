import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url);
const pad = (index, pressed = []) => ({ index, id: `Shared pickup ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })) });

test('actual Survive Flow owners purchase magnets, arbitrate one coin, and release a disconnected pull', { timeout: 90_000 }, async () => {
  const evidence = { complete: false, errors: [], external: [], checkpoints: [],
    provenance: 'Built app: public controller admission, market purchase and disconnect; controlled real RAF. Explicitly arranged meadow, stock/wallet/market eligibility, and coin/player starting positions.' };
  const app = await createMarketGameFixture(evidence, { gamepads: true, initialIntent: {
    sender: 'shared-pickup-witness', archetype: 'game', action: 'open', convention: 'napplet:game/open', payload: { seed: 'ph3-00000071-pond-s-n' },
  } });
  const { frame, advance, onSession, sendPads } = app;
  const press = async index => {
    await sendPads([pad(0), pad(1)]);
    await sendPads([pad(0, index === 0 ? [0] : []), pad(1, index === 1 ? [0] : [])]);
    await sendPads([pad(0), pad(1)]);
  };
  const read = () => onSession(function () {
    const lane = this.world.rows.get(0);
    return { session: this.id, base: this.definition.id,
      kind: this.mode?.handlers.retainDeadDevice ? 'race' : this.mode?.handlers.canAct ? 'relay' : this.mode ? 'survive' : 'uncomposed',
      owned: this.world.host.world === this.world && this.players.every(p => p.world === this.world && p.session === this),
      tick: this.world.simulationTick, coin: lane.coin, pull: lane.coinPull ?? null,
      owners: [...this.world.pickupOwners], attracted: [...this.world.attractedCoins.keys()],
      players: this.players.map(p => ({ seat: p.seat, participant: p.participantId, device: p.device,
        participation: p.participation, x: p.groundX, y: p.groundY, coins: p.coins, wallet: p.run.wallet,
        pickups: p.statistics.pickups, cards: p.run.cards, cosmetics: p.run.cosmetics,
        recovery: p.recovery, health: p.health, maxHealth: p.maxHealth, hurt: p.hurtRemaining, deaths: p.statistics.deaths, damage: p.statistics.damage, radius: p.run.effects.coinRadius })) };
  });
  const record = async label => { const state = await read(); evidence.checkpoints.push({ label, state }); return state; };
  const resources = state => state.players.map(({ participant, cards, cosmetics, recovery, health, maxHealth, hurt, deaths, damage }) => ({ participant, cards, cosmetics, recovery: Object.fromEntries(Object.entries(recovery).filter(([key]) => key !== 'lastSafe')), health, maxHealth, hurt, deaths, damage }));
  function payout(before, after, seat) {
    assert.deepEqual(resources(after), resources(before), 'collection does not alter cards, cosmetics, personal recovery or participant identity');
    for (const [index, player] of after.players.entries()) {
      const delta = +(player.seat === seat), old = before.players[index];
      assert.equal(player.wallet, old.wallet + delta, `${player.seat} exact wallet award`);
      assert.equal(player.coins, old.coins + delta, `${player.seat} exact coin award`);
      assert.equal(player.pickups, old.pickups + delta, `${player.seat} exact pickup count`);
    }
    assert.equal(after.coin, null); assert.equal(after.pull, null);
    assert.deepEqual(after.owners, []); assert.deepEqual(after.attracted, []);
  }
  // Only named initial positions and one ordinary reward are arranged. No
  // collection/claim/update helper is called; subsequent frames belong to main.
  async function place(p1, p2) {
    await onSession(function (positions) {
      for (const [index, player] of this.players.entries()) {
        player.x = player.fromX = positions[index]; player.y = player.fromY = 0; player.hop = 0;
      }
      const lane = this.world.rows.get(0);
      if (lane.coinPull || this.world.pickupOwners.size || this.world.attractedCoins.size) throw new Error('previous reward not cleaned up');
      lane.coin = 0; delete lane.coinDenomination; delete lane.coinActor;
    }, [p1, p2]);
    return read();
  }
  async function arrive() {
    for (let step = 0; step < 80 && (await read()).coin !== null; step++) await advance(32);
    assert.equal((await read()).coin, null, 'real app frames complete the pull within the bounded window');
  }
  try {
    await mkdir(output, { recursive: true });
    await sendPads([pad(0), pad(1)]); await press(0); await press(1);
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(100);
    const acquired = await record('public admission');
    assert.equal(acquired.base, 'stroll'); assert.equal(acquired.kind, 'survive'); assert.equal(acquired.owned, true);
    assert.equal(acquired.players.length, 2); assert.equal(new Set(acquired.players.map(p => p.participant)).size, 2);
    assert.ok(acquired.players.every(p => p.device.startsWith('gamepad-')), 'both players belong to actual shell controllers');
    await onSession(function () {
      for (const lane of this.world.rows.values()) {
        Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
        delete lane.actors; delete lane.coinActor;
      }
      for (const player of this.players) {
        const run = player.run; run.advanceScore(100); run.creditCoins(100);
        const item = run.catalog.get('magnet');
        run.market.offers = [{ id: `shared-magnet-${player.seat}`, itemId: item.id, price: item.price, sold: false, section: 'cards' }];
        run.revision++;
      }
    });
    await advance(80);
    await frame.locator('#market-open').click(); await advance(80);
    for (const seat of ['p1', 'p2']) {
      if (await frame.locator('#market-inspect').isVisible()) { await frame.locator('#market-inspect-back').click(); await advance(80); }
      await frame.locator(`#market-owner-strip [data-id="${seat}"]`).click(); await advance(80);
      const price = await onSession(function (seat) {
        return this.players.find(p => p.seat === seat).run.market.offers[0].price;
      }, seat);
      const before = await read();
      await frame.locator(`[data-market-action="inspect"][data-id="offer:shared-magnet-${seat}"]`).click();
      await advance(80);
      await frame.locator('#market-inspect-action').click(); await advance(80);
      const bought = await record(`public magnet ${seat}`), index = bought.players.findIndex(p => p.seat === seat);
      assert.equal(bought.players[index].wallet, before.players[index].wallet - price, await frame.locator('#market-inspect-note').textContent());
      assert.equal(bought.players[index].cards.length, before.players[index].cards.length + 1);
      assert.deepEqual(bought.players[index].cards.at(-1).components.map(component => component.itemId), ['magnet']);
      assert.ok(bought.players[index].radius > before.players[index].radius);
      assert.deepEqual(bought.players[1 - index], before.players[1 - index], 'purchase cannot change another owner');
    }
    if (await frame.locator('#market-inspect').isVisible()) { await frame.locator('#market-inspect-back').click(); await advance(80); }
    await frame.locator('#market-close').click(); await advance(350);
    const resume = frame.getByRole('button', { name: 'Resume game', exact: true });
    if (await resume.isVisible()) { await resume.click(); await advance(80); }
    assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'playing');
    await app.iframe.screenshot({ path: new URL('shared-pickup-before.png', output).pathname });
    const contact = await place(-.55, 0); await advance(32);
    payout(contact, await record('contact wins before pull'), 'p2');
    const tie = await place(-.65, .65); await advance(16);
    const pulling = await record('equal-distance pull election');
    // SharedWorld.resolvePickups orders equal-time, equal-distance claims by
    // seat.localeCompare. P1 is the contract's tie winner, not a sampled guess.
    assert.deepEqual(pulling.owners, [[0, 'p1']]); assert.deepEqual(pulling.attracted, [0]);
    assert.notEqual(pulling.pull, null); assert.equal(pulling.coin, 0);
    assert.deepEqual(pulling.players.map(p => p.wallet), tie.players.map(p => p.wallet), 'capture is not payout');
    await app.iframe.screenshot({ path: new URL('shared-pickup-in-flight.png', output).pathname });
    await arrive(); payout(tie, await record('single pull payout'), 'p1');
    const lost = await place(-.65, .65); await advance(16);
    assert.deepEqual((await read()).owners, [[0, 'p1']]);
    await sendPads([pad(1)]);
    const disconnected = await record('public disconnect during pull');
    assert.equal(disconnected.players[0].participation, 'device-lost');
    assert.ok(disconnected.owners.every(([, owner]) => owner !== 'p1'), 'inactive claim released by actual frame');
    assert.equal(disconnected.players[0].wallet, lost.players[0].wallet);
    await arrive(); payout(lost, await record('remaining owner receives reward'), 'p2');
    const settled = await read(); await advance(600);
    const later = await record('no duplicate payout');
    assert.deepEqual(later.players.map(p => [p.wallet, p.coins, p.pickups]), settled.players.map(p => [p.wallet, p.coins, p.pickups]));
    assert.equal(later.session, acquired.session); assert.equal(later.owned, true);
    assert.ok(later.tick > contact.tick); assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
    await app.iframe.screenshot({ path: new URL('shared-pickup-after.png', output).pathname });
    evidence.complete = true;
  } finally {
    try { await app.close(); } catch (error) { evidence.complete = false; throw error; }
    await writeFile(new URL('shared-pickup-runtime.json', output), JSON.stringify(evidence, null, 2));
  }
});
