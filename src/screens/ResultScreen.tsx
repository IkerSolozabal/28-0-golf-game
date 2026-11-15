import DownloadRounded from '@mui/icons-material/DownloadRounded';
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import IosShareRounded from '@mui/icons-material/IosShareRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { ShareCard } from '../components/ShareCard';
import { getPlayer } from '../data/catalog';
import { formatScore } from '../engine/simulator';
import { track } from '../lib/analytics';
import { downloadBlob, nodeToPngBlob, shareOrDownload } from '../lib/share';
import { useGame } from '../state/GameContext';
import { SIDE_NAMES } from '../theme/theme';
import { SessionCard } from './SimulationScreen';

/**
 * Final screen: score, verdict, MVP, best pair, shareable card and replay.
 */
export function ResultScreen() {
  const { state, dispatch } = useGame();
  const result = state.result!;
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastIsError = toast === 'No se pudo generar la imagen';

  const side = result.userSide;
  const rivalSide = side === 'EU' ? 'USA' : 'EU';
  const won = result.pointsUser > result.pointsRival;
  const draw = result.pointsUser === result.pointsRival;
  const verdict = result.perfect
    ? `¡${result.totalPoints}-0! Partido perfecto`
    : won
      ? `${SIDE_NAMES[side]} gana la copa`
      : draw
        ? 'Empate'
        : `${SIDE_NAMES[rivalSide]} gana la copa`;
  const mvp = result.mvp ? getPlayer(result.mvp.playerId) : null;
  const pair = result.bestPair ? result.bestPair.playerIds.map(getPlayer) : null;
  const filename = `28-0-${result.seed}.png`;
  const shareText = `${SIDE_NAMES[side]} ${formatScore(result.pointsUser)}-${formatScore(result.pointsRival)} ${SIDE_NAMES[rivalSide]} en 28-0. ¿Puedes hacer el ${result.totalPoints}-0?`;

  const exportCard = async (mode: 'share' | 'download') => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const blob = await nodeToPngBlob(cardRef.current);
      if (mode === 'download') {
        downloadBlob(blob, filename);
        setToast('Imagen descargada');
      } else {
        const r = await shareOrDownload(blob, filename, shareText);
        if (r !== 'cancelled') setToast(r === 'shared' ? 'Tarjeta compartida' : 'Imagen descargada');
      }
      track('game_shared', { seed: result.seed, mode });
    } catch {
      setToast('No se pudo generar la imagen');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ py: 3 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="overline" color="text.secondary">
          Resultado final
        </Typography>
        <Typography variant="h1" sx={{ fontSize: 80, lineHeight: 1 }}>
          {formatScore(result.pointsUser)}–{formatScore(result.pointsRival)}
        </Typography>
        <Typography variant="h6" color={won ? 'success.main' : draw ? 'text.secondary' : 'error.main'} sx={{ mt: 1 }}>
          {verdict}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1.25}>
        <Card sx={{ flex: 1, p: 1.5 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <EmojiEventsRounded fontSize="small" color="secondary" />
            <Typography variant="overline" color="text.secondary">
              MVP
            </Typography>
          </Stack>
          {mvp && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <PlayerAvatar player={mvp} size={36} filled />
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} variant="body2" noWrap>
                  {mvp.nombre}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatScore(result.mvp!.points)} pts en {result.mvp!.played} partidos
                </Typography>
              </Box>
            </Stack>
          )}
        </Card>
        <Card sx={{ flex: 1, p: 1.5 }}>
          <Typography variant="overline" color="text.secondary">
            Mejor pareja
          </Typography>
          {pair && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Stack direction="row" sx={{ '& > *:last-child': { ml: -1.5 } }}>
                {pair.map((p) => (
                  <PlayerAvatar key={p.id} player={p} size={36} />
                ))}
              </Stack>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} variant="body2" noWrap>
                  {pair.map((p) => p.nombre.split(' ').slice(-1)[0]).join(' + ')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatScore(result.bestPair!.points)}/{result.bestPair!.played} pts
                </Typography>
              </Box>
            </Stack>
          )}
        </Card>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <Box sx={{ transform: { xs: 'scale(0.9)', sm: 'none' }, transformOrigin: 'top center', mb: { xs: '-45px', sm: 0 } }}>
          <ShareCard ref={cardRef} result={result} team={state.picks} />
        </Box>
      </Box>

      <Stack spacing={1}>
        <Button variant="contained" size="large" startIcon={<IosShareRounded />} disabled={busy} onClick={() => exportCard('share')}>
          Compartir tarjeta
        </Button>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<DownloadRounded />} disabled={busy} onClick={() => exportCard('download')} sx={{ flex: 1 }}>
            Descargar
          </Button>
          <Button variant="outlined" startIcon={<ReplayRounded />} onClick={() => dispatch({ type: 'RESET' })} sx={{ flex: 1 }}>
            Jugar otra vez
          </Button>
        </Stack>
      </Stack>

      <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: '20px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreRounded />}>
          <Typography fontWeight={600}>Detalle por sesiones</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.25}>
            {result.sessions.map((s) => (
              <SessionCard key={s.session.id} s={s} />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Typography variant="caption" color="text.secondary" textAlign="center">
        Semilla de la partida: <b>{result.seed}</b> · el mismo draft y alineación con esta semilla reproducen el resultado.
      </Typography>

      <Snackbar open={toast != null} autoHideDuration={2500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toastIsError ? 'error' : 'success'} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 3 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
