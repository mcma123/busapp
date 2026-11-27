export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rng = ReturnType<typeof mulberry32>;
export const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
export const int = (r: Rng, min: number, max: number) => min + Math.floor(r() * (max - min + 1));

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function token(r: Rng) {
  let s = "KN-";
  for (let i = 0; i < 8; i++) {
    if (i === 4) s += "-";
    s += ALPHA[Math.floor(r() * ALPHA.length)];
  }
  return s;
}
