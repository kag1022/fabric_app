import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Card, CardMedia, CardContent, CardActions } from '@mui/material';
import ColorAnalyzer from './ColorAnalyzer'; // ColorAnalyzerをインポート
import { ColorAnalysisResult } from '../utils/colorUtils'; // 型定義をインポート

const CameraView: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ギャラリーに追加する関数
  const handleAddToGallery = (result: ColorAnalysisResult) => {
    console.log('Added to gallery:', result);
    // TODO: ここで実際にギャラリーの状態を更新する
    // 一旦撮影画面に戻す
    setCapturedImage(null);
    startCamera();
  };

  const startCamera = async () => {
    setCapturedImage(null);
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
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
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
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {!capturedImage && (
        <>
          <Typography variant="h5">1. 布地を撮影する</Typography>
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent>
              {error && <Typography color="error">{error}</Typography>}
              <Box sx={{ position: 'relative', backgroundColor: '#000' }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: stream ? 'block' : 'none' }} />
              </Box>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </CardContent>
            <CardActions sx={{ justifyContent: 'center' }}>
              <Button onClick={captureImage} variant="contained" disabled={!stream}>撮影する</Button>
            </CardActions>
          </Card>
        </>
      )}

      {capturedImage && (
        <Box sx={{width: '100%', maxWidth: 600}}>
            <Typography variant="h5" gutterBottom>撮影画像</Typography>
            <CardMedia component="img" image={capturedImage} alt="Captured Fabric" sx={{marginBottom: 2}}/>
            <Button onClick={() => startCamera()} variant="outlined" fullWidth>再撮影する</Button>
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
