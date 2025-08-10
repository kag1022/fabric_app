import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { Analytics } from "@vercel/analytics/react"

import CameraView from './components/CameraView';
import FabricGallery from './components/FabricGallery';
import PatchworkLayout from './components/PatchworkLayout';
import { ColorAnalysisResult } from './utils/colorUtils';

// ギャラリーで管理するアイテムの型定義をエクスポート
export interface FabricItem extends ColorAnalysisResult {
  id: string;
  imageDataUrl: string;
}

// アプリケーションのダークテーマを定義
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [fabricItems, setFabricItems] = useState<FabricItem[]>([]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // ギャラリーに新しい布地を追加し、ギャラリータブに切り替える関数
  const handleAddFabric = (result: ColorAnalysisResult, imageDataUrl: string) => {
    const newItem: FabricItem = {
      id: new Date().toISOString() + Math.random(), // ユニークなIDを生成
      ...result,
      imageDataUrl,
    };
    setFabricItems(prevItems => [newItem, ...prevItems]); // 新しいアイテムを先頭に追加
    setSelectedTab(1); // ギャラリータブに自動で切り替え
  };

  // ギャラリーから布地を削除する関数
  const handleDeleteFabric = (id: string) => {
    setFabricItems(prevItems => prevItems.filter(item => item.id !== id));
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
            <Tab label="Patchwork Layout" />
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          {selectedTab === 0 && <CameraView onAddFabric={handleAddFabric} />}
          {selectedTab === 1 && <FabricGallery items={fabricItems} onDeleteItem={handleDeleteFabric} />}
          {selectedTab === 2 && <PatchworkLayout items={fabricItems} />}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
