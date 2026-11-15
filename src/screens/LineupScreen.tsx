import AutoFixHighRounded from '@mui/icons-material/AutoFixHighRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import PersonAddAlt1Rounded from '@mui/icons-material/PersonAddAlt1Rounded';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { getPlayer } from '../data/catalog';
import { assignSlot, autoLineup, lineupProgress, validateLineup } from '../engine/lineup';
import { individualRating, pairRating } from '../engine/rating';
import { modeOf, useGame } from '../state/GameContext';
import { SIDE_NAMES } from '../theme/theme';
import type { MatchFormat, Player } from '../types/game';

/** Human-readable format names and what each rewards (from the spec table). */
export const FORMAT_INFO: Record<MatchFormat, { name: string; hint: string }> = {
  foursomes: { name: 'Foursomes', hint: 'Golpe alterno · premia complementariedad y precisión' },
  fourballs: { name: 'Fourballs', hint: 'Mejor bola · premia birdies y agresividad' },
  singles: { name: 'Individuales', hint: 'Uno contra uno · nivel individual y presión' },
};

interface SlotRef {
  si: number;
  mi: number;
  slot: number;
}

/** A tappable slot showing the assigned player or a placeholder. */
function SlotButton({ player, onClick }: { player: Player | null; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        flex: 1,
        minWidth: 0,
        justifyContent: 'flex-start',
        gap: 1,
        p: 1,
        borderRadius: 3,
        border: '1.5px dashed',
        borderColor: player ? 'transparent' : 'primary.light',
        bgcolor: player ? 'rgba(31,77,58,0.06)' : 'transparent',
        minHeight: 52,
        textAlign: 'left',
      }}
    >
      {player ? (
        <>
          <PlayerAvatar player={player} size={34} />
          <Typography variant="body2" fontWeight={600} noWrap>
            {player.nombre}
          </Typography>
        </>
      ) : (
        <>
          <PersonAddAlt1Rounded color="primary" />
          <Typography variant="body2" color="primary" fontWeight={600}>
            Elegir jugador…
          </Typography>
        </>
      )}
    </ButtonBase>
  );
}

/**
 * Captain's lineup: per-session tabs, tappable slots that open a bottom-sheet
 * picker (choosing a player already used in the session swaps them), an
 * "Auto-alinear" optimiser and the rival roster.
 */
