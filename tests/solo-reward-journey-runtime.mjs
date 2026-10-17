import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';
import { artifactDirectoryForCoverage } from '../tools/release-coverage/browser.mjs';

const output = artifactDirectoryForCoverage(new URL('../artifacts/solo-reward-journey/', import.meta.url), 'solo-reward-journey');
await mkdir(output, { recursive: true });
const records = [];
after(async () => writeFile(new URL('rewards.json', output), JSON.stringify({
  provenance: 'Actual built solo UI purchases and120 forward hops,including moving-log rewards and fractional bank landings. Funds,market eligibility/stock and approach/reward terrain are explicit fixtures. No player pose,clock,inventory cards,effects,power duration or callback replacement.',
  scenarios: records,
}, null, 2)));
const recipes = [
  { id: 'lane-bonuses', cards: ['road-coins', 'river-coins', 'coin-multiplier'], power: false, multiplier: 1.125, bonus: 1, income: 0 },
  { id: 'income-and-rush', cards: ['toll-pouch', 'river-dividend', 'stepping-stones'], power: true, multiplier: 1.5, bonus: .5, income: 5 },
];
const rewards = [
  { kind: 'meadow', denomination: 'coin', value: 1, pull: true },
  { kind: 'road', denomination: 'bar', value: 2 },
  { kind: 'river', denomination: 'small-sack', value: 5 },
  { kind: 'road', denomination: 'big-sack', value: 10 },
  { kind: 'river', denomination: 'huge-sack', value: 25 },
];
for (const base of ['arcade', 'stroll']) for (const recipe of recipes)
test(`${base}/${recipe.id}: paid rewards,river drift and earned income keep exact wallet accounting`, { timeout: 120_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, {
    auditBoundary: true, initialIntent: { sender: 'solo-reward-proof', archetype: 'game', action: 'open',
      convention: 'napplet:game/open', payload: { seed: `ph3-00000071-pond-${base === 'arcade' ? 'a' : 's'}-n` } },
  });
  const read = () => app.onGame(function () { return { base: this.definition.id, state: this.state,
    x: this.groundX, y: this.groundY, score: this.currentScore, hop: this.hop, health: this.health,
    wallet: this.run.wallet, cards: this.run.cards.map(c => c.components.map(p => p.itemId)),
    effects: this.run.effects, powers: this.run.powers.map(p => ({ itemId: p.itemId, remaining: p.remaining })),
    sessionActive: this.world.sessionActive, playerSession: Boolean(this.player.session) }; });
  try {
    await app.onGame(function () {
      for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [],
        coin: null, coinActor: undefined, coinPull: undefined, coinDenomination: undefined, actors: undefined });
      this.run.creditCoins(1000);
      this.run.market = { milestone: 100, remaining: 15, offers: [] };
    });
    await app.frame.locator('#play').click(); await app.advance(80);
    const offers = await app.stageOffers([...recipe.cards, ...(recipe.power ? ['power-coin-rush'] : [])]);
    await app.open();
    for (const offer of offers) {
      if (await app.frame.locator('#market-inspect').isVisible()) { await app.frame.locator('#market-inspect-back').click(); await app.advance(80); }
      const tile = app.frame.locator(`[data-market-action="inspect"][data-id="offer:${offer.id}"]`);
      for (let page = 0; page < 8 && !await tile.isVisible(); page++) { await app.frame.locator('#market-next').click(); await app.advance(80); }
      await tile.click(); const before = await read();
      await app.frame.locator('#market-inspect-action').click(); await app.advance(80);
      assert.equal((await read()).wallet, before.wallet - offer.price);
    }
    const paid = await read(); assert.equal(paid.base, base); assert.equal(paid.cards.length, 3);
    assert.equal(paid.score, 0); assert.equal(paid.sessionActive, false); assert.equal(paid.playerSession, false);
    assert.equal(paid.effects.coinMultiplier, recipe.multiplier);
    assert.equal(paid.effects.roadCoinBonus, recipe.bonus); assert.equal(paid.effects.riverCoinBonus, recipe.bonus);
    assert.equal(paid.powers.length, recipe.power ? 1 : 0);
    await app.iframe.screenshot({ path: new URL(`${base}-${recipe.id}-paid.png`, output).pathname });
    await app.frame.locator('#market-close').click(); await app.advance(350);
    const checkpoints = []; let firstPull;
    for (let hop = 1; hop <= 120; hop++) {
      const reward = rewards[hop - 1];
      await app.onGame(function (reward) {
        // Clear only upcoming approach cells. Movement and fractional x remain
        // the actual player's;the next river carries a real moving platform.
        for (let y = this.y + 1; y <= this.y + 3; y++) {
          const lane = this.rows.get(y); if (!lane) continue;
          Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null,
            coinActor: undefined, coinPull: undefined, coinDenomination: undefined, actors: undefined });
        }
        if (reward) {
          const lane = this.rows.get(this.y + 1), river = reward.kind === 'river';
          Object.assign(lane, { kind: reward.kind, coin: this.groundX + (reward.pull ? .45 : 0), coinDenomination: reward.denomination,
            coinActor: river ? 0 : undefined, phase: river ? this.groundX - this.time * .12 : 50,
            speed: river ? .12 : 0, spacing: river ? 8 : 100, length: river ? 4 : 2, variant: 0 });
        }
      }, reward ?? null);
      await app.frame.locator('[data-direction="forward"]').click();
      if (hop === 1) {
        await app.advance(200);
        firstPull = await app.onGame(function () { const pull = this.rows.get(1).coinPull; return {
          pull: pull && { ...pull }, x: this.groundX, y: this.groundY, wallet: this.run.wallet }; });
        assert.ok(firstPull.pull?.speed > 0, 'the offset coin physically accelerates toward the player');
        assert.equal(firstPull.wallet, paid.wallet, 'an attracted coin is unpaid until contact completes');
        await app.advance(250);
      } else await app.advance(350);
      if (hop <= 5 || [39, 40, 49, 50, 80, 100, 120].includes(hop)) {
        const state = await read(); assert.equal(state.score, hop); assert.equal(state.hop, 0); assert.equal(state.state, 'playing');
        checkpoints.push({ hop, ...state });
        if (reward) assert.equal(await app.onGame(function (y) { return this.rows.get(y).coin; }, hop), null, 'actual reward has been collected');
        if (recipe.power && hop >= 40) assert.equal(state.powers.length, 0, 'timed power expires through active simulation');
        const collected = rewards.slice(0, Math.min(hop, 5)).reduce((sum, r) => sum + r.value + (r.kind === 'meadow' ? 0 : recipe.bonus), 0);
        const income = recipe.power ? Math.floor(hop / 40) + Math.floor(hop / 50) : 0;
        assert.equal(state.wallet, paid.wallet + Math.floor(collected * recipe.multiplier + income + 1e-9), 'exact collection and income milestone receipt');
      }
    }
    const final = await read(), rewardTotal = (43 + 4 * recipe.bonus) * recipe.multiplier;
    assert.equal(final.wallet, paid.wallet + Math.floor(rewardTotal + recipe.income + 1e-9));
    assert.equal(final.score, 120); assert.equal(final.cards.length, 3); assert.equal(final.powers.length, 0);
    assert.ok(checkpoints.some(s => Math.abs(s.x - Math.round(s.x)) > .001), 'moving logs produce a fractional grid without normalization');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
    assert.deepEqual(await app.frame.evaluate(() => window.marketGameFixture.forbidden), []);
    await app.iframe.screenshot({ path: new URL(`${base}-${recipe.id}-earned.png`, output).pathname });
    records.push({ base, recipe: recipe.id, paid, firstPull, checkpoints, final, rewardTotal, earnedIncome: recipe.income, errors: evidence.errors, external: evidence.external });
  } finally { await app.close(); }
});
