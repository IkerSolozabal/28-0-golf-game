import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import SportsGolfRounded from '@mui/icons-material/SportsGolfRounded';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { ENGINE_CONFIG, GAME_MODES, GOLFIQ_ENABLED, totalPoints } from '../config/gameConfig';
import { useGame, type GameSettings } from '../state/GameContext';
import { SIDE_COLORS, SIDE_NAMES } from '../theme/theme';
import type { Difficulty, GameModeId, GameVariant, Side } from '../types/game';

/** Section title used across the home screen. */
function Label({ children }: { children: string }) {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
      {children}
    </Typography>
  );
}

/** Big tappable side card (Europa / EE. UU.). */
function SideCard({ side, selected, onSelect }: { side: Side; selected: boolean; onSelect: () => void }) {
  const c = SIDE_COLORS[side];
  return (
    <Card
      sx={{
        flex: 1,
        borderWidth: 2,
        borderColor: selected ? c.main : 'divider',
        bgcolor: selected ? c.container : 'background.paper',
        transition: 'all .15s ease',
      }}
    >
      <CardActionArea onClick={onSelect} sx={{ p: 2, textAlign: 'center' }} aria-pressed={selected}>
        <Box
          sx={{
            width: 44,
            height: 44,
            mx: 'auto',
            mb: 1,
            borderRadius: '50%',
            bgcolor: c.main,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {side}
        </Box>
        <Typography fontWeight={700} color={selected ? c.on : 'text.primary'}>
          {SIDE_NAMES[side]}
        </Typography>
      </CardActionArea>
    </Card>
  );
}

/** Home: choose side, mode, variant and rival difficulty, then start the draft. */
export function HomeScreen() {
  const { state, dispatch } = useGame();
  const [settings, setSettings] = useState<GameSettings>(state.settings);
  const set = <K extends keyof GameSettings>(k: K, v: GameSettings[K] | null) => v != null && setSettings((s) => ({ ...s, [k]: v }));
  const mode = GAME_MODES[settings.modeId];

  return (
    <Stack spacing={3} sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.5,
            borderRadius: 999,
            bgcolor: 'rgba(31,77,58,0.08)',
            color: 'primary.main',
            mb: 2,
          }}
        >
          <SportsGolfRounded fontSize="small" />
          <Typography variant="caption" fontWeight={700}>
            Europa vs EE. UU. · match play
          </Typography>
        </Box>
        <Typography variant="h1" sx={{ fontSize: { xs: 88, sm: 112 }, color: 'primary.main', lineHeight: 1 }}>
          {totalPoints(mode)}-0
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 360, mx: 'auto' }}>
          Elige leyendas con la ruleta, emparéjalas como capitán y busca el partido perfecto.
        </Typography>
      </Box>

      <Box>
        <Label>Tu bando</Label>
        <Stack direction="row" spacing={1.5}>
          {(['EU', 'USA'] as Side[]).map((s) => (
            <SideCard key={s} side={s} selected={settings.side === s} onSelect={() => set('side', s)} />
          ))}
        </Stack>
      </Box>

      <Box>
        <Label>Modo</Label>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {Object.values(GAME_MODES).map((m) => (
            <Chip
              key={m.id}
              disabled={!m.enabled}
              color={settings.modeId === m.id ? 'primary' : 'default'}
              variant={settings.modeId === m.id ? 'filled' : 'outlined'}
              onClick={() => set('modeId', m.id as GameModeId)}
              label={`${m.name} · ${m.teamSize} jugadores · ${totalPoints(m)} pts${m.enabled ? '' : ' · Fase 2'}`}
              sx={{ height: 40, px: 0.5 }}
            />
          ))}
        </Stack>
      </Box>

      <Box>
        <Label>Variante</Label>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={settings.variant}
          onChange={(_, v: GameVariant | null) => set('variant', v)}
        >
          <ToggleButton value="classic">Clásico</ToggleButton>
          <ToggleButton value="golfiq" disabled={!GOLFIQ_ENABLED}>
            GolfIQ {GOLFIQ_ENABLED ? '' : '· Fase 2'}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box>
        <Label>Rival</Label>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={settings.difficulty}
          onChange={(_, v: Difficulty | null) => set('difficulty', v)}
        >
          {(Object.keys(ENGINE_CONFIG.rival) as Difficulty[]).map((d) => (
            <ToggleButton key={d} value={d}>
              {ENGINE_CONFIG.rival[d].label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Button variant="contained" size="large" onClick={() => dispatch({ type: 'START', settings })} sx={{ minHeight: 56, fontSize: 17 }}>
        Empezar draft
      </Button>

      <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: '20px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreRounded />}>
          <Typography fontWeight={600}>Cómo se juega</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1} component="ol" sx={{ pl: 2, m: 0 }}>
            <Typography component="li" variant="body2">
              <b>Draft:</b> en cada turno la ruleta marca una década + país o década + major. Elige un jugador de la lista; cada uno solo una vez.
            </Typography>
            <Typography component="li" variant="body2">
              <b>Alineación:</b> reparte parejas en Foursomes (golpe alterno) y Fourballs (mejor bola) y ordena los individuales. O pulsa «Auto-alinear».
            </Typography>
            <Typography component="li" variant="body2">
              <b>Simulación:</b> cada partido vale 1 punto (½ si empata). Gana el que sume más de la mitad. El reto: {totalPoints(mode)}-0.
            </Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
