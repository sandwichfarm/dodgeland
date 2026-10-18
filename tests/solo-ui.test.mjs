import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['solo-ui', 'mode-rules']);
after(() => sources.dispose());
const { healthMeterPresentation, readyPursuitCopy } = await sources.import('solo-ui');
const { composeModeDefinition, SOLO_ARCADE_MODE, SOLO_STROLL_MODE } = await sources.import('mode-rules');

test('the legacy three-feather policy preserves its compact presentation exactly', () => {
  const meter = healthMeterPresentation(SOLO_ARCADE_MODE.rules.health);
  assert.equal(meter.ariaMaximum, '3');
  assert.equal(meter.featherCount, 3);
  assert.equal(meter.columns, 3);
  assert.equal(meter.featherSize, 16);
  assert.equal(meter.title, 'Pluck: rear bumps cost 1 feather; side hits cost 2. Recover half a feather every 100 hops.');
  assert.equal(meter.markup.match(/class="pluck-feather"/g)?.length, 3);
});

test('health presentation follows permitted fractional and maximum capacities', () => {
  const four = healthMeterPresentation(composeModeDefinition({ health: { maxHealth: 4 } }).rules.health);
  assert.deepEqual({ maximum: four.ariaMaximum, feathers: four.featherCount, columns: four.columns, size: four.featherSize }, { maximum: '4', feathers: 4, columns: 4, size: 16 });
  assert.match(four.title, /4 feathers maximum/);

  const fractional = healthMeterPresentation(composeModeDefinition({ health: { maxHealth: 2.5, frontDamage: 2.5 } }).rules.health);
  assert.deepEqual({ maximum: fractional.ariaMaximum, feathers: fractional.featherCount }, { maximum: '2.5', feathers: 3 });

  const ten = healthMeterPresentation(composeModeDefinition({ health: { maxHealth: 10 } }).rules.health);
  assert.deepEqual({ maximum: ten.ariaMaximum, feathers: ten.featherCount, columns: ten.columns, size: ten.featherSize }, { maximum: '10', feathers: 10, columns: 5, size: 12 });
  assert.equal(ten.markup.match(/class="pluck-feather"/g)?.length, 10, 'the compact five-column grid keeps capacity ten visible in two rows');
});

test('ready guidance combines wave visibility and pursuer policy independently', () => {
  const arcade = SOLO_ARCADE_MODE.rules;
  const stroll = SOLO_STROLL_MODE.rules;
  assert.equal(readyPursuitCopy(arcade.presentation, arcade.pursuers), 'Outrun the wave. Pursuers appear from 160 hops.');
  assert.equal(readyPursuitCopy(stroll.presentation, stroll.pursuers), 'No wave or chasing mobs. Explore at your own pace.');

  const waveOnly = composeModeDefinition({ pursuers: { enabled: false } }).rules;
  assert.equal(readyPursuitCopy(waveOnly.presentation, waveOnly.pursuers), 'Outrun the wave. No pursuers in this run.');

  const pursuersOnly = composeModeDefinition({ pursuit: { strategy: 'trail' }, presentation: { pursuitVisible: false } }).rules;
  assert.equal(readyPursuitCopy(pursuersOnly.presentation, pursuersOnly.pursuers), 'Pursuers appear from 160 hops. Explore at your own pace.');
});
