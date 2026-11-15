/**
 * Material Design 3–inspired MUI theme.
 *
 * Sober palette from classic golf: deep fairway green (primary), cream paper
 * background, and the two team colours (European blue, American red) as tokens.
 * Mobile-first: large touch targets, pill buttons, generous radii (M3 shape scale).
 */
import { createTheme } from '@mui/material/styles';
import type { Side } from '../types/game';

/** Team colours (used by avatars, chips and the share card). */
export const SIDE_COLORS: Record<Side, { main: string; container: string; on: string }> = {
  EU: { main: '#1D4E89', container: '#D8E4F4', on: '#0B2341' },
  USA: { main: '#A4262C', container: '#F6DCDB', on: '#4A0E11' },
};

/** Spanish display names for each side. */
export const SIDE_NAMES: Record<Side, string> = { EU: 'Europa', USA: 'EE. UU.' };

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1F4D3A', light: '#4F7A64', dark: '#0F2E21', contrastText: '#FFFFFF' },
    secondary: { main: '#B08D57', contrastText: '#1B1B1B' },
    background: { default: '#F6F3EA', paper: '#FFFDF8' },
    text: { primary: '#1B1C18', secondary: '#55594F' },
    divider: 'rgba(31,77,58,0.12)',
    success: { main: '#2E7D4F' },
    error: { main: '#B3261E' },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.04em' },
    h2: { fontWeight: 800, letterSpacing: '-0.03em' },
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    overline: { fontWeight: 600, letterSpacing: '0.12em' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, minHeight: 48, paddingInline: 24 },
        sizeSmall: { minHeight: 36, paddingInline: 16 },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 20, borderColor: 'rgba(31,77,58,0.14)' } },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
    MuiAppBar: { defaultProps: { elevation: 0, color: 'transparent' } },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 999, paddingInline: 16 } },
    },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 48 } } },
    MuiDrawer: { styleOverrides: { paper: { borderTopLeftRadius: 28, borderTopRightRadius: 28 } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, height: 8 } } },
  },
});
