import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const output = new URL('../artifacts/', import.meta.url);

test('a paid pack retains its choices, replacements, wallet and usable focus across tiny suspension', { timeout: 90_000 }, async () => {
  const evidence = { errors: [], external: [], frames: [] }, app = await createMarketGameFixture(evidence);
  const { frame, iframe, advance, resize, onGame, stageMarket, stageOffers } = app;
  const settle = () => advance(350);
  const snapshot = () => onGame(function () {
    return { cards: this.run.cards, wallet: this.run.wallet, pending: this.run.pendingPack, time: this.time, remaining: this.run.market?.remaining };
  });
  async function inspect(source, id) {
    if (await frame.locator('#market-inspect').isVisible()) { await frame.locator('#market-inspect-back').click(); await settle(); }
    await frame.locator(`[data-market-action="inspect"][data-id="${source}:${id}"]`).click(); await settle();
    await frame.locator('#market-inspect-action').click(); await settle();
  }
  async function suspend(label) {
    const before = await snapshot();
    const phase = await frame.locator('#market').getAttribute('data-market-draft-phase');
    const count = await frame.locator('#market-pick-count').innerText();
    const enabled = await frame.locator('#market-claim').isEnabled();
    await frame.locator('#market-skip').focus();
    await resize(200, 160);
    assert.equal(await frame.locator('.too-small').isVisible(), true);
    assert.equal(await frame.locator('#market').isVisible(), false);
    await advance(3000);
    assert.deepEqual(await snapshot(), before, 'unsupported size freezes the pack, economy and active world clock');
    for (const [width, height] of [[240, 240], [320, 560], [900, 600]]) {
      await resize(width, height); await settle();
      assert.equal(await frame.locator('#market').isVisible(), true, 'market returns automatically without a new transaction');
      assert.equal(await frame.locator('#market').getAttribute('data-market-draft-phase'), phase);
      assert.equal(await frame.locator('#market-pick-count').innerText(), count);
      assert.equal(await frame.locator('#market-claim').isEnabled(), enabled);
      const focus = await frame.evaluate(() => {
        const active = document.activeElement, rect = active?.getBoundingClientRect();
        return { id: active?.id, usable: !!active?.closest('#market') && !active.closest('[inert]') && rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight };
      });
      assert.equal(focus.usable, true, `${label}/${width}x${height}: restored focus remains usable: ${JSON.stringify(focus)}`);
      assert.deepEqual(await snapshot(), before, 'restoration never recharges, redraws or prematurely equips a pack');
      evidence.frames.push({ label, width, height, phase, count, focus });
      await iframe.screenshot({ path: new URL(`market-tiny-${label}-${width}x${height}.png`, output).pathname });
    }
  }
  try {
    await mkdir(output, { recursive: true });
    await stageMarket();
    for (const id of ['magnet', 'traffic-speed', 'platform-length']) {
      const [offer] = await stageOffers([id]); await inspect('offer', offer.id);
    }
    const full = await snapshot(); assert.equal(full.cards.length, 3);
    const [offer] = await stageOffers(['pack-satchel']);
    await onGame(function () { this.run.state = 0; });
    await inspect('offer', offer.id);
    const opened = await snapshot(); assert.equal(opened.wallet, full.wallet - offer.price); assert.ok(opened.pending);
    await suspend('choices');
    const slots = new Set(['extra-pocket', 'travel-light', 'field-pack', 'ballast', 'glass-purse']);
    const chosen = opened.pending.choices.find(card => card.components.every(component => !slots.has(component.itemId)));
    assert.ok(chosen);
    await inspect('choice', chosen.id);
    await frame.locator('#market-claim').click(); await settle();
    assert.equal(await frame.locator('#market').getAttribute('data-market-draft-phase'), 'replace');
    await inspect('discard', full.cards[0].id);
    await suspend('replacement');
    await frame.locator('#market-claim').click(); await settle();
    const after = await snapshot();
    assert.equal(after.pending, null);
    assert.deepEqual(after.cards.map(card => card.id), [...full.cards.slice(1).map(card => card.id), chosen.id]);
    assert.equal(after.wallet, opened.wallet, 'the retained replacement commits exactly once');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally {
    await writeFile(new URL('market-tiny-focus-runtime.json', output), JSON.stringify(evidence, null, 2));
    await app.close();
  }
});

test('the shared market retains the selected player and wardrobe view after tiny suspension', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [], frames: [] }, app = await createMarketGameFixture(evidence);
  const { frame, iframe, advance, resize, onSession } = app;
  const snapshot = () => onSession(function () {
    return { time: this.world.time, players: this.players.map(player => ({ id: player.participantId, seat: player.seat, character: player.characterId, cards: player.run.cards, wallet: player.run.wallet })) };
  });
  try {
    await mkdir(output, { recursive: true });
    await frame.locator('#play').click(); await frame.locator('#pause').click();
    await frame.locator('#local-play').click(); await frame.getByRole('button', { name: /start together/i }).click();
    await onSession(function () {
      for (const player of this.players) {
        player.run.advanceScore(100); player.run.creditCoins(player.seat === 'p1' ? 12 : 35);
        player.run.open(); player.run.close();
      }
    });
    await advance(80);
    await frame.locator('#market-open').click(); await advance(350);
    await frame.locator('#market-owner-strip [data-id="p2"]').click(); await advance(350);
    await frame.locator('#market-wardrobe-tab').click(); await advance(350);
    const before = await snapshot();
    assert.equal(await frame.locator('#market').getAttribute('data-market-view'), 'wardrobe');
    for (const [width, height] of [[240, 240], [320, 560], [900, 600]]) {
      await resize(200, 160); await advance(1000);
      assert.equal(await frame.locator('.too-small').isVisible(), true);
      await resize(width, height); await advance(350);
      assert.equal(await frame.locator('#market').isVisible(), true);
      assert.equal(await frame.locator('#market').getAttribute('data-market-view'), 'wardrobe');
      assert.match(await frame.locator('#market-owner').innerText(), /Viewing P2 /);
      assert.equal(await frame.locator('#market-owner-strip [data-id="p2"]').getAttribute('aria-pressed'), 'true');
      const focus = await frame.evaluate(() => {
        const active = document.activeElement;
        return { id: active?.id, inMarket: !!active?.closest('#market') && !!active.getClientRects().length && !active.closest('[inert]') };
      });
      assert.equal(focus.inMarket, true, 'focus returns to the retained owner view');
      assert.deepEqual(await snapshot(), before, 'inspection cannot switch participation, change inventories or advance time');
      evidence.frames.push({ width, height, owner: 'p2', view: 'wardrobe', focus });
      await iframe.screenshot({ path: new URL(`market-tiny-owner-${width}x${height}.png`, output).pathname });
    }
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally {
    await writeFile(new URL('market-tiny-owner-runtime.json', output), JSON.stringify(evidence, null, 2));
    await app.close();
  }
});
