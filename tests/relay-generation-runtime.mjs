import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';
import { loadSources } from './source-loader.mjs';
import { extractPinnedBaseline, PINNED_BASELINE_SHA } from './solo-baseline.mjs';
import { artifactDirectoryForCoverage } from '../tools/release-coverage/browser.mjs';

const oracle = await extractPinnedBaseline(); assert.equal(oracle.sha, PINNED_BASELINE_SHA);
const baseline = await loadSources(['levels/index'], oracle.sourceDirectory);
const { generateSeedLane } = await baseline.import('levels/index');
const output = artifactDirectoryForCoverage(new URL('../artifacts/relay-generation-runtime/', import.meta.url), 'relay-generation-runtime');
await mkdir(output, { recursive: true });
const records = [];
after(async () => {
  await baseline.dispose(); await oracle.dispose();
  await writeFile(new URL('generation.json', output), JSON.stringify({
    oracleCommit: PINNED_BASELINE_SHA,
    provenance: 'Actual built Relay setup,paid market purchases and100 keyboard hops. Funds,market eligibility/stock and safe next-row approach terrain are fixtures. Future rows use real unchanged generation;no player pose,earned progress,clock,effects,inventory cards or generator replacement.',
    scenarios: records,
  }, null, 2));
});
const recipes = [
  { name: 'scenery-coins-warning', first: 'road', cards: ['train-warning', 'treasure-map', 'coin-chance'] },
  { name: 'spacing-platforms-period', first: 'road', cards: ['traffic-spacing', 'platform-length', 'train-period'] },
  { name: 'river-rewards', first: 'river', cards: ['river-coins', 'river-dividend', 'platform-length'] },
];
function seedFor(schema, base, kind) {
  for (let seed = 0; seed < 4096; seed++) {
    const code = { schema, seed, home: 'pond', mode: base, gentle: false };
    if (generateSeedLane(code, 29).kind === kind) return code;
  }
  throw Error('No bounded oracle seed');
}
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected}`);
for (const [index, recipe] of recipes.entries()) for (const base of ['arcade', 'stroll']) {
  const schema = (index + (base === 'stroll' ? 1 : 0)) % 2 ? 3 : 1;
  test(`${base}/schema${schema}/${recipe.name}: paid cards shape actual new course after visible market purchase`, { timeout: 120_000 }, async () => {
    const code = seedFor(schema, base, recipe.first), seedCode = `ph${schema}-${code.seed.toString(16).padStart(8, '0')}-pond-${base === 'arcade' ? 'a' : 's'}-n`;
    const expected = new Map(Array.from({ length: 100 }, (_, i) => [29 + i, generateSeedLane(code, 29 + i)]));
    const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, {
      auditBoundary: true, initialIntent: { sender: 'relay-generation-proof', archetype: 'game', action: 'open', convention: 'napplet:game/open', payload: { seed: seedCode } },
    });
    const read = () => app.onSession(function () { return {
      base: this.definition.id, seed: this.world.host.seedCode, frontier: this.world.frontier,
      players: this.players.map(p => ({ seat: p.seat, state: p.state, x: p.groundX, y: p.groundY, hop: p.hop,
        wallet: p.run.wallet, cards: p.run.cards.length, effects: p.run.effects,
        completed: p.completedForwardTiles, earned: p.earnedDistance, deaths: p.statistics.deaths, innate: p.statistics.innateUses })),
    }; });
    try {
      await app.frame.locator('#local-play').click(); await app.frame.locator('#relay-play').click();
      await app.frame.locator('#relay-tiles').fill('999'); await app.frame.locator('#local-session-start').click(); await app.advance(80);
      const initial = await read(); assert.equal(initial.base, base); assert.equal(initial.seed, seedCode);
      const old = await app.onSession(function () { return structuredClone(this.world.rows.get(20)); });
      await app.onSession(function () { this.players[0].run.advanceScore(100); this.players[0].run.creditCoins(1000); });
      const offers = await app.stageOffers(recipe.cards); await app.frame.locator('#market-open').click(); await app.advance(350);
      for (const offer of offers) {
        if (await app.frame.locator('#market-inspect').isVisible()) { await app.frame.locator('#market-inspect-back').click(); await app.advance(80); }
        const tile = app.frame.locator(`[data-market-action="inspect"][data-id="offer:${offer.id}"]`);
        for (let page = 0; page < 8 && !await tile.isVisible(); page++) { await app.frame.locator('#market-next').click(); await app.advance(80); }
        await tile.click(); const before = await read();
        await app.frame.locator('#market-inspect-action').click(); await app.advance(80);
        const paid = await read(); assert.equal(paid.players[0].wallet, before.players[0].wallet - offer.price);
        assert.equal(paid.players[0].cards, before.players[0].cards + 1); assert.equal(paid.players[1].wallet, 0); assert.equal(paid.players[1].cards, 0);
      }
      const purchased = await read(), wallet = purchased.players[0].wallet, effects = purchased.players[0].effects;
      assert.equal(purchased.players[0].cards, 3);
      if (recipe.name === 'scenery-coins-warning') assert.ok(effects.sceneryClear > 0 && effects.coinChance > 0 && effects.trainWarning > 0);
      if (recipe.name === 'spacing-platforms-period') assert.ok(effects.trafficSpacing > 1 && effects.platformLength > 1 && effects.trainPeriod > 1);
      if (recipe.name === 'river-rewards') assert.ok(effects.riverCoinBonus > 0 && effects.coinChance > 0 && effects.platformLength > 1);
      assert.deepEqual(await app.onSession(function () { return structuredClone(this.world.rows.get(20)); }), old, 'purchases retain previously generated terrain');
      await app.iframe.screenshot({ path: new URL(`${base}-${schema}-${recipe.name}-paid.png`, output).pathname });
      await app.frame.locator('#market-close').click(); await app.advance(400);
      const seen = { roads: 0, rivers: 0, rails: 0, removed: 0, landCoins: 0, riverCoins: 0 };
      for (let n = 0; n < 100; n++) {
        // Preserve the unvisited generated lookahead. Arrange only the next
        // stepped-on cell as safe ground,so no player/score teleport is used.
        await app.onSession(function () {
          const p = this.players[0], lane = this.world.rows.get(p.y + 1);
          Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined,
            coinPull: undefined, coinDenomination: undefined, actors: undefined, speed: 0 });
        });
        await app.frame.locator('#scene').focus(); await app.page.keyboard.press('w'); await app.advance(250);
        const y = 29 + n, plain = expected.get(y), lane = await app.onSession(function (y) { return structuredClone(this.world.rows.get(y)); }, y);
        assert.equal(lane.kind, plain.kind); assert.equal(lane.index, y);
        if (lane.kind === 'road') { seen.roads++; close(lane.spacing - lane.length, (plain.spacing - plain.length) * effects.trafficSpacing, 'new traffic gaps'); }
        if (lane.kind === 'river') { seen.rivers++; close(lane.length, plain.length * effects.platformLength, 'new platform length'); close(lane.spacing - lane.length, plain.spacing - plain.length, 'retained river gap'); }
        if (lane.actors) for (const [slot, actor] of lane.actors.slots.entries()) {
          const original = plain.actors.slots[slot];
          close(actor.length, original.length * (lane.kind === 'river' ? effects.platformLength : 1), 'new actor length');
          close(actor.gap, original.gap * (lane.kind === 'road' ? effects.trafficSpacing : 1), 'new actor gap');
        }
        if (lane.kind === 'rail') { seen.rails++; close(lane.warning, plain.warning + effects.trainWarning, 'train warning'); assert.ok(lane.period >= plain.period * effects.trainPeriod - 1e-8); assert.ok(lane.period >= lane.warning + 1.85 - 1e-8); }
        for (const x of lane.blocked) assert.ok(plain.blocked.includes(x));
        for (const x of plain.blocked.filter(x => !lane.blocked.includes(x))) { seen.removed++; assert.equal(lane.decorations.some(d => d.x === x), false); }
        if (plain.coin === null && lane.coin !== null) { if (lane.kind === 'river') seen.riverCoins++; else { seen.landCoins++; assert.equal(lane.blocked.includes(lane.coin), false); } }
      }
      const final = await read(); assert.equal(final.players[0].completed, 100); assert.equal(final.players[0].earned, 100);
      assert.equal(final.players[0].wallet, wallet); assert.equal(final.players[1].completed, 0); assert.equal(final.players[1].wallet, 0);
      assert.ok(final.players.every(p => p.state === 'playing' && p.deaths === 0 && p.innate === 0));
      assert.ok(seen.roads && seen.rivers && seen.rails, JSON.stringify(seen));
      if (recipe.name === 'scenery-coins-warning') assert.ok(seen.removed && seen.landCoins && seen.riverCoins, JSON.stringify(seen));
      if (recipe.name === 'river-rewards') assert.ok(seen.riverCoins, JSON.stringify(seen));
      await app.iframe.screenshot({ path: new URL(`${base}-${schema}-${recipe.name}-course.png`, output).pathname });
      assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []); assert.deepEqual(await app.frame.evaluate(() => window.marketGameFixture.forbidden), []);
      records.push({ base, schema, seedCode, recipe: recipe.name, cards: recipe.cards, effects, seen, purchased, final, errors: evidence.errors, external: evidence.external });
    } finally { await app.close(); }
  });
}
