import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';

// Firebase
import { auth } from './firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { db, storage } from './firebase';

import CameraView from './components/CameraView';
import FabricGallery from './components/FabricGallery';
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
      main: '#90caf9',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Noto Sans JP", sans-serif',
  },
});

const Main = styled('main')(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

function App() {
  const [user, setUser] = useState<User | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
        });
      }
    });
    return () => unsubscribe();
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

      // ギャラリーセクションにスクロール
      document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error("Error saving to Firebase: ", error);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Main>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" component="h1" gutterBottom>
              Fabric Color Classifier
            </Typography>
            <Typography variant="body1" color="text.secondary">
              布地の写真を撮って、色で自動的に分類・整理しましょう。
            </Typography>
          </Box>

          <section aria-labelledby="camera-heading">
            <h2 id="camera-heading" style={{ display: 'none' }}>撮影エリア</h2>
            <CameraView onAddFabric={handleAddFabric} />
          </section>

          <Divider sx={{ my: 8 }} />

          <section id="gallery-section" aria-labelledby="gallery-heading">
            <h2 id="gallery-heading" style={{ display: 'none' }}>ギャラリーエリア</h2>
            {user && <FabricGallery userId={user.uid} />}
          </section>

        </Container>
      </Main>
    </ThemeProvider>
  );
}

export default App;