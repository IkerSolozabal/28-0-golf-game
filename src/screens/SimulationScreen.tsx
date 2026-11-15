import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { getPlayer } from '../data/catalog';
import { formatScore } from '../engine/simulator';
import { useGame } from '../state/GameContext';
import { SIDE_COLORS } from '../theme/theme';
import type { MatchResult, SessionResult } from '../types/game';
import { FORMAT_INFO } from './LineupScreen';

const REVEAL_MS = 1400;

const surname = (id: string) => getPlayer(id).nombre.split(' ').filter((w) => w !== 'III').slice(-1)[0];

/** One match row: user side vs rival side with the match-play margin. */
function MatchRow({ m }: { m: MatchResult }) {
  const color = m.points === 1 ? 'success.main' : m.points === 0 ? 'error.main' : 'text.secondary';
  const label = m.points === 1 ? `Gana ${m.margin}` : m.points === 0 ? `Pierde ${m.margin}` : 'Empate';
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
      <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap fontWeight={m.points === 1 ? 700 : 400}>
        {m.user.map(surname).join(' + ')}
      </Typography>
      <Typography variant="caption" sx={{ color, fontWeight: 700, minWidth: 74, textAlign: 'center' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, textAlign: 'right' }} noWrap color="text.secondary" fontWeight={m.points === 0 ? 700 : 400}>
        {m.rival.map(surname).join(' + ')}
      </Typography>
    </Stack>
  );
}

/** Card with a session's partial score and its matches. */
export function SessionCard({ s, highlight }: { s: SessionResult; highlight?: boolean }) {
  return (
    <Card sx={{ p: 1.5, borderColor: highlight ? 'primary.main' : undefined, borderWidth: highlight ? 2 : 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography fontWeight={700}>
          {s.session.label} · {FORMAT_INFO[s.session.format].name}
        </Typography>
        <Typography fontWeight={800}>
          {formatScore(s.pointsUser)} – {formatScore(s.pointsRival)}
        </Typography>
      </Stack>
      <Box sx={{ mt: 0.5 }}>
        {s.matches.map((m) => (
          <MatchRow key={m.index} m={m} />
        ))}
      </Box>
    </Card>
  );
}

/**
 * Simulation phase: the (already computed, seeded) result is revealed session
 * by session with a running score, as in the spec mock-up.
 */
export function SimulationScreen() {
  const { state, dispatch } = useGame();
  const result = state.result!;
  const [revealed, setRevealed] = useState(0);
  const total = result.sessions.length;

  useEffect(() => {
    if (revealed >= total) return;
    const t = window.setTimeout(() => setRevealed((n) => n + 1), revealed === 0 ? 500 : REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [revealed, total]);

  const last = revealed > 0 ? result.sessions[revealed - 1] : null;
  const user = last?.cumulativeUser ?? 0;
  const rival = last?.cumulativeRival ?? 0;
  const done = revealed >= total;
  const side = state.settings.side;
  const rivalSide = side === 'EU' ? 'USA' : 'EU';

  return (
    <Stack spacing={2} sx={{ py: 3 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="overline" color="text.secondary">
          {done ? 'Final' : 'Simulando…'}
        </Typography>
        <Typography variant="h2" sx={{ fontSize: 64, lineHeight: 1.05 }} aria-live="polite">
          <Box component="span" sx={{ color: SIDE_COLORS[side].main }}>
            {formatScore(user)}
          </Box>
          {' – '}
          <Box component="span" sx={{ color: SIDE_COLORS[rivalSide].main }}>
            {formatScore(rival)}
          </Box>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {side === 'EU' ? 'EUR · USA' : 'USA · EUR'}
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={(revealed / total) * 100} />

      <Stack spacing={1.25}>
        {result.sessions.slice(0, revealed).map((s, i) => (
          <Collapse in key={s.session.id} appear>
            <SessionCard s={s} highlight={i === revealed - 1 && !done} />
          </Collapse>
        ))}
      </Stack>

      <Stack direction="row" spacing={1}>
        {!done && (
          <Button variant="outlined" onClick={() => setRevealed(total)} sx={{ flex: 1 }}>
            Saltar
          </Button>
        )}
        <Button variant="contained" disabled={!done} onClick={() => dispatch({ type: 'SHOW_RESULT' })} sx={{ flex: 1 }}>
          Ver resultado
        </Button>
      </Stack>
    </Stack>
  );
}
