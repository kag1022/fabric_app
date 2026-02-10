import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import ColorLensIcon from '@mui/icons-material/ColorLens';

// Local Database
import { db } from './db';
import { dataURLtoBlob } from './utils/fileUtils';

import CameraView from './components/CameraView';
import FabricGallery from './components/FabricGallery';
import { ColorAnalysisResult } from './utils/colorUtils';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a5b4fc', // インディゴ系の明るい色
      light: '#c7d2fe',
      dark: '#818cf8',
    },
    secondary: {
      main: '#c084fc', // パープル系
      light: '#e9d5ff',
      dark: '#a855f7',
    },
    background: {
      default: '#0f0f1a',
      paper: 'rgba(30, 30, 45, 0.6)',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: '"Inter", "Noto Sans JP", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // MUIのデフォルトオーバーレイを削除
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          padding: '10px 24px',
        },
        contained: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7c8ef0 0%, #8a5fb5 100%)',
            boxShadow: '0 6px 28px rgba(102, 126, 234, 0.45)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        },
      },
    },
  },
});

function App() {
  const [isSaving, setIsSaving] = useState(false);

  const handleAddFabric = async (result: ColorAnalysisResult, imageDataUrl: string) => {
    setIsSaving(true);
    try {
      // 画像データをBlobに変換
      const imageBlob = dataURLtoBlob(imageDataUrl);

      // IndexedDBに保存
      await db.fabrics.add({
        ...result,
        imageBlob,
        createdAt: new Date(),
      });

      document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error("Error saving to IndexedDB: ", error);
      alert("保存に失敗しました。容量不足の可能性があります。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />

      {/* --- Glass AppBar --- */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(15, 15, 26, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <Toolbar>
          <ColorLensIcon sx={{
            mr: 1.5,
            fontSize: 28,
            background: 'linear-gradient(135deg, #a5b4fc, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }} />
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              background: 'linear-gradient(135deg, #e2e8f0, #a5b4fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Fabric Color Classifier
          </Typography>
        </Toolbar>
      </AppBar>

      {/* --- Main Content --- */}
      <Box component="main" sx={{ py: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">

          {/* --- Hero Header --- */}
          <Box
            className="animate-fade-in-up"
            sx={{
              textAlign: 'center',
              mb: { xs: 4, md: 6 },
              pt: 2,
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              className="gradient-text"
              sx={{
                fontSize: { xs: '1.6rem', md: '2.2rem' },
                fontWeight: 800,
              }}
            >
              布地の色を分類・整理
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                maxWidth: 480,
                mx: 'auto',
                animation: 'fadeIn 0.6s ease-out 0.2s both',
                lineHeight: 1.7,
              }}
            >
              布地の写真を撮って、主要な色を自動で判別し、ギャラリーに整理します。
              データはすべてお使いの端末に保存されます。
            </Typography>
          </Box>

          {/* --- Two-Column Layout --- */}
          <Grid container spacing={4} alignItems="flex-start">
            <Grid item xs={12} md={5}>
              <Paper
                className="glass-panel animate-fade-in-up"
                sx={{
                  p: { xs: 2, sm: 3 },
                  height: '100%',
                  animationDelay: '0.1s',
                }}
              >
                <section aria-labelledby="camera-heading">
                  <h2 id="camera-heading" style={{ display: 'none' }}>撮影エリア</h2>
                  <CameraView onAddFabric={handleAddFabric} isSaving={isSaving} />
                </section>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
              <Paper
                id="gallery-section"
                className="glass-panel animate-fade-in-up"
                sx={{
                  p: { xs: 2, sm: 3 },
                  height: '100%',
                  animationDelay: '0.2s',
                }}
              >
                <section aria-labelledby="gallery-heading">
                  <h2 id="gallery-heading" style={{ display: 'none' }}>ギャラリーエリア</h2>
                  <FabricGallery />
                </section>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;