import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Box, Typography } from '@mui/material';
import { FabricItem } from '../App';
import { SortableFabricItem } from './SortableFabricItem';

interface PatchworkLayoutProps {
  items: FabricItem[];
}

const PatchworkLayout: React.FC<PatchworkLayoutProps> = ({ items }) => {
  const [layoutItems, setLayoutItems] = useState<FabricItem[]>([]);

  // Appコンポーネントからのアイテムリストが変更されたら、レイアウトのアイテムも同期する
  useEffect(() => {
    setLayoutItems(items);
  }, [items]);

  // マウスやタッチ、キーボードでの操作を検知するためのセンサーを設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ操作が終了したときに呼ばれる関数
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLayoutItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === active.id);
        const newIndex = currentItems.findIndex((item) => item.id === over.id);
        // 配列内のアイテムを移動して新しい配列を返す
        return arrayMove(currentItems, oldIndex, newIndex);
      });
    }
  };

  if (items.length === 0) {
    return (
      <Typography variant="h6" align="center" sx={{ mt: 4, color: 'text.secondary' }}>
        パッチワークを作成するには、まずギャラリーに布地を追加してください。
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        パッチワークレイアウト
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        布地をドラッグ＆ドロップして、自由に配置を試してみましょう。
      </Typography>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={layoutItems.map(item => item.id)} strategy={rectSortingStrategy}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 2,
            p: 2,
            border: '1px dashed grey',
            borderRadius: 2,
            minHeight: 300,
            backgroundColor: 'action.hover'
          }}>
            {layoutItems.map(item => (
              <SortableFabricItem key={item.id} item={item} />
            ))}
          </Box>
        </SortableContext>
      </DndContext>
    </Box>
  );
};

export default PatchworkLayout;
