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
    const retainedLines=[line('function alias('),line('constructor(game: Game)'),line('noteProgress(row:'),line('constructor(world: SharedWorld'),line('get label()'),line('private get rescueFraction()'),line('get groundX()'),line('get groundY()'),line('get personalScore()'),line('selectMobTarget('),line('view(): SharedWorld')];
    for(const at of retainedLines){
      const ids=Object.entries(session.coverage.fnMap).filter(([,site])=>site.decl.start.line===at).map(([id])=>id);
      assert.ok(ids.length,`retained source line ${at} has a mapped function`);
      for(const id of ids)assert.equal(excluded.has(id),false,`retained shared/uncertain function ${id}`);
    }
    for(const fragment of ['static stage(', 'captureConsumablePolicy(', 'beginFrame(', 'resolvePickups()', 'recordInteraction(event:', 'setHopCooldown(', 'constructor(readonly game: Game', 'constructor(private readonly session: LocalSession']){
      const at=line(fragment),ids=Object.entries(session.coverage.fnMap).filter(([,site])=>site.decl.start.line===at).map(([id])=>id);
      assert.ok(ids.length,`reviewed source line ${at} has a mapped function`);
      for(const id of ids)assert.equal(excluded.has(id),true,`reviewed session-only function ${id}`);
    }
    assert.ok(excluded.size > 180, 'bounded member dispositions include real private item machinery');
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


test('new stage and secondary callback exclusions reject hits while preserving initialization',()=>{
 const mode='solo-arcade',dispositions=soloApplicabilityDispositions({mode,sources});
 const at=line('static stage('),id=Object.entries(session.coverage.fnMap).find(([,site])=>site.decl.start.line===at)[0];
 const hits=structuredClone(attributed);hits[session.path].f[id]=1;
 assert.throws(()=>reportApplicability({mode,sources,attributed:hits,dispositions}),/contradicted/);
 const callbackLine=line("onCoin: SessionPlayerCallbacks['onCoin']");
 const callbackId=Object.entries(session.coverage.fnMap).find(([,site])=>site.decl.start.line===callbackLine)[0];
 assert.ok(dispositions.some(d=>d.path===session.path&&d.kind==='function'&&d.id===callbackId));
 const statements=Object.entries(session.coverage.statementMap).filter(([,site])=>site.start.line===callbackLine);
 assert.ok(statements.length);
 for(const [id]of statements)assert.ok(!dispositions.some(d=>d.path===session.path&&d.kind==='statement'&&d.id===id),'callback allocation remains applicable');
 const alias=Object.entries(session.coverage.fnMap).find(([,site])=>site.decl.start.line===line('function alias('))[0];
 const sharedHits=structuredClone(attributed);sharedHits[session.path].f[alias]=1;
 assert.equal(reportApplicability({mode,sources,attributed:sharedHits,dispositions}).applicable.functions.covered,1);
});
