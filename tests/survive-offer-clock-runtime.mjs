import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

test('the built all-down offer clock pauses, resumes the same run, and settles without a manual decline', { timeout: 90000 }, async () => {
  const evidence = { errors: [], external: [], checkpoints: [] };
  const app = await createMarketGameFixture(evidence);
  const { frame, iframe, advance, onSession } = app;
  const output = new URL('../artifacts/', import.meta.url);
  const read = () => onSession(function () {
    return { time: this.world.time, scale: this.world.rules.simulation.worldTimeScale,
      result: this.result ?? null, players: this.players.map(player => ({ seat: player.seat,
        participantId: player.participantId, lifecycle: player.participation,
        deadline: player.recovery?.offer?.deadline ?? null })) };
  });
  try {
    await mkdir(output, { recursive: true });
    await frame.locator('#play').click(); await frame.locator('#pause').click();
    await frame.locator('#local-play').click();
    await frame.getByRole('button', { name: /start together/i }).click(); await advance(100);
    // Stage actual terminal events through the production transition; after
    // this one event-processing tick only browser animation frames may advance
    // the clock. Direct update/decline calls would hide a frozen main loop.
    await onSession(function () {
      for (const player of this.players) this.world.host.inPlayerOperation(player, context => context.end('Offer clock train', 'train'));
      this.update(1 / 120);
    });
    await advance(80);
    const initial = await read(); evidence.checkpoints.push({ state: 'all-down', ...initial });
    assert.equal(initial.players.length, 2);
    assert.ok(initial.players.every(player => player.lifecycle === 'dead' && player.deadline > initial.time));
    assert.equal(initial.result, null);
    const actions = frame.getByRole('button', { name: /^Use personal revive/ });
    assert.equal(await actions.count(), 2, 'both authoritative offers remain reachable');
    await advance(1500);
    const ticking = await read(); evidence.checkpoints.push({ state: 'counting', ...ticking });
    assert.ok(ticking.time > initial.time + 1.4 * initial.scale, 'all-down offers continue on the actual main animation loop');
    const remaining = Math.ceil((ticking.players[0].deadline - ticking.time) / ticking.scale);
    assert.ok(remaining > 0 && remaining < 8);
    assert.match(await actions.first().innerText(), new RegExp(`\\b${remaining}s\\b`), 'visible countdown uses remaining active time');

    const pause = frame.getByRole('button', { name: 'Pause game', exact: true });
    assert.equal(await pause.isEnabled(), true, 'a pending personal decision may still pause the run');
    await pause.click(); await advance(50);
    const paused = await read(); const frozenCopy = await actions.allInnerTexts();
    await advance(10000);
    assert.deepEqual(await read(), paused, 'wall-clock time cannot expire offers while explicitly paused');
    assert.deepEqual(await actions.allInnerTexts(), frozenCopy);
    await frame.getByRole('button', { name: 'Resume game', exact: true }).click();
    await advance(100);
    const resumed = await read();
    assert.deepEqual(resumed.players.map(player => player.participantId), initial.players.map(player => player.participantId), 'resume must not reset or replace this run');
    assert.ok(resumed.time > paused.time);
    assert.equal(resumed.result, null);
    await advance(8000);
    const terminal = await read(); evidence.checkpoints.push({ state: 'settled', ...terminal });
    assert.equal(terminal.result?.mode, 'survive-together', 'the final offer expires automatically through the live loop');
    assert.ok(terminal.players.every(player => player.deadline === null));
    assert.equal(await actions.count(), 0, 'settled results expose no stale personal action');
    assert.equal(await frame.getByRole('heading', { name: "The flock's run", exact: true }).isVisible(), true);
    const resultCopy = JSON.stringify(terminal.result);
    await advance(3000);
    assert.equal(JSON.stringify((await read()).result), resultCopy, 'subsequent frames keep the immutable terminal record');
    await iframe.screenshot({ path: new URL('survive-offer-clock-result.png', output).pathname });
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
    await writeFile(new URL('survive-offer-clock.json', output), JSON.stringify(evidence, null, 2));
  } catch (error) {
    await iframe.screenshot({ path: new URL('survive-offer-clock-failure.png', output).pathname }).catch(() => {});
    throw error;
  } finally { await app.close(); }
});
