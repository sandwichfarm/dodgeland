import test from 'node:test';
import assert from 'node:assert/strict';
import { applicabilityIdentity, reportApplicability } from './applicability.mjs';

function fixture() {
  const span = line => ({ start: { line, column: 0 }, end: { line, column: 4 } });
  const coverage = { path: '/synthetic/mixed.ts', statementMap: { '0': span(1), '1': span(1), '2': span(2) }, fnMap: { '0': { name: 'solo', decl: span(1), loc: span(1) }, '1': { name: 'session', decl: span(2), loc: span(2) } }, branchMap: { '0': { type: 'if', loc: span(1), locations: [span(1), span(2)] } }, s: { '0': 0, '1': 0, '2': 0 }, f: { '0': 0, '1': 0 }, b: { '0': [0, 0] } };
  const source = { path: coverage.path, source: 'solo(); session();\nother();', map: { version: 3, sources: ['mixed.ts'], mappings: 'AAAA' }, coverage };
  const hits = structuredClone(coverage); hits.s['0'] = 2; hits.f['0'] = 1; hits.b['0'][0] = 3;
  const input = { mode: 'solo-arcade', sources: [source], attributed: { [source.path]: hits }, dispositions: [] };
  const disposition = (kind, id, arm) => ({ mode: input.mode, path: source.path, ...applicabilityIdentity(source), kind, id, ...(arm === undefined ? {} : { arm }), callReason: 'Synthetic session-only entry', stateReason: 'Stable solo has no session or staging', authority: 'Synthetic fixture, not production proof' });
  return { input, source, hits, disposition };
}

test('unclassified zero sites stay applicable; projection preserves raw inputs and exact totals', () => {
  const { input, disposition } = fixture(), before = structuredClone(input);
  const raw = reportApplicability(input);
  assert.deepEqual(raw.raw, raw.applicable);
  assert.deepEqual(raw.raw.functions, { covered: 1, total: 2 });
  input.dispositions = [disposition('function', '1'), disposition('branch', '0', 1), disposition('statement', '2')];
  const saved = structuredClone(input), result = reportApplicability(input);
  assert.deepEqual(input, saved); assert.deepEqual(input.attributed, before.attributed);
  assert.deepEqual(result.raw, raw.raw);
  assert.deepEqual(result.applicable.functions, { covered: 1, total: 1 });
  assert.deepEqual(result.applicable.branches, { covered: 1, total: 1 });
  assert.deepEqual(result.applicable.lines, { covered: 1, total: 1 });
  assert.equal(result.dispositions.length, 3);
});

test('mixed line stays until every executable statement on it is explicitly inapplicable', () => {
  const { input, hits, disposition } = fixture(); hits.s['0'] = 0;
  input.dispositions = [disposition('statement', '0')];
  assert.equal(reportApplicability(input).applicable.lines.total, 2);
  input.dispositions.push(disposition('statement', '1'));
  assert.equal(reportApplicability(input).applicable.lines.total, 1);
});

test('stale identities, wrong mode, absent reasons, duplicates and unknown sites fail closed', () => {
  const { input, disposition } = fixture();
  for (const change of [d => d.sourceHash = 'stale', d => d.mapHash = 'stale', d => d.schemaHash = 'stale', d => d.mode = 'race', d => d.callReason = '', d => d.stateReason = '', d => d.authority = '', d => d.id = '99', d => d.path = '/other', d => d.kind = 'line', d => d.arm = 0]) {
    const d = disposition('function', '1'); change(d);
    assert.throws(() => reportApplicability({ ...input, dispositions: [d] }));
  }
  const d = disposition('function', '1'); assert.throws(() => reportApplicability({ ...input, dispositions: [d, d] }), /Duplicate/);
  assert.throws(() => reportApplicability({ ...input, dispositions: [disposition('branch', '0', 2)] }), /Unknown/);
});

test('observed hits contradict exclusion in each metric, never justify relabeling', () => {
  const { input, disposition } = fixture();
  for (const d of [disposition('statement', '0'), disposition('function', '0'), disposition('branch', '0', 0)]) assert.throws(() => reportApplicability({ ...input, dispositions: [d] }), /contradicted/);
});

test('missing sources, schema drift, invalid counters and empty applicability fail closed', () => {
  for (const change of [i => i.sources = [], i => i.sources.push(i.sources[0]), i => i.mode = 'unknown', i => i.attributed = {}, i => i.attributed.extra = {}, i => delete i.attributed[i.sources[0].path].s['1'], i => i.attributed[i.sources[0].path].f['1'] = -1, i => i.attributed[i.sources[0].path].b['0'] = [0], i => i.attributed[i.sources[0].path].fnMap['1'].name = 'changed']) {
    const { input } = fixture(); change(input); assert.throws(() => reportApplicability(input));
  }
  const { input, hits, disposition } = fixture(); hits.s['0'] = 0; hits.f['0'] = 0; hits.b['0'][0] = 0;
  input.dispositions = [...['0', '1', '2'].map(id => disposition('statement', id)), ...['0', '1'].map(id => disposition('function', id)), ...[0, 1].map(arm => disposition('branch', '0', arm))];
  assert.throws(() => reportApplicability(input), /Empty applicable/);
});


test('only the exact browser and development application strata are added to applicability',()=>{
 const {input}=fixture();
 assert.deepEqual(reportApplicability({...input,mode:'browser-presentation-owner-lifecycle'}).raw,reportApplicability(input).raw);
 assert.deepEqual(reportApplicability({...input,mode:'development'}).raw,reportApplicability(input).raw);
 for(const mode of ['browser','browser-presentation','development-extra','shared-input','browser-presentation-owner-lifecycle-extra'])assert.throws(()=>reportApplicability({...input,mode}),/Unknown mode/);
});
