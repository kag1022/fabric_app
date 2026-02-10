import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardMedia, Typography, CardActions,
  IconButton, CircularProgress, Alert, Button, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, useTheme, useMediaQuery,
  Fade,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CollectionsIcon from '@mui/icons-material/Collections';
import { db, storage } from '../firebase';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { FabricItem } from '../App';

interface FabricGalleryProps {
  userId: string;
}

const FabricGallery: React.FC<FabricGalleryProps> = ({ userId }) => {
  const [items, setItems] = useState<FabricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FabricItem | null>(null);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const q = query(collection(db, "users", userId, "fabrics"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fabricsData: FabricItem[] = [];
      snapshot.forEach((doc) => {
        fabricsData.push({ id: doc.id, ...doc.data() } as FabricItem);
      });
      setItems(fabricsData);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("データの取得に失敗しました。");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleOpenDeleteDialog = (item: FabricItem) => {
    setItemToDelete(item);
  };

  const handleCloseDeleteDialog = () => {
    setItemToDelete(null);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      await deleteDoc(doc(db, "users", userId, "fabrics", itemToDelete.id));
      const imageRef = ref(storage, itemToDelete.imageDataUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error("Error deleting item: ", error);
      setError("アイテムの削除に失敗しました。");
    } finally {
      handleCloseDeleteDialog();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress sx={{ color: '#a5b4fc' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* ヘッダー */}
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          textAlign: 'center',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #e2e8f0, #a5b4fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        My Fabric Gallery
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* 空状態 */}
      {items.length === 0 && !error ? (
        <Fade in={true} timeout={600}>
          <Box sx={{
            textAlign: 'center',
            py: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(165, 180, 252, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed rgba(165, 180, 252, 0.3)',
            }}>
              <CollectionsIcon sx={{ fontSize: 36, color: 'rgba(165, 180, 252, 0.4)' }} />
            </Box>
            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
              ギャラリーは空です。<br />
              布地を撮影して追加してください。
            </Typography>
          </Box>
        </Fade>
      ) : (
        <Grid container spacing={2}>
          {items.map((item, index) => (
            <Grid item key={item.id} xs={12} sm={6} md={4}>
              <Fade in={true} timeout={400} style={{ transitionDelay: `${index * 80}ms` }}>
                <Card sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  background: 'rgba(30, 30, 50, 0.5)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 12px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(${item.dominantRgb.r}, ${item.dominantRgb.g}, ${item.dominantRgb.b}, 0.15)`,
                    borderColor: `rgba(${item.dominantRgb.r}, ${item.dominantRgb.g}, ${item.dominantRgb.b}, 0.3)`,
                  },
                }}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={item.imageDataUrl}
                    alt={`布地グループ ${item.group} の画像`}
                    sx={{ objectFit: 'cover' }}
                  />
                  <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      {/* グロー付きカラードット */}
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          backgroundColor: `rgb(${item.dominantRgb.r}, ${item.dominantRgb.g}, ${item.dominantRgb.b})`,
                          border: '2px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '50%',
                          boxShadow: `0 0 10px rgba(${item.dominantRgb.r}, ${item.dominantRgb.g}, ${item.dominantRgb.b}, 0.4)`,
                          flexShrink: 0,
                        }}
                        aria-label={`主要色: ${item.group}`}
                      />
                      <Typography
                        variant="h6"
                        component="p"
                        sx={{ fontWeight: 700, fontSize: '1rem' }}
                      >
                        {item.group}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {item.hueInfo.name} / {item.valueInfo.name}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <CardActions sx={{ justifyContent: 'flex-end', p: 0, pt: 1 }}>
                      <IconButton
                        aria-label={`グループ ${item.group} の布地を削除`}
                        onClick={() => handleOpenDeleteDialog(item)}
                        size="small"
                        sx={{
                          color: 'text.secondary',
                          '&:hover': {
                            color: '#f87171',
                            background: 'rgba(248, 113, 113, 0.1)',
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardActions>
                  </Box>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 削除ダイアログ */}
      {itemToDelete && (
        <Dialog
          open={!!itemToDelete}
          onClose={handleCloseDeleteDialog}
          fullScreen={fullScreen}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          PaperProps={{
            sx: {
              background: 'rgba(30, 30, 50, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle id="delete-dialog-title" sx={{ fontWeight: 700 }}>
            アイテムを削除
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              グループ「{itemToDelete.group}」の布地を本当に削除しますか？この操作は元に戻せません。
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCloseDeleteDialog}
              sx={{ color: 'text.secondary' }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDeleteItem}
              variant="contained"
              autoFocus
              sx={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                },
              }}
            >
              削除
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default FabricGallery;