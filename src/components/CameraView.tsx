import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Button, Typography, Card, CardMedia, CardContent, CardActions } from '@mui/material';
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
      stream.getTracks().forEach(track => track.stop());
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
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setError('カメラにアクセスできません。ブラウザの設定でカメラの使用を許可してください。');
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

  const handleAddToGallery = (result: ColorAnalysisResult) => {
    if (capturedImage) {
      onAddFabric(result, capturedImage);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {!capturedImage ? (
        <>
          <Typography variant="h5" component="h1">1. 布地を撮影する</Typography> {/* h1に変更 */}
          <ColorGroupTable />
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent>
              {error && <Typography role="alert" color="error" align="center" sx={{ mb: 2 }}>{error}</Typography>}
              <Box sx={{ position: 'relative', backgroundColor: '#000', minHeight: '200px' }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  style={{ width: '100%', display: stream ? 'block' : 'none' }} 
                  title="カメラプレビュー" // titleを追加
                />
                {!stream && !error && <Typography align="center" sx={{p:2}}>カメラを起動中...</Typography>}
              </Box>
              <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true" />
            </CardContent>
            <CardActions sx={{ justifyContent: 'center' }}>
              <Button 
                onClick={captureImage} 
                variant="contained" 
                disabled={!stream}
                aria-label="布地を撮影する" // aria-labelを追加
              >
                撮影する
              </Button>
            </CardActions>
          </Card>
        </>
      ) : (
        <Box sx={{width: '100%', maxWidth: 600}}>
            <Typography variant="h5" component="h2" gutterBottom>撮影画像</Typography> {/* 見出しレベルを調整 */}
            <CardMedia component="img" image={capturedImage} alt="撮影された布地" sx={{marginBottom: 2}}/>
            <Button 
              onClick={startCamera} 
              variant="outlined" 
              fullWidth
              aria-label="もう一度撮影する" // aria-labelを追加
            >
              再撮影する
            </Button>
            <ColorAnalyzer 
                imageDataUrl={capturedImage} 
                onAddToGallery={handleAddToGallery} 
            />
        </Box>
      )}
    </Box>
  );
};

export default CameraView;