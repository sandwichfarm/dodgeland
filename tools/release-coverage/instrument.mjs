// Test-only semantic instrumentation. Normal production output never imports this module.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { resolve, dirname, sep, relative } from 'node:path';
import { mkdir } from 'node:fs/promises';
import instrument from 'istanbul-lib-instrument';
import coverage from 'istanbul-lib-coverage';
import sourceMaps from 'istanbul-lib-source-maps';
import report from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import { capturePayload, mergePayloads } from './collector.mjs';
// Deliberate root dependency, independently pinned by the immutable root lock.
const requireRoot = createRequire(new URL('../../package.json', import.meta.url));
const ts = requireRoot('typescript');
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');

export function instrumentSources(sources, root) {
  const inventory = {};
  if (!sources || !Object.keys(sources).length) throw Error('Empty source inventory');
  root = resolve(root);
  for (const name of Object.keys(sources).sort()) {
    const path = resolve(root, name), source = sources[name];
    if(relative(root,path).startsWith('..') || !name.endsWith('.ts'))throw Error('Source outside root or unsupported extension');
    const transform = context => sourceFile => {
      const f=context.factory, imports=[];let index=0;
      function visit(node) {
        if(ts.isCallExpression(node)&&node.expression.getText(sourceFile)==='import.meta.glob') {
          const [pattern,options]=node.arguments;
          const pairs=options&&ts.isObjectLiteralExpression(options)?Object.fromEntries(options.properties.map(p=>[p.name?.getText(sourceFile),p.initializer?.getText(sourceFile)])):{};
          if(node.arguments.length!==2||!ts.isStringLiteral(pattern)||!/^\.\/[^*]*\/\*\.ts$/.test(pattern.text)||pairs.eager!=='true'||!['"default"',"'default'"].includes(pairs.import)||Object.keys(pairs).length!==2)throw Error('Unsupported glob');
          const folder=pattern.text.slice(0,-4),absolute=resolve(dirname(path),folder);
          const matches=Object.keys(sources).filter(key=>dirname(resolve(root,key))===absolute).sort();
          if(!matches.length)throw Error('Empty glob inventory');
          const entries=matches.map(key=>{
            const specifier='./'+relative(dirname(path),resolve(root,key)).split(sep).join('/');
            const symbol=f.createIdentifier('__coverageGlob'+index++);
            imports.push(f.createImportDeclaration(undefined,f.createImportClause(false,symbol,undefined),f.createStringLiteral(specifier.replace(/\.ts$/,'.js')),undefined));
            return f.createPropertyAssignment(f.createStringLiteral(specifier),symbol);
          });
          return ts.setOriginalNode(ts.setTextRange(f.createObjectLiteralExpression(entries,false),node),node);
        }
        return ts.visitEachChild(node,visit,context);
      }
      const statements=ts.visitNodes(sourceFile.statements,visit);
      return f.updateSourceFile(sourceFile,f.createNodeArray([...statements,...imports]));
    };
    const emitted = ts.transpileModule(source, { fileName: path, compilerOptions: {
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
      sourceMap: true, inlineSources: true, sourceRoot: dirname(path) + sep,
    }, transformers: { before: [transform] } });
    const map = JSON.parse(emitted.sourceMapText);
    const tool = instrument.createInstrumenter({ esModules: true, compact: false, produceSourceMap: true });
    const code = tool.instrumentSync(emitted.outputText.replace(/\/\/# sourceMappingURL=.*$/m, ''), path, map);
    const zero = structuredClone(tool.lastFileCoverage());
    inventory[name] = { path, code, zero, source, sourceHash: hash(source), mapHash: hash(map), map };
  }
  return inventory;
}

export async function reportCoverage(inventory, payloads, directory) {
  const records = payloads.map((payload,index)=>capturePayload(inventory,payload,{runId:'report',realmId:String(index)}));
  const map=coverage.createCoverageMap(mergePayloads(inventory,records,{runId:'report',expectedRealms:records.map(row=>row.realmId)}));
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
