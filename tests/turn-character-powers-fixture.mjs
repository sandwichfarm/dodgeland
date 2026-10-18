import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';
import { turnReuseAttribution } from './turn-reuse-attribution.mjs';

export async function registerTurnCharacterPowerTests(selectedMode) {
const sources = await loadSources(['game', 'relay', 'race']);
after(() => sources.dispose());
const { Game } = await sources.import('game');
const relayModule = await sources.import('relay'), raceModule = await sources.import('race');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const configurations = [
  { mode: 'relay', factory: relayModule.createRelaySession, Coordinator: relayModule.RelayCoordinator },
  { mode: 'race', factory: raceModule.createRaceSession, Coordinator: raceModule.RaceCoordinator },
];
// Each separate worker selects one real mode for independently verified attribution.
const modes = selectedMode ? configurations.filter(c => c.mode === selectedMode) : configurations;
assert.ok(modes.length > 0, 'Known turn power mode');
const scenarios = [
  { character: 'butter', other: 'pip', kind: 'river', power: 'water-bounce', cause: 'water' },
  { character: 'sunny', other: 'butter', kind: 'road', power: 'chicken-out', cause: 'traffic' },
  { character: 'beep', other: 'butter', kind: 'rail', power: 'emergency-reboot', cause: 'train' },
];
const tick = session => session.update(1 / 120);
for (const { mode, factory, Coordinator } of modes) {
  const reuse = await turnReuseAttribution({ mode, factory, Coordinator, authority, lifetimes: 6 });
  after(() => reuse.finish());
  for (const base of ['arcade', 'stroll']) for (const scenario of scenarios) {
    test(`${mode}/${base}/${scenario.character}: real ${scenario.kind} contact rescues only its owner and the cooldown prevents a second escape`, () => {
      const game = new Game(113, 'pond', base, false, [], scenario.character);
      // Only terrain and hazard geometry are fixtures. Pose, health, score,
      // charge, simulation clock and collision/power callbacks remain real.
      for (const lane of game.rows.values()) Object.assign(lane, {
        kind: 'meadow', blocked: [], decorations: [], coin: null, actors: undefined,
        speed: 0, phase: 0, spacing: 100, length: 1, variant: 0,
      });
      const witness = reuse.lifetime();
      const owner = witness.acquire(game, { seats: [
        { seat: 'p1', characterId: scenario.character, device: 'keyboard-a' },
        { seat: 'p2', characterId: scenario.other, device: 'keyboard-b' },
      ], ...(mode === 'relay' ? { tilesPerLeg: 50 } : {}) });
      const session = owner.session, p = session.players[0], other = session.players[1];
      const otherBefore = () => ({ health: other.health, wallet: other.run.wallet, score: other.personalScore,
        deaths: other.statistics.deaths, innate: other.statistics.innateUses, charge: other.recovery.charge });
      const before = otherBefore(), health = p.health;
      Object.assign(game.rows.get(1), { kind: scenario.kind,
        // Approaching front traffic, an unsupported river, or recurring
        // trains invoke the real contact resolver after a dispatched hop.
        phase: scenario.kind === 'road' ? 6 : 0, speed: scenario.kind === 'road' ? -4 : 1, length: scenario.kind === 'river' ? .05 : 2,
        spacing: 12, period: 2, warning: 0 });
      if (scenario.kind === 'river') Object.assign(game.rows.get(1), { phase: 50, speed: 0 });
      witness.interval('matching-hazard-rescue-and-cooldown', () => {
        assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
        for (let i = 0; i < 600 && p.statistics.innateUses === 0 && p.state !== 'dead'; i++) tick(session);
        assert.equal(p.statistics.innateUses, 1, 'matching collision uses the innate rescue');
        assert.equal(p.state, 'playing'); assert.equal(p.statistics.deaths, 0);
        assert.equal(p.health, health); assert.equal(p.run.wallet, 0);
        assert.ok(p.powerRemaining > 0 && p.powerRemaining <= 100);
        assert.deepEqual(otherBefore(), before);
        for (let i = 0; i < 120; i++) tick(session);
        assert.equal(p.state, 'playing'); assert.equal(p.hop, 0);
        assert.equal(game.rows.get(p.y).kind, 'meadow', 'the real rescue lands on retained safe land');
        assert.equal(p.statistics.innateUses, 1);
        assert.ok(p.personalScore <= 1, 'rescue movement does not grant skipped-row score');
        // Approach the same hazard again from the chosen safe bank
        // through dispatch; the spent ability cannot silently refill.
        assert.ok(p.y === 0 || p.y === 2);
        assert.equal(session.dispatch({ seat: 'p1', direction: p.y === 0 ? 'forward' : 'back' }), true);
        for (let i = 0; i < 1200 && p.state !== 'dead'; i++) tick(session);
        assert.equal(p.state, 'dead'); assert.equal(p.deathCause, scenario.cause);
        assert.equal(p.statistics.innateUses, 1); assert.equal(p.statistics.deaths, 1);
        assert.ok(p.recovery.offer, 'the independent personal revival is offered after actual death');
        assert.equal(p.recovery.charge, 'available');
        assert.deepEqual(otherBefore(), before);
      });
      witness.finish();
    });
  }
}
}
