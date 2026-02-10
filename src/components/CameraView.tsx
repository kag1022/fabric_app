import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Button, Typography, Paper, CardMedia, Alert, Fade } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ReplayIcon from '@mui/icons-material/Replay';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ColorAnalyzer from './ColorAnalyzer';
import { ColorAnalysisResult } from '../utils/colorUtils';
import ColorGroupTable from './ColorGroupTable';

interface CameraViewProps {
  onAddFabric: (result: ColorAnalysisResult, imageDataUrl: string) => Promise<void>;
  isSaving?: boolean; // 互換性のため残すが、内部ではColorAnalyzerの状態を使用
}

const CameraView: React.FC<CameraViewProps> = ({ onAddFabric, isSaving = false }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    setCapturedImage(null);
    setError(null);
    if (stream) {
      stopCamera();
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setError("カメラにアクセスできません。ブラウザの設定でカメラの使用を許可してください。");
    }
  }, [stream, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 3) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        // フラッシュアニメーション
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 400);

        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  // ステップ番号バッジ
  const StepBadge: React.FC<{ step: number }> = ({ step }) => (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.85rem',
        mr: 1.5,
        flexShrink: 0,
        boxShadow: '0 2px 12px rgba(102, 126, 234, 0.3)',
      }}
    >
      {step}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {!capturedImage ? (
        <>
          {/* ステップヘッダー */}
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <StepBadge step={1} />
            <Typography
              variant="h5"
              component="h2"
              sx={{ fontWeight: 700 }}
            >
              布地を撮影する
            </Typography>
          </Box>

          {/* カメラプレビュー */}
          <Paper
            elevation={0}
            className="neon-border"
            sx={{
              width: '100%',
              maxWidth: 500,
              overflow: 'hidden',
              p: 0,
              background: 'rgba(20, 20, 35, 0.8)',
              position: 'relative',
            }}
          >
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

            <Box sx={{
              position: 'relative',
              backgroundColor: '#000',
              overflow: 'hidden',
              borderRadius: '12px 12px 0 0',
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', display: stream ? 'block' : 'none' }}
                title="カメラプレビュー"
              />

              {/* カメラ起動中 */}
              {!stream && !error && (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 280,
                  gap: 2,
                }}>
                  <PhotoCameraIcon sx={{
                    fontSize: 48,
                    color: 'text.secondary',
                    animation: 'pulseSoft 2s ease-in-out infinite',
                  }} />
                  <Typography color="text.secondary">
                    カメラを起動中...
                  </Typography>
                </Box>
              )}

              {/* フラッシュエフェクト */}
              {showFlash && (
                <Box sx={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: '#fff',
                  animation: 'flashCapture 0.4s ease-out forwards',
                  pointerEvents: 'none',
                  zIndex: 10,
                }} />
              )}
            </Box>

            {/* 撮影ボタン */}
            <Box sx={{ py: 2.5, textAlign: 'center', background: 'rgba(15, 15, 26, 0.5)' }}>
              <Button
                onClick={captureImage}
                variant="contained"
                size="large"
                disabled={!stream}
                startIcon={<CameraAltIcon />}
                aria-label="布地を撮影する"
                sx={{
                  px: 4,
                  py: 1.2,
                  fontSize: '1rem',
                  borderRadius: '50px',
                }}
              >
                撮影
              </Button>
            </Box>
          </Paper>

          <ColorGroupTable />
        </>
      ) : (
        <Fade in={true} timeout={500}>
          <Box sx={{
            width: '100%',
            maxWidth: 500,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}>
            {/* ステップヘッダー */}
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <StepBadge step={2} />
              <Typography
                variant="h5"
                component="h2"
                sx={{ fontWeight: 700 }}
              >
                色を分析・保存する
              </Typography>
            </Box>

            {/* 撮影画像 */}
            <CardMedia
              component="img"
              image={capturedImage}
              alt="撮影された布地"
              sx={{
                borderRadius: 2,
                width: '100%',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            />

            <Button
              onClick={startCamera}
              variant="outlined"
              startIcon={<ReplayIcon />}
              aria-label="もう一度撮影する"
              sx={{
                borderColor: 'rgba(165, 180, 252, 0.3)',
                color: '#a5b4fc',
                '&:hover': {
                  borderColor: 'rgba(165, 180, 252, 0.6)',
                  background: 'rgba(165, 180, 252, 0.08)',
                },
              }}
            >
              再撮影する
            </Button>

            <ColorAnalyzer
              imageDataUrl={capturedImage}
              onAddToGallery={onAddFabric}
              isSaving={isSaving}
            />
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default CameraView;