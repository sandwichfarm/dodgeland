import type { HealthRules, PresentationRules, PursuerRules } from './mode-rules.js';

const featherPath = 'M6 20C-1 12 4 2 19 2C20 13 15 20 6 20Z';

export interface HealthMeterPresentation {
  readonly ariaMaximum: string;
  readonly featherCount: number;
  readonly columns: number;
  readonly featherSize: number;
  readonly title: string;
  readonly markup: string;
}

function featherPhrase(amount: number): string {
  return `${amount} feather${amount === 1 ? '' : 's'}`;
}

/** Derive the compact meter's capacity, wording, and silhouettes from live rules. */
export function healthMeterPresentation(health: HealthRules): HealthMeterPresentation {
  const featherCount = Math.ceil(health.maxHealth);
  const columns = health.maxHealth === 3 ? 3 : Math.min(5, featherCount);
  const featherSize = health.maxHealth > 5 ? 12 : 16;
  const legacyRules = health.maxHealth === 3 && health.rearDamage === 1 && health.sideDamage === 2 && health.regenerationAmount === .5 && health.regenerationInterval === 100;
  const title = legacyRules
    ? 'Pluck: rear bumps cost 1 feather; side hits cost 2. Recover half a feather every 100 hops.'
    : `Pluck: ${featherPhrase(health.maxHealth)} maximum; rear bumps cost ${featherPhrase(health.rearDamage)}; side hits cost ${featherPhrase(health.sideDamage)}. Recover ${featherPhrase(health.regenerationAmount)} every ${health.regenerationInterval} hops.`;
  const markup = Array.from({ length: featherCount }, (_, index) => `<svg class="pluck-feather" viewBox="0 0 22 26"><defs><clipPath id="feather-${index}"><rect width="22" height="26" /></clipPath></defs><path class="feather-empty" d="${featherPath}"/><path class="feather-fill" clip-path="url(#feather-${index})" d="${featherPath}"/><path class="feather-outline" d="${featherPath}M3 24L14 8"/></svg>`).join('');
  return { ariaMaximum: String(health.maxHealth), featherCount, columns, featherSize, title, markup };
}

/** Install the production Pluck meter for one game's composed health rules. */
export function installHealthMeter(meter: HTMLElement, feathers: HTMLElement, health: HealthRules): SVGRectElement[] {
  const presentation = healthMeterPresentation(health);
  meter.setAttribute('aria-valuemax', presentation.ariaMaximum);
  meter.title = presentation.title;
  meter.style.setProperty('--pluck-feather-columns', String(presentation.columns));
  meter.style.setProperty('--pluck-feather-size', `${presentation.featherSize}px`);
  feathers.innerHTML = presentation.markup;
  return [...feathers.querySelectorAll<SVGRectElement>('clipPath rect')];
}

/** Apply live health to the installed meter without changing its capacity markup. */
export function updateHealthMeter(meter: HTMLElement, value: HTMLElement, clips: readonly SVGRectElement[], health: number, maxHealth: number, format: (health: number) => string): void {
  meter.classList.toggle('low', health <= 1);
  const rounded = Math.round(health * 100) / 100;
  meter.setAttribute('aria-valuenow', String(rounded));
  meter.setAttribute('aria-valuetext', `${rounded} of ${maxHealth} feathers`);
  value.textContent = format(health);
  clips.forEach((clip, index) => clip.setAttribute('width', String(Math.max(0, Math.min(1, health - index)) * 22)));
}

/** The warning meter shares the composed pursuit threshold instead of assuming five seconds. */
export function updateChaseMeter(meter: HTMLElement, fill: HTMLElement, waveSeconds: number, warningSeconds: number): void {
  meter.setAttribute('aria-valuemax', String(warningSeconds));
  fill.style.width = `${warningSeconds === 0 ? 0 : Math.min(1, waveSeconds / warningSeconds) * 100}%`;
}

/** Ready guidance exposes the independently configurable wave and pursuer policies. */
export function readyPursuitCopy(presentation: PresentationRules, pursuers: PursuerRules): string {
  if (presentation.pursuitVisible && pursuers.enabled) return `Outrun the wave. Pursuers appear from ${pursuers.introductionThresholds[0]} hops.`;
  if (presentation.pursuitVisible) return 'Outrun the wave. No pursuers in this run.';
  if (pursuers.enabled) return `Pursuers appear from ${pursuers.introductionThresholds[0]} hops. Explore at your own pace.`;
  return 'No wave or chasing mobs. Explore at your own pace.';
}
