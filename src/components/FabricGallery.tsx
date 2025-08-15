import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardMedia, Typography, CardContent, Paper, CardActions, IconButton, CircularProgress } from '@mui/material'; // 👈 不要なインポートを削除
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

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const q = query(collection(db, "users", userId, "fabrics"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fabricsData: FabricItem[] = [];
      querySnapshot.forEach((doc) => {
        fabricsData.push({ id: doc.id, ...doc.data() } as FabricItem);
      });
      setItems(fabricsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // useMemoは不要になったので削除
  
  const handleDeleteItem = async (item: FabricItem) => {
    if (!userId || !item.imageDataUrl) return;

    try {
      await deleteDoc(doc(db, "users", userId, "fabrics", item.id));
      const imageRef = ref(storage, item.imageDataUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error("削除中にエラーが発生しました: ", error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Typography variant="h6" align="center" sx={{ mt: 4, color: 'text.secondary' }}>
        ギャラリーは空です。「カメラ」タブから布地を撮影して追加してください。
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          布地ギャラリー
        </Typography>
        {/* 並び替えUIを削除 */}
      </Box>
      <Grid container spacing={3}>
        {items.map((item) => ( // sortedItems を items に変更
          <Grid item key={item.id} xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardMedia
                component="img"
                height="160"
                image={item.imageDataUrl}
                alt={`布地グループ ${item.group} の画像`}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="div">
                  {item.group}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  <Paper
                    elevation={3}
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: `rgb(${item.dominantRgb.r}, ${item.dominantRgb.g}, ${item.dominantRgb.b})`,
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '50%',
                    }}
                    aria-label={`主要色: ${item.group}`}
                  />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.hueInfo.name} / {item.valueInfo.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      RGB: {item.dominantRgb.r}, {item.dominantRgb.g}, {item.dominantRgb.b}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <IconButton aria-label={`グループ ${item.group} の布地を削除`} onClick={() => handleDeleteItem(item)}>
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default FabricGallery;