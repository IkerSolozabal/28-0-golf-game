/**
 * Seeded pseudo-random number generation.
 *
 * Every random decision in the game (roulette spins, rival team, match results)
 * flows through an {@link Rng} created from a string seed, so a shared result can
 * be reproduced exactly and a future daily challenge can use a date-based seed.
 */

/** A function returning uniformly distributed floats in `[0, 1)`. */
export type Rng = () => number;

/**
 * Hashes a string into a 32-bit unsigned integer (xmur3-style mixing).
 * @param str - Any string (e.g. `"k3x9p2"` or `"k3x9p2:spin:4"`).
 * @returns 32-bit unsigned hash.
 */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/**
 * Creates a deterministic RNG (mulberry32) from a seed.
 * @param seed - String or number seed. Equal seeds produce equal sequences.
 * @returns An {@link Rng}.
 */
export function createRng(seed: string | number): Rng {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derives an independent RNG stream from a base seed and a label, so that e.g.
 * spin #3 is the same regardless of how many numbers earlier steps consumed.
 * @param seed - Game seed.
 * @param label - Stream label (`"spin:3"`, `"rival"`, `"sim"`…).
 */
export function deriveRng(seed: string, label: string): Rng {
  return createRng(`${seed}:${label}`);
}

/**
 * Generates a short, human-friendly random seed (6 base-36 chars).
 * Uses `crypto.getRandomValues` when available.
 */
export function randomSeed(): string {
  const n =
    typeof crypto !== 'undefined' && 'getRandomValues' in crypto
      ? crypto.getRandomValues(new Uint32Array(1))[0]
      : Math.floor(Math.random() * 2 ** 32);
  return n.toString(36).padStart(6, '0').slice(-6);
}

/**
 * Returns a random integer in `[0, max)`.
 * @param rng - Random source.
 * @param max - Exclusive upper bound (> 0).
 */
export function randInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}

/**
 * Picks one element uniformly at random.
 * @throws If `items` is empty.
 */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() on empty array');
  return items[randInt(rng, items.length)];
}

/**
 * Returns a shuffled copy (Fisher–Yates).
 */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
