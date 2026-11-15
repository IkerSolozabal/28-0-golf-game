/**
 * Captain's lineup helpers: empty lineups, slot assignment with swaps,
 * validation and the "Auto-alinear" optimiser.
 */
import { ENGINE_CONFIG, type EngineConfig } from '../config/gameConfig';
import type { GameModeDef, Lineup, MatchFormat, Player } from '../types/game';
import { individualRating, pairRating } from './rating';

/** Number of player slots per match for a format. */
export function slotsPerMatch(format: MatchFormat): 1 | 2 {
  return format === 'singles' ? 1 : 2;
}

/** Creates a lineup with every slot empty. */
export function emptyLineup(mode: GameModeDef): Lineup {
  return mode.sessions.map((s) => Array.from({ length: s.matches }, () => Array(slotsPerMatch(s.format)).fill(null)));
}

/**
 * Places `playerId` in a slot. If the player already sits elsewhere in the same
 * session, the two slots are swapped, so a session never contains duplicates.
 *
 * @param lineup - Current lineup (not mutated).
 * @param si - Session index.
 * @param mi - Match index.
 * @param slot - Slot index inside the match (0 or 1).
 * @param playerId - Player to place, or `null` to clear the slot.
 * @returns A new lineup.
 */
export function assignSlot(lineup: Lineup, si: number, mi: number, slot: number, playerId: string | null): Lineup {
  const next = lineup.map((s) => s.map((m) => [...m]));
  const session = next[si];
  const previous = session[mi][slot];
  if (playerId != null) {
    for (let m = 0; m < session.length; m++) {
      for (let k = 0; k < session[m].length; k++) {
        if (session[m][k] === playerId && !(m === mi && k === slot)) session[m][k] = previous;
      }
    }
  }
  session[mi][slot] = playerId;
  return next;
}

/** A lineup validation problem. */
export interface LineupIssue {
  sessionIndex: number;
  message: string;
}

/**
 * Validates a lineup: every slot filled, no duplicates within a session and
 * only team members used.
 * @returns List of issues (empty = valid).
 */
export function validateLineup(lineup: Lineup, mode: GameModeDef, teamIds: readonly string[]): LineupIssue[] {
  const issues: LineupIssue[] = [];
  mode.sessions.forEach((s, si) => {
    const ids = (lineup[si] ?? []).flat();
    const expected = s.matches * slotsPerMatch(s.format);
    const filled = ids.filter((x): x is string => x != null);
    if (filled.length < expected) issues.push({ sessionIndex: si, message: `${s.label}: faltan ${expected - filled.length} huecos` });
    if (new Set(filled).size !== filled.length) issues.push({ sessionIndex: si, message: `${s.label}: jugador repetido` });
    if (filled.some((id) => !teamIds.includes(id))) issues.push({ sessionIndex: si, message: `${s.label}: jugador fuera del equipo` });
  });
  return issues;
}

/** Number of filled slots / total slots. */
export function lineupProgress(lineup: Lineup): { filled: number; total: number } {
  const all = lineup.flat(2);
  return { filled: all.filter((x) => x != null).length, total: all.length };
}

/**
 * Exhaustively finds the best `pairs` disjoint pairs from `players`, maximising
 * the sum of `score(i, j)`. Search size for 12 players / 4 pairs ≈ 52k leaves.
 */
function bestPairing(n: number, pairs: number, score: (i: number, j: number) => number): [number, number][] {
  let best = -Infinity;
  let bestSet: [number, number][] = [];
  const current: [number, number][] = [];
  const used = new Array<boolean>(n).fill(false);

  const rec = (start: number, pairsLeft: number, restsLeft: number, acc: number) => {
    if (pairsLeft === 0) {
      if (acc > best) {
        best = acc;
        bestSet = [...current];
      }
      return;
    }
    let i = start;
    while (i < n && used[i]) i++;
    if (i >= n) return;
    used[i] = true;
    if (restsLeft > 0) rec(i + 1, pairsLeft, restsLeft - 1, acc); // i rests
    for (let j = i + 1; j < n; j++) {
      if (used[j]) continue;
      used[j] = true;
      current.push([i, j]);
      rec(i + 1, pairsLeft - 1, restsLeft, acc + score(i, j));
      current.pop();
      used[j] = false;
    }
    used[i] = false;
  };
  rec(0, pairs, n - 2 * pairs, 0);
  return bestSet;
}

/**
 * "Auto-alinear": proposes a full lineup for a team.
 *
 * - Pair sessions: exhaustive search of the pairing that maximises the sum of
 *   format ratings (chemistry, putt and complementarity bonuses included), with a
 *   small fatigue penalty per previous pair session so rests rotate when ratings
 *   are close. Pairs are ordered strongest first.
 * - Singles: players ordered by individual rating.
 */
export function autoLineup(team: readonly Player[], mode: GameModeDef, cfg: EngineConfig = ENGINE_CONFIG): Lineup {
  const n = team.length;
  const appearances = new Array<number>(n).fill(0);
  const lineup: Lineup = [];

  for (const session of mode.sessions) {
    if (session.format === 'singles') {
      const order = [...team].sort((a, b) => individualRating(b, cfg) - individualRating(a, cfg));
      lineup.push(order.slice(0, session.matches).map((p) => [p.id]));
      continue;
    }
    const format = session.format;
    const pr = (i: number, j: number) => pairRating(team[i], team[j], format, cfg).rating;
    const penalty = cfg.autoLineup.fatiguePenalty;
    const pairs = bestPairing(n, Math.min(session.matches, Math.floor(n / 2)), (i, j) => pr(i, j) - penalty * (appearances[i] + appearances[j]));
    pairs.sort((x, y) => pr(y[0], y[1]) - pr(x[0], x[1]));
    for (const [i, j] of pairs) {
      appearances[i]++;
      appearances[j]++;
    }
    lineup.push(pairs.map(([i, j]) => [team[i].id, team[j].id]));
  }
  return lineup;
}
