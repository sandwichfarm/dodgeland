import { box } from './content.js';
import type { Model, World } from './content.js';

interface VehicleAppearance { kind?: string; variant: number }
interface VehicleLane { world: World; variant: number }

const models = new Map<string, Model>();
const wheels = (positions: readonly number[], depth = .31) => positions.flatMap(x => [-depth, depth].map(y => box(x, y, .035, .22, .105, .22, '#34433e')));

/** Shared with collision bounds: vehicles face +x before the lane transform. */
export function vehicleModel(lane: VehicleLane, actor?: VehicleAppearance): Model {
  const original = lane.world.vehicles[(actor?.variant ?? lane.variant) % lane.world.vehicles.length]!;
  if (actor?.kind !== 'truck' && actor?.kind !== 'sports') return original;
  const color = original.reduce((body, voxel) => voxel.w * voxel.d > body.w * body.d ? voxel : body).color;
  const key = `${actor.kind}:${color}`;
  const cached = models.get(key);
  if (cached) return cached;
  const model: Model = actor.kind === 'truck' ? [
    // The continuous low chassis is also the full contact footprint. Cargo and
    // cab remain within it, so a visible rear corner never has a hidden hitbox.
    box(0, 0, .14, 1.92, .64, .25, color),
    box(-.30, 0, .39, 1.25, .62, .70, '#e2dcc1'),
    box(-.30, -.318, .65, 1.08, .022, .12, color),
    box(-.89, 0, .48, .025, .52, .52, '#c3bfa9'),
    box(-.908, 0, .49, .024, .025, .5, '#8a968d'),
    box(.62, 0, .39, .61, .6, .47, color),
    box(.68, -.306, .61, .36, .025, .20, '#547f88'),
    box(.68, .306, .61, .36, .025, .20, '#547f88'),
    box(.937, 0, .60, .025, .48, .22, '#709ca0'),
    box(.938, 0, .24, .03, .34, .13, '#566861'),
    ...[-.23, .23].map(y => box(.945, y, .39, .025, .10, .09, '#fff0b3')),
    ...wheels([-.68, -.33, .63], .325),
  ] : [
    // Low coupe, twin cream racing stripes, and an unmistakable rear spoiler.
    box(0, 0, .13, 1.28, .60, .23, color),
    box(-.05, 0, .36, .60, .49, .19, '#365963'),
    box(-.09, 0, .55, .34, .48, .045, color),
    ...[-.12, .12].flatMap(y => [
      box(.46, y, .36, .36, .065, .012, '#fff0cf'),
      box(-.08, y, .595, .34, .065, .012, '#fff0cf'),
      box(-.50, y, .36, .27, .065, .012, '#fff0cf'),
    ]),
    ...[-.19, .19].map(y => box(-.52, y, .36, .045, .045, .14, '#34433e')),
    box(-.53, 0, .50, .13, .67, .055, color),
    ...[-.20, .20].map(y => box(.625, y, .245, .03, .15, .055, '#fff0b3')),
    ...[-.21, .21].map(y => box(-.625, y, .25, .025, .11, .055, '#b34945')),
    ...wheels([-.43, .42]),
  ];
  models.set(key, model);
  return model;
}

/** Keep normalization identical for rendering and the shared collision model. */
export function vehicleModelWidth(model: Model): number {
  return Math.max(...model.map(voxel => Math.abs(voxel.x) * 2 + voxel.w));
}
