import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['consumables']);
after(source.dispose);
const { planConsumableCredit, planConsumableDebit } = await source.import('consumables');

const mode = { capabilities: ['survive-together'] };
const owner = { id: 'p1', generation: 7 };
const dead = { id: 'p2', lifecycle: 'dead' };
function request(charges, itemId) {
  return { mode, owner, inventory: { owner, generation: 11, charges }, expectedInventoryGeneration: 11, itemId };
}

test('a two-player team can Flare with only its owner alive', () => {
  const input = { ...request({ revival: 0, flare: 1 }, 'flare'), targets: [dead] };
  const before = structuredClone(input);
  const plan = planConsumableDebit(input);
  assert.equal(plan.ok, true, 'the living owner is the regroup anchor; another living teammate is unnecessary');
  assert.equal(plan.chargeDelta, -1);
  assert.deepEqual(plan.resultingCharges, { revival: 0, flare: 0 });
  assert.deepEqual(plan.targets, [dead]);
  assert.deepEqual(input, before, 'planning is read-only');
});

test('Revival and Flare have independent capacity and debits preserve the other charge', () => {
  for (const itemId of ['revival', 'flare']) {
    const other = itemId === 'revival' ? 'flare' : 'revival';
    const creditInput = request({ [itemId]: 0, [other]: 1 }, itemId);
    const creditBefore = structuredClone(creditInput);
    const credit = planConsumableCredit(creditInput);
    assert.equal(credit.ok, true, `${other} capacity cannot block ${itemId}`);
    assert.deepEqual(credit.resultingCharges, { revival: 1, flare: 1 });
    assert.deepEqual(creditInput, creditBefore);
    const debitInput = { ...request({ revival: 1, flare: 1 }, itemId), targets: [dead] };
    const debitBefore = structuredClone(debitInput);
    const debit = planConsumableDebit(debitInput);
    assert.equal(debit.ok, true);
    assert.equal(debit.resultingCharges[itemId], 0);
    assert.equal(debit.resultingCharges[other], 1);
    assert.deepEqual(debitInput, debitBefore);
    debitInput.targets[0] = { id: 'different-seat', lifecycle: 'living' };
    debitInput.inventory.charges[other] = 0;
    assert.deepEqual(debit.targets, [dead], 'a plan retains copied target bindings');
    assert.equal(debit.resultingCharges[other], 1, 'a plan retains copied charges');
  }
});

test('neither planner admits an invalid held-charge snapshot', () => {
  for (const itemId of ['revival', 'flare']) {
    for (const invalid of [-1, 0.5, 2, NaN, Infinity, '1']) {
      const input = { ...request({ revival: 1, flare: 1, [itemId]: invalid }, itemId), targets: [dead] };
      const before = structuredClone(input);
      for (const planner of [planConsumableCredit, planConsumableDebit]) {
        const decision = planner(input);
        assert.equal(decision.ok, false, `${itemId}=${String(invalid)} is not a valid 0/1 charge snapshot`);
        assert.equal(typeof decision.reason, 'string');
        assert.ok(Object.isFrozen(decision));
        assert.deepEqual(input, before);
      }
    }
  }
});

test('an omitted charge is empty under the sparse inventory contract', () => {
  const input = { ...request({}, 'revival'), targets: [dead] };
  const before = structuredClone(input);
  const credit = planConsumableCredit(input);
  assert.equal(credit.ok, true);
  assert.deepEqual(credit.resultingCharges, { revival: 1, flare: 0 });
  assert.equal(planConsumableDebit(input).ok, false, 'an omitted charge cannot be spent');
  assert.deepEqual(input, before);
});
