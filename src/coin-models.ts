import { box } from './content.js';
import type { Model } from './content.js';
import { coinDenomination } from './coin-denominations.js';
import type { CoinDenominationId } from './coin-denominations.js';

function sack(id: CoinDenominationId, height: number, color: string, tie: string): Model {
  const { width: w, depth: d } = coinDenomination(id);
  return [
    box(0, 0, .08, w * .78, d * .84, height * .18, color),
    box(0, 0, .08 + height * .14, w, d, height * .52, color),
    box(0, 0, .08 + height * .62, w * .72, d * .74, height * .18, color),
    box(0, 0, .08 + height * .78, w * .36, d * .42, height * .12, tie),
    box(0, 0, .08 + height * .89, w * .56, d * .52, height * .11, color),
    box(w * .22, -d * .08, .08 + height * .75, w * .18, d * .14, height * .09, tie),
    // Gold seal faces the camera; higher denominations have different straps.
    box(0, d / 2 + .008, .08 + height * .32, w * .26, .018, height * .24, '#f1cd64'),
    box(-w * .28, d / 2 + .006, .08 + height * .18, w * .08, .014, height * .44, tie),
  ];
}
const models: Record<CoinDenominationId, Model> = {
  coin: [box(0, 0, .16, .24, .11, .3, '#f1cd64'), box(0, -.065, .23, .07, .02, .15, '#fff1a1')],
  bar: [box(0, 0, .12, .36, .18, .36, '#f1cd64'), box(0, -.099, .19, .20, .02, .18, '#fff1a1'), box(0, 0, .48, .28, .14, .025, '#ffe79a')],
  'small-sack': sack('small-sack', .40, '#d3ad71', '#886043'),
  'big-sack': sack('big-sack', .52, '#b67c48', '#f5d27c'),
  'huge-sack': sack('huge-sack', .66, '#8e638e', '#f5d27c'),
};
export function coinPickupModel(id: CoinDenominationId = 'coin'): Model { return models[id] ?? models.coin; }
