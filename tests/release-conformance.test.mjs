// Negative controls for the supplemental release conformance collector.
import assert from 'node:assert/strict';
import test from 'node:test';
import { assertWireJourney, validateCurrentManifest } from './release-conformance.mjs';

test('a fabricated transcript cannot establish an observed user wire journey', () => {
  assert.throws(() => assertWireJourney({
    scenario: 'matching-reply', invocation: { fulfilled: 1 },
    transcript: [{ direction: 'out', data: { type: 'storage.set', id: 'invented' } }],
  }), /observed/i);
});

const artifactHash = 'a'.repeat(64);
const candidate = () => ({ kind: 35129, created_at: 0, content: 'A local multiplayer game.', tags: [
  ['d', 'puddlehop'], ['x', artifactHash], ['title', 'Down to Duck'], ['O', 'intent'],
  ['z', 'game'], ['i', 'napplet:game/open'],
] });

test('current unsigned candidate checks byte hash and cardinality without claiming a signature', () => {
  const result = validateCurrentManifest(candidate(), artifactHash);
  assert.equal(result.byteDigestMatches, true);
  assert.equal(result.signatureMeasured, false);
  assert.equal(result.publicationMeasured, false);
});

test('legacy, malformed, duplicate and stale artifact candidates refuse', () => {
  for (const alter of [
    value => { value.kind = 5129; },
    value => { value.content = ''; },
    value => { value.tags.push(['x', artifactHash]); },
    value => { value.tags.push(['d', 'another-identity']); },
    value => { value.tags[1][1] = 'bad'; },
    value => { value.tags[1][1] = 'b'.repeat(64); },
    value => { value.tags.push(['path', '/index.html', artifactHash]); },
    value => { value.tags.push(['requires', 'storage']); },
  ]) {
    const value = candidate(); alter(value);
    assert.throws(() => validateCurrentManifest(value, artifactHash));
  }
});
