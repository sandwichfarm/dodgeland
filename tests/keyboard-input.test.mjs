import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources('keyboard-input');
test.after(() => sources.dispose());

test('Keyboard A and Keyboard B keep held movement and call edges isolated', async () => {
  const { createKeyboardInput } = await sources.import('keyboard-input');
  const moves = [], calls = [];
  const keyboard = createKeyboardInput({
    move: (seat, direction) => moves.push({ seat, direction }),
    call: seat => calls.push(seat),
  });

  assert.equal(keyboard.keydown('w'), true);
  assert.equal(keyboard.keydown('ArrowUp'), true);
  assert.equal(keyboard.keydown('q'), true);
  assert.equal(keyboard.keydown('.'), true);
  assert.equal(keyboard.keydown('q'), false, 'P1 repeat stays latched');
  assert.equal(keyboard.keyup('q'), true);
  assert.equal(keyboard.keydown('q'), true, 'P1 release enables only P1 again');
  assert.equal(keyboard.keyup('ArrowUp'), true);

  assert.deepEqual(moves, [
    { seat: 'p1', direction: 'forward' },
    { seat: 'p2', direction: 'forward' },
  ]);
  assert.deepEqual(calls, ['p1', 'p2', 'p1']);
});

test('dynamic Local Play seats ignore unassigned profiles and route Keyboard B to its chosen seat', async () => {
  const { createKeyboardInput } = await sources.import('keyboard-input');
  const moves = [], calls = [];
  const assignments = { 'keyboard-a': undefined, 'keyboard-b': 'p3' };
  const keyboard = createKeyboardInput({
    move: (seat, direction) => moves.push({ seat, direction }),
    call: seat => calls.push(seat),
    seatForProfile: profile => assignments[profile],
  });

  assert.equal(keyboard.keydown('w'), false, 'an explicitly unassigned Keyboard A cannot move a controller-owned P1');
  assert.equal(keyboard.keydown('q'), false, 'an explicitly unassigned Keyboard A cannot call a controller-owned P1');
  assert.equal(keyboard.keydown('ArrowUp'), true);
  assert.equal(keyboard.keydown('.'), true);
  assert.deepEqual(moves, [{ seat: 'p3', direction: 'forward' }]);
  assert.deepEqual(calls, ['p3']);
});

test('keyboard map validation rejects duplicate or malformed maps without mutating the active map', async () => {
  const { DEFAULT_KEYBOARD_BINDINGS, validateKeyboardBindings, updateKeyboardBinding } = await sources.import('keyboard-input');
  const original = structuredClone(DEFAULT_KEYBOARD_BINDINGS);
  const duplicate = updateKeyboardBinding(original, 'keyboard-b', 'forward', 'w');
  const result = validateKeyboardBindings(duplicate);

  assert.equal(result.ok, false);
  assert.deepEqual(result.conflicts, [{ key: 'W', first: { profile: 'keyboard-a', action: 'forward' }, second: { profile: 'keyboard-b', action: 'forward' } }]);
  assert.deepEqual(original, DEFAULT_KEYBOARD_BINDINGS, 'proposals never mutate the active bindings');
  assert.equal(validateKeyboardBindings({ version: 7, profiles: {} }).ok, false, 'unknown persisted versions are invalid');
});

test('suspend, capture, focus loss, and resume seed held keys without releasing another profile edge', async () => {
  const { createKeyboardInput } = await sources.import('keyboard-input');
  const calls = [];
  const keyboard = createKeyboardInput({ move: () => {}, call: seat => calls.push(seat) });

  keyboard.keydown('q');
  keyboard.suspend();
  keyboard.resume(['q', 'ArrowUp']);
  assert.equal(keyboard.keydown('q'), false, 'a key held through resume cannot produce a stale call');
  assert.equal(keyboard.keydown('.'), true, 'another profile stays independently available');
  keyboard.keyup('q');
  assert.equal(keyboard.keydown('q'), true, 'release after resume enables the profile again');
  keyboard.beginCapture();
  assert.equal(keyboard.keydown('.'), false, 'capture suspends game delivery');
  keyboard.endCapture([]);
  assert.deepEqual(calls, ['p1', 'p2', 'p1']);
});

test('versioned storage parser retains defaults for malformed or unavailable values', async () => {
  const { DEFAULT_KEYBOARD_BINDINGS, parseStoredKeyboardBindings, serializeKeyboardBindings } = await sources.import('keyboard-input');
  assert.deepEqual(parseStoredKeyboardBindings(null), DEFAULT_KEYBOARD_BINDINGS);
  assert.deepEqual(parseStoredKeyboardBindings('{not json'), DEFAULT_KEYBOARD_BINDINGS);
  assert.deepEqual(parseStoredKeyboardBindings(serializeKeyboardBindings(DEFAULT_KEYBOARD_BINDINGS)), DEFAULT_KEYBOARD_BINDINGS);
});

test('binding store persists only accepted complete maps and retains an in-memory fallback', async () => {
  const { createKeyboardBindingStore, DEFAULT_KEYBOARD_BINDINGS, updateKeyboardBinding } = await sources.import('keyboard-input');
  const writes = [];
  const store = createKeyboardBindingStore({
    async getItem() { return null; },
    async setItem(key, value) { writes.push({ key, value }); },
  });
  assert.deepEqual(await store.load(), DEFAULT_KEYBOARD_BINDINGS);
  const changed = updateKeyboardBinding(DEFAULT_KEYBOARD_BINDINGS, 'keyboard-a', 'call', 'E');
  assert.equal((await store.commit(changed)).ok, true);
  assert.equal(writes.length, 1);
  const conflicting = updateKeyboardBinding(changed, 'keyboard-b', 'call', 'E');
  assert.equal((await store.commit(conflicting)).ok, false);
  assert.equal(writes.length, 1, 'invalid maps never reach durable storage');

  const unavailable = createKeyboardBindingStore(undefined);
  assert.equal((await unavailable.commit(changed)).ok, true);
  assert.deepEqual(unavailable.current(), changed, 'storage absence keeps the usable session map');
});

