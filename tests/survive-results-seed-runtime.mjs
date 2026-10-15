import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarketGameFixture } from './market-game-fixture.mjs';

test('the built team result exposes the actual versioned seed inside its active modal', { timeout: 60000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence);
  const { frame, page, onGame, onSession, advance } = app;
  try {
    await frame.locator('#play').click(); await frame.locator('#pause').click();
    await frame.locator('#local-play').click(); await frame.getByRole('button', { name: /start together/i }).click();
    await advance(80);
    const token = await onGame(function () { return this.seedCode; });
    assert.match(token, /^ph\d+-/);
    assert.equal(await onSession(function () {
      for (const player of this.players) this.world.host.inPlayerOperation(player, context => context.end('Seed result train', 'train'));
      this.update(1 / 120);
      for (const player of this.players) this.declineRecovery(player.seat);
      return this.result?.mode === 'survive-together';
    }), true);
    await advance(80);
    const resultBefore = await onSession(function () { return JSON.stringify(this.result); });
    await frame.getByRole('heading', { name: "The flock's run", exact: true }).waitFor();
    await frame.getByRole('button', { name: 'Seed', exact: true }).click();
    const field = frame.getByRole('textbox', { name: 'Run seed', exact: true });
    assert.equal(await field.inputValue(), token);
    assert.equal(await field.evaluate(node => !!node.closest('[inert]')), false, 'seed controls belong to the active result modal');
    await frame.evaluate(() => {
      document.execCommand = () => false;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    });
    await frame.getByRole('button', { name: 'Copy seed', exact: true }).click();
    await frame.getByText('Selected. Use your device’s Copy.', { exact: true }).waitFor();
    assert.deepEqual(await field.evaluate(node => [node.selectionStart, node.selectionEnd, document.activeElement === node]), [0, token.length, true]);
    await app.resize(200, 160); assert.equal(await field.isVisible(), false);
    await app.resize(320, 560); assert.equal(await field.isVisible(), true);
    assert.deepEqual(await field.evaluate(node => [node.value, document.activeElement === node]), [token, true], 'the built resize flow restores the selected seed field inside the result modal');
    await page.keyboard.press('Tab');
    assert.equal(await frame.evaluate(() => document.activeElement?.textContent), 'Back to results', 'Tab remains inside the active seed page');
    await frame.evaluate(() => {
      document.execCommand = command => {
        const field = document.activeElement;
        window.marketGameFixture.copiedSeed = field.value.slice(field.selectionStart, field.selectionEnd);
        return command === 'copy';
      };
    });
    await frame.getByRole('button', { name: 'Copy seed', exact: true }).click();
    assert.equal(await frame.getByText('Seed copied.', { exact: true }).isVisible(), true);
    assert.equal(await frame.evaluate(() => window.marketGameFixture.copiedSeed), token);
    await frame.getByRole('button', { name: 'Back to results', exact: true }).click();
    assert.equal(await frame.getByRole('heading', { name: "The flock's run", exact: true }).isVisible(), true);
    assert.equal(await onSession(function () { return JSON.stringify(this.result); }), resultBefore, 'copying never mutates the settled run');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});
