// Test-only TypeScript loader: follow local imports instead of maintaining a
// second dependency registry in every fixture. Production discovery is Vite's.
import { readFile, readdir, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, dirname, relative, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export async function compileSources(entries = 'game', options = {}) {
  const sourceDirectory = options.sourceDirectory ?? new URL('../src/', import.meta.url);
  const root = sourceDirectory instanceof URL ? fileURLToPath(sourceDirectory) : resolve(sourceDirectory);
  const modules = new Map();
  async function compile(name) {
    name = name.replace(/\.js$/, '');
    const key = `/${name}.js`;
    if (modules.has(key)) return;
    const source = await readFile(resolve(root, `${name}.ts`), 'utf8');
    let output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    // The catalog uses one simple eager default glob. Expand its actual files
    // for Node tests; unsupported glob options fail instead of silently mocking.
    const glob = /import\.meta\.glob\(\s*(['"])(\.\/?[^'"]*\/\*\.ts)\1\s*,\s*\{([^}]+)\}\s*\)/g;
    let prelude = '', index = 0;
    for (const match of [...output.matchAll(glob)]) {
      if (!/eager\s*:\s*true/.test(match[3]) || !/import\s*:\s*['"]default['"]/.test(match[3])) throw new Error('Test glob requires eager default imports');
      const folder = match[2].slice(0, -'*.ts'.length);
      const files = (await readdir(resolve(root, dirname(name), folder))).filter(file => file.endsWith('.ts')).sort();
      const members = [];
      for (const file of files) {
        const symbol = `__discovered_${index++}`, path = folder + file;
        prelude += `import ${symbol} from ${JSON.stringify(path.replace(/\.ts$/, '.js'))};\n`;
        members.push(`${JSON.stringify(path)}: ${symbol}`);
      }
      output = output.replace(match[0], `{${members.join(',')}}`);
    }
    output = prelude + output;
    if (output.includes('import.meta.glob')) throw new Error(`Unsupported discovery expression in ${name}`);
    modules.set(key, output);
    for (const [, dependency] of output.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+\.js)['"]/g)) {
      await compile(relative(root, resolve(root, dirname(name), dependency)).replace(/\.js$/, ''));
    }
  }
  for (const entry of Array.isArray(entries) ? entries : [entries]) await compile(entry);
  return modules;
}

export async function loadSources(entries = 'game', sourceDirectory) {
  const modules = await compileSources(entries, { sourceDirectory });
  const directory = await mkdtemp(join(tmpdir(), 'down-to-duck-modules-'));
  await writeFile(join(directory, 'package.json'), '{"type":"module"}');
  for (const [name, output] of modules) {
    const target = join(directory, name.slice(1));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, output);
  }
  return {
    directory, modules,
    import: name => import(pathToFileURL(join(directory, `${name.replace(/\.js$/, '')}.js`)).href),
    dispose: () => rm(directory, { recursive: true, force: true }),
  };
}
