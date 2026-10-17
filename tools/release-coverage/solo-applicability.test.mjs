import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { instrumentSources, reportCoverage } from './instrument.mjs';
import { reportApplicability } from './applicability.mjs';
import { soloApplicabilityDispositions } from './solo-applicability.mjs';

const directory = await mkdtemp(join(tmpdir(), 'solo-applicability-'));
after(() => rm(directory, { recursive: true, force: true }));
const root = resolve(new URL('../..', import.meta.url).pathname);
const texts = Object.fromEntries(await Promise.all(['src/session.ts', 'src/co-op-market.ts'].map(async path => [path, await readFile(join(root, path), 'utf8')])));
const inventory = instrumentSources(texts, root);
// Explicit synthetic zero realm supplies schema only; this is not runtime credit.
const mapped = await reportCoverage(inventory, [Object.fromEntries(Object.values(inventory).map(row => [row.path, row.zero]))], directory);
const sources = Object.values(inventory).map(row => ({ path: row.path, source: row.source, map: row.map, coverage: mapped.map.fileCoverageFor(row.path).toJSON() }));
const attributed = Object.fromEntries(sources.map(row => [row.path, structuredClone(row.coverage)]));
const session = sources.find(row => row.path.endsWith('/session.ts'));
const line = fragment => session.source.slice(0, session.source.indexOf(fragment)).split('\n').length;

test('actual mapped source excludes only reviewed solo-inapplicable execution and keeps shared owners', () => {
  const before = structuredClone(sources);
  for (const mode of ['solo-arcade', 'solo-flow']) {
    const dispositions = soloApplicabilityDispositions({ mode, sources });
    const excluded = new Set(dispositions.filter(d => d.path === session.path && d.kind === 'function').map(d => d.id));
    const start = line('export class LocalSession {'), stage = line('static stage(');
    assert.ok(stage > start);
    for (const [id, site] of Object.entries(session.coverage.fnMap)) {
      if (site.decl.start.line < start) assert.equal(excluded.has(id), false, `shared owner function ${id}`);
      if (site.decl.start.line === stage) assert.equal(excluded.has(id), false, 'static transition remains applicable');
    }
    assert.ok(excluded.size > 100, 'actual LocalSession instance functions are explicitly mapped');
    assert.ok(dispositions.some(d => d.path.endsWith('/co-op-market.ts') && d.kind === 'branch'));
    const report = reportApplicability({ mode, sources, attributed, dispositions });
    assert.equal(report.raw.functions.total, Object.values(attributed).reduce((sum, c) => sum + Object.keys(c.f).length, 0));
    assert.ok(report.applicable.functions.total < report.raw.functions.total);
    assert.ok(report.applicable.functions.total > 0);
    assert.deepEqual(report.dispositions, dispositions);
  }
  assert.deepEqual(sources, before);
});

test('production dispositions are deterministic and fail closed on source drift or missing owners', () => {
  const input = { mode: 'solo-arcade', sources };
  assert.deepEqual(soloApplicabilityDispositions(input), soloApplicabilityDispositions(input));
  assert.throws(() => soloApplicabilityDispositions({ ...input, mode: 'race' }), /solo/);
  assert.throws(() => soloApplicabilityDispositions({ ...input, sources: sources.slice(1) }), /Missing/);
  assert.throws(() => soloApplicabilityDispositions({ ...input, sources: [...sources, sources[0]] }), /Duplicate/);
  const changed = structuredClone(sources); changed[0].source += '\n';
  assert.throws(() => soloApplicabilityDispositions({ ...input, sources: changed }), /changed/);
});

test('mapped exclusions cannot conceal an observed solo hit or survive source-map/schema drift', () => {
  const mode = 'solo-arcade', dispositions = soloApplicabilityDispositions({ mode, sources });
  for (const kind of ['statement', 'function', 'branch']) {
    const d = dispositions.find(row => row.kind === kind), hits = structuredClone(attributed);
    if (kind === 'branch') hits[d.path].b[d.id][d.arm] = 1;
    else hits[d.path][kind === 'statement' ? 's' : 'f'][d.id] = 1;
    assert.throws(() => reportApplicability({ mode, sources, attributed: hits, dispositions }), /contradicted/);
  }
  const changed = structuredClone(sources); changed[0].map.file = 'changed.js';
  assert.throws(() => reportApplicability({ mode, sources: changed, attributed, dispositions }), /stale/);
  const schema = structuredClone(sources), hits = structuredClone(attributed);
  schema[0].coverage.fnMap['0'].name = 'changed'; hits[schema[0].path].fnMap['0'].name = 'changed';
  assert.throws(() => reportApplicability({ mode, sources: schema, attributed: hits, dispositions }), /stale/);
});