export function LineupScreen() {
  const { state, dispatch } = useGame();
  const mode = modeOf(state);
  const team = useMemo(() => state.picks.map(getPlayer), [state.picks]);
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState<SlotRef | null>(null);

  const session = mode.sessions[tab];
  const sessionLineup = state.lineup[tab];
  const issues = validateLineup(state.lineup, mode, state.picks);
  const progress = lineupProgress(state.lineup);

  const setSlot = (ref: SlotRef, id: string | null) => {
    dispatch({ type: 'SET_LINEUP', lineup: assignSlot(state.lineup, ref.si, ref.mi, ref.slot, id) });
    setEditing(null);
  };

  const whereInSession = (id: string): number | null => {
    const idx = sessionLineup.findIndex((m) => m.includes(id));
    return idx >= 0 ? idx : null;
  };

  return (
    <Stack spacing={2} sx={{ py: 2, pb: 16 }}>
      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mx: -2, px: 1 }}
      >
        {mode.sessions.map((s, i) => {
          const filled = state.lineup[i].flat().every((x) => x != null);
          return (
            <Tab
              key={s.id}
              label={
                <Box sx={{ lineHeight: 1.2 }}>
                  <Box>{s.label}</Box>
                  <Box sx={{ fontSize: 11, fontWeight: 500, color: filled ? 'success.main' : 'text.secondary' }}>
                    {FORMAT_INFO[s.format].name}
                    {filled ? ' ✓' : ''}
                  </Box>
                </Box>
              }
            />
          );
        })}
      </Tabs>

      <Box>
        <Typography variant="h5">
          {session.label} · {FORMAT_INFO[session.format].name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {FORMAT_INFO[session.format].hint} · {session.matches} partidos · {session.matches} puntos
        </Typography>
      </Box>

      <Stack spacing={1.25}>
        {sessionLineup.map((match, mi) => {
          const players = match.map((id) => (id ? getPlayer(id) : null));
          const full = players.every(Boolean);
          const pr =
            full && session.format !== 'singles'
              ? pairRating(players[0]!, players[1]!, session.format)
              : null;
          return (
            <Card key={mi} sx={{ p: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Partido {mi + 1}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  {pr && pr.chemistry > 0 && <Chip size="small" color="secondary" label={`Química +${pr.chemistry}`} />}
                  {pr && pr.complementarity > 0.5 && (
                    <Chip size="small" variant="outlined" label={`Complem. +${pr.complementarity.toFixed(1)}`} />
                  )}
                  {pr && pr.puttBonus > 0 && <Chip size="small" variant="outlined" label={`Putt +${pr.puttBonus}`} />}
                  {full && (
                    <Chip
                      size="small"
                      color="primary"
                      label={(pr ? pr.rating : individualRating(players[0]!)).toFixed(1)}
                    />
                  )}
                </Stack>
              </Stack>
              <Stack spacing={0.75}>
                {players.map((p, slot) => (
                  <SlotButton key={slot} player={p} onClick={() => setEditing({ si: tab, mi, slot })} />
                ))}
              </Stack>
            </Card>
          );
        })}
      </Stack>

      <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: '20px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreRounded />}>
          <Typography fontWeight={600}>
            Rival: {SIDE_NAMES[state.settings.side === 'EU' ? 'USA' : 'EU']} ({state.rival.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {state.rival.map(getPlayer).map((p) => (
              <Stack key={p.id} direction="row" spacing={1.5} alignItems="center">
                <PlayerAvatar player={p} size={32} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {p.nombre} <Typography component="span" variant="caption" color="text.secondary">· {p.decada}s</Typography>
                </Typography>
                <Chip size="small" label={individualRating(p).toFixed(0)} />
              </Stack>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bottom action bar */}
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
        <Stack spacing={1} sx={{ maxWidth: 560, mx: 'auto' }}>
          <Typography variant="caption" color="text.secondary" textAlign="center">
            {issues.length === 0 ? 'Alineación completa' : `${progress.filled}/${progress.total} huecos · ${issues[0].message}`}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<AutoFixHighRounded />}
              onClick={() => dispatch({ type: 'SET_LINEUP', lineup: autoLineup(team, mode) })}
              sx={{ flex: 1 }}
            >
              Auto-alinear
            </Button>
            <Button variant="contained" disabled={issues.length > 0} onClick={() => dispatch({ type: 'SIMULATE' })} sx={{ flex: 1 }}>
              Simular
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Player picker bottom sheet */}
      <SwipeableDrawer
        anchor="bottom"
        open={editing != null}
        onOpen={() => undefined}
        onClose={() => setEditing(null)}
        disableSwipeToOpen
        PaperProps={{ sx: { maxWidth: 560, mx: 'auto', pb: 'env(safe-area-inset-bottom)' } }}
      >
        <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mt: 1.5 }} />
        <Typography variant="h6" sx={{ px: 3, pt: 1.5 }}>
          Elegir jugador
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ px: 3 }}>
          {editing && `${mode.sessions[editing.si].label} · Partido ${editing.mi + 1}`}
        </Typography>
        <List sx={{ px: 1 }}>
          {[...team]
            .sort((a, b) => individualRating(b) - individualRating(a))
            .map((p) => {
              const where = whereInSession(p.id);
              const current = editing && sessionLineup[editing.mi][editing.slot] === p.id;
              return (
                <ListItemButton key={p.id} selected={!!current} onClick={() => editing && setSlot(editing, p.id)} sx={{ borderRadius: 3 }}>
                  <ListItemAvatar>
                    <PlayerAvatar player={p} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={p.nombre}
                    secondary={
                      where != null
                        ? current
                          ? 'En este hueco'
                          : `En partido ${where + 1} · se intercambian`
                        : `DRV ${p.driver} · HIE ${p.hierros} · PUT ${p.putt}`
                    }
                  />
                  <Chip size="small" label={individualRating(p).toFixed(0)} />
                </ListItemButton>
              );
            })}
          {editing && sessionLineup[editing.mi][editing.slot] && (
            <ListItemButton onClick={() => setSlot(editing, null)} sx={{ borderRadius: 3 }}>
              <ListItemText primary="Vaciar hueco" primaryTypographyProps={{ color: 'error', fontWeight: 600 }} />
            </ListItemButton>
          )}
        </List>
      </SwipeableDrawer>
    </Stack>
  );
}
