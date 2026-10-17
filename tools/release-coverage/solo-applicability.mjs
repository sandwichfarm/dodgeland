import { createRequire } from 'node:module';
import { applicabilityIdentity } from './applicability.mjs';

const ts = createRequire(new URL('../../package.json', import.meta.url))('typescript');
const reviewed = Object.freeze({
  'src/session.ts': { hash: '5b9363b3d26641705d3a85d0e56fae0df9aed49ce1276f25fad918c1562887ed', owner: 'LocalSession', helpers: [] },
  'src/co-op-market.ts': { hash: '037a96c9f9436346f06306cac74808aab5e92e205ce2c42bebb1dbd16ca24c22', owner: 'CoOpMarketAdapter', helpers: ['actionId', 'isMarketWindowOpen', 'canBuyOrEquip'] },
});
const authority = '.planning/phases/07-release-evidence-pr/07-03-MODE-SCOPE-FINDING.md';
const before = (a, b) => a.line < b.line || a.line === b.line && a.column <= b.column;
const contains = (outer, inner) => inner?.start && inner?.end && before(outer.start, inner.start) && before(inner.end, outer.end);

/** Reviewed stable-solo applicability only; this does not establish interval provenance. */
export function soloApplicabilityDispositions({ mode, sources }) {
  if (!['solo-arcade', 'solo-flow'].includes(mode)) throw Error('Stable solo mode required');
  if (!Array.isArray(sources)) throw Error('Source inventory required');
  const dispositions = [], seen = new Set();
  for (const source of sources) {
    const path = source.path.replaceAll('\\', '/');
    const key = Object.keys(reviewed).find(key => path === key || path.endsWith('/' + key));
    if (!key) continue;
    if (seen.has(key)) throw Error('Duplicate reviewed source');
    seen.add(key);
    const rule = reviewed[key], identity = applicabilityIdentity(source);
    if (identity.sourceHash !== rule.hash) throw Error('Reviewed solo source changed: ' + key);
    const tree = ts.createSourceFile(key, source.source, ts.ScriptTarget.Latest, true);
    if (tree.parseDiagnostics.length) throw Error('Invalid reviewed source');
    const point = offset => { const p = tree.getLineAndCharacterOfPosition(offset); return { line: p.line + 1, column: p.character }; };
    const span = node => ({ start: point(node.getStart(tree)), end: point(node.end) });
    const ranges = [], functionRanges = [];
    const owner = tree.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === rule.owner);
    if (!owner) throw Error('Reviewed class absent');
    for (const member of owner.members) {
      if (member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) continue;
      // Instance field initializers execute only upon construction. Type-only fields have no sites.
      if (member.body || member.initializer) ranges.push(span(member));
    }
    for (const helper of rule.helpers) {
      const declaration = tree.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(d => d.name.getText(tree) === helper);
      if (!declaration?.initializer || !ts.isArrowFunction(declaration.initializer)) throw Error('Reviewed helper absent');
      // Leave its module-level function-value initialization applicable; only calls are session-only.
      ranges.push(span(declaration.initializer.body));
      functionRanges.push(span(declaration.initializer));
    }
    const eligible = site => ranges.some(range => contains(range, site));
    const add = (kind, id, arm) => dispositions.push({ mode, path: source.path, ...identity, kind, id,
      ...(arm === undefined ? {} : { arm }),
      callReason: `${rule.owner} instance execution${rule.helpers.length ? ' and its private call-only helper bodies' : ''} requires LocalSession construction/attachment; solo Game constructs SharedWorld and primary SessionPlayer only.`,
      stateReason: 'Stable solo interval requires independently observed absence of session ownership AND Local Play staging/transition; no acquisition or mixed-mode counters are credited here.',
      authority });
    for (const [id, site] of Object.entries(source.coverage.statementMap)) if (eligible(site)) add('statement', id);
    for (const [id, site] of Object.entries(source.coverage.fnMap)) if ([...ranges, ...functionRanges].some(range => contains(range, site.loc) && contains(range, site.decl))) add('function', id);
    for (const [id, site] of Object.entries(source.coverage.branchMap)) for (const [arm, location] of site.locations.entries()) if (eligible(location)) add('branch', id, arm);
  }
  if (seen.size !== Object.keys(reviewed).length) throw Error('Missing reviewed solo source');
  return dispositions;
}
