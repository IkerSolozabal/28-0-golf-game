/**
 * Match-play simulation engine (pure TypeScript, no React).
 *
 * Implements the PDF pseudocode:
 * ```
 * p = 1 / (1 + 10 ** (-(ra - rb) / K))
 * if rng() < EMPATE: return 0.5
 * return rng() < p ? 1 : 0
 * ```
 * and aggregates matches into sessions, a final score, MVP and best pair.
 */
import { ENGINE_CONFIG, type EngineConfig } from '../config/gameConfig';
import type {
  CupResult,
  GameModeDef,
  Lineup,
  MatchFormat,
  MatchPoints,
  MatchResult,
  PairContribution,
  Player,
  PlayerContribution,
  SessionResult,
  Side,
} from '../types/game';
import { formatRating, individualRating } from './rating';
import { deriveRng, type Rng } from './rng';

/**
 * Elo-style logistic win probability.
 * @param ra - Rating of side A.
 * @param rb - Rating of side B.
 * @param k - Scale; with k = 25 a 10-point edge ≈ 72 %.
 * @returns Probability (0-1) that A beats B, ignoring halves.
 */
export function winProbability(ra: number, rb: number, k: number = ENGINE_CONFIG.match.k): number {
  return 1 / (1 + 10 ** (-(ra - rb) / k));
}

const WIN_MARGINS = ['1 up', '2 up', '2&1', '3&2', '3&1', '4&3', '5&4', '6&5', '7&6'];

/**
 * Picks a plausible match-play margin. Larger mismatches tend to end earlier.
 * @param rng - Random source.
 * @param winnerP - Win probability the winner had before the match (0-1).
 */
export function matchMargin(rng: Rng, winnerP: number): string {
  // Dominance in [0, 1]: 0 = coin flip or upset, 1 = overwhelming favourite.
  const dominance = Math.max(0, Math.min(1, (winnerP - 0.35) / 0.6));
  const span = 3 + Math.round(dominance * (WIN_MARGINS.length - 3));
  return WIN_MARGINS[Math.floor(rng() * span)];
}

/** Outcome of {@link simulateMatch}. */
export interface MatchOutcome {
  ratingA: number;
  ratingB: number;
  pWin: number;
  points: MatchPoints;
  margin: string;
}

/**
 * Simulates one match between side A and side B.
 * @param a - Players of side A (1 for singles, 2 for pairs).
 * @param b - Players of side B.
 * @param format - Match format.
 * @param rng - Seeded random source (consumed: 2-3 numbers).
 * @returns Points for side A (1, 0.5 or 0) and diagnostic data.
 */
export function simulateMatch(
  a: Player[],
  b: Player[],
  format: MatchFormat,
  rng: Rng,
  cfg: EngineConfig = ENGINE_CONFIG,
): MatchOutcome {
  const ratingA = formatRating(a, format, cfg);
  const ratingB = formatRating(b, format, cfg);
  const pWin = winProbability(ratingA, ratingB, cfg.match.k);
  if (rng() < cfg.match.drawProbability) {
    return { ratingA, ratingB, pWin, points: 0.5, margin: 'AS' };
  }
  const aWins = rng() < pWin;
  const margin = matchMargin(rng, aWins ? pWin : 1 - pWin);
  return { ratingA, ratingB, pWin, points: aWins ? 1 : 0, margin };
}

/** Input for {@link simulateCup}. */
export interface SimulateCupInput {
  mode: GameModeDef;
  userSide: Side;
  userLineup: Lineup;
  rivalLineup: Lineup;
  seed: string;
  /** Resolves a player id (injected so the engine stays catalogue-agnostic). */
  resolve: (id: string) => Player;
}

function requireIds(slots: (string | null)[], where: string): string[] {
  if (slots.some((s) => s == null)) throw new Error(`Incomplete lineup at ${where}`);
  return slots as string[];
}

