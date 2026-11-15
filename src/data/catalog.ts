/**
 * Static player catalogue. The JSON is versioned in the repo and can be edited
 * without touching code (see README → "Editar el catálogo").
 */
import raw from './players.json';
import type { Player } from '../types/game';

/** All players in the catalogue. */
export const PLAYERS: readonly Player[] = raw as Player[];

/** Lookup table by player id. */
export const PLAYERS_BY_ID: Readonly<Record<string, Player>> = Object.fromEntries(
  PLAYERS.map((p) => [p.id, p]),
);

/** Returns the player with `id` or throws (ids come from our own state, so a miss is a bug). */
export function getPlayer(id: string): Player {
  const p = PLAYERS_BY_ID[id];
  if (!p) throw new Error(`Unknown player id: ${id}`);
  return p;
}
