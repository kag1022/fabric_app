import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Button, Typography, Paper, CardMedia, Alert } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ReplayIcon from '@mui/icons-material/Replay';
import ColorAnalyzer from './ColorAnalyzer';
import { ColorAnalysisResult } from '../utils/colorUtils';
import ColorGroupTable from './ColorGroupTable';

interface CameraViewProps {
  onAddFabric: (result: ColorAnalysisResult, imageDataUrl: string) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onAddFabric }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {!capturedImage ? (
        <>
          <Typography variant="h4" component="h2" gutterBottom>
            布地を撮影する
          </Typography>
          <Paper elevation={4} sx={{ width: '100%', maxWidth: 500, overflow: 'hidden', p: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box sx={{ position: 'relative', backgroundColor: '#000', borderRadius: 1, overflow: 'hidden' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', display: stream ? 'block' : 'none' }}
                title="カメラプレビュー"
              />
              {!stream && !error && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280 }}>
                  <Typography>カメラを起動中...</Typography>
                </Box>
              )}
            </Box>
            <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true" />
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                onClick={captureImage}
                variant="contained"
                size="large"
                disabled={!stream}
                startIcon={<CameraAltIcon />}
                aria-label="布地を撮影する"
              >
                撮影
              </Button>
            </Box>
          </Paper>
          <ColorGroupTable />
        </>
      ) : (
        <Box sx={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            色を分析・保存する
          </Typography>
          <CardMedia component="img" image={capturedImage} alt="撮影された布地" sx={{ borderRadius: 1, width: '100%' }} />
          <Button
            onClick={startCamera}
            variant="outlined"
            startIcon={<ReplayIcon />}
            aria-label="もう一度撮影する"
          >
            再撮影する
          </Button>
          <ColorAnalyzer
            imageDataUrl={capturedImage}
            onAddToGallery={onAddFabric}
          />
        </Box>
      )}
    </Box>
  );
};

export default CameraView;