import { SOUND_CUES } from './audio.js';
import type { SoundCue } from './audio.js';

export const MAX_SOUND_BYTES = 1024 * 1024;
const HEX = /^[0-9a-f]{64}$/;
export interface PackAddress { pubkey: string; identifier: string; relays: string[] }
export interface SoundPack { name: string; description: string; cues: Partial<Record<SoundCue, string>> }
export interface SoundFile { url: string; mime: string; hash: string }

/** Public NIP-51 release-artifact set, with the project-specific v1 cue profile. */
function eventTags(event: unknown, kind: number): string[][] {
  if (!event || typeof event !== 'object') throw new Error('Invalid sound event.');
  const value = event as Record<string, unknown>;
  if (value.kind !== kind || !Array.isArray(value.tags) || value.tags.length > 128 || !value.tags.every(t => Array.isArray(t) && t.length <= 8 && t.every(s => typeof s === 'string' && s.length <= 2048))) throw new Error('Invalid sound event tags.');
  return value.tags as string[][];
}
function single(tags: string[][], name: string): string {
  const matches = tags.filter(t => t[0] === name);
  if (matches.length > 1) throw new Error(`Duplicate ${name} tag.`);
  return matches[0]?.[1] ?? '';
}
export function parsePackAddress(input: string): PackAddress {
  const match = /^30063:([0-9a-f]{64}):(.{1,200})$/.exec(input.trim());
  if (!match) throw new Error('Enter a sound-pack naddr or 30063:author:identifier.');
  return { pubkey: match[1], identifier: match[2], relays: [] };
}
export function parseSoundPack(event: unknown): SoundPack {
  const tags = eventTags(event, 30063);
  const identifier = single(tags, 'd');
  if (!identifier || identifier.length > 200 || single(tags, 'puddlehop:sound-pack') !== '1') throw new Error('This list does not use the supported sound-pack format.');
  const members = new Set(tags.filter(t => t[0] === 'e').map(t => t[1]));
  const cues: SoundPack['cues'] = {};
  for (const tag of tags.filter(t => t[0] === 'puddlehop:cue')) {
    if (!SOUND_CUES.includes(tag[1] as SoundCue)) continue;
    const cue = tag[1] as SoundCue, id = tag[2];
    if (cues[cue] || !HEX.test(id ?? '') || !members.has(id)) throw new Error('Each cue must reference one file included in the list.');
    cues[cue] = id;
  }
  if (!Object.keys(cues).length) throw new Error('This pack has no supported game sounds.');
  return { name: (single(tags, 'title') || identifier).slice(0, 80), description: single(tags, 'description').slice(0, 200), cues };
}
export function parseSoundFile(event: unknown): SoundFile {
  const tags = eventTags(event, 1063);
  const url = single(tags, 'url'), mime = single(tags, 'm'), hash = single(tags, 'x'), size = single(tags, 'size');
  let validUrl = /^blossom:sha256:[0-9a-f]{64}$/.test(url);
  try { const parsed = new URL(url); validUrl ||= parsed.protocol === 'https:' && !!parsed.hostname && !parsed.username && !parsed.password; } catch { /* Reject invalid URLs below. */ }
  if (!validUrl || !/^audio\/[a-z0-9.+-]+$/.test(mime) || !HEX.test(hash)) throw new Error('Sound files need an audio type, supported URL and SHA-256 hash.');
  if (size && (!/^\d+$/.test(size) || Number(size) < 1 || Number(size) > MAX_SOUND_BYTES)) throw new Error('Sound files must be at most 1 MiB.');
  return { url, mime, hash };
}
