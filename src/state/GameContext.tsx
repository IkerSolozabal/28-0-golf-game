/**
 * Game state machine: home → draft → lineup → simulation → result → (home).
 *
 * The reducer is pure and deterministic: every random step derives its RNG from
 * `state.seed`, so a game can be replayed from its seed + choices.
 */
import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { GAME_MODES } from '../config/gameConfig';
import { PLAYERS, getPlayer } from '../data/catalog';
import { generateRivalTeam, otherSide } from '../engine/draft';
import { autoLineup, emptyLineup } from '../engine/lineup';
import { deriveRng, randomSeed } from '../engine/rng';
import { simulateCup } from '../engine/simulator';
import type { CupResult, Difficulty, GameModeDef, GameModeId, GameVariant, Lineup, Side } from '../types/game';
import { track } from '../lib/analytics';

/** Phases of a game (see docs/ARCHITECTURE.md state diagram). */
export type Phase = 'home' | 'draft' | 'lineup' | 'simulation' | 'result';

/** Choices made on the home screen. */
export interface GameSettings {
  side: Side;
  modeId: GameModeId;
  variant: GameVariant;
  difficulty: Difficulty;
}

/** Whole game state. */
export interface GameState {
  phase: Phase;
  settings: GameSettings;
  seed: string;
  /** Drafted player ids, in pick order. */
  picks: string[];
  /** Rival player ids (generated when the draft completes). */
  rival: string[];
  lineup: Lineup;
  rivalLineup: Lineup;
  result: CupResult | null;
}

/** Reducer actions. */
export type GameAction =
  | { type: 'START'; settings: GameSettings; seed?: string }
  | { type: 'PICK'; playerId: string }
  | { type: 'SET_LINEUP'; lineup: Lineup }
  | { type: 'SIMULATE' }
  | { type: 'SHOW_RESULT' }
  | { type: 'RESET' };

const DEFAULT_SETTINGS: GameSettings = { side: 'EU', modeId: 'quick', variant: 'classic', difficulty: 'normal' };

/** Initial state (home screen). */
export const initialState: GameState = {
  phase: 'home',
  settings: DEFAULT_SETTINGS,
  seed: '',
  picks: [],
  rival: [],
  lineup: [],
  rivalLineup: [],
  result: null,
};

/** Mode definition for the current settings. */
export function modeOf(state: GameState): GameModeDef {
  return GAME_MODES[state.settings.modeId];
}

/** Pure reducer implementing the game state machine. */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START': {
      const mode = GAME_MODES[action.settings.modeId];
      return {
        ...initialState,
        phase: 'draft',
        settings: action.settings,
        seed: action.seed ?? randomSeed(),
        lineup: emptyLineup(mode),
      };
    }
    case 'PICK': {
      if (state.phase !== 'draft' || state.picks.includes(action.playerId)) return state;
      const mode = modeOf(state);
      const picks = [...state.picks, action.playerId];
      if (picks.length < mode.teamSize) return { ...state, picks };
      // Team complete → generate rival and its lineup.
      const userTeam = picks.map(getPlayer);
      const rivalTeam = generateRivalTeam(
        PLAYERS,
        otherSide(state.settings.side),
        mode.teamSize,
        state.settings.difficulty,
        deriveRng(state.seed, 'rival'),
        userTeam,
      );
      return {
        ...state,
        picks,
        phase: 'lineup',
        rival: rivalTeam.map((p) => p.id),
        rivalLineup: autoLineup(rivalTeam, mode),
        lineup: emptyLineup(mode),
      };
    }
    case 'SET_LINEUP':
      return state.phase === 'lineup' ? { ...state, lineup: action.lineup } : state;
    case 'SIMULATE': {
      if (state.phase !== 'lineup') return state;
      const result = simulateCup({
        mode: modeOf(state),
        userSide: state.settings.side,
        userLineup: state.lineup,
        rivalLineup: state.rivalLineup,
        seed: state.seed,
        resolve: getPlayer,
      });
      return { ...state, phase: 'simulation', result };
    }
    case 'SHOW_RESULT':
      return state.phase === 'simulation' ? { ...state, phase: 'result' } : state;
    case 'RESET':
      return { ...initialState, settings: state.settings };
    default:
      return state;
  }
}

const GameContext = createContext<{ state: GameState; dispatch: Dispatch<GameAction> } | null>(null);

/** Provides the game state to the component tree. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(gameReducer, initialState);
  const value = useMemo(() => {
    const dispatch: Dispatch<GameAction> = (action) => {
      if (action.type === 'START') track('game_started', { ...action.settings });
      if (action.type === 'SHOW_RESULT') track('game_finished', { seed: state.seed });
      rawDispatch(action);
    };
    return { state, dispatch };
  }, [state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/** Hook to read the game state and dispatch actions. */
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
