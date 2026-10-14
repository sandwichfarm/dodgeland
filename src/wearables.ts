import { box } from './content.js';
import type { Character, Model, Voxel } from './content.js';
import type { CosmeticDefinition } from './market/types.js';

interface Anchor { x: number; y: number; z: number; w: number; d: number; h: number }
interface Fitting { head: Anchor; shirt: Anchor }
// Character fitting data, separate from item definitions: a new hat or shirt
// supplies only its unit model and automatically fits every traveler.
const FITTINGS: Record<string, Fitting> = {
  butter: { head: { x: 0, y: -.16, z: .84, w: .42, d: .4, h: .42 }, shirt: { x: 0, y: .06, z: .15, w: .55, d: .54, h: .30 } },
  sunny: { head: { x: 0, y: -.14, z: .84, w: .40, d: .38, h: .42 }, shirt: { x: 0, y: .055, z: .15, w: .55, d: .54, h: .32 } },
  pip: { head: { x: 0, y: -.12, z: .67, w: .62, d: .45, h: .45 }, shirt: { x: 0, y: 0, z: .13, w: .64, d: .54, h: .24 } },
  petal: { head: { x: 0, y: -.2, z: .62, w: .65, d: .4, h: .45 }, shirt: { x: 0, y: .03, z: .12, w: .58, d: .62, h: .25 } },
  beep: { head: { x: 0, y: -.04, z: .86, w: .6, d: .46, h: .45 }, shirt: { x: 0, y: 0, z: .1, w: .46, d: .43, h: .40 } },
  rust: { head: { x: 0, y: -.18, z: .74, w: .57, d: .4, h: .43 }, shirt: { x: 0, y: .05, z: .13, w: .48, d: .55, h: .30 } },
  pebble: { head: { x: 0, y: -.07, z: .81, w: .43, d: .39, h: .42 }, shirt: { x: 0, y: .02, z: .1, w: .5, d: .48, h: .39 } },
};

function fitting(character: Character): Fitting {
  if (FITTINGS[character.id]) return FITTINGS[character.id]!;
  const body = character.model.find(v => v.w > .3 && v.d > .3) ?? box(0, 0, 0, .5, .5, .5, '#ffffff');
  const top = Math.max(0, ...character.model.map(v => v.z + v.h));
  return { head: { ...body, z: top, h: body.w }, shirt: { ...body, h: body.h * .7 } };
}

/** One model gives body and clothes the same depth sorting, yaw and hop lift. */
export function dressedModel(character: Character, cosmetics: readonly CosmeticDefinition[]): Model {
  const clothes = cosmetics.filter(item => item.appearance.style === 'hat' || item.appearance.style === 'shirt');
  if (!clothes.length) return character.model;
  const anchors = fitting(character);
  let model: Voxel[] = [...character.model];
  for (const item of clothes) {
    const appearance = item.appearance;
    if (appearance.style !== 'hat' && appearance.style !== 'shirt') continue;
    const anchor = appearance.style === 'hat' ? anchors.head : anchors.shirt;
    if (appearance.style === 'shirt') {
      // Replace the torso's lower surface, rather than covering the face with
      // another box. A tall traveler keeps its original upper body and head.
      model = model.flatMap(v => {
        const torso = Math.abs(v.x - anchor.x) < .05 && Math.abs(v.y - anchor.y) < .06
          && v.w >= anchor.w * .8 && v.d >= anchor.d * .8 && Math.abs(v.z - anchor.z) < .025;
        if (!torso) return [v];
        const height = Math.min(v.h, anchor.h);
        return [{ ...v, h: height, color: appearance.color }, ...(v.h > height + .001 ? [{ ...v, z: v.z + height, h: v.h - height }] : [])];
      });
    }
    model.push(...appearance.model.map(v => ({
      ...v, x: anchor.x + v.x * anchor.w, y: anchor.y + v.y * anchor.d,
      z: anchor.z + v.z * anchor.h, w: v.w * anchor.w, d: v.d * anchor.d, h: v.h * anchor.h,
    })));
  }
  return model;
}
