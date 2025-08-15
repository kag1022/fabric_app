import React, { useState, useEffect, useMemo } from 'react';
import { Box, Grid, Card, CardMedia, CardContent, Typography, Paper, CardActions, IconButton, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { db, storage } from '../firebase'; // Firebaseインスタンスをインポート
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { FabricItem } from '../App'; // App.tsxから型をインポート

interface FabricGalleryProps {
  userId: string;
}

const FabricGallery: React.FC<FabricGalleryProps> = ({ userId }) => {
  const [items, setItems] = useState<FabricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('default'); // 'default' or 'group'

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    // Firestoreからデータをリアルタイムで取得
    const q = query(collection(db, "users", userId, "fabrics"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fabricsData: FabricItem[] = [];
      querySnapshot.forEach((doc) => {
        fabricsData.push({ id: doc.id, ...doc.data() } as FabricItem);
      });
      setItems(fabricsData);
      setLoading(false);
    });

    // クリーンアップ関数
    return () => unsubscribe();
  }, [userId]);

  const sortedItems = useMemo(() => {
    const newItems = [...items];
    if (sortOrder === 'group') {
      newItems.sort((a, b) => a.group.localeCompare(b.group, 'ja'));
    }
    return newItems;
  }, [items, sortOrder]);

  const handleDeleteItem = async (item: FabricItem) => {
    if (!userId) return;

    try {
      // 1. Firestoreからドキュメントを削除
      await deleteDoc(doc(db, "users", userId, "fabrics", item.id));

      // 2. Firebase Storageから画像ファイルを削除
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
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="sort-by-label">並び替え</InputLabel>
          <Select
            labelId="sort-by-label"
            id="sort-by-select"
            value={sortOrder}
            label="並び替え"
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <MenuItem value="default">追加順</MenuItem>
            <MenuItem value="group">グループ順</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Grid container spacing={3}>
        {sortedItems.map((item) => (
          <Grid item key={item.id} xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardMedia
                component="img"
                height="160"
                image={item.imageDataUrl}
                alt="Fabric Image"
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
                <IconButton aria-label="delete" onClick={() => handleDeleteItem(item)}>
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