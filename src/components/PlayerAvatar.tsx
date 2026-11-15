import Avatar from '@mui/material/Avatar';
import type { Player } from '../types/game';
import { SIDE_COLORS } from '../theme/theme';

/**
 * Initials for a player name: first + last word (ignoring suffixes like "III").
 * `"José María Olazábal" → "JO"`.
 */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => !/^(I{1,3}|IV|Jr\.?)$/.test(w));
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Props for {@link PlayerAvatar}. */
export interface PlayerAvatarProps {
  player: Player;
  size?: number;
  /** Render with a solid team colour instead of the tonal container. */
  filled?: boolean;
}

/**
 * Stylised initials avatar (no photos, per the legal constraints of the spec).
 * Tonal team-coloured container with a thin ring.
 */
export function PlayerAvatar({ player, size = 40, filled = false }: PlayerAvatarProps) {
  const c = SIDE_COLORS[player.bando];
  return (
    <Avatar
      aria-label={player.nombre}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        bgcolor: filled ? c.main : c.container,
        color: filled ? '#fff' : c.on,
        boxShadow: `inset 0 0 0 2px ${filled ? 'rgba(255,255,255,0.35)' : c.main + '33'}`,
      }}
    >
      {initials(player.nombre)}
    </Avatar>
  );
}
