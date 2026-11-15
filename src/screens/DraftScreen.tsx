import CasinoRounded from '@mui/icons-material/CasinoRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { PlayerCard } from '../components/PlayerCard';
import { Roulette } from '../components/Roulette';
import { PLAYERS, getPlayer } from '../data/catalog';
import { filterBySpin, spinLabel, spinRoulette, spinShortLabel, type RouletteSpin } from '../engine/draft';
import { deriveRng } from '../engine/rng';
import { modeOf, useGame } from '../state/GameContext';
import { SIDE_NAMES } from '../theme/theme';

/**
 * Draft phase: spin the roulette, pick one player from the filtered list,
 * repeat until the team is full. Each spin uses an RNG derived from the game
 * seed and turn number, so the sequence is reproducible.
 */
export function DraftScreen() {
  const { state, dispatch } = useGame();
  const mode = modeOf(state);
  const { side, variant } = state.settings;
  const turn = state.picks.length;

  const [spin, setSpin] = useState<RouletteSpin | null>(null);
  const [spinId, setSpinId] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // Reset the turn UI whenever a pick is made.
  useEffect(() => {
    setSpin(null);
    setRevealed(false);
    setSelected(null);
  }, [turn]);

  const idleLabels = useMemo(
    () => spinRoulette(PLAYERS, side, [], deriveRng(state.seed, 'idle')).segments.map(spinShortLabel),
    [side, state.seed],
  );

  const options = useMemo(
    () => (spin && revealed ? filterBySpin(PLAYERS, side, spin.result, state.picks) : []),
    [spin, revealed, side, state.picks],
  );

  const doSpin = () => {
    const s = spinRoulette(PLAYERS, side, state.picks, deriveRng(state.seed, `spin:${turn}`));
    setSpin(s);
    setRevealed(false);
    setSelected(null);
    setSpinId((n) => n + 1);
  };

  const spinning = spin != null && !revealed;

  return (
    <Stack spacing={2.5} sx={{ py: 2, pb: 14 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="overline" color="text.secondary">
          {SIDE_NAMES[side]} · Turno {Math.min(turn + 1, mode.teamSize)} de {mode.teamSize}
        </Typography>
      </Box>

      <Roulette
        labels={spin ? spin.segments.map(spinShortLabel) : idleLabels}
        targetIndex={spin?.targetIndex ?? null}
        spinId={spinId}
        onDone={() => setRevealed(true)}
      />

      <Box sx={{ textAlign: 'center', minHeight: 72 }}>
        {revealed && spin ? (
          <Fade in>
            <Box>
              <Typography variant="h4">{spinLabel(spin.result)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {options.length} {options.length === 1 ? 'jugador disponible' : 'jugadores disponibles'}
              </Typography>
            </Box>
          </Fade>
        ) : (
          <Button
            variant="contained"
            size="large"
            startIcon={<CasinoRounded />}
            onClick={doSpin}
            disabled={spinning}
            sx={{ minWidth: 220 }}
          >
            {spinning ? 'Girando…' : 'Girar ruleta'}
          </Button>
        )}
      </Box>

      {revealed && (
        <Stack spacing={1.25}>
          {options.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              showStats={variant === 'classic'}
              selected={selected === p.id}
              onClick={() => setSelected(p.id)}
            />
          ))}
        </Stack>
      )}

      {/* Bottom bar: team so far + confirm */}
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          px: 2,
          pt: 1.5,
          pb: 'calc(12px + env(safe-area-inset-bottom))',
          zIndex: 10,
        }}
      >
        <Stack spacing={1.25} sx={{ maxWidth: 560, mx: 'auto' }}>
          <Stack direction="row" spacing={0.75} justifyContent="center">
            {Array.from({ length: mode.teamSize }, (_, i) => {
              const id = state.picks[i];
              return id ? (
                <PlayerAvatar key={i} player={getPlayer(id)} size={34} filled />
              ) : (
                <Box
                  key={i}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: '2px dashed',
                    borderColor: i === turn ? 'primary.main' : 'divider',
                  }}
                />
              );
            })}
          </Stack>
          <Button
            variant="contained"
            disabled={!selected}
            onClick={() => selected && dispatch({ type: 'PICK', playerId: selected })}
          >
            {selected ? `Elegir a ${getPlayer(selected).nombre}` : 'Elige un jugador'}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
