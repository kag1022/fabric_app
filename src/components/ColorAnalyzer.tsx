import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';

import { saveLocalFabricCapture } from '../services/localHistory';
import { buildFabricGuidance } from '../utils/fabricGuidance';
import { getDominantColors } from '../utils/colorClustering';
import {
  classifyHue,
  classifySaturation,
  classifyValue,
  getGroupName,
  rgbToHsv,
  type ColorAnalysisResult,
} from '../utils/colorUtils';
import StepProgress from './StepProgress';

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
      setError('画像の読み込みに失敗しました。もう一度撮影してください。');
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
      const sampleWidth = Math.floor(image.naturalWidth * 0.9);
      const sampleHeight = Math.floor(image.naturalHeight * 0.9);
      const imageData = context.getImageData(startX, startY, sampleWidth, sampleHeight);
      const dominantColors = getDominantColors(imageData.data, 5);

      if (dominantColors.length === 0) {
        throw new Error('主要な色を見つけられませんでした。');
      }

      const nextResults = dominantColors.map((color) => {
        const hsv = rgbToHsv(color.r, color.g, color.b);
        const saturationInfo = classifySaturation(hsv.s);
        const hueInfo =
          saturationInfo.name === '無彩色'
            ? { category: 0, name: '無彩色' }
            : classifyHue(hsv.h);
        const valueInfo = classifyValue(hsv.s, hsv.v);
        const group = getGroupName(hueInfo, valueInfo, saturationInfo);

        return {
          dominantRgb: color,
          group,
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
      setError('色の分析に失敗しました。もう一度撮影してください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mainResult = analysisResults[0] ?? null;
  const guidance = mainResult ? buildFabricGuidance(mainResult) : null;
  const speechText = guidance?.speechText ?? null;

  useEffect(() => {
    if (speechText) {
      announceResult(speechText);
    }
  }, [announceResult, speechText]);

  const handleReplaySpeech = () => {
    if (guidance) {
      announceResult(guidance.speechText);
    }
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
      setError('記録に失敗しました。このブラウザの保存設定を確認してください。');
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <StepProgress activeStep={isSaving ? 2 : 1} />

      <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h2">2. たしかめる</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              色の名前と、しまうグループを大きく表示します。
            </Typography>
          </Box>

          <img
            alt="分析する布の写真"
            onError={() => {
              setError('画像の読み込みに失敗しました。');
              setIsAnalyzing(false);
            }}
            onLoad={analyzeColor}
            ref={imageRef}
            src={imageDataUrl}
            style={{ display: 'none' }}
          />

          <Box
            component="img"
            src={imageDataUrl}
            alt="撮影した布"
            sx={{
              aspectRatio: '4 / 3',
              borderRadius: 4,
              objectFit: 'cover',
              width: '100%',
            }}
          />

          {isAnalyzing && (
            <Box
              aria-live="polite"
              sx={{
                alignItems: 'center',
                backgroundColor: 'rgba(21, 111, 91, 0.08)',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                justifyContent: 'center',
                minHeight: 220,
              }}
            >
              <CircularProgress size={56} />
              <Typography variant="h3">色をみています</Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          {!canSaveHistory && (
            <Alert severity="info" sx={{ borderRadius: 3 }}>
              このブラウザでは記録保存が使えません。仕分け案内だけ利用できます。
            </Alert>
          )}

          {mainResult && !isAnalyzing && guidance && (
            <Stack spacing={2.5}>
              <Paper
                aria-live="assertive"
                sx={{
                  background:
                    'linear-gradient(160deg, rgba(21,111,91,0.92), rgba(15,86,69,0.92))',
                  color: '#ffffff',
                  p: { xs: 2.5, md: 3 },
                }}
              >
                <Stack spacing={1.5}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>しわけ先</Typography>
                  <Typography sx={{ fontSize: 'clamp(2.3rem, 5vw, 4rem)', fontWeight: 900 }}>
                    {guidance.supportCode}
                  </Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {guidance.headline}
                  </Typography>
                  <Typography sx={{ fontSize: '1.2rem' }}>{guidance.instruction}</Typography>
                </Stack>
              </Paper>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ alignItems: { md: 'stretch' } }}
              >
                <Paper
                  sx={{
                    alignItems: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    justifyContent: 'center',
                    minHeight: 150,
                    p: 2,
                    width: { xs: '100%', md: 200 },
                  }}
                >
                  <Typography fontWeight={800}>参考色</Typography>
                  <Box
                    aria-hidden="true"
                    sx={{
                      backgroundColor: `rgb(${mainResult.dominantRgb.r}, ${mainResult.dominantRgb.g}, ${mainResult.dominantRgb.b})`,
                      border: '3px solid rgba(33, 49, 60, 0.1)',
                      borderRadius: 4,
                      height: 88,
                      width: 88,
                    }}
                  />
                </Paper>

                <Paper sx={{ flexGrow: 1, p: 2.5 }}>
                  <Stack spacing={1.25}>
                    <Typography fontWeight={800}>読み取り結果</Typography>
                    <Typography sx={{ fontSize: '1.15rem' }}>
                      色の名前: <strong>{mainResult.hueInfo.name}</strong>
                    </Typography>
                    <Typography sx={{ fontSize: '1.15rem' }}>
                      明るさ: <strong>{mainResult.valueInfo.name}</strong>
                    </Typography>
                    <Typography sx={{ fontSize: '1.15rem' }}>
                      鮮やかさ: <strong>{mainResult.saturationInfo.name}</strong>
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            </Stack>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <Button
              disabled={!guidance}
              onClick={handleReplaySpeech}
              startIcon={<CampaignOutlinedIcon />}
              variant="outlined"
            >
              もう一度読む
            </Button>
            <Button
              onClick={() => {
                setAudioEnabled((previous) => !previous);
              }}
              startIcon={audioEnabled ? <VolumeOffOutlinedIcon /> : <CampaignOutlinedIcon />}
              variant="outlined"
            >
              {audioEnabled ? '音声をオフにする' : '音声をオンにする'}
            </Button>
            <Button onClick={onRetake} startIcon={<ReplayOutlinedIcon />} variant="outlined">
              撮り直す
            </Button>
            <Button
              disabled={!mainResult || !canSaveHistory || isAnalyzing || isSaving}
              onClick={handleSave}
              startIcon={<Inventory2OutlinedIcon />}
              variant="contained"
            >
              {!canSaveHistory ? 'この端末では保存できません' : isSaving ? '記録しています' : '3. この端末に保存'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default ColorAnalyzer;
