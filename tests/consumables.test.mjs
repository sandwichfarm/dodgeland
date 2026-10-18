import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['consumables']);
after(source.dispose);
const {
  CONSUMABLES,
  planConsumableCredit,
  planConsumableDebit,
} = await source.import('consumables');

const survive = Object.freeze({ capabilities: Object.freeze(['survive-together']) });
const arcade = Object.freeze({ capabilities: Object.freeze([]) });
const owner = Object.freeze({ id: 'p1', generation: 7 });
const inventory = Object.freeze({ owner, generation: 11, charges: Object.freeze({ revival: 0, flare: 0 }) });
const dead = Object.freeze({ id: 'p2', lifecycle: 'dead' });
const deadTwo = Object.freeze({ id: 'p3', lifecycle: 'dead' });
const living = Object.freeze({ id: 'p4', lifecycle: 'living' });

function unchanged(value) {
  return JSON.parse(JSON.stringify(value));
}

test('the cooperative catalog is separate, priced, capacity-bound, and capability-gated', () => {
  assert.deepEqual(CONSUMABLES.map(item => ({ id: item.id, price: item.price, maxCharges: item.maxCharges, targetPolicy: item.targetPolicy })), [
    { id: 'revival', price: 24, maxCharges: 1, targetPolicy: 'dead-teammate' },
    { id: 'flare', price: 36, maxCharges: 1, targetPolicy: 'dead-teammates-and-active-regroup' },
  ]);
  assert.ok(CONSUMABLES.every(item => item.kind === 'consumable' && item.requiredCapability === 'survive-together'));
  assert.ok(Object.isFrozen(CONSUMABLES) && CONSUMABLES.every(Object.isFrozen));
});

test('credit creates one immutable owner and generation-bound charge plan', () => {
  const before = unchanged(inventory);
  const decision = planConsumableCredit({ mode: survive, owner, inventory, expectedInventoryGeneration: 11, itemId: 'revival' });
  assert.equal(decision.ok, true);
  assert.deepEqual(decision, {
    ok: true, kind: 'credit', itemId: 'revival', ownerId: 'p1', ownerGeneration: 7,
    inventoryGeneration: 11, chargeDelta: 1, resultingCharges: { revival: 1, flare: 0 },
  });
  assert.ok(Object.isFrozen(decision) && Object.isFrozen(decision.resultingCharges));
  assert.deepEqual(inventory, before, 'planning never commits inventory');
});

test('credit rejection is typed and cannot mutate a full, stale, wrong-mode, or unknown request', () => {
  const cases = [
    [{ ...inventory, charges: Object.freeze({ revival: 1, flare: 0 }) }, survive, owner, 11, 'revival', 'capacity-full'],
    [inventory, arcade, owner, 11, 'revival', 'ineligible-mode'],
    [inventory, survive, { id: 'p1', generation: 8 }, 11, 'revival', 'stale-owner'],
    [inventory, survive, owner, 12, 'revival', 'stale-inventory'],
    [inventory, survive, owner, 11, 'unknown', 'unknown-item'],
  ];
  for (const [candidate, mode, requestOwner, expectedInventoryGeneration, itemId, reason] of cases) {
    const before = unchanged(candidate);
    const decision = planConsumableCredit({ mode, owner: requestOwner, inventory: candidate, expectedInventoryGeneration, itemId });
    assert.deepEqual(decision, { ok: false, reason });
    assert.ok(Object.isFrozen(decision));
    assert.deepEqual(candidate, before);
  }
});

test('Revival debit binds exactly one eligible dead teammate and one charge', () => {
  const held = Object.freeze({ ...inventory, charges: Object.freeze({ revival: 1, flare: 0 }) });
  const before = unchanged(held);
  const decision = planConsumableDebit({ mode: survive, owner, inventory: held, expectedInventoryGeneration: 11, itemId: 'revival', targets: [dead] });
  assert.equal(decision.ok, true);
  assert.deepEqual(decision, {
    ok: true, kind: 'debit', itemId: 'revival', ownerId: 'p1', ownerGeneration: 7,
    inventoryGeneration: 11, chargeDelta: -1, resultingCharges: { revival: 0, flare: 0 },
    targets: [{ id: 'p2', lifecycle: 'dead' }],
  });
  assert.ok(Object.isFrozen(decision) && Object.isFrozen(decision.targets) && Object.isFrozen(decision.targets[0]));
  assert.deepEqual(held, before);
});

test('Revival rejects empty, stale, self, duplicate, living, and malformed targets without mutation', () => {
  const held = Object.freeze({ ...inventory, charges: Object.freeze({ revival: 1, flare: 0 }) });
  const cases = [
    [inventory, owner, 11, [dead], 'empty-charge'],
    [held, { id: 'p1', generation: 8 }, 11, [dead], 'stale-owner'],
    [held, { id: 'p9', generation: 7 }, 11, [dead], 'stale-owner'],
    [held, owner, 12, [dead], 'stale-inventory'],
    [held, owner, 11, [{ id: 'p1', lifecycle: 'dead' }], 'self-target'],
    [held, owner, 11, [dead, dead], 'duplicate-target'],
    [held, owner, 11, [living], 'ineligible-target'],
    [held, owner, 11, [], 'invalid-target-count'],
    [held, owner, 11, [dead, deadTwo], 'invalid-target-count'],
  ];
  for (const [candidate, requestOwner, expectedInventoryGeneration, targets, reason] of cases) {
    const before = unchanged(candidate);
    const decision = planConsumableDebit({ mode: survive, owner: requestOwner, inventory: candidate, expectedInventoryGeneration, itemId: 'revival', targets });
    assert.deepEqual(decision, { ok: false, reason });
    assert.deepEqual(candidate, before);
  }
});

test('Flare requires a dead target and valid living regroup bindings', () => {
  const held = Object.freeze({ ...inventory, charges: Object.freeze({ revival: 0, flare: 1 }) });
  const decision = planConsumableDebit({ mode: survive, owner, inventory: held, expectedInventoryGeneration: 11, itemId: 'flare', targets: [dead, deadTwo, living] });
  assert.equal(decision.ok, true);
  assert.deepEqual(decision.targets, [dead, deadTwo, living]);
  assert.deepEqual(decision.resultingCharges, { revival: 0, flare: 0 });
  for (const [targets, reason] of [
    [[living], 'no-dead-target'],
    [[dead, { id: 'p1', lifecycle: 'dead' }], 'self-target'],
    [[dead, living, living], 'duplicate-target'],
    [[dead, { id: 'p5', lifecycle: 'ghost' }], 'ineligible-target'],
  ]) {
    const before = unchanged(held);
    const rejected = planConsumableDebit({ mode: survive, owner, inventory: held, expectedInventoryGeneration: 11, itemId: 'flare', targets });
    assert.deepEqual(rejected, { ok: false, reason });
    assert.deepEqual(held, before);
  }
  const wrongMode = planConsumableDebit({ mode: arcade, owner, inventory: held, expectedInventoryGeneration: 11, itemId: 'flare', targets: [dead] });
  assert.deepEqual(wrongMode, { ok: false, reason: 'ineligible-mode' });
  const unknown = planConsumableDebit({ mode: survive, owner, inventory: held, expectedInventoryGeneration: 11, itemId: 'missing', targets: [dead] });
  assert.deepEqual(unknown, { ok: false, reason: 'unknown-item' });
  const revivalStillIndependent = planConsumableCredit({ mode: survive, owner, inventory: held, expectedInventoryGeneration: 11, itemId: 'revival' });
  assert.equal(revivalStillIndependent.ok, true, 'holding Flare never consumes Revival capacity');
});
