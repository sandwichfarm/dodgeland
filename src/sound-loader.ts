import { common, outbox, resource } from '@napplet/sdk';
import { runtimeHasDomain } from './domain-availability.js';
import { MAX_SOUND_BYTES, parsePackAddress, parseSoundFile, parseSoundPack } from './sound-packs.js';
import type { PackAddress } from './sound-packs.js';
import type { GameAudio, SoundCue } from './audio.js';
import { maxDurationForCue } from './audio.js';

export interface LoadedSoundPack { name: string; address: string; clips: Partial<Record<SoundCue, AudioBuffer>>; loaded: number }
const check = (signal: AbortSignal): void => signal.throwIfAborted();
export async function resolvePackAddress(input: string): Promise<PackAddress> {
  const value = input.trim().replace(/^nostr:/i, '');
  if (!/^naddr1/i.test(value)) return parsePackAddress(value);
  if (!runtimeHasDomain('common')) throw new Error('This shell needs a 30063:author:identifier address.');
  const decoded = await common.decodeNip19(value);
  if (!decoded.ok || decoded.nip19Type !== 'naddr' || decoded.kind !== 30063) throw new Error('Choose a sound-pack list address.');
  const address = parsePackAddress(`30063:${decoded.pubkey}:${decoded.identifier}`);
  address.relays = (decoded.relays ?? []).filter(r => /^wss:\/\//.test(r)).slice(0, 4);
  return address;
}
/** No relay or HTTP authority here: the shell validates events and supplies bytes. */
export async function loadSoundPack(input: string, audio: GameAudio, signal: AbortSignal): Promise<LoadedSoundPack> {
  if (!runtimeHasDomain('outbox') || !runtimeHasDomain('resource')) throw new Error('This shell cannot load shared packs. Built-in sounds are available.');
  const address = await resolvePackAddress(input); check(signal);
  const options = { authors: [address.pubkey], ...(address.relays.length ? { relays: address.relays } : {}), timeoutMs: 5000 };
  const result = await outbox.query([{ kinds: [30063], authors: [address.pubkey], '#d': [address.identifier], limit: 10 }], options); check(signal);
  const event = result.events.map(r => r.event).filter(e => e.kind === 30063 && e.pubkey === address.pubkey && e.tags.find(t => t[0] === 'd')?.[1] === address.identifier)
    .sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id))[0];
  if (!event) throw new Error(result.error ? 'The shell could not retrieve this pack. Try again.' : 'Sound pack not found. Check the address and try again.');
  const pack = parseSoundPack(event), ids = [...new Set(Object.values(pack.cues))];
  const files = await outbox.query([{ kinds: [1063], ids, limit: ids.length }], options); check(signal);
  const clips: LoadedSoundPack['clips'] = {};
  let decodedBytes = 0;
  // Load one file at a time, with a total decoded budget as well as per-cue limits.
  for (const id of ids) {
    check(signal);
    try {
      const file = parseSoundFile(files.events.find(r => r.event.id === id)?.event);
      const blob = await resource.bytes(file.url, { signal }); check(signal);
      if (!blob.size || blob.size > MAX_SOUND_BYTES || !blob.type.startsWith('audio/')) continue;
      const bytes = await blob.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes); check(signal);
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== file.hash) continue;
      const mapped = (Object.keys(pack.cues) as SoundCue[]).filter(cue => pack.cues[cue] === id);
      const longest = mapped.reduce((a, b) => maxDurationForCue(a) >= maxDurationForCue(b) ? a : b);
      const buffer = await audio.decode(bytes, longest); check(signal);
      const size = buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
      if (decodedBytes + size > 32 * 1024 * 1024) continue;
      decodedBytes += size;
      for (const cue of mapped) if (buffer.duration <= maxDurationForCue(cue)) clips[cue] = buffer;
    } catch { check(signal); /* An unavailable/invalid cue keeps its local default. */ }
  }
  const loaded = Object.keys(clips).length;
  if (!loaded) throw new Error('No playable sounds were found. Your current pack is still selected.');
  return { name: pack.name, address: input.trim(), clips, loaded };
}
