// Test-only semantic instrumentation. Normal production output never imports this module.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { resolve, dirname, sep } from 'node:path';
import { mkdir } from 'node:fs/promises';
import instrument from 'istanbul-lib-instrument';
import coverage from 'istanbul-lib-coverage';
import sourceMaps from 'istanbul-lib-source-maps';
import report from 'istanbul-lib-report';
import reports from 'istanbul-reports';
// Deliberate root dependency, independently pinned by the immutable root lock.
const requireRoot = createRequire(new URL('../../package.json', import.meta.url));
const ts = requireRoot('typescript');
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');

export function instrumentSources(sources, root) {
  const inventory = {};
  for (const name of Object.keys(sources).sort()) {
    const path = resolve(root, name), source = sources[name];
    const emitted = ts.transpileModule(source, { fileName: path, compilerOptions: {
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
      sourceMap: true, inlineSources: true, sourceRoot: dirname(path) + sep,
    } });
    const map = JSON.parse(emitted.sourceMapText);
    const tool = instrument.createInstrumenter({ esModules: true, compact: false, produceSourceMap: true });
    const code = tool.instrumentSync(emitted.outputText.replace(/\/\/# sourceMappingURL=.*$/m, ''), path, map);
    const zero = structuredClone(tool.lastFileCoverage());
    inventory[name] = { path, code, zero, source, sourceHash: hash(source), mapHash: hash(map), map };
  }
  return inventory;
}

export async function reportCoverage(inventory, payloads, directory) {
  const map = coverage.createCoverageMap({});
  for (const record of Object.values(inventory)) map.addFileCoverage(structuredClone(record.zero));
  for (const payload of payloads) map.merge(payload);
  const store = sourceMaps.createSourceMapStore();
  try {
    const remapped = await store.transformCoverage(map);
    await mkdir(directory, { recursive: true });
    const context = report.createContext({ dir: directory, coverageMap: remapped, sourceFinder: path => {
      const record = Object.values(inventory).find(row => row.path === path);
      if (!record) throw new Error(`Unknown source: ${path}`);
      return record.source;
    } });
    for (const [format, file] of [['json', 'coverage-final.json'], ['text', 'text.txt'], ['lcovonly', 'lcov.info']]) reports.create(format, { file }).execute(context);
    return { map: remapped, files: remapped.files(), summary: remapped.getCoverageSummary().toJSON() };
  } finally { store.dispose(); }
}
