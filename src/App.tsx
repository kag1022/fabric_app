import { Suspense, lazy } from 'react';
import { Link as RouterLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';

import CameraView from './components/CameraView';
import { isLocalHistorySupported } from './services/localHistory';

const FabricGallery = lazy(() => import('./components/FabricGallery'));

let appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#156f5b',
      dark: '#0f5645',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f2a65a',
      dark: '#c67a2a',
    },
    background: {
      default: '#f7f2e8',
      paper: 'rgba(255, 255, 255, 0.92)',
    },
    text: {
      primary: '#21313c',
      secondary: '#4d5d65',
    },
  },
  shape: {
    borderRadius: 24,
  },
  typography: {
    fontFamily: '"Noto Sans JP", sans-serif',
    h1: {
      fontSize: 'clamp(2.2rem, 4vw, 3.6rem)',
      fontWeight: 900,
      lineHeight: 1.15,
    },
    h2: {
      fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
      fontWeight: 800,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
      fontWeight: 800,
    },
    button: {
      fontSize: '1.1rem',
      fontWeight: 800,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          minHeight: 56,
          paddingInline: 20,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(33, 49, 60, 0.08)',
          boxShadow: '0 18px 45px rgba(60, 72, 82, 0.08)',
        },
      },
    },
  },
});

appTheme = responsiveFontSizes(appTheme);

function App() {
  const canSaveHistory = isLocalHistorySupported();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', pb: 6, pt: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">
          <Stack spacing={3}>
            <Paper sx={{ overflow: 'hidden', p: { xs: 3, md: 4 } }}>
              <Stack spacing={2.5}>
                <Typography component="h1" variant="h1">
                  ぬの しわけ サポート
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: '1.15rem', maxWidth: 720 }}>
                  色の見分けがむずかしいときに、写真からしわけ先を大きく案内します。操作は
                  3 ステップだけです。
                </Typography>
                <Stack
                  alignItems={{ sm: 'center' }}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                >
                  <Button
                    color={location.pathname === '/history' ? 'secondary' : 'primary'}
                    component={RouterLink}
                    startIcon={
                      location.pathname === '/history' ? (
                        <CameraAltOutlinedIcon />
                      ) : (
                        <HistoryOutlinedIcon />
                      )
                    }
                    to={location.pathname === '/history' ? '/' : '/history'}
                    variant="contained"
                  >
                    {location.pathname === '/history' ? 'しわけ画面へ戻る' : '最近の記録を見る'}
                  </Button>
                  <Typography color="text.secondary">
                    記録はこの端末の中だけに残ります。必要なときだけ書き出して持ち出せます。
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            {!canSaveHistory && (
              <Alert severity="warning" sx={{ borderRadius: 4 }}>
                このブラウザでは端末内の記録保存が使えません。仕分け案内だけ利用できます。
              </Alert>
            )}

            <Suspense
              fallback={
                <Paper sx={{ p: 4 }}>
                  <Stack alignItems="center" spacing={2}>
                    <CircularProgress size={52} />
                    <Typography variant="h3">記録画面を準備しています</Typography>
                  </Stack>
                </Paper>
              }
            >
              <Routes>
                <Route
                  element={<CameraView canSaveHistory={canSaveHistory} onSaved={() => navigate('/history')} />}
                  path="/"
                />
                <Route element={<FabricGallery />} path="/history" />
                <Route element={<Navigate replace to="/" />} path="*" />
              </Routes>
            </Suspense>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
