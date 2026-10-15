import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const pad = (index, pressed = []) => ({ index, id: `Recovery lifecycle ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })) });

test('a built live run joins, exposes owner recovery controls, and commits a personal revive', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] };
  const app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, advance, onSession } = app;
  try {
    await frame.locator('#play').click();
    await frame.locator('#pause').click();
    await frame.locator('#local-play').click();
    await frame.getByRole('button', { name: /start together/i }).click();
    await frame.locator('#session-seats').waitFor();
    await advance(120);
    assert.equal(await frame.getByText(/Personal revive:/).count() >= 2, true, 'the two visible owners expose distinct personal revive progress');
    assert.equal(await frame.getByText(/Items:/).count() >= 2, true, 'the two visible owners expose owned item counts');

    // The fixture only stages a fatal production hazard. Session lifecycle,
    // offer creation, and the visible recovery action remain production code.
    assert.equal(await onSession(function () {
      const player = this.players.find(value => value.seat === 'p1');
      this.world.host.inPlayerOperation(player, context => context.end('Tracer traffic', 'traffic', 'front'));
      this.update(1 / 120);
      return player.participation === 'dead' && !!player.recovery?.offer;
    }), true, 'a production P1 death opens the authoritative personal offer');
    await advance(120);
    const revive = frame.getByRole('button', { name: 'Use personal revive' });
    await revive.click();
    assert.equal(await frame.getByText(/Protected/).count() > 0, true, 'only committed recovery exposes protected return feedback');
    await advance(2_400);
    assert.equal(await onSession(function () {
      for (const player of this.players.filter(value => value.participation === 'active')) this.world.host.inPlayerOperation(player, context => context.end('Tracer settlement', 'train', 'front'));
      this.update(1 / 120);
      this.declineRecovery('p2');
      return this.result?.mode === 'survive-together';
    }), true, 'only the valid pending offer delays all-dead settlement');
    await advance(120);
    assert.equal(await frame.getByRole('heading', { name: "The flock's run" }).isVisible(), true, 'the immutable team result replaces live recovery controls');
    assert.equal(await frame.getByRole('button', { name: 'Hop again', exact: true }).isVisible(), true, 'team results keep one visible replay action');
    assert.deepEqual(evidence.errors, []);
  } finally { await app.close(); }
});

test('a live seat can leave deliberately and a fresh controller joins the released place', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] };
  const app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, advance, onSession, sendPads } = app;
  try {
    await frame.locator('#play').click(); await frame.locator('#pause').click(); await frame.locator('#local-play').click();
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(80);
    await frame.locator('#session-seats [data-seat="p2"] [data-session-hud="item"]').click();
    await frame.getByRole('button', { name: 'Leave P2 run', exact: true }).click();
    await frame.getByRole('button', { name: 'Leave run', exact: true }).click();
    const departed = await onSession(function () { return { active: this.players.map(player => player.seat), archived: this.contributions.map(record => ({ seat: record.seat, participantId: record.participantId, cards: record.statistics.itemsFound })) }; });
    assert.deepEqual(departed.active, ['p1']); assert.deepEqual(departed.archived.map(record => record.seat), ['p2'], 'departure archives the existing run before releasing the seat');
    await sendPads([pad(2)]); await sendPads([pad(2, [0])]); await sendPads([pad(2)]);
    await frame.locator('#local-session-setup').waitFor();
    await frame.getByRole('button', { name: /join as p2/i }).click(); await advance(80);
    const joined = await onSession(function () { const player = this.players.find(value => value.seat === 'p2'); return { seat: player?.seat, participantId: player?.participantId, coins: player?.run.wallet, cards: player?.run.cards.length }; });
    assert.equal(joined.seat, 'p2'); assert.notEqual(joined.participantId, departed.archived[0].participantId, 'a new join cannot inherit the departed identity');
    assert.deepEqual({ coins: joined.coins, cards: joined.cards }, { coins: 0, cards: 0 }, 'a new join begins with an empty personal economy');
    assert.deepEqual(evidence.errors, []);
  } finally { await app.close(); }
});

test('the departed primary seat is a real live-join vacancy', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] };
  const app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, advance, onSession, sendPads } = app;
  try {
    await frame.locator('#play').click(); await frame.locator('#pause').click(); await frame.locator('#local-play').click();
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(80);
    await frame.locator('#session-seats [data-seat="p1"] [data-session-hud="item"]').click();
    await frame.getByRole('button', { name: 'Leave P1 run', exact: true }).click();
    await frame.getByRole('button', { name: 'Leave run', exact: true }).click();
    const departed = await onSession(function () { return { active: this.players.map(player => player.seat), archived: this.contributions.find(record => record.seat === 'p1')?.participantId, time: this.world.time }; });
    assert.deepEqual(departed.active, ['p2'], 'leaving P1 preserves its teammate and leaves the existing world active');
    await sendPads([pad(2)]); await sendPads([pad(2, [0])]); await sendPads([pad(2)]);
    await frame.locator('#local-session-setup').waitFor();
    await frame.getByRole('button', { name: /join as p1/i }).click(); await advance(80);
    const joined = await onSession(function () { const player = this.players.find(value => value.seat === 'p1'); return { seat: player?.seat, participantId: player?.participantId, participation: player?.participation, time: this.world.time }; });
    assert.deepEqual({ seat: joined.seat, participation: joined.participation }, { seat: 'p1', participation: 'active' });
    assert.notEqual(joined.participantId, departed.archived, 'new P1 participation never revives the archived original identity');
    assert.ok(joined.time >= departed.time, 'the join keeps the existing course clock instead of creating a new run');
    assert.deepEqual(evidence.errors, []);
  } finally { await app.close(); }
});

test('a disconnected controller explicitly reclaims its retained seat', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] };
  const app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, advance, onSession, sendPads } = app;
  const press = async (index, button) => { await sendPads([pad(0), pad(1)]); await sendPads([pad(0, index === 0 ? [button] : []), pad(1, index === 1 ? [button] : [])]); await sendPads([pad(0), pad(1)]); };
  try {
    await sendPads([pad(0), pad(1)]); await press(0, 0); await press(1, 0);
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(80);
    const before = await onSession(function () { const player = this.players.find(value => value.seat === 'p2'); player.run.creditCoins(7); return { participantId: player.participantId, coins: player.run.wallet }; });
    await sendPads([pad(0)]); await advance(80);
    assert.equal(await frame.getByText('Ghost · reclaim-ready').count() > 0, true, 'the HUD labels the disconnected seat without removing its run');
    await sendPads([pad(0), pad(1)]); await press(1, 0);
    await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).waitFor();
    assert.equal(await frame.getByText('Continue as Sunny. Your items are still here.', { exact: true }).isVisible(), true);
    assert.equal(await frame.evaluate(() => document.activeElement?.textContent), 'Reclaim P2', 'the reclaim action owns initial controller focus');
    await press(1, 1); await advance(40);
    assert.equal(await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).count(), 0, 'Back cancels the explicit reclaim decision');
    assert.equal(await onSession(function () { return this.players.find(value => value.seat === 'p2')?.participation; }), 'device-lost', 'cancelling never consumes the retained ghost seat');
    await press(1, 0); await frame.getByRole('heading', { name: 'Reclaim P2', exact: true }).waitFor();
    await press(1, 0); await advance(80);
    const reclaimed = await onSession(function () { const player = this.players.find(value => value.seat === 'p2'); return { participation: player.participation, participantId: player.participantId, coins: player.run.wallet }; });
    assert.deepEqual(reclaimed, { participation: 'active', participantId: before.participantId, coins: before.coins }, 'the explicit confirmation restores the retained seat rather than creating a fresh economy');
    assert.deepEqual(evidence.errors, []);
  } finally { await app.close(); }
});

test('the one P2-labelled market buys and uses Revival through visible production controls', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] };
  const app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, advance, onSession } = app;
  try {
    await frame.locator('#play').click(); await frame.locator('#pause').click(); await frame.locator('#local-play').click();
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(100);
    const staged = await onSession(function () {
      const p1 = this.players.find(player => player.seat === 'p1');
      const p2 = this.players.find(player => player.seat === 'p2');
      p2.run.creditCoins(24);
      p2.run.market = { milestone: 100, remaining: 15, offers: [] };
      p2.run.revision++;
      this.world.host.inPlayerOperation(p1, context => context.end('P2 Revival tracer', 'traffic', 'front'));
      this.update(1 / 120);
      return { p1: p1.participation, p2Wallet: p2.run.wallet };
    });
    assert.deepEqual(staged, { p1: 'dead', p2Wallet: 24 });

    await frame.locator('#session-seats [data-seat="p2"] [data-session-hud="identity"]').click();
    await frame.locator('#market-open').click(); await advance(100);
    assert.equal(await frame.locator('#market-owner').innerText(), 'Viewing P2 ● · Sunny', 'the one market tree labels its visible owner');
    await frame.getByRole('button', { name: /Revival.*View details/i }).click();
    await frame.getByRole('button', { name: /Buy Revival/i }).click();
    await frame.locator('#market-close').click(); await advance(300);
    await frame.locator('#session-seats [data-seat="p2"] [data-session-hud="item"]').click();
    await frame.getByRole('button', { name: /Use Revival/i }).click();
    await frame.getByRole('button', { name: /Revive P1/i }).click();
    await frame.getByRole('button', { name: 'Use Revival', exact: true }).click(); await advance(100);
    const committed = await onSession(function () {
      const p1 = this.players.find(player => player.seat === 'p1');
      const p2 = this.players.find(player => player.seat === 'p2');
      const charge = this.consumableSnapshot()?.charges.find(value => value.seat === 'p2');
      return { p1: p1.participation, wallet: p2.run.wallet, revival: charge?.revival ?? 0 };
    });
    assert.deepEqual(committed, { p1: 'active', wallet: 0, revival: 0 }, 'the committed visible P2 action spends exactly one owned Revival');
    assert.deepEqual(evidence.errors, []);
  } finally { await app.close(); }
});
