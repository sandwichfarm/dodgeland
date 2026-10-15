import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

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
    assert.deepEqual(evidence.errors, []);
  } finally { await app.close(); }
});
