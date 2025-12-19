import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CollectionsIcon from '@mui/icons-material/Collections';
import CircularProgress from '@mui/material/CircularProgress';

import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

// Firebase
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth'; // signInAnonymously removed
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { db, storage } from './firebase';

import CameraView from './components/CameraView';
import FabricGallery from './components/FabricGallery';
import Login from './components/Login';
import { ColorAnalysisResult } from './utils/colorUtils';

export interface FabricItem extends ColorAnalysisResult {
  id: string;
  imageDataUrl: string;
  createdAt: any;
}

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00e5ff', // Cyberpunk Cyan
    },
    secondary: {
      main: '#ff4081', // Pink accent
    },
    background: {
      default: 'transparent', // Let gradient show through
      paper: 'rgba(255, 255, 255, 0.05)', // Glass effect base
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Noto Sans JP", sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none', // Modern feel
    },
  },
  shape: {
    borderRadius: 16, // Softer, modern corners
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: 'transparent', // Handled by index.css
          scrollbarColor: "#6b6b6b #2b2b2b",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            backgroundColor: "#2b2b2b",
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: "#6b6b6b",
            minHeight: 24,
            border: "3px solid #2b2b2b",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.05)', // Glassy
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24, // Pill shape
          padding: '8px 24px',
          boxShadow: '0 4px 14px 0 rgba(0,0,0,0.3)',
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #00e5ff 30%, #00b0ff 90%)',
          color: '#000',
          fontWeight: 'bold',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(20, 20, 20, 0.8)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }
      }
    }
  },
});

const Main = styled('main')(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(10), // Increased bottom padding for nav bar
  minHeight: '100vh',
}));

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("DEBUG: App useEffect running");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.error("DEBUG: App onAuthStateChanged callback triggered", currentUser);
      setUser(currentUser);
      setLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleAddFabric = async (result: ColorAnalysisResult, imageDataUrl: string) => {
    if (!user) {
      console.error("User not authenticated.");
      return;
    }
    try {
      const storageRef = ref(storage, `fabrics/${user.uid}/${new Date().toISOString()}.jpg`);
      await uploadString(storageRef, imageDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, "users", user.uid, "fabrics"), {
        ...result,
        imageDataUrl: downloadURL,
        createdAt: serverTimestamp(),
      });

      // ギャラリーへ遷移
      navigate('/gallery');
    } catch (error) {
      console.error("Error saving to Firebase: ", error);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Main>
        <Container maxWidth="md">
          {user && ( // タイトルはログイン時のみ、または適切に配置
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 800, background: 'linear-gradient(45deg, #00e5ff, #ff4081)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Fabric Color Classifier
              </Typography>
            </Box>
          )}

          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

            <Route path="/" element={
              user ? (
                <Box>
                  <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      布地の写真を撮って、色で自動的に分類・整理しましょう。
                    </Typography>
                  </Box>
                  <CameraView onAddFabric={handleAddFabric} />
                </Box>
              ) : <Navigate to="/login" />
            } />

            <Route path="/gallery" element={
              user ? <FabricGallery userId={user.uid} /> : <Navigate to="/login" />
            } />
          </Routes>
        </Container>
      </Main>

      {user && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
          <BottomNavigation
            showLabels
            value={location.pathname === '/gallery' ? 1 : 0}
            onChange={(event, newValue) => {
              if (newValue === 0) navigate('/');
              else navigate('/gallery');
            }}
          >
            <BottomNavigationAction label="Camera" icon={<CameraAltIcon />} />
            <BottomNavigationAction label="Gallery" icon={<CollectionsIcon />} />
          </BottomNavigation>
        </Paper>
      )}
    </ThemeProvider>
  );
}

export default App;