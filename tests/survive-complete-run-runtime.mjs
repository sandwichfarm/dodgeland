import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url);
const seed = 'ph3-c7045dbd-pond-a-n';
const pad = (index, buttons = []) => ({ index, id: `Complete flock ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +buttons.includes(button), pressed: buttons.includes(button), touched: buttons.includes(button) })) });

test('one Arcade course survives adoption, four-player recovery, settlement and clean solo retry', { timeout: 120_000 }, async () => {
  const evidence = { errors: [], external: [], checkpoints: [] };
  const app = await createMarketGameFixture(evidence, { gamepads: true,
    initialIntent: { sender: 'complete-run-fixture', archetype: 'game', action: 'open', convention: 'napplet:game/open', payload: { seed } } });
  const { frame, page, iframe, onGame, onSession, advance, sendPads } = app;
  const connected = new Set();
  const settle = () => advance(100);
  const press = async (index, button = 0) => {
    await sendPads([...connected].map(i => pad(i)));
    await sendPads([...connected].map(i => pad(i, i === index ? [button] : [])));
    await sendPads([...connected].map(i => pad(i)));
  };
  const read = () => onSession(function () {
    return { time: this.world.time, result: this.result ?? null, items: this.consumableSnapshot(),
      players: this.players.map(player => ({ seat: player.seat, participantId: player.participantId,
        character: player.characterId, participation: player.participation, x: player.groundX, y: player.groundY,
        wallet: player.run.wallet, cards: player.run.cards, pending: player.run.pendingPack, recovery: player.recovery })) };
  });
  const owner = (state, seat) => state.players.find(player => player.seat === seat);
  const record = async label => { const state = await read(); evidence.checkpoints.push({ label, state }); return state; };
  async function select(seat) {
    const strip = frame.locator(`#market-owner-strip [data-id="${seat}"]`);
    if (await frame.locator('#market').isVisible()) await strip.click();
    else await frame.locator(`#session-seats [data-seat="${seat}"] .session-hud-identity`).click();
    await settle();
  }
  async function buyItem(seat, name) {
    await select(seat); await frame.locator('#market-open').click(); await settle();
    const offer = frame.getByRole('button', { name: new RegExp(`${name}.*View details`, 'i') });
    for (let count = 0; count < 8 && !await offer.isVisible(); count++) {
      assert.equal(await frame.locator('#market-next').isEnabled(), true, `${name} has a reachable market page`);
      await frame.locator('#market-next').click(); await settle();
    }
    await offer.click(); await frame.getByRole('button', { name: new RegExp(`^Buy ${name} ·`) }).click(); await settle();
    await frame.locator('#market-close').click(); await advance(300);
  }
  async function die(seats) {
    await onSession(function (seats) {
      for (const seat of seats) this.world.host.inPlayerOperation(this.players.find(player => player.seat === seat), context => context.end('Complete run train', 'train'));
      this.update(1 / 120);
    }, seats);
    await settle();
    for (const seat of seats) assert.equal(owner(await read(), seat).participation, 'dead');
  }
  async function resume() {
    const button = frame.getByRole('button', { name: 'Resume game', exact: true });
    if (await button.isVisible()) await button.click();
    await settle();
  }
  try {
    await mkdir(output, { recursive: true }); await settle();
    assert.equal(await onGame(function () { return this.seedCode; }), seed);
    await frame.locator('#play').click();
    // Arrange a safe corridor; admission, item claims, deaths and recovery still
    // run through the actual production owners, never a replacement session.
    await onGame(function () {
      for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined });
      this.waveRow = -100;
    });
    await advance(250); await frame.locator('#pause').click();
    const soloBefore = await onGame(function () {
      window.marketGameFixture.retained = { game: this, world: this.world, player: this.player, run: this.run, rows: this.rows, rng: this.mobDirector.rng };
      return { seed: this.seedCode, time: this.time, x: this.x, y: this.y, marketState: this.run.state, rows: JSON.stringify([...this.rows]) };
    });
    await frame.locator('#local-play').click(); await advance(500);
    await frame.locator('#local-session-back').click();
    assert.deepEqual(await onGame(function () { return { seed: this.seedCode, time: this.time, x: this.x, y: this.y, marketState: this.run.state, rows: JSON.stringify([...this.rows]) }; }), soloBefore);
    await frame.locator('#local-play').click(); await frame.getByRole('button', { name: /start together/i }).click();
    assert.equal(await onSession(function () {
      const retained = window.marketGameFixture.retained;
      return this.world === retained.world && this.players[0] === retained.player && this.players[0].run === retained.run
        && this.world.rows === retained.rows && this.world.host.mobDirector.rng === retained.rng;
    }), true, 'adoption retains the actual world, primary player, inventory and actor RNG');
    for (const index of [2, 3]) {
      connected.add(index); await press(index);
      await frame.getByRole('button', { name: new RegExp(`join as p${index + 1}`, 'i') }).click(); await settle();
    }
    const joined = await record('four players');
    assert.equal(joined.players.length, 4);
    assert.equal(new Set(joined.players.map(player => player.character)).size, 4);
    assert.equal(new Set(joined.players.map(player => `${player.x}:${player.y}`)).size, 4);

    const pickup = joined.items.pickups.find(item => item.itemId === 'revival');
    assert.ok(pickup, 'the seeded course provides a real deterministic Revival');
    await onSession(function (pickup) {
      for (const player of this.players.slice(0, 2)) {
        player.x = player.fromX = pickup.x; player.y = player.fromY = pickup.y; player.hop = 0;
      }
    }, pickup);
    await settle();
    const collected = await record('contested pickup');
    assert.equal(collected.items.claims.filter(claim => claim.pickupId === pickup.id).length, 1);
    assert.equal(collected.items.charges.reduce((total, charge) => total + charge.revival, 0), 1);

    await onSession(function () { this.players.find(player => player.seat === 'p3').run.creditCoins(7); });
    const retainedP3 = owner(await read(), 'p3');
    connected.delete(2); await sendPads([...connected].map(index => pad(index))); await settle();
    assert.equal(owner(await read(), 'p3').participation, 'device-lost');
    connected.add(2); await press(2);
    await frame.getByRole('heading', { name: 'Reclaim P3', exact: true }).waitFor();
    await press(2); await settle();
    const reclaimed = owner(await read(), 'p3');
    assert.equal(reclaimed.participantId, retainedP3.participantId); assert.equal(reclaimed.wallet, 7);

    await die(['p4']);
    await frame.getByRole('button', { name: /^Use personal revive/ }).click(); await settle();
    const spent = owner(await read(), 'p4');
    assert.equal(spent.recovery.charge, 'spent');
    await frame.locator('#session-seats [data-seat="p4"] [data-session-hud="item"]').click();
    await frame.getByRole('button', { name: 'Leave P4 run', exact: true }).click();
    await frame.getByRole('button', { name: 'Leave run', exact: true }).click(); await settle();
    assert.equal((await read()).players.length, 3);
    connected.delete(3); await sendPads([...connected].map(index => pad(index)));
    connected.add(3); await press(3);
    await frame.getByRole('button', { name: /join as p4/i }).click(); await settle();
    const rejoined = owner(await record('deliberate departure and new participation'), 'p4');
    assert.notEqual(rejoined.participantId, spent.participantId);
    assert.equal(rejoined.wallet, 0); assert.deepEqual(rejoined.cards, []);
    assert.equal(rejoined.recovery.grantId, spent.recovery.grantId);
    assert.equal(rejoined.recovery.charge, 'spent', 'same-controller re-entry cannot farm a personal revive');

    await onSession(function () {
      for (const player of this.players) {
        player.run.advanceScore(100); player.run.creditCoins(100);
        player.run.market.offers = ['traffic-speed', 'pack-satchel'].map(itemId => {
          const item = player.run.catalog.get(itemId);
          return { id: `${player.seat}-${itemId}`, itemId, price: item.price, sold: false, section: item.kind === 'card' ? 'cards' : 'extras' };
        }); player.run.revision++;
      }
    });
    const beforeBuy = await read();
    await buyItem('p2', 'Revival'); await buyItem('p3', 'Flare');
    const purchased = await record('two owners purchase recovery');
    assert.equal(owner(purchased, 'p2').wallet, owner(beforeBuy, 'p2').wallet - 24);
    assert.equal(owner(purchased, 'p3').wallet, owner(beforeBuy, 'p3').wallet - 36);
    for (const seat of ['p2', 'p3']) {
      await select(seat); await frame.locator('#market-open').click(); await settle();
      async function inspectAndAct(key) {
        if (await frame.locator('#market-inspect').isVisible()) {
          await frame.locator('#market-inspect-back').click(); await settle();
        }
        const tile = frame.locator(`[data-market-action="inspect"][data-id="${key}"]`);
        for (let count = 0; count < 8 && !await tile.isVisible(); count++) {
          await frame.locator('#market-next').click(); await settle();
        }
        await tile.click(); await settle(); await frame.locator('#market-inspect-action').click(); await settle();
      }
      const before = await read();
      await inspectAndAct(`offer:${seat}-traffic-speed`);
      const bought = await read(), card = owner(bought, seat).cards[0];
      assert.ok(card, `${seat} receives its purchased card`);
      assert.deepEqual(bought.players.filter(player => player.seat !== seat).map(player => player.wallet), before.players.filter(player => player.seat !== seat).map(player => player.wallet));
      await frame.locator(`[data-hand-card="${card.id}"]`).click(); await settle();
      await frame.locator('#run-hand-sell').click(); await settle();
      assert.equal(await frame.locator('#market').isVisible(), true, 'selling preserves the current market');
      assert.equal(owner(await read(), seat).wallet, owner(bought, seat).wallet + card.saleValue);
      await inspectAndAct(`offer:${seat}-pack-satchel`);
      const paid = owner(await read(), seat);
      assert.ok(paid.pending, `${seat} opens a paid pack`);
      if (seat === 'p2') {
        await inspectAndAct(`choice:${paid.pending.choices[0].id}`);
        await frame.locator('#market-claim').click(); await settle();
        assert.ok(owner(await read(), seat).cards.some(card => card.id === paid.pending.choices[0].id));
      } else {
        await frame.locator('#market-skip').click(); await settle();
        assert.equal(owner(await read(), seat).cards.length, 0);
      }
      assert.equal(owner(await read(), seat).pending, null);
      assert.equal(owner(await read(), seat).wallet, paid.wallet, 'claim or skip never charges twice or refunds a paid pack');
      await frame.locator('#market-close').click(); await advance(300);
    }
    const traded = await record('two owners buy sell and resolve paid packs');
    await resume(); await die(['p1']);
    assert.equal(owner(await read(), 'p1').wallet, 0, 'death drops only the dead owner wallet');
    assert.equal(owner(await read(), 'p2').wallet, owner(traded, 'p2').wallet);
    await frame.getByRole('button', { name: /^Use personal revive/ }).click(); await settle();
    assert.equal(owner(await read(), 'p1').participation, 'active');
    await advance(2400); await die(['p1']);
    await frame.locator('#session-seats [data-seat="p2"] [data-session-hud="item"]').click();
    await frame.getByRole('button', { name: 'Use Revival ×1', exact: true }).click();
    const recovery = frame.locator('#survive-recovery-board');
    const target = recovery.getByRole('button', { name: 'Revive P1', exact: true });
    if (await target.isVisible()) await target.click();
    await recovery.getByRole('button', { name: 'Use Revival', exact: true }).click(); await settle();
    assert.equal(owner(await read(), 'p1').participation, 'active');
    assert.equal((await read()).items.charges.find(charge => charge.seat === 'p2').revival, 0);
    await resume(); await advance(2400); await die(['p1', 'p2']);
    await frame.locator('#session-seats [data-seat="p3"] [data-session-hud="item"]').click();
    await frame.getByRole('button', { name: 'Use Flare ×1', exact: true }).click();
    await frame.locator('#survive-recovery-board').getByRole('button', { name: 'Use Flare', exact: true }).click(); await settle();
    const regrouped = await record('Flare regroups the flock');
    assert.ok(regrouped.players.every(player => player.participation === 'active'));
    assert.equal(new Set(regrouped.players.map(player => `${player.x}:${player.y}`)).size, 4);
    assert.equal(regrouped.items.charges.find(charge => charge.seat === 'p3').flare, 0);
    await iframe.screenshot({ path: new URL('survive-complete-regroup.png', output).pathname });

    await resume(); await advance(2400); await die(['p1', 'p2', 'p3', 'p4']);
    assert.equal((await read()).result, null, 'remaining personal offers defer settlement');
    await advance(9000);
    const settled = await record('team settlement');
    assert.equal(settled.result?.mode, 'survive-together');
    await frame.getByRole('heading', { name: "The flock's run", exact: true }).waitFor();
    await iframe.screenshot({ path: new URL('survive-complete-result.png', output).pathname });
    await advance(1500); assert.deepEqual((await read()).result, settled.result);
    await frame.getByRole('button', { name: 'Hop again', exact: true }).click(); app.refreshOwners(); await settle();
    assert.equal(await frame.locator('#session-seats').isVisible(), false);
    assert.equal(await frame.locator('#run-hand-items').isVisible(), false);
    assert.equal(await onGame(function () { return this.worldExtensionSnapshot() === undefined; }), true);
    await frame.locator('#play').click(); await frame.locator('#scene').focus(); await page.keyboard.press('w'); await advance(250);
    assert.equal(await onGame(function () { return this.maxY; }), 1, 'retry restores ordinary solo controls');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } catch (error) {
    evidence.failure = String(error);
    await iframe.screenshot({ path: new URL('survive-complete-failure.png', output).pathname }).catch(() => {});
    throw error;
  } finally {
    await writeFile(new URL('survive-complete-run.json', output), JSON.stringify(evidence, null, 2));
    await app.close();
  }
});
