/**
 * Player and pair ratings.
 *
 * Individual rating (PDF): `R = 0.35·L + 0.45·P + 0.20·T (+ era adjustment)`
 *  - L: achievements (majors, wins, best world ranking) normalised to 0-100.
 *  - P: mean of the four game attributes.
 *  - T: team-competition factor from the historical W-L-H record.
 *
 * Format ratings:
 *  - Singles: R.
 *  - Fourballs: 0.65·max(R1,R2) + 0.35·min(R1,R2) + putt bonus.
 *  - Foursomes: mean(R1,R2) + complementarity bonus + chemistry bonus (+3).
 */
import { ENGINE_CONFIG, type EngineConfig } from '../config/gameConfig';
import type { MatchFormat, Player } from '../types/game';

const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));

/**
 * Achievements score L (0-100).
 *
 * Majors and wins use a square-root curve against a cap so that the first titles
 * matter most and all-time outliers (Nicklaus, Woods) do not dwarf everyone.
 * The world ranking (only since 1986) is blended in when available; otherwise the
 * majors/wins sub-weights are used alone.
 */
export function achievementsScore(p: Player, cfg: EngineConfig = ENGINE_CONFIG): number {
  const a = cfg.rating.achievements;
  const majors = 100 * Math.sqrt(Math.min(p.majors / a.majorsCap, 1));
  const wins = 100 * Math.sqrt(Math.min(p.victorias / a.winsCap, 1));
  if (p.mejorRankingMundial == null) {
    return clamp(a.withoutRanking.majors * majors + a.withoutRanking.wins * wins);
  }
  const ranking = clamp(100 * (1 - (p.mejorRankingMundial - 1) / a.rankingFloor));
  return clamp(a.withRanking.majors * majors + a.withRanking.wins * wins + a.withRanking.ranking * ranking);
}

/** Profile score P: arithmetic mean of driver, irons, short game and putting. */
export function profileScore(p: Player): number {
  return (p.driver + p.hierros + p.juegoCorto + p.putt) / 4;
}

/**
 * Parses a `"W-L-H"` record string.
 * @returns `{ w, l, h }`; malformed input yields zeros.
 */
export function parseRecord(record: string): { w: number; l: number; h: number } {
  const [w, l, h] = record.split('-').map((n) => Number.parseInt(n, 10));
  return { w: w || 0, l: l || 0, h: h || 0 };
}

/**
 * Team factor T (0-100): points percentage in team competition, shrunk toward
 * 50 % with a Bayesian prior so that 2-0-0 is not rated above 20-12-5.
 */
export function teamScore(p: Player, cfg: EngineConfig = ENGINE_CONFIG): number {
  const { w, l, h } = parseRecord(p.recordEquipos);
  const prior = cfg.rating.team.priorMatches;
  const played = w + l + h;
  return (100 * (w + 0.5 * h + 0.5 * prior)) / (played + prior);
}

/** Breakdown of an individual rating, useful for UI and debugging. */
export interface RatingBreakdown {
  L: number;
  P: number;
  T: number;
  era: number;
  R: number;
}

/** Computes the full individual rating breakdown for a player. */
export function ratingBreakdown(p: Player, cfg: EngineConfig = ENGINE_CONFIG): RatingBreakdown {
  const w = cfg.rating.weights;
  const L = achievementsScore(p, cfg);
  const P = profileScore(p);
  const T = teamScore(p, cfg);
  const era = cfg.rating.eraAdjustment[p.decada] ?? 0;
  const R = clamp(w.achievements * L + w.profile * P + w.team * T + era);
  return { L, P, T, era, R };
}

/** Individual rating R (0-100). */
export function individualRating(p: Player, cfg: EngineConfig = ENGINE_CONFIG): number {
  return ratingBreakdown(p, cfg).R;
}

/** True if either player lists the other as a historic partner. */
export function isHistoricPair(a: Player, b: Player): boolean {
  return a.parejasHistoricas.includes(b.id) || b.parejasHistoricas.includes(a.id);
}

/**
 * Foursomes complementarity bonus: rewards a pair where one player is stronger
 * off the tee and the other with the irons (alternate shot).
 *
 * `bonus = min(cap, factor · sqrt(driverGap · ironGap))` when the gaps point in
 * opposite directions; 0 otherwise.
 */
export function complementarityBonus(a: Player, b: Player, cfg: EngineConfig = ENGINE_CONFIG): number {
  const f = cfg.formats.foursomes;
  const driverGap = a.driver - b.driver;
  const ironGap = b.hierros - a.hierros;
  const product = driverGap * ironGap;
  if (product <= 0) return 0;
  return Math.min(f.complementarityCap, f.complementarityFactor * Math.sqrt(product));
}

/** Pair rating with the bonuses that produced it. */
export interface PairRating {
  rating: number;
  base: number;
  puttBonus: number;
  complementarity: number;
  chemistry: number;
}

/**
 * Rating of a pair in a pair format.
 * @param a - First player.
 * @param b - Second player.
 * @param format - `foursomes` or `fourballs`.
 */
export function pairRating(
  a: Player,
  b: Player,
  format: Exclude<MatchFormat, 'singles'>,
  cfg: EngineConfig = ENGINE_CONFIG,
): PairRating {
  const ra = individualRating(a, cfg);
  const rb = individualRating(b, cfg);
  const historic = isHistoricPair(a, b);
  if (format === 'fourballs') {
    const f = cfg.formats.fourballs;
    const base = f.maxWeight * Math.max(ra, rb) + f.minWeight * Math.min(ra, rb);
    const puttBonus = a.putt >= f.puttThreshold && b.putt >= f.puttThreshold ? f.puttBonus : 0;
    const chemistry = historic ? cfg.formats.fourballsChemistryBonus : 0;
    return { rating: base + puttBonus + chemistry, base, puttBonus, complementarity: 0, chemistry };
  }
  const f = cfg.formats.foursomes;
  const base = (ra + rb) / 2;
  const complementarity = complementarityBonus(a, b, cfg);
  const chemistry = historic ? f.chemistryBonus : 0;
  return { rating: base + complementarity + chemistry, base, puttBonus: 0, complementarity, chemistry };
}

/**
 * Rating of one side of a match in the given format.
 * @param players - 1 player for singles, 2 for pair formats.
 */
export function formatRating(players: Player[], format: MatchFormat, cfg: EngineConfig = ENGINE_CONFIG): number {
  if (format === 'singles') {
    if (players.length !== 1) throw new Error('Singles need exactly 1 player');
    return individualRating(players[0], cfg);
  }
  if (players.length !== 2) throw new Error(`${format} needs exactly 2 players`);
  return pairRating(players[0], players[1], format, cfg).rating;
}
