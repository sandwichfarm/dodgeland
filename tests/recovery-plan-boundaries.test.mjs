import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources('recovery');
after(() => sources.dispose());
const { planRecovery, commitRecoveryPlan } = await sources.import('recovery');

const owner = Object.freeze({ seat: 'p1', participation: 'active', state: 'playing', deathGeneration: 0, charged: false });
const dead = seat => Object.freeze({ seat, participation: 'dead', state: 'dead', deathGeneration: 1, charged: false });
function request(kind, targets) {
  return Object.freeze({ kind, tick: 12, now: 3, owner,
    targets: Object.freeze(targets), protectionSeconds: 2,
    cells: Object.freeze([0, 1, 2, 3].map(x => Object.freeze({ x, y: 0 }))),
  });
}

const invalid = [
  ['Revival cannot restore two teammates with one item', () => request('revival', [dead('p2'), dead('p3')])],
  ['Flare needs a dead teammate even when the owner has a safe cell', () => request('flare', [])],
  ['Revival compares target identity rather than object reference', () => request('revival', [dead('p1')])],
  ['Flare rejects repeated seat identities in distinct snapshots', () => request('flare', [dead('p2'), dead('p2')])],
];

for (const [name, input] of invalid) test(name, () => {
  const state = input();
  const before = structuredClone(state);
  const decision = planRecovery(state);
  let debits = 0, applications = 0;
  const committed = commitRecoveryPlan(decision, {
    valid: () => true,
    debit: () => { debits++; return true; },
    apply: () => { applications++; },
  });
  assert.deepEqual(state, before, 'planning never mutates the supplied owner, targets, or cells');
  assert.equal(decision.ok, false, 'invalid target topology must produce a typed rejection');
  assert.equal(committed, false);
  assert.equal(debits, 0, 'invalid requests cannot spend an item');
  assert.equal(applications, 0, 'invalid requests cannot partially restore or relocate');
});

test('valid single-target Revival freezes the full plan and never spends while planning', () => {
  const state = request('revival', [dead('p2')]);
  const plan = planRecovery(state);
  assert.equal(plan.ok, true);
  assert.equal(plan.ownerSeat, 'p1');
  assert.deepEqual(plan.placements.map(value => value.seat), ['p2']);
  assert.equal(plan.protectionUntil, 5);
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.placements));
  assert.ok(Object.isFrozen(plan.placements[0]));
  assert.ok(Object.isFrozen(plan.placements[0].cell));
  const calls = [];
  assert.equal(commitRecoveryPlan(plan, {
    valid: () => { calls.push('validate'); return true; },
    debit: () => { calls.push('debit'); return true; },
    apply: () => calls.push('apply'),
  }), true);
  assert.deepEqual(calls, ['validate', 'debit', 'apply']);
});

test('stale validation and refused debit both prevent any recovery application', () => {
  const plan = planRecovery(request('revival', [dead('p2')]));
  assert.equal(plan.ok, true);
  for (const valid of [false, true]) {
    const calls = [];
    assert.equal(commitRecoveryPlan(plan, {
      valid: () => { calls.push('validate'); return valid; },
      debit: () => { calls.push('debit'); return false; },
      apply: () => calls.push('apply'),
    }), false);
    assert.deepEqual(calls, valid ? ['validate', 'debit'] : ['validate']);
  }
});
