import type { DeathCause } from './game.js';

export interface CharacterPower {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  icon: string;
  color: string;
  causes: readonly DeathCause[];
  duration: number;
  lift: number;
}

/** Traveler abilities belong to the run, independently of its market hand. */
const POWERS: Record<string, CharacterPower> = {
  butter: { id: 'water-bounce', name: 'Water Bounce', description: 'Bounce out of a fatal splash or river drift onto a nearby bank.', icon: '≈', color: '#a6e9ef', causes: ['water', 'swept'], duration: .52, lift: .95, cooldown: 100 },
  sunny: { id: 'chicken-out', name: 'Chicken Out', description: 'Flutter clear of a fatal road collision. Trains still win.', icon: '↗', color: '#ffe3a1', causes: ['traffic'], duration: .46, lift: 1.05, cooldown: 100 },
  pip: { id: 'spring-escape', name: 'Spring Escape', description: 'Leap out of a pursuer’s grasp to nearby open ground.', icon: '⌁', color: '#c0e58b', causes: ['mob'], duration: .42, lift: 1.2, cooldown: 100 },
  petal: { id: 'regrow', name: 'Regrow', description: 'Recover from a fatal rear or side hit, or a pursuer’s strike, with one feather.', icon: '+', color: '#ffc0d5', causes: ['traffic', 'mob'], duration: .5, lift: .3, cooldown: 100 },
  beep: { id: 'emergency-reboot', name: 'Emergency Reboot', description: 'Eject to safety from a fatal car or train impact.', icon: 'ϟ', color: '#a9f3d8', causes: ['traffic', 'train'], duration: .36, lift: .55, cooldown: 100 },
  rust: { id: 'fox-feint', name: 'Fox Feint', description: 'Dodge a pursuer’s fatal strike with a quick sideways feint.', icon: '»', color: '#ffc28c', causes: ['mob'], duration: .32, lift: .18, cooldown: 100 },
  pebble: { id: 'belly-slide', name: 'Belly Slide', description: 'Slide ahead of the catching wave onto open ground.', icon: '≋', color: '#c9e5ff', causes: ['wave'], duration: .5, lift: .08, cooldown: 100 },
};

export function characterPower(characterId: string): CharacterPower { return POWERS[characterId] ?? POWERS.butter!; }

export function powerMatches(power: CharacterPower, cause: DeathCause, face?: 'front' | 'rear' | 'side'): boolean {
  return power.causes.includes(cause) && !(power.id === 'regrow' && cause === 'traffic' && face !== 'rear' && face !== 'side');
}
