import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { useEffect } from 'react';
import { AppHeader } from './components/AppHeader';
import { DraftScreen } from './screens/DraftScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LineupScreen } from './screens/LineupScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SimulationScreen } from './screens/SimulationScreen';
import { GameProvider, useGame } from './state/GameContext';
import { theme } from './theme/theme';

/** Renders the screen for the current phase. */
function Router() {
  const { state } = useGame();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.phase]);
  return (
    <>
      {state.phase !== 'home' && <AppHeader />}
      <Container maxWidth="sm" sx={{ px: 2 }}>
        {state.phase === 'home' && <HomeScreen />}
        {state.phase === 'draft' && <DraftScreen />}
        {state.phase === 'lineup' && <LineupScreen />}
        {state.phase === 'simulation' && <SimulationScreen />}
        {state.phase === 'result' && <ResultScreen />}
      </Container>
    </>
  );
}

/** Application root: theme + game state provider. */
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GameProvider>
        <Router />
      </GameProvider>
    </ThemeProvider>
  );
}
