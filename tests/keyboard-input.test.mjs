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
