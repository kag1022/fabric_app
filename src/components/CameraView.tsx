import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';

import ColorAnalyzer from './ColorAnalyzer';

interface CameraViewProps {
  autoReadEnabled: boolean;
  canSaveHistory: boolean;
}

type CameraState = 'idle' | 'starting' | 'live' | 'error' | 'unsupported';
type CaptureSource = 'camera' | 'file' | null;

function CameraView({ autoReadEnabled, canSaveHistory }: CameraViewProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [captureSource, setCaptureSource] = useState<CaptureSource>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (clearFeedback = false) => {
    if (clearFeedback) {
      setFeedback(null);
    }

    setCapturedImage(null);
    setError(null);
    stopCamera();
    setCameraState('starting');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('この端末ではカメラを使えません。写真をえらんで進めてください。');
      setCameraState('unsupported');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          height: { ideal: 1080 },
          width: { ideal: 1440 },
        },
      });

      streamRef.current = mediaStream;
      setCaptureSource('camera');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setCameraState('live');
    } catch (cameraError) {
      console.warn('Unable to access the camera.', cameraError);
      setError('カメラを使えません。必要なときは写真をえらんでください。');
      setCameraState('error');
    }
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
      setError('まだ写真をとれません。少し待ってから「写真をとる」を押してください。');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    setFeedback(null);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      setError('写真をとれませんでした。「写真をとる」をもう一度押してください。');
      return;
    }

    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    setCameraState('idle');
    setCapturedImage(dataUrl);
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    stopCamera();
    setError(null);
    setFeedback(null);
    setCaptureSource('file');
    setCameraState('idle');

    const reader = new FileReader();
    reader.onload = () => {
      const nextImage = typeof reader.result === 'string' ? reader.result : null;

      if (!nextImage) {
        setError('写真を読みこめませんでした。もう一度「写真をえらぶ」を押してください。');
        return;
      }

      setCapturedImage(nextImage);
    };
    reader.onerror = () => {
      setError('写真を読みこめませんでした。もう一度「写真をえらぶ」を押してください。');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  if (capturedImage) {
    return (
      <ColorAnalyzer
        autoReadEnabled={autoReadEnabled}
        canSaveHistory={canSaveHistory}
        imageDataUrl={capturedImage}
        onRetake={() => {
          setCapturedImage(null);
          setError(null);
          if (captureSource === 'camera') {
            void startCamera(true);
            return;
          }
          setCameraState('idle');
        }}
        onSaved={() => {
          setFeedback('保存しました。次のぬのを見られます。');
          setCapturedImage(null);
          setError(null);
          if (captureSource === 'camera') {
            void startCamera();
            return;
          }
          setCameraState('idle');
        }}
      />
    );
  }

  const isCameraLive = cameraState === 'live';
  const isCameraStarting = cameraState === 'starting';
  const showChoosePhotoAsPrimary = cameraState === 'error' || cameraState === 'unsupported';

  let panelTitle = '使い方をえらんでください';
  let panelDescription = '下の大きいボタンから始められます。';

  if (isCameraStarting) {
    panelTitle = 'カメラを準備しています';
    panelDescription = '少し待つと、写真をとれるようになります。';
  } else if (showChoosePhotoAsPrimary) {
    panelTitle = '写真をえらんで進めます';
    panelDescription = '下のボタンから写真をえらぶと、そのまま色を見られます。';
  } else if (isCameraLive) {
    panelTitle = '';
    panelDescription = '';
  }

  return (
    <Stack spacing={2}>
      {feedback && <Alert severity="success">{feedback}</Alert>}
      {error && <Alert severity="warning">{error}</Alert>}

      <Paper component="section" aria-label="撮影" sx={{ p: { xs: 1, md: 1.5 } }}>
        <Stack spacing={2}>
          <Box
            sx={{
              backgroundColor: '#F4EEE4',
              border: '2px solid rgba(0, 90, 70, 0.15)',
              borderRadius: 4,
              overflow: 'hidden',
              p: { xs: 1, md: 1.5 },
            }}
          >
            <Box
              sx={{
                alignItems: 'center',
                background:
                  'linear-gradient(180deg, rgba(244, 248, 250, 1) 0%, rgba(225, 233, 238, 1) 100%)',
                borderRadius: 3,
                display: 'flex',
                justifyContent: 'center',
                maxHeight: { xs: 560, md: 680 },
                minHeight: { xs: '56vh', md: '64vh' },
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <video
                autoPlay
                playsInline
                ref={videoRef}
                style={{
                  display: isCameraLive ? 'block' : 'none',
                  height: '100%',
                  objectFit: 'cover',
                  width: '100%',
                }}
                title="カメラプレビュー"
              />

              {!isCameraLive && (
                <Stack alignItems="center" spacing={1.5} sx={{ p: 3, textAlign: 'center' }}>
                  <Typography component="h2" variant="h3">
                    {panelTitle}
                  </Typography>
                  <Typography color="text.secondary" sx={{ maxWidth: 320 }}>
                    {panelDescription}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Box>

          <canvas aria-hidden="true" ref={canvasRef} style={{ display: 'none' }} />
        </Stack>
      </Paper>

      <Paper
        component="section"
        aria-label="撮影の操作"
        sx={{
          bottom: { xs: 12, md: 20 },
          p: { xs: 2, md: 2.5 },
          position: 'sticky',
          zIndex: 5,
        }}
      >
        <Stack spacing={1.5}>
          {isCameraLive ? (
            <>
              <Button
                fullWidth
                onClick={captureImage}
                size="large"
                startIcon={<CameraAltOutlinedIcon />}
                variant="contained"
              >
                写真をとる
              </Button>
              <Button
                fullWidth
                onClick={() => uploadInputRef.current?.click()}
                size="large"
                startIcon={<UploadFileOutlinedIcon />}
                variant="outlined"
              >
                写真をえらぶ
              </Button>
            </>
          ) : (
            <>
              {showChoosePhotoAsPrimary ? (
                <Button
                  fullWidth
                  onClick={() => uploadInputRef.current?.click()}
                  size="large"
                  startIcon={<UploadFileOutlinedIcon />}
                  variant="contained"
                >
                  写真をえらぶ
                </Button>
              ) : (
                <Button
                  disabled={isCameraStarting}
                  fullWidth
                  onClick={() => {
                    void startCamera(true);
                  }}
                  size="large"
                  startIcon={<CameraAltOutlinedIcon />}
                  variant="contained"
                >
                  {isCameraStarting ? 'カメラを準備しています' : 'カメラを使う'}
                </Button>
              )}
              {showChoosePhotoAsPrimary ? (
                <Button
                  fullWidth
                  onClick={() => {
                    void startCamera(true);
                  }}
                  size="large"
                  startIcon={<ReplayOutlinedIcon />}
                  variant="outlined"
                >
                  もう一度 カメラを使う
                </Button>
              ) : (
                <Button
                  fullWidth
                  onClick={() => uploadInputRef.current?.click()}
                  size="large"
                  startIcon={<UploadFileOutlinedIcon />}
                  variant="outlined"
                >
                  写真をえらぶ
                </Button>
              )}
            </>
          )}

        </Stack>

        <input
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleFileSelected}
          ref={uploadInputRef}
          type="file"
        />
      </Paper>
    </Stack>
  );
}

export default CameraView;
