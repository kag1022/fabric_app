import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, Paper } from '@mui/material';
import { rgbToHsv, classifyHue, classifyValue, getGroupName, ColorAnalysisResult } from '../utils/colorUtils';

interface ColorAnalyzerProps {
  imageDataUrl: string;
  onAddToGallery: (result: ColorAnalysisResult) => void;
}

const ColorAnalyzer: React.FC<ColorAnalyzerProps> = ({ imageDataUrl, onAddToGallery }) => {
  const [analysisResult, setAnalysisResult] = useState<ColorAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const analyzeColor = () => {
      if (!imageRef.current) return;
      setIsLoading(true);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;

      const img = imageRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0, img.width, img.height);

      // 画像の中央部分90%x90%の領域のピクセルデータを取得
      const startX = Math.floor(img.width * 0.05);
      const startY = Math.floor(img.height * 0.05);
      const width = Math.floor(img.width * 0.9);
      const height = Math.floor(img.height * 0.9);
      const imageData = context.getImageData(startX, startY, width, height);
      const data = imageData.data;

      // ピクセルを量子化してヒストグラムを作成
      const colorCounts: { [key: string]: { r: number; g: number; b: number; count: number } } = {};
      const step = 4 * 5; // 5ピクセルごとに1ピクセルをサンプリング
      for (let i = 0; i < data.length; i += step) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // 量子化（色をグループ化）
        const key = `${Math.round(r / 32)}_${Math.round(g / 32)}_${Math.round(b / 32)}`;
        if (!colorCounts[key]) {
          colorCounts[key] = { r: 0, g: 0, b: 0, count: 0 };
        }
        colorCounts[key].r += r;
        colorCounts[key].g += g;
        colorCounts[key].b += b;
        colorCounts[key].count++;
      }

      // 最も頻度の高い色グループを見つける
      let dominantGroup = { r: 0, g: 0, b: 0, count: 0 };
      let maxCount = 0;
      for (const key in colorCounts) {
        if (colorCounts[key].count > maxCount) {
          maxCount = colorCounts[key].count;
          dominantGroup = colorCounts[key];
        }
      }

      // 平均色を計算
      const dominantRgb = {
        r: Math.round(dominantGroup.r / dominantGroup.count),
        g: Math.round(dominantGroup.g / dominantGroup.count),
        b: Math.round(dominantGroup.b / dominantGroup.count),
      };

      // 色を分類
      const hsv = rgbToHsv(dominantRgb.r, dominantRgb.g, dominantRgb.b);
      const hueInfo = classifyHue(hsv.h);
      const valueInfo = classifyValue(hsv.v);
      const group = getGroupName(hueInfo, valueInfo);

      const result: ColorAnalysisResult = { dominantRgb, hsv, hueInfo, valueInfo, group };
      setAnalysisResult(result);
      setIsLoading(false);
    };

    const img = new Image();
    img.onload = () => {
      if (imageRef.current) {
        imageRef.current.src = imageDataUrl;
        analyzeColor();
      }
    };
    img.src = imageDataUrl;

  }, [imageDataUrl]);

  const handleSave = () => {
    if (analysisResult) {
      onAddToGallery(analysisResult);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>2. 色の分析結果</Typography>
      <Card>
        <CardContent>
          {isLoading && <Typography>分析中...</Typography>}
          {analysisResult && (
            <Grid container spacing={2}>
              <Grid xs={12} md={6}>
                <img ref={imageRef} src={imageDataUrl} alt="Captured Fabric" style={{ display: 'none' }} onLoad={() => { /* re-analysis can be triggered here if needed */ }} />
                <Paper sx={{
                  backgroundColor: `rgb(${analysisResult.dominantRgb.r}, ${analysisResult.dominantRgb.g}, ${analysisResult.dominantRgb.b})`,
                  width: '100%',
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #fff'
                }}>
                  <Typography variant="h6" sx={{ color: analysisResult.valueInfo.name === '暗' ? '#fff' : '#000' }}>
                    主要色
                  </Typography>
                </Paper>
              </Grid>
              <Grid xs={12} md={6}>
                <Typography><b>グループ:</b> {analysisResult.group}</Typography>
                <Typography><b>色分類:</b> {analysisResult.hueInfo.name}</Typography>
                <Typography><b>明度:</b> {analysisResult.valueInfo.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  RGB: {analysisResult.dominantRgb.r}, {analysisResult.dominantRgb.g}, {analysisResult.dominantRgb.b}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  HSV: {Math.round(analysisResult.hsv.h)}°, {Math.round(analysisResult.hsv.s * 100)}%, {Math.round(analysisResult.hsv.v * 100)}%
                </Typography>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={!analysisResult}>
          ギャラリーに追加
        </Button>
      </Box>
    </Box>
  );
};

export default ColorAnalyzer;
