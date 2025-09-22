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

      // --- ドミナントカラー抽出アルゴリズム ---
      // 1. ピクセルを量子化してグループ分け
      const colorCounts: { [key: string]: { r: number; g: number; b: number; count: number } } = {};
      // 処理負荷軽減のため、5ピクセルごとにサンプリング
      const step = 4 * 5; 
      for (let i = 0; i < data.length; i += step) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // RGB値を32段階で量子化し、キーを作成 (256/32=8段階 => 8*8*8=512グループ)
        const key = `${Math.round(r / 32)}_${Math.round(g / 32)}_${Math.round(b / 32)}`;
        if (!colorCounts[key]) {
          colorCounts[key] = { r: 0, g: 0, b: 0, count: 0 };
        }
        // 各グループの合計RGB値とピクセル数を記録
        colorCounts[key].r += r;
        colorCounts[key].g += g;
        colorCounts[key].b += b;
        colorCounts[key].count++;
      }

      // 2. 最もピクセル数の多いグループを見つける
      let dominantGroup = { r: 0, g: 0, b: 0, count: 0 };
      let maxCount = 0;
      for (const key in colorCounts) {
        if (colorCounts[key].count > maxCount) {
          maxCount = colorCounts[key].count;
          dominantGroup = colorCounts[key];
        }
      }

      if (dominantGroup.count === 0) {
        throw new Error("主要色の計算に失敗しました。画像が読み込めていない可能性があります。");
      }

      // 3. 最も優勢なグループの平均色を計算
      const dominantRgb = {
        r: Math.round(dominantGroup.r / dominantGroup.count),
        g: Math.round(dominantGroup.g / dominantGroup.count),
        b: Math.round(dominantGroup.b / dominantGroup.count),
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