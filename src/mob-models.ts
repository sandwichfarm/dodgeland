import { box } from './content.js';
import type { Model } from './content.js';
import { mobDefinition } from './mobs.js';
import type { Mob } from './mobs.js';

const eye = '#273831';
const shine = '#fff9da';
/** Solid central bodies follow the contact radius; appendages are decoration. */
function buildModel(kind: Mob['kind']): Model {
  const r = mobDefinition(kind).radius;
  if (kind === 'slime') return [
    box(0, 0, .015, r * 2, r * 2, .23, '#699945'),
    box(0, 0, .245, r * 1.72, r * 1.72, .13, '#97c958'),
    box(-r * .4, -.035, .375, r * .65, r * .7, .025, '#c6e68b'),
    ...[-1, 1].flatMap(s => [
      box(s * r * .48, r * .83, .20, .105, .065, .125, shine),
      box(s * r * .48, r * .98, .22, .045, .025, .07, eye),
      box(s * r * .94, .04, .22, .04, .07, .085, eye),
    ]),
  ];
  if (kind === 'crab') return [
    ...[-1, 1].flatMap(s => [-.12, .02, .15].map(y => box(s * (r + .065), y, .025, .18, .075, .065, '#9e5979'))),
    box(0, 0, .07, r * 2, r * 2, .20, '#c35d73'),
    box(0, -.025, .27, r * 1.65, r * 1.5, .07, '#e78d83'),
    box(0, -.10, .34, .12, .13, .025, '#f5b298'),
    ...[-1, 1].flatMap(s => [
      box(s * r * .55, r * .70, .24, .055, .055, .17, '#81566d'),
      box(s * r * .55, r * .74, .36, .085, .085, .08, shine),
      box(s * r * .55, r * .93, .375, .045, .025, .055, eye),
      box(s * (r + .06), r * .83, .10, .13, .17, .10, '#c35d73'),
      box(s * (r + .12), r + .10, .17, .20, .17, .12, '#e78d83'),
      box(s * (r + .16), r + .23, .18, .075, .13, .10, '#f4ad95'),
      box(s * (r + .055), r + .18, .18, .055, .07, .08, '#f4ad95'),
    ]),
  ];
  return [
    // Short bands across one compact abdomen; white wings sit outside its core.
    box(0, 0, .12, r * 2, r * 2, .20, '#e6b744'),
    ...[-.12, .04].map(y => box(0, y, .125, r * 2.015, .07, .205, '#4f4947')),
    box(0, r * .70, .18, r * 1.6, r * .55, .19, '#f5d668'),
    ...[-1, 1].flatMap(s => [
      box(s * r * .59, r * .78, .27, .075, .075, .095, eye),
      box(s * r * .64, r * .85, .32, .025, .025, .03, shine),
      box(s * r * .56, r * .51, .37, .035, .04, .14, '#625044'),
      box(s * r * .72, r * .57, .49, .09, .045, .035, '#625044'),
      box(s * (r + .13), -.025, .28, .31, .19, .035, '#f2f4d7'),
      box(s * (r + .16), -.15, .29, .19, .13, .035, '#c5ded4'),
      box(s * r * .80, .045, .04, .035, .16, .10, '#625044'),
    ]),
    box(0, -r - .045, .19, .065, .12, .07, '#625044'),
  ];
}

const MODELS: Record<Mob['kind'], Model> = { slime: buildModel('slime'), crab: buildModel('crab'), wasp: buildModel('wasp') };
/** Motion changes height only. It never enlarges or shifts a contact body. */
export function mobPose(mob: Mob, time: number, reduced = false): { model: Model; lift: number; yaw: number } {
  const dx = mob.targetX - mob.fromX, dy = mob.targetY - mob.fromY;
  const yaw = Math.abs(dx) + Math.abs(dy) > .001 ? Math.atan2(-dx, -dy) : Math.PI;
  const phase = Math.max(0, Math.min(1, 1 - mob.phaseLeft / Math.max(.001, mob.phaseDuration)));
  let model = MODELS[mob.kind];
  let lift = mob.kind === 'wasp' ? .11 : 0;
  if (!reduced) {
    if (mob.kind === 'slime') {
      // A slow grounded shuffle: the base never leaves its contact surface.
      const squash = mob.phase === 'walking' ? 1 - (1 + Math.sin(time * 7 + mob.id)) * .045 : 1;
      if (squash !== 1) model = model.map(v => ({ ...v, z: .015 + (v.z - .015) * squash, h: v.h * squash }));
    } else if (mob.kind === 'crab') {
      const anticipation = mob.phase === 'windup' ? phase : mob.phase === 'moving' ? 1 - phase : 0;
      const r = mobDefinition('crab').radius;
      model = model.map(v => {
        // Alternating feet describe ordinary pursuit. A lunge plants them;
        // the raised claws and lowered shell carry its preparation instead.
        if (v.z < .05) return mob.phase === 'walking' ? { ...v, z: v.z + (Math.sin(time * 18 + v.y * 24 + Math.sign(v.x) * Math.PI / 2) + 1) * .018 } : v;
        if (Math.abs(v.x) > r && v.y > r * .7) return { ...v, z: v.z + anticipation * .10 };
        return anticipation ? { ...v, z: .07 + (v.z - .07) * (1 - anticipation * .12), h: v.h * (1 - anticipation * .12) } : v;
      });
    } else {
      // Hover pursuit stays low. The wasp settles before the marked strike,
      // then returns to its normal hover during the deliberate recovery.
      lift += mob.phase === 'windup' ? -.055 * phase : mob.phase === 'moving' ? -.055 * (1 - phase) : Math.sin(time * 7 + mob.id) * .018;
      const wingRate = mob.phase === 'windup' ? 36 : mob.phase === 'moving' ? 42 : mob.phase === 'rest' ? 14 : 22;
      model = model.map(v => v.color === '#f2f4d7' || v.color === '#c5ded4' ? { ...v, z: v.z + Math.sin(time * wingRate) * .045 } : v);
    }
  }
  return { model, lift, yaw };
}
