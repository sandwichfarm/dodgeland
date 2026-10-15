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

test('paused living owners work for Revival while dead, ghosted, and departed owners remain excluded', () => {
  const owner = { seat: 'p2', state: 'paused', participation: 'active', deathGeneration: 4, charged: false };
  const dead = { seat: 'p1', state: 'dead', participation: 'dead', deathGeneration: 8, charged: false };
  const request = { kind: 'revival', tick: 21, now: 9, owner, targets: [dead], cells: [{ x: 1, y: 5 }], protectionSeconds: 2 };
  assert.equal(planRecovery(request).ok, true, 'a paused P2 may restore a dead teammate without resuming the board');
  for (const participation of ['dead', 'device-lost', 'departed']) {
    const ineligible = { ...owner, participation, state: participation === 'dead' ? 'dead' : 'paused' };
    const decision = planRecovery({ ...request, owner: ineligible });
    assert.deepEqual(decision, { ok: false, reason: 'inactive-owner' }, `${participation} owners never gain paused-board authority`);
  }
});
