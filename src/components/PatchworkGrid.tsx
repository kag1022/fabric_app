import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Box } from '@mui/material';
import { FabricItem } from '../App';

interface GridBlockProps {
    id: string;
    item: FabricItem | null;
}

const GridBlock: React.FC<GridBlockProps> = ({ id, item }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <Box
            ref={setNodeRef}
            sx={{
                width: '100%',
                height: '100%',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: isOver ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                backgroundImage: item ? `url(${item.imageDataUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        />
    );
};

interface PatchworkGridProps {
    gridSize: number;
    placedItems: { [key: string]: FabricItem };
}

const PatchworkGrid: React.FC<PatchworkGridProps> = ({ gridSize, placedItems }) => {
    const grid = Array.from({ length: gridSize * gridSize }, (_, i) => {
        const id = `block-${i}`;
        return { id, item: placedItems[id] || null };
    });

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                gridTemplateRows: `repeat(${gridSize}, 1fr)`,
                width: '100%',
                aspectRatio: '1 / 1',
                border: '1px solid grey',
            }}
        >
            {grid.map(({ id, item }) => (
                <GridBlock key={id} id={id} item={item} />
            ))}
        </Box>
    );
};

export default PatchworkGrid;