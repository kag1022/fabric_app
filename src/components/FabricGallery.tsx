import React, { useState, useMemo } from 'react';
import { Box, Grid, Card, CardMedia, CardContent, Typography, Paper, CardActions, IconButton, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { FabricItem } from '../App'; // App.tsxから型をインポート

interface FabricGalleryProps {
  items: FabricItem[];
  onDeleteItem: (id: string) => void;
}

const FabricGallery: React.FC<FabricGalleryProps> = ({ items, onDeleteItem }) => {
  const [sortOrder, setSortOrder] = useState('default'); // 'default' or 'group'

  const sortedItems = useMemo(() => {
    // 元の配列を破壊しないようにコピーを作成
    const newItems = [...items];

    if (sortOrder === 'group') {
      // グループ名でアルファベット/五十音順にソート
      newItems.sort((a, b) => a.group.localeCompare(b.group, 'ja'));
    }
    // 'default' の場合は App.tsx から渡されたままの順序（新しいものが先頭）
    return newItems;
  }, [items, sortOrder]);

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
                <IconButton aria-label="delete" onClick={() => onDeleteItem(item.id)}>
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
