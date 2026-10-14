import { isDeepStrictEqual } from 'node:util';
import { loadSources } from './source-loader.mjs';
import { extractPinnedBaseline, PINNED_BASELINE_SHA } from './solo-baseline.mjs';

function scalar(value) {
  if (typeof value === 'number' && Number.isNaN(value)) return '[[NaN]]';
  if (value === Infinity) return '[[Infinity]]';
  if (value === -Infinity) return '[[-Infinity]]';
  return value;
}

/** Preserve Map/Set insertion order because both can influence future simulation. */
export function semanticValue(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return scalar(value);
  if (seen.has(value)) return '[[cycle]]';
  seen.add(value);
  if (value instanceof Map) return { map: [...value].map(([key, member]) => [semanticValue(key, seen), semanticValue(member, seen)]) };
  if (value instanceof Set) return { set: [...value].map(member => semanticValue(member, seen)) };
  if (Array.isArray(value)) return value.map(member => semanticValue(member, seen));
  const result = {};
  for (const key of Object.keys(value).sort()) if (typeof value[key] !== 'function') result[key] = semanticValue(value[key], seen);
  return result;
}

const mobTracks = new WeakMap();
function ensureMobRngTrack(game) {
  const director = game.mobDirector;
  if (!director) return { seed: (game.seed ^ 0x76ab41c3) >>> 0, draws: 0 };
  let track = mobTracks.get(director);
  if (!track) {
    const original = director.rng;
    track = { seed: (game.seed ^ 0x76ab41c3) >>> 0, draws: 0 };
    // MobDirector's constructor does not draw. This test-only replacement is
    // installed before its first update/spawn and never changes production code.
    director.rng = () => { track.draws += 1; return original(); };
    mobTracks.set(director, track);
  }
  return track;
}

function laneSnapshot(game, gameModule) {
  return [...game.rows.entries()].map(([row, lane], order) => ({ row, order, lane: semanticValue({
    index: lane.index, kind: lane.kind, world: lane.world?.id, speed: lane.speed,
    spacing: lane.spacing, length: lane.length, phase: lane.phase, variant: lane.variant,
    blocked: lane.blocked, decorations: lane.decorations, coin: lane.coin,
    coinDenomination: lane.coinDenomination, period: lane.period, warning: lane.warning,
    direction: lane.direction, coinActor: lane.coinActor, coinPull: lane.coinPull,
    actors: lane.actors, actorSamples: gameModule.laneActors(lane, game.time),
  }) }));
}

function inventorySnapshot(run) {
  return semanticValue({
    visible: { wallet: run.wallet, cards: run.cards, powers: run.powers, cosmetics: run.cosmetics,
      effects: run.effects, offers: run.offers, invitation: run.invitation, isOpen: run.isOpen,
      pendingPack: run.pendingPack, revision: run.revision, cardCapacity: run.cardCapacity,
      equippedCosmetics: run.equippedCosmetics },
    future: { state: run.state, fraction: run.fraction, maxScore: run.maxScore,
      sequence: run.sequence, equipped: run.equipped, catalog: run.catalog },
  });
}

export function snapshotGame(game, gameModule) {
  const rng = ensureMobRngTrack(game), director = game.mobDirector;
  return semanticValue({
    state: game.state, seed: game.seed, seedCode: game.seedCode, runSeed: game.runSeed,
    home: game.home, mode: game.mode, gentle: game.gentle, characterId: game.characterId,
    x: game.x, y: game.y, fromX: game.fromX, fromY: game.fromY, groundX: game.groundX,
    groundY: game.groundY, hop: game.hop, maxY: game.maxY, time: game.time, idle: game.idle,
    coins: game.coins, waveRow: game.waveRow, caughtByWave: game.caughtByWave,
    health: game.health, maxHealth: game.maxHealth, hurtRemaining: game.hurtRemaining,
    deathCause: game.deathCause, reason: game.reason, power: game.power,
    powerRemaining: game.powerRemaining, powerReady: game.powerReady, powerFlash: game.powerFlash,
    powerAvoidsMobs: game.powerAvoidsMobs, powerRescue: game.powerRescue, warning: game.warning,
    waveGap: game.waveGap, waveSeconds: game.waveSeconds, deathSpill: game.deathSpill,
    rows: laneSnapshot(game, gameModule),
    // Pulled rewards can outlive their source terrain. Keep their complete
    // lane/coin state even after pruning removes them from `rows`.
    attractedCoins: [...game.attractedCoins.entries()].map(([row, lane], order) => ({ row, order,
      retained: semanticValue({ index: lane.index, kind: lane.kind, coin: lane.coin,
        coinDenomination: lane.coinDenomination, coinActor: lane.coinActor, coinPull: lane.coinPull,
        actors: lane.actors, actorSamples: gameModule.laneActors(lane, game.time) }),
    })),
    gameFuture: {
      powerReadyAt: game.powerReadyAt, powerNotice: game.powerNotice,
      powerLandingGrace: game.powerLandingGrace, healedMilestone: game.healedMilestone,
      touchingCars: [...(game.touchingCars ?? [])],
      laneSpeeds: [...game.rows.entries()].map(([row, lane], order) => ({ row, order, index: lane.index,
        speed: semanticValue(game.laneSpeeds?.get(lane)) })),
    },
    inventory: inventorySnapshot(game.run),
    mobs: { rngSeed: rng.seed, rngDrawPosition: rng.draws, nextId: director?.nextId,
      nextSpawn: director?.nextSpawn, lastSpawnScore: director?.lastSpawnScore,
      retryAt: director?.retryAt, spawnDelay: director?.spawnDelay,
      modifierRetryAt: director?.modifierRetryAt, introduced: director?.introduced,
      actors: director?.mobs },
  });
}

