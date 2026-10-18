import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
export const PINNED_BASELINE_SHA = 'a310a81ed6c76df4b265c9012c23b8c83f4802e5';

function missingHistoryError(cause) {
  return new Error(`Pinned solo baseline ${PINNED_BASELINE_SHA} is unavailable. Fetch full Git history (for example: git fetch --unshallow) before running test:solo-parity. ${cause ?? ''}`.trim());
}

/** Extract only the pinned production tree; never substitute the working source. */
export async function extractPinnedBaseline(repository = process.cwd()) {
  const root = resolve(repository);
  let resolved;
  try {
    ({ stdout: resolved } = await execFile('git', ['rev-parse', `${PINNED_BASELINE_SHA}^{commit}`], { cwd: root }));
  } catch (error) {
    throw missingHistoryError(error instanceof Error ? error.message : String(error));
  }
  if (resolved.trim() !== PINNED_BASELINE_SHA) throw missingHistoryError(`Git resolved a different object (${resolved.trim() || 'none'}).`);
  console.log(`[solo-parity] immutable baseline ${PINNED_BASELINE_SHA}`);

  const directory = await mkdtemp(join(tmpdir(), 'down-to-duck-pinned-baseline-'));
  const archive = join(directory, 'baseline.tar');
  try {
    const { stdout } = await execFile('git', ['archive', '--format=tar', PINNED_BASELINE_SHA, 'src'], {
      cwd: root, encoding: 'buffer', maxBuffer: 32 * 1024 * 1024,
    });
    await writeFile(archive, stdout);
    await execFile('tar', ['-xf', archive, '-C', directory]);
    return {
      sha: PINNED_BASELINE_SHA, directory, sourceDirectory: join(directory, 'src'),
      async dispose() { await rm(directory, { recursive: true, force: true }); },
      async [Symbol.asyncDispose]() { await rm(directory, { recursive: true, force: true }); },
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw missingHistoryError(error instanceof Error ? error.message : String(error));
  }
}
