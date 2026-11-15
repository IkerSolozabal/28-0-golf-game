import CloseRounded from '@mui/icons-material/CloseRounded';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { totalPoints } from '../config/gameConfig';
import { modeOf, useGame, type Phase } from '../state/GameContext';

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'draft', label: 'Draft' },
  { phase: 'lineup', label: 'Alineación' },
  { phase: 'simulation', label: 'Simulación' },
  { phase: 'result', label: 'Resultado' },
];

/** Top app bar with the game logo and a phase stepper. */
export function AppHeader() {
  const { state, dispatch } = useGame();
  const active = STEPS.findIndex((s) => s.phase === state.phase);
  const goal = totalPoints(modeOf(state));
  return (
    <AppBar position="sticky" sx={{ bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56 } }}>
        <Box
          sx={{
            px: 1.25,
            py: 0.25,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 800,
            letterSpacing: '-0.03em',
          }}
        >
          {goal}-0
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }} noWrap>
          Europa vs EE. UU. · match play
        </Typography>
        <IconButton aria-label="Salir al inicio" onClick={() => dispatch({ type: 'RESET' })} edge="end">
          <CloseRounded />
        </IconButton>
      </Toolbar>
      <Stepper activeStep={active} alternativeLabel sx={{ pb: 1.5, '& .MuiStepLabel-label': { mt: '4px !important', fontSize: 12 } }}>
        {STEPS.map((s) => (
          <Step key={s.phase}>
            <StepLabel>{s.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </AppBar>
  );
}
