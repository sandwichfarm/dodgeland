import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import ts from 'typescript';
import { loadSources } from './source-loader.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const guide = await readFile(join(root, 'docs/mode-rules.md'), 'utf8');
const examples = [...guide.matchAll(/<!-- executable-mode-example:start -->\s*```ts\n([\s\S]*?)\n```\s*<!-- executable-mode-example:end -->/g)];
assert.equal(examples.length, 1, 'the guide must contain one complete executable example');
const example = examples[0][1];
const sources = await loadSources(['game', 'mode-rules', 'market/catalog']);
after(() => sources.dispose());
await writeFile(join(sources.directory, 'mode-authoring-example.js'), ts.transpileModule(example, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText);
const { createEveningRun } = await sources.import('mode-authoring-example');

test('the exact documented example type-checks against public project exports', () => {
  const filename = join(root, 'src/__mode-authoring-example.ts');
  const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  assert.deepEqual(parsed.errors, []);
  const host = ts.createCompilerHost(parsed.options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) =>
    resolve(file) === filename
      ? ts.createSourceFile(filename, example, languageVersion, true)
      : originalGetSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([filename, join(root, 'src/env.d.ts')], parsed.options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file, getCurrentDirectory: () => root,
    getNewLine: () => '\n',
  }));
});

test('the documented factory drives real movement, clocks, pause, and lifecycle independently per run', () => {
  const { game, definition, events } = createEveningRun(7);
  const other = createEveningRun(7);
  assert.equal(game.definition, definition);
  assert.equal(game.maxHealth, 4);
  assert.equal(game.health, 4);
  assert.equal(game.move('forward'), true);
  assert.equal(game.hop, .2);
  assert.deepEqual(events, ['start', 'progress']);
  for (let i = 0; i < 24; i++) game.update(definition.rules.simulation.fixedStep);
  assert.ok(Math.abs(game.time - .3) < 1e-12, 'the documented 60Hz ticks use the .75 world clock');
  assert.equal(game.hop, 0);
  game.pause();
  const pausedTime = game.time;
  game.update(1);
  assert.equal(game.time, pausedTime);
  game.resume();
  game.end('Authoring example complete');
  assert.deepEqual(events, ['start', 'progress', 'pause', 'resume', 'terminal']);
  assert.deepEqual(other.events, [], 'separate factories do not share observer history');
  assert.equal(other.game.state, 'ready');
});

test('the public start transition emits once without moving and is shared by movement', () => {
  const { game, events } = createEveningRun(31);
  assert.deepEqual([game.x, game.y, game.maxY, game.hop], [0, 0, 0, 0]);
  assert.equal(game.start(), true);
  assert.deepEqual([game.x, game.y, game.maxY, game.hop], [0, 0, 0, 0], 'starting is not a hop');
  assert.equal(game.start(), false);
  assert.deepEqual(events, ['start'], 'repeated starts do not duplicate the lifecycle event');
  assert.equal(game.move('forward'), true);
  assert.deepEqual(events, ['start', 'progress'], 'movement after Play reuses the completed start transition without a duplicate start');
});

test('the documented economy changes actual invitations, hand capacity, and coin attraction', () => {
  const { game } = createEveningRun(52);
  game.state = 'playing';
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  assert.equal(game.run.cardCapacity, 4);
  game.run.advanceScore(19);
  assert.equal(game.run.market, null);
  game.run.advanceScore(20);
  assert.equal(game.run.market.remaining, 10);
  const coinLane = game.rows.get(0);
  coinLane.coin = .65;
  game.update(0);
  assert.ok(coinLane.coinPull, 'a coin outside manual capture moves under the documented base gravity');
  assert.equal(game.run.effects.coinRadius, .2);
  assert.equal(game.openMarket(), true);
  game.closeMarket();
  game.run.tick(9.9);
  assert.ok(game.run.market);
  game.run.tick(.1);
  assert.equal(game.run.market, null);
});

test('the documented pursuer thresholds and first-spawn time govern the real director', () => {
  const { game } = createEveningRun(19);
  const spawned = [];
  game.onMobSpawn = mob => spawned.push(mob.kind);
  game.state = 'playing';
  game.x = game.fromX = 0;
  game.y = game.fromY = game.maxY = 49;
  game.waveRow = -100;
  game.time = 12;
  game.ensureRows();
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  game.update(0);
  assert.deepEqual(spawned, [], 'score below the first documented threshold does not spawn');
  game.y = game.fromY = game.maxY = 50;
  game.ensureRows();
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  game.time = 11.99;
  game.update(0);
  assert.deepEqual(spawned, [], 'the documented first-spawn time still gates the unlocked species');
  game.time = 12;
  game.update(0);
  assert.deepEqual(spawned, ['slime']);
  assert.equal(game.mobs.length, 1);
});
