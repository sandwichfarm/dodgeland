import type { Game } from './game.js';

/** Automatic survival powers have their own meter, outside the run's card hand. */
export function createCharacterPowerUI() {
  const meter = document.getElementById('character-power')!;
  const icon = document.getElementById('character-power-icon')!;
  const name = document.getElementById('character-power-name')!;
  const status = document.getElementById('character-power-status')!;
  const fill = document.getElementById('character-power-fill')!;
  const descriptions = ['ready-power', 'pause-power'].map(id => document.getElementById(id)!);
  let displayed = '', flashing = false;

  return {
    update(game: Game, reducedMotion = false) {
      meter.classList.toggle('less-motion', reducedMotion);
      const power = game.power, remaining = Math.ceil(game.powerRemaining);
      const signature = `${game.characterId}:${power.id}:${remaining}:${game.powerReady}`;
      const nextFlash = game.powerFlash > 0;
      if (nextFlash !== flashing) { flashing = nextFlash; meter.classList.toggle('activated', flashing); }
      if (displayed === signature) return;
      displayed = signature;
      const state = game.powerReady ? 'Ready' : `${remaining} block${remaining === 1 ? '' : 's'}`;
      const explanation = `${power.name}: ${power.description} Automatic. Recharges after ${power.cooldown} new forward blocks; retracing steps does not recharge it.`;
      icon.textContent = power.icon;
      name.textContent = power.name;
      status.textContent = state;
      meter.classList.toggle('ready', game.powerReady);
      meter.setAttribute('aria-label', power.name);
      meter.setAttribute('aria-description', explanation);
      meter.setAttribute('aria-valuemax', String(power.cooldown));
      meter.setAttribute('aria-valuenow', String(power.cooldown - remaining));
      meter.setAttribute('aria-valuetext', game.powerReady ? 'Ready. Activates automatically to avert danger.' : `Recharging: ${remaining} new forward blocks remaining.`);
      meter.title = explanation;
      fill.style.width = `${(1 - remaining / power.cooldown) * 100}%`;
      for (const description of descriptions) {
        const title = document.createElement('strong'); title.textContent = `${power.icon} ${power.name} · ${state}`;
        const detail = document.createElement('span'); detail.textContent = `${power.description} Automatic · recharge after ${power.cooldown} new blocks.`;
        description.replaceChildren(title, detail);
        description.title = explanation;
      }
    },
  };
}
