import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';
import { loadSources } from './source-loader.mjs';
import { artifactDirectoryForCoverage } from '../tools/release-coverage/browser.mjs';

const sources = await loadSources(['actors']);
const { createActorPattern } = await sources.import('actors');
const pattern = createActorPattern('platforms', [
  { kind: 'platform', length: 2.5, variant: 0, speedFactor: 1, gap: 1.75 },
  { kind: 'platform', length: 4, variant: 1, speedFactor: 1, gap: 2 },
], 3);
const output = artifactDirectoryForCoverage(new URL('../artifacts/river-rewards-runtime/', import.meta.url), 'river-rewards-runtime');
await mkdir(output, { recursive: true });
const records = [];
after(async () => {
  await sources.dispose();
  await writeFile(new URL('river-rewards.json', output), JSON.stringify({
    provenance: 'Actual built UI input and simulation; only lane/platform/reward geometry is arranged after real mode acquisition. No pose, clock, inventory, gravity or callback replacement.',
    scenarios: records,
  }, null, 2));
});
const scenarios = [
  { mode: 'relay', base: 'arcade', recipe: 'legacy', direction: 1 },
  { mode: 'relay', base: 'stroll', recipe: 'varied', direction: -1 },
  { mode: 'race', base: 'arcade', recipe: 'varied', direction: 1 },
  { mode: 'race', base: 'stroll', recipe: 'legacy', direction: -1 },
];
for (const scenario of scenarios) test(`${scenario.mode}/${scenario.base}/${scenario.recipe}: a moving river reward and fractional bank landing pay only their collector`, { timeout: 60_000 }, async () => {
  const { mode, base, recipe, direction } = scenario;
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, {
    auditBoundary: true,
    initialIntent: { sender: 'river-rewards-proof', archetype: 'game', action: 'open', convention: 'napplet:game/open',
      payload: { seed: `ph3-00000071-pond-${base === 'arcade' ? 'a' : 's'}-n` } },
  });
  const read = () => app.onSession(function () {
    return { time: this.world.time, scale: this.world.rules.simulation.worldTimeScale, base: this.definition.id,
      players: this.players.map(p => ({ seat: p.seat, id: p.participantId, character: p.characterId,
        x: p.groundX, y: p.groundY, hop: p.hop, state: p.state, health: p.health,
        wallet: p.run.wallet, coins: p.coins, cards: p.run.cards.length, powers: p.run.powers.length,
        gravity: p.run.effects.coinRadius, earned: p.completedForwardTiles, deaths: p.statistics.deaths,
        innate: p.statistics.innateUses, pickups: p.statistics.pickups })),
      river: { coin: this.world.rows.get(1).coin, actor: this.world.rows.get(1).coinActor },
      bank: { coin: this.world.rows.get(2).coin, pull: this.world.rows.get(2).coinPull },
      distant: { coin: this.world.rows.get(4).coin, actor: this.world.rows.get(4).coinActor } };
  });
  try {
    await app.frame.locator('#local-play').click(); await app.frame.locator(`#${mode}-play`).click();
    await app.frame.locator('#local-session-start').click(); await app.advance(80);
    await app.onSession(function (recipe, direction, pattern) {
      for (const lane of this.world.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [],
        coin: null, coinActor: undefined, coinDenomination: undefined, coinPull: undefined,
        actors: undefined, phase: 0, speed: 0, spacing: 4, length: 3, variant: 0 });
      Object.assign(this.world.rows.get(1), { kind: 'river', coin: 0, coinActor: null,
        coinDenomination: recipe === 'legacy' ? 'coin' : 'huge-sack', phase: direction * .1, speed: direction * .12,
        actors: recipe === 'varied' ? pattern : undefined });
      Object.assign(this.world.rows.get(2), { coin: 0, coinDenomination: 'coin' });
      Object.assign(this.world.rows.get(4), { kind: 'river', coin: 0,
        coinActor: recipe === 'legacy' ? -3 * direction : -3, speed: direction * 2,
        actors: recipe === 'varied' ? structuredClone(pattern) : undefined });
    }, recipe, direction, pattern);
    await app.advance(32);
    const approach = await read(); assert.equal(approach.base, base); assert.notEqual(approach.river.actor, null);
    assert.equal(new Set(approach.players.map(p => p.character)).size, 2);
    assert.equal(approach.players[0].wallet, 0); assert.equal(approach.players[1].wallet, 0);
    assert.ok(approach.players.every(p => p.gravity > 0 && p.cards === 0 && p.powers === 0));
    await app.iframe.screenshot({ path: new URL(`${mode}-${base}-${recipe}-approach.png`, output).pathname });
    await app.frame.locator('#pause').click(); await app.advance(32);
    const paused = await read(); await app.advance(1000); assert.deepEqual(await read(), paused);
    await app.frame.getByRole('button', { name: 'Resume game', exact: true }).click();
    await app.frame.locator('#scene').focus(); await app.page.keyboard.press('w'); await app.advance(300);
    let landed = await read(); const value = recipe === 'legacy' ? 1 : 25;
    assert.equal(landed.players[0].y, 1); assert.equal(landed.players[0].hop, 0);
    assert.equal(landed.river.coin, null); assert.equal(landed.players[0].wallet, value);
    assert.equal(landed.players[1].wallet, 0); assert.equal(landed.players[0].pickups, 1);
    const carryMs = (direction * .49 - landed.players[0].x) / (direction * .12 * landed.scale) * 1000;
    assert.ok(carryMs > 0 && carryMs < 10_000); await app.advance(carryMs);
    const carried = await read(); assert.ok(Math.abs(carried.players[0].x - direction * .49) < .003);
    assert.equal(carried.players[0].wallet, value); assert.equal(carried.bank.coin, 0);
    assert.equal(carried.distant.coin, 0, 'another row’s moving reward remains unclaimed');
    await app.frame.locator('#scene').focus(); await app.page.keyboard.press('w'); await app.advance(800);
    const bank = await read();
    assert.equal(bank.players[0].y, 2); assert.equal(bank.players[0].hop, 0);
    assert.ok(Math.abs(bank.players[0].x - carried.players[0].x) < .003, 'hopping ashore keeps the player’s fractional grid');
    assert.equal(bank.bank.coin, null); assert.equal(bank.players[0].wallet, value + 1);
    assert.equal(bank.players[0].coins, value + 1); assert.equal(bank.players[0].pickups, 2);
    assert.equal(bank.players[0].earned, 2); assert.equal(bank.players[1].earned, 0);
    assert.equal(bank.players[1].wallet, 0); assert.equal(bank.players[1].coins, 0);
    assert.ok(bank.players.every(p => p.state === 'playing' && p.deaths === 0 && p.innate === 0));
    assert.deepEqual(bank.players.map(p => p.health), approach.players.map(p => p.health));
    await app.advance(300); const settled = await read();
    assert.equal(settled.players[0].wallet, value + 1); assert.equal(settled.players[0].pickups, 2);
    assert.equal(settled.players[1].wallet, 0);
    await app.iframe.screenshot({ path: new URL(`${mode}-${base}-${recipe}-bank.png`, output).pathname });
    const wallets = [];
    for (const [seat, expected] of [['p1', value + 1], ['p2', 0]]) {
      const root = app.frame.locator('#session-seats'), tile = root.locator(`[data-seat="${seat}"]`);
      if (await root.getAttribute('data-session-hud-inspect') === 'true'
        && await root.locator('.session-hud-selected').getAttribute('data-seat') !== seat)
        await app.frame.getByRole('button', { name: 'Close details', exact: true }).click();
      if (await root.locator('.session-hud-selected').getAttribute('data-seat') !== seat)
        await tile.locator('.session-hud-identity').click();
      if (await root.getAttribute('data-session-hud-inspect') !== 'true')
        await tile.locator('.session-hud-identity').click();
      const wallet = tile.locator('[data-session-hud="wallet"]');
      for (let page = 0; page < 4 && !await wallet.isVisible(); page++)
        await app.frame.getByRole('button', { name: 'Next details', exact: true }).click();
      assert.equal(await wallet.isVisible(), true, `${seat}'s actual wallet is publicly reachable`);
      const text = await wallet.innerText(); assert.ok(text.startsWith(`${expected} coins ·`), text);
      wallets.push({ seat, text });
      if (seat === 'p1') await app.iframe.screenshot({ path: new URL(`${mode}-${base}-${recipe}-wallet.png`, output).pathname });
    }
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
    assert.deepEqual(await app.frame.evaluate(() => window.marketGameFixture.forbidden), []);
    records.push({ ...scenario, approach, paused, landed, carried, bank, settled, wallets, ...evidence });
  } finally { await app.close(); }
});