function callbackState(game) {
  return semanticValue({ state: game.state, x: game.x, y: game.y, maxY: game.maxY,
    health: game.health, time: game.time, wallet: game.run.wallet, revision: game.run.revision,
    deathCause: game.deathCause });
}

export function attachCallbackRecorder(game) {
  const callbacks = [];
  const record = (name, payload) => callbacks.push({ name, payload: semanticValue(payload), at: callbackState(game) });
  game.onCoin = amount => record('onCoin', { amount });
  game.onHurt = event => record('onHurt', event);
  game.onHeal = amount => record('onHeal', { amount });
  game.onPower = event => record('onPower', event);
  game.onMobSpawn = mob => record('onMobSpawn', mob);
  game.onMobAttack = mob => record('onMobAttack', mob);
  game.onEnd = () => record('onEnd', { state: game.state, inventoryCleared: {
    wallet: game.run.wallet, cards: game.run.cards, powers: game.run.powers, cosmetics: game.run.cosmetics,
  } });
  return callbacks;
}

function firstMismatch(left, right, path = 'trace') {
  if (isDeepStrictEqual(left, right)) return undefined;
  if (Array.isArray(left) && Array.isArray(right)) {
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      const mismatch = firstMismatch(left[index], right[index], `${path}[${index}]`);
      if (mismatch) return mismatch;
    }
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
      const mismatch = firstMismatch(left[key], right[key], `${path}.${key}`);
      if (mismatch) return mismatch;
    }
  }
  return { path, baseline: left, current: right };
}

export function compareTracePoint({ scenario, command, step, baseline, current }) {
  const mismatch = firstMismatch(baseline, current);
  if (!mismatch) return;
  throw new Error(`${scenario}: mismatch at command ${command}, fixed step ${step}, ${mismatch.path}; baseline=${JSON.stringify(mismatch.baseline)} current=${JSON.stringify(mismatch.current)}`);
}

async function loadIndependentEngines() {
  await using baseline = await extractPinnedBaseline();
  const [baselineModules, currentModules] = await Promise.all([loadSources('game', baseline.sourceDirectory), loadSources('game')]);
  try {
    if (baselineModules.directory === currentModules.directory) throw new Error('Parity refuses a shared compiled module directory.');
    const [baselineGame, currentGame] = await Promise.all([baselineModules.import('game'), currentModules.import('game')]);
    if (baselineGame.Game === currentGame.Game) throw new Error('Parity refuses identical Game constructors.');
    return { baselineModules, currentModules, baselineGame, currentGame };
  } catch (error) {
    await Promise.all([baselineModules.dispose(), currentModules.dispose()]);
    throw error;
  }
}

function invoke(game, command, fixedStep) {
  if (command.kind === 'move') return game.move(command.direction);
  if (command.kind === 'call') return (command.target === 'run' ? game.run : game)[command.method](...(command.args ?? []));
  if (command.kind === 'step') return game.update(fixedStep);
  throw new Error(`Unsupported solo parity command: ${command.kind}`);
}

/** Runs one tape through independently compiled pinned and working engines. */
async function runLoadedScenario(loaded, { name, seed, home = 'pond', mode = 'arcade', gentle = false, characterId,
  definitions = [], tape, fixedStep = 1 / 120, perturbCurrent, setup }) {
  const { baselineGame, currentGame } = loaded;
  const baseline = new baselineGame.Game(seed, home, mode, gentle, definitions, characterId);
  const current = new currentGame.Game(seed, home, mode, gentle, definitions, characterId);
  ensureMobRngTrack(baseline);
  ensureMobRngTrack(current);
  if (setup) { setup(baseline, baselineGame); setup(current, currentGame); }
  const baselineCallbacks = attachCallbackRecorder(baseline), currentCallbacks = attachCallbackRecorder(current);
  let points = 0, last;
  const results = [];
  const compare = (command, step, baselineResult, currentResult) => {
    if (perturbCurrent && perturbCurrent.command === command && perturbCurrent.step === step) {
      currentCallbacks.push({ name: perturbCurrent.callback, payload: { injected: true }, at: callbackState(current) });
    }
    const baselineTrace = { result: semanticValue(baselineResult), game: snapshotGame(baseline, baselineGame), callbacks: baselineCallbacks };
    const currentTrace = { result: semanticValue(currentResult), game: snapshotGame(current, currentGame), callbacks: currentCallbacks };
    compareTracePoint({ scenario: name, command, step, baseline: baselineTrace, current: currentTrace });
    last = currentTrace;
    results.push({ command, step, result: currentTrace.result });
    points += 1;
  };
  compare(-1, 0, undefined, undefined);
  for (let commandIndex = 0; commandIndex < tape.length; commandIndex += 1) {
    const command = tape[commandIndex], repetitions = command.kind === 'step' ? command.count : 1;
    for (let step = 0; step < repetitions; step += 1) {
      compare(commandIndex, step, invoke(baseline, command, fixedStep), invoke(current, command, fixedStep));
    }
  }
  return { baselineSha: PINNED_BASELINE_SHA, points, final: last, results };
}

export async function runDifferentialScenario(options) {
  const loaded = await loadIndependentEngines();
  try {
    return await runLoadedScenario(loaded, options);
  } finally {
    await Promise.all([loaded.baselineModules.dispose(), loaded.currentModules.dispose()]);
  }
}

/** Load once, then run a bounded matrix while retaining independent constructors. */
export async function runDifferentialMatrix(scenarios) {
  const loaded = await loadIndependentEngines();
  try {
    return await Promise.all(scenarios.map(scenario => runLoadedScenario(loaded, scenario)));
  } finally {
    await Promise.all([loaded.baselineModules.dispose(), loaded.currentModules.dispose()]);
  }
}
