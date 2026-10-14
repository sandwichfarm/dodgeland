/** A reward in the duck's attraction field, advanced by the simulation clock. */
export interface CoinPull { x: number; y: number; z: number; speed: number }

/** Accelerate toward the duck, with stronger attraction nearby and no overshoot. */
export function advanceCoinPull(coin: CoinPull, x: number, y: number, z: number, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const dx = x - coin.x, dy = y - coin.y, distance = Math.hypot(dx, dy);
  coin.speed = Math.min(8, coin.speed + (8 + 6 / (distance + .3)) * dt);
  const fraction = distance > 0 ? Math.min(1, coin.speed * dt / distance) : 1;
  coin.x += dx * fraction; coin.y += dy * fraction; coin.z += (z - coin.z) * fraction;
}
