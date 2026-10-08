export function selectBackgroundForVideo(
  poolSize: number,
  rng: () => number = Math.random
): number {
  if (poolSize <= 0) return -1;
  return Math.min(poolSize - 1, Math.floor(rng() * poolSize));
}
