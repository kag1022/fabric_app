import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';


// Firebase
import { auth, db, storage } from './firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';


import CameraView from './components/CameraView';
import FabricGallery from './components/FabricGallery';
import { ColorAnalysisResult } from './utils/colorUtils';

// ギャラリーで管理するアイテムの型定義をエクスポート
// (Firestoreに保存するデータ構造に合わせて調整も可能)
export interface FabricItem extends ColorAnalysisResult {
  id: string; // FirestoreのドキュメントID
  imageDataUrl: string; // StorageのURL
  createdAt: any; // 作成日時
}

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 匿名認証でサインイン
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


  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // ギャラリーに新しい布地を追加する関数 (Firebase連携版)
  const handleAddFabric = async (result: ColorAnalysisResult, imageDataUrl: string) => {
    if (!user) {
      console.error("ユーザーが認証されていません。");
      return;
    }

    try {

      // 2. Firebase Storageにアップロード
      const storageRef = ref(storage, `fabrics/${user.uid}/${new Date().toISOString()}.jpg`);
      await uploadString(storageRef, imageDataUrl, 'data_url');


      // 3. ダウンロードURLを取得
      const downloadURL = await getDownloadURL(storageRef);

      // 4. Cloud Firestoreにデータを保存
      const docRef = await addDoc(collection(db, "users", user.uid, "fabrics"), {
        ...result,
        imageDataUrl: downloadURL,
        createdAt: serverTimestamp(),
      });

      console.log("ドキュメントが追加されました。ID: ", docRef.id);

      // ギャラリータブに自動で切り替え
      setSelectedTab(1);
    } catch (error) {
      console.error("Firebaseへの保存中にエラーが発生しました: ", error);
    }
  };


  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Fabric Color Classifier
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={handleTabChange} aria-label="main tabs">
            <Tab label="Camera" />
            <Tab label="Fabric Gallery" />
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          {selectedTab === 0 && <CameraView onAddFabric={handleAddFabric} />}
          {selectedTab === 1 && user && <FabricGallery userId={user.uid} />}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;