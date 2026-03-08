import { Suspense, lazy, useState } from 'react';
import { Link as RouterLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
  Stack,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';

import CameraView from './components/CameraView';
import { loadDeviceSettings, saveDeviceSettings } from './services/deviceSettings';
import { isLocalHistorySupported } from './services/localHistory';

const FabricGallery = lazy(() => import('./components/FabricGallery'));

let appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#005A46',
      dark: '#00382C',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#D47B1F',
      dark: '#9B5413',
      contrastText: '#102533',
    },
    background: {
      default: '#FFF7EF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#102533',
      secondary: '#355064',
    },
    warning: {
      main: '#B25C00',
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: '"Noto Sans JP", sans-serif',
    h1: {
      fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
      fontWeight: 900,
      lineHeight: 1.08,
    },
    h2: {
      fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
      fontWeight: 800,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: 'clamp(1.35rem, 2.4vw, 1.9rem)',
      fontWeight: 800,
      lineHeight: 1.3,
    },
    body1: {
      fontSize: 'clamp(1.05rem, 1.3vw, 1.18rem)',
      lineHeight: 1.7,
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
          minHeight: 64,
          paddingInline: 24,
        },
        contained: {
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '2px solid rgba(16, 37, 51, 0.08)',
          boxShadow: '0 16px 36px rgba(16, 37, 51, 0.08)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
  },
});

appTheme = responsiveFontSizes(appTheme);

function App() {
  const location = useLocation();
  const isStaffHistoryPage = location.pathname === '/staff/history' || location.pathname === '/history';
  const [deviceSettings, setDeviceSettings] = useState(loadDeviceSettings);
  const canSaveHistory = isLocalHistorySupported();

  const handleAutoReadEnabledChange = (autoReadEnabled: boolean) => {
    const nextSettings = { autoReadEnabled };
    setDeviceSettings(nextSettings);
    saveDeviceSettings(nextSettings);
  };

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box
        component="a"
        href="#main-content"
        sx={{
          '&:focus': {
            left: 16,
            top: 16,
          },
          backgroundColor: 'primary.dark',
          borderRadius: 2,
          color: '#FFFFFF',
          left: -9999,
          p: 1.5,
          position: 'absolute',
          top: -9999,
          zIndex: 2000,
        }}
      >
        本文へ移動
      </Box>

      <Box
        sx={{
          background:
            'linear-gradient(180deg, rgba(255,247,239,1) 0%, rgba(250,242,231,1) 100%)',
          minHeight: '100vh',
          pb: { xs: 10, md: 6 },
          pt: { xs: 2, md: 4 },
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={3}>
            <Stack
              component="header"
              direction="row"
              spacing={2}
              sx={{ alignItems: 'center', justifyContent: 'space-between', px: { xs: 0.5, md: 0 } }}
            >
              <Typography component="h1" variant="h2">
                ぬの 色よみ サポート
              </Typography>

              {isStaffHistoryPage ? (
                <Button
                  color="secondary"
                  component={RouterLink}
                  startIcon={<ArrowBackOutlinedIcon />}
                  sx={{ minHeight: 48, minWidth: 'auto', px: 1.75 }}
                  to="/"
                  variant="text"
                >
                  もどる
                </Button>
              ) : null}
            </Stack>

            <Box component="main" id="main-content">
              <Suspense
                fallback={
                  <Box
                    sx={{
                      alignItems: 'center',
                      backgroundColor: 'background.paper',
                      border: '2px solid rgba(16, 37, 51, 0.08)',
                      borderRadius: 5,
                      display: 'flex',
                      justifyContent: 'center',
                      minHeight: 240,
                      p: 4,
                    }}
                  >
                    <Stack alignItems="center" spacing={2}>
                      <CircularProgress aria-hidden="true" size={52} />
                      <Typography variant="h3">画面を準備しています</Typography>
                    </Stack>
                  </Box>
                }
              >
                <Routes>
                  <Route
                    element={
                      <CameraView
                        autoReadEnabled={deviceSettings.autoReadEnabled}
                        canSaveHistory={canSaveHistory}
                      />
                    }
                    path="/"
                  />
                  <Route
                    element={
                      <FabricGallery
                        autoReadEnabled={deviceSettings.autoReadEnabled}
                        onAutoReadEnabledChange={handleAutoReadEnabledChange}
                      />
                    }
                    path="/staff/history"
                  />
                  <Route element={<Navigate replace to="/staff/history" />} path="/history" />
                  <Route element={<Navigate replace to="/" />} path="*" />
                </Routes>
              </Suspense>
            </Box>
          </Stack>
        </Container>
      </Box>
      <Analytics />
      <SpeedInsights />
    </ThemeProvider>
  );
}

export default App;
