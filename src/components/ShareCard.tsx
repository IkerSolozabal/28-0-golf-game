import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { forwardRef } from 'react';
import { getPlayer } from '../data/catalog';
import { formatScore } from '../engine/simulator';
import { SIDE_COLORS, SIDE_NAMES } from '../theme/theme';
import type { CupResult } from '../types/game';
import { initials } from './PlayerAvatar';

/** Props for {@link ShareCard}. */
export interface ShareCardProps {
  result: CupResult;
  team: string[];
}

/**
 * The shareable result card (4:5, 360×450 CSS px, exported at 3× = 1080×1350).
 * Rendered as plain DOM so `html-to-image` can rasterise it in the browser.
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard({ result, team }, ref) {
  const side = result.userSide;
  const rivalSide = side === 'EU' ? 'USA' : 'EU';
  const c = SIDE_COLORS[side];
  const won = result.pointsUser > result.pointsRival;
  const draw = result.pointsUser === result.pointsRival;
  const headline = result.perfect
    ? '¡Partido perfecto!'
    : won
      ? `${SIDE_NAMES[side]} gana`
      : draw
        ? 'Empate'
        : `${SIDE_NAMES[rivalSide]} gana`;
  const mvp = result.mvp ? getPlayer(result.mvp.playerId) : null;
  const pair = result.bestPair?.playerIds.map(getPlayer);

  return (
    <Box
      ref={ref}
      sx={{
        width: 360,
        height: 450,
        flexShrink: 0,
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        color: '#F6F3EA',
        background: `radial-gradient(120% 80% at 50% 0%, #2F6A50 0%, #1F4D3A 45%, #0F2E21 100%)`,
        fontFamily: 'Inter, sans-serif',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box sx={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em', px: 1, borderRadius: 1.5, bgcolor: '#F6F3EA', color: '#1F4D3A' }}>
          {result.totalPoints}-0
        </Box>
        <Typography sx={{ fontSize: 11, opacity: 0.75, letterSpacing: '0.1em' }}>EUROPA vs EE. UU.</Typography>
      </Stack>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', opacity: 0.8 }}>
          {SIDE_NAMES[side].toUpperCase()} · {SIDE_NAMES[rivalSide].toUpperCase()}
        </Typography>
        <Typography sx={{ fontSize: 72, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.05 }}>
          {formatScore(result.pointsUser)}–{formatScore(result.pointsRival)}
        </Typography>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#E2C98F' }}>{headline}</Typography>
      </Box>

      <Stack direction="row" justifyContent="center" flexWrap="wrap" sx={{ gap: 0.75, mt: 2.5 }}>
        {team.map((id) => {
          const p = getPlayer(id);
          return (
            <Box
              key={id}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 14,
                bgcolor: c.main,
                boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.35)',
              }}
            >
              {initials(p.nombre)}
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ mt: 'auto', bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '16px', p: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.12em' }}>MVP</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }} noWrap>
              {mvp?.nombre ?? '—'}
            </Typography>
          </Box>
          <Box sx={{ minWidth: 0, textAlign: 'right' }}>
            <Typography sx={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.12em' }}>MEJOR PAREJA</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }} noWrap>
              {pair ? pair.map((p) => p.nombre.split(' ').slice(-1)[0]).join(' + ') : '—'}
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Typography sx={{ fontSize: 10, opacity: 0.6, textAlign: 'center', mt: 1.5 }}>
        Semilla {result.seed} · ¿Puedes hacer el {result.totalPoints}-0?
      </Typography>
    </Box>
  );
});
