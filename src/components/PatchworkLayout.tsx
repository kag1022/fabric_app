import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
} from '@dnd-kit/core';
import { Box, Typography, Slider, Grid } from '@mui/material';
import { FabricItem } from '../App';
import PatchworkGrid from './PatchworkGrid';
import { DraggableFabricItem } from './DraggableFabricItem';

interface PatchworkLayoutProps {
  items: FabricItem[];
}

const PatchworkLayout: React.FC<PatchworkLayoutProps> = ({ items }) => {
  const [gridSize, setGridSize] = useState(8);
  const [placedItems, setPlacedItems] = useState<{ [key: string]: FabricItem }>({});
  const [activeItem, setActiveItem] = useState<FabricItem | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current) {
      setActiveItem(event.active.data.current.item as FabricItem);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { over, active } = event;
    if (over && over.id.toString().startsWith('block-') && active.data.current) {
      const itemToPlace = active.data.current.item as FabricItem;
      if (itemToPlace) {
        setPlacedItems(prev => ({
          ...prev,
          [over.id.toString()]: itemToPlace,
        }));
      }
    }
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setGridSize(newValue as number);
  };

  if (items.length === 0) {
    return (
      <Typography variant="h6" align="center" sx={{ mt: 4, color: 'text.secondary' }}>
        パッチワークを作成するには、まずギャラリーに布地を追加してください。
      </Typography>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} sensors={sensors}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={3}>
          <Typography variant="h5" gutterBottom>
            布地リスト
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '60vh', overflowY: 'auto' }}>
            {items.map(item => (
              <DraggableFabricItem key={item.id} item={item} />
            ))}
          </Box>
        </Grid>
        <Grid item xs={12} md={9}>
          <Typography variant="h5" gutterBottom>
            パッチワークレイアウト
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            左のリストから布地をドラッグ＆ドロップして、自由に配置を試してみましょう。
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>グリッドサイズ: {gridSize}x{gridSize}</Typography>
            <Slider
              value={gridSize}
              onChange={handleSliderChange}
              step={4}
              marks
              min={4}
              max={16}
              valueLabelDisplay="auto"
            />
          </Box>
          <PatchworkGrid gridSize={gridSize} placedItems={placedItems} />
        </Grid>
      </Grid>
      <DragOverlay>
        {activeItem ? <DraggableFabricItem item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default PatchworkLayout;