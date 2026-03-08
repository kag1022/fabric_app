import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';

import ColorAnalyzer from './ColorAnalyzer';
import StepProgress from './StepProgress';

interface CameraViewProps {
  canSaveHistory: boolean;
  onSaved: () => void;
}

function CameraView({ canSaveHistory, onSaved }: CameraViewProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLiveCamera, setHasLiveCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadInputId = useId();

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setHasLiveCamera(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCapturedImage(null);
    setError(null);
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('この端末ではカメラを使えません。写真を選ぶボタンを使ってください。');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          height: { ideal: 960 },
          width: { ideal: 1280 },
        },
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setHasLiveCamera(true);
    } catch (cameraError) {
      console.warn('Unable to access the camera.', cameraError);
      setError('カメラを使えません。設定を確認するか、写真を選ぶボタンを使ってください。');
    }
  }, [stopCamera]);

  useEffect(() => {
    void startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      setError('写真の取得に失敗しました。もう一度お試しください。');
      return;
    }

    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    setCapturedImage(dataUrl);
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    stopCamera();
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const nextImage = typeof reader.result === 'string' ? reader.result : null;

      if (!nextImage) {
        setError('写真の読み込みに失敗しました。');
        return;
      }

      setCapturedImage(nextImage);
    };
    reader.onerror = () => {
      setError('写真の読み込みに失敗しました。');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <Stack spacing={3}>
      <StepProgress activeStep={capturedImage ? 1 : 0} />

      {!capturedImage ? (
        <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h2">1. ぬのを撮る</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                布を 1 枚だけ大きくうつしてください。色が見えにくくても、このあと大きな文字と音で案内します。
              </Typography>
            </Box>

            {error && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                {error}
              </Alert>
            )}

            <Box
              sx={{
                background:
                  'linear-gradient(160deg, rgba(21,111,91,0.14), rgba(242,166,90,0.12))',
                border: '2px solid rgba(21,111,91,0.18)',
                borderRadius: 4,
                overflow: 'hidden',
                p: { xs: 1, md: 1.5 },
              }}
            >
              <Box
                sx={{
                  alignItems: 'center',
                  aspectRatio: '4 / 3',
                  backgroundColor: '#e4ebee',
                  borderRadius: 3,
                  display: 'flex',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <video
                  autoPlay
                  playsInline
                  ref={videoRef}
                  style={{
                    display: hasLiveCamera ? 'block' : 'none',
                    height: '100%',
                    objectFit: 'cover',
                    width: '100%',
                  }}
                  title="カメラプレビュー"
                />
                {!hasLiveCamera && (
                  <Typography color="text.secondary" sx={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    カメラを準備しています
                  </Typography>
                )}
              </Box>
            </Box>

            <canvas aria-hidden="true" ref={canvasRef} style={{ display: 'none' }} />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <Button
                disabled={!hasLiveCamera}
                onClick={captureImage}
                size="large"
                startIcon={<CameraAltOutlinedIcon />}
                variant="contained"
              >
                このまま撮る
              </Button>
              <Button
                onClick={() => {
                  void startCamera();
                }}
                size="large"
                startIcon={<ReplayOutlinedIcon />}
                variant="outlined"
              >
                カメラをやり直す
              </Button>
              <Button
                component="label"
                htmlFor={uploadInputId}
                size="large"
                startIcon={<UploadFileOutlinedIcon />}
                variant="outlined"
              >
                写真を選ぶ
              </Button>
            </Stack>

            <input
              accept="image/*"
              capture="environment"
              hidden
              id={uploadInputId}
              onChange={handleFileSelected}
              type="file"
            />
          </Stack>
        </Paper>
      ) : (
        <ColorAnalyzer
          canSaveHistory={canSaveHistory}
          imageDataUrl={capturedImage}
          onRetake={() => {
            void startCamera();
          }}
          onSaved={onSaved}
        />
      )}
    </Stack>
  );
}

export default CameraView;
