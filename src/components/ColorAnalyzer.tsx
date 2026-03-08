import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Grid, Paper, CircularProgress, Alert, Tooltip, Grow } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
  onAddToGallery: (result: ColorAnalysisResult, imageDataUrl: string) => Promise<void>;
  isSaving?: boolean;
}

const ColorAnalyzer: React.FC<ColorAnalyzerProps> = ({ imageDataUrl, onAddToGallery, isSaving: externalIsSaving = false }) => {
  const [analysisResults, setAnalysisResults] = useState<ColorAnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalIsSaving, setInternalIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const isSaving = externalIsSaving || internalIsSaving;

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
    setSaved(false);
  }, [imageDataUrl]);

  const handleSave = async () => {
    if (analysisResults.length > 0) {
      setInternalIsSaving(true);
      try {
        await onAddToGallery(analysisResults[0], imageDataUrl);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        // エラーは親コンポーネントで処理されるか、global error handlerで
        console.error(err);
      } finally {
        setInternalIsSaving(false);
      }
    }
  };

  const mainResult = analysisResults.length > 0 ? analysisResults[0] : null;

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Paper
        elevation={0}
        className="glass-panel"
        sx={{ p: 3 }}
      >
        <img
          ref={imageRef}
          src={imageDataUrl}
          alt="分析対象の布地画像"
          style={{ display: "none" }}
          onLoad={analyzeColor}
          onError={() => { setError("画像の読み込みに失敗しました。"); setIsLoading(false); }}
        />
        <Box aria-live="polite" sx={{ minHeight: 180 }}>
          {/* ローディング */}
          {isLoading && (
            <Box sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              py: 4,
            }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  size={56}
                  thickness={3}
                  sx={{
                    color: '#a5b4fc',
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    },
                  }}
                />
              </Box>
              <Typography sx={{ mt: 2, color: 'text.secondary' }}>色を分析中...</Typography>
            </Box>
          )}

          {/* エラー */}
          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          {/* 分析結果 */}
          {mainResult && !isLoading && (
            <Grow in={true} timeout={500}>
              <Grid container spacing={2} alignItems="center">
                {/* 主要色スウォッチ (円形 + グロー) */}
                <Grid item xs={4}>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Box
                      aria-label={`主要色: ${mainResult.group}`}
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        backgroundColor: `rgb(${mainResult.dominantRgb.r}, ${mainResult.dominantRgb.g}, ${mainResult.dominantRgb.b})`,
                        boxShadow: `0 0 20px rgba(${mainResult.dominantRgb.r}, ${mainResult.dominantRgb.g}, ${mainResult.dominantRgb.b}, 0.5), 0 0 40px rgba(${mainResult.dominantRgb.r}, ${mainResult.dominantRgb.g}, ${mainResult.dominantRgb.b}, 0.2)`,
                        border: '3px solid rgba(255, 255, 255, 0.15)',
                      }}
                    />
                  </Box>
                </Grid>

                {/* テキスト情報 */}
                <Grid item xs={8}>
                  <Typography
                    variant="h5"
                    component="p"
                    sx={{
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #e2e8f0, #a5b4fc)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {mainResult.group}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, color: 'text.primary' }}>
                    {mainResult.hueInfo.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      明度: {mainResult.valueInfo.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      鮮やかさ: {mainResult.saturationInfo.name}
                    </Typography>
                  </Box>
                </Grid>

                {/* カラーパレット */}
                {analysisResults.length > 1 && (
                  <Grid item xs={12}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mt: 2,
                        mb: 1,
                        color: 'text.secondary',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontSize: '0.7rem',
                      }}
                    >
                      カラーパレット
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {analysisResults.map((result, index) => (
                        <Tooltip
                          key={index}
                          title={`${result.group} - ${result.hueInfo.name}`}
                          arrow
                          placement="top"
                        >
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              backgroundColor: `rgb(${result.dominantRgb.r}, ${result.dominantRgb.g}, ${result.dominantRgb.b})`,
                              border: index === 0
                                ? '2px solid rgba(165, 180, 252, 0.6)'
                                : '1px solid rgba(255, 255, 255, 0.1)',
                              cursor: 'pointer',
                              '&:hover': {
                                transform: 'scale(1.15)',
                                boxShadow: `0 0 16px rgba(${result.dominantRgb.r}, ${result.dominantRgb.g}, ${result.dominantRgb.b}, 0.5)`,
                              },
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Grow>
          )}
        </Box>

        {/* 保存ボタン */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={analysisResults.length === 0 || isLoading || isSaving}
            startIcon={
              isSaving
                ? <CircularProgress size={20} color="inherit" />
                : saved
                  ? <CheckCircleIcon />
                  : <AddPhotoAlternateIcon />
            }
            sx={{
              px: 4,
              py: 1.2,
              fontSize: '0.95rem',
              borderRadius: '50px',
              ...(saved && {
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)',
              }),
            }}
          >
            {isSaving ? '保存中...' : saved ? '追加しました' : 'ギャラリーに追加'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ColorAnalyzer;