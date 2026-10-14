import { HOME_IDS_V1 } from './levels/v1-content.js';

export type LevelSchema = 1 | 2 | 3;
/** A level identity captures the resolved start, not the player's mutable preferences. */
export type RunSeed = Readonly<{
  schema: LevelSchema;
  seed: number;
  home: typeof HOME_IDS_V1[number];
  mode: 'arcade' | 'stroll';
  gentle: boolean;
}>;
export const CURRENT_LEVEL_SCHEMA = 3;

export function createRunSeed(seed: number, home: string = 'pond', mode: 'arcade' | 'stroll' = 'arcade', gentle = false, schema: LevelSchema = CURRENT_LEVEL_SCHEMA): RunSeed {
  if (schema !== 1 && schema !== 2 && schema !== 3) throw new RangeError('Unsupported level schema.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('Seed must be an unsigned 32-bit integer.');
  if (!HOME_IDS_V1.some(id => id === home)) throw new RangeError(`Unknown world for level schema ${schema}.`);
  if (mode !== 'arcade' && mode !== 'stroll') throw new RangeError('Unknown run mode.');
  if (typeof gentle !== 'boolean') throw new TypeError('Gentle start must be a boolean.');
  return Object.freeze({ schema, seed, home: home as RunSeed['home'], mode, gentle });
}

/** Validate runtime descriptors too: imported codes must never fall through to today's defaults. */
export function validateRunSeed(value: RunSeed): RunSeed {
  if (!value || (value.schema !== 1 && value.schema !== 2 && value.schema !== 3)) throw new RangeError('Unsupported level schema.');
  if (typeof value.home !== 'string' || (value.mode !== 'arcade' && value.mode !== 'stroll') || typeof value.gentle !== 'boolean') throw new TypeError('Incomplete run seed.');
  return createRunSeed(value.seed, value.home, value.mode, value.gentle, value.schema);
}

export function encodeRunSeed(value: RunSeed): string {
  const run = validateRunSeed(value);
  return `ph${run.schema}-${run.seed.toString(16).padStart(8, '0')}-${run.home}-${run.mode === 'arcade' ? 'a' : 's'}-${run.gentle ? 'g' : 'n'}`;
}

export function decodeRunSeed(code: string): RunSeed {
  if (typeof code !== 'string' || code.length > 64) throw new TypeError('Invalid run seed.');
  const version = /^ph([0-9]+)-/.exec(code);
  if (version && version[1] !== '1' && version[1] !== '2' && version[1] !== '3') throw new RangeError(`Unsupported level schema ${version[1]}.`);
  const match = /^ph(1|2|3)-([0-9a-f]{8})-([a-z]+)-(a|s)-(n|g)$/.exec(code);
  if (!match || match[0] !== code) throw new TypeError('Invalid run seed.');
  return createRunSeed(parseInt(match[2]!, 16), match[3]!, match[4] === 'a' ? 'arcade' : 'stroll', match[5] === 'g', Number(match[1]) as LevelSchema);
}
