import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['consumables', 'consumable-drops', 'race-items']);
after(source.dispose);
const { CONSUMABLES, planConsumableCredit, planConsumableDebit } = await source.import('consumables');
const { sampleConsumableDrop } = await source.import('consumable-drops');
const { RACE_ITEMS } = await source.import('race-items');

const mode = { capabilities: ['survive-together'] };
const owner = { id: 'p1', generation: 7 };
const dead = { id: 'p2', lifecycle: 'dead' };
function request(charges, itemId) {
  return { mode, owner, inventory: { owner, generation: 11, charges }, expectedInventoryGeneration: 11, itemId };
}

test('known world anchors resolve through the catalog into exactly one held charge plan', () => {
  for (const [row, slot, itemId] of [[60, 3, 'revival'], [106, 12, 'flare']]) {
    const drop = sampleConsumableDrop({ courseSeed: 0x12345678, row, slot });
    assert.equal(drop.itemId, itemId);
    const definition = CONSUMABLES.find(item => item.id === drop.itemId);
    assert.equal(definition?.kind, 'consumable');
    const input = request({}, definition.id);
    const before = structuredClone(input.inventory);
    const plan = planConsumableCredit(input);
    assert.equal(plan.ok, true);
    assert.equal(plan.ownerId, owner.id);
    assert.equal(plan.inventoryGeneration, before.generation);
    assert.deepEqual(input.inventory, before, 'sampling and planning never award a charge directly');
    const localCopy = { ...before, generation: before.generation + 1, charges: { ...plan.resultingCharges } };
    assert.equal(localCopy.charges[itemId], 1);
    assert.equal(Object.values(localCopy.charges).reduce((sum, value) => sum + value, 0), 1);
    assert.equal(planConsumableCredit({ ...input, inventory: localCopy, expectedInventoryGeneration: localCopy.generation }).ok, false, 'the awarded class is now at capacity');
  }
});

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

test('missing or malformed inventory structure rejects before either charge transaction', () => {
  for (const inventory of [undefined, null, {},
    { owner: null, generation: 11, charges: {} },
    { owner, generation: -1, charges: {} },
    { owner, generation: 11 }, { owner, generation: 11, charges: null }]) {
    const input = { ...request({ revival: 1 }, 'revival'), inventory, targets: [dead] };
    const before = structuredClone(input);
    for (const planner of [planConsumableCredit, planConsumableDebit]) {
      const decision = planner(input);
      assert.deepEqual(decision, { ok: false, reason: 'invalid-inventory' });
      assert.ok(Object.isFrozen(decision)); assert.deepEqual(input, before);
    }
  }
});

test('invalid target collections and empty Flare requests cannot produce debit plans', () => {
  for (const targets of [undefined, null, {}, 'p2']) {
    const input = { ...request({ revival: 1 }, 'revival'), targets };
    const before = structuredClone(input);
    assert.deepEqual(planConsumableDebit(input), { ok: false, reason: 'invalid-target-count' });
    assert.deepEqual(input, before);
  }
  const input = { ...request({ flare: 1 }, 'flare'), targets: [] }, before = structuredClone(input);
  assert.deepEqual(planConsumableDebit(input), { ok: false, reason: 'no-dead-target' });
  assert.deepEqual(input, before);
  assert.equal(planConsumableDebit({ ...input, targets: [dead] }).ok, true,
    'correcting targets does not require another charge');
});

test('the actual tactical catalogue enforces self and opponent target shape without spending', () => {
  for (const itemId of ['fog-lantern', 'mud-splash']) {
    const input = { ...request({ 'fog-lantern': 1, 'mud-splash': 1 }, itemId),
      catalogue: RACE_ITEMS, mode: { capabilities: ['race-tactics'] } };
    const invalidTargets = itemId === 'fog-lantern'
      ? [[], [{ id: 'p2', lifecycle: 'living' }], [{ id: owner.id, lifecycle: 'dead' }]]
      : [[], [{ id: 'p2', lifecycle: 'living' }, { id: 'p3', lifecycle: 'living' }], [dead]];
    for (const targets of invalidTargets) {
      const request = { ...input, targets }, before = structuredClone(request);
      const decision = planConsumableDebit(request);
      assert.deepEqual(decision, { ok: false, reason: 'ineligible-target' });
      assert.ok(Object.isFrozen(decision)); assert.deepEqual(request, before);
    }
    const targets = [{ id: itemId === 'fog-lantern' ? owner.id : 'p2', lifecycle: 'living' }];
    const corrected = { ...input, targets }, before = structuredClone(corrected);
    const plan = planConsumableDebit(corrected);
    assert.equal(plan.ok, true); assert.equal(plan.resultingCharges[itemId], 0);
    assert.equal(plan.resultingCharges[itemId === 'fog-lantern' ? 'mud-splash' : 'fog-lantern'], 1);
    assert.deepEqual(corrected, before); assert.deepEqual(plan.targets, targets);
  }
});
