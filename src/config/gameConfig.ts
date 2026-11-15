/**
 * Game balance and structure configuration.
 *
 * Everything that affects balance (rating weights, logistic `k`, draw rate,
 * format bonuses, rival difficulty) lives here so it can be tuned without
 * touching the simulation engine. See `docs/SIMULATION_MATH.md`.
 */
import type { Difficulty, GameModeDef, GameModeId, Side } from '../types/game';

/** Shape of the tunable engine configuration. */
export interface EngineConfig {
  rating: {
    /** R = achievements·L + profile·P + team·T (PDF: 0.35 / 0.45 / 0.20). */
    weights: { achievements: number; profile: number; team: number };
    achievements: {
      /** Majors that saturate the majors score (Nicklaus = 18). */
      majorsCap: number;
      /** Wins that saturate the wins score. */
      winsCap: number;
      /** Ranking position that maps to a ranking score of 0. */
      rankingFloor: number;
      /** Sub-weights when a world ranking exists (sum = 1). */
      withRanking: { majors: number; wins: number; ranking: number };
      /** Sub-weights for pre-1986 players without ranking (sum = 1). */
      withoutRanking: { majors: number; wins: number };
    };
    team: {
      /** Bayesian prior (virtual matches at 50 %) to shrink small samples. */
      priorMatches: number;
    };
    /** Additive rating adjustment per peak decade ("ajuste de época"). */
    eraAdjustment: Record<number, number>;
  };
  formats: {
    fourballs: {
      maxWeight: number;
      minWeight: number;
      /** Both players need `putt >= puttThreshold` to earn the bonus. */
      puttThreshold: number;
      puttBonus: number;
    };
    foursomes: {
      /** Multiplier applied to sqrt(driverGap · ironGap) when complementary. */
      complementarityFactor: number;
      complementarityCap: number;
      /** Bonus for historic partners (PDF: +3). */
      chemistryBonus: number;
    };
    fourballsChemistryBonus: number;
  };
  match: {
    /** Logistic scale: a 10-point gap with k = 25 ≈ 72 % win probability. */
    k: number;
    /** Fixed probability that a match is halved (PDF: ~10 %). */
    drawProbability: number;
  };
  rival: Record<Difficulty, { label: string; poolStart: number; poolSizeFactor: number }>;
  roulette: {
    /** Probability that a spin is "década + major" instead of "década + país". */
    majorSpinProbability: Record<Side, number>;
    /** Number of wheel segments drawn. */
    segments: number;
  };
}

/** Default (initial) engine configuration from the PDF proposal. */
export const ENGINE_CONFIG: EngineConfig = {
  rating: {
    weights: { achievements: 0.35, profile: 0.45, team: 0.2 },
    achievements: {
      majorsCap: 18,
      winsCap: 100,
      rankingFloor: 50,
      withRanking: { majors: 0.45, wins: 0.35, ranking: 0.2 },
      withoutRanking: { majors: 0.55, wins: 0.45 },
    },
    team: { priorMatches: 6 },
    eraAdjustment: { 1960: 0, 1970: 0, 1980: 0, 1990: 0, 2000: 0, 2010: 0, 2020: 0 },
  },
  formats: {
    fourballs: { maxWeight: 0.65, minWeight: 0.35, puttThreshold: 85, puttBonus: 2 },
    foursomes: { complementarityFactor: 0.3, complementarityCap: 3, chemistryBonus: 3 },
    fourballsChemistryBonus: 0,
  },
  match: { k: 25, drawProbability: 0.1 },
  rival: {
    // Rival is drawn at random from the other side's rating-sorted list:
    // ranks [poolStart, poolStart + teamSize·poolSizeFactor).
    easy: { label: 'Fácil', poolStart: 0.5, poolSizeFactor: 2 },
    normal: { label: 'Normal', poolStart: 0, poolSizeFactor: 2 },
    hard: { label: 'Leyenda', poolStart: 0, poolSizeFactor: 1 },
  },
  roulette: {
    majorSpinProbability: { EU: 0.35, USA: 0.6 },
    segments: 8,
  },
};

/**
 * Session structure per mode. The full mode replicates the classic 28-point
 * format; the quick mode halves every session (14 points).
 */
export const GAME_MODES: Record<GameModeId, GameModeDef> = {
  quick: {
    id: 'quick',
    name: 'Rápido',
    teamSize: 6,
    enabled: true,
    sessions: [
      { id: 'fri-am', label: 'Viernes mañana', format: 'foursomes', matches: 2 },
      { id: 'fri-pm', label: 'Viernes tarde', format: 'fourballs', matches: 2 },
      { id: 'sat-am', label: 'Sábado mañana', format: 'foursomes', matches: 2 },
      { id: 'sat-pm', label: 'Sábado tarde', format: 'fourballs', matches: 2 },
      { id: 'sun', label: 'Domingo', format: 'singles', matches: 6 },
    ],
  },
  full: {
    id: 'full',
    name: 'Completo',
    teamSize: 12,
    enabled: false, // Fase 2
    sessions: [
      { id: 'fri-am', label: 'Viernes mañana', format: 'foursomes', matches: 4 },
      { id: 'fri-pm', label: 'Viernes tarde', format: 'fourballs', matches: 4 },
      { id: 'sat-am', label: 'Sábado mañana', format: 'foursomes', matches: 4 },
      { id: 'sat-pm', label: 'Sábado tarde', format: 'fourballs', matches: 4 },
      { id: 'sun', label: 'Domingo', format: 'singles', matches: 12 },
    ],
  },
};

/** Feature flag for the GolfIQ variant (stats hidden during the draft). Fase 2. */
export const GOLFIQ_ENABLED = false;

/** Total points available in a mode. */
export function totalPoints(mode: GameModeDef): number {
  return mode.sessions.reduce((sum, s) => sum + s.matches, 0);
}
