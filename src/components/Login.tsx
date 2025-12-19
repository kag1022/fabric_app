import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        try {
            setError(null);
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate('/'); // ログイン成功後にホーム（カメラページ）へ遷移
        } catch (err: any) {
            console.error("Login failed:", err);
            // Firebaseのエラーコードに応じたメッセージを表示すると親切ですが、まずは汎用的なものを
            setError("ログインに失敗しました。もう一度お試しください。");
        }
    };

    return (
        <Box sx={{
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 2
        }}>
            <Paper elevation={4} sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                maxWidth: 400,
                width: '100%',
                backdropFilter: 'blur(16px)',
                backgroundColor: 'rgba(30, 30, 30, 0.8)',
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <Typography variant="h4" component="h1" fontWeight="bold" align="center">
                    Fabric App
                </Typography>
                <Typography variant="body1" color="text.secondary" align="center">
                    ログインして、あなたの布地コレクションを管理しましょう。
                </Typography>

                {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

                <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<GoogleIcon />}
                    onClick={handleGoogleLogin}
                    sx={{
                        py: 1.5,
                        backgroundColor: '#fff',
                        color: '#757575',
                        '&:hover': {
                            backgroundColor: '#f5f5f5',
                        },
                        fontWeight: 'bold',
                        textTransform: 'none'
                    }}
                >
                    Sign in with Google
                </Button>
            </Paper>
        </Box>
    );
};

export default Login;
