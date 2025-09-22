import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardMedia, Typography, Paper, CardActions, IconButton, CircularProgress, Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useTheme, useMediaQuery } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
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
      // Firestoreドキュメントの削除
      await deleteDoc(doc(db, "users", userId, "fabrics", itemToDelete.id));

      // Firebase Storageの画像ファイルを削除
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
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center' }}>
        My Fabric Gallery
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {items.length === 0 && !error ? (
        <Typography align="center" sx={{ mt: 4, color: 'text.secondary' }}>
          ギャラリーは空です。上部から布地を撮影して追加してください。
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {items.map((item) => (
            <Grid item key={item.id} xs={12} sm={6} md={4}>
              <Card sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%', 
                bgcolor: 'background.paper',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[4],
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image={item.imageDataUrl}
                  alt={`布地グループ ${item.group} の画像`}
                />
                <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: `rgb(${item.dominantRgb.r}, ${item.dominantRgb.g}, ${item.dominantRgb.b})`,
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                      }}
                      aria-label={`主要色: ${item.group}`}
                    />
                    <Typography variant="h6" component="p">
                      {item.group}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {item.hueInfo.name} / {item.valueInfo.name}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <CardActions sx={{ justifyContent: 'flex-end', p: 0, pt: 1 }}>
                    <IconButton aria-label={`グループ ${item.group} の布地を削除`} onClick={() => handleOpenDeleteDialog(item)}>
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {itemToDelete && (
        <Dialog
          open={!!itemToDelete}
          onClose={handleCloseDeleteDialog}
          fullScreen={fullScreen}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">アイテムを削除</DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              グループ「{itemToDelete.group}」の布地を本当に削除しますか？この操作は元に戻せません。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>キャンセル</Button>
            <Button onClick={handleDeleteItem} color="error" autoFocus>
              削除
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default FabricGallery;