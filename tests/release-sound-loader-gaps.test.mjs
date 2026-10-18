import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { symlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { loadSources } from './source-loader.mjs';

// Component proof: real SDK forwarding, Blob bytes and SHA-256; the decoder is
// a controlled dependency. This suite never opens an audio device or network.
const sources = await loadSources('sound-loader');
await symlink(resolve('node_modules'), join(sources.directory, 'node_modules'), 'dir');
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', { value: { napplet: {} }, configurable: true });
after(async () => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else delete globalThis.window;
  await sources.dispose();
});
const { loadSoundPack, resolvePackAddress } = await sources.import('sound-loader');
const { MAX_SOUND_BYTES } = await sources.import('sound-packs');
const author = 'a'.repeat(64), fileId = 'b'.repeat(64), secondId = 'c'.repeat(64);
const address = `30063:${author}:fixture`;
const bytes = Uint8Array.from([1, 3, 5, 7]);
const hash = createHash('sha256').update(bytes).digest('hex');
function pack(id = 'd'.repeat(64), created_at = 1, cues = [['hop', fileId]]) {
  return { id, kind: 30063, pubkey: author, created_at, tags: [
    ['d', 'fixture'], ['title', id], ['puddlehop:sound-pack', '1'],
    ...[...new Set(cues.map(([, id]) => id))].map(id => ['e', id]),
    ...cues.map(([cue, id]) => ['puddlehop:cue', cue, id]),
  ] };
}
function file(id = fileId) {
  return { id, kind: 1063, tags: [['url', `https://audio.invalid/${id}.wav`], ['m', 'audio/wav'], ['x', hash]] };
}
function fixture(options = {}) {
  const calls = { queries: [], bytes: [], decodes: [] };
  window.napplet = {
    outbox: { async query(filters, queryOptions) {
      calls.queries.push({ filters, options: queryOptions });
      if (options.query) return options.query(filters);
      return { events: (filters[0].kinds[0] === 30063 ? options.packs ?? [pack()] : options.files ?? [file()]).map(event => ({ event })) };
    } },
    resource: { async bytes(url, request) {
      calls.bytes.push({ url, request });
      return options.blob ? options.blob(url) : new Blob([bytes], { type: 'audio/wav' });
    } },
  };
  const audio = { async decode(data, cue) {
    calls.decodes.push({ data: [...new Uint8Array(data)], cue });
    return options.decode ? options.decode(data, cue) : { duration: .5, length: 4000, numberOfChannels: 1 };
  } };
  return { audio, calls };
}

test('missing optional domains and invalid naddr decoding fail before resource access', async () => {
  for (const missing of ['outbox', 'resource']) {
    const { audio, calls } = fixture(); delete window.napplet[missing];
    await assert.rejects(loadSoundPack(address, audio, new AbortController().signal), /Built-in sounds/);
    assert.equal(calls.queries.length, 0); assert.equal(calls.bytes.length, 0);
  }
  window.napplet = {};
  await assert.rejects(resolvePackAddress('nostr:naddr1fixture'), /30063:author:identifier/);
  for (const decoded of [{ ok: false }, { ok: true, nip19Type: 'npub' }, { ok: true, nip19Type: 'naddr', kind: 1 }]) {
    window.napplet.common = { async decodeNip19() { return decoded; } };
    await assert.rejects(resolvePackAddress('naddr1fixture'), /sound-pack list/);
  }
  window.napplet.common = { async decodeNip19() { return { ok: true, nip19Type: 'naddr', kind: 30063, pubkey: author, identifier: 'fixture' }; } };
  assert.deepEqual(await resolvePackAddress('nostr:naddr1fixture'), { pubkey: author, identifier: 'fixture', relays: [] });
});

test('pack lookup distinguishes absence from host retrieval failure', async () => {
  for (const error of [undefined, 'host failure detail']) {
    const { audio, calls } = fixture({ query: async () => ({ events: [], error }) });
    await assert.rejects(loadSoundPack(address, audio, new AbortController().signal), error ? /shell could not retrieve/ : /Sound pack not found/);
    assert.equal(calls.queries.length, 1); assert.equal(calls.bytes.length, 0);
  }
});

