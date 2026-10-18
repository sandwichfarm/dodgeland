import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { createMarketGameFixture, sessionHudAction } from './market-game-fixture.mjs';

const pad = (index, pressed = []) => ({ index, id: `Recovery owner ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })) });

test('only the invoking controller navigates and commits an owned Flare confirmation', { timeout: 60000 }, async () => {
  const evidence = { errors: [], external: [] };
  const app = await createMarketGameFixture(evidence, { gamepads: true });
  const { frame, iframe, advance, onSession, sendPads } = app;
  const output = new URL('../artifacts/', import.meta.url);
  const press = async (index, button) => { await sendPads([pad(0), pad(1)]); await sendPads([pad(0, index === 0 ? [button] : []), pad(1, index === 1 ? [button] : [])]); await sendPads([pad(0), pad(1)]); };
  const read = () => onSession(function () { return { time: this.world.time, charges: this.consumableSnapshot().charges,
    players: this.players.map(player => ({ seat: player.seat, lifecycle: player.participation, x: player.groundX, y: player.groundY, protection: player.recovery.protectionUntil })) }; });
  try {
    await mkdir(output, { recursive: true });
    await sendPads([pad(0), pad(1)]); await press(0, 0); await press(1, 0);
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(100);
    assert.deepEqual(await onSession(function () { return this.players.map(player => player.device); }), ['gamepad-0', 'gamepad-1']);
    // Only inventory/hazard staging uses CDP. Acquire the charge through the
    // real transaction adapter; all modal actions use visible UI or shell pads.
    assert.equal(await onSession(function () {
      const owner = this.players[0], target = this.players[1];
      owner.run.advanceScore(100); owner.run.creditCoins(36); owner.run.open();
      const context = this.openCoOpMarket({ seat: owner.seat, device: owner.device, participantId: owner.participantId });
      const purchase = this.actCoOpMarket({ actionId: 'controller-proof-flare', seat: owner.seat, device: owner.device, participantId: owner.participantId,
        expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration,
        expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration, kind: 'buy-consumable', itemId: 'flare' });
      owner.run.close();
      this.world.host.inPlayerOperation(target, player => player.end('Controller proof train', 'train')); this.update(1 / 120);
      return purchase.ok && target.participation === 'dead';
    }), true);
    await advance(100);
    await sessionHudAction(app, 'p1', 'item');
    await frame.getByRole('button', { name: 'Use Flare ×1', exact: true }).click(); await advance(50);
    const board = frame.locator('#survive-recovery-board');
    assert.equal(await board.getByRole('heading', { name: 'Bring the flock together?', exact: true }).isVisible(), true);
    const focus = () => frame.evaluate(() => document.activeElement?.textContent);
    assert.match(await focus(), /^Back/, 'Flare starts on the noncommitting Back action');
    const frozen = await read(), originalFocus = await focus();
    for (const button of [0, 15, 9, 1, 3, 4]) {
      await press(1, button);
      assert.equal(await board.isVisible(), true, `P2 button${button} cannot dismiss or replace P1's modal`);
      assert.equal(await focus(), originalFocus, 'the other controller cannot move owner focus');
      assert.deepEqual(await read(), frozen, 'another seat cannot spend, move, or resume the owner transaction');
    }
    // Focus is deliberately driven by the assigned owner's D-pad, not .focus()
    // or a pointer shortcut. This catches dispatch being swallowed by pause.
    for (let attempt = 0; attempt < 8 && (await focus()) !== 'Use Flare'; attempt++) {
      const previous = await focus(); await press(0, 15);
      assert.notEqual(await focus(), previous, 'assigned owner D-pad advances the visible modal focus');
    }
    assert.equal(await focus(), 'Use Flare');
    await press(1, 0);
    assert.deepEqual(await read(), frozen, 'cross-owner confirmation cannot approve even the focused primary action');
    await iframe.screenshot({ path: new URL('survive-recovery-owner-flare.png', output).pathname });
    await press(0, 0);
    assert.equal(await board.count(), 0, 'only the invoking controller commits the owned action');
    const recovered = await read();
    assert.equal(recovered.charges.find(charge => charge.seat === 'p1').flare, 0);
    assert.ok(recovered.players.every(player => player.lifecycle === 'active' && player.protection > recovered.time));
    assert.equal(recovered.time, frozen.time, 'committed board action keeps the explicit pause');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
    await writeFile(new URL('survive-recovery-owner.json', output), JSON.stringify({ ...evidence, frozen, recovered }, null, 2));
  } catch (error) {
    await iframe.screenshot({ path: new URL('survive-recovery-owner-failure.png', output).pathname }).catch(() => {});
    throw error;
  } finally { await app.close(); }
});
