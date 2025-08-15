import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Grid, Paper, CircularProgress, Alert } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { rgbToHsv, classifyHue, classifyValue, getGroupName, ColorAnalysisResult } from '../utils/colorUtils';

interface ColorAnalyzerProps {
  imageDataUrl: string;
  onAddToGallery: (result: ColorAnalysisResult, imageDataUrl: string) => void;
}

const ColorAnalyzer: React.FC<ColorAnalyzerProps> = ({ imageDataUrl, onAddToGallery }) => {
  const [analysisResult, setAnalysisResult] = useState<ColorAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const analyzeColor = useCallback(() => {
    if (!imageRef.current || !imageRef.current.complete || imageRef.current.naturalWidth === 0) {
      setError("画像の読み込みに失敗しました。再撮影してください。");
      setIsLoading(false);
      return;
    }
    setError(null);

    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("Canvas Contextの取得に失敗しました。");
      }

      const img = imageRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      context.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

      const startX = Math.floor(img.naturalWidth * 0.05);
      const startY = Math.floor(img.naturalHeight * 0.05);
      const width = Math.floor(img.naturalWidth * 0.9);
      const height = Math.floor(img.naturalHeight * 0.9);
      const imageData = context.getImageData(startX, startY, width, height);
      const data = imageData.data;

      const colorCounts: { [key: string]: { r: number; g: number; b: number; count: number } } = {};
      const step = 4 * 5;
      for (let i = 0; i < data.length; i += step) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = `${Math.round(r / 32)}_${Math.round(g / 32)}_${Math.round(b / 32)}`;
        if (!colorCounts[key]) {
          colorCounts[key] = { r: 0, g: 0, b: 0, count: 0 };
        }
        colorCounts[key].r += r;
        colorCounts[key].g += g;
        colorCounts[key].b += b;
        colorCounts[key].count++;
      }

      let dominantGroup = { r: 0, g: 0, b: 0, count: 0 };
      let maxCount = 0;
      for (const key in colorCounts) {
        if (colorCounts[key].count > maxCount) {
          maxCount = colorCounts[key].count;
          dominantGroup = colorCounts[key];
        }
      }

      if (dominantGroup.count === 0) {
        throw new Error("主要色の計算に失敗しました。");
      }

      const dominantRgb = {
        r: Math.round(dominantGroup.r / dominantGroup.count),
        g: Math.round(dominantGroup.g / dominantGroup.count),
        b: Math.round(dominantGroup.b / dominantGroup.count),
      };

      const hsv = rgbToHsv(dominantRgb.r, dominantRgb.g, dominantRgb.b);
      const hueInfo = classifyHue(hsv.h);
      const valueInfo = classifyValue(hsv.v);
      const group = getGroupName(hueInfo, valueInfo);

      const result: ColorAnalysisResult = { dominantRgb, hsv, hueInfo, valueInfo, group };
      setAnalysisResult(result);
    } catch (e: any) {
      setError(`色分析中にエラーが発生しました: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
  }, [imageDataUrl]);

  const handleSave = () => {
    if (analysisResult) {
      onAddToGallery(analysisResult, imageDataUrl);
    }
  };

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Paper elevation={4} sx={{ p: 3 }}>
        <img
          ref={imageRef}
          src={imageDataUrl}
          alt="分析対象の布地画像"
          style={{ display: "none" }}
          onLoad={analyzeColor}
          onError={() => { setError("画像の読み込みに失敗しました。"); setIsLoading(false); }}
        />
        <Box aria-live="polite" sx={{ minHeight: 180 }}>
          {isLoading && (
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>分析中...</Typography>
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {analysisResult && !isLoading && (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={4}>
                <Paper
                  aria-label={`主要色: ${analysisResult.group}`}
                  sx={{
                    backgroundColor: `rgb(${analysisResult.dominantRgb.r}, ${analysisResult.dominantRgb.g}, ${analysisResult.dominantRgb.b})`,
                    width: "100%",
                    paddingTop: "100%", // 正方形を維持
                    borderRadius: 1,
                    border: "1px solid rgba(255, 255, 255, 0.2)"
                  }}
                />
              </Grid>
              <Grid item xs={8}>
                <Typography variant="h5" component="p">グループ: {analysisResult.group}</Typography>
                <Typography variant="body1">色: {analysisResult.hueInfo.name}</Typography>
                <Typography variant="body1">明度: {analysisResult.valueInfo.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  RGB: {analysisResult.dominantRgb.r}, {analysisResult.dominantRgb.g}, {analysisResult.dominantRgb.b}
                </Typography>
              </Grid>
            </Grid>
          )}
        </Box>
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSave}
            disabled={!analysisResult || isLoading}
            startIcon={<AddPhotoAlternateIcon />}
          >
            ギャラリーに追加
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ColorAnalyzer;