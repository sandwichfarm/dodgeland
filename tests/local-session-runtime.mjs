import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

test('local-session integration keeps roster slots, keyboard ownership, and solo controller policy explicit', () => {
  assert.match(main, /function nextOpenSeat\(/, 'a middle seat may be left without reusing a later occupied seat');
  assert.match(main, /keyboardSeatForProfile/, 'Keyboard A/B must resolve to the actual assigned session seat');
  assert.match(main, /restoreSoloController/, 'Back to solo must restore a released sole controller lease');
  assert.match(main, /if \(displayedRunState\(\) !== 'playing'\) \{ confirmMenu\(\); return; \}/, 'controller confirm must remain a menu action while paused');
});
