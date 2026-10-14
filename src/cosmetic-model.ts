import { box } from './content.js';
import type { Model, Voxel } from './content.js';
import type { CosmeticDefinition } from './market/types.js';

/** Effects use the same colored marks as the world, arranged in three dimensions. */
export function effectModel(item: CosmeticDefinition, top: number, radius: number): Model {
  const { style, color } = item.appearance;
  if (style === 'halo') return Array.from({ length: 28 }, (_, i) => {
    const angle = i / 28 * (Math.PI * 2);
    return box(Math.cos(angle) * radius, Math.sin(angle) * radius, top + .12, .052, .052, .045, color);
  });
  if (style === 'sparkles') return Array.from({ length: 5 }, (_, i) => {
    const angle = i / 5 * (Math.PI * 2) + .3, z = top * (.3 + i % 3 * .3);
    const x = Math.cos(angle) * (radius + .1), y = Math.sin(angle) * (radius + .1);
    return [box(x, y, z, .035, .035, .18, color), box(x, y, z + .072, .16, .035, .035, color), box(x, y, z + .072, .035, .16, .035, color)];
  }).flat();
  if (style === 'trail') return Array.from({ length: 4 }, (_, i) =>
    box((i % 2 ? 1 : -1) * .12, radius + .12 + i * .24, .015, .16, .22, .028, color));
  return [];
}

/** The same standalone item geometry is used on market stands and after death. */
export function cosmeticModel(item: CosmeticDefinition): Model {
  const { appearance } = item;
  if (appearance.style === 'hat') return appearance.model;
  if (appearance.style === 'shirt') {
    // The authored shirt model contains the trim applied to a traveler's torso.
    // Give it a garment body here, with short sleeves and a recessed neckline.
    const garment: Voxel[] = [
      box(0, 0, 0, 1, 1, 1, appearance.color),
      box(-.62, .05, .64, .25, .68, .33, appearance.color),
      box(.62, .05, .64, .25, .68, .33, appearance.color),
      ...appearance.model,
      box(0, -.08, 1.035, .34, .36, .02, '#475a50'),
    ];
    // Garments have a shallow profile; applying the same transform to all
    // authored trim preserves the pockets and wraparound stripes.
    return garment.map(v => ({ ...v, y: v.y * .48, d: v.d * .48 }));
  }
  return effectModel(item, .62, .45);
}