test('newest matching list wins with stable ID tie breaking and mismatched events ignored', async () => {
  const winner = pack('1'.repeat(64), 9);
  const { audio, calls } = fixture({ packs: [pack('2'.repeat(64), 9), pack('0'.repeat(64), 1),
    { ...pack(), kind: 1, created_at: 20 }, { ...pack(), pubkey: 'e'.repeat(64), created_at: 20 },
    { ...pack(), tags: [], created_at: 20 }, winner] });
  const loaded = await loadSoundPack(address, audio, new AbortController().signal);
  assert.equal(loaded.name, winner.id); assert.equal(loaded.loaded, 1);
  assert.deepEqual(calls.queries[0].filters, [{ kinds: [30063], authors: [author], '#d': ['fixture'], limit: 10 }]);
  assert.deepEqual(calls.queries[1].filters, [{ kinds: [1063], ids: [fileId], limit: 1 }]);
  assert.deepEqual(calls.decodes, [{ data: [...bytes], cue: 'hop' }]);
});

test('invalid resource bytes or unavailable metadata never reach the decoder', async () => {
  for (const blob of [() => new Blob([], { type: 'audio/wav' }),
    () => new Blob([new Uint8Array(MAX_SOUND_BYTES + 1)], { type: 'audio/wav' }),
    () => new Blob([bytes], { type: 'text/html' }), () => new Blob([[9]], { type: 'audio/wav' })]) {
    const { audio, calls } = fixture({ blob });
    await assert.rejects(loadSoundPack(address, audio, new AbortController().signal), /No playable sounds/);
    assert.equal(calls.decodes.length, 0);
  }
  const { audio, calls } = fixture({ files: [] });
  await assert.rejects(loadSoundPack(address, audio, new AbortController().signal), /No playable sounds/);
  assert.equal(calls.bytes.length, 0); assert.equal(calls.decodes.length, 0);
});

test('one shared file is decoded once for its longest cue while short cues keep their defaults', async () => {
  for (const cues of [[['hop', fileId], ['music', fileId]], [['music', fileId], ['hop', fileId]]]) {
    const { audio, calls } = fixture({ packs: [pack(undefined, 1, cues)], decode: async () => ({ duration: 10, length: 80000, numberOfChannels: 1 }) });
    const loaded = await loadSoundPack(address, audio, new AbortController().signal);
    assert.deepEqual(Object.keys(loaded.clips), ['music']); assert.equal(loaded.loaded, 1);
    assert.equal(calls.bytes.length, 1); assert.equal(calls.decodes.length, 1);
    assert.equal(calls.decodes[0].cue, 'music');
  }
});

test('decoded budget skips excess assets while preserving an already valid clip', async () => {
  let decoded = 0;
  const { audio } = fixture({ packs: [pack(undefined, 1, [['music', fileId], ['hop', secondId]])], files: [file(), file(secondId)],
    decode: async () => ++decoded === 1 ? { duration: 60, length: 8388608, numberOfChannels: 1 } : { duration: .5, length: 4000, numberOfChannels: 1 } });
  const loaded = await loadSoundPack(address, audio, new AbortController().signal);
  assert.equal(decoded, 2); assert.deepEqual(Object.keys(loaded.clips), ['music']); assert.equal(loaded.loaded, 1);
});

test('abort after a host reply or decode rejects instead of installing stale clips', async () => {
  for (const at of ['query', 'resource', 'decode']) {
    const controller = new AbortController();
    const options = at === 'query' ? { query: async () => { controller.abort(); return { events: [{ event: pack() }] }; } }
      : at === 'resource' ? { blob: async () => { controller.abort(); return new Blob([bytes], { type: 'audio/wav' }); } }
        : { decode: async () => { controller.abort(); return { duration: .5, length: 4000, numberOfChannels: 1 }; } };
    const { audio, calls } = fixture(options);
    await assert.rejects(loadSoundPack(address, audio, controller.signal), { name: 'AbortError' });
    if (at === 'query') assert.equal(calls.bytes.length, 0);
    if (at !== 'decode') assert.equal(calls.decodes.length, 0);
  }
});