/**
 * Simulates a whole competition, session by session, with a seeded RNG.
 * Same input + same seed ⇒ identical result.
 *
 * Match `i` of a session pits the user's slot `i` against the rival's slot `i`.
 */
export function simulateCup(input: SimulateCupInput, cfg: EngineConfig = ENGINE_CONFIG): CupResult {
  const { mode, userLineup, rivalLineup, seed, resolve } = input;
  const rng = deriveRng(seed, 'sim');
  const sessions: SessionResult[] = [];
  let cumUser = 0;
  let cumRival = 0;

  mode.sessions.forEach((session, si) => {
    const matches: MatchResult[] = [];
    for (let mi = 0; mi < session.matches; mi++) {
      const user = requireIds(userLineup[si]?.[mi] ?? [null], `user ${session.id}#${mi}`);
      const rival = requireIds(rivalLineup[si]?.[mi] ?? [null], `rival ${session.id}#${mi}`);
      const out = simulateMatch(user.map(resolve), rival.map(resolve), session.format, rng, cfg);
      matches.push({
        sessionId: session.id,
        format: session.format,
        index: mi,
        user,
        rival,
        ratingUser: out.ratingA,
        ratingRival: out.ratingB,
        pWin: out.pWin,
        points: out.points,
        margin: out.margin,
      });
    }
    const pointsUser = matches.reduce((s, m) => s + m.points, 0);
    const pointsRival = session.matches - pointsUser;
    cumUser += pointsUser;
    cumRival += pointsRival;
    sessions.push({ session, matches, pointsUser, pointsRival, cumulativeUser: cumUser, cumulativeRival: cumRival });
  });

  const total = cumUser + cumRival;
  const all = sessions.flatMap((s) => s.matches);
  return {
    seed,
    modeId: mode.id,
    userSide: input.userSide,
    sessions,
    pointsUser: cumUser,
    pointsRival: cumRival,
    totalPoints: total,
    perfect: cumUser === total,
    mvp: findMvp(all, resolve, cfg),
    bestPair: findBestPair(all, resolve, cfg),
  };
}

/**
 * MVP of the user team: most points won; ties broken by fewer matches played
 * (efficiency), then by individual rating.
 */
export function findMvp(
  matches: MatchResult[],
  resolve: (id: string) => Player,
  cfg: EngineConfig = ENGINE_CONFIG,
): PlayerContribution | null {
  const map = new Map<string, PlayerContribution>();
  for (const m of matches) {
    for (const id of m.user) {
      const c = map.get(id) ?? { playerId: id, points: 0, played: 0 };
      c.points += m.points;
      c.played += 1;
      map.set(id, c);
    }
  }
  const list = [...map.values()];
  list.sort(
    (x, y) =>
      y.points - x.points ||
      x.played - y.played ||
      individualRating(resolve(y.playerId), cfg) - individualRating(resolve(x.playerId), cfg),
  );
  return list[0] ?? null;
}

/**
 * Best user pair across pair sessions: most points, then best win ratio,
 * then highest combined rating.
 */
export function findBestPair(
  matches: MatchResult[],
  resolve: (id: string) => Player,
  cfg: EngineConfig = ENGINE_CONFIG,
): PairContribution | null {
  const map = new Map<string, PairContribution>();
  for (const m of matches) {
    if (m.user.length !== 2) continue;
    const ids = [...m.user].sort() as [string, string];
    const key = ids.join('|');
    const c = map.get(key) ?? { playerIds: ids, points: 0, played: 0 };
    c.points += m.points;
    c.played += 1;
    map.set(key, c);
  }
  const sumR = (c: PairContribution) => c.playerIds.reduce((s, id) => s + individualRating(resolve(id), cfg), 0);
  const list = [...map.values()];
  list.sort((x, y) => y.points - x.points || y.points / y.played - x.points / x.played || sumR(y) - sumR(x));
  return list[0] ?? null;
}

/**
 * Formats a score using a comma decimal separator: `10.5 → "10,5"`.
 */
export function formatScore(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1).replace('.', ',');
}
