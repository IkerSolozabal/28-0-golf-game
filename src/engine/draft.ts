/**
 * Draft logic: roulette spins, catalogue filtering and the machine rival.
 */
import { ENGINE_CONFIG, type EngineConfig } from '../config/gameConfig';
import type { Difficulty, MajorName, Player, Side, SpinResult } from '../types/game';
import { individualRating } from './rating';
import { pick, shuffle, type Rng } from './rng';

/** Stable key for a spin (used for de-duplication and React keys). */
export function spinKey(s: SpinResult): string {
  return s.kind === 'country' ? `c|${s.decade}|${s.country}` : `m|${s.decade}|${s.major}`;
}

/** Long label, e.g. "España · años 90" or "Masters · años 2000". */
export function spinLabel(s: SpinResult): string {
  const d = s.decade >= 2000 ? `años ${s.decade}` : `años ${String(s.decade).slice(2)}`;
  return `${s.kind === 'country' ? s.country : s.major} · ${d}`;
}

const COUNTRY_SHORT: Record<string, string> = {
  España: 'ESP',
  Inglaterra: 'ENG',
  Escocia: 'SCO',
  Gales: 'WAL',
  Irlanda: 'IRL',
  'Irlanda del Norte': 'NIR',
  Alemania: 'GER',
  Suecia: 'SWE',
  Noruega: 'NOR',
  Italia: 'ITA',
  Dinamarca: 'DEN',
  'EE. UU.': 'USA',
};
const MAJOR_SHORT: Record<MajorName, string> = {
  Masters: 'MAST',
  'US Open': 'USO',
  'The Open': 'OPEN',
  'PGA Championship': 'PGA',
};

/** Compact label for a wheel segment, e.g. "ESP 90s". */
export function spinShortLabel(s: SpinResult): string {
  const tag = s.kind === 'country' ? COUNTRY_SHORT[s.country] ?? s.country.slice(0, 3).toUpperCase() : MAJOR_SHORT[s.major];
  return `${tag} ${String(s.decade).slice(2)}s`;
}

/** Whether a player satisfies a spin. */
export function matchesSpin(p: Player, s: SpinResult): boolean {
  if (p.decada !== s.decade) return false;
  return s.kind === 'country' ? p.pais === s.country : p.majorsGanados.includes(s.major);
}

/**
 * Players of `side` that match the spin and have not been picked yet.
 * Sorted by individual rating (best first).
 */
export function filterBySpin(
  players: readonly Player[],
  side: Side,
  spin: SpinResult,
  pickedIds: readonly string[],
  cfg: EngineConfig = ENGINE_CONFIG,
): Player[] {
  return players
    .filter((p) => p.bando === side && !pickedIds.includes(p.id) && matchesSpin(p, spin))
    .sort((a, b) => individualRating(b, cfg) - individualRating(a, cfg));
}

/** All distinct spins that would yield at least one player from `pool`. */
export function combosFor(pool: readonly Player[]): { country: SpinResult[]; major: SpinResult[] } {
  const country = new Map<string, SpinResult>();
  const major = new Map<string, SpinResult>();
  for (const p of pool) {
    const c: SpinResult = { kind: 'country', decade: p.decada, country: p.pais };
    country.set(spinKey(c), c);
    for (const m of p.majorsGanados) {
      const s: SpinResult = { kind: 'major', decade: p.decada, major: m };
      major.set(spinKey(s), s);
    }
  }
  return { country: [...country.values()], major: [...major.values()] };
}

/** Result of a roulette spin plus the decorative wheel it lands on. */
export interface RouletteSpin {
  result: SpinResult;
  /** Wheel segments (the result is one of them). */
  segments: SpinResult[];
  /** Index of `result` inside `segments`. */
  targetIndex: number;
}

/**
 * Spins the roulette. Only combinations with at least one available player can
 * win, so the user always has a choice.
 *
 * @param players - Full catalogue.
 * @param side - User side.
 * @param pickedIds - Ids already drafted in this game.
 * @param rng - Seeded RNG (derive one per turn for reproducibility).
 * @throws If no player of `side` is left.
 */
export function spinRoulette(
  players: readonly Player[],
  side: Side,
  pickedIds: readonly string[],
  rng: Rng,
  cfg: EngineConfig = ENGINE_CONFIG,
): RouletteSpin {
  const available = players.filter((p) => p.bando === side && !pickedIds.includes(p.id));
  if (available.length === 0) throw new Error('No players left to draft');
  const valid = combosFor(available);
  const useMajor = valid.major.length > 0 && (valid.country.length === 0 || rng() < cfg.roulette.majorSpinProbability[side]);
  const result = pick(rng, useMajor ? valid.major : valid.country);

  // Decorative segments: other combos of the same side (valid or not), shuffled.
  const all = combosFor(players.filter((p) => p.bando === side));
  const others = shuffle(rng, [...all.country, ...all.major].filter((s) => spinKey(s) !== spinKey(result)));
  const segments = shuffle(rng, [result, ...others.slice(0, cfg.roulette.segments - 1)]);
  return { result, segments, targetIndex: segments.findIndex((s) => spinKey(s) === spinKey(result)) };
}

/**
 * Generates the machine rival: a team of legends from the other side.
 *
 * - `top` difficulty: the `teamSize` best-rated players.
 * - `relative` difficulties: a random team tuned by local search so that its mean
 *   rating is close to `mean(userTeam) + offset`. Without `userTeam` the target is
 *   the mean of the side's top `2·teamSize` players.
 *
 * @param players - Full catalogue.
 * @param rivalSide - Side of the rival.
 * @param teamSize - Players per team.
 * @param difficulty - Difficulty key from `ENGINE_CONFIG.rival`.
 * @param rng - Seeded RNG.
 * @param userTeam - The user's drafted team (optional).
 */
export function generateRivalTeam(
  players: readonly Player[],
  rivalSide: Side,
  teamSize: number,
  difficulty: Difficulty,
  rng: Rng,
  userTeam?: readonly Player[],
  cfg: EngineConfig = ENGINE_CONFIG,
): Player[] {
  const rate = (p: Player) => individualRating(p, cfg);
  const byRating = (a: Player, b: Player) => rate(b) - rate(a);
  const sorted = players.filter((p) => p.bando === rivalSide).sort(byRating);
  if (sorted.length < teamSize) throw new Error(`Not enough ${rivalSide} players for a rival team`);
  const d = cfg.rival[difficulty];
  if (d.strategy === 'top') return sorted.slice(0, teamSize);

  const mean = (xs: readonly Player[]) => xs.reduce((s, p) => s + rate(p), 0) / xs.length;
  const reference = userTeam && userTeam.length > 0 ? mean(userTeam) : mean(sorted.slice(0, teamSize * 2));
  const target = reference + d.offset;

  const shuffled = shuffle(rng, sorted);
  const team = shuffled.slice(0, teamSize);
  const bench = shuffled.slice(teamSize);
  let gap = Math.abs(mean(team) - target);
  for (let iter = 0; iter < 400 && gap > 0.25 && bench.length > 0; iter++) {
    const ti = Math.floor(rng() * team.length);
    const bi = Math.floor(rng() * bench.length);
    [team[ti], bench[bi]] = [bench[bi], team[ti]];
    const next = Math.abs(mean(team) - target);
    if (next < gap) gap = next;
    else [team[ti], bench[bi]] = [bench[bi], team[ti]]; // revert
  }
  return team.sort(byRating);
}

/** The opposite side. */
export function otherSide(side: Side): Side {
  return side === 'EU' ? 'USA' : 'EU';
}
