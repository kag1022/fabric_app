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
import { getDominantColors } from '../utils/colorClustering';

interface ColorAnalyzerProps {
  imageDataUrl: string;
  onAddToGallery: (result: ColorAnalysisResult, imageDataUrl: string) => void;
}

const ColorAnalyzer: React.FC<ColorAnalyzerProps> = ({ imageDataUrl, onAddToGallery }) => {
  const [analysisResults, setAnalysisResults] = useState<ColorAnalysisResult[]>([]);
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

      const startX = Math.floor(imgWidth * 0.05);
      const startY = Math.floor(imgHeight * 0.05);
      const width = Math.floor(imgWidth * 0.9);
      const height = Math.floor(imgHeight * 0.9);
      const imageData = context.getImageData(startX, startY, width, height);
      
      const dominantColors = getDominantColors(imageData.data, 5);

      if (dominantColors.length === 0) {
        throw new Error("主要色の計算に失敗しました。");
      }

      const results: ColorAnalysisResult[] = dominantColors.map(color => {
        const hsv = rgbToHsv(color.r, color.g, color.b);
        const saturationInfo = classifySaturation(hsv.s);
        const hueInfo = saturationInfo.name === '無彩色'
          ? { category: 0, name: '無彩色' }
          : classifyHue(hsv.h);
        const valueInfo = classifyValue(hsv.s, hsv.v);
        const group = getGroupName(hueInfo, valueInfo, saturationInfo);

        return {
          dominantRgb: color,
          hsv,
          hueInfo,
          saturationInfo,
          valueInfo,
          group,
        };
      });

      setAnalysisResults(results);
    } catch (e: any) {
      setError(`色分析中にエラーが発生しました: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setAnalysisResults([]);
  }, [imageDataUrl]);

  const handleSave = () => {
    if (analysisResults.length > 0) {
      // 一番大きいクラスタの結果を保存する
      onAddToGallery(analysisResults[0], imageDataUrl);
    }
  };

  const mainResult = analysisResults.length > 0 ? analysisResults[0] : null;

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
          {mainResult && !isLoading && (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={4}>
                <Paper
                  aria-label={`主要色: ${mainResult.group}`}
                  sx={{
                    backgroundColor: `rgb(${mainResult.dominantRgb.r}, ${mainResult.dominantRgb.g}, ${mainResult.dominantRgb.b})`,
                    width: "100%",
                    paddingTop: "100%",
                    borderRadius: 1,
                    border: "1px solid rgba(255, 255, 255, 0.2)"
                  }}
                />
              </Grid>
              <Grid item xs={8}>
                <Typography variant="h5" component="p">グループ: {mainResult.group}</Typography>
                <Typography variant="body1">色分類: {mainResult.hueInfo.name}</Typography>
                <Typography variant="body1">明度: {mainResult.valueInfo.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  鮮やかさ: {mainResult.saturationInfo.name}
                </Typography>
              </Grid>
              {analysisResults.length > 1 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 2 }}>カラーパレット</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {analysisResults.map((result, index) => (
                      <Paper
                        key={index}
                        sx={{
                          backgroundColor: `rgb(${result.dominantRgb.r}, ${result.dominantRgb.g}, ${result.dominantRgb.b})`,
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          border: "1px solid rgba(0, 0, 0, 0.1)"
                        }}
                        title={`${result.group} | ${result.hueInfo.name}`}
                      />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSave}
            disabled={analysisResults.length === 0 || isLoading}
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