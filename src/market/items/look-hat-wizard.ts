import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-wizard', kind: 'cosmetic', name: 'Twilight Wizard',
  description: 'A stepped violet wizard hat with a crooked tip and moon patch.',
  rarity: 'epic', price: 36, icon: '✧', color: '#8072b7',
  appearance: { style: 'hat', color: '#8072b7', model: [
    { x: 0, y: 0, z: 0, w: 1.48, d: 1.36, h: .10, color: '#625492' },
    { x: 0, y: 0, z: .10, w: .98, d: .96, h: .34, color: '#8072b7' },
    { x: .03, y: .02, z: .44, w: .72, d: .70, h: .28, color: '#9182c6' },
    { x: .11, y: .03, z: .72, w: .45, d: .46, h: .25, color: '#a291d3' },
    { x: .23, y: .03, z: .97, w: .29, d: .26, h: .15, color: '#b2a0df' },
    { x: -.18, y: -.492, z: .19, w: .18, d: .03, h: .18, color: '#f4da84' },
  ] },
} satisfies CosmeticDefinition;
