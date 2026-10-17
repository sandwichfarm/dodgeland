import { createHash } from 'node:crypto';

const modes = new Set(['solo-arcade', 'solo-flow', 'survive-arcade', 'survive-flow', 'relay', 'race', 'browser-presentation-owner-lifecycle']);
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const sameKeys = (a, b) => JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort());
const metric = counts => ({ covered: counts.filter(n => n > 0).length, total: counts.length });

/** Bind dispositions to the exact source, source map and source-mapped site schema. */
export function applicabilityIdentity(source) {
  const c = source?.coverage;
  if (!nonempty(source?.path) || !nonempty(source?.source) || !source.map || typeof source.map !== 'object' || !c || c.path !== source.path) throw Error('Invalid source identity');
  return { sourceHash: hash(source.source), mapHash: hash(source.map), schemaHash: hash([c.path, c.statementMap, c.fnMap, c.branchMap]) };
}

/** Pure projection of already-attributed counters. Never infers mode ownership or changes raw maps. */
export function reportApplicability({ mode, sources, attributed, dispositions = [] }) {
  if (!modes.has(mode)) throw Error('Unknown mode');
  if (!Array.isArray(sources) || !sources.length || !Array.isArray(dispositions) || !attributed || typeof attributed !== 'object') throw Error('Empty applicability input');
  const inventory = new Map(), sites = new Map();
  for (const source of sources) {
    const identity = applicabilityIdentity(source), c = source.coverage, hits = attributed[source.path];
    if (inventory.has(source.path)) throw Error('Duplicate source');
    if (!hits || hits.path !== source.path) throw Error('Missing attributed source');
    for (const key of ['statementMap', 'fnMap', 'branchMap']) if (JSON.stringify(c[key]) !== JSON.stringify(hits[key])) throw Error('Attributed schema mismatch');
    const fileSites = [];
    const add = (kind, id, arm, count, line) => {
      if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid counter');
      if (kind === 'statement' && (!Number.isSafeInteger(line) || line < 1)) throw Error('Invalid statement line');
      const key = JSON.stringify([source.path, kind, id, arm ?? null]);
      const site = { path: source.path, kind, id, ...(arm === undefined ? {} : { arm }), count, line, key };
      sites.set(key, site); fileSites.push(site);
    };
    for (const [mapKey, counterKey, kind] of [['statementMap', 's', 'statement'], ['fnMap', 'f', 'function'], ['branchMap', 'b', 'branch']]) {
      if (!c[mapKey] || !hits[counterKey] || !sameKeys(c[mapKey], hits[counterKey])) throw Error('Unknown or missing counter site');
      for (const [id, span] of Object.entries(c[mapKey])) {
        if (kind === 'branch') {
          const counts = hits.b[id];
          if (!Array.isArray(span.locations) || !span.locations.length || !Array.isArray(counts) || counts.length !== span.locations.length) throw Error('Invalid branch arms');
          counts.forEach((n, arm) => add(kind, id, arm, n));
        } else add(kind, id, undefined, hits[counterKey][id], kind === 'statement' ? span.start?.line : undefined);
      }
    }
    inventory.set(source.path, { identity, sites: fileSites });
  }
  if (!sameKeys(Object.fromEntries(inventory), attributed)) throw Error('Unknown attributed source');
  if (!sites.size) throw Error('Empty executable inventory');
  const excluded = new Set();
  for (const d of dispositions) {
    if (d.mode !== mode || !nonempty(d.callReason) || !nonempty(d.stateReason) || !nonempty(d.authority)) throw Error('Missing mode or positive applicability reason');
    const row = inventory.get(d.path);
    if (!row || Object.entries(row.identity).some(([k, v]) => d[k] !== v)) throw Error('Unknown source or stale disposition');
    if (typeof d.id !== 'string' || (d.kind === 'branch' ? !Number.isSafeInteger(d.arm) || d.arm < 0 : d.arm !== undefined)) throw Error('Invalid disposition site');
    const key = JSON.stringify([d.path, d.kind, d.id, d.arm ?? null]);
    if (!sites.has(key)) throw Error('Unknown disposition site');
    if (excluded.has(key)) throw Error('Duplicate disposition');
    if (sites.get(key).count > 0) throw Error('Exclusion contradicted by attributed hits');
    excluded.add(key);
  }
  const summarize = selected => {
    const lines = new Map();
    for (const s of selected.filter(s => s.kind === 'statement')) {
      const key = JSON.stringify([s.path, s.line]); lines.set(key, Math.max(lines.get(key) ?? 0, s.count));
    }
    return { lines: metric([...lines.values()]), statements: metric(selected.filter(s => s.kind === 'statement').map(s => s.count)), functions: metric(selected.filter(s => s.kind === 'function').map(s => s.count)), branches: metric(selected.filter(s => s.kind === 'branch').map(s => s.count)) };
  };
  const all = [...sites.values()], applicable = all.filter(s => !excluded.has(s.key));
  if (!applicable.length || !applicable.some(s => s.kind === 'statement' || s.kind === 'function')) throw Error('Empty applicable executable inventory');
  const files = Object.fromEntries([...inventory].map(([path, row]) => [path, { ...row.identity, raw: summarize(row.sites), applicable: summarize(row.sites.filter(s => !excluded.has(s.key))) }]));
  return { mode, basis: 'caller-supplied attributed counters; applicability does not establish attribution', raw: summarize(all), applicable: summarize(applicable), files, dispositions: structuredClone(dispositions) };
}
