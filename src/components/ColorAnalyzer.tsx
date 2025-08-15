import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Grid, Paper, CircularProgress, Alert } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import {
  rgbToHsv,
  classifyHue,
  classifyValue,
  getGroupName,
  ColorAnalysisResult,
  classifySaturation,
} from '../utils/colorUtils';

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
      if (!context) throw new Error("Canvas Contextの取得に失敗しました。");

      const img = imageRef.current;
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      context.drawImage(img, 0, 0, imgWidth, imgHeight);

      // 画像の中央90%の領域を計算
      const startX = Math.floor(imgWidth * 0.05);
      const startY = Math.floor(imgHeight * 0.05);
      const width = Math.floor(imgWidth * 0.9);
      const height = Math.floor(imgHeight * 0.9);
      const imageData = context.getImageData(startX, startY, width, height);
      const data = imageData.data;

      // 平均色を計算
      let totalR = 0, totalG = 0, totalB = 0;
      const pixelCount = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
      }

      const dominantRgb = {
        r: Math.round(totalR / pixelCount),
        g: Math.round(totalG / pixelCount),
        b: Math.round(totalB / pixelCount),
      };

      const hsv = rgbToHsv(dominantRgb.r, dominantRgb.g, dominantRgb.b);
      const saturationInfo = classifySaturation(hsv.s);
      
      // 無彩色の場合は色相カテゴリを0にする
      const hueInfo = saturationInfo.name === '無彩色'
        ? { category: 0, name: '無彩色' }
        : classifyHue(hsv.h);
        
      const valueInfo = classifyValue(hsv.s, hsv.v);
      const group = getGroupName(hueInfo, valueInfo, saturationInfo);

      const result: ColorAnalysisResult = {
        dominantRgb,
        hsv,
        hueInfo,
        saturationInfo,
        valueInfo,
        group,
      };
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
                    paddingTop: "100%",
                    borderRadius: 1,
                    border: "1px solid rgba(255, 255, 255, 0.2)"
                  }}
                />
              </Grid>
              <Grid item xs={8}>
                <Typography variant="h5" component="p">グループ: {analysisResult.group}</Typography>
                <Typography variant="body1">色分類: {analysisResult.hueInfo.name}</Typography>
                <Typography variant="body1">明度: {analysisResult.valueInfo.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  鮮やかさ: {analysisResult.saturationInfo.name}
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