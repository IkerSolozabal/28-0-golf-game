/**
 * Domain types for 28-0.
 *
 * Field names follow the PDF data model ("Modelo de datos → Jugador") translated to
 * ASCII camelCase so they are valid, typo-safe TypeScript identifiers.
 */

/** Team side. `EU` = Europa, `USA` = Estados Unidos. */
export type Side = 'EU' | 'USA';

/** The four men's major championships. */
export type MajorName = 'Masters' | 'US Open' | 'The Open' | 'PGA Championship';

/** Match formats used in the competition. */
export type MatchFormat = 'foursomes' | 'fourballs' | 'singles';

/**
 * One catalogue entry: a player at their peak decade ("una ficha por jugador y década de pico").
 */
export interface Player {
  /** Unique key, e.g. `seve-1980s`. */
  id: string;
  /** Display name. */
  nombre: string;
  /** Side used to filter the draft. */
  bando: Side;
  /** Country (Spanish name), used by the roulette. */
  pais: string;
  /** Peak decade, e.g. `1980`. Used by the roulette and the era adjustment. */
  decada: number;
  /** Career major wins. */
  majors: number;
  /**
   * Which majors the player won (unique names).
   * Extension to the PDF schema, required to resolve "década + major" roulette spins.
   */
  majorsGanados: MajorName[];
  /** Approximate professional wins worldwide. */
  victorias: number;
  /** Best Official World Golf Ranking position; `null` if the peak predates 1986. */
  mejorRankingMundial: number | null;
  /** Team-competition record as `"W-L-H"` (ganados-perdidos-empatados). */
  recordEquipos: string;
  /** Driving attribute, 0-100. */
  driver: number;
  /** Iron play attribute, 0-100. */
  hierros: number;
  /** Short game attribute, 0-100. */
  juegoCorto: number;
  /** Putting attribute, 0-100. */
  putt: number;
  /** Ids of historic partners (chemistry bonus in pair formats). */
  parejasHistoricas: string[];
}

/** Draft-visibility variant. `golfiq` hides stats (name + decade only). */
export type GameVariant = 'classic' | 'golfiq';

/** Identifier of a game mode defined in `gameConfig`. */
export type GameModeId = 'quick' | 'full';

/** Machine rival strength. */
export type Difficulty = 'easy' | 'normal' | 'hard';

/** One session of the competition (e.g. "Viernes mañana · Foursomes"). */
export interface SessionDef {
  id: string;
  /** Short label, e.g. "Viernes mañana". */
  label: string;
  format: MatchFormat;
  /** Number of matches (= points) in the session. */
  matches: number;
}

/** A game mode (team size + session structure). */
export interface GameModeDef {
  id: GameModeId;
  name: string;
  teamSize: number;
  sessions: SessionDef[];
  /** Feature flag: modes not yet released show as "Fase 2" in the UI. */
  enabled: boolean;
}

/**
 * Lineup for one session: an array of matches, each holding player ids
 * (2 slots for pair formats, 1 for singles). `null` = empty slot.
 */
export type SessionLineup = (string | null)[][];

/** Full lineup, aligned index-by-index with `GameModeDef.sessions`. */
export type Lineup = SessionLineup[];

/** Result of a roulette spin. */
export type SpinResult =
  | { kind: 'country'; decade: number; country: string }
  | { kind: 'major'; decade: number; major: MajorName };

/** Points for the user side in one match: win, halve or loss. */
export type MatchPoints = 1 | 0.5 | 0;

/** Outcome of a single simulated match. */
export interface MatchResult {
  sessionId: string;
  format: MatchFormat;
  /** 0-based index inside the session. */
  index: number;
  user: string[];
  rival: string[];
  /** Format rating for each side. */
  ratingUser: number;
  ratingRival: number;
  /** Logistic win probability for the user side (before the draw roll). */
  pWin: number;
  /** Points won by the user side. */
  points: MatchPoints;
  /** Match-play margin, e.g. "3&2", "1 up" or "AS" (all square). */
  margin: string;
}

/** Aggregated outcome of a session. */
export interface SessionResult {
  session: SessionDef;
  matches: MatchResult[];
  pointsUser: number;
  pointsRival: number;
  /** Running score after this session. */
  cumulativeUser: number;
  cumulativeRival: number;
}

/** Per-player contribution (used for MVP). */
export interface PlayerContribution {
  playerId: string;
  points: number;
  played: number;
}

/** Per-pair contribution (used for "mejor pareja"). */
export interface PairContribution {
  playerIds: [string, string];
  points: number;
  played: number;
}

/** Full simulated competition. */
export interface CupResult {
  seed: string;
  modeId: GameModeId;
  userSide: Side;
  sessions: SessionResult[];
  pointsUser: number;
  pointsRival: number;
  totalPoints: number;
  /** True when the user wins every point (28-0 / 14-0). */
  perfect: boolean;
  mvp: PlayerContribution | null;
  bestPair: PairContribution | null;
}