test('rejected storage reads and writes keep usable controls for the current run', async () => {
  const { createKeyboardBindingStore, DEFAULT_KEYBOARD_BINDINGS, KEYBOARD_STORAGE_KEY, updateKeyboardBinding } = await sources.import('keyboard-input');
  const operations = [];
  const store = createKeyboardBindingStore({
    async getItem(key) { operations.push(['read', key]); throw new Error('storage unavailable'); },
    async setItem(key, value) { operations.push(['write', key, value]); throw new Error('storage denied'); },
  });
  assert.deepEqual(await store.load(), DEFAULT_KEYBOARD_BINDINGS);
  const changed = updateKeyboardBinding(DEFAULT_KEYBOARD_BINDINGS, 'keyboard-a', 'call', 'e');
  const result = await store.commit(changed);
  assert.equal(result.ok, true);
  assert.equal(store.current().profiles['keyboard-a'].call, 'E');
  assert.deepEqual(result.bindings, store.current());
  assert.deepEqual(operations.map(([kind, key]) => [kind, key]), [['read', KEYBOARD_STORAGE_KEY], ['write', KEYBOARD_STORAGE_KEY]]);
  const invalid = updateKeyboardBinding(changed, 'keyboard-b', 'call', 'E');
  assert.equal((await store.commit(invalid)).ok, false);
  assert.deepEqual(store.current(), changed, 'rejected proposal retains the last usable in-memory map');
  assert.equal(operations.length, 2, 'invalid proposal never attempts persistence');
  assert.deepEqual(await createKeyboardBindingStore().load(), DEFAULT_KEYBOARD_BINDINGS);
});

test('malformed persisted profiles fall back atomically and cannot create a live router', async () => {
  const { DEFAULT_KEYBOARD_BINDINGS, parseStoredKeyboardBindings, serializeKeyboardBindings, validateKeyboardBindings, createKeyboardInput, updateKeyboardBinding } = await sources.import('keyboard-input');
  const badKey = updateKeyboardBinding(DEFAULT_KEYBOARD_BINDINGS, 'keyboard-a', 'call', 'Shift');
  const conflicting = updateKeyboardBinding(DEFAULT_KEYBOARD_BINDINGS, 'keyboard-b', 'call', 'q');
  const invalid = [null, 1, { version: 1 }, { version: 1, profiles: 'invalid' },
    { version: 1, profiles: { 'keyboard-a': 7, 'keyboard-b': DEFAULT_KEYBOARD_BINDINGS.profiles['keyboard-b'] } },
    { version: 1, profiles: { 'keyboard-a': DEFAULT_KEYBOARD_BINDINGS.profiles['keyboard-a'] } }, badKey, conflicting];
  const sink = { move: () => assert.fail('invalid map moved'), call: () => assert.fail('invalid map called') };
  for (const candidate of invalid) {
    const before = structuredClone(candidate);
    assert.equal(validateKeyboardBindings(candidate).ok, false);
    assert.deepEqual(parseStoredKeyboardBindings(JSON.stringify(candidate)), DEFAULT_KEYBOARD_BINDINGS);
    assert.throws(() => serializeKeyboardBindings(candidate), TypeError);
    assert.throws(() => createKeyboardInput(sink, candidate), TypeError);
    assert.deepEqual(candidate, before);
  }
  assert.throws(() => updateKeyboardBinding(DEFAULT_KEYBOARD_BINDINGS, 'keyboard-c', 'call', 'E'), TypeError);
  assert.throws(() => updateKeyboardBinding(DEFAULT_KEYBOARD_BINDINGS, 'keyboard-a', 'unknown-action', 'E'), TypeError);
});

test('unbound and unsupported keys cannot release another held action across focus and capture', async () => {
  const { createKeyboardInput, normalizeKeyboardKey } = await sources.import('keyboard-input');
  const calls = [], moves = [];
  const keyboard = createKeyboardInput({ move: (...args) => moves.push(args), call: seat => calls.push(seat) });
  assert.equal(normalizeKeyboardKey(undefined), undefined);
  assert.equal(normalizeKeyboardKey(13), undefined);
  keyboard.resume(['Shift', 'z', 'q']);
  for (const key of ['Shift', 'z', '?']) {
    assert.equal(keyboard.keydown(key), false);
    assert.equal(keyboard.keyup(key), false);
  }
  assert.equal(keyboard.keydown('q'), false, 'unknown releases leave the held call latched');
  assert.deepEqual(calls, []);
  assert.deepEqual(moves, []);
  assert.equal(keyboard.keyup('q'), true);
  assert.equal(keyboard.keydown('q'), true);
  keyboard.beginCapture(); keyboard.endCapture();
  assert.equal(keyboard.keydown('q'), true, 'empty capture ends with fresh input');
  keyboard.suspend(); keyboard.resume();
  assert.equal(keyboard.keydown('.'), true);
  keyboard.dispose();
  assert.equal(keyboard.keydown('.'), false);
  assert.deepEqual(calls, ['p1', 'p1', 'p2']);
});
