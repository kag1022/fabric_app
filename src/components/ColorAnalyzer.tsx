import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';

import { saveLocalFabricCapture } from '../services/localHistory';
import { getDominantColors } from '../utils/colorClustering';
import { buildColorGuidance } from '../utils/colorGuidance';
import {
  classifyHue,
  classifySaturation,
  classifyValue,
  rgbToHsv,
  type ColorAnalysisResult,
} from '../utils/colorUtils';

interface ColorAnalyzerProps {
  canSaveHistory: boolean;
  imageDataUrl: string;
  onRetake: () => void;
  onSaved: () => void;
}

function ColorAnalyzer({ canSaveHistory, imageDataUrl, onRetake, onSaved }: ColorAnalyzerProps) {
  const [analysisResults, setAnalysisResults] = useState<ColorAnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);

  const announceResult = useEffectEvent((message: string) => {
    if (
      !audioEnabled ||
      typeof window === 'undefined' ||
      typeof window.speechSynthesis === 'undefined'
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'ja-JP';
    utterance.pitch = 1;
    utterance.rate = 0.92;

    window.speechSynthesis.speak(utterance);
  });

  useEffect(() => {
    setAnalysisResults([]);
    setError(null);
    setIsAnalyzing(true);
    setIsSaving(false);
  }, [imageDataUrl]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const analyzeColor = () => {
    if (!imageRef.current || !imageRef.current.complete || imageRef.current.naturalWidth === 0) {
      setError('画像を読みこめませんでした。もう一度とってください。');
      setIsAnalyzing(false);
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (!context) {
        throw new Error('画像を分析できませんでした。');
      }

      const image = imageRef.current;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);

      const startX = Math.floor(image.naturalWidth * 0.05);
      const startY = Math.floor(image.naturalHeight * 0.05);
      const sampleWidth = Math.max(1, image.naturalWidth - startX * 2);
      const sampleHeight = Math.max(1, image.naturalHeight - startY * 2);
      const imageData = context.getImageData(startX, startY, sampleWidth, sampleHeight);
      const dominantColors = getDominantColors(imageData.data, 5);

      if (dominantColors.length === 0) {
        throw new Error('主要な色を見つけられませんでした。');
      }

      const nextResults = dominantColors.map((color) => {
        const hsv = rgbToHsv(color.r, color.g, color.b);
        const saturationInfo = classifySaturation(hsv.s);
        const hueInfo =
          saturationInfo.name === '色が少ない'
            ? { category: 0, name: 'グレー系' }
            : classifyHue(hsv.h);
        const valueInfo = classifyValue(hsv.s, hsv.v);

        return {
          dominantRgb: color,
          hsv,
          hueInfo,
          saturationInfo,
          valueInfo,
        };
      });

      setAnalysisResults(nextResults);
      setError(null);
    } catch (analysisError) {
      console.error('Color analysis failed.', analysisError);
      setError('色を読みとれませんでした。もう一度とってください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mainResult = analysisResults[0] ?? null;
  const guidance = mainResult ? buildColorGuidance(mainResult) : null;

  useEffect(() => {
    if (guidance?.speechText) {
      announceResult(guidance.speechText);
    }
  }, [announceResult, guidance]);

  useEffect(() => {
    if (guidance && !isAnalyzing) {
      resultCardRef.current?.focus();
    }
  }, [guidance, isAnalyzing]);

  const handleReplaySpeech = () => {
    if (guidance) {
      announceResult(guidance.speechText);
    }
  };

  const handleAudioToggle = () => {
    setAudioEnabled((previous) => {
      if (previous && typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.cancel();
      }

      return !previous;
    });
  };

  const handleSave = async () => {
    if (!mainResult || !canSaveHistory) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await saveLocalFabricCapture(imageDataUrl, mainResult);
      onSaved();
    } catch (saveError) {
      console.error('Failed to save the local fabric record.', saveError);
      setError('保存できませんでした。ブラウザの設定を確認してください。');
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Paper component="section" aria-label="結果の確認" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={2}>
          <img
            alt="分析する布の写真"
            onError={() => {
              setError('画像を読みこめませんでした。もう一度とってください。');
              setIsAnalyzing(false);
            }}
            onLoad={analyzeColor}
            ref={imageRef}
            src={imageDataUrl}
            style={{ display: 'none' }}
          />

          {error && <Alert severity="error">{error}</Alert>}

          {!canSaveHistory && (
            <Alert severity="info">このブラウザでは保存できません。色を読むことはできます。</Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(280px, 0.92fr) minmax(0, 1.08fr)',
              },
            }}
          >
            {isAnalyzing ? (
              <Paper
                aria-live="polite"
                role="status"
                sx={{
                  alignItems: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  minHeight: 320,
                  order: { xs: 1, md: 2 },
                  p: 4,
                }}
              >
                <Stack alignItems="center" spacing={2}>
                  <CircularProgress aria-hidden="true" size={56} />
                  <Typography variant="h3">色を読んでいます</Typography>
                  <Typography color="text.secondary">少し待つと結果が出ます。</Typography>
                </Stack>
              </Paper>
            ) : (
              guidance && (
                <Paper
                  aria-live="polite"
                  ref={resultCardRef}
                  role="status"
                  sx={{
                    background: 'linear-gradient(180deg, #005A46 0%, #00382C 100%)',
                    color: '#FFFFFF',
                    minHeight: 320,
                    order: { xs: 1, md: 2 },
                    p: { xs: 2.5, md: 3.5 },
                  }}
                  tabIndex={-1}
                >
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 800, opacity: 0.9 }}>色</Typography>
                      <Typography
                        component="p"
                        sx={{
                          fontSize: 'clamp(3.2rem, 10vw, 5.3rem)',
                          fontWeight: 900,
                          letterSpacing: '0.02em',
                          lineHeight: 1.05,
                          mt: 1,
                        }}
                      >
                        {guidance.headline}
                      </Typography>
                      <Typography
                        component="p"
                        sx={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 800, mt: 1 }}
                      >
                        色は {guidance.headline} です
                      </Typography>
                    </Box>

                    <Paper
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        boxShadow: 'none',
                        color: '#FFFFFF',
                        p: 2,
                      }}
                    >
                      <Typography sx={{ fontSize: '1.2rem', fontWeight: 700 }}>
                        {guidance.detailLine}
                      </Typography>
                    </Paper>

                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>
                        文字と音で確かめてください
                      </Typography>
                      <Box
                        aria-hidden="true"
                        sx={{
                          backgroundColor: `rgb(${mainResult.dominantRgb.r}, ${mainResult.dominantRgb.g}, ${mainResult.dominantRgb.b})`,
                          border: '2px solid rgba(255, 255, 255, 0.4)',
                          borderRadius: 3,
                          height: 56,
                          minWidth: 56,
                        }}
                      />
                    </Stack>

                    <Box component="dl" sx={{ display: 'grid', gap: 1.25, m: 0 }}>
                      <Box
                        sx={{
                          alignItems: 'center',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Typography component="dt" sx={{ fontSize: '1.05rem', fontWeight: 700, m: 0 }}>
                          明るさ
                        </Typography>
                        <Typography component="dd" sx={{ fontSize: '1.25rem', fontWeight: 900, m: 0 }}>
                          {mainResult?.valueInfo.name}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          alignItems: 'center',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Typography component="dt" sx={{ fontSize: '1.05rem', fontWeight: 700, m: 0 }}>
                          色のつよさ
                        </Typography>
                        <Typography component="dd" sx={{ fontSize: '1.25rem', fontWeight: 900, m: 0 }}>
                          {mainResult?.saturationInfo.name}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Paper>
              )
            )}

            <Paper
              sx={{
                order: { xs: 2, md: 1 },
                overflow: 'hidden',
                p: { xs: 1.5, md: 2 },
              }}
            >
              <Box
                component="img"
                src={imageDataUrl}
                alt="撮影した布"
                sx={{
                  aspectRatio: '4 / 3',
                  borderRadius: 3,
                  objectFit: 'cover',
                  width: '100%',
                }}
              />
            </Paper>
          </Box>
        </Stack>
      </Paper>

      <Paper
        component="section"
        aria-label="結果の操作"
        sx={{
          bottom: { xs: 12, md: 20 },
          p: { xs: 2, md: 2.5 },
          position: 'sticky',
          zIndex: 5,
        }}
      >
        <Stack spacing={1.5}>
          <Button
            disabled={!mainResult || !canSaveHistory || isAnalyzing || isSaving}
            fullWidth
            onClick={handleSave}
            size="large"
            startIcon={<SaveOutlinedIcon />}
            variant="contained"
          >
            {!canSaveHistory ? '保存できません' : isSaving ? '保存しています' : '保存して次へ'}
          </Button>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <Button fullWidth onClick={onRetake} startIcon={<ReplayOutlinedIcon />} variant="outlined">
              撮り直す
            </Button>
            <Button
              disabled={!guidance}
              fullWidth
              onClick={handleReplaySpeech}
              startIcon={<CampaignOutlinedIcon />}
              variant="outlined"
            >
              もう一度読む
            </Button>
            <Button
              fullWidth
              onClick={handleAudioToggle}
              startIcon={audioEnabled ? <VolumeOffOutlinedIcon /> : <VolumeUpOutlinedIcon />}
              variant="outlined"
            >
              {audioEnabled ? '音を止める' : '音を出す'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default ColorAnalyzer;
