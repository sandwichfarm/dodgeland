import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['recovery']);
after(source.dispose);
const { planRecovery } = await source.import('recovery');

/**
 * The recovery policy is a pure transaction boundary.  A board pause keeps a
 * living owner in the transaction, while a dead, ghosted, or departed seat
 * must remain ineligible.
 */
test('an intentionally paused active owner remains a living recovery subject', () => {
  const decision = planRecovery({
    kind: 'flare',
    tick: 12,
    now: 4,
    owner: { seat: 'p1', state: 'paused', participation: 'active', deathGeneration: 0, charged: false },
    targets: [{ seat: 'p2', state: 'dead', participation: 'dead', deathGeneration: 1, charged: false }],
    participants: [{ seat: 'p1', state: 'paused', participation: 'active', deathGeneration: 0, charged: false }, { seat: 'p2', state: 'dead', participation: 'dead', deathGeneration: 1, charged: false }],
    cells: [{ x: 0, y: 4 }, { x: 1, y: 4 }],
    protectionSeconds: 3,
  });
  assert.equal(decision.ok, true, 'a paused living owner may author a recovery plan');
});
