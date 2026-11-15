import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { individualRating } from '../engine/rating';
import type { Player } from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';

const ATTRS: { key: keyof Pick<Player, 'driver' | 'hierros' | 'juegoCorto' | 'putt'>; label: string }[] = [
  { key: 'driver', label: 'DRV' },
  { key: 'hierros', label: 'HIE' },
  { key: 'juegoCorto', label: 'JC' },
  { key: 'putt', label: 'PUT' },
];

/** Compact attribute bars (driver, hierros, juego corto, putt). */
export function AttributeBars({ player }: { player: Player }) {
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
      {ATTRS.map((a) => (
        <Box key={a.key} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              {a.label}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700 }}>
              {player[a.key]}
            </Typography>
          </Stack>
          <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(31,77,58,0.12)', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${Math.max(0, (player[a.key] - 50) * 2)}%`, bgcolor: 'primary.main' }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

/** Props for {@link PlayerCard}. */
export interface PlayerCardProps {
  player: Player;
  /** Show stats (classic mode) or only name + decade (GolfIQ). */
  showStats?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

/** Selectable player card used in the draft list. */
export function PlayerCard({ player, showStats = true, selected = false, onClick }: PlayerCardProps) {
  return (
    <Card
      sx={{
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : undefined,
        bgcolor: selected ? 'rgba(31,77,58,0.06)' : 'background.paper',
        transition: 'all .15s ease',
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 1.5 }} aria-pressed={selected}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <PlayerAvatar player={player} size={44} filled={selected} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography fontWeight={700} noWrap sx={{ flex: 1 }}>
                {player.nombre}
              </Typography>
              {showStats && <Chip size="small" color="primary" label={individualRating(player).toFixed(0)} />}
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {showStats
                ? `${player.pais} · ${player.decada}s · ${player.majors} majors · ${player.victorias} vict.`
                : `Años ${player.decada}`}
            </Typography>
            {showStats && <AttributeBars player={player} />}
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
